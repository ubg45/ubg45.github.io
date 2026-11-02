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
    suggest: '<path d="M4 4h16v12H9l-5 4z" fill="#ffb02e"/><path d="M12 7.5v5M9.5 10h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    generic: '<circle cx="12" cy="12" r="8" fill="#9aa3b5"/>'
  };
  function svg(name, size) { return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + '>' + (ICON[name] || ICON.generic) + '</svg>'; }

  /* ------------------------------------------------------------------ catalog */
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
    var n = $('#favCount'); n.textContent = favs.length; n.hidden = !favs.length;
    var side = $('#nav-fav .n'); if (side) side.textContent = favs.length || '';
  }
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
    'new': '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2.5l2 5.7 5.7 2-5.7 2-2 5.8-2-5.8-5.7-2 5.7-2z"/><path fill="currentColor" d="M18.5 13l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>'
  };
  function applyBadges() {
    catalog.forEach(function (g) {
      var c = g.el, old = $(':scope > .badges', c); if (old) old.remove();
      var kinds = [];
      if (trendingIds[g.index]) kinds.push('trending');
      if (g.isNew) kinds.push('new');
      if (!kinds.length) return;
      var wrap = el('div', 'badges');
      kinds.forEach(function (k) { wrap.appendChild(el('span', 'badge ' + k, BADGE_ICON[k] + '<span>' + (k === 'new' ? 'New' : 'Trending') + '</span>')); });
      c.insertBefore(wrap, c.firstChild);
    });
  }
  applyBadges();

  // Card interactions (delegated so clones work too)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.fav-btn');
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    toggleFav(b.closest('.game-card').getAttribute('data-title'));
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
      if (g) { ST.begin(g.title); }
      if (g) { recents = [g.title].concat(recents.filter(function (t) { return t !== g.title; })).slice(0, C.RECENT_MAX); store(RECENT_KEY, recents); }
      return originalOpen.apply(this, arguments);
    };
  }

  /* ------------------------------------------------------------------ DOM refs */
  var sidebar = $('#sidebar'), main = $('#main'), content = $('.content');
  var homeView = $('#homeView'), listView = $('#listView'), searchView = $('#searchView'), settingsView = $('#settingsView');
  var searchBar = $('#searchBar'), clearBtn = $('#searchClear');
  var strip = $('#strip');

  function cloneOf(g, extra) {
    var c = g.el.cloneNode(true);
    c.removeAttribute('id'); c.removeAttribute('style');
    c.classList.remove('is-fav');
    if (extra) c.className += ' ' + extra;
    return c;
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
    var sg = navItem('nav-suggest', 'suggest', 'Suggest a Game', C.suggestUrl);
    sg.target = '_blank'; sg.rel = 'noopener';
    sg.setAttribute('onclick', "openGame(this.href, 'Google Docs'); return false;");
    f.appendChild(sg);
    sidebar.appendChild(f);
  }

  /* ------------------------------------------------------------------ views */
  function rowSection(title, games, moreHref, icon) {
    var sec = el('section', 'sec');
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

  function buildHome() {
    homeView.innerHTML = '';
    homeView.appendChild(buildCollage());
    var live = liveTrending.length >= (C.stats.MIN_LIVE || 3);
    var secs = [live ? rowSection('Trending', liveTrending.slice(0, C.ROW_MAX), '#/popular', 'trending')
                     : rowSection('Popular', pick(C.trending).slice(0, C.ROW_MAX), '#/popular')];   // hand-picked until real play data exists
    if (newGames.length) secs.push(rowSection('New Games', newGames.slice(0, C.ROW_MAX), '#/new', 'new'));
    activeCats.filter(function (d) { return !d.fallback; }).slice(0, C.CATEGORY_ROWS).forEach(function (d) {
      secs.push(rowSection(d.name, d.games.slice(0, C.ROW_MAX), '#/category/' + d.id));
    });
    secs.forEach(function (s) { homeView.appendChild(s); });
    homeView.appendChild(allSection());
    requestAnimationFrame(function () { secs.forEach(function (s) { s._update(); }); });
  }

  /* Every game on the site, at the bottom of the homepage. */
  var ALL_SORT_KEY = 'ubg45.allSort', allSort = store(ALL_SORT_KEY) || 'az';
  if (['az', 'za', 'new'].indexOf(allSort) < 0) allSort = 'az';
  function sortedAll(mode) {
    var cmp = function (a, b) { return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }); };
    var list = catalog.slice();
    if (mode === 'za') list.sort(function (a, b) { return cmp(b, a); });
    else if (mode === 'new') list.sort(function (a, b) {
      var da = ST.addedOn(a.title) || '', db = ST.addedOn(b.title) || '';
      return da < db ? 1 : da > db ? -1 : b.index - a.index;
    });
    else list.sort(cmp);
    return list;
  }
  function allSection() {
    var sec = el('section', 'sec all-sec');
    sec.id = 'allGames';
    sec.innerHTML = '<div class="sec-head"><h2><span class="h-ico all"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z"/></svg></span>All Games</h2>' +
      '<span class="meta all-count">' + catalog.length + ' games</span>' +
      '<label class="sort"><span>Sort</span><select aria-label="Sort all games"><option value="az">A to Z</option><option value="za">Z to A</option><option value="new">Newest first</option></select></label></div>' +
      '<div class="tile-grid" id="allGrid"></div>';
    var sel = $('select', sec), gridEl = $('#allGrid', sec);
    function fill() { gridEl.innerHTML = ''; var f = document.createDocumentFragment(); sortedAll(allSort).forEach(function (g) { f.appendChild(cloneOf(g)); }); gridEl.appendChild(f); syncFavs(); }
    sel.value = allSort;
    sel.addEventListener('change', function () { allSort = sel.value; store(ALL_SORT_KEY, allSort); fill(); });
    fill();
    return sec;
  }

  function listPage(title, games, emptyHtml, meta) {
    $('#listTitle').textContent = title;
    $('#listMeta').textContent = meta != null ? meta : games.length + (games.length === 1 ? ' game' : ' games');
    var g = $('#viewGrid'); g.innerHTML = '';
    games.forEach(function (x) { g.appendChild(cloneOf(x)); });
    var e = $('#listEmpty'); e.hidden = games.length > 0; if (!games.length) e.innerHTML = emptyHtml || '<strong>Nothing here yet</strong>';
  }

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
      $$('.badge, .fav-btn, h3', c).forEach(function (n) { n.remove(); });
      strip.appendChild(c);
    });
  }

  var TITLES = { new: 'New Games', popular: 'Popular Games', favourites: 'Favourites', recent: 'Recently Played' };
  function render() {
    var q = searchBar.value.trim();
    var searching = !!q;
    body.classList.toggle('searching', searching);
    homeView.hidden = listView.hidden = searchView.hidden = settingsView.hidden = true;
    $('#stripWrap').hidden = searching || route.name === 'settings';
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
        listPage(d.name + ' Games', d.games, '<strong>No games here yet</strong>'); break;
      case 'settings':
        settingsView.hidden = false; buildSettings(); break;
      case 'favourites':
        g = favs.map(function (t) { return byTitle[norm(t)]; }).filter(Boolean);
        listPage(TITLES.favourites, g, '<strong>No favourites yet</strong>Click the heart on any game (or press F while it is focused) to save it here.'); break;
      case 'recent':
        g = recents.map(function (t) { return byTitle[norm(t)]; }).filter(Boolean);
        listPage(TITLES.recent, g, '<strong>Nothing played yet</strong>Games you open will show up here.'); break;
      default:
        homeView.hidden = false; if (!homeView.firstChild || homeView._cols !== cols) { buildHome(); homeView._cols = cols; }
    }
    if (route.name !== 'home' && route.name !== 'settings') listView.hidden = false;
    markNav(route);
    buildStrip();
    syncFavs();
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
    if (p[0] === 'new' || p[0] === 'popular' || p[0] === 'favourites' || p[0] === 'recent' || p[0] === 'settings') route = { name: p[0], id: '' };
    else if (p[0] === 'category' && p[1]) route = { name: 'category', id: decodeURIComponent(p[1]) };
    else route = { name: 'home', id: '' };
  }
  window.addEventListener('hashchange', function () {
    parseHash();
    if (searchBar.value) { searchBar.value = ''; searchBar.dispatchEvent(new Event('input', { bubbles: true })); }
    closeDrawer(); render(); window.scrollTo(0, 0);
  });

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

    $s('clearRecent').addEventListener('click', function () { recents = []; store(RECENT_KEY, recents); buildStrip(); refreshSettingsData(); say('Recently played cleared.', false); });
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
      syncFavs(); refreshSettingsData();
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
    if (!shown) e.innerHTML = '<strong>No games found</strong>Nothing matches “' + esc(q) + '”. Check the spelling, or <a href="' + esc(C.suggestUrl) + '" target="_blank" rel="noopener" onclick="openGame(this.href, \'Google Docs\'); return false;">suggest it</a>.';
  }
  searchBar.addEventListener('input', function () {
    clearBtn.hidden = !searchBar.value;
    render();
    if (!searchBar.value) syncFavs();
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
    else { var c = !body.classList.contains('side-collapsed'); body.classList.toggle('side-collapsed', c); store('ubg45.sideCollapsed', c); }
    applyMode();
  });
  $('#backdrop').addEventListener('click', function () { closeDrawer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && body.classList.contains('drawer-open')) { closeDrawer(); menuBtn.focus(); } });
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(applyMode);

  /* ------------------------------------------------------------------ responsive tile metrics */
  function layout() {
    var w = main.clientWidth; if (!w) return;
    var small = w < 640, gap = small ? 6 : 8, target = small ? 100 : 128;
    var n = Math.max(3, Math.min(14, Math.floor((w + gap) / (target + gap))));
    var tile = (w - (n - 1) * gap) / n;
    root.style.setProperty('--cols', n); root.style.setProperty('--tile', tile.toFixed(2) + 'px'); root.style.setProperty('--gap', gap + 'px');
    if (n !== cols) { cols = n; if (route.name === 'home' && !searchBar.value.trim()) { buildHome(); homeView._cols = n; syncFavs(); } }
    $$('.row-wrap').forEach(function (w2) { var r = $('.row', w2); if (r) r.dispatchEvent(new Event('scroll')); });
  }
  if (window.ResizeObserver) new ResizeObserver(function () { layout(); }).observe(main);
  else window.addEventListener('resize', layout);

  /* ------------------------------------------------------------------ boot */
  var bySlug = {};
  catalog.forEach(function (g) { var k = ST.slug(g.title); if (!bySlug[k]) bySlug[k] = g; });
  buildSidebar();
  parseHash();
  applyMode();
  layout();
  render();
  syncFavs();

  // Live Trending: cached numbers show instantly, fresh ones replace them. Failure leaves the page as it is.
  ST.get(function (rows) {
    var ids = {}, list = [];
    ST.trending(rows).forEach(function (r) { var g = bySlug[r.id]; if (g && !ids[g.index]) { ids[g.index] = 1; list.push(g); } });
    var sig = function (a) { return a.map(function (g) { return g.index; }).join(','); };
    if (sig(list) === sig(liveTrending)) return;
    liveTrending = list; trendingIds = ids;
    applyBadges(); homeView._cols = 0;
    if (!searchBar.value.trim() && route.name !== 'settings') render();
  });
})();
