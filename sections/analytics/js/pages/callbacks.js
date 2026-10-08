/* Callbacks - scheduled callbacks (actions), voicemail inbox with simulated player, callback SLA report. */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc;
  var pl = { id: null, pos: 0, playing: false, speed: 1 };
  var STAT = { pending: ['Pending', 'warn'], completed: ['Completed', 'ok'], failed: ['Failed', 'bad'] };

  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function list(kind) { var qs = MCM.F.queues; return MCM.callbacks.filter(function (c) { return (!kind || c.kind === kind) && (!qs.length || qs.indexOf(c.q) >= 0); }); }
  function doneTs(c) { return c.done || Math.max(c.created, Math.min(c.due, Date.now())); }
  function canAct(c) { return MCM.can('supervise') || (MCM.user.role === 'Agent' && (!c || c.agent === MCM.user.id)); }
  function canCreate() { return MCM.can('supervise') || MCM.user.role === 'Agent'; }
  function agName(id) { var a = MCM.aById[id]; return a ? a.name : null; }
  function localVal(ts) { var d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }
  function find(id) { return MCM.callbacks.filter(function (c) { return c.id === id; })[0]; }
  function agentOpts(sel) { return UI.opts([['', 'Unassigned']].concat(MCM.agents.filter(function (a) { return a.role !== 'Admin'; }).map(function (a) { return [a.id, a.name + ' (' + a.team + ')']; })), sel || ''); }
  function transcript(c) {
    var h = hash(c.id), topic = MCM.TOPICS[h % MCM.TOPICS.length].toLowerCase(), q = MCM.qById[c.q] ? MCM.qById[c.q].name : 'support';
    var tpl = ['Hello, this is a message for the ' + q + ' team. I am calling about ' + topic + ' and I have not had a reply yet. Please call me back on ' + MCM.mask(c.from) + '. Thank you.', 'Hi, I tried to get through earlier but the line was busy. It is regarding ' + topic + '. Could someone return my call on ' + MCM.mask(c.from) + ' this afternoon?', 'Good morning. I need help with ' + topic + ' on my account. Please ring me back as soon as possible on ' + MCM.mask(c.from) + '. Thanks.'];
    return { topic: MCM.TOPICS[h % MCM.TOPICS.length], text: tpl[h % tpl.length] };
  }

  /* simulated call attempt: deterministic from id + attempt number */
  function callNow(c) {
    c.attempts = (c.attempts || 0) + 1; c.lastTry = Date.now();
    var r = MCM.rng(hash(c.id) + c.attempts * 101)(), ok = r < 0.55;
    if (ok) { c.status = 'completed'; c.done = Date.now(); c.lastOutcome = 'connected'; }
    else if (c.attempts >= 3) { c.status = 'failed'; c.lastOutcome = 'no answer (limit reached)'; }
    else c.lastOutcome = r < 0.8 ? 'no answer' : 'busy';
    if (!c.agent && MCM.aById[MCM.user.id]) c.agent = MCM.user.id;
    MCM.saveCallbacks(); MCM.audit('Callback attempt', MCM.mask(c.from) + ' attempt ' + c.attempts + ' - ' + c.lastOutcome + ' (simulated)');
    UI.toast(ok ? 'Connected to ' + esc(MCM.mask(c.from)) + ' - callback completed' : 'Attempt ' + c.attempts + ': ' + c.lastOutcome + (c.status === 'failed' ? '. Marked failed after 3 attempts.' : '. Will stay pending.'), { kind: ok ? 'ok' : 'bad' });
    UI.toast('Simulated outcome: no telephony backend is connected', { ms: 2500 });
  }

  function newModal(ctx) {
    var self = MCM.user.role === 'Agent' ? MCM.user.id : '';
    UI.modal({ title: 'New callback', body: '<div class="fg c2"><label>Phone number<input class="inp" data-n="from" placeholder="+91 9XXXXXXXXX"></label><label>Queue<select class="inp" data-n="q">' + UI.opts(MCM.queues.filter(function (q) { return q.channel === 'voice'; }).map(function (q) { return [q.id, q.name]; })) + '</select></label><label>Due (your browser time)<input class="inp" type="datetime-local" data-n="due" value="' + localVal(Date.now() + 3600000) + '"></label><label>Agent<select class="inp" data-n="agent">' + agentOpts(self) + '</select></label></div><div class="fg mt"><label>Note<textarea class="inp" data-n="note" placeholder="Context for whoever calls back"></textarea></label></div>', foot: [{ label: 'Cancel' }, { label: 'Create callback', pri: true, fn: function (m) {
      var v = {}; m.querySelectorAll('[data-n]').forEach(function (el) { v[el.dataset.n] = el.value; });
      if (v.from.replace(/\D/g, '').length < 6) { UI.toast('Enter a valid phone number', { kind: 'bad' }); return false; }
      var due = new Date(v.due).getTime(); if (isNaN(due)) { UI.toast('Choose a due date and time', { kind: 'bad' }); return false; }
      if (MCM.user.role === 'Agent') v.agent = MCM.user.id;
      MCM.callbacks.push({ id: 'cb' + Date.now(), kind: 'callback', q: v.q, from: v.from.trim(), created: Date.now(), due: due, status: 'pending', agent: v.agent || null, attempts: 0, dur: 0, note: v.note.trim() });
      MCM.saveCallbacks(); MCM.audit('Callback created', v.from.trim() + ' - ' + MCM.qById[v.q].name); UI.toast('Callback scheduled', { kind: 'ok' }); ctx.refresh();
    } }] });
  }
  function assignModal(ctx, c, title) {
    UI.modal({ title: title || 'Reassign', body: '<div class="fg"><label>Agent<select class="inp" data-a>' + agentOpts(c.agent) + '</select></label></div>', foot: [{ label: 'Cancel' }, { label: 'Save', pri: true, fn: function (m) { var v = m.querySelector('[data-a]').value; MCM.audit('Callback assigned', MCM.mask(c.from) + ' -> ' + (agName(v) || 'unassigned')); c.agent = v || null; MCM.saveCallbacks(); ctx.refresh(); } }] });
  }
  function rescheduleModal(ctx, c) {
    UI.modal({ title: 'Reschedule callback', body: '<div class="fg"><label>New due time (your browser time)<input class="inp" type="datetime-local" data-d value="' + localVal(Math.max(Date.now() + 600000, c.due)) + '"></label></div>', foot: [{ label: 'Cancel' }, { label: 'Reschedule', pri: true, fn: function (m) { var t = new Date(m.querySelector('[data-d]').value).getTime(); if (isNaN(t)) { UI.toast('Choose a date and time', { kind: 'bad' }); return false; } c.due = t; if (c.status === 'failed') c.status = 'pending'; MCM.saveCallbacks(); MCM.audit('Callback rescheduled', MCM.mask(c.from) + ' to ' + T.dt(t)); ctx.refresh(); } }] });
  }
  function del(ctx, c) { UI.confirm('Delete this ' + (c.kind === 'voicemail' ? 'voicemail' : 'callback') + ' from ' + esc(MCM.mask(c.from)) + '? This cannot be undone.', 'Delete').then(function (ok) { if (!ok) return; MCM.callbacks.splice(MCM.callbacks.indexOf(c), 1); if (pl.id === c.id) { pl.id = null; pl.playing = false; } MCM.saveCallbacks(); MCM.audit(c.kind === 'voicemail' ? 'Voicemail deleted' : 'Callback deleted', MCM.mask(c.from)); ctx.refresh(); }); }

  MCM.page({
    id: 'callbacks', title: 'Callbacks', icon: 'callbacks', filters: ['queue'],
    tabs: [['scheduled', 'Scheduled callbacks'], ['voicemail', 'Voicemail'], ['sla', 'Callback SLA']],
    render: function (ctx) {
      var tab = ctx.tab, now = Date.now(), qn = function (id) { return MCM.qById[id] ? MCM.qById[id].name : id; };
      var cant = function (what) { return MCM.deny(what); };

      if (tab === 'scheduled') {
        var all = list('callback'), pend = all.filter(function (c) { return c.status === 'pending'; }), over = pend.filter(function (c) { return c.due < now; }), doneT = all.filter(function (c) { return c.status === 'completed' && doneTs(c) >= MCM.TODAY; }), failed = all.filter(function (c) { return c.status === 'failed'; }), comp = all.filter(function (c) { return c.status === 'completed'; });
        var avg = comp.length ? comp.reduce(function (s, c) { return s + (doneTs(c) - c.created) / 1000; }, 0) / comp.length : null;
        ctx.el.innerHTML = '<div class="grid g5">' + [UI.kpi({ label: 'Pending', value: pend.length, sub: 'waiting to be called' }), UI.kpi({ label: 'Overdue', value: over.length, status: over.length ? 'bad' : 'ok', sub: 'past their due time' }), UI.kpi({ label: 'Completed today', value: doneT.length }), UI.kpi({ label: 'Failed', value: failed.length, sub: '3 attempts without contact' }), UI.kpi({ label: 'Avg time to callback', value: f.hm(avg), sub: 'created to completed' })].join('') + '</div>' +
          (canCreate() ? '' : '<div class="note warn mt">Your role (' + MCM.user.role + ') can view callbacks but not change them.</div>') +
          '<div class="mt">' + UI.card('Scheduled callbacks', '<div id="cbt"></div>', { flush: true, sub: 'Call now is simulated (no telephony backend): it records an attempt and a deterministic outcome.', acts: '<button class="btn pri sm" data-new>' + UI.icon('plus') + 'New callback</button>' }) + '</div>';
        UI.table(document.getElementById('cbt'), { id: 'cbtbl', noun: 'callbacks', csv: MCM.can('export') ? 'callbacks' : undefined, rows: all, pageSize: 12, sort: 'due', dir: 'asc', emptyTitle: 'No callbacks', emptySub: 'Create one with "New callback".',
          cols: [
            { k: 'due', label: 'Due', html: function (c) { var o = c.status === 'pending' && c.due < now; return '<span class="' + (o ? 'bad-t' : '') + '"><b>' + T.dt(c.due) + '</b></span>' + (o ? ' ' + UI.tag('Overdue ' + f.ago(c.due).replace(' ago', ''), 'bad') : ''); }, val: function (c) { return c.due; } },
            { k: 'from', label: 'Number', html: function (c) { return '<span class="mono">' + esc(MCM.mask(c.from)) + '</span>'; }, val: function (c) { return MCM.mask(c.from); } },
            { k: 'q', label: 'Queue', html: function (c) { return esc(qn(c.q)); }, val: function (c) { return qn(c.q); } },
            { k: 'ag', label: 'Agent', html: function (c) { return c.agent ? esc(agName(c.agent)) : '<span class="faint">unassigned</span>'; }, val: function (c) { return agName(c.agent) || ''; } },
            { k: 'at', label: 'Attempts', r: 1, html: function (c) { return c.attempts || 0; }, val: function (c) { return c.attempts || 0; } },
            { k: 'st', label: 'Status', html: function (c) { return UI.tag(STAT[c.status][0], STAT[c.status][1]) + (c.lastOutcome && c.status !== 'completed' ? ' <span class="muted">' + esc(c.lastOutcome) + '</span>' : ''); }, val: function (c) { return c.status; } },
            { k: 'wt', label: 'Waiting', r: 1, html: function (c) { return c.status === 'pending' ? f.hm((now - c.created) / 1000) : '-'; }, val: function (c) { return c.status === 'pending' ? now - c.created : 0; } },
            { k: 'note', label: 'Note', html: function (c) { return esc(c.note || ''); }, val: function (c) { return c.note || ''; } },
            { k: 'act', label: 'Actions', noSort: 1, noCsv: 1, html: function (c) { var p = c.status === 'pending', ok = canAct(c); return ok ? (p ? '<button class="btn xs pri" data-cb-call="' + c.id + '">Call now</button> <button class="btn xs" data-cb-done="' + c.id + '">Complete</button> ' : '') + '<button class="btn xs" data-cb-asg="' + c.id + '">Reassign</button> <button class="btn xs" data-cb-res="' + c.id + '">Reschedule</button> <button class="btn xs danger" data-cb-del="' + c.id + '">Delete</button>' : '<span class="faint">read only</span>'; } }
          ] });
        ctx.on('[data-new]', function () { if (!canCreate()) return cant('create callbacks'); newModal(ctx); });
        ctx.on('[data-cb-call]', function (e, el) { var c = find(el.dataset.cbCall); if (!c) return; if (!canAct(c)) return cant('place callbacks'); callNow(c); ctx.refresh(); });
        ctx.on('[data-cb-done]', function (e, el) { var c = find(el.dataset.cbDone); if (!c) return; if (!canAct(c)) return cant('complete callbacks'); c.status = 'completed'; c.done = Date.now(); MCM.saveCallbacks(); MCM.audit('Callback completed', MCM.mask(c.from)); ctx.refresh(); });
        ctx.on('[data-cb-asg]', function (e, el) { var c = find(el.dataset.cbAsg); if (!c) return; if (!MCM.can('supervise')) return cant('reassign callbacks'); assignModal(ctx, c); });
        ctx.on('[data-cb-res]', function (e, el) { var c = find(el.dataset.cbRes); if (!c) return; if (!canAct(c)) return cant('reschedule callbacks'); rescheduleModal(ctx, c); });
        ctx.on('[data-cb-del]', function (e, el) { var c = find(el.dataset.cbDel); if (!c) return; if (!canAct(c)) return cant('delete callbacks'); del(ctx, c); });
      }

      else if (tab === 'voicemail') {
        var vms = list('voicemail'), ret = MCM.settings.recordingRetentionDays || 60, newN = vms.filter(function (c) { return c.status === 'pending'; }).length;
        ctx.el.innerHTML = '<div class="grid g4">' + [UI.kpi({ label: 'Voicemails', value: vms.length }), UI.kpi({ label: 'New (unhandled)', value: newN, status: newN ? 'warn' : 'ok' }), UI.kpi({ label: 'Handled', value: vms.filter(function (c) { return c.status === 'completed'; }).length }), UI.kpi({ label: 'Avg length', value: f.dur(vms.length ? vms.reduce(function (s, c) { return s + c.dur; }, 0) / vms.length : 0) })].join('') + '</div>' +
          '<div class="grid g21 mt"><div>' + UI.card('Voicemail inbox', '<div id="vmt"></div>', { flush: true, sub: 'Retention: voicemails are kept for ' + ret + ' days (Settings > recording retention), then purged.' }) + '</div><div>' + UI.card('Player ' + UI.preview(), '<div id="vmp"></div>', { sub: 'Simulated playback - there is no audio file in the demo.' }) + '</div></div>';
        UI.table(document.getElementById('vmt'), { id: 'vmtbl', noun: 'voicemails', csv: MCM.can('export') ? 'voicemails' : undefined, rows: vms, pageSize: 10, sort: 'created', emptyTitle: 'No voicemails', emptySub: 'Callers who leave a message appear here.',
          cols: [
            { k: 'created', label: 'Received', html: function (c) { return T.dt(c.created); }, val: function (c) { return c.created; } },
            { k: 'from', label: 'Caller', html: function (c) { return '<span class="mono">' + esc(MCM.mask(c.from)) + '</span>'; }, val: function (c) { return MCM.mask(c.from); } },
            { k: 'q', label: 'Queue', html: function (c) { return esc(qn(c.q)); }, val: function (c) { return qn(c.q); } },
            { k: 'dur', label: 'Length', r: 1, html: function (c) { return f.dur(c.dur); }, val: function (c) { return c.dur; } },
            { k: 'st', label: 'Status', html: function (c) { return c.status === 'pending' ? UI.tag('New', 'warn') : c.status === 'completed' ? UI.tag('Handled', 'ok') : UI.tag('Failed', 'bad'); }, val: function (c) { return c.status; } },
            { k: 'ag', label: 'Assigned', html: function (c) { return c.agent ? esc(agName(c.agent)) : '<span class="faint">unassigned</span>'; }, val: function (c) { return agName(c.agent) || ''; } },
            { k: 'exp', label: 'Purged on', html: function (c) { return T.dm(c.created + ret * T.day); }, val: function (c) { return c.created + ret * T.day; } },
            { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (c) { var ok = canAct(c); return '<button class="btn xs pri" data-vm-play="' + c.id + '">' + (pl.id === c.id && pl.playing ? 'Playing' : 'Play') + '</button>' + (ok ? ' ' + (c.status === 'pending' ? '<button class="btn xs" data-vm-done="' + c.id + '">Mark handled</button> ' : '') + '<button class="btn xs" data-vm-asg="' + c.id + '">Assign</button> <button class="btn xs danger" data-vm-del="' + c.id + '">Delete</button>' : ''); } }
          ] });
        var host = document.getElementById('vmp');
        function drawPlayer() {
          var c = find(pl.id); if (!c) { host.innerHTML = UI.empty('No voicemail selected', 'Press Play on a row to listen and read the transcript.'); return; }
          var tr = transcript(c), n = 64, up = Math.round(pl.pos / Math.max(1, c.dur) * n), bars = '';
          for (var i = 0; i < n; i++) { var hgt = 6 + (hash(c.id + i) % 22); bars += '<rect x="' + (i * 5) + '" y="' + (16 - hgt / 2) + '" width="3" height="' + hgt + '" rx="1.5" data-b="' + i + '" fill="' + (i < up ? 'var(--brand)' : 'var(--faint)') + '"/>'; }
          host.innerHTML = '<div style="display:grid;gap:1.2rem"><div><b class="mono">' + esc(MCM.mask(c.from)) + '</b> <span class="muted">' + esc(qn(c.q)) + ' - ' + T.dt(c.created) + '</span></div>' +
            '<svg viewBox="0 0 320 32" style="width:100%;height:5rem" id="vmwave">' + bars + '</svg>' +
            '<div style="display:flex;align-items:center;gap:1rem"><button class="btn pri sm" data-vm-toggle>' + UI.icon(pl.playing ? 'pause' : 'play') + (pl.playing ? 'Pause' : 'Play') + '</button><button class="btn sm" data-vm-restart>Restart</button><span class="mono" data-pos>' + f.dur(pl.pos) + ' / ' + f.dur(c.dur) + '</span><span class="grow" style="flex:1"></span>' + UI.seg([[1, '1x'], [1.5, '1.5x'], [2, '2x']], pl.speed, 'vm-speed', 'sm') + '</div>' +
            '<div><div class="muted" style="font-weight:600;margin-bottom:.4rem">Transcript preview ' + UI.tag(tr.topic, 'info') + '</div><div class="note" style="display:block">' + esc(tr.text) + '</div><div class="muted mt" style="font-size:1.1rem">Auto-generated demo transcript derived from the detected topic.</div></div>' +
            (c.note ? '<div><b>Note:</b> ' + esc(c.note) + '</div>' : '') + '</div>';
        }
        function paint() { var c = find(pl.id); if (!c) return; var p = host.querySelector('[data-pos]'); if (p) p.textContent = f.dur(pl.pos) + ' / ' + f.dur(c.dur); var up = Math.round(pl.pos / Math.max(1, c.dur) * 64); host.querySelectorAll('[data-b]').forEach(function (r) { r.setAttribute('fill', +r.dataset.b < up ? 'var(--brand)' : 'var(--faint)'); }); }
        drawPlayer();
        ctx.every(250, function () { var c = find(pl.id); if (!pl.playing || !c) return; pl.pos += 0.25 * pl.speed; if (pl.pos >= c.dur) { pl.pos = c.dur; pl.playing = false; drawPlayer(); } else paint(); });
        ctx.on('[data-vm-play]', function (e, el) { var c = find(el.dataset.vmPlay); if (!c) return; if (pl.id !== c.id) { pl.id = c.id; pl.pos = 0; } pl.playing = true; drawPlayer(); var t = document.querySelector('#vmtbl'); host.scrollIntoView && host.scrollIntoView({ block: 'nearest' }); });
        ctx.on('[data-vm-toggle]', function () { var c = find(pl.id); if (!c) return; if (pl.pos >= c.dur) pl.pos = 0; pl.playing = !pl.playing; drawPlayer(); });
        ctx.on('[data-vm-restart]', function () { pl.pos = 0; pl.playing = true; drawPlayer(); });
        ctx.on('[data-vm-speed]', function (e, el) { pl.speed = +el.dataset.vmSpeed; drawPlayer(); });
        ctx.on('[data-vm-done]', function (e, el) { var c = find(el.dataset.vmDone); if (!c) return; if (!canAct(c)) return cant('handle voicemails'); c.status = 'completed'; c.done = Date.now(); if (!c.agent && MCM.aById[MCM.user.id]) c.agent = MCM.user.id; MCM.saveCallbacks(); MCM.audit('Voicemail handled', MCM.mask(c.from)); ctx.refresh(); });
        ctx.on('[data-vm-asg]', function (e, el) { var c = find(el.dataset.vmAsg); if (!c) return; if (!canAct(c)) return cant('assign voicemails'); assignModal(ctx, c, 'Assign voicemail'); });
        ctx.on('[data-vm-del]', function (e, el) { var c = find(el.dataset.vmDel); if (!c) return; if (!canAct(c)) return cant('delete voicemails'); del(ctx, c); });
      }

      else if (tab === 'sla') {
        var target = MCM.store.get('cbTarget', 4), tms = target * 3600000, items = list(), cs = MCM.can('supervise');
        // eligible = completed, or still open once the target window has elapsed
        function stat(l) {
          var elig = l.filter(function (c) { return c.status === 'completed' || c.status === 'failed' || c.created + tms <= now; }), within = elig.filter(function (c) { return c.status === 'completed' && doneTs(c) - c.created <= tms; });
          return { total: l.length, elig: elig.length, within: within.length, sla: elig.length ? within.length / elig.length * 100 : null, open: l.filter(function (c) { return c.status === 'pending'; }).length, overdue: l.filter(function (c) { return c.status === 'pending' && c.due < now; }).length, failed: l.filter(function (c) { return c.status === 'failed'; }).length };
        }
        var gs = stat(items), by = MCM.groupBy(items, function (c) { return c.q; }), comp = items.filter(function (c) { return c.status === 'completed'; }), avg = comp.length ? comp.reduce(function (s, c) { return s + (doneTs(c) - c.created) / 1000; }, 0) / comp.length : null;
        var pend = items.filter(function (c) { return c.status === 'pending'; }), ages = [[0, 1, '< 1 h'], [1, 4, '1-4 h'], [4, 24, '4-24 h'], [24, 48, '1-2 days'], [48, 1e9, '> 2 days']].map(function (b) { return { label: b[2], value: pend.filter(function (c) { var h = (now - c.created) / 3600000; return h >= b[0] && h < b[1]; }).length, color: b[0] >= 24 ? 'var(--bad)' : b[0] >= 4 ? '#f59e0b' : 'var(--c3)' }; });
        var rows = Object.keys(by).map(function (q) { var s = stat(by[q]); s.q = q; s.name = qn(q); return s; });
        ctx.el.innerHTML = '<div class="grid g4">' + [UI.kpi({ label: 'Called back within target', value: f.pct(gs.sla), status: gs.sla == null ? '' : gs.sla >= 90 ? 'ok' : gs.sla >= 75 ? 'warn' : 'bad', sub: gs.within + ' of ' + gs.elig + ' due items' }), UI.kpi({ label: 'Target', value: target, unit: ' h', sub: 'time to call back' }), UI.kpi({ label: 'Avg time to callback', value: f.hm(avg), sub: 'completed items' }), UI.kpi({ label: 'Open past target', value: pend.filter(function (c) { return c.created + tms <= now; }).length, status: pend.some(function (c) { return c.created + tms <= now; }) ? 'bad' : 'ok', sub: gs.open + ' open in total' })].join('') + '</div>' +
          '<div class="card mt"><div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap"><b>SLA target</b><label style="display:flex;gap:.6rem;align-items:center">Call back within <input class="inp sm" style="min-width:7rem;width:8rem" type="number" min="0.25" step="0.25" id="cbtarget" value="' + target + '"' + (cs ? '' : ' disabled') + '> hours</label><button class="btn pri sm" data-cbt' + (cs ? '' : ' disabled') + '>Save target</button><span class="muted">Applies to callbacks and voicemails. An item counts as breached when it is completed late, failed, or still open after the target time. Stored in this browser.</span></div></div>' +
          '<div class="grid g2 mt">' + UI.card('SLA by queue', '<div id="slq"></div>') + UI.card('Backlog ageing (open items)', '<div id="slage"></div>') + '</div><div class="mt">' + UI.card('By queue', '<div id="slt"></div>', { flush: true }) + '</div>';
        document.getElementById('slq').innerHTML = rows.filter(function (r) { return r.sla != null; }).length ? UI.hbars(rows.filter(function (r) { return r.sla != null; }).sort(function (a, b) { return b.sla - a.sla; }).map(function (r) { return { label: r.name, value: r.sla, fmt: function (v) { return f.pct(v, 0); }, color: r.sla >= 90 ? 'var(--ok-dot)' : r.sla >= 75 ? '#f59e0b' : 'var(--bad)' }; }), { max: 100 }) : UI.empty('No items due yet');
        UI.chart(document.getElementById('slage'), { type: 'bar', labels: ages.map(function (a) { return a.label; }), legend: false, height: 18, series: [{ name: 'Open items', data: ages.map(function (a) { return a.value; }), color: 'var(--c2)' }] });
        UI.table(document.getElementById('slt'), { id: 'cbsla', noun: 'queues', search: false, csv: MCM.can('export') ? 'callback-sla' : undefined, rows: rows, pageSize: 12, sort: 'name', dir: 'asc', onRow: function (r) { MCM.drill.queue(r.q); },
          cols: [{ k: 'name', label: 'Queue', val: function (r) { return r.name; }, html: function (r) { return '<b>' + esc(r.name) + '</b>'; } }, { k: 'total', label: 'Items', r: 1, val: function (r) { return r.total; }, html: function (r) { return r.total; } }, { k: 'elig', label: 'Due items', r: 1, val: function (r) { return r.elig; }, html: function (r) { return r.elig; } }, { k: 'within', label: 'Within target', r: 1, val: function (r) { return r.within; }, html: function (r) { return r.within; } }, { k: 'sla', label: 'SLA %', r: 1, val: function (r) { return r.sla; }, html: function (r) { return UI.slCell(r.sla, 90); } }, { k: 'open', label: 'Open', r: 1, val: function (r) { return r.open; }, html: function (r) { return r.open; } }, { k: 'overdue', label: 'Overdue', r: 1, val: function (r) { return r.overdue; }, html: function (r) { return r.overdue ? '<span class="bad-t">' + r.overdue + '</span>' : 0; } }, { k: 'failed', label: 'Failed', r: 1, val: function (r) { return r.failed; }, html: function (r) { return r.failed; } }] });
        ctx.on('[data-cbt]', function () { if (!cs) return cant('change the callback SLA target'); var v = +document.getElementById('cbtarget').value; if (!(v > 0)) { UI.toast('Enter a target above zero', { kind: 'bad' }); return; } MCM.store.set('cbTarget', v); MCM.audit('Callback SLA target changed', v + ' hours'); UI.toast('Target saved', { kind: 'ok' }); ctx.refresh(); });
      }
    }
  });
})();
