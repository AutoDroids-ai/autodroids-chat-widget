/**
 * Mock CloseBot DOM for the preview harness.
 *
 * CloseBot's own script refuses to mount on an unrecognised domain — its
 * /widget-for-page endpoint returns 204 and nothing renders — so localhost can
 * never show the real widget. This reproduces the exact structure our CSS
 * targets, read out of cb.js:
 *
 *   [data-cb].cb-panel > .cb-header (+ .cb-header-close)
 *                      > .cb-messages > .cb-msg-item.bot  > .cb-msg-avatar
 *                                                         > .cb-msg-content > .cb-msg.bot
 *                                     > .cb-msg-item.lead > .cb-msg.lead
 *                      > .cb-footer  > .cb-input, .cb-send
 *   [data-cb].cb-btn  (launcher)
 *
 * It also reproduces CloseBot's own theme rules — the panel/bubble/header
 * defaults and the inline --cb-color — so that anything our CSS has to *beat*
 * is present. A style that wins here wins on a real dealer page.
 */
(function () {
  var BOT = [
    'Hello! I am Mya, I am here to help. How can I assist you today? Are you looking for Trade, Credit, Inventory or maybe just have a general question.',
    'cool, and what’s your name?',
    'nice, what are you driving right now?'
  ];
  var LEAD = ['I’m shopping at MyCar North Bay.', 'Jordan'];

  // CloseBot's own stylesheet, trimmed to what interacts with our overrides.
  var base = document.createElement('style');
  base.textContent = [
    '[data-cb].cb-panel{--cb-bg:#fff;--cb-border:#e5e7eb;--cb-text:#111827;--cb-muted:#6b7280;',
    '--cb-soft-bg:#f3f4f6;--cb-input-bg:#fff;position:fixed;bottom:20px;right:20px;width:360px;height:560px;',
    'border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);background:var(--cb-bg);display:flex;',
    'flex-direction:column;overflow:hidden;z-index:99999;font-family:sans-serif;text-align:left}',
    '[data-cb].cb-panel.hidden{display:none}',
    '[data-cb] .cb-header{padding:14px 16px;color:#fff;font-family:sans-serif;display:flex;align-items:center;',
    'justify-content:space-between;gap:8px;background:var(--cb-color)}',
    '[data-cb] .cb-header-close{border:none;background:transparent;color:#fff;width:24px;height:24px;',
    'border-radius:9999px;cursor:pointer}',
    '[data-cb] .cb-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;',
    'font-size:14px;background:var(--cb-bg)}',
    '[data-cb] .cb-msg-item{display:flex;flex-direction:column;gap:4px;max-width:80%}',
    '[data-cb] .cb-msg-item.bot{align-self:flex-start;flex-direction:row;align-items:flex-end;gap:8px;max-width:100%}',
    '[data-cb] .cb-msg-item.lead{align-self:flex-end;align-items:flex-end;text-align:right}',
    '[data-cb] .cb-msg-avatar{width:18px;height:18px;border-radius:9999px;background:var(--cb-soft-bg);flex-shrink:0}',
    '[data-cb] .cb-msg{max-width:80%;padding:8px 12px;border-radius:12px;line-height:1.45;word-wrap:break-word;white-space:pre-line}',
    '[data-cb] .cb-msg.bot{background:var(--cb-soft-bg);color:var(--cb-text);border-bottom-left-radius:4px;max-width:100%}',
    '[data-cb] .cb-msg.lead{background:var(--cb-color);color:#fff;border-bottom-right-radius:4px;max-width:100%;text-align:right}',
    '[data-cb] .cb-footer{padding:8px;border-top:1px solid var(--cb-border);display:flex;gap:6px;background:var(--cb-bg)}',
    '[data-cb] .cb-input{flex:1;border:1px solid var(--cb-border);border-radius:8px;padding:8px 12px;font-size:14px;',
    'outline:none;background:var(--cb-input-bg);color:var(--cb-text)}',
    '[data-cb].cb-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:none;',
    'cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:99998;background:var(--cb-color)}',
    '[data-cb] .cb-send{border:none;border-radius:8px;padding:8px 10px;color:#fff;cursor:pointer;',
    'background:var(--cb-color);display:inline-flex;align-items:center;justify-content:center}'
  ].join('');
  document.head.appendChild(base);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var panel = el('div', 'cb-panel');
  panel.setAttribute('data-cb', '');
  // CloseBot sets this inline at runtime — our token override must beat it.
  panel.style.setProperty('--cb-color', '#3b82f6');

  var header = el('div', 'cb-header');
  header.appendChild(el('div', 'cb-header-title', 'Welcome to MyCar!'));
  var chatter = el('div', 'cb-header-chatter-icon', 'Mya');
  header.appendChild(chatter);
  header.appendChild(el('button', 'cb-header-close', '✕'));
  panel.appendChild(header);

  var msgs = el('div', 'cb-messages');
  function bot(t) {
    var item = el('div', 'cb-msg-item bot');
    item.appendChild(el('span', 'cb-msg-avatar'));
    var wrap = el('div', 'cb-msg-content');
    wrap.appendChild(el('div', 'cb-msg bot', t));
    item.appendChild(wrap);
    return item;
  }
  function lead(t) {
    var item = el('div', 'cb-msg-item lead');
    item.appendChild(el('div', 'cb-msg lead', t));
    return item;
  }
  msgs.appendChild(bot(BOT[0]));
  msgs.appendChild(lead(LEAD[0]));
  msgs.appendChild(bot(BOT[1]));
  msgs.appendChild(lead(LEAD[1]));
  msgs.appendChild(bot(BOT[2]));
  panel.appendChild(msgs);

  var footer = el('div', 'cb-footer');
  var input = el('input', 'cb-input');
  input.placeholder = 'Your message here';
  var send = el('button', 'cb-send', '➤');
  send.setAttribute('aria-label', 'send');
  footer.appendChild(input);
  footer.appendChild(send);
  panel.appendChild(footer);

  var launcher = el('button', 'cb-btn', '💬');
  launcher.setAttribute('data-cb', '');
  launcher.onclick = function () { panel.classList.toggle('hidden'); };

  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  // Quick-action clicks would try to talk to a real bot; keep the harness inert.
  send.onclick = function (e) { e.preventDefault(); };
})();
