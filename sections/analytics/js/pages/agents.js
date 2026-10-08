/* Agents - performance, live status board, leaderboard, skills & coverage. */
MCM.page({
  id: 'agents', title: 'Agents', icon: 'agents', filters: ['date', 'queue', 'team', 'channel'],
  tabs: [['performance', 'Performance'], ['status', 'Status'], ['leaderboard', 'Leaderboard'], ['skills', 'Skills']],
  render: function (ctx) {
    var UI = window.UI, f = UI.f, T = MCM.T, R = ctx.R, tab = ctx.tab, esc = UI.esc, F = MCM.F, goals = MCM.goals, live = MCM.live;
    var canSup = MCM.can('supervise');
    function csvName(n) { return MCM.can('export') ? n : undefined; }
    function inScope(a) {
      if (F.teams.length && F.teams.indexOf(a.team) < 0) return false;
      if (F.queues.length && !a.queues.some(function (q) { return F.queues.indexOf(q) >= 0; })) return false;
      if (F.channel !== 'all' && !a.queues.some(function (q) { return MCM.qById[q].channel === F.channel; })) return false;
      return true;
    }
    function durD(d) { return (d < 0 ? '-' : '') + f.dur(Math.abs(d)); }
    function stats(list, rng) { return MCM.agentStats(list, rng).filter(function (x) { return inScope(x.agent); }); }
    function ids(st) { var m = {}; st.forEach(function (x) { m[x.agent.id] = 1; }); return m; }
    function mean(arr) { arr = arr.filter(function (v) { return v != null; }); return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null; }
    function summarise(st, list) {
      var m = ids(st), g = MCM.agg(list.filter(function (c) { return c.agent && m[c.agent]; }));
      return { g: g, occ: mean(st.filter(function (x) { return x.staffed > 0; }).map(function (x) { return x.occupancy; })), adh: mean(st.map(function (x) { return x.adherence; })) };
    }
    function goalCls(v, goal, dir) { if (v == null) return ''; var ok = dir === 'low' ? v <= goal : v >= goal, near = dir === 'low' ? v <= goal * 1.1 : v >= goal * 0.95; return ok ? 'ok-t' : near ? 'warn-t' : 'bad-t'; }
    function statusCounts() { var c = {}; Object.keys(MCM.STATUS).forEach(function (k) { c[k] = 0; }); MCM.agents.filter(inScope).forEach(function (a) { var s = live.agents[a.id].status; c[s] = (c[s] || 0) + 1; }); return c; }
    function setStatus(id, v) {
      var la = live.agents[id], a = MCM.aById[id]; la.status = v; la.since = Date.now(); la.forced = v === 'dnd' || v === 'offline' || v === 'training'; la.call = null;
      MCM.audit('Force agent status', a.name + ' -> ' + v);
    }
    function paintLive() {
      UI.$$('[data-lst]', ctx.el).forEach(function (el) { var la = live.agents[el.dataset.lst]; if (la) { var h = UI.status(la.status); if (el.innerHTML !== h) el.innerHTML = h; } });
      UI.$$('[data-lsince]', ctx.el).forEach(function (el) { var la = live.agents[el.dataset.lsince]; if (la) el.textContent = f.dur((Date.now() - la.since) / 1000); });
      var c = statusCounts(); UI.$$('[data-cnt]', ctx.el).forEach(function (el) { el.textContent = c[el.dataset.cnt] || 0; });
    }
    var noPeriod = '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>Period: ' + esc(R.label) + '. Team, queue and channel filters apply to the agent list and to their calls. Statuses are live.</span></div>';

    /* ---------------- PERFORMANCE ---------------- */
    if (tab === 'performance') {
      var list = ctx.q({ dir: 'all' }), st = stats(list, R), S = summarise(st, list), g = S.g;
      var P = null; if (R.compare) { var pl = ctx.prev({ dir: 'all' }); P = summarise(stats(pl, { from: R.pfrom, to: R.pto }), pl); }
      var onShift = MCM.agents.filter(function (a) { return inScope(a) && live.agents[a.id].status !== 'offline'; }).length, scheduled = st.filter(function (x) { return x.sched > 0; }).length;
      var pp = function (d) { return (d >= 0 ? '+' : '') + f.dec(d, 1) + ' pts'; };
      var kp = '<div class="grid g4">' + [
        UI.kpi({ label: 'Agents on shift now', value: f.n(onShift), sub: f.n(scheduled) + ' scheduled in period' }),
        UI.kpi({ label: 'Calls handled', value: f.n(g.handled), delta: P && UI.delta(g.handled, P.g.handled) }),
        UI.kpi({ label: 'Avg handle time', value: f.dur(g.aht), def: 'aht', status: g.handled && g.aht > goals.aht ? 'warn' : '', delta: P && UI.delta(g.aht, P.g.aht, { good: 'down', fmt: durD }), sub: 'goal ' + f.dur(goals.aht) }),
        UI.kpi({ label: 'Avg occupancy', value: f.pct(S.occ, 0), def: 'occupancy', status: S.occ != null && S.occ > 90 ? 'warn' : '', delta: P && UI.delta(S.occ, P.occ, { fmt: pp }) })
      ].join('') + '</div><div class="grid g3 mt">' + [
        UI.kpi({ label: 'Avg adherence', value: f.pct(S.adh, 1), def: 'adherence', status: S.adh != null && S.adh < goals.adherence ? 'warn' : 'ok', delta: P && UI.delta(S.adh, P.adh, { fmt: pp }), sub: 'goal ' + goals.adherence + '%' }),
        UI.kpi({ label: 'Avg QA score', value: g.qa == null ? '-' : f.dec(g.qa, 1), def: 'qa', status: g.qa != null && g.qa < goals.qa ? 'warn' : 'ok', delta: P && UI.delta(g.qa, P.g.qa, { dec: 1, fmt: function (d) { return f.dec(d, 1); } }), sub: 'goal ' + goals.qa }),
        UI.kpi({ label: 'Avg CSAT', value: g.csat == null ? '-' : f.dec(g.csat, 2), def: 'csat', status: g.csat != null && g.csat < goals.csat ? 'warn' : 'ok', delta: P && UI.delta(g.csat, P.g.csat, { fmt: function (d) { return f.dec(d, 2); } }), sub: 'goal ' + goals.csat })
      ].join('') + '</div>';
      ctx.el.innerHTML = noPeriod + kp +
        '<div class="grid g2 mt">' + UI.card('Agent status now', '<div id="ag-do"></div>') + UI.card('Calls handled by agent', '<div id="ag-hb"></div>', { sub: 'Top 10 in the period' }) + '</div>' +
        '<div class="mt">' + UI.card('Agent performance', '<div id="ag-t"></div>', { flush: true, sub: 'Goals: AHT ' + f.dur(goals.aht) + ', adherence ' + goals.adherence + '%, QA ' + goals.qa + ', CSAT ' + goals.csat + '. Click a row to drill into the agent.' }) + '</div>';
      var sc = statusCounts();
      UI.donut(UI.$('#ag-do', ctx.el), { items: Object.keys(MCM.STATUS).filter(function (k) { return sc[k]; }).map(function (k) { return { name: MCM.STATUS[k][0], value: sc[k], color: MCM.STATUS[k][1] }; }), center: { v: f.n(onShift), l: 'on shift' } });
      var top = st.filter(function (x) { return x.handled; }).sort(function (a, b) { return b.handled - a.handled; }).slice(0, 10);
      UI.$('#ag-hb', ctx.el).innerHTML = top.length ? UI.hbars(top.map(function (x) { return { label: x.agent.name, value: x.handled, sub: x.agent.team }; })) : UI.empty('No calls handled', 'Try a wider date range.');
      var bulk = canSup ? [
        { label: 'Set status', fn: function (rows) { if (!rows.length) return; bulkStatus(rows); } },
        { label: 'Add to coaching', fn: function (rows) { if (!rows.length) return; bulkCoach(rows); } }
      ] : null;
      var tbl = UI.table(UI.$('#ag-t', ctx.el), {
        id: 'agperf', noun: 'agents', csv: csvName('agent-performance'), pageSize: 15, rows: st, sort: 'h', bulk: bulk, key: function (r) { return r.agent.id; },
        onRow: function (r) { MCM.drill.agent(r.agent.id); },
        cols: [
          { k: 'n', label: 'Agent', html: function (r) { return '<b>' + esc(r.agent.name) + '</b> <span class="muted">' + r.agent.ext + '</span>'; }, val: function (r) { return r.agent.name; } },
          { k: 'st', label: 'Status', html: function (r) { return '<span data-lst="' + r.agent.id + '">' + UI.status(live.agents[r.agent.id].status) + '</span>'; }, val: function (r) { return MCM.STATUS[live.agents[r.agent.id].status][0]; } },
          { k: 'ts', label: 'In status', r: 1, html: function (r) { return '<span class="mono" data-lsince="' + r.agent.id + '">' + f.dur((Date.now() - live.agents[r.agent.id].since) / 1000) + '</span>'; }, val: function (r) { return Date.now() - live.agents[r.agent.id].since; } },
          { k: 'team', label: 'Team', html: function (r) { return esc(r.agent.team); }, val: function (r) { return r.agent.team; } },
          { k: 'h', label: 'Handled', r: 1, html: function (r) { return f.n(r.handled); }, val: function (r) { return r.handled; } },
          { k: 'aht', label: 'AHT', r: 1, html: function (r) { return '<span class="' + (r.handled ? goalCls(r.agg.aht, goals.aht, 'low') : '') + '">' + f.dur(r.agg.aht) + '</span>'; }, val: function (r) { return r.agg.aht; } },
          { k: 'occ', label: 'Occupancy', r: 1, html: function (r) { return '<span class="' + (r.occupancy > 90 ? 'warn-t' : '') + '">' + f.pct(r.occupancy, 0) + '</span>'; }, val: function (r) { return r.occupancy; } },
          { k: 'adh', label: 'Adherence', r: 1, html: function (r) { return '<span class="' + goalCls(r.adherence, goals.adherence) + '">' + f.pct(r.adherence, 1) + '</span>'; }, val: function (r) { return r.adherence; } },
          { k: 'shr', label: 'Shrinkage', r: 1, html: function (r) { return f.pct(r.shrink, 1); }, val: function (r) { return r.shrink; } },
          { k: 'xf', label: 'Transfer %', r: 1, html: function (r) { return f.pct(r.agg.xferRate, 1); }, val: function (r) { return r.agg.xferRate; } },
          { k: 'qa', label: 'QA', r: 1, html: function (r) { return '<span class="' + goalCls(r.agg.qa, goals.qa) + '">' + (r.agg.qa == null ? '-' : f.dec(r.agg.qa, 1)) + '</span>'; }, val: function (r) { return r.agg.qa; } },
          { k: 'cs', label: 'CSAT', r: 1, html: function (r) { return '<span class="' + goalCls(r.agg.csat, goals.csat) + '">' + (r.agg.csat == null ? '-' : f.dec(r.agg.csat, 2)) + '</span>'; }, val: function (r) { return r.agg.csat; } },
          { k: 'fcr', label: 'FCR', r: 1, html: function (r) { return r.agg.answered ? f.pct(r.agg.fcrRate, 1) : '-'; }, val: function (r) { return r.agg.answered ? r.agg.fcrRate : null; } }
        ]
      });
      function bulkStatus(rows) {
        UI.modal({ title: 'Set status for ' + rows.length + ' agent' + (rows.length > 1 ? 's' : ''), body: '<label class="fg" style="display:grid;gap:.45rem;font-size:1.1rem;font-weight:600">New status<select class="inp" data-bs>' + UI.opts(Object.keys(MCM.STATUS).map(function (k) { return [k, MCM.STATUS[k][0]]; }), 'available') + '</select></label>', foot: [{ label: 'Cancel' }, { label: 'Apply', pri: true, fn: function (m) {
          if (!canSup) return MCM.deny('change agent status');
          var v = UI.$('[data-bs]', m).value; rows.forEach(function (r) { setStatus(r.agent.id, v); }); UI.toast(rows.length + ' agents set to ' + MCM.STATUS[v][0], { kind: 'ok' }); tbl.state.sel = {}; ctx.refresh();
        } }] });
      }
      function bulkCoach(rows) {
        var coaches = MCM.agents.filter(function (a) { return a.role === 'Supervisor' || a.role === 'Coach'; });
        UI.modal({ title: 'Add ' + rows.length + ' agent' + (rows.length > 1 ? 's' : '') + ' to coaching', body: '<div class="grid g2"><label style="display:grid;gap:.45rem;font-size:1.1rem;font-weight:600">Topic<select class="inp" data-ct>' + UI.opts(['Empathy', 'Hold etiquette', 'Compliance script', 'Upsell', 'De-escalation', 'Product knowledge', 'Call handling time']) + '</select></label><label style="display:grid;gap:.45rem;font-size:1.1rem;font-weight:600">Coach<select class="inp" data-cc>' + UI.opts(coaches.map(function (a) { return [a.id, a.name]; }), MCM.user.id) + '</select></label></div><label style="display:grid;gap:.45rem;font-size:1.1rem;font-weight:600;margin-top:1rem">Note<textarea class="inp" data-cn placeholder="Reason for coaching..."></textarea></label>', foot: [{ label: 'Cancel' }, { label: 'Create sessions', pri: true, fn: function (m) {
          if (!MCM.can('coach') && !canSup) return MCM.deny('create coaching sessions');
          var topic = UI.$('[data-ct]', m).value, coach = UI.$('[data-cc]', m).value, note = UI.$('[data-cn]', m).value || 'Added from Agents page.', now = Date.now();
          rows.forEach(function (r, i) { MCM.coachSessions.unshift({ id: 'co' + now + '_' + i, agent: r.agent.id, coach: coach, ts: now + 86400000, topic: topic, status: 'scheduled', note: note, score: null }); });
          MCM.saveCoach(); MCM.audit('Coaching added (bulk)', rows.map(function (r) { return r.agent.name; }).join(', ') + ' - ' + topic); UI.toast(rows.length + ' coaching session' + (rows.length > 1 ? 's' : '') + ' scheduled', { kind: 'ok' }); tbl.state.sel = {}; tbl.refresh();
        } }] });
      }
      if (!canSup) UI.$('#ag-t', ctx.el).insertAdjacentHTML('beforebegin', '<div class="note warn" style="margin:0 1.4rem 1rem">Bulk actions need the Supervisor role.</div>');
      ctx.every(1000, paintLive);
    }

    /* ---------------- STATUS ---------------- */
    else if (tab === 'status') {
      var sf = MCM.store.get('agstf', 'all'), order = ['available', 'on_call', 'wrap', 'break', 'lunch', 'dnd', 'training', 'offline'], cnt = statusCounts();
      var scope = MCM.agents.filter(inScope), rows = scope.filter(function (a) { return sf === 'all' || live.agents[a.id].status === sf; });
      ctx.el.innerHTML = '<div class="grid g4">' + order.map(function (k) { var s = MCM.STATUS[k]; return '<div class="card kpi click" data-stf="' + k + '" style="border-left:.4rem solid ' + s[1] + ';' + (sf === k ? 'outline:2px solid ' + s[1] + ';' : '') + '"><div class="lb">' + s[0] + '</div><div class="v" data-cnt="' + k + '">' + (cnt[k] || 0) + '</div><div class="d">click to filter</div></div>'; }).join('') + '</div>' +
        '<div class="mt">' + UI.card('Live agent status board', '<div id="st-t"></div>', { flush: true, sub: scope.length + ' agents in scope. Times tick every second.', acts: UI.seg([['all', 'All']].concat(order.map(function (k) { return [k, MCM.STATUS[k][0]]; })), sf, 'stf', 'sm') }) + '</div>' +
        (canSup ? '' : '<div class="note warn mt">Forcing a status needs the Supervisor role (you are ' + esc(MCM.user.role) + ').</div>');
      var forceOpts = '<option value="">Force status...</option>' + Object.keys(MCM.STATUS).map(function (k) { return '<option value="' + k + '">' + MCM.STATUS[k][0] + '</option>'; }).join('');
      var cols = [
        { k: 'n', label: 'Agent', html: function (a) { return '<b>' + esc(a.name) + '</b> <span class="muted">' + a.ext + '</span>'; }, val: function (a) { return a.name; } },
        { k: 'team', label: 'Team', html: function (a) { return esc(a.team); }, val: function (a) { return a.team; } },
        { k: 'st', label: 'Status', html: function (a) { return '<span data-lst="' + a.id + '">' + UI.status(live.agents[a.id].status) + '</span>'; }, val: function (a) { return MCM.STATUS[live.agents[a.id].status][0]; } },
        { k: 'ts', label: 'Time in status', r: 1, html: function (a) { return '<span class="mono" data-lsince="' + a.id + '">' + f.dur((Date.now() - live.agents[a.id].since) / 1000) + '</span>'; }, val: function (a) { return Date.now() - live.agents[a.id].since; } },
        { k: 'call', label: 'Current call / queue', html: function (a) { var lc = live.calls.filter(function (x) { return x.agent === a.id; })[0]; return lc ? esc(MCM.qById[lc.q].name) + ' <span class="muted">' + esc(MCM.mask(lc.from)) + '</span>' : '<span class="faint">-</span>'; }, val: function (a) { var lc = live.calls.filter(function (x) { return x.agent === a.id; })[0]; return lc ? MCM.qById[lc.q].name : ''; } },
        { k: 'qs', label: 'Queues', html: function (a) { return a.queues.map(function (q) { return esc(MCM.qById[q].name); }).join(', '); }, val: function (a) { return a.queues.length; } }
      ];
      if (canSup) cols.push({ k: 'force', label: 'Force status', noSort: true, noCsv: true, html: function (a) { return '<select class="inp sm" data-force="' + a.id + '" style="min-width:13rem">' + forceOpts + '</select>'; } });
      UI.table(UI.$('#st-t', ctx.el), { id: 'agst', noun: 'agents', csv: csvName('agent-status'), pageSize: 15, rows: rows, sort: 'st', dir: 'asc', onRow: function (a) { MCM.drill.agent(a.id); }, cols: cols });
      ctx.on('[data-stf]', function (e, el) { var k = el.dataset.stf; MCM.store.set('agstf', sf === k ? 'all' : k); ctx.refresh(); });
      ctx.el.addEventListener('change', function (e) {
        var sel = e.target.closest('[data-force]'); if (!sel || !sel.value) return;
        if (!canSup) { sel.value = ''; return MCM.deny('force agent status'); }
        var a = MCM.aById[sel.dataset.force]; setStatus(a.id, sel.value); UI.toast(esc(a.name) + ' set to ' + MCM.STATUS[sel.value][0], { kind: 'ok' }); ctx.refresh();
      });
      ctx.every(1000, paintLive);
      ctx.every(10000, function () { var ae = document.activeElement; if (UI.drawerOpen() || (ae && /input|select|textarea/i.test(ae.tagName))) return; ctx.refresh(); });
    }

    /* ---------------- LEADERBOARD ---------------- */
    else if (tab === 'leaderboard') {
      var METRICS = {
        handled: { label: 'Calls handled', dir: 'high', get: function (s) { return s.handled || null; }, fmt: function (v) { return f.n(v); }, goal: null },
        aht: { label: 'Avg handle time', dir: 'low', get: function (s) { return s.handled ? s.agg.aht : null; }, fmt: function (v) { return f.dur(v); }, goal: goals.aht },
        csat: { label: 'CSAT', dir: 'high', get: function (s) { return s.agg.csat; }, fmt: function (v) { return f.dec(v, 2); }, goal: goals.csat },
        qa: { label: 'QA score', dir: 'high', get: function (s) { return s.agg.qa; }, fmt: function (v) { return f.dec(v, 1); }, goal: goals.qa },
        adherence: { label: 'Adherence', dir: 'high', get: function (s) { return s.handled ? s.adherence : null; }, fmt: function (v) { return f.pct(v, 1); }, goal: goals.adherence },
        fcr: { label: 'First-contact resolution', dir: 'high', get: function (s) { return s.agg.answered ? s.agg.fcrRate : null; }, fmt: function (v) { return f.pct(v, 1); }, goal: goals.fcr || 85 }
      };
      var mk = MCM.store.get('aglbm', 'handled'); if (!METRICS[mk]) mk = 'handled'; var M = METRICS[mk];
      function ranked(sts) { return sts.map(function (s) { return { s: s, v: M.get(s) }; }).filter(function (x) { return x.v != null && x.s.handled > 0 && x.s.agent.role !== 'Admin'; }).sort(function (a, b) { return M.dir === 'low' ? a.v - b.v : b.v - a.v; }).map(function (x, i) { x.rank = i + 1; return x; }); }
      var llist = ctx.q({ dir: 'all' }), rk = ranked(stats(llist, R)), prevRank = {};
      if (R.compare) ranked(stats(ctx.prev({ dir: 'all' }), { from: R.pfrom, to: R.pto })).forEach(function (x) { prevRank[x.s.agent.id] = x.rank; });
      var maxV = rk.length ? Math.max.apply(null, rk.map(function (x) { return x.v; })) : 1;
      function prog(v) { var p = M.goal ? (M.dir === 'low' ? M.goal / v * 100 : v / M.goal * 100) : v / maxV * 100; return p; }
      var medal = ['#f59e0b', '#94a3b8', '#b45309'];
      function pod(x, i) { return '<div class="card click" data-ag="' + x.s.agent.id + '" style="text-align:center;border-top:.5rem solid ' + medal[i] + ';' + (i === 0 ? 'padding-top:2.4rem;padding-bottom:2.4rem;' : '') + '"><div style="font-size:2.6rem;font-weight:700;color:' + medal[i] + '">#' + x.rank + '</div><div style="font-size:1.5rem;font-weight:700;margin:.4rem 0">' + esc(x.s.agent.name) + '</div><div class="muted">' + esc(x.s.agent.team) + '</div><div style="font-size:2.4rem;font-weight:700;margin-top:.8rem">' + M.fmt(x.v) + '</div><div class="muted" style="font-size:1.1rem">' + esc(M.label) + '</div></div>'; }
      var podium = rk.length >= 3 ? '<div class="grid g3" style="align-items:end">' + pod(rk[1], 1) + pod(rk[0], 0) + pod(rk[2], 2) + '</div>' : rk.length ? '<div class="grid g3">' + rk.map(function (x, i) { return pod(x, i); }).join('') + '</div>' : '';
      ctx.el.innerHTML = noPeriod + '<div class="tb" style="margin-bottom:1.5rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap"><b>Rank by</b>' + UI.seg(Object.keys(METRICS).map(function (k) { return [k, METRICS[k].label]; }), mk, 'lbm', 'sm') + '<span class="muted">' + (M.dir === 'low' ? 'Lower is better.' : 'Higher is better.') + (M.goal ? ' Goal ' + M.fmt(M.goal) + '.' : '') + ' Period: ' + esc(R.label) + '</span></div>' +
        (rk.length ? podium + '<div class="mt">' + UI.card('Ranking', '<div id="lb-t"></div>', { flush: true, sub: 'Agents with at least one handled contact in the period.' }) + '</div>' : UI.card('Leaderboard', UI.empty('Nobody ranked', 'No agent has data for this metric in the selected period.')));
      if (rk.length) UI.table(UI.$('#lb-t', ctx.el), {
        id: 'aglb', noun: 'agents', csv: csvName('agent-leaderboard'), pageSize: 15, rows: rk, sort: 'rank', dir: 'asc', onRow: function (x) { MCM.drill.agent(x.s.agent.id); },
        cols: [
          { k: 'rank', label: 'Rank', html: function (x) { return '<b>#' + x.rank + '</b>'; }, val: function (x) { return x.rank; } },
          { k: 'mv', label: 'Move', noSort: true, html: function (x) { var p = prevRank[x.s.agent.id]; if (!R.compare) return '<span class="faint">-</span>'; if (!p) return UI.tag('new', 'info'); var d = p - x.rank; return d > 0 ? '<span class="ok-t">▲ ' + d + '</span>' : d < 0 ? '<span class="bad-t">▼ ' + (-d) + '</span>' : '<span class="muted">=</span>'; }, csv: function (x) { return prevRank[x.s.agent.id] ? prevRank[x.s.agent.id] - x.rank : ''; } },
          { k: 'n', label: 'Agent', html: function (x) { return '<b>' + esc(x.s.agent.name) + '</b>'; }, val: function (x) { return x.s.agent.name; } },
          { k: 'team', label: 'Team', html: function (x) { return esc(x.s.agent.team); }, val: function (x) { return x.s.agent.team; } },
          { k: 'v', label: M.label, r: 1, html: function (x) { return '<b>' + M.fmt(x.v) + '</b>'; }, val: function (x) { return x.v; } },
          { k: 'pg', label: M.goal ? 'Progress to goal' : 'Relative to leader', noSort: true, html: function (x) { var p = prog(x.v); return '<div style="min-width:14rem;display:flex;align-items:center;gap:.8rem">' + UI.bar(Math.min(100, p), 100, p >= 100 && M.goal ? 'ok' : '') + '<span class="muted" style="width:4.6rem;text-align:right">' + f.n(p, 0) + '%</span></div>'; }, csv: function (x) { return f.n(prog(x.v), 0) + '%'; } },
          { k: 'h', label: 'Handled', r: 1, html: function (x) { return f.n(x.s.handled); }, val: function (x) { return x.s.handled; } }
        ]
      });
      ctx.on('[data-lbm]', function (e, el) { MCM.store.set('aglbm', el.dataset.lbm); ctx.refresh(); });
      ctx.on('[data-ag]', function (e, el) { MCM.drill.agent(el.dataset.ag); });
    }

    /* ---------------- SKILLS ---------------- */
    else if (tab === 'skills') {
      var now = Date.now(), idx = Math.max(0, Math.min(47, Math.floor((now - MCM.TODAY) / 1800000)));
      var qsc = MCM.queues.filter(function (q) { return q.active && (!F.queues.length || F.queues.indexOf(q.id) >= 0) && (F.channel === 'all' || q.channel === F.channel); });
      var covRows = qsc.map(function (q) {
        var assigned = MCM.agents.filter(function (a) { return a.queues.indexOf(q.id) >= 0 && a.role !== 'Admin'; }), on = MCM.onShift(q, now), av = assigned.filter(function (a) { return live.agents[a.id].status === 'available'; }),
          req = MCM.forecast(q.id, MCM.TODAY)[idx].req, level = on.length < req ? 'bad' : (on.length === 0 || av.length === 0 || on.length < req * 1.15 ? 'warn' : 'ok');
        return { q: q, assigned: assigned.length, on: on.length, avail: av.length, req: req, level: level };
      });
      var under = covRows.filter(function (r) { return r.level === 'bad'; });
      var skillSet = {}; MCM.agents.forEach(function (a) { a.skills.forEach(function (s) { skillSet[s] = 1; }); }); var skills = Object.keys(skillSet).sort();
      var sa = MCM.agents.filter(inScope);
      ctx.el.innerHTML = '<div class="grid g4">' + [
        UI.kpi({ label: 'Queues covered', value: (covRows.length - under.length) + '/' + covRows.length, status: under.length ? 'bad' : 'ok', sub: under.length ? under.length + ' under-covered now' : 'all at or above requirement' }),
        UI.kpi({ label: 'Agents on shift now', value: f.n(sa.filter(function (a) { return MCM.shiftState(a, now) === 'work' && a.role !== 'Admin'; }).length), sub: 'of ' + sa.length + ' in scope' }),
        UI.kpi({ label: 'Available now', value: f.n(sa.filter(function (a) { return live.agents[a.id].status === 'available'; }).length) }),
        UI.kpi({ label: 'Skills tracked', value: f.n(skills.length), sub: skills.join(', ') })
      ].join('') + '</div>' +
        '<div class="grid g21 mt">' + UI.card('Coverage by queue (right now)', '<div id="sk-cov"></div>', { flush: true, sub: 'Required agents come from the interval forecast for the current half hour (' + T.time(MCM.TODAY + idx * 1800000) + ').' }) + UI.card('Agents per skill', '<div id="sk-hb"></div>') + '</div>' +
        '<div class="mt">' + UI.card('Skills matrix', '<div id="sk-mx"></div>', { flush: true, sub: 'Queue membership and skills per agent. Click a row to open the agent.' }) + '</div>';
      UI.table(UI.$('#sk-cov', ctx.el), {
        id: 'agcov', noun: 'queues', csv: csvName('queue-coverage'), search: false, colChooser: false, pageSize: 20, rows: covRows, sort: 'lvl', dir: 'desc', onRow: function (r) { MCM.drill.queue(r.q.id); },
        cols: [
          { k: 'n', label: 'Queue', html: function (r) { return '<b>' + esc(r.q.name) + '</b> <span class="muted">' + r.q.ext + '</span>'; }, val: function (r) { return r.q.name; } },
          { k: 'as', label: 'Assigned', r: 1, html: function (r) { return r.assigned; }, val: function (r) { return r.assigned; } },
          { k: 'on', label: 'On shift', r: 1, html: function (r) { return r.on; }, val: function (r) { return r.on; } },
          { k: 'av', label: 'Available', r: 1, html: function (r) { return r.avail; }, val: function (r) { return r.avail; } },
          { k: 'rq', label: 'Required', r: 1, html: function (r) { return r.req; }, val: function (r) { return r.req; } },
          { k: 'lvl', label: 'Coverage', html: function (r) { return r.level === 'bad' ? UI.tag('Under-covered (' + (r.on - r.req) + ')', 'bad') : r.level === 'warn' ? UI.tag('Thin', 'warn') : UI.tag('Covered', 'ok'); }, val: function (r) { return r.level === 'bad' ? 2 : r.level === 'warn' ? 1 : 0; }, csv: function (r) { return r.level; } }
        ]
      });
      UI.$('#sk-hb', ctx.el).innerHTML = UI.hbars(skills.map(function (s) { var ag = sa.filter(function (a) { return a.skills.indexOf(s) >= 0; }); return { label: s, value: ag.length, sub: ag.filter(function (a) { return MCM.shiftState(a, now) === 'work'; }).length + ' on shift' }; }));
      var qcols = MCM.queues.filter(function (q) { return !F.queues.length || F.queues.indexOf(q.id) >= 0; });
      var mcols = [{ k: 'n', label: 'Agent', html: function (a) { return '<b>' + esc(a.name) + '</b> <span class="muted">' + esc(a.team) + '</span>'; }, val: function (a) { return a.name; } }];
      qcols.forEach(function (q) { mcols.push({ k: 'q_' + q.id, label: esc(q.name), r: 1, html: function (a) { return a.queues.indexOf(q.id) >= 0 ? '<span class="ok-t">&#10003;</span>' : '<span class="faint">-</span>'; }, val: function (a) { return a.queues.indexOf(q.id) >= 0 ? 1 : 0; }, csv: function (a) { return a.queues.indexOf(q.id) >= 0 ? 'yes' : ''; } }); });
      skills.forEach(function (s) { mcols.push({ k: 's_' + s, label: esc(s), r: 1, hide: false, html: function (a) { return a.skills.indexOf(s) >= 0 ? UI.tag('yes', 'brand') : '<span class="faint">-</span>'; }, val: function (a) { return a.skills.indexOf(s) >= 0 ? 1 : 0; }, csv: function (a) { return a.skills.indexOf(s) >= 0 ? 'yes' : ''; } }); });
      UI.table(UI.$('#sk-mx', ctx.el), { id: 'agsk', noun: 'agents', csv: csvName('skills-matrix'), pageSize: 12, rows: sa, sort: 'n', dir: 'asc', onRow: function (a) { MCM.drill.agent(a.id); }, cols: mcols });
    }
  }
});
