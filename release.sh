#!/usr/bin/env bash
# Release: build, test, tag, push, then repoint the stable loaders.
#
#   bash release.sh v1.2.0 "commit message"
#
# Order matters. The loader must never point at a tag that is not live yet, so
# the pinned bundle is fetched and hash-checked BEFORE the loader is published.
# Dealers keep the same loader URL forever; only its contents move.
set -euo pipefail

TAG="${1:-}"
MSG="${2:-Release $TAG}"
REPO="AutoDroids-ai/autodroids-chat-widget"
CDN="https://cdn.jsdelivr.net/gh/$REPO"
PURGE="https://purge.jsdelivr.net/gh/$REPO"

[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "usage: bash release.sh v1.2.3 \"message\""; exit 1; }
git rev-parse "$TAG" >/dev/null 2>&1 && { echo "tag $TAG already exists — pick a new one"; exit 1; }

echo "==> build + test"
node build.js "$TAG"
bash test/run.sh >/dev/null
echo "    $(bash test/run.sh 2>&1 | grep -cE '^PASS') assertions passed"

echo "==> commit + tag"
git add -A
git diff --cached --quiet || git commit -q -m "$MSG"
git tag "$TAG"
git push -q origin main --tags

echo "==> verify pinned bundles are live (before any loader points at them)"
for f in dist/*.js; do
  name=$(basename "$f" .js)
  want=$(openssl dgst -sha384 -binary "$f" | openssl base64 -A)
  ok=0
  for try in 1 2 3 4; do
    got=$(curl -sL --max-time 60 "$CDN@$TAG/dist/$name.js" | openssl dgst -sha384 -binary | openssl base64 -A)
    if [ "$got" = "$want" ]; then echo "    $name  OK"; ok=1; break; fi
    echo "    $name  try $try mismatch, purging"
    curl -s --max-time 60 "$PURGE@$TAG/dist/$name.js" -o /dev/null
  done
  [ "$ok" = 1 ] || { echo "ABORT: $name never went live at $TAG. Loaders NOT repointed."; exit 1; }
done

echo "==> purge the stable loaders so dealers pick up $TAG"
for f in dist/loader/*.js; do
  name=$(basename "$f" .js)
  curl -s --max-time 60 "$PURGE@main/dist/loader/$name.js" -o /dev/null
  live=$(curl -sL --max-time 60 "$CDN@main/dist/loader/$name.js" | grep -oE '@v[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  if [ "$live" = "@$TAG" ]; then echo "    loader/$name  -> $live"
  else echo "    loader/$name  still serving ${live:-unknown} — purge lag, recheck shortly"; fi
done

echo
echo "Done. Dealer tags are unchanged:"
for f in dist/loader/*.js; do
  echo "  <script src=\"$CDN@main/dist/loader/$(basename "$f")\" defer></script>"
done
