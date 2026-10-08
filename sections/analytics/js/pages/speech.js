/* Speech analytics - sentiment (human agents), topics, configurable moments, AI call summaries. */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc;
  var POS = 0.15, NEG = -0.15;
  var sel = { topic: null, moment: null, sf: 'all', tf: 'all' };
  var tcache = {};

  /* ---------- helpers ---------- */
  function human(list) { return list.filter(function (c) { return c.outcome === 'answered' && c.sent != null; }); }
  function sentTag(s) { return s == null ? '-' : UI.tag(s > POS ? 'Positive' : s < NEG ? 'Negative' : 'Neutral', s > POS ? 'ok' : s < NEG ? 'bad' : ''); }
  function sentNum(s) { return s == null ? '<span class="faint">-</span>' : '<span class="' + (s > POS ? 'ok-t' : s < NEG ? 'bad-t' : '') + '">' + f.dec(s, 2) + '</span>'; }
  function avg(l, fn) { var n = 0, s = 0; l.forEach(function (c) { var v = fn(c); if (v != null) { n++; s += v; } }); return n ? s / n : null; }
  function pctOf(l, fn) { return l.length ? l.filter(fn).length / l.length * 100 : null; }
  function isRisk(c) { var t = c.topics || [], g = c.tags || []; return c.sent != null && (c.sent <= -0.4 || (c.sent < NEG && (g.indexOf('escalation') >= 0 || g.indexOf('churn-risk') >= 0 || t.indexOf('Complaint') >= 0 || t.indexOf('Cancellation') >= 0))); }
  function qn(id) { return MCM.qById[id] ? MCM.qById[id].name : id; }
  function an(id) { return MCM.aById[id] ? MCM.aById[id].name : '-'; }
  function tText(c) { var t = tcache[c.id]; if (t == null) { try { t = MCM.drill.transcript(c).map(function (l) { return l.text; }).join(' ').toLowerCase(); } catch (e) { t = ''; } tcache[c.id] = t; } return t; }
  function callCols(extra) {
    var cols = [
      { k: 'ts', label: 'Time', html: function (c) { return '<b>' + T.dt(c.ts) + '</b>'; }, val: function (c) { return c.ts; } },
      { k: 'id', label: 'Call ID', html: function (c) { return '<span class="mono">' + c.id + '</span>'; }, val: function (c) { return c.id; } },
      { k: 'q', label: 'Queue', html: function (c) { return esc(qn(c.q)); }, val: function (c) { return qn(c.q); } },
      { k: 'ag', label: 'Agent', html: function (c) { return esc(an(c.agent)); }, val: function (c) { return an(c.agent); } },
      { k: 'tp', label: 'Topics', html: function (c) { return (c.topics || []).map(function (x) { return UI.tag(x, 'brand'); }).join(' ') || '<span class="faint">-</span>'; }, val: function (c) { return (c.topics || []).join(', '); } },
      { k: 'sent', label: 'Sentiment', r: 1, html: function (c) { return sentNum(c.sent); }, val: function (c) { return c.sent; } },
      { k: 'csat', label: 'CSAT', r: 1, html: function (c) { return c.csat || '-'; }, val: function (c) { return c.csat; } }
    ];
    return extra ? cols.concat(extra) : cols;
  }
  function callTable(host, id, rows, csv, sort, dir) {
    UI.table(host, { id: id, noun: 'calls', csv: csv, pageSize: 10, rows: rows, sort: sort || 'ts', dir: dir || 'desc', onRow: function (c) { MCM.drill.call(c.id); }, cols: callCols() });
  }

  /* ---------- moments (configurable rules) ---------- */
  function loadMoments() {
    var m = MCM.store.get('moments', null);
    if (!m) {
      m = [
        { id: 'm1', name: 'Competitor mention', kind: 'topic', match: 'Competitor mention', alert: false },
        { id: 'm2', name: 'Cancellation intent', kind: 'keyword', match: 'cancel, close my account', alert: true },
        { id: 'm3', name: 'Compliance miss', kind: 'tag', match: 'compliance', alert: true },
        { id: 'm4', name: 'Escalation request', kind: 'keyword', match: 'escalate, supervisor, manager', alert: false },
        { id: 'm5', name: 'Very negative caller', kind: 'sent', match: '-0.5', alert: false }
      ];
      MCM.store.set('moments', m);
    }
    return m;
  }
  function saveMoments(m) { MCM.store.set('moments', m); }
  function matches(m, c) {
    if (c.outcome !== 'answered') return false;
    if (m.kind === 'topic') return (c.topics || []).indexOf(m.match) >= 0;
    if (m.kind === 'tag') return (c.tags || []).indexOf(m.match) >= 0;
    if (m.kind === 'sent') return c.sent != null && c.sent <= parseFloat(m.match);
    if (m.kind === 'keyword') { var kws = String(m.match || '').toLowerCase().split(',').map(function (x) { return x.trim(); }).filter(Boolean); if (!kws.length) return false; var t = tText(c); return kws.some(function (k) { return t.indexOf(k) >= 0; }); }
    return false;
  }
  function ruleText(m) { return m.kind === 'topic' ? 'Topic is ' + m.match : m.kind === 'tag' ? 'Tag is ' + m.match : m.kind === 'sent' ? 'Sentiment at or below ' + m.match : 'Transcript contains: ' + m.match; }

  function momentModal(ctx, ex) {
    if (!(MCM.can('quality') || MCM.can('supervise'))) return MCM.deny('manage moments');
    var m = ex || { id: '', name: '', kind: 'topic', match: MCM.TOPICS[0], alert: false };
    function matchField(kind, val) {
      if (kind === 'topic') return '<select class="inp" data-fm>' + UI.opts(MCM.TOPICS, val) + '</select>';
      if (kind === 'tag') return '<select class="inp" data-fm>' + UI.opts(MCM.TAGS, val) + '</select>';
      if (kind === 'sent') return '<input class="inp" data-fm type="number" min="-1" max="1" step="0.05" value="' + esc(isNaN(parseFloat(val)) ? -0.5 : val) + '">';
      return '<input class="inp" data-fm placeholder="cancel, close my account" value="' + esc(val) + '">';
    }
    UI.modal({
      title: ex ? 'Edit moment' : 'New moment',
      body: '<div class="fg"><label>Label<input class="inp" data-fn placeholder="e.g. Competitor mention" value="' + esc(m.name) + '"></label><div class="fg c2"><label>Rule type<select class="inp" data-fk>' + UI.opts([['topic', 'Topic detected'], ['keyword', 'Keyword(s) in transcript'], ['tag', 'Call tag'], ['sent', 'Sentiment at or below']], m.kind) + '</select></label><label>Match<span data-fmw>' + matchField(m.kind, m.match) + '</span></label></div><label style="display:flex;gap:1rem;align-items:center">' + UI.sw(m.alert, 'data-fa') + ' Alert me when a matching call completes</label><div class="note">' + UI.icon('info') + '<span>Keyword rules search the (demo) transcript text. Alerts fire as in-app toasts while this page is open; e-mail or push delivery needs a backend.</span></div></div>',
      foot: [{ label: 'Cancel' }, {
        label: ex ? 'Save' : 'Create', pri: true, fn: function (mod) {
          var name = mod.querySelector('[data-fn]').value.trim(), kind = mod.querySelector('[data-fk]').value, match = mod.querySelector('[data-fm]').value.trim(), al = mod.querySelector('[data-fa]').classList.contains('on');
          if (!name) { UI.toast('Give the moment a label', { kind: 'bad' }); return false; }
          if (!match) { UI.toast('Enter what to match', { kind: 'bad' }); return false; }
          if (kind === 'sent' && (isNaN(parseFloat(match)) || parseFloat(match) < -1 || parseFloat(match) > 1)) { UI.toast('Sentiment must be between -1 and 1', { kind: 'bad' }); return false; }
          var all = loadMoments();
          if (ex) { var t = all.filter(function (x) { return x.id === ex.id; })[0]; if (t) { t.name = name; t.kind = kind; t.match = match; t.alert = al; } }
          else all.push({ id: 'm' + Date.now(), name: name, kind: kind, match: match, alert: al });
          saveMoments(all); MCM.audit(ex ? 'Moment edited' : 'Moment created', name); UI.toast('Moment saved', { kind: 'ok' }); ctx.refresh();
        }
      }],
      onOpen: function (mod) {
        mod.querySelector('[data-fk]').onchange = function (e) { mod.querySelector('[data-fmw]').innerHTML = matchField(e.target.value, e.target.value === 'sent' ? -0.5 : ''); };
        mod.querySelector('[data-fa]').onclick = function (e) { e.currentTarget.classList.toggle('on'); };
      }
    });
  }

  /* ---------- page ---------- */
  MCM.page({
    id: 'speech', title: 'Speech', icon: 'speech', filters: ['date', 'queue', 'team', 'channel'],
    tabs: [['sentiment', 'Sentiment'], ['topics', 'Topics'], ['moments', 'Moments'], ['summaries', 'Summaries']],
    render: function (ctx) {
      var R = ctx.R, tab = ctx.tab, all = ctx.q(), list = human(all), step = Math.max(3600000, MCM.stepFor(R));
      var lab = function (t) { return step >= T.day ? T.dm(t) : T.time(t); };
      var prevList = R.compare ? human(ctx.prev()) : null;
      var answered = all.filter(function (c) { return c.outcome === 'answered'; }).length;

      if (tab === 'sentiment') {
        var gs = MCM.agg(list), pg = prevList ? MCM.agg(prevList) : null;
        var pos = pctOf(list, function (c) { return c.sent > POS; }), neg = pctOf(list, function (c) { return c.sent < NEG; });
        var risk = list.filter(isRisk), ppos = prevList ? pctOf(prevList, function (c) { return c.sent > POS; }) : null, pneg = prevList ? pctOf(prevList, function (c) { return c.sent < NEG; }) : null;
        var bk = MCM.buckets(list, R.from, R.to, step);
        var pts = function (d) { return f.dec(d, 1) + ' pts'; };
        ctx.el.innerHTML = '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>Sentiment for calls handled by human agents (answered calls with a scored conversation). Positive is above ' + POS + ', negative is below ' + NEG + ' on a -1 to +1 scale. Escalation risk = very negative calls (-0.4 or lower) or negative calls tagged escalation, churn-risk, complaint or cancellation.</span></div>' +
          '<div class="grid g5">' + [
            UI.kpi({ label: 'Avg sentiment', value: f.dec(gs.sent, 2), status: gs.sent == null ? '' : gs.sent > POS ? 'ok' : gs.sent < NEG ? 'bad' : 'warn', delta: pg && UI.delta(gs.sent, pg.sent, { dec: 2 }), spark: bk.map(function (b) { return b.agg.sent || 0; }), color: 'var(--c3)' }),
            UI.kpi({ label: '% positive', value: f.pct(pos), status: 'ok', delta: prevList && UI.delta(pos, ppos, { dec: 1, fmt: pts }), sub: f.n(list.filter(function (c) { return c.sent > POS; }).length) + ' calls' }),
            UI.kpi({ label: '% negative', value: f.pct(neg), status: neg > 25 ? 'bad' : neg > 15 ? 'warn' : 'ok', delta: prevList && UI.delta(neg, pneg, { good: 'down', dec: 1, fmt: pts }), sub: f.n(list.filter(function (c) { return c.sent < NEG; }).length) + ' calls' }),
            UI.kpi({ label: 'CSAT', value: f.dec(gs.csat, 2), def: 'csat', delta: pg && UI.delta(gs.csat, pg.csat, { dec: 2 }), sub: f.pct(gs.csatPct, 0) + ' good (' + f.n(gs.csatN) + ' surveys)' }),
            UI.kpi({ label: 'Escalation-risk calls', value: f.n(risk.length), status: risk.length ? 'warn' : 'ok', delta: prevList && UI.delta(risk.length, prevList.filter(isRisk).length, { good: 'down' }), sub: f.pct(list.length ? risk.length / list.length * 100 : null) + ' of scored calls' })
          ].join('') + '</div>' +
          '<div class="grid g21 mt">' + UI.card('Sentiment trend', '<div id="s1"></div>', { sub: 'Average sentiment per interval (dashed line = neutral).' }) + UI.card('Distribution', '<div id="s2"></div>') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Sentiment by queue', '<div id="s3"></div>', { flush: true, sub: 'Click a row to open the queue.' }) + UI.card('Sentiment by agent', '<div id="s4"></div>', { flush: true, sub: 'Click a row to open the agent.' }) + '</div>' +
          '<div class="mt">' + UI.card('Most negative calls', '<div id="s5"></div>', { flush: true, sub: 'Click a call for the transcript, recording and summary.' }) + '</div>';
        UI.chart(document.getElementById('s1'), { type: 'line', labels: bk.map(function (b) { return lab(b.t); }), height: 24, min: -1, max: 1, legend: false, tipLabels: bk.map(function (b) { return T.dt(b.t); }), fmt: function (v) { return f.dec(v, 2); }, series: [{ name: 'Avg sentiment', data: bk.map(function (b) { return b.agg.sent == null ? null : +b.agg.sent.toFixed(3); }), color: 'var(--c2)' }, { name: 'Neutral', data: bk.map(function () { return 0; }), color: 'var(--faint)', dash: true }] });
        var edges = [-1, -.75, -.5, -.35, NEG, POS, .35, .5, .75, 1.0001], names = ['-1.0 to -0.75', '-0.75 to -0.5', '-0.5 to -0.35', '-0.35 to -0.15', '-0.15 to 0.15', '0.15 to 0.35', '0.35 to 0.5', '0.5 to 0.75', '0.75 to 1.0'];
        var hist = names.map(function (n, i) { return list.filter(function (c) { return c.sent >= edges[i] && c.sent < edges[i + 1]; }).length; });
        UI.chart(document.getElementById('s2'), { type: 'stack', labels: names.map(function (n, i) { return i + 1; }), tipLabels: names, height: 24, legend: true, series: [{ name: 'Negative', data: hist.map(function (v, i) { return i < 4 ? v : 0; }), color: 'var(--c5)' }, { name: 'Neutral', data: hist.map(function (v, i) { return i === 4 ? v : 0; }), color: 'var(--c4)' }, { name: 'Positive', data: hist.map(function (v, i) { return i > 4 ? v : 0; }), color: 'var(--c3)' }] });
        var byQ = MCM.groupBy(list, function (c) { return c.q; }), rowsQ = Object.keys(byQ).map(function (k) { var l = byQ[k]; return { id: k, n: l.length, s: avg(l, function (c) { return c.sent; }), pos: pctOf(l, function (c) { return c.sent > POS; }), neg: pctOf(l, function (c) { return c.sent < NEG; }), csat: avg(l, function (c) { return c.csat; }), risk: l.filter(isRisk).length }; });
        UI.table(document.getElementById('s3'), { id: 'sp-q', noun: 'queues', csv: 'sentiment-by-queue', pageSize: 10, search: false, rows: rowsQ, sort: 's', dir: 'asc', onRow: function (r) { MCM.drill.queue(r.id); }, cols: [
          { k: 'n', label: 'Queue', html: function (r) { return '<b>' + esc(qn(r.id)) + '</b>'; }, val: function (r) { return qn(r.id); } },
          { k: 'c', label: 'Calls', r: 1, html: function (r) { return f.n(r.n); }, val: function (r) { return r.n; } },
          { k: 's', label: 'Avg sent.', r: 1, html: function (r) { return sentNum(r.s); }, val: function (r) { return r.s; } },
          { k: 'p', label: '% pos', r: 1, html: function (r) { return f.pct(r.pos, 0); }, val: function (r) { return r.pos; } },
          { k: 'ng', label: '% neg', r: 1, html: function (r) { return '<span class="' + (r.neg > 25 ? 'bad-t' : '') + '">' + f.pct(r.neg, 0) + '</span>'; }, val: function (r) { return r.neg; } },
          { k: 'cs', label: 'CSAT', r: 1, html: function (r) { return f.dec(r.csat, 2); }, val: function (r) { return r.csat; } },
          { k: 'rk', label: 'At risk', r: 1, html: function (r) { return r.risk; }, val: function (r) { return r.risk; } }] });
        var byA = MCM.groupBy(list, function (c) { return c.agent; }), rowsA = Object.keys(byA).map(function (k) { var l = byA[k]; return { id: k, n: l.length, s: avg(l, function (c) { return c.sent; }), pos: pctOf(l, function (c) { return c.sent > POS; }), neg: pctOf(l, function (c) { return c.sent < NEG; }), csat: avg(l, function (c) { return c.csat; }), risk: l.filter(isRisk).length }; });
        UI.table(document.getElementById('s4'), { id: 'sp-a', noun: 'agents', csv: 'sentiment-by-agent', pageSize: 8, rows: rowsA, sort: 's', dir: 'asc', onRow: function (r) { MCM.drill.agent(r.id); }, cols: [
          { k: 'n', label: 'Agent', html: function (r) { return '<b>' + esc(an(r.id)) + '</b>'; }, val: function (r) { return an(r.id); } },
          { k: 'c', label: 'Calls', r: 1, html: function (r) { return f.n(r.n); }, val: function (r) { return r.n; } },
          { k: 's', label: 'Avg sent.', r: 1, html: function (r) { return sentNum(r.s); }, val: function (r) { return r.s; } },
          { k: 'p', label: '% pos', r: 1, html: function (r) { return f.pct(r.pos, 0); }, val: function (r) { return r.pos; } },
          { k: 'ng', label: '% neg', r: 1, html: function (r) { return '<span class="' + (r.neg > 25 ? 'bad-t' : '') + '">' + f.pct(r.neg, 0) + '</span>'; }, val: function (r) { return r.neg; } },
          { k: 'cs', label: 'CSAT', r: 1, html: function (r) { return f.dec(r.csat, 2); }, val: function (r) { return r.csat; } },
          { k: 'rk', label: 'At risk', r: 1, html: function (r) { return r.risk; }, val: function (r) { return r.risk; } }] });
        var neg15 = list.slice().sort(function (a, b) { return a.sent - b.sent; }).slice(0, 15);
        callTable(document.getElementById('s5'), 'sp-neg', neg15, 'most-negative-calls', 'sent', 'asc');
      }

      else if (tab === 'topics') {
        var tl = list.filter(function (c) { return c.topics && c.topics.length; }), bkT = MCM.buckets(tl, R.from, R.to, step);
        var rowsT = MCM.TOPICS.map(function (t) {
          var l = tl.filter(function (c) { return c.topics.indexOf(t) >= 0; }), series = bkT.map(function (b) { return b.list.filter(function (c) { return c.topics.indexOf(t) >= 0; }).length; });
          var half = Math.floor(series.length / 2), a = series.slice(0, half).reduce(function (x, y) { return x + y; }, 0), b2 = series.slice(half).reduce(function (x, y) { return x + y; }, 0);
          var prev = prevList ? prevList.filter(function (c) { return c.topics && c.topics.indexOf(t) >= 0; }).length : null;
          return { t: t, n: l.length, share: list.length ? l.length / list.length * 100 : 0, s: avg(l, function (c) { return c.sent; }), neg: pctOf(l, function (c) { return c.sent < NEG; }), series: series, chg: a ? (b2 - a) / a * 100 : (b2 ? 100 : 0), prev: prev };
        });
        var top5 = rowsT.slice().sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
        var pairs = {}; tl.forEach(function (c) { var u = c.topics.filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(); for (var i = 0; i < u.length; i++) for (var j = i + 1; j < u.length; j++) { var k = u[i] + '|' + u[j]; (pairs[k] = pairs[k] || []).push(c); } });
        var rowsP = Object.keys(pairs).map(function (k) { var p = k.split('|'); return { a: p[0], b: p[1], n: pairs[k].length, s: avg(pairs[k], function (c) { return c.sent; }), list: pairs[k] }; });
        var qsUsed = MCM.queues.filter(function (q) { return tl.some(function (c) { return c.q === q.id; }); });
        ctx.el.innerHTML = '<div class="grid g4">' + [
          UI.kpi({ label: 'Calls with a detected topic', value: f.n(tl.length), sub: f.pct(list.length ? tl.length / list.length * 100 : null, 0) + ' of scored calls', delta: prevList && UI.delta(tl.length, prevList.filter(function (c) { return c.topics && c.topics.length; }).length) }),
          UI.kpi({ label: 'Top topic', value: top5[0] && top5[0].n ? esc(top5[0].t) : '-', sub: top5[0] ? f.n(top5[0].n) + ' calls' : '' }),
          UI.kpi({ label: 'Most negative topic', value: (function () { var w = rowsT.filter(function (r) { return r.n >= 3 && r.s != null; }).sort(function (a, b) { return a.s - b.s; })[0]; return w ? esc(w.t) : '-'; })(), sub: (function () { var w = rowsT.filter(function (r) { return r.n >= 3 && r.s != null; }).sort(function (a, b) { return a.s - b.s; })[0]; return w ? 'avg sentiment ' + f.dec(w.s, 2) : ''; })() }),
          UI.kpi({ label: 'Multi-topic calls', value: f.n(tl.filter(function (c) { return c.topics.filter(function (x, i, a) { return a.indexOf(x) === i; }).length > 1; }).length), sub: 'calls touching two topics' })
        ].join('') + '</div>' +
          '<div class="grid g21 mt">' + UI.card('Topic volume trend', '<div id="t1"></div>', { sub: 'Top 5 topics in the selected range.' }) + UI.card('Topic share', '<div id="t2"></div>') + '</div>' +
          '<div class="mt">' + UI.card('Topics', '<div id="t3"></div>', { flush: true, sub: 'Click a topic to list its calls.' }) + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Topic x queue', '<div id="t4"></div>', { sub: 'Call counts. Darker = more calls.' }) + UI.card('Co-occurring topics', '<div id="t5"></div>', { flush: true, sub: 'Topics that appear together on the same call.' }) + '</div>' +
          '<div class="mt" id="t6"></div>';
        UI.chart(document.getElementById('t1'), { type: 'line', labels: bkT.map(function (b) { return lab(b.t); }), height: 22, tipLabels: bkT.map(function (b) { return T.dt(b.t); }), series: top5.map(function (r, i) { return { name: r.t, data: r.series, color: UI.PAL[i] }; }) });
        UI.donut(document.getElementById('t2'), { items: rowsT.filter(function (r) { return r.n; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8).map(function (r) { return { name: r.t, value: r.n }; }), center: { v: f.n(tl.length), l: 'topic calls' } });
        UI.table(document.getElementById('t3'), { id: 'sp-topics', noun: 'topics', csv: 'speech-topics', pageSize: 12, search: false, rows: rowsT, sort: 'n', onRow: function (r) { sel.topic = r.t; ctx.refresh(); }, cols: [
          { k: 't', label: 'Topic', html: function (r) { return '<b>' + esc(r.t) + '</b>' + (sel.topic === r.t ? ' ' + UI.tag('selected', 'brand') : ''); }, val: function (r) { return r.t; } },
          { k: 'n', label: 'Calls', r: 1, html: function (r) { return f.n(r.n); }, val: function (r) { return r.n; } },
          { k: 'sh', label: 'Share', r: 1, html: function (r) { return f.pct(r.share); }, val: function (r) { return r.share; } },
          { k: 's', label: 'Avg sentiment', r: 1, html: function (r) { return sentNum(r.s); }, val: function (r) { return r.s; } },
          { k: 'ng', label: '% negative', r: 1, html: function (r) { return f.pct(r.neg, 0); }, val: function (r) { return r.neg; } },
          { k: 'ch', label: 'Trend', r: 1, html: function (r) { return '<span class="' + (r.chg > 10 ? 'warn-t' : r.chg < -10 ? 'ok-t' : '') + '">' + (r.chg >= 0 ? '+' : '') + f.n(r.chg, 0) + '%</span>'; }, val: function (r) { return r.chg; } },
          { k: 'sp', label: 'Volume', noSort: 1, noCsv: 1, html: function (r) { return '<div style="width:12rem;height:2.4rem">' + UI.spark(r.series, 'var(--c2)') + '</div>'; } }
        ].concat(prevList ? [{ k: 'pv', label: 'Prev. period', r: 1, html: function (r) { return f.n(r.prev); }, val: function (r) { return r.prev; } }] : []) });
        UI.heat(document.getElementById('t4'), { rowLabels: MCM.TOPICS, colLabels: qsUsed.map(function (q) { return esc(q.name.replace(/^Inbound - /, '').slice(0, 9)); }), m: MCM.TOPICS.map(function (t) { return qsUsed.map(function (q) { return tl.filter(function (c) { return c.q === q.id && c.topics.indexOf(t) >= 0; }).length; }); }) });
        UI.table(document.getElementById('t5'), { id: 'sp-pairs', noun: 'pairs', csv: 'topic-cooccurrence', pageSize: 8, search: false, rows: rowsP, sort: 'n', onRow: function (r) { sel.topic = r.a; ctx.refresh(); }, cols: [
          { k: 'a', label: 'Topic A', html: function (r) { return esc(r.a); }, val: function (r) { return r.a; } },
          { k: 'b', label: 'Topic B', html: function (r) { return esc(r.b); }, val: function (r) { return r.b; } },
          { k: 'n', label: 'Calls', r: 1, html: function (r) { return r.n; }, val: function (r) { return r.n; } },
          { k: 's', label: 'Avg sentiment', r: 1, html: function (r) { return sentNum(r.s); }, val: function (r) { return r.s; } }], emptyTitle: 'No co-occurring topics', emptySub: 'No call in this range mentions two topics.' });
        if (sel.topic) {
          var mt = tl.filter(function (c) { return c.topics.indexOf(sel.topic) >= 0; });
          document.getElementById('t6').innerHTML = UI.card('Calls about ' + esc(sel.topic), '<div id="t7"></div>', { flush: true, acts: '<button class="btn sm" data-clrtopic>Clear</button>', sub: f.n(mt.length) + ' calls in range' });
          callTable(document.getElementById('t7'), 'sp-tcalls', mt, 'topic-calls');
        }
        ctx.on('[data-clrtopic]', function () { sel.topic = null; ctx.refresh(); });
      }

      else if (tab === 'moments') {
        var moments = loadMoments(), canEdit = MCM.can('quality') || MCM.can('supervise');
        var rowsM = moments.map(function (m) { var ml = list.filter(function (c) { return matches(m, c); }); return { m: m, list: ml, n: ml.length, s: avg(ml, function (c) { return c.sent; }), pct: list.length ? ml.length / list.length * 100 : 0, prev: prevList ? prevList.filter(function (c) { return matches(m, c); }).length : null }; });
        var tot = rowsM.reduce(function (s, r) { return s + r.n; }, 0);
        ctx.acts(canEdit ? '<button class="btn pri" data-mnew>' + UI.icon('plus') + 'New moment</button>' : '');
        ctx.el.innerHTML = '<div class="grid g4">' + [
          UI.kpi({ label: 'Moments defined', value: moments.length, sub: moments.filter(function (m) { return m.alert; }).length + ' with alerts on' }),
          UI.kpi({ label: 'Matches in range', value: f.n(tot), sub: 'across ' + f.n(list.length) + ' scored calls' }),
          UI.kpi({ label: 'Most frequent', value: (function () { var t = rowsM.slice().sort(function (a, b) { return b.n - a.n; })[0]; return t && t.n ? esc(t.m.name) : '-'; })(), sub: (function () { var t = rowsM.slice().sort(function (a, b) { return b.n - a.n; })[0]; return t && t.n ? f.n(t.n) + ' calls' : ''; })() }),
          UI.kpi({ label: 'Calls with any moment', value: f.n(list.filter(function (c) { return moments.some(function (m) { return matches(m, c); }); }).length), sub: 'unique calls' })
        ].join('') + '</div>' +
          (canEdit ? '' : '<div class="note warn mt">Your role (' + esc(MCM.user.role) + ') can view moments but not change them.</div>') +
          '<div class="mt">' + UI.card('Moments', '<div id="m1"></div>', { flush: true, sub: 'Rules that tag calls automatically. Click a row to see the matching calls.' }) + '</div><div class="mt" id="m2"></div>';
        UI.table(document.getElementById('m1'), { id: 'sp-moments', noun: 'moments', csv: 'speech-moments', pageSize: 12, search: false, rows: rowsM, sort: 'n', onRow: function (r) { sel.moment = r.m.id; ctx.refresh(); }, cols: [
          { k: 'n', label: 'Moment', html: function (r) { return '<b>' + esc(r.m.name) + '</b>' + (sel.moment === r.m.id ? ' ' + UI.tag('selected', 'brand') : ''); }, val: function (r) { return r.m.name; } },
          { k: 'r', label: 'Rule', html: function (r) { return '<span class="muted">' + esc(ruleText(r.m)) + '</span>'; }, val: function (r) { return ruleText(r.m); } },
          { k: 'c', label: 'Matches', r: 1, html: function (r) { return '<b>' + f.n(r.n) + '</b>'; }, val: function (r) { return r.n; } },
          { k: 'p', label: '% of calls', r: 1, html: function (r) { return f.pct(r.pct); }, val: function (r) { return r.pct; } },
          { k: 's', label: 'Avg sentiment', r: 1, html: function (r) { return sentNum(r.s); }, val: function (r) { return r.s; } },
          { k: 'al', label: 'Alert me', noSort: 1, html: function (r) { return UI.sw(r.m.alert, 'data-malert="' + r.m.id + '"' + (canEdit ? '' : ' disabled')); }, val: function (r) { return r.m.alert ? 'on' : 'off'; } },
          { k: 'ac', label: '', noSort: 1, noCsv: 1, html: function (r) { return canEdit ? '<button class="btn xs" data-medit="' + r.m.id + '">' + UI.icon('edit') + '</button> <button class="btn xs danger" data-mdel="' + r.m.id + '">' + UI.icon('trash') + '</button>' : ''; } }
        ].concat(prevList ? [{ k: 'pv', label: 'Prev. period', r: 1, html: function (r) { return f.n(r.prev); }, val: function (r) { return r.prev; } }] : []) });
        var cur = rowsM.filter(function (r) { return r.m.id === sel.moment; })[0];
        if (cur) { document.getElementById('m2').innerHTML = UI.card('Calls matching "' + esc(cur.m.name) + '"', '<div id="m3"></div>', { flush: true, sub: esc(ruleText(cur.m)) }); callTable(document.getElementById('m3'), 'sp-mcalls', cur.list, 'moment-calls'); }
        ctx.on('[data-mnew]', function () { momentModal(ctx, null); });
        ctx.on('[data-medit]', function (e, el) { e.stopPropagation(); var m = loadMoments().filter(function (x) { return x.id === el.dataset.medit; })[0]; if (m) momentModal(ctx, m); });
        ctx.on('[data-mdel]', function (e, el) {
          if (!canEdit) return MCM.deny('delete moments'); var m = loadMoments().filter(function (x) { return x.id === el.dataset.mdel; })[0]; if (!m) return;
          UI.confirm('Delete the moment "' + esc(m.name) + '"?', 'Delete').then(function (ok) { if (!ok) return; saveMoments(loadMoments().filter(function (x) { return x.id !== m.id; })); if (sel.moment === m.id) sel.moment = null; MCM.audit('Moment deleted', m.name); ctx.refresh(); });
        });
        ctx.on('[data-malert]', function (e, el) {
          if (!canEdit) return MCM.deny('change moment alerts'); var all2 = loadMoments(), m = all2.filter(function (x) { return x.id === el.dataset.malert; })[0]; if (!m) return;
          m.alert = !m.alert; saveMoments(all2); MCM.audit('Moment alert ' + (m.alert ? 'on' : 'off'), m.name); UI.toast(m.alert ? 'You will be alerted in-app when "' + esc(m.name) + '" is detected.' : 'Alert off for "' + esc(m.name) + '".', { kind: 'ok' }); ctx.refresh();
        });
        ctx.sub('calls', function (c) {
          if (!c || c.outcome !== 'answered') return;
          loadMoments().forEach(function (m) { if (m.alert && matches(m, c)) UI.toast('<b>Moment: ' + esc(m.name) + '</b> - call ' + esc(c.id) + ' (' + esc(qn(c.q)) + ')', { kind: 'bad', ms: 7000, action: { label: 'Open', fn: function () { MCM.drill.call(c.id); } } }); });
        });
      }

      else if (tab === 'summaries') {
        var rowsS = list.map(function (c) { return { c: c, s: MCM.drill.summary(c) }; });
        var topicsAvail = MCM.TOPICS;
        var fl = rowsS.filter(function (r) { return (sel.sf === 'all' || r.s.sentiment === sel.sf) && (sel.tf === 'all' || (sel.tf === '-' ? !(r.c.topics && r.c.topics.length) : (r.c.topics || []).indexOf(sel.tf) >= 0)); });
        var acts = {}; fl.forEach(function (r) { r.s.actions.forEach(function (a) { acts[a] = (acts[a] || 0) + 1; }); });
        var actRows = Object.keys(acts).map(function (a) { return { label: a, value: acts[a] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
        var follow = fl.filter(function (r) { return !r.c.fcr; }).length;
        ctx.el.innerHTML = '<div class="note warn" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>' + UI.preview() + ' Summaries and action items are generated demo text (rule-based from call data) until an AI summarisation service is connected. They are not produced from real audio.</span></div>' +
          '<div class="grid g4">' + [
            UI.kpi({ label: 'Summarised calls', value: f.n(fl.length), sub: 'of ' + f.n(answered) + ' answered' }),
            UI.kpi({ label: 'Need follow-up', value: f.n(follow), sub: f.pct(fl.length ? follow / fl.length * 100 : null, 0) + ' of summaries', status: follow ? 'warn' : 'ok' }),
            UI.kpi({ label: 'Action items', value: f.n(fl.reduce(function (s, r) { return s + r.s.actions.length; }, 0)) }),
            UI.kpi({ label: 'Negative summaries', value: f.n(fl.filter(function (r) { return r.s.sentiment === 'negative'; }).length) })
          ].join('') + '</div>' +
          '<div class="grid g21 mt">' + UI.card('AI call summaries', '<div id="u1"></div>', { flush: true, acts: '<select class="inp sm" data-sf>' + UI.opts([['all', 'All sentiment'], ['positive', 'Positive'], ['neutral', 'Neutral'], ['negative', 'Negative']], sel.sf) + '</select><select class="inp sm" data-tf>' + UI.opts([['all', 'All topics'], ['-', 'No topic']].concat(topicsAvail.map(function (t) { return [t, t]; })), sel.tf) + '</select>' }) +
          UI.card('Action items', '<div id="u2"></div>', { sub: 'Aggregated across the filtered summaries.' }) + '</div>';
        UI.table(document.getElementById('u1'), { id: 'sp-sum', noun: 'summaries', csv: 'call-summaries', pageSize: 10, rows: fl, sort: 'ts', onRow: function (r) { MCM.drill.call(r.c.id); }, cols: [
          { k: 'ts', label: 'Time', html: function (r) { return '<b>' + T.dt(r.c.ts) + '</b><br><span class="mono muted">' + r.c.id + '</span>'; }, val: function (r) { return r.c.ts; }, csv: function (r) { return T.dt(r.c.ts) + ' ' + r.c.id; } },
          { k: 'q', label: 'Queue / agent', html: function (r) { return esc(qn(r.c.q)) + '<br><span class="muted">' + esc(an(r.c.agent)) + '</span>'; }, val: function (r) { return qn(r.c.q) + ' ' + an(r.c.agent); } },
          { k: 'sm', label: 'Summary', html: function (r) { return '<div style="white-space:normal;min-width:30rem;max-width:56rem">' + esc(r.s.text) + (r.c.topics && r.c.topics.length ? '<div style="margin-top:.4rem">' + r.c.topics.map(function (x) { return UI.tag(x, 'brand'); }).join(' ') + '</div>' : '') + '</div>'; }, val: function (r) { return r.s.text; } },
          { k: 'ac', label: 'Action items', html: function (r) { return '<div style="white-space:normal;min-width:18rem">' + r.s.actions.map(esc).join('<br>') + '</div>'; }, val: function (r) { return r.s.actions.join('; '); } },
          { k: 'se', label: 'Sentiment', r: 1, html: function (r) { return sentTag(r.c.sent); }, val: function (r) { return r.c.sent; } }
        ] });
        document.getElementById('u2').innerHTML = actRows.length ? UI.hbars(actRows) : UI.empty('No action items', 'No summaries match the filters.');
        ctx.el.addEventListener('change', function (e) {
          if (e.target.matches('[data-sf]')) { sel.sf = e.target.value; ctx.refresh(); }
          else if (e.target.matches('[data-tf]')) { sel.tf = e.target.value; ctx.refresh(); }
        });
      }
    }
  });
})();
