/* Top-bar search (Ctrl K): finds any section or page in the registry and jumps to it. */
(function (g) {
  'use strict';
  var U = g.UCAAS, esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function index() {
    var out = [];
    U.sections.forEach(function (s) {
      if (!U.roles.allowed(s.id)) return;
      out.push({ label: s.label, section: s.label, path: s.id });
      s.pages.forEach(function (p) { if (p.id) out.push({ label: p.title, section: s.label, path: s.id + '/' + p.id }); });
    });
    return out;
  }

  U.search = {
    init: function () {
      var input = document.getElementById('topSearchInput'), panel = document.getElementById('searchPanel');
      var items = [], hits = [], sel = 0;

      function open(on) { panel.hidden = !on; input.setAttribute('aria-expanded', String(on)); }
      function paint() {
        panel.innerHTML = hits.length
          ? hits.map(function (h, i) { return '<button type="button" class="hit' + (i === sel ? ' sel' : '') + '" role="option" data-i="' + i + '">' + esc(h.label) + '<small>' + esc(h.section) + '</small></button>'; }).join('')
          : '<div class="empty">No matches</div>';
      }
      function run() {
        items = index();
        var q = input.value.trim().toLowerCase();
        if (!q) { open(false); return; }
        hits = items.filter(function (it) { return (it.label + ' ' + it.section).toLowerCase().indexOf(q) >= 0; }).slice(0, 12);
        sel = 0; paint(); open(true);
      }
      function pick(i) {
        var h = hits[i]; if (!h) return;
        input.value = ''; open(false); input.blur();
        U.router.go(h.path);
      }

      input.addEventListener('input', run);
      input.addEventListener('focus', run);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { sel = Math.min(hits.length - 1, sel + 1); paint(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); }
        else if (e.key === 'Enter') { pick(sel); }
        else if (e.key === 'Escape') { input.value = ''; open(false); input.blur(); }
      });
      panel.addEventListener('mousedown', function (e) { var b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); pick(+b.getAttribute('data-i')); } });
      document.addEventListener('click', function (e) { if (!e.target.closest('#topSearch')) open(false); });
      document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); }
      });
    }
  };
})(window);
