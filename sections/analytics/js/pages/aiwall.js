/* AI Wall - bot (virtual agent) performance: TV wall, intent analysis with automation opportunity, hand-off analysis. */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc;
  var REASONS = {
    'Order status': ['Order not found', 'Delivery exception', 'Customer asked for an agent'],
    'Balance enquiry': ['Identity check failed', 'Disputed balance', 'Customer asked for an agent'],
    'Reset password': ['Verification failed', 'Account locked', 'Customer asked for an agent'],
    'Plan details': ['Complex pricing question', 'Custom plan request', 'Customer asked for an agent'],
    'Cancel service': ['Retention offer needed', 'Billing dispute', 'Customer asked for an agent'],
    'Book appointment': ['No slot available', 'Special request', 'Customer asked for an agent'],
    'Report outage': ['Technical diagnosis needed', 'Multiple services affected', 'Customer asked for an agent'],
    'Update address': ['Address not recognised', 'Document upload needed', 'Customer asked for an agent']
  };
  function reasonOf(c) { var l = REASONS[c.intent] || ['Customer asked for an agent', 'Low bot confidence', 'Other'], h = (Math.floor(c.ts / 1000) * 2654435761 >>> 0) % 100; return l[h < 50 ? 0 : h < 80 ? 1 : 2]; }
  function qn(id) { return MCM.qById[id] ? MCM.qById[id].name : id; }
  function avg(l, fn) { var n = 0, s = 0; l.forEach(function (x) { var v = fn(x); if (v != null) { n++; s += v; } }); return n ? s / n : null; }
  function sentNum(s) { return s == null ? '<span class="faint">-</span>' : '<span class="' + (s > .15 ? 'ok-t' : s < -.15 ? 'bad-t' : '') + '">' + f.dec(s, 2) + '</span>'; }
  function aiIn(from, to) {
    var qs = MCM.F.queues, out = [], a = MCM.aiCalls, lo = 0, hi = a.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (a[m].ts < from) lo = m + 1; else hi = m; }
    for (var i = lo; i < a.length && a[i].ts < to; i++) { if (qs.length && qs.indexOf(a[i].q) < 0) continue; out.push(a[i]); }
    return out;
  }
  function stat(l) {
    var n = l.length, cont = l.filter(function (c) { return c.contained; }).length, ho = l.filter(function (c) { return c.handoff; }).length;
    return { n: n, cont: cont, ho: ho, contPct: n ? cont / n * 100 : null, hoPct: n ? ho / n * 100 : null, dur: avg(l, function (c) { return c.dur; }), csat: avg(l, function (c) { return c.csat; }), sent: avg(l, function (c) { return c.sent; }), csatN: l.filter(function (c) { return c.csat != null; }).length };
  }
  function bucket(list, from, to, step) {
    var n = Math.max(1, Math.ceil((to - from) / step)), b = []; for (var i = 0; i < n; i++) b.push({ t: from + i * step, l: [] });
    list.forEach(function (c) { var k = Math.floor((c.ts - from) / step); if (k >= 0 && k < n) b[k].l.push(c); });
    b.forEach(function (x) { x.s = stat(x.l); }); return b;
  }
  /* active AI calls: calls started in the last 3 minutes that are still running; if the demo data stream has
     ended, fall back to the expected concurrency for this hour of day (arrival rate x handle time) */
  function activeNow() {
    var now = Date.now(), a = MCM.aiCalls, recent = [];
    for (var i = a.length - 1; i >= 0 && a[i].ts >= now - 180000; i--) if (a[i].ts <= now) recent.push(a[i]);
    var running = recent.filter(function (c) { return c.ts + c.dur * 1000 > now; }).length, hr = T.hourOf(now), cnt = 0, d = 0, durSum = 0;
    for (var k = 1; k <= 7; k++) { var s0 = MCM.TODAY - k * T.day + hr * 3600000; aiIn(s0, s0 + 3600000).forEach(function (c) { cnt++; durSum += c.dur; }); d++; }
    var perMin = cnt / d / 60, expected = perMin * (cnt ? durSum / cnt / 60 : 1.5), stale = !a.length || now - a[a.length - 1].ts > 180000;
    return { active: stale ? Math.max(running, Math.round(expected)) : running, recent: recent.length, perHour: cnt / d, stale: stale };
  }

  MCM.page({
    id: 'aiwall', title: 'AI Wall', label: 'AI Wall', icon: 'aiwall', filters: ['date', 'queue'],
    tabs: [['wall', 'Wall'], ['intents', 'Intents'], ['handoffs', 'Hand-offs']],
    render: function (ctx) {
      var R = ctx.R, tab = ctx.tab, list = aiIn(R.from, R.to), s = stat(list), prev = R.compare ? stat(aiIn(R.pfrom, R.pto)) : null;
      var step = Math.max(3600000, MCM.stepFor(R)), lab = function (t) { return step >= T.day ? T.dm(t) : T.time(t); };
      var pts = function (d) { return f.dec(d, 1) + ' pts'; };
      var note = '<div class="note warn" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>' + UI.preview() + ' AI (virtual agent) calls are simulated demo data. Connect a virtual-agent platform to replace them. Human-agent data on other pages is unaffected.</span></div>';

      if (tab === 'wall') {
        ctx.acts('<button class="btn" data-tv>' + UI.icon('expand') + 'TV mode</button>');
        var bk = bucket(list, R.from, R.to, step);
        var tiles = function () {
          var an = activeNow();
          return '<div class="grid g4">' + [
            UI.kpi({ label: R.label === 'Today' ? 'AI calls today' : 'AI calls', value: f.n(s.n), delta: prev && UI.delta(s.n, prev.n), spark: bk.map(function (b) { return b.s.n; }) }),
            UI.kpi({ label: 'Containment', value: f.pct(s.contPct), def: 'containment', status: s.contPct == null ? '' : s.contPct >= 70 ? 'ok' : s.contPct >= 60 ? 'warn' : 'bad', delta: prev && UI.delta(s.contPct, prev.contPct, { dec: 1, fmt: pts }), spark: bk.map(function (b) { return b.s.contPct || 0; }), color: 'var(--c3)' }),
            UI.kpi({ label: 'Hand-off rate', value: f.pct(s.hoPct), status: s.hoPct == null ? '' : s.hoPct <= 20 ? 'ok' : s.hoPct <= 30 ? 'warn' : 'bad', delta: prev && UI.delta(s.hoPct, prev.hoPct, { good: 'down', dec: 1, fmt: pts }), sub: f.n(s.ho) + ' to human agents' }),
            UI.kpi({ label: 'Avg AI handle time', value: f.dur(s.dur), delta: prev && UI.delta(s.dur, prev.dur, { good: 'down', fmt: function (d) { return f.dur(Math.abs(d)); } }) }),
            UI.kpi({ label: 'AI CSAT', value: f.dec(s.csat, 2), unit: '/5', delta: prev && UI.delta(s.csat, prev.csat, { dec: 2 }), sub: f.n(s.csatN) + ' surveys' }),
            UI.kpi({ label: 'Avg sentiment', value: f.dec(s.sent, 2), status: s.sent == null ? '' : s.sent > .15 ? 'ok' : s.sent < -.15 ? 'bad' : '', delta: prev && UI.delta(s.sent, prev.sent, { dec: 2 }) }),
            UI.kpi({ label: 'Active AI calls', value: f.n(an.active), status: an.active ? 'ok' : '', sub: f.n(an.recent) + ' started in last 3 min' + (an.stale ? ' (estimated from this hour\'s rate)' : '') }),
            UI.kpi({ label: 'Calls per hour (now)', value: f.dec(an.perHour, 1), sub: 'avg for this hour, last 7 days' })
          ].join('') + '</div>';
        };
        var byI = MCM.groupBy(list, function (c) { return c.intent; });
        ctx.el.innerHTML = note + '<div id="w0">' + tiles() + '</div><div class="grid g2 mt">' + UI.card('Sentiment trend', '<div id="w1"></div>') + UI.card('Handle time trend', '<div id="w2"></div>') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Top intents', '<div id="w3"></div>', { sub: 'By call volume. Click the Intents tab for the opportunity ranking.' }) + UI.card('Containment trend', '<div id="w4"></div>') + '</div>';
        var tl = bk.map(function (b) { return T.dt(b.t); });
        UI.chart(document.getElementById('w1'), { type: 'line', labels: bk.map(function (b) { return lab(b.t); }), tipLabels: tl, height: 22, min: -1, max: 1, legend: false, fmt: function (v) { return f.dec(v, 2); }, series: [{ name: 'Avg sentiment', data: bk.map(function (b) { return b.s.sent == null ? null : +b.s.sent.toFixed(3); }), color: 'var(--c2)' }] });
        UI.chart(document.getElementById('w2'), { type: 'line', labels: bk.map(function (b) { return lab(b.t); }), tipLabels: tl, height: 22, legend: false, fmt: function (v) { return f.dur(v); }, series: [{ name: 'Avg handle time', data: bk.map(function (b) { return b.s.dur == null ? null : Math.round(b.s.dur); }), color: 'var(--c4)' }] });
        UI.chart(document.getElementById('w4'), { type: 'line', labels: bk.map(function (b) { return lab(b.t); }), tipLabels: tl, height: 22, legend: true, min: 0, max: 100, fmt: function (v) { return f.pct(v, 0); }, series: [{ name: 'Containment %', data: bk.map(function (b) { return b.s.contPct == null ? null : +b.s.contPct.toFixed(1); }), color: 'var(--c3)' }, { name: 'Hand-off %', data: bk.map(function (b) { return b.s.hoPct == null ? null : +b.s.hoPct.toFixed(1); }), color: 'var(--c5)' }] });
        document.getElementById('w3').innerHTML = list.length ? UI.hbars(Object.keys(byI).map(function (k) { return { label: k, value: byI[k].length, sub: f.pct(stat(byI[k]).contPct, 0) + ' contained' }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8)) : UI.empty('No AI calls in this range');
        ctx.on('[data-tv]', function () { ctx.fullscreen(!document.body.classList.contains('tv')); });
        ctx.every(5000, function () { var w = document.getElementById('w0'); if (w) w.innerHTML = tiles(); });
      }

      else if (tab === 'intents') {
        var byInt = MCM.groupBy(list, function (c) { return c.intent; }), rows = Object.keys(byInt).map(function (k) { var l = byInt[k], st = stat(l); return { k: k, l: l, s: st, unc: st.n - st.cont }; }), maxUnc = Math.max.apply(null, rows.map(function (r) { return r.unc; }).concat([1]));
        rows.forEach(function (r) { r.opp = Math.round(r.unc / maxUnc * 100); r.share = s.n ? r.s.n / s.n * 100 : 0; });
        var best = rows.slice().sort(function (a, b) { return b.opp - a.opp; })[0];
        ctx.el.innerHTML = note + '<div class="grid g4">' + [
          UI.kpi({ label: 'Intents detected', value: rows.length }), UI.kpi({ label: 'Overall containment', value: f.pct(s.contPct), def: 'containment' }),
          UI.kpi({ label: 'Top automation opportunity', value: best ? esc(best.k) : '-', sub: best ? f.n(best.unc) + ' calls not contained' : '' }),
          UI.kpi({ label: 'Not contained', value: f.n(s.n - s.cont), sub: f.pct(s.n ? (s.n - s.cont) / s.n * 100 : null) + ' of AI calls' })
        ].join('') + '</div><div class="mt">' + UI.card('Intent performance', '<div id="i1"></div>', { flush: true, sub: 'Opportunity score = calls not contained (volume x (1 - containment)) scaled so the top intent is 100. Click an intent for its trend.' }) + '</div>';
        UI.table(document.getElementById('i1'), { id: 'ai-int', noun: 'intents', csv: 'ai-intents', pageSize: 12, rows: rows, sort: 'opp', onRow: function (r) { openIntent(ctx, r, R); }, cols: [
          { k: 'k', label: 'Intent', html: function (r) { return '<b>' + esc(r.k) + '</b>'; }, val: function (r) { return r.k; } },
          { k: 'n', label: 'Volume', r: 1, html: function (r) { return f.n(r.s.n); }, val: function (r) { return r.s.n; } },
          { k: 'sh', label: 'Share', r: 1, html: function (r) { return f.pct(r.share); }, val: function (r) { return r.share; } },
          { k: 'ct', label: 'Containment', r: 1, html: function (r) { return '<span class="' + (r.s.contPct >= 70 ? 'ok-t' : r.s.contPct >= 55 ? 'warn-t' : 'bad-t') + '">' + f.pct(r.s.contPct) + '</span>'; }, val: function (r) { return r.s.contPct; } },
          { k: 'ho', label: 'Hand-off', r: 1, html: function (r) { return f.pct(r.s.hoPct); }, val: function (r) { return r.s.hoPct; } },
          { k: 'du', label: 'Avg duration', r: 1, html: function (r) { return f.dur(r.s.dur); }, val: function (r) { return r.s.dur; } },
          { k: 'se', label: 'Sentiment', r: 1, html: function (r) { return sentNum(r.s.sent); }, val: function (r) { return r.s.sent; } },
          { k: 'cs', label: 'CSAT', r: 1, html: function (r) { return f.dec(r.s.csat, 2); }, val: function (r) { return r.s.csat; } },
          { k: 'opp', label: 'Automation opportunity', r: 1, html: function (r) { return '<div style="display:flex;gap:.8rem;align-items:center;justify-content:flex-end"><div style="width:9rem">' + UI.bar(r.opp, 100, r.opp >= 70 ? 'bad' : r.opp >= 40 ? 'warn' : 'ok') + '</div><b>' + r.opp + '</b></div>'; }, val: function (r) { return r.opp; } }].concat(prev ? [{ k: 'pv', label: 'Prev. volume', r: 1, html: function (r) { return f.n(aiIn(R.pfrom, R.pto).filter(function (c) { return c.intent === r.k; }).length); }, noSort: 1, noCsv: 1 }] : []) });
      }

      else if (tab === 'handoffs') {
        var hoList = list.filter(function (c) { return c.handoff; }), drop = list.filter(function (c) { return !c.contained && !c.handoff; }).length;
        var human = MCM.agg(ctx.q({ dir: 'in' })), ahtH = human.aht || 300, rate = MCM.settings.ratePerMin, saveMin = s.cont * ahtH / 60, saving = saveMin * rate;
        var byR = MCM.groupBy(hoList, reasonOf), byQ = MCM.groupBy(hoList, function (c) { return c.q; }), rr = Object.keys(byR).map(function (k) { return { label: k, value: byR[k].length }; }).sort(function (a, b) { return b.value - a.value; });
        var bkH = bucket(list, R.from, R.to, step), hoRows = hoList.slice().reverse();
        ctx.el.innerHTML = note + '<div class="grid g5">' + [
          UI.kpi({ label: 'Hand-offs to humans', value: f.n(hoList.length), delta: prev && UI.delta(hoList.length, prev.ho, { good: 'down' }) }),
          UI.kpi({ label: 'Hand-off rate', value: f.pct(s.hoPct), delta: prev && UI.delta(s.hoPct, prev.hoPct, { good: 'down', dec: 1, fmt: pts }), sub: 'of ' + f.n(s.n) + ' AI calls' }),
          UI.kpi({ label: 'Top reason', value: rr[0] ? esc(rr[0].label) : '-', sub: rr[0] ? f.n(rr[0].value) + ' hand-offs' : '' }),
          UI.kpi({ label: 'Dropped without hand-off', value: f.n(drop), sub: 'caller left the bot' }),
          UI.kpi({ label: 'Est. cost saving', value: f.money(saving), sub: 'estimate - see method below', status: 'ok' })
        ].join('') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Hand-off reasons', '<div id="h1"></div>', { sub: 'Reason labels are derived from the intent (demo): a real bot would report the reason.' }) + UI.card('Hand-offs by destination queue', '<div id="h2"></div>') + '</div>' +
          '<div class="grid g21 mt">' + UI.card('Hand-off rate trend', '<div id="h3"></div>') + UI.card('Cost-saving estimate ' + UI.preview(), '<dl class="kv"><dt>Contained AI calls</dt><dd>' + f.n(s.cont) + '</dd><dt>Avg human AHT</dt><dd>' + f.dur(ahtH) + (human.handled ? '' : ' (default)') + '</dd><dt>Agent minutes avoided</dt><dd>' + f.n(saveMin, 0) + ' min (' + f.dec(saveMin / 60, 1) + ' h)</dd><dt>Rate per minute</dt><dd>' + f.money(rate, 3) + '</dd><dt>Estimated saving</dt><dd><b>' + f.money(saving) + '</b></dd></dl><div class="muted" style="margin-top:.8rem;font-size:1.1rem">Estimate = contained calls x average human handle time x rate per minute (Settings). It assumes each contained call would otherwise have reached a human agent.</div>') + '</div>' +
          '<div class="mt">' + UI.card('Hand-off calls', '<div id="h4"></div>', { flush: true, sub: 'Click a row to open the destination queue.' }) + '</div>';
        document.getElementById('h1').innerHTML = rr.length ? UI.hbars(rr.slice(0, 8)) : UI.empty('No hand-offs in this range');
        document.getElementById('h2').innerHTML = Object.keys(byQ).length ? UI.hbars(Object.keys(byQ).map(function (k) { return { label: qn(k), value: byQ[k].length }; }).sort(function (a, b) { return b.value - a.value; })) : UI.empty('No hand-offs in this range');
        UI.chart(document.getElementById('h3'), { type: 'line', labels: bkH.map(function (b) { return lab(b.t); }), tipLabels: bkH.map(function (b) { return T.dt(b.t); }), height: 20, legend: false, min: 0, fmt: function (v) { return f.pct(v, 0); }, series: [{ name: 'Hand-off %', data: bkH.map(function (b) { return b.s.hoPct == null ? null : +b.s.hoPct.toFixed(1); }), color: 'var(--c5)' }] });
        UI.table(document.getElementById('h4'), { id: 'ai-ho', noun: 'hand-offs', csv: 'ai-handoffs', pageSize: 10, rows: hoRows, sort: 'ts', onRow: function (c) { MCM.drill.queue(c.q); }, cols: [
          { k: 'ts', label: 'Time', html: function (c) { return '<b>' + T.dt(c.ts) + '</b>'; }, val: function (c) { return c.ts; } },
          { k: 'in', label: 'Intent', html: function (c) { return esc(c.intent); }, val: function (c) { return c.intent; } },
          { k: 're', label: 'Reason', html: function (c) { return esc(reasonOf(c)); }, val: function (c) { return reasonOf(c); } },
          { k: 'q', label: 'Handed to', html: function (c) { return esc(qn(c.q)); }, val: function (c) { return qn(c.q); } },
          { k: 'du', label: 'Time in bot', r: 1, html: function (c) { return f.dur(c.dur); }, val: function (c) { return c.dur; } },
          { k: 'se', label: 'Sentiment', r: 1, html: function (c) { return sentNum(c.sent); }, val: function (c) { return c.sent; } },
          { k: 'cs', label: 'CSAT', r: 1, html: function (c) { return c.csat || '-'; }, val: function (c) { return c.csat; } }] });
      }
    }
  });

  function openIntent(ctx, r, R) {
    var st = r.s, stepI = R.to - R.from <= 2 * T.day ? 3600000 : T.day, bk = bucket(r.l, R.from, R.to, stepI), byQ = MCM.groupBy(r.l.filter(function (c) { return c.handoff; }), function (c) { return c.q; });
    var rs = MCM.groupBy(r.l.filter(function (c) { return c.handoff; }), reasonOf);
    var html = '<div class="grid g3">' + [UI.kpi({ label: 'Volume', value: f.n(st.n) }), UI.kpi({ label: 'Containment', value: f.pct(st.contPct), def: 'containment' }), UI.kpi({ label: 'Hand-off rate', value: f.pct(st.hoPct) }), UI.kpi({ label: 'Avg duration', value: f.dur(st.dur) }), UI.kpi({ label: 'Sentiment', value: f.dec(st.sent, 2) }), UI.kpi({ label: 'Opportunity score', value: r.opp, sub: f.n(r.unc) + ' not contained' })].join('') + '</div>' +
      '<h3 class="mt" style="margin-bottom:.8rem">Volume and containment trend</h3><div id="di-ch"></div>' +
      '<div class="grid g2 mt"><div><h3 style="margin-bottom:.8rem">Hand-off reasons</h3>' + (Object.keys(rs).length ? UI.hbars(Object.keys(rs).map(function (k) { return { label: k, value: rs[k].length }; }).sort(function (a, b) { return b.value - a.value; })) : '<div class="muted">No hand-offs</div>') + '</div><div><h3 style="margin-bottom:.8rem">Handed to</h3>' + (Object.keys(byQ).length ? UI.hbars(Object.keys(byQ).map(function (k) { return { label: qn(k), value: byQ[k].length }; }).sort(function (a, b) { return b.value - a.value; })) : '<div class="muted">No hand-offs</div>') + '</div></div>' +
      '<div class="muted mt" style="font-size:1.1rem">' + UI.preview() + ' Demo AI data.</div>';
    var body = UI.drawer(esc(r.k), html, { sub: esc(R.label) });
    UI.chart(body.querySelector('#di-ch'), { type: 'bar', height: 20, labels: bk.map(function (b) { return stepI >= T.day ? T.dm(b.t) : T.time(b.t); }), tipLabels: bk.map(function (b) { return T.dt(b.t); }), fmt2: function (v) { return v.toFixed(0) + '%'; }, series: [{ name: 'Calls', data: bk.map(function (b) { return b.s.n; }), color: 'var(--c2)' }, { name: 'Containment %', axis: 'r', type: 'line', color: 'var(--c3)', data: bk.map(function (b) { return b.s.contPct == null ? null : +b.s.contPct.toFixed(1); }), fmt: function (v) { return f.pct(v); } }] });
  }
})();
