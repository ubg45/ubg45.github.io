/* UBG45 pointer effects: tiles tilt towards the mouse and a soft light follows it. Mouse only (never on touch), skipped for reduced motion. */
(function () {
  'use strict';
  var fine = false, calm = false;
  try { fine = matchMedia('(hover: hover) and (pointer: fine)').matches; calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  if (!fine || calm) return;
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
