/* One user hierarchy for the whole app. The signed-in role is chosen from the profile picture in the top bar,
   saved in this browser, shown/hidden per section here, and pushed into whichever section is open
   (each section maps it onto its own roles in its js/role.js). */
(function (g) {
  'use strict';
  var U = g.UCAAS, KEY = 'ucaas-role';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var ALL = ['dashboard', 'directory', 'interactions', 'analytics', 'settings'];
  var LIST = [
    { id: 'admin', label: 'Admin', desc: 'Sees everyone\'s data', person: 'Vivek Gupta', initials: 'VG', level: 4, sections: ALL },
    { id: 'location_admin', label: 'Location Admin', desc: 'Sees the location\'s data (managers and agents)', person: 'Rahul Chaurasiya', initials: 'RC', level: 3, sections: ['dashboard', 'directory', 'interactions', 'analytics'] },
    { id: 'manager', label: 'Manager / Supervisor', desc: 'Sees own and their agents\' data', person: 'Samarth More', initials: 'SM', level: 2, sections: ['dashboard', 'directory', 'interactions', 'analytics'] },
    { id: 'agent', label: 'Agent', desc: 'Sees only own data', person: 'Amit Sharma', initials: 'AS', level: 1, sections: ['dashboard', 'directory', 'interactions', 'analytics'] }
  ];
  var current = 'admin';

  function byId(id) { return LIST.filter(function (r) { return r.id === id; })[0]; }
  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable */ } }

  U.roles = {
    list: LIST,
    current: function () { return current; },
    label: function () { return byId(current).label; },
    person: function (id) { var r = byId(id || current); return r ? r.person : ''; },
    /** the data hierarchy: everybody sees their own data and the data of the roles below them (agents see only their own) */
    canSee: function (ownerId) { var o = byId(ownerId || 'admin'); return !!o && (o.id === current || o.level < byId(current).level); },
    allowed: function (sectionId) { return byId(current).sections.indexOf(sectionId) >= 0; },

    /** company notices (a rule changed): every user gets each one once, in their bell, the next time they are here */
    deliverNotices: function () {
      var seenAll = {}; try { seenAll = JSON.parse(localStorage.getItem('ucaas-notices-seen') || '{}'); } catch (e) { /* ignore */ }
      var since = seenAll[current] || 0, fresh = U.bus.state.notices.filter(function (n) { return n.ts > since; }).reverse();
      fresh.forEach(function (n) { U.notify.add({ title: n.title, body: n.body, target: n.role.indexOf(current) >= 0 ? n.target : 'dashboard' }); });
      seenAll[current] = Date.now(); try { localStorage.setItem('ucaas-notices-seen', JSON.stringify(seenAll)); } catch (e) { /* ignore */ }
    },

    set: function (id, quiet) {
      if (!byId(id)) return;
      current = id; write(id);
      U.roles.applyNav();
      paint();
      if (!U.roles.allowed(U.router.section())) U.router.go(U.defaultSection);
      U.router.reload();
      U.roles.deliverNotices();
      if (!quiet) U.toast('Now viewing as ' + byId(id).label);
    },

    applyNav: function () {
      Array.prototype.forEach.call(document.querySelectorAll('.nav a'), function (a) { a.hidden = !U.roles.allowed(a.getAttribute('data-section')); });
      var b = document.getElementById('avatarBtn'); b.textContent = byId(current).initials; b.title = byId(current).person + ' (' + byId(current).label + ')';
    },

    init: function () {
      var saved = read(); if (saved && byId(saved)) current = saved;
      var btn = document.getElementById('avatarBtn'), panel = document.getElementById('profilePanel');
      U.roles.applyNav(); paint(); U.roles.deliverNotices();

      function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
      btn.addEventListener('click', function (e) { e.stopPropagation(); panel.hidden = !panel.hidden; btn.setAttribute('aria-expanded', String(!panel.hidden)); });
      panel.addEventListener('click', function (e) {
        var o = e.target.closest('[data-role]'); if (!o) return;
        close(); if (o.getAttribute('data-role') !== current) U.roles.set(o.getAttribute('data-role'));
      });
      document.addEventListener('click', function (e) { if (!e.target.closest('#profileWrap')) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
  };

  function paint() {
    document.getElementById('profilePanel').innerHTML =
      '<h6>' + esc(byId(current).person) + ' <span style="font-weight:500;color:var(--muted)">' + esc(byId(current).label) + '</span></h6>' +
      '<div class="hd">Switch role (user hierarchy)</div>' +
      LIST.map(function (r) {
        return '<button type="button" class="note role-opt" role="menuitemradio" aria-checked="' + (r.id === current) + '" data-role="' + r.id + '">' +
          '<i class="dot' + (r.id === current ? '' : ' off') + '"></i><div><b>' + esc(r.label) + '</b><span>' + esc(r.desc) + '</span></div>' +
          (r.id === current ? '<svg class="tick" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>' : '') + '</button>';
      }).join('');
  }
})(window);
