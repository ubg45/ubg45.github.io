/* UBG45 Developers page (#/developers): where people who make browser games can send theirs in.
 *
 *   U.devPage.build(view, { cats: ['Action', ...], toast: fn })   fills the page into `view` (built once, kept while you move around)
 *
 * What happens to a submission: it is sent through the capped database function ubg45_submit_game (see supabase/ubg45-reports-and-submissions.sql)
 * into a table that visitors cannot read. We play-test it by hand; nothing is added to the site automatically.
 * What is stored: exactly the fields of the form, including the contact email (so we can reply). The email is never shown on the site.
 * The rules on the page follow what the big game portals ask of developers (embeddable https link, responsive, light to load,
 * no pop-ups or redirects, no tracking, original or permitted, family friendly), plus what a school-friendly site needs.
 */
(function (root) {
  'use strict';
  var U = (root.UBG45 = root.UBG45 || {});

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  var LOG = 'ubg45.dev.sent';                                      // when this browser last sent a game (limits how fast one person can send)
  function rd() { try { var v = JSON.parse(localStorage.getItem(LOG) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function wr(v) { try { localStorage.setItem(LOG, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  function recent() { var t = Date.now() - 3600000; return rd().filter(function (x) { return typeof x === 'number' && x > t; }); }

  /* the same rules as the database function, so mistakes are caught here first */
  function httpsUrl(v, max) {
    if (!v || v.length > (max || 400) || /\s/.test(v)) return false;
    try { var u = new URL(v); return u.protocol === 'https:' && u.hostname.indexOf('.') > 0 && !/^[0-9.]+$/.test(u.hostname) && /^[a-z0-9.-]+$/i.test(u.hostname); } catch (e) { return false; }
  }
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.6 4.6L19.2 7.4"/></svg>';

  var REQS = [
    ['Plays in the browser', 'HTML5, WebGL or WebAssembly. No downloads, plugins or installers.'],
    ['Your own https link that can sit inside a frame', 'We open the game from your link. Make sure the host does not block frames (no X-Frame-Options: DENY, and frame-ancestors must allow other sites).'],
    ['Opens straight into the game', 'No login, no sign-up wall. Aim to reach gameplay in under 20 seconds and keep the first download small (the big portals ask for under 50 MB, some for under 8 MB).'],
    ['Fits any window', 'The game resizes to the space it gets (computers, tablets and phones) and works with a keyboard and mouse. Add touch controls if you say it works on phones or tablets.'],
    ['Self-contained and safe', 'No pop-ups, forced redirects, downloads, crypto miners or hidden trackers. If your game shows ads, say so in the description. Wrap localStorage in try/catch so it still runs when the browser blocks saving.'],
    ['Suitable for school', 'Nothing sexual, hateful, graphic or about gambling.'],
    ['Yours to share', 'You made it, or you have permission from whoever did. No copies of other people’s games, characters or art.']
  ];
  var STEPS = [
    ['Send it in', 'Fill in the form with your link, a short description and how to play.'],
    ['We play-test it', 'We check that it loads inside UBG45, runs well and follows the rules on this page. Every game is looked at by a person.'],
    ['It goes live (if it fits)', 'It gets its own page with info and controls, and we credit you as the developer. We may email you if we need something.']
  ];
  var FAQ = [
    ['Will you host my game?', 'No. We open it from your link, so you stay in control and can update it any time. If the link stops working, we may have to take the game down until it does.'],
    ['Do I keep the rights to my game?', 'Yes. Sending a game only lets us show it from your link on UBG45. It does not transfer ownership.'],
    ['How long does it take?', 'We read every submission ourselves, so it can take a while, and we cannot promise that every game gets added. We only email you if we have a question or need a change.'],
    ['Can I get my game taken down?', 'Yes. Use the Suggest a Game link in the menu to send us a message with the game’s name and ask us to remove it.'],
    ['What do you store about me?', 'Only what is in the form, including your email, so that we can review your game and reply to you. It is never shown on the site.']
  ];

  function field(id, label, input, help, req) {
    return '<div class="dv-f" id="f-' + id + '"><label for="' + id + '">' + label + (req ? ' <span class="dv-req" aria-hidden="true">*</span>' : '<span class="dv-opt"> (optional)</span>') + '</label>' + input +
      (help ? '<small class="dv-h" id="h-' + id + '">' + help + '</small>' : '') + '<small class="dv-e" id="e-' + id + '" role="alert" hidden></small></div>';
  }

  function build(view, opts) {
    if (view._built) return;
    view._built = true;
    opts = opts || {};
    var soc = U.social || {}, cfg = soc.cfg || {}, on = !!(soc.on && cfg.u && cfg.k);
    var toast = opts.toast || function () { };
    var cats = (opts.cats || []).slice(0, 40);

    var catOpts = '<option value="">Choose a category…</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '<option>Other</option>';
    var form =
      '<form class="set-card dv-card" id="devForm" novalidate aria-labelledby="dvFormT">' +
        '<h2 id="dvFormT">Send us your game</h2>' +
        '<p class="desc">Fields marked <span class="dv-req">*</span> are needed.</p>' +
        '<div class="dv-body" id="dvBody">' +
          field('dvTitle', 'Game title', '<input id="dvTitle" type="text" maxlength="60" autocomplete="off" aria-describedby="h-dvTitle e-dvTitle">', '', true) +
          field('dvUrl', 'Link to your game', '<div class="dv-urlrow"><input id="dvUrl" type="text" inputmode="url" maxlength="400" autocomplete="off" spellcheck="false" placeholder="https://yourgame.example.com/" aria-describedby="h-dvUrl e-dvUrl"><button type="button" class="btn-s" id="dvPrevBtn">Preview</button></div>',
            'The address that opens the game by itself (not a page about it). It must be https and work inside a frame. Use Preview to check.', true) +
          '<div class="dv-prev" id="dvPrev" hidden><div class="dv-prev-h"><b>Preview</b><span id="dvPrevNote">If the game never shows up here, its host is probably blocking frames, and it will not work on UBG45 either.</span><button type="button" class="btn-s mini" id="dvPrevX">Close</button></div><div class="dv-prev-f"><iframe id="dvPrevFrame" title="Preview of your game" referrerpolicy="no-referrer" allow="fullscreen; autoplay; gamepad" allowfullscreen sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"></iframe></div></div>' +
          field('dvDev', 'Your name or studio', '<input id="dvDev" type="text" maxlength="60" autocomplete="organization" aria-describedby="e-dvDev">', 'This is how we credit you on the game’s page.', true) +
          field('dvEmail', 'Contact email', '<input id="dvEmail" type="text" inputmode="email" maxlength="120" autocomplete="email" spellcheck="false" aria-describedby="h-dvEmail e-dvEmail">', 'Only used to reply about this game. It is never shown on the site.', true) +
          field('dvCat', 'Category', '<select id="dvCat">' + catOpts + '</select>', '', false) +
          field('dvDesc', 'Short description', '<textarea id="dvDesc" rows="4" maxlength="400" aria-describedby="h-dvDesc e-dvDesc"></textarea><span class="dv-count" id="dvCount">0 / 400</span>', 'What is the game, and what makes it fun? 20 to 400 characters.', true) +
          field('dvCtl', 'How to play', '<input id="dvCtl" type="text" maxlength="200" autocomplete="off" placeholder="Arrow keys to move, space to jump" aria-describedby="e-dvCtl">', '', false) +
          '<fieldset class="dv-f dv-plat"><legend>Works on <span class="dv-opt">(optional)</span></legend>' +
            '<label class="set-check"><input type="checkbox" name="dvPlat" value="computer"> Computers</label>' +
            '<label class="set-check"><input type="checkbox" name="dvPlat" value="tablet"> Tablets</label>' +
            '<label class="set-check"><input type="checkbox" name="dvPlat" value="phone"> Phones</label></fieldset>' +
          field('dvThumb', 'Picture of the game', '<input id="dvThumb" type="text" inputmode="url" maxlength="400" autocomplete="off" spellcheck="false" placeholder="https://yourgame.example.com/cover.png" aria-describedby="h-dvThumb e-dvThumb">', 'A link to an image (PNG, JPG or WebP). Landscape, around 720 × 468, works best.', false) +
          field('dvSite', 'Your website or social page', '<input id="dvSite" type="text" inputmode="url" maxlength="300" autocomplete="off" spellcheck="false" placeholder="https://" aria-describedby="e-dvSite">', '', false) +
          '<div class="dv-hp" aria-hidden="true"><label>Leave this empty<input id="dvHp" type="text" tabindex="-1" autocomplete="off"></label></div>' +
          '<div class="dv-f" id="f-dvAgree"><label class="set-check dv-agree"><input id="dvOwn" type="checkbox"> <span>I made this game, or I have permission from whoever did to share it here. <span class="dv-req" aria-hidden="true">*</span></span></label>' +
          '<label class="set-check dv-agree"><input id="dvRules" type="checkbox"> <span>It follows the requirements on this page. <span class="dv-req" aria-hidden="true">*</span></span></label>' +
          '<small class="dv-e" id="e-dvAgree" role="alert" hidden></small></div>' +
          '<p class="dv-priv">We keep what you type here, including your email, only to review your game and reply to you. It is never shown on the site.</p>' +
          '<div class="dv-send"><button class="btn-s dv-go" id="dvGo" type="submit"><span class="dv-spin" aria-hidden="true"></span><span class="dv-golbl">Send my game</span></button><span class="dv-status" id="dvStatus" role="status" aria-live="polite"></span></div>' +
        '</div>' +
      '</form>';

    view.innerHTML =
      '<div class="view-head"><h1 id="devTitle">Developers</h1><span class="meta">Send us your browser game</span></div>' +
      '<section class="dv-hero"><div class="dv-hero-t"><h2>Made a game? Let people play it on UBG45.</h2>' +
        '<p>UBG45 is a free collection of games that run right in the browser. If you build HTML5 games, you can send yours in. We open it from your own link, so you keep full control and can update it any time, and we credit you on its page.</p></div>' +
        '<ol class="dv-steps">' + STEPS.map(function (s, i) { return '<li><span class="dv-n">' + (i + 1) + '</span><div><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div></li>'; }).join('') + '</ol></section>' +
      '<div class="dv-grid">' + form +
        '<div class="dv-side">' +
          '<section class="set-card" aria-labelledby="dvReqT"><h2 id="dvReqT">What your game needs</h2><p class="desc">These match what the big game sites ask developers for, plus what a school-friendly site needs.</p>' +
            '<ul class="dv-reqs">' + REQS.map(function (r) { return '<li><span class="dv-ck">' + CHECK + '</span><div><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div></li>'; }).join('') + '</ul></section>' +
          '<section class="set-card" aria-labelledby="dvFaqT"><h2 id="dvFaqT">Questions</h2>' +
            FAQ.map(function (q) { return '<details class="dv-q"><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>'; }).join('') + '</section>' +
        '</div>' +
      '</div>';

    var $ = function (id) { return document.getElementById(id); };
    var formEl = $('devForm'), go = $('dvGo'), status = $('dvStatus'), busy = false;
    var ids = ['dvTitle', 'dvUrl', 'dvDev', 'dvEmail', 'dvDesc', 'dvCtl', 'dvThumb', 'dvSite'];

    if (!on) {
      $('dvBody').querySelectorAll('input,select,textarea,button').forEach(function (n) { n.disabled = true; });
      status.textContent = 'Sending games is switched off on this copy of the site.';
      status.className = 'dv-status bad';
    }

    function setErr(id, msg) {
      var e = $('e-' + id), f = $(id) || $('f-' + id);
      if (!e) return;
      e.textContent = msg || ''; e.hidden = !msg;
      var box = $('f-' + id); if (box) box.classList.toggle('bad', !!msg);
      if (f && f.setAttribute) { if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid'); }
    }
    function val(id) { return ($(id).value || '').replace(/\s+/g, ' ').trim(); }
    function check() {
      var errs = {}, t = val('dvTitle'), u = val('dvUrl'), d = val('dvDev'), m = val('dvEmail').toLowerCase(), ds = ($('dvDesc').value || '').trim(), th = val('dvThumb'), st = val('dvSite');
      if (t.length < 2) errs.dvTitle = 'Give your game a title (2 to 60 characters).';
      if (!httpsUrl(u)) errs.dvUrl = u ? 'This needs to be a full https:// address, like https://yourgame.example.com/' : 'Add the link to your game.';
      if (d.length < 2) errs.dvDev = 'Add your name or studio (2 to 60 characters).';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m) || m.length > 120) errs.dvEmail = m ? 'That does not look like an email address.' : 'Add an email address so we can reply.';
      if (ds.length < 20) errs.dvDesc = 'Tell us a little more (at least 20 characters). You have ' + ds.length + '.';
      if (th && !httpsUrl(th)) errs.dvThumb = 'The picture needs to be a full https:// link, or leave it empty.';
      if (st && !httpsUrl(st, 300)) errs.dvSite = 'The website needs to be a full https:// link, or leave it empty.';
      if (!$('dvOwn').checked || !$('dvRules').checked) errs.dvAgree = 'Please tick both boxes to confirm.';
      return errs;
    }
    function showErrs(errs) { ids.concat(['dvAgree']).forEach(function (id) { setErr(id, errs[id]); }); }
    // errors disappear as soon as the field is fixed
    ids.forEach(function (id) { $(id).addEventListener('input', function () { if (!$('e-' + id).hidden) { var e = check(); setErr(id, e[id]); } }); });
    [$('dvOwn'), $('dvRules')].forEach(function (c) { c.addEventListener('change', function () { if (!$('e-dvAgree').hidden) setErr('dvAgree', check().dvAgree); }); });
    var cnt = $('dvCount'), ta = $('dvDesc');
    ta.addEventListener('input', function () { cnt.textContent = ta.value.length + ' / 400'; cnt.classList.toggle('ok', ta.value.trim().length >= 20); });

    // preview of the link inside a frame
    var prev = $('dvPrev'), pf = $('dvPrevFrame');
    $('dvPrevBtn').addEventListener('click', function () {
      var u = val('dvUrl');
      if (!httpsUrl(u)) { setErr('dvUrl', u ? 'This needs to be a full https:// address, like https://yourgame.example.com/' : 'Add the link to your game first.'); $('dvUrl').focus(); return; }
      setErr('dvUrl', ''); prev.hidden = false; pf.src = u;
      try { prev.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* ignore */ }
    });
    $('dvPrevX').addEventListener('click', function () { prev.hidden = true; pf.src = 'about:blank'; });

    function say(m, bad) { status.textContent = m || ''; status.className = 'dv-status' + (m ? (bad ? ' bad' : ' good') : ''); }
    function working(v) { busy = v; go.disabled = v; formEl.classList.toggle('sending', v); $('dvBody').querySelector('.dv-golbl').textContent = v ? 'Sending…' : 'Send my game'; }

    function done(ref, title) {
      var email = val('dvEmail').toLowerCase(), dev = val('dvDev');
      var box = el('div', 'dv-done');
      box.setAttribute('tabindex', '-1');
      box.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path class="tick" d="M7.5 12.5l3.2 3.2 5.8-6.4"/></svg>' +
        '<h2></h2><p class="a"></p><p class="b"></p><div class="dv-ref"><span>Reference</span><b></b></div>' +
        '<p class="c">Please keep your game online at the same link while we look at it.</p><button type="button" class="btn-s" id="dvAnother">Send another game</button>';
      box.querySelector('h2').textContent = 'Thanks, ' + dev + '! Your game is in.';
      box.querySelector('.a').textContent = '“' + title + '” was sent to us for a play-test.';
      box.querySelector('.b').textContent = 'If we have a question, we will write to ' + email + '.';
      box.querySelector('.dv-ref b').textContent = ref;
      formEl.hidden = true; formEl.parentNode.insertBefore(box, formEl);
      try { box.focus({ preventScroll: true }); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* ignore */ }
      box.querySelector('#dvAnother').addEventListener('click', function () {
        box.remove(); formEl.hidden = false; formEl.reset(); cnt.textContent = '0 / 400'; prev.hidden = true; pf.src = 'about:blank'; say('');
        showErrs({}); $('dvTitle').focus();
      });
    }
    function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

    formEl.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy || !on) return;
      var errs = check(); showErrs(errs);
      var first = ids.concat(['dvAgree']).filter(function (id) { return errs[id]; })[0];
      if (first) { say('Please fix the highlighted fields.', true); var f = $(first) || $('dvOwn'); try { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* ignore */ } return; }
      if (recent().length >= 3) { say('You have sent a few games in the last hour. Please try again a little later.', true); return; }
      var plats = []; formEl.querySelectorAll('input[name="dvPlat"]:checked').forEach(function (c) { plats.push(c.value); });
      var title = val('dvTitle');
      var body = { p_title: title, p_url: val('dvUrl'), p_dev: val('dvDev'), p_email: val('dvEmail').toLowerCase(), p_category: val('dvCat') || null, p_desc: ($('dvDesc').value || '').trim().replace(/[ \t]+/g, ' '),
        p_controls: val('dvCtl') || null, p_platforms: plats, p_thumb: val('dvThumb') || null, p_site: val('dvSite') || null, p_hp: val('dvHp') };
      working(true); say('');
      var ctl = typeof AbortController === 'function' ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
      fetch(cfg.u + '/rest/v1/rpc/ubg45_submit_game', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.k }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (res) {
          clearTimeout(to); working(false);
          res = String(res || '');
          if (res.indexOf('ok:') === 0) { var l = recent(); l.push(Date.now()); wr(l); done(res.slice(3), title); toast('Game sent. Thank you!'); return; }
          if (res === 'dup') { say('We already have a game with this link. There is no need to send it again.', true); setErr('dvUrl', 'This link has already been sent to us.'); return; }
          if (res === 'full') { say('We are getting a lot of games right now. Please try again later.', true); return; }
          if (res.indexOf('invalid:') === 0) {
            var map = { title: 'dvTitle', url: 'dvUrl', dev: 'dvDev', email: 'dvEmail', desc: 'dvDesc', controls: 'dvCtl', thumb: 'dvThumb', site: 'dvSite' }, id = map[res.slice(8)];
            if (id) { setErr(id, 'This one was not accepted. Please check it.'); try { $(id).focus(); } catch (e) { /* ignore */ } }
            say('Some of your answers were not accepted.', true); return;
          }
          say('Something went wrong. Please try again.', true);
        })
        .catch(function () { clearTimeout(to); working(false); say('Could not send. Check your connection and try again.', true); });
    });
  }

  U.devPage = { build: build };
})(window);
