// Regression: a FLAT header colour must survive. The child-stripping rule used
// to also target .cb-header, which erased background-color -- invisible on a
// gradient header (that paints via background-image) but fatal on a flat one.
const fs = require('fs');
let styleText = '';
const el = () => ({ style:{},dataset:{},classList:{add(){},remove(){},contains(){return false}},children:[],options:[],
  appendChild(){},addEventListener(){},setAttribute(){},getAttribute(){return null},dispatchEvent(){},
  querySelector(){return null},querySelectorAll(){return []},before(){},closest(){return null},
  set innerHTML(v){},get innerHTML(){return ''} });
global.window={};
global.document={readyState:'complete',body:{},head:{appendChild(){}},addEventListener(){},
  createElement(t){const e=el();e.tagName=t.toUpperCase();
    Object.defineProperty(e,'textContent',{set(v){if(t==='style')styleText=v},get(){return ''}});return e},
  querySelector(){return null},querySelectorAll(){return []}};
global.MutationObserver=class{observe(){}};
global.HTMLInputElement={prototype:{}};
global.Option=function(){};
global.localStorage={getItem(){return null},setItem(){}};
global.location={href:'https://x.test/'};
global.history={state:null,replaceState(){}};
eval(fs.readFileSync(process.argv[2],'utf8'));

// Parse the emitted CSS into {selectors, body} so the checks are precise.
const rules = styleText.split(String.fromCharCode(10)).filter(r => r.includes("{")).map(r => {
  const i = r.indexOf("{");
  return { sels: r.slice(0, i).split(",").map(s => s.trim()), body: r.slice(i) };
});
const hitsHeaderItself   = r => r.sels.some(s => s.endsWith(".cb-header"));
const hitsHeaderChildren = r => r.sels.some(s => s.endsWith(".cb-header *"));

const declaresBg     = rules.some(r => hitsHeaderItself(r) && /background:/.test(r.body));
const blanksOwnBg    = rules.some(r => hitsHeaderItself(r) && /background-color:s*transparent/.test(r.body));
const stripsChildren = rules.some(r => hitsHeaderChildren(r) && /background-color:s*transparent/.test(r.body));

let fails = 0;
const check = (label, ok) => { if (!ok) fails++; console.log((ok ? "PASS  " : "FAIL  ") + label); };
check("header declares its own background", declaresBg);
check("nothing blanks the header background", !blanksOwnBg);
check("header children are still stripped", stripsChildren);
process.exit(fails?1:0);
