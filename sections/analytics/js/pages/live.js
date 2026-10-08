/* Live - real-time operations: queue tiles with threshold colouring, waiting callers (assign), agent status, event feed + alerts.
   Structure is rendered once; values are patched in place every second (never a full re-render per tick). */
MCM.page({
  id: 'live', title: 'Live', icon: 'live', filters: ['queue'], live: true, autoRefresh: false,
  tabs: [['dashboard', 'Dashboard'], ['waiting', 'Waiting callers'], ['agents', 'Agent status'], ['feed', 'Feed and alerts']],
  render: function (ctx) {
    var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc, L = MCM.live, tab = ctx.tab, F = MCM.F;
    var qs = MCM.queues.filter(function (q) { return !F.queues.length || F.queues.indexOf(q.id) >= 0; });
    var qids = qs.map(function (q) { return q.id; });
    function inScope(qid) { return qids.indexOf(qid) >= 0; }
    function agentInScope(a) { return a.queues.some(inScope); }

    var CSS = '<style>.lv-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(32rem,1fr));gap:1.5rem}' +
      '.lv-tile{border:1px solid var(--line);border-radius:1.25rem;background:var(--surface);padding:1.4rem 1.6rem;cursor:pointer;box-shadow:var(--shadow)}' +
      '.lv-tile:hover{border-color:var(--brand)}.lv-tile.ok{box-shadow:inset 0 .35rem 0 var(--ok-dot),var(--shadow)}.lv-tile.warn{box-shadow:inset 0 .35rem 0 #f59e0b,var(--shadow)}.lv-tile.bad{box-shadow:inset 0 .35rem 0 var(--bad),var(--shadow)}' +
      '.lv-tile.off{opacity:.55}.lv-h{display:flex;align-items:center;gap:.8rem;margin-bottom:1.1rem}.lv-h b{font-size:1.4rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.lv-g{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem}.lv-c{border-radius:.75rem;padding:.8rem 1rem;background:var(--surface2)}.lv-c small{display:block;font-size:.95rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}' +
      '.lv-c b{font-size:2.2rem;font-weight:700;letter-spacing:-.02em}.lv-c.ok b{color:var(--ok)}.lv-c.warn{background:var(--warn-bg)}.lv-c.warn b{color:var(--warn)}.lv-c.bad{background:var(--bad-bg)}.lv-c.bad b{color:var(--bad)}' +
      '.lv-chips{display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:1.5rem}.lv-chip{border:1px solid var(--line);background:var(--surface);border-radius:.75rem;padding:.8rem 1.3rem;display:flex;align-items:center;gap:.8rem;font-size:1.2rem;font-weight:600}' +
      '.lv-chip.on{border-color:var(--brand);background:var(--brand-soft)}.lv-chip b{font-size:1.8rem}.lv-pause{display:none;margin-bottom:1.5rem}' +
      '.lv-al{display:flex;gap:1rem;align-items:center;padding:1rem 0;border-bottom:1px solid var(--line2)}.lv-al .grow{flex:1;min-width:0}</style>';
    var PAUSE = '<div class="note warn lv-pause" id="lv-pause">' + UI.icon('pause') + '<span>Live updates are paused. Press Live in the filter bar to resume; values below are frozen.</span></div>';

    /* ---------- threshold helpers (driven by MCM.alertRules, then queue config) ---------- */
    function thr(metric, qid) {
      var rs = MCM.alertRules.filter(function (r) { return r.enabled && r.metric === metric && (r.scope === 'all' || r.scope === qid); });
      rs.sort(function (a, b) { return (b.scope === qid ? 1 : 0) - (a.scope === qid ? 1 : 0); });
      if (rs.length) return rs[0].value;
      var m = MCM.ALERT_METRICS.filter(function (x) { return x[0] === metric; })[0]; return m ? m[4] : 0;
    }
    function high(v, bad, warn) { return v > bad ? 'bad' : v >= warn && v > 0 ? 'warn' : 'ok'; }
    function tones(q, lq) {
      var t = {};
      if (lq.agg.sl == null) t.sl = ''; else { var bad = Math.min(thr('sl', q.id), q.sl.target - 5); t.sl = lq.agg.sl >= q.sl.target ? 'ok' : lq.agg.sl >= bad ? 'warn' : 'bad'; }
      var lb = thr('longest', q.id); t.l = high(lq.longest, lb, lb * 0.6);
      var wb = thr('waiting', q.id); t.w = high(lq.waiting, wb, wb * 0.5);
      var na = thr('noagents', q.id); t.av = lq.available < na ? 'bad' : (lq.available === 1 && lq.waiting > 0 ? 'warn' : 'ok');
      var ab = thr('abandon', q.id); t.ab = lq.agg.offered >= 5 ? high(lq.agg.abandonRate, ab, Math.min(q.abandonGoal, ab * 0.7)) : '';
      t.ac = '';
      return t;
    }
    function worst(t) { var o = ['sl', 'l', 'w', 'av', 'ab'].map(function (k) { return t[k]; }); return o.indexOf('bad') >= 0 ? 'bad' : o.indexOf('warn') >= 0 ? 'warn' : 'ok'; }
    function setTxt(el, v) { if (el && el.textContent !== v) el.textContent = v; }
    function setCls(el, c) { if (el && el.className !== c) el.className = c; }
    function paused() { var p = ctx.el.querySelector('#lv-pause'); if (p) p.style.display = L.running ? 'none' : 'flex'; return !L.running; }
    function availAgents() { return MCM.agents.filter(function (a) { return agentInScope(a) && L.agents[a.id].status === 'available'; }); }
    function longestWait() { var now = Date.now(), m = 0; L.waiting.forEach(function (w) { if (inScope(w.q)) m = Math.max(m, (now - w.since) / 1000); }); return m; }
    function waitingList() { return L.waiting.filter(function (w) { return inScope(w.q); }); }

    /* ================= DASHBOARD ================= */
    if (tab === 'dashboard') {
      var todaySl = null, slAt = 0;
      var tiles = qs.map(function (q) {
        return '<div class="lv-tile" data-qt="' + q.id + '"><div class="lv-h"><b>' + esc(q.name) + '</b><span class="muted">' + q.ext + '</span><span class="tag" data-f="state"></span></div><div class="lv-g">' +
          [['w', 'Waiting'], ['l', 'Longest wait'], ['av', 'Avail / staffed'], ['ac', 'Active calls'], ['sl', 'SL 15 min'], ['ab', 'Abandon 15 min']].map(function (c) { return '<div class="lv-c" data-c="' + c[0] + '"><small>' + c[1] + '</small><b data-f="' + c[0] + '">-</b></div>'; }).join('') + '</div></div>';
      }).join('');
      var kp = [
        UI.kpi({ label: 'Live calls', value: '0', sub: 'in progress now' }), UI.kpi({ label: 'Callers waiting', value: '0', sub: 'across selected queues' }),
        UI.kpi({ label: 'Available agents', value: '0', sub: 'ready for a call' }), UI.kpi({ label: 'Longest wait', value: '0:00', def: 'asa', sub: 'current longest caller' }),
        UI.kpi({ label: 'Service level today', value: '-', def: 'sl', sub: 'since midnight' })];
      ctx.el.innerHTML = CSS + PAUSE + '<div class="grid g5 lv-kp">' + kp.join('') + '</div>' +
        '<div class="note mt">' + UI.icon('info') + '<span>Tile colours follow the alert rules in Alerts (service level, longest wait, callers waiting, available agents, abandon rate) and the queue service-level goal. Green = within goal, amber = approaching the alert threshold, red = breached. Click a tile to drill into the queue.</span></div>' +
        '<div class="lv-tiles mt">' + (tiles || UI.empty('No queues selected')) + '</div>';
      ctx.on('[data-qt]', function (e, el) { MCM.drill.queue(el.dataset.qt); });
      var kpEls = ctx.el.querySelectorAll('.lv-kp .kpi');
      var patchDash = function () {
        if (paused()) return;
        var now = Date.now();
        if (now - slAt > 5000) { slAt = now; todaySl = MCM.agg(ctx.q({ from: MCM.TODAY, to: now + 1, dir: 'in' })).sl; }
        var lw = longestWait(), av = availAgents().length, lc = L.calls.filter(function (c) { return inScope(c.q); }).length, wt = waitingList().length;
        var goal = qs.length === 1 ? qs[0].sl.target : 80;
        var vals = [String(lc), String(wt), String(av), f.dur(lw), f.pct(todaySl, 1)];
        var st = ['', high(wt, thr('waiting', 'all'), thr('waiting', 'all') * 0.5), av < 1 ? 'bad' : 'ok', high(lw, thr('longest', 'all'), thr('longest', 'all') * 0.6), todaySl == null ? '' : UI.slClass(todaySl, goal)];
        for (var i = 0; i < kpEls.length; i++) { setTxt(kpEls[i].querySelector('.v'), vals[i]); setCls(kpEls[i], 'card kpi ' + st[i]); }
        qs.forEach(function (q) {
          var tile = ctx.el.querySelector('[data-qt="' + q.id + '"]'); if (!tile) return;
          var lq = MCM.liveQueue(q.id, 15), t = tones(q, lq), w = worst(t);
          setCls(tile, 'lv-tile ' + (q.active ? w : 'off'));
          var vv = { w: String(lq.waiting), l: f.dur(lq.longest), av: lq.available + ' / ' + lq.staffed, ac: String(lq.active), sl: f.pct(lq.agg.sl, 0), ab: lq.agg.offered >= 5 ? f.pct(lq.agg.abandonRate, 1) : '-' };
          Object.keys(vv).forEach(function (k) { var c = tile.querySelector('[data-c="' + k + '"]'); setTxt(c.querySelector('b'), vv[k]); setCls(c, 'lv-c ' + (t[k] || '')); });
          var s = tile.querySelector('[data-f="state"]'); var lab = !q.active ? 'Off' : w === 'bad' ? 'Alert' : w === 'warn' ? 'Watch' : 'OK'; setTxt(s, lab); setCls(s, 'tag ' + (!q.active ? '' : w === 'bad' ? 'bad' : w === 'warn' ? 'warn' : 'ok'));
        });
      };
      patchDash(); ctx.every(1000, patchDash);
    }

    /* ================= WAITING ================= */
    else if (tab === 'waiting') {
      var canSup = MCM.can('supervise');
      ctx.el.innerHTML = CSS + PAUSE + '<div class="grid g3">' + [UI.kpi({ label: 'Callers waiting', value: '0' }), UI.kpi({ label: 'Longest wait', value: '0:00' }), UI.kpi({ label: 'Available agents', value: '0' })].join('') + '</div>' +
        '<div class="mt">' + UI.card('Hold queue', '<div id="lv-wt"></div>', { flush: true, sub: 'Callers waiting for an agent. Supervisors can assign a caller to an available agent in the same queue.' }) + '</div>';
      var wsig = '', wtbl, wk = ctx.el.querySelectorAll('.kpi');
      function wrows() { var now = Date.now(); return waitingList().map(function (w) { var qi = L.waiting.filter(function (x) { return x.q === w.q; }).indexOf(w) + 1; return { w: w, pos: qi, wait: (now - w.since) / 1000 }; }); }
      function wsigOf() { return waitingList().map(function (w) { return w.id; }).join(',') + '|' + availAgents().length; }
      function wcols() {
        return [
          { k: 'from', label: 'Caller', html: function (r) { return '<b>' + esc(MCM.mask(r.w.from)) + '</b>'; }, val: function (r) { return r.w.from; } },
          { k: 'q', label: 'Queue', html: function (r) { return esc(MCM.qById[r.w.q].name); }, val: function (r) { return MCM.qById[r.w.q].name; } },
          { k: 'pos', label: 'Position', r: 1, html: function (r) { return r.pos; }, val: function (r) { return r.pos; } },
          { k: 'wait', label: 'Waiting', r: 1, html: function (r) { return '<b data-since="' + r.w.since + '" data-qq="' + r.w.q + '">' + f.dur(r.wait) + '</b>'; }, val: function (r) { return r.wait; }, csv: function (r) { return f.dur(r.wait); } },
          { k: 'path', label: 'IVR path', html: function (r) { return esc(r.w.plan && r.w.plan.path ? r.w.plan.path.join(' > ') : '-'); }, val: function (r) { return r.w.plan && r.w.plan.path ? r.w.plan.path.join(' > ') : ''; } },
          { k: 'av', label: 'Agents available', r: 1, html: function (r) { return MCM.liveQueue(r.w.q, 15).available; }, val: function (r) { return MCM.liveQueue(r.w.q, 15).available; } },
          { k: 'act', label: 'Action', noSort: true, noCsv: true, html: function (r) { return '<button class="btn xs" data-assign="' + r.w.id + '"' + (canSup ? '' : ' title="Needs supervise permission"') + '>Assign to agent</button>'; } }
        ];
      }
      wtbl = UI.table(ctx.el.querySelector('#lv-wt'), { id: 'lvwait', noun: 'callers', csv: 'waiting-callers', pageSize: 15, rows: wrows(), sort: 'wait', dir: 'desc', emptyTitle: 'Nobody is waiting', emptySub: 'The hold queue is empty for the selected queues.', cols: wcols() });
      wsig = wsigOf();
      ctx.on('[data-assign]', function (e, el) {
        if (!MCM.can('supervise')) return MCM.deny('assign callers to agents');
        var w = L.waiting.filter(function (x) { return x.id === el.dataset.assign; })[0]; if (!w) { UI.toast('That caller is no longer waiting', { kind: 'bad' }); return; }
        var cands = MCM.agents.filter(function (a) { return a.queues.indexOf(w.q) >= 0 && L.agents[a.id].status === 'available'; });
        if (!cands.length) { UI.toast('No available agent in ' + MCM.qById[w.q].name, { kind: 'bad' }); return; }
        cands.sort(function (a, b) { return L.agents[a.id].since - L.agents[b.id].since; });
        UI.modal({ title: 'Assign caller to agent', body: '<p>Caller <b>' + esc(MCM.mask(w.from)) + '</b> waiting in <b>' + esc(MCM.qById[w.q].name) + '</b> for ' + f.dur((Date.now() - w.since) / 1000) + '.</p><div class="fg mt"><label>Available agent<select class="inp" id="lv-ag">' + UI.opts(cands.map(function (a) { return [a.id, a.name + ' (' + a.ext + ') - idle ' + f.dur((Date.now() - L.agents[a.id].since) / 1000)]; })) + '</select></label></div>',
          foot: [{ label: 'Cancel' }, { label: 'Assign', pri: true, fn: function (m) { var id = m.querySelector('#lv-ag').value; return assign(w.id, id); } }] });
      });
      var assign = function (wid, agId) {
        var w = L.waiting.filter(function (x) { return x.id === wid; })[0], la = L.agents[agId], a = MCM.aById[agId];
        if (!w) { UI.toast('That caller already left the queue', { kind: 'bad' }); return; }
        if (!la || la.status !== 'available') { UI.toast(a.name + ' is no longer available', { kind: 'bad' }); return false; }
        var now = Date.now(); L.waiting.splice(L.waiting.indexOf(w), 1);
        w.plan.wait = Math.round((now - w.since) / 1000); w.plan.agent = agId; w.plan.outcome = 'answered';
        var lc = { id: w.id, q: w.q, from: w.from, agent: agId, start: now, dir: w.plan.dir, plan: w.plan, sent: w.plan.sent == null ? 0.1 : w.plan.sent, mon: null, hold: false };
        lc.target = Math.max(40, w.plan.talk || 150);
        L.calls.push(lc); la.status = 'on_call'; la.since = now; la.call = lc.id;
        MCM.pushEvent('answer', w.q, a.name + ' answered ' + MCM.mask(w.from) + ' (assigned by supervisor)');
        MCM.audit('Assign waiting caller', MCM.mask(w.from) + ' (' + MCM.qById[w.q].name + ') -> ' + a.name);
        UI.toast('Caller assigned to ' + a.name, { kind: 'ok' }); patchWait(true); return true;
      };
      var patchWait = function (force) {
        if (paused() && force !== true) return;
        var now = Date.now(), s = wsigOf();
        if (s !== wsig || force === true) { wsig = s; wtbl.setRows(wrows()); }
        ctx.el.querySelectorAll('[data-since]').forEach(function (el) { var sec = (now - +el.dataset.since) / 1000; setTxt(el, f.dur(sec)); var bad = thr('longest', el.dataset.qq); setCls(el, sec > bad ? 'bad-t' : sec > bad * 0.6 ? 'warn-t' : ''); });
        var vals = [String(waitingList().length), f.dur(longestWait()), String(availAgents().length)];
        for (var i = 0; i < wk.length; i++) setTxt(wk[i].querySelector('.v'), vals[i]);
      };
      patchWait(); ctx.every(1000, patchWait);
    }

    /* ================= AGENTS ================= */
    else if (tab === 'agents') {
      var fil = MCM.store.get('liveAgSt', 'all'), can2 = MCM.can('supervise');
      var stKeys = Object.keys(MCM.STATUS);
      var chips = '<button class="lv-chip' + (fil === 'all' ? ' on' : '') + '" data-stf="all">All <b data-n="all">0</b></button>' + stKeys.map(function (k) { return '<button class="lv-chip' + (fil === k ? ' on' : '') + '" data-stf="' + k + '"><span class="sdot" style="background:' + MCM.STATUS[k][1] + '"></span>' + MCM.STATUS[k][0] + ' <b data-n="' + k + '">0</b></button>'; }).join('');
      ctx.el.innerHTML = CSS + PAUSE + '<div class="lv-chips">' + chips + '</div>' + UI.card('Agents', '<div id="lv-ag"></div>', { flush: true, sub: 'Time in status ticks live. Supervisors can force a status for agents who are not on a call.' });
      var scope = MCM.agents.filter(agentInScope);
      function arows() { var now = Date.now(); return scope.filter(function (a) { return fil === 'all' || L.agents[a.id].status === fil; }).map(function (a) { var s = L.agents[a.id]; return { a: a, s: s, sec: (now - s.since) / 1000 }; }); }
      function asig() { return fil + '|' + scope.map(function (a) { return L.agents[a.id].status + (L.agents[a.id].call || ''); }).join(','); }
      var atbl = UI.table(ctx.el.querySelector('#lv-ag'), { id: 'lvag', noun: 'agents', csv: 'agent-status', pageSize: 30, rows: arows(), sort: 'sec', dir: 'desc', onRow: function (r) { MCM.drill.agent(r.a.id); }, cols: [
        { k: 'n', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b> <span class="muted">' + r.a.ext + '</span>'; }, val: function (r) { return r.a.name; } },
        { k: 'team', label: 'Team', html: function (r) { return esc(r.a.team); }, val: function (r) { return r.a.team; } },
        { k: 'st', label: 'Status', html: function (r) { return UI.status(r.s.status); }, val: function (r) { return MCM.STATUS[r.s.status][0]; } },
        { k: 'sec', label: 'Time in status', r: 1, html: function (r) { return '<span data-since="' + r.s.since + '">' + f.dur(r.sec) + '</span>'; }, val: function (r) { return r.sec; }, csv: function (r) { return f.dur(r.sec); } },
        { k: 'call', label: 'Current call', html: function (r) { var c = r.s.call && L.calls.filter(function (x) { return x.id === r.s.call; })[0]; return c ? esc(MCM.qById[c.q].name) + ' <span class="muted">' + esc(MCM.mask(c.from)) + '</span>' : '<span class="faint">-</span>'; }, val: function (r) { return r.s.call || ''; } },
        { k: 'q', label: 'Queues', html: function (r) { return esc(r.a.queues.map(function (q) { return MCM.qById[q].name; }).join(', ')); }, val: function (r) { return r.a.queues.length; }, hide: false },
        { k: 'act', label: 'Supervisor', noSort: true, noCsv: true, html: function (r) { return '<button class="btn xs" data-force="' + r.a.id + '"' + (can2 ? '' : ' title="Needs supervise permission"') + '>Set status</button>'; } }
      ] });
      var asg = asig();
      ctx.on('[data-stf]', function (e, el) { MCM.store.set('liveAgSt', el.dataset.stf); ctx.refresh(); });
      ctx.on('[data-force]', function (e, el) {
        if (!MCM.can('supervise')) return MCM.deny('force agent status');
        var a = MCM.aById[el.dataset.force], la = L.agents[a.id];
        if (la.status === 'on_call') { UI.toast(a.name + ' is on a call; wait for it to finish or take over from Monitoring.', { kind: 'bad' }); return; }
        UI.pop(el, '<div class="hd">Set status - ' + esc(a.name) + '</div>' + stKeys.filter(function (k) { return k !== 'on_call'; }).map(function (k) { return '<button class="it" data-set="' + k + '"><span class="sdot" style="background:' + MCM.STATUS[k][1] + '"></span>' + MCM.STATUS[k][0] + '</button>'; }).join(''), function (pop) {
          pop.onclick = function (ev) {
            var b = ev.target.closest('[data-set]'); if (!b) return; var v = b.dataset.set;
            la.status = v; la.since = Date.now(); la.forced = v === 'dnd' || v === 'offline' || v === 'training'; la.call = null;
            MCM.audit('Force agent status', a.name + ' -> ' + v); UI.toast(a.name + ' set to ' + MCM.STATUS[v][0], { kind: 'ok' }); UI.closePop(); patchAg(true);
          };
        });
      });
      var patchAg = function (force) {
        if (paused() && force !== true) return;
        var now = Date.now(), cnt = { all: 0 }; stKeys.forEach(function (k) { cnt[k] = 0; });
        scope.forEach(function (a) { cnt.all++; cnt[L.agents[a.id].status]++; });
        Object.keys(cnt).forEach(function (k) { setTxt(ctx.el.querySelector('[data-n="' + k + '"]'), String(cnt[k])); });
        var s = asig(); if (s !== asg || force === true) { asg = s; atbl.setRows(arows()); }
        ctx.el.querySelectorAll('[data-since]').forEach(function (el) { setTxt(el, f.dur((now - +el.dataset.since) / 1000)); });
      };
      patchAg(); ctx.every(1000, patchAg);
    }

    /* ================= FEED + ALERTS ================= */
    else if (tab === 'feed') {
      ctx.el.innerHTML = CSS + PAUSE + '<div class="grid g2">' + UI.card('Live event feed', '<div class="feed" id="lv-feed" style="max-height:48rem"></div>', { sub: 'Answers and abandons as they happen (newest first).' }) +
        UI.card('Active alerts', '<div id="lv-al"></div>', { sub: 'Unresolved alerts from the alert rules. Acknowledge to silence the badge.', acts: '<button class="btn sm" data-ackall>Acknowledge all</button>' }) + '</div>';
      var fsig = '', asig2 = '';
      var patchFeed = function () {
        if (paused()) return;
        var ev = L.events.filter(function (e) { return !e.q || inScope(e.q); }).slice(0, 40), s = ev.length + ':' + (ev[0] ? ev[0].ts + ev[0].text : '');
        if (s !== fsig) { fsig = s; var h = ev.map(function (e) { var tg = e.type === 'abandon' ? 'bad' : e.type === 'answer' ? 'ok' : ''; return '<div><time>' + T.time(e.ts, true) + '</time><span class="tag ' + tg + '">' + esc(e.type) + '</span><span style="flex:1">' + (e.q && MCM.qById[e.q] ? '<b>' + esc(MCM.qById[e.q].name) + '</b> - ' : '') + esc(e.text) + '</span></div>'; }).join(''); ctx.el.querySelector('#lv-feed').innerHTML = h || UI.empty('No events yet', 'Events appear as calls are answered or abandoned.'); }
        var al = MCM.alerts.filter(function (a) { return !a.resolved; }), s2 = al.map(function (a) { return a.id + (a.ack ? 1 : 0); }).join(',');
        if (s2 !== asig2) {
          asig2 = s2;
          ctx.el.querySelector('#lv-al').innerHTML = al.length ? al.map(function (a) { return '<div class="lv-al"><span class="sdot" style="background:' + (a.sev === 'high' ? 'var(--bad)' : '#f59e0b') + '"></span><div class="grow"><b>' + esc(a.ruleName) + '</b><div class="muted">' + esc(a.scopeName) + ' - value ' + f.dec(a.value, 0) + ' (' + esc(a.op || '') + ' ' + a.threshold + ') - ' + f.ago(a.ts) + '</div></div>' + UI.tag(a.sev, a.sev === 'high' ? 'bad' : 'warn') + (a.ack ? UI.tag('Acknowledged', 'ok') : '<button class="btn xs" data-ack="' + a.id + '">Acknowledge</button>') + '</div>'; }).join('') : UI.empty('No active alerts', 'All monitored metrics are within their thresholds.');
        }
      };
      function ack(a) { a.ack = true; a.ackBy = (MCM.aById[MCM.user.id] || {}).name; MCM.audit('Alert acknowledged', a.ruleName + ' - ' + a.scopeName); }
      ctx.on('[data-ack]', function (e, el) { if (!MCM.can('alerts')) return MCM.deny('acknowledge alerts'); var a = MCM.alerts.filter(function (x) { return x.id === el.dataset.ack; })[0]; if (!a) return; ack(a); MCM.saveAlerts(); MCM.bus.emit('alerts'); asig2 = ''; patchFeed(); });
      ctx.on('[data-ackall]', function () { if (!MCM.can('alerts')) return MCM.deny('acknowledge alerts'); var n = 0; MCM.alerts.forEach(function (a) { if (!a.resolved && !a.ack) { ack(a); n++; } }); MCM.saveAlerts(); MCM.bus.emit('alerts'); asig2 = ''; patchFeed(); UI.toast(n + ' alert' + (n === 1 ? '' : 's') + ' acknowledged', { kind: 'ok', ms: 1800 }); });
      patchFeed(); ctx.every(1000, patchFeed);
      ctx.sub('alerts', function () { asig2 = ''; });
    }
  }
});
