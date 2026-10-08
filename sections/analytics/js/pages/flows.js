/* Flows - IVR flow analytics: overview, paths (menu option -> queue -> outcome, with a sankey-style diagram) and drop-off analysis. */
MCM.page({
  id: 'flows', title: 'Flows', icon: 'flows', filters: ['date', 'queue'],
  tabs: [['overview', 'Overview'], ['paths', 'Paths'], ['dropoff', 'Drop-off']],
  render: function (ctx) {
    var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc, R = ctx.R, tab = ctx.tab;
    var all = ctx.q({ dir: 'in' }).filter(function (c) { return c.flow; });
    var prevAll = R.compare ? ctx.prev({ dir: 'in' }).filter(function (c) { return c.flow; }) : null;
    var flows = MCM.flows;
    function byFlow(list, id) { return list.filter(function (c) { return c.flow === id; }); }
    function opt(c) { var p = c.path && c.path[1] || ''; var i = p.indexOf(':'); return i < 0 ? { k: p, n: p } : { k: p.slice(0, i), n: p.slice(i + 1) }; }
    function outcome(c) { return c.outcome === 'answered' ? 'Answered' : c.outcome === 'voicemail' ? 'Voicemail' : c.outcome === 'abandoned' ? (c.abandonStage === 'ivr' ? 'Abandoned in IVR' : 'Abandoned in queue') : 'No answer'; }
    function st(list) {
      var n = list.length, ivr = 0, ab = 0; list.forEach(function (c) { ivr += c.ivr || 0; if (c.outcome === 'abandoned' && c.abandonStage === 'ivr') ab++; });
      var routed = list.filter(function (c) { return !(c.outcome === 'abandoned' && c.abandonStage === 'ivr'); });
      return { n: n, avgIvr: n ? ivr / n : 0, ab: ab, abRate: n ? ab / n * 100 : 0, routed: routed.length, routedRate: n ? routed.length / n * 100 : 0, g: MCM.agg(routed) };
    }
    var CSS = '<style>.fl-sk svg{width:100%;height:auto;display:block}.fl-sk text{font-size:11px;fill:var(--ink2)}.fl-sk .h{font-size:10px;font-weight:700;fill:var(--muted);letter-spacing:.06em}.fl-rec{display:flex;gap:1rem;align-items:flex-start;padding:1rem 0;border-bottom:1px solid var(--line2);font-size:1.25rem}.fl-rec span.t{flex:1}</style>';
    var gAll = st(all), gPrev = prevAll ? st(prevAll) : null;
    var d = function (cur, prev, o) { return gPrev ? UI.delta(cur, prev, o) : null; };
    function noteBar() { return '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>Flow data comes from inbound calls routed through an IVR flow (' + f.n(all.length) + ' in ' + esc(R.label) + '). The chat queue has no IVR. Self-service containment is not recorded by the model, so "abandoned in IVR" is the only IVR exit measured.</span></div>'; }
    function kpis() {
      return '<div class="grid g4">' + [
        UI.kpi({ label: 'IVR entries', value: f.n(gAll.n), def: 'offered', delta: d(gAll.n, gPrev && gPrev.n), sub: flows.length + ' flows' }),
        UI.kpi({ label: 'Avg time in IVR', value: f.dur(gAll.avgIvr), delta: d(gAll.avgIvr, gPrev && gPrev.avgIvr, { good: 'down', fmt: function (x) { return f.dur(Math.abs(x)); } }), status: gAll.avgIvr > 30 ? 'warn' : 'ok', sub: 'per caller' }),
        UI.kpi({ label: 'Abandoned in IVR', value: f.pct(gAll.abRate, 1), def: 'abandoned', delta: d(gAll.abRate, gPrev && gPrev.abRate, { good: 'down', dec: 1, fmt: function (x) { return f.dec(x, 1) + ' pts'; } }), status: gAll.abRate > 3 ? 'bad' : gAll.abRate > 1.5 ? 'warn' : 'ok', sub: f.n(gAll.ab) + ' callers left the IVR' }),
        UI.kpi({ label: 'Routed to a queue', value: f.pct(gAll.routedRate, 1), sub: f.n(gAll.routed) + ' calls reached a queue' })
      ].join('') + '</div>';
    }

    /* ---------- flow drawer ---------- */
    function flowDrawer(fl) {
      var list = byFlow(all, fl.id), s = st(list), by = MCM.groupBy(list, function (c) { return opt(c).k; });
      var html = '<div style="display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:1.4rem">' + UI.tag('Ext ' + fl.ext) + UI.tag(fl.site) + UI.tag(fl.menus.length + ' menu options', 'brand') + (list.length ? '' : UI.tag('No calls in this period', 'warn')) + '</div>' +
        '<div class="grid g3">' + [UI.kpi({ label: 'Entries', value: f.n(s.n) }), UI.kpi({ label: 'Avg IVR time', value: f.dur(s.avgIvr) }), UI.kpi({ label: 'Abandoned in IVR', value: f.pct(s.abRate, 1), status: s.abRate > 3 ? 'bad' : 'ok' }), UI.kpi({ label: 'Routed calls SL', value: f.pct(s.g.sl, 1), def: 'sl' }), UI.kpi({ label: 'Routed ASA', value: f.dur(s.g.asa), def: 'asa' }), UI.kpi({ label: 'Routed abandon', value: f.pct(s.g.abandonRate, 1) })].join('') + '</div>' +
        '<h3 class="mt" style="margin-bottom:.8rem">Menu options</h3>' + UI.hbars(fl.menus.map(function (m) { var n = (by[m[0]] || []).length; return { label: m[0] + ' - ' + m[1], sub: '-> ' + (MCM.qById[m[2]] ? esc(MCM.qById[m[2]].name) : m[2] === 'vm' ? 'voicemail' : m[2] === 'cb' ? 'callback' : esc(m[2])), value: n, fmt: function (v) { return f.n(v) + (s.n ? ' (' + (v / s.n * 100).toFixed(1) + '%)' : ''); } }; }), {}) +
        '<div class="grid g2 mt"><div><h3 style="margin-bottom:.8rem">Outcomes</h3><div id="fd-do"></div></div><div><h3 style="margin-bottom:.8rem">Routed queues</h3><div id="fd-q" class="card flush"></div></div></div>';
      var body = UI.drawer(esc(fl.name), html, { sub: 'IVR flow ' + fl.ext + ' - ' + esc(R.label) }); MCM.audit('View flow', fl.name);
      var oc = ['Answered', 'Abandoned in queue', 'Abandoned in IVR', 'Voicemail'], cl = ['var(--c3)', 'var(--c5)', 'var(--c6)', 'var(--c4)'];
      UI.donut(body.querySelector('#fd-do'), { items: oc.map(function (o, i) { return { name: o, value: list.filter(function (c) { return outcome(c) === o; }).length, color: cl[i] }; }), center: { v: f.n(s.n), l: 'calls' } });
      var byq = MCM.groupBy(list, function (c) { return c.q; });
      UI.table(body.querySelector('#fd-q'), { id: 'fdq', noun: 'queues', search: false, colChooser: false, pageSize: 10, rows: Object.keys(byq).map(function (k) { return { q: MCM.qById[k], g: MCM.agg(byq[k]) }; }), onRow: function (r) { MCM.drill.queue(r.q.id); }, emptyTitle: 'No routed calls', cols: [
        { k: 'n', label: 'Queue', html: function (r) { return '<b>' + esc(r.q.name) + '</b>'; }, val: function (r) { return r.q.name; } }, { k: 'o', label: 'Calls', r: 1, html: function (r) { return f.n(r.g.total); }, val: function (r) { return r.g.total; } }, { k: 'sl', label: 'SL', r: 1, html: function (r) { return UI.slCell(r.g.sl, r.q.sl.target); }, val: function (r) { return r.g.sl; } }, { k: 'ab', label: 'Abandon', r: 1, html: function (r) { return f.pct(r.g.abandonRate); }, val: function (r) { return r.g.abandonRate; } }] });
    }

    /* ================= OVERVIEW ================= */
    if (tab === 'overview') {
      var step = MCM.stepFor(R), bk = MCM.buckets(all, R.from, R.to, step);
      var rows = flows.map(function (fl) { var l = byFlow(all, fl.id); return { f: fl, s: st(l) }; });
      ctx.el.innerHTML = CSS + noteBar() + kpis() +
        '<div class="grid g21 mt">' + UI.card('IVR entries and drop-off', '<div id="fl-c1"></div>', { sub: 'Calls entering any IVR flow, with the share that hung up inside the IVR.' }) + UI.card('Entries by flow', '<div id="fl-c2"></div>') + '</div>' +
        '<div class="mt">' + UI.card('Flows', '<div id="fl-t"></div>', { flush: true, sub: 'Click a flow for its menu, outcomes and routed queues.' }) + '</div>';
      UI.chart(ctx.el.querySelector('#fl-c1'), { type: 'bar', height: 24, labels: bk.map(function (b) { return step >= T.day ? T.dm(b.t) : T.time(b.t); }), tipLabels: bk.map(function (b) { return T.dt(b.t); }), fmt2: function (v) { return v.toFixed(0) + '%'; }, series: [
        { name: 'IVR entries', data: bk.map(function (b) { return b.list.length; }), color: 'var(--c2)' },
        { name: 'Abandoned in IVR %', axis: 'r', type: 'line', color: 'var(--c5)', data: bk.map(function (b) { var n = b.list.length; return n ? +(b.list.filter(function (c) { return c.outcome === 'abandoned' && c.abandonStage === 'ivr'; }).length / n * 100).toFixed(1) : null; }), fmt: function (v) { return f.pct(v); } }] });
      ctx.el.querySelector('#fl-c2').innerHTML = UI.hbars(rows.map(function (r) { return { label: r.f.name, value: r.s.n, sub: 'ext ' + r.f.ext }; }), {});
      UI.table(ctx.el.querySelector('#fl-t'), { id: 'flows', noun: 'flows', csv: 'ivr-flows', pageSize: 10, rows: rows, sort: 'n', onRow: function (r) { flowDrawer(r.f); }, cols: [
        { k: 'name', label: 'Flow', html: function (r) { return '<b>' + esc(r.f.name) + '</b>'; }, val: function (r) { return r.f.name; } },
        { k: 'ext', label: 'Ext', html: function (r) { return r.f.ext; }, val: function (r) { return r.f.ext; } },
        { k: 'site', label: 'Site', html: function (r) { return esc(r.f.site); }, val: function (r) { return r.f.site; } },
        { k: 'n', label: 'Entries', r: 1, html: function (r) { return f.n(r.s.n); }, val: function (r) { return r.s.n; } },
        { k: 'ivr', label: 'Avg IVR time', r: 1, html: function (r) { return f.dur(r.s.avgIvr); }, val: function (r) { return r.s.avgIvr; } },
        { k: 'ab', label: 'Abandon in IVR %', r: 1, html: function (r) { return '<span class="' + (r.s.abRate > 3 ? 'bad-t' : '') + '">' + (r.s.n ? f.pct(r.s.abRate, 1) : '-') + '</span>'; }, val: function (r) { return r.s.n ? r.s.abRate : null; } },
        { k: 'rt', label: 'Routed to queue', r: 1, html: function (r) { return f.n(r.s.routed); }, val: function (r) { return r.s.routed; } },
        { k: 'sl', label: 'SL of routed calls', r: 1, html: function (r) { var q = MCM.qById[r.f.menus[0][2]]; return UI.slCell(r.s.g.sl, q ? q.sl.target : 80); }, val: function (r) { return r.s.g.sl; } },
        { k: 'mn', label: 'Menu options', r: 1, html: function (r) { return r.f.menus.length; }, val: function (r) { return r.f.menus.length; } }
      ] });
    }

    /* ================= PATHS ================= */
    else if (tab === 'paths') {
      var sel = MCM.store.get('flwSel', 'all'); if (sel !== 'all' && !flows.some(function (x) { return x.id === sel; })) sel = 'all';
      var list = sel === 'all' ? all : byFlow(all, sel), fls = sel === 'all' ? flows : flows.filter(function (x) { return x.id === sel; });
      ctx.el.innerHTML = CSS + noteBar() + '<div style="margin-bottom:1.5rem">' + UI.seg([['all', 'All flows']].concat(flows.map(function (x) { return [x.id, x.name]; })), sel, 'fsel', 'sm') + '</div>' +
        '<div class="grid g2" id="fl-opts"></div><div class="mt">' + UI.card('Caller journey', '<div class="fl-sk" id="fl-sk"></div>', { sub: 'Flow, menu option, queue and outcome. Band width is the number of calls.' }) + '</div>' +
        '<div class="mt">' + UI.card('Path table', '<div id="fl-pt"></div>', { flush: true, sub: 'Flow > option > queue with outcomes. Click a row to open the queue.' }) + '</div>';
      ctx.on('[data-fsel]', function (e, el) { MCM.store.set('flwSel', el.dataset.fsel); ctx.refresh(); });
      ctx.el.querySelector('#fl-opts').innerHTML = fls.map(function (fl) {
        var l = byFlow(list, fl.id), by = MCM.groupBy(l, function (c) { return opt(c).k; });
        return UI.card(esc(fl.name) + ' - menu options', l.length ? UI.hbars(fl.menus.map(function (m) { var n = (by[m[0]] || []).length; return { label: m[0] + ' - ' + m[1], sub: MCM.qById[m[2]] ? esc(MCM.qById[m[2]].name) : esc(m[2] === 'vm' ? 'voicemail' : m[2] === 'cb' ? 'callback' : m[2]), value: n, fmt: function (v) { return f.n(v) + ' (' + (v / l.length * 100).toFixed(1) + '%)'; } }; }), {}) : UI.empty('No calls', 'Nothing entered this flow in the selected period.'), { sub: f.n(l.length) + ' calls' });
      }).join('');
      // path table
      var g = {}; list.forEach(function (c) { var o = opt(c), key = c.flow + '|' + o.k + '|' + c.q; var r = g[key] || (g[key] = { flow: MCM.flows.filter(function (x) { return x.id === c.flow; })[0], opt: o, q: MCM.qById[c.q], n: 0, ans: 0, abI: 0, abQ: 0, vm: 0, ivr: 0 }); r.n++; r.ivr += c.ivr || 0; var oc = outcome(c); if (oc === 'Answered') r.ans++; else if (oc === 'Abandoned in IVR') r.abI++; else if (oc === 'Abandoned in queue') r.abQ++; else if (oc === 'Voicemail') r.vm++; });
      UI.table(ctx.el.querySelector('#fl-pt'), { id: 'flpaths', noun: 'paths', csv: 'ivr-paths', pageSize: 12, sort: 'n', rows: Object.keys(g).map(function (k) { return g[k]; }), onRow: function (r) { MCM.drill.queue(r.q.id); }, cols: [
        { k: 'flow', label: 'Flow', html: function (r) { return '<b>' + esc(r.flow.name) + '</b>'; }, val: function (r) { return r.flow.name; } },
        { k: 'opt', label: 'Option', html: function (r) { return esc(r.opt.k + ' - ' + r.opt.n); }, val: function (r) { return r.opt.k + ' ' + r.opt.n; } },
        { k: 'q', label: 'Queue', html: function (r) { return esc(r.q.name); }, val: function (r) { return r.q.name; } },
        { k: 'n', label: 'Calls', r: 1, html: function (r) { return f.n(r.n); }, val: function (r) { return r.n; } },
        { k: 'ans', label: 'Answered', r: 1, html: function (r) { return f.n(r.ans); }, val: function (r) { return r.ans; } },
        { k: 'rate', label: 'Answer rate', r: 1, html: function (r) { var v = r.n ? r.ans / r.n * 100 : 0; return '<span class="' + (v < 80 ? 'bad-t' : v < 90 ? 'warn-t' : 'ok-t') + '">' + f.pct(v, 1) + '</span>'; }, val: function (r) { return r.n ? r.ans / r.n * 100 : 0; } },
        { k: 'abI', label: 'Abandoned in IVR', r: 1, html: function (r) { return f.n(r.abI); }, val: function (r) { return r.abI; } },
        { k: 'abQ', label: 'Abandoned in queue', r: 1, html: function (r) { return f.n(r.abQ); }, val: function (r) { return r.abQ; } },
        { k: 'vm', label: 'Voicemail', r: 1, html: function (r) { return f.n(r.vm); }, val: function (r) { return r.vm; } },
        { k: 'ivr', label: 'Avg IVR time', r: 1, html: function (r) { return f.dur(r.n ? r.ivr / r.n : 0); }, val: function (r) { return r.n ? r.ivr / r.n : 0; } }
      ] });
      sankey(ctx.el.querySelector('#fl-sk'), list);
    }

    /* ================= DROP-OFF ================= */
    else if (tab === 'dropoff') {
      var abI = function (c) { return c.outcome === 'abandoned' && c.abandonStage === 'ivr'; };
      var hrs = []; for (var h = 0; h < 24; h++) hrs.push({ h: h, n: 0, ab: 0 }); all.forEach(function (c) { var x = hrs[T.hourOf(c.ts)]; x.n++; if (abI(c)) x.ab++; });
      var peak = hrs.filter(function (x) { return x.n >= 10; }).sort(function (a, b) { return b.ab / b.n - a.ab / a.n; })[0];
      var abL = all.filter(abI), cmp = all.filter(function (c) { return !abI(c); });
      var avgAb = abL.length ? abL.reduce(function (s, c) { return s + (c.ivr || 0); }, 0) / abL.length : 0, avgOk = cmp.length ? cmp.reduce(function (s, c) { return s + (c.ivr || 0); }, 0) / cmp.length : 0;
      // option table
      var og = {}; all.forEach(function (c) { var o = opt(c), key = c.flow + '|' + o.k, fl = flows.filter(function (x) { return x.id === c.flow; })[0], r = og[key] || (og[key] = { flow: fl, k: o.k, name: o.n, n: 0, abI: 0, abQ: 0, vm: 0, ans: 0 }); r.n++; var oc = outcome(c); if (oc === 'Answered') r.ans++; else if (oc === 'Abandoned in IVR') r.abI++; else if (oc === 'Abandoned in queue') r.abQ++; else if (oc === 'Voicemail') r.vm++; });
      var orows = Object.keys(og).map(function (k) { var r = og[k]; r.tot = r.n ? (r.abI + r.abQ) / r.n * 100 : 0; r.share = 0; return r; });
      var flowN = {}; orows.forEach(function (r) { flowN[r.flow.id] = (flowN[r.flow.id] || 0) + r.n; }); orows.forEach(function (r) { r.share = r.n / flowN[r.flow.id] * 100; });
      var avgTot = all.length ? all.filter(function (c) { return c.outcome === 'abandoned'; }).length / all.length * 100 : 0;
      orows.forEach(function (r) { r.dead = r.n >= 20 && r.tot > avgTot * 1.3; });
      ctx.el.innerHTML = CSS + noteBar() + '<div class="grid g4">' + [
        UI.kpi({ label: 'Left in IVR', value: f.n(abL.length), def: 'abandoned', sub: f.pct(gAll.abRate, 1) + ' of entries' }),
        UI.kpi({ label: 'Avg IVR time (leavers)', value: f.dur(avgAb), sub: 'vs ' + f.dur(avgOk) + ' for callers who stayed' }),
        UI.kpi({ label: 'Peak drop-off hour', value: peak ? peak.h + ':00' : '-', sub: peak ? f.pct(peak.ab / peak.n * 100, 1) + ' left the IVR' : 'not enough volume' }),
        UI.kpi({ label: 'Dead-end options', value: String(orows.filter(function (r) { return r.dead; }).length), sub: 'abandon rate 30% above average' })].join('') + '</div>' +
        '<div class="grid g2 mt">' + UI.card('Drop-off by flow', '<div id="do-f"></div>') + UI.card('Drop-off by hour', '<div id="do-h"></div>') + '</div>' +
        '<div class="mt">' + UI.card('Where in the day callers leave, by flow', '<div id="do-m"></div>', { sub: 'Callers who hung up inside the IVR, per flow and hour.' }) + '</div>' +
        '<div class="mt">' + UI.card('Option dead-ends', '<div id="do-t"></div>', { flush: true, sub: 'Abandon rate after choosing an option (IVR + queue). Highlighted options lose noticeably more callers than average.' }) + '</div>' +
        '<div class="mt">' + UI.card('Recommendations', '<div id="do-r"></div>', { sub: 'Generated from the data above for the selected period. They are prompts to investigate, not guarantees.' }) + '</div>';
      ctx.el.querySelector('#do-f').innerHTML = UI.hbars(flows.map(function (fl) { var s = st(byFlow(all, fl.id)); return { label: fl.name, sub: f.n(s.ab) + ' of ' + f.n(s.n), value: s.abRate, fmt: function (v) { return f.pct(v, 1); }, color: s.abRate > 3 ? 'var(--bad)' : '' }; }), { max: Math.max(5, Math.max.apply(null, flows.map(function (fl) { return st(byFlow(all, fl.id)).abRate; }))) });
      UI.chart(ctx.el.querySelector('#do-h'), { type: 'bar', height: 20, labels: hrs.map(function (x) { return x.h + ':00'; }), tickEvery: 2, fmt2: function (v) { return v.toFixed(0) + '%'; }, series: [{ name: 'Left in IVR', data: hrs.map(function (x) { return x.ab; }), color: 'var(--c5)' }, { name: 'Drop-off %', axis: 'r', type: 'line', color: 'var(--c4)', data: hrs.map(function (x) { return x.n >= 5 ? +(x.ab / x.n * 100).toFixed(1) : null; }), fmt: function (v) { return f.pct(v); } }] });
      var active = flows.filter(function (fl) { return byFlow(all, fl.id).length; });
      if (active.length) UI.heat(ctx.el.querySelector('#do-m'), { rowLabels: active.map(function (x) { return x.name; }), colLabels: hrs.map(function (x) { return x.h; }), m: active.map(function (fl) { var l = byFlow(all, fl.id).filter(abI); return hrs.map(function (x) { var n = l.filter(function (c) { return T.hourOf(c.ts) === x.h; }).length; return n; }); }), rgb: '239,68,68', fmt: function (v) { return v == null ? '' : v || ''; } });
      else ctx.el.querySelector('#do-m').innerHTML = UI.empty('No IVR traffic');
      UI.table(ctx.el.querySelector('#do-t'), { id: 'fldead', noun: 'options', csv: 'ivr-dead-ends', pageSize: 12, sort: 'tot', rows: orows, onRow: function (r) { flowDrawer(r.flow); }, cols: [
        { k: 'flow', label: 'Flow', html: function (r) { return '<b>' + esc(r.flow.name) + '</b>'; }, val: function (r) { return r.flow.name; } },
        { k: 'opt', label: 'Option', html: function (r) { return esc(r.k + ' - ' + r.name) + (r.dead ? ' ' + UI.tag('Dead end', 'bad') : ''); }, val: function (r) { return r.k + ' ' + r.name; }, csv: function (r) { return r.k + ' - ' + r.name + (r.dead ? ' (dead end)' : ''); } },
        { k: 'n', label: 'Entries', r: 1, html: function (r) { return f.n(r.n); }, val: function (r) { return r.n; } },
        { k: 'sh', label: 'Share of flow', r: 1, html: function (r) { return f.pct(r.share, 1); }, val: function (r) { return r.share; } },
        { k: 'abI', label: 'Left in IVR', r: 1, html: function (r) { return f.n(r.abI) + ' <span class="muted">(' + f.pct(r.n ? r.abI / r.n * 100 : 0, 1) + ')</span>'; }, val: function (r) { return r.n ? r.abI / r.n * 100 : 0; } },
        { k: 'abQ', label: 'Left in queue', r: 1, html: function (r) { return f.n(r.abQ) + ' <span class="muted">(' + f.pct(r.n ? r.abQ / r.n * 100 : 0, 1) + ')</span>'; }, val: function (r) { return r.n ? r.abQ / r.n * 100 : 0; } },
        { k: 'tot', label: 'Total abandon %', r: 1, html: function (r) { return '<b class="' + (r.dead ? 'bad-t' : '') + '">' + f.pct(r.tot, 1) + '</b>'; }, val: function (r) { return r.tot; } },
        { k: 'vm', label: 'Voicemail', r: 1, html: function (r) { return f.n(r.vm); }, val: function (r) { return r.vm; } }
      ] });
      // recommendations
      var recs = [], sorted = orows.filter(function (r) { return r.n >= 20; }).sort(function (a, b) { return b.tot - a.tot; });
      if (sorted.length) { var w = sorted[0], dom = w.abQ >= w.abI ? 'queue' : 'IVR'; recs.push({ sev: w.dead ? 'bad' : 'warn', t: '<b>Option ' + esc(w.k + ' - ' + w.name) + '</b> in ' + esc(w.flow.name) + ' has the highest abandon rate (' + f.pct(w.tot, 1) + ' of ' + f.n(w.n) + ' callers, average ' + f.pct(avgTot, 1) + '). Most leave in the ' + dom + (dom === 'queue' ? '; review staffing and offer a callback for this queue.' : '; shorten the prompt or make the option easier to find.') }); }
      if (peak && gAll.n) recs.push({ sev: peak.ab / peak.n * 100 > gAll.abRate * 1.5 ? 'warn' : 'info', t: '<b>' + peak.h + ':00 - ' + (peak.h + 1) + ':00</b> has the highest IVR drop-off (' + f.pct(peak.ab / peak.n * 100, 1) + ' versus ' + f.pct(gAll.abRate, 1) + ' overall). Check greeting length and queue wait messages at that time.' });
      var slow = flows.map(function (fl) { return { fl: fl, s: st(byFlow(all, fl.id)) }; }).filter(function (x) { return x.s.n >= 20; }).sort(function (a, b) { return b.s.avgIvr - a.s.avgIvr; })[0];
      if (slow && slow.s.avgIvr > 25) recs.push({ sev: 'warn', t: '<b>' + esc(slow.fl.name) + '</b> keeps callers in the IVR for ' + f.dur(slow.s.avgIvr) + ' on average. Shorten the greeting or move the most-used option earlier in the menu.' });
      if (avgAb && avgOk && avgAb > avgOk * 1.2) recs.push({ sev: 'info', t: 'Callers who leave the IVR spend longer in it (' + f.dur(avgAb) + ') than callers who continue (' + f.dur(avgOk) + '), which points to menu confusion rather than impatience in queue.' });
      var rare = orows.filter(function (r) { return r.share < 4 && r.n >= 5 && flowN[r.flow.id] > 100; })[0];
      if (rare) recs.push({ sev: 'info', t: 'Option ' + esc(rare.k + ' - ' + rare.name) + ' in ' + esc(rare.flow.name) + ' is chosen by only ' + f.pct(rare.share, 1) + ' of callers. Consider merging it into another option to shorten the menu.' });
      var vmw = orows.filter(function (r) { return r.n >= 20 && r.vm / r.n > 0.08; }).sort(function (a, b) { return b.vm / b.n - a.vm / a.n; })[0];
      if (vmw) recs.push({ sev: 'warn', t: '<b>' + esc(vmw.flow.name) + ' option ' + esc(vmw.k + ' - ' + vmw.name) + '</b> sends ' + f.pct(vmw.vm / vmw.n * 100, 1) + ' of callers to voicemail. Check opening hours and agent coverage for this queue.' });
      flows.filter(function (fl) { return !byFlow(all, fl.id).length; }).forEach(function (fl) { recs.push({ sev: 'info', t: '<b>' + esc(fl.name) + '</b> received no calls in this period. Confirm the number (' + fl.ext + ') is assigned to the flow, or retire it.' }); });
      ctx.el.querySelector('#do-r').innerHTML = recs.length ? recs.map(function (r) { return '<div class="fl-rec">' + UI.tag(r.sev === 'bad' ? 'High' : r.sev === 'warn' ? 'Medium' : 'Info', r.sev === 'info' ? 'info' : r.sev) + '<span class="t">' + r.t + '</span></div>'; }).join('') : UI.empty('No recommendations', 'There is not enough IVR traffic in this period to draw conclusions.');
    }

    /* ---------- sankey-style diagram (SVG) ---------- */
    function sankey(host, list) {
      var nodes = {}, links = {}, cols = [[], [], [], []], N = 0;
      var OC = { 'Answered': '#16a34a', 'Abandoned in IVR': '#8b5cf6', 'Abandoned in queue': '#ef4444', 'Voicemail': '#f59e0b', 'No answer': '#94a3b8' };
      var FC = ['#2563eb', '#0ea5e9', '#14b8a6', '#ec4899'];
      function node(col, key, label, extra) { var k = col + '|' + key; if (!nodes[k]) { nodes[k] = Object.assign({ k: k, col: col, label: label, n: 0 }, extra || {}); cols[col].push(nodes[k]); } nodes[k].n++; return nodes[k]; }
      function link(a, b, color) { var k = a.k + '>' + b.k; if (!links[k]) links[k] = { a: a, b: b, n: 0, color: color }; links[k].n++; }
      list.forEach(function (c) {
        if (!c.path) return; N++; var o = opt(c), fi = flows.map(function (x) { return x.id; }).indexOf(c.flow);
        var n0 = node(0, c.flow, c.path[0], { ci: fi }), n1 = node(1, c.flow + '>' + o.k, o.k + ' ' + o.n, { ci: fi }), n2 = node(2, c.q, MCM.qById[c.q].name, {}), oc = outcome(c), n3 = node(3, oc, oc, {});
        link(n0, n1, FC[fi % 4]); link(n1, n2, FC[fi % 4]); link(n2, n3, OC[oc]);
      });
      if (!N) { host.innerHTML = UI.empty('No IVR traffic', 'No calls went through an IVR flow in this selection.'); return; }
      var W = 1000, gap = 8, nw = 14, xs = [4, 330, 656, W - nw - 4], H = 520, s = H / N, minH = 7;
      function colH(c, sc) { return c.reduce(function (t, nd) { return t + Math.max(minH, nd.n * sc); }, 0) + Math.max(0, c.length - 1) * gap; }
      while (Math.max.apply(null, cols.map(function (c) { return colH(c, s); })) > H && s > 0.001) s *= 0.95;
      var maxH = Math.max.apply(null, cols.map(function (c) { return colH(c, s); })), svg = '<svg viewBox="0 0 ' + W + ' ' + (maxH + 34) + '" role="img" aria-label="Caller journey diagram">';
      ['FLOW', 'MENU OPTION', 'QUEUE', 'OUTCOME'].forEach(function (t, i) { svg += '<text class="h" x="' + (i === 3 ? xs[i] + nw : xs[i]) + '" y="10" text-anchor="' + (i === 3 ? 'end' : 'start') + '">' + t + '</text>'; });
      cols.forEach(function (c) { c.sort(function (a, b) { return b.n - a.n; }); var y = 22; c.forEach(function (nd) { nd.h = Math.max(minH, nd.n * s); nd.y = y; nd.x = xs[nd.col]; nd.oy = nd.y; nd.iy = nd.y; y += nd.h + gap; }); });
      var ls = Object.keys(links).map(function (k) { return links[k]; });
      ls.sort(function (p, q) { return p.a.col - q.a.col || p.a.y - q.a.y || p.b.y - q.b.y; });
      ls.forEach(function (l) { l.w = Math.max(1, l.n * s); });
      // order incoming by source y for tidy ribbons
      ls.forEach(function (l) { var y0 = l.a.oy + l.w / 2; l.a.oy += l.w; l.y0 = y0; });
      var inc = {}; ls.forEach(function (l) { (inc[l.b.k] = inc[l.b.k] || []).push(l); });
      Object.keys(inc).forEach(function (k) { inc[k].sort(function (p, q) { return p.a.y - q.a.y; }).forEach(function (l) { l.y1 = l.b.iy + l.w / 2; l.b.iy += l.w; }); });
      ls.forEach(function (l) { var x0 = l.a.x + nw, x1 = l.b.x, xm = (x0 + x1) / 2; svg += '<path d="M' + x0 + ' ' + l.y0.toFixed(1) + ' C' + xm + ' ' + l.y0.toFixed(1) + ' ' + xm + ' ' + l.y1.toFixed(1) + ' ' + x1 + ' ' + l.y1.toFixed(1) + '" fill="none" stroke="' + l.color + '" stroke-opacity=".32" stroke-width="' + l.w.toFixed(1) + '"><title>' + esc(l.a.label + ' > ' + l.b.label + ': ' + l.n + ' calls') + '</title></path>'; });
      Object.keys(nodes).forEach(function (k) {
        var nd = nodes[k], last = nd.col === 3, col = nd.col === 3 ? OC[nd.label] : nd.col === 2 ? '#64748b' : FC[nd.ci % 4];
        svg += '<rect x="' + nd.x + '" y="' + nd.y.toFixed(1) + '" width="' + nw + '" height="' + nd.h.toFixed(1) + '" rx="3" fill="' + col + '"><title>' + esc(nd.label + ': ' + nd.n + ' calls') + '</title></rect><text x="' + (last ? nd.x - 7 : nd.x + nw + 7) + '" y="' + (nd.y + nd.h / 2 + 4).toFixed(1) + '" text-anchor="' + (last ? 'end' : 'start') + '">' + esc(nd.label) + ' (' + f.n(nd.n) + ')</text>';
      });
      host.innerHTML = svg + '</svg>';
    }
  }
});
