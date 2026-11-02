/* UBG45 stats layer: anonymous play statistics -> Trending, plus the automatic "New" rule.
 *
 * What is stored (Supabase table ubg45_daily_stats via two RPC functions, or optionally Firebase RTDB; no SDK, no accounts, no personal data):
 *   per day and per game id: opens and seconds played
 * Opens are counted when a game is launched from the site (at most once per game per browser per 20 minutes).
 * Play time is counted by a tiny heartbeat inside the game tab while that tab is visible.
 * Trending is computed in the browser from the last TRENDING_DAYS days of those counters.
 * "New" comes from ubg45-added.js (stamped automatically when a game first appears in index.html).
 *
 * With no supabaseUrl/supabaseKey (or databaseUrl) in ubg45-config.js nothing is sent and no Trending is shown (the site stays fully usable).
 */
(function (root) {
  'use strict';
  var U = (root.UBG45 = root.UBG45 || {});
  var C = U.config || {};
  var S = C.stats || {};
  var DAY = 86400000, OPEN_DEDUPE = 20 * 60000, CACHE_TTL = 3 * 60000;
  var KEY_SENT = 'ubg45.stats.sent', KEY_CACHE = 'ubg45.stats.cache', KEY_OUT = 'ubg45.stats.optout';

  var sbUrl = String(S.supabaseUrl || '').replace(/\/+$/, '');
  var sbKey = String(S.supabaseKey || '');
  var isUrl = function (u) { return /^https:\/\/[^\s/]+/.test(u) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(u); };   // http only for local testing
  var useSb = isUrl(sbUrl) && sbKey.length > 20;                       // Supabase (preferred) ...
  var base = useSb ? sbUrl : String(S.databaseUrl || '').replace(/\/+$/, '');   // ... else Firebase Realtime Database
  var rootKey = S.root || 'ubg45';
  var enabled = useSb || isUrl(base);

  function ls(key, val) {
    try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ }
    return null;
  }
  function slug(t) { return String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x'; }
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim(); }
  function dayStr(ts) { return new Date(ts).toISOString().slice(0, 10); }
  function optedOut() { try { return localStorage.getItem(KEY_OUT) === '1'; } catch (e) { return false; } }
  function setOptOut(v) { try { if (v) localStorage.setItem(KEY_OUT, '1'); else localStorage.removeItem(KEY_OUT); } catch (e) { /* ignore */ } }
  function url(path, q) { return base + '/' + rootKey + '/' + path + '.json' + (q || ''); }

  function increment(id, field, n) {
    if (useSb) {
      try {
        return fetch(sbUrl + '/rest/v1/rpc/ubg45_record', {
          method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', apikey: sbKey },
          body: JSON.stringify({ p_game: id, p_opens: field === 'o' ? n : 0, p_seconds: field === 's' ? n : 0 })
        }).catch(function () { /* offline or blocked: ignore */ });
      } catch (e) { return null; }
    }
    var body = {}; body[field] = { '.sv': { increment: n } };
    try {
      return fetch(url('days/' + dayStr(Date.now()) + '/' + id), {
        method: 'PATCH', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      }).catch(function () { /* offline or blocked: ignore */ });
    } catch (e) { return null; }
  }

  /* ------------------------------------------------------------ tracking */
  var stats = U.stats = {
    enabled: enabled,
    pending: null,
    slug: slug,
    optedOut: optedOut,
    setOptOut: setOptOut,

    // Called when a game is launched from the site.
    begin: function (title) {
      if (!enabled || optedOut() || !title) return;
      var id = slug(title), now = Date.now(), sent = ls(KEY_SENT) || {};
      stats.pending = title;
      setTimeout(function () { stats.pending = null; }, 0);
      if (sent[id] && now - sent[id] < OPEN_DEDUPE) return;      // same game again within 20 min: not a new "open"
      Object.keys(sent).forEach(function (k) { if (now - sent[k] > DAY) delete sent[k]; });
      sent[id] = now; ls(KEY_SENT, sent);
      increment(id, 'o', 1);
    },

    // Script placed in the head of the game tab: adds the seconds the tab is actually visible.
    heartbeat: function (title) {
      if (!enabled || optedOut() || !title) return '';
      var cfg = JSON.stringify({ b: base, r: rootKey, i: slug(title), k: useSb ? sbKey : '' }).replace(/</g, '\\u003c');
      var js = '(function(c){var tot=0,MAX=10800,last=Date.now(),vis=!document.hidden;' +
        'function post(n){if(n<=0||tot>=MAX)return;tot+=n;try{if(c.k){fetch(c.b+"/rest/v1/rpc/ubg45_record",{method:"POST",keepalive:true,headers:{"Content-Type":"application/json",apikey:c.k},body:JSON.stringify({p_game:c.i,p_opens:0,p_seconds:n})}).catch(function(){});return}' +
        'fetch(c.b+"/"+c.r+"/days/"+new Date().toISOString().slice(0,10)+"/"+c.i+".json",' +
        '{method:"PATCH",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify({s:{".sv":{increment:n}}})}).catch(function(){})}catch(e){}}' +
        'function flush(){var now=Date.now();if(vis)post(Math.min(Math.round((now-last)/1000),60));last=now}' +
        'setInterval(flush,30000);' +
        'document.addEventListener("visibilitychange",function(){flush();vis=!document.hidden});' +
        'addEventListener("pagehide",flush)})(' + cfg + ');';
      return '<script>' + js + '<\/script>';
    },

    /* -------------------------------------------------------- reading */
    // Calls cb(rows) with cached data straight away (if any) and again once fresh data arrives. rows = [{id, o, s}].
    get: function (cb) {
      if (!enabled) return;
      var days = Math.max(1, S.TRENDING_DAYS || 7);
      var cache = ls(KEY_CACHE);
      var cacheOk = cache && cache.rows && cache.days === days && cache.base === base;
      if (cacheOk) cb(cache.rows, true);
      if (cacheOk && Date.now() - cache.t < CACHE_TTL) return;
      var start = dayStr(Date.now() - (days - 1) * DAY);
      var q = '?orderBy=%22%24key%22&startAt=%22' + start + '%22';
      var ctl = root.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
      var req = useSb
        ? fetch(sbUrl + '/rest/v1/rpc/ubg45_stats', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: sbKey }, body: JSON.stringify({ p_days: days }), signal: ctl ? ctl.signal : undefined })
        : fetch(url('days', q), ctl ? { signal: ctl.signal } : undefined);
      req.then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (data) {
          clearTimeout(timer);
          var rows = useSb ? stats.fromRows(data) : stats.aggregate(data, start);
          ls(KEY_CACHE, { t: Date.now(), days: days, base: base, rows: rows });
          cb(rows, false);
        }).catch(function () { clearTimeout(timer); /* keep whatever we showed from cache */ });
    },

    // Supabase returns [{id, o, s}] already summed over the window.
    fromRows: function (list) {
      return (Array.isArray(list) ? list : []).map(function (r) {
        return { id: String(r && r.id || ''), o: Number(r && r.o) || 0, s: Number(r && r.s) || 0 };
      }).filter(function (r) { return r.id && r.o >= 0 && r.s >= 0; });
    },

    aggregate: function (data, startDay) {
      var acc = {};
      Object.keys(data || {}).forEach(function (d) {
        if (d < startDay || !data[d] || typeof data[d] !== 'object') return;
        Object.keys(data[d]).forEach(function (id) {
          var v = data[d][id] || {};
          var o = Number(v.o) || 0, s = Number(v.s) || 0;
          if (o < 0 || s < 0) return;
          var a = acc[id] || (acc[id] = { id: id, o: 0, s: 0 }); a.o += o; a.s += s;
        });
      });
      return Object.keys(acc).map(function (k) { return acc[k]; });
    },

    /* Trending rule. A game qualifies if, over the window, it has a high number of opens OR a high amount of play time:
     *   - at least MIN_OPENS opens, or at least MIN_MINUTES minutes played (and always at least 2 opens, so a single
     *     tab left open overnight cannot trend);
     *   - score = the better of (opens / best opens) and (minutes / best minutes), so either signal can carry a game.
     * The top TRENDING_MAX qualifying games are returned, best first. */
    trending: function (rows) {
      var minO = S.MIN_OPENS || 3, minM = S.MIN_MINUTES || 15, max = S.TRENDING_MAX || 12;
      var ok = (rows || []).filter(function (r) { var m = r.s / 60; return r.o >= 2 && (r.o >= minO || m >= minM); });
      if (!ok.length) return [];
      var maxO = Math.max.apply(null, ok.map(function (r) { return r.o; })) || 1;
      var maxM = Math.max.apply(null, ok.map(function (r) { return r.s / 60; })) || 1;
      ok.forEach(function (r) { var a = r.o / maxO, b = (r.s / 60) / maxM; r.score = Math.max(a, b) + (a + b) / 20; });
      ok.sort(function (x, y) { return y.score - x.score || y.o - x.o; });
      return ok.slice(0, max);
    },

    /* -------------------------------------------------------- new games */
    addedOn: function (title) { var a = U.added || {}; return a[norm(title)] || null; },
    isNew: function (title) {
      var d = stats.addedOn(title); if (!d) return false;
      var t = Date.parse(d + 'T00:00:00Z'); if (isNaN(t)) return false;
      return Date.now() - t <= (C.NEW_DAYS || 14) * DAY && t <= Date.now() + DAY;
    }
  };

  // Put the heartbeat into every game tab that is opened for a catalog game.
  if (typeof U.gameHead === 'function' && !U.gameHead._stats) {
    var orig = U.gameHead;
    U.gameHead = function () {
      var out = orig.apply(this, arguments);
      try { var t = stats.pending; if (t) { stats.pending = null; out += stats.heartbeat(t); } } catch (e) { /* never break a game tab */ }
      return out;
    };
    U.gameHead._stats = true;
  }
})(window);
