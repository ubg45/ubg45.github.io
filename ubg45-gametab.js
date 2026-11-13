/* UBG45 game page: what you see when you open a game.
 *
 *   - U.gamePage(url)  the page written into the game's about:blank tab: the game on top, a bar under it (likes with the worldwide
 *                      count, share, report, full screen) and, further down, information about the game and how to control it.
 *   - U.infoHtml(f)    the "About this game" panel (details, controls, which devices it works on). Used in the game tab and on the
 *                      game page (#/play/<slug>) so both always show the same thing.
 *   - U.makeFx()       the like / share animations (a burst, a rolling number). Self-contained, so the game tab gets its own copy.
 *
 * Only facts we actually have are shown (see ubg45-info.js). A missing release year or developer is left out, never guessed.
 * The "works on" lines come from the kind of controls a game uses: a game that needs a keyboard says so on iPad and phone.
 */
(function (root) {
  'use strict';
  var U = (root.UBG45 = root.UBG45 || {});

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function fmtN(n) { return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }
  U.fmtN = fmtN;

  /* ---------------------------------------------------------------- animations (like burst, rolling number, share) */
  function makeFx() {
    var calm = false;
    try { calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* ignore */ }
    var COLORS = ['#ff4d6d', '#ffb300', '#2f5bff', '#8b3dea', '#18c29c', '#ff7a1a'];
    function again(el, cls, ms) {                                     // restart a CSS animation class
      el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
      setTimeout(function () { el.classList.remove(cls); }, ms || 700);
    }
    /* Sparks that fly out of a button. They live on <body> (fixed), so a button that clips its content cannot cut them off. */
    function burst(btn, kind) {
      if (calm || !btn || !btn.animate || !document.body) return;
      var r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, hearts = kind === 'like';
      var box = document.createElement('div');
      box.setAttribute('aria-hidden', 'true');
      box.style.cssText = 'position:fixed;left:' + cx + 'px;top:' + cy + 'px;width:0;height:0;z-index:2147483646;pointer-events:none';
      var ring = document.createElement('i');
      ring.style.cssText = 'position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;border:3px solid ' + (hearts ? '#ff4d6d' : '#2f5bff') + ';box-sizing:border-box';
      box.appendChild(ring);
      ring.animate([{ transform: 'scale(.3)', opacity: .9 }, { transform: 'scale(2.3)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      var n = hearts ? 14 : 9, i;
      for (i = 0; i < n; i++) {
        var p = document.createElement('i'), a = (i / n) * Math.PI * 2 + (Math.random() - .5) * .5, d = 52 + Math.random() * 46, s = 8 + Math.random() * 7;
        var dx = Math.cos(a) * d, dy = Math.sin(a) * d - 6, col = COLORS[(i + (hearts ? 0 : 2)) % COLORS.length], rot = (Math.random() - .5) * 140;
        if (hearts && i % 2 === 0) { p.textContent = '♥'; p.style.cssText = 'position:absolute;left:-9px;top:-11px;font:700 ' + (s + 11) + 'px/1 system-ui,sans-serif;color:' + col; }
        else p.style.cssText = 'position:absolute;left:' + (-s / 2) + 'px;top:' + (-s / 2) + 'px;width:' + s + 'px;height:' + s + 'px;border-radius:' + (i % 3 ? '50%' : '2px') + ';background:' + col;
        box.appendChild(p);
        p.animate([
          { transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1) rotate(' + rot + 'deg)', opacity: 1, offset: .55 },
          { transform: 'translate(' + dx * 1.12 + 'px,' + (dy * 1.12 + 14) + 'px) scale(.3) rotate(' + rot * 1.4 + 'deg)', opacity: 0 }
        ], { duration: 620 + Math.random() * 260, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' });
      }
      document.body.appendChild(box);
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1000);
    }
    /* A number that rolls to its new value: the old one slides out, the new one slides in. */
    function safe(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    function roll(el, text, up) {
      text = String(text);
      if (!el) return;
      if (calm || !el.animate || el.textContent === text) { el.textContent = text; return; }
      var old = el.textContent, h = el.offsetHeight || 18;
      el.style.cssText += ';display:inline-block;overflow:hidden;vertical-align:bottom;height:' + h + 'px;line-height:' + h + 'px';
      el.innerHTML = '<span style="display:block;will-change:transform"><span style="display:block">' + safe(up ? old : text) + '</span><span style="display:block">' + safe(up ? text : old) + '</span></span>';
      var w = el.firstChild, anim = w.animate(up ? [{ transform: 'translateY(0)' }, { transform: 'translateY(-' + h + 'px)' }] : [{ transform: 'translateY(-' + h + 'px)' }, { transform: 'translateY(0)' }], { duration: 380, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'forwards' });
      var fin = function () { el.textContent = text; el.style.height = ''; el.style.lineHeight = ''; el.style.overflow = ''; };
      anim.onfinish = fin; setTimeout(fin, 520);
    }
    return {
      like: function (btn, on) { if (on) { again(btn, 'fx-like', 800); burst(btn, 'like'); } else again(btn, 'fx-unlike', 450); },
      share: function (btn) { again(btn, 'fx-share', 900); burst(btn, 'share'); },
      done: function (btn, ms) { btn.classList.add('fx-done'); setTimeout(function () { btn.classList.remove('fx-done'); }, ms || 1900); },
      press: function (btn) { again(btn, 'fx-press', 300); },
      roll: roll, burst: burst
    };
  }
  U.makeFx = makeFx;

  /* ---------------------------------------------------------------- icons */
  var P = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var IC = {
    like: '<svg class="ic" viewBox="0 0 24 24" ' + P + '><path d="M7 11v9H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11H7zM7 11l3.6-7.2A2.4 2.4 0 0 1 13 6.2V9.5h5.4a2 2 0 0 1 2 2.3l-1.1 6.5a2 2 0 0 1-2 1.7H7"/></svg>',
    share: '<svg class="ic ic-share" viewBox="0 0 24 24" ' + P + '><path d="M4 12v6.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V12M16 6l-4-4-4 4M12 2v13"/></svg>' +
      '<svg class="ic ic-ok" viewBox="0 0 24 24" ' + P + '><path class="tick" d="M5 12.5l4.6 4.6L19.2 7.4"/></svg>',
    flag: '<svg class="ic" viewBox="0 0 24 24" ' + P + '><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    fs: '<svg class="ic e" viewBox="0 0 24 24" ' + P + '><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><svg class="ic c" viewBox="0 0 24 24" ' + P + '><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    down: '<svg class="ic" viewBox="0 0 24 24" ' + P + '><path d="M6 9l6 6 6-6"/></svg>',
    globe: '<svg class="ic" viewBox="0 0 24 24" ' + P + '><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/></svg>',
    laptop: '<svg viewBox="0 0 24 24" ' + P + '><rect x="4.5" y="5" width="15" height="10.5" rx="1.6"/><path d="M2.5 19h19"/></svg>',
    chrome: '<svg viewBox="0 0 24 24" ' + P + '><rect x="3.5" y="5" width="17" height="11" rx="1.6"/><path d="M8 19.5h8M12 16v3.5"/></svg>',
    tablet: '<svg viewBox="0 0 24 24" ' + P + '><rect x="5" y="2.8" width="14" height="18.4" rx="2.2"/><path d="M11 18.2h2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" ' + P + '><rect x="7.5" y="2.8" width="9" height="18.4" rx="2.2"/><path d="M11 18.2h2"/></svg>'
  };
  U.infoIcons = IC;

  /* ---------------------------------------------------------------- the information panel */
  /* Which devices a game suits, worked out from the controls it uses (i: k = needs a keyboard, m = mouse or tap, t = touch swipes/taps). */
  function devices(i) {
    var inp = String((i && i.i) || ''), known = !!inp, touch = known && (inp.indexOf('t') >= 0 || inp === 'm'), kb = known && !touch;
    var tab = !known ? ['maybe', 'Not tested'] : touch ? ['yes', 'Yes, with touch'] : ['kb', 'Needs a keyboard'];
    var ph = !known ? ['maybe', 'Not tested'] : touch ? ['yes', 'Yes, small screen'] : ['no', 'Not recommended'];
    return [
      { k: 'laptop', n: 'Laptop and desktop', s: 'yes', t: 'Yes', d: !known ? 'Keyboard and mouse' : kb ? 'Keyboard' : inp === 'm' ? 'Mouse' : 'Mouse or keyboard' },
      { k: 'chrome', n: 'Chromebook', s: 'yes', t: 'Yes', d: 'Runs in the browser' },
      { k: 'tablet', n: 'iPad and tablets', s: tab[0], t: tab[1], d: kb ? 'Works with a Bluetooth keyboard' : known ? 'Tap or swipe' : 'We have not tried it' },
      { k: 'phone', n: 'Phones', s: ph[0], t: ph[1], d: kb ? 'No on-screen controls' : known ? 'Best held sideways' : 'We have not tried it' }
    ];
  }
  function keyChips(k) {
    return String(k).split(' / ').map(function (x) {
      var mouse = /^(mouse|click|tap|swipe|drag|touch|hold)/i.test(x);
      return '<kbd class="' + (mouse ? 'ms' : '') + '">' + esc(x.trim()) + '</kbd>';
    }).join('<span class="or">or</span>');
  }
  function dateLabel(d) {
    var t = Date.parse(d + 'T00:00:00Z'); if (isNaN(t)) return '';
    try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return d; }
  }

  /* f = { title, id, likes, cats: [name], added: 'YYYY-MM-DD', isNew, info, related: [{title, url, thumb}], social: bool }  */
  function infoHtml(f, opt) {
    opt = opt || {};
    var i = f.info || {}, rows = '', h = '', c;
    if (i.y) rows += '<div><dt>First released</dt><dd>' + esc(i.y) + '</dd></div>';
    if (i.d) rows += '<div><dt>Made by</dt><dd>' + esc(i.d) + '</dd></div>';
    var kind = i.g || (f.cats && f.cats.length ? f.cats.slice(0, 3).join(', ') : '');
    rows += '<div><dt>Type</dt><dd>' + esc(kind || 'Browser game') + '</dd></div>';
    if (i.p) rows += '<div><dt>Players</dt><dd>' + esc(i.p) + '</dd></div>';
    if (f.added && f.added > '2001-01-01') rows += '<div><dt>Added to UBG45</dt><dd>' + esc(dateLabel(f.added)) + (f.isNew ? ' <em class="ig-new">New</em>' : '') + '</dd></div>';
    if (f.social) rows += '<div><dt>Likes worldwide</dt><dd><span class="ig-lk">' + IC.globe + '<b class="igLikes">' + fmtN(f.likes || 0) + '</b></span></dd></div>';

    var ctl = (i.c || []).map(function (x) { var p = String(x).split('|'); return '<li><span class="keys">' + keyChips(p[0]) + '</span><span class="act">' + esc(p[1] || '') + '</span></li>'; }).join('');
    if (!ctl) ctl = String(i.i || '') === 'm'
      ? '<li><span class="keys"><kbd class="ms">Mouse</kbd><span class="or">or</span><kbd class="ms">Tap</kbd></span><span class="act">Click or tap to play</span></li>'
      : '<li class="plain">Keyboard and mouse. The game explains its own controls on screen when it starts.</li>';

    h += '<section class="ig" aria-labelledby="igT"><div class="ig-h"><h2 id="igT">About <span>' + esc(f.title) + '</span></h2>';
    if (f.cats && f.cats.length) h += '<div class="ig-tags">' + f.cats.slice(0, 4).map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('') + '</div>';
    h += '</div>';
    if (i.a) h += '<p class="ig-about">' + esc(i.a) + '</p>';
    h += '<div class="ig-grid">';
    h += '<div class="ig-card"><h3>Details</h3><dl>' + rows + '</dl></div>';
    h += '<div class="ig-card"><h3>Controls</h3><ul class="ig-ctl">' + ctl + '</ul><p class="ig-tip">Tip: click inside the game once so it can hear your keyboard.</p></div>';
    h += '<div class="ig-card"><h3>Works on</h3><ul class="ig-dev">' + devices(i).map(function (d) {
      return '<li><span class="di">' + IC[d.k] + '</span><span class="dn"><b>' + d.n + '</b><small>' + d.d + '</small></span><span class="pill ' + d.s + '">' + d.t + '</span></li>';
    }).join('') + '</ul><p class="ig-tip">Based on the controls the game uses. Not every game has been tried on every device.</p></div>';
    h += '</div>';
    if (opt.related && f.related && f.related.length) {
      h += '<h3 class="ig-rh">More games like this</h3><div class="ig-rel">' + f.related.map(function (r) {
        return '<a class="rel" href="#" data-u="' + esc(r.url) + '"><span class="rt">' + (r.thumb ? '<img src="' + esc(r.thumb) + '" alt="" loading="lazy">' : '') + '</span><span class="rn">' + esc(r.title) + '</span></a>';
      }).join('') + '</div>';
    }
    h += '<p class="ig-credit">Games belong to their creators. UBG45 only links to them.</p></section>';
    return h;
  }
  U.infoHtml = infoHtml;

  /* Shared look of the like / share / report buttons and the info panel. Uses the site's colour variables. */
  U.fxCss = [
    '.fx-like>svg:first-child{animation:fxThumb .62s cubic-bezier(.3,1.4,.5,1)}',
    '.fx-like{animation:fxGlow .7s ease-out}',
    '.fx-unlike>svg:first-child{animation:fxDrop .4s ease}',
    '.fx-share .ic-share{animation:fxFly .7s cubic-bezier(.4,0,.2,1)}',
    '.fx-share{animation:fxGlowB .7s ease-out}',
    '.fx-press{animation:fxPress .3s cubic-bezier(.3,1.5,.5,1)}',
    '.ic-ok{display:none}',
    '.fx-done .ic-share{display:none}.fx-done .ic-ok{display:block}.fx-done .ic-ok .tick{stroke-dasharray:26;stroke-dashoffset:26;animation:fxTick .42s .05s ease forwards}',
    '@keyframes fxThumb{0%{transform:scale(1) rotate(0)}20%{transform:scale(.7) rotate(10deg)}50%{transform:scale(1.45) rotate(-24deg)}75%{transform:scale(.94) rotate(8deg)}100%{transform:scale(1) rotate(0)}}',
    '@keyframes fxDrop{0%{transform:scale(1)}40%{transform:scale(.7) translateY(2px)}100%{transform:scale(1)}}',
    '@keyframes fxGlow{0%{box-shadow:0 0 0 0 rgba(239,75,106,.55)}100%{box-shadow:0 0 0 18px rgba(239,75,106,0)}}',
    '@keyframes fxGlowB{0%{box-shadow:0 0 0 0 rgba(47,91,255,.5)}100%{box-shadow:0 0 0 18px rgba(47,91,255,0)}}',
    '@keyframes fxFly{0%{transform:translate(0,0);opacity:1}38%{transform:translate(15px,-17px) scale(.7);opacity:0}39%{transform:translate(-15px,17px) scale(.7);opacity:0}100%{transform:translate(0,0);opacity:1}}',
    '@keyframes fxTick{to{stroke-dashoffset:0}}',
    '@keyframes fxPress{0%{transform:scale(.9)}60%{transform:scale(1.06)}100%{transform:scale(1)}}',
    '@media (prefers-reduced-motion:reduce){.fx-like,.fx-share,.fx-press,.fx-like>svg,.fx-share .ic-share,.fx-unlike>svg{animation:none!important}}'
  ].join('');

  U.infoCss = [
    '.ig{margin:26px auto 8px;max-width:1180px;color:var(--ink);animation:igIn .55s cubic-bezier(.2,.8,.2,1) both}',
    '@keyframes igIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
    '.ig-h{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-bottom:10px}',
    '.ig-h h2{font:700 22px/1.2 var(--display);letter-spacing:-.02em;margin:0}.ig-h h2 span{color:var(--blue)}',
    '.ig-tags{display:flex;flex-wrap:wrap;gap:6px}.ig-tags span{font-size:12.5px;font-weight:600;padding:4px 11px;border-radius:999px;background:var(--blue-soft);color:var(--blue)}',
    '.ig-about{margin:0 0 16px;color:var(--ink-2);font-size:15.5px;line-height:1.6;max-width:78ch}',
    '.ig-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}',
    '.ig-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px;box-shadow:var(--shadow);transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .25s}',
    '.ig-card:hover{transform:translateY(-3px)}',
    '.ig-grid>.ig-card{animation:igCard .55s cubic-bezier(.2,.8,.2,1) both}.ig-grid>.ig-card:nth-child(2){animation-delay:.08s}.ig-grid>.ig-card:nth-child(3){animation-delay:.16s}',
    '@keyframes igCard{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}',
    '.ig-dev li{animation:igPill .5s cubic-bezier(.2,.8,.2,1) both}.ig-dev li:nth-child(2){animation-delay:.07s}.ig-dev li:nth-child(3){animation-delay:.14s}.ig-dev li:nth-child(4){animation-delay:.21s}',
    '@keyframes igPill{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}',
    '.ig-lk .ic{transition:transform .6s cubic-bezier(.34,1.56,.64,1)}.ig-card:hover .ig-lk .ic{transform:rotate(180deg)}',
    '.ig-card h3{margin:0 0 10px;font:700 12.5px/1 var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}',
    '.ig-card dl{margin:0;display:grid;gap:0}.ig-card dl>div{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-top:1px solid var(--line-2);font-size:14.5px}',
    '.ig-card dl>div:first-child{border-top:0;padding-top:2px}.ig-card dt{color:var(--muted)}.ig-card dd{margin:0;font-weight:600;text-align:right}',
    '.ig-new{font-style:normal;font-size:11px;font-weight:700;color:#fff;background:var(--new);padding:2px 7px;border-radius:999px;margin-left:4px;vertical-align:1px}',
    '.ig-lk{display:inline-flex;align-items:center;gap:6px;color:#e0405f}.ig-lk .ic{width:17px;height:17px}.ig-lk b{color:var(--ink);font-variant-numeric:tabular-nums}',
    '.ig-dev{list-style:none;margin:0;padding:0;display:grid;gap:9px}',
    '.ig-ctl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:minmax(0,max-content) minmax(0,1fr);gap:10px 14px;align-items:center}',
    '.ig-ctl li{display:contents;font-size:14.5px}.ig-ctl .keys{display:flex;flex-wrap:wrap;align-items:center;gap:4px;max-width:210px}.ig-ctl .act{color:var(--ink-2);line-height:1.35}.ig-ctl .plain{grid-column:1/-1;color:var(--ink-2);line-height:1.5}',
    '.ig-ctl kbd{font:700 12.5px/1 var(--font);padding:6px 9px;border-radius:8px;background:var(--soft);color:var(--ink);box-shadow:inset 0 -2px 0 var(--soft-3),0 0 0 1px var(--line);white-space:nowrap;cursor:default;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .15s;user-select:none}',
    '.ig-ctl kbd:hover{transform:translateY(-2px)}.ig-ctl kbd:active{transform:translateY(1px);box-shadow:inset 0 0 0 var(--soft-3),0 0 0 1px var(--line);transition-duration:.05s}',
    '.ig-ctl kbd.ms{background:var(--blue-soft);color:var(--blue);box-shadow:inset 0 -2px 0 rgba(47,91,255,.25),0 0 0 1px rgba(47,91,255,.18)}',
    '.ig-ctl .or{font-size:11px;color:var(--muted);padding:0 1px}',
    '.ig-dev li{display:flex;align-items:center;gap:11px}.ig-dev .di{width:34px;height:34px;border-radius:10px;background:var(--soft);display:grid;place-items:center;flex:none;color:var(--ink-2)}.ig-dev .di svg{width:19px;height:19px}',
    '.ig-dev .dn{display:flex;flex-direction:column;min-width:0;flex:1;line-height:1.25}.ig-dev .dn b{font-size:14.5px}.ig-dev .dn small{color:var(--muted);font-size:12.5px}',
    '.pill{font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;background:var(--soft);color:var(--muted)}',
    '.pill.yes{background:#dcf5e8;color:#157347}.pill.kb{background:#fff0d6;color:#9a5b00}.pill.no{background:#fde2e5;color:#b3263e}.pill.maybe{background:var(--soft);color:var(--muted)}',
    ':root[data-theme="dark"] .pill.yes{background:#123524;color:#6fe3a4}:root[data-theme="dark"] .pill.kb{background:#3a2a0a;color:#ffc766}:root[data-theme="dark"] .pill.no{background:#3d1520;color:#ff8da1}',
    '.ig-tip{margin:12px 0 0;font-size:12.5px;line-height:1.5;color:var(--muted)}',
    '.ig-rh{margin:22px 0 10px;font:700 16px/1.2 var(--display)}',
    '.ig-rel{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}',
    '.ig-rel .rel{display:block;text-decoration:none;color:var(--ink);transition:transform .3s cubic-bezier(.34,1.56,.64,1)}.ig-rel .rel:hover{transform:translateY(-4px)}.ig-rel .rel:active{transform:scale(.95)}',
    '.ig-rel .rt{display:block;aspect-ratio:1;border-radius:14px;overflow:hidden;background:var(--soft-2);box-shadow:var(--shadow)}.ig-rel img{width:100%;height:100%;object-fit:cover;display:block}',
    '.ig-rel .rn{display:block;margin-top:6px;font-size:13px;font-weight:600;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.ig-credit{margin:18px 0 0;font-size:12.5px;color:var(--muted);text-align:center}',
    '@media (max-width:980px){.ig-grid{grid-template-columns:1fr 1fr}.ig-grid>.ig-card:last-child{grid-column:1/-1}}',
    '@media (max-width:640px){.ig-grid{grid-template-columns:1fr}.ig-h h2{font-size:19px}.ig-ctl{grid-template-columns:1fr;gap:4px}.ig-ctl .act{margin:0 0 8px}.ig-ctl .keys{max-width:none}}',
    '@media (prefers-reduced-motion:reduce){.ig,.ig-card,.ig-rel .rel,.ig-grid>.ig-card,.ig-dev li,.ig-ctl kbd,.ig-lk .ic{animation:none!important;transition:none!important}}'
  ].join('');

  /* ---------------------------------------------------------------- the game tab */
  var TOKENS = ['--bg', '--surface', '--ink', '--ink-2', '--muted', '--line', '--line-2', '--line-3', '--soft', '--soft-2', '--soft-3', '--blue', '--blue-soft', '--new', '--shadow', '--display', '--font'];
  function tokenCss() {
    var cs = getComputedStyle(document.documentElement), out = ':root{';
    TOKENS.forEach(function (t) { var v = cs.getPropertyValue(t); if (v && v.trim()) out += t + ':' + v.trim() + ';'; });
    return out + '}';
  }
  function abs(u) { try { return new URL(u, document.baseURI).href; } catch (e) { return u; } }

  var TAB_CSS = [
    '*{box-sizing:border-box}html{color-scheme:light dark;scroll-behavior:smooth;scrollbar-gutter:stable}html.ubgLock{overflow:hidden}html:has(#ubgStage:hover){overflow:hidden}',
    'body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 var(--font);-webkit-font-smoothing:antialiased}',
    '#ubgStage{position:relative;height:calc(100vh - 62px);height:calc(100dvh - 62px);min-height:300px;background:#0b1020;overflow:hidden}',
    '#ubgStage:fullscreen{height:100%;width:100%}',
    '#ubgStage::before{content:"";position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid rgba(255,255,255,.18);border-top-color:#fff;animation:ubgSpin .8s linear infinite}',
    '@keyframes ubgSpin{to{transform:rotate(360deg)}}',
    '#ubgStage.ready::before{display:none}#ubgFrame{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:transparent}',
    '#ubgBar{height:62px;display:flex;align-items:center;gap:8px;padding:0 14px;background:var(--surface);border-bottom:1px solid var(--line);position:relative;z-index:2}',
    '#ubgBar .tt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2}',
    '#ubgBar .tt b{font:700 17px/1.2 var(--display);letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#ubgBar .tt small{color:var(--muted);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.ub{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;min-width:40px;padding:0 13px;border:0;border-radius:12px;background:var(--soft);color:var(--ink);font:600 14px/1 var(--font);cursor:pointer;-webkit-tap-highlight-color:transparent;',
    'transition:transform .25s cubic-bezier(.34,1.56,.64,1),background .2s,color .2s,box-shadow .25s;user-select:none}',
    '.ub:hover{background:var(--soft-2);transform:translateY(-2px)}.ub:active{transform:translateY(0) scale(.92);transition-duration:.07s}',
    '.ub:focus-visible{outline:2px solid var(--blue);outline-offset:2px}.ub:disabled{opacity:.6;cursor:progress}',
    '.ub .ic{width:19px;height:19px;flex:none;transition:transform .3s cubic-bezier(.34,1.56,.64,1),fill .25s}.ub:hover .ic{transform:scale(1.12)}',
    '.ub .n{font-variant-numeric:tabular-nums;min-width:1ch}.ub .n:empty{display:none}',
    '#ubgLike[aria-pressed="true"]{background:#ef4b6a;color:#fff}#ubgLike[aria-pressed="true"] .ic{fill:#fff}#ubgLike[aria-pressed="true"]:hover{background:#e23a5a}',
    '#ubgShare.fx-done{background:#18a76b;color:#fff}',
    '#ubgReport.arm{background:#e0762a;color:#fff}#ubgReport.done{background:#18a76b;color:#fff}#ubgReport.done .ic{fill:#fff}',
    '#ubgInfoBtn{background:var(--blue);color:#fff}#ubgInfoBtn:hover{background:var(--blue);filter:brightness(1.1)}#ubgInfoBtn .ic{animation:ubgNudge 2.2s ease-in-out infinite}',
    '@keyframes ubgNudge{0%,60%,100%{transform:translateY(0)}75%{transform:translateY(3px)}88%{transform:translateY(-1px)}}',
    '#ubgFs .c{display:none}#ubgBar[data-fs="1"] #ubgFs .e{display:none}#ubgBar[data-fs="1"] #ubgFs .c{display:block}',
    '#ubgInfo{padding:6px 16px 44px}',
    '#ubgToast{position:fixed;left:50%;bottom:22px;transform:translate(-50%,16px) scale(.96);max-width:min(440px,92vw);background:var(--ink);color:var(--bg);padding:11px 18px;border-radius:999px;font-weight:600;font-size:14px;opacity:0;pointer-events:none;z-index:50;',
    'transition:opacity .22s,transform .35s cubic-bezier(.34,1.56,.64,1);box-shadow:0 14px 34px -8px rgba(0,0,0,.5)}#ubgToast.on{opacity:1;transform:translate(-50%,0) scale(1)}',
    '@media (hover:none){#ubgStage{touch-action:none}}',
    '@media (max-width:720px){#ubgBar{padding:0 10px;gap:6px}#ubgBar .tt small{display:none}.ub .t{display:none}.ub{padding:0 11px}#ubgInfoBtn .t{display:inline}#ubgInfoBtn{padding:0 12px}}',
    '@media (max-width:430px){#ubgInfoBtn .t{display:none}#ubgBar .tt b{font-size:15px}}',
    '@media (prefers-reduced-motion:reduce){.ub,.ub .ic,#ubgToast{transition:none}#ubgInfoBtn .ic,#ubgStage::before{animation:none}}'
  ].join('');

  /* Runs inside the game tab. Everything it needs is passed in (the tab shares nothing with the site except localStorage). */
  function tabCore(cfg, make, mkfx) {
    var $ = function (id) { return document.getElementById(id); };
    var stage = $('ubgStage'), frame = $('ubgFrame'), bar = $('ubgBar'), toast = $('ubgToast'), toastT = 0;
    var fx = mkfx(), soc = make({ u: cfg.u, k: cfg.k }), likes = cfg.n || 0, busy = false;
    function say(m) { if (!toast) return; toast.textContent = m; toast.className = 'on'; clearTimeout(toastT); toastT = setTimeout(function () { toast.className = ''; }, 3000); }
    function shown() { var els = document.querySelectorAll('.igLikes'), i; for (i = 0; i < els.length; i++) els[i].textContent = fmt(likes); }
    function fmt(n) { return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }
    function setCount(n, up) {
      var was = likes; likes = Math.max(0, n);
      var el = $('ubgLikeN'); if (el) { if (was !== likes && up != null) fx.roll(el, fmt(likes), up); else el.textContent = fmt(likes); }
      var all = document.querySelectorAll('.igLikes'), i; for (i = 0; i < all.length; i++) all[i].textContent = fmt(likes);
      var lb = $('ubgLike'); if (lb) lb.title = (soc.isLiked(cfg.id) ? 'You like this game. ' : 'Like this game. ') + likes + (likes === 1 ? ' person' : ' people') + ' worldwide ' + (likes === 1 ? 'likes' : 'like') + ' it';
    }
    // game: keyboard goes to it straight away
    if (frame) { frame.addEventListener('load', function () { try { frame.focus(); } catch (e) { /* ignore */ } if (stage) stage.className = 'ready'; }); setTimeout(function () { try { frame.focus(); } catch (e) { /* ignore */ } }, 400); }
    // scrolling with the mouse over the game never scrolls the page (the game gets the wheel); over the bar and the info it scrolls as normal
    if (stage) {
      var root = document.documentElement, lock = function (on) { root.classList.toggle('ubgLock', on); };
      stage.addEventListener('pointerenter', function () { lock(true); });
      stage.addEventListener('mouseenter', function () { lock(true); });
      stage.addEventListener('pointerleave', function () { lock(false); });
      stage.addEventListener('mouseleave', function () { lock(false); });
      // the game is a separate page, so when the mouse leaves quickly we may not be told: any movement outside the game releases the lock
      document.addEventListener('mousemove', function (e) { if (root.classList.contains('ubgLock') && !(e.target.closest && e.target.closest('#ubgStage'))) lock(false); }, true);
      window.addEventListener('blur', function () { lock(false); });
    }
    // full screen (the game area only, so the bar stays out of the way)
    var fsB = $('ubgFs');
    if (fsB) {
      var el = stage || document.documentElement;
      var can = !!(el.requestFullscreen || el.webkitRequestFullscreen);
      if (!can) fsB.style.display = 'none';
      var on = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };
      var paint = function () { var f = on(); bar.setAttribute('data-fs', f ? '1' : '0'); fsB.title = f ? 'Exit full screen' : 'Full screen'; fsB.setAttribute('aria-label', fsB.title); if (f) { try { frame.focus(); } catch (e) { /* ignore */ } } };
      fsB.addEventListener('click', function () { fx.press(fsB); try { if (on()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (e) { /* ignore */ } });
      document.addEventListener('fullscreenchange', paint); document.addEventListener('webkitfullscreenchange', paint); paint();
    }
    // like
    var lk = $('ubgLike');
    if (lk) {
      var paintLike = function (v) { lk.setAttribute('aria-pressed', v ? 'true' : 'false'); var l = lk.querySelector('.t'); if (l) l.textContent = v ? 'Liked' : 'Like'; };
      paintLike(soc.isLiked(cfg.id)); setCount(likes, null);
      lk.addEventListener('click', function () {
        if (busy) return; busy = true;
        var want = !soc.isLiked(cfg.id); paintLike(want); fx.like(lk, want); setCount(likes + (want ? 1 : -1), want);
        soc.setLike(cfg.id, want).then(function (r) {
          busy = false;
          if (!r.ok) { paintLike(r.liked); setCount(likes + (want ? -1 : 1), !want); say('Could not save your like. Check your connection.'); return; }
          say(r.liked ? 'Liked. Thanks!' : 'Like removed.');
        });
      });
      soc.counts(function (map, cached) { if (!busy) var v = map[cfg.id] || 0; setCount(v, cached || v === likes ? null : v > likes); });
    }
    // share
    var sh = $('ubgShare');
    if (sh) sh.addEventListener('click', function () {
      fx.share(sh);
      var touch = false; try { touch = matchMedia('(hover: none)').matches; } catch (e) { /* ignore */ }
      if (touch && navigator.share) { navigator.share({ title: cfg.title + ' on UBG45', url: cfg.share }).catch(function () { /* cancelled */ }); return; }
      soc.copy(cfg.share).then(function (ok) { if (ok) { fx.done(sh); var t = sh.querySelector('.t'); if (t) { t.textContent = 'Copied'; setTimeout(function () { t.textContent = 'Share'; }, 1900); } } say(ok ? 'Link copied. Paste it to share this game.' : 'Could not copy. The link is ' + cfg.share); });
    });
    // report a broken game (press twice)
    var rp = $('ubgReport');
    if (rp) {
      var armed = false, armT = 0, disarm = function () { armed = false; clearTimeout(armT); rp.classList.remove('arm'); };
      if (soc.isReported(cfg.id)) rp.classList.add('done');
      rp.addEventListener('click', function () {
        fx.press(rp);
        if (soc.isReported(cfg.id)) { say('You already reported this game today. Thanks!'); return; }
        if (!armed) { armed = true; rp.classList.add('arm'); say('Is this game broken? Press the flag again to report it.'); armT = setTimeout(disarm, 4500); return; }
        disarm(); rp.disabled = true;
        soc.report(cfg.id).then(function (r) {
          rp.disabled = false;
          if (r === 'ok' || r === 'dup') { rp.classList.add('done'); say('Report sent. Thanks, we will check this game.'); } else say('Could not send the report. Try again later.');
        });
      });
    }
    // scroll to the information
    var ib = $('ubgInfoBtn'), info = $('ubgInfo');
    if (ib && info) ib.addEventListener('click', function () { fx.press(ib); try { info.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { info.scrollIntoView(); } });
    // other games from the same area open in a new tab, like they do on the site
    if (info) info.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.rel'); if (!a) return;
      e.preventDefault();
      var u = a.getAttribute('data-u');
      try { if (window.opener && window.opener.openGame) { window.opener.openGame(u, 'Google Docs'); return; } } catch (er) { /* opener closed */ }
      window.open(u, '_blank');
    });
  }

  U.gamePage = function (url) {
    var g = U.currentGame, soc = U.social, safe = esc(url);
    var legacy = '<style>body{margin:0;overflow:hidden}iframe{width:100vw;height:100vh;border:none}</style>' +
      '<iframe src="' + safe + '" frameborder="0" allow="fullscreen; autoplay; gamepad; clipboard-write" allowfullscreen></iframe>' + (U.gameFs ? U.gameFs() : '');
    if (!g || !g.facts) return legacy;                       // not a catalog game (for example the feedback form): just the page, full screen
    try {
      var f = g.facts, withSocial = !!(soc && soc.on), cfg = { u: withSocial ? soc.cfg.u : '', k: withSocial ? soc.cfg.k : '', id: g.id, title: g.title, share: g.share, n: f.likes || 0 };
      var make = (soc && soc.source) || 'function(){return{isLiked:function(){return false},isReported:function(){return false},counts:function(){},setLike:function(){return Promise.resolve({liked:false,ok:false})},report:function(){return Promise.resolve("off")},copy:function(){return Promise.resolve(false)}}}';
      var font = "@font-face{font-family:Poppins;font-weight:700;font-display:swap;src:url('" + abs('fonts/poppins-bold.woff') + "') format('woff')}@font-face{font-family:Poppins;font-weight:500;font-display:swap;src:url('" + abs('fonts/poppins-medium.woff') + "') format('woff')}";
      var sub = (f.cats && f.cats.length ? f.cats[0] : 'Free game') + (f.info && f.info.y ? ' · ' + f.info.y : '');
      var related = (f.related || []).map(function (r) { return { title: r.title, url: r.url, thumb: r.thumb ? abs(r.thumb) : '' }; });
      var css = font + tokenCss() + TAB_CSS + U.fxCss + U.infoCss;
      var html = '<style>' + css.replace(/<\/style/gi, '<\\/style') + '</style>' +
        '<div id="ubgStage"><iframe id="ubgFrame" src="' + safe + '" title="' + esc(g.title) + '" frameborder="0" allow="fullscreen; autoplay; gamepad; clipboard-write" allowfullscreen></iframe></div>' +
        '<div id="ubgBar" data-fs="0"><div class="tt"><b>' + esc(g.title) + '</b><small>' + esc(sub) + '</small></div>' +
        (withSocial ? '<button class="ub" id="ubgLike" type="button" aria-pressed="false" aria-label="Like this game">' + IC.like + '<span class="t">Like</span><span class="n" id="ubgLikeN"></span></button>' : '') +
        '<button class="ub" id="ubgShare" type="button" aria-label="Copy link to share this game" title="Copy link to share this game">' + IC.share + '<span class="t">Share</span></button>' +
        (withSocial ? '<button class="ub" id="ubgReport" type="button" aria-label="Report a broken game" title="Report a broken game">' + IC.flag + '<span class="t">Report</span></button>' : '') +
        '<button class="ub" id="ubgFs" type="button" aria-label="Full screen" title="Full screen">' + IC.fs + '</button>' +
        '<button class="ub" id="ubgInfoBtn" type="button" aria-label="Show game info and controls" title="Game info and controls">' + IC.down + '<span class="t">Info</span></button></div>' +
        '<div id="ubgInfo">' + infoHtml({ title: g.title, id: g.id, likes: f.likes, cats: f.cats, added: f.added, isNew: f.isNew, info: f.info, related: related, social: withSocial }, { related: true }) + '</div>' +
        '<div id="ubgToast" role="status" aria-live="polite"></div>';
      var js = '(' + tabCore.toString().replace(/<\/script/gi, '<\\/script') + ')(' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ',' + make.replace(/<\/script/gi, '<\\/script') + ',' + makeFx.toString().replace(/<\/script/gi, '<\\/script') + ');';
      return html + '<script>' + js + '<\/script>';
    } catch (e) { return legacy; }                            // never leave someone without a game
  };
})(window);
