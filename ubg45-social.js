/* UBG45 community layer: anonymous likes, "report a broken game" and share links.
 *
 * What is stored (Supabase project ubg43-global-trending, tables ubg45_likes and ubg45_reports, written only through the
 * capped functions ubg45_like / ubg45_report; no accounts, no personal data, nothing that identifies you):
 *   likes:   one number per game (how many browsers like it)
 *   reports: how many "this game is broken" reports per game per day
 * Which games YOU liked are remembered only in this browser (localStorage), so a like can be taken back and cannot be repeated.
 * With no supabaseUrl/supabaseKey in ubg45-config.js nothing is sent and the like/report buttons stay hidden.
 *
 * makeSocial() is self-contained on purpose: the game tab (a separate about:blank page) receives its source text and runs
 * its own copy, so the heart and flag buttons in the game toolbar behave exactly like the ones on the site.
 */
(function (root) {
  'use strict';
  var U = (root.UBG45 = root.UBG45 || {});
  var C = U.config || {};
  var S = C.stats || {};

  function makeSocial(cfg) {
    var LK = 'ubg45.liked', RK = 'ubg45.reported', CK = 'ubg45.likes.cache', TTL = 120000;
    function rd(k) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
    function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
    function today() { return new Date().toISOString().slice(0, 10); }
    function rpc(fn, body) {
      return fetch(cfg.u + '/rest/v1/rpc/' + fn, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', apikey: cfg.k }, body: JSON.stringify(body || {}) })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.text(); })
        .then(function (t) { return t ? JSON.parse(t) : null; });
    }
    function legacyCopy(t) {
      try {
        var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:-100px;left:0;opacity:0';
        document.body.appendChild(a); a.select(); a.setSelectionRange(0, t.length);
        var ok = document.execCommand('copy'); a.remove(); return !!ok;
      } catch (e) { return false; }
    }
    var api = {
      on: !!(cfg && cfg.u && cfg.k),
      isLiked: function (id) { return !!rd(LK)[id]; },
      isReported: function (id) { return rd(RK)[id] === today(); },

      /* Like or un-like. Resolves { liked, ok }: liked is the state that now holds, ok is false when the server could not be reached (the change is then undone). */
      setLike: function (id, on) {
        var m = rd(LK), was = !!m[id];
        if (was === on) return Promise.resolve({ liked: on, ok: true });
        if (on) m[id] = 1; else delete m[id];
        wr(LK, m);
        if (!api.on) return Promise.resolve({ liked: on, ok: true });
        return rpc('ubg45_like', { p_game: id, p_delta: on ? 1 : -1 }).then(function () {
          api.bump(id, on ? 1 : -1);
          return { liked: on, ok: true };
        }, function () {
          var m2 = rd(LK); if (was) m2[id] = 1; else delete m2[id]; wr(LK, m2);
          return { liked: was, ok: false };
        });
      },

      /* One report per game per day per browser. Resolves 'ok', 'dup' (already reported today), 'off' (not configured) or 'err'. */
      report: function (id, reason) {
        if (api.isReported(id)) return Promise.resolve('dup');
        if (!api.on) return Promise.resolve('off');
        return rpc('ubg45_report', reason ? { p_game: id, p_reason: reason } : { p_game: id }).catch(function (e) { if (reason) return rpc('ubg45_report', { p_game: id }); throw e; }).then(function () {
          var t = today(), m = rd(RK), n = {}; Object.keys(m).forEach(function (k) { if (m[k] === t) n[k] = t; }); n[id] = t; wr(RK, n);
          return 'ok';
        }, function () { return 'err'; });
      },

      /* Like totals for every game: cb(map, fromCache). Cached for two minutes so pages do not refetch on every view. */
      counts: function (cb, force) {
        if (!api.on) return;
        var c = rd(CK), have = c.rows && typeof c.rows === 'object';
        if (have) cb(c.rows, true);
        if (have && !force && Date.now() - (c.t || 0) < TTL) return;
        var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
        fetch(cfg.u + '/rest/v1/rpc/ubg45_like_counts', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.k }, body: '{}', signal: ctl ? ctl.signal : undefined })
          .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
          .then(function (list) {
            clearTimeout(timer);
            var map = {};
            (Array.isArray(list) ? list : []).forEach(function (r) { var n = Number(r && r.n); if (r && /^[a-z0-9-]{1,80}$/.test(String(r.id)) && n > 0) map[r.id] = Math.floor(n); });
            wr(CK, { t: Date.now(), rows: map }); cb(map, false);
          }).catch(function () { clearTimeout(timer); });
      },
      /* Keep the cached totals in step with this browser's own like, so the number moves straight away. */
      bump: function (id, d) {
        var c = rd(CK); if (!c.rows) return;
        var n = Math.max(0, (c.rows[id] || 0) + d); if (n) c.rows[id] = n; else delete c.rows[id];
        wr(CK, c);
      },
      copy: function (text) {
        text = String(text);
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
        }
        return Promise.resolve(legacyCopy(text));
      }
    };
    return api;
  }

  var url = String(S.supabaseUrl || '').replace(/\/+$/, ''), key = String(S.supabaseKey || '');
  var okUrl = /^https:\/\/[^\s/]+/.test(url) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url);   // http only for local testing
  var social = makeSocial(okUrl && key.length > 20 ? { u: url, k: key } : { u: '', k: '' });
  social.make = makeSocial;
  social.source = makeSocial.toString();
  social.cfg = okUrl && key.length > 20 ? { u: url, k: key } : { u: '', k: '' };
  U.social = social;

  /* The link people share for one game. Works from any address the site is served from. */
  U.shareUrl = function (slug) { return root.location.href.split('#')[0] + '#/play/' + slug; };
})(window);
