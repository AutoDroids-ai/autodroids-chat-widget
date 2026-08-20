#!/usr/bin/env bash
# Release: build, test, publish bundles, then repoint the stable loaders.
#
#   bash release.sh v1.3.0 "commit message"
#
# Two things make this safe:
#
# 1. Loaders pin a COMMIT SHA, not a tag. jsDelivr's version resolver has
#    repeatedly returned "Failed to fetch version info" for a freshly pushed
#    tag (dist/mycar.js sat 404 at v1.2.0 for many minutes while the identical
#    file served fine at @<sha>). A commit ref skips the resolver entirely.
#    The tag is still created, for humans and for release notes.
#
# 2. Two commits. The bundle commit lands first so its SHA exists; the loader
#    commit then points at it. A loader can never reference itself, and the
#    pinned bundle is fetched and hash-checked BEFORE any loader is purged, so
#    dealers keep running the previous good version if anything goes wrong.
#
# The dealer's URL never changes. Only the loader's contents move.
set -euo pipefail

TAG="${1:-}"
MSG="${2:-Release $TAG}"
REPO="AutoDroids-ai/autodroids-chat-widget"
CDN="https://cdn.jsdelivr.net/gh/$REPO"
PURGE="https://purge.jsdelivr.net/gh/$REPO"

[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "usage: bash release.sh v1.2.3 \"message\""; exit 1; }
git rev-parse "$TAG" >/dev/null 2>&1 && { echo "tag $TAG already exists — pick a new one"; exit 1; }

echo "==> build + test"
node build.js
bash test/run.sh > /tmp/cw-tests.log 2>&1 || true
PASS=$(grep -cE '^PASS' /tmp/cw-tests.log || true)
FAIL=$(grep -cE '^FAIL' /tmp/cw-tests.log || true)
echo "    $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ] || { echo "ABORT: tests failing. Nothing published."; grep -E '^FAIL' /tmp/cw-tests.log; exit 1; }

echo "==> commit bundles"
git add -A
git diff --cached --quiet || git commit -q -m "$MSG"
SHA=$(git rev-parse --short=10 HEAD)
echo "    bundles at $SHA"

echo "==> build loaders pinned to $SHA"
node build.js "$SHA"
git add -A
git diff --cached --quiet || git commit -q -m "$MSG — loaders -> $SHA"
git tag "$TAG"
git push -q origin main --tags
echo "    pushed, tagged $TAG"

echo "==> verify pinned bundles are live (before any loader points at them)"
for f in dist/*.js; do
  [ -f "$f" ] || continue
  name=$(basename "$f" .js)
  want=$(openssl dgst -sha384 -binary "$f" | openssl base64 -A)
  ok=0
  for try in 1 2 3 4 5; do
    got=$(curl -sL --max-time 60 "$CDN@$SHA/dist/$name.js" | openssl dgst -sha384 -binary | openssl base64 -A)
    if [ "$got" = "$want" ]; then echo "    $name  OK (try $try)"; ok=1; break; fi
    curl -s --max-time 60 "$PURGE@$SHA/dist/$name.js" -o /dev/null
  done
  [ "$ok" = 1 ] || { echo "ABORT: $name never went live at $SHA. Loaders NOT repointed; dealers stay on the previous version."; exit 1; }
done

echo "==> purge loader + manifest so dealers pick up $SHA"
for f in dist/loader/*.json; do
  name=$(basename "$f" .json)
  ok=0
  for try in 1 2 3 4; do
    curl -s --max-time 60 "$PURGE@main/dist/loader/$name.json" -o /dev/null
    curl -s --max-time 60 "$PURGE@main/dist/loader/$name.js"   -o /dev/null
    live=$(curl -sL --max-time 60 "$CDN@main/dist/loader/$name.json" | grep -oE "widget@[0-9a-f]{7,40}" | head -1 | sed "s/widget@//")
    if [ "$live" = "$SHA" ]; then echo "    manifest $name  -> $SHA"; ok=1; break; fi
  done
  [ "$ok" = 1 ] || echo "    manifest $name  still ${live:-unknown} — re-run the purge; dealers stay on the previous good version meanwhile"
done


echo
echo "Done — $TAG. Dealer tags are unchanged:"
for f in dist/loader/*.js; do
  echo "  <script src=\"$CDN@main/dist/loader/$(basename "$f")\" defer></script>"
done
