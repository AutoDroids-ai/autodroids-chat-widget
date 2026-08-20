#!/usr/bin/env node
/**
 * Prints the ready-to-paste install tag for each built bundle.
 * Hash is taken from the bytes on disk, which is what git stores and therefore
 * what jsDelivr serves — .gitattributes pins LF so it cannot drift.
 *
 * Usage: node sri.js [tag]      e.g. node sri.js v1.0.0
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = 'AutoDroids-ai/autodroids-chat-widget';
const tag = process.argv[2] || 'vX.Y.Z';
const dist = path.join(__dirname, 'dist');

if (!fs.existsSync(dist)) { console.error('run `node build.js` first'); process.exit(1); }

for (const f of fs.readdirSync(dist).filter(f => f.endsWith('.js')).sort()) {
  const buf = fs.readFileSync(path.join(dist, f));
  const hash = crypto.createHash('sha384').update(buf).digest('base64');
  const gz = require('zlib').gzipSync(buf, { level: 9 }).length;
  console.log(`\n===== ${f}  (${buf.length} B raw, ${gz} B gzipped) =====`);
  console.log(`<script src="https://cdn.jsdelivr.net/gh/${REPO}@${tag}/dist/${f}"`);
  console.log(`        integrity="sha384-${hash}"`);
  console.log(`        crossorigin="anonymous" defer></script>`);
}
