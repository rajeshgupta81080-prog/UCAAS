/* Calls - call log, unanswered, duration, disposition, concurrency, weekday x hour heatmap, chat/SMS. */
MCM.page({
  id: 'calls', title: 'Calls', icon: 'calls', filters: ['date', 'queue', 'team', 'channel', 'dir'],
  tabs: [['log', 'Call log'], ['unanswered', 'Unanswered'], ['duration', 'Duration'], ['disposition', 'Disposition'], ['concurrent', 'Concurrent calls'], ['heatmap', 'Heatmap'], ['texts', 'Texts']],
  render: function (ctx) {
    var UI = window.UI, f = UI.f, T = MCM.T, R = ctx.R, tab = ctx.tab, esc = UI.esc, F = MCM.F, NOW = Date.now(), DAY = T.day;
    var list = ctx.q(), g = MCM.agg(list), prevList = R.compare ? ctx.prev() : null, prevG = prevList ? MCM.agg(prevList) : null;
    function csvName(n) { return MCM.can('export') ? n : undefined; }
    function col(k, label, html, val, r) { var c = { k: k, label: label, html: html, val: val }; if (r) c.r = 1; return c; }
    function qn(id) { return esc(MCM.qById[id].name); }
    function an(id) { return id ? esc(MCM.aById[id].name) : '<span class="faint">-</span>'; }
    function note(t) { return '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>' + t + '</span></div>'; }
    function pr(d) { return (d >= 0 ? '+' : '') + f.dec(d, 1) + ' pts'; }
    function durD(d) { return (d < 0 ? '-' : '') + f.dur(Math.abs(d)); }
    var inb = list.filter(function (c) { return c.dir === 'in'; });
    function isUn(c) { return c.outcome === 'abandoned' || c.outcome === 'voicemail' || c.outcome === 'noanswer'; }
    function hourArr(l, pred) { var a = []; for (var h = 0; h < 24; h++) a.push(0); l.forEach(function (c) { if (!pred || pred(c)) a[T.hourOf(c.ts)]++; }); return a; }
    var hLabels = []; for (var hh = 0; hh < 24; hh++) hLabels.push((hh < 10 ? '0' : '') + hh + ':00');
    var periodNote = note('Period: ' + esc(R.label) + (R.compare ? ' (deltas vs previous period)' : '') + '. All numbers come from the same call records as the Queues and Agents pages.');

    /* ---------------- LOG ---------------- */
    if (tab === 'log') {
      var S = Object.assign({ outcome: 'all', minDur: 0, disp: 'all' }, MCM.store.get('callf', {}));
      var canRec = MCM.can('recordings');
      var answered = list.filter(function (c) { return c.outcome === 'answered'; }).length, abandoned = list.filter(function (c) { return c.outcome === 'abandoned'; }).length;
      var pa = prevList ? prevList.filter(function (c) { return c.outcome === 'answered'; }).length : null, pab = prevList ? prevList.filter(function (c) { return c.outcome === 'abandoned'; }).length : null;
      ctx.el.innerHTML = periodNote + '<div class="grid g3">' + [
        UI.kpi({ label: 'Calls', value: f.n(list.length), delta: prevList && UI.delta(list.length, prevList.length), sub: f.n(g.offered) + ' inbound / ' + f.n(g.outbound) + ' outbound' }),
        UI.kpi({ label: 'Answered', value: f.n(answered), def: 'answered', delta: prevList && UI.delta(answered, pa), sub: f.pct(list.length ? answered / list.length * 100 : null) + ' of calls' }),
        UI.kpi({ label: 'Abandoned', value: f.n(abandoned), def: 'abandoned', status: g.abandonRate > 10 ? 'bad' : '', delta: prevList && UI.delta(abandoned, pab, { good: 'down' }), sub: f.pct(g.abandonRate) + ' of inbound' })
      ].join('') + '</div><div class="grid g3 mt">' + [
        UI.kpi({ label: 'Avg talk time', value: f.dur(g.avgTalk), delta: prevG && UI.delta(g.avgTalk, prevG.avgTalk, { fmt: durD }) }),
        UI.kpi({ label: 'Total minutes', value: f.n(g.minutes, 0), delta: prevG && UI.delta(g.minutes, prevG.minutes), sub: 'talk + hold' }),
        UI.kpi({ label: 'Cost', value: f.money(g.cost), delta: prevG && UI.delta(g.cost, prevG.cost, { good: 'down', fmt: function (d) { return f.money(d); } }), sub: '$' + MCM.settings.ratePerMin + ' per minute' })
      ].join('') + '</div>' +
        '<div class="mt">' + UI.card('Call detail', '<div class="tb" id="cl-f" style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;padding:1rem 1.4rem;border-bottom:1px solid var(--line2)"><label class="muted">Outcome <select class="inp sm" data-cf="outcome">' + UI.opts([['all', 'All'], ['answered', 'Answered'], ['abandoned', 'Abandoned'], ['voicemail', 'Voicemail'], ['noanswer', 'No answer']], S.outcome) + '</select></label><label class="muted">Min talk (s) <input class="inp sm" type="number" min="0" style="width:8rem;min-width:8rem" data-cf="minDur" value="' + S.minDur + '"></label><label class="muted">Disposition <select class="inp sm" data-cf="disp">' + UI.opts([['all', 'All']].concat(MCM.DISP.concat(['No answer']).map(function (d) { return [d, d]; })), S.disp) + '</select></label><button class="btn ghost sm" data-cfr>Reset</button><span class="muted">Use the search box to find a number, call ID or agent.</span></div><div id="cl-t"></div>', { flush: true, sub: 'Click a row to open the call, recording and transcript. Numbers follow the PII masking setting.' }) + '</div>';
      var cols = MCM.drill.callCols();
      cols.forEach(function (c) { if (c.k === 'from') c.val = function (r) { return MCM.mask(r.from); }; });
      cols.push(
        col('hold', 'Hold', function (r) { return f.dur(r.hold); }, function (r) { return r.hold; }, 1),
        col('wrap', 'Wrap', function (r) { return f.dur(r.wrap); }, function (r) { return r.wrap; }, 1),
        col('ivr', 'IVR path', function (r) { return r.path ? esc(r.path.join(' > ')) : '<span class="faint">-</span>'; }, function (r) { return r.path ? r.path.join(' > ') : ''; }),
        col('tags', 'Tags', function (r) { return r.tags && r.tags.length ? r.tags.map(function (t) { return UI.tag(t); }).join(' ') : '<span class="faint">-</span>'; }, function (r) { return (r.tags || []).join(', '); }),
        { k: 'rec', label: 'Rec', html: function (r) { return r.rec ? '<span title="' + (canRec ? 'Recording available' : 'Your role cannot play recordings') + '" style="color:' + (canRec ? 'var(--brand)' : 'var(--faint)') + '">' + UI.icon('mic') + '</span>' : '<span class="faint">-</span>'; }, val: function (r) { return r.rec ? 1 : 0; }, csv: function (r) { return r.rec ? 'yes' : 'no'; } }
      );
      var filtered = function () { return list.filter(function (c) { return (S.outcome === 'all' || c.outcome === S.outcome) && (!S.minDur || c.talk >= S.minDur) && (S.disp === 'all' || c.disp === S.disp); }); };
      var tbl = UI.table(UI.$('#cl-t', ctx.el), { id: 'calllog', noun: 'calls', csv: csvName('call-log'), pageSize: 15, rows: filtered(), sort: 'ts', cols: cols, onRow: function (r) { MCM.drill.call(r.id); } });
      ctx.el.addEventListener('change', function (e) { var el = e.target.closest('[data-cf]'); if (!el) return; S[el.dataset.cf] = el.dataset.cf === 'minDur' ? Math.max(0, +el.value || 0) : el.value; MCM.store.set('callf', S); tbl.setRows(filtered()); });
      ctx.on('[data-cfr]', function () { MCM.store.set('callf', { outcome: 'all', minDur: 0, disp: 'all' }); ctx.refresh(); });
      if (ctx.params.call) { var cid = ctx.params.call; setTimeout(function () { MCM.drill.call(cid); }, 0); }
    }

    /* ---------------- UNANSWERED ---------------- */
    else if (tab === 'unanswered') {
      var ua = list.filter(isUn), abn = list.filter(function (c) { return c.outcome === 'abandoned'; }), vm = list.filter(function (c) { return c.outcome === 'voicemail'; }), na = list.filter(function (c) { return c.outcome === 'noanswer'; });
      var allIn = MCM.query({ from: R.from, to: Math.min(R.to + DAY, NOW + 1), queues: [], teams: [], channel: 'all', dir: 'in' }), byFrom = MCM.groupBy(allIn, function (c) { return c.from; });
      function later(u) { return (byFrom[u.from] || []).filter(function (x) { return x.ts > u.ts && x.ts <= u.ts + DAY && x.id !== u.id; }); }
      var uaIn = ua.filter(function (c) { return c.dir === 'in' && c.outcome !== 'noanswer'; }), rep = {}, need = {};
      uaIn.forEach(function (u) {
        var lt = later(u), ans = lt.some(function (x) { return x.outcome === 'answered'; });
        if (lt.length) { var r0 = rep[u.from] || (rep[u.from] = { from: u.from, unans: 0, calls: 0, first: u.ts, last: u.ts, answeredLater: false, lastId: u.id }); r0.unans++; r0.calls = Math.max(r0.calls, lt.length + 1); r0.answeredLater = r0.answeredLater || ans; if (u.ts >= r0.last) { r0.last = u.ts; r0.lastId = lt[lt.length - 1].id; } }
        if (!ans && !MCM.callbacks.some(function (cb) { return cb.from === u.from && cb.status === 'pending'; })) { if (!need[u.from] || need[u.from].ts < u.ts) need[u.from] = u; }
      });
      var repRows = Object.keys(rep).map(function (k) { return rep[k]; }), needRows = Object.keys(need).map(function (k) { return need[k]; }).sort(function (a, b) { return b.ts - a.ts; });
      var pUn = prevList ? prevList.filter(isUn).length : null;
      ctx.el.innerHTML = periodNote + '<div class="grid g5">' + [
        UI.kpi({ label: 'Unanswered', value: f.n(ua.length), delta: prevList && UI.delta(ua.length, pUn, { good: 'down' }), sub: 'abandoned + voicemail + no answer' }),
        UI.kpi({ label: 'Abandoned', value: f.n(abn.length), def: 'abandoned', sub: f.pct(g.abandonRate) + ' of inbound' }),
        UI.kpi({ label: 'Voicemail', value: f.n(vm.length) }), UI.kpi({ label: 'Outbound no answer', value: f.n(na.length) }),
        UI.kpi({ label: 'Need a callback', value: f.n(needRows.length), status: needRows.length ? 'warn' : 'ok', sub: 'no answer within 24h' })
      ].join('') + '</div>' +
        '<div class="grid g2 mt">' + UI.card('Where unanswered calls ended', '<div id="un-do"></div>') + UI.card('Unanswered by queue', '<div id="un-q"></div>') + '</div>' +
        '<div class="mt">' + UI.card('Unanswered by hour of day', '<div id="un-h"></div>') + '</div>' +
        '<div class="grid g2 mt">' + UI.card('Repeat callers (called back within 24h)', '<div id="un-rep"></div>', { flush: true, sub: 'Callers grouped by number whose unanswered call was followed by another call within 24 hours.' }) + UI.card('Callback needed', '<div id="un-cb"></div>', { flush: true, sub: 'Unanswered inbound callers with no answered call afterwards and no pending callback.' }) + '</div>';
      UI.donut(UI.$('#un-do', ctx.el), { items: [{ name: 'Abandoned in IVR', value: abn.filter(function (c) { return c.abandonStage === 'ivr'; }).length, color: 'var(--c4)' }, { name: 'Abandoned in queue', value: abn.filter(function (c) { return c.abandonStage === 'queue'; }).length, color: 'var(--c5)' }, { name: 'Abandoned while ringing', value: abn.filter(function (c) { return c.abandonStage === 'ring'; }).length, color: 'var(--c6)' }, { name: 'Voicemail', value: vm.length, color: 'var(--c2)' }, { name: 'Outbound no answer', value: na.length, color: 'var(--c7)' }], center: { v: f.n(ua.length), l: 'unanswered' } });
      var byq = MCM.groupBy(ua, function (c) { return c.q; });
      UI.$('#un-q', ctx.el).innerHTML = ua.length ? UI.hbars(Object.keys(byq).map(function (k) { return { label: MCM.qById[k].name, value: byq[k].length }; }).sort(function (a, b) { return b.value - a.value; })) : UI.empty('No unanswered calls');
      UI.chart(UI.$('#un-h', ctx.el), { type: 'stack', labels: hLabels, tickEvery: 2, height: 18, series: [{ name: 'Abandoned', data: hourArr(ua, function (c) { return c.outcome === 'abandoned'; }), color: 'var(--c5)' }, { name: 'Voicemail', data: hourArr(ua, function (c) { return c.outcome === 'voicemail'; }), color: 'var(--c2)' }, { name: 'No answer', data: hourArr(ua, function (c) { return c.outcome === 'noanswer'; }), color: 'var(--c7)' }] });
      UI.table(UI.$('#un-rep', ctx.el), { id: 'unrep', noun: 'callers', csv: csvName('repeat-callers'), pageSize: 8, rows: repRows, sort: 'unans', onRow: function (r) { MCM.drill.call(r.lastId); }, emptyTitle: 'No repeat callers', emptySub: 'Nobody called back within 24h of an unanswered call.',
        cols: [col('from', 'Number', function (r) { return esc(MCM.mask(r.from)); }, function (r) { return MCM.mask(r.from); }), col('unans', 'Unanswered', function (r) { return r.unans; }, function (r) { return r.unans; }, 1), col('calls', 'Calls after', function (r) { return r.calls; }, function (r) { return r.calls; }, 1), col('first', 'First missed', function (r) { return T.dt(r.first); }, function (r) { return r.first; }), col('al', 'Reached an agent', function (r) { return r.answeredLater ? UI.tag('Yes', 'ok') : UI.tag('No', 'bad'); }, function (r) { return r.answeredLater ? 1 : 0; })] });
      var canCb = MCM.can('supervise');
      UI.table(UI.$('#un-cb', ctx.el), { id: 'uncb', noun: 'callers', csv: csvName('callbacks-needed'), pageSize: 8, rows: needRows, sort: 'ts', onRow: function (r) { MCM.drill.call(r.id); }, emptyTitle: 'No callbacks needed', emptySub: 'Everyone was reached or has a callback queued.',
        cols: [col('ts', 'Missed at', function (r) { return T.dt(r.ts); }, function (r) { return r.ts; }), col('from', 'Number', function (r) { return esc(MCM.mask(r.from)); }, function (r) { return MCM.mask(r.from); }), col('q', 'Queue', function (r) { return qn(r.q); }, function (r) { return MCM.qById[r.q].name; }), col('o', 'Type', MCM.outcomeTag, function (r) { return r.outcome; }),
          { k: 'act', label: 'Action', noSort: true, noCsv: true, html: function (r) { return '<button class="btn sm' + (canCb ? ' pri' : '') + '" data-cbm="' + r.id + '">Schedule callback</button>'; } }] });
      ctx.on('[data-cbm]', function (e, el) {
        if (!MCM.can('supervise')) return MCM.deny('schedule callbacks');
        var u = MCM.calls.filter(function (c) { return c.id === el.dataset.cbm; })[0]; if (!u) return;
        MCM.callbacks.unshift({ id: 'cb' + Date.now() + Math.floor(Math.random() * 1000), kind: u.outcome === 'voicemail' ? 'voicemail' : 'callback', q: u.q, from: u.from, created: Date.now(), due: Date.now() + 3600000, status: 'pending', agent: null, attempts: 0, dur: 0, note: 'From unanswered call ' + u.id });
        MCM.saveCallbacks(); MCM.audit('Callback created', u.id + ' ' + MCM.mask(u.from)); UI.toast('Callback scheduled in 1 hour for ' + esc(MCM.mask(u.from)), { kind: 'ok' }); ctx.refresh();
      });
    }

    /* ---------------- DURATION ---------------- */
    else if (tab === 'duration') {
      var ans = list.filter(function (c) { return c.outcome === 'answered' && c.talk > 0; }), BINS = [[0, 60, '< 1 min'], [60, 120, '1-2 min'], [120, 180, '2-3 min'], [180, 300, '3-5 min'], [300, 600, '5-10 min'], [600, 900, '10-15 min'], [900, 1800, '15-30 min'], [1800, 1e9, '> 30 min']];
      var hist = BINS.map(function (b) { return ans.filter(function (c) { return c.talk >= b[0] && c.talk < b[1]; }).length; }), longs = ans.filter(function (c) { return c.talk > 900; }), held = ans.filter(function (c) { return c.hold > 0; });
      var med = ans.length ? ans.map(function (c) { return c.talk; }).sort(function (a, b) { return a - b; })[Math.floor(ans.length / 2)] : null;
      ctx.el.innerHTML = periodNote + '<div class="grid g5">' + [
        UI.kpi({ label: 'Avg talk', value: f.dur(g.avgTalk), delta: prevG && UI.delta(g.avgTalk, prevG.avgTalk, { fmt: durD }) }), UI.kpi({ label: 'Median talk', value: f.dur(med) }),
        UI.kpi({ label: 'Avg hold', value: f.dur(g.avgHold), delta: prevG && UI.delta(g.avgHold, prevG.avgHold, { good: 'down', fmt: durD }) }), UI.kpi({ label: 'Avg wrap-up', value: f.dur(g.avgWrap) }),
        UI.kpi({ label: 'Calls over 15 min', value: f.n(longs.length), status: ans.length && longs.length / ans.length > .05 ? 'warn' : '', sub: f.pct(ans.length ? longs.length / ans.length * 100 : null) + ' of answered' })
      ].join('') + '</div>' +
        '<div class="grid g2 mt">' + UI.card('Talk time distribution', '<div id="du-h"></div>', { sub: 'Answered calls by talk duration' }) + UI.card('Hold-time analysis', '<div id="du-hold"></div>') + '</div>' +
        '<div class="mt">' + UI.card('Average talk, hold and wrap by queue', '<div id="du-q"></div>', { flush: true }) + '</div>' +
        '<div class="mt">' + UI.card('Long calls (over 15 minutes)', '<div id="du-l"></div>', { flush: true, sub: 'Click a row to open the call.' }) + '</div>';
      UI.chart(UI.$('#du-h', ctx.el), { type: 'bar', labels: BINS.map(function (b) { return b[2]; }), series: [{ name: 'Calls', data: hist, color: 'var(--c2)' }], height: 18, legend: false, tickEvery: 1 });
      var byAg = MCM.groupBy(held, function (c) { return c.agent; }), holdAg = Object.keys(byAg).map(function (k) { return { label: MCM.aById[k].name, value: byAg[k].reduce(function (s, c) { return s + c.hold; }, 0) / byAg[k].length, n: byAg[k].length }; }).filter(function (x) { return x.n >= 5; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 6);
      UI.$('#du-hold', ctx.el).innerHTML = '<div class="grid g3" style="margin-bottom:1.4rem">' + [UI.kpi({ label: 'Calls with hold', value: f.pct(ans.length ? held.length / ans.length * 100 : null) }), UI.kpi({ label: 'Avg hold (when held)', value: f.dur(held.length ? held.reduce(function (s, c) { return s + c.hold; }, 0) / held.length : 0) }), UI.kpi({ label: 'Total hold time', value: f.hm(g.hold) })].join('') + '</div><b style="font-size:1.2rem">Longest average hold by agent</b><div style="margin-top:1rem">' + (holdAg.length ? UI.hbars(holdAg.map(function (x) { return { label: x.label, value: x.value, fmt: f.dur, sub: x.n + ' held calls' }; })) : '<span class="muted">Not enough held calls.</span>') + '</div>';
      var byQ = MCM.groupBy(list, function (c) { return c.q; }), qrows = Object.keys(byQ).map(function (k) { return { q: MCM.qById[k], g: MCM.agg(byQ[k]) }; });
      UI.table(UI.$('#du-q', ctx.el), { id: 'duq', noun: 'queues', csv: csvName('duration-by-queue'), search: false, colChooser: false, pageSize: 20, rows: qrows, sort: 'aht', onRow: function (r) { MCM.drill.queue(r.q.id); },
        cols: [col('n', 'Queue', function (r) { return '<b>' + esc(r.q.name) + '</b>'; }, function (r) { return r.q.name; }), col('h', 'Handled', function (r) { return f.n(r.g.handled); }, function (r) { return r.g.handled; }, 1), col('t', 'Avg talk', function (r) { return f.dur(r.g.avgTalk); }, function (r) { return r.g.avgTalk; }, 1), col('ho', 'Avg hold', function (r) { return f.dur(r.g.avgHold); }, function (r) { return r.g.avgHold; }, 1), col('w', 'Avg wrap', function (r) { return f.dur(r.g.avgWrap); }, function (r) { return r.g.avgWrap; }, 1), col('aht', 'AHT', function (r) { return f.dur(r.g.aht); }, function (r) { return r.g.aht; }, 1)] });
      UI.table(UI.$('#du-l', ctx.el), { id: 'dul', noun: 'long calls', csv: csvName('long-calls'), pageSize: 8, rows: longs, sort: 'talk', onRow: function (r) { MCM.drill.call(r.id); }, emptyTitle: 'No calls over 15 minutes',
        cols: [col('ts', 'Time', function (r) { return T.dt(r.ts); }, function (r) { return r.ts; }), col('id', 'Call ID', function (r) { return '<span class="mono">' + r.id + '</span>'; }, function (r) { return r.id; }), col('q', 'Queue', function (r) { return qn(r.q); }, function (r) { return MCM.qById[r.q].name; }), col('a', 'Agent', function (r) { return an(r.agent); }, function (r) { return r.agent ? MCM.aById[r.agent].name : ''; }), col('talk', 'Talk', function (r) { return '<b>' + f.dur(r.talk) + '</b>'; }, function (r) { return r.talk; }, 1), col('hold', 'Hold', function (r) { return f.dur(r.hold); }, function (r) { return r.hold; }, 1), col('d', 'Disposition', function (r) { return esc(r.disp || '-'); }, function (r) { return r.disp || ''; })] });
    }

    /* ---------------- DISPOSITION ---------------- */
    else if (tab === 'disposition') {
      var dl = list.filter(function (c) { return c.outcome === 'answered' && c.disp; }), PALN = UI.PAL;
      function groupRows(keyFn) { var m = MCM.groupBy(dl, keyFn); return Object.keys(m).map(function (k) { var a = MCM.agg(m[k]); return { k: k, n: m[k].length, g: a }; }).sort(function (a, b) { return b.n - a.n; }); }
      var dRows = groupRows(function (c) { return c.disp; }), wRows = groupRows(function (c) { return c.wrapCode; }), tm = {}; dl.forEach(function (c) { (c.topics || []).forEach(function (t) { tm[t] = (tm[t] || 0) + 1; }); });
      var tRows = Object.keys(tm).map(function (k) { return { label: k, value: tm[k] }; }).sort(function (a, b) { return b.value - a.value; });
      var qBy = MCM.groupBy(inb, function (c) { return c.q; }), qr = Object.keys(qBy).map(function (k) { return { q: MCM.qById[k], g: MCM.agg(qBy[k]) }; });
      ctx.el.innerHTML = periodNote + '<div class="grid g4">' + [UI.kpi({ label: 'First-contact resolution', value: f.pct(g.fcrRate), def: 'fcr', delta: prevG && UI.delta(g.fcrRate, prevG.fcrRate, { fmt: pr }) }), UI.kpi({ label: 'Transfer rate', value: f.pct(g.xferRate), def: 'xfer', delta: prevG && UI.delta(g.xferRate, prevG.xferRate, { good: 'down', fmt: pr }) }), UI.kpi({ label: 'Repeat-caller rate', value: f.pct(g.repeatRate), delta: prevG && UI.delta(g.repeatRate, prevG.repeatRate, { good: 'down', fmt: pr }), sub: 'answered calls from repeat callers' }), UI.kpi({ label: 'Calls with a disposition', value: f.n(dl.length) })].join('') + '</div>' +
        '<div class="grid g2 mt">' + UI.card('Disposition mix', '<div id="di-do"></div>') + UI.card('Wrap-up code mix', '<div id="di-wr"></div>') + '</div>' +
        '<div class="grid g2 mt">' + UI.card('Dispositions', '<div id="di-dt"></div>', { flush: true }) + UI.card('Wrap-up codes', '<div id="di-wt"></div>', { flush: true }) + '</div>' +
        '<div class="grid g21 mt">' + UI.card('FCR, transfer and repeat rates by queue', '<div id="di-q"></div>', { flush: true }) + UI.card('Topic mix', '<div id="di-tp"></div>', { sub: 'Topics detected on answered calls' }) + '</div>';
      UI.donut(UI.$('#di-do', ctx.el), { items: dRows.map(function (r, i) { return { name: r.k, value: r.n, color: PALN[i % 8] }; }), center: { v: f.n(dl.length), l: 'calls' } });
      UI.donut(UI.$('#di-wr', ctx.el), { items: wRows.map(function (r, i) { return { name: r.k, value: r.n, color: PALN[i % 8] }; }), center: { v: f.n(dl.length), l: 'calls' } });
      function gtbl(host, id, name, rows, label) { UI.table(host, { id: id, noun: 'rows', csv: csvName(name), search: false, colChooser: false, pageSize: 12, rows: rows, sort: 'n', cols: [col('k', label, function (r) { return '<b>' + esc(r.k) + '</b>'; }, function (r) { return r.k; }), col('n', 'Calls', function (r) { return f.n(r.n); }, function (r) { return r.n; }, 1), col('p', 'Share', function (r) { return f.pct(dl.length ? r.n / dl.length * 100 : null); }, function (r) { return r.n; }, 1), col('t', 'Avg talk', function (r) { return f.dur(r.g.avgTalk); }, function (r) { return r.g.avgTalk; }, 1), col('fcr', 'FCR', function (r) { return f.pct(r.g.fcrRate, 0); }, function (r) { return r.g.fcrRate; }, 1)] }); }
      gtbl(UI.$('#di-dt', ctx.el), 'didt', 'dispositions', dRows, 'Disposition'); gtbl(UI.$('#di-wt', ctx.el), 'diwt', 'wrap-codes', wRows, 'Wrap-up code');
      UI.table(UI.$('#di-q', ctx.el), { id: 'diq', noun: 'queues', csv: csvName('fcr-by-queue'), search: false, colChooser: false, pageSize: 12, rows: qr, sort: 'fcr', onRow: function (r) { MCM.drill.queue(r.q.id); },
        cols: [col('n', 'Queue', function (r) { return '<b>' + esc(r.q.name) + '</b>'; }, function (r) { return r.q.name; }), col('a', 'Answered', function (r) { return f.n(r.g.answered); }, function (r) { return r.g.answered; }, 1), col('fcr', 'FCR %', function (r) { return f.pct(r.g.fcrRate); }, function (r) { return r.g.fcrRate; }, 1), col('x', 'Transfer %', function (r) { return f.pct(r.g.xferRate); }, function (r) { return r.g.xferRate; }, 1), col('rp', 'Repeat %', function (r) { return f.pct(r.g.repeatRate); }, function (r) { return r.g.repeatRate; }, 1)] });
      UI.$('#di-tp', ctx.el).innerHTML = tRows.length ? UI.hbars(tRows.slice(0, 10)) : UI.empty('No topics detected');
    }

    /* ---------------- CONCURRENT ---------------- */
    else if (tab === 'concurrent') {
      var cf = Math.max(R.from, R.to - 7 * DAY), cstep = 300000, minute = 60000, n = Math.max(1, Math.ceil((R.to - cf) / cstep)), nm = n * 5;
      var tot = new Array(nm).fill(0), wt = new Array(nm).fill(0), tk = new Array(nm).fill(0);
      function addI(arr, s, e) { if (e <= s) return; var i0 = Math.max(0, Math.ceil((s - cf) / minute)), i1 = Math.min(nm - 1, Math.floor((e - cf) / minute)); for (var i = i0; i <= i1; i++) arr[i]++; }
      list.forEach(function (c) { var ws = c.ts, we = c.ts + (c.wait || 0) * 1000, te = we + (c.talk || 0) * 1000; addI(tot, ws, te); addI(wt, ws, we); addI(tk, we, te); });
      var T5 = [], W5 = [], K5 = [], lab = [], tip = [];
      for (var i = 0; i < n; i++) { var mx = 0, mw = 0, mk = 0; for (var j = i * 5; j < i * 5 + 5 && j < nm; j++) { mx = Math.max(mx, tot[j]); mw = Math.max(mw, wt[j]); mk = Math.max(mk, tk[j]); } T5.push(mx); W5.push(mw); K5.push(mk); var ts5 = cf + i * cstep; lab.push(R.to - cf > DAY ? T.dm(ts5) + ' ' + T.time(ts5) : T.time(ts5)); tip.push(T.dt(ts5)); }
      var peak = Math.max.apply(null, T5.concat([0])), pi = T5.indexOf(peak), avgC = T5.length ? T5.reduce(function (a, b) { return a + b; }, 0) / T5.length : 0;
      var hrPeak = {}; T5.forEach(function (v, i2) { var h2 = T.hourOf(cf + i2 * cstep); hrPeak[h2] = Math.max(hrPeak[h2] || 0, v); }); var bh = Object.keys(hrPeak).sort(function (a, b) { return hrPeak[b] - hrPeak[a]; })[0];
      ctx.el.innerHTML = periodNote + (R.to - R.from > 7 * DAY ? note('Showing the last 7 days of the selected range to keep 5-minute sampling readable.') : '') + '<div class="grid g4">' + [UI.kpi({ label: 'Peak concurrency', value: f.n(peak), sub: 'calls at the same moment', status: peak > 0 ? '' : '' }), UI.kpi({ label: 'Peak at', value: peak ? T.dt(cf + pi * cstep) : '-', sub: T.parts(cf + pi * cstep).wd }), UI.kpi({ label: 'Average concurrency', value: f.dec(avgC, 1), sub: 'across 5-minute windows' }), UI.kpi({ label: 'Busiest hour of day', value: bh == null || !peak ? '-' : (bh < 10 ? '0' : '') + bh + ':00', sub: 'peak ' + (hrPeak[bh] || 0) })].join('') + '</div>' +
        '<div class="mt">' + UI.card('Concurrent calls over time', '<div id="co-c"></div>', { sub: 'Each point is the highest concurrent count within a 5-minute window. A call counts from arrival (queue wait) until talk ends. Use the peak to size trunk channels and licences.' }) + '</div>';
      UI.chart(UI.$('#co-c', ctx.el), { type: 'line', labels: lab, tipLabels: tip, height: 24, series: [{ name: 'Total concurrent', data: T5, color: 'var(--c2)' }, { name: 'In conversation', data: K5, color: 'var(--c3)' }, { name: 'Waiting in queue', data: W5, color: 'var(--c5)' }] });
    }

    /* ---------------- HEATMAP ---------------- */
    else if (tab === 'heatmap') {
      var mk2 = MCM.store.get('callhm', 'volume'), DOW = [1, 2, 3, 4, 5, 6, 0], DN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      var grid = DOW.map(function () { var r = []; for (var h = 0; h < 24; h++) r.push([]); return r; });
      inb.forEach(function (c) { grid[DOW.indexOf(T.dow(c.ts))][T.hourOf(c.ts)].push(c); });
      var occ = {}; for (var dsx = T.sod(R.from); dsx < R.to; dsx += DAY) { var w = T.dow(dsx + 12 * 3600000); occ[w] = (occ[w] || 0) + 1; }
      var METR = { volume: ['Volume', function (l) { return l.length ? l.length : null; }, function (v) { return f.n(v); }, '37,99,235'], abandon: ['Abandon %', function (l) { return l.length ? MCM.agg(l).abandonRate : null; }, function (v) { return v.toFixed(0) + '%'; }, '220,38,38'], wait: ['Avg wait', function (l) { var a = MCM.agg(l); return a.answered ? a.asa : null; }, function (v) { return Math.round(v) + 's'; }, '234,88,12'], sl: ['Service level', function (l) { var a = MCM.agg(l); return a.sl; }, function (v) { return v.toFixed(0) + '%'; }, '22,163,74'] };
      if (!METR[mk2]) mk2 = 'volume'; var Mx = METR[mk2];
      var m = grid.map(function (row) { return row.map(function (l) { return Mx[1](l); }); });
      var slots = []; grid.forEach(function (row, ri) { row.forEach(function (l, h) { if (l.length) slots.push({ d: DN[ri], h: h, per: l.length / (occ[DOW[ri]] || 1), a: MCM.agg(l) }); }); });
      var busy = slots.slice().sort(function (a, b) { return b.per - a.per; }).slice(0, 3), worst = slots.filter(function (s) { return s.a.offered >= 10; }).sort(function (a, b) { return b.a.abandonRate - a.a.abandonRate; })[0], aht = g.aht || 300;
      function pad(h) { return (h < 10 ? '0' : '') + h + ':00'; }
      ctx.el.innerHTML = periodNote + '<div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:1.5rem"><b>Metric</b>' + UI.seg(Object.keys(METR).map(function (k) { return [k, METR[k][0]]; }), mk2, 'hmm', 'sm') + '<span class="muted">Inbound calls, weekday by hour in ' + esc(MCM.settings.tz) + '. Darker is higher' + (mk2 === 'sl' ? ' (greener is better)' : '') + '.</span></div>' +
        UI.card(Mx[0] + ' by weekday and hour', '<div id="hm-c"></div>') +
        '<div class="note mt">' + UI.icon('info') + '<span>' + (busy.length ? '<b>Staffing implications.</b> The busiest slots are ' + busy.map(function (s) { return s.d + ' ' + pad(s.h) + ' (about ' + f.dec(s.per, 1) + ' calls per ' + s.d + ', needing roughly ' + Math.max(1, Math.ceil(s.per * aht / 3600 / 0.85)) + ' agents at 85% occupancy and ' + f.dur(aht) + ' AHT)'; }).join('; ') + '.' + (worst ? ' Highest abandon rate: ' + worst.d + ' ' + pad(worst.h) + ' at ' + f.pct(worst.a.abandonRate) + ' - check whether schedules cover this slot.' : '') + ' Compare against the WFM schedule before moving shifts.' : 'No inbound calls in this selection.') + '</span></div>';
      UI.heat(UI.$('#hm-c', ctx.el), { rowLabels: DN, colLabels: hLabels.map(function (x) { return x.slice(0, 2); }), m: m, fmt: function (v) { return v == null ? '-' : Mx[2](v); }, rgb: Mx[3], cells: true });
      ctx.on('[data-hmm]', function (e, el) { MCM.store.set('callhm', el.dataset.hmm); ctx.refresh(); });
    }

    /* ---------------- TEXTS ---------------- */
    else if (tab === 'texts') {
      var ch = list.filter(function (c) { return c.ch === 'chat'; }), chA = ch.filter(function (c) { return c.outcome === 'answered'; }), cg = MCM.agg(ch.filter(function (c) { return c.dir === 'in'; }));
      function conc(items) {
        var ev = []; items.forEach(function (c) { var s = c.ts + c.wait * 1000, e = s + c.talk * 1000; if (e > s) { ev.push([s, 1]); ev.push([e, -1]); } }); ev.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
        var cur = 0, peak = 0, area = 0, busy = 0, last = 0; ev.forEach(function (x) { if (cur > 0) { area += cur * (x[0] - last); busy += x[0] - last; } cur += x[1]; if (cur > peak) peak = cur; last = x[0]; }); return { peak: peak, avg: busy ? area / busy : 0 };
      }
      var cByAg = MCM.groupBy(chA, function (c) { return c.agent; }), agRows = Object.keys(cByAg).map(function (k) { var a = MCM.agg(cByAg[k]), cc = conc(cByAg[k]); return { a: MCM.aById[k], g: a, peak: cc.peak, avg: cc.avg }; });
      var cAll = conc(chA), pChat = prevList ? MCM.agg(prevList.filter(function (c) { return c.ch === 'chat' && c.dir === 'in'; })) : null;
      ctx.el.innerHTML = periodNote + (F.channel === 'voice' ? '<div class="note warn" style="margin-bottom:1.5rem">The channel filter is set to Voice, so there are no chat sessions. Choose All channels or Chat.</div>' : '') + '<div class="grid g3">' + [
        UI.kpi({ label: 'Chat sessions', value: f.n(cg.offered), delta: pChat && UI.delta(cg.offered, pChat.offered), sub: f.n(cg.answered) + ' answered / ' + f.n(cg.abandoned) + ' abandoned' }),
        UI.kpi({ label: 'First response (avg wait)', value: f.dur(cg.asa), def: 'asa', delta: pChat && UI.delta(cg.asa, pChat.asa, { good: 'down', fmt: durD }) }),
        UI.kpi({ label: 'Avg handle time', value: f.dur(cg.aht), def: 'aht', delta: pChat && UI.delta(cg.aht, pChat.aht, { good: 'down', fmt: durD }) })].join('') + '</div><div class="grid g3 mt">' + [
        UI.kpi({ label: 'CSAT', value: cg.csat == null ? '-' : f.dec(cg.csat, 2), def: 'csat', sub: f.n(cg.csatN) + ' responses' }),
        UI.kpi({ label: 'Peak concurrent chats', value: f.n(cAll.peak), sub: 'all agents at once' }),
        UI.kpi({ label: 'Avg chats per busy agent', value: f.dec(agRows.length ? agRows.reduce(function (s, r) { return s + r.avg; }, 0) / agRows.length : 0, 2), sub: 'while handling at least one chat' })].join('') + '</div>' +
        '<div class="grid g2 mt">' + UI.card('Chat sessions by hour', '<div id="tx-h"></div>') + UI.card('Chat agents', '<div id="tx-t"></div>', { flush: true, sub: 'Concurrency is measured from overlapping chat sessions per agent.' }) + '</div>' +
        '<div class="mt">' + UI.card('SMS log ' + UI.preview(), '<div class="note warn" style="margin-bottom:1.2rem">' + UI.icon('info') + '<span>SMS analytics needs a messaging integration (an SMS provider or the platform messaging API). This build has no SMS data source, so nothing below is real. Chat figures above are real and reconcile with the Calls and Queues pages.</span></div><div id="tx-sms"></div>') + '</div>';
      UI.chart(UI.$('#tx-h', ctx.el), { type: 'bar', labels: hLabels, tickEvery: 2, height: 18, legend: false, series: [{ name: 'Sessions', data: hourArr(ch), color: 'var(--c2)' }] });
      UI.table(UI.$('#tx-t', ctx.el), { id: 'txag', noun: 'agents', csv: csvName('chat-agents'), pageSize: 8, rows: agRows, sort: 'n', emptyTitle: 'No chat sessions', onRow: function (r) { MCM.drill.agent(r.a.id); },
        cols: [col('a', 'Agent', function (r) { return '<b>' + esc(r.a.name) + '</b>'; }, function (r) { return r.a.name; }), col('n', 'Sessions', function (r) { return f.n(r.g.answered); }, function (r) { return r.g.answered; }, 1), col('aht', 'AHT', function (r) { return f.dur(r.g.aht); }, function (r) { return r.g.aht; }, 1), col('cs', 'CSAT', function (r) { return r.g.csat == null ? '-' : f.dec(r.g.csat, 2); }, function (r) { return r.g.csat; }, 1), col('pk', 'Peak concurrent', function (r) { return r.peak; }, function (r) { return r.peak; }, 1), col('av', 'Avg concurrent', function (r) { return f.dec(r.avg, 2); }, function (r) { return r.avg; }, 1)] });
      UI.table(UI.$('#tx-sms', ctx.el), { id: 'txsms', noun: 'messages', search: false, colChooser: false, rows: [], emptyTitle: 'No SMS data source connected', emptySub: 'Connect a messaging integration to see sent and received SMS, delivery status and opt-outs here.',
        cols: [col('t', 'Time', function () { return ''; }), col('d', 'Direction', function () { return ''; }), col('n', 'Number', function () { return ''; }), col('s', 'Delivery', function () { return ''; }), col('m', 'Message', function () { return ''; })] });
    }
  }
});
