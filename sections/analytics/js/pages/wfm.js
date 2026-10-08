/* WFM - forecast, schedule, adherence, intraday, time off, shift trades, shrinkage, capacity planning (Erlang C).
   All numbers derive from the shared MCM model (MCM.forecast / MCM.shift / MCM.adherence / MCM.live / MCM.agentStats). */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc, DAY = T.day, HR = T.hour, HALF = 1800000;
  var FC = {};
  function fcast(qid, ds) { var k = qid + ':' + ds; return FC[k] || (FC[k] = MCM.forecast(qid, ds)); }
  function me() { return MCM.aById[MCM.user.id]; }
  function isAgent() { return MCM.user.role === 'Agent'; }
  function st(k, d) { return MCM.store.get(k, d); }
  function ymd(ts) { var p = T.parts(ts); return p.y + '-' + (p.mo < 10 ? '0' : '') + p.mo + '-' + (p.d < 10 ? '0' : '') + p.d; }
  function fromYmd(s) { var a = String(s).split('-'); return T.sod(Date.UTC(+a[0], +a[1] - 1, +a[2], 12)); }
  function dayLabel(ds) { return T.wday(ds + 12 * HR) + ' ' + T.dm(ds); }
  function weekStart(ds) { var dow = T.dow(ds + 12 * HR); return ds - ((dow + 6) % 7) * DAY; }
  function sel(attr, opts, val, cls) { return '<select class="inp ' + (cls || '') + '" ' + attr + '>' + UI.opts(opts, val) + '</select>'; }
  function qname(id) { return (MCM.qById[id] || {}).name || id; }
  function qsel() { var all = MCM.queues.filter(function (q) { return q.active; }).map(function (q) { return q.id; }), fq = MCM.F.queues.filter(function (id) { return all.indexOf(id) >= 0; }); return fq.length ? fq : all; }
  function poolAgents(qids) { return MCM.agents.filter(function (a) { return a.role !== 'Admin' && a.queues.some(function (q) { return qids.indexOf(q) >= 0; }); }); }
  function nonAdmin() { return MCM.agents.filter(function (a) { return a.role !== 'Admin'; }); }
  function hdr(t, s) { return '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>' + t + (s || '') + '</span></div>'; }
  function noPerm(ctx) { return MCM.can('wfm') ? true : MCM.deny('change workforce data'); }

  /* ---------- schedule helpers (with this page's day-off overrides) ---------- */
  function ovr() { return st('shiftOverrides', {}); }
  function shiftFor(a, ds, ov) {
    ov = ov || ovr(); var o = ov[a.id + ':' + ds];
    if (o === 'off') return null;
    if (o === 'work') return MCM.shift(Object.assign({}, a, { off: [] }), ds);
    return MCM.shift(a, ds);
  }
  function stateAtDs(a, ds, ts, ov) {
    var sh = shiftFor(a, ds, ov); if (!sh || ts < sh.start || ts >= sh.end) return 'off';
    for (var i = 0; i < sh.items.length; i++) if (ts >= sh.items[i].from && ts < sh.items[i].to) return sh.items[i].type;
    return 'work';
  }
  function stateAt(a, ts, ov) { return stateAtDs(a, T.sod(ts), ts, ov); }
  function reqSeries(qids, ds) { var out = []; for (var i = 0; i < 48; i++) { var s = 0; qids.forEach(function (q) { s += fcast(q, ds)[i].req; }); out.push(s); } return out; }
  function dayCov(ds, qids, exclude) {
    var ov = ovr(), pool = poolAgents(qids).filter(function (a) { return a.id !== exclude; }), req = reqSeries(qids, ds), heads = 0, sumReq = 0, sumMin = 0, peak = 0;
    pool.forEach(function (a) { if (shiftFor(a, ds, ov)) heads++; });
    for (var i = 0; i < 48; i++) {
      var ts = ds + i * HALF + HALF / 2, n = 0; pool.forEach(function (a) { if (stateAtDs(a, ds, ts, ov) === 'work') n++; });
      sumReq += req[i]; sumMin += Math.min(n, req[i]); if (req[i] > peak) peak = req[i];
    }
    return { heads: heads, peak: peak, pct: sumReq ? sumMin / sumReq * 100 : 100 };
  }
  function covTag(p) { return '<span class="' + (p >= 95 ? 'ok-t' : p >= 85 ? 'warn-t' : 'bad-t') + '">' + f.pct(p, 0) + '</span>'; }
  function weekHours(a, ds, ov) { var ws = weekStart(ds), h = 0; for (var k = 0; k < 7; k++) if (shiftFor(a, ws + k * DAY, ov)) h += 8; return h; }
  function sevTag(l) { return l === 'fail' ? UI.tag('Fail', 'bad') : l === 'warn' ? UI.tag('Warning', 'warn') : UI.tag('OK', 'ok'); }
  function stTag(s) { return UI.tag(s, s === 'approved' ? 'ok' : s === 'denied' ? 'bad' : 'warn'); }
  function dayOpts(from, to) { var o = []; for (var d = from; d <= to; d++) o.push([MCM.TODAY + d * DAY, dayLabel(MCM.TODAY + d * DAY)]); return o; }
  function workDays(a, from, to) { var n = 0, ov = ovr(); for (var d = from; d <= to; d += DAY) if (shiftFor(a, T.sod(d + 12 * HR), ov)) n++; return n; }
  function nid(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1000); }

  /* ---------- Erlang C ---------- */
  function erlangC(N, A) { if (N <= A) return 1; var B = 1; for (var k = 1; k <= N; k++) B = A * B / (k + A * B); return B / (1 - (A / N) * (1 - B)); }
  function slErl(N, A, aht, thr) { if (A <= 0) return 1; if (N <= A) return 0; return 1 - erlangC(N, A) * Math.exp(-(N - A) * thr / aht); }
  function reqAgents(calls, aht, thr, target, maxOcc) {
    var A = calls * aht / HALF * 1000; if (A <= 0.01) return 0; var N = Math.max(1, Math.ceil(A));
    while (N < 500 && (slErl(N, A, aht, thr) < target || A / N > maxOcc)) N++; return N;
  }

  MCM.page({
    id: 'wfm', title: 'WFM', label: 'WFM', icon: 'wfm', filters: ['queue'], autoRefresh: false,
    tabs: [['forecast', 'Forecast'], ['schedule', 'Schedule'], ['adherence', 'Adherence'], ['intraday', 'Intraday'], ['timeoff', 'Time off'], ['trades', 'Shift trades'], ['shrinkage', 'Shrinkage'], ['capacity', 'Capacity']],
    render: function (ctx) {
      FC = {};
      var tab = ctx.tab, el = ctx.el;
      function onChange(selector, fn) { el.addEventListener('change', function (e) { var t = e.target.closest(selector); if (t) fn(t, e); }); }

      if (isAgent() && ['schedule', 'timeoff', 'trades'].indexOf(tab) < 0) {
        el.innerHTML = UI.card('Not available for the Agent role', UI.empty('Agents can see their own schedule, time off and shift trades', 'Open one of those tabs, or switch role from the avatar menu.'));
        return;
      }

      /* ================= FORECAST ================= */
      if (tab === 'forecast') {
        var fq = MCM.F.queues, all = MCM.queues.map(function (q) { return q.id; }), choices = fq.length > 1 ? fq : all, qid;
        qid = fq.length === 1 ? fq[0] : st('wfmQ', 'q3'); if (choices.indexOf(qid) < 0 && fq.length !== 1) qid = choices[0];
        var off = Math.max(-7, Math.min(7, +st('wfmDay', 0))), ds = MCM.TODAY + off * DAY, arr = fcast(qid, ds), q = MCM.qById[qid];
        var totFc = 0, totAct = 0, fcElapsed = 0, peakReq = 0, peakAt = 0;
        arr.forEach(function (x, i) { totFc += x.fc; if (x.act != null) { totAct += x.act; fcElapsed += x.fc; } if (x.req > peakReq) { peakReq = x.req; peakAt = x.ts; } });
        var rows7 = [], sA = 0, sE = 0, sF = 0;
        for (var d = -7; d <= -1; d++) { var dd = MCM.TODAY + d * DAY, ar = fcast(qid, dd), a1 = 0, e1 = 0, f1 = 0; ar.forEach(function (x) { if (x.act != null) { a1 += x.act; f1 += x.fc; e1 += Math.abs(x.act - x.fc); } }); rows7.push({ ds: dd, fc: f1, act: a1, err: e1, wape: a1 ? e1 / a1 * 100 : null, bias: a1 ? (f1 - a1) / a1 * 100 : null }); sA += a1; sE += e1; sF += f1; }
        var wape = sA ? sE / sA * 100 : null, bias = sA ? (sF - sA) / sA * 100 : null;
        el.innerHTML = hdr('Forecast version <b>v3.2</b> (seasonal weekday profile x intraday shape, re-fit weekly) ', UI.preview() + ' Required agents use Erlang-style sizing at 85% occupancy and the queue AHT.') +
          '<div class="grid g5">' + [
            UI.kpi({ label: 'Forecast volume', value: f.n(totFc), sub: dayLabel(ds) + ' - ' + esc(q.name) }),
            UI.kpi({ label: 'Actual so far', value: off > 0 ? '-' : f.n(totAct), sub: off > 0 ? 'future day' : off === 0 ? 'vs ' + f.n(fcElapsed) + ' forecast for elapsed' : 'full day' }),
            UI.kpi({ label: 'WAPE (7 days)', value: f.pct(wape, 1), def: 'wape', status: wape == null ? '' : wape < 10 ? 'ok' : wape < 20 ? 'warn' : 'bad', sub: 'accuracy ' + f.pct(wape == null ? null : 100 - wape, 1) }),
            UI.kpi({ label: 'Bias (7 days)', value: (bias > 0 ? '+' : '') + f.pct(bias, 1), sub: bias == null ? '' : bias > 0 ? 'over-forecasting' : 'under-forecasting' }),
            UI.kpi({ label: 'Peak required agents', value: f.n(peakReq), sub: 'at ' + T.time(peakAt) })
          ].join('') + '</div>' +
          '<div class="mt">' + UI.card('Interval forecast vs actual', '<div id="wfc"></div>', { sub: 'Bars = actual offered, line = forecast, dashed = required agents (right axis).', acts: (fq.length === 1 ? '' : sel('data-wq', choices.map(function (id) { return [id, qname(id)]; }), qid)) + sel('data-wd', dayOpts(-7, 7).map(function (o, i) { return [i - 7, (i === 7 ? 'Today - ' : i < 7 ? '' : '') + o[1] + (i > 7 ? ' (forecast)' : '')]; }), off) }) + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Accuracy, last 7 days', '<div id="wacc"></div>', { flush: true }) + UI.card('Intervals - ' + dayLabel(ds), '<div id="wint"></div>', { flush: true }) + '</div>';
        UI.chart(document.getElementById('wfc'), {
          type: 'bar', height: 26, labels: arr.map(function (x) { return T.time(x.ts); }), tickEvery: 4,
          series: [{ name: 'Actual', color: 'var(--c2)', data: arr.map(function (x) { return x.act; }) }, { name: 'Forecast', type: 'line', color: 'var(--c4)', data: arr.map(function (x) { return +x.fc.toFixed(1); }) }, { name: 'Required agents', type: 'line', axis: 'r', dash: true, color: 'var(--c6)', data: arr.map(function (x) { return x.req; }) }]
        });
        UI.table(document.getElementById('wacc'), {
          id: 'wfacc', noun: 'days', csv: 'wfm-forecast-accuracy', search: false, colChooser: false, pageSize: 10, rows: rows7, sort: 'ds', dir: 'desc',
          cols: [{ k: 'ds', label: 'Day', html: function (r) { return '<b>' + dayLabel(r.ds) + '</b>'; }, val: function (r) { return r.ds; } }, { k: 'fc', label: 'Forecast', r: 1, html: function (r) { return f.n(r.fc); }, val: function (r) { return Math.round(r.fc); } }, { k: 'act', label: 'Actual', r: 1, html: function (r) { return f.n(r.act); }, val: function (r) { return r.act; } }, { k: 'wape', label: 'WAPE', r: 1, html: function (r) { return '<span class="' + (r.wape < 10 ? 'ok-t' : r.wape < 20 ? 'warn-t' : 'bad-t') + '">' + f.pct(r.wape) + '</span>'; }, val: function (r) { return r.wape == null ? null : +r.wape.toFixed(1); } }, { k: 'bias', label: 'Bias', r: 1, html: function (r) { return (r.bias > 0 ? '+' : '') + f.pct(r.bias); }, val: function (r) { return r.bias == null ? null : +r.bias.toFixed(1); } }],
          foot: function () { return '<tr><td>7-day total</td><td class="r">' + f.n(sF) + '</td><td class="r">' + f.n(sA) + '</td><td class="r">' + f.pct(wape) + '</td><td class="r">' + (bias > 0 ? '+' : '') + f.pct(bias) + '</td></tr>'; }
        });
        UI.table(document.getElementById('wint'), {
          id: 'wfint', noun: 'intervals', csv: 'wfm-forecast-intervals', search: false, colChooser: false, pageSize: 12, rows: arr.filter(function (x) { return x.fc >= 0.2 || x.act; }), sort: 'ts', dir: 'asc',
          cols: [{ k: 'ts', label: 'Interval', html: function (r) { return '<b>' + T.time(r.ts) + '</b>'; }, val: function (r) { return r.ts; } }, { k: 'fc', label: 'Forecast', r: 1, html: function (r) { return f.n(r.fc, 1); }, val: function (r) { return +r.fc.toFixed(1); } }, { k: 'act', label: 'Actual', r: 1, html: function (r) { return r.act == null ? '<span class="faint">-</span>' : f.n(r.act); }, val: function (r) { return r.act; } }, { k: 'var', label: 'Variance', r: 1, html: function (r) { return r.act == null || !r.fc ? '<span class="faint">-</span>' : (r.act >= r.fc ? '+' : '') + f.pct((r.act - r.fc) / r.fc * 100, 0); }, val: function (r) { return r.act == null || !r.fc ? null : +((r.act - r.fc) / r.fc * 100).toFixed(1); } }, { k: 'req', label: 'Req. agents', r: 1, html: function (r) { return r.req; }, val: function (r) { return r.req; } }]
        });
        onChange('[data-wq]', function (t) { MCM.store.set('wfmQ', t.value); ctx.refresh(); });
        onChange('[data-wd]', function (t) { MCM.store.set('wfmDay', +t.value); ctx.refresh(); });
      }

      /* ================= SCHEDULE ================= */
      else if (tab === 'schedule') {
        var wk = +st('wfmWeek', 0), ws = weekStart(MCM.TODAY) + wk * 7 * DAY, team = st('wfmTeam', 'all'), canW = MCM.can('wfm'), editing = canW && !isAgent() && st('wfmEdit', false);
        var days = []; for (var k = 0; k < 7; k++) days.push(ws + k * DAY);
        var ov0 = ovr(), pub = st('wfmPublished', {}), pubInfo = pub[ws];
        var list = isAgent() ? [me()] : nonAdmin().filter(function (a) { return team === 'all' || a.team === team; });
        var qids = qsel();
        function cellText(a, ds) { var sh = shiftFor(a, ds, ov0); return sh ? T.time(sh.start) + '-' + T.time(sh.end) : 'OFF'; }
        function cellTitle(a, ds) { var sh = shiftFor(a, ds, ov0); if (!sh) return 'Day off'; return sh.items.filter(function (i) { return i.type !== 'work'; }).map(function (i) { return (i.type === 'lunch' ? 'Lunch ' : 'Break ') + T.time(i.from) + '-' + T.time(i.to); }).join(' | '); }
        function cell(a, ds) {
          var k2 = a.id + ':' + ds, o = ov0[k2], txt = cellText(a, ds), mark = o ? '*' : '', canEdit = editing && ds >= MCM.TODAY;
          var inner = txt === 'OFF' ? 'OFF' + mark : txt + mark, tag = '<span class="tag ' + (txt === 'OFF' ? '' : 'ok') + '" title="' + esc(cellTitle(a, ds)) + '">' + inner + '</span>';
          return canEdit ? '<button class="btn xs" data-ovr="' + k2 + '" title="Click to toggle day off / work (' + esc(cellTitle(a, ds)) + ')">' + inner + '</button>' : tag;
        }
        var covs = isAgent() ? null : days.map(function (ds) { return dayCov(ds, qids); });
        el.innerHTML = hdr('Weekly schedule from the shared shift model (8 h paid + 2 breaks + lunch). Day-off edits are stored as overrides and only affect this page.') +
          UI.card('Schedule - week of ' + T.dm(ws), '<div id="wsch"></div>', {
            flush: true, sub: pubInfo ? 'Published ' + T.dt(pubInfo.ts) + ' by ' + esc(pubInfo.by) : 'Draft - not published',
            acts: '<button class="btn sm" data-wkn="-1">Prev</button><button class="btn sm" data-wkn="0">This week</button><button class="btn sm" data-wkn="1">Next</button>' + (isAgent() ? '' : sel('data-wteam', [['all', 'All teams']].concat(MCM.teams.map(function (t) { return [t, t]; })), team, 'sm') + (canW ? '<button class="btn sm ' + (editing ? 'pri' : '') + '" data-wedit>' + UI.icon('edit') + 'Edit days off</button><button class="btn sm pri" data-wpub>Publish</button>' : ''))
          });
        UI.table(document.getElementById('wsch'), {
          id: 'wsched', noun: 'agents', csv: 'wfm-schedule', pageSize: 30, rows: list, sort: 'name', dir: 'asc',
          cols: [{ k: 'name', label: 'Agent', html: function (a) { return '<b>' + esc(a.name) + '</b> <span class="muted">' + esc(a.team) + '</span>'; }, val: function (a) { return a.name; } }]
            .concat(days.map(function (ds, i) { return { k: 'd' + i, label: dayLabel(ds), html: function (a) { return cell(a, ds); }, val: function (a) { return cellText(a, ds); } }; }))
            .concat([{ k: 'hrs', label: 'Hours', r: 1, html: function (a) { return weekHours(a, ws, ov0); }, val: function (a) { return weekHours(a, ws, ov0); } }]),
          foot: covs ? function (l, cols) { return '<tr>' + cols.map(function (c) { if (c.k === 'name') return '<td>Coverage (scheduled / peak required)</td>'; var m = /^d(\d)$/.exec(c.k); if (m) { var cv = covs[+m[1]]; return '<td title="Share of required agent-intervals covered">' + cv.heads + ' / ' + cv.peak + ' - ' + covTag(cv.pct) + '</td>'; } return '<td></td>'; }).join('') + '</tr>'; } : undefined
        });
        ctx.on('[data-wkn]', function (e, b) { var v = +b.dataset.wkn; MCM.store.set('wfmWeek', v === 0 ? 0 : wk + v); ctx.refresh(); });
        onChange('[data-wteam]', function (t) { MCM.store.set('wfmTeam', t.value); ctx.refresh(); });
        ctx.on('[data-wedit]', function () { if (!noPerm()) return; MCM.store.set('wfmEdit', !editing); ctx.refresh(); });
        ctx.on('[data-wpub]', function () {
          if (!MCM.can('wfm')) return MCM.deny('publish schedules');
          var p = st('wfmPublished', {}), by = (me() || {}).name || MCM.user.role; p[ws] = { ts: Date.now(), by: by }; MCM.store.set('wfmPublished', p);
          MCM.audit('Schedule published', 'Week of ' + T.date(ws) + (list.length < nonAdmin().length ? ' (' + list.length + ' agents)' : ''));
          UI.toast('Schedule for the week of ' + T.dm(ws) + ' published', { kind: 'ok' }); ctx.refresh();
        });
        ctx.on('[data-ovr]', function (e, b) {
          if (!MCM.can('wfm')) return MCM.deny('edit schedules');
          var key = b.dataset.ovr, parts = key.split(':'), a = MCM.aById[parts[0]], dsx = +parts[1], o = ovr(), base = MCM.shift(a, dsx), cur = shiftFor(a, dsx, o);
          var want = cur ? 'off' : 'work'; if ((want === 'off' && !base) || (want === 'work' && base)) delete o[key]; else o[key] = want;
          MCM.store.set('shiftOverrides', o); MCM.audit('Schedule override', a.name + ' ' + T.date(dsx) + ' -> ' + (want === 'off' ? 'day off' : 'working')); ctx.refresh();
        });
      }

      /* ================= ADHERENCE ================= */
      else if (tab === 'adherence') {
        var pool = nonAdmin(), explain = function () { return st('adhExplain', {}); };
        var EXP = { work: ['available', 'on_call', 'wrap'], 'break': ['break'], lunch: ['lunch'], off: ['offline'] };
        function adhNow(a) {
          var now = Date.now(), la = MCM.live.agents[a.id], sched = stateAt(a, now), exp = EXP[sched], ok = exp.indexOf(la.status) >= 0, start = la.since;
          var sh = shiftFor(a, MCM.TODAY); if (sched !== 'off' && sh) { for (var i = 0; i < sh.items.length; i++) if (now >= sh.items[i].from && now < sh.items[i].to) start = Math.max(start, sh.items[i].from); }
          var secs = Math.max(0, (now - start) / 1000); if (ok || secs < 60) { ok = true; secs = 0; }
          var reason = ok ? '' : sched === 'work' ? (la.status === 'offline' ? 'Not logged in' : la.status === 'dnd' ? 'Do not disturb' : la.status === 'training' ? 'Unscheduled training' : 'Extended ' + (MCM.STATUS[la.status] || [la.status])[0].toLowerCase()) : sched === 'off' ? 'Working outside schedule' : 'Not on scheduled ' + sched;
          return { a: a, la: la, sched: sched, ok: ok, since: now - secs * 1000, secs: secs, reason: reason, key: a.id + ':' + MCM.TODAY + ':rt' };
        }
        var rtList = isAgent() ? [me()] : pool;
        function rtRows() { return rtList.map(adhNow); }
        var rr = rtRows(), outN = rr.filter(function (r) { return !r.ok; }).length, inSched = rr.filter(function (r) { return r.sched !== 'off'; });
        var days7 = []; for (var d7 = 7; d7 >= 1; d7--) days7.push(MCM.TODAY - d7 * DAY);
        var hist = rtList.map(function (a) { var vals = days7.map(function (ds) { return MCM.adherence(a, ds); }), sh = days7.map(function (ds) { return shiftFor(a, ds) ? 1 : 0; }); var n = 0, sa = 0, sc = 0; vals.forEach(function (v, i) { if (sh[i]) { n++; sa += v.pct; sc += v.conformance; } }); return { a: a, vals: vals, sh: sh, adh: n ? sa / n : null, conf: n ? sc / n : null, ex: vals.reduce(function (s, v, i) { return s + (sh[i] ? v.exceptions.length : 0); }, 0) }; });
        var exRows = []; hist.forEach(function (h) { h.vals.forEach(function (v, i) { if (!h.sh[i]) return; v.exceptions.forEach(function (x) { exRows.push({ a: h.a, ds: days7[i], type: x.type, min: x.min, key: h.a.id + ':' + days7[i] + ':' + x.type }); }); }); });
        var avgAdh = hist.reduce(function (s, h) { return s + (h.adh || 0); }, 0) / (hist.length || 1);
        el.innerHTML = '<div class="grid g4">' + [
          UI.kpi({ label: 'In adherence now', value: inSched.length ? f.pct((inSched.length - rr.filter(function (r) { return !r.ok && r.sched !== 'off'; }).length) / inSched.length * 100, 0) : '-', def: 'adherence', sub: inSched.length + ' agents scheduled' }),
          UI.kpi({ label: 'Out of adherence', value: outN, status: outN > 3 ? 'bad' : outN ? 'warn' : 'ok', sub: 'more than 60 s outside schedule' }),
          UI.kpi({ label: 'Adherence (7 days)', value: f.pct(avgAdh, 1), def: 'adherence', status: avgAdh >= MCM.goals.adherence ? 'ok' : 'warn', sub: 'goal ' + MCM.goals.adherence + '%' }),
          UI.kpi({ label: 'Exceptions (7 days)', value: exRows.length, sub: 'late start, long break, early leave' })
        ].join('') + '</div>' +
          '<div class="mt">' + UI.card('Real-time adherence', '<div id="wrt"></div>', { flush: true, sub: 'Live status vs scheduled state. Updates in place every few seconds.' }) + '</div>' +
          '<div class="mt">' + UI.card('Adherence and conformance, last 7 days', '<div id="wh"></div>', { flush: true, sub: 'Per agent and day. Goal ' + MCM.goals.adherence + '%.' }) + '</div>' +
          '<div class="mt">' + UI.card('Exceptions', '<div id="wex"></div>', { flush: true, sub: 'Add an explanation to excuse or document an exception.' }) + '</div>';
        var rtTbl = UI.table(document.getElementById('wrt'), {
          id: 'wadh', noun: 'agents', csv: 'wfm-adherence-realtime', pageSize: 12, rows: rr, sort: 'secs', dir: 'desc', onRow: function (r) { MCM.drill.agent(r.a.id); },
          cols: [
            { k: 'a', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b> <span class="muted">' + esc(r.a.team) + '</span>'; }, val: function (r) { return r.a.name; } },
            { k: 'live', label: 'Live status', html: function (r) { return UI.status(r.la.status); }, val: function (r) { return r.la.status; } },
            { k: 'sched', label: 'Scheduled', html: function (r) { return UI.tag(r.sched === 'work' ? 'Working' : r.sched === 'off' ? 'Off shift' : r.sched); }, val: function (r) { return r.sched; } },
            { k: 'ok', label: 'Adherence', html: function (r) { return r.ok ? UI.tag('In adherence', 'ok') : UI.tag('Out of adherence', 'bad'); }, val: function (r) { return r.ok ? 'in' : 'out'; } },
            { k: 'secs', label: 'Out for', r: 1, html: function (r) { return r.ok ? '<span class="faint">-</span>' : '<span class="bad-t" data-since="' + r.since + '">' + f.dur(r.secs) + '</span>'; }, val: function (r) { return Math.round(r.secs); } },
            { k: 'reason', label: 'Reason', html: function (r) { var x = explain()[r.key]; return esc(x ? x.text : r.reason) + (x ? ' ' + UI.tag('explained', 'info') : ''); }, val: function (r) { var x = explain()[r.key]; return x ? x.text : r.reason; } },
            { k: 'act', label: '', noSort: true, noCsv: true, html: function (r) { return r.ok ? '' : '<button class="btn xs" data-wexp="' + r.key + '" data-wlbl="' + esc(r.a.name + ' - now') + '">Explain</button>'; } }
          ]
        });
        UI.table(document.getElementById('wh'), {
          id: 'wadhh', noun: 'agents', csv: 'wfm-adherence-history', pageSize: 12, rows: hist, sort: 'adh', dir: 'asc', onRow: function (r) { MCM.drill.agent(r.a.id); },
          cols: [{ k: 'a', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b>'; }, val: function (r) { return r.a.name; } }]
            .concat(days7.map(function (ds, i) { return { k: 'd' + i, label: dayLabel(ds), r: 1, html: function (r) { return r.sh[i] ? '<span class="' + (r.vals[i].pct >= MCM.goals.adherence ? 'ok-t' : r.vals[i].pct >= 85 ? 'warn-t' : 'bad-t') + '">' + f.pct(r.vals[i].pct, 1) + '</span>' : '<span class="faint">off</span>'; }, val: function (r) { return r.sh[i] ? r.vals[i].pct : null; } }; }))
            .concat([{ k: 'adh', label: 'Adherence', r: 1, html: function (r) { return '<b>' + f.pct(r.adh, 1) + '</b>'; }, val: function (r) { return r.adh == null ? null : +r.adh.toFixed(1); } }, { k: 'conf', label: 'Conformance', r: 1, html: function (r) { return f.pct(r.conf, 1); }, val: function (r) { return r.conf == null ? null : +r.conf.toFixed(1); } }, { k: 'ex', label: 'Exceptions', r: 1, html: function (r) { return r.ex; }, val: function (r) { return r.ex; } }])
        });
        UI.table(document.getElementById('wex'), {
          id: 'wadhx', noun: 'exceptions', csv: 'wfm-adherence-exceptions', pageSize: 10, rows: exRows, sort: 'ds', dir: 'desc',
          cols: [{ k: 'ds', label: 'Day', html: function (r) { return dayLabel(r.ds); }, val: function (r) { return r.ds; } }, { k: 'a', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b>'; }, val: function (r) { return r.a.name; } }, { k: 'type', label: 'Exception', html: function (r) { return UI.tag(r.type, 'warn'); }, val: function (r) { return r.type; } }, { k: 'min', label: 'Minutes', r: 1, html: function (r) { return r.min; }, val: function (r) { return r.min; } },
            { k: 'ex', label: 'Explanation', html: function (r) { var x = explain()[r.key]; return x ? esc(x.text) : '<span class="faint">none</span>'; }, val: function (r) { var x = explain()[r.key]; return x ? x.text : ''; } },
            { k: 'act', label: '', noSort: true, noCsv: true, html: function (r) { return '<button class="btn xs" data-wexp="' + r.key + '" data-wlbl="' + esc(r.a.name + ' - ' + r.type + ' ' + dayLabel(r.ds)) + '">' + (explain()[r.key] ? 'Edit' : 'Explain') + '</button>'; } }]
        });
        ctx.on('[data-wexp]', function (e, b) {
          var key = b.dataset.wexp, cur = explain()[key], label = b.dataset.wlbl;
          UI.modal({ title: 'Adherence explanation', body: '<p class="muted" style="margin-bottom:1rem">' + esc(label) + '</p><div class="fg"><label>Explanation<textarea class="inp" data-x-text placeholder="e.g. Approved system outage, coaching session, bio break">' + esc(cur ? cur.text : '') + '</textarea></label></div>', foot: [{ label: 'Cancel' }, { label: 'Save', pri: true, fn: function (m) { var tx = m.querySelector('[data-x-text]').value.trim(); if (!tx) { UI.toast('Enter an explanation', { kind: 'bad' }); return false; } var x = explain(); x[key] = { text: tx, by: (me() || {}).name, ts: Date.now() }; MCM.store.set('adhExplain', x); MCM.audit('Adherence explanation', label + ': ' + tx); UI.toast('Explanation saved', { kind: 'ok' }); setTimeout(ctx.refresh, 0); } }] });
        });
        ctx.every(1000, function () { Array.prototype.forEach.call(el.querySelectorAll('[data-since]'), function (s) { s.textContent = f.dur((Date.now() - +s.dataset.since) / 1000); }); });
        ctx.every(5000, function () { if (document.querySelector('.modal')) return; rtTbl.setRows(rtRows()); });
      }

      /* ================= INTRADAY ================= */
      else if (tab === 'intraday') {
        var iq = qsel(), ids = TODAY0(), ipool = poolAgents(iq), inow = Date.now(), iov = ovr(), irows = [];
        for (var i = 0; i < 48; i++) {
          var its = ids + i * HALF, fc = 0, act = 0, anyA = false, rq = 0;
          iq.forEach(function (qq) { var r = fcast(qq, ids)[i]; fc += r.fc; rq += r.req; if (r.act != null) { act += r.act; anyA = true; } });
          var sch = 0, brk = 0; ipool.forEach(function (a) { var s = stateAtDs(a, ids, its + HALF / 2, iov); if (s === 'work') sch++; else if (s === 'break' || s === 'lunch') brk++; });
          var curI = inow >= its && inow < its + HALF, staffed = null;
          if (curI) { staffed = 0; ipool.forEach(function (a) { var s = MCM.live.agents[a.id].status; if (s === 'available' || s === 'on_call' || s === 'wrap') staffed++; }); }
          irows.push({ ts: its, i: i, fc: fc, act: anyA ? act : null, req: rq, sched: sch, brk: brk, gap: sch - rq, cur: curI, staffed: staffed });
        }
        var curRow = irows.filter(function (r) { return r.cur; })[0] || irows[0], elapsed = irows.filter(function (r) { return r.act != null; }), fcEl = elapsed.reduce(function (s, r) { return s + r.fc; }, 0), actEl = elapsed.reduce(function (s, r) { return s + r.act; }, 0);
        var recs = []; (function () {
          var future = irows.filter(function (r) { return r.ts + HALF > inow && r.fc >= 0.2; }), run = null, runs = [];
          future.forEach(function (r) { if (r.gap <= -2) { if (run && run.type === 'u' && r.ts === run.end) { run.end = r.ts + HALF; run.n = Math.max(run.n, -r.gap); run.rows.push(r); } else { run = { type: 'u', start: r.ts, end: r.ts + HALF, n: -r.gap, rows: [r] }; runs.push(run); } } else if (r.gap >= 3) { if (run && run.type === 'o' && r.ts === run.end) { run.end = r.ts + HALF; run.n = Math.min(run.n, r.gap); run.rows.push(r); } else { run = { type: 'o', start: r.ts, end: r.ts + HALF, n: r.gap, rows: [r] }; runs.push(run); } } else run = null; });
          var overRuns = runs.filter(function (x) { return x.type === 'o'; });
          runs.forEach(function (x) {
            var rng = T.time(x.start) + '-' + T.time(x.end);
            if (x.type === 'u') {
              var onBrk = Math.max.apply(null, x.rows.map(function (r) { return r.brk; })), near = overRuns.filter(function (o) { return Math.abs(o.start - x.start) <= 3 * HR; })[0];
              if (onBrk > 0 && near) recs.push({ id: 'brk:' + ids + ':' + x.start, kind: 'Move break', text: 'Short by up to ' + x.n + ' agents at ' + rng + ' while ' + onBrk + ' are on break/lunch. Move breaks to ' + T.time(near.start) + '-' + T.time(near.end) + ' (surplus ' + near.n + ').' });
              else recs.push({ id: 'ot:' + ids + ':' + x.start, kind: 'Request overtime', text: 'Short by up to ' + x.n + ' agents at ' + rng + '. Ask ' + x.n + ' agents for overtime or pull in unscheduled staff.' });
            } else if (x.rows.length >= 2) recs.push({ id: 'vto:' + ids + ':' + x.start, kind: 'Offer VTO', text: 'Surplus of at least ' + x.n + ' agents at ' + rng + '. Offer voluntary time off to ' + x.n + ' agents.' });
          });
        })();
        var done = st('wfmRecs', {}); recs = recs.slice(0, 8);
        el.innerHTML = hdr('Today by 30-minute interval for ' + (iq.length === MCM.queues.filter(function (q) { return q.active; }).length ? 'all queues' : iq.map(qname).join(', ')) + '. Actual staffed is shown for the current interval only (live status).') +
          '<div class="grid g5">' + [
            UI.kpi({ label: 'Volume vs forecast', value: f.n(actEl), sub: 'forecast ' + f.n(fcEl) + ' for elapsed intervals', status: fcEl && Math.abs(actEl - fcEl) / fcEl > .15 ? 'warn' : 'ok' }),
            UI.kpi({ label: 'Required now', value: curRow.req, sub: 'interval ' + T.time(curRow.ts) }),
            UI.kpi({ label: 'Scheduled now', value: curRow.sched, sub: curRow.brk + ' on break / lunch' }),
            UI.kpi({ label: 'Staffed now (live)', value: curRow.staffed == null ? '-' : curRow.staffed, sub: 'available + on call + wrap-up' }),
            UI.kpi({ label: 'Gap now', value: (curRow.gap > 0 ? '+' : '') + curRow.gap, status: curRow.gap < -1 ? 'bad' : curRow.gap < 0 ? 'warn' : 'ok', sub: curRow.gap < 0 ? 'under-staffed' : 'scheduled - required' })
          ].join('') + '</div>' +
          '<div class="grid g21 mt">' + UI.card('Volume: forecast vs actual', '<div id="iv1"></div>') + UI.card('Recommendations', '<div id="irec"></div>', { sub: 'Generated from the staffing gap for the rest of today.' }) + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Required vs scheduled vs staffed', '<div id="iv2"></div>') + UI.card('Over / under staffing', '<div id="iv3"></div>') + '</div>' +
          '<div class="mt">' + UI.card('Intervals', '<div id="itb"></div>', { flush: true }) + '</div>';
        var labs = irows.map(function (r) { return T.time(r.ts); });
        UI.chart(document.getElementById('iv1'), { type: 'bar', height: 22, labels: labs, tickEvery: 4, series: [{ name: 'Actual', color: 'var(--c2)', data: irows.map(function (r) { return r.act; }) }, { name: 'Forecast', type: 'line', color: 'var(--c4)', data: irows.map(function (r) { return +r.fc.toFixed(1); }) }] });
        UI.chart(document.getElementById('iv2'), { type: 'line', height: 22, labels: labs, tickEvery: 4, series: [{ name: 'Required', color: 'var(--c5)', data: irows.map(function (r) { return r.req; }) }, { name: 'Scheduled', color: 'var(--c3)', data: irows.map(function (r) { return r.sched; }) }, { name: 'Staffed (live)', color: 'var(--c1)', data: irows.map(function (r) { return r.staffed; }) }] });
        UI.chart(document.getElementById('iv3'), { type: 'bar', height: 22, labels: labs, tickEvery: 4, series: [{ name: 'Over-staffed', color: 'var(--c3)', data: irows.map(function (r) { return r.gap > 0 && (r.fc >= .2 || r.req) ? r.gap : null; }) }, { name: 'Under-staffed', color: 'var(--c5)', data: irows.map(function (r) { return r.gap < 0 ? r.gap : null; }) }] });
        document.getElementById('irec').innerHTML = recs.length ? '<ul class="plain">' + recs.map(function (r) { var d2 = done[r.id]; return '<li style="display:flex;gap:1rem;align-items:flex-start;font-size:1.2rem"><span style="flex:1">' + UI.tag(r.kind, r.kind === 'Offer VTO' ? 'info' : 'warn') + ' ' + esc(r.text) + '</span>' + (d2 ? UI.tag('Accepted ' + T.time(d2.ts), 'ok') : '<button class="btn xs pri" data-wrec="' + r.id + '" data-wk="' + esc(r.kind) + '">Accept</button>') + '</li>'; }).join('') + '</ul><div class="muted mt" style="font-size:1.05rem">Accepting records the decision in the audit log; it does not edit schedules.</div>' : UI.empty('No recommendations', 'Staffing is within range for the rest of today.');
        UI.table(document.getElementById('itb'), {
          id: 'wintra', noun: 'intervals', csv: 'wfm-intraday', pageSize: 12, search: false, rows: irows.filter(function (r) { return r.fc >= .2 || r.sched; }), sort: 'ts', dir: 'asc',
          cols: [{ k: 'ts', label: 'Interval', html: function (r) { return '<b>' + T.time(r.ts) + '</b>' + (r.cur ? ' ' + UI.tag('now', 'brand') : ''); }, val: function (r) { return r.ts; } }, { k: 'fc', label: 'Forecast', r: 1, html: function (r) { return f.n(r.fc, 1); }, val: function (r) { return +r.fc.toFixed(1); } }, { k: 'act', label: 'Actual', r: 1, html: function (r) { return r.act == null ? '<span class="faint">-</span>' : f.n(r.act); }, val: function (r) { return r.act; } }, { k: 'req', label: 'Required', r: 1, html: function (r) { return r.req; }, val: function (r) { return r.req; } }, { k: 'sched', label: 'Scheduled', r: 1, html: function (r) { return r.sched; }, val: function (r) { return r.sched; } }, { k: 'stf', label: 'Staffed (live)', r: 1, html: function (r) { return r.staffed == null ? '<span class="faint">-</span>' : r.staffed; }, val: function (r) { return r.staffed; } }, { k: 'gap', label: 'Gap', r: 1, html: function (r) { return '<span class="' + (r.gap < 0 ? 'bad-t' : r.gap > 2 ? 'warn-t' : 'ok-t') + '">' + (r.gap > 0 ? '+' : '') + r.gap + '</span>'; }, val: function (r) { return r.gap; } }]
        });
        ctx.on('[data-wrec]', function (e, b) {
          if (!MCM.can('wfm')) return MCM.deny('accept staffing recommendations');
          var d3 = st('wfmRecs', {}), rec = recs.filter(function (r) { return r.id === b.dataset.wrec; })[0]; d3[b.dataset.wrec] = { ts: Date.now(), by: (me() || {}).name }; MCM.store.set('wfmRecs', d3);
          MCM.audit('Intraday recommendation accepted', b.dataset.wk + ': ' + (rec ? rec.text : '')); UI.toast(b.dataset.wk + ' accepted', { kind: 'ok' }); ctx.refresh();
        });
        ctx.every(15000, function () { if (!UI.drawerOpen() && !document.querySelector('.modal')) ctx.refresh(); });
      }

      /* ================= TIME OFF ================= */
      else if (tab === 'timeoff') {
        var canT = MCM.can('wfm'), mine = isAgent() ? me().id : null;
        var reqs = MCM.timeoff.filter(function (r) { return !mine || r.agent === mine; });
        function impact(agentId, from, to) {
          var a = MCM.aById[agentId], worst = null, lines = [], dd2 = T.sod(from + 12 * HR);
          for (var x = dd2; x <= to; x += DAY) {
            if (x < MCM.TODAY || !shiftFor(a, x)) continue;
            var cv = dayCov(x, a.queues, a.id); lines.push({ ds: x, cv: cv }); if (!worst || cv.pct < worst.pct) worst = cv;
          }
          return { lines: lines, worst: worst };
        }
        function impactHtml(imp) { if (!imp.lines.length) return '<span class="faint">No working days affected</span>'; return imp.lines.map(function (l) { return dayLabel(l.ds) + ': ' + l.cv.heads + ' scheduled (ex. requester), peak need ' + l.cv.peak + ', coverage ' + covTag(l.cv.pct); }).join('<br>'); }
        var allow = 20, bal = nonAdmin().filter(function (a) { return !mine || a.id === mine; }).map(function (a) { var used = 0, pend = 0; MCM.timeoff.forEach(function (r) { if (r.agent !== a.id || (r.type !== 'Vacation' && r.type !== 'Personal')) return; var n = workDays(a, r.from, r.to + DAY - 1) || 0; if (r.status === 'approved') used += n; else if (r.status === 'pending') pend += n; }); return { a: a, used: used, pend: pend, left: allow - used - pend }; });
        var pendN = reqs.filter(function (r) { return r.status === 'pending'; }).length;
        var agentChoices = (isAgent() ? [me()] : nonAdmin()).map(function (a) { return [a.id, a.name]; });
        el.innerHTML = '<div class="grid g4">' + [UI.kpi({ label: 'Pending', value: pendN, status: pendN ? 'warn' : 'ok' }), UI.kpi({ label: 'Approved', value: reqs.filter(function (r) { return r.status === 'approved'; }).length }), UI.kpi({ label: 'Denied', value: reqs.filter(function (r) { return r.status === 'denied'; }).length }), UI.kpi({ label: 'Annual allowance', value: allow, unit: ' days', sub: 'demo allowance per agent' })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Time-off requests', '<div id="wto"></div>', { flush: true, sub: 'Coverage impact compares scheduled agents (excluding the requester) with forecast need on the affected days.' }) + '</div>' +
          '<div class="grid g2 mt">' + UI.card('New request', '<div class="fg"><label>Agent' + sel('data-to-agent', agentChoices, agentChoices[0][0]) + '</label><div class="fg c3"><label>Type' + sel('data-to-type', ['Vacation', 'Sick', 'Personal', 'Unpaid leave'], 'Vacation') + '</label><label>From<input type="date" class="inp" data-to-from value="' + ymd(MCM.TODAY + DAY) + '"></label><label>To<input type="date" class="inp" data-to-to value="' + ymd(MCM.TODAY + DAY) + '"></label></div><label>Note<input class="inp" data-to-note placeholder="Optional"></label><div id="toimp" class="note"></div><div><button class="btn pri" data-to-submit>Submit request</button></div></div>') +
          UI.card('Balances ' + UI.preview(), '<div id="wbal"></div>', { flush: true, sub: 'Vacation + personal days. Sick leave does not draw on the allowance.' }) + '</div>';
        function refreshImpact() {
          var ag = el.querySelector('[data-to-agent]').value, fr = fromYmd(el.querySelector('[data-to-from]').value), to = fromYmd(el.querySelector('[data-to-to]').value);
          el.querySelector('#toimp').innerHTML = UI.icon('info') + '<span><b>Coverage impact</b><br>' + (to < fr ? 'End date is before start date.' : impactHtml(impact(ag, fr, to))) + '</span>';
        }
        refreshImpact();
        onChange('[data-to-agent],[data-to-from],[data-to-to]', refreshImpact);
        UI.table(document.getElementById('wto'), {
          id: 'wtoff', noun: 'requests', csv: 'wfm-timeoff', pageSize: 10, rows: reqs, sort: 'from', dir: 'asc',
          cols: [{ k: 'ag', label: 'Agent', html: function (r) { return '<b>' + esc(MCM.aById[r.agent].name) + '</b>'; }, val: function (r) { return MCM.aById[r.agent].name; } }, { k: 'type', label: 'Type', html: function (r) { return esc(r.type); }, val: function (r) { return r.type; } },
            { k: 'from', label: 'Dates', html: function (r) { return T.dm(r.from) + (r.to > r.from ? ' - ' + T.dm(r.to) : ''); }, val: function (r) { return r.from; } },
            { k: 'days', label: 'Work days', r: 1, html: function (r) { return workDays(MCM.aById[r.agent], r.from, r.to + DAY - 1); }, val: function (r) { return workDays(MCM.aById[r.agent], r.from, r.to + DAY - 1); } },
            { k: 'cov', label: 'Coverage impact', html: function (r) { var im = impact(r.agent, r.from, r.to); return im.worst ? 'worst day ' + covTag(im.worst.pct) : '<span class="faint">-</span>'; }, val: function (r) { var im = impact(r.agent, r.from, r.to); return im.worst ? +im.worst.pct.toFixed(0) : null; } },
            { k: 'st', label: 'Status', html: function (r) { return stTag(r.status); }, val: function (r) { return r.status; } }, { k: 'note', label: 'Note', html: function (r) { return esc(r.note); }, val: function (r) { return r.note; } },
            { k: 'act', label: '', noSort: true, noCsv: true, html: function (r) { return r.status === 'pending' && canT && !isAgent() ? '<button class="btn xs pri" data-toa="approved" data-id="' + r.id + '">Approve</button> <button class="btn xs danger" data-toa="denied" data-id="' + r.id + '">Deny</button>' : ''; } }]
        });
        UI.table(document.getElementById('wbal'), {
          id: 'wbalt', noun: 'agents', csv: 'wfm-balances', pageSize: 8, rows: bal, sort: 'left', dir: 'asc',
          cols: [{ k: 'a', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b>'; }, val: function (r) { return r.a.name; } }, { k: 'used', label: 'Used', r: 1, html: function (r) { return r.used; }, val: function (r) { return r.used; } }, { k: 'pend', label: 'Pending', r: 1, html: function (r) { return r.pend; }, val: function (r) { return r.pend; } }, { k: 'left', label: 'Remaining', r: 1, html: function (r) { return '<span class="' + (r.left < 3 ? 'warn-t' : '') + '">' + r.left + '</span>'; }, val: function (r) { return r.left; } }]
        });
        ctx.on('[data-toa]', function (e, b) {
          if (!MCM.can('wfm')) return MCM.deny('approve time off');
          var r = MCM.timeoff.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!r) return;
          r.status = b.dataset.toa; MCM.saveWfm(); MCM.audit('Time off ' + r.status, MCM.aById[r.agent].name + ' ' + r.type + ' ' + T.dm(r.from) + (r.to > r.from ? '-' + T.dm(r.to) : '')); UI.toast('Request ' + r.status, { kind: r.status === 'approved' ? 'ok' : '' }); ctx.refresh();
        });
        ctx.on('[data-to-submit]', function () {
          var ag = el.querySelector('[data-to-agent]').value, fr = fromYmd(el.querySelector('[data-to-from]').value), to = fromYmd(el.querySelector('[data-to-to]').value), type = el.querySelector('[data-to-type]').value, note = el.querySelector('[data-to-note]').value.trim();
          if (isAgent() && ag !== me().id) return MCM.deny('request time off for others');
          if (to < fr) { UI.toast('End date is before start date', { kind: 'bad' }); return; }
          if (fr < MCM.TODAY) { UI.toast('Start date is in the past', { kind: 'bad' }); return; }
          MCM.timeoff.push({ id: nid('t'), agent: ag, from: fr, to: to, type: type, status: 'pending', note: note }); MCM.saveWfm();
          MCM.audit('Time off requested', MCM.aById[ag].name + ' ' + type + ' ' + T.dm(fr) + (to > fr ? '-' + T.dm(to) : '')); UI.toast('Request submitted', { kind: 'ok' }); ctx.refresh();
        });
      }

      /* ================= TRADES ================= */
      else if (tab === 'trades') {
        var canX = MCM.can('wfm'), mineX = isAgent() ? me().id : null;
        function validate(fromId, toId, ds) {
          var A = MCM.aById[fromId], B = MCM.aById[toId], out = []; if (!A || !B) return [{ lvl: 'fail', t: 'Select both agents' }];
          if (fromId === toId) return [{ lvl: 'fail', t: 'Choose two different agents' }];
          var o = ovr(), shA = shiftFor(A, ds, o), shB = shiftFor(B, ds, o), missing = A.queues.filter(function (q) { return B.queues.indexOf(q) < 0; }), common = A.queues.filter(function (q) { return B.queues.indexOf(q) >= 0; });
          if (ds < MCM.TODAY) out.push({ lvl: 'fail', t: 'The day is in the past' });
          if (!common.length) out.push({ lvl: 'fail', t: 'No shared queues - ' + A.name + ' is skilled for ' + A.queues.map(qname).join(', ') });
          else if (missing.length) out.push({ lvl: 'warn', t: B.name + ' is not skilled for ' + missing.map(qname).join(', ') });
          else out.push({ lvl: 'ok', t: 'Both agents are qualified for the same queues' });
          if (!shA) out.push({ lvl: 'fail', t: A.name + ' has no shift on ' + dayLabel(ds) });
          else if (shB) {
            [[A, shB], [B, shA]].forEach(function (p) {
              var prev = shiftFor(p[0], ds - DAY, o), next = shiftFor(p[0], ds + DAY, o);
              if (prev && p[1].start - prev.end < 10 * HR) out.push({ lvl: 'fail', t: p[0].name + ' would have under 10 h rest before this shift' });
              else if (next && next.start - p[1].end < 10 * HR) out.push({ lvl: 'fail', t: p[0].name + ' would have under 10 h rest after this shift' });
            });
            if (!out.some(function (x) { return /rest/.test(x.t); })) out.push({ lvl: 'ok', t: 'No overlap and rest periods of 10 h or more are kept' });
          } else {
            var hrs = weekHours(B, ds, o) + 8;
            out.push(hrs > 40 ? { lvl: 'warn', t: B.name + ' is off that day; taking the shift means ' + hrs + ' h this week (overtime)' } : { lvl: 'ok', t: B.name + ' is off that day; ' + hrs + ' h this week, within limit' });
          }
          return out;
        }
        function sum(v) { return v.some(function (x) { return x.lvl === 'fail'; }) ? 'fail' : v.some(function (x) { return x.lvl === 'warn'; }) ? 'warn' : 'ok'; }
        function vHtml(v) { return '<ul class="plain" style="font-size:1.15rem">' + v.map(function (x) { return '<li>' + sevTag(x.lvl) + ' ' + esc(x.t) + '</li>'; }).join('') + '</ul>'; }
        var trs = MCM.trades.filter(function (t) { return !mineX || t.from === mineX || t.to === mineX; }), agChoices = (isAgent() ? [me()] : nonAdmin()).map(function (a) { return [a.id, a.name]; }), allChoices = nonAdmin().map(function (a) { return [a.id, a.name]; });
        el.innerHTML = hdr('A trade hands the first agent\'s shift to the second agent on the chosen day. Validation checks shared queue skills, overlap, 10 h rest and weekly hours. Approved trades are recorded; the schedule grid is not changed.') +
          '<div class="grid g3">' + [UI.kpi({ label: 'Pending', value: trs.filter(function (t) { return t.status === 'pending'; }).length }), UI.kpi({ label: 'Approved', value: trs.filter(function (t) { return t.status === 'approved'; }).length }), UI.kpi({ label: 'Denied', value: trs.filter(function (t) { return t.status === 'denied'; }).length })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Shift trades', '<div id="wtr"></div>', { flush: true }) + '</div>' +
          '<div class="mt">' + UI.card('New trade request', '<div class="fg c3"><label>From (gives shift)' + sel('data-tr-from', agChoices, agChoices[0][0]) + '</label><label>To (takes shift)' + sel('data-tr-to', allChoices.filter(function (c) { return c[0] !== agChoices[0][0]; }), '') + '</label><label>Day' + sel('data-tr-day', dayOpts(1, 14), MCM.TODAY + DAY) + '</label></div><div class="fg mt"><label>Note<input class="inp" data-tr-note placeholder="Optional"></label><div id="trval" class="note" style="display:block"></div><div><button class="btn pri" data-tr-submit>Submit trade</button></div></div>') + '</div>';
        function trCur() { return [el.querySelector('[data-tr-from]').value, el.querySelector('[data-tr-to]').value, +el.querySelector('[data-tr-day]').value]; }
        function trPreview() { var c = trCur(); el.querySelector('#trval').innerHTML = '<b>Validation</b>' + vHtml(validate(c[0], c[1], c[2])); }
        trPreview(); onChange('[data-tr-from],[data-tr-to],[data-tr-day]', trPreview);
        UI.table(document.getElementById('wtr'), {
          id: 'wtrades', noun: 'trades', csv: 'wfm-trades', pageSize: 10, rows: trs, sort: 'day', dir: 'asc',
          cols: [{ k: 'from', label: 'From', html: function (t) { return '<b>' + esc(MCM.aById[t.from].name) + '</b>'; }, val: function (t) { return MCM.aById[t.from].name; } }, { k: 'to', label: 'To', html: function (t) { return '<b>' + esc(MCM.aById[t.to].name) + '</b>'; }, val: function (t) { return MCM.aById[t.to].name; } }, { k: 'day', label: 'Day', html: function (t) { return dayLabel(t.day); }, val: function (t) { return t.day; } },
            { k: 'val', label: 'Validation', html: function (t) { return t.status === 'pending' ? sevTag(sum(validate(t.from, t.to, t.day))) + ' <button class="btn xs" data-trd="' + t.id + '">Details</button>' : '<span class="faint">-</span>'; }, val: function (t) { return sum(validate(t.from, t.to, t.day)); } },
            { k: 'st', label: 'Status', html: function (t) { return stTag(t.status); }, val: function (t) { return t.status; } }, { k: 'note', label: 'Note', html: function (t) { return esc(t.note); }, val: function (t) { return t.note; } },
            { k: 'act', label: '', noSort: true, noCsv: true, html: function (t) { return t.status === 'pending' && canX && !isAgent() ? '<button class="btn xs pri" data-tra="approved" data-id="' + t.id + '">Approve</button> <button class="btn xs danger" data-tra="denied" data-id="' + t.id + '">Deny</button>' : ''; } }]
        });
        ctx.on('[data-trd]', function (e, b) { var t = MCM.trades.filter(function (x) { return x.id === b.dataset.trd; })[0]; if (!t) return; UI.modal({ title: 'Trade validation', body: '<p class="muted" style="margin-bottom:1rem">' + esc(MCM.aById[t.from].name + ' to ' + MCM.aById[t.to].name + ' on ' + dayLabel(t.day)) + '</p>' + vHtml(validate(t.from, t.to, t.day)), foot: [{ label: 'Close', pri: true }] }); });
        ctx.on('[data-tra]', function (e, b) {
          if (!MCM.can('wfm')) return MCM.deny('approve shift trades');
          var t = MCM.trades.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!t) return;
          if (b.dataset.tra === 'approved' && sum(validate(t.from, t.to, t.day)) === 'fail') { UI.toast('Cannot approve: validation failed. See Details.', { kind: 'bad' }); return; }
          t.status = b.dataset.tra; MCM.saveWfm(); MCM.audit('Shift trade ' + t.status, MCM.aById[t.from].name + ' -> ' + MCM.aById[t.to].name + ' ' + T.dm(t.day)); UI.toast('Trade ' + t.status, { kind: t.status === 'approved' ? 'ok' : '' }); ctx.refresh();
        });
        ctx.on('[data-tr-submit]', function () {
          var c = trCur(), v = validate(c[0], c[1], c[2]); if (isAgent() && c[0] !== me().id) return MCM.deny('trade shifts for others');
          if (sum(v) === 'fail') { UI.toast('Fix the validation failures first', { kind: 'bad' }); return; }
          MCM.trades.push({ id: nid('x'), from: c[0], to: c[1], day: c[2], status: 'pending', note: el.querySelector('[data-tr-note]').value.trim() }); MCM.saveWfm();
          MCM.audit('Shift trade requested', MCM.aById[c[0]].name + ' -> ' + MCM.aById[c[1]].name + ' ' + T.dm(c[2])); UI.toast('Trade request submitted', { kind: 'ok' }); ctx.refresh();
        });
      }

      /* ================= SHRINKAGE ================= */
      else if (tab === 'shrinkage') {
        var ndays = +st('wfmShrinkDays', 14), sfrom = MCM.TODAY - (ndays - 1) * DAY, sto = Date.now();
        var slist = MCM.query({ from: sfrom, to: sto, ignoreFilters: true }), stats = MCM.agentStats(slist, { from: sfrom, to: sto }).filter(function (x) { return x.agent.role !== 'Admin'; });
        var CAT = [['break', 'Breaks', true, true], ['lunch', 'Lunch', true, false], ['train', 'Training / coaching', true, true], ['leave', 'Leave (vacation, personal)', true, true], ['unpl', 'Sick / unplanned absence', false, true], ['adh', 'Out of adherence', false, true]];
        var cs = MCM.coachSessions.filter(function (c) { return c.ts >= sfrom && c.ts < sto && c.status !== 'scheduled'; });
        function newAcc() { var o = { sched: 0 }; CAT.forEach(function (c) { o[c[0]] = 0; }); return o; }
        var byTeam = {}, tot = newAcc(), byDay = {};
        nonAdmin().forEach(function (a) {
          var t = byTeam[a.team] || (byTeam[a.team] = newAcc());
          for (var dx = Math.floor((sfrom - MCM.TODAY) / DAY); dx <= 0; dx++) {
            var dsx = MCM.TODAY + dx * DAY, sh = MCM.shift(a, dsx); if (!sh) continue;
            var s0 = Math.max(sh.start, sfrom), e0 = Math.min(sh.end, sto); if (e0 <= s0) continue;
            var acc = byDay[dsx] || (byDay[dsx] = newAcc()), schedH = (e0 - s0) / 3600000; t.sched += schedH; tot.sched += schedH; acc.sched += schedH;
            var abs = MCM.timeoff.filter(function (r) { return r.status === 'approved' && r.agent === a.id && dsx >= r.from && dsx <= r.to; })[0];
            function add(k, h) { t[k] += h; tot[k] += h; acc[k] += h; }
            if (abs) { add(abs.type === 'Sick' ? 'unpl' : 'leave', schedH); continue; }
            sh.items.forEach(function (it) { if (it.type === 'work') return; var x = Math.max(it.from, s0), y = Math.min(it.to, e0); if (y > x) add(it.type, (y - x) / 3600000); });
            cs.forEach(function (c) { if (c.agent === a.id && c.ts >= dsx && c.ts < dsx + DAY) add('train', 0.75); });
            if (dsx < MCM.TODAY) { var ad = MCM.adherence(a, dsx); ad.exceptions.forEach(function (x) { add('adh', x.min / 60); }); }
          }
        });
        function sumC(o, pred) { var s = 0; CAT.forEach(function (c) { if (pred(c)) s += o[c[0]]; }); return s; }
        function shrinkPct(o) { return o.sched ? sumC(o, function () { return true; }) / o.sched * 100 : 0; }
        var planned = sumC(tot, function (c) { return c[2]; }), unpl = sumC(tot, function (c) { return !c[2]; }), paid = sumC(tot, function (c) { return c[3]; }), unpaid = sumC(tot, function (c) { return !c[3]; });
        var busy = 0, staffedS = 0, teamOcc = {}; stats.forEach(function (x) { var b = x.agg.talk + x.agg.hold + x.agg.wrap; busy += b; staffedS += x.staffed; var o = teamOcc[x.agent.team] || (teamOcc[x.agent.team] = { b: 0, s: 0 }); o.b += b; o.s += x.staffed; });
        var occAct = staffedS ? Math.min(98, busy / staffedS * 100) : null, PLAN_OCC = 85;
        var dkeys = Object.keys(byDay).map(Number).sort(function (a, b) { return a - b; });
        var catRows = CAT.map(function (c) { return { k: c[0], label: c[1], planned: c[2], paid: c[3], hrs: tot[c[0]], pct: tot.sched ? tot[c[0]] / tot.sched * 100 : 0 }; });
        var teamRows = Object.keys(byTeam).map(function (k) { var o = byTeam[k], oc = teamOcc[k]; return { team: k, o: o, shrink: shrinkPct(o), pl: o.sched ? sumC(o, function (c) { return c[2]; }) / o.sched * 100 : 0, un: o.sched ? sumC(o, function (c) { return !c[2]; }) / o.sched * 100 : 0, occ: oc && oc.s ? Math.min(98, oc.b / oc.s * 100) : null }; });
        el.innerHTML = hdr('Shrinkage = scheduled breaks and lunch + approved leave + coaching sessions (45 min assumed) + out-of-adherence exceptions, divided by scheduled hours (' + T.dm(sfrom) + ' - ' + T.dm(sto) + '). Derived from MCM.agentStats, MCM.timeoff and MCM.adherence; admin accounts excluded.') +
          '<div class="grid g5">' + [
            UI.kpi({ label: 'Total shrinkage', value: f.pct(shrinkPct(tot)), def: 'shrinkage', sub: f.n(sumC(tot, function () { return true; })) + ' of ' + f.n(tot.sched) + ' scheduled h' }),
            UI.kpi({ label: 'Planned', value: f.pct(tot.sched ? planned / tot.sched * 100 : 0), sub: 'breaks, lunch, training, leave' }),
            UI.kpi({ label: 'Unplanned', value: f.pct(tot.sched ? unpl / tot.sched * 100 : 0), status: tot.sched && unpl / tot.sched > .05 ? 'warn' : 'ok', sub: 'sick, adherence' }),
            UI.kpi({ label: 'Paid / unpaid', value: f.pct(tot.sched ? paid / tot.sched * 100 : 0, 1), sub: 'unpaid ' + f.pct(tot.sched ? unpaid / tot.sched * 100 : 0, 1) + ' (lunch)' }),
            UI.kpi({ label: 'Occupancy actual', value: f.pct(occAct), def: 'occupancy', status: occAct == null ? '' : occAct > 90 ? 'bad' : '', sub: 'planned ' + PLAN_OCC + '%' })
          ].join('') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Shrinkage trend', '<div id="sh1"></div>', { acts: UI.seg([[7, '7d'], [14, '14d'], [30, '30d']], ndays, 'sd', 'sm') }) + UI.card('By category', '<div id="sh2"></div>', { flush: true }) + '</div>' +
          '<div class="grid g2 mt">' + UI.card('By team', '<div id="sh3"></div>', { flush: true }) + UI.card('Occupancy: planned vs actual', '<div id="sh4"></div>') + '</div>';
        UI.chart(document.getElementById('sh1'), { type: 'line', height: 22, labels: dkeys.map(function (d) { return T.dm(d); }), series: [{ name: 'Shrinkage %', color: 'var(--c4)', data: dkeys.map(function (d) { return +shrinkPct(byDay[d]).toFixed(1); }), fmt: function (v) { return f.pct(v); } }, { name: 'Planned %', color: 'var(--c2)', data: dkeys.map(function (d) { return +(byDay[d].sched ? sumC(byDay[d], function (c) { return c[2]; }) / byDay[d].sched * 100 : 0).toFixed(1); }), fmt: function (v) { return f.pct(v); } }, { name: 'Unplanned %', color: 'var(--c5)', data: dkeys.map(function (d) { return +(byDay[d].sched ? sumC(byDay[d], function (c) { return !c[2]; }) / byDay[d].sched * 100 : 0).toFixed(1); }), fmt: function (v) { return f.pct(v); } }], fmt: function (v) { return v.toFixed(0) + '%'; } });
        UI.table(document.getElementById('sh2'), { id: 'wshc', noun: 'categories', csv: 'wfm-shrinkage-categories', search: false, colChooser: false, pageSize: 10, rows: catRows, sort: 'hrs', dir: 'desc', cols: [{ k: 'label', label: 'Category', html: function (r) { return '<b>' + r.label + '</b>'; }, val: function (r) { return r.label; } }, { k: 'pl', label: 'Type', html: function (r) { return UI.tag(r.planned ? 'Planned' : 'Unplanned', r.planned ? 'info' : 'warn'); }, val: function (r) { return r.planned ? 'Planned' : 'Unplanned'; } }, { k: 'paid', label: 'Pay', html: function (r) { return UI.tag(r.paid ? 'Paid' : 'Unpaid'); }, val: function (r) { return r.paid ? 'Paid' : 'Unpaid'; } }, { k: 'hrs', label: 'Hours', r: 1, html: function (r) { return f.n(r.hrs, 1); }, val: function (r) { return +r.hrs.toFixed(1); } }, { k: 'pct', label: '% of scheduled', r: 1, html: function (r) { return f.pct(r.pct); }, val: function (r) { return +r.pct.toFixed(2); } }] });
        UI.table(document.getElementById('sh3'), { id: 'wsht', noun: 'teams', csv: 'wfm-shrinkage-teams', search: false, colChooser: false, pageSize: 10, rows: teamRows, sort: 'shrink', dir: 'desc', cols: [{ k: 'team', label: 'Team', html: function (r) { return '<b>' + esc(r.team) + '</b>'; }, val: function (r) { return r.team; } }, { k: 'sched', label: 'Scheduled h', r: 1, html: function (r) { return f.n(r.o.sched); }, val: function (r) { return Math.round(r.o.sched); } }, { k: 'pl', label: 'Planned', r: 1, html: function (r) { return f.pct(r.pl); }, val: function (r) { return +r.pl.toFixed(1); } }, { k: 'un', label: 'Unplanned', r: 1, html: function (r) { return f.pct(r.un); }, val: function (r) { return +r.un.toFixed(1); } }, { k: 'shrink', label: 'Shrinkage', r: 1, html: function (r) { return '<b>' + f.pct(r.shrink) + '</b>'; }, val: function (r) { return +r.shrink.toFixed(1); } }, { k: 'occ', label: 'Occupancy', r: 1, html: function (r) { return f.pct(r.occ); }, val: function (r) { return r.occ == null ? null : +r.occ.toFixed(1); } }] });
        UI.chart(document.getElementById('sh4'), { type: 'bar', height: 20, labels: teamRows.map(function (r) { return r.team; }), tickEvery: 1, min: 0, max: 100, series: [{ name: 'Planned', color: 'var(--c2)', data: teamRows.map(function () { return PLAN_OCC; }) }, { name: 'Actual', color: 'var(--c3)', data: teamRows.map(function (r) { return r.occ == null ? null : +r.occ.toFixed(1); }) }], fmt: function (v) { return f.pct(v, 0); } });
        ctx.on('[data-sd]', function (e, b) { MCM.store.set('wfmShrinkDays', +b.dataset.sd); ctx.refresh(); });
      }

      /* ================= CAPACITY ================= */
      else if (tab === 'capacity') {
        var inp = Object.assign({ vol: 0, aht: 0, shrink: 20, slT: 80, slS: 20, absent: 5, occ: 90, day: 1 }, st('wfmCap', {})), cq = qsel(), cds = MCM.TODAY + inp.day * DAY, cpool = poolAgents(cq), cov = ovr();
        var crows = []; for (var ci = 0; ci < 48; ci++) {
          var cts = cds + ci * HALF, vol = 0, N = 0, A = 0, ahtW = 0;
          cq.forEach(function (qq) { var r = fcast(qq, cds)[ci], calls = r.fc * (1 + inp.vol / 100), aht = r.aht * (1 + inp.aht / 100); vol += calls; N += reqAgents(calls, aht, inp.slS, inp.slT / 100, inp.occ / 100); A += calls * aht / 1800; ahtW += calls * aht; });
          var fte = N / (1 - inp.shrink / 100) / (1 - inp.absent / 100), sched = 0; cpool.forEach(function (a) { if (stateAtDs(a, cds, cts + HALF / 2, cov) !== 'off') sched++; });
          var seats = Math.floor(sched * (1 - inp.shrink / 100) * (1 - inp.absent / 100)), ahtAvg = vol ? ahtW / vol : 300, slp = A <= 0.01 ? null : slErl(seats, A, ahtAvg, inp.slS) * 100;
          crows.push({ ts: cts, vol: vol, aht: ahtAvg, N: N, fte: fte, sched: sched, gap: sched - fte, sl: slp });
        }
        var live = crows.filter(function (r) { return r.vol >= .2 || r.sched; }), peakF = Math.max.apply(null, crows.map(function (r) { return r.fte; })), peakS = Math.max.apply(null, crows.map(function (r) { return r.sched; }));
        var shortH = crows.reduce(function (s, r) { return s + (r.gap < 0 && r.vol >= .2 ? -r.gap * .5 : 0); }, 0), surH = crows.reduce(function (s, r) { return s + (r.gap > 0 && r.vol >= .2 ? r.gap * .5 : 0); }, 0), shortN = crows.filter(function (r) { return r.gap < -.5 && r.vol >= .2; }).length;
        var scen = st('wfmScenarios', []);
        function num(k, lbl, min, max, stp) { return '<label>' + lbl + '<input class="inp" type="number" data-cap="' + k + '" min="' + min + '" max="' + max + '" step="' + (stp || 1) + '" value="' + inp[k] + '"></label>'; }
        el.innerHTML = hdr('What-if on the forecast for ' + dayLabel(cds) + ' across ' + (cq.length === MCM.queues.length ? 'all queues' : cq.map(qname).join(', ')) + '. Required FTE = Erlang C agents on the phones, grossed up for shrinkage and absenteeism. Scheduled = agents with a shift in that interval.') +
          UI.card('Scenario inputs', '<div class="fg c4" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + num('vol', 'Volume change %', -80, 300) + num('aht', 'AHT change %', -80, 300) + num('shrink', 'Shrinkage %', 0, 80) + num('absent', 'Absenteeism %', 0, 60) + num('slT', 'SL target %', 1, 100) + num('slS', 'SL threshold (s)', 1, 600) + num('occ', 'Max occupancy %', 50, 100) + '<label>Day' + sel('data-cap="day"', dayOpts(0, 13).map(function (o, i) { return [i, o[1]]; }), inp.day) + '</label></div><div style="margin-top:1.4rem;display:flex;gap:1rem"><button class="btn pri" data-cap-save>Save scenario</button><button class="btn" data-cap-reset>Reset inputs</button></div>') +
          '<div class="grid g5 mt">' + [
            UI.kpi({ label: 'Peak required FTE', value: f.n(peakF, 1), sub: 'incl. shrinkage and absenteeism' }),
            UI.kpi({ label: 'Peak scheduled', value: peakS, sub: 'agents with a shift' }),
            UI.kpi({ label: 'Understaffed intervals', value: shortN, status: shortN > 6 ? 'bad' : shortN ? 'warn' : 'ok', sub: f.n(shortH, 1) + ' agent-hours short' }),
            UI.kpi({ label: 'Surplus', value: f.n(surH, 1), unit: ' h', sub: 'agent-hours over requirement' }),
            UI.kpi({ label: 'Extra FTE at peak', value: f.n(Math.max(0, Math.ceil(peakF - peakS)), 0), status: peakF > peakS ? 'warn' : 'ok', sub: 'to cover the tightest interval' })
          ].join('') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Required vs scheduled', '<div id="cp1"></div>') + UI.card('Staffing gap', '<div id="cp2"></div>') + '</div>' +
          '<div class="mt">' + UI.card('Intervals', '<div id="cpt"></div>', { flush: true }) + '</div>' +
          '<div class="mt">' + UI.card('Saved scenarios', '<div id="cps"></div>', { flush: true }) + '</div>';
        var cl = crows.map(function (r) { return T.time(r.ts); });
        UI.chart(document.getElementById('cp1'), { type: 'line', height: 22, labels: cl, tickEvery: 4, series: [{ name: 'Required FTE', color: 'var(--c5)', data: crows.map(function (r) { return +r.fte.toFixed(1); }) }, { name: 'Required on phones', color: 'var(--c4)', dash: true, data: crows.map(function (r) { return r.N; }) }, { name: 'Scheduled', color: 'var(--c3)', data: crows.map(function (r) { return r.sched; }) }] });
        UI.chart(document.getElementById('cp2'), { type: 'bar', height: 22, labels: cl, tickEvery: 4, series: [{ name: 'Surplus', color: 'var(--c3)', data: crows.map(function (r) { return r.gap > 0.05 && r.vol >= .2 ? +r.gap.toFixed(1) : null; }) }, { name: 'Shortfall', color: 'var(--c5)', data: crows.map(function (r) { return r.gap < -0.05 && r.vol >= .2 ? +r.gap.toFixed(1) : null; }) }] });
        UI.table(document.getElementById('cpt'), {
          id: 'wcap', noun: 'intervals', csv: 'wfm-capacity', pageSize: 12, search: false, rows: live, sort: 'ts', dir: 'asc',
          cols: [{ k: 'ts', label: 'Interval', html: function (r) { return '<b>' + T.time(r.ts) + '</b>'; }, val: function (r) { return r.ts; } }, { k: 'vol', label: 'Volume', r: 1, html: function (r) { return f.n(r.vol, 1); }, val: function (r) { return +r.vol.toFixed(1); } }, { k: 'aht', label: 'AHT (s)', r: 1, html: function (r) { return f.n(r.aht); }, val: function (r) { return Math.round(r.aht); } }, { k: 'N', label: 'On phones', r: 1, html: function (r) { return r.N; }, val: function (r) { return r.N; } }, { k: 'fte', label: 'Required FTE', r: 1, html: function (r) { return f.n(r.fte, 1); }, val: function (r) { return +r.fte.toFixed(1); } }, { k: 'sched', label: 'Scheduled', r: 1, html: function (r) { return r.sched; }, val: function (r) { return r.sched; } }, { k: 'gap', label: 'Gap', r: 1, html: function (r) { return '<span class="' + (r.gap < -.5 ? 'bad-t' : r.gap > 3 ? 'warn-t' : 'ok-t') + '">' + (r.gap > 0 ? '+' : '') + f.n(r.gap, 1) + '</span>'; }, val: function (r) { return +r.gap.toFixed(1); } }, { k: 'sl', label: 'Projected SL', r: 1, html: function (r) { return r.sl == null ? '<span class="faint">-</span>' : UI.slCell(r.sl, inp.slT); }, val: function (r) { return r.sl == null ? null : +r.sl.toFixed(1); } }]
        });
        UI.table(document.getElementById('cps'), {
          id: 'wscen', noun: 'scenarios', csv: 'wfm-scenarios', pageSize: 6, search: false, colChooser: false, rows: scen, emptyTitle: 'No saved scenarios', emptySub: 'Adjust the inputs and click Save scenario.',
          cols: [{ k: 'name', label: 'Scenario', html: function (r) { return '<b>' + esc(r.name) + '</b>'; }, val: function (r) { return r.name; } }, { k: 'ts', label: 'Saved', html: function (r) { return T.dt(r.ts); }, val: function (r) { return r.ts; } }, { k: 'in', label: 'Inputs', html: function (r) { return 'vol ' + r.inp.vol + '%, AHT ' + r.inp.aht + '%, shrink ' + r.inp.shrink + '%, abs ' + r.inp.absent + '%, SL ' + r.inp.slT + '/' + r.inp.slS; }, val: function (r) { return JSON.stringify(r.inp); } }, { k: 'pk', label: 'Peak FTE', r: 1, html: function (r) { return f.n(r.peakF, 1); }, val: function (r) { return r.peakF; } }, { k: 'sh', label: 'Short (h)', r: 1, html: function (r) { return f.n(r.shortH, 1); }, val: function (r) { return r.shortH; } },
            { k: 'act', label: '', noSort: true, noCsv: true, html: function (r) { return '<button class="btn xs" data-cap-load="' + r.id + '">Load</button> <button class="btn xs danger" data-cap-del="' + r.id + '">Delete</button>'; } }]
        });
        onChange('[data-cap]', function (t) { var k = t.dataset.cap, v = +t.value; if (isNaN(v)) return; inp[k] = v; MCM.store.set('wfmCap', inp); ctx.refresh(); });
        ctx.on('[data-cap-reset]', function () { MCM.store.del('wfmCap'); ctx.refresh(); });
        ctx.on('[data-cap-load]', function (e, b) { var s = scen.filter(function (x) { return x.id === b.dataset.capLoad; })[0]; if (s) { MCM.store.set('wfmCap', s.inp); ctx.refresh(); } });
        ctx.on('[data-cap-del]', function (e, b) { if (!MCM.can('wfm')) return MCM.deny('delete scenarios'); var s = scen.filter(function (x) { return x.id !== b.dataset.capDel; }); MCM.store.set('wfmScenarios', s); MCM.audit('Capacity scenario deleted', b.dataset.capDel); ctx.refresh(); });
        ctx.on('[data-cap-save]', function () {
          if (!MCM.can('wfm')) return MCM.deny('save capacity scenarios');
          UI.modal({ title: 'Save scenario', body: '<div class="fg"><label>Name<input class="inp" data-x-name value="Scenario ' + (scen.length + 1) + '"></label></div>', foot: [{ label: 'Cancel' }, { label: 'Save', pri: true, fn: function (m) { var nm = m.querySelector('[data-x-name]').value.trim(); if (!nm) return false; var l = st('wfmScenarios', []); l.unshift({ id: nid('sc'), name: nm, ts: Date.now(), inp: Object.assign({}, inp), peakF: +peakF.toFixed(1), shortH: +shortH.toFixed(1) }); MCM.store.set('wfmScenarios', l); MCM.audit('Capacity scenario saved', nm); UI.toast('Scenario saved', { kind: 'ok' }); setTimeout(ctx.refresh, 0); } }] });
        });
      }
    }
  });
  function TODAY0() { return MCM.TODAY; }
})();
