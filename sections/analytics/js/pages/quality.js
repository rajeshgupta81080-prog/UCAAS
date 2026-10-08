/* Quality - overview, evaluations (forms, auto-grade, disputes), scorecard builder, calibration, CSAT/NPS surveys, agent QA history. */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc;
  var qf = { status: 'all', agent: 'all', evaluator: 'all', mode: 'all' };
  var calib = { call: null, sc: null };
  var ansCache = {}, cidx = null;

  /* ---------- helpers ---------- */
  function hash(s) { var h = 7; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function an(id) { return MCM.aById[id] ? MCM.aById[id].name : '-'; }
  function qn(id) { return MCM.qById[id] ? MCM.qById[id].name : id; }
  function avg(l, fn) { var n = 0, s = 0; l.forEach(function (x) { var v = fn(x); if (v != null) { n++; s += v; } }); return n ? s / n : null; }
  function callMap() { if (!cidx || cidx.n !== MCM.calls.length) { var m = {}; MCM.calls.forEach(function (c) { m[c.id] = c; }); cidx = { n: MCM.calls.length, m: m }; } return cidx.m; }
  function reviewers() { return MCM.agents.filter(function (a) { return ['Admin', 'Supervisor', 'Coach'].indexOf(a.role) >= 0; }); }
  function scById(id) { return MCM.scorecards.filter(function (s) { return s.id === id; })[0]; }
  function scOf(ev) { return scById(ev.scorecard) || MCM.scorecards[0]; }
  function defaultSc(c) { var act = MCM.scorecards.filter(function (s) { return s.active; }), want = c && c.ch === 'chat' ? 'sc2' : 'sc1'; return act.filter(function (s) { return s.id === want; })[0] || act[0] || null; }
  function questionsOf(sc) { var out = []; sc.sections.forEach(function (s, si) { s.questions.forEach(function (q, qi) { out.push({ t: q.t, w: +q.w || 0, critical: !!q.critical, sec: s.name, si: si, qi: qi }); }); }); return out; }
  function evalCall(ev) { var c = callMap()[ev.call]; return c && c.agent === ev.agent ? c : null; }
  function evTs(ev) { var c = evalCall(ev); return c ? c.ts : ev.ts; }
  function passed(ev) { var sc = scOf(ev); return !ev.critFail && ev.score >= (sc ? sc.passMark : 80); }
  function scoreCls(ev) { var sc = scOf(ev), pm = sc ? sc.passMark : 80; return ev.critFail ? 'bad-t' : ev.score >= pm ? 'ok-t' : ev.score >= pm - 10 ? 'warn-t' : 'bad-t'; }
  function statusTag(s) { return UI.tag(s, s === 'final' ? 'ok' : s === 'disputed' ? 'bad' : 'warn'); }

  /* score from answers: ans[i] = {v: 0..1 | null (N/A)}; critical question with v === 0 => auto-fail */
  function scoreOf(qs, ans) {
    var tw = 0, got = 0, crit = false;
    qs.forEach(function (q, i) { var a = ans[i]; if (!a || a.v == null) return; tw += q.w; got += q.w * a.v; if (q.critical && a.v === 0) crit = true; });
    var s = tw ? got / tw * 100 : 100; if (crit) s = 0;
    return { score: Math.round(s), crit: crit };
  }
  /* deterministic per-question answers that add up to a given score */
  function genAnswers(seed, sc, score, critFail) {
    var qs = questionsOf(sc), r = MCM.rng(hash(seed)), tw = qs.reduce(function (s, q) { return s + q.w; }, 0) || 1, ans = qs.map(function () { return { v: 1 }; });
    var deficit = (100 - score) / 100 * tw, keys = qs.map(function () { return r(); }), order = qs.map(function (q, i) { return i; }).sort(function (a, b) { return keys[a] - keys[b]; });
    if (critFail) { var cr = order.filter(function (i) { return qs[i].critical; })[0]; if (cr != null) { ans[cr].v = 0; deficit -= qs[cr].w; } }
    order.forEach(function (i) { if (deficit <= 0.01 || qs[i].critical || qs[i].w <= 0) return; var w = qs[i].w; if (w <= deficit + 2) { ans[i].v = 0; deficit -= w; } else { ans[i].v = Math.round((1 - deficit / w) * 2) / 2; deficit = 0; } });
    return ans;
  }
  function answersOf(ev) {
    if (ev.answers && ev.answers.length) return ev.answers;
    var key = ev.id + ':' + ev.scorecard + ':' + ev.score + ':' + (ev.critFail ? 1 : 0); if (!ansCache[key]) ansCache[key] = genAnswers(ev.id, scOf(ev), ev.score, ev.critFail);
    return ansCache[key];
  }

  /* backfill: every QA-scored call gets an evaluation record so counts reconcile with the Agents/Queues pages */
  (function backfill() {
    try {
      var cm = callMap(), have = {}, rev = reviewers(), cap = MCM.now0 || Date.now();
      MCM.evals.forEach(function (e) { var c = cm[e.call]; if (c && c.agent === e.agent) { have[e.call] = 1; if (c.qa == null) c.qa = e.score; } });
      MCM.calls.forEach(function (c) {
        if (c.qa == null || have[c.id] || !c.agent) return; var h = hash(c.id);
        MCM.evals.push({ id: 'evb' + c.id, call: c.id, agent: c.agent, ts: Math.min(c.ts + 5 * 3600000, cap), scorecard: c.ch === 'chat' ? 'sc2' : 'sc1', score: c.qa, evaluator: rev[h % rev.length].id, mode: h % 100 < 35 ? 'auto' : 'manual', status: h % 41 === 1 ? 'disputed' : h % 23 === 2 ? 'calibration' : 'final', critFail: c.qa < 55, comment: '' });
      });
      MCM.evals.sort(function (a, b) { return a.ts - b.ts; });
    } catch (e) { console.error(e); }
  })();

  function inScope(ev) {
    var F = MCM.F, c = evalCall(ev);
    if (F.queues.length && (!c || F.queues.indexOf(c.q) < 0)) return false;
    if (F.teams.length) { var a = MCM.aById[ev.agent]; if (!a || F.teams.indexOf(a.team) < 0) return false; }
    return true;
  }
  function evalsIn(from, to) { return MCM.evals.filter(function (ev) { var ts = evTs(ev); return ts >= from && ts < to && inScope(ev); }); }
  function summary(evs) {
    var n = evs.length, pass = evs.filter(passed).length;
    return { n: n, avg: avg(evs, function (e) { return e.score; }), pass: n ? pass / n * 100 : null, crit: evs.filter(function (e) { return e.critFail; }).length, disputed: evs.filter(function (e) { return e.status === 'disputed'; }).length };
  }
  function qaCls(v) { var g = MCM.goals.qa; return v == null ? '' : v >= g ? 'ok-t' : v >= g - 5 ? 'warn-t' : 'bad-t'; }
  function qaNum(v) { return v == null ? '<span class="faint">-</span>' : '<span class="' + qaCls(v) + '">' + f.dec(v, 1) + '</span>'; }

  /* ---------- evaluation detail drawer ---------- */
  function openEval(ctx, ev) {
    var c = evalCall(ev), sc = scOf(ev), qs = questionsOf(sc), ans = answersOf(ev), rs = scoreOf(qs, ans), ok = passed(ev), lastSec = null;
    var rows = qs.map(function (q, i) {
      var a = ans[i] || { v: null }, tag = a.v == null ? UI.tag('N/A') : a.v === 1 ? UI.tag('Pass', 'ok') : a.v === 0 ? UI.tag('Fail', 'bad') : UI.tag('Partial ' + Math.round(a.v * 100) + '%', 'warn'), h = '';
      if (q.sec !== lastSec) { h += '<tr><td colspan="4" style="background:var(--surface2);font-weight:700">' + esc(q.sec) + '</td></tr>'; lastSec = q.sec; }
      return h + '<tr><td style="white-space:normal">' + esc(q.t) + (q.critical ? ' ' + UI.tag('critical', 'bad') : '') + '</td><td class="r">' + q.w + '</td><td>' + tag + '</td><td class="r">' + (a.v == null ? '-' : f.dec(q.w * a.v, 1)) + '</td></tr>';
    }).join('');
    var html = '<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1.4rem">' + statusTag(ev.status) + UI.tag(ev.mode === 'auto' ? 'AI auto-graded (demo)' : 'Manual', ev.mode === 'auto' ? 'info' : 'brand') + UI.tag(sc ? sc.name : '-') + (ev.critFail ? UI.tag('Critical fail', 'bad') : '') + '</div>' +
      '<div class="grid g3">' + UI.kpi({ label: 'Score', value: ev.score, unit: '/100', status: ok ? 'ok' : 'bad' }) + UI.kpi({ label: 'Pass mark', value: sc ? sc.passMark : '-', sub: ok ? 'Passed' : 'Below pass mark' }) + UI.kpi({ label: 'Weighted check', value: rs.score, sub: 'recomputed from answers' }) + '</div>' +
      '<div class="grid g2 mt"><dl class="kv"><dt>Evaluation</dt><dd class="mono">' + esc(ev.id) + '</dd><dt>Call</dt><dd>' + (c ? '<a href="#" data-call="' + c.id + '">' + c.id + '</a> - ' + T.dt(c.ts) : esc(ev.call) + ' (outside demo window)') + '</dd><dt>Agent</dt><dd><a href="#" data-ag="' + ev.agent + '">' + esc(an(ev.agent)) + '</a></dd><dt>Queue</dt><dd>' + (c ? esc(qn(c.q)) : '-') + '</dd></dl>' +
      '<dl class="kv"><dt>Evaluator</dt><dd>' + esc(an(ev.evaluator)) + '</dd><dt>Evaluated</dt><dd>' + T.dt(ev.ts) + '</dd><dt>CSAT</dt><dd>' + (c && c.csat ? c.csat : '-') + '</dd><dt>Sentiment</dt><dd>' + (c && c.sent != null ? f.dec(c.sent, 2) : '-') + '</dd></dl></div>' +
      (ev.comment ? '<h3 class="mt" style="margin-bottom:.6rem">Evaluator comment</h3><div class="note">' + esc(ev.comment) + '</div>' : '') +
      (ev.dispute ? '<h3 class="mt" style="margin-bottom:.6rem">Dispute</h3><div class="note warn"><span><b>' + esc(an(ev.dispute.by)) + '</b> on ' + T.dt(ev.dispute.ts) + ': ' + esc(ev.dispute.reason) + '</span></div>' : '') +
      (ev.resolution ? '<h3 class="mt" style="margin-bottom:.6rem">Resolution</h3><div class="note ok"><span><b>' + esc(an(ev.resolution.by)) + '</b> (' + esc(ev.resolution.outcome) + (ev.resolution.from != null && ev.resolution.from !== ev.score ? ', ' + ev.resolution.from + ' to ' + ev.score : '') + '): ' + esc(ev.resolution.note || '') + '</span></div>' : '') +
      '<h3 class="mt" style="margin-bottom:.8rem">Scorecard answers</h3>' + (ev.answers && ev.answers.length ? '' : '<div class="muted" style="margin-bottom:.6rem">Per-question breakdown reconstructed from the total score (demo).</div>') + '<div class="tw"><table class="t"><thead><tr><th>Question</th><th class="r">Weight</th><th>Result</th><th class="r">Points</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div style="display:flex;gap:.8rem;margin-top:2rem;flex-wrap:wrap">' + (ev.status !== 'disputed' ? '<button class="btn" data-disp>Dispute this score</button>' : '') + (ev.status === 'disputed' ? '<button class="btn pri" data-resolve>Resolve dispute</button>' : '') + (c ? '<button class="btn" data-call="' + c.id + '">Open call</button>' : '') + '</div>';
    var body = UI.drawer('Evaluation ' + esc(ev.id), html, { sub: esc(an(ev.agent)) + ' - score ' + ev.score });
    MCM.audit('View evaluation', ev.id);
    body.onclick = function (e) {
      var t = e.target, el;
      if ((el = t.closest('[data-call]'))) { e.preventDefault(); MCM.drill.call(el.dataset.call); }
      else if ((el = t.closest('[data-ag]'))) { e.preventDefault(); MCM.drill.agent(el.dataset.ag); }
      else if (t.closest('[data-disp]')) disputeModal(ctx, ev);
      else if (t.closest('[data-resolve]')) resolveModal(ctx, ev);
    };
  }
  function disputeModal(ctx, ev) {
    UI.modal({ title: 'Dispute evaluation ' + esc(ev.id), body: '<div class="fg"><div class="note">' + UI.icon('info') + '<span>The evaluator will be asked to review. The score stays as is until the dispute is resolved.</span></div><label>Reason<textarea class="inp" data-r rows="4" placeholder="Explain why the score should be reviewed..."></textarea></label></div>', foot: [{ label: 'Cancel' }, {
      label: 'Submit dispute', pri: true, fn: function (m) {
        var r = m.querySelector('[data-r]').value.trim(); if (r.length < 5) { UI.toast('Please give a reason (at least 5 characters)', { kind: 'bad' }); return false; }
        ev.status = 'disputed'; ev.dispute = { by: MCM.user.id, reason: r, ts: Date.now() }; MCM.saveEvals(); MCM.audit('Evaluation disputed', ev.id + ': ' + r.slice(0, 80)); UI.toast('Dispute submitted', { kind: 'ok' }); ctx.refresh(); openEval(ctx, ev);
      }
    }] });
  }
  function resolveModal(ctx, ev) {
    if (!MCM.can('quality')) return MCM.deny('resolve disputes');
    UI.modal({ title: 'Resolve dispute ' + esc(ev.id), body: '<div class="fg"><div class="note warn"><span><b>' + esc(an(ev.dispute ? ev.dispute.by : '')) + ':</b> ' + esc(ev.dispute ? ev.dispute.reason : '') + '</span></div><div class="fg c2"><label>Outcome<select class="inp" data-o>' + UI.opts([['uphold', 'Uphold the original score'], ['adjust', 'Re-score']], 'uphold') + '</select></label><label>Score (0-100)<input class="inp" type="number" min="0" max="100" data-s value="' + ev.score + '"></label></div><label>Resolution note<textarea class="inp" data-n rows="3"></textarea></label></div>', foot: [{ label: 'Cancel' }, {
      label: 'Resolve', pri: true, fn: function (m) {
        var o = m.querySelector('[data-o]').value, ns = Math.round(+m.querySelector('[data-s]').value), note = m.querySelector('[data-n]').value.trim();
        if (o === 'adjust' && (isNaN(ns) || ns < 0 || ns > 100)) { UI.toast('Score must be 0-100', { kind: 'bad' }); return false; }
        var from = ev.score; if (o === 'adjust') { ev.score = ns; ev.answers = null; ev.critFail = ev.critFail && ns < 55; var c = evalCall(ev); if (c) c.qa = ns; }
        ev.status = 'final'; ev.resolution = { by: MCM.user.id, ts: Date.now(), outcome: o === 'adjust' ? 're-scored' : 'upheld', from: from, note: note }; MCM.saveEvals(); MCM.audit('Dispute resolved', ev.id + ' ' + ev.resolution.outcome); UI.toast('Dispute resolved', { kind: 'ok' }); ctx.refresh(); openEval(ctx, ev);
      }
    }] });
  }

  /* ---------- new evaluation modal ---------- */
  function evalModal(ctx, callId) {
    if (!MCM.can('quality')) return MCM.deny('evaluate calls');
    var cm = callMap(), pre = callId ? cm[callId] : null;
    if (pre && pre.qa != null) { var ex = MCM.evals.filter(function (e) { return e.call === pre.id; })[0]; UI.toast('Call ' + pre.id + ' has already been evaluated (score ' + pre.qa + ').', {}); if (ex) openEval(ctx, ex); return; }
    var pool = ctx.q().filter(function (c) { return c.outcome === 'answered' && c.qa == null; }).slice(-80).reverse();
    if (pre && pre.outcome === 'answered' && !pool.some(function (c) { return c.id === pre.id; })) pool.unshift(pre);
    if (!pool.length) { UI.toast('No unevaluated answered calls in this range.', {}); return; }
    var scs = MCM.scorecards.filter(function (s) { return s.active; });
    if (!scs.length) { UI.toast('No active scorecard. Create or activate one under Scorecards.', { kind: 'bad' }); return; }
    var first = pre && pool[0].id === pre.id ? pre : pool[0], cur = { c: first, sc: defaultSc(first) };
    function qHtml(sc) {
      var lastSec = null, h = '';
      questionsOf(sc).forEach(function (q, i) {
        if (q.sec !== lastSec) { h += '<div style="font-weight:700;margin:1.2rem 0 .4rem">' + esc(q.sec) + '</div>'; lastSec = q.sec; }
        var partial = !q.critical && q.w > 0;
        h += '<div data-qrow="' + i + '" style="display:grid;grid-template-columns:1fr 13rem;gap:.8rem;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--line2)"><div>' + esc(q.t) + ' <span class="muted">' + q.w + ' pts</span>' + (q.critical ? ' ' + UI.tag('critical', 'bad') : '') + '</div><div><select class="inp sm" data-qa="' + i + '" style="width:100%"><option value="p">Pass</option>' + (partial ? '<option value="h">Partial</option>' : '') + '<option value="f">Fail</option><option value="n">N/A</option></select><div data-qhw="' + i + '" style="display:none;margin-top:.4rem"><input type="range" data-qr="' + i + '" min="0" max="' + q.w + '" value="' + Math.round(q.w / 2) + '" style="width:100%"><span class="muted" data-qro="' + i + '"></span></div></div></div>';
      });
      return h;
    }
    function callInfo(c) { var sm = MCM.drill.summary(c); return '<div class="note"><span><b>' + c.id + '</b> - ' + T.dt(c.ts) + ' - ' + esc(qn(c.q)) + ' - ' + esc(an(c.agent)) + ' - sentiment ' + f.dec(c.sent, 2) + (c.csat ? ' - CSAT ' + c.csat : '') + '<br>' + esc(sm.text) + '</span></div>'; }
    function read(m) { var qs = questionsOf(cur.sc); return qs.map(function (q, i) { var v = m.querySelector('[data-qa="' + i + '"]').value; if (v === 'p') return { v: 1 }; if (v === 'f') return { v: 0 }; if (v === 'n') return { v: null }; return { v: q.w ? +m.querySelector('[data-qr="' + i + '"]').value / q.w : 0 }; }); }
    function preview(m) {
      var qs = questionsOf(cur.sc), ans = read(m), r = scoreOf(qs, ans), pm = cur.sc.passMark, ok = !r.crit && r.score >= pm;
      qs.forEach(function (q, i) { var h = m.querySelector('[data-qhw="' + i + '"]'), v = m.querySelector('[data-qa="' + i + '"]').value; if (h) { h.style.display = v === 'h' ? '' : 'none'; var o = m.querySelector('[data-qro="' + i + '"]'); if (o) o.textContent = ' ' + m.querySelector('[data-qr="' + i + '"]').value + ' of ' + q.w; } });
      m.querySelector('[data-prev]').innerHTML = '<b style="font-size:2rem" class="' + (ok ? 'ok-t' : 'bad-t') + '">' + r.score + '</b> / 100 ' + UI.tag(ok ? 'Pass' : 'Fail', ok ? 'ok' : 'bad') + (r.crit ? ' ' + UI.tag('Critical question failed: automatic fail', 'bad') : '') + ' <span class="muted">pass mark ' + pm + '</span>';
    }
    UI.modal({
      title: 'New evaluation', body: '<div class="fg"><div class="fg c2"><label>Call (answered, not yet evaluated)<select class="inp" data-call>' + pool.map(function (c) { return '<option value="' + c.id + '"' + (c.id === first.id ? ' selected' : '') + '>' + c.id + ' - ' + T.dt(c.ts) + ' - ' + esc(an(c.agent)) + '</option>'; }).join('') + '</select></label><label>Scorecard<select class="inp" data-sc>' + UI.opts(scs.map(function (s) { return [s.id, s.name + ' (pass ' + s.passMark + ')']; }), cur.sc ? cur.sc.id : '') + '</select></label></div><div data-info>' + callInfo(first) + '</div><div data-qs>' + qHtml(cur.sc) + '</div><label>Comment<textarea class="inp" data-cm rows="3" placeholder="Feedback for the agent..."></textarea></label><div data-prev style="padding:1rem 0"></div></div>',
      foot: [{ label: 'Cancel' }, {
        label: 'Save evaluation', pri: true, fn: function (m) {
          if (!MCM.can('quality')) return MCM.deny('evaluate calls');
          var qs = questionsOf(cur.sc), ans = read(m); if (!ans.some(function (a) { return a.v != null; })) { UI.toast('Answer at least one question', { kind: 'bad' }); return false; }
          var r = scoreOf(qs, ans), c = cur.c, ev = { id: 'ev' + Date.now(), call: c.id, agent: c.agent, ts: Date.now(), scorecard: cur.sc.id, score: r.score, evaluator: MCM.user.id, mode: 'manual', status: 'final', critFail: r.crit, comment: m.querySelector('[data-cm]').value.trim(), answers: ans };
          MCM.evals.push(ev); c.qa = r.score; MCM.saveEvals(); MCM.audit('Evaluation created', c.id + ' score ' + r.score + (r.crit ? ' (critical fail)' : '')); UI.toast('Evaluation saved: ' + r.score + ' / 100', { kind: 'ok' }); ctx.refresh();
        }
      }],
      onOpen: function (m) {
        m.addEventListener('change', function (e) {
          if (e.target.matches('[data-call]')) { cur.c = callMap()[e.target.value]; m.querySelector('[data-info]').innerHTML = callInfo(cur.c); }
          if (e.target.matches('[data-sc]')) { cur.sc = scById(e.target.value); m.querySelector('[data-qs]').innerHTML = qHtml(cur.sc); }
          if (e.target.matches('[data-qa]') && e.target.value === 'h') { var i = e.target.dataset.qa; var rg = m.querySelector('[data-qr="' + i + '"]'); if (rg) rg.value = Math.round(rg.max / 2); }
          preview(m);
        });
        m.addEventListener('input', function (e) { if (e.target.matches('[data-qr]')) preview(m); });
        preview(m);
      }
    });
  }
  function autoGrade(ctx) {
    if (!MCM.can('quality')) return MCM.deny('run auto-grading');
    var pool = ctx.q().filter(function (c) { return c.outcome === 'answered' && c.qa == null && defaultSc(c); }).slice(-5);
    if (!pool.length) { UI.toast('No unevaluated answered calls in this range.', {}); return; }
    UI.confirm('Auto-grade ' + pool.length + ' unevaluated calls with the AI grader? ' + UI.preview() + '<br><span class="muted">Demo only: scores are generated from agent history and call sentiment, not from a real speech/AI model. The results are saved as AI auto-graded evaluations.</span>', 'Run auto-grade').then(function (ok) {
      if (!ok) return;
      pool.forEach(function (c, i) {
        var a = MCM.aById[c.agent], sc = defaultSc(c), r = MCM.rng(hash(c.id)), base = a.qaBase + (c.sent || 0) * 8 + (r() - .5) * 14, target = clamp(Math.round(base), 40, 100), crit = target < 55;
        var ans = genAnswers(c.id + 'auto', sc, target, crit), res = scoreOf(questionsOf(sc), ans);
        MCM.evals.push({ id: 'ev' + Date.now() + '-' + i, call: c.id, agent: c.agent, ts: Date.now(), scorecard: sc.id, score: res.score, evaluator: MCM.user.id, mode: 'auto', status: 'final', critFail: res.crit, comment: 'Auto-graded by the demo AI grader.', answers: ans });
        c.qa = res.score;
      });
      MCM.saveEvals(); MCM.audit('Auto-grade (AI demo)', pool.length + ' calls'); UI.toast('Auto-graded ' + pool.length + ' calls (demo)', { kind: 'ok' }); ctx.refresh();
    });
  }

  /* ---------- scorecard builder ---------- */
  function builder(ctx, ex) {
    if (!MCM.can('quality')) return MCM.deny('edit scorecards');
    var d = ex ? JSON.parse(JSON.stringify(ex)) : { name: '', passMark: 80, active: true, sections: [{ name: 'Section 1', questions: [{ t: '', w: 100, critical: false }] }] };
    var host;
    function total() { return d.sections.reduce(function (s, x) { return s + x.questions.reduce(function (a, q) { return a + (+q.w || 0); }, 0); }, 0); }
    function sync() {
      var g = function (s) { return host.querySelector(s); };
      d.name = g('[data-sn]').value; d.passMark = +g('[data-sp]').value; d.active = g('[data-sa]').classList.contains('on');
      d.sections.forEach(function (s, si) { s.name = g('[data-sec="' + si + '"]').value; s.questions.forEach(function (q, qi) { var k = si + ',' + qi; q.t = g('[data-qt="' + k + '"]').value; q.w = +g('[data-qw="' + k + '"]').value || 0; q.critical = g('[data-qc="' + k + '"]').checked; }); });
    }
    function tot() { var t = total(); return '<span class="' + (t === 100 ? 'ok-t' : 'bad-t') + '"><b>Total weight: ' + t + ' / 100</b></span>' + (t === 100 ? '' : ' <span class="muted">must equal 100</span>'); }
    function paint() {
      host.innerHTML = '<div class="fg c2"><label>Scorecard name<input class="inp" data-sn value="' + esc(d.name) + '"></label><label>Pass mark (%)<input class="inp" type="number" min="1" max="100" data-sp value="' + esc(d.passMark) + '"></label></div><label style="display:flex;gap:1rem;align-items:center;margin-top:1rem">' + UI.sw(d.active, 'data-sa') + ' Active (available for new evaluations)</label>' +
        d.sections.map(function (s, si) {
          return '<div class="card mt" style="padding:1.2rem"><div style="display:flex;gap:.6rem"><input class="inp" style="flex:1" data-sec="' + si + '" value="' + esc(s.name) + '" placeholder="Section name"><button class="btn xs danger" data-secdel="' + si + '" title="Remove section">' + UI.icon('trash') + '</button></div>' +
            s.questions.map(function (q, qi) { var k = si + ',' + qi; return '<div style="display:grid;grid-template-columns:1fr 8rem auto auto;gap:.6rem;margin-top:.6rem;align-items:center"><input class="inp sm" data-qt="' + k + '" value="' + esc(q.t) + '" placeholder="Question"><input class="inp sm" type="number" min="0" max="100" data-qw="' + k + '" value="' + esc(q.w) + '" title="Weight"><label style="display:flex;gap:.4rem;align-items:center;font-size:1.1rem"><input type="checkbox" data-qc="' + k + '"' + (q.critical ? ' checked' : '') + '> Critical</label><button class="btn xs danger" data-qdel="' + k + '" title="Remove question">' + UI.icon('x') + '</button></div>'; }).join('') +
            '<div style="margin-top:.8rem"><button class="btn xs" data-qadd="' + si + '">' + UI.icon('plus') + 'Question</button></div></div>';
        }).join('') + '<div style="display:flex;gap:.8rem;margin-top:1.2rem;align-items:center;flex-wrap:wrap"><button class="btn sm" data-secadd>' + UI.icon('plus') + 'Section</button><button class="btn sm" data-norm>Scale weights to 100</button><span data-tot>' + tot() + '</span></div><div class="muted" style="margin-top:.6rem;font-size:1.05rem">A critical question that is failed makes the whole evaluation an automatic fail.</div>';
    }
    UI.modal({
      title: ex ? 'Edit scorecard' : 'New scorecard', body: '<div data-bld></div>',
      foot: [{ label: 'Cancel' }, {
        label: 'Save scorecard', pri: true, fn: function () {
          sync(); var nq = d.sections.reduce(function (s, x) { return s + x.questions.length; }, 0);
          if (!d.name.trim()) { UI.toast('Name the scorecard', { kind: 'bad' }); return false; }
          if (!(d.passMark >= 1 && d.passMark <= 100)) { UI.toast('Pass mark must be 1-100', { kind: 'bad' }); return false; }
          if (!nq) { UI.toast('Add at least one question', { kind: 'bad' }); return false; }
          if (d.sections.some(function (s) { return !s.name.trim() || s.questions.some(function (q) { return !q.t.trim(); }); })) { UI.toast('Every section and question needs a text', { kind: 'bad' }); return false; }
          if (d.sections.some(function (s) { return !s.questions.length; })) { UI.toast('Remove empty sections', { kind: 'bad' }); return false; }
          if (total() !== 100) { UI.toast('Total weight must equal 100 (currently ' + total() + ')', { kind: 'bad' }); return false; }
          d.name = d.name.trim();
          if (ex) { Object.assign(ex, d); } else { d.id = 'sc' + Date.now(); MCM.scorecards.push(d); }
          MCM.saveScorecards(); MCM.audit(ex ? 'Scorecard edited' : 'Scorecard created', d.name); UI.toast('Scorecard saved', { kind: 'ok' }); ctx.refresh();
        }
      }],
      onOpen: function (m) {
        host = m.querySelector('[data-bld]'); paint();
        m.addEventListener('input', function () { sync(); var t = host.querySelector('[data-tot]'); if (t) t.innerHTML = tot(); });
        m.addEventListener('click', function (e) {
          var t = e.target, el; if (!host.contains(t)) return;
          if ((el = t.closest('[data-sa]'))) { el.classList.toggle('on'); return; }
          if (!t.closest('[data-secdel],[data-qdel],[data-qadd],[data-secadd],[data-norm]')) return;
          sync();
          if ((el = t.closest('[data-secdel]'))) { d.sections.splice(+el.dataset.secdel, 1); }
          else if ((el = t.closest('[data-qdel]'))) { var p = el.dataset.qdel.split(','); d.sections[+p[0]].questions.splice(+p[1], 1); }
          else if ((el = t.closest('[data-qadd]'))) { d.sections[+el.dataset.qadd].questions.push({ t: '', w: 0, critical: false }); }
          else if (t.closest('[data-secadd]')) { d.sections.push({ name: 'Section ' + (d.sections.length + 1), questions: [{ t: '', w: 0, critical: false }] }); }
          else if (t.closest('[data-norm]')) { var tw = total(), last = null, run = 0; if (tw > 0) { d.sections.forEach(function (s) { s.questions.forEach(function (q) { q.w = Math.round(q.w / tw * 100); run += q.w; if (q.w > 0) last = q; }); }); if (last) last.w += 100 - run; } }
          paint();
        });
      }
    });
  }

  /* ---------- calibration ---------- */
  var LEVELS = [0, 0.5, 1];
  function simulate(c, sc, ev) {
    var qs = questionsOf(sc), base = ev ? answersOf(ev) : genAnswers(c.id + 'cal', sc, Math.round(clamp(MCM.aById[c.agent].qaBase + (c.sent || 0) * 8, 40, 100)), false);
    return reviewers().map(function (e) {
      var r = MCM.rng(hash(c.id + e.id)), b = (hash(e.id) % 7 - 3) / 12, ans = qs.map(function (q, i) {
        var v = base[i] && base[i].v != null ? base[i].v : 1, lv = q.critical || q.w <= 0 ? [0, 1] : LEVELS, idx = 0, bd = 9; lv.forEach(function (x, k) { if (Math.abs(x - v) < bd) { bd = Math.abs(x - v); idx = k; } });
        if (r() < (q.critical ? 0.05 : 0.18 + Math.abs(b))) idx = clamp(idx + (r() < 0.5 + b ? 1 : -1), 0, lv.length - 1); return { v: lv[idx] };
      });
      return { e: e, ans: ans, res: scoreOf(qs, ans) };
    });
  }

  /* ---------- page ---------- */
  MCM.page({
    id: 'quality', title: 'Quality', icon: 'quality', filters: ['date', 'queue', 'team'],
    tabs: [['overview', 'Overview'], ['evaluations', 'Evaluations'], ['scorecards', 'Scorecards'], ['calibration', 'Calibration'], ['surveys', 'Surveys'], ['agents', 'Agents']],
    render: function (ctx) {
      var R = ctx.R, tab = ctx.tab, goals = MCM.goals, canQ = MCM.can('quality');
      var evs = evalsIn(R.from, R.to), sm = summary(evs), psm = R.compare ? summary(evalsIn(R.pfrom, R.pto)) : null;
      var pts = function (d) { return f.dec(d, 1) + ' pts'; };

      if (tab === 'overview') {
        var answered = ctx.q().filter(function (c) { return c.outcome === 'answered'; }).length, pAnswered = R.compare ? ctx.prev().filter(function (c) { return c.outcome === 'answered'; }).length : 0;
        var cov = answered ? evs.length / answered * 100 : null, pcov = R.compare && pAnswered ? psm.n / pAnswered * 100 : null;
        var allDisp = MCM.evals.filter(function (e) { return e.status === 'disputed' && inScope(e); }).length;
        var step = R.to - R.from <= 2 * T.day ? 4 * 3600000 : T.day, nb = Math.max(1, Math.ceil((R.to - R.from) / step)), bk = []; for (var i = 0; i < nb; i++) bk.push({ t: R.from + i * step, l: [] });
        evs.forEach(function (e) { var k = Math.floor((evTs(e) - R.from) / step); if (bk[k]) bk[k].l.push(e); });
        var bavg = bk.map(function (b) { return avg(b.l, function (e) { return e.score; }); });
        ctx.el.innerHTML = '<div class="grid g6">' + [
          UI.kpi({ label: 'Avg QA score', value: f.dec(sm.avg, 1), def: 'qa', status: sm.avg == null ? '' : sm.avg >= goals.qa ? 'ok' : sm.avg >= goals.qa - 5 ? 'warn' : 'bad', sub: 'goal ' + goals.qa, delta: psm && UI.delta(sm.avg, psm.avg, { dec: 1, fmt: pts }) }),
          UI.kpi({ label: 'Evaluations done', value: f.n(sm.n), delta: psm && UI.delta(sm.n, psm.n) }),
          UI.kpi({ label: 'Pass rate', value: f.pct(sm.pass), sub: 'vs each scorecard pass mark', status: sm.pass == null ? '' : sm.pass >= 80 ? 'ok' : 'warn', delta: psm && UI.delta(sm.pass, psm.pass, { dec: 1, fmt: pts }) }),
          UI.kpi({ label: 'Critical fails', value: f.n(sm.crit), status: sm.crit ? 'bad' : 'ok', delta: psm && UI.delta(sm.crit, psm.crit, { good: 'down' }) }),
          UI.kpi({ label: 'Disputes open', value: f.n(allDisp), status: allDisp ? 'warn' : 'ok', sub: f.n(sm.disputed) + ' in this range', go: 'quality/evaluations' }),
          UI.kpi({ label: 'Coverage', value: f.pct(cov), sub: f.n(evs.length) + ' of ' + f.n(answered) + ' answered', delta: psm && UI.delta(cov, pcov, { dec: 1, fmt: pts }) })
        ].join('') + '</div>' +
          '<div class="grid g21 mt">' + UI.card('QA trend', '<div id="o1"></div>', { sub: 'Average score and evaluations per interval. Dashed line = QA goal.' }) + UI.card('Auto vs manual', '<div id="o2"></div>' + '<div class="muted" style="margin-top:1rem;font-size:1.1rem">' + UI.preview() + ' AI auto-graded evaluations are demo output.</div>') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('QA by queue', '<div id="o3"></div>') + UI.card('QA by team', '<div id="o4"></div>') + '</div>' +
          '<div class="mt">' + UI.card('Lowest-scoring questions', '<div id="o5"></div>', { flush: true, sub: 'Average earned share per question across evaluations in range. Per-question detail is reconstructed from totals for legacy evaluations.' }) + '</div>';
        UI.chart(document.getElementById('o1'), { type: 'bar', labels: bk.map(function (b) { return step >= T.day ? T.dm(b.t) : T.dt(b.t); }), height: 24, goal: undefined, fmt2: function (v) { return v.toFixed(0); }, series: [{ name: 'Evaluations', data: bk.map(function (b) { return b.l.length; }), color: 'var(--c2)' }, { name: 'Avg QA', axis: 'r', type: 'line', color: 'var(--c3)', data: bavg.map(function (v) { return v == null ? null : +v.toFixed(1); }), fmt: function (v) { return f.dec(v, 1); } }, { name: 'QA goal', axis: 'r', type: 'line', dash: true, color: 'var(--ok-dot)', data: bk.map(function () { return goals.qa; }), fmt: function (v) { return f.dec(v, 0); } }] });
        var au = evs.filter(function (e) { return e.mode === 'auto'; }), ma = evs.filter(function (e) { return e.mode !== 'auto'; }), aa = avg(au, function (e) { return e.score; }), am = avg(ma, function (e) { return e.score; });
        document.getElementById('o2').innerHTML = UI.hbars([{ label: 'Manual (' + ma.length + ')', value: am || 0, fmt: function (v) { return am == null ? '-' : f.dec(v, 1); } }, { label: 'AI auto-graded (' + au.length + ')', value: aa || 0, color: 'var(--c4)', fmt: function (v) { return aa == null ? '-' : f.dec(v, 1); } }], { max: 100 }) +
          '<div class="note mt">' + UI.icon('info') + '<span>' + (aa != null && am != null ? 'Auto-graded scores are ' + f.dec(Math.abs(aa - am), 1) + ' points ' + (aa >= am ? 'higher' : 'lower') + ' than manual.' + (Math.abs(aa - am) > 3 ? ' Consider a calibration session.' : ' Scoring looks aligned.') : 'Not enough evaluations of both kinds in this range.') + '</span></div>';
        var byQ = {}, byT = {}; evs.forEach(function (e) { var c = evalCall(e), a = MCM.aById[e.agent]; if (c) (byQ[c.q] = byQ[c.q] || []).push(e); if (a) (byT[a.team] = byT[a.team] || []).push(e); });
        document.getElementById('o3').innerHTML = Object.keys(byQ).length ? UI.hbars(Object.keys(byQ).map(function (k) { return { label: qn(k), value: avg(byQ[k], function (e) { return e.score; }), sub: byQ[k].length + ' evals', fmt: function (v) { return f.dec(v, 1); } }; }).sort(function (a, b) { return b.value - a.value; }), { max: 100 }) : UI.empty('No evaluations', 'Try a wider date range.');
        document.getElementById('o4').innerHTML = Object.keys(byT).length ? UI.hbars(Object.keys(byT).map(function (k) { return { label: k, value: avg(byT[k], function (e) { return e.score; }), sub: byT[k].length + ' evals', fmt: function (v) { return f.dec(v, 1); }, color: avg(byT[k], function (e) { return e.score; }) >= goals.qa ? 'var(--c3)' : 'var(--c5)' }; }).sort(function (a, b) { return b.value - a.value; }), { max: 100 }) : UI.empty('No evaluations', 'Try a wider date range.');
        var qstat = {}; evs.forEach(function (e) { var sc = scOf(e); if (!sc) return; var qs = questionsOf(sc), an2 = answersOf(e); qs.forEach(function (q, i) { var a = an2[i]; if (!a || a.v == null) return; var k = sc.id + '|' + i, s = qstat[k] = qstat[k] || { sc: sc.name, q: q, sum: 0, n: 0 }; s.sum += a.v; s.n++; }); });
        var qrows = Object.keys(qstat).map(function (k) { var s = qstat[k]; return { sc: s.sc, sec: s.q.sec, t: s.q.t, w: s.q.w, crit: s.q.critical, n: s.n, avg: s.sum / s.n * 100 }; }).filter(function (r) { return r.w > 0 || r.crit; });
        UI.table(document.getElementById('o5'), { id: 'q-lowq', noun: 'questions', csv: 'lowest-scoring-questions', pageSize: 8, rows: qrows, sort: 'avg', dir: 'asc', cols: [
          { k: 't', label: 'Question', html: function (r) { return '<div style="white-space:normal;min-width:24rem">' + esc(r.t) + (r.crit ? ' ' + UI.tag('critical', 'bad') : '') + '</div>'; }, val: function (r) { return r.t; } },
          { k: 'sc', label: 'Scorecard / section', html: function (r) { return esc(r.sc) + ' <span class="muted">' + esc(r.sec) + '</span>'; }, val: function (r) { return r.sc + ' ' + r.sec; } },
          { k: 'w', label: 'Weight', r: 1, html: function (r) { return r.w; }, val: function (r) { return r.w; } },
          { k: 'n', label: 'Evals', r: 1, html: function (r) { return f.n(r.n); }, val: function (r) { return r.n; } },
          { k: 'avg', label: 'Avg earned', r: 1, html: function (r) { return '<span class="' + (r.avg >= 90 ? 'ok-t' : r.avg >= 75 ? 'warn-t' : 'bad-t') + '"><b>' + f.pct(r.avg, 0) + '</b></span>'; }, val: function (r) { return r.avg; } }] });
      }

      else if (tab === 'evaluations') {
        ctx.acts('<button class="btn" data-autog>' + UI.icon('bolt') + 'Auto-grade (AI)</button><button class="btn pri" data-newev>' + UI.icon('plus') + 'New evaluation</button>');
        var agIds = {}; MCM.evals.forEach(function (e) { agIds[e.agent] = 1; });
        var rows = evs.filter(function (e) { return (qf.status === 'all' || e.status === qf.status) && (qf.agent === 'all' || e.agent === qf.agent) && (qf.evaluator === 'all' || e.evaluator === qf.evaluator) && (qf.mode === 'all' || e.mode === qf.mode); });
        var unev = ctx.q().filter(function (c) { return c.outcome === 'answered' && c.qa == null; }).length;
        ctx.el.innerHTML = (canQ ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + esc(MCM.user.role) + ') can view evaluations and dispute scores, but cannot create or auto-grade them.</div>') +
          '<div class="grid g4">' + [UI.kpi({ label: 'Evaluations', value: f.n(sm.n), sub: f.n(unev) + ' answered calls not yet evaluated' }), UI.kpi({ label: 'Avg score', value: f.dec(sm.avg, 1), def: 'qa' }), UI.kpi({ label: 'Pass rate', value: f.pct(sm.pass) }), UI.kpi({ label: 'Disputed', value: f.n(sm.disputed), status: sm.disputed ? 'warn' : 'ok' })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Evaluations', '<div id="e1"></div>', { flush: true, sub: 'Click a row for the scorecard answers. Use filters to narrow down.', acts: '<select class="inp sm" data-qfs="status">' + UI.opts([['all', 'All statuses'], ['final', 'Final'], ['calibration', 'Calibration'], ['disputed', 'Disputed']], qf.status) + '</select><select class="inp sm" data-qfs="mode">' + UI.opts([['all', 'Auto + manual'], ['manual', 'Manual'], ['auto', 'Auto (AI)']], qf.mode) + '</select><select class="inp sm" data-qfs="agent">' + UI.opts([['all', 'All agents']].concat(Object.keys(agIds).map(function (k) { return [k, an(k)]; })), qf.agent) + '</select><select class="inp sm" data-qfs="evaluator">' + UI.opts([['all', 'All evaluators']].concat(reviewers().map(function (a) { return [a.id, a.name]; })), qf.evaluator) + '</select>' }) + '</div>';
        UI.table(document.getElementById('e1'), { id: 'q-evals', noun: 'evaluations', csv: 'evaluations', pageSize: 12, rows: rows, sort: 'ts', onRow: function (e) { openEval(ctx, e); }, cols: [
          { k: 'ts', label: 'Call time', html: function (e) { return '<b>' + T.dt(evTs(e)) + '</b>'; }, val: function (e) { return evTs(e); } },
          { k: 'id', label: 'Evaluation', html: function (e) { return '<span class="mono">' + esc(e.id.replace('evb', 'ev-')) + '</span>'; }, val: function (e) { return e.id; } },
          { k: 'call', label: 'Call', html: function (e) { return '<span class="mono">' + esc(e.call) + '</span>'; }, val: function (e) { return e.call; } },
          { k: 'ag', label: 'Agent', html: function (e) { return esc(an(e.agent)); }, val: function (e) { return an(e.agent); } },
          { k: 'sc', label: 'Scorecard', html: function (e) { var s = scOf(e); return esc(s ? s.name : '-'); }, val: function (e) { var s = scOf(e); return s ? s.name : ''; } },
          { k: 'score', label: 'Score', r: 1, html: function (e) { return '<b class="' + scoreCls(e) + '">' + e.score + '</b>'; }, val: function (e) { return e.score; } },
          { k: 'res', label: 'Result', html: function (e) { return passed(e) ? UI.tag('Pass', 'ok') : UI.tag(e.critFail ? 'Critical fail' : 'Fail', 'bad'); }, val: function (e) { return passed(e) ? 'Pass' : 'Fail'; } },
          { k: 'ev', label: 'Evaluator', html: function (e) { return esc(an(e.evaluator)); }, val: function (e) { return an(e.evaluator); } },
          { k: 'mode', label: 'Mode', html: function (e) { return UI.tag(e.mode === 'auto' ? 'Auto (AI)' : 'Manual', e.mode === 'auto' ? 'info' : 'brand'); }, val: function (e) { return e.mode; } },
          { k: 'st', label: 'Status', html: function (e) { return statusTag(e.status); }, val: function (e) { return e.status; } }] });
        ctx.el.addEventListener('change', function (e) { var s = e.target.closest('[data-qfs]'); if (s) { qf[s.dataset.qfs] = s.value; ctx.refresh(); } });
        ctx.on('[data-newev]', function () { evalModal(ctx, null); });
        ctx.on('[data-autog]', function () { autoGrade(ctx); });
        if (ctx.params.call) { var pc = ctx.params.call; delete ctx.params.call; evalModal(ctx, pc); }
      }

      else if (tab === 'scorecards') {
        ctx.acts('<button class="btn pri" data-newsc>' + UI.icon('plus') + 'New scorecard</button>');
        var scRows = MCM.scorecards.map(function (s) { var qs = questionsOf(s); return { s: s, nq: qs.length, tw: qs.reduce(function (a, q) { return a + q.w; }, 0), cr: qs.filter(function (q) { return q.critical; }).length, used: MCM.evals.filter(function (e) { return e.scorecard === s.id; }).length }; });
        ctx.el.innerHTML = (canQ ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + esc(MCM.user.role) + ') can view scorecards but not change them.</div>') + UI.card('Scorecards', '<div id="s1"></div>', { flush: true, sub: 'Forms used for evaluations. Total question weight must equal 100.' }) +
          '<div class="grid g3 mt">' + scRows.map(function (r) { return UI.card(esc(r.s.name), r.s.sections.map(function (sec) { return '<div style="margin-bottom:.8rem"><b>' + esc(sec.name) + '</b><ul style="margin:.3rem 0 0 1.8rem">' + sec.questions.map(function (q) { return '<li>' + esc(q.t) + ' <span class="muted">' + q.w + '</span>' + (q.critical ? ' ' + UI.tag('critical', 'bad') : '') + '</li>'; }).join('') + '</ul></div>'; }).join(''), { sub: 'Pass mark ' + r.s.passMark + ' - ' + (r.s.active ? 'Active' : 'Inactive') }); }).join('') + '</div>';
        UI.table(document.getElementById('s1'), { id: 'q-sc', noun: 'scorecards', csv: 'scorecards', pageSize: 10, search: false, rows: scRows, sort: 'n', dir: 'asc', cols: [
          { k: 'n', label: 'Name', html: function (r) { return '<b>' + esc(r.s.name) + '</b>'; }, val: function (r) { return r.s.name; } },
          { k: 'pm', label: 'Pass mark', r: 1, html: function (r) { return r.s.passMark + '%'; }, val: function (r) { return r.s.passMark; } },
          { k: 'q', label: 'Questions', r: 1, html: function (r) { return r.nq; }, val: function (r) { return r.nq; } },
          { k: 'cr', label: 'Critical', r: 1, html: function (r) { return r.cr; }, val: function (r) { return r.cr; } },
          { k: 'tw', label: 'Total weight', r: 1, html: function (r) { return '<span class="' + (r.tw === 100 ? 'ok-t' : 'bad-t') + '">' + r.tw + '</span>'; }, val: function (r) { return r.tw; } },
          { k: 'u', label: 'Evaluations', r: 1, html: function (r) { return f.n(r.used); }, val: function (r) { return r.used; } },
          { k: 'a', label: 'Active', noSort: 1, html: function (r) { return UI.sw(r.s.active, 'data-sact="' + r.s.id + '"' + (canQ ? '' : ' disabled')); }, val: function (r) { return r.s.active ? 'Yes' : 'No'; } },
          { k: 'ac', label: '', noSort: 1, noCsv: 1, html: function (r) { return canQ ? '<button class="btn xs" data-scedit="' + r.s.id + '">' + UI.icon('edit') + 'Edit</button> <button class="btn xs" data-scdup="' + r.s.id + '">Copy</button> <button class="btn xs danger" data-scdel="' + r.s.id + '">' + UI.icon('trash') + '</button>' : ''; } }] });
        ctx.on('[data-newsc]', function () { builder(ctx, null); });
        ctx.on('[data-scedit]', function (e, el) { builder(ctx, scById(el.dataset.scedit)); });
        ctx.on('[data-scdup]', function (e, el) { if (!canQ) return MCM.deny('edit scorecards'); var s = scById(el.dataset.scdup), c2 = JSON.parse(JSON.stringify(s)); c2.id = 'sc' + Date.now(); c2.name = s.name + ' (copy)'; c2.active = false; MCM.scorecards.push(c2); MCM.saveScorecards(); MCM.audit('Scorecard duplicated', s.name); ctx.refresh(); });
        ctx.on('[data-sact]', function (e, el) { if (!canQ) return MCM.deny('edit scorecards'); var s = scById(el.dataset.sact); s.active = !s.active; MCM.saveScorecards(); MCM.audit('Scorecard ' + (s.active ? 'activated' : 'deactivated'), s.name); ctx.refresh(); });
        ctx.on('[data-scdel]', function (e, el) {
          if (!canQ) return MCM.deny('delete scorecards'); var s = scById(el.dataset.scdel), used = MCM.evals.filter(function (x) { return x.scorecard === s.id; }).length;
          if (used) { UI.toast('"' + esc(s.name) + '" is used by ' + used + ' evaluations. Deactivate it instead of deleting.', { kind: 'bad' }); return; }
          UI.confirm('Delete the scorecard "' + esc(s.name) + '"?', 'Delete').then(function (ok) { if (!ok) return; MCM.scorecards.splice(MCM.scorecards.indexOf(s), 1); MCM.saveScorecards(); MCM.audit('Scorecard deleted', s.name); ctx.refresh(); });
        });
      }

      else if (tab === 'calibration') {
        var pool2 = ctx.q().filter(function (c) { return c.outcome === 'answered'; }), withQa = pool2.filter(function (c) { return c.qa != null; });
        var opts = withQa.slice(-40).reverse(); if (calib.call && !opts.some(function (c) { return c.id === calib.call; }) && callMap()[calib.call]) opts.unshift(callMap()[calib.call]);
        var cc = opts.filter(function (c) { return c.id === calib.call; })[0] || opts[0] || null;
        if (!cc) { ctx.el.innerHTML = UI.card('Calibration', UI.empty('No evaluated calls in this range', 'Calibration compares evaluators on an already-scored call. Widen the date range.')); }
        else {
          var scs2 = MCM.scorecards, sc2 = scById(calib.sc) || defaultSc(cc) || scs2[0], ev2 = MCM.evals.filter(function (e) { return e.call === cc.id; })[0];
          if (ev2 && scById(ev2.scorecard) && !calib.sc) sc2 = scById(ev2.scorecard);
          var qs2 = questionsOf(sc2), sim = simulate(cc, sc2, ev2 && ev2.scorecard === sc2.id ? ev2 : null);
          var perQ = qs2.map(function (q, i) { var vs = sim.map(function (s) { return s.ans[i].v; }).filter(function (v) { return v != null; }), m = vs.reduce(function (a, b) { return a + b; }, 0) / (vs.length || 1), sd = Math.sqrt(vs.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (vs.length || 1)); return { q: q, sd: sd, agree: clamp(1 - sd / 0.5, 0, 1) }; });
          var wsum = perQ.reduce(function (a, p) { return a + Math.max(p.q.w, 1); }, 0), cscore = perQ.reduce(function (a, p) { return a + Math.max(p.q.w, 1) * p.agree; }, 0) / wsum * 100;
          var mean = sim.reduce(function (a, s) { return a + s.res.score; }, 0) / sim.length, spread = Math.max.apply(null, sim.map(function (s) { return s.res.score; })) - Math.min.apply(null, sim.map(function (s) { return s.res.score; }));
          var hist = MCM.store.get('calibrations', []), calEvs = MCM.evals.filter(function (e) { return e.status === 'calibration' && inScope(e); });
          var rtag = function (v) { return v == null ? UI.tag('N/A') : v === 1 ? UI.tag('Pass', 'ok') : v === 0 ? UI.tag('Fail', 'bad') : UI.tag('Partial', 'warn'); };
          ctx.acts('<button class="btn pri" data-savecal>' + UI.icon('check') + 'Save session</button>');
          ctx.el.innerHTML = '<div class="note warn" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>' + UI.preview() + ' Evaluator scores are simulated (deterministic per call and evaluator) so the variance view can be shown. Connect real evaluators to replace them.</span></div>' +
            '<div class="card" style="display:flex;gap:1.2rem;flex-wrap:wrap;align-items:end"><label style="display:grid;gap:.4rem;font-size:1.1rem;font-weight:600">Call<select class="inp" data-ccall style="min-width:30rem">' + opts.map(function (c) { return '<option value="' + c.id + '"' + (c.id === cc.id ? ' selected' : '') + '>' + c.id + ' - ' + T.dt(c.ts) + ' - ' + esc(an(c.agent)) + ' (QA ' + c.qa + ')</option>'; }).join('') + '</select></label><label style="display:grid;gap:.4rem;font-size:1.1rem;font-weight:600">Scorecard<select class="inp" data-csc>' + UI.opts(scs2.map(function (s) { return [s.id, s.name]; }), sc2.id) + '</select></label><button class="btn" data-opencall="' + cc.id + '">Open call</button></div>' +
            '<div class="grid g4 mt">' + [UI.kpi({ label: 'Calibration score', value: f.dec(cscore, 0), unit: '/100', status: cscore >= 85 ? 'ok' : cscore >= 70 ? 'warn' : 'bad', sub: 'weighted agreement on every question' }), UI.kpi({ label: 'Mean score', value: f.dec(mean, 1), sub: sim.length + ' evaluators' }), UI.kpi({ label: 'Score spread', value: f.dec(spread, 0), unit: ' pts', status: spread > 10 ? 'bad' : spread > 5 ? 'warn' : 'ok', sub: 'highest minus lowest' }), UI.kpi({ label: 'Least agreed question', value: (function () { var w = perQ.slice().sort(function (a, b) { return a.agree - b.agree; })[0]; return w ? f.pct(w.agree * 100, 0) : '-'; })(), sub: (function () { var w = perQ.slice().sort(function (a, b) { return a.agree - b.agree; })[0]; return w ? esc(w.q.t.slice(0, 40)) : ''; })() })].join('') + '</div>' +
            '<div class="mt">' + UI.card('Variance per question', '<div class="tw"><table class="t"><thead><tr><th>Question</th><th class="r">Weight</th>' + sim.map(function (s) { return '<th>' + esc(s.e.name.split(' ')[0]) + '</th>'; }).join('') + '<th class="r">Std dev</th><th class="r">Agreement</th></tr></thead><tbody>' + perQ.map(function (p, i) { return '<tr><td style="white-space:normal;min-width:22rem">' + esc(p.q.t) + (p.q.critical ? ' ' + UI.tag('critical', 'bad') : '') + '</td><td class="r">' + p.q.w + '</td>' + sim.map(function (s) { return '<td>' + rtag(s.ans[i].v) + '</td>'; }).join('') + '<td class="r">' + f.dec(p.sd, 2) + '</td><td class="r"><span class="' + (p.agree >= .85 ? 'ok-t' : p.agree >= .6 ? 'warn-t' : 'bad-t') + '">' + f.pct(p.agree * 100, 0) + '</span></td></tr>'; }).join('') + '</tbody><tfoot><tr><td><b>Total score</b></td><td></td>' + sim.map(function (s) { return '<td><b>' + s.res.score + '</b> <span class="muted">(' + (s.res.score - mean >= 0 ? '+' : '') + f.dec(s.res.score - mean, 1) + ')</span></td>'; }).join('') + '<td></td><td></td></tr></tfoot></table></div>', { flush: true, sub: 'Evaluators: ' + sim.map(function (s) { return esc(s.e.name) + ' (' + s.e.role + ')'; }).join(', ') }) + '</div>' +
            '<div class="grid g2 mt">' + UI.card('Saved calibration sessions', hist.length ? '<ul class="plain">' + hist.slice(0, 8).map(function (h) { return '<li style="display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--line2)"><span>' + T.dt(h.ts) + ' - ' + esc(h.call) + ' (' + esc(h.sc) + ')</span><b>' + h.score + '</b></li>'; }).join('') + '</ul>' : UI.empty('No saved sessions', 'Save a session to keep its score.')) + UI.card('Evaluations flagged for calibration', calEvs.length ? '<ul class="plain">' + calEvs.slice(-8).reverse().map(function (e) { return '<li class="click" data-calev="' + esc(e.id) + '" style="display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--line2);cursor:pointer"><span>' + esc(e.call) + ' - ' + esc(an(e.agent)) + '</span><b>' + e.score + '</b></li>'; }).join('') + '</ul>' : UI.empty('None in this range')) + '</div>';
          ctx.el.addEventListener('change', function (e) { if (e.target.matches('[data-ccall]')) { calib.call = e.target.value; ctx.refresh(); } else if (e.target.matches('[data-csc]')) { calib.sc = e.target.value; ctx.refresh(); } });
          ctx.on('[data-opencall]', function (e, el) { MCM.drill.call(el.dataset.opencall); });
          ctx.on('[data-calev]', function (e, el) { var x = MCM.evals.filter(function (z) { return z.id === el.dataset.calev; })[0]; if (x) openEval(ctx, x); });
          ctx.on('[data-savecal]', function () { if (!canQ) return MCM.deny('save calibration sessions'); var h2 = MCM.store.get('calibrations', []); h2.unshift({ ts: Date.now(), call: cc.id, sc: sc2.name, score: Math.round(cscore), by: MCM.user.id }); MCM.store.set('calibrations', h2.slice(0, 50)); MCM.audit('Calibration saved', cc.id + ' score ' + Math.round(cscore)); UI.toast('Calibration session saved', { kind: 'ok' }); ctx.refresh(); });
        }
      }

      else if (tab === 'surveys') {
        var all = ctx.q({ dir: 'in' }), g = MCM.agg(all), pg = R.compare ? MCM.agg(ctx.prev({ dir: 'in' })) : null;
        var ans2 = all.filter(function (c) { return c.outcome === 'answered'; }), resp = ans2.filter(function (c) { return c.csat != null; });
        function nps(l) { var r = l.filter(function (c) { return c.csat != null; }); if (!r.length) return null; return (r.filter(function (c) { return c.csat >= 4; }).length - r.filter(function (c) { return c.csat <= 2; }).length) / r.length * 100; }
        function est(l) { return avg(l, function (c) { return c.sent == null ? null : clamp(3 + 2 * c.sent, 1, 5); }); }
        function pOf(l, fn) { return l.length ? l.filter(fn).length / l.length * 100 : null; }
        var rr = g.answered ? g.csatN / g.answered * 100 : null, prr = pg && pg.answered ? pg.csatN / pg.answered * 100 : null, np = nps(ans2), pnp = pg ? nps(ctx.prev({ dir: 'in' })) : null, es = est(ans2);
        var stepS = R.to - R.from <= 2 * T.day ? 3 * 3600000 : T.day, bkS = MCM.buckets(ans2, R.from, R.to, stepS), dist = [1, 2, 3, 4, 5].map(function (s) { return resp.filter(function (c) { return c.csat === s; }).length; });
        ctx.el.innerHTML = '<div class="grid g3">' + [
          UI.kpi({ label: 'CSAT', value: f.dec(g.csat, 2), unit: '/5', def: 'csat', status: g.csat == null ? '' : g.csat >= goals.csat ? 'ok' : 'warn', sub: 'goal ' + goals.csat, delta: pg && UI.delta(g.csat, pg.csat, { dec: 2 }) }),
          UI.kpi({ label: '% good (4-5)', value: f.pct(g.csatPct), def: 'csat', delta: pg && UI.delta(g.csatPct, pg.csatPct, { dec: 1, fmt: pts }) }),
          UI.kpi({ label: 'Response rate', value: f.pct(rr), sub: f.n(g.csatN) + ' surveys / ' + f.n(g.answered) + ' answered', delta: pg && UI.delta(rr, prr, { dec: 1, fmt: pts }) }),
          UI.kpi({ label: 'NPS (derived)', value: np == null ? '-' : (np > 0 ? '+' : '') + f.dec(np, 0), sub: 'promoters 4-5, passives 3, detractors 1-2', status: np == null ? '' : np >= 30 ? 'ok' : np >= 0 ? 'warn' : 'bad', delta: pg && UI.delta(np, pnp, { dec: 0 }) }),
          UI.kpi({ label: 'AI CSAT estimate', value: f.dec(es, 2), unit: '/5', sub: 'estimate from sentiment, all answered calls' }),
          UI.kpi({ label: 'Estimate vs survey', value: g.csat != null && es != null ? (es - g.csat >= 0 ? '+' : '') + f.dec(es - g.csat, 2) : '-', sub: 'gap between estimate and real surveys' })
        ].join('') + '</div>' +
          '<div class="grid g21 mt">' + UI.card('CSAT trend', '<div id="v1"></div>', { sub: 'Average survey score and response rate per interval.' }) + UI.card('CSAT distribution', '<div id="v2"></div>') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Surveys by queue', '<div id="v3"></div>', { flush: true, sub: 'AI estimate is derived from sentiment and is not a survey result.' }) + UI.card('Surveys by agent', '<div id="v4"></div>', { flush: true }) + '</div>';
        UI.chart(document.getElementById('v1'), { type: 'bar', height: 24, labels: bkS.map(function (b) { return stepS >= T.day ? T.dm(b.t) : T.time(b.t); }), tipLabels: bkS.map(function (b) { return T.dt(b.t); }), min: 0, fmt2: function (v) { return v.toFixed(1); }, series: [{ name: 'Surveys', data: bkS.map(function (b) { return b.agg.csatN; }), color: 'var(--c2)' }, { name: 'CSAT', axis: 'r', type: 'line', color: 'var(--c3)', data: bkS.map(function (b) { return b.agg.csat == null ? null : +b.agg.csat.toFixed(2); }), fmt: function (v) { return f.dec(v, 2); } }, { name: 'AI estimate', axis: 'r', type: 'line', dash: true, color: 'var(--c4)', data: bkS.map(function (b) { var v = est(b.list.filter(function (c) { return c.outcome === 'answered'; })); return v == null ? null : +v.toFixed(2); }), fmt: function (v) { return f.dec(v, 2); } }] });
        UI.donut(document.getElementById('v2'), { items: [5, 4, 3, 2, 1].map(function (s) { return { name: 'Score ' + s, value: dist[s - 1], color: s >= 4 ? 'var(--c3)' : s === 3 ? 'var(--c4)' : 'var(--c5)' }; }), center: { v: f.dec(g.csat, 2), l: 'avg CSAT' } });
        function srow(k, l) { var rs = l.filter(function (c) { return c.csat != null; }), an3 = l.filter(function (c) { return c.outcome === 'answered'; }); return { k: k, n: rs.length, ans: an3.length, rr: an3.length ? rs.length / an3.length * 100 : null, csat: avg(rs, function (c) { return c.csat; }), good: pOf(rs, function (c) { return c.csat >= 4; }), nps: nps(l), est: est(an3) }; }
        function scols(nameFn) { return [
          { k: 'n', label: 'Name', html: function (r) { return '<b>' + esc(nameFn(r.k)) + '</b>'; }, val: function (r) { return nameFn(r.k); } },
          { k: 'r', label: 'Surveys', r: 1, html: function (r) { return f.n(r.n); }, val: function (r) { return r.n; } },
          { k: 'rr', label: 'Resp. %', r: 1, html: function (r) { return f.pct(r.rr, 0); }, val: function (r) { return r.rr; } },
          { k: 'cs', label: 'CSAT', r: 1, html: function (r) { return '<span class="' + (r.csat == null ? '' : r.csat >= goals.csat ? 'ok-t' : 'warn-t') + '">' + f.dec(r.csat, 2) + '</span>'; }, val: function (r) { return r.csat; } },
          { k: 'g', label: '% good', r: 1, html: function (r) { return f.pct(r.good, 0); }, val: function (r) { return r.good; } },
          { k: 'np', label: 'NPS', r: 1, html: function (r) { return r.nps == null ? '-' : f.dec(r.nps, 0); }, val: function (r) { return r.nps; } },
          { k: 'es', label: 'AI est. (estimate)', r: 1, html: function (r) { return '<span class="muted">' + f.dec(r.est, 2) + '</span>'; }, val: function (r) { return r.est; } }]; }
        var gq = MCM.groupBy(ans2, function (c) { return c.q; }), ga = MCM.groupBy(ans2, function (c) { return c.agent; });
        UI.table(document.getElementById('v3'), { id: 'q-sq', noun: 'queues', csv: 'csat-by-queue', pageSize: 8, search: false, sort: 'cs', dir: 'asc', rows: Object.keys(gq).map(function (k) { return srow(k, gq[k]); }), onRow: function (r) { MCM.drill.queue(r.k); }, cols: scols(qn) });
        UI.table(document.getElementById('v4'), { id: 'q-sa', noun: 'agents', csv: 'csat-by-agent', pageSize: 8, sort: 'cs', dir: 'asc', rows: Object.keys(ga).map(function (k) { return srow(k, ga[k]); }), onRow: function (r) { MCM.drill.agent(r.k); }, cols: scols(an) });
      }

      else if (tab === 'agents') {
        var end = MCM.TODAY + T.day, weeks = [0, 1, 2, 3, 4, 5].map(function (k) { return { from: end - (6 - k) * 7 * T.day, to: end - (5 - k) * 7 * T.day }; });
        var allEv = MCM.evals.filter(function (e) { return inScope(e); }), byAg = MCM.groupBy(allEv, function (e) { return e.agent; }), inR = MCM.groupBy(evs, function (e) { return e.agent; });
        var csatBy = MCM.groupBy(ctx.q({ dir: 'in' }).filter(function (c) { return c.outcome === 'answered'; }), function (c) { return c.agent; });
        var arows = Object.keys(byAg).map(function (id) {
          var l = byAg[id], series = weeks.map(function (w) { return avg(l.filter(function (e) { var t = evTs(e); return t >= w.from && t < w.to; }), function (e) { return e.score; }); }), have = series.filter(function (v) { return v != null; });
          var cur = inR[id] || [], a = avg(cur, function (e) { return e.score; }), g2 = MCM.agg(csatBy[id] || []);
          return { id: id, a: MCM.aById[id], n: cur.length, avg: a, series: have, trend: have.length > 1 ? have[have.length - 1] - have[0] : null, csat: g2.csat, crit: cur.filter(function (e) { return e.critFail; }).length };
        }).filter(function (r) { return r.a; });
        var ok = arows.filter(function (r) { return r.avg != null && r.avg >= goals.qa; }).length, bad = arows.filter(function (r) { return r.avg != null && r.avg < goals.qa - 5; }).length;
        ctx.el.innerHTML = '<div class="grid g4">' + [UI.kpi({ label: 'Agents scored', value: f.n(arows.filter(function (r) { return r.n; }).length), sub: 'with evaluations in range' }), UI.kpi({ label: 'At or above goal', value: ok, status: 'ok', sub: 'QA goal ' + goals.qa }), UI.kpi({ label: 'More than 5 below goal', value: bad, status: bad ? 'bad' : 'ok' }), UI.kpi({ label: 'Team avg QA', value: f.dec(sm.avg, 1), def: 'qa' })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Agent QA history', '<div id="a1"></div>', { flush: true, sub: 'Sparkline = weekly average over the last 6 weeks (all evaluations). Colour compares the selected range with the QA goal of ' + goals.qa + '.' }) + '</div>';
        UI.table(document.getElementById('a1'), { id: 'q-ag', noun: 'agents', csv: 'agent-qa', pageSize: 12, rows: arows, sort: 'avg', dir: 'asc', onRow: function (r) { MCM.drill.agent(r.id); }, cols: [
          { k: 'n', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b>'; }, val: function (r) { return r.a.name; } },
          { k: 'tm', label: 'Team', html: function (r) { return esc(r.a.team); }, val: function (r) { return r.a.team; } },
          { k: 'ev', label: 'Evals', r: 1, html: function (r) { return r.n; }, val: function (r) { return r.n; } },
          { k: 'avg', label: 'Avg QA', r: 1, html: function (r) { return qaNum(r.avg); }, val: function (r) { return r.avg; } },
          { k: 'gl', label: 'vs goal', html: function (r) { return r.avg == null ? '<span class="faint">-</span>' : UI.tag((r.avg - goals.qa >= 0 ? '+' : '') + f.dec(r.avg - goals.qa, 1), r.avg >= goals.qa ? 'ok' : r.avg >= goals.qa - 5 ? 'warn' : 'bad'); }, val: function (r) { return r.avg == null ? null : r.avg - goals.qa; } },
          { k: 'sp', label: '6-week trend', noSort: 1, noCsv: 1, html: function (r) { return '<div style="width:12rem;height:2.4rem">' + UI.spark(r.series, r.trend != null && r.trend < 0 ? 'var(--c5)' : 'var(--c3)') + '</div>'; } },
          { k: 'tr', label: 'Change', r: 1, html: function (r) { return r.trend == null ? '-' : '<span class="' + (r.trend >= 0 ? 'ok-t' : 'bad-t') + '">' + (r.trend >= 0 ? '+' : '') + f.dec(r.trend, 1) + '</span>'; }, val: function (r) { return r.trend; } },
          { k: 'cr', label: 'Critical fails', r: 1, html: function (r) { return r.crit ? '<span class="bad-t">' + r.crit + '</span>' : '0'; }, val: function (r) { return r.crit; } },
          { k: 'cs', label: 'CSAT', r: 1, html: function (r) { return f.dec(r.csat, 2); }, val: function (r) { return r.csat; } }] });
      }
    }
  });
})();
