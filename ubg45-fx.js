/* UBG45 pointer effects: tiles tilt towards the mouse and a soft light follows it. Mouse only (never on touch), skipped for reduced motion. */
(function () {
  'use strict';
  var fine = false, calm = false;
  try { fine = matchMedia('(hover: hover) and (pointer: fine)').matches; calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  if (calm) return;

  /* Menu rows slide in one after another the first time the page opens. */
  function stagger() {
    var nav = document.querySelector('.sidebar'); if (!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll('.nav-item'), function (n, i) { n.style.setProperty('--i', Math.min(i, 22)); });
    nav.classList.add('nav-stagger');
    setTimeout(function () { nav.classList.remove('nav-stagger'); }, 1600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', stagger); else stagger();

  /* The numbers in the banner count up once, the first time they appear. */
  var counted = {};
  function countUp(b) {
    var txt = (b.textContent || '').trim(); if (!/^\d{1,5}$/.test(txt) || counted[txt + ':' + (b.parentNode && b.parentNode.textContent)]) return;
    counted[txt + ':' + (b.parentNode && b.parentNode.textContent)] = 1;
    var to = +txt, t0 = performance.now(), dur = 900;
    (function step(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); b.textContent = String(Math.round(to * e)); if (k < 1) requestAnimationFrame(step); else b.textContent = txt; })(t0);
  }
  try {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1 && n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('.hero .fact b'), countUp); }); });
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) { /* ignore */ }

  if (!fine) return;

  /* Light follows the mouse over cards. */
  var spotSel = '.set-card, .news-body, .play-info .ig-card';
  document.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest(spotSel); if (!c) return;
    var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* Banner buttons lean toward the mouse. */
  var mag = null;
  document.addEventListener('pointermove', function (e) {
    var b = e.target.closest && e.target.closest('.hero .btn-play, .hero .btn-ghost');
    if (mag && mag !== b) { mag.style.removeProperty('--tx'); mag.style.removeProperty('--ty'); mag = null; }
    if (!b) return; mag = b;
    var r = b.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
    b.style.setProperty('--tx', (x * 10).toFixed(1) + 'px'); b.style.setProperty('--ty', (y * 7).toFixed(1) + 'px');
  }, { passive: true });

  var cur = null, raf = 0, ev = null;
  function reset(c) { if (!c) return; c.classList.remove('tilting'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
  function apply() {
    raf = 0; if (!ev) return;
    var c = ev.target.closest ? ev.target.closest('.game-card') : null;
    if (c && c.classList.contains('mini')) c = null;
    if (c !== cur) { reset(cur); cur = c; }
    if (!c) return;
    var r = c.getBoundingClientRect(); if (!r.width) return;
    var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
    var big = r.width > 220, k = big ? 5 : 9;
    c.classList.add('tilting');
    c.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    c.style.setProperty('--ry', ((x - .5) * k).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - y) * k).toFixed(2) + 'deg');
  }
  document.addEventListener('pointermove', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; ev = e; if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
  document.addEventListener('pointerleave', function () { reset(cur); cur = null; }, true);
  window.addEventListener('blur', function () { reset(cur); cur = null; });
  document.addEventListener('scroll', function () { if (cur) { reset(cur); cur = null; } }, { passive: true, capture: true });
})();
