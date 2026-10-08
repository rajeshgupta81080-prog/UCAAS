/* Coaching - hub (funnel, who needs coaching, review queue), sessions workflow, gamified leaderboard, team goals. */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc;
  var TOPICS = ['Empathy', 'Hold etiquette', 'Compliance script', 'Upsell', 'De-escalation', 'Product knowledge', 'Handle time', 'Quality improvement'];

  function an(id) { return MCM.aById[id] ? MCM.aById[id].name : (id || '-'); }
  function qn(id) { return MCM.qById[id] ? MCM.qById[id].name : id; }
  function avg(l, fn) { var n = 0, s = 0; l.forEach(function (x) { var v = fn(x); if (v != null) { n++; s += v; } }); return n ? s / n : null; }
  function ymdhm(ts) { var p = T.parts(ts), z = function (n) { return (n < 10 ? '0' : '') + n; }; return p.y + '-' + z(p.mo) + '-' + z(p.d) + 'T' + z(p.h) + ':' + z(p.mi); }
  function fromLocal(s) { var m = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+)/.exec(s || ''); if (!m) return null; return T.sod(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)) + (+m[4]) * 3600000 + (+m[5]) * 60000; }
  function coaches() { return MCM.agents.filter(function (a) { return ['Admin', 'Supervisor', 'Coach'].indexOf(a.role) >= 0; }); }
  function coachees() { return MCM.agents.filter(function (a) { return a.role !== 'Admin'; }); }
  function stTag(s) { return UI.tag(s, s === 'completed' ? 'ok' : s === 'in-progress' ? 'warn' : s === 'live' ? 'bad' : 'info'); }
  function sentNum(s) { return s == null ? '<span class="faint">-</span>' : '<span class="' + (s > .15 ? 'ok-t' : s < -.15 ? 'bad-t' : '') + '">' + f.dec(s, 2) + '</span>'; }
  function flagged(c) { return c.outcome === 'answered' && ((c.sent != null && c.sent <= -0.35) || (c.qa != null && c.qa < 70) || (c.tags || []).indexOf('escalation') >= 0 || (c.tags || []).indexOf('compliance') >= 0); }
  function inRange(ts, R) { return ts >= R.from && ts < R.to; }
  function save() { MCM.coachSessions.sort(function (a, b) { return b.ts - a.ts; }); MCM.saveCoach(); }

  /* ---------- session modals ---------- */
  function sessionModal(ctx, preAgent) {
    if (!MCM.can('coach')) return MCM.deny('create coaching sessions');
    var ags = coachees(), cs = coaches(), cur = preAgent || (ags.filter(function (a) { return a.role === 'Agent'; })[0] || ags[0]).id;
    function callsFor(id) {
      var l = ctx.q({ agents: [id], queues: [], teams: [] }).filter(function (c) { return c.outcome === 'answered'; }).sort(function (a, b) { return ((a.sent || 0) + (a.qa != null ? (a.qa - 80) / 50 : 0)) - ((b.sent || 0) + (b.qa != null ? (b.qa - 80) / 50 : 0)); }).slice(0, 6);
      return l.length ? l.map(function (c) { return '<label style="display:flex;gap:.6rem;font-weight:400"><input type="checkbox" data-lc value="' + c.id + '"> <span class="mono">' + c.id + '</span> ' + T.dt(c.ts) + ' - sentiment ' + f.dec(c.sent, 2) + (c.qa != null ? ' - QA ' + c.qa : '') + '</span></label>'; }).join('') : '<span class="muted">No calls for this agent in the selected range.</span>';
    }
    UI.modal({
      title: 'Create coaching session', body: '<div class="fg"><div class="fg c2"><label>Agent<select class="inp" data-ag>' + UI.opts(ags.map(function (a) { return [a.id, a.name + ' (' + a.team + ')']; }), cur) + '</select></label><label>Coach<select class="inp" data-co>' + UI.opts(cs.map(function (a) { return [a.id, a.name + ' (' + a.role + ')']; }), cs.filter(function (a) { return a.id === MCM.user.id; })[0] ? MCM.user.id : cs[0].id) + '</select></label></div><div class="fg c2"><label>Topic<select class="inp" data-tp>' + UI.opts(TOPICS, TOPICS[0]) + '</select></label><label>Date and time<input class="inp" type="datetime-local" data-dt value="' + ymdhm(Date.now() + 24 * 3600000 - (Date.now() % 3600000) + 3600000) + '"></label></div><label>Linked calls (lowest scoring in range)<div data-lcs style="display:grid;gap:.4rem;padding:.6rem 0">' + callsFor(cur) + '</div></label><label>Notes<textarea class="inp" data-nt rows="3" placeholder="Agenda, observations, agreed actions..."></textarea></label></div>',
      foot: [{ label: 'Cancel' }, {
        label: 'Create session', pri: true, fn: function (m) {
          if (!MCM.can('coach')) return MCM.deny('create coaching sessions');
          var ts = fromLocal(m.querySelector('[data-dt]').value); if (ts == null) { UI.toast('Pick a date and time', { kind: 'bad' }); return false; }
          var s = { id: 'co' + Date.now(), agent: m.querySelector('[data-ag]').value, coach: m.querySelector('[data-co]').value, ts: ts, topic: m.querySelector('[data-tp]').value, status: 'scheduled', note: m.querySelector('[data-nt]').value.trim(), score: null, calls: Array.prototype.slice.call(m.querySelectorAll('[data-lc]:checked')).map(function (x) { return x.value; }) };
          MCM.coachSessions.unshift(s); save(); MCM.audit('Coaching session created', an(s.agent) + ' - ' + s.topic); UI.toast('Session scheduled for ' + T.dt(ts), { kind: 'ok' }); ctx.refresh();
        }
      }],
      onOpen: function (m) { m.querySelector('[data-ag]').onchange = function (e) { m.querySelector('[data-lcs]').innerHTML = callsFor(e.target.value); }; }
    });
  }
  function endModal(ctx, s) {
    UI.modal({ title: 'End session - ' + esc(an(s.agent)), body: '<div class="fg"><label>Agent assessment score after the session (0-100, optional)<input class="inp" type="number" min="0" max="100" data-sc value="' + (s.score != null ? s.score : '') + '"></label><label>Outcome notes<textarea class="inp" data-nt rows="4">' + esc(s.note || '') + '</textarea></label></div>', foot: [{ label: 'Cancel' }, {
      label: 'End session', pri: true, fn: function (m) {
        var v = m.querySelector('[data-sc]').value; if (v !== '' && (isNaN(+v) || +v < 0 || +v > 100)) { UI.toast('Score must be 0-100', { kind: 'bad' }); return false; }
        s.status = 'completed'; s.endedAt = Date.now(); s.score = v === '' ? s.score : Math.round(+v); s.note = m.querySelector('[data-nt]').value.trim(); save(); MCM.audit('Coaching session completed', an(s.agent) + ' - ' + s.topic); UI.toast('Session completed', { kind: 'ok' }); ctx.refresh();
      }
    }] });
  }
  function notesModal(ctx, s) {
    UI.modal({ title: 'Session notes - ' + esc(an(s.agent)), body: '<div class="fg"><div class="muted">' + esc(s.topic) + ' - ' + T.dt(s.ts) + ' - coach ' + esc(an(s.coach)) + '</div>' + (s.calls && s.calls.length ? '<div>Linked calls: ' + s.calls.map(function (c) { return '<a href="#" data-lcall="' + c + '" class="mono">' + c + '</a>'; }).join(', ') + '</div>' : '') + '<label>Notes<textarea class="inp" data-nt rows="6">' + esc(s.note || '') + '</textarea></label></div>', foot: [{ label: 'Cancel' }, {
      label: 'Save notes', pri: true, fn: function (m) { s.note = m.querySelector('[data-nt]').value.trim(); save(); MCM.audit('Coaching notes edited', an(s.agent) + ' - ' + s.topic); UI.toast('Notes saved', { kind: 'ok' }); ctx.refresh(); }
    }], onOpen: function (m) { m.addEventListener('click', function (e) { var a = e.target.closest('[data-lcall]'); if (a) { e.preventDefault(); UI.closeModal(); MCM.drill.call(a.dataset.lcall); } }); } });
  }

  /* live monitoring sessions (written by the Monitoring page) */
  function liveRows() {
    var out = [], seen = {};
    try {
      ((MCM.live && MCM.live.sessions) || []).forEach(function (s) {
        var agent = s.agent || s.agentId, coach = s.by || s.supervisor || s.sup || s.user || s.coach, mode = s.mode || s.type || 'listen', ts = s.start || s.ts || s.t || s.started || 0, key = agent + '|' + (s.call || ts);
        seen[key] = 1; out.push({ id: s.id || key, kind: 'live', ts: ts, agent: agent, coach: coach, topic: 'Live ' + mode, status: s.end || s.ended ? 'ended' : 'live', note: s.note || '', calls: s.call ? [s.call] : [] });
      });
      ((MCM.live && MCM.live.calls) || []).forEach(function (lc) {
        if (!lc.mon) return; var key = lc.agent + '|' + lc.id; if (seen[key]) return;
        var mon = typeof lc.mon === 'object' ? lc.mon : { mode: lc.mon }; out.push({ id: 'lv-' + lc.id, kind: 'live', ts: mon.since || mon.start || lc.start, agent: lc.agent, coach: mon.by || mon.user || mon.supervisor || MCM.user.id, topic: 'Live ' + (mon.mode || 'listen'), status: 'live', note: '', calls: [lc.id] });
      });
    } catch (e) { /* tolerate other shapes */ }
    return out;
  }

  /* ---------- page ---------- */
  MCM.page({
    id: 'coaching', title: 'Coaching', icon: 'coaching', filters: ['date', 'team'],
    tabs: [['hub', 'Hub'], ['sessions', 'Sessions'], ['leaderboard', 'Leaderboard'], ['goals', 'Goals']],
    render: function (ctx) {
      var R = ctx.R, tab = ctx.tab, goals = MCM.goals, canC = MCM.can('coach'), F = MCM.F;

      if (tab === 'hub') {
        ctx.acts('<button class="btn pri" data-newsess>' + UI.icon('plus') + 'Create session</button>');
        var list = ctx.q({ queues: [] }), ans = list.filter(function (c) { return c.outcome === 'answered'; }), fl = ans.filter(flagged), ev = fl.filter(function (c) { return c.qa != null; });
        var teamSet = F.teams.length ? F.teams : null;
        var ss = MCM.coachSessions.filter(function (s) { var a = MCM.aById[s.agent]; return inRange(s.ts, R) && (!teamSet || (a && teamSet.indexOf(a.team) >= 0)); }), done = ss.filter(function (s) { return s.status === 'completed'; }), improved = done.filter(function (s) { return s.score != null && s.score >= 80; });
        var stages = [['Calls flagged for review', fl.length, 'sentiment of -0.35 or lower, QA below 70, or escalation / compliance tag'], ['Flagged calls evaluated', ev.length, 'flagged calls that have a QA score'], ['Coaching scheduled', ss.length, 'sessions dated in this range'], ['Coaching completed', done.length, 'sessions marked completed'], ['Improved', improved.length, 'completed sessions with a post-session score of 80 or more']];
        var stats = MCM.agentStats(list, R).filter(function (x) { return x.agent.role !== 'Admin' && x.handled > 0; });
        var need = stats.map(function (x) {
          var g = x.agg, reasons = [], pri = 0, negPct = (function () { var l = ans.filter(function (c) { return c.agent === x.agent.id && c.sent != null; }); return l.length ? l.filter(function (c) { return c.sent < -.15; }).length / l.length * 100 : null; })();
          if (g.qa != null && g.qa < goals.qa) { reasons.push('QA ' + f.dec(g.qa, 1) + ' vs goal ' + goals.qa); pri += goals.qa - g.qa; }
          if (g.csat != null && g.csat < goals.csat) { reasons.push('CSAT ' + f.dec(g.csat, 2) + ' vs goal ' + goals.csat); pri += (goals.csat - g.csat) * 12; }
          if (x.adherence != null && x.adherence < goals.adherence) { reasons.push('Adherence ' + f.dec(x.adherence, 1) + '% vs goal ' + goals.adherence + '%'); pri += (goals.adherence - x.adherence) * 1.2; }
          if (g.aht && g.aht > goals.aht * 1.1) { reasons.push('AHT ' + f.dur(g.aht) + ' vs goal ' + f.dur(goals.aht)); pri += (g.aht / goals.aht - 1) * 25; }
          if (negPct != null && negPct > 25) { reasons.push(f.dec(negPct, 0) + '% negative calls'); pri += (negPct - 25) * .3; }
          var open = MCM.coachSessions.filter(function (s) { return s.agent === x.agent.id && s.status !== 'completed'; }).length;
          return { a: x.agent, reasons: reasons, pri: pri, open: open, qa: g.qa, csat: g.csat, adh: x.adherence };
        }).filter(function (r) { return r.reasons.length; });
        var needAll = need.length;
        ctx.el.innerHTML = '<div class="grid g5">' + [
          UI.kpi({ label: 'Calls flagged', value: f.n(fl.length), sub: f.pct(ans.length ? fl.length / ans.length * 100 : null) + ' of answered', status: fl.length ? 'warn' : 'ok' }),
          UI.kpi({ label: 'Sessions in range', value: f.n(ss.length), sub: ss.filter(function (s) { return s.status === 'scheduled'; }).length + ' scheduled, ' + ss.filter(function (s) { return s.status === 'in-progress'; }).length + ' in progress' }),
          UI.kpi({ label: 'Completion rate', value: f.pct(ss.length ? done.length / ss.length * 100 : null, 0), sub: done.length + ' of ' + ss.length }),
          UI.kpi({ label: 'Avg session score', value: f.dec(avg(done, function (s) { return s.score; }), 0), sub: 'post-session assessment' }),
          UI.kpi({ label: 'Agents needing coaching', value: f.n(needAll), status: needAll ? 'warn' : 'ok', sub: 'below goal on at least one measure' })
        ].join('') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Coaching funnel', '<div id="h1"></div>', { sub: 'From flagged calls to improvement. Stages count calls then sessions (' + esc(R.label) + ').' }) + UI.card('Agents needing coaching', '<div id="h2"></div>', { flush: true, sub: 'Ranked by gap to goals (QA, CSAT, adherence, AHT, sentiment). Click a row for the agent.' }) + '</div>' +
          '<div class="mt">' + UI.card('Call review queue', '<div id="h3"></div>', { flush: true, sub: 'Lowest sentiment and QA first. Click a call to listen and review.' }) + '</div>';
        var mx = Math.max(1, stages[0][1]);
        document.getElementById('h1').innerHTML = '<div style="display:grid;gap:1.2rem">' + stages.map(function (s, i) {
          var conv = i && stages[i - 1][1] ? s[1] / stages[i - 1][1] * 100 : null; return '<div><div style="display:flex;justify-content:space-between;font-size:1.25rem;margin-bottom:.35rem"><span><b>' + s[0] + '</b> <span class="muted">' + esc(s[2]) + '</span></span><span><b>' + f.n(s[1]) + '</b>' + (conv != null ? ' <span class="muted">(' + f.pct(conv, 0) + ' of previous)</span>' : '') + '</span></div><div class="bar"><i style="width:' + Math.max(1.5, s[1] / mx * 100) + '%;background:var(--c' + (i + 1) + ')"></i></div></div>';
        }).join('') + '</div>';
        UI.table(document.getElementById('h2'), { id: 'co-need', noun: 'agents', csv: 'agents-needing-coaching', pageSize: 6, search: false, colChooser: false, rows: need, sort: 'pri', onRow: function (r) { MCM.drill.agent(r.a.id); }, cols: [
          { k: 'a', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b><br><span class="muted">' + esc(r.a.team) + '</span>'; }, val: function (r) { return r.a.name; } },
          { k: 'r', label: 'Why', html: function (r) { return '<div style="white-space:normal;min-width:22rem">' + r.reasons.map(function (x) { return UI.tag(x, 'warn'); }).join(' ') + '</div>'; }, val: function (r) { return r.reasons.join('; '); } },
          { k: 'pri', label: 'Priority', r: 1, html: function (r) { return f.dec(r.pri, 0); }, val: function (r) { return r.pri; } },
          { k: 'ac', label: '', noSort: 1, noCsv: 1, html: function (r) { return r.open ? UI.tag(r.open + ' open', 'info') : '<button class="btn xs pri" data-cs="' + r.a.id + '">Create session</button>'; } }] });
        var rq = ans.filter(function (c) { return c.sent != null; }).sort(function (a, b) { return ((a.sent || 0) + (a.qa != null ? (a.qa - 80) / 50 : 0)) - ((b.sent || 0) + (b.qa != null ? (b.qa - 80) / 50 : 0)); }).slice(0, 30);
        UI.table(document.getElementById('h3'), { id: 'co-rq', noun: 'calls', csv: 'call-review-queue', pageSize: 8, rows: rq, sort: 'sent', dir: 'asc', onRow: function (c) { MCM.drill.call(c.id); }, cols: [
          { k: 'ts', label: 'Time', html: function (c) { return '<b>' + T.dt(c.ts) + '</b>'; }, val: function (c) { return c.ts; } },
          { k: 'id', label: 'Call', html: function (c) { return '<span class="mono">' + c.id + '</span>'; }, val: function (c) { return c.id; } },
          { k: 'ag', label: 'Agent', html: function (c) { return esc(an(c.agent)); }, val: function (c) { return an(c.agent); } },
          { k: 'q', label: 'Queue', html: function (c) { return esc(qn(c.q)); }, val: function (c) { return qn(c.q); } },
          { k: 'tp', label: 'Topics', html: function (c) { return (c.topics || []).map(function (x) { return UI.tag(x, 'brand'); }).join(' ') || '<span class="faint">-</span>'; }, val: function (c) { return (c.topics || []).join(', '); } },
          { k: 'sent', label: 'Sentiment', r: 1, html: function (c) { return sentNum(c.sent); }, val: function (c) { return c.sent; } },
          { k: 'qa', label: 'QA', r: 1, html: function (c) { return c.qa != null ? '<span class="' + (c.qa < goals.qa ? 'warn-t' : 'ok-t') + '">' + c.qa + '</span>' : '<span class="faint">not evaluated</span>'; }, val: function (c) { return c.qa; } },
          { k: 'csat', label: 'CSAT', r: 1, html: function (c) { return c.csat || '-'; }, val: function (c) { return c.csat; } }] });
        ctx.on('[data-newsess]', function () { sessionModal(ctx, null); });
        ctx.on('[data-cs]', function (e, el) { e.stopPropagation(); sessionModal(ctx, el.dataset.cs); });
      }

      else if (tab === 'sessions') {
        ctx.acts('<button class="btn pri" data-newsess>' + UI.icon('plus') + 'New session</button>');
        var rowsFn = function () {
          var cs = MCM.coachSessions.map(function (s) { return { s: s, kind: 'coaching', ts: s.ts, agent: s.agent, coach: s.coach, topic: s.topic, status: s.status, score: s.score, note: s.note || '', calls: s.calls || [] }; });
          return cs.concat(liveRows().map(function (l) { return { s: null, kind: 'live', ts: l.ts, agent: l.agent, coach: l.coach, topic: l.topic, status: l.status, score: null, note: l.note, calls: l.calls }; }))
            .filter(function (r) { var a = MCM.aById[r.agent]; return !F.teams.length || (a && F.teams.indexOf(a.team) >= 0); });
        };
        var rows = rowsFn(), cnt = function (st) { return rows.filter(function (r) { return r.kind === 'coaching' && r.status === st; }).length; };
        ctx.el.innerHTML = (canC ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + esc(MCM.user.role) + ') can view sessions but not change them.</div>') + '<div class="grid g5">' + [UI.kpi({ label: 'Scheduled', value: cnt('scheduled') }), UI.kpi({ label: 'In progress', value: cnt('in-progress') }), UI.kpi({ label: 'Completed', value: cnt('completed') }), UI.kpi({ label: 'Avg score', value: f.dec(avg(rows, function (r) { return r.kind === 'coaching' && r.status === 'completed' ? r.score : null; }), 0) }), UI.kpi({ label: 'Live coaching now', value: rows.filter(function (r) { return r.kind === 'live' && r.status === 'live'; }).length, sub: 'listen / whisper / barge from Monitoring' })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Coaching sessions', '<div id="s1"></div>', { flush: true, sub: 'Workflow: scheduled, in progress, completed. Live coaching rows come from supervisor monitoring.' }) + '</div>';
        var tbl = UI.table(document.getElementById('s1'), { id: 'co-sess', noun: 'sessions', csv: 'coaching-sessions', pageSize: 12, rows: rows, sort: 'ts', onRow: function (r) { if (r.agent && MCM.aById[r.agent]) MCM.drill.agent(r.agent); }, cols: [
          { k: 'ts', label: 'Date', html: function (r) { return '<b>' + T.dt(r.ts) + '</b>'; }, val: function (r) { return r.ts; } },
          { k: 'kind', label: 'Type', html: function (r) { return r.kind === 'live' ? UI.tag('Live coaching', 'bad') : UI.tag('Coaching', 'brand'); }, val: function (r) { return r.kind; } },
          { k: 'ag', label: 'Agent', html: function (r) { return esc(an(r.agent)); }, val: function (r) { return an(r.agent); } },
          { k: 'co', label: 'Coach', html: function (r) { return esc(an(r.coach)); }, val: function (r) { return an(r.coach); } },
          { k: 'tp', label: 'Topic', html: function (r) { return esc(r.topic); }, val: function (r) { return r.topic; } },
          { k: 'st', label: 'Status', html: function (r) { return stTag(r.status); }, val: function (r) { return r.status; } },
          { k: 'sc', label: 'Score', r: 1, html: function (r) { return r.score != null ? r.score : '-'; }, val: function (r) { return r.score; } },
          { k: 'lc', label: 'Calls', r: 1, html: function (r) { return (r.calls || []).length ? r.calls.map(function (c) { return '<a href="#" data-lcall="' + esc(c) + '" class="mono">' + esc(c) + '</a>'; }).join(' ') : '-'; }, val: function (r) { return (r.calls || []).length; }, csv: function (r) { return (r.calls || []).join(' '); } },
          { k: 'nt', label: 'Notes', html: function (r) { return '<div style="white-space:normal;min-width:16rem;max-width:30rem" class="muted">' + esc(r.note) + '</div>'; }, val: function (r) { return r.note; } },
          { k: 'ac', label: 'Actions', noSort: 1, noCsv: 1, html: function (r) { if (r.kind !== 'coaching') return ''; var id = esc(r.s.id); return (r.status === 'scheduled' ? '<button class="btn xs pri" data-sact="start" data-sid="' + id + '">Start</button> ' : '') + (r.status === 'in-progress' ? '<button class="btn xs pri" data-sact="end" data-sid="' + id + '">End session</button> ' : '') + '<button class="btn xs" data-sact="notes" data-sid="' + id + '">' + UI.icon('edit') + 'Notes</button>'; } }] });
        ctx.on('[data-newsess]', function () { sessionModal(ctx, null); });
        ctx.on('[data-lcall]', function (e, el) { e.preventDefault(); e.stopPropagation(); MCM.drill.call(el.dataset.lcall); });
        ctx.on('[data-sact]', function (e, el) {
          e.stopPropagation(); if (!canC) return MCM.deny('change coaching sessions');
          var s = MCM.coachSessions.filter(function (x) { return x.id === el.dataset.sid; })[0]; if (!s) return; var a = el.dataset.sact;
          if (a === 'start') { s.status = 'in-progress'; s.startedAt = Date.now(); save(); MCM.audit('Coaching session started', an(s.agent) + ' - ' + s.topic); UI.toast('Session started', { kind: 'ok' }); ctx.refresh(); }
          else if (a === 'end') endModal(ctx, s); else if (a === 'notes') notesModal(ctx, s);
        });
        ctx.every(5000, function () { if (UI.drawerOpen() || document.querySelector('.modal')) return; tbl.setRows(rowsFn()); });
      }

      else if (tab === 'leaderboard') {
        var period = MCM.store.get('lbperiod', 'week'), now = Date.now(), from = period === 'month' ? MCM.TODAY - 29 * T.day : MCM.TODAY - 6 * T.day;
        var lst = MCM.query({ from: from, to: now, queues: [], channel: 'all', dir: 'all' }), st = MCM.agentStats(lst, { from: from, to: now }).filter(function (x) { return x.agent.role !== 'Admin' && x.handled > 0; });
        var sortedH = st.map(function (x) { return x.handled; }).sort(function (a, b) { return b - a; }), top3H = sortedH[Math.min(2, sortedH.length - 1)] || 0;
        var rowsL = st.map(function (x) {
          var g = x.agg, pV = g.handled * 2, pC = g.csat != null ? Math.max(0, g.csat - 3) * 100 : 0, pQ = g.qa != null ? Math.max(0, g.qa - 60) * 4 : 0, pA = x.adherence != null ? Math.max(0, x.adherence - 85) * 10 : 0, badges = [];
          if (g.qa != null && g.qa >= goals.qa) badges.push(['Quality star', 'ok']);
          if (g.aht && g.aht <= goals.aht * 0.9 && g.handled >= 10) badges.push(['Speed demon', 'info']);
          if (x.adherence != null && x.adherence >= goals.adherence + 2) badges.push(['Steady', 'brand']);
          if (g.csat != null && g.csat >= goals.csat + 0.3 && g.csatN >= 3) badges.push(['Customer favourite', 'ok']);
          if (g.handled >= top3H && g.handled > 0) badges.push(['Top volume', 'warn']);
          return { a: x.agent, pts: Math.round(pV + pC + pQ + pA), handled: g.handled, aht: g.aht, csat: g.csat, qa: g.qa, adh: x.adherence, badges: badges, parts: [Math.round(pV), Math.round(pC), Math.round(pQ), Math.round(pA)] };
        }).sort(function (a, b) { return b.pts - a.pts; });
        rowsL.forEach(function (r, i) { r.rank = i + 1; });
        ctx.el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem"><div class="muted">Leaderboard window: ' + T.dm(from) + ' - ' + T.dm(now) + ' (independent of the date filter).' + (F.teams.length ? ' Teams: ' + esc(F.teams.join(', ')) + '.' : '') + '</div>' + UI.seg([['week', 'Weekly'], ['month', 'Monthly']], period, 'lb', 'sm') + '</div>' +
          (rowsL.length ? '<div class="grid g3">' + rowsL.slice(0, 3).map(function (r, i) { return '<div class="card kpi click" data-lag="' + r.a.id + '" style="text-align:center"><div class="lb">' + ['1st place', '2nd place', '3rd place'][i] + '</div><div class="v">' + esc(r.a.name) + '</div><div class="d"><b>' + f.n(r.pts) + '</b> points - ' + esc(r.a.team) + '</div><div style="margin-top:.8rem">' + (r.badges.map(function (b) { return UI.tag(b[0], b[1]); }).join(' ') || '&nbsp;') + '</div></div>'; }).join('') + '</div>' : '') +
          '<div class="mt">' + UI.card('Leaderboard', '<div id="l1"></div>', { flush: true, sub: 'Points: 2 per handled call + 100 per CSAT point above 3 + 4 per QA point above 60 + 10 per adherence point above 85.' }) + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Badges', '<ul class="plain" style="font-size:1.25rem;display:grid;gap:.8rem"><li>' + UI.tag('Quality star', 'ok') + ' average QA at or above the goal (' + goals.qa + ')</li><li>' + UI.tag('Speed demon', 'info') + ' AHT at least 10% under goal (' + f.dur(goals.aht) + ') with 10+ calls</li><li>' + UI.tag('Steady', 'brand') + ' adherence 2 points above goal (' + goals.adherence + '%)</li><li>' + UI.tag('Customer favourite', 'ok') + ' CSAT 0.3 above goal (' + goals.csat + ') from 3+ surveys</li><li>' + UI.tag('Top volume', 'warn') + ' among the three busiest agents</li></ul>') + UI.card('Fair play', '<p class="muted">Points are derived from the same data as the other pages (calls, CSAT, QA scores, adherence), so rankings reconcile with Agents and Quality. Agents without QA-scored calls or surveys simply earn no points for those components.</p>') + '</div>';
        UI.table(document.getElementById('l1'), { id: 'co-lb', noun: 'agents', csv: 'leaderboard-' + period, pageSize: 12, rows: rowsL, sort: 'pts', onRow: function (r) { MCM.drill.agent(r.a.id); }, cols: [
          { k: 'rank', label: '#', r: 1, html: function (r) { return '<b>' + r.rank + '</b>'; }, val: function (r) { return -r.rank; }, csv: function (r) { return r.rank; } },
          { k: 'a', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b> <span class="muted">' + esc(r.a.team) + '</span>'; }, val: function (r) { return r.a.name; } },
          { k: 'pts', label: 'Points', r: 1, html: function (r) { return '<b>' + f.n(r.pts) + '</b>'; }, val: function (r) { return r.pts; } },
          { k: 'h', label: 'Handled', r: 1, html: function (r) { return f.n(r.handled); }, val: function (r) { return r.handled; } },
          { k: 'aht', label: 'AHT', r: 1, html: function (r) { return '<span class="' + (r.aht && r.aht > goals.aht ? 'warn-t' : '') + '">' + f.dur(r.aht) + '</span>'; }, val: function (r) { return r.aht; } },
          { k: 'cs', label: 'CSAT', r: 1, html: function (r) { return f.dec(r.csat, 2); }, val: function (r) { return r.csat; } },
          { k: 'qa', label: 'QA', r: 1, html: function (r) { return r.qa == null ? '-' : f.dec(r.qa, 1); }, val: function (r) { return r.qa; } },
          { k: 'ad', label: 'Adherence', r: 1, html: function (r) { return f.pct(r.adh, 1); }, val: function (r) { return r.adh; } },
          { k: 'bd', label: 'Badges', noSort: 1, html: function (r) { return r.badges.map(function (b) { return UI.tag(b[0], b[1]); }).join(' ') || '<span class="faint">-</span>'; }, csv: function (r) { return r.badges.map(function (b) { return b[0]; }).join(', '); } }] });
        ctx.on('[data-lb]', function (e, el) { MCM.store.set('lbperiod', el.dataset.lb); ctx.refresh(); });
        ctx.on('[data-lag]', function (e, el) { MCM.drill.agent(el.dataset.lag); });
      }

      else if (tab === 'goals') {
        var inputs = [['sl', 'Service level (%)', 1, 100, 1], ['aht', 'AHT (seconds, lower is better)', 30, 1800, 5], ['csat', 'CSAT (1-5)', 1, 5, 0.1], ['qa', 'QA score', 1, 100, 1], ['adherence', 'Adherence (%)', 1, 100, 1]];
        var teams = F.teams.length ? F.teams : MCM.teams, defs = [['sl', 'Service level', function (v) { return f.pct(v, 1); }, false], ['aht', 'AHT', function (v) { return f.dur(v); }, true], ['csat', 'CSAT', function (v) { return f.dec(v, 2); }, false], ['qa', 'QA score', function (v) { return f.dec(v, 1); }, false], ['adherence', 'Adherence', function (v) { return f.pct(v, 1); }, false]];
        function actuals(opts) {
          var inb = MCM.query(Object.assign({ queues: [], dir: 'in' }, opts)), all = MCM.query(Object.assign({ queues: [] }, opts)), g = MCM.agg(inb), g2 = MCM.agg(all), st = MCM.agentStats(all, R).filter(function (x) { return x.agent.role !== 'Admin' && x.adherence != null && (!opts.teams || opts.teams.indexOf(x.agent.team) >= 0); });
          return { sl: g.sl, aht: g2.aht || null, csat: g2.csat != null ? g2.csat : g.csat, qa: g2.qa, adherence: st.length ? avg(st, function (x) { return x.adherence; }) : null };
        }
        function teamCard(name, a) {
          return UI.card(esc(name), '<div style="display:grid;gap:1.1rem">' + defs.map(function (d) {
            var v = a[d[0]], gl = goals[d[0]], att = v == null || !gl ? null : (d[3] ? gl / v : v / gl) * 100, met = att != null && att >= 100, cls = att == null ? '' : met ? 'ok' : att >= 95 ? 'warn' : 'bad';
            return '<div><div style="display:flex;justify-content:space-between;font-size:1.2rem;margin-bottom:.35rem"><span>' + d[1] + '</span><span><b class="' + (cls === 'ok' ? 'ok-t' : cls === 'warn' ? 'warn-t' : cls === 'bad' ? 'bad-t' : '') + '">' + (v == null ? '-' : d[2](v)) + '</b> <span class="muted">goal ' + d[2](gl) + '</span></span></div>' + UI.bar(att == null ? 0 : Math.min(100, att), 100, cls) + '</div>';
          }).join('') + '</div>');
        }
        var allA = actuals({});
        ctx.el.innerHTML = (canC ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + esc(MCM.user.role) + ') can view goals but not change them.</div>') +
          UI.card('Team goals', '<div class="grid g5" style="align-items:end">' + inputs.map(function (i) { return '<label style="display:grid;gap:.45rem;font-size:1.1rem;font-weight:600">' + i[1] + '<input class="inp" type="number" data-goal="' + i[0] + '" min="' + i[2] + '" max="' + i[3] + '" step="' + i[4] + '" value="' + esc(goals[i[0]]) + '"' + (canC ? '' : ' disabled') + '></label>'; }).join('') + '</div><div style="margin-top:1.4rem;display:flex;gap:.8rem;align-items:center"><button class="btn pri" data-savegoals' + (canC ? '' : ' disabled') + '>Save goals</button><button class="btn" data-resetgoals' + (canC ? '' : ' disabled') + '>Reset to defaults</button><span class="muted">Goals are used on the Agents, Quality and Coaching pages and saved in this browser.</span></div>', { sub: 'Edit the targets every team is measured against.' }) +
          '<h3 class="mt" style="margin:2rem 0 1rem">Progress for ' + esc(R.label) + '</h3><div class="grid g3">' + teamCard('All ' + (F.teams.length ? 'selected ' : '') + 'teams', F.teams.length ? actuals({ teams: F.teams }) : allA) + teams.filter(function () { return true; }).map(function (t) { return teamCard(t, actuals({ teams: [t] })); }).join('') + '</div>';
        ctx.on('[data-savegoals]', function () {
          if (!canC) return MCM.deny('change goals'); var nv = {}, bad = null;
          inputs.forEach(function (i) { var el = ctx.el.querySelector('[data-goal="' + i[0] + '"]'), v = parseFloat(el.value); if (isNaN(v) || v < i[2] || v > i[3]) bad = bad || i[1]; nv[i[0]] = v; });
          if (bad) { UI.toast('Check the value for: ' + bad, { kind: 'bad' }); return; }
          Object.assign(MCM.goals, nv); MCM.store.set('goals', MCM.goals); MCM.audit('Goals changed', JSON.stringify(nv)); UI.toast('Goals saved', { kind: 'ok' }); ctx.refresh();
        });
        ctx.on('[data-resetgoals]', function () { if (!canC) return MCM.deny('change goals'); Object.assign(MCM.goals, { sl: 80, aht: 330, csat: 4.3, qa: 85, adherence: 92 }); MCM.store.set('goals', MCM.goals); MCM.audit('Goals reset', 'defaults'); UI.toast('Goals reset to defaults', { kind: 'ok' }); ctx.refresh(); });
      }
    }
  });
})();
