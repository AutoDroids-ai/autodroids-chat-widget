// Regression: a saved store must NEVER make the location picker unreachable.
// Previously hideLocationOnLoad:true removed the row entirely on every later visit.
const fs = require('fs');
const SRC = process.argv[2];

function run(savedStore) {
  const created = [];
  const mk = (tag) => {
    const e = {
      tagName: (tag || '').toUpperCase(), style: {}, dataset: {}, children: [], options: [],
      className: '', _l: {}, _cls: new Set(),
      classList: {
        add(c) { e._cls.add(c) }, remove(c) { e._cls.delete(c) }, contains(c) { return e._cls.has(c) }
      },
      appendChild(c) { e.children.push(c); if (e.tagName === 'SELECT') e.options.push(c); return c },
      addEventListener(t, f) { (e._l[t] = e._l[t] || []).push(f) },
      fire(t) { (e._l[t] || []).forEach(f => f()) },
      setAttribute() {}, getAttribute() { return null },
      querySelector() { return null }, querySelectorAll() { return [] },
      before() {}, closest() { return created.find(x => x.className === 'cw-bar') || null },
      set innerHTML(v) {}, get innerHTML() { return '' },
      set textContent(v) { e._text = v }, get textContent() { return e._text || '' }
    };
    created.push(e);
    return e;
  };
  const footer = mk('div'), input = mk('input'), sendBtn = mk('button');
  sendBtn.click = () => {};
  const panel = mk('div');
  panel.querySelector = s => ({ '.cb-footer': footer, '.cb-input': input, '.cb-send': sendBtn }[s] || null);

  global.window = { CW_CFG: { locations: [{name:'Victoria AutoBahn',tag:'victoria'},{name:'Nanaimo AutoBahn',tag:'nanaimo'}] } };
  global.MutationObserver = class { observe() {} };
  global.Option = function (l, v) { const o = mk('option'); o.value = v; return o };
  global.Event = class { constructor(t) { this.type = t } };
  global.localStorage = { _v: savedStore || null, getItem() { return this._v }, setItem(k, v) { this._v = v } };
  global.HTMLInputElement = { prototype: {} };
  Object.defineProperty(global.HTMLInputElement.prototype, 'value', { configurable: true, get() { return '' }, set() {} });
  global.location = { href: 'https://api.autodroids.ai/preview/x' };
  global.history = { state: null, replaceState() {} };
  global.document = {
    readyState: 'complete', body: {}, head: { appendChild() {} }, addEventListener() {},
    createElement: mk, querySelector: () => null,
    querySelectorAll: s => s === '.cb-panel' ? [panel] : []
  };
  eval(fs.readFileSync(SRC, 'utf8'));
  const loc = created.find(e => e.className === 'cw-loc');
  const sel = created.find(e => e.tagName === 'SELECT');
  const chg = created.find(e => e.className === 'cw-chg');
  return { loc, sel, chg };
}

let fails = 0;
const check = (l, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + l + (ok ? '' : `\n        got: ${JSON.stringify(got)} want: ${JSON.stringify(want)}`));
};

// Fresh visitor: picker visible and expanded.
let a = run(null);
check('fresh visitor sees the dropdown', [!!a.loc, a.loc._cls.has('is-set'), a.loc._cls.has('is-hidden')], [true, false, false]);

// Returning visitor: collapsed to confirmation, but NOT removed (the reported bug).
let b = run('Victoria AutoBahn');
check('returning visitor row still present', !!b.loc, true);
check('returning visitor row NOT hidden', b.loc._cls.has('is-hidden'), false);
check('returning visitor collapsed to confirmation', b.loc._cls.has('is-set'), true);
check('confirmation shows the saved store', b.loc.children.find(c => c.className === 'cw-cur').textContent, 'Victoria AutoBahn');

// Change link re-opens the dropdown.
b.chg.fire('click');
check('Change re-opens the dropdown', b.loc._cls.has('is-set'), false);

process.exit(fails ? 1 : 0);
