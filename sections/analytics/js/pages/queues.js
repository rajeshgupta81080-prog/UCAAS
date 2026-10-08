/* Queues - overview, interval report, abandon analysis, manage (SL goals, join/leave). Reference page for the other pages. */
MCM.page({
  id: 'queues', title: 'Queues', icon: 'queues', filters: ['date', 'queue', 'channel'],
  tabs: [['overview', 'Overview'], ['interval', 'Interval report'], ['abandon', 'Abandon analysis'], ['manage', 'Manage queues']],
  render: function (ctx) {
    var UI = window.UI, f = UI.f, T = MCM.T, R = ctx.R, tab = ctx.tab;
    var list = ctx.q({ dir: 'in' }), g = MCM.agg(list), prevG = R.compare ? MCM.agg(ctx.prev({ dir: 'in' })) : null;
    var step = MCM.stepFor(R), lab = function (t) { return step >= T.day ? T.dm(t) : T.time(t); };
    var qsAll = MCM.queues.filter(function (q) { return !MCM.F.queues.length || MCM.F.queues.indexOf(q.id) >= 0; });
    var goal = qsAll.length === 1 ? qsAll[0].sl.target : 80;

    function kpis() {
      var bk = MCM.buckets(list, R.from, R.to, step);
      return '<div class="grid g5">' + [
        UI.kpi({ label: 'Offered', value: f.n(g.offered), def: 'offered', delta: prevG && UI.delta(g.offered, prevG.offered), spark: bk.map(function (b) { return b.agg.offered; }) }),
        UI.kpi({ label: 'Service level', value: f.pct(g.sl, 1), def: 'sl', status: g.sl == null ? '' : UI.slClass(g.sl, goal), delta: prevG && UI.delta(g.sl, prevG.sl, { dec: 1, fmt: function (d) { return f.dec(d, 1) + ' pts'; } }), sub: 'goal ' + goal + '%', spark: bk.map(function (b) { return b.agg.sl || 0; }), color: 'var(--c3)' }),
        UI.kpi({ label: 'Avg speed of answer', value: f.dur(g.asa), def: 'asa', delta: prevG && UI.delta(g.asa, prevG.asa, { good: 'down', fmt: function (d) { return f.dur(Math.abs(d)); } }) }),
        UI.kpi({ label: 'Abandon rate', value: f.pct(g.abandonRate), def: 'abandonRate', status: g.abandonRate > 10 ? 'bad' : g.abandonRate > 6 ? 'warn' : 'ok', delta: prevG && UI.delta(g.abandonRate, prevG.abandonRate, { good: 'down', dec: 1, fmt: function (d) { return f.dec(d, 1) + ' pts'; } }), sub: f.n(g.abandoned) + ' abandoned' }),
        UI.kpi({ label: 'Avg handle time', value: f.dur(g.aht), def: 'aht', delta: prevG && UI.delta(g.aht, prevG.aht, { good: 'down', fmt: function (d) { return f.dur(Math.abs(d)); } }) })
      ].join('') + '</div>';
    }
    function rowsFor() {
      var by = MCM.groupBy(list, function (c) { return c.q; });
      return qsAll.map(function (q) { var l = by[q.id] || [], a = MCM.agg(l), lq = MCM.liveQueue(q.id, 15); return { q: q, g: a, lq: lq }; });
    }
    function qTable(host) {
      UI.table(host, {
        id: 'qtbl', noun: 'queues', csv: 'queues', pageSize: 20, rows: rowsFor(), sort: 'off', onRow: function (r) { MCM.drill.queue(r.q.id); },
        cols: [
          { k: 'n', label: 'Queue', html: function (r) { return '<b>' + UI.esc(r.q.name) + '</b> <span class="muted">' + r.q.ext + '</span>'; }, val: function (r) { return r.q.name; } },
          { k: 'ch', label: 'Channel', html: function (r) { return UI.tag(r.q.channel); }, val: function (r) { return r.q.channel; } },
          { k: 'off', label: 'Offered', r: 1, html: function (r) { return f.n(r.g.offered); }, val: function (r) { return r.g.offered; } },
          { k: 'ans', label: 'Answered', r: 1, html: function (r) { return f.n(r.g.answered); }, val: function (r) { return r.g.answered; } },
          { k: 'ab', label: 'Abandoned', r: 1, html: function (r) { return f.n(r.g.abandoned); }, val: function (r) { return r.g.abandoned; } },
          { k: 'abr', label: 'Abandon %', r: 1, html: function (r) { return '<span class="' + (r.g.abandonRate > r.q.abandonGoal ? 'bad-t' : '') + '">' + f.pct(r.g.abandonRate) + '</span>'; }, val: function (r) { return r.g.abandonRate; } },
          { k: 'asa', label: 'ASA', r: 1, html: function (r) { return '<span class="' + (r.g.asa > r.q.asaGoal ? 'warn-t' : '') + '">' + f.dur(r.g.asa) + '</span>'; }, val: function (r) { return r.g.asa; } },
          { k: 'aht', label: 'AHT', r: 1, html: function (r) { return f.dur(r.g.aht); }, val: function (r) { return r.g.aht; } },
          { k: 'sl', label: 'Service level', r: 1, html: function (r) { return UI.slCell(r.g.sl, r.q.sl.target); }, val: function (r) { return r.g.sl; } },
          { k: 'goal', label: 'Goal', r: 1, html: function (r) { return r.q.sl.target + '% / ' + r.q.sl.sec + 's'; }, val: function (r) { return r.q.sl.target; } },
          { k: 'w', label: 'Waiting now', r: 1, html: function (r) { return r.lq.waiting; }, val: function (r) { return r.lq.waiting; } },
          { k: 'av', label: 'Agents avail', r: 1, hide: false, html: function (r) { return r.lq.available + '/' + r.lq.staffed; }, val: function (r) { return r.lq.available; } }
        ],
        foot: function (l) { var a = MCM.agg(l.reduce(function (s, r) { return s.concat(by(r)); }, [])); function by(r) { return list.filter(function (c) { return c.q === r.q.id; }); } return '<tr><td>Total</td><td></td><td class="r">' + f.n(a.offered) + '</td><td class="r">' + f.n(a.answered) + '</td><td class="r">' + f.n(a.abandoned) + '</td><td class="r">' + f.pct(a.abandonRate) + '</td><td class="r">' + f.dur(a.asa) + '</td><td class="r">' + f.dur(a.aht) + '</td><td class="r">' + f.pct(a.sl) + '</td><td></td><td></td><td></td></tr>'; }
      });
    }

    if (tab === 'overview') {
      var bk = MCM.buckets(list, R.from, R.to, step);
      ctx.el.innerHTML = kpis() +
        '<div class="grid g21 mt">' + UI.card('Volume and service level', '<div id="c1"></div>', { sub: 'Hover for detail. Click a legend item to hide a series.', acts: UI.seg([['bar', 'Bar'], ['line', 'Line'], ['area', 'Area']], MCM.store.get('qct', 'bar'), 'ct', 'sm') }) + UI.card('Outcomes', '<div id="c2"></div>') + '</div>' +
        '<div class="grid g2 mt">' + UI.card('Offered by queue', '<div id="c3"></div>') + UI.card('Standouts', '<div id="c4"></div>') + '</div>' +
        '<div class="mt">' + UI.card('Queue summary', '<div id="qt"></div>', { flush: true, sub: 'Click a row to drill into the queue, then agent, then call.' }) + '</div>';
      function chart() {
        var ct = MCM.store.get('qct', 'bar'), type = ct === 'bar' ? 'bar' : ct;
        UI.chart(document.getElementById('c1'), { type: type, labels: bk.map(function (b) { return lab(b.t); }), height: 27, goal: undefined, series: [{ name: 'Offered', data: bk.map(function (b) { return b.agg.offered; }), color: 'var(--c2)' }, { name: 'Abandoned', data: bk.map(function (b) { return b.agg.abandoned; }), color: 'var(--c5)' }, { name: 'Service level %', axis: 'r', type: 'line', color: 'var(--c3)', data: bk.map(function (b) { return b.agg.sl == null ? null : +b.agg.sl.toFixed(1); }), fmt: function (v) { return f.pct(v); } }], fmt2: function (v) { return v.toFixed(0) + '%'; }, tipLabels: bk.map(function (b) { return T.dt(b.t); }) });
      }
      chart();
      UI.donut(document.getElementById('c2'), { items: [{ name: 'Answered', value: g.answered, color: 'var(--c3)' }, { name: 'Abandoned', value: g.abandoned, color: 'var(--c5)' }, { name: 'Voicemail', value: g.voicemail, color: 'var(--c4)' }], center: { v: f.pct(g.answerRate, 0), l: 'answered' } });
      var rs = rowsFor().filter(function (r) { return r.g.offered; });
      document.getElementById('c3').innerHTML = UI.hbars(rs.slice().sort(function (a, b) { return b.g.offered - a.g.offered; }).map(function (r) { return { label: r.q.name, value: r.g.offered }; }));
      var best = rs.slice().sort(function (a, b) { return (b.g.sl || 0) - (a.g.sl || 0); }), worst = rs.slice().sort(function (a, b) { return b.g.abandonRate - a.g.abandonRate; }), slowest = rs.slice().sort(function (a, b) { return b.g.asa - a.g.asa; });
      document.getElementById('c4').innerHTML = rs.length ? '<ul class="plain" style="font-size:1.25rem"><li>' + UI.tag('Best service level', 'ok') + ' <b>' + UI.esc(best[0].q.name) + '</b> ' + f.pct(best[0].g.sl) + '</li><li>' + UI.tag('Lowest service level', 'bad') + ' <b>' + UI.esc(best[best.length - 1].q.name) + '</b> ' + f.pct(best[best.length - 1].g.sl) + '</li><li>' + UI.tag('Highest abandon', 'bad') + ' <b>' + UI.esc(worst[0].q.name) + '</b> ' + f.pct(worst[0].g.abandonRate) + '</li><li>' + UI.tag('Longest ASA', 'warn') + ' <b>' + UI.esc(slowest[0].q.name) + '</b> ' + f.dur(slowest[0].g.asa) + '</li></ul>' : UI.empty('No data');
      qTable(document.getElementById('qt'));
      ctx.on('[data-ct]', function (e, el) { MCM.store.set('qct', el.dataset.ct); ctx.refresh(); });
      ctx.every(15000, function () { /* live tiles only */ var t = document.getElementById('qt'); if (t && !UI.drawerOpen()) qTable(t); });
    }

    else if (tab === 'interval') {
      var is = MCM.store.get('qint', 30), stepI = is * 60000, from = R.to - R.from > T.day * 3 ? R.to - T.day : R.from;
      var bi = MCM.buckets(list.filter(function (c) { return c.ts >= from; }), from, R.to, stepI);
      ctx.el.innerHTML = '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>Interval view for ' + T.dm(from) + (R.to - from > T.day ? ' (last 24 hours of the range)' : '') + '. Service level excludes abandons under 5 s.</span></div>' + UI.card('Interval report', '<div id="ic"></div><div id="it" style="margin-top:1.5rem"></div>', { flush: false, acts: UI.seg([[15, '15 min'], [30, '30 min'], [60, '60 min']], is, 'iv', 'sm') });
      UI.chart(document.getElementById('ic'), { type: 'bar', labels: bi.map(function (b) { return T.time(b.t); }), height: 22, series: [{ name: 'Offered', data: bi.map(function (b) { return b.agg.offered; }), color: 'var(--c2)' }, { name: 'Answered', data: bi.map(function (b) { return b.agg.answered; }), color: 'var(--c3)' }, { name: 'Abandoned', data: bi.map(function (b) { return b.agg.abandoned; }), color: 'var(--c5)' }, { name: 'SL %', axis: 'r', type: 'line', color: 'var(--c4)', data: bi.map(function (b) { return b.agg.sl == null ? null : +b.agg.sl.toFixed(1); }), fmt: function (v) { return f.pct(v); } }], fmt2: function (v) { return v.toFixed(0) + '%'; } });
      UI.table(document.getElementById('it'), { id: 'qint', noun: 'intervals', csv: 'queue-intervals', pageSize: 16, search: false, rows: bi.filter(function (b) { return b.agg.offered; }), sort: 't', dir: 'asc', cols: [{ k: 't', label: 'Interval', html: function (b) { return '<b>' + T.time(b.t) + '</b>'; }, val: function (b) { return b.t; } }, { k: 'o', label: 'Offered', r: 1, html: function (b) { return b.agg.offered; }, val: function (b) { return b.agg.offered; } }, { k: 'a', label: 'Answered', r: 1, html: function (b) { return b.agg.answered; }, val: function (b) { return b.agg.answered; } }, { k: 'ab', label: 'Abandoned', r: 1, html: function (b) { return b.agg.abandoned; }, val: function (b) { return b.agg.abandoned; } }, { k: 'sl', label: 'Service level', r: 1, html: function (b) { return UI.slCell(b.agg.sl, goal); }, val: function (b) { return b.agg.sl; } }, { k: 'asa', label: 'ASA', r: 1, html: function (b) { return f.dur(b.agg.asa); }, val: function (b) { return b.agg.asa; } }, { k: 'aht', label: 'AHT', r: 1, html: function (b) { return f.dur(b.agg.aht); }, val: function (b) { return b.agg.aht; } }] });
      ctx.on('[data-iv]', function (e, el) { MCM.store.set('qint', +el.dataset.iv); ctx.refresh(); });
    }

    else if (tab === 'abandon') {
      var ab = list.filter(function (c) { return c.outcome === 'abandoned'; }), shortN = ab.filter(function (c) { return c.wait < 5; }).length;
      var bins = [[0, 5, '< 5 s'], [5, 15, '5-15 s'], [15, 30, '15-30 s'], [30, 60, '30-60 s'], [60, 120, '1-2 min'], [120, 1e9, '> 2 min']].map(function (b) { return { label: b[2], value: ab.filter(function (c) { return c.wait >= b[0] && c.wait < b[1]; }).length }; });
      var byH = []; for (var h = 0; h < 24; h++) byH.push(ab.filter(function (c) { return T.hourOf(c.ts) === h; }).length);
      ctx.el.innerHTML = '<div class="grid g4">' + [UI.kpi({ label: 'Abandoned', value: f.n(g.abandoned), def: 'abandoned', sub: f.pct(g.abandonRate) + ' of offered' }), UI.kpi({ label: 'Short abandons (<5 s)', value: f.n(shortN), sub: 'excluded from service level' }), UI.kpi({ label: 'Avg wait before abandon', value: f.dur(g.avgAbWait) }), UI.kpi({ label: 'Voicemail left', value: f.n(g.voicemail) })].join('') + '</div>' +
        '<div class="grid g2 mt">' + UI.card('Where callers hang up', '<div id="a1"></div>') + UI.card('Time waited before abandoning', '<div id="a2"></div>') + '</div><div class="grid g2 mt">' + UI.card('Abandons by hour of day', '<div id="a3"></div>') + UI.card('Abandons by queue', '<div id="a4"></div>') + '</div>';
      UI.donut(document.getElementById('a1'), { items: [{ name: 'In IVR', value: g.ivrAb, color: 'var(--c4)' }, { name: 'In queue', value: g.qAb, color: 'var(--c5)' }, { name: 'While ringing', value: g.rAb, color: 'var(--c6)' }], center: { v: f.n(g.abandoned), l: 'abandoned' } });
      document.getElementById('a2').innerHTML = UI.hbars(bins, {});
      UI.chart(document.getElementById('a3'), { type: 'bar', labels: byH.map(function (_, i) { return i + ':00'; }), series: [{ name: 'Abandoned', data: byH, color: 'var(--c5)' }], height: 18, legend: false, tickEvery: 2 });
      var byq = MCM.groupBy(ab, function (c) { return c.q; });
      document.getElementById('a4').innerHTML = UI.hbars(Object.keys(byq).map(function (k) { return { label: MCM.qById[k].name, value: byq[k].length, go: null }; }).sort(function (a, b) { return b.value - a.value; }));
    }

    else if (tab === 'manage') {
      var can = MCM.can('manage-queues');
      ctx.el.innerHTML = (can ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + MCM.user.role + ') can view but not change queue settings.</div>') +
        UI.card('Queue settings', '<div id="mt"></div>', { flush: true, sub: 'Service-level goals are per queue. Changes are saved and written to the audit log.' });
      UI.table(document.getElementById('mt'), {
        id: 'qmgr', noun: 'queues', search: false, colChooser: false, pageSize: 20, rows: MCM.queues,
        cols: [
          { k: 'n', label: 'Queue', html: function (q) { return '<b>' + UI.esc(q.name) + '</b> <span class="muted">' + q.ext + '</span>'; }, val: function (q) { return q.name; } },
          { k: 'sl', label: 'SL target %', r: 1, noSort: 1, html: function (q) { return '<input class="inp sm" style="min-width:6rem;width:7rem" type="number" min="1" max="100" data-q="' + q.id + '" data-k="target" value="' + q.sl.target + '"' + (can ? '' : ' disabled') + '>'; } },
          { k: 'sec', label: 'Threshold (s)', r: 1, noSort: 1, html: function (q) { return '<input class="inp sm" style="min-width:6rem;width:7rem" type="number" min="1" data-q="' + q.id + '" data-k="sec" value="' + q.sl.sec + '"' + (can ? '' : ' disabled') + '>'; } },
          { k: 'asa', label: 'ASA goal (s)', r: 1, noSort: 1, html: function (q) { return '<input class="inp sm" style="min-width:6rem;width:7rem" type="number" min="1" data-q="' + q.id + '" data-k="asaGoal" value="' + q.asaGoal + '"' + (can ? '' : ' disabled') + '>'; } },
          { k: 'ab', label: 'Abandon goal %', r: 1, noSort: 1, html: function (q) { return '<input class="inp sm" style="min-width:6rem;width:7rem" type="number" min="1" data-q="' + q.id + '" data-k="abandonGoal" value="' + q.abandonGoal + '"' + (can ? '' : ' disabled') + '>'; } },
          { k: 'ag', label: 'Members', r: 1, html: function (q) { return MCM.agents.filter(function (a) { return a.queues.indexOf(q.id) >= 0; }).length; }, val: function (q) { return MCM.agents.filter(function (a) { return a.queues.indexOf(q.id) >= 0; }).length; } },
          { k: 'act', label: 'Accepting calls', noSort: 1, html: function (q) { return UI.sw(q.active, 'data-act="' + q.id + '"' + (can ? '' : ' disabled')); } }
        ]
      });
      ctx.el.addEventListener('change', function (e) {
        var i = e.target.closest('[data-q][data-k]'); if (!i || !can) return; var q = MCM.qById[i.dataset.q], k = i.dataset.k, v = +i.value;
        if (k === 'target') q.sl.target = v; else if (k === 'sec') q.sl.sec = v; else q[k] = v; MCM.saveQueueCfg(); MCM.audit('Queue goal changed', q.name + ' ' + k + '=' + v); UI.toast('Saved ' + q.name, { kind: 'ok', ms: 1400 });
      });
      ctx.on('[data-act]', function (e, el) { if (!can) return MCM.deny('change queue status'); var q = MCM.qById[el.dataset.act]; q.active = !q.active; MCM.saveQueueCfg(); MCM.audit('Queue ' + (q.active ? 'enabled' : 'disabled'), q.name); ctx.refresh(); });
    }
  }
});
