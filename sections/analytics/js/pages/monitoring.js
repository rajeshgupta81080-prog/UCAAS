/* Monitoring - live call supervision (listen / whisper / barge / takeover), extension grid, groups, session history.
   Monitoring sessions and the floating monitoring bar live at module level so they survive page navigation. */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc, L = MCM.live;
  if (!L.sessions) L.sessions = MCM.store.get('sessions', []);
  var MODES = { listen: 'Listen', whisper: 'Whisper', barge: 'Barge', takeover: 'Takeover' };
  var MODE_HINT = { listen: 'Silent monitoring - neither party hears you', whisper: 'Coach the agent - only the agent hears you', barge: 'Three-way - both parties hear you', takeover: 'Take the call from the agent' };
  var bar = null, tmr = null;

  function persist() { MCM.store.set('sessions', L.sessions); }
  function agName(id) { return (MCM.aById[id] || {}).name || id; }
  function liveCall(id) { return L.calls.filter(function (c) { return c.id === id; })[0]; }
  function active() { return L.sessions.filter(function (s) { return !s.end; })[0]; }
  // sessions left open by a previous page load are closed (the simulated calls no longer exist)
  L.sessions.forEach(function (s) { if (!s.end) { s.end = s.start; s.reason = 'Interrupted (page reloaded)'; } });

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div'); bar.id = 'monbar';
    bar.style.cssText = 'position:fixed;left:50%;bottom:2rem;transform:translateX(-50%);z-index:85;background:var(--ink);color:var(--bg);border-radius:1.25rem;padding:1.1rem 1.6rem;display:none;align-items:center;gap:1.4rem;box-shadow:var(--shadow-lg);font-size:1.2rem;max-width:96vw;flex-wrap:wrap';
    document.body.appendChild(bar);
    bar.onclick = function (e) {
      var s = active(); if (!s) return; var el;
      if ((el = e.target.closest('[data-mm]'))) { setMode(s, el.dataset.mm); }
      else if (e.target.closest('[data-mtake]')) { takeover(s); }
      else if (e.target.closest('[data-mend]')) { endSession(s, 'Ended by supervisor'); }
    };
    return bar;
  }
  function paintBar() {
    var b = ensureBar(), s = active();
    if (!s) { b.style.display = 'none'; b.innerHTML = ''; b._sid = null; return; }
    b.style.display = 'flex';
    var key = s.id + s.mode;
    if (b._sid !== key) {
      b._sid = key;
      var seg = ['listen', 'whisper', 'barge'].map(function (m) { return '<button data-mm="' + m + '" title="' + MODE_HINT[m] + '" style="border:0;border-radius:.5rem;padding:.6rem 1.1rem;font-weight:600;cursor:pointer;background:' + (s.mode === m ? 'var(--brand)' : 'transparent') + ';color:' + (s.mode === m ? '#fff' : 'inherit') + '">' + MODES[m] + '</button>'; }).join('');
      b.innerHTML = '<span class="ldot"></span><span><b>Monitoring</b> ' + esc(agName(s.agent)) + ' <span style="opacity:.7">- ' + esc(MCM.qById[s.queue].name) + ' - ' + s.call + '</span></span>' +
        '<span style="display:inline-flex;gap:.3rem;background:rgba(127,127,127,.25);border-radius:.75rem;padding:.3rem">' + seg + '</span>' +
        '<span class="mono" data-mel style="min-width:5rem;text-align:right">0:00</span>' +
        '<button data-mtake class="btn sm" style="color:var(--ink)">Take over</button><button data-mend class="btn sm danger" style="background:#b91c1c;color:#fff;border-color:#b91c1c">End</button>';
    }
    var el = b.querySelector('[data-mel]'); if (el) el.textContent = f.dur((Date.now() - s.start) / 1000);
  }
  function startTimer() {
    if (tmr) return;
    tmr = setInterval(function () {
      var s = active(); if (!s) { paintBar(); return; }
      if (!liveCall(s.call)) { endSession(s, 'Call ended'); return; }
      paintBar();
    }, 1000);
  }

  function start(lc, mode) {
    if (!MCM.can('supervise')) return MCM.deny('monitor calls');
    if (lc.agent === MCM.user.id) { UI.toast('You cannot monitor your own call.', { kind: 'bad' }); return; }
    var cur = active(); if (cur && cur.call !== lc.id) endSession(cur, 'Switched to another call');
    else if (cur) { setMode(cur, mode); if (mode === 'takeover') takeover(cur); return; }
    var s = { id: 'ms' + Date.now(), agent: lc.agent, call: lc.id, mode: mode, supervisor: MCM.user.id, start: Date.now(), queue: lc.q, modes: [mode] };
    L.sessions.unshift(s); if (L.sessions.length > 200) L.sessions.length = 200;
    lc.mon = mode; persist();
    MCM.audit('Monitoring started', MODES[mode] + ' - ' + agName(lc.agent) + ' - call ' + lc.id + ' (' + MCM.qById[lc.q].name + ')');
    startTimer(); paintBar(); MCM.bus.emit('monsession', s);
    if (mode === 'takeover') takeover(s);
    else UI.toast(MODES[mode] + ' started on ' + agName(lc.agent) + '. ' + MODE_HINT[mode] + '. Demo: no real audio is routed.', { kind: 'ok', ms: 3500 });
  }
  function setMode(s, mode) {
    var lc = liveCall(s.call); if (!lc) { endSession(s, 'Call ended'); return; }
    if (s.mode === mode) return;
    s.mode = mode; (s.modes = s.modes || []).push(mode); lc.mon = mode; persist();
    MCM.audit('Monitoring mode changed', MODES[mode] + ' - ' + agName(s.agent) + ' - call ' + s.call);
    paintBar(); MCM.bus.emit('monsession', s);
  }
  function endSession(s, reason) {
    if (s.end) return; s.end = Date.now(); s.reason = reason || 'Ended'; var lc = liveCall(s.call); if (lc) lc.mon = null; persist();
    MCM.audit('Monitoring ended', MODES[s.mode] + ' - ' + agName(s.agent) + ' - call ' + s.call + ' - ' + f.dur((s.end - s.start) / 1000) + ' - ' + s.reason);
    paintBar(); MCM.bus.emit('monsession', s);
  }
  function takeover(s) {
    var lc = liveCall(s.call); if (!lc) { endSession(s, 'Call ended'); return; }
    if (!MCM.can('supervise')) return MCM.deny('take over calls');
    var me = MCM.user.id, lm = L.agents[me], old = lc.agent, lo = L.agents[old], now = Date.now();
    if (!lm) { UI.toast('Your user has no live state to take the call.', { kind: 'bad' }); return; }
    if (lo) { lo.status = 'wrap'; lo.since = now; lo.call = null; lo.wrapFor = 20; }
    lc.agent = me; if (lc.plan) lc.plan.agent = me; lm.status = 'on_call'; lm.since = now; lm.call = lc.id; lm.forced = false;
    s.mode = 'takeover'; (s.modes = s.modes || []).push('takeover'); s.takeoverFrom = old;
    MCM.pushEvent('takeover', lc.q, agName(me) + ' took over the call from ' + agName(old));
    MCM.audit('Call takeover', agName(old) + ' -> ' + agName(me) + ' - call ' + lc.id);
    endSession(s, 'Takeover by supervisor'); UI.toast('You have taken over the call from ' + agName(old), { kind: 'ok' });
  }
  startTimer(); paintBar();

  MCM.page({
    id: 'monitoring', title: 'Monitoring', icon: 'monitoring', filters: ['queue'], roles: ['Admin', 'Supervisor', 'Coach'], live: true, autoRefresh: false,
    tabs: [['calls', 'Live calls'], ['extensions', 'Extensions'], ['groups', 'Groups'], ['sessions', 'Sessions']],
    render: function (ctx) {
      var tab = ctx.tab, F = MCM.F;
      var qs = MCM.queues.filter(function (q) { return !F.queues.length || F.queues.indexOf(q.id) >= 0; }), qids = qs.map(function (q) { return q.id; });
      function inScope(q) { return qids.indexOf(q) >= 0; }
      function setTxt(el, v) { if (el && el.textContent !== v) el.textContent = v; }
      function paused() { var p = ctx.el.querySelector('#mn-pause'); if (p) p.style.display = L.running ? 'none' : 'flex'; return !L.running; }
      var canSup = MCM.can('supervise');
      var CSS = '<style>.mn-x{display:grid;grid-template-columns:repeat(auto-fill,minmax(25rem,1fr));gap:1.2rem}.mn-ext{border:1px solid var(--line);border-radius:.75rem;background:var(--surface);padding:1.2rem 1.4rem;cursor:pointer;border-left-width:.5rem}' +
        '.mn-ext:hover{border-color:var(--brand)}.mn-ext b{font-size:1.3rem}.mn-ext .s{font-size:1.1rem;margin-top:.5rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}.mn-ext .c{font-size:1.1rem;color:var(--muted);margin-top:.5rem;min-height:1.6rem}' +
        '.mn-sent{display:flex;align-items:center;gap:.8rem}.mn-sent .bar{width:9rem;position:relative}.mn-sent .bar i{position:absolute;top:0;bottom:0}.mn-b{display:flex;gap:.4rem}.mn-pause{display:none;margin-bottom:1.5rem}</style>';
      var PAUSE = '<div class="note warn mn-pause" id="mn-pause">' + UI.icon('pause') + '<span>Live updates are paused; durations and sentiment are frozen.</span></div>';
      var NOPERM = canSup ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + MCM.user.role + ') can view live calls but cannot listen, whisper, barge or take over. That needs the supervise permission.</div>';

      function sentCell(lc) {
        var v = lc.sent == null ? 0 : lc.sent, pos = v >= 0, w = Math.abs(v) * 50;
        return '<div class="mn-sent"><div class="bar"><i data-sb="' + lc.id + '" style="' + (pos ? 'left:50%;' : 'right:50%;') + 'width:' + w + '%;background:' + (v > .15 ? 'var(--ok-dot)' : v < -.15 ? 'var(--bad)' : 'var(--faint)') + ';border-radius:0"></i></div><span data-sv="' + lc.id + '" class="' + (v > .15 ? 'ok-t' : v < -.15 ? 'bad-t' : '') + '">' + f.dec(v, 2) + '</span></div>';
      }
      function patchSent(lc) {
        var v = lc.sent == null ? 0 : lc.sent, b = ctx.el.querySelector('[data-sb="' + lc.id + '"]'), t = ctx.el.querySelector('[data-sv="' + lc.id + '"]');
        if (b) { b.style.left = v >= 0 ? '50%' : ''; b.style.right = v < 0 ? '50%' : ''; b.style.width = Math.abs(v) * 50 + '%'; b.style.background = v > .15 ? 'var(--ok-dot)' : v < -.15 ? 'var(--bad)' : 'var(--faint)'; }
        if (t) { setTxt(t, f.dec(v, 2)); t.className = v > .15 ? 'ok-t' : v < -.15 ? 'bad-t' : ''; }
      }

      /* ================= LIVE CALLS ================= */
      if (tab === 'calls') {
        ctx.el.innerHTML = CSS + PAUSE + NOPERM + '<div class="grid g4">' + [UI.kpi({ label: 'Calls in progress', value: '0' }), UI.kpi({ label: 'Being monitored', value: '0' }), UI.kpi({ label: 'Negative sentiment', value: '0', sub: 'live sentiment below -0.15' }), UI.kpi({ label: 'Longest call', value: '0:00' })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Live calls', '<div id="mn-t"></div>', { flush: true, sub: 'Listen is silent, Whisper is heard only by the agent, Barge joins the call, Takeover moves the call to you. Every action is audit-logged.' }) + '</div>';
        var kp = ctx.el.querySelectorAll('.kpi');
        function rows() { return L.calls.filter(function (c) { return inScope(c.q); }).slice(); }
        function sig() { var s = active(); return rows().map(function (c) { return c.id + (c.mon || ''); }).join(',') + '|' + (s ? s.call + s.mode : ''); }
        var tbl = UI.table(ctx.el.querySelector('#mn-t'), { id: 'mncalls', noun: 'calls', csv: 'live-calls', pageSize: 15, rows: rows(), sort: 'dur', dir: 'desc', emptyTitle: 'No live calls', emptySub: 'There are no calls in progress for the selected queues.', cols: [
          { k: 'q', label: 'Queue', html: function (c) { return esc(MCM.qById[c.q].name); }, val: function (c) { return MCM.qById[c.q].name; } },
          { k: 'ag', label: 'Agent', html: function (c) { return '<b>' + esc(agName(c.agent)) + '</b>'; }, val: function (c) { return agName(c.agent); } },
          { k: 'from', label: 'Caller', html: function (c) { return esc(MCM.mask(c.from)); }, val: function (c) { return c.from; }, csv: function (c) { return MCM.mask(c.from); } },
          { k: 'dir', label: 'Dir', html: function (c) { return c.dir === 'in' ? 'In' : 'Out'; }, val: function (c) { return c.dir; } },
          { k: 'dur', label: 'Duration', r: 1, html: function (c) { return '<span class="mono" data-start="' + c.start + '">' + f.dur((Date.now() - c.start) / 1000) + '</span>'; }, val: function (c) { return Date.now() - c.start; }, csv: function (c) { return f.dur((Date.now() - c.start) / 1000); } },
          { k: 'sent', label: 'Live sentiment', html: sentCell, val: function (c) { return c.sent; }, csv: function (c) { return f.dec(c.sent, 2); } },
          { k: 'mon', label: 'Status', html: function (c) { return c.mon ? UI.tag(MODES[c.mon] + ' active', 'brand') : (c.hold ? UI.tag('On hold', 'warn') : UI.tag('Talking', 'ok')); }, val: function (c) { return c.mon || ''; } },
          { k: 'act', label: 'Supervise', noSort: true, noCsv: true, html: function (c) { return '<div class="mn-b">' + ['listen', 'whisper', 'barge', 'takeover'].map(function (m) { return '<button class="btn xs' + (c.mon === m ? ' pri' : '') + '" data-mon="' + m + '" data-call="' + c.id + '" title="' + MODE_HINT[m] + '"' + (canSup ? '' : ' disabled') + '>' + MODES[m] + '</button>'; }).join('') + '</div>'; } }
        ], onRow: function (c) { MCM.drill.agent(c.agent); } });
        var last = sig();
        ctx.on('[data-mon]', function (e, el) {
          if (!MCM.can('supervise')) return MCM.deny('monitor calls');
          var lc = liveCall(el.dataset.call); if (!lc) { UI.toast('That call has just ended.', { kind: 'bad' }); return; }
          start(lc, el.dataset.mon);
        });
        var patch = function () {
          if (paused()) return; var now = Date.now(), s = sig();
          if (s !== last) { last = s; tbl.setRows(rows()); }
          ctx.el.querySelectorAll('[data-start]').forEach(function (el) { setTxt(el, f.dur((now - +el.dataset.start) / 1000)); });
          var rs = rows(); rs.forEach(patchSent);
          var vals = [String(rs.length), String(rs.filter(function (c) { return c.mon; }).length), String(rs.filter(function (c) { return c.sent != null && c.sent < -0.15; }).length), f.dur(rs.length ? Math.max.apply(null, rs.map(function (c) { return (now - c.start) / 1000; })) : 0)];
          for (var i = 0; i < kp.length; i++) setTxt(kp[i].querySelector('.v'), vals[i]);
        };
        patch(); ctx.every(1000, patch); ctx.sub('monsession', function () { last = ''; patch(); });
      }

      /* ================= EXTENSIONS ================= */
      else if (tab === 'extensions') {
        var fl = MCM.store.get('monExtF', 'all');
        var agents = MCM.agents.filter(function (a) { return a.queues.some(inScope); });
        var FL = [['all', 'All'], ['on_call', 'On call'], ['available', 'Available'], ['wrap', 'Wrap-up'], ['away', 'Break / other']];
        function match(st) { return fl === 'all' || (fl === 'away' ? ['break', 'lunch', 'dnd', 'training', 'offline'].indexOf(st) >= 0 : st === fl); }
        ctx.el.innerHTML = CSS + PAUSE + '<div style="margin-bottom:1.5rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap">' + UI.seg(FL, fl, 'xf', 'sm') + '<span class="muted" id="mn-xc"></span></div><div class="mn-x" id="mn-x">' + agents.map(function (a) {
          return '<div class="mn-ext" data-ag="' + a.id + '"><div style="display:flex;justify-content:space-between;gap:.8rem"><b>' + esc(a.name) + '</b><span class="muted mono">' + a.ext + '</span></div><div class="s"><span data-st></span><span class="muted" data-t></span></div><div class="c" data-c></div></div>';
        }).join('') + '</div>';
        ctx.on('[data-xf]', function (e, el) { MCM.store.set('monExtF', el.dataset.xf); ctx.refresh(); });
        ctx.on('[data-ag]', function (e, el) { MCM.drill.agent(el.dataset.ag); });
        var patchX = function () {
          if (paused()) return; var now = Date.now(), shown = 0;
          agents.forEach(function (a) {
            var el = ctx.el.querySelector('[data-ag="' + a.id + '"]'); if (!el) return; var s = L.agents[a.id], ok = match(s.status); el.style.display = ok ? '' : 'none'; if (ok) shown++;
            el.style.borderLeftColor = MCM.STATUS[s.status][1];
            var st = el.querySelector('[data-st]'); if (st.dataset.v !== s.status) { st.dataset.v = s.status; st.innerHTML = UI.status(s.status); }
            setTxt(el.querySelector('[data-t]'), f.dur((now - s.since) / 1000));
            var lc = s.call && liveCall(s.call), c = el.querySelector('[data-c]');
            var txt = lc ? MCM.qById[lc.q].name + ' - ' + MCM.mask(lc.from) + ' - ' + f.dur((now - lc.start) / 1000) + (lc.mon ? ' - ' + MODES[lc.mon] : '') : a.team + ' - ' + a.site;
            setTxt(c, txt);
          });
          setTxt(ctx.el.querySelector('#mn-xc'), shown + ' of ' + agents.length + ' extensions');
        };
        patchX(); ctx.every(1000, patchX);
      }

      /* ================= GROUPS ================= */
      else if (tab === 'groups') {
        ctx.el.innerHTML = CSS + PAUSE + '<div class="grid g2">' + UI.card('By queue', '<div id="mn-gq"></div>', { flush: true, sub: 'Agents are counted once per queue they serve.' }) + UI.card('By team', '<div id="mn-gt"></div>', { flush: true }) + '</div>';
        function counts(list) { var c = { staffed: 0, available: 0, on_call: 0, wrap: 0, away: 0, offline: 0 }; list.forEach(function (a) { var s = L.agents[a.id].status; if (s === 'offline') c.offline++; else { c.staffed++; if (s === 'available' || s === 'on_call' || s === 'wrap') c[s]++; else c.away++; } }); return c; }
        function col(k, label, fn) { return { k: k, label: label, r: 1, html: function (r) { return fn(r); }, val: fn }; }
        function qrows() { return qs.map(function (q) { var ag = MCM.agents.filter(function (a) { return a.queues.indexOf(q.id) >= 0; }); return { name: q.name, id: q.id, c: counts(ag), w: L.waiting.filter(function (x) { return x.q === q.id; }).length, calls: L.calls.filter(function (x) { return x.q === q.id; }).length }; }); }
        function trows() { return MCM.teams.map(function (t) { var ag = MCM.agents.filter(function (a) { return a.team === t && a.queues.some(inScope); }); return { name: t, c: counts(ag), w: 0, calls: ag.filter(function (a) { return L.agents[a.id].status === 'on_call'; }).length }; }); }
        function cols(first) { return [{ k: 'n', label: first, html: function (r) { return '<b>' + esc(r.name) + '</b>'; }, val: function (r) { return r.name; } }, col('st', 'Staffed', function (r) { return r.c.staffed; }), col('av', 'Available', function (r) { return r.c.available; }), col('oc', 'On call', function (r) { return r.c.on_call; }), col('wr', 'Wrap-up', function (r) { return r.c.wrap; }), col('aw', 'Break / other', function (r) { return r.c.away; }), col('of', 'Offline', function (r) { return r.c.offline; }), col('ca', 'Live calls', function (r) { return r.calls; })]; }
        var qcols = cols('Queue').concat([col('wt', 'Waiting', function (r) { return r.w; })]);
        var tq = UI.table(ctx.el.querySelector('#mn-gq'), { id: 'mngq', noun: 'queues', csv: 'monitoring-queues', search: false, colChooser: false, pageSize: 20, rows: qrows(), cols: qcols, onRow: function (r) { MCM.drill.queue(r.id); } });
        var tt = UI.table(ctx.el.querySelector('#mn-gt'), { id: 'mngt', noun: 'teams', csv: 'monitoring-teams', search: false, colChooser: false, pageSize: 20, rows: trows(), cols: cols('Team') });
        var patchG = function () { if (paused() || document.querySelector('.pop')) return; tq.setRows(qrows()); tt.setRows(trows()); };
        paused(); ctx.every(3000, patchG);
      }

      /* ================= SESSIONS ================= */
      else if (tab === 'sessions') {
        function srows() { return L.sessions.filter(function (s) { return inScope(s.queue); }); }
        ctx.el.innerHTML = CSS + '<div class="grid g3">' + [UI.kpi({ label: 'Sessions', value: f.n(srows().length) }), UI.kpi({ label: 'Active now', value: String(srows().filter(function (s) { return !s.end; }).length) }), UI.kpi({ label: 'Takeovers', value: String(srows().filter(function (s) { return s.takeoverFrom; }).length) })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Monitoring session history', '<div id="mn-s"></div>', { flush: true, sub: 'Every listen, whisper, barge and takeover is recorded here and in the audit log.' }) + '</div>';
        var dur = function (s) { return ((s.end || Date.now()) - s.start) / 1000; };
        var st = UI.table(ctx.el.querySelector('#mn-s'), { id: 'mnsess', noun: 'sessions', csv: 'monitoring-sessions', pageSize: 12, rows: srows(), sort: 'start', onRow: function (s) { MCM.drill.agent(s.agent); }, emptyTitle: 'No monitoring sessions yet', emptySub: 'Start one from the Live calls tab.', cols: [
          { k: 'start', label: 'Started', html: function (s) { return '<b>' + T.dt(s.start) + '</b>'; }, val: function (s) { return s.start; }, csv: function (s) { return T.dt(s.start); } },
          { k: 'sup', label: 'Supervisor', html: function (s) { return esc(agName(s.supervisor)); }, val: function (s) { return agName(s.supervisor); } },
          { k: 'ag', label: 'Agent', html: function (s) { return esc(agName(s.agent)); }, val: function (s) { return agName(s.agent); } },
          { k: 'q', label: 'Queue', html: function (s) { return esc((MCM.qById[s.queue] || {}).name); }, val: function (s) { return (MCM.qById[s.queue] || {}).name; } },
          { k: 'call', label: 'Call', html: function (s) { return '<span class="mono">' + s.call + '</span>'; }, val: function (s) { return s.call; } },
          { k: 'mode', label: 'Mode', html: function (s) { return UI.tag(MODES[s.mode] || s.mode, s.mode === 'takeover' ? 'warn' : s.mode === 'barge' ? 'info' : 'brand'); }, val: function (s) { return s.mode; }, csv: function (s) { return MODES[s.mode]; } },
          { k: 'modes', label: 'Modes used', html: function (s) { return esc((s.modes || [s.mode]).map(function (m) { return MODES[m]; }).join(' > ')); }, val: function (s) { return (s.modes || [s.mode]).join(' > '); } },
          { k: 'dur', label: 'Duration', r: 1, html: function (s) { return f.dur(dur(s)); }, val: dur, csv: function (s) { return f.dur(dur(s)); } },
          { k: 'end', label: 'Outcome', html: function (s) { return s.end ? esc(s.reason || 'Ended') : UI.tag('Active', 'ok'); }, val: function (s) { return s.end ? s.reason || 'Ended' : 'Active'; } }
        ] });
        ctx.sub('monsession', function () { ctx.refresh(); });
      }
    }
  });
})();
