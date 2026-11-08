/* UBG45 service worker: lets the site install as an app and open quickly, even on a slow connection.
 *
 * What it does (and nothing more):
 *   - Pages: network first, so you always get the newest site; if the network is down or slow, the last copy is shown.
 *   - The site's own scripts, styles, fonts, icons and thumbnails in img/: shown instantly from the saved copy and refreshed
 *     in the background (their addresses carry ?v=<hash>, so a new version is a new address).
 *   - It never touches games (they open in their own tab from other sites or from games/), other sites' files, or anything
 *     that is not a plain GET. Saved files are capped, and old copies are deleted when this file changes.
 * To switch it off for everyone set pwa: false in ubg45-config.js (the page then unregisters it).
 */
'use strict';
var VERSION = 'ubg45-sw-v2';
var PAGES = VERSION + '-pages', FILES = VERSION + '-files';
var MAX_FILES = 220;
var SCOPE = self.registration.scope;                       // e.g. https://ubg45.github.io/ubg45/
var ASSET = /^(ubg45[a-z0-9-]*\.(?:js|css)|favicon\.(?:svg|ico)|manifest\.webmanifest|(?:fonts|pwa|img)\/.+)$/i;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(PAGES).then(function (c) { return c.addAll(['./', 'index.html']).catch(function () { /* first visit offline: nothing to keep yet */ }); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('ubg45-sw-') === 0 && k !== PAGES && k !== FILES; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function trim(cache) {
  return cache.keys().then(function (keys) { if (keys.length > MAX_FILES) return Promise.all(keys.slice(0, keys.length - MAX_FILES).map(function (k) { return cache.delete(k); })); });
}

function networkFirst(req) {
  return new Promise(function (resolve) {
    var done = false, timer = setTimeout(function () {                 // slow network: show the saved page, but keep loading in the background
      caches.match(req, { ignoreSearch: true }).then(function (hit) { if (hit && !done) { done = true; resolve(hit); } });
    }, 3500);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) { var c1 = res.clone(), c2 = res.clone(); caches.open(PAGES).then(function (c) { c.put(req, c1); c.put('index.html', c2); }); }   // clone both now: the page is about to consume the original
      if (!done) { done = true; resolve(res); }
    }).catch(function () {
      clearTimeout(timer);
      if (done) return;
      caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); }).then(function (hit) {
        done = true;
        resolve(hit || new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UBG45 is offline</title>' +
          '<body style="font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f3f5fc;color:#0b1437;text-align:center"><div><h1>You are offline</h1><p>Reconnect and reload to play.</p></div>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
      });
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.open(FILES).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') { cache.put(req, res.clone()).then(function () { return trim(cache); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

function networkFirstFile(req) {                          // the settings file is also the off switch (pwa: false), so it must never be stale
  return fetch(new Request(req, { cache: 'no-cache' })).then(function (res) {      // no-cache: always ask the server, even if the browser thinks its copy is still fresh
    if (res && res.ok && res.type === 'basic') { var c = res.clone(); caches.open(FILES).then(function (cache) { cache.put(req, c); }); }
    return res;
  }).catch(function () { return caches.match(req).then(function (hit) { return hit || Response.error(); }); });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || url.href.indexOf(SCOPE) !== 0) return;
  var rel = url.href.slice(SCOPE.length).split('?')[0].split('#')[0];
  if (req.mode === 'navigate') {
    if (rel === '' || rel === 'index.html') e.respondWith(networkFirst(req));      // only the site's own page; game pages in games/ go straight to the network
    return;
  }
  if (rel === 'ubg45-config.js') e.respondWith(networkFirstFile(req));
  else if (ASSET.test(rel)) e.respondWith(staleWhileRevalidate(req));
});

self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });
