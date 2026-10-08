/* Link to the other sections.
   - Every call / meeting task created or changed here is reported as a shared item, so it shows up in Calls (scheduled calls),
     Meetings (upcoming), the Dashboard, the bell and the activity log.
   - Calls scheduled in the dialer, meetings scheduled in Meetings and things scheduled from the Directory arrive here as tasks.
   - Company rules (opening hours, holidays) are checked when a task is created. */
(function (g) {
  'use strict';
  var LINKS = 'ucaas.tasks.links.v2', PUB = 'ucaas.tasks.published.v2';
  var links = read(LINKS, {});       // itemId -> { taskId, origin }      tasks created from another section
  var pub = read(PUB, null);         // taskId -> signature of what was last reported   (null = first run)

  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  var linkOfTask = function (taskId) { for (var k in links) if (links[k].taskId === taskId) return { id: k, origin: links[k].origin }; return null; };

  function statusOf(t) { return t.status === 'COMPLETED' ? 'done' : (t.status === 'CANCELLED' || t.status === 'FAILED' || t.status === 'MISSED') ? 'cancelled' : 'scheduled'; }
  function itemOf(t) {
    var l = linkOfTask(t.id);
    return { id: l ? l.id : 'tasks:' + (g.UCAAS_user || 'admin') + ':' + t.id, kind: t.type === 'CALL' ? 'call' : 'meeting', origin: l ? l.origin : 'tasks', title: t.title, contact: t.contact || t.customer, phone: t.phone,
      at: t.scheduledAt, duration: t.plannedDuration, priority: t.priority, status: statusOf(t), owner: t.assignedAgent ? agentName(t.assignedAgent) : '' };
  }
  var sig = function (it) { return [it.title, it.at, it.status].join('|'); };

  /* ---- tasks -> shared items ---- */
  /* first run: everything that already exists is the starting point and is never reported */
  if (pub === null) { pub = {}; AppState.tasks.forEach(function (t) { pub[t.id] = sig(itemOf(t)); }); write(PUB, pub); }

  function publish() {
    if (!g.UCAAS_emit) return;
    AppState.tasks.forEach(function (t) {
      var it = itemOf(t), s = sig(it);
      if (pub[t.id] === s) return;
      var isNew = !(t.id in pub);
      pub[t.id] = s;
      g.UCAAS_emit('item', { item: it });
      if (isNew && !linkOfTask(t.id) && g.UCAAS_whenWarning) { var w = g.UCAAS_whenWarning(t.scheduledAt); if (w) toast(w + ' Check Settings > Phone rules.', 'info'); }
    });
    write(PUB, pub);
  }
  /* the app already saves after every change: report right after it */
  var baseSave = g.save;
  g.save = function () { baseSave.apply(this, arguments); setTimeout(publish, 200); };

  /* ---- shared items -> tasks ---- */
  function customerFor(it) {
    var phone = (it.phone || '').replace(/\D/g, ''), name = (it.contact || '').trim().toLowerCase();
    var c = AppState.customers.filter(function (x) { return (phone && x.phone.replace(/\D/g, '') === phone) || (name && x.name.toLowerCase() === name); })[0];
    if (c) return c;
    c = { id: 'cx' + Date.now().toString(36) + Math.floor(Math.random() * 99), name: it.contact || it.phone || 'Unknown contact', company: 'New contact', tier: 'SMB', phone: it.phone || '+1 (000) 000-0000', email: '', since: new Date().getFullYear(), history: [] };
    AppState.customers.push(c); return c;
  }
  var ORIGIN = { dialer: 'Calls', meetings: 'Meetings', directory: 'Directory' };


  /* ---- Company Rules on the calendars: holidays are named and marked, days the company is closed are shaded ---- */
  /* ---- Breaks on the Day / Week timeline: the breaks taken in Calls (Company Rules > Break reasons) are drawn where they happened ---- */
  var BREAKS_KEY = 'teloz.breaks.v1', PEOPLE = { admin: 'Vivek Gupta', location_admin: 'Rahul Chaurasiya', manager: 'Samarth More', agent: 'Amit Sharma' };
  function breaksOf(role) {
    var me = g.UCAAS_user || 'admin', raw = role === me ? localStorage.getItem(BREAKS_KEY) : (g.UCAAS_readUser ? g.UCAAS_readUser(role, BREAKS_KEY) : null);
    try { return (JSON.parse(raw) || []).map(function (b) { return Object.assign({ who: role === me ? '' : PEOPLE[role] }, b); }); } catch (e) { return []; }
  }
  function allBreaks() {
    var out = []; (g.UCAAS_visibleUsers ? g.UCAAS_visibleUsers() : [g.UCAAS_user || 'admin']).forEach(function (r) { out = out.concat(breaksOf(r)); });
    return out;
  }
  function clock(ts) { var d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function drawBreaks() {
    var cols = document.querySelectorAll('.dcol[data-act="slot"]'); if (!cols.length) return;
    var list = allBreaks();
    Array.prototype.forEach.call(cols, function (col) {
      Array.prototype.forEach.call(col.querySelectorAll('.cbreak'), function (n) { n.remove(); });
      var day = +col.getAttribute('data-v'), from = day + CAL_START * HOUR, to = day + CAL_END * HOUR;
      list.forEach(function (b) {
        var s0 = b.start, e0 = b.end || Date.now();
        if (e0 <= from || s0 >= to) return;
        var top = (Math.max(s0, from) - from) / MIN * CAL_H / 60, ht = Math.max(20, (Math.min(e0, to) - Math.max(s0, from)) / MIN * CAL_H / 60 - 2);
        var label = (b.who ? b.who + ' · ' : '') + b.name + ' ' + clock(b.start) + '–' + (b.end ? clock(b.end) : 'now');
        col.insertAdjacentHTML('beforeend', '<div class="cbreak' + (b.end ? '' : ' live') + '" style="top:' + top + 'px;height:' + ht + 'px" title="' + label.replace(/"/g, '') + '"><b>' + label.replace(/</g, '') + '</b></div>');
      });
    });
  }
  setInterval(function () { if (document.querySelector('.cbreak.live')) drawBreaks(); }, 30000);   // an ongoing break keeps growing

  function decorate() {
    drawBreaks();
    if (!g.UCAAS_day) return;
    var cells = document.querySelectorAll('[data-act="pick"],[data-act="mcell"],[data-act="dayfrom"],.dcol[data-act="slot"]');
    Array.prototype.forEach.call(cells, function (el) {
      var info = g.UCAAS_day(+el.getAttribute('data-v')); if (!info) return;
      el.classList.toggle('co-closed', info.closed); el.classList.toggle('co-hol', !!info.holiday);
      if (info.reason) el.title = info.reason; else el.removeAttribute('title');
      if (info.holiday && el.classList.contains('mcell') && !el.querySelector('.holn')) el.insertAdjacentHTML('beforeend', '<span class="holn">' + String(info.holiday).replace(/[<&]/g, '') + '</span>');
      if (info.holiday && el.hasAttribute('data-act') && el.getAttribute('data-act') === 'dayfrom' && !el.querySelector('.holn')) el.insertAdjacentHTML('beforeend', '<span class="holn">' + String(info.holiday).replace(/[<&]/g, '') + '</span>');
    });
  }
  var baseRender = g.render;
  g.render = function () { baseRender.apply(this, arguments); decorate(); };
  g.UCAAS_onSettings = function () { render(); };
  decorate();

  g.UCAAS_onItems = function (items) {
    var changed = false;
    items.forEach(function (it) {
      if (it.origin === 'tasks' && (it.ownerId || 'admin') === (g.UCAAS_user || 'admin')) return;   // my own tasks are already here
      var l = links[it.id];
      if (!l) {
        if (it.status !== 'scheduled' || !it.at) return;
        try {
          var c = customerFor(it);
          var r = createTask({ type: it.kind === 'call' ? 'CALL' : 'MEETING', title: it.title, customerId: c.id, contact: it.contact, phone: it.phone || c.phone, scheduledAt: it.at,
            plannedDuration: it.duration || undefined, priority: 'NORMAL', notes: 'Scheduled from ' + (ORIGIN[it.origin] || it.origin) + (it.ownerName ? ' by ' + it.ownerName : '') + '.', description: 'Scheduled from ' + (ORIGIN[it.origin] || it.origin) + (it.ownerName ? ' by ' + it.ownerName : '') + '.' });
          links[it.id] = { taskId: r.task.id, origin: it.origin }; write(LINKS, links);
          pub = pub || {}; pub[r.task.id] = sig(itemOf(r.task)); write(PUB, pub);
          changed = true;
        } catch (e) { if (!(e instanceof UserError)) console.error(e); }
        return;
      }
      var t = task(l.taskId); if (!t) return;
      try {
        if (it.status === 'done' && !isTerminal(t)) { t.status = 'COMPLETED'; t.outcome = t.outcome || 'Completed'; t.sub = null; changed = true; }
        else if (it.status === 'cancelled' && !isTerminal(t)) { cancelTask(t.id, 'Cancelled in ' + (ORIGIN[it.origin] || it.origin)); changed = true; }
        else if (it.status === 'scheduled' && !isTerminal(t) && it.at && it.at !== t.scheduledAt) { t.scheduledAt = it.at; t.title = it.title; changed = true; }
      } catch (e) { if (!(e instanceof UserError)) console.error(e); }
    });
    if (changed) { baseSave(); render(); }
  };
})(window);
