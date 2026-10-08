/* Loaded first in <head> by every page that can run inside the UCAAS shell (and by nested pages inside Interactions).
   It marks the page as embedded (so css/embed.css hides the page's own top bar), keeps the theme and the user role in step with the shell (a page defines window.UCAAS_onRole(role)),
   reports the page's hash upward and lets the page ask the shell to navigate: UCAAS_goto('interactions/video').
   Opened on its own (not inside a frame) it does nothing, so every page still works standalone. */
(function (g) {
  'use strict';
  if (g.self === g.top) return;


  /* ---- one user's data per browser key ----
     Everything a section saves in localStorage is stored under the signed-in user (u.<role>.<key>), so each user keeps and sees only
     their own tasks, calls, meetings and settings. The shell's own keys (ucaas-*) and the company-wide Company Rules are shared. */
  var USER = 'admin';
  try { USER = localStorage.getItem('ucaas-role') || 'admin'; } catch (e) { /* storage unavailable */ }
  g.UCAAS_user = USER;
  var LEVEL = { admin: 4, location_admin: 3, manager: 2, agent: 1 };
  /** may the signed-in user see data that belongs to this role? (own data and everything below them) */
  g.UCAAS_canSee = function (owner) { owner = owner || 'admin'; return owner === USER || (LEVEL[owner] || 0) < (LEVEL[USER] || 0); };
  /** the roles whose data the signed-in user may read, themselves first */
  g.UCAAS_visibleUsers = function () { return Object.keys(LEVEL).filter(g.UCAAS_canSee).sort(function (a, b) { return (a === USER ? 9 : LEVEL[a]) < (b === USER ? 9 : LEVEL[b]) ? 1 : -1; }); };
  try {
    var SHARED = /^(ucaas-|crx\.company-rules)/, SP = Storage.prototype;
    var rawGet = SP.getItem, rawSet = SP.setItem, rawRemove = SP.removeItem;
    var scoped = function (store, k) { k = String(k); return store === g.localStorage && !SHARED.test(k) ? 'u.' + USER + '.' + k : k; };
    SP.getItem = function (k) { return rawGet.call(this, scoped(this, k)); };
    SP.setItem = function (k, v) { return rawSet.call(this, scoped(this, k), v); };
    SP.removeItem = function (k) { return rawRemove.call(this, scoped(this, k)); };
    /** read what another user saved under a key (only the roles UCAAS_canSee allows) */
    g.UCAAS_readUser = function (role, key) { return g.UCAAS_canSee(role) ? rawGet.call(g.localStorage, 'u.' + role + '.' + key) : null; };
  } catch (e) { /* old browser: sections then share one store */ }

  var root = document.documentElement, theme = null, role = null;
  var sticky = {};                             // last items / settings / log / dial message: replayed to pages that load later
  var STICKY = { items: 'Items', settings: 'Settings', dial: 'Dial', duty: 'Duty' };
  var lastDial = 0;
  root.classList.add('embedded');
  var isSection = g.parent === g.top;          // directly under the shell (not a page nested inside a section)

  function up(msg) { try { g.parent.postMessage(msg, '*'); } catch (e) { /* ignore */ } }
  function applyTheme() {
    if (!theme) return;
    if (theme === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
  }
  function applyRole() { if (role && g.UCAAS_onRole) { try { g.UCAAS_onRole(role); } catch (e) { console.error(e); } } }
  function applySticky(type) {
    var m = sticky[type], fn = g['UCAAS_on' + STICKY[type]];
    if (!m || !fn) return;
    if (type === 'dial') { if (m.req.id === lastDial) return; lastDial = m.req.id; fn(m.req); }
    else if (type === 'items') fn(m.items, m.log);
    else if (type === 'duty') fn(m.on);
    else fn(m.settings);
  }
  function down(msg) {
    Array.prototype.forEach.call(document.querySelectorAll('iframe'), function (f) { try { f.contentWindow.postMessage(msg, '*'); } catch (e) { /* ignore */ } });
  }

  g.UCAAS_goto = function (target) { up({ ucaas: 'goto', target: target }); };
  g.UCAAS_toast = function (text) { up({ ucaas: 'toast', text: text }); };
  /** tell the other sections something happened: UCAAS_emit('item', { item }) | ('settings', { settings, tabs }) | ('dial', { number, name }) */
  g.UCAAS_emit = function (type, payload) { up(Object.assign({ ucaas: 'emit', type: type }, payload)); };
  /** the latest shared data, for pages that want to read it on demand */
  g.UCAAS_data = function (type) { var m = sticky[type]; return m ? (type === 'items' ? m.items : type === 'settings' ? m.settings : type === 'duty' ? m.on : m.req) : null; };


  /* ---- company rules every page can ask about (Settings > Phone rules / Holidays) ---- */
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  function cfg(tab) { var s = sticky.settings && sticky.settings.settings; return s && s[tab] || null; }
  function partsIn(ts, tz) {
    var o = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    if (tz) o.timeZone = tz;
    var p = {}; try { new Intl.DateTimeFormat('en-GB', o).formatToParts(new Date(ts)).forEach(function (x) { p[x.type] = x.value; }); }
    catch (e) { return partsIn(ts, ''); }
    return { day: p.weekday.slice(0, 3).toLowerCase(), date: p.year + '-' + p.month + '-' + p.day, mins: (+p.hour % 24) * 60 + +p.minute };
  }
  function toMin(t) { var a = String(t).split(':'); return (+a[0]) * 60 + (+a[1] || 0); }
  /** opening ranges for one weekday: [[fromMin, toMin], ...] ('24h' = whole day, [] = closed) */
  function rangesFor(h, day) {
    if (!h || h.mode === '24h') return [[0, 1440]];
    if (h.mode === 'weekdays') return ['sat', 'sun'].indexOf(day) >= 0 ? [] : [[toMin(h.weekdays.from), toMin(h.weekdays.to)]];
    var d = h.days && h.days[day]; return d && d.open ? d.ranges.map(function (r) { return [toMin(r.from), toMin(r.to)]; }) : [];
  }
  /** what the company rules say about a moment in time: { open, holiday, text } (text = why it is outside opening hours) */
  g.UCAAS_when = function (ts) {
    var rules = cfg('phone-rules'); if (!rules) return { open: true, holiday: '', text: '' };
    var tz = rules.location && rules.location.timezone || '', p = partsIn(ts, tz);
    var hol = ((cfg('holidays') || {}).items || []).filter(function (x) { return x.from && p.date >= x.from && p.date <= (x.to || x.from); })[0];
    var r = rangesFor(rules.hours, p.day), open = r.some(function (x) { return p.mins >= x[0] && p.mins < x[1]; });
    if (hol && !hol.opens) open = false;
    var label = !rules.hours || rules.hours.mode === '24h' ? 'open 24 hours' : rules.hours.mode === 'weekdays' ? 'Mon–Fri ' + rules.hours.weekdays.from + '–' + rules.hours.weekdays.to : 'custom hours';
    return { open: open, holiday: hol ? hol.name : '', text: hol ? 'a company holiday (' + hol.name + ')' : open ? '' : 'outside opening hours (' + label + ')', label: label, tz: tz };
  };
  function localDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /** one calendar day (any time on it): { holiday: name or '', closed: true when nobody works that day, reason } , or null when no company rules are known yet */
  g.UCAAS_day = function (ts) {
    var rules = cfg('phone-rules'); if (!rules) return null;
    var d = new Date(ts), iso = localDate(d);
    var hol = ((cfg('holidays') || {}).items || []).filter(function (x) { return x.from && iso >= x.from && iso <= (x.to || x.from); })[0];
    var closed = (!!hol && !hol.opens) || !rangesFor(rules.hours, DAYS[d.getDay()]).length;
    return { holiday: hol ? hol.name : '', closed: closed, reason: hol ? (hol.opens ? 'Holiday: ' + hol.name + ' (opens ' + hol.opens + ')' : 'Holiday: ' + hol.name) : closed ? 'Not a working day' : '' };
  };
  /** the company right now: { closed, reason } where reason says why ('Holiday: Diwali', 'Outside opening hours (Mon–Fri 09:00–18:00)') */
  g.UCAAS_closedNow = function () {
    var w = g.UCAAS_when(Date.now()); if (!cfg('phone-rules')) return { closed: false, reason: '' };
    return { closed: !w.open, reason: w.holiday ? 'Holiday: ' + w.holiday : w.open ? '' : 'Outside opening hours (' + w.label + ')' };
  };
  /** '' when the time is fine, otherwise a short warning to show next to a schedule action */
  g.UCAAS_whenWarning = function (ts) { var w = g.UCAAS_when(ts); return w.text ? 'The company is closed then: ' + w.text + '.' : ''; };


  /* ---- all the company rules a page may need, in one object (null until Company Rules has been saved once) ---- */
  var NUMBERS = { n1: '+91 80 4567 0001', n2: '+91 22 4567 0002', n3: '+91 11 4567 0003', n4: '1800 123 4567' };
  function shownNumber(c) {
    var n = NUMBERS[c.numberId]; if (!n) return '';
    var digits = n.replace(/[^\d]/g, ''); if (c.strip) digits = digits.slice(c.strip);
    return (c.prefix || '') + (c.strip || c.prefix || c.suffix ? digits : n) + (c.suffix || '');
  }
  g.UCAAS_rules = function () {
    var pr = cfg('phone-rules'); if (!pr) return null;
    var cl = cfg('calling') || {}, po = cfg('policies') || {}, gr = cfg('greetings') || {}, ri = cfg('ringing-voicemail') || {}, bk = cfg('break-reasons') || {}, du = cfg('duty-policy') || {};
    var se = cfg('security') || {}, e9 = cfg('emergency-address') || {}, cn = cfg('caller-id-name') || {}, ct = cfg('campaign-timers') || {}, ms = cfg('messaging') || {}, al = cfg('alerts') || {};
    var rec = po.retention && po.retention.recordings || { mode: 'indefinite' }, vm = po.retention && po.retention.voicemail || { mode: 'indefinite' };
    var idle = [du.signOutIdle ? Number(du.signOutMinutes) || 15 : 0, se.idle && se.idle.enabled ? Number(se.idle.minutes) || 30 : 0].filter(Boolean);
    return {
      timezone: pr.location && pr.location.timezone || '', country: pr.location && pr.location.country || '',
      recording: pr.recording || { mode: 'off', direction: 'both' }, transcription: !!(pr.transcription && pr.transcription.enabled),
      callerName: cn.name || '', callerNumber: pr.callerId ? shownNumber(pr.callerId) : '',
      ringSeconds: ri.ringSeconds || 30,
      greetings: { welcome: !!(gr.welcome && gr.welcome.enabled), hold: !!(gr.hold && gr.hold.enabled), voicemail: !!(gr.voicemail && gr.voicemail.enabled), ringback: !!(gr.ringback && gr.ringback.enabled) },
      breakCodes: (bk.codes || []).map(function (c) { return { id: c.id, name: c.name, group: c.group, allowance: c.allowance === '' ? 0 : Number(c.allowance) || 0, maxPerDay: c.maxPerDay === '' ? 0 : Number(c.maxPerDay) || 0 }; }),
      duty: { agentsOwn: du.agentsOwn !== false, supervisors: !!du.supervisors },
      idleMinutes: idle.length ? Math.min.apply(null, idle) : 0,
      calling: { restrict: !!(cl.countries && cl.countries.restrict && cl.countries.list && cl.countries.list.length), allowed: cl.countries && cl.countries.list || [], externalTransfer: !cl.transfer || cl.transfer.external !== false, internationalTransfer: !cl.transfer || cl.transfer.international !== false },
      sms: !!ms.allowSms,
      notice: po.recordingNotice || { announce: true, wording: '' },
      retention: { recordings: rec.mode === 'days' ? Number(rec.days) || 0 : 0, voicemail: vm.mode === 'days' ? Number(vm.days) || 0 : 0 },
      voicemail: po.voicemail || { minPin: 4, maxMinutes: 3 },
      emergency: { set: !!(e9.line1 && e9.city && e9.ack), text: [e9.line1, e9.city, e9.postal].filter(Boolean).join(', ') },
      wrapSeconds: ct.defaults && ct.defaults.wrapSeconds || 0,
      alerts: (al.rules || []).filter(function (r) { return r.enabled; })
    };
  };

  g.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || typeof m !== 'object' || !m.ucaas) return;
    if (e.source === g.parent) {                                   // from the shell / host above
      if (m.ucaas === 'theme') { theme = m.theme; applyTheme(); down(m); }
      else if (m.ucaas === 'role') { role = m.role; applyRole(); down(m); }
      else if (STICKY[m.ucaas]) { sticky[m.ucaas] = m; applySticky(m.ucaas); down(m); }
      else if (m.ucaas === 'navigate') { if (g.UCAAS_onNavigate) g.UCAAS_onNavigate(m.rest); else g.location.hash = m.rest ? '#/' + m.rest : ''; }
      else if (m.ucaas === 'menu') { var b = document.getElementById('menuBtn'); if (b) b.click(); down(m); }
    } else {                                                        // from a page nested below this one
      if (m.ucaas === 'hello') { if (theme) e.source.postMessage({ ucaas: 'theme', theme: theme }, '*'); if (role) e.source.postMessage({ ucaas: 'role', role: role }, '*'); Object.keys(sticky).forEach(function (k) { e.source.postMessage(sticky[k], '*'); }); }
      else if (m.ucaas === 'goto' && !(g.UCAAS_interceptGoto && g.UCAAS_interceptGoto(m.target))) up(m);
      else if (m.ucaas === 'toast' || m.ucaas === 'emit' || m.ucaas === 'activity') up(m);
    }
  });

  /* a section keeps the shell's address bar in step with its own hash */
  if (isSection) {
    var report = function () { up({ ucaas: 'route', rest: location.hash.replace(/^#\/?/, '') }); };
    g.addEventListener('hashchange', report);
    g.addEventListener('load', report);
  }

  /* the shell's theme wins over whatever the page restored from its own storage */
  g.addEventListener('DOMContentLoaded', applyTheme);
  g.addEventListener('load', function () { applyTheme(); applyRole(); Object.keys(STICKY).forEach(applySticky); });
  /* idle detection for Settings > Duty policy: tell the shell the person is still here */
  var lastPing = 0;
  ['mousemove', 'keydown', 'click'].forEach(function (ev) {
    g.addEventListener(ev, function () { var n = Date.now(); if (n - lastPing > 4000) { lastPing = n; up({ ucaas: 'activity' }); } }, true);
  });
  up({ ucaas: 'hello' });
})(window);
