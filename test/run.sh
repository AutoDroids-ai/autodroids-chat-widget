#!/usr/bin/env bash
# Engine checks run against every built bundle, so a dealer config that breaks
# the widget fails here rather than on a dealer's site.
set -e
node --check src/engine.js && echo "engine: SYNTAX OK"
node build.js
for f in dist/*.js; do
  name=$(basename "$f" .js)
  src=$(node -e "console.log(JSON.parse(require('fs').readFileSync('dealers/$name.json','utf8')).closebotSource)")
  echo ""
  echo "===== $name ====="
  node --check "$f"
  node test/css.cjs      "$f"
  node test/routing.cjs  "$f"
  node test/loader.cjs   "$f" "$src"
  node test/picker.cjs   "$f"
  node test/tenancy.cjs  "$f"
done
