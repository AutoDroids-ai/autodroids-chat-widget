/*! AutoDroids Chat Widget — mycar — built from dealers/mycar.json. Do not edit. */
/*!
 * AutoDroids Chat Widget — brand skin + location picker + quick actions for CloseBot.
 * Single file: injects its own CSS, loads CloseBot itself, no dependencies.
 *
 * DO NOT LINK TO THIS FILE. It has no dealer baked in. Ship the built,
 * self-contained per-dealer bundles instead:
 *   node build.js   ->   dist/<dealer>.js   (one per dealers/<dealer>.json)
 *
 * ROUTING: CloseBot's widget exposes no tagging API — /message carries {message}
 * only. Location routing must be applied server-side in CloseBot, keyed off the
 * location message text or (if urlParam is on) the ?<urlParamName>= value, which
 * CloseBot's /page-visit call reports automatically.
 *
 * The qualifying droid is shared across accounts and only ever LISTENS for a
 * store — it must never ask — so the widget decides whether a signal exists:
 *   0 locations   no picker, no signal (account has no location handoff)
 *   1 location    no picker, stamped silently so quick actions still carry it
 *   2+ locations  picker
 *
 * Targets CloseBot's internal DOM (.cb-panel/.cb-msg.bot/.cb-msg.lead/.cb-send).
 * Theme tokens (--cb-*) are CloseBot's public theming surface; the rest is
 * internal and may need re-checking if CloseBot ships a widget rewrite.
 */
(function () {
  'use strict';
  if (window.__cwWidget) return; // guard against double-injection

  // Replaced at build time with the contents of dealers/<name>.json.
  var DEALER = {
  "closebotSource": "YKejTuxKce8UG7pn",
  "brand": "#107cbd",
  "brandDark": "#143c6e",
  "ink": "#143c6e",
  "tint": "#f2f3f8",
  "font": "Lato,'Helvetica Neue',Helvetica,Arial,sans-serif",
  "fontUrl": "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
  "avatar": "https://ddztmb1ahc6o7.cloudfront.net/mycar/wp-content/uploads/2025/10/22091901/android-chrome-512x512-1.png",
  "storageKey": "mc_store",
  "urlParamName": "mc_store",
  "locations": [
    {
      "name": "MyCar North Bay",
      "tag": "north-bay"
    },
    {
      "name": "MyCar Kingston",
      "tag": "kingston"
    },
    {
      "name": "MyCar Richmond (Ottawa)",
      "tag": "richmond"
    }
  ],
  "actions": [
    [
      "🚗 Browse inventory",
      "I'm looking at inventory — what do you have?"
    ],
    [
      "💳 Get pre-approved",
      "I want to see what I qualify for."
    ],
    [
      "🔑 Trade-in value",
      "I have a trade-in I want to ask about."
    ],
    [
      "📅 Book a test drive",
      "I'd like to book a test drive."
    ]
  ],
  "border": "#e2e9f1",
  "control": "#e2e9f1",
  "radius": 3,
  "radiusPanel": 10,
  "radiusBubble": 14,
  "headerGradient": [
    "#143c6e"
  ],
  "headerRule": "rgba(255,255,255,.18)",
  "bubbleBg": "#f7fafd",
  "bubbleText": "#0e2a4e",
  "bubbleBorder": "#e2e9f1",
  "bubbleSpine": false
};

  // Generic defaults. Anything dealer-specific belongs in dealers/<name>.json;
  // window.CW_CFG still wins last so a single site can override in place.
  var CFG = Object.assign({
    brand:      '#0f172a',
    brandDark:  '#020617',
    ink:        '#0f172a',
    tint:       '#f1f5f9',
    font:       "system-ui,-apple-system,'Segoe UI',Arial,sans-serif",
    fontUrl:    '',          // Google Fonts href; '' = load nothing
    avatar:     '',          // '' = no header avatar
    darkCanvas: false,
    storageKey: 'cw_store',

    // Surfaces + corner rounding. Take these from the dealer's own theme CSS —
    // rounding is one of the strongest brand cues and varies a lot by dealer.
    border:  '#e6e6e6',      // hairlines
    control: '#cfdbe3',      // input / select / chip borders
    radius:       8,         // controls
    radiusPanel: 10,
    radiusBubble:12,
    headerGradient: [],      // [] = flat ink. Entries may carry a stop, '#abc 55%'
    headerRule:     '',      // '' = brand

    // Dealer-bubble surface. Defaults keep the plain grey card; set these to
    // mirror a real card style from the dealer's own site.
    bubbleBg:     '',        // '' = grey (or dark, if darkCanvas)
    bubbleText:   '',
    bubbleBorder: '',        // '' = no outline
    bubbleSpine:  true,      // the 3px accent bar on the left edge

    loadClosebot:   true,
    closebotSource: '',      // REQUIRED — set per dealer

    locationMessage: "I'm shopping at {name}.",
    urlParam:     false,
    urlParamName: 'cw_store',

    locations: [],
    actions:   []
  }, DEALER, window.CW_CFG || {});

  // ── Styles ────────────────────────────────────────────────────────────────
  var canvas = CFG.darkCanvas ? '#0f1720' : '#fff';
  var soft   = CFG.bubbleBg   || (CFG.darkCanvas ? '#1d2836' : '#f1f1f1');
  var softTx = CFG.bubbleText || (CFG.darkCanvas ? '#e5e7eb' : '#232323');
  var chev   = encodeURIComponent(CFG.ink);

  function rgba(hex, a) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  var hg       = CFG.headerGradient && CFG.headerGradient.length ? CFG.headerGradient : [CFG.ink];
  var headerBg = hg.length > 1 ? 'linear-gradient(135deg,' + hg.join(',') + ')' : hg[0];
  var hRule    = CFG.headerRule || CFG.brand;
  var rC = CFG.radius, rP = CFG.radiusPanel, rB = CFG.radiusBubble;
  var rSm = Math.min(4, rB), rXs = Math.min(3, rB);   // the clipped bubble corners

  var CSS = [
    ':root{--cw-red:' + CFG.brand + ';--cw-red-d:' + CFG.brandDark + ';--cw-ink:' + CFG.ink +
      ';--cw-tint:' + CFG.tint + ';--cw-bd:' + CFG.control + ';--cw-line:' + CFG.border +
      ';--cw-f:' + CFG.font + '}',

    /* 1. Brand tokens — !important beats CloseBot's inline --cb-color */
    '[data-cb].cb-panel,[data-cb].cb-panel.cb-theme-dark{--cb-color:var(--cw-red)!important;--cb-bg:' + canvas +
      '!important;--cb-soft-bg:' + soft + '!important;--cb-text:' + softTx +
      '!important;--cb-muted:#7c7c7c!important;--cb-border:' + CFG.border + '!important;--cb-input-bg:#fff!important;' +
      '--cb-scrollbar-thumb:#d3d3d3!important;width:400px!important;height:660px!important;max-width:92vw!important;' +
      'max-height:82vh!important;border-radius:' + rP + 'px!important;box-shadow:0 18px 50px ' + rgba(CFG.ink, .3) + '!important}',
    '[data-cb],[data-cb] *{font-family:var(--cw-f)!important}',
    '[data-cb] .cb-messages{scrollbar-width:none!important;padding:14px 12px!important;gap:10px!important}',
    '[data-cb] .cb-messages::-webkit-scrollbar{display:none!important;width:0!important}',

    /* 2. Header */
    '[data-cb] .cb-header{position:relative!important;min-height:72px!important;padding:14px 16px 14px ' +
      (CFG.avatar ? '78px' : '16px') + '!important;font-weight:700!important;background:' + headerBg +
      '!important;border-bottom:3px solid ' + hRule + '!important}',
    CFG.avatar
      ? '[data-cb] .cb-header::before{content:"";position:absolute;left:14px;top:50%;transform:translateY(-50%);width:52px;' +
        'height:52px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);' +
        'background:#fff url("' + CFG.avatar + '") center 25%/cover no-repeat;pointer-events:none}'
      : '',
    '[data-cb] .cb-header :is([class*=chatter],[class*=status],img){display:none!important}',
    '[data-cb] .cb-header,[data-cb] .cb-header *{color:#fff!important;background-color:transparent!important}',

    /* 3. Dealer vs customer bubbles */
    '[data-cb] .cb-msg{padding:11px 14px!important;line-height:1.45!important;font-size:14px!important}',
    '[data-cb] .cb-msg.bot{background:' + soft + '!important;color:' + softTx + '!important;' +
      (CFG.bubbleBorder ? 'border:1px solid ' + CFG.bubbleBorder + '!important;' : '') +
      (CFG.bubbleSpine ? 'border-left:3px solid var(--cw-red)!important;' : '') +
      'border-radius:' + (CFG.bubbleSpine ? rSm + 'px ' + rB + 'px ' + rB + 'px ' + rSm + 'px' : rB + 'px') +
      '!important}',
    '[data-cb] .cb-msg.lead{background:var(--cw-ink)!important;color:#fff!important;border-radius:' +
      rB + 'px ' + rB + 'px ' + rXs + 'px ' + rB + 'px!important}',
    '[data-cb] .cb-msg.bot a{color:var(--cw-red)!important;text-decoration:underline!important}',
    '[data-cb] .cb-msg.lead a{color:#fff!important;text-decoration:underline!important}',
    '[data-cb] .cb-msg-item.bot{max-width:90%!important}',
    '[data-cb] .cb-msg-item.lead{max-width:84%!important}',
    '[data-cb] .cb-msg-meta{font:700 10px/1 var(--cw-f)!important;letter-spacing:.08em!important;text-transform:uppercase!important}',
    '[data-cb] .cb-msg-item.bot .cb-msg-meta{color:var(--cw-red)!important}',
    '[data-cb] .cb-msg-avatar{border:1px solid var(--cw-bd)!important}',

    /* 4. Footer — dark surround, light input */
    '[data-cb] .cb-footer{padding:12px!important;gap:8px!important;background:var(--cw-ink)!important;border-top:0!important}',
    '[data-cb] .cb-input{background:#fff!important;color:var(--cw-ink)!important;border:1px solid rgba(255,255,255,.2)!important;' +
      'border-radius:' + rC + 'px!important;padding:12px 14px!important}',
    '[data-cb] .cb-input::placeholder{color:#7c7c7c!important;opacity:1!important}',
    '[data-cb] .cb-input:focus{border-color:var(--cw-red)!important;box-shadow:0 0 0 3px ' + rgba(CFG.brand, .35) + '!important}',
    '[data-cb] .cb-send{width:42px!important;height:42px!important;padding:0!important;flex-shrink:0!important;border-radius:50%!important}',
    '[data-cb] .cb-send:hover{background:var(--cw-red-d)!important}',
    '[data-cb].cb-btn{background:linear-gradient(135deg,var(--cw-red),var(--cw-red-d))!important;border:2px solid #fff!important;' +
      'box-shadow:0 8px 24px ' + rgba(CFG.brand, .4) + '!important}',

    /* 5. Location picker + quick actions */
    '.cw-bar{background:#fff;border-top:1px solid var(--cw-line)}',
    '.cw-bar .is-hidden,.cw-bar.is-hidden{display:none!important}',
    '.cw-loc{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--cw-tint);border-bottom:1px solid var(--cw-line)}',
    '.cw-loc>span{font:700 10.5px/1 var(--cw-f);letter-spacing:.07em;text-transform:uppercase;color:var(--cw-ink);white-space:nowrap}',
    '.cw-loc select{flex:1;min-width:0;-webkit-appearance:none;appearance:none;border:1px solid var(--cw-bd);border-radius:' +
      rC + 'px;padding:9px 30px 9px 11px;font:500 13px/1.2 var(--cw-f);color:var(--cw-ink);cursor:pointer;background:#fff ' +
      'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\'>' +
      '<path d=\'M1 1l5 5 5-5\' fill=\'none\' stroke=\'' + chev + '\' stroke-width=\'2\'/></svg>") no-repeat right 11px center}',
    '.cw-loc select:focus{border-color:var(--cw-red);box-shadow:0 0 0 3px ' + rgba(CFG.brand, .15) + ';outline:none}',
    '.cw-loc .cw-cur,.cw-loc .cw-chg{display:none}',
    '.cw-loc.is-set select{display:none}',
    '.cw-loc.is-set .cw-cur{display:block;flex:1;min-width:0;font:700 12.5px/1.2 var(--cw-f);color:var(--cw-ink);' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.cw-loc.is-set .cw-chg{display:block;font:600 11px/1 var(--cw-f);color:var(--cw-red);background:none;border:0;' +
      'padding:4px 2px;cursor:pointer;text-decoration:underline;white-space:nowrap}',
    '.cw-qa{display:flex;flex-wrap:wrap;gap:6px;padding:9px 12px}',
    '.cw-qa button{font:500 12.5px/1 var(--cw-f);color:var(--cw-ink);background:#fff;border:1px solid var(--cw-bd);' +
      'border-radius:' + rC + 'px;padding:9px 11px;cursor:pointer;transition:background .15s,color .15s,border-color .15s}',
    '.cw-qa button:hover{background:var(--cw-red);border-color:var(--cw-red);color:#fff}'
  ].filter(Boolean).join('\n');

  function injectCSS() {
    if (CFG.fontUrl && !document.querySelector('link[data-cw-font]')) {
      var f = document.createElement('link');
      f.rel = 'stylesheet';
      f.dataset.cwFont = '1';
      f.href = CFG.fontUrl;
      document.head.appendChild(f);
    }
    var s = document.createElement('style');
    s.dataset.cwWidget = '1';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── Locations ─────────────────────────────────────────────────────────────
  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Accept either 'Victoria AutoBahn' or {name:'Victoria AutoBahn', tag:'victoria'}
  var LOCS = (CFG.locations || []).map(function (l) {
    return typeof l === 'string' ? { name: l, tag: slug(l) } : { name: l.name, tag: l.tag || slug(l.name) };
  });

  function findLoc(name) {
    for (var i = 0; i < LOCS.length; i++) if (LOCS[i].name === name) return LOCS[i];
    return null;
  }

  function locMessage(loc) {
    return CFG.locationMessage.replace('{name}', loc.name).replace('{tag}', loc.tag);
  }

  // Second routing channel: CloseBot patches history.replaceState and fires
  // /page-visit on it, so this hands the backend a machine-readable tag.
  function stampUrl(loc) {
    if (!CFG.urlParam) return;
    try {
      var u = new URL(location.href);
      if (u.searchParams.get(CFG.urlParamName) === loc.tag) return;
      u.searchParams.set(CFG.urlParamName, loc.tag);
      history.replaceState(history.state, '', u.toString());
    } catch (e) {}
  }

  // ── Behaviour ─────────────────────────────────────────────────────────────
  var mem = {
    get: function () { try { return localStorage.getItem(CFG.storageKey); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(CFG.storageKey, v); } catch (e) {} }
  };

  function hide(el) {
    el.classList.add('is-hidden');
    var bar = el.closest('.cw-bar');
    if (bar && !Array.prototype.some.call(bar.children, function (c) {
      return !c.classList.contains('is-hidden');
    })) bar.classList.add('is-hidden');
  }

  function send(panel, text) {
    var input = panel.querySelector('.cb-input'), btn = panel.querySelector('.cb-send');
    if (!input || !btn) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
    ['input', 'change'].forEach(function (e) {
      input.dispatchEvent(new Event(e, { bubbles: true }));
    });
    setTimeout(function () { btn.click(); }, 40);
  }

  function build(panel) {
    var footer = panel.querySelector('.cb-footer');
    if (!footer || !panel.querySelector('.cb-input') || panel.querySelector('.cw-bar')) return;

    var bar = document.createElement('div');
    bar.className = 'cw-bar';

    // The qualifying droid is shared across accounts and only ever LISTENS for a
    // store — it must never ask. So the widget decides whether a store exists:
    //   0 locations  → account has no location handoff. No picker, no signal.
    //   1 location   → fixed rooftop. No picker; stamped silently so quick
    //                  actions still carry it for the listener.
    //   2+ locations → picker, as on the Go Autobahn group site.
    var current = null;
    var loc = null, sel = null, cur = null;

    // announce=false: set silently (fixed rooftop, or restoring a saved store) so
    // a page load never fabricates a chat message and therefore never a lead.
    function setStore(picked, announce) {
      current = picked;
      mem.set(picked.name);
      if (sel) {
        sel.value = picked.name;
        cur.textContent = picked.name;
        loc.classList.add('is-set');
      }
      stampUrl(picked);
      if (announce) send(panel, locMessage(picked));
    }

    if (LOCS.length > 1) {
      loc = document.createElement('div');
      loc.className = 'cw-loc';
      loc.innerHTML = '<span>📍 Location</span>';

      sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Select dealership location');
      sel.appendChild(new Option('Choose a store…', '', true, true));
      sel.options[0].disabled = true;
      LOCS.forEach(function (l) { sel.appendChild(new Option(l.name, l.name)); });

      cur = document.createElement('span');
      cur.className = 'cw-cur';
      var chg = document.createElement('button');
      chg.type = 'button';
      chg.className = 'cw-chg';
      chg.textContent = 'Change';
      chg.addEventListener('click', function () { loc.classList.remove('is-set'); });

      sel.addEventListener('change', function () {
        var picked = findLoc(sel.value);
        if (picked) setStore(picked, true);
      });

      loc.appendChild(sel);
      loc.appendChild(cur);
      loc.appendChild(chg);
      bar.appendChild(loc);
    }

    var qa = document.createElement('div');
    qa.className = 'cw-qa';
    CFG.actions.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = a[0];
      b.addEventListener('click', function () {
        send(panel, current ? a[1] + ' (' + current.name + ')' : a[1]);
        hide(qa);
      });
      qa.appendChild(b);
    });
    bar.appendChild(qa);

    footer.before(bar);

    if (LOCS.length === 1) {
      setStore(LOCS[0], false);            // fixed rooftop — stamp, never announce
    } else if (LOCS.length > 1) {
      var saved = findLoc(mem.get());
      if (saved) setStore(saved, false);   // returning visitor — restore, don't re-announce
    }
  }

  function run() {
    document.querySelectorAll('.cb-panel').forEach(build);
  }

  // CloseBot reads its own source key off its script tag via document.currentScript,
  // with a fallback that scans for '/scripts/cb.js' — both work for a dynamically
  // appended classic script, so injecting it here is equivalent to a hard-coded tag.
  function loadClosebot() {
    if (!CFG.loadClosebot || !CFG.closebotSource) return;
    // Never double-load: the site may still carry its own tag mid-rollout.
    if (document.querySelector('script[src*="/scripts/cb.js"]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://api.closebot.com/scripts/cb.js?source=' + encodeURIComponent(CFG.closebotSource);
    document.head.appendChild(s);
  }

  function start() {
    injectCSS();     // styles land before CloseBot renders — no unstyled flash
    loadClosebot();
    new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
    run();
  }

  window.__cwWidget = run; // manual retrigger from console
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
