/* Link to the other sections.
   - A callback scheduled in wrap-up is reported as a shared item (it becomes a call task, shows on the Dashboard and in the bell).
   - Calls scheduled elsewhere (a task, the Directory) appear in the "Scheduled calls" list under Ready state, with Call now.
   - "Call" in the Directory dials here.
   - Settings > Phone rules: recording mode and opening hours are shown under Ready state; callbacks are checked against them. */
(function (g) {
  'use strict';

  var fmt = function (ts) { return fmtWhen(new Date(ts)); };
  function cbKey(itemId) { return itemId.indexOf('dialer:') === 0 ? itemId.slice(7) : itemId; }

  /* ---- dialer -> shared items ---- */
  function itemOf(key, cb, status) {
    return { id: 'dialer:' + key, kind: 'call', origin: 'dialer', title: cb.note ? cb.note + ' · ' + cb.contactName : 'Callback: ' + cb.contactName, contact: cb.contactName, phone: cb.number, at: cb.at, duration: 15,
      priority: 'NORMAL', status: status || 'scheduled', owner: PARK_AGENT.name };
  }
  g.linkCallbackSaved = function (key, cb) {
    if (!g.UCAAS_emit) return;
    g.UCAAS_emit('item', { item: itemOf(key, cb) });
    var w = g.UCAAS_whenWarning && g.UCAAS_whenWarning(cb.at);
    if (w) toastErr(w + ' Check Settings > Phone rules.');
  };

  /* ---- shared items -> scheduled calls ---- */
  g.UCAAS_onItems = function (items) {
    var changed = false;
    items.forEach(function (it) {
      if (it.kind !== 'call') return;
      var mine = it.origin === 'dialer' && (it.ownerId || 'admin') === (g.UCAAS_user || 'admin');
      var key = mine ? cbKey(it.id) : it.id, have = S.callbacks[key];
      if (it.status === 'scheduled') {
        if (mine || !it.at) return;                                    // our own callbacks are already here
        if (!have || have.at !== it.at) {
          S.callbacks = Object.assign({}, S.callbacks, { [key]: { at: it.at, owner: 'me', contactName: it.contact || it.phone || 'Contact', number: it.phone || '', createdAt: it.updatedAt || Date.now(), itemId: it.id, external: true, title: it.title, by: it.ownerId !== (g.UCAAS_user || 'admin') ? it.ownerName : '' } });
          changed = true;
        }
      } else if (have) {                                              // done / cancelled somewhere else
        var next = Object.assign({}, S.callbacks); delete next[key]; S.callbacks = next; changed = true;
      }
    });
    if (changed) { try { persistCallbacks(); } catch (e) { /* ignore */ } render(); }
  };

  /* ---- scheduled calls list + company rules, drawn under Ready state ---- */
  var R = function () { return g.UCAAS_rules ? g.UCAAS_rules() : null; };
  function row(k, v, cls) { return '<div class="rrow"><span class="k">' + k + '</span><span class="v ' + (cls || '') + '">' + v + '</span></div>'; }
  function rules() {
    var r = R(), out = '';
    if (!r) return out;
    var mode = r.recording.mode;
    out += row('Recording', (mode === 'off' ? 'Off' : '<i></i>' + (mode === 'auto' ? 'Automatic' : 'On request') + (r.recording.direction !== 'both' ? ' · ' + r.recording.direction : '')) + (mode !== 'off' && r.notice.announce ? ' <span class="mono sub">callers are told</span>' : ''), mode === 'off' ? 'off' : 'ok');
    out += row('Transcription', r.transcription ? '<i></i>On' : 'Off', r.transcription ? 'ok' : 'off');
    out += row('Ring time', r.ringSeconds + ' seconds');
    var gr = [['Welcome', r.greetings.welcome], ['Hold music', r.greetings.hold], ['Voicemail greeting', r.greetings.voicemail], ['Ringback tone', r.greetings.ringback]].filter(function (x) { return x[1]; }).map(function (x) { return x[0]; });
    out += row('Greetings', gr.length ? esc(gr.join(' · ')) : 'None set', gr.length ? '' : 'off');
    if (r.callerName) out += row('Caller ID name', esc(r.callerName));
    out += row('Voicemail', 'Up to ' + r.voicemail.maxMinutes + ' min · PIN ' + r.voicemail.minPin + '+ digits');
    out += row('Emergency address', r.emergency.set ? '<i></i>' + esc(r.emergency.text) : 'Not set', r.emergency.set ? 'ok' : 'warn');
    if (r.calling.restrict) out += row('Calls allowed to', r.calling.allowed.length + ' countr' + (r.calling.allowed.length === 1 ? 'y' : 'ies'));
    if (r.retention.recordings || r.retention.voicemail) out += row('Kept for', (r.retention.recordings ? 'Recordings ' + r.retention.recordings + ' d' : '') + (r.retention.recordings && r.retention.voicemail ? ' · ' : '') + (r.retention.voicemail ? 'Voicemail ' + r.retention.voicemail + ' d' : ''));
    if (g.UCAAS_when) {
      var w = g.UCAAS_when(Date.now());
      out += row('Office', '<i></i>' + (w.open ? 'Open' : 'Closed') + ' <span class="mono sub">' + esc(w.label) + '</span>', w.open ? 'ok' : 'warn');
    }
    return out;
  }
  g.linkReadyRows = rules;

  /* ---- My status: the company's break reasons (Company Rules > Break reasons), with allowance and daily limit ---- */
  var STATUS_KEY = 'teloz.status.v1';
  function readStatus() { try { return JSON.parse(localStorage.getItem(STATUS_KEY)) || {}; } catch (e) { return {}; } }
  var stat = readStatus();                                   // { code, since, uses: { id: { date, n } } }
  function saveStatus() { try { localStorage.setItem(STATUS_KEY, JSON.stringify(stat)); } catch (e) { /* ignore */ } }
  function mmss(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function canChangeStatus(r) { return me !== 'agent' || !r || r.duty.agentsOwn; }
  var dutyOn = true;
  g.UCAAS_onDuty = function (on) { dutyOn = on !== false; if (!dutyOn && stat.code) { if (typeof endBreak === 'function') endBreak(); stat.code = ''; saveStatus(); } render(); };
  g.linkStatusView = function () {
    var r = R(); if (!r || !r.breakCodes.length) return '';
    var can = canChangeStatus(r) && dutyOn, cur = r.breakCodes.filter(function (c) { return c.id === stat.code; })[0];
    var chips = ['<button type="button" class="stat-chip' + (!cur ? ' on' : '') + '" data-a="linkStatusPick" data-v="" ' + (can ? '' : 'disabled') + '>Available</button>'].concat(r.breakCodes.map(function (c) {
      return '<button type="button" class="stat-chip' + (cur && cur.id === c.id ? ' on' : '') + '" data-a="linkStatusPick" data-v="' + esc(c.id) + '" ' + (can ? '' : 'disabled') + ' title="' + (c.allowance ? c.allowance + ' min allowed' : 'No time limit') + (c.maxPerDay ? ' · max ' + c.maxPerDay + ' per day' : '') + '">' + esc(c.name) + '</button>';
    })).join('');
    var line = !dutyOn ? '<span class="stat-note">You are off duty (top bar). Go on duty to change your status.</span>'
      : !canChangeStatus(r) ? '<span class="stat-note">Your supervisor sets your status (Company Rules > Duty policy).</span>'
      : cur ? '<span class="stat-note">On <b>' + esc(cur.name) + '</b> <span class="stat-time" data-since="' + stat.since + '" data-allow="' + cur.allowance + '"></span></span>' : '<span class="stat-note">Ready for calls.</span>';
    return '<section class="ready stat" aria-label="My status"><div class="sec-title">' + ic('user', 14) + 'My status</div><div class="stat-chips">' + chips + '</div>' + line + '</section>';
  };
  function tickStatus() {
    document.querySelectorAll('.stat-time').forEach(function (el) {
      var used = (Date.now() - Number(el.dataset.since)) / 1000, allow = Number(el.dataset.allow) * 60;
      el.textContent = allow ? (used > allow ? 'over by ' + mmss(used - allow) : mmss(used) + ' of ' + mmss(allow)) : mmss(used);
      el.classList.toggle('over', !!allow && used > allow);
    });
  }
  setInterval(tickStatus, 1000);
  /* every break is logged (start, end) under the user, so other screens (Tasks > Day) can show when it happened */
  var BREAKS_KEY = 'teloz.breaks.v1';
  function breakLog() { try { return JSON.parse(localStorage.getItem(BREAKS_KEY)) || []; } catch (e) { return []; } }
  function endBreak() { var l = breakLog(), last = l[l.length - 1]; if (last && !last.end) { last.end = Date.now(); try { localStorage.setItem(BREAKS_KEY, JSON.stringify(l)); } catch (e) { /* ignore */ } } }
  function startBreak(c) { endBreak(); var l = breakLog(); l.push({ id: 'b' + Date.now().toString(36), code: c.id, name: c.name, allowance: c.allowance, start: Date.now(), end: null }); try { localStorage.setItem(BREAKS_KEY, JSON.stringify(l.slice(-200))); } catch (e) { /* ignore */ } }
  A.linkStatusPick = function (id) {
    var r = R(); if (!r) return;
    if (!id) { endBreak(); stat.code = ''; saveStatus(); render(); return; }
    var c = r.breakCodes.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    var today = new Date().toDateString(), u = (stat.uses = stat.uses || {})[id];
    if (!u || u.date !== today) u = stat.uses[id] = { date: today, n: 0 };
    if (c.maxPerDay && u.n >= c.maxPerDay) { toastErr(c.name + ' is limited to ' + c.maxPerDay + ' per day by company rules.'); return; }
    u.n++; stat.code = id; stat.since = Date.now(); startBreak(c); saveStatus(); render();
  };

  g.linkScheduledView = function () {
    var list = Object.keys(S.callbacks).map(function (k) { return Object.assign({ key: k }, S.callbacks[k]); }).sort(function (a, b) { return a.at - b.at; });
    return '<section class="ready sched" aria-label="Scheduled calls"><div class="sec-title">' + ic('clock', 14) + 'Scheduled calls' + (list.length ? ' <span class="sched-n">' + list.length + '</span>' : '') +
      '<button type="button" class="sched-btn go sched-add" data-a="linkSchedOpen">' + ic('plus', 14) + 'Schedule a call</button></div>' +
      (list.length ? list.map(function (c) {
        var late = c.at < Date.now();
        return '<div class="rrow sched-row"><span class="k"><b class="sched-nm">' + esc(c.contactName) + '</b><span class="sched-when' + (late ? ' late' : '') + '">' + esc(fmt(c.at)) + (late ? ' · due' : '') + (c.by ? ' · ' + esc(c.by) : c.external ? ' · from tasks' : '') + '</span></span>' +
          '<span class="v"><button type="button" class="sched-btn go" data-a="linkCallNow" data-v="' + esc(c.key) + '" ' + (c.number ? '' : 'disabled') + ' title="Call ' + esc(c.contactName) + ' now">' + ic('phone', 14) + 'Call now</button>' +
          '<button type="button" class="sched-btn" data-a="linkCallRemove" data-v="' + esc(c.key) + '" aria-label="Remove scheduled call" title="Remove">' + ic('x', 14) + '</button></span></div>';
      }).join('') : '<div class="rrow sched-empty"><span class="k">No calls scheduled. Schedule one and it also appears in Tasks.</span></div>') + '</section>';
  };

  /* ---- "Schedule a call" form (a native dialog outside the app root, so the dialer's re-renders never wipe what is typed) ---- */
  function localValue(ts) { var d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }
  function openForm() {
    var dlg = document.getElementById('schedDlg');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'schedDlg'; dlg.className = 'sched-dlg'; dlg.setAttribute('aria-labelledby', 'schedDlgT'); document.body.appendChild(dlg); }
    var at = new Date(); at.setMinutes(0, 0, 0); at.setHours(at.getHours() + 1);
    dlg.innerHTML = '<form method="dialog" novalidate><h2 id="schedDlgT">Schedule a call</h2>' +
      '<label>Who do you want to call?<input name="name" placeholder="Name (optional)" maxlength="60" autocomplete="off"></label>' +
      '<label>Phone number<input name="number" inputmode="tel" placeholder="+1 415 555 0100" value="' + esc(S.dialNumber || '') + '" autocomplete="off"></label>' +
      '<label>Date and time<input name="at" type="datetime-local" value="' + localValue(at.getTime()) + '"></label>' +
      '<label>Note (optional)<input name="note" maxlength="120" placeholder="Reason for the call"></label>' +
      '<div class="sched-err" role="alert" hidden></div><div class="sched-warn" hidden></div>' +
      '<div class="sched-row2"><button type="button" class="sched-btn" data-x>Cancel</button><button type="submit" class="sched-btn go">Schedule</button></div></form>';
    var f = dlg.querySelector('form'), err = dlg.querySelector('.sched-err'), warn = dlg.querySelector('.sched-warn');
    function check() {
      var w = g.UCAAS_whenWarning && f.at.value && g.UCAAS_whenWarning(new Date(f.at.value).getTime());
      warn.hidden = !w; warn.textContent = w ? w + ' You can still schedule it.' : '';
    }
    f.at.addEventListener('input', check); check();
    dlg.querySelector('[data-x]').onclick = function () { dlg.close(); };
    f.onsubmit = function (e) {
      var number = f.number.value.trim(), when = new Date(f.at.value).getTime(), name = f.name.value.trim();
      var msg = number.replace(/\D/g, '').length < 3 ? 'Enter a phone number.' : isNaN(when) ? 'Choose a date and time.' : when <= Date.now() ? 'Choose a time in the future.' : '';
      if (msg) { e.preventDefault(); err.hidden = false; err.textContent = msg; return; }
      var key = 'sched-' + Date.now().toString(36);
      var cb = { at: when, owner: 'me', contactName: name || number, number: number, createdAt: Date.now(), note: f.note.value.trim() };
      S.callbacks = Object.assign({}, S.callbacks, (function (o) { o[key] = cb; return o; })({}));
      try { persistCallbacks(); } catch (x) { /* storage unavailable: it is still in memory and in Tasks */ }
      g.linkCallbackSaved(key, cb);
      pushToast({ kind: 'ok', msg: 'Call scheduled for ' + fmt(when) + '. It is now in Tasks.' }, 3500);
      render();
    };
    dlg.showModal(); f.number.value ? f.name.focus() : f.number.focus();
  }

  function finish(key, status) {
    var cb = S.callbacks[key]; if (!cb) return;
    var next = Object.assign({}, S.callbacks); delete next[key]; S.callbacks = next;
    try { persistCallbacks(); } catch (e) { /* ignore */ }
    if (g.UCAAS_emit) g.UCAAS_emit('item', { item: cb.itemId ? { id: cb.itemId, kind: 'call', origin: 'dialer', title: cb.title || 'Callback: ' + cb.contactName, at: cb.at, status: status } : itemOf(key, cb, status) });
  }
  A.linkCallNow = function (key) {
    var cb = S.callbacks[key]; if (!cb) return;
    finish(key, 'done');
    callBackTo(cb.number, { name: cb.contactName, number: cb.number, sentiment: 'Neutral' });
  };
  A.linkSchedOpen = openForm;
  A.linkCallRemove = function (key) { finish(key, 'cancelled'); };

  /* ---- "Call" from the Directory ---- */
  g.UCAAS_onDial = function (req) {
    var tries = 0;
    (function go() {
      if (S.webrtc === 'registered') { callBackTo(req.number, { name: req.name, number: req.number, sentiment: 'Neutral' }); render(); }
      else if (tries++ < 20) setTimeout(go, 400);
    })();
  };

  /* ---- this user's own calls and recordings are kept (under the user); the people below them in the hierarchy are read-only copies ---- */
  var CALLS_KEY = 'teloz.calls.v1', me = g.UCAAS_user || 'admin';
  function parse(raw) { try { return JSON.parse(raw) || {}; } catch (e) { return {}; } }
  g.linkSaveCalls = function () {
    try {
      localStorage.setItem(CALLS_KEY, JSON.stringify({
        log: S.callLog.filter(function (c) { return (c.owner || me) === me; }).slice(0, 200),
        recordings: S.recordings.filter(function (r) { return !r.seed && (r.owner || me) === me; }).slice(0, 100)
      }));
    } catch (e) { /* storage unavailable: kept in memory only */ }
  };
  function loadCalls() {
    var logIds = {}, recIds = {};
    S.callLog.forEach(function (c) { logIds[c.id] = 1; }); S.recordings.forEach(function (r) { recIds[r.id] = 1; });
    (g.UCAAS_visibleUsers ? g.UCAAS_visibleUsers() : [me]).forEach(function (role) {
      var raw = role === me ? localStorage.getItem(CALLS_KEY) : g.UCAAS_readUser(role, CALLS_KEY), d = parse(raw);
      (d.log || []).forEach(function (c) { if (!logIds[c.id]) { c.owner = c.owner || role; S.callLog.push(c); logIds[c.id] = 1; } });
      (d.recordings || []).forEach(function (r) { if (!recIds[r.id]) { r.owner = r.owner || role; S.recordings.push(r); recIds[r.id] = 1; } });
    });
    S.callLog.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
  }
  loadCalls();
  render();

  /* ---- the company is closed (holiday or outside opening hours) ---- */
  g.linkClosedBanner = function () {
    var c = g.UCAAS_closedNow && g.UCAAS_closedNow(); if (!c || !c.closed) return '';
    return '<div class="closed-banner" role="status">' + ic('clock', 16) + '<div><b>The company is closed now</b><span>' + esc(c.reason) + '. You can still place calls.</span></div></div>';
  };
  var warned = 0;
  g.linkCallWarning = function () {
    var c = g.UCAAS_closedNow && g.UCAAS_closedNow(); if (!c || !c.closed || Date.now() - warned < 30000) return;
    warned = Date.now(); toastErr('The company is closed now: ' + c.reason + '.');
  };
  setInterval(function () { if (S.callState === 'idle') render(); }, 60000);   // the banner appears / disappears when opening time passes

  /* ---- calling rules ---- */
  g.linkCallBlocked = function (target) {
    var r = R(); if (!r) return false;
    var digits = String(target).replace(/\D/g, '');
    if (r.calling.restrict && /^\s*\+/.test(String(target))) {
      var c = countryFromNumber(target);
      if (c && r.calling.allowed.indexOf(c.iso) < 0) { toastErr('Calls to ' + c.name + ' are not allowed by company rules (Company Rules > Calling).'); return true; }
    }
    if (/^(911|112|999)$/.test(digits) && !r.emergency.set) toastErr('No emergency address is set for the company (Company Rules > Emergency address). The call will still go through.');
    return false;
  };
  g.linkRetained = function (row, kind) {
    var r = R(), days = r && r.retention[kind]; if (!days) return true;
    var at = Date.parse(row.start || row.at || row.date || ''); return isNaN(at) || Date.now() - at <= days * 86400000;
  };
  function announce() {
    var r = R(); if (!r || !r.notice.announce) return;
    pushToast({ kind: 'ok', msg: 'Recording started. The caller hears: "' + (r.notice.wording || 'This call may be recorded.') + '"' }, 4500);
  }
  var baseRec = A.rec; A.rec = function () { var r = R(); if (r && r.recording.mode === 'off') { toastErr('Recording is turned off by company rules.'); return; } baseRec(); if (S.isRecording) announce(); };
  var autoFor = null, ringStart = 0;
  setInterval(function () {
    var r = R(); if (!r) return;
    document.documentElement.classList.toggle('rec-off', r.recording.mode === 'off');
    var dirOk = r.recording.direction === 'both' || (r.recording.direction === 'inbound') === (S.callType === 'inbound');
    if (r.recording.mode === 'auto' && S.callState === 'connected' && S.activeCallId && autoFor !== S.activeCallId && dirOk) {
      autoFor = S.activeCallId; if (!S.isRecording) { S.isRecording = true; S.recPaused = false; announce(); render(); }
    } else if (r.recording.mode === 'off' && S.isRecording) { S.isRecording = false; render(); }
    /* an incoming call rings for the company's ring time, then it is missed */
    if (S.incoming) {
      if (!ringStart) ringStart = Date.now();
      else if (Date.now() - ringStart > r.ringSeconds * 1000) {
        var inc = S.incoming; ringStart = 0; S.incoming = null; S.incomingChoice = false; S.incomingMin = false;
        S.callLog = [{ id: 'missed-' + Date.now(), owner: me, name: inc.name, number: inc.number, contact: inc, participants: [], status: 'Missed', direction: 'Inbound', at: Date.now(), duration: 0, when: fmtWhen(new Date()), result: 'Not answered', sentiment: inc.sentiment }].concat(S.callLog);
        g.linkSaveCalls(); pushToast({ kind: 'err', msg: 'Missed call from ' + inc.name + ' (it rang ' + r.ringSeconds + ' seconds).' }, 5000); render();
      }
    } else ringStart = 0;
  }, 500);

  /* settings changed: redraw so Recording / Office show the new rules */
  g.UCAAS_onSettings = function () {
    var r = R(); if (r && r.callerNumber) CALLER_ID = r.callerNumber;
    render();
  };
  { var first = R(); if (first && first.callerNumber) CALLER_ID = first.callerNumber; }
})(window);
