// The qualifying droid is shared and only listens. Verify the widget decides
// whether a store signal exists at all, per account shape.
const fs = require('fs');
const SRC = process.argv[2];

function run(locations, saved) {
  const created = [], sent = [];
  const mk = (tag) => {
    const e = {
      tagName: (tag || '').toUpperCase(), style: {}, dataset: {}, children: [], options: [],
      className: '', _l: {}, _cls: new Set(),
      classList: { add(c){e._cls.add(c)}, remove(c){e._cls.delete(c)}, contains(c){return e._cls.has(c)} },
      appendChild(c){ e.children.push(c); if(e.tagName==='SELECT') e.options.push(c); return c },
      addEventListener(t,f){ (e._l[t]=e._l[t]||[]).push(f) }, fire(t){ (e._l[t]||[]).forEach(f=>f()) },
      setAttribute(){}, getAttribute(){return null}, dispatchEvent(){}, querySelector(){return null}, querySelectorAll(){return []},
      before(){}, closest(){ return created.find(x=>x.className==='cw-bar')||null },
      set innerHTML(v){}, get innerHTML(){return ''},
      set textContent(v){e._t=v}, get textContent(){return e._t||''}
    };
    created.push(e); return e;
  };
  const footer=mk('div'), input=mk('input'), sendBtn=mk('button'); sendBtn.click=()=>{};
  const panel=mk('div');
  panel.querySelector = s => ({'.cb-footer':footer,'.cb-input':input,'.cb-send':sendBtn}[s]||null);

  global.window={ CW_CFG:{ locations } };
  global.MutationObserver=class{observe(){}};
  global.Option=function(l,v){const o=mk('option');o.value=v;return o};
  global.Event=class{constructor(t){this.type=t}};
  global.localStorage={_v:saved||null,getItem(){return this._v},setItem(k,v){this._v=v}};
  global.HTMLInputElement={prototype:{}};
  Object.defineProperty(global.HTMLInputElement.prototype,'value',{configurable:true,get(){return ''},set(v){sent.push(v)}});
  global.location={href:'https://x.test/'}; global.history={state:null,replaceState(){}};
  global.document={readyState:'complete',body:{},head:{appendChild(){}},addEventListener(){},
    createElement:mk,querySelector:()=>null,querySelectorAll:s=>s==='.cb-panel'?[panel]:[]};
  eval(fs.readFileSync(SRC,'utf8'));

  const locRow = created.find(e=>e.className==='cw-loc');
  const qa = created.find(e=>e.className==='cw-qa');
  return { locRow, qa, sent, created };
}

let fails=0;
const check=(l,got,want)=>{const ok=JSON.stringify(got)===JSON.stringify(want);if(!ok)fails++;
  console.log((ok?'PASS  ':'FAIL  ')+l+(ok?'':`\n        got: ${JSON.stringify(got)} want: ${JSON.stringify(want)}`));};

// No location handoff: no picker at all, and nothing sent.
const a = run([], null);
check('0 locations renders no picker', !!a.locRow, false);
check('0 locations sends no message', a.sent, []);
const qaBtnA = a.qa.children[0]; qaBtnA.fire('click');
check('0 locations: quick action carries no store', a.sent, ["I'm looking at inventory — what do you have?"]);

// Single rooftop: no picker, but the store still rides along for the listener.
const b = run([{name:'Nanaimo AutoBahn',tag:'nanaimo'}], null);
check('1 location renders no picker', !!b.locRow, false);
check('1 location announces nothing on load', b.sent, []);
const qaBtnB = b.qa.children[0]; qaBtnB.fire('click');
check('1 location: quick action carries the store',
  b.sent, ["I'm looking at inventory — what do you have? (Nanaimo AutoBahn)"]);

// Group site: picker present.
const c = run([{name:'Victoria AutoBahn',tag:'victoria'},{name:'Nanaimo AutoBahn',tag:'nanaimo'}], null);
check('2+ locations renders the picker', !!c.locRow, true);
check('2+ locations announces nothing on load', c.sent, []);

process.exit(fails?1:0);
