/* Reports - report library (23 distinct reports), custom report builder, saved views, scheduled exports. */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc;
  var CATS = ['Queue', 'Interval', 'Agent', 'Workforce', 'Call detail', 'Quality', 'Customer'];
  var CATNOTE = { Queue: 'Queue performance and cost', Interval: 'Volume by interval, hour and day', Agent: 'Individual agent handling', Workforce: 'Time in state, adherence, occupancy, forecast', 'Call detail': 'Interaction-level and flow reports', Quality: 'Evaluations and scorecards', Customer: 'Repeat contact, resolution, satisfaction, topics' };
  var NUMT = { n: 1, pct: 1, dur: 1, dec: 1, money: 1, hm: 1 };
  var DOWN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var D = [], byId = {};

  /* ---------- helpers ---------- */
  function C(k, label, type, o) { return Object.assign({ k: k, label: label, type: type || 'text' }, o || {}); }
  function sh(s) { s = String(s); return s.length > 13 ? s.slice(0, 12) + '.' : s; }
  function K(label, value, def, sub) { return { label: label, value: value, def: def, sub: sub }; }
  function qsSel() { var F = MCM.F; return MCM.queues.filter(function (q) { return (!F.queues.length || F.queues.indexOf(q.id) >= 0) && (F.channel === 'all' || q.channel === F.channel); }); }
  function def(o) { D.push(o); byId[o.id] = o; }
  function fmtCell(c, v) {
    switch (c.type) {
      case 'n': return f.n(v); case 'pct': return f.pct(v); case 'dur': return f.dur(v); case 'dec': return f.dec(v, c.d == null ? 1 : c.d); case 'money': return f.money(v, c.d == null ? 2 : c.d);
      case 'hm': return f.hm(v); case 'time': return v == null ? '-' : T.dt(v); case 'date': return v == null ? '-' : T.date(v); default: return esc(v == null ? '' : v);
    }
  }
  function tcols(d, o) {
    o = o || {};
    return d.cols.map(function (c) {
      var val = c.val || function (r) { return r[c.k]; };
      return { k: c.k, label: c.label, r: !!NUMT[c.type], val: val, html: c.html || function (r) { return fmtCell(c, r[c.k]); }, csv: function (r) { var v = val(r); if (c.type === 'dur') return f.dur(v); if (c.type === 'time') return v == null ? '' : T.dt(v); if (c.type === 'date') return v == null ? '' : T.date(v); if (c.type === 'hm') return f.hm(v); if (typeof v === 'number') return Math.round(v * 100) / 100; return v; } };
    });
  }
  function drawChart(host, s) {
    if (!host) return;
    if (!s) { host.innerHTML = ''; return; }
    if (s.kind === 'donut') UI.donut(host, { items: s.items, center: s.center });
    else if (s.kind === 'hbars') host.innerHTML = s.items.length ? UI.hbars(s.items, { max: s.max }) : UI.empty('No data for this selection');
    else if (s.kind === 'heat') UI.heat(host, s);
    else if (!s.labels || !s.labels.length) host.innerHTML = UI.empty('No data for this selection');
    else UI.chart(host, Object.assign({ height: 22 }, s));
  }
  function getOpts() { return MCM.store.get('rptOpt', {}); }
  function getOpt(d) { if (!d.opt) return null; var v = getOpts()[d.id]; return v != null ? v : d.opt.def; }
  function setOpt(id, v) { var o = getOpts(); o[id] = v; MCM.store.set('rptOpt', o); }
  function mkRc(rangeKey, d) {
    var F = MCM.F, R;
    if (!rangeKey || rangeKey === 'filters') R = F.resolve(); else { var old = F.preset; F.preset = rangeKey; R = F.resolve(); F.preset = old; }
    var rc = { R: R, F: F, q: function (o) { return MCM.query(Object.assign({ from: R.from, to: R.to }, o || {})); }, prev: function (o) { return MCM.query(Object.assign({ from: R.pfrom, to: R.pto }, o || {})); } };
    rc.opt = d ? getOpt(d) : null; rc.inb = rc.q({ dir: 'in' }); rc.g = MCM.agg(rc.inb); return rc;
  }
  function runDef(d, rc) { return d.rows(rc); }

  /* ---------- the reports ---------- */
  def({ id: 'queue-summary', name: 'Queue summary', cat: 'Queue', desc: 'Offered, answered, abandoned, service level, ASA, AHT and CSAT for every queue.',
    cols: [C('name', 'Queue'), C('ext', 'Ext'), C('channel', 'Channel'), C('offered', 'Offered', 'n'), C('answered', 'Answered', 'n'), C('abandoned', 'Abandoned', 'n'), C('abr', 'Abandon %', 'pct'), C('sl', 'Service level', 'pct', { html: function (r) { return UI.slCell(r.sl, r.target); } }), C('target', 'SL goal %', 'n'), C('asa', 'ASA', 'dur'), C('aht', 'AHT', 'dur'), C('csat', 'CSAT', 'dec', { d: 2 })],
    rows: function (x) { var by = MCM.groupBy(x.inb, function (c) { return c.q; }); return qsSel().map(function (q) { var g = MCM.agg(by[q.id] || []); return { q: q.id, name: q.name, ext: q.ext, channel: q.channel, offered: g.offered, answered: g.answered, abandoned: g.abandoned, abr: g.abandonRate, sl: g.sl, target: q.sl.target, asa: g.asa, aht: g.aht, csat: g.csat }; }); },
    drill: function (r) { MCM.drill.queue(r.q); },
    kpi: function (rows, x) { return [K('Queues', f.n(rows.length)), K('Offered', f.n(x.g.offered), 'offered'), K('Service level', f.pct(x.g.sl), 'sl'), K('Abandon rate', f.pct(x.g.abandonRate), 'abandonRate')]; },
    chart: function (rows) { return { type: 'bar', labels: rows.map(function (r) { return sh(r.name); }), series: [{ name: 'Offered', data: rows.map(function (r) { return r.offered; }), color: 'var(--c2)' }, { name: 'Answered', data: rows.map(function (r) { return r.answered; }), color: 'var(--c3)' }, { name: 'Abandoned', data: rows.map(function (r) { return r.abandoned; }), color: 'var(--c5)' }, { name: 'SL %', axis: 'r', type: 'line', color: 'var(--c4)', data: rows.map(function (r) { return r.sl == null ? null : +r.sl.toFixed(1); }), fmt: function (v) { return f.pct(v); } }], fmt2: function (v) { return v.toFixed(0) + '%'; } }; } });

  def({ id: 'service-level-by-queue', name: 'Service level by queue', cat: 'Queue', desc: 'Service level against each queue goal and threshold, with the gap in points.',
    cols: [C('name', 'Queue'), C('offered', 'Offered', 'n'), C('inSL', 'Answered in threshold', 'n'), C('sec', 'Threshold (s)', 'n'), C('sl', 'Service level', 'pct', { html: function (r) { return UI.slCell(r.sl, r.target); } }), C('target', 'Goal %', 'n'), C('gap', 'Gap (pts)', 'dec', { html: function (r) { return r.gap == null ? '-' : '<span class="' + (r.gap >= 0 ? 'ok-t' : 'bad-t') + '">' + (r.gap >= 0 ? '+' : '') + f.dec(r.gap, 1) + '</span>'; } }), C('status', 'Status', 'text', { html: function (r) { return UI.tag(r.status, r.status === 'Meets goal' ? 'ok' : r.status === 'Near goal' ? 'warn' : r.status === 'No data' ? '' : 'bad'); } })],
    rows: function (x) { var by = MCM.groupBy(x.inb, function (c) { return c.q; }); return qsSel().map(function (q) { var g = MCM.agg(by[q.id] || []), gap = g.sl == null ? null : g.sl - q.sl.target; return { q: q.id, name: q.name, offered: g.offered, inSL: g.inSL, sec: q.sl.sec, sl: g.sl, target: q.sl.target, gap: gap, status: g.sl == null ? 'No data' : gap >= 0 ? 'Meets goal' : gap >= -10 ? 'Near goal' : 'Below goal' }; }); },
    drill: function (r) { MCM.drill.queue(r.q); },
    kpi: function (rows) { var m = rows.filter(function (r) { return r.status === 'Meets goal'; }).length, b = rows.filter(function (r) { return r.status === 'Below goal'; }).length; return [K('Queues meeting goal', m + ' / ' + rows.length), K('Below goal', f.n(b), null, b ? 'needs attention' : 'none'), K('Best', rows.length ? esc(sh(rows.slice().sort(function (a, c) { return (c.sl || 0) - (a.sl || 0); })[0].name)) : '-', 'sl'), K('Worst gap', rows.length ? f.dec(Math.min.apply(null, rows.map(function (r) { return r.gap == null ? 0 : r.gap; })), 1) + ' pts' : '-')]; },
    chart: function (rows) { return { kind: 'hbars', max: 100, items: rows.filter(function (r) { return r.sl != null; }).sort(function (a, b) { return b.sl - a.sl; }).map(function (r) { return { label: r.name, sub: 'goal ' + r.target + '%', value: r.sl, fmt: function (v) { return f.pct(v); }, color: r.gap >= 0 ? 'var(--ok-dot)' : r.gap >= -10 ? '#f59e0b' : 'var(--bad)' }; }) }; } });

  def({ id: 'abandon-analysis', name: 'Abandon analysis', cat: 'Queue', desc: 'How long callers wait before hanging up and at which stage (IVR, queue, ringing).',
    cols: [C('bin', 'Wait before abandon'), C('n', 'Abandons', 'n'), C('share', 'Share %', 'pct'), C('cum', 'Cumulative %', 'pct'), C('ivr', 'In IVR', 'n'), C('queue', 'In queue', 'n'), C('ring', 'While ringing', 'n')],
    rows: function (x) { var ab = x.inb.filter(function (c) { return c.outcome === 'abandoned'; }), tot = ab.length, cum = 0; return [[0, 5, '< 5 s (short)'], [5, 15, '5-15 s'], [15, 30, '15-30 s'], [30, 60, '30-60 s'], [60, 120, '1-2 min'], [120, 1e9, '> 2 min']].map(function (b) { var l = ab.filter(function (c) { return c.wait >= b[0] && c.wait < b[1]; }); cum += l.length; return { bin: b[2], n: l.length, share: tot ? l.length / tot * 100 : 0, cum: tot ? cum / tot * 100 : 0, ivr: l.filter(function (c) { return c.abandonStage === 'ivr'; }).length, queue: l.filter(function (c) { return c.abandonStage === 'queue'; }).length, ring: l.filter(function (c) { return c.abandonStage === 'ring'; }).length }; }); },
    kpi: function (rows, x) { return [K('Abandoned', f.n(x.g.abandoned), 'abandoned', f.pct(x.g.abandonRate) + ' of offered'), K('Short (<5 s)', f.n(x.g.shortAb), null, 'excluded from SL'), K('Avg wait before abandon', f.dur(x.g.avgAbWait)), K('Abandoned in queue', f.n(x.g.qAb))]; },
    chart: function (rows, x) { return { kind: 'donut', items: [{ name: 'In IVR', value: x.g.ivrAb, color: 'var(--c4)' }, { name: 'In queue', value: x.g.qAb, color: 'var(--c5)' }, { name: 'While ringing', value: x.g.rAb, color: 'var(--c6)' }], center: { v: f.n(x.g.abandoned), l: 'abandoned' } }; } });

  def({ id: 'cost-usage', name: 'Cost and usage', cat: 'Queue', desc: 'Billable minutes (talk + hold) multiplied by the per-minute rate in Settings, by queue or by day.',
    opt: { label: 'Group by', items: [['queue', 'By queue'], ['day', 'By day']], def: 'queue' },
    cols: [C('g', 'Queue / day', 'text', { val: function (r) { return r.gv; } }), C('calls', 'Handled', 'n'), C('talk', 'Talk min', 'dec'), C('hold', 'Hold min', 'dec'), C('minutes', 'Billable min', 'dec'), C('cost', 'Cost', 'money', { d: 2 }), C('cpc', 'Cost / call', 'money', { d: 3 })],
    rows: function (x) { var rate = MCM.settings.ratePerMin, mk = function (label, gv, l) { var g = MCM.agg(l); return { g: label, gv: gv, calls: g.handled, talk: g.talk / 60, hold: g.hold / 60, minutes: g.minutes, cost: g.minutes * rate, cpc: g.handled ? g.minutes * rate / g.handled : 0 }; }, all = x.q();
      if (x.opt === 'day') return MCM.buckets(all, x.R.from, x.R.to, T.day).map(function (b) { return mk(T.date(b.t), b.t, b.list); });
      var by = MCM.groupBy(all, function (c) { return c.q; }); return qsSel().map(function (q) { return mk(q.name, q.name, by[q.id] || []); }); },
    kpi: function (rows) { var m = rows.reduce(function (s, r) { return s + r.minutes; }, 0), c = rows.reduce(function (s, r) { return s + r.cost; }, 0), h = rows.reduce(function (s, r) { return s + r.calls; }, 0); return [K('Billable minutes', f.n(m, 0)), K('Total cost', f.money(c)), K('Cost per handled call', f.money(h ? c / h : 0, 3)), K('Rate', f.money(MCM.settings.ratePerMin, 4) + '/min', null, 'set in Settings')]; },
    chart: function (rows, x) { if (x.opt === 'day') return { type: 'area', labels: rows.map(function (r) { return T.dm(r.gv); }), series: [{ name: 'Cost', data: rows.map(function (r) { return +r.cost.toFixed(2); }), color: 'var(--c2)', fmt: function (v) { return f.money(v); } }, { name: 'Billable min', axis: 'r', data: rows.map(function (r) { return Math.round(r.minutes); }), color: 'var(--c4)' }], fmt: function (v) { return '$' + v.toFixed(v % 1 ? 2 : 0); } }; return { kind: 'donut', items: rows.filter(function (r) { return r.cost > 0; }).map(function (r) { return { name: r.g, value: +r.cost.toFixed(2) }; }), center: { v: f.money(rows.reduce(function (s, r) { return s + r.cost; }, 0), 0), l: 'total cost' } }; } });

  def({ id: 'queue-interval', name: 'Queue interval report', cat: 'Interval', desc: '15, 30 or 60 minute intervals: volume, outcomes and service level over the last day of the range.',
    opt: { label: 'Interval', items: [[15, '15 min'], [30, '30 min'], [60, '60 min']], def: 30 },
    cols: [C('t', 'Interval', 'time'), C('offered', 'Offered', 'n'), C('answered', 'Answered', 'n'), C('abandoned', 'Abandoned', 'n'), C('voicemail', 'Voicemail', 'n'), C('sl', 'Service level', 'pct', { html: function (r) { return UI.slCell(r.sl, 80); } }), C('asa', 'ASA', 'dur'), C('aht', 'AHT', 'dur')],
    rows: function (x) { var from = x.R.to - x.R.from > T.day * 3 ? x.R.to - T.day : x.R.from; return MCM.buckets(x.inb.filter(function (c) { return c.ts >= from; }), from, x.R.to, (+x.opt || 30) * 60000).filter(function (b) { return b.agg.offered; }).map(function (b) { var g = b.agg; return { t: b.t, offered: g.offered, answered: g.answered, abandoned: g.abandoned, voicemail: g.voicemail, sl: g.sl, asa: g.asa, aht: g.aht }; }); },
    kpi: function (rows, x) { var pk = rows.slice().sort(function (a, b) { return b.offered - a.offered; })[0]; return [K('Intervals with traffic', f.n(rows.length)), K('Peak interval', pk ? T.time(pk.t) : '-', null, pk ? f.n(pk.offered) + ' offered' : ''), K('Service level', f.pct(x.g.sl), 'sl'), K('ASA', f.dur(x.g.asa), 'asa')]; },
    chart: function (rows) { return { type: 'stack', labels: rows.map(function (r) { return T.time(r.t); }), series: [{ name: 'Answered', data: rows.map(function (r) { return r.answered; }), color: 'var(--c3)' }, { name: 'Abandoned', data: rows.map(function (r) { return r.abandoned; }), color: 'var(--c5)' }, { name: 'Voicemail', data: rows.map(function (r) { return r.voicemail; }), color: 'var(--c4)' }, { name: 'SL %', axis: 'r', type: 'line', color: 'var(--c2)', data: rows.map(function (r) { return r.sl == null ? null : +r.sl.toFixed(1); }), fmt: function (v) { return f.pct(v); } }], fmt2: function (v) { return v.toFixed(0) + '%'; }, tipLabels: rows.map(function (r) { return T.dt(r.t); }) }; } });

  def({ id: 'hourly-volume', name: 'Hourly volume profile', cat: 'Interval', desc: 'Contacts by hour of day with average per day, plus a weekday-by-hour heat map to find peaks.',
    cols: [C('hr', 'Hour', 'text', { val: function (r) { return r.h; } }), C('offered', 'Offered', 'n'), C('avg', 'Avg per day', 'dec'), C('answered', 'Answered', 'n'), C('abandoned', 'Abandoned', 'n'), C('abr', 'Abandon %', 'pct'), C('sl', 'Service level', 'pct', { html: function (r) { return UI.slCell(r.sl, 80); } }), C('aht', 'AHT', 'dur')],
    rows: function (x) { var by = MCM.groupBy(x.inb, function (c) { return T.hourOf(c.ts); }), out = []; for (var h = 0; h < 24; h++) { var g = MCM.agg(by[h] || []); out.push({ h: h, hr: (h < 10 ? '0' : '') + h + ':00 - ' + (h < 9 ? '0' : '') + (h + 1) + ':00', offered: g.offered, avg: g.offered / x.R.days, answered: g.answered, abandoned: g.abandoned, abr: g.abandonRate, sl: g.sl, aht: g.aht }); } return out; },
    kpi: function (rows) { var pk = rows.slice().sort(function (a, b) { return b.offered - a.offered; })[0]; return [K('Peak hour', pk && pk.offered ? pk.hr.slice(0, 5) : '-', null, pk ? f.n(pk.offered) + ' offered' : ''), K('Busiest-hour share', pk && pk.offered ? f.pct(pk.offered / (rows.reduce(function (s, r) { return s + r.offered; }, 0) || 1) * 100) : '-'), K('Avg per day', f.n(rows.reduce(function (s, r) { return s + r.avg; }, 0), 0)), K('Hours with traffic', rows.filter(function (r) { return r.offered; }).length + ' / 24')]; },
    chart: function (rows, x) { var m = [0, 1, 2, 3, 4, 5, 6].map(function () { var a = []; for (var h = 0; h < 24; h++) a.push(0); return a; }); x.inb.forEach(function (c) { m[(T.dow(c.ts) + 6) % 7][T.hourOf(c.ts)]++; }); var cl = []; for (var h = 0; h < 24; h++) cl.push(h); return { kind: 'heat', rowLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], colLabels: cl, m: m, cells: false, fmt: function (v) { return f.n(v) + ' calls'; }, rgb: '37,99,235' }; } });

  def({ id: 'daily-trend', name: 'Daily trend', cat: 'Interval', desc: 'Day-by-day volume, abandon rate, service level, AHT and CSAT across the period.',
    cols: [C('t', 'Day', 'date'), C('offered', 'Offered', 'n'), C('answered', 'Answered', 'n'), C('abandoned', 'Abandoned', 'n'), C('abr', 'Abandon %', 'pct'), C('sl', 'Service level', 'pct', { html: function (r) { return UI.slCell(r.sl, 80); } }), C('aht', 'AHT', 'dur'), C('csat', 'CSAT', 'dec', { d: 2 })],
    rows: function (x) { return MCM.buckets(x.inb, x.R.from, x.R.to, T.day).map(function (b) { var g = b.agg; return { t: b.t, offered: g.offered, answered: g.answered, abandoned: g.abandoned, abr: g.abandonRate, sl: g.sl, aht: g.aht, csat: g.csat }; }); },
    kpi: function (rows) { var o = rows.reduce(function (s, r) { return s + r.offered; }, 0); return [K('Days', f.n(rows.length)), K('Avg offered / day', f.n(rows.length ? o / rows.length : 0, 0)), K('Best day', rows.length ? T.dm(rows.slice().sort(function (a, b) { return (b.sl || 0) - (a.sl || 0); })[0].t) : '-', 'sl', 'highest service level'), K('Worst abandon day', rows.length ? T.dm(rows.slice().sort(function (a, b) { return b.abr - a.abr; })[0].t) : '-', 'abandonRate')]; },
    chart: function (rows) { return { type: 'area', labels: rows.map(function (r) { return T.dm(r.t); }), series: [{ name: 'Offered', data: rows.map(function (r) { return r.offered; }), color: 'var(--c2)' }, { name: 'Service level %', axis: 'r', data: rows.map(function (r) { return r.sl == null ? null : +r.sl.toFixed(1); }), color: 'var(--c3)', fmt: function (v) { return f.pct(v); } }, { name: 'Abandon %', axis: 'r', data: rows.map(function (r) { return +r.abr.toFixed(1); }), color: 'var(--c5)', dash: true, fmt: function (v) { return f.pct(v); } }], fmt2: function (v) { return v.toFixed(0) + '%'; } }; } });

  def({ id: 'agent-performance', name: 'Agent performance', cat: 'Agent', desc: 'Handled contacts, AHT components, CSAT, QA, first-contact resolution and transfers per agent.',
    cols: [C('name', 'Agent'), C('team', 'Team'), C('handled', 'Handled', 'n'), C('aht', 'AHT', 'dur'), C('talk', 'Avg talk', 'dur'), C('hold', 'Avg hold', 'dur'), C('wrap', 'Avg wrap', 'dur'), C('csat', 'CSAT', 'dec', { d: 2 }), C('qa', 'QA', 'dec'), C('fcr', 'FCR %', 'pct'), C('xfer', 'Transfer %', 'pct')],
    rows: function (x) { var by = MCM.groupBy(x.q(), function (c) { return c.agent; }); return Object.keys(by).map(function (id) { var a = MCM.aById[id], g = MCM.agg(by[id]); return { agent: id, name: a.name, team: a.team, handled: g.handled, aht: g.aht, talk: g.avgTalk, hold: g.avgHold, wrap: g.avgWrap, csat: g.csat, qa: g.qa, fcr: g.fcrRate, xfer: g.xferRate }; }).filter(function (r) { return r.handled; }); },
    drill: function (r) { MCM.drill.agent(r.agent); },
    kpi: function (rows) { var h = rows.reduce(function (s, r) { return s + r.handled; }, 0), w = function (k) { var n = 0, d = 0; rows.forEach(function (r) { if (r[k] != null) { n += r[k] * r.handled; d += r.handled; } }); return d ? n / d : null; }; return [K('Agents with activity', f.n(rows.length)), K('Handled', f.n(h)), K('Weighted AHT', f.dur(w('aht')), 'aht'), K('Weighted CSAT', f.dec(w('csat'), 2), 'csat')]; },
    chart: function (rows) { var r2 = rows.slice().sort(function (a, b) { return b.handled - a.handled; }).slice(0, 16); return { type: 'bar', labels: r2.map(function (r) { return r.name.split(' ')[0]; }), series: [{ name: 'Handled', data: r2.map(function (r) { return r.handled; }), color: 'var(--c2)' }, { name: 'AHT (s)', axis: 'r', type: 'line', color: 'var(--c4)', data: r2.map(function (r) { return Math.round(r.aht); }), fmt: function (v) { return f.dur(v); } }], fmt2: function (v) { return f.dur(v); }, tipLabels: r2.map(function (r) { return r.name; }) }; } });

  def({ id: 'hold-time', name: 'Hold time', cat: 'Agent', desc: 'How often and how long agents place callers on hold, with a distribution of hold durations.',
    cols: [C('name', 'Agent'), C('handled', 'Handled', 'n'), C('withHold', 'Calls with hold', 'n'), C('holdPct', 'Hold rate %', 'pct'), C('avgHold', 'Avg hold', 'dur'), C('maxHold', 'Longest hold', 'dur'), C('total', 'Total hold', 'hm'), C('ofTalk', 'Hold / talk %', 'pct')],
    rows: function (x) { var by = MCM.groupBy(x.q().filter(function (c) { return c.outcome === 'answered'; }), function (c) { return c.agent; }); return Object.keys(by).map(function (id) { var l = by[id], hl = l.filter(function (c) { return c.hold > 0; }), th = hl.reduce(function (s, c) { return s + c.hold; }, 0), tt = l.reduce(function (s, c) { return s + c.talk; }, 0); return { agent: id, name: MCM.aById[id].name, handled: l.length, withHold: hl.length, holdPct: l.length ? hl.length / l.length * 100 : 0, avgHold: hl.length ? th / hl.length : 0, maxHold: hl.reduce(function (m, c) { return Math.max(m, c.hold); }, 0), total: th, ofTalk: tt ? th / tt * 100 : 0 }; }); },
    drill: function (r) { MCM.drill.agent(r.agent); },
    kpi: function (rows) { var h = rows.reduce(function (s, r) { return s + r.handled; }, 0), w = rows.reduce(function (s, r) { return s + r.withHold; }, 0), t = rows.reduce(function (s, r) { return s + r.total; }, 0); return [K('Calls placed on hold', f.n(w), null, f.pct(h ? w / h * 100 : 0) + ' of handled'), K('Avg hold', f.dur(w ? t / w : 0)), K('Total hold time', f.hm(t)), K('Longest hold', f.dur(rows.reduce(function (m, r) { return Math.max(m, r.maxHold); }, 0)))]; },
    chart: function (rows, x) { var hl = x.q().filter(function (c) { return c.outcome === 'answered' && c.hold > 0; }), bins = [[0, 15, '<15 s'], [15, 30, '15-30 s'], [30, 60, '30-60 s'], [60, 120, '1-2 min'], [120, 1e9, '>2 min']]; return { type: 'bar', labels: bins.map(function (b) { return b[2]; }), legend: false, series: [{ name: 'Calls', color: 'var(--c6)', data: bins.map(function (b) { return hl.filter(function (c) { return c.hold >= b[0] && c.hold < b[1]; }).length; }) }] }; } });

  def({ id: 'agent-status-time', name: 'Agent time in state', cat: 'Workforce', desc: 'Scheduled time split into talk, hold, wrap-up, available and away (breaks, lunch, off-phone) per agent.',
    cols: [C('name', 'Agent'), C('team', 'Team'), C('sched', 'Scheduled', 'hm'), C('talk', 'Talk', 'hm'), C('hold', 'Hold', 'hm'), C('wrap', 'Wrap-up', 'hm'), C('avail', 'Available / idle', 'hm'), C('away', 'Away (break/lunch)', 'hm'), C('busyPct', 'Handling %', 'pct')],
    rows: function (x) { return MCM.agentStats(x.q(), x.R).filter(function (s) { return s.sched > 0 && (!MCM.F.teams.length || MCM.F.teams.indexOf(s.agent.team) >= 0); }).map(function (s) { var g = s.agg, busy = g.talk + g.hold + g.wrap; return { agent: s.agent.id, name: s.agent.name, team: s.agent.team, sched: s.sched, talk: g.talk, hold: g.hold, wrap: g.wrap, avail: Math.max(0, s.staffed - busy), away: Math.max(0, s.sched - s.staffed), busyPct: s.sched ? Math.min(100, busy / s.sched * 100) : 0 }; }); },
    drill: function (r) { MCM.drill.agent(r.agent); },
    kpi: function (rows) { var t = function (k) { return rows.reduce(function (s, r) { return s + r[k]; }, 0); }, sc = t('sched'); return [K('Scheduled hours', f.hm(sc)), K('Handling', f.pct(sc ? (t('talk') + t('hold') + t('wrap')) / sc * 100 : 0), 'occupancy', 'of scheduled time'), K('Available / idle', f.hm(t('avail'))), K('Away', f.hm(t('away')), 'shrinkage')]; },
    chart: function (rows) { var r2 = rows.slice(0, 20), h = function (k) { return r2.map(function (r) { return +(r[k] / 3600).toFixed(2); }); }; return { type: 'stack', labels: r2.map(function (r) { return r.name.split(' ')[0]; }), tipLabels: r2.map(function (r) { return r.name; }), fmt: function (v) { return f.dec(v, 1) + 'h'; }, series: [{ name: 'Talk', data: h('talk'), color: 'var(--c2)' }, { name: 'Hold', data: h('hold'), color: 'var(--c6)' }, { name: 'Wrap-up', data: h('wrap'), color: 'var(--c4)' }, { name: 'Available', data: h('avail'), color: 'var(--c3)' }, { name: 'Away', data: h('away'), color: 'var(--c8)' }] }; } });

  def({ id: 'agent-adherence', name: 'Schedule adherence', cat: 'Workforce', desc: 'Adherence and conformance per agent with exception counts, against the adherence goal.',
    cols: [C('name', 'Agent'), C('team', 'Team'), C('days', 'Days', 'n'), C('adh', 'Adherence %', 'pct', { html: function (r) { return '<span class="' + (r.adh >= MCM.goals.adherence ? 'ok-t' : r.adh >= MCM.goals.adherence - 5 ? 'warn-t' : 'bad-t') + '">' + f.pct(r.adh) + '</span>'; } }), C('conf', 'Conformance %', 'pct'), C('gap', 'vs goal (pts)', 'dec'), C('ex', 'Exceptions', 'n'), C('exMin', 'Exception min', 'n')],
    rows: function (x) { var days = [], d0 = Math.floor((x.R.from - MCM.TODAY) / T.day), d1 = Math.floor((x.R.to - 1 - MCM.TODAY) / T.day); for (var d = d0; d <= d1; d++) days.push(MCM.TODAY + d * T.day); return MCM.agents.filter(function (a) { return a.role !== 'Admin' && (!MCM.F.teams.length || MCM.F.teams.indexOf(a.team) >= 0); }).map(function (a) { var n = 0, ad = 0, cf = 0, ex = 0, em = 0; days.forEach(function (ds) { if (!MCM.shift(a, ds)) return; var r = MCM.adherence(a, ds); n++; ad += r.pct; cf += r.conformance; ex += r.exceptions.length; r.exceptions.forEach(function (e) { em += e.min; }); }); return { agent: a.id, name: a.name, team: a.team, days: n, adh: n ? ad / n : null, conf: n ? cf / n : null, gap: n ? ad / n - MCM.goals.adherence : null, ex: ex, exMin: em }; }).filter(function (r) { return r.days; }); },
    drill: function (r) { MCM.drill.agent(r.agent); },
    kpi: function (rows) { var a = rows.length ? rows.reduce(function (s, r) { return s + r.adh; }, 0) / rows.length : null, below = rows.filter(function (r) { return r.adh < MCM.goals.adherence; }).length; return [K('Avg adherence', f.pct(a), 'adherence', 'goal ' + MCM.goals.adherence + '%'), K('Avg conformance', f.pct(rows.length ? rows.reduce(function (s, r) { return s + r.conf; }, 0) / rows.length : null), 'conformance'), K('Agents below goal', f.n(below)), K('Exceptions', f.n(rows.reduce(function (s, r) { return s + r.ex; }, 0)))]; },
    chart: function (rows) { var r2 = rows.slice().sort(function (a, b) { return a.adh - b.adh; }).slice(0, 20); return { type: 'bar', labels: r2.map(function (r) { return r.name.split(' ')[0]; }), tipLabels: r2.map(function (r) { return r.name; }), min: 60, max: 100, goal: MCM.goals.adherence, fmt: function (v) { return v.toFixed(0) + '%'; }, legend: false, series: [{ name: 'Adherence %', data: r2.map(function (r) { return +r.adh.toFixed(1); }), color: 'var(--c7)' }] }; } });

  def({ id: 'agent-occupancy-shrinkage', name: 'Occupancy and shrinkage', cat: 'Workforce', desc: 'Share of staffed time spent handling contacts and share of paid time not available for contacts.',
    cols: [C('name', 'Agent'), C('team', 'Team'), C('sched', 'Scheduled', 'hm'), C('staffed', 'Staffed', 'hm'), C('busy', 'Handling', 'hm'), C('occ', 'Occupancy %', 'pct', { html: function (r) { return '<span class="' + (r.occ > 90 ? 'bad-t' : r.occ < 45 ? 'warn-t' : 'ok-t') + '">' + f.pct(r.occ) + '</span>'; } }), C('shrink', 'Shrinkage %', 'pct'), C('handled', 'Handled', 'n')],
    rows: function (x) { return MCM.agentStats(x.q(), x.R).filter(function (s) { return s.sched > 0 && (!MCM.F.teams.length || MCM.F.teams.indexOf(s.agent.team) >= 0); }).map(function (s) { return { agent: s.agent.id, name: s.agent.name, team: s.agent.team, sched: s.sched, staffed: s.staffed, busy: s.agg.talk + s.agg.hold + s.agg.wrap, occ: s.occupancy, shrink: s.shrink, handled: s.handled }; }); },
    drill: function (r) { MCM.drill.agent(r.agent); },
    kpi: function (rows) { var sc = rows.reduce(function (s, r) { return s + r.sched; }, 0), st = rows.reduce(function (s, r) { return s + r.staffed; }, 0), b = rows.reduce(function (s, r) { return s + r.busy; }, 0); return [K('Occupancy', f.pct(st ? Math.min(98, b / st * 100) : 0), 'occupancy'), K('Shrinkage', f.pct(sc ? (sc - st) / sc * 100 : 0), 'shrinkage'), K('Staffed hours', f.hm(st)), K('Agents over 90% occupancy', f.n(rows.filter(function (r) { return r.occ > 90; }).length))]; },
    chart: function (rows) { var r2 = rows.slice(0, 20); return { type: 'bar', labels: r2.map(function (r) { return r.name.split(' ')[0]; }), tipLabels: r2.map(function (r) { return r.name; }), max: 100, fmt: function (v) { return v.toFixed(0) + '%'; }, series: [{ name: 'Occupancy %', data: r2.map(function (r) { return +r.occ.toFixed(1); }), color: 'var(--c2)' }, { name: 'Shrinkage %', data: r2.map(function (r) { return +r.shrink.toFixed(1); }), color: 'var(--c8)' }] }; } });

  def({ id: 'forecast-accuracy', name: 'Forecast accuracy', cat: 'Workforce', desc: 'Forecast versus actual inbound volume per queue and day (completed intervals only) with WAPE and bias.',
    cols: [C('t', 'Day', 'date'), C('name', 'Queue'), C('fc', 'Forecast', 'n'), C('act', 'Actual', 'n'), C('var', 'Variance', 'n'), C('bias', 'Bias %', 'pct'), C('wape', 'WAPE %', 'pct'), C('acc', 'Accuracy %', 'pct', { html: function (r) { return '<span class="' + (r.acc >= 85 ? 'ok-t' : r.acc >= 75 ? 'warn-t' : 'bad-t') + '">' + f.pct(r.acc) + '</span>'; } })],
    rows: function (x) { var out = [], start = Math.max(x.R.from, T.sod(x.R.to - 1) - 13 * T.day); for (var ds = T.sod(start); ds < x.R.to; ds += T.day) qsSel().forEach(function (q) { var fc = 0, act = 0, err = 0; MCM.forecast(q.id, ds).forEach(function (iv) { if (iv.act == null) return; fc += iv.fc; act += iv.act; err += Math.abs(iv.act - iv.fc); }); if (!act && !fc) return; out.push({ t: ds, q: q.id, name: q.name, fc: Math.round(fc), act: act, 'var': Math.round(act - fc), bias: act ? (fc - act) / act * 100 : 0, wape: act ? err / act * 100 : 0, acc: act ? Math.max(0, 100 - err / act * 100) : 0 }); }); return out; },
    drill: function (r) { MCM.drill.queue(r.q); },
    kpi: function (rows) { var a = rows.reduce(function (s, r) { return s + r.act; }, 0), fc = rows.reduce(function (s, r) { return s + r.fc; }, 0), e = rows.reduce(function (s, r) { return s + r.wape * r.act / 100; }, 0); return [K('WAPE', f.pct(a ? e / a * 100 : null), 'wape'), K('Accuracy', f.pct(a ? 100 - e / a * 100 : null)), K('Forecast total', f.n(fc)), K('Actual total', f.n(a), null, 'last 14 days max')]; },
    chart: function (rows) { var by = MCM.groupBy(rows, function (r) { return r.t; }), ks = Object.keys(by).map(Number).sort(function (a, b) { return a - b; }); return { type: 'line', labels: ks.map(function (k) { return T.dm(k); }), series: [{ name: 'Forecast', data: ks.map(function (k) { return by[k].reduce(function (s, r) { return s + r.fc; }, 0); }), color: 'var(--c4)', dash: true }, { name: 'Actual', data: ks.map(function (k) { return by[k].reduce(function (s, r) { return s + r.act; }, 0); }), color: 'var(--c2)' }] }; } });

  var OUTL = { answered: ['Answered', 'ok'], abandoned: ['Abandoned', 'bad'], voicemail: ['Voicemail', 'warn'], noanswer: ['No answer', 'warn'] };
  function cRow(c) { var a = MCM.aById[c.agent]; return { id: c.id, t: c.ts, dir: c.dir === 'in' ? 'Inbound' : 'Outbound', queue: MCM.qById[c.q].name, from: MCM.mask(c.from), agent: a ? a.name : '-', outcome: c.outcome, wait: c.wait, ring: c.ring, talk: c.talk, hold: c.hold, wrap: c.wrap, disp: c.disp || '-', csat: c.csat, stage: c.abandonStage || '-' }; }
  def({ id: 'call-log', name: 'Call log', cat: 'Call detail', desc: 'Every interaction in the period with timings, outcome and disposition. Click a row for the full call record.',
    cols: [C('t', 'Time', 'time'), C('id', 'Call ID'), C('dir', 'Direction'), C('queue', 'Queue'), C('from', 'Caller'), C('agent', 'Agent'), C('outcome', 'Outcome', 'text', { html: function (r) { var o = OUTL[r.outcome] || [r.outcome, '']; return UI.tag(o[0], o[1]); } }), C('wait', 'Wait', 'dur'), C('talk', 'Talk', 'dur'), C('hold', 'Hold', 'dur'), C('wrap', 'Wrap', 'dur'), C('disp', 'Disposition'), C('csat', 'CSAT', 'n')],
    rows: function (x) { var l = x.q(); x.total = l.length; return l.slice(-5000).reverse().map(cRow); },
    drill: function (r) { MCM.drill.call(r.id); },
    kpi: function (rows, x) { var all = x.q(), g = MCM.agg(all); return [K('Interactions', f.n(all.length), null, rows.length < all.length ? 'showing latest ' + f.n(rows.length) : ''), K('Answered', f.n(g.answered + g.outConnected), 'answered'), K('Abandoned', f.n(g.abandoned), 'abandoned'), K('Avg handle time', f.dur(g.aht), 'aht')]; },
    chart: function (rows, x) { var l = x.q(), n = function (fn) { return l.filter(fn).length; }; return { kind: 'donut', items: [{ name: 'Answered', value: n(function (c) { return c.outcome === 'answered'; }), color: 'var(--c3)' }, { name: 'Abandoned', value: n(function (c) { return c.outcome === 'abandoned'; }), color: 'var(--c5)' }, { name: 'Voicemail', value: n(function (c) { return c.outcome === 'voicemail'; }), color: 'var(--c4)' }, { name: 'No answer (outbound)', value: n(function (c) { return c.outcome === 'noanswer'; }), color: 'var(--c6)' }], center: { v: f.n(l.length), l: 'interactions' } }; } });

  def({ id: 'unanswered-calls', name: 'Unanswered calls', cat: 'Call detail', desc: 'Abandoned, voicemail and outbound no-answer contacts with the stage, wait, and whether a callback exists.',
    cols: [C('t', 'Time', 'time'), C('id', 'Call ID'), C('type', 'Type', 'text', { html: function (r) { return UI.tag(r.type, r.type.indexOf('Abandoned') === 0 ? 'bad' : 'warn'); } }), C('queue', 'Queue'), C('from', 'Number'), C('wait', 'Wait', 'dur'), C('ring', 'Ring', 'dur'), C('cb', 'Callback', 'text', { html: function (r) { return r.cb === 'none' ? '<span class="faint">none</span>' : UI.tag(r.cb, r.cb === 'completed' ? 'ok' : r.cb === 'failed' ? 'bad' : 'warn'); } })],
    rows: function (x) { var cb = {}; MCM.callbacks.forEach(function (b) { cb[b.from] = b.status; }); return x.q().filter(function (c) { return c.outcome !== 'answered'; }).slice(-5000).reverse().map(function (c) { var r = cRow(c); r.type = c.outcome === 'abandoned' ? 'Abandoned - ' + (c.abandonStage || 'queue') : c.outcome === 'voicemail' ? 'Voicemail' : 'No answer (out)'; r.cb = cb[c.from] || 'none'; return r; }); },
    drill: function (r) { MCM.drill.call(r.id); },
    kpi: function (rows) { var n = function (p) { return rows.filter(function (r) { return r.type.indexOf(p) === 0; }).length; }; return [K('Unanswered', f.n(rows.length)), K('Abandoned', f.n(n('Abandoned')), 'abandoned'), K('Voicemail', f.n(n('Voicemail'))), K('With a callback record', f.n(rows.filter(function (r) { return r.cb !== 'none'; }).length))]; },
    chart: function (rows) { var cl = [], t = ['Abandoned', 'Voicemail', 'No answer']; for (var h = 0; h < 24; h++) cl.push(h); var cnt = function (p, h) { return rows.filter(function (r) { return r.type.indexOf(p) === 0 && T.hourOf(r.t) === h; }).length; }; return { type: 'stack', legend: true, labels: cl.map(function (h) { return h + ':00'; }), tickEvery: 2, series: [{ name: 'Abandoned', color: 'var(--c5)', data: cl.map(function (h) { return cnt('Abandoned', h); }) }, { name: 'Voicemail', color: 'var(--c4)', data: cl.map(function (h) { return cnt('Voicemail', h); }) }, { name: 'No answer (out)', color: 'var(--c6)', data: cl.map(function (h) { return cnt('No answer', h); }) }] }; } });

  def({ id: 'transfer-report', name: 'Transfer report', cat: 'Call detail', desc: 'Which queues transfer to which, how often, and the talk time on transferred contacts.',
    cols: [C('from', 'From queue'), C('to', 'To queue'), C('n', 'Transfers', 'n'), C('share', '% of answered at source', 'pct'), C('talk', 'Avg talk', 'dur'), C('wait', 'Avg wait', 'dur')],
    rows: function (x) { var ans = MCM.groupBy(x.inb.filter(function (c) { return c.outcome === 'answered'; }), function (c) { return c.q; }), xf = x.inb.filter(function (c) { return c.xfer && c.xferTo; }), by = MCM.groupBy(xf, function (c) { return c.q + '>' + c.xferTo; }); return Object.keys(by).map(function (k) { var l = by[k], p = k.split('>'), g = MCM.agg(l); return { fq: p[0], from: MCM.qById[p[0]].name, to: MCM.qById[p[1]].name, n: l.length, share: (ans[p[0]] || []).length ? l.length / ans[p[0]].length * 100 : 0, talk: g.avgTalk, wait: g.asa }; }); },
    drill: function (r) { MCM.drill.queue(r.fq); },
    kpi: function (rows, x) { return [K('Transfers', f.n(rows.reduce(function (s, r) { return s + r.n; }, 0))), K('Transfer rate', f.pct(x.g.xferRate), 'xfer'), K('Top route', rows.length ? esc(sh(rows.slice().sort(function (a, b) { return b.n - a.n; })[0].from) + ' > ' + sh(rows.slice().sort(function (a, b) { return b.n - a.n; })[0].to)) : '-'), K('Routes', f.n(rows.length))]; },
    chart: function (rows) { var qs = MCM.queues, m = qs.map(function (a) { return qs.map(function (b) { var r = rows.filter(function (x) { return x.from === a.name && x.to === b.name; })[0]; return r ? r.n : null; }); }); return { kind: 'heat', rowLabels: qs.map(function (q) { return sh(q.name); }), colLabels: qs.map(function (q) { return sh(q.name).slice(0, 7); }), m: m, fmt: function (v) { return v == null ? '' : v + ' transfers'; }, rgb: '124,58,237' }; } });

  def({ id: 'disposition-wrap-up', name: 'Disposition and wrap-up', cat: 'Call detail', desc: 'Outcome dispositions and wrap-up codes with volume, share, talk, wrap time and CSAT.',
    cols: [C('type', 'Type'), C('value', 'Value'), C('n', 'Calls', 'n'), C('share', 'Share of type %', 'pct'), C('talk', 'Avg talk', 'dur'), C('wrap', 'Avg wrap', 'dur'), C('csat', 'CSAT', 'dec', { d: 2 })],
    rows: function (x) { var l = x.q().filter(function (c) { return c.outcome === 'answered'; }), out = []; [['Disposition', function (c) { return c.disp; }], ['Wrap-up code', function (c) { return c.wrapCode; }]].forEach(function (t) { var by = MCM.groupBy(l, t[1]); Object.keys(by).forEach(function (k) { var g = MCM.agg(by[k]); out.push({ type: t[0], value: k, n: by[k].length, share: by[k].length / l.length * 100, talk: g.avgTalk, wrap: g.avgWrap, csat: g.csat }); }); }); return out; },
    kpi: function (rows) { var d = rows.filter(function (r) { return r.type === 'Disposition'; }).sort(function (a, b) { return b.n - a.n; }), w = rows.filter(function (r) { return r.type !== 'Disposition'; }).sort(function (a, b) { return b.n - a.n; }); return [K('Top disposition', d[0] ? esc(d[0].value) : '-', null, d[0] ? f.n(d[0].n) + ' calls' : ''), K('Top wrap-up code', w[0] ? esc(w[0].value) : '-', null, w[0] ? f.n(w[0].n) + ' calls' : ''), K('Dispositions in use', f.n(d.length)), K('Escalated + complaint', f.n(d.filter(function (r) { return r.value === 'Escalated' || r.value === 'Complaint'; }).reduce(function (s, r) { return s + r.n; }, 0)))]; },
    chart: function (rows) { var d = rows.filter(function (r) { return r.type === 'Disposition'; }).sort(function (a, b) { return b.n - a.n; }); return { kind: 'donut', items: d.map(function (r) { return { name: r.value, value: r.n }; }).slice(0, 8), center: { v: f.n(d.reduce(function (s, r) { return s + r.n; }, 0)), l: 'dispositions' } }; } });

  def({ id: 'ivr-flow-performance', name: 'IVR flow performance', cat: 'Call detail', desc: 'Menu choices per IVR flow: entries, time in IVR, abandons inside the IVR and service level after routing.',
    cols: [C('flow', 'Flow'), C('opt', 'Menu option'), C('queue', 'Routed to'), C('n', 'Entries', 'n'), C('ivr', 'Avg IVR time', 'dur'), C('ivrAb', 'Abandoned in IVR', 'n'), C('ivrAbPct', 'IVR abandon %', 'pct'), C('answered', 'Answered', 'n'), C('sl', 'Service level', 'pct', { html: function (r) { return UI.slCell(r.sl, 80); } })],
    rows: function (x) { var by = MCM.groupBy(x.inb.filter(function (c) { return c.flow && c.path; }), function (c) { return c.path[0] + '|' + c.path[1] + '|' + c.q; }); return Object.keys(by).map(function (k) { var l = by[k], p = k.split('|'), g = MCM.agg(l), ia = l.filter(function (c) { return c.abandonStage === 'ivr'; }).length; return { q: p[2], flow: p[0], opt: p[1], queue: MCM.qById[p[2]].name, n: l.length, ivr: l.reduce(function (s, c) { return s + c.ivr; }, 0) / l.length, ivrAb: ia, ivrAbPct: ia / l.length * 100, answered: g.answered, sl: g.sl }; }); },
    drill: function (r) { MCM.drill.queue(r.q); },
    kpi: function (rows) { var n = rows.reduce(function (s, r) { return s + r.n; }, 0), ab = rows.reduce(function (s, r) { return s + r.ivrAb; }, 0); return [K('IVR entries', f.n(n)), K('Abandoned in IVR', f.n(ab), 'abandoned', f.pct(n ? ab / n * 100 : 0)), K('Flows used', f.n(Object.keys(MCM.groupBy(rows, function (r) { return r.flow; })).length)), K('Avg IVR time', f.dur(n ? rows.reduce(function (s, r) { return s + r.ivr * r.n; }, 0) / n : 0))]; },
    chart: function (rows) { return { kind: 'hbars', items: rows.slice().sort(function (a, b) { return b.n - a.n; }).slice(0, 12).map(function (r) { return { label: r.flow + ': ' + r.opt, sub: '> ' + r.queue, value: r.n }; }) }; } });

  def({ id: 'repeat-callers', name: 'Repeat callers', cat: 'Customer', desc: 'Numbers that contacted more than once in the period, with outcomes and the queues involved.',
    cols: [C('num', 'Caller'), C('n', 'Contacts', 'n'), C('answered', 'Answered', 'n'), C('abandoned', 'Abandoned', 'n'), C('flag', 'Flagged repeat', 'n'), C('queues', 'Queues', 'n'), C('top', 'Main queue'), C('first', 'First contact', 'time'), C('last', 'Last contact', 'time')],
    rows: function (x) { var by = MCM.groupBy(x.inb, function (c) { return c.from; }); return Object.keys(by).filter(function (k) { return by[k].length >= 2; }).map(function (k) { var l = by[k], g = MCM.agg(l), qq = MCM.groupBy(l, function (c) { return c.q; }), top = Object.keys(qq).sort(function (a, b) { return qq[b].length - qq[a].length; })[0]; return { num: MCM.mask(k), n: l.length, answered: g.answered, abandoned: g.abandoned, flag: g.repeat, queues: Object.keys(qq).length, top: MCM.qById[top].name, first: l[0].ts, last: l[l.length - 1].ts, lastId: l[l.length - 1].id }; }); },
    drill: function (r) { MCM.drill.call(r.lastId); },
    kpi: function (rows, x) { var rc = rows.reduce(function (s, r) { return s + r.n; }, 0); return [K('Repeat callers', f.n(rows.length)), K('Contacts from repeat callers', f.pct(x.g.offered ? rc / x.g.offered * 100 : 0), null, f.n(rc) + ' of ' + f.n(x.g.offered)), K('Repeat rate (flagged)', f.pct(x.g.repeatRate), 'fcr'), K('Most contacts', f.n(rows.reduce(function (m, r) { return Math.max(m, r.n); }, 0)))]; },
    chart: function (rows) { return { kind: 'hbars', items: rows.slice().sort(function (a, b) { return b.n - a.n; }).slice(0, 10).map(function (r) { return { label: r.num, sub: r.top, value: r.n }; }) }; } });

  def({ id: 'first-contact-resolution', name: 'First-contact resolution', cat: 'Customer', desc: 'FCR, repeat-contact and transfer rates by queue against an 85% target.',
    cols: [C('name', 'Queue'), C('answered', 'Answered', 'n'), C('fcrN', 'Resolved first contact', 'n'), C('fcr', 'FCR %', 'pct', { html: function (r) { return '<span class="' + (r.fcr >= 85 ? 'ok-t' : r.fcr >= 78 ? 'warn-t' : 'bad-t') + '">' + f.pct(r.fcr) + '</span>'; } }), C('rep', 'Repeat %', 'pct'), C('xfer', 'Transfer %', 'pct'), C('aht', 'AHT', 'dur')],
    rows: function (x) { var by = MCM.groupBy(x.inb, function (c) { return c.q; }); return qsSel().map(function (q) { var g = MCM.agg(by[q.id] || []); return { q: q.id, name: q.name, answered: g.answered, fcrN: g.fcr, fcr: g.fcrRate, rep: g.repeatRate, xfer: g.xferRate, aht: g.aht }; }); },
    drill: function (r) { MCM.drill.queue(r.q); },
    kpi: function (rows, x) { return [K('FCR', f.pct(x.g.fcrRate), 'fcr', 'target 85%'), K('Repeat contacts', f.pct(x.g.repeatRate)), K('Transfer rate', f.pct(x.g.xferRate), 'xfer'), K('Queues below target', f.n(rows.filter(function (r) { return r.answered && r.fcr < 85; }).length))]; },
    chart: function (rows) { return { type: 'bar', labels: rows.map(function (r) { return sh(r.name); }), tipLabels: rows.map(function (r) { return r.name; }), min: 50, max: 100, goal: 85, legend: false, fmt: function (v) { return v.toFixed(0) + '%'; }, series: [{ name: 'FCR %', color: 'var(--c3)', data: rows.map(function (r) { return +r.fcr.toFixed(1); }) }] }; } });

  def({ id: 'csat-nps', name: 'CSAT and NPS-style score', cat: 'Customer', desc: 'Survey responses by queue: average CSAT, % good (4-5) and an NPS-style score (5-star share minus 1-3 star share).',
    cols: [C('name', 'Queue'), C('answered', 'Answered', 'n'), C('resp', 'Responses', 'n'), C('rate', 'Response rate %', 'pct'), C('csat', 'CSAT', 'dec', { d: 2 }), C('good', '% good (4-5)', 'pct'), C('prom', '5-star %', 'pct'), C('det', '1-3 star %', 'pct'), C('nps', 'NPS-style', 'dec')],
    rows: function (x) { var by = MCM.groupBy(x.inb, function (c) { return c.q; }); return qsSel().map(function (q) { var l = by[q.id] || [], g = MCM.agg(l), s = l.filter(function (c) { return c.csat != null; }), n = s.length, p = s.filter(function (c) { return c.csat === 5; }).length, d = s.filter(function (c) { return c.csat <= 3; }).length; return { q: q.id, name: q.name, answered: g.answered, resp: n, rate: g.answered ? n / g.answered * 100 : 0, csat: g.csat, good: g.csatPct, prom: n ? p / n * 100 : null, det: n ? d / n * 100 : null, nps: n ? (p - d) / n * 100 : null, dist: [1, 2, 3, 4, 5].map(function (v) { return s.filter(function (c) { return c.csat === v; }).length; }) }; }); },
    drill: function (r) { MCM.drill.queue(r.q); },
    kpi: function (rows, x) { var n = rows.reduce(function (s, r) { return s + r.resp; }, 0), p = rows.reduce(function (s, r) { return s + (r.prom || 0) * r.resp / 100; }, 0), d = rows.reduce(function (s, r) { return s + (r.det || 0) * r.resp / 100; }, 0); return [K('CSAT', f.dec(x.g.csat, 2), 'csat', f.n(n) + ' responses'), K('% good (4-5)', f.pct(x.g.csatPct)), K('NPS-style score', n ? f.dec((p - d) / n * 100, 0) : '-', null, '5-star minus 1-3 star'), K('Response rate', f.pct(x.g.answered ? n / x.g.answered * 100 : 0))]; },
    chart: function (rows) { var cols = ['var(--bad)', '#f59e0b', '#eab308', 'var(--c3)', 'var(--ok-dot)']; return { type: 'stack', labels: rows.map(function (r) { return sh(r.name); }), tipLabels: rows.map(function (r) { return r.name; }), series: [5, 4, 3, 2, 1].map(function (v) { return { name: v + ' star', color: cols[v - 1], data: rows.map(function (r) { return r.dist[v - 1]; }) }; }) }; } });

  def({ id: 'topic-sentiment', name: 'Topic and sentiment', cat: 'Customer', desc: 'Detected conversation topics with mention volume, average sentiment, negative share and CSAT.',
    cols: [C('topic', 'Topic'), C('n', 'Mentions', 'n'), C('share', '% of answered', 'pct'), C('sent', 'Avg sentiment', 'dec', { d: 2, html: function (r) { return '<span class="' + (r.sent < -0.05 ? 'bad-t' : r.sent > 0.1 ? 'ok-t' : '') + '">' + (r.sent >= 0 ? '+' : '') + f.dec(r.sent, 2) + '</span>'; } }), C('neg', 'Negative %', 'pct'), C('csat', 'CSAT', 'dec', { d: 2 })],
    rows: function (x) { var ans = x.inb.filter(function (c) { return c.outcome === 'answered'; }), by = {}; ans.forEach(function (c) { (c.topics || []).forEach(function (t) { (by[t] = by[t] || []).push(c); }); }); return Object.keys(by).map(function (t) { var l = by[t], g = MCM.agg(l); return { topic: t, n: l.length, share: ans.length ? l.length / ans.length * 100 : 0, sent: g.sent == null ? 0 : g.sent, neg: l.filter(function (c) { return c.sent != null && c.sent < -0.2; }).length / l.length * 100, csat: g.csat }; }); },
    kpi: function (rows) { var s = rows.slice().sort(function (a, b) { return b.n - a.n; }), w = rows.slice().sort(function (a, b) { return a.sent - b.sent; }); return [K('Topics detected', f.n(rows.length)), K('Most mentioned', s[0] ? esc(s[0].topic) : '-', null, s[0] ? f.n(s[0].n) + ' mentions' : ''), K('Most negative', w[0] ? esc(w[0].topic) : '-', null, w[0] ? 'sentiment ' + f.dec(w[0].sent, 2) : ''), K('Mentions', f.n(rows.reduce(function (a, r) { return a + r.n; }, 0)))]; },
    chart: function (rows) { var r2 = rows.slice().sort(function (a, b) { return b.n - a.n; }); return { type: 'bar', labels: r2.map(function (r) { return sh(r.topic); }), tipLabels: r2.map(function (r) { return r.topic; }), series: [{ name: 'Mentions', color: 'var(--c2)', data: r2.map(function (r) { return r.n; }) }, { name: 'Avg sentiment', axis: 'r', type: 'line', color: 'var(--c5)', data: r2.map(function (r) { return +r.sent.toFixed(2); }), fmt: function (v) { return f.dec(v, 2); } }], fmt2: function (v) { return v.toFixed(2); } }; } });

  var EVBY = null;
  def({ id: 'qa-scores', name: 'QA scores', cat: 'Quality', desc: 'Evaluated interactions per agent: average, range, below-pass-mark count, critical fails and disputes.',
    cols: [C('name', 'Agent'), C('team', 'Team'), C('n', 'Evaluated', 'n'), C('avg', 'Avg QA', 'dec', { html: function (r) { return '<span class="' + (r.avg >= MCM.goals.qa ? 'ok-t' : r.avg >= MCM.goals.qa - 8 ? 'warn-t' : 'bad-t') + '">' + f.dec(r.avg, 1) + '</span>'; } }), C('min', 'Lowest', 'n'), C('max', 'Highest', 'n'), C('below', 'Below 80', 'n'), C('crit', 'Critical fails', 'n'), C('disp', 'Disputed', 'n')],
    rows: function (x) { var ev = {}; MCM.evals.forEach(function (e) { ev[e.call] = e; }); var by = MCM.groupBy(x.q().filter(function (c) { return c.qa != null; }), function (c) { return c.agent; }); return Object.keys(by).map(function (id) { var l = by[id], a = MCM.aById[id], es = l.map(function (c) { return ev[c.id]; }).filter(Boolean), q = l.map(function (c) { return c.qa; }); return { agent: id, name: a.name, team: a.team, n: l.length, avg: q.reduce(function (s, v) { return s + v; }, 0) / q.length, min: Math.min.apply(null, q), max: Math.max.apply(null, q), below: q.filter(function (v) { return v < 80; }).length, crit: es.filter(function (e) { return e.critFail; }).length, disp: es.filter(function (e) { return e.status === 'disputed'; }).length }; }); },
    drill: function (r) { MCM.drill.agent(r.agent); },
    kpi: function (rows) { var n = rows.reduce(function (s, r) { return s + r.n; }, 0); return [K('Evaluations', f.n(n)), K('Avg QA', f.dec(n ? rows.reduce(function (s, r) { return s + r.avg * r.n; }, 0) / n : null, 1), 'qa', 'goal ' + MCM.goals.qa), K('Below 80', f.n(rows.reduce(function (s, r) { return s + r.below; }, 0))), K('Critical fails', f.n(rows.reduce(function (s, r) { return s + r.crit; }, 0)))]; },
    chart: function (rows) { var r2 = rows.slice().sort(function (a, b) { return b.avg - a.avg; }); return { type: 'bar', labels: r2.map(function (r) { return r.name.split(' ')[0]; }), tipLabels: r2.map(function (r) { return r.name; }), min: 50, max: 100, goal: MCM.goals.qa, legend: false, series: [{ name: 'Avg QA', color: 'var(--c6)', data: r2.map(function (r) { return +r.avg.toFixed(1); }) }] }; } });

  D.forEach(function (d) { d.tid = 'rpt-' + d.id; });

  /* ---------- schedule helpers ---------- */
  function parseFreq(s) {
    if (s.freqType) return { type: s.freqType, time: s.time || '08:00', dow: s.dow == null ? 1 : s.dow, dom: s.dom || 1 };
    var m = /^Daily (\d\d:\d\d)/.exec(s.freq || ''), w = /^(\w{3}) (\d\d:\d\d)/.exec(s.freq || ''), mo = /^Monthly day (\d+) (\d\d:\d\d)/.exec(s.freq || '');
    if (m) return { type: 'daily', time: m[1], dow: 1, dom: 1 };
    if (mo) return { type: 'monthly', time: mo[2], dow: 1, dom: +mo[1] };
    if (w) return { type: 'weekly', time: w[2], dow: Math.max(0, DOWN.indexOf(w[1])), dom: 1 };
    return { type: 'daily', time: '08:00', dow: 1, dom: 1 };
  }
  function freqText(p) { return p.type === 'daily' ? 'Daily ' + p.time : p.type === 'weekly' ? DOWN[p.dow] + ' ' + p.time : 'Monthly day ' + p.dom + ' ' + p.time; }
  function nextRun(s) {
    var p = parseFreq(s), hm = p.time.split(':'), off = (+hm[0]) * 3600000 + (+hm[1]) * 60000, now = Date.now();
    for (var k = 0; k < 40; k++) {
      var ds = T.sod(MCM.TODAY + k * T.day + 12 * 3600000), mid = ds + 12 * 3600000, ok = p.type === 'daily' || (p.type === 'weekly' && T.dow(mid) === p.dow) || (p.type === 'monthly' && T.parts(mid).d === p.dom);
      if (ok && ds + off > now) return ds + off;
    }
    return null;
  }
  function inTxt(ts) { var m = Math.round((ts - Date.now()) / 60000); return m < 60 ? 'in ' + m + ' min' : m < 1440 ? 'in ' + Math.round(m / 60) + ' h' : 'in ' + Math.round(m / 1440) + ' d'; }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'; }

  function runSchedule(s) {
    var d = byId[s.report]; if (!d) { UI.toast('Report "' + esc(s.report) + '" no longer exists', { kind: 'bad' }); return; }
    var rc = mkRc(s.range || 'yesterday', d), rows = d.rows(rc), cols = tcols(d), heads = cols.map(function (c) { return c.label; }), data = rows.map(function (r) { return cols.map(function (c) { return c.csv(r); }); }), name = slug(s.name) + '-' + new Date().toISOString().slice(0, 10);
    if (s.fmt === 'XLS') UI.xls(name, heads, data); else UI.csv(name, heads, data);
    s.last = Date.now(); MCM.saveSchedules(); MCM.audit('Run scheduled report', s.name + ' - ' + d.name + ' (' + s.fmt + ', ' + rows.length + ' rows, ' + s.channel + ')');
  }
  function schedModal(ctx, s, reportId) {
    var isNew = !s, p = s ? parseFreq(s) : { type: 'weekly', time: '08:00', dow: 1, dom: 1 }; s = s || { report: reportId || D[0].id, name: '', to: '', fmt: 'CSV', channel: 'email', enabled: true, last: null, range: 'yesterday' };
    var body = '<div class="fg c2"><label>Name<input class="inp" data-s="name" value="' + esc(s.name || (byId[s.report] ? byId[s.report].name : '')) + '"></label><label>Report<select class="inp" data-s="report">' + UI.opts(D.map(function (d) { return [d.id, d.name]; }), s.report) + '</select></label>' +
      '<label>Frequency<select class="inp" data-s="type">' + UI.opts([['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']], p.type) + '</select></label><label>Time (' + esc(MCM.settings.tz) + ')<input class="inp" type="time" data-s="time" value="' + p.time + '"></label>' +
      '<label>Day of week (weekly)<select class="inp" data-s="dow">' + UI.opts(DOWN.map(function (d, i) { return [i, d]; }), p.dow) + '</select></label><label>Day of month (monthly)<input class="inp" type="number" min="1" max="28" data-s="dom" value="' + p.dom + '"></label>' +
      '<label>Format<select class="inp" data-s="fmt">' + UI.opts(['CSV', 'XLS'], s.fmt) + '</select></label><label>Delivery channel<select class="inp" data-s="channel">' + UI.opts([['email', 'E-mail'], ['webhook', 'Webhook'], ['sftp', 'SFTP']], s.channel) + '</select></label>' +
      '<label>Data range<select class="inp" data-s="range">' + UI.opts([['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'], ['filters', 'Current page filters']], s.range || 'yesterday') + '</select></label><label>Recipients / endpoint<input class="inp" data-s="to" placeholder="ops@company.com, or https://... , or sftp://..." value="' + esc(s.to) + '"></label></div>' +
      '<div class="note mt">' + UI.icon('info') + '<span>' + UI.preview() + ' Scheduled delivery by e-mail, webhook or SFTP needs the backend job runner. "Run now" on the Scheduled tab generates the real file in the browser.</span></div>';
    UI.modal({ title: isNew ? 'Schedule report' : 'Edit schedule', body: body, foot: [{ label: 'Cancel' }, { label: isNew ? 'Create schedule' : 'Save', pri: true, fn: function (m) {
      var v = {}; m.querySelectorAll('[data-s]').forEach(function (el) { v[el.dataset.s] = el.value; });
      if (!v.name.trim()) { UI.toast('Give the schedule a name', { kind: 'bad' }); return false; }
      if (!v.to.trim()) { UI.toast('Add a recipient or endpoint', { kind: 'bad' }); return false; }
      var np = { type: v.type, time: v.time || '08:00', dow: +v.dow, dom: Math.max(1, Math.min(28, +v.dom || 1)) };
      Object.assign(s, { name: v.name.trim(), report: v.report, freqType: np.type, time: np.time, dow: np.dow, dom: np.dom, freq: freqText(np), to: v.to.trim(), fmt: v.fmt, channel: v.channel, range: v.range });
      if (isNew) { s.id = 's' + Date.now(); MCM.schedules.push(s); }
      MCM.saveSchedules(); MCM.audit(isNew ? 'Schedule created' : 'Schedule edited', s.name + ' (' + s.freq + ', ' + s.fmt + ', ' + s.channel + ')'); UI.toast('Schedule saved', { kind: 'ok' }); ctx.refresh();
    } }] });
  }
  function filtersNow() { var F = MCM.F; return { preset: F.preset, from: F.from, to: F.to, compare: F.compare, queues: F.queues.slice(), teams: F.teams.slice(), channel: F.channel, dir: F.dir }; }
  function filterText(fl) { var p = (MCM.PRESETS.filter(function (x) { return x[0] === fl.preset; })[0] || [0, fl.preset])[1], a = [p]; if (fl.queues && fl.queues.length) a.push(fl.queues.length + ' queue(s)'); if (fl.teams && fl.teams.length) a.push(fl.teams.join('/')); if (fl.channel && fl.channel !== 'all') a.push(fl.channel); if (fl.dir && fl.dir !== 'all') a.push(fl.dir); return a.join(', '); }
  function saveViewModal(ctx, view) {
    UI.modal({ title: 'Save view', body: '<div class="fg"><label>View name<input class="inp" data-vn value="' + esc(view.name || '') + '"></label></div><p class="muted mt">Stores the date range, filters' + (view.report ? ', hidden columns and options' : ' and the builder settings') + '. Reopen it from the Saved views tab.</p>', foot: [{ label: 'Cancel' }, { label: 'Save view', pri: true, fn: function (m) {
      var n = m.querySelector('[data-vn]').value.trim(); if (!n) { UI.toast('Name the view', { kind: 'bad' }); return false; }
      view.name = n; view.id = 'v' + Date.now(); view.owner = MCM.user.id; view.ts = Date.now(); view.filters = filtersNow(); MCM.savedViews.push(view); MCM.saveViews(); MCM.audit('View saved', n); UI.toast('View saved', { kind: 'ok' });
    } }] });
  }
  function applyFilters(fl) { if (fl) { Object.assign(MCM.F, { preset: fl.preset, from: fl.from, to: fl.to, compare: fl.compare, queues: (fl.queues || []).slice(), teams: (fl.teams || []).slice(), channel: fl.channel || 'all', dir: fl.dir || 'all' }); MCM.F.save(); } }

  /* ---------- builder model ---------- */
  var BDS = {
    Calls: { fields: [['t', 'Time', 'time'], ['id', 'Call ID', 'text'], ['dir', 'Direction', 'text'], ['queue', 'Queue', 'text'], ['from', 'Caller', 'text'], ['agent', 'Agent', 'text'], ['team', 'Team', 'text'], ['channel', 'Channel', 'text'], ['outcome', 'Outcome', 'text'], ['disp', 'Disposition', 'text'], ['wait', 'Wait', 'dur'], ['talk', 'Talk', 'dur'], ['hold', 'Hold', 'dur'], ['wrap', 'Wrap-up', 'dur'], ['csat', 'CSAT', 'n'], ['qa', 'QA', 'n'], ['sent', 'Sentiment', 'dec']], defF: ['t', 'id', 'queue', 'agent', 'outcome', 'wait', 'talk'], groups: [['none', 'None (call detail)'], ['queue', 'Queue'], ['agent', 'Agent'], ['team', 'Team'], ['day', 'Day'], ['hour', 'Hour of day'], ['disposition', 'Disposition'], ['outcome', 'Outcome'], ['channel', 'Channel']], defG: 'queue' },
    Agents: { fields: [['name', 'Agent', 'text'], ['ext', 'Extension', 'text'], ['team', 'Team', 'text'], ['role', 'Role', 'text'], ['site', 'Site', 'text'], ['occupancy', 'Occupancy %', 'pct'], ['adherence', 'Adherence %', 'pct'], ['shrink', 'Shrinkage %', 'pct'], ['staffed', 'Staffed time', 'hm']], defF: ['name', 'team', 'occupancy', 'adherence'], groups: [['none', 'None (one row per agent)'], ['team', 'Team'], ['site', 'Site'], ['role', 'Role']], defG: 'none' },
    Queues: { fields: [['name', 'Queue', 'text'], ['ext', 'Extension', 'text'], ['channel', 'Channel', 'text'], ['dept', 'Department', 'text'], ['site', 'Site', 'text'], ['slsec', 'SL threshold (s)', 'n'], ['sltarget', 'SL goal %', 'n']], defF: ['name', 'channel', 'dept'], groups: [['none', 'None (one row per queue)'], ['dept', 'Department'], ['channel', 'Channel'], ['site', 'Site']], defG: 'none' },
    Intervals: { fields: [['t', 'Interval start', 'time']], defF: ['t'], groups: [['15', '15 minutes'], ['30', '30 minutes'], ['60', 'Hourly'], ['day', 'Daily']], defG: '30' }
  };
  var BM = [['count', 'Records', 'n', function (g) { return g.total; }], ['offered', 'Offered', 'n', function (g) { return g.offered; }], ['answered', 'Answered', 'n', function (g) { return g.answered; }], ['abandoned', 'Abandoned', 'n', function (g) { return g.abandoned; }], ['abandonRate', 'Abandon %', 'pct', function (g) { return g.abandonRate; }], ['sl', 'Service level', 'pct', function (g) { return g.sl; }], ['asa', 'Avg wait (ASA)', 'dur', function (g) { return g.asa; }], ['avgTalk', 'Avg talk', 'dur', function (g) { return g.avgTalk; }], ['avgHold', 'Avg hold', 'dur', function (g) { return g.avgHold; }], ['aht', 'AHT', 'dur', function (g) { return g.aht; }], ['fcrRate', 'FCR %', 'pct', function (g) { return g.fcrRate; }], ['xferRate', 'Transfer %', 'pct', function (g) { return g.xferRate; }], ['csat', 'CSAT', 'dec', function (g) { return g.csat; }], ['qa', 'QA', 'dec', function (g) { return g.qa; }], ['minutes', 'Billable minutes', 'n', function (g) { return g.minutes; }], ['cost', 'Cost', 'money', function (g) { return g.cost; }]];
  var BMI = {}; BM.forEach(function (m) { BMI[m[0]] = m; });
  function bDefault(ds) { var d = BDS[ds]; return { dataset: ds, groupBy: d.defG, fields: d.defF.slice(), measures: ['offered', 'sl', 'abandonRate', 'aht'], f: { outcome: 'any', q: '', agent: '', minTalk: 0 }, chart: 'bar', name: '' }; }
  function bCfg() { var c = MCM.store.get('rptBuilder', null); if (!c || !BDS[c.dataset]) c = bDefault('Calls'); c.f = Object.assign({ outcome: 'any', q: '', agent: '', minTalk: 0 }, c.f || {}); return c; }

  function bRun(cfg, ctx) {
    var ds = cfg.dataset, B = BDS[ds], R = ctx.R, fl = cfg.f, list = ctx.q({}), cols = [], rows = [], note = '';
    list = list.filter(function (c) { return (fl.outcome === 'any' || c.outcome === fl.outcome) && (!fl.q || c.q === fl.q) && (!fl.agent || c.agent === fl.agent) && (!(+fl.minTalk) || c.talk >= +fl.minTalk); });
    var gb = cfg.groupBy, grouped = ds === 'Intervals' || gb !== 'none', mids = cfg.measures.filter(function (k) { return BMI[k]; });
    function fcol(k) { var d = B.fields.filter(function (x) { return x[0] === k; })[0]; return d && { k: k, label: d[1], type: d[2] }; }
    function mcol(k) { var m = BMI[k]; return { k: k, label: m[1], type: m[2], m: m }; }
    if (ds === 'Calls' && gb === 'none') {
      cols = cfg.fields.map(fcol).filter(Boolean);
      rows = list.slice(-5000).reverse().map(function (c) { var a = MCM.aById[c.agent], r = { _call: c.id, t: c.ts, id: c.id, dir: c.dir === 'in' ? 'Inbound' : 'Outbound', queue: MCM.qById[c.q].name, from: MCM.mask(c.from), agent: a ? a.name : '-', team: a ? a.team : MCM.qById[c.q].dept, channel: c.ch, outcome: c.outcome, disp: c.disp || '-', wait: c.wait, talk: c.talk, hold: c.hold, wrap: c.wrap, csat: c.csat, qa: c.qa, sent: c.sent }; return r; });
      if (list.length > 5000) note = 'Detail view shows the latest 5,000 of ' + f.n(list.length) + ' calls.';
    } else {
      var recs = [];
      if (ds === 'Calls') { var kf = { queue: function (c) { return [MCM.qById[c.q].name, MCM.qById[c.q].name]; }, agent: function (c) { var a = MCM.aById[c.agent]; return [a ? a.name : 'Unassigned', a ? a.name : 'zz']; }, team: function (c) { var a = MCM.aById[c.agent]; return [a ? a.team : MCM.qById[c.q].dept, a ? a.team : MCM.qById[c.q].dept]; }, day: function (c) { var s = T.sod(c.ts); return [T.date(s), s]; }, hour: function (c) { var h = T.hourOf(c.ts); return [(h < 10 ? '0' : '') + h + ':00', h]; }, disposition: function (c) { return [c.disp || '-', c.disp || '-']; }, outcome: function (c) { return [c.outcome, c.outcome]; }, channel: function (c) { return [c.ch, c.ch]; } }[gb], by = {}; list.forEach(function (c) { var k = kf(c); (by[k[0]] = by[k[0]] || { g: k[0], s: k[1], list: [] }).list.push(c); }); recs = Object.keys(by).map(function (k) { return by[k]; }); cols = [{ k: 'g', label: (B.groups.filter(function (x) { return x[0] === gb; })[0] || [0, 'Group'])[1], type: 'text' }]; recs.forEach(function (r) { r.g = r.g; }); }
      else if (ds === 'Agents') {
        var st = MCM.agentStats(list, R).filter(function (s) { return (s.sched > 0 || s.handled > 0) && (!fl.agent || s.agent.id === fl.agent); }); recs = st.map(function (s) { return { agentId: s.agent.id, name: s.agent.name, ext: s.agent.ext, team: s.agent.team, role: s.agent.role, site: s.agent.site, occupancy: s.occupancy, adherence: s.adherence, shrink: s.shrink, staffed: s.staffed, list: list.filter(function (c) { return c.agent === s.agent.id; }), n: 1 }; });
      } else if (ds === 'Queues') {
        recs = MCM.queues.filter(function (q) { return !fl.q || q.id === fl.q; }).map(function (q) { return { qid: q.id, name: q.name, ext: q.ext, channel: q.channel, dept: q.dept, site: q.site, slsec: q.sl.sec, sltarget: q.sl.target, list: list.filter(function (c) { return c.q === q.id; }), n: 1 }; });
      } else {
        var step = gb === 'day' ? T.day : (+gb) * 60000, bks = MCM.buckets(list, gb === 'day' ? R.from : (R.to - R.from > T.day * 3 ? R.to - T.day : R.from), R.to, step); recs = bks.filter(function (b) { return b.list.length; }).map(function (b) { return { t: b.t, list: b.list, n: 1 }; });
      }
      if (ds === 'Calls') {
        cols = cols.concat(mids.map(mcol)); if (!mids.length) cols.push(mcol('count'));
        rows = recs.sort(function (a, b) { return a.s < b.s ? -1 : a.s > b.s ? 1 : 0; }).map(function (r) { var g = MCM.agg(r.list), o = { g: r.g }; cols.forEach(function (c) { if (c.m) o[c.k] = c.m[3](g); }); return o; });
      } else {
        var dimKey = ds === 'Agents' ? (gb === 'none' ? null : gb) : ds === 'Queues' ? (gb === 'none' ? null : gb) : null, groups = [];
        if (dimKey) { var gm = {}; recs.forEach(function (r) { (gm[r[dimKey]] = gm[r[dimKey]] || []).push(r); }); groups = Object.keys(gm).sort().map(function (k) { return { g: k, recs: gm[k] }; }); cols = [{ k: 'g', label: (B.groups.filter(function (x) { return x[0] === gb; })[0] || [0, 'Group'])[1], type: 'text' }]; }
        else { groups = recs.map(function (r) { return { rec: r, recs: [r] }; }); cols = (ds === 'Intervals' ? ['t'] : cfg.fields.filter(function (k) { return B.fields.some(function (x) { return x[0] === k; }); })).map(fcol).filter(Boolean); if (!cols.length) cols = [fcol(B.fields[0][0])]; }
        cols = cols.concat(mids.map(mcol)); if (!mids.length && dimKey) cols.push(mcol('count'));
        var mean = function (arr, k) { var v = arr.map(function (r) { return r[k]; }).filter(function (x) { return x != null; }); return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : null; };
        rows = groups.map(function (gr) { var all = gr.recs.reduce(function (s, r) { return s.concat(r.list); }, []), g = MCM.agg(all), o = { g: gr.g }; if (gr.rec) { Object.keys(gr.rec).forEach(function (k) { if (k !== 'list') o[k] = gr.rec[k]; }); if (gr.rec.agentId) o._agent = gr.rec.agentId; if (gr.rec.qid) o._q = gr.rec.qid; } else { ['occupancy', 'adherence', 'shrink'].forEach(function (k) { o[k] = mean(gr.recs, k); }); o.staffed = gr.recs.reduce(function (s, r) { return s + (r.staffed || 0); }, 0); } cols.forEach(function (c) { if (c.m) o[c.k] = c.m[3](g); }); if (o.count == null && dimKey) o.count = g.total; return o; });
        if (ds === 'Intervals' || dimKey) rows = rows.filter(function (r) { return true; });
      }
    }
    return { cols: cols, rows: rows, note: note, grouped: grouped, detail: ds === 'Calls' && gb === 'none' };
  }
  function bChart(cfg, res) {
    if (cfg.chart === 'none' || res.detail || !res.rows.length) return null;
    var yc = res.cols.filter(function (c) { return NUMT[c.type] && c.k !== 't'; })[0]; if (!yc) return null;
    var xc = res.cols[0], lab = function (r) { return xc.type === 'time' ? T.dt(r[xc.k]) : String(r[xc.k] == null ? '' : r[xc.k]); }, rows = res.rows.slice(0, 40), fm = function (v) { return fmtCell(yc, v); };
    if (cfg.chart === 'donut') return { kind: 'donut', items: rows.filter(function (r) { return r[yc.k] > 0; }).slice(0, 10).map(function (r) { return { name: lab(r), value: +(+r[yc.k]).toFixed(2) }; }), center: { v: String(rows.length), l: 'groups' } };
    return { type: cfg.chart === 'line' ? 'line' : 'bar', labels: rows.map(function (r) { var l = lab(r); return xc.type === 'time' ? l.split(' ').pop() : sh(l); }), tipLabels: rows.map(lab), legend: false, series: [{ name: yc.label, color: 'var(--c2)', data: rows.map(function (r) { return r[yc.k] == null ? null : +(+r[yc.k]).toFixed(2); }), fmt: fm }] };
  }
  function bTable(host, cfg, res, ctx) {
    delete UI._ts.rptb;
    var cols = res.cols.map(function (c) { return { k: c.k, label: c.label, r: !!NUMT[c.type], val: function (r) { return r[c.k]; }, html: function (r) { return c.k === 'outcome' && OUTL[r.outcome] ? UI.tag(OUTL[r.outcome][0], OUTL[r.outcome][1]) : fmtCell(c, r[c.k]); }, csv: function (r) { var v = r[c.k]; if (c.type === 'time') return v == null ? '' : T.dt(v); if (c.type === 'dur') return f.dur(v); if (c.type === 'hm') return f.hm(v); return typeof v === 'number' ? Math.round(v * 100) / 100 : v; } }; });
    UI.table(host, { id: 'rptb', noun: 'rows', csv: MCM.can('export') ? 'custom-' + slug(cfg.name || cfg.dataset) : undefined, pageSize: 15, rows: res.rows, cols: cols, onRow: function (r) { if (r._call) MCM.drill.call(r._call); else if (r._agent) MCM.drill.agent(r._agent); else if (r._q) MCM.drill.queue(r._q); } });
  }

  /* ---------- page ---------- */
  MCM.page({
    id: 'reports', title: 'Reports', icon: 'reports', filters: ['date', 'queue', 'team', 'channel', 'dir'],
    tabs: [['library', 'Library'], ['builder', 'Report builder'], ['saved', 'Saved views'], ['scheduled', 'Scheduled']],
    render: function (ctx) {
      var tab = ctx.tab, R = ctx.R;
      /* actions are shared */
      ctx.on('[data-sched-new]', function (e, el) { if (!MCM.can('export')) return MCM.deny('schedule reports'); schedModal(ctx, null, el.dataset.schedNew || null); });

      if (tab === 'library') {
        var rid = ctx.params.r, d = rid && byId[rid];
        if (d) return reportView(ctx, d);
        var views = MCM.savedViews.length, act = MCM.schedules.filter(function (s) { return s.enabled; }).length, ex = MCM.store.get('audit', []).filter(function (a) { return /^Export/.test(a.action) && a.ts > Date.now() - 7 * T.day; }).length;
        ctx.el.innerHTML = '<div class="grid g4">' + [UI.kpi({ label: 'Reports available', value: D.length, sub: CATS.length + ' categories, each with its own columns and chart' }), UI.kpi({ label: 'Saved views', value: views, go: 'reports/saved', sub: 'personal and shared' }), UI.kpi({ label: 'Active schedules', value: act, go: 'reports/scheduled', sub: MCM.schedules.length + ' total' }), UI.kpi({ label: 'Exports (7 days)', value: ex, sub: 'from the audit log' })].join('') + '</div>' +
          '<div class="tb card" style="margin-top:1.5rem;border:1px solid var(--line);border-radius:.75rem"><input class="inp" id="rsearch" placeholder="Search reports..." value="' + esc(MCM.store.get('rptQ', '')) + '"><span class="grow"></span>' + UI.seg([['all', 'All']].concat(CATS.map(function (c) { return [c, c]; })), MCM.store.get('rptCat', 'all'), 'rcat', 'sm') + '</div><div id="rlist"></div>';
        var paint = function () {
          var q = (ctx.el.querySelector('#rsearch').value || '').toLowerCase(), cat = MCM.store.get('rptCat', 'all'), h = '';
          CATS.forEach(function (c) {
            if (cat !== 'all' && cat !== c) return; var ds = D.filter(function (x) { return x.cat === c && (!q || (x.name + ' ' + x.desc + ' ' + x.cat).toLowerCase().indexOf(q) >= 0); }); if (!ds.length) return;
            h += '<div class="mt"><h3 style="margin:0 0 .3rem">' + c + '</h3><div class="muted" style="margin-bottom:1rem">' + CATNOTE[c] + '</div><div class="grid g3">' + ds.map(function (x) { return '<div class="card click" data-rpt="' + x.id + '" style="cursor:pointer;display:grid;gap:.6rem"><div style="display:flex;justify-content:space-between;gap:1rem"><b style="font-size:1.35rem">' + esc(x.name) + '</b>' + UI.tag(x.cols.length + ' cols') + '</div><div class="muted" style="font-size:1.2rem">' + esc(x.desc) + '</div><div style="display:flex;gap:.6rem;align-items:center">' + UI.tag(x.cat, 'brand') + (x.opt ? UI.tag(x.opt.label + ' option', 'info') : '') + '<span class="grow"></span><span class="muted" style="font-size:1.1rem">Open</span></div></div>'; }).join('') + '</div></div>';
          });
          ctx.el.querySelector('#rlist').innerHTML = h || '<div class="mt">' + UI.empty('No reports match', 'Try a different search or category.') + '</div>';
        };
        paint(); ctx.el.querySelector('#rsearch').oninput = function () { MCM.store.set('rptQ', this.value); paint(); };
        ctx.on('[data-rcat]', function (e, el) { MCM.store.set('rptCat', el.dataset.rcat); ctx.refresh(); });
        ctx.on('[data-rpt]', function (e, el) { MCM.go('reports', 'library', { r: el.dataset.rpt }); });
      }

      else if (tab === 'builder') builderView(ctx);

      else if (tab === 'saved') {
        var can = MCM.can('view');
        ctx.el.innerHTML = UI.card('Saved views', '<div id="svt"></div>', { flush: true, sub: 'Opening a view restores its date range, filters, hidden columns and options.' });
        UI.table(document.getElementById('svt'), { id: 'svtbl', noun: 'views', csv: MCM.can('export') ? 'saved-views' : undefined, rows: MCM.savedViews, pageSize: 15, sort: 'ts', emptyTitle: 'No saved views yet', emptySub: 'Open a report or the builder and press "Save view".',
          cols: [{ k: 'name', label: 'Name', html: function (v) { return '<b>' + esc(v.name) + '</b>'; }, val: function (v) { return v.name; } },
            { k: 'type', label: 'Type', html: function (v) { return UI.tag(v.kind === 'builder' ? 'Custom builder' : 'Report', v.kind === 'builder' ? 'info' : 'brand'); }, val: function (v) { return v.kind === 'builder' ? 'Custom builder' : 'Report'; } },
            { k: 'src', label: 'Report / dataset', html: function (v) { return esc(v.kind === 'builder' ? v.builder.dataset + (v.builder.groupBy && v.builder.groupBy !== 'none' ? ' by ' + v.builder.groupBy : '') : (byId[v.report] ? byId[v.report].name : v.report + ' (removed)')); }, val: function (v) { return v.kind === 'builder' ? v.builder.dataset : v.report; } },
            { k: 'fl', label: 'Filters', html: function (v) { return '<span class="muted">' + esc(filterText(v.filters || {})) + '</span>'; }, val: function (v) { return filterText(v.filters || {}); } },
            { k: 'own', label: 'Owner', html: function (v) { return esc((MCM.aById[v.owner] || {}).name || '-'); }, val: function (v) { return (MCM.aById[v.owner] || {}).name || ''; } },
            { k: 'ts', label: 'Saved', html: function (v) { return v.ts ? T.dt(v.ts) : '-'; }, val: function (v) { return v.ts || 0; } },
            { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (v) { return '<button class="btn xs pri" data-v-open="' + v.id + '">Open</button> <button class="btn xs" data-v-ren="' + v.id + '">Rename</button> <button class="btn xs danger" data-v-del="' + v.id + '">Delete</button>'; } }] });
        var vOf = function (el, a) { return MCM.savedViews.filter(function (v) { return v.id === el.dataset[a]; })[0]; };
        ctx.on('[data-v-open]', function (e, el) {
          var v = vOf(el, 'vOpen'); if (!v) return; applyFilters(v.filters);
          if (v.kind === 'builder') { MCM.store.set('rptBuilder', v.builder); MCM.audit('View opened', v.name); MCM.go('reports', 'builder'); }
          else { if (v.opt != null) setOpt(v.report, v.opt); var hide = {}; (v.hidden || []).forEach(function (k) { hide[k] = true; }); UI._ts['rpt-' + v.report] = { sort: null, dir: 'desc', page: 0, q: '', hide: hide, sel: {} }; MCM.audit('View opened', v.name); MCM.go('reports', 'library', { r: v.report }); }
        });
        ctx.on('[data-v-ren]', function (e, el) { var v = vOf(el, 'vRen'); if (!v) return; UI.modal({ title: 'Rename view', body: '<div class="fg"><label>Name<input class="inp" data-vn value="' + esc(v.name) + '"></label></div>', foot: [{ label: 'Cancel' }, { label: 'Rename', pri: true, fn: function (m) { var n = m.querySelector('[data-vn]').value.trim(); if (!n) return false; MCM.audit('View renamed', v.name + ' -> ' + n); v.name = n; MCM.saveViews(); ctx.refresh(); } }] }); });
        ctx.on('[data-v-del]', function (e, el) { var v = vOf(el, 'vDel'); if (!v) return; UI.confirm('Delete the saved view "' + esc(v.name) + '"?', 'Delete').then(function (ok) { if (!ok) return; MCM.savedViews.splice(MCM.savedViews.indexOf(v), 1); MCM.saveViews(); MCM.audit('View deleted', v.name); ctx.refresh(); }); });
      }

      else if (tab === 'scheduled') {
        var cx = MCM.can('export');
        ctx.el.innerHTML = '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>' + UI.preview() + ' Automatic e-mail, webhook and SFTP delivery needs the backend job runner. Schedules here are stored and the next run time is calculated, but nothing is sent on its own. <b>Run now</b> generates the real file and downloads it in your browser.</span></div>' + (cx ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + MCM.user.role + ') can view schedules but not create, run or change them.</div>') +
          UI.card('Scheduled reports', '<div id="sct"></div>', { flush: true, acts: '<button class="btn pri sm" data-sched-new="">' + UI.icon('plus') + 'New schedule</button>' });
        UI.table(document.getElementById('sct'), { id: 'sctbl', noun: 'schedules', rows: MCM.schedules, pageSize: 15, colChooser: false, emptyTitle: 'No scheduled reports', emptySub: 'Create one from here or from any report.',
          cols: [{ k: 'name', label: 'Name', html: function (s) { return '<b>' + esc(s.name) + '</b>'; }, val: function (s) { return s.name; } },
            { k: 'rep', label: 'Report', html: function (s) { return esc(byId[s.report] ? byId[s.report].name : s.report); }, val: function (s) { return byId[s.report] ? byId[s.report].name : s.report; } },
            { k: 'fr', label: 'Frequency', html: function (s) { return esc(freqText(parseFreq(s))); }, val: function (s) { return freqText(parseFreq(s)); } },
            { k: 'nx', label: 'Next run', html: function (s) { var n = s.enabled ? nextRun(s) : null; return n ? T.dt(n) + ' <span class="muted">' + inTxt(n) + '</span>' : '<span class="faint">paused</span>'; }, val: function (s) { return s.enabled ? nextRun(s) || 0 : 0; } },
            { k: 'to', label: 'Recipients', html: function (s) { return esc(s.to); }, val: function (s) { return s.to; } },
            { k: 'fmt', label: 'Format', html: function (s) { return UI.tag(s.fmt); }, val: function (s) { return s.fmt; } },
            { k: 'ch', label: 'Channel', html: function (s) { return UI.tag({ email: 'E-mail', webhook: 'Webhook', sftp: 'SFTP' }[s.channel] || s.channel); }, val: function (s) { return s.channel; } },
            { k: 'last', label: 'Last run', html: function (s) { return s.last ? T.dt(s.last) : '<span class="faint">never</span>'; }, val: function (s) { return s.last || 0; } },
            { k: 'en', label: 'Enabled', noSort: 1, noCsv: 1, html: function (s) { return UI.sw(s.enabled, 'data-s-tog="' + s.id + '"'); } },
            { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (s) { return '<button class="btn xs pri" data-s-run="' + s.id + '">Run now</button> <button class="btn xs" data-s-edit="' + s.id + '">Edit</button> <button class="btn xs danger" data-s-del="' + s.id + '">Delete</button>'; } }] });
        var sOf = function (el, a) { return MCM.schedules.filter(function (s) { return s.id === el.dataset[a]; })[0]; };
        ctx.on('[data-s-tog]', function (e, el) { if (!cx) return MCM.deny('change schedules'); var s = sOf(el, 'sTog'); if (!s) return; s.enabled = !s.enabled; MCM.saveSchedules(); MCM.audit('Schedule ' + (s.enabled ? 'enabled' : 'paused'), s.name); ctx.refresh(); });
        ctx.on('[data-s-edit]', function (e, el) { if (!cx) return MCM.deny('edit schedules'); var s = sOf(el, 'sEdit'); if (s) schedModal(ctx, s); });
        ctx.on('[data-s-run]', function (e, el) { if (!cx) return MCM.deny('run or export reports'); var s = sOf(el, 'sRun'); if (!s) return; runSchedule(s); ctx.refresh(); });
        ctx.on('[data-s-del]', function (e, el) { if (!cx) return MCM.deny('delete schedules'); var s = sOf(el, 'sDel'); if (!s) return; UI.confirm('Delete the schedule "' + esc(s.name) + '"?', 'Delete').then(function (ok) { if (!ok) return; MCM.schedules.splice(MCM.schedules.indexOf(s), 1); MCM.saveSchedules(); MCM.audit('Schedule deleted', s.name); ctx.refresh(); }); });
      }
    }
  });

  /* ---------- single report view ---------- */
  function reportView(ctx, d) {
    var R = ctx.R, rc = mkRc('filters', d), rows = d.rows(rc), prevG = R.compare ? MCM.agg(ctx.prev({ dir: 'in' })) : null, g = rc.g;
    var kp = d.kpi(rows, rc), strip = '<div class="grid g4">' + kp.map(function (k) { return UI.kpi({ label: k.label, value: k.value, def: k.def, sub: k.sub }); }).join('') + '</div>';
    if (prevG) strip += '<div class="grid g4 mt">' + [UI.kpi({ label: 'Offered', value: f.n(g.offered), delta: UI.delta(g.offered, prevG.offered), def: 'offered' }), UI.kpi({ label: 'Service level', value: f.pct(g.sl), delta: UI.delta(g.sl, prevG.sl, { dec: 1, fmt: function (x) { return f.dec(x, 1) + ' pts'; } }), def: 'sl' }), UI.kpi({ label: 'Abandon rate', value: f.pct(g.abandonRate), delta: UI.delta(g.abandonRate, prevG.abandonRate, { good: 'down', dec: 1, fmt: function (x) { return f.dec(x, 1) + ' pts'; } }), def: 'abandonRate' }), UI.kpi({ label: 'AHT', value: f.dur(g.aht), delta: UI.delta(g.aht, prevG.aht, { good: 'down', fmt: function (x) { return f.dur(Math.abs(x)); } }), def: 'aht' })].join('') + '</div>';
    var optSeg = d.opt ? '<div style="display:flex;gap:.8rem;align-items:center"><span class="muted">' + d.opt.label + '</span>' + UI.seg(d.opt.items, rc.opt, 'ropt', 'sm') + '</div>' : '';
    ctx.el.innerHTML = '<div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:1.5rem"><button class="btn sm" data-back>' + UI.icon('chev', '') + 'All reports</button><div style="flex:1;min-width:20rem"><b style="font-size:1.8rem">' + esc(d.name) + '</b> ' + UI.tag(d.cat, 'brand') + '<div class="muted">' + esc(d.desc) + '</div></div>' + optSeg + '<button class="btn sm" data-savev>' + UI.icon('check') + 'Save view</button><button class="btn sm" data-sched-new="' + d.id + '">' + UI.icon('cal') + 'Schedule</button><button class="btn sm" data-print>Print / PDF</button></div>' +
      strip + '<div class="mt">' + UI.card('Chart', '<div id="rchart"></div>', { sub: R.label + (rows.length ? '' : ' - no rows') }) + '</div><div class="mt">' + UI.card(esc(d.name), '<div id="rtable"></div>', { flush: true, sub: d.drill ? 'Click a row to drill down.' : '' }) + '</div>';
    drawChart(document.getElementById('rchart'), d.chart(rows, rc));
    UI.table(document.getElementById('rtable'), { id: d.tid, noun: 'rows', csv: MCM.can('export') ? d.id : undefined, rows: rows, cols: tcols(d), pageSize: 15, onRow: d.drill });
    ctx.on('[data-back]', function () { MCM.go('reports', 'library'); });
    ctx.on('[data-ropt]', function (e, el) { var v = el.dataset.ropt; setOpt(d.id, isNaN(+v) ? v : +v); ctx.refresh(); });
    ctx.on('[data-print]', function () { MCM.audit('Print report', d.name); UI.printPdf(); });
    ctx.on('[data-savev]', function () { var st = UI._ts[d.tid]; saveViewModal(ctx, { kind: 'report', report: d.id, name: d.name, hidden: st ? Object.keys(st.hide).filter(function (k) { return st.hide[k]; }) : [], opt: getOpt(d) }); });
  }

  /* ---------- builder view ---------- */
  function builderView(ctx) {
    var cfg = bCfg(), B = BDS[cfg.dataset], detail = cfg.dataset === 'Calls' && cfg.groupBy === 'none', needsFields = detail || (cfg.dataset !== 'Calls' && cfg.dataset !== 'Intervals' && cfg.groupBy === 'none') || cfg.dataset === 'Intervals' && false;
    var box = function (attr, k, label, on) { return '<label style="flex-direction:row;display:flex;gap:.7rem;align-items:center;font-weight:500"><input type="checkbox" ' + attr + '="' + k + '"' + (on ? ' checked' : '') + '> ' + esc(label) + '</label>'; };
    ctx.el.innerHTML = '<div class="grid g12">' + UI.card('Build a report', '<div class="fg">' +
      '<label>Dataset<select class="inp" data-b="dataset">' + UI.opts(Object.keys(BDS), cfg.dataset) + '</select></label>' +
      '<label>' + (cfg.dataset === 'Intervals' ? 'Interval size' : 'Group by') + '<select class="inp" data-b="groupBy">' + UI.opts(B.groups, cfg.groupBy) + '</select></label>' +
      (needsFields || detail ? '<div><div class="muted" style="margin-bottom:.5rem;font-weight:600">Fields</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem">' + B.fields.map(function (x) { return box('data-bf', x[0], x[1], cfg.fields.indexOf(x[0]) >= 0); }).join('') + '</div></div>' : '') +
      (!detail ? '<div><div class="muted" style="margin-bottom:.5rem;font-weight:600">Aggregates / measures</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:.4rem">' + BM.map(function (m) { return box('data-bm', m[0], m[1], cfg.measures.indexOf(m[0]) >= 0); }).join('') + '</div></div>' : '') +
      '<div class="muted" style="font-weight:600">Filters</div><div class="fg c2"><label>Outcome<select class="inp" data-bfl="outcome">' + UI.opts([['any', 'Any'], ['answered', 'Answered'], ['abandoned', 'Abandoned'], ['voicemail', 'Voicemail'], ['noanswer', 'No answer']], cfg.f.outcome) + '</select></label><label>Queue<select class="inp" data-bfl="q">' + UI.opts([['', 'Any']].concat(MCM.queues.map(function (q) { return [q.id, q.name]; })), cfg.f.q) + '</select></label><label>Agent<select class="inp" data-bfl="agent">' + UI.opts([['', 'Any']].concat(MCM.agents.map(function (a) { return [a.id, a.name]; })), cfg.f.agent) + '</select></label><label>Min talk (s)<input class="inp" type="number" min="0" data-bfl="minTalk" value="' + (+cfg.f.minTalk || 0) + '"></label></div>' +
      '<label>Chart<select class="inp" data-b="chart">' + UI.opts([['none', 'None'], ['bar', 'Bar'], ['line', 'Line'], ['donut', 'Donut']], cfg.chart) + '</select></label>' +
      '<div style="display:flex;gap:.8rem;flex-wrap:wrap"><button class="btn pri" data-brun>' + UI.icon('play') + 'Run</button><button class="btn" data-bsave>' + UI.icon('check') + 'Save as view</button><button class="btn ghost" data-breset>Reset</button></div></div>', { sub: 'Date range and global filters (queue, team, channel, direction) apply on top.' }) +
      '<div><div id="bprev"></div></div></div>';
    function preview() {
      var res = bRun(cfg, ctx), ch = bChart(cfg, res), host = document.getElementById('bprev');
      host.innerHTML = '<div class="grid g3">' + [UI.kpi({ label: 'Rows', value: f.n(res.rows.length) }), UI.kpi({ label: 'Columns', value: res.cols.length }), UI.kpi({ label: 'Dataset', value: cfg.dataset, sub: res.detail ? 'call detail' : 'grouped by ' + (cfg.groupBy) })].join('') + '</div>' + (res.note ? '<div class="note mt">' + UI.icon('info') + '<span>' + res.note + '</span></div>' : '') +
        (cfg.chart !== 'none' ? '<div class="mt">' + UI.card('Chart', '<div id="bchart"></div>') + '</div>' : '') + '<div class="mt">' + UI.card('Preview', '<div id="btable"></div>', { flush: true, sub: 'Sort, search, choose columns and export with the table controls.' }) + '</div>';
      if (cfg.chart !== 'none') { if (ch) drawChart(document.getElementById('bchart'), ch); else document.getElementById('bchart').innerHTML = UI.empty('Chart needs grouped results', res.detail ? 'Choose a Group by value to chart a call detail report.' : 'Select at least one numeric measure.'); }
      bTable(document.getElementById('btable'), cfg, res, ctx);
    }
    function save() { MCM.store.set('rptBuilder', cfg); }
    preview();
    ctx.el.addEventListener('change', function (e) {
      var t = e.target, b;
      if ((b = t.closest('[data-b]'))) { var k = b.dataset.b; if (k === 'dataset') { cfg = bDefault(b.value); save(); ctx.refresh(); return; } cfg[k] = b.value; if (k === 'groupBy') { save(); ctx.refresh(); return; } }
      else if (t.closest('[data-bf]')) { cfg.fields = Array.prototype.slice.call(ctx.el.querySelectorAll('[data-bf]:checked')).map(function (x) { return x.dataset.bf; }); }
      else if (t.closest('[data-bm]')) { cfg.measures = Array.prototype.slice.call(ctx.el.querySelectorAll('[data-bm]:checked')).map(function (x) { return x.dataset.bm; }); }
      else if ((b = t.closest('[data-bfl]'))) { cfg.f[b.dataset.bfl] = b.dataset.bfl === 'minTalk' ? (+b.value || 0) : b.value; }
      else return;
      save(); preview();
    });
    ctx.on('[data-brun]', function () { save(); preview(); UI.toast('Report refreshed', { ms: 1200 }); });
    ctx.on('[data-breset]', function () { cfg = bDefault(cfg.dataset); save(); ctx.refresh(); });
    ctx.on('[data-bsave]', function () { saveViewModal(ctx, { kind: 'builder', name: cfg.name || cfg.dataset + ' report', builder: JSON.parse(JSON.stringify(cfg)) }); });
  }
})();
