const fs = require('fs');
let styleText = '';
const el = () => ({
  style: {}, dataset: {}, classList: { add() {}, contains() { return false } }, children: [],
  appendChild(c) { this.children.push(c) }, addEventListener() {}, querySelector() { return null },
  querySelectorAll() { return [] }, before() {}, options: [{}],
  set innerHTML(v) {}, get innerHTML() { return '' }
});
global.window = {};
global.document = {
  readyState: 'complete',
  head: { appendChild(n) {} },
  body: {},
  createElement(t) {
    const e = el(); e.tagName = t.toUpperCase();
    Object.defineProperty(e, 'textContent', { set(v) { if (t === 'style') styleText = v }, get() { return '' } });
    return e;
  },
  querySelector() { return null }, querySelectorAll() { return [] }, addEventListener() {}
};
global.MutationObserver = class { observe() {} };
global.HTMLInputElement = { prototype: {} };
global.Option = function () {};
global.localStorage = { getItem() { return null }, setItem() {} };

eval(fs.readFileSync(process.argv[2], 'utf8'));

const checks = {
  'exports __cwWidget':      typeof global.window.__cwWidget === 'function',
  'dealer bubble (.cb-msg.bot)':   /.cb-msg.bot{background:#[0-9a-fA-F]{6}!important;color:#[0-9a-fA-F]{6}!important/.test(styleText),
  'customer bubble (.cb-msg.lead)': /\.cb-msg\.lead\{background:var\(--cw-ink\)/.test(styleText),
  'token override !important': /--cb-color:var\(--cw-red\)!important/.test(styleText),
  'chevron URL-encoded':      /stroke='%23[0-9a-fA-F]{6}'/.test(styleText),
  'launcher styled':          /\[data-cb\]\.cb-btn\{background:linear-gradient/.test(styleText),
  'send button styled':       /\.cb-send\{width:42px!important/.test(styleText),
  'location bar CSS':         /\.cw-loc select\{/.test(styleText),
  'no unresolved template':   !/\$\{/.test(styleText) && !/undefined/.test(styleText)
};
let fail = 0;
for (const [k, v] of Object.entries(checks)) { if (!v) fail++; console.log((v ? 'PASS  ' : 'FAIL  ') + k); }
console.log('\nCSS bytes: ' + styleText.length);
process.exit(fail ? 1 : 0);
