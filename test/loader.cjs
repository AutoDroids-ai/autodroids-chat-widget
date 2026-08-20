// Verifies the CloseBot loader: injects once, respects an existing tag, obeys config.
const fs = require('fs');
const SRC = process.argv[2];
const EXPECT_SOURCE = process.argv[3];  // dealer's closebotSource

function run({ existingTag, cfg }) {
  const appended = [];
  const mk = () => ({
    style: {}, dataset: {}, children: [], options: [], classList: { add() {}, contains() { return false } },
    appendChild(c) { this.children.push(c); return c }, addEventListener() {}, setAttribute() {},
    getAttribute() { return null }, querySelector() { return null }, querySelectorAll() { return [] },
    before() {}, closest() { return null },
    set innerHTML(v) {}, get innerHTML() { return '' }, set textContent(v) {}, get textContent() { return '' }
  });
  global.window = {};
  if (cfg) global.window.CW_CFG = cfg;
  global.MutationObserver = class { observe() {} };
  global.HTMLInputElement = { prototype: {} };
  global.Option = function () {};
  global.localStorage = { getItem() { return null }, setItem() {} };
  global.location = { href: 'https://www.goautobahn.ca/' };
  global.history = { state: null, replaceState() {} };
  global.document = {
    readyState: 'complete', body: {}, addEventListener() {},
    head: { appendChild(n) { appended.push(n) } },
    createElement: mk,
    querySelector: s => (s.indexOf('/scripts/cb.js') > -1 && existingTag) ? mk() : null,
    querySelectorAll: () => []
  };
  eval(fs.readFileSync(SRC, 'utf8'));
  return appended.filter(n => (n.src || '').indexOf('cb.js') > -1).map(n => n.src);
}

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok ? '' : `\n        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`));
};

check('injects CloseBot with the parent key',
  run({}), ['https://api.closebot.com/scripts/cb.js?source=' + EXPECT_SOURCE]);
check('does NOT double-load when a cb.js tag already exists',
  run({ existingTag: true }), []);
check('loadClosebot:false suppresses injection',
  run({ cfg: { loadClosebot: false } }), []);
check('closebotSource override is honoured',
  run({ cfg: { closebotSource: 'yVjG5qcnOEwmIpZJ' } }),
  ['https://api.closebot.com/scripts/cb.js?source=yVjG5qcnOEwmIpZJ']);

process.exit(fails ? 1 : 0);
