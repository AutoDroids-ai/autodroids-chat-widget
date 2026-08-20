#!/usr/bin/env node
/**
 * Builds one self-contained bundle per dealers/<name>.json.
 *
 * Each output is standalone so it can carry its own SRI hash — a wrapper that
 * fetched the engine separately would leave that second request unverified,
 * which is the whole point of pinning.
 */
const fs = require('fs');
const path = require('path');

const ENGINE = path.join(__dirname, 'src', 'engine.js');
const MARKER = '/*__DEALER__*/{}';

const engine = fs.readFileSync(ENGINE, 'utf8');
if (!engine.includes(MARKER)) {
  console.error('build: marker ' + MARKER + ' not found in src/engine.js');
  process.exit(1);
}

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });

const dealers = fs.readdirSync(path.join(__dirname, 'dealers')).filter(f => f.endsWith('.json'));
let failed = 0;

for (const file of dealers) {
  const name = path.basename(file, '.json');
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'dealers', file), 'utf8'));

  if (!cfg.closebotSource) {
    console.error(`build: ${file} has no closebotSource`);
    failed++;
    continue;
  }
  // Tags feed CloseBot routing rules; a duplicate silently misroutes a rooftop.
  const tags = (cfg.locations || []).map(l => l.tag);
  if (new Set(tags).size !== tags.length) {
    console.error(`build: ${file} has duplicate location tags`);
    failed++;
    continue;
  }

  // Strip _-prefixed doc keys so they never ship to the browser.
  const shipped = Object.fromEntries(Object.entries(cfg).filter(([k]) => !k.startsWith('_')));

  const banner = `/*! AutoDroids Chat Widget — ${name} — built from dealers/${file}. Do not edit. */\n`;
  const out = banner + engine.replace(MARKER, JSON.stringify(shipped, null, 2));

  const dest = path.join(__dirname, 'dist', name + '.js');
  fs.writeFileSync(dest, out, 'utf8');           // LF preserved; .gitattributes pins it
  console.log(`built dist/${name}.js  (${cfg.locations.length} locations, source=${cfg.closebotSource})`);
}

process.exit(failed ? 1 : 0);
