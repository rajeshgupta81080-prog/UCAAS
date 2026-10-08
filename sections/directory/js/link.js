/* Link to the other sections.
   - Call now        -> dials in the dialer (Interactions > Calls)
   - Schedule call / meeting -> a shared item: it becomes a task (Tasks), a scheduled call (Calls) or an upcoming meeting (Meetings),
                                shows on the Dashboard and in the bell. Opening hours and holidays from Settings are checked first.
   - Settings > Break reasons -> the status list (filter and the people's break status) */
(function (g) {
  'use strict';
  var D = g.DIR_DATA, $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var BASE_COLOR = Object.assign({}, D.statusColor);
  var original = D.people.map(function (p) { return p.status; });

  function say(text) { if (g.UCAAS_toast) g.UCAAS_toast(text); }
  function local(ts) { var d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }
  function nextSlot() { var d = new Date(); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); d.setHours(d.getHours() + 1); return d.getTime(); }

  function dialog(person, kind) {
    var dlg = $('#sched'), title = kind === 'call' ? 'Schedule a call with ' : 'Schedule a meeting with ';
    dlg.innerHTML = '<form method="dialog"><h2 id="schedTitle">' + title + esc(person.name) + '</h2>' +
      '<label>Subject<input name="title" value="' + (kind === 'call' ? 'Call with ' : 'Meeting with ') + esc(person.name) + '" required maxlength="80"></label>' +
      '<label>Date and time<input name="at" type="datetime-local" value="' + local(nextSlot()) + '" required></label>' +
      '<label>Length (minutes)<select name="dur">' + [15, 30, 45, 60].map(function (m) { return '<option' + (m === (kind === 'call' ? 15 : 30) ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
      '<div class="warn" id="schedWarn" hidden></div>' +
      '<div class="row"><button value="cancel" type="button" id="schedCancel">Cancel</button><button class="pri" value="ok">Schedule</button></div></form>';
    var f = dlg.querySelector('form'), warn = $('#schedWarn');
    function check() { var w = g.UCAAS_whenWarning && g.UCAAS_whenWarning(new Date(f.at.value).getTime()); warn.hidden = !w; warn.textContent = w ? w + ' You can still schedule it.' : ''; }
    f.at.addEventListener('input', check); check();
    $('#schedCancel').onclick = function () { dlg.close(); };
    f.onsubmit = function () {
      var at = new Date(f.at.value).getTime(); if (isNaN(at)) return;
      var item = { id: 'directory:' + Date.now().toString(36), kind: kind, origin: 'directory', title: f.title.value.trim() || title + person.name, contact: person.name, phone: person.phone,
        at: at, duration: Number(f.dur.value), priority: 'NORMAL', status: 'scheduled', owner: 'Johnny Doe', participants: [person.name] };
      if (g.UCAAS_emit) g.UCAAS_emit('item', { item: item });
      say((kind === 'call' ? 'Call' : 'Meeting') + ' scheduled with ' + person.name + '. It is now in Tasks, ' + (kind === 'call' ? 'Calls' : 'Meetings') + ' and the Dashboard.');
    };
    dlg.showModal();
  }

  /* ---- the four people who can be signed in (Admin, Location Admin, Manager, Agent) are in the directory; their duty comes from the top-bar pill ---- */
  var PERSONAS = [['admin', 'Vivek Gupta', 'Admin', 'Management'], ['location_admin', 'Rahul Chaurasiya', 'Location Admin', 'Management'], ['manager', 'Samarth More', 'Manager / Supervisor', 'Support'], ['agent', 'Amit Sharma', 'Support agent', 'Support']];
  var DUTY_KEY = 'ucaas-duty';
  function dutyMap() { try { return JSON.parse(localStorage.getItem(DUTY_KEY) || '{}') || {}; } catch (e) { return {}; } }
  PERSONAS.forEach(function (x, i) {
    D.people.unshift({ id: 'U-' + x[0], persona: x[0], name: x[1], team: x[3], role: x[2], ext: String(2000 + i), phone: '+91 22 4567 00' + (10 + i), email: x[1].toLowerCase().replace(' ', '.') + '@example.com', status: 'Available', location: 'Mumbai', color: ['#2563eb', '#0f766e', '#7c3aed', '#c2570c'][i] });
    original.unshift('Available');
  });
  function personaStatus() {
    var m = dutyMap();
    D.people.forEach(function (p) { if (p.persona) p.status = m[p.persona] && m[p.persona].on === false ? 'Offline' : 'Available'; });
  }
  function rules() { return g.UCAAS_rules ? g.UCAAS_rules() : null; }
  /** may the signed-in user change this person's duty? (Company Rules > Duty policy) */
  function canSetDuty(p) {
    var me = g.UCAAS_user || 'admin', r = rules();
    if (p.persona === me) return false;                       // your own duty is the top-bar pill
    if (me === 'admin' || me === 'location_admin') return true;
    return me === 'manager' && p.persona === 'agent' && !!(r && r.duty.supervisors);
  }

  g.DirLink = {
    drawerExtra: function (p) {
      if (!p.persona) return '';
      var on = !(dutyMap()[p.persona] && dutyMap()[p.persona].on === false), can = canSetDuty(p);
      return '<dl style="margin-top:14px"><dt>Duty</dt><dd><b>' + (on ? 'On duty' : 'Off duty') + '</b>' + (can ? ' <button type="button" class="ib" data-act="duty" style="margin-left:8px">Put ' + (on ? 'off' : 'on') + ' duty</button>' : '<span class="muted" style="margin-left:8px">' + (p.persona === (g.UCAAS_user || 'admin') ? 'change it from the top bar' : 'set by a supervisor (Company Rules)') + '</span>') + '</dd></dl>';
    },
    act: function (kind, person) {
      if (kind === 'duty') {
        if (!canSetDuty(person)) return;
        var m = dutyMap(), cur = m[person.persona] && m[person.persona].on === false;
        m[person.persona] = { on: !!cur, since: Date.now() };
        try { localStorage.setItem(DUTY_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ }
        personaStatus(); g.DirPeople.refreshStatuses(); g.DirPeople.reopen();
        say(person.name + ' is now ' + (cur ? 'on' : 'off') + ' duty.');
        return;
      }
      if (kind === 'call') { if (g.UCAAS_emit) g.UCAAS_emit('dial', { number: person.phone, name: person.name }); else g.location.href = '../../index.html#/interactions/dialer'; }
      else if (kind === 'schedule-call') dialog(person, 'call');
      else dialog(person, 'meeting');
    }
  };

  /* Settings > Break reasons: the activity codes become the people's break statuses */
  personaStatus(); g.DirPeople.refreshStatuses();
  setInterval(function () { personaStatus(); if (g.DirPeople) g.DirPeople.refreshStatuses(); }, 4000);   // a duty change made in the top bar shows here
  g.UCAAS_onSettings = function (s) {
    var codes = s && s['break-reasons'] && s['break-reasons'].codes;
    if (!codes || !codes.length) return;
    var names = codes.map(function (c) { return c.name; });
    D.statuses = ['Available', 'On call'].concat(names, ['Offline']);
    D.statusColor = Object.assign({}, BASE_COLOR); names.forEach(function (n) { D.statusColor[n] = '#f59e0b'; });
    D.people.forEach(function (p, i) { p.status = original[i] === 'Break' ? names[i % names.length] : original[i]; });
    personaStatus(); g.DirPeople.refreshStatuses();
  };
})(window);
