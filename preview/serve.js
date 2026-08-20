#!/usr/bin/env node
/**
 * Local preview harness.  node preview/serve.js  ->  http://localhost:8787
 *
 * Serves the repo with Cache-Control: no-store on everything, so editing a
 * dealer JSON and hitting refresh shows the change immediately. No build, no
 * tag, no CDN, no purge, no 7-day browser cache.
 *
 * The page loads src/engine.js directly and feeds it the dealer config through
 * window.CW_CFG, which the engine already applies last — so what renders here
 * is the same code path a built bundle takes.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 8787;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml'
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/preview/index.html';

  // Keep the server inside the repo.
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }

  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found: ' + rel); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      // The entire point of this harness.
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    });
    res.end(buf);
  });
}).listen(PORT, () => {
  const dealers = fs.readdirSync(path.join(ROOT, 'dealers'))
    .filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json'));
  console.log('preview  http://localhost:' + PORT + '/');
  console.log('dealers  ' + dealers.map(d => '?dealer=' + d).join('  '));
  console.log('edit dealers/<name>.json or src/engine.js, then just refresh');
});
