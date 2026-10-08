/* Link to the other sections: the Dashboard shows what the rest of the app reports.
   - scheduled calls / meetings / tasks (from Tasks, Calls, Meetings, Directory) -> counts, "Upcoming" list, activity
   - Company rules (name, opening hours, holidays, recording) -> the line under the greeting */
(function (g) {
  'use strict';
  var D = g.DB_DATA, W = g.DBWidgets, esc = W.esc, $ = function (s) { return document.querySelector(s); };
  var items = [], log = [], settings = null;

  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }

  function liveKpis() {
    var open = items.filter(function (i) { return i.status === 'scheduled'; });
    var calls = open.filter(function (i) { return i.kind === 'call'; }), meets = open.filter(function (i) { return i.kind === 'meeting'; });
    var today = dayKey(Date.now());
    var base = D.kpis.filter(function (k) { return !k.live; });
    var add = [
      { id: 'sch-call', live: 1, label: 'Scheduled calls', value: calls.length, fmt: 'int', delta: 0, note: calls.filter(function (i) { return dayKey(i.at) === today; }).length + ' today' },
      { id: 'sch-meet', live: 1, label: 'Scheduled meetings', value: meets.length, fmt: 'int', delta: 0, note: meets.filter(function (i) { return dayKey(i.at) === today; }).length + ' today' }
    ];
    D.kpis = base.concat(add);
  }

  function upcoming() {
    var list = items.filter(function (i) { return i.status === 'scheduled'; }).sort(function (a, b) { return a.at - b.at; }).slice(0, 6);
    $('#upcoming').innerHTML = list.length ? list.map(function (i) {
      var d = new Date(i.at);
      return '<li class="up"><div class="ic ' + i.kind + '">' + (i.kind === 'call' ? 'C' : 'M') + '</div><div class="tx"><a class="link" href="#" data-go="interactions/tasks">' + esc(i.title) + '</a><small>' + esc(i.contact || '') + (i.ownerName && i.ownerId !== (g.UCAAS_user || 'admin') ? ' · ' + esc(i.ownerName) : i.origin ? ' · from ' + esc(i.origin) : '') + '</small></div>' +
        '<div class="up-t"><b>' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</b>' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + '</div></li>';
    }).join('') : '<li class="muted" style="padding:10px 0">Nothing scheduled yet. Create a task, schedule a call or a meeting and it shows here.</li>';
  }

  function rules() {
    var el = $('#rules'); if (!settings) { el.innerHTML = ''; return; }
    var chips = [], co = settings['caller-id-name'], pr = settings['phone-rules'], hol = settings.holidays;
    if (co && co.name) chips.push('<span class="chip">' + esc(co.name) + '</span>');
    if (g.UCAAS_when) { var w = g.UCAAS_when(Date.now()); chips.push('<span class="chip ' + (w.open ? 'ok' : 'warn') + '"><i></i>' + (w.open ? 'Open now' : 'Closed') + ' · ' + esc(w.label) + '</span>'); }
    if (pr && pr.recording) chips.push('<span class="chip ' + (pr.recording.mode === 'off' ? '' : 'ok') + '"><i></i>Recording: ' + (pr.recording.mode === 'off' ? 'off' : pr.recording.mode === 'auto' ? 'automatic' : 'on request') + '</span>');
    var rr = g.UCAAS_rules && g.UCAAS_rules();
    if (rr) {
      chips.push('<span class="chip">Ring time ' + rr.ringSeconds + ' s</span>');
      if (rr.alerts.length) chips.push('<span class="chip ok"><i></i>' + rr.alerts.length + ' alert rule' + (rr.alerts.length === 1 ? '' : 's') + ' on</span>');
      if (rr.idleMinutes) chips.push('<span class="chip">Idle sign-out ' + rr.idleMinutes + ' min</span>');
      if (rr.calling.restrict) chips.push('<span class="chip warn"><i></i>Calls limited to ' + rr.calling.allowed.length + ' countries</span>');
    }
    if (hol && hol.items) {
      var today = new Date().toISOString().slice(0, 10);
      var next = hol.items.filter(function (x) { return x.from >= today; }).sort(function (a, b) { return a.from < b.from ? -1 : 1; })[0];
      if (next) chips.push('<span class="chip">Next holiday: ' + esc(next.name) + ' · ' + new Date(next.from + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + '</span>');
    }
    el.innerHTML = chips.join('');
  }

  g.UCAAS_onItems = function (list, entries) {
    items = list || []; log = entries || [];
    liveKpis(); W.kpis($('#kpis')); upcoming(); W.feed($('#feed'), log);
  };
  /* Company Rules > Alerts: the enabled "wait time" and "service level" rules set when a queue is flagged here */
  function limits() {
    var r = g.UCAAS_rules && g.UCAAS_rules(), lim = { wait: 120, sl: 80 };
    if (r) {
      var w = r.alerts.filter(function (a) { return a.trigger === 'wait'; }).map(function (a) { return Number(a.threshold); }), l = r.alerts.filter(function (a) { return a.trigger === 'sl'; }).map(function (a) { return Number(a.threshold); });
      if (w.length) lim.wait = Math.min.apply(null, w); if (l.length) lim.sl = Math.max.apply(null, l);
    }
    g.DBLimits = lim;
  }
  g.UCAAS_onSettings = function (s) { settings = s; limits(); rules(); W.queues($('#queues tbody')); };

  /* keep "Open now" honest while the page stays open */
  setInterval(rules, 60000);
})(window);
