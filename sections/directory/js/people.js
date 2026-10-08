/* People view: search, filter, sort, pagination and the detail drawer. */
(function (g) {
  'use strict';
  var D = g.DIR_DATA, PAGE = 10;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var st = { q: '', team: '', status: '', sort: 'name', dir: 1, page: 1 };

  function initials(n) { return n.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase(); }
  function avatar(p) { return '<span class="av" style="background:' + p.color + '">' + esc(initials(p.name)) + '</span>'; }
  function status(s) { return '<span class="st"><i style="background:' + D.statusColor[s] + '"></i>' + esc(s) + '</span>'; }
  function go(target) { if (g.UCAAS_goto) g.UCAAS_goto(target); else g.location.href = '../../index.html#/' + target; }

  function filtered() {
    var q = st.q.toLowerCase();
    var rows = D.people.filter(function (p) {
      return (!st.team || p.team === st.team) && (!st.status || p.status === st.status) &&
        (!q || (p.name + ' ' + p.ext + ' ' + p.email + ' ' + p.role).toLowerCase().indexOf(q) >= 0);
    });
    rows.sort(function (a, b) { return String(a[st.sort]).localeCompare(String(b[st.sort]), undefined, { numeric: true }) * st.dir; });
    return rows;
  }

  function render() {
    var rows = filtered(), pages = Math.max(1, Math.ceil(rows.length / PAGE));
    st.page = Math.min(st.page, pages);
    var slice = rows.slice((st.page - 1) * PAGE, st.page * PAGE);

    $('#peopleTable tbody').innerHTML = slice.map(function (p) {
      return '<tr data-id="' + p.id + '"><td><div class="who">' + avatar(p) + '<div><b>' + esc(p.name) + '</b><small>' + esc(p.email) + '</small></div></div></td>' +
        '<td>' + esc(p.ext) + '</td><td>' + esc(p.role) + '</td><td>' + esc(p.team) + '</td><td>' + status(p.status) + '</td>' +
        '<td class="r"><span class="row-actions"><button type="button" class="ib" data-act="call" title="Call ' + esc(p.name) + '">Call</button><button type="button" class="ib" data-act="meet" title="Meet ' + esc(p.name) + '">Meet</button></span></td></tr>';
    }).join('');
    $('#empty').hidden = rows.length > 0;
    $('#count').textContent = rows.length + ' of ' + D.people.length + ' people';

    Array.prototype.forEach.call(document.querySelectorAll('#peopleTable th[data-sort]'), function (th) {
      th.classList.toggle('asc', th.dataset.sort === st.sort && st.dir === 1);
      th.classList.toggle('desc', th.dataset.sort === st.sort && st.dir === -1);
    });

    var pg = '<span>Page ' + st.page + ' of ' + pages + '</span><div><button type="button" data-p="' + (st.page - 1) + '"' + (st.page === 1 ? ' disabled' : '') + '>‹</button>';
    for (var i = 1; i <= pages; i++) pg += '<button type="button" data-p="' + i + '"' + (i === st.page ? ' aria-current="true"' : '') + '>' + i + '</button>';
    $('#pager').innerHTML = pg + '<button type="button" data-p="' + (st.page + 1) + '"' + (st.page === pages ? ' disabled' : '') + '>›</button></div>';
  }

  function openDrawer(id) {
    var p = D.people.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var d = $('#drawer');
    d.innerHTML = '<button type="button" class="x" data-close aria-label="Close">×</button>' +
      '<div class="top">' + avatar(p) + '<h2>' + esc(p.name) + '</h2><span class="muted">' + esc(p.role) + '</span></div>' +
      '<dl><dt>Status</dt><dd>' + status(p.status) + '</dd><dt>Team</dt><dd>' + esc(p.team) + '</dd><dt>Extension</dt><dd>' + esc(p.ext) + '</dd>' +
      '<dt>Phone</dt><dd>' + esc(p.phone) + '</dd><dt>Email</dt><dd>' + esc(p.email) + '</dd><dt>Location</dt><dd>' + esc(p.location) + '</dd><dt>ID</dt><dd>' + esc(p.id) + '</dd></dl>' +
      (g.DirLink && g.DirLink.drawerExtra ? g.DirLink.drawerExtra(p) : '') +
      '<div class="acts"><button type="button" class="ib primary" data-act="call">Call now</button><button type="button" class="ib" data-act="schedule-call">Schedule call</button><button type="button" class="ib" data-act="meet">Schedule meeting</button></div>';
    d.dataset.id = id; d.hidden = false; $('#scrim').hidden = false;
    d.querySelector('.x').focus();
  }
  function closeDrawer() { $('#drawer').hidden = true; $('#scrim').hidden = true; }

  function act(kind, id) {
    var p = D.people.filter(function (x) { return x.id === id; })[0];
    if (g.DirLink && p) g.DirLink.act(kind, p); else go(kind === 'call' ? 'interactions/dialer' : 'interactions/video');
  }

  g.DirPeople = {
    openDrawer: openDrawer,
    init: function () {
      $('#fTeam').innerHTML = '<option value="">All teams</option>' + D.teams.map(function (t) { return '<option>' + esc(t.id) + '</option>'; }).join('');
      $('#fStatus').innerHTML = '<option value="">Any status</option>' + D.statuses.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
      $('#q').addEventListener('input', function (e) { st.q = e.target.value; st.page = 1; render(); });
      $('#fTeam').addEventListener('change', function (e) { st.team = e.target.value; st.page = 1; render(); });
      $('#fStatus').addEventListener('change', function (e) { st.status = e.target.value; st.page = 1; render(); });
      $('#peopleTable thead').addEventListener('click', function (e) {
        var th = e.target.closest('[data-sort]'); if (!th) return;
        if (st.sort === th.dataset.sort) st.dir = -st.dir; else { st.sort = th.dataset.sort; st.dir = 1; }
        render();
      });
      $('#peopleTable tbody').addEventListener('click', function (e) {
        var a = e.target.closest('[data-act]');
        if (a) { act(a.dataset.act, a.closest('tr[data-id]').dataset.id); return; }
        var tr = e.target.closest('tr[data-id]'); if (tr) openDrawer(tr.dataset.id);
      });
      $('#pager').addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (b && !b.disabled) { st.page = +b.dataset.p; render(); } });
      $('#drawer').addEventListener('click', function (e) {
        if (e.target.closest('[data-close]')) closeDrawer();
        var a = e.target.closest('[data-act]'); if (a) act(a.dataset.act, $('#drawer').dataset.id);
      });
      $('#scrim').addEventListener('click', closeDrawer);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
    },
    reopen: function () { var d = $('#drawer'); if (!d.hidden && d.dataset.id) openDrawer(d.dataset.id); },
    refreshStatuses: function () {
      var cur = $('#fStatus').value;
      $('#fStatus').innerHTML = '<option value="">Any status</option>' + D.statuses.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
      $('#fStatus').value = D.statuses.indexOf(cur) >= 0 ? cur : ''; st.status = $('#fStatus').value; render();
    },
    setTeam: function (team) {
      st.team = team || ''; st.page = 1; $('#fTeam').value = st.team;
    },
    render: render,
    total: function () { return D.people.length; }
  };
})(window);
