/* Behaviour of the LOCKED shell (top bar + sidebar). Markup and styles are untouched; this only wires them up.
   Links to other Admin Hub screens are outside this prototype, so they go through the unsaved-changes guard and then toast. */
(function (g) {
  'use strict';
  var CRX = g.CRX, U = CRX.util;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  CRX.initShell = function () {
    var side = $('#sidebar'), scrim = $('#scrim'), menuBtn = $('#menuBtn');

    /* ---- sidebar: independent expand/collapse per group, like the original ---- */
    side.addEventListener('click', function (e) {
      var tog = e.target.closest('[data-toggle]');
      if (tog) {
        var open = tog.classList.toggle('open');
        tog.setAttribute('aria-expanded', String(open));
        var sub = tog.parentNode.querySelector('.side-sub');
        if (sub) sub.hidden = !open;
        return;
      }
      var link = e.target.closest('[data-link]');
      if (link) { CRX.app.go(link.getAttribute('data-link')); closeMobile(); return; }
      var stub = e.target.closest('[data-stub]');
      if (stub) leaveTo(stub.getAttribute('data-stub'));
    });
    $('#allScreens').addEventListener('click', function () { leaveTo('All settings screens'); });

    $('#sideSearch').addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase();
      $$('.side-group', side).forEach(function (grp) {
        var headHit = grp.getAttribute('data-group').toLowerCase().indexOf(q) >= 0, any = false;
        var head = $('.side-head', grp), sub = $('.side-sub', grp);
        $$('.side-sub button', grp).forEach(function (b) {
          var hit = !q || headHit || b.textContent.toLowerCase().indexOf(q) >= 0;
          b.hidden = !hit; any = any || (q && hit);
        });
        grp.hidden = !!q && !headHit && !any;
        if (sub && q && (headHit || any)) { sub.hidden = false; head.classList.add('open'); head.setAttribute('aria-expanded', 'true'); }
      });
    });

    function leaveTo(name) {
      CRX.app.guardLeave(function () { CRX.ui.toast('“' + name + '” is another Admin Hub screen (not in this prototype).', 'info'); });
    }
    CRX.shellLeave = leaveTo;
    $$('.topbar [data-stub]').forEach(function (b) { b.addEventListener('click', function () { leaveTo(b.getAttribute('data-stub')); }); });
    $('#fab').addEventListener('click', function () { CRX.ui.toast('Session timer — shown on every Admin Hub screen.', 'info'); });

    /* ---- mobile: sidebar becomes an off-canvas drawer (minimum change needed for small screens) ---- */
    function closeMobile() { side.classList.remove('mobile-open'); scrim.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
    menuBtn.addEventListener('click', function () {
      var open = !side.classList.contains('mobile-open');
      side.classList.toggle('mobile-open', open); scrim.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
    });
    scrim.addEventListener('click', closeMobile);
    window.addEventListener('resize', function () { if (innerWidth > 1100) closeMobile(); });

    /* ---- theme, clocks, Ctrl+K ---- */
    var root = document.documentElement;
    if (store('crx-theme') === 'dark') root.setAttribute('data-theme', 'dark');
    $('#themeBtn').addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark';
      if (dark) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', 'dark');
      store('crx-theme', dark ? 'light' : 'dark');
    });
    var off = -new Date().getTimezoneOffset(), a = Math.abs(off);
    $('#tz').textContent = 'GMT' + (off < 0 ? '-' : '+') + Math.floor(a / 60) + (a % 60 ? ':' + U.pad(a % 60) : '');
    var secs = 219 * 3600 + 12 * 60 + 30;
    function tick() {
      var d = new Date();
      $('#clock').textContent = U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()) + ':' + U.pad(d.getSeconds());
      secs++; $('#duty').textContent = Math.floor(secs / 3600) + ':' + U.pad(Math.floor(secs % 3600 / 60)) + ':' + U.pad(secs % 60);
    }
    tick(); setInterval(tick, 1000);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#topSearchInput').focus(); }
    });
  };

  /** The sidebar highlights "Company Rules" for every tab: all 17 tabs belong to that one screen.
      The sidebar's separate "Desk phones" item is another Admin Hub screen and is never highlighted here. */
  CRX.syncSidebar = function () {};
})(window);
