/* UBG45 front-end layer.
 *
 * The catalog is the set of original `.game-card` elements inside #gameGrid
 * (index.html). Everything on the page – collage, rows, category pages, favourites –
 * is derived from those cards plus the curation in ubg45-config.js. The legacy
 * scripts in index.html (openGame, search triggers/secret games, openRandom) are
 * untouched and keep working.
 */
(function () {
  'use strict';

  var U = window.UBG45 || {};
  var C = U.config;
  var grid = document.getElementById('gameGrid');
  if (!C || !grid) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var body = document.body;

  /* ------------------------------------------------------------------ helpers */
  var norm = function (s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function store(key, val) {
    try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ }
    return null;
  }
  var ICON = {
    home: '<path fill="#ff7a2f" d="M3 11.2 12 3l9 8.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    new: '<path fill="#ffb02e" d="M10 3l1.9 5.4L17.5 10l-5.6 1.6L10 17l-1.9-5.4L2.5 10l5.6-1.6z"/><path fill="#ff7a2f" d="M18 13l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1z"/>',
    popular: '<rect x="3" y="13" width="4.5" height="8" rx="1" fill="#34b36b"/><rect x="9.8" y="8" width="4.5" height="13" rx="1" fill="#ffb02e"/><rect x="16.5" y="3" width="4.5" height="18" rx="1" fill="#ef4b4b"/>',
    random: '<rect x="3" y="3" width="18" height="18" rx="5" fill="#e0363f"/><g fill="#fff"><circle cx="8.5" cy="8.5" r="1.6"/><circle cx="15.5" cy="8.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="8.5" cy="15.5" r="1.6"/><circle cx="15.5" cy="15.5" r="1.6"/></g>',
    shooting: '<circle cx="12" cy="12" r="7" fill="none" stroke="#e0363f" stroke-width="2.4"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="#2b3245" stroke-width="2.2" stroke-linecap="round"/>',
    roblox: '<rect x="4.5" y="4.5" width="15" height="15" rx="2.5" transform="rotate(14 12 12)" fill="#e0363f"/><rect x="9.8" y="9.8" width="4.4" height="4.4" rx=".8" transform="rotate(14 12 12)" fill="#fff"/>',
    racing: '<path d="M5 21V3" stroke="#2b3245" stroke-width="2.2" stroke-linecap="round"/><path d="M5 4h14v9H5z" fill="#fff" stroke="#2b3245" stroke-width="1.6"/><path d="M5 4h3.5v3H5zM12 4h3.5v3H12zM8.5 7H12v3H8.5zM15.5 7H19v3h-3.5zM5 10h3.5v3H5zM12 10h3.5v3H12z" fill="#2b3245"/>',
    car: '<path d="M4 15v-3.2l2-4.3a2 2 0 0 1 1.8-1.2h8.4a2 2 0 0 1 1.8 1.2l2 4.3V15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" fill="#e0363f"/><rect x="7" y="8" width="10" height="3.5" rx=".8" fill="#cfe8ff"/><circle cx="7.5" cy="17" r="2.2" fill="#2b3245"/><circle cx="16.5" cy="17" r="2.2" fill="#2b3245"/>',
    clicker: '<path d="M6 3l12 8-5.2 1.3L16 19l-2.6 1.2-3.1-6.5L6.5 17z" fill="#7a5af8"/>',
    survival: '<path d="M12 3 3 20h18z" fill="#34b36b"/><path d="M12 11l-4 9h8z" fill="#1f7a4a"/>',
    driving: '<circle cx="12" cy="12" r="9" fill="none" stroke="#2f6bff" stroke-width="2.6"/><circle cx="12" cy="12" r="2.4" fill="#2f6bff"/><path d="M12 14.4V21M9.9 10.8 3.5 9M14.1 10.8l6.4-1.8" stroke="#2f6bff" stroke-width="2.2" stroke-linecap="round"/>',
    sports: '<circle cx="12" cy="12" r="9" fill="#ff8a3d"/><path d="M3 12h18M12 3v18M5.6 5.6c3.5 3.2 3.5 9.6 0 12.8M18.4 5.6c-3.5 3.2-3.5 9.6 0 12.8" fill="none" stroke="#7a3410" stroke-width="1.3"/>',
    puzzle: '<path d="M4 9h3.5a2 2 0 1 1 4 0H15v3.5a2 2 0 1 1 0 4V20H4z" fill="#2f9bff"/><path d="M15 4h5v5h-2.5a2 2 0 1 0 0 4H15z" fill="#ffb02e"/>',
    horror: '<path d="M12 3a7 7 0 0 0-7 7v10l2.3-2 2.3 2 2.4-2 2.4 2 2.3-2 2.3 2V10a7 7 0 0 0-7-7z" fill="#9b6bff"/><circle cx="9.5" cy="10.5" r="1.5" fill="#fff"/><circle cx="14.5" cy="10.5" r="1.5" fill="#fff"/>',
    action: '<path d="M13.5 2 5 13.5h6L10 22l9-12h-6z" fill="#ffb02e" stroke="#e0762a" stroke-width="1" stroke-linejoin="round"/>',
    adventure: '<circle cx="12" cy="12" r="9" fill="#1fb5a3"/><path d="M15.8 8.2 13.6 13.6 8.2 15.8 10.4 10.4z" fill="#fff"/>',
    arcade: '<rect x="2.5" y="7" width="19" height="11" rx="5" fill="#2f6bff"/><path d="M7.5 10v5M5 12.5h5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><circle cx="15.5" cy="11.5" r="1.2" fill="#fff"/><circle cx="18" cy="14" r="1.2" fill="#fff"/>',
    platform: '<rect x="3" y="14" width="18" height="7" rx="1.5" fill="#b86a3a"/><rect x="6" y="5" width="12" height="7" rx="1.5" fill="#34b36b"/><path d="M12 14v7M3 17.5h18" stroke="#8a4a22" stroke-width="1"/>',
    simulation: '<path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z" fill="#35b8d6"/><path d="M12 12.2 3.8 7.4M12 12.2l8.2-4.8M12 12.2v9" stroke="#fff" stroke-width="1.3" fill="none"/>',
    strategy: '<path d="M6 21v-2.5h12V21zM7.5 18.5l1-8h7l1 8zM6 10V4h2.5v2h2V4h3v2h2V4H18v6z" fill="#2b4dc2"/>',
    heart: '<path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" fill="#ef4b6a"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="#2b3245" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="#2b3245" stroke-width="2" stroke-linecap="round"/>',
    settings: '<path fill="#8a93a6" d="M10.5 2.8h3l.5 2.3 1.6.7 2-1.3 2.1 2.1-1.3 2 .7 1.6 2.3.5v3l-2.3.5-.7 1.6 1.3 2-2.1 2.1-2-1.3-1.6.7-.5 2.3h-3l-.5-2.3-1.6-.7-2 1.3-2.1-2.1 1.3-2-.7-1.6-2.3-.5v-3l2.3-.5.7-1.6-1.3-2 2.1-2.1 2 1.3 1.6-.7z"/><circle cx="12" cy="12" r="3.1" fill="#fff"/>',
    news: '<rect x="3.5" y="4" width="14" height="16" rx="2.4" fill="#3d7bff"/><path d="M17.5 8.5h2.2a1.3 1.3 0 0 1 1.3 1.3V17a3 3 0 0 1-3 3h-.5z" fill="#ffb02e"/><path d="M7 8.5h7M7 12h7M7 15.5h4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    dev: '<rect x="2.5" y="4" width="19" height="16" rx="4" fill="#7a4dff"/><path d="M9.8 9 6.8 12l3 3M14.2 9l3 3-3 3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    install: '<rect x="3" y="3" width="18" height="18" rx="5" fill="#2f6bff"/><path d="M12 7v7.2M8.6 11.2 12 14.6l3.4-3.4M7.5 17.2h9" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    suggest: '<path d="M4 4h16v12H9l-5 4z" fill="#ffb02e"/><path d="M12 7.5v5M9.5 10h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    generic: '<circle cx="12" cy="12" r="8" fill="#9aa3b5"/>'
  };
  function svg(name, size) { return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + '>' + (ICON[name] || ICON.generic) + '</svg>'; }

  /* ------------------------------------------------------------------ catalog */
  /* Games the weekly check found broken (ubg45-health.js, written by tools/check-games.py) are taken off the site until they pass again.
   * Safety: ignored when it would remove more than a quarter of the catalog, and "?showhidden" in the address brings them back for the owner. */
  (function () {
    var H = U.health && Array.isArray(U.health.hidden) ? U.health.hidden : [], all = $$(':scope > .game-card', grid);
    if (!H.length || /[?&]showhidden\b/.test(location.search) || H.length > all.length * 0.25) return;
    var drop = {}; H.forEach(function (u) { drop[u] = 1; });
    all.forEach(function (c) { var m = /openGame\('([^']+)'/.exec(c.getAttribute('onclick') || ''); if (m && drop[m[1]]) c.remove(); });
    try { if (typeof links !== 'undefined' && links && links.length) for (var i = links.length - 1; i >= 0; i--) if (drop[links[i]]) links.splice(i, 1); } catch (e) { /* the random list is optional */ }
  })();

  var catalog = $$(':scope > .game-card', grid).map(function (el, i) {
    var h = $('h3', el);
    var m = /openGame\('([^']+)'/.exec(el.getAttribute('onclick') || '');
    return { el: el, index: i, title: (h ? h.textContent : '').replace(/\s+/g, ' ').trim(), url: m ? m[1] : '', cats: [], isNew: false };
  });
  var byTitle = {}, byUrl = {};
  catalog.forEach(function (g) { var k = norm(g.title); if (!byTitle[k]) byTitle[k] = g; if (g.url && !byUrl[g.url]) byUrl[g.url] = g; });
  function pick(titles) {
    var seen = {}, out = [];
    (titles || []).forEach(function (t) { var g = byTitle[norm(t)]; if (g && !seen[g.index]) { seen[g.index] = 1; out.push(g); } });
    return out;
  }

  // Categories (title based; a game can sit in several, unmatched games fall into the fallback category)
  var catDefs = C.categories.map(function (d) {
    return { id: d.id, name: d.name, re: d.re, fallback: !!d.fallback, not: (d.not || []).map(norm), add: (d.add || []).map(norm), games: [] };
  });
  var catById = {};
  catDefs.forEach(function (d) { catById[d.id] = d; });
  catalog.forEach(function (g) {
    var t = norm(g.title);
    catDefs.forEach(function (d) {
      if (d.fallback) return;
      if (d.not.indexOf(t) > -1) return;
      if (d.add.indexOf(t) > -1 || d.re.test(g.title)) { g.cats.push(d.id); d.games.push(g); }
    });
    if (!g.cats.length) catDefs.forEach(function (d) { if (d.fallback) { g.cats.push(d.id); d.games.push(g); } });
  });
  var activeCats = catDefs.filter(function (d) { return d.games.length >= C.MIN_CATEGORY_SIZE; });

  // "New" is automatic: a game is new for NEW_DAYS days after the date stamped in ubg45-added.js (newest first).
  // C.newTitles can still force extra games in. No new games = no New row, page, sidebar entry or badges.
  var ST = U.stats || { isNew: function () { return false; }, addedOn: function () { return null; }, slug: norm, enabled: false, trending: function () { return []; }, get: function () {}, begin: function () {} };
  pick(C.newTitles).forEach(function (g) { g.isNew = true; });
  catalog.forEach(function (g) { if (ST.isNew(g.title)) g.isNew = true; });
  var newGames = catalog.filter(function (g) { return g.isNew; }).sort(function (a, b) {
    var da = ST.addedOn(a.title) || '', db = ST.addedOn(b.title) || '';
    return da < db ? 1 : da > db ? -1 : b.index - a.index;
  });
  var liveTrending = [], trendingIds = {};              // filled from the database; empty until real data arrives
  var bySlug = {};                                      // share links and the game page find a game by its slug
  catalog.forEach(function (g) { var k = ST.slug(g.title); if (!bySlug[k]) bySlug[k] = g; });

  /* Likes (anonymous, ubg45-social.js). Nothing is shown until real likes exist. */
  var SOC = U.social || { on: false, isLiked: function () { return false; }, isReported: function () { return false; }, counts: function () {}, bump: function () {},
    setLike: function () { return Promise.resolve({ liked: false, ok: false }); }, report: function () { return Promise.resolve('off'); },
    copy: function (t) { try { return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return false; }); } catch (e) { return Promise.resolve(false); } } };
  var LK = C.likes || {};
  var likeCounts = {}, statRows = {};                   // slug -> number of likes; slug -> {o, s} play counts from the stats database
  function likeOf(g) { return likeCounts[ST.slug(g.title)] || 0; }
  function hasLikes() { for (var k in likeCounts) return true; return false; }
  function likedList() { var min = LK.MIN_ROW_LIKES || 2; return catalog.filter(function (g) { return likeOf(g) >= min; }).sort(function (a, b) { return likeOf(b) - likeOf(a) || a.index - b.index; }); }
  function likedRowOn() { return SOC.on && likedList().length >= (LK.MIN_ROW_GAMES || 3); }
  function fmtN(n) { return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }

  /* ------------------------------------------------------------------ favourites & recents */
  var FAV_KEY = 'ubg45.favs', RECENT_KEY = 'ubg45.recent';
  var favs = (store(FAV_KEY) || []).filter(function (t) { return byTitle[norm(t)]; });
  var recents = (store(RECENT_KEY) || []).filter(function (t) { return byTitle[norm(t)]; });
  var isFav = function (title) { return favs.indexOf(title) > -1; };
  function syncFavs() {
    $$('.game-card[data-title]').forEach(function (c) {
      var on = isFav(c.getAttribute('data-title'));
      c.classList.toggle('is-fav', on);
      var b = $('.fav-btn', c);
      if (b) { b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + c.getAttribute('data-title') + (on ? ' from favourites' : ' to favourites')); }
    });
    var pf = $('#playFav');
    if (pf) { var pt = pf.getAttribute('data-title'), pon = isFav(pt); pf.setAttribute('aria-pressed', String(pon)); $('.lbl', pf).textContent = pon ? 'Favourited' : 'Favourite'; }
    var n = $('#favCount'), changed = n.textContent !== String(favs.length);
    n.textContent = favs.length; n.hidden = !favs.length;
    var side = $('#nav-fav .n'); if (side) side.textContent = favs.length || '';
    if (changed && favsReady) { bump(n); bump(side); }
  }
  var favsReady = false;
  function toggleFav(title) {
    var i = favs.indexOf(title);
    if (i > -1) favs.splice(i, 1); else favs.unshift(title);
    store(FAV_KEY, favs); syncFavs();
    if (route.name === 'favourites') render();
  }

  /* ------------------------------------------------------------------ decorate cards */
  catalog.forEach(function (g) {
    var c = g.el;
    c.setAttribute('data-title', g.title);
    c.setAttribute('role', 'link');
    c.setAttribute('tabindex', '0');
    c.setAttribute('aria-label', 'Play ' + g.title);
    c.appendChild(el('button', 'fav-btn', '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z"/></svg>')).setAttribute('type', 'button');
    $('.fav-btn', c).setAttribute('tabindex', '-1');
    /* (the link/share button on tiles was removed on request: sharing lives in the game tab and on the game page) */
  });

  function thumbFallback(img) {
    if (!img || img.dataset.fb) return;
    var card = img.closest('.game-card');
    var label = (card && card.getAttribute('data-title')) || img.alt || '?';
    var hue = 0; for (var i = 0; i < label.length; i++) hue = (hue * 31 + label.charCodeAt(i)) % 360;
    var d = el('div', 'thumb-fallback', esc(label)); d.style.setProperty('--h', hue); d.dataset.fb = '1';
    img.replaceWith(d);
  }
  document.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'IMG' && e.target.closest('.game-card')) thumbFallback(e.target); }, true);
  // images that already failed before this script ran never fire an event we can hear, so check them now
  catalog.forEach(function (g) { var i = $('img', g.el); if (i && i.complete && i.getAttribute('src') && !i.naturalWidth) thumbFallback(i); });

  /* Badges: Trending (live data only) and New (automatic). Rebuilt whenever the data changes. */
  var BADGE_ICON = {
    trending: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.6 1.8c.5 3.4-1 5.2-2.6 7C8.5 10.4 7 12 7 14.7a5.1 5.1 0 0 0 5 5.3 5.2 5.2 0 0 0 5.2-5.4c0-2-.8-3.4-1.8-4.7-.4 1.2-1 1.9-1.9 2.3.6-3.3-.3-6.2-1.9-10.4z"/></svg>',
    liked: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10.5v9.5H4.2A1.2 1.2 0 0 1 3 18.8v-7.1a1.2 1.2 0 0 1 1.2-1.2H7zM8.5 10.3 12 3.4a2.3 2.3 0 0 1 2.4 2.3v3.1h5a2 2 0 0 1 2 2.3l-1.1 6.8a2 2 0 0 1-2 1.7H8.5z"/></svg>',
    popular: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.1l-5.8 3.1 1.1-6.5L2.6 9.1l6.5-.9z"/></svg>',
    recent: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 7.2V12l3.2 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'new': '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2.5l2 5.7 5.7 2-5.7 2-2 5.8-2-5.8-5.7-2 5.7-2z"/><path fill="currentColor" d="M18.5 13l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>'
  };
  var BADGE_LABEL = { trending: 'Trending', popular: 'Popular', 'new': 'New' };
  var popularIds = {};                                  // our hand-picked most-played games (shown as Popular until/unless they trend live)
  pick(C.trending).slice(0, C.ROW_MAX).forEach(function (g) { popularIds[g.index] = 1; });
  function applyBadges() {
    catalog.forEach(function (g) {
      var c = g.el, old = $(':scope > .badges', c); if (old) old.remove();
      var kinds = [];
      if (trendingIds[g.index]) kinds.push('trending');          // live play data wins ...
      else if (popularIds[g.index]) kinds.push('popular');        // ... otherwise the hand-picked Popular games
      if (g.isNew) kinds.push('new');
      if (!kinds.length) return;
      var wrap = el('div', 'badges');
      kinds.forEach(function (k) { wrap.appendChild(el('span', 'badge ' + k, BADGE_ICON[k] + '<span>' + BADGE_LABEL[k] + '</span>')); });
      c.insertBefore(wrap, c.firstChild);
    });
  }
  applyBadges();

  /* Like and share animations (ubg45-gametab.js) and the style of the game information panel. */
  var FX = U.makeFx ? U.makeFx() : { like: function () {}, share: function () {}, done: function () {}, press: function () {}, roll: function (e, t) { e.textContent = t; }, burst: function () {} };
  if (U.fxCss) { var fxStyle = document.createElement('style'); fxStyle.textContent = U.fxCss + (U.infoCss || ''); document.head.appendChild(fxStyle); }

  /* Small confirmation message at the bottom of the page. */
  var toastEl = el('div', 'toast'), toastT = 0;
  toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); body.appendChild(toastEl);
  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, ms || 2800);
  }
  U.toast = toast;
  function shareGame(g) {
    var url = U.shareUrl ? U.shareUrl(ST.slug(g.title)) : location.href;
    if (window.matchMedia && matchMedia('(hover: none)').matches && navigator.share) { navigator.share({ title: g.title + ' on UBG45', url: url }).catch(function () { /* cancelled */ }); return; }
    SOC.copy(url).then(function (ok) { toast(ok ? 'Link copied: ' + g.title : 'Could not copy the link. Copy it from the address bar after opening the game page.'); });
  }

  /* Like counts on tiles (only for games with enough likes). The originals carry the chip, clones copy it. */
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11v9H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11H7zM7 11l3.6-7.2A2.4 2.4 0 0 1 13 6.2V9.5h5.4a2 2 0 0 1 2 2.3l-1.1 6.5a2 2 0 0 1-2 1.7H7"/></svg>';
  function applyLikes() {
    var min = LK.MIN_CHIP || 3;
    catalog.forEach(function (g) {
      var c = g.el, old = $(':scope > .like-chip', c); if (old) old.remove();        // the like count on tiles was removed on request: counts show in the game tab and on the game page
    });
  }

  /* Sorting (category pages, favourites and All Games). Popular uses real play counts when they exist, then the hand-picked list. */
  var SORT_LABEL = { 'default': 'Default', az: 'A to Z', za: 'Z to A', 'new': 'Newest', popular: 'Popular', liked: 'Most liked' };
  var handRank = null;
  function popKey(g) {
    var r = statRows[ST.slug(g.title)];
    if (r && (r.o || r.s)) return [0, -r.o, -r.s, g.index];
    if (!handRank) { handRank = {}; pick((C.trending || []).concat(C.popularMore || [])).forEach(function (x, i) { handRank[x.index] = i; }); }
    if (handRank[g.index] != null) return [1, handRank[g.index], 0, g.index];
    return [2, 0, 0, g.index];
  }
  function cmpKey(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0; }
  var collator = window.Intl && Intl.Collator ? new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }) : null;   // much faster than localeCompare on every comparison
  function cmpTitle(a, b) { return collator ? collator.compare(a.title, b.title) : a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }); }
  function sortGames(list, mode) {
    var out = list.slice();
    if (mode === 'az') out.sort(cmpTitle);
    else if (mode === 'za') out.sort(function (a, b) { return cmpTitle(b, a); });
    else if (mode === 'new') out.sort(function (a, b) {
      var da = ST.addedOn(a.title) || '', db = ST.addedOn(b.title) || '';
      return da < db ? 1 : da > db ? -1 : b.index - a.index;
    });
    else if (mode === 'popular') out.sort(function (a, b) { return cmpKey(popKey(a), popKey(b)); });
    else if (mode === 'liked') out.sort(function (a, b) { return likeOf(b) - likeOf(a); });   // stable: ties keep their normal order
    return out;
  }
  function sortOptions(modes) {
    return modes.filter(function (m) { return m !== 'liked' || (SOC.on && hasLikes()); }).map(function (m) { return '<option value="' + m + '">' + SORT_LABEL[m] + '</option>'; }).join('');
  }

  // Card interactions (delegated so clones work too)
  document.addEventListener('click', function (e) {
    var sh = e.target.closest && e.target.closest('.share-btn');
    if (sh) {
      e.stopPropagation(); e.preventDefault();
      var gs = byTitle[norm(sh.closest('.game-card').getAttribute('data-title'))]; if (gs) shareGame(gs);
      sh.classList.remove('pop'); void sh.offsetWidth; sh.classList.add('pop');
      sh.addEventListener('animationend', function () { sh.classList.remove('pop'); }, { once: true });
      FX.burst(sh, 'share');
      return;
    }
    var b = e.target.closest && e.target.closest('.fav-btn');
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    toggleFav(b.closest('.game-card').getAttribute('data-title'));
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    b.addEventListener('animationend', function () { b.classList.remove('pop'); }, { once: true });
  }, true);
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('game-card')) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); }
      else if (e.key === 'f' || e.key === 'F') { toggleFav(t.getAttribute('data-title')); }
    }
  });

  // Track recently played without altering the original openGame
  if (typeof window.openGame === 'function') {
    var originalOpen = window.openGame;
    window.openGame = function (url) {
      var g = byUrl[url];
      U.currentGame = g ? { title: g.title, id: ST.slug(g.title), share: U.shareUrl ? U.shareUrl(ST.slug(g.title)) : '', facts: U.gameFacts ? U.gameFacts(g) : null } : null;   // read by U.gamePage / U.gameFs while the game tab is written
      if (g) { ST.begin(g.title); }
      if (g) { recents = [g.title].concat(recents.filter(function (t) { return t !== g.title; })).slice(0, C.RECENT_MAX); store(RECENT_KEY, recents); setTimeout(function () { if (typeof refreshRecent === 'function') refreshRecent(); }, 350); }
      try { return originalOpen.apply(this, arguments); } finally { U.currentGame = null; }
    };
  }

  catalog.forEach(function (g) { skel(g.el); });

  /* Toolbar shown inside every game tab (see openGame in index.html): like, copy link, report a broken game, full screen.
   * It sits in the bottom-right corner, appears when the pointer reaches the corner and fades away again. Touch screens
   * do not get it (they use the game page's buttons instead). Like and report only appear for games in the catalog. */
  U.gameFs = function () {
    function core(cfg, make) {
      var z = document.getElementById('ubgFsZone'), d = document.documentElement, t, hold = false, armed = false, armT = 0, toastT = 0;
      if (!z) return;
      var $i = function (id) { return document.getElementById(id); };
      var fsB = $i('ubgFs'), lk = $i('ubgLike'), cp = $i('ubgCopy'), rp = $i('ubgReport'), toast = $i('ubgToast');
      var soc = make({ u: cfg.u, k: cfg.k });
      function show() { z.className = 'show'; clearTimeout(t); if (!hold) t = setTimeout(function () { z.className = ''; }, 3200); }
      function say(msg) { if (!toast) return; toast.textContent = msg; toast.className = 'on'; clearTimeout(toastT); toastT = setTimeout(function () { toast.className = ''; }, 3200); }
      if (fsB) {
        if (!(d.requestFullscreen || d.webkitRequestFullscreen)) fsB.style.display = 'none';
        var on = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };
        var paint = function () { var f = on(); z.setAttribute('data-fs', f ? '1' : '0'); fsB.setAttribute('aria-label', f ? 'Exit full screen' : 'Full screen'); fsB.title = f ? 'Exit full screen' : 'Full screen'; };
        fsB.addEventListener('click', function () {
          try { if (on()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (d.requestFullscreen || d.webkitRequestFullscreen).call(d); } catch (e) { /* ignore */ }
          show();
        });
        document.addEventListener('fullscreenchange', function () { paint(); show(); }); document.addEventListener('webkitfullscreenchange', function () { paint(); show(); });
        paint();
      }
      if (lk) {
        var paintLike = function (v) { lk.setAttribute('aria-pressed', v ? 'true' : 'false'); lk.title = v ? 'Liked. Click to remove your like' : 'Like this game'; lk.setAttribute('aria-label', lk.title); };
        paintLike(soc.isLiked(cfg.id));
        lk.addEventListener('click', function () {
          var want = !soc.isLiked(cfg.id); paintLike(want);
          lk.classList.remove('pop'); void lk.offsetWidth; lk.classList.add('pop');
          soc.setLike(cfg.id, want).then(function (r) {
            paintLike(r.liked);
            say(!r.ok ? 'Could not save your like. Check your connection.' : r.liked ? 'Liked. Thanks!' : 'Like removed.');
          });
          show();
        });
      }
      if (cp) cp.addEventListener('click', function () {
        soc.copy(cfg.share).then(function (ok) { say(ok ? 'Link copied. Paste it to share this game.' : 'Could not copy. The link is ' + cfg.share); });
        show();
      });
      if (rp) {
        var disarm = function () { armed = false; clearTimeout(armT); rp.classList.remove('arm'); };
        if (soc.isReported(cfg.id)) rp.classList.add('done');
        rp.addEventListener('click', function () {
          show();
          if (soc.isReported(cfg.id)) { say('You already reported this game today. Thanks!'); return; }
          if (!armed) { armed = true; rp.classList.add('arm'); say('Is this game broken? Press the flag again to report it.'); armT = setTimeout(disarm, 4500); return; }
          disarm(); rp.disabled = true;
          soc.report(cfg.id).then(function (r) {
            rp.disabled = false;
            if (r === 'ok' || r === 'dup') { rp.classList.add('done'); say('Report sent. Thanks, we will check this game.'); }
            else say('Could not send the report. Try again later.');
          });
        });
      }
      z.addEventListener('mouseenter', function () { hold = true; show(); });
      z.addEventListener('mouseleave', function () { hold = false; show(); });
      z.addEventListener('mousemove', show); z.addEventListener('focusin', show);
      show();
    }
    var g = U.currentGame, soc = U.social, withSocial = !!(g && soc && soc.on);
    var css = '#ubgFsZone{position:fixed;right:12px;bottom:12px;width:44px;height:44px;z-index:2147483647;font:600 13px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}' +
      '#ubgTools{position:absolute;right:0;bottom:0;display:flex;flex-direction:row-reverse;gap:8px}' +
      '.ubgB{width:44px;height:44px;border:0;border-radius:13px;background:rgba(15,20,40,.78);color:#fff;display:grid;place-items:center;cursor:pointer;padding:0;opacity:0;transform:translateY(10px) scale(.85);pointer-events:none;' +
      'transition:opacity .25s ease,transform .35s cubic-bezier(.34,1.56,.64,1),background .2s;box-shadow:0 8px 20px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.18);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
      '.ubgB:nth-child(2){transition-delay:.04s}.ubgB:nth-child(3){transition-delay:.08s}.ubgB:nth-child(4){transition-delay:.12s}' +
      '#ubgFsZone.show .ubgB,.ubgB:focus-visible{opacity:1;transform:none;pointer-events:auto}' +
      '.ubgB:hover{background:#2f5bff;transform:scale(1.1)!important;transition-delay:0s}.ubgB:active{transform:scale(.9)!important;transition-duration:.07s}.ubgB:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
      '.ubgB svg{width:22px;height:22px;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}.ubgB:hover svg{transform:scale(1.15)}' +
      '#ubgLike[aria-pressed="true"]{background:#ef4b6a}#ubgLike[aria-pressed="true"] svg{fill:#fff}#ubgLike.pop svg{animation:ubgpop .5s cubic-bezier(.34,1.56,.64,1)}' +
      '@keyframes ubgpop{0%{transform:scale(1)}35%{transform:scale(1.55)}100%{transform:scale(1)}}' +
      '#ubgReport.arm{background:#e0762a}#ubgReport.done{background:#18794e}#ubgReport.done svg{fill:#fff}#ubgReport:disabled{opacity:.6;cursor:progress}' +
      '#ubgToast{position:absolute;right:0;bottom:56px;width:max-content;max-width:min(300px,80vw);background:rgba(15,20,40,.94);color:#fff;padding:9px 13px;border-radius:11px;opacity:0;transform:translateY(6px);pointer-events:none;' +
      'transition:opacity .22s ease,transform .3s cubic-bezier(.34,1.56,.64,1);box-shadow:0 8px 20px rgba(0,0,0,.4),inset 0 0 0 1px rgba(255,255,255,.14)}#ubgToast.on{opacity:1;transform:none}' +
      '#ubgFsZone .c{display:none}#ubgFsZone[data-fs="1"] .e{display:none}#ubgFsZone[data-fs="1"] .c{display:block}' +
      '@media (hover:none){#ubgFsZone{display:none}}@media (prefers-reduced-motion:reduce){.ubgB,.ubgB svg,#ubgToast{transition:none}#ubgLike.pop svg{animation:none}}';
    var ico = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    var cfg = { u: withSocial ? soc.cfg.u : '', k: withSocial ? soc.cfg.k : '', id: g ? g.id : '', share: g ? g.share : '' };
    var html = '<style>' + css + '</style><div id="ubgFsZone" data-fs="0"><div id="ubgTools">' +
      '<button class="ubgB" id="ubgFs" type="button" aria-label="Full screen" title="Full screen">' +
        '<svg class="e" viewBox="0 0 24 24" ' + ico + '><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>' +
        '<svg class="c" viewBox="0 0 24 24" ' + ico + '><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg></button>' +
      (withSocial ? '<button class="ubgB" id="ubgReport" type="button" aria-label="Report a broken game" title="Report a broken game"><svg viewBox="0 0 24 24" ' + ico + '><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg></button>' : '') +
      (g ? '<button class="ubgB" id="ubgCopy" type="button" aria-label="Copy link to this game" title="Copy link to this game"><svg viewBox="0 0 24 24" ' + ico + '><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg></button>' : '') +
      (withSocial ? '<button class="ubgB" id="ubgLike" type="button" aria-pressed="false" aria-label="Like this game" title="Like this game"><svg viewBox="0 0 24 24" ' + ico + '><path d="M7 11v9H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11H7zM7 11l3.6-7.2A2.4 2.4 0 0 1 13 6.2V9.5h5.4a2 2 0 0 1 2 2.3l-1.1 6.5a2 2 0 0 1-2 1.7H7"/></svg></button>' : '') +
      '</div><div id="ubgToast" role="status" aria-live="polite"></div></div>';
    var make = (soc && soc.source) || 'function(){return{isLiked:function(){return false},isReported:function(){return false},copy:function(){return Promise.resolve(false)}}}';
    return html + '<script>(' + core.toString().replace(/<\/script/gi, '<\\/script') + ')(' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ',' + make.replace(/<\/script/gi, '<\\/script') + ');<\/script>';
  };

  /* ------------------------------------------------------------------ DOM refs */
  var sidebar = $('#sidebar'), main = $('#main'), content = $('.content');
  var homeView = $('#homeView'), listView = $('#listView'), searchView = $('#searchView'), settingsView = $('#settingsView'), newsView = $('#newsView'), devView = $('#devView'), playView = $('#playView');
  var searchBar = $('#searchBar'), clearBtn = $('#searchClear');
  var strip = $('#strip');

  function cloneOf(g, extra) {
    var c = g.el.cloneNode(true);
    c.removeAttribute('id'); c.removeAttribute('style');
    c.classList.remove('is-fav', 'sk');
    if (extra) c.className += ' ' + extra;
    skel(c);
    return c;
  }
  /* Shimmer on a tile until its thumbnail has loaded. */
  function skel(c) {
    var im = c.querySelector(':scope > img');
    if (!im || (im.complete && im.naturalWidth)) return;
    c.classList.add('sk');
    var done = function () { c.classList.remove('sk'); };
    im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true });
  }

  /* ------------------------------------------------------------------ sidebar */
  var route = { name: 'home', id: '' };
  function navItem(id, icon, label, href, count) {
    var a = el('a', 'nav-item', svg(icon) + '<span class="lbl">' + esc(label) + '</span>' + (count != null ? '<span class="n">' + count + '</span>' : ''));
    a.id = id; a.href = href; a.title = label;
    return a;
  }
  function buildSidebar() {
    var f = document.createDocumentFragment();
    f.appendChild(navItem('nav-home', 'home', 'Home', '#/'));
    if (newGames.length) f.appendChild(navItem('nav-new', 'new', 'New', '#/new'));
    f.appendChild(navItem('nav-popular', 'popular', 'Popular', '#/popular'));
    var r = navItem('nav-random', 'random', 'Random', '#random');
    r.addEventListener('click', function (e) { e.preventDefault(); randomGame(); });
    f.appendChild(r);
    var used = {};
    (C.sidebarGroups || []).forEach(function (grp) {
      var items = grp.map(function (id) { return catById[id]; }).filter(function (d) { return d && d.games.length >= C.MIN_CATEGORY_SIZE; });
      items.forEach(function (d) { used[d.id] = 1; });
      if (!items.length) return;
      f.appendChild(el('hr', 'nav-sep'));
      items.forEach(function (d) { f.appendChild(navItem('nav-cat-' + d.id, d.id, d.name, '#/category/' + d.id, d.games.length)); });
    });
    var rest = activeCats.filter(function (d) { return !used[d.id]; });   // keep any category the config did not place
    if (rest.length) { f.appendChild(el('hr', 'nav-sep')); rest.forEach(function (d) { f.appendChild(navItem('nav-cat-' + d.id, d.id, d.name, '#/category/' + d.id, d.games.length)); }); }
    f.appendChild(el('hr', 'nav-sep'));
    f.appendChild(navItem('nav-fav', 'heart', 'Favourites', '#/favourites', ''));
    var rc = navItem('nav-recent', 'clock', 'Recently played', '#/recent'); f.appendChild(rc);
    f.appendChild(navItem('nav-settings', 'settings', 'Settings', '#/settings'));
    f.appendChild(navItem('nav-developers', 'dev', 'Developers', '#/developers'));
    var ib = navItem('nav-install', 'install', 'Install app', '#install'); ib.hidden = true; ib.addEventListener('click', function (e) { e.preventDefault(); installApp(); }); f.appendChild(ib);
    var sg = navItem('nav-suggest', 'suggest', 'Suggest a Game', C.suggestUrl);
    sg.target = '_blank'; sg.rel = 'noopener';
    sg.setAttribute('onclick', "openGame(this.href, 'Google Docs'); return false;");
    f.appendChild(sg);
    var nw = navItem('nav-news', 'news', 'News', '#/news', ''); f.appendChild(nw);
    sidebar.appendChild(f);
    $$('.nav-item, .nav-sep', sidebar).forEach(function (n, i) { n.style.setProperty('--i', i); });      // the menu rows slide in one after another
    syncNewsBadge();
  }

  /* ------------------------------------------------------------------ views */
  function rowSection(title, games, moreHref, icon) {
    var sec = el('section', 'sec' + (icon ? ' sec-' + icon : ''));
    var head = el('div', 'sec-head', '<h2>' + (icon ? '<span class="h-ico ' + icon + '">' + BADGE_ICON[icon] + '</span>' : '') + esc(title) + '</h2>' + (moreHref ? '<a class="more" href="' + moreHref + '">View more</a>' : ''));
    var wrap = el('div', 'row-wrap');
    var row = el('div', 'row');
    games.forEach(function (g) { row.appendChild(cloneOf(g)); });
    var prev = el('button', 'row-arrow prev', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>');
    var next = el('button', 'row-arrow next', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>');
    prev.type = next.type = 'button'; prev.setAttribute('aria-label', 'Scroll ' + title + ' left'); next.setAttribute('aria-label', 'Scroll ' + title + ' right');
    prev.tabIndex = next.tabIndex = -1;
    function upd() { prev.disabled = row.scrollLeft < 4; next.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4; }
    prev.addEventListener('click', function () { row.scrollBy({ left: -row.clientWidth * 0.85 }); });
    next.addEventListener('click', function () { row.scrollBy({ left: row.clientWidth * 0.85 }); });
    row.addEventListener('scroll', upd, { passive: true });
    wrap.appendChild(prev); wrap.appendChild(row); wrap.appendChild(next);
    sec.appendChild(head); sec.appendChild(wrap);
    sec._update = upd;
    return sec;
  }

  /* Arrow buttons of every row, in two passes (read everything, then write) so the browser lays the page out once, not once per row. */
  function updateRows() {
    var st = $$('.row-wrap').map(function (w) { var r = $('.row', w); return r ? { w: w, l: r.scrollLeft, c: r.clientWidth, s: r.scrollWidth } : null; });
    st.forEach(function (x) {
      if (!x) return;
      var p = $('.row-arrow.prev', x.w), n = $('.row-arrow.next', x.w);
      if (p) p.disabled = x.l < 4; if (n) n.disabled = x.l + x.c >= x.s - 4;
    });
  }

  /* "Continue playing": the games this browser opened most recently. */
  function recentGames() { return recents.map(function (t) { return byTitle[norm(t)]; }).filter(Boolean); }
  function recentSection() {
    var list = recentGames(); if (!list.length) return null;
    var sec = rowSection('Continue playing', list.slice(0, C.RECENT_MAX), '#/recent', 'recent');
    var clr = el('button', 'btn-s mini', 'Clear'); clr.type = 'button'; clr.setAttribute('aria-label', 'Clear recently played games');
    clr.addEventListener('click', function () {
      recents = []; store(RECENT_KEY, recents);
      sec.classList.add('leaving');
      setTimeout(function () { refreshRecent(); buildStrip(); if (typeof refreshSettingsData === 'function') refreshSettingsData(); }, 260);
    });
    $('.sec-head', sec).appendChild(clr);
    return sec;
  }
  function refreshRecent() {
    if (!$('.hero', homeView)) return;
    var old = $('.sec-recent', homeView), fresh = recentSection();
    if (old && fresh) old.replaceWith(fresh); else if (old) old.remove(); else if (fresh) { var ch = $('.chips', homeView); if (ch) ch.after(fresh); else homeView.appendChild(fresh); }
    if (fresh) requestAnimationFrame(updateRows);
  }

  var cols = 0;
  function buildCollage() {
    var n = cols, big2 = n >= 8, bigs = big2 ? 2 : 1;
    var rows = n >= 8 ? 3 : 4;
    var smalls = Math.max(0, n * rows - bigs * 4);
    var need = smalls + bigs;
    var list = pick(C.featured);
    var used = {}; list.forEach(function (g) { used[g.index] = 1; });
    // pad from the catalog if the curated list is too short, so the grid never has holes
    for (var i = 0; list.length < need && i < catalog.length; i++) if (!used[catalog[i].index]) { list.push(catalog[i]); used[catalog[i].index] = 1; }
    list = list.slice(0, need);
    var wrap = el('div', 'collage');
    wrap.setAttribute('aria-label', 'Featured games');
    var before = big2 ? Math.max(0, n - 7) : 0;       // small tiles between the two large ones in the first row
    var order = [list[0]];
    var rest = list.slice(bigs);
    if (big2) { order = order.concat(rest.slice(0, before)); order.push(list[1]); order = order.concat(rest.slice(before)); }
    else order = order.concat(rest);
    order.forEach(function (g, idx) {
      var isBig = g === list[0] || (big2 && g === list[1]);
      var c = cloneOf(g, isBig ? 'lg' : '');
      var img = $('img', c); if (img && idx > 14) img.loading = 'lazy'; else if (img) img.loading = 'eager';
      wrap.appendChild(c);
    });
    return wrap;
  }

  /* Game of the day: one hand-picked game per calendar day (same for everyone), with a big Play button. */
  function localDay() { var d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
  /* Featured banner: today's pick first, then the next few featured games, rotating by itself (pause button, dots, daily rollover). */
  function buildHero() {
    var pool = pick(C.featured); if (!pool.length) pool = catalog.slice(0, 12);
    var COUNT = Math.min(6, pool.length), day = 0, slides = [], idx = 0, g = null, token = 0, live = [];
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    function pickSlides() { day = localDay(); slides = []; for (var k = 0; k < COUNT; k++) slides.push(pool[(day + k) % pool.length]); }
    pickSlides();
    var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.1l-5.8 3.1 1.1-6.5L2.6 9.1l6.5-.9z"/></svg>';
    var sec = el('section', 'hero');
    sec.setAttribute('aria-label', 'Featured games');
    var dots = '';
    if (COUNT > 1) {
      for (var k = 0; k < COUNT; k++) dots += '<button class="hero-dot" type="button" data-i="' + k + '"><i></i></button>';
      dots = '<div class="hero-dots">' + dots + '<button class="hero-pause" type="button" aria-label="Pause rotation" aria-pressed="false"><svg class="ic-pause" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"/></svg><svg class="ic-play" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.7l-10-6.4A1 1 0 0 0 8 5.6z"/></svg></button></div>';
    }
    sec.innerHTML =
      '<div class="hero-bg"></div>' +
      '<div class="hero-art" role="button" tabindex="0"></div>' +
      '<div class="hero-copy"><p class="hero-kicker"></p><h1></h1><p class="hero-sub"></p>' +
      '<div class="hero-actions"><button class="btn-play" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.5 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.7l-10-6.4a1 1 0 0 0-1.5.8z"/></svg>Play now</button>' +
      '<button class="btn-ghost" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>Surprise me</button></div></div>' +
      '<div class="hero-facts"><span class="fact"><b>' + catalog.length + '</b> games</span>' +
      (newGames.length ? '<span class="fact"><b>' + newGames.length + '</b> new lately</span>' : '') +
      '<span class="fact">No downloads</span></div>' + dots;
    var art = $('.hero-art', sec), copy = $('.hero-copy', sec), bg = $('.hero-bg', sec), dotEls = $$('.hero-dot', sec);

    function fill(i) {
      idx = i; g = slides[i];
      var imgEl = $('img', g.el), src = imgEl && imgEl.getAttribute('src');
      var cats = catDefs.filter(function (d) { return d.games.indexOf(g) >= 0 && !d.fallback; }).slice(0, 3).map(function (d) { return d.name; });
      $('.hero-kicker', sec).innerHTML = STAR + (i === 0 ? 'Game of the day' : 'Featured game');
      $('h1', sec).textContent = g.title;
      $('.hero-sub', sec).textContent = (cats.length ? cats.join(', ') + ' game. ' : '') + 'Free, opens in a new tab.';
      art.setAttribute('aria-label', 'Play ' + g.title);
      art.innerHTML = src ? '<img alt="">' : '<div class="thumb-fallback">' + esc(g.title) + '</div>';
      if (src) {
        var im = $('img', art); if (i === 0) im.setAttribute('fetchpriority', 'high'); im.src = src;
        im.addEventListener('error', function () { var d = el('div', 'thumb-fallback', esc(g.title)); im.replaceWith(d); });
      }
      bg.style.backgroundImage = src ? 'url("' + src.replace(/"/g, '%22') + '")' : 'none';
      dotEls.forEach(function (d, k) { d.classList.remove('on'); d.removeAttribute('aria-current'); d.setAttribute('aria-label', (k === 0 ? 'Game of the day: ' : 'Featured: ') + slides[k].title); });
      if (dotEls[i]) { void sec.offsetWidth; dotEls[i].classList.add('on'); dotEls[i].setAttribute('aria-current', 'true'); }   // restarts the progress bar
    }
    function go(i, animate) {
      i = (i + slides.length) % slides.length;
      live.forEach(function (a) { a.cancel(); }); live = [];
      var t = ++token;
      if (!animate || !sec.animate || (still && still.matches)) { fill(i); return; }
      var parts = $$(':scope > *', copy), E_IN = 'cubic-bezier(.22, 1, .36, 1)', E_SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';
      live = parts.map(function (n, k) { return n.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-10px)', filter: 'blur(4px)' }], { duration: 170, delay: k * 18, easing: 'ease-in', fill: 'forwards' }); });
      live.push(art.animate([{ opacity: 1, transform: 'rotate(-4deg)' }, { opacity: 0, transform: 'perspective(600px) rotateY(80deg) rotate(-4deg) scale(.86)' }], { duration: 230, easing: 'ease-in', fill: 'forwards' }));
      live.push(bg.animate([{ opacity: .55 }, { opacity: 0 }], { duration: 230, fill: 'forwards' }));
      Promise.all(live.map(function (a) { return a.finished; })).then(function () {
        if (t !== token) return;
        fill(i); live.forEach(function (a) { a.cancel(); }); live = [];
        $$(':scope > *', copy).forEach(function (n, k) { n.animate([{ opacity: 0, transform: 'translateY(18px)', filter: 'blur(5px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 520, delay: k * 70, easing: E_IN, fill: 'backwards' }); });
        art.animate([{ opacity: 0, transform: 'perspective(600px) rotateY(-80deg) rotate(-10deg) scale(.86)' }, { opacity: 1, transform: 'rotate(-4deg)' }], { duration: 700, easing: E_SPRING });
        bg.animate([{ opacity: 0, transform: 'scale(1.25)' }, { opacity: .55, transform: 'scale(1.1)' }], { duration: 900, easing: E_IN });
      }).catch(function () { /* interrupted by a newer change */ });
    }
    fill(0);

    function play() { g.el.click(); }
    $('.btn-play', sec).addEventListener('click', play);
    art.addEventListener('click', play);
    art.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
    $('.btn-ghost', sec).addEventListener('click', randomGame);
    dotEls.forEach(function (d) { d.addEventListener('click', function () { go(+d.getAttribute('data-i'), true); }); });
    var pz = $('.hero-pause', sec);
    if (pz) pz.addEventListener('click', function () {
      var on = !sec.classList.contains('user-paused'); sec.classList.toggle('user-paused', on);
      pz.setAttribute('aria-pressed', String(on)); pz.setAttribute('aria-label', on ? 'Resume rotation' : 'Pause rotation');
    });
    // The progress bar on the active dot ends -> next game. (It is paused on hover/focus, by the pause button, and in hidden tabs.)
    sec.addEventListener('animationend', function (e) {
      if (e.animationName !== 'hero-dot' || !sec.isConnected) return;
      if (localDay() !== day) { pickSlides(); go(0, true); } else go(idx + 1, true);
    });
    document.addEventListener('visibilitychange', function () { sec.classList.toggle('tab-hidden', document.hidden); });
    sec.classList.toggle('tab-hidden', document.hidden);
    return sec;
  }

  /* Quick category chips (the homepage has no category rows, so this is how you jump into one). */
  function buildChips() {
    var order = [].concat.apply([], C.sidebarGroups || []);
    var list = order.map(function (id) { return catById[id]; }).filter(function (d) { return d && !d.fallback && d.games.length >= C.MIN_CATEGORY_SIZE; });
    var wrap = el('nav', 'chips'); wrap.setAttribute('aria-label', 'Browse by category');
    list.forEach(function (d) {
      var a = el('a', 'chip', '<span class="ico">' + svg(d.id) + '</span>' + esc(d.name) + ' <small>' + d.games.length + '</small>');
      a.href = '#/category/' + d.id; wrap.appendChild(a);
    });
    return wrap;
  }

  function buildHome() {
    homeView.innerHTML = '';
    homeView.appendChild(buildHero());
    homeView.appendChild(buildChips());
    var rs = recentSection(); if (rs) homeView.appendChild(rs);
    homeView.appendChild(buildCollage());
    var live = liveTrending.length >= (C.stats.MIN_LIVE || 3);
    var secs = [live ? rowSection('Trending', liveTrending.slice(0, C.ROW_MAX), '#/popular', 'trending')
                     : rowSection('Popular', pick(C.trending).slice(0, C.ROW_MAX), '#/popular', 'popular')];   // hand-picked until real play data exists
    if (likedRowOn()) secs.push(rowSection('Most liked', likedList().slice(0, C.ROW_MAX), '#/liked', 'liked'));
    if (newGames.length) secs.push(rowSection('New Games', newGames.slice(0, C.ROW_MAX), '#/new', 'new'));
    activeCats.filter(function (d) { return !d.fallback; }).slice(0, C.CATEGORY_ROWS).filter(function (d) { return (C.HOME_HIDE_CATEGORIES || []).indexOf(d.id) < 0; }).forEach(function (d) {
      secs.push(rowSection(d.name, d.games.slice(0, C.ROW_MAX), '#/category/' + d.id));
    });
    secs.forEach(function (s) { homeView.appendChild(s); });
    homeView.appendChild(allSection());
    if (rs) secs.push(rs);
    requestAnimationFrame(updateRows);
  }

  /* Every game on the site, at the bottom of the homepage. */
  var ALL_SORT_KEY = 'ubg45.allSort', allSort = store(ALL_SORT_KEY) || 'az';
  if (['az', 'za', 'new', 'popular', 'liked'].indexOf(allSort) < 0) allSort = 'az';
  function sortedAll(mode) { return sortGames(catalog, mode === 'default' ? 'az' : mode); }
  function allSection() {
    var sec = el('section', 'sec all-sec');
    sec.id = 'allGames';
    sec.innerHTML = '<div class="sec-head"><h2><span class="h-ico all"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z"/></svg></span>All Games</h2>' +
      '<span class="meta all-count">' + catalog.length + ' games</span>' +
      '<label class="sort"><span>Sort</span><select aria-label="Sort all games">' + sortOptions(['az', 'za', 'new', 'popular', 'liked']) + '</select></label></div>' +
      '<div class="tile-grid" id="allGrid"></div>';
    var sel = $('select', sec), gridEl = $('#allGrid', sec);
    /* The list is built right after the page first appears (a few frames, in chunks), so the banner and rows show up sooner. */
    var fillTok = 0;
    function fill(now) {
      var t = ++fillTok, list = sortedAll(allSort), i = 0, CH = now ? list.length : 120;
      gridEl.innerHTML = '';
      function step() {
        if (t !== fillTok || !gridEl.isConnected) return;
        var f = document.createDocumentFragment();
        for (var k = 0; k < CH && i < list.length; k++, i++) f.appendChild(cloneOf(list[i]));
        gridEl.appendChild(f);
        if (i < list.length) requestAnimationFrame(step); else syncFavs();
      }
      if (now) step(); else requestAnimationFrame(function () { setTimeout(step, 0); });
    }
    if (!$('option[value="' + allSort + '"]', sel)) allSort = 'az';
    sel.value = allSort;
    sel.addEventListener('change', function () { allSort = sel.value; store(ALL_SORT_KEY, allSort); fill(true); });
    fill(false);
    return sec;
  }

  var EMPTY_ACTIONS = '<div class="empty-actions"><button class="btn-s" type="button" data-act="random">Play a random game</button><a class="btn-s" href="#/" data-clear>Browse all games</a></div>';
  var listBase = [], listKey = '', listSort = 'default';
  function fillList() {
    var g = $('#viewGrid'), f = document.createDocumentFragment(); g.innerHTML = '';
    sortGames(listBase, listSort).forEach(function (x) { f.appendChild(cloneOf(x)); });
    g.appendChild(f);
  }
  function listPage(title, games, emptyHtml, meta, sortable) {
    $('#listTitle').textContent = title;
    $('#listMeta').textContent = meta != null ? meta : games.length + (games.length === 1 ? ' game' : ' games');
    listBase = games;
    var wrap = $('#listSortWrap'), sel = $('#listSort');
    wrap.hidden = !(sortable && games.length > 1);
    if (sortable) {
      var key = route.name + ':' + route.id; if (key !== listKey) { listKey = key; listSort = 'default'; }   // each page starts in its normal order
      sel.innerHTML = sortOptions(['default', 'az', 'za', 'new', 'popular', 'liked']);
      if (!$('option[value="' + listSort + '"]', sel)) listSort = 'default';
      sel.value = listSort;
    }
    if (!sortable) listSort = 'default';
    fillList();
    var e = $('#listEmpty'); e.hidden = games.length > 0; if (!games.length) e.innerHTML = emptyHtml || '<strong>Nothing here yet</strong>';
  }
  $('#listSort').addEventListener('change', function () { listSort = this.value; fillList(); syncFavs(); popTiles($('#viewGrid'), 28); });

  function buildStrip() {
    strip.innerHTML = '';
    var seen = {}, items = [];
    var rec = recents.map(function (t) { return byTitle[norm(t)]; }).filter(Boolean);
    rec.forEach(function (g) { seen[g.index] = 1; items.push(g); });
    pick(C.featured).forEach(function (g) { if (!seen[g.index] && items.length < 18) { seen[g.index] = 1; items.push(g); } });
    var wrap = $('#stripWrap');
    var oldClock = $('.strip-clock', wrap); if (oldClock) oldClock.remove();
    if (rec.length) {
      var clock = el('a', 'strip-clock', svg('clock')); clock.href = '#/recent'; clock.title = 'Recently played'; clock.setAttribute('aria-label', 'Recently played');
      wrap.insertBefore(clock, strip);
    }
    items.forEach(function (g) {
      var c = cloneOf(g, 'mini'); c.title = g.title;
      $$('.badge, .fav-btn, .share-btn, .like-chip, h3', c).forEach(function (n) { n.remove(); });
      strip.appendChild(c);
    });
  }

  /* ------------------------------------------------------------------ motion: a page you open settles in, its first tiles pop up one after another */
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var waveAt = 0;
  function popTiles(container, max, resume) {                  // resume: ms already played, when the page is rebuilt mid-wave (late data) so tiles carry on instead of jumping
    if (!container || (calm && calm.matches)) return;
    if (!resume) waveAt = Date.now();
    var cards = $$(':scope > .game-card', container).slice(0, max || 24);
    var box = container.getBoundingClientRect(), tw = Math.max(60, (cards[0] && cards[0].getBoundingClientRect().width) || 130);
    cards.forEach(function (c, i) {
      var r = c.getBoundingClientRect(), col = Math.round((r.left - box.left) / tw), row = Math.round((r.top - box.top) / tw);
      c.style.setProperty('--d', Math.min(Math.max(col, 0) + Math.max(row, 0) * 1.4 + (isFinite(col + row) ? 0 : i), 14) * 42 - (resume || 0) + 'ms'); c.classList.add('tile-in');   // a wave that sweeps from the top-left corner
    });
    setTimeout(function () { cards.forEach(function (c) { c.classList.remove('tile-in'); c.style.removeProperty('--d'); }); }, 1700);
  }
  function settleIn(node) {
    if (!node || (calm && calm.matches)) return;
    node.classList.remove('view-in'); void node.offsetWidth; node.classList.add('view-in');
    node.addEventListener('animationend', function (e) { if (e.target === node) node.classList.remove('view-in'); }, { once: true });
  }
  function bump(node) {
    if (!node || (calm && calm.matches)) return;
    node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump');
    node.addEventListener('animationend', function () { node.classList.remove('bump'); }, { once: true });
  }
  var lastKey = null;
  function enterView() {
    var key = route.name + ':' + route.id;
    if (key === lastKey) {                               // data arriving (likes, trending) re-renders the same page: no replay, but a wave still under way carries on
      var el0 = Date.now() - waveAt;
      if (waveAt && el0 < 1500) {
        if (route.name === 'home') popTiles($('.collage', homeView), 16, el0);
        else if ($('#viewGrid')) popTiles($('#viewGrid'), 28, el0);
      }
      return;
    }
    lastKey = key;
    if (route.name === 'home') { popTiles($('.collage', homeView), 16); return; }
    if (route.name === 'category' || route.name === 'new' || route.name === 'popular' || route.name === 'favourites' || route.name === 'recent' || route.name === 'liked') { settleIn(listView); popTiles($('#viewGrid'), 28); }
    else if (route.name === 'play') settleIn(playView);
    else if (route.name === 'news') settleIn(newsView);
    else if (route.name === 'developers') settleIn(devView);
    else if (route.name === 'settings') settleIn(settingsView);
  }

  var TITLES = { new: 'New Games', popular: 'Popular Games', favourites: 'Favourites', recent: 'Recently Played' };
  function render() {
    var q = searchBar.value.trim();
    var searching = !!q;
    body.classList.toggle('searching', searching);
    homeView.hidden = listView.hidden = searchView.hidden = settingsView.hidden = newsView.hidden = devView.hidden = playView.hidden = true;
    $('#stripWrap').hidden = searching || route.name === 'settings' || route.name === 'news' || route.name === 'developers';
    if (searching) { searchView.hidden = false; updateSearch(); markNav(null); return; }
    var g;
    switch (route.name) {
      case 'new':
        g = newGames; listPage(TITLES.new, g, '<strong>No new games right now</strong>Check back soon.'); break;
      case 'popular':
        g = liveTrending.concat(pick((C.trending || []).concat(C.popularMore || []))).filter(function (x, i, a) { return a.indexOf(x) === i; });
        listPage(liveTrending.length ? 'Trending & Popular Games' : TITLES.popular, g, '', g.length + ' games'); break;
      case 'category':
        var d = catById[route.id]; if (!d) { location.hash = '#/'; return; }
        listPage(d.name + ' Games', d.games, '<strong>No games here yet</strong>', null, true); break;
      case 'liked':
        g = likedList();
        listPage('Most liked games', g, '<strong>No liked games yet</strong>Like a game from its page or while you play it.' + EMPTY_ACTIONS); break;
      case 'play':
        playView.hidden = false; buildPlay(route.id); break;
      case 'settings':
        settingsView.hidden = false; buildSettings(); break;
      case 'news':
        newsView.hidden = false; buildNews(); break;
      case 'developers':
        devView.hidden = false; buildDev(); break;
      case 'favourites':
        g = favs.map(function (t) { return byTitle[norm(t)]; }).filter(Boolean);
        listPage(TITLES.favourites, g, '<strong>No favourites yet</strong>Click the heart on any game (or press F while it is focused) to save it here.' + EMPTY_ACTIONS, null, true); break;
      case 'recent':
        g = recents.map(function (t) { return byTitle[norm(t)]; }).filter(Boolean);
        listPage(TITLES.recent, g, '<strong>Nothing played yet</strong>Games you open will show up here.' + EMPTY_ACTIONS); break;
      default:
        homeView.hidden = false; if (!homeView.firstChild || homeView._cols !== cols) { buildHome(); homeView._cols = cols; }
    }
    if (route.name !== 'home' && route.name !== 'settings' && route.name !== 'news' && route.name !== 'developers' && route.name !== 'play') listView.hidden = false;
    markNav(route);
    buildStrip();
    syncFavs();
    enterView();
  }

  function markNav(r) {
    $$('.nav-item', sidebar).forEach(function (a) { a.removeAttribute('aria-current'); });
    if (!r) return;
    var id = r.name === 'home' ? 'nav-home' : r.name === 'category' ? 'nav-cat-' + r.id : 'nav-' + (r.name === 'favourites' ? 'fav' : r.name);
    var a = document.getElementById(id); if (a) a.setAttribute('aria-current', 'page');
  }

  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var p = h.split('/');
    var dec = function (x) { try { return decodeURIComponent(x); } catch (e) { return ''; } };
    if (p[0] === 'new' || p[0] === 'popular' || p[0] === 'favourites' || p[0] === 'recent' || p[0] === 'settings' || p[0] === 'news' || p[0] === 'developers' || p[0] === 'liked') route = { name: p[0], id: '' };
    else if (p[0] === 'category' && p[1]) route = { name: 'category', id: (function (id) { return id === 'car' ? 'driving' : id; })(dec(p[1])) };   // Car was merged into Driving
    else if (p[0] === 'play' && dec(p[1] || '')) route = { name: 'play', id: dec(p[1]).toLowerCase() };
    else route = { name: 'home', id: '' };
  }
  window.addEventListener('hashchange', function () {
    parseHash();
    if (searchBar.value) { searchBar.value = ''; searchBar.dispatchEvent(new Event('input', { bubbles: true })); }
    closeDrawer(); render(); window.scrollTo(0, 0);
  });

  /* ------------------------------------------------------------------ game page (#/play/<slug>): what a shared link opens */
  var IC = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.5 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.7l-10-6.4a1 1 0 0 0-1.5.8z"/></svg>',
    like: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11v9H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11H7zM7 11l3.6-7.2A2.4 2.4 0 0 1 13 6.2V9.5h5.4a2 2 0 0 1 2 2.3l-1.1 6.5a2 2 0 0 1-2 1.7H7"/></svg>',
    fav: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-8-5-8-10.8a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 5.8-8 10.8-8 10.8z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>'
  };
  function relatedGames(g, max) {
    var seen = {}, out = []; seen[g.index] = 1;
    catDefs.filter(function (d) { return d.games.indexOf(g) >= 0 && !d.fallback; }).sort(function (a, b) { return a.games.length - b.games.length; }).forEach(function (d) {
      sortGames(d.games, 'popular').forEach(function (x) { if (out.length < max && !seen[x.index]) { seen[x.index] = 1; out.push(x); } });
    });
    return out;
  }
  /* Everything the information panel shows about a game (used by the game tab and by the game page). */
  function gameFacts(g) {
    var id = ST.slug(g.title), im = $('img', g.el), src = im && im.getAttribute('src');
    var info = (U.info && (U.info[id] || U.info[ST.slug(g.title.replace(/\s*[-:].*$/, ''))])) || {};
    var related = relatedGames(g, 8).map(function (r) { var ri = $('img', r.el); return { title: r.title, url: r.url, thumb: ri && ri.getAttribute('src') }; });
    return {
      title: g.title, id: id, likes: likeOf(g), social: !!SOC.on, isNew: !!g.isNew, added: ST.addedOn(g.title) || '', info: info, related: related,
      cats: catDefs.filter(function (d) { return d.games.indexOf(g) >= 0 && !d.fallback; }).map(function (d) { return d.name; }), thumb: src
    };
  }
  U.gameFacts = gameFacts;
  function buildPlay(slug) {
    var g = bySlug[slug];
    playView.innerHTML = '';
    if (!g) {
      playView.innerHTML = '<div class="empty"><strong>Game not found</strong>There is no game called “' + esc(slug.replace(/-/g, ' ')) + '” on UBG45. The link may be mistyped, or the game was renamed or removed.' + EMPTY_ACTIONS + '</div>';
      return;
    }
    var imgEl = $('img', g.el), src = imgEl && imgEl.getAttribute('src'), id = ST.slug(g.title);
    var cats = catDefs.filter(function (d) { return d.games.indexOf(g) >= 0 && !d.fallback; });
    var sec = el('section', 'hero play-hero');
    sec.setAttribute('aria-labelledby', 'playTitle');
    var n = likeOf(g), added = ST.addedOn(g.title), facts = '';
    if (n > 0) facts += '<span class="fact"><b>' + fmtN(n) + '</b> ' + (n === 1 ? 'like' : 'likes') + '</span>';
    if (g.isNew) facts += '<span class="fact">New game</span>';
    else if (added && added > '2001-01-01') facts += '<span class="fact">Added ' + esc(dayLabel(added).abs) + '</span>';
    sec.innerHTML =
      '<div class="hero-bg"></div>' +
      '<div class="hero-art" role="button" tabindex="0" aria-label="Play ' + esc(g.title) + '">' + (src ? '<img alt="">' : '<div class="thumb-fallback">' + esc(g.title) + '</div>') + '</div>' +
      '<div class="hero-copy"><p class="hero-kicker">Free game</p><h1 id="playTitle">' + esc(g.title) + '</h1>' +
      '<div class="play-cats">' + (cats.length ? cats.slice(0, 4).map(function (d) { return '<a class="pc" href="#/category/' + d.id + '">' + esc(d.name) + '</a>'; }).join('') : '<span class="pc">Arcade</span>') + '</div>' +
      '<p class="hero-sub">Opens in a new tab. No download needed.</p>' +
      '<div class="hero-actions"><button class="btn-play" id="playGo" type="button">' + IC.play + 'Play now</button>' +
      (SOC.on ? '<button class="btn-ghost sm" id="playLike" type="button" aria-pressed="false">' + IC.like + '<span class="lbl">Like</span><span class="cnt"></span></button>' : '') +
      '<button class="btn-ghost sm" id="playFav" type="button" aria-pressed="false" data-title="' + esc(g.title) + '">' + IC.fav + '<span class="lbl">Favourite</span></button>' +
      '<button class="btn-ghost sm" id="playCopy" type="button">' + (U.infoIcons ? U.infoIcons.share : IC.link) + '<span class="lbl">Share</span></button>' +
      (SOC.on ? '<button class="btn-ghost sm" id="playReport" type="button">' + IC.flag + '<span class="lbl">Report</span></button>' : '') +
      '</div></div>' + (facts ? '<div class="hero-facts">' + facts + '</div>' : '');
    playView.appendChild(sec);
    var art = $('.hero-art', sec), bg = $('.hero-bg', sec);
    if (src) {
      var im = $('img', art); im.src = src;
      im.addEventListener('error', function () { var d = el('div', 'thumb-fallback', esc(g.title)); im.replaceWith(d); });
      bg.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")';
    }
    function play() { g.el.click(); }
    $('#playGo', sec).addEventListener('click', play);
    art.addEventListener('click', play);
    art.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
    $('#playFav', sec).addEventListener('click', function () { toggleFav(g.title); });
    var cb = $('#playCopy', sec), cbLbl = $('.lbl', cb);
    cb.addEventListener('click', function () {
      FX.share(cb);
      SOC.copy(U.shareUrl(id)).then(function (ok) {
        if (ok) { FX.done(cb); cbLbl.textContent = 'Copied'; setTimeout(function () { cbLbl.textContent = 'Share'; }, 1900); }
        toast(ok ? 'Link copied. Paste it to share ' + g.title + '.' : 'Could not copy the link. Copy it from the address bar.');
      });
    });
    var lb = $('#playLike', sec);
    function paintLike() {
      if (!lb) return;
      var on = SOC.isLiked(id), c = likeOf(g);
      lb.setAttribute('aria-pressed', String(on)); $('.lbl', lb).textContent = on ? 'Liked' : 'Like';
      $('.cnt', lb).textContent = fmtN(c); $('.cnt', lb).hidden = false;
      var all = $$('.igLikes', playView); all.forEach(function (x) { x.textContent = fmtN(c); });
    }
    if (lb) {
      paintLike();
      lb.addEventListener('click', function () {
        var want = !SOC.isLiked(id); lb.disabled = true;
        FX.like(lb, want);
        var cntEl = $('.cnt', lb), cur0 = likeCounts[id] || 0, shownN = Math.max(0, cur0 + (want ? 1 : -1));
        lb.setAttribute('aria-pressed', String(want)); $('.lbl', lb).textContent = want ? 'Liked' : 'Like';
        FX.roll(cntEl, fmtN(shownN), want);                                  // the number moves straight away; the server confirms below
        SOC.setLike(id, want).then(function (r) {
          lb.disabled = false;
          if (!r.ok) { toast('Could not save your like. Check your connection.'); paintLike(); return; }
          var cur = likeCounts[id] || 0, nx = Math.max(0, cur + (r.liked ? 1 : -1));
          if (nx) likeCounts[id] = nx; else delete likeCounts[id];
          applyLikes(); homeView._cols = 0; setTimeout(paintLike, 420);       // the home page rebuilds next time it is shown
          toast(r.liked ? 'Liked. Thanks!' : 'Like removed.');
        });
      });
      sec._paintLike = paintLike;
    }
    var rb = $('#playReport', sec), armT = 0;
    if (rb) {
      var lblR = $('.lbl', rb);
      var disarm = function () { clearTimeout(armT); rb.classList.remove('arm'); lblR.textContent = SOC.isReported(id) ? 'Reported' : 'Report'; };
      if (SOC.isReported(id)) lblR.textContent = 'Reported';
      rb.addEventListener('click', function () {
        if (SOC.isReported(id)) { toast('You already reported this game today. Thanks!'); return; }
        if (!rb.classList.contains('arm')) { rb.classList.add('arm'); lblR.textContent = 'Press again to report'; toast('Is this game broken? Press the button again to report it.'); armT = setTimeout(disarm, 4500); return; }
        clearTimeout(armT); rb.disabled = true;
        SOC.report(id).then(function (r) {
          rb.disabled = false; rb.classList.remove('arm');
          if (r === 'ok' || r === 'dup') { lblR.textContent = 'Reported'; toast('Report sent. Thanks, we will check this game.'); }
          else { lblR.textContent = 'Report'; toast('Could not send the report. Try again later.'); }
        });
      });
    }
    var about = el('div', 'play-info'); about.innerHTML = U.infoHtml ? U.infoHtml(gameFacts(g)) : ''; playView.appendChild(about);
    var rel = relatedGames(g, C.ROW_MAX || 24);
    if (rel.length >= 3) {
      var row = rowSection('More like this', rel, cats[0] ? '#/category/' + cats[0].id : '', null);
      playView.appendChild(row); requestAnimationFrame(updateRows);
    }
    syncFavs();
  }

  /* ------------------------------------------------------------------ developers page (send us your game) */
  function buildDev() {
    if (!U.devPage) { devView.innerHTML = '<div class="empty"><strong>Developers page unavailable</strong>ubg45-dev.js did not load.</div>'; return; }
    U.devPage.build(devView, { cats: activeCats.map(function (d) { return d.name; }), toast: toast });
  }

  /* ------------------------------------------------------------------ news page */
  var NEWS_SEEN = 'ubg45.newsSeen';
  var TAGS = { games: 'New games', feature: 'New feature', update: 'Update', fix: 'Fix' };
  function dayMs(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }
  function newsEntries() {
    var out = [], posts = (U.news || []).filter(function (n) { return n && !isNaN(dayMs(n.date)); });
    posts.forEach(function (n, i) { out.push({ date: n.date, tag: TAGS[n.tag] ? n.tag : 'update', title: n.title, text: n.text, points: n.points || [], order: i }); });
    var byDay = {}, added = U.added || {};
    Object.keys(added).forEach(function (k) {
      var d = added[k], g = byTitle[k]; if (!g || isNaN(dayMs(d)) || d < '2001-01-01') return;
      (byDay[d] = byDay[d] || []).push(g);
    });
    Object.keys(byDay).forEach(function (d) {
      var list = byDay[d].sort(function (a, b) { return a.index - b.index; });
      out.push({ date: d, tag: 'games', title: list.length === 1 ? 'New game: ' + list[0].title : list.length + ' new games added', games: list, order: 1000 });
    });
    out.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.order - b.order; });
    return out;
  }
  function newsUnread() {
    var seen = store(NEWS_SEEN), list = newsEntries();
    if (!list.length) return 0;
    if (!seen) { var cut = new Date(Date.now() - (C.NEW_DAYS || 14) * 864e5).toISOString().slice(0, 10); return list.filter(function (n) { return n.date >= cut; }).length; }
    return list.filter(function (n) { return n.date > seen; }).length;
  }
  function syncNewsBadge() {
    var a = document.getElementById('nav-news'); if (!a) return;
    var n = newsUnread(), b = $('.n', a);
    if (n && route.name !== 'news') { if (!b) { b = el('span', 'n hot'); a.appendChild(b); } b.className = 'n hot'; b.textContent = n; }
    else if (b) b.remove();
  }
  function dayLabel(d) {
    var t = dayMs(d), now = new Date(), today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()), diff = Math.round((today - t) / 864e5);
    var abs = new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    return { rel: diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff < 14 ? diff + ' days ago' : abs, abs: abs,
      mon: new Date(t).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }), day: new Date(t).getUTCDate() };
  }
  function gameChip(g) {
    var im = $('img', g.el), src = im && im.getAttribute('src');
    var b = el('button', 'news-game', '<span class="ng-thumb">' + (src ? '<img alt="" loading="lazy">' : '') + '</span><span class="ng-title">' + esc(g.title) + '</span>');
    b.type = 'button'; b.title = 'Play ' + g.title;
    if (src) { var ii = $('img', b); ii.src = src; ii.addEventListener('error', function () { ii.remove(); }); }
    b.addEventListener('click', function () { g.el.click(); });
    return b;
  }
  var newsFilter = 'all';
  function buildNews() {
    var list = newsEntries(), seen = store(NEWS_SEEN), shown = 0;
    var tabs = [['all', 'All'], ['games', 'New games'], ['update', 'Updates'], ['fix', 'Fixes']];
    newsView.innerHTML =
      '<div class="view-head"><h1 id="newsTitle">News &amp; updates</h1><span class="meta" id="newsMeta"></span></div>' +
      '<div class="news-tabs" role="group" aria-label="Filter news">' + tabs.map(function (t) { return '<button type="button" class="news-tab" data-f="' + t[0] + '" aria-pressed="' + (newsFilter === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="news-list" id="newsList"></div><div class="empty" id="newsEmpty" hidden><strong>Nothing here yet</strong>Check back soon.</div>';
    var wrap = $('#newsList', newsView);
    list.forEach(function (n) {
      var kind = n.tag === 'feature' ? 'update' : n.tag, dl = dayLabel(n.date);
      var card = el('article', 'news-card tag-' + n.tag + ((seen ? n.date > seen : n.date >= new Date(Date.now() - (C.NEW_DAYS || 14) * 864e5).toISOString().slice(0, 10)) ? ' fresh' : ''));
      card.setAttribute('data-kind', kind);
      card.innerHTML = '<div class="news-date" title="' + esc(dl.abs) + '"><span class="nd-mon">' + esc(dl.mon) + '</span><span class="nd-day">' + dl.day + '</span></div>' +
        '<div class="news-body"><div class="news-meta"><span class="news-tag">' + TAGS[n.tag] + '</span><time datetime="' + n.date + '">' + esc(dl.rel === dl.abs ? dl.abs : dl.rel + ' · ' + dl.abs) + '</time><span class="news-fresh">New</span></div>' +
        '<h2>' + esc(n.title) + '</h2>' + (n.text ? '<p class="news-text">' + esc(n.text) + '</p>' : '') +
        (n.points && n.points.length ? '<ul class="news-points">' + n.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      if (n.games) {
        var box = el('div', 'news-games'), LIM = 12;
        n.games.forEach(function (g, i) { var c = gameChip(g); if (i >= LIM) c.hidden = true; box.appendChild(c); });
        $('.news-body', card).appendChild(box);
        if (n.games.length > LIM) {
          var more = el('button', 'btn-s mini news-more', 'Show all ' + n.games.length); more.type = 'button'; more.setAttribute('aria-expanded', 'false');
          more.addEventListener('click', function () {
            var open = more.getAttribute('aria-expanded') !== 'true';
            $$('.news-game', box).forEach(function (c, i) { if (i >= LIM) c.hidden = !open; });
            more.setAttribute('aria-expanded', String(open)); more.textContent = open ? 'Show fewer' : 'Show all ' + n.games.length;
          });
          $('.news-body', card).appendChild(more);
        }
      }
      wrap.appendChild(card);
    });
    function applyFilter() {
      shown = 0;
      $$('.news-card', wrap).forEach(function (c) {
        var tag = c.className.match(/tag-(\w+)/)[1], ok = newsFilter === 'all' || (newsFilter === 'update' ? (tag === 'update' || tag === 'feature') : tag === newsFilter);
        c.hidden = !ok; if (ok) shown++;
      });
      $('#newsMeta', newsView).textContent = shown + (shown === 1 ? ' post' : ' posts');
      $('#newsEmpty', newsView).hidden = shown > 0;
      $$('.news-tab', newsView).forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-f') === newsFilter)); });
    }
    $$('.news-tab', newsView).forEach(function (t) { t.addEventListener('click', function () { newsFilter = t.getAttribute('data-f'); applyFilter(); }); });
    applyFilter();
    if (list.length) store(NEWS_SEEN, list[0].date);
    syncNewsBadge();
  }

  /* ------------------------------------------------------------------ settings page (tab cloak + panic key) */
  var settingsBuilt = false;
  function buildSettings() {
    var S = U.settings;
    if (!S) { settingsView.innerHTML = '<div class="empty"><strong>Settings unavailable</strong>ubg45-settings.js did not load.</div>'; return; }
    if (settingsBuilt) { refreshSettingsData(); return; }
    settingsBuilt = true;

    var cloakOpts = '<option value="default">Default (UBG45)</option>' +
      Object.keys(S.CLOAKS).map(function (k) { return '<option value="' + k + '">' + esc(S.CLOAKS[k].label) + '</option>'; }).join('') +
      '<option value="custom">Custom…</option>';

    settingsView.innerHTML =
      '<div class="view-head"><h1 id="settingsTitle">Settings</h1><span class="meta" id="setStatus" role="status" aria-live="polite"></span></div>' +
      '<div class="set-grid">' +

      '<section class="set-card" aria-labelledby="h-cloak"><h2 id="h-cloak">Tab Cloak</h2>' +
        '<p class="desc">Disguises the tab title and icon, here and in every game tab. Default keeps UBG45’s own look.</p>' +
        '<div class="set-row"><label for="cloakSel">Disguise as</label><select id="cloakSel">' + cloakOpts + '</select></div>' +
        '<div id="customBox" class="set-sub" hidden>' +
          '<div class="set-row"><label for="customTitle">Tab title</label><input id="customTitle" type="text" maxlength="80" placeholder="e.g. Home" autocomplete="off"></div>' +
          '<div class="set-row"><label for="customIcon">Icon address</label><input id="customIcon" type="text" placeholder="https://example.com/favicon.ico" autocomplete="off" spellcheck="false"></div>' +
        '</div>' +
        '<div class="tabprev" aria-label="Tab preview"><img id="prevIcon" alt="" width="16" height="16"><span id="prevTitle"></span></div>' +
      '</section>' +

      '<section class="set-card" aria-labelledby="h-panic"><h2 id="h-panic">Panic Key</h2>' +
        '<p class="desc">Press the key to instantly look like a harmless page and jump to your redirect. It never fires while you type in a text box, or when Ctrl, Alt or ⌘ are held. It works on UBG45 pages and in game tabs, but a browser does not pass keys pressed <em>inside</em> a game to the page, so click outside the game first.</p>' +
        '<label class="set-check"><input id="panicOn" type="checkbox"> Enable panic key</label>' +
        '<div class="set-row"><label for="panicKey">Key</label><input id="panicKey" class="keybox" type="text" readonly aria-describedby="keyHelp" autocomplete="off"><span class="keyhint" id="keyHelp">Click the box, then press the key you want.</span></div>' +
        '<label class="set-check"><input id="panicRedirect" type="checkbox"> Redirect on panic</label>' +
        '<div class="set-row"><label for="panicPick">Quick pick</label><select id="panicPick"><option value="">Choose a site…</option>' + S.REDIRECTS.map(function (r) { return '<option value="' + esc(r.url) + '">' + esc(r.label) + '</option>'; }).join('') + '</select></div>' +
        '<div class="set-row"><label for="panicUrl">Redirect to</label><input id="panicUrl" type="text" autocomplete="off" spellcheck="false" placeholder="https://classroom.google.com"></div>' +
        '<div class="set-row"><button class="btn-s" id="testUrl" type="button">Test redirect (new tab)</button></div>' +
      '</section>' +

      '<section class="set-card" aria-labelledby="h-data"><h2 id="h-data">Your data</h2>' +
        '<p class="desc">Favourites, recently played and your settings are stored only in this browser.' + (ST.enabled ? ' Trending is built from anonymous play counts (which game, how long) with nothing that identifies you.' : '') + '</p>' +
        (ST.enabled ? '<label class="set-check"><input id="shareStats" type="checkbox"> Share anonymous play counts (powers Trending)</label>' : '') +
        '<div class="set-row"><span id="dataInfo"></span></div>' +
        '<div class="set-row btns"><button class="btn-s" id="clearRecent" type="button">Clear recently played</button><button class="btn-s" id="clearFavs" type="button">Clear favourites</button></div>' +
        '<div class="set-row"><button class="btn-s danger" id="resetSettings" type="button">Reset cloak &amp; panic settings</button></div>' +
      '</section>' +
      '</div>';

    var $s = function (id) { return document.getElementById(id); };
    var sel = $s('cloakSel'), ct = $s('customTitle'), ci = $s('customIcon'), box = $s('customBox');
    var shareStats = $s('shareStats');
    if (shareStats) { shareStats.checked = !ST.optedOut(); shareStats.addEventListener('change', function () { ST.setOptOut(!shareStats.checked); say(shareStats.checked ? 'Sharing play counts: on.' : 'Sharing play counts: off.', false); }); }
    var pOn = $s('panicOn'), pKey = $s('panicKey'), pRe = $s('panicRedirect'), pUrl = $s('panicUrl'), pPick = $s('panicPick'), stat = $s('setStatus');
    var timer;
    function say(msg, bad) { stat.textContent = msg; stat.className = 'meta' + (bad ? ' bad' : ' good'); clearTimeout(timer); timer = setTimeout(function () { stat.textContent = ''; }, 3500); }

    function preview() {
      var st = S.get(), l = S.look(st);
      var img = $s('prevIcon'); img.hidden = false; img.onerror = function () { img.hidden = true; }; img.src = l.icon;
      $s('prevTitle').textContent = l.title;
    }
    function load() {
      var st = S.get();
      sel.value = st.cloak; box.hidden = st.cloak !== 'custom';
      ct.value = st.customTitle; ci.value = st.customIcon;
      pOn.checked = st.panicEnabled; pRe.checked = st.panicRedirect;
      pKey.value = S.keyLabel(st.panicKey); pUrl.value = st.panicUrl;
      pKey.disabled = pRe.disabled = !st.panicEnabled; pUrl.disabled = pPick.disabled = $s('testUrl').disabled = !st.panicEnabled || !st.panicRedirect;
      pPick.value = '';
      preview(); refreshSettingsData();
    }

    sel.addEventListener('change', function () {
      S.set({ cloak: sel.value }); box.hidden = sel.value !== 'custom'; preview();
      say(sel.value === 'custom' && !S.get().customTitle && !S.get().customIcon ? 'Enter a title and/or icon below.' : 'Cloak saved.', false);
    });
    ct.addEventListener('input', function () { S.set({ customTitle: S.clampTitle(ct.value) }); preview(); });
    ci.addEventListener('change', function () {
      var v = ci.value.trim();
      if (v && !S.normIcon(v)) { ci.value = S.get().customIcon; say('That icon address is not a valid http(s) link.', true); return; }
      S.set({ customIcon: v ? S.normIcon(v) : '' }); ci.value = S.get().customIcon; preview(); say('Icon saved.', false);
    });

    pOn.addEventListener('change', function () { S.set({ panicEnabled: pOn.checked }); load(); say('Panic key ' + (pOn.checked ? 'on.' : 'off.'), false); });
    pRe.addEventListener('change', function () { S.set({ panicRedirect: pRe.checked }); load(); say('Redirect ' + (pRe.checked ? 'on.' : 'off.'), false); });

    // Pick the panic key by pressing it
    function stopCapture() { U.capturingKey = false; pKey.classList.remove('capturing'); pKey.value = S.keyLabel(S.get().panicKey); }
    pKey.addEventListener('focus', function () { U.capturingKey = true; pKey.classList.add('capturing'); pKey.value = 'Press a key…'; });
    pKey.addEventListener('blur', stopCapture);
    pKey.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') return;                                   // keep keyboard navigation working
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
      if (e.key === 'Escape') { pKey.blur(); return; }
      if (e.ctrlKey || e.altKey || e.metaKey) { say('Pick a key without Ctrl, Alt or ⌘.', true); return; }
      if (S.isReserved(e.key)) { say('That key is reserved. Pick another.', true); return; }
      S.set({ panicKey: S.normKey(e.key) }); pKey.blur(); say('Panic key set to ' + S.keyLabel(S.get().panicKey) + '.', false);
    });

    pUrl.addEventListener('change', function () {
      var v = S.normUrl(pUrl.value);
      if (!v) { pUrl.value = S.get().panicUrl; say('Enter a valid website address (http or https).', true); return; }
      S.set({ panicUrl: v }); pUrl.value = v; say('Redirect saved.', false);
    });
    pPick.addEventListener('change', function () {
      if (!pPick.value) return;
      S.set({ panicUrl: pPick.value }); pUrl.value = S.get().panicUrl; pPick.value = ''; say('Redirect saved.', false);
    });
    $s('testUrl').addEventListener('click', function () {
      var v = S.normUrl(pUrl.value) || S.get().panicUrl;
      var w = window.open(v, '_blank', 'noopener'); if (!w) say('Pop-up blocked. Allow pop-ups to test.', true);
    });

    $s('clearRecent').addEventListener('click', function () { recents = []; store(RECENT_KEY, recents); buildStrip(); refreshSettingsData(); refreshRecent(); say('Recently played cleared.', false); });
    $s('clearFavs').addEventListener('click', function () { favs = []; store(FAV_KEY, favs); syncFavs(); refreshSettingsData(); say('Favourites cleared.', false); });
    var rs = $s('resetSettings'), rsT;
    rs.addEventListener('click', function () {
      if (!rs.dataset.armed) { rs.dataset.armed = '1'; rs.textContent = 'Click again to confirm'; rsT = setTimeout(function () { delete rs.dataset.armed; rs.innerHTML = 'Reset cloak &amp; panic settings'; }, 4000); return; }
      clearTimeout(rsT); delete rs.dataset.armed; rs.innerHTML = 'Reset cloak &amp; panic settings';
      S.reset(); load(); say('Settings reset.', false);
    });
    window.addEventListener('storage', function (e) { if (e.key === S.KEY && route.name === 'settings') load(); });
    window.addEventListener('storage', function (e) {      // favourites / recents changed in another tab
      if (e.key !== FAV_KEY && e.key !== RECENT_KEY) return;
      favs = (store(FAV_KEY) || []).filter(function (t) { return byTitle[norm(t)]; });
      recents = (store(RECENT_KEY) || []).filter(function (t) { return byTitle[norm(t)]; });
      syncFavs(); refreshSettingsData(); refreshRecent();
      if (route.name === 'favourites' || route.name === 'recent') render();
    });

    load();
  }
  function refreshSettingsData() {
    var n = document.getElementById('dataInfo'); if (!n) return;
    n.textContent = recents.length + (recents.length === 1 ? ' recently played game' : ' recently played games') + ' · ' + favs.length + (favs.length === 1 ? ' favourite' : ' favourites');
  }

  /* ------------------------------------------------------------------ search (the legacy handler filters the original cards) */
  function updateSearch() {
    var q = searchBar.value.trim();
    var shown = $$(':scope > .game-card', grid).filter(function (c) { return c.style.display !== 'none'; }).length;
    $('#searchTitle').textContent = 'Results for “' + q + '”';
    $('#searchMeta').textContent = shown + (shown === 1 ? ' game' : ' games');
    var e = $('#searchEmpty'); e.hidden = shown > 0;
    if (!shown) e.innerHTML = noResultsHtml(q);
  }
  /* Typo-tolerant "did you mean" for searches that find nothing. */
  function lev(a, b) {
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    var prev2 = [], prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) cur[j] = Math.min(cur[j], prev2[j - 2] + 1);   // swapped letters count as one typo
      }
      prev2 = prev; prev = cur.slice();
    }
    return prev[b.length];
  }
  function similarGames(q, n) {
    q = norm(q); if (!q) return [];
    var toks = q.split(' ').filter(function (w) { return w.length >= 3; });
    var lim = Math.max(1, Math.floor(q.length * 0.3)), out = [];
    catalog.forEach(function (g) {
      var t = norm(g.title), words = t.split(/[^a-z0-9]+/).filter(Boolean);
      var best = Math.min(lev(q, t), lev(q, t.slice(0, q.length + 1)));
      words.forEach(function (w) { best = Math.min(best, lev(q, w), lev(q, w.slice(0, q.length))); });
      if (toks.some(function (w) { return t.indexOf(w) > -1; })) best = Math.min(best, 1);
      if (best <= lim) out.push({ d: best, g: g });
    });
    out.sort(function (a, b) { return a.d - b.d || a.g.index - b.g.index; });
    return out.slice(0, n).map(function (x) { return x.g; });
  }
  function noResultsHtml(q) {
    var sim = similarGames(q, 4), label = 'Did you mean';
    if (!sim.length) { sim = pick(C.trending).slice(0, 4); label = 'Popular right now'; }
    var games = sim.map(function (g) {
      var im = $('img', g.el), src = im && im.getAttribute('src');
      return '<button type="button" class="chip es-game" data-q="' + esc(g.title) + '"><span class="ico">' + (src ? '<img alt="" src="' + esc(src) + '">' : '') + '</span>' + esc(g.title) + '</button>';
    }).join('');
    var cats = catDefs.filter(function (d) { return !d.fallback && d.games.length >= C.MIN_CATEGORY_SIZE; }).sort(function (a, b) { return b.games.length - a.games.length; }).slice(0, 6).map(function (d) {
      return '<a class="chip" href="#/category/' + d.id + '" data-clear><span class="ico">' + svg(d.id) + '</span>' + esc(d.name) + ' <small>' + d.games.length + '</small></a>';
    }).join('');
    return '<strong>No games found</strong>Nothing matches “' + esc(q) + '”. Check the spelling or try a shorter word.' +
      '<div class="es-block"><span class="es-label">' + label + '</span><div class="chips es-chips">' + games + '</div></div>' +
      '<div class="es-block"><span class="es-label">Or browse a category</span><div class="chips es-chips">' + cats + '</div></div>' +
      '<div class="empty-actions"><button class="btn-s" type="button" data-act="random">Play a random game</button>' +
      '<a class="btn-s" href="' + esc(C.suggestUrl) + '" target="_blank" rel="noopener" onclick="openGame(this.href, \'Google Docs\'); return false;">Suggest this game</a></div>';
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.empty [data-q], .empty [data-act], .empty [data-clear]');
    if (!t) return;
    if (t.hasAttribute('data-q')) { e.preventDefault(); searchBar.value = t.getAttribute('data-q'); searchBar.dispatchEvent(new Event('input', { bubbles: true })); window.scrollTo(0, 0); }
    else if (t.getAttribute('data-act') === 'random') { e.preventDefault(); randomGame(); }
    else if (t.hasAttribute('data-clear') && searchBar.value) { searchBar.value = ''; searchBar.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  searchBar.addEventListener('input', function () {
    clearBtn.hidden = !searchBar.value;
    render();
    if (!searchBar.value) syncFavs();
  });
  /* Live suggestions under the search bar: top title matches, arrow keys + Enter, click to play. */
  var suggest = $('#suggest'), sgItems = [], sgActive = -1;
  searchBar.placeholder = 'Search ' + catalog.length + ' games';
  function hl(title, q) {
    var i = norm(title).indexOf(q); if (i < 0 || norm(title).length !== title.length) return esc(title);
    return esc(title.slice(0, i)) + '<mark>' + esc(title.slice(i, i + q.length)) + '</mark>' + esc(title.slice(i + q.length));
  }
  function sgClose() { suggest.hidden = true; suggest.innerHTML = ''; sgItems = []; sgActive = -1; searchBar.setAttribute('aria-expanded', 'false'); searchBar.removeAttribute('aria-activedescendant'); }
  function sgSetActive(i) {
    sgItems.forEach(function (n, k) { n.classList.toggle('active', k === i); n.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    sgActive = i; var n = sgItems[i]; if (n) { searchBar.setAttribute('aria-activedescendant', n.id); n.scrollIntoView({ block: 'nearest' }); } else searchBar.removeAttribute('aria-activedescendant');
  }
  function sgOpen(g) { sgClose(); searchBar.blur(); g.el.click(); }
  function sgRender() {
    var q = norm(searchBar.value);
    if (!q || document.activeElement !== searchBar) { sgClose(); return; }
    var starts = [], has = [];
    catalog.forEach(function (g) { var t = norm(g.title), i = t.indexOf(q); if (i === 0) starts.push(g); else if (i > 0) has.push(g); });
    var all = starts.concat(has), top = all.slice(0, 6), didYouMean = false;
    suggest.innerHTML = ''; sgItems = []; sgActive = -1;
    if (!top.length) {
      top = similarGames(q, 3); didYouMean = top.length > 0;
      suggest.innerHTML = '<div class="sg-empty"><b>No games found</b> for “' + esc(searchBar.value.trim()) + '”.' + (didYouMean ? ' Did you mean:' : ' Check the spelling.') + '</div>';
    }
    top.forEach(function (g, k) {
      var im = $('img', g.el), src = im && im.getAttribute('src');
      var cat = catDefs.filter(function (d) { return d.games.indexOf(g) >= 0 && !d.fallback; })[0];
      var b = el('button', 'sg-item', '<span class="sg-thumb">' + (src ? '<img alt="" loading="lazy">' : '') + '</span><span class="sg-text"><span class="sg-title">' + hl(g.title, q) + '</span><span class="sg-cat">' + (cat ? esc(cat.name) : 'Game') + '</span></span><span class="sg-go"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.5 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.7l-10-6.4a1 1 0 0 0-1.5.8z"/></svg></span>');
      b.type = 'button'; b.id = 'sg-' + k; b.setAttribute('role', 'option'); b.tabIndex = -1;
      if (src) { var ii = $('img', b); ii.src = src; ii.addEventListener('error', function () { ii.remove(); }); }
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () { sgOpen(g); });
      b.addEventListener('mouseenter', function () { sgSetActive(k); });
      suggest.appendChild(b); sgItems.push(b);
    });
    if (all.length > top.length) {
      var m = el('button', 'sg-all', '<span>See all ' + all.length + ' results</span><span aria-hidden="true">&#8250;</span>'); m.type = 'button'; m.tabIndex = -1;
      m.addEventListener('mousedown', function (e) { e.preventDefault(); });
      m.addEventListener('click', function () { sgClose(); searchBar.blur(); });
      suggest.appendChild(m);
    }
    suggest.hidden = false; searchBar.setAttribute('aria-expanded', 'true');
  }
  searchBar.addEventListener('input', sgRender);
  searchBar.addEventListener('focus', sgRender);
  searchBar.addEventListener('blur', function () { setTimeout(sgClose, 120); });
  searchBar.addEventListener('keydown', function (e) {
    if (suggest.hidden || !sgItems.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); sgSetActive((sgActive + 1) % sgItems.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sgSetActive((sgActive - 1 + sgItems.length) % sgItems.length); }
    else if (e.key === 'Enter') { if (sgActive >= 0) { e.preventDefault(); sgItems[sgActive].click(); } else { sgClose(); searchBar.blur(); } }
    else if (e.key === 'Escape') { sgClose(); }
  });
  clearBtn.addEventListener('click', function () { searchBar.value = ''; searchBar.dispatchEvent(new Event('input', { bubbles: true })); searchBar.focus(); });
  searchBar.addEventListener('keydown', function (e) { if (e.key === 'Escape' && searchBar.value) { searchBar.value = ''; searchBar.dispatchEvent(new Event('input', { bubbles: true })); } });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'textarea') { e.preventDefault(); searchBar.focus(); searchBar.select(); }
  });

  /* ------------------------------------------------------------------ random, header buttons */
  function randomGame() { if (typeof window.openRandom === 'function') window.openRandom(); }
  $('#randomBtn').addEventListener('click', randomGame);

  // Light / dark theme (remembered in this browser; light by default)
  (function () {
    var root = document.documentElement, btn = $('#themeBtn'), meta = document.querySelector('meta[name="theme-color"]');
    function paint() { var d = root.getAttribute('data-theme') === 'dark'; if (meta) meta.setAttribute('content', d ? '#111937' : '#ffffff'); if (btn) btn.setAttribute('aria-pressed', d ? 'true' : 'false'); }
    paint();
    function flip(next) { root.setAttribute('data-theme', next); try { localStorage.setItem('ubg45.theme', next); } catch (e) { /* ignore */ } paint(); }
    if (btn) btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      root.classList.add('theme-switching');                     // no per-element transitions, so the whole page changes in one frame
      if (document.startViewTransition && !still) {
        // Smooth circular wipe from the button: the browser snapshots old and new page and reveals the new one in one piece.
        var r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        var vt = document.startViewTransition(function () { flip(next); });
        vt.ready.then(function () {
          root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 700, easing: 'cubic-bezier(.4, 0, .15, 1)', pseudoElement: '::view-transition-new(root)' });
        }).catch(function () { /* transition skipped */ });
        vt.finished.then(function () { root.classList.remove('theme-switching'); }, function () { root.classList.remove('theme-switching'); });
      } else { flip(next); setTimeout(function () { root.classList.remove('theme-switching'); }, 80); }
    });
  })();

  /* ------------------------------------------------------------------ button motion: ripples and one-shot spins */
  (function () {
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var RIP = '.btn-play, .btn-ghost, .btn-s, .more, .chip, .sg-all, .nav-item';
    document.addEventListener('pointerdown', function (e) {
      if (e.button || (still && still.matches)) return;
      var t = e.target.closest && e.target.closest(RIP);
      if (!t) return;
      var host = t;
      if (t.classList.contains('nav-item')) {            // sidebar rows keep their marker outside, so ripple inside a clip layer
        host = t.querySelector('.rip-clip');
        if (!host) { host = document.createElement('span'); host.className = 'rip-clip'; t.appendChild(host); }
      }
      var r = t.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.1, s = document.createElement('span');
      s.className = 'rip'; s.style.width = s.style.height = d + 'px';
      s.style.left = (e.clientX - r.left - d / 2) + 'px'; s.style.top = (e.clientY - r.top - d / 2) + 'px';
      host.appendChild(s);
      s.addEventListener('animationend', function () { s.remove(); });
    }, true);
    ['themeBtn', 'randomBtn'].forEach(function (id) {
      var b = document.getElementById(id); if (!b) return;
      b.addEventListener('click', function () {
        b.classList.remove('anim'); void b.offsetWidth; b.classList.add('anim');
        setTimeout(function () { b.classList.remove('anim'); }, 800);
      });
    });
  })();

  /* ------------------------------------------------------------------ sidebar collapse / drawer */
  var mq = window.matchMedia('(max-width: 900px)');
  var menuBtn = $('#menuBtn');
  function applyMode() {
    var mobile = mq.matches;
    if (mobile) { body.classList.remove('side-collapsed'); }
    else { body.classList.remove('drawer-open'); body.classList.toggle('side-collapsed', !!store('ubg45.sideCollapsed')); }
    var open = mobile ? body.classList.contains('drawer-open') : !body.classList.contains('side-collapsed');
    menuBtn.setAttribute('aria-expanded', String(open));
    sidebar.inert = mobile && !open;
  }
  function closeDrawer() { if (body.classList.contains('drawer-open')) { body.classList.remove('drawer-open'); applyMode(); } }
  menuBtn.addEventListener('click', function () {
    if (mq.matches) body.classList.toggle('drawer-open');
    else {
      var c = !body.classList.contains('side-collapsed');
      body.classList.add('side-anim');                                   // layout() holds the column count until the bar stops moving
      clearTimeout(animTimer); animTimer = setTimeout(settle, 560);
      body.classList.toggle('side-collapsed', c); store('ubg45.sideCollapsed', c);
    }
    applyMode();
  });
  var animTimer = 0;
  function settle() {
    clearTimeout(animTimer);
    if (!body.classList.contains('side-anim')) return;
    body.classList.add('side-settle'); body.classList.remove('side-anim');
    layout();                                                            // one clean re-fit now that the width is final
    body.classList.remove('side-settle');
  }
  sidebar.addEventListener('transitionend', function (e) { if (e.target === sidebar && e.propertyName === 'width') settle(); });
  $('#backdrop').addEventListener('click', function () { closeDrawer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && body.classList.contains('drawer-open')) { closeDrawer(); menuBtn.focus(); } });
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(applyMode);

  /* ------------------------------------------------------------------ responsive tile metrics */
  function layout() {
    var w = main.clientWidth; if (!w) return;
    var small = w < 640, gap = small ? 6 : 8, target = small ? 100 : 128;
    var animating = body.classList.contains('side-anim');                     // while the side menu slides, keep the column count so tiles resize smoothly
    var n = animating && cols ? cols : Math.max(3, Math.min(14, Math.floor((w + gap) / (target + gap))));
    var tile = (w - (n - 1) * gap) / n;
    root.style.setProperty('--cols', n); root.style.setProperty('--tile', tile.toFixed(2) + 'px'); root.style.setProperty('--gap', gap + 'px');
    if (n !== cols) {
      cols = n;
      if (route.name === 'home' && !searchBar.value.trim()) {
        buildHome(); homeView._cols = n; syncFavs();
        if (body.classList.contains('side-settle')) { homeView.classList.remove('refit'); void homeView.offsetWidth; homeView.classList.add('refit'); setTimeout(function () { homeView.classList.remove('refit'); }, 450); }
      }
    }
    updateRows();
  }
  if (window.ResizeObserver) new ResizeObserver(function () { layout(); }).observe(main);
  else window.addEventListener('resize', layout);

  /* ------------------------------------------------------------------ install as an app (PWA) */
  var installEvt = null, isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function syncInstall() { var a = document.getElementById('nav-install'); if (a) a.hidden = standalone() || !(installEvt || isIos); }
  function installApp() {
    if (installEvt) {
      var ev = installEvt; installEvt = null; syncInstall();
      ev.prompt(); ev.userChoice.then(function (r) { if (r && r.outcome !== 'accepted') { installEvt = ev; syncInstall(); } }, function () { /* ignore */ });
    } else if (isIos) toast('To install: tap the Share button, then “Add to Home Screen”.', 6000);
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; syncInstall(); });
  window.addEventListener('appinstalled', function () { installEvt = null; syncInstall(); toast('UBG45 is installed. Open it from your home screen or apps list.', 4500); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    window.addEventListener('load', function () {
      if (C.pwa === false) { navigator.serviceWorker.getRegistrations().then(function (rs) { var mine = new URL('./', location.href).href; rs.forEach(function (r) { if (r.scope === mine) r.unregister(); }); }).catch(function () { /* ignore */ }); return; }
      navigator.serviceWorker.register('sw.js').catch(function () { /* the site works without it */ });
    });
  }

  /* ------------------------------------------------------------------ boot */
  buildSidebar();
  syncInstall();
  parseHash();
  applyMode();
  layout();
  render();
  syncFavs(); favsReady = true;

  // Likes: cached totals show instantly, fresh ones replace them. Only chips and the "Most liked" row depend on them.
  var likeSig = '';
  function likeVisSig(map) {
    var min = LK.MIN_CHIP || 3, parts = [], k;
    for (k in map) if (map[k] >= min) parts.push(k + ':' + map[k]);
    var sig = parts.sort().join(',') + '|' + (likedRowOn() ? likedList().map(function (g) { return g.index; }).join(',') : '');
    if (listSort === 'liked' || allSort === 'liked' || route.name === 'play' || route.name === 'liked') sig += '|' + JSON.stringify(map);
    return sig;
  }
  function setLikes(map) {
    var before = likeSig; likeCounts = map;
    var sig = likeVisSig(map) + '|' + (hasLikes() ? 1 : 0);
    if (sig === before) return;
    likeSig = sig; applyLikes(); homeView._cols = 0;
    if (!searchBar.value.trim() && route.name !== 'settings' && route.name !== 'news' && route.name !== 'developers') render();
  }
  var likeFetchedAt = 0;
  function refreshLikes(force) { if (!SOC.on) return; likeFetchedAt = Date.now(); SOC.counts(setLikes, force); }
  refreshLikes(false);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - likeFetchedAt > 20000) refreshLikes(true); });
  window.addEventListener('storage', function (e) {          // a like or report made in a game tab: update this page
    if (e.key !== 'ubg45.liked') return;
    if (route.name === 'play') { var h = $('.play-hero', playView); if (h && h._paintLike) h._paintLike(); }
    refreshLikes(true);
  });

  // Live Trending: cached numbers show instantly, fresh ones replace them. Failure leaves the page as it is.
  ST.get(function (rows) {
    statRows = {}; rows.forEach(function (r) { statRows[r.id] = r; });
    var ids = {}, list = [];
    ST.trending(rows).forEach(function (r) { var g = bySlug[r.id]; if (g && !ids[g.index]) { ids[g.index] = 1; list.push(g); } });
    var sig = function (a) { return a.map(function (g) { return g.index; }).join(','); };
    if (sig(list) === sig(liveTrending)) return;
    liveTrending = list; trendingIds = ids;
    applyBadges(); homeView._cols = 0;
    if (!searchBar.value.trim() && route.name !== 'settings') render();
  });
})();
