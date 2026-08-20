// Exercises the location -> message + URL-tag routing path end to end.
const fs = require('fs');
const SRC = process.argv[2];

function run({ urlParam, saved, pick, cfgExtra }) {
  let sentMessages = [], replaceStateCalls = [], store = { cw_store: saved || null };

  function mkEl(tag) {
    const e = {
      tagName: (tag || '').toUpperCase(), style: {}, dataset: {}, children: [], options: [],
      _listeners: {}, className: '',
      classList: { _s: new Set(), add(c) { this._s.add(c) }, contains(c) { return this._s.has(c) } },
      appendChild(c) { this.children.push(c); if (this.tagName === 'SELECT') this.options.push(c); return c },
      addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn) },
      dispatch(t) { (this._listeners[t] || []).forEach(f => f()) },
      querySelector() { return null }, querySelectorAll() { return [] },
      setAttribute() {}, getAttribute() { return null },
      before() {}, closest() { return null },
      set innerHTML(v) {}, get innerHTML() { return '' },
      set textContent(v) {}, get textContent() { return '' }
    };
    return e;
  }

  const sendBtn = mkEl('button');
  sendBtn.click = () => {};
  const input = mkEl('input');
  const footer = mkEl('div');
  let inputValue = '';

  const panel = mkEl('div');
  panel.className = 'cb-panel';
  panel.querySelector = s => s === '.cb-footer' ? footer
                          : s === '.cb-input' ? input
                          : s === '.cb-send' ? sendBtn
                          : s === '.cw-bar' ? null : null;

  global.window = {};
  global.CW_CFG = undefined;
  global.location = { href: 'https://www.goautobahn.ca/inventory/' };
  global.history = { state: null, replaceState: (s, t, u) => replaceStateCalls.push(u) };
  global.URL = URL;
  global.MutationObserver = class { observe() {} };
  global.Option = function (label, value) { const o = mkEl('option'); o.label = label; o.value = value; return o };
  global.Event = class { constructor(t) { this.type = t } };
  global.localStorage = { getItem: k => store[k], setItem: (k, v) => store[k] = v };
  global.HTMLInputElement = { prototype: {} };
  Object.defineProperty(global.HTMLInputElement.prototype, 'value', {
    configurable: true, get() { return inputValue }, set(v) { inputValue = v; sentMessages.push(v) }
  });
  global.document = {
    readyState: 'complete', head: { appendChild() {} }, body: {},
    createElement: mkEl, addEventListener() {},
    querySelector() { return null },
    querySelectorAll: s => s === '.cb-panel' ? [panel] : []
  };
  global.window.CW_CFG = Object.assign({
    urlParam: !!urlParam,
    storageKey: 'cw_store',
    urlParamName: 'cw_store',
    locations: [{ name: 'Nanaimo AutoBahn', tag: 'nanaimo' }, { name: 'Victoria AutoBahn', tag: 'victoria' }]
  }, cfgExtra || {});

  eval(fs.readFileSync(SRC, 'utf8'));

  // find the <select> that build() created
  const bar = footer.__bar || null;
  const sel = (function find(node) {
    if (!node) return null;
    if (node.tagName === 'SELECT') return node;
    for (const c of node.children || []) { const r = find(c); if (r) return r }
    return null;
  })({ children: Object.values(global.__abCreated || {}) });

  return { sentMessages, replaceStateCalls, store, panel };
}

// We need build() to have run; capture the select via a patched before()
function runCapture(opts) {
  const out = { sent: [], urls: [], saved: null };
  const fs2 = require('fs');
  let src = fs2.readFileSync(SRC, 'utf8');
  const r = run(opts);
  return r;
}

let fails = 0;
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (ok ? '' : `\n        got:  ${JSON.stringify(got)}\n        want: ${JSON.stringify(want)}`));
}

// 1. slug + tag mapping via a custom config using plain strings
const a = run({ cfgExtra: { locations: ['Grande Cache AutoBahn'] } });
console.log('--- harness sanity: widget ran without throwing ---');
check('no exception, __cwWidget exported', typeof global.window.__cwWidget, 'function');

// 2. returning visitor with saved store + urlParam ON should stamp the URL
const b = run({ urlParam: true, saved: 'Nanaimo AutoBahn' });
check('returning visitor stamps ?cw_store=nanaimo',
  b.replaceStateCalls.map(u => new URL(u).searchParams.get('cw_store')), ['nanaimo']);

// 3. urlParam OFF must never touch history
const c = run({ urlParam: false, saved: 'Nanaimo AutoBahn' });
check('urlParam off => no replaceState', c.replaceStateCalls, []);

// 4. unknown saved value must not stamp or crash
const d = run({ urlParam: true, saved: 'Kelowna AutoBahn' });
check('unknown saved store is ignored', d.replaceStateCalls, []);

process.exit(fails ? 1 : 0);
