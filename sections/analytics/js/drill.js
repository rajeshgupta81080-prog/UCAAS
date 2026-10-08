/* MCM Analytics v2 - shared drill-down drawers: queue -> agent -> call -> recording/transcript. */
(function () {
  var UI = window.UI, $ = UI.$, esc = UI.esc, f = UI.f, T = MCM.T;
  var drill = MCM.drill = {};
  function meta(id) { return MCM.store.get('callmeta', {})[id] || {}; }
  function saveMeta(id, m) { var all = MCM.store.get('callmeta', {}); all[id] = Object.assign(all[id] || {}, m); MCM.store.set('callmeta', all); }
  function outcomeTag(c) { return c.outcome === 'answered' ? UI.tag('Answered', 'ok') : c.outcome === 'abandoned' ? UI.tag('Abandoned' + (c.abandonStage ? ' (' + c.abandonStage + ')' : ''), 'bad') : c.outcome === 'voicemail' ? UI.tag('Voicemail', 'warn') : UI.tag('No answer', 'warn'); }
  MCM.outcomeTag = outcomeTag;
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  /* ---------- transcript (deterministic demo) ---------- */
  var SCRIPT = {
    Pricing: ['Can you explain the price difference between the two plans?', 'The Pro plan adds priority support and higher limits. I can apply the current offer.'],
    Refund: ['I was charged twice and would like a refund.', 'I can see the duplicate charge. I have raised a refund, it takes 3 to 5 working days.'],
    Outage: ['My service has been down since this morning.', 'There is a known fault in your area. Engineers expect a fix within two hours.'],
    Cancellation: ['I want to cancel my subscription.', 'I am sorry to hear that. May I ask what led to this decision?'],
    'Billing dispute': ['This invoice is higher than what I was quoted.', 'Let me check the quote against the invoice with you.'],
    Upgrade: ['I would like to upgrade my plan.', 'Happy to help. The upgrade is effective immediately and prorated.'],
    Delivery: ['Where is my order?', 'It left the warehouse yesterday and is due tomorrow.'],
    'Login problem': ['I cannot log in to my account.', 'I have sent a reset link to the email on file.'],
    'Competitor mention': ['Another provider offered me a cheaper deal.', 'I understand. Let me see what we can do on price.'],
    Complaint: ['I have been very unhappy with the service recently.', 'I apologise. I will escalate this and personally follow up.']
  };
  drill.transcript = function (c) {
    var a = MCM.aById[c.agent] || { name: 'Agent' }, topic = (c.topics && c.topics[0]) || 'Information only', sc = SCRIPT[topic] || ['I have a question about my account.', 'Of course, let me pull that up for you.'], h = hash(c.id), t = 0, lines = [];
    var name = ['Mr. Rao', 'Ms. Shah', 'Mr. Iyer', 'Ms. Dsouza'][h % 4];
    function add(sp, text, s) { lines.push({ t: t, sp: sp, text: text, s: s }); t += 6 + (text.length / 12 | 0); }
    add('Agent', 'Thank you for calling, this is ' + a.name.split(' ')[0] + '. This call may be recorded. How can I help?', 0.3);
    add('Caller', 'Hi, this is ' + name + '. ' + sc[0], -0.1);
    add('Agent', 'Thanks ' + name + '. Could you confirm the registered mobile number, please?', 0.2);
    add('Caller', 'Yes, it is ' + MCM.mask(c.from) + '.', 0);
    add('Agent', sc[1], 0.3);
    if (c.hold) add('Agent', 'Please bear with me for a moment while I check this.', 0.1);
    add('Caller', c.sent < -0.2 ? 'This has taken far too long, honestly.' : 'That sounds fine, thank you.', c.sent);
    add('Agent', 'Is there anything else I can help with today?', 0.4);
    add('Caller', 'No, that is all. Thanks.', Math.max(c.sent, 0.1));
    var scale = c.talk > 0 ? c.talk / Math.max(t, 1) : 1; lines.forEach(function (l) { l.t = Math.round(l.t * scale); });
    return lines;
  };
  drill.summary = function (c) {
    var topic = (c.topics && c.topics[0]) || 'general enquiry', pos = c.sent >= .15, neg = c.sent <= -.15;
    return { text: 'Caller contacted ' + MCM.qById[c.q].name + ' about ' + topic.toLowerCase() + '. ' + (c.fcr ? 'The agent resolved the issue on the call.' : 'The issue needs a follow-up.') + (c.hold ? ' The caller was placed on hold for ' + f.dur(c.hold) + '.' : '') + ' Overall sentiment was ' + (pos ? 'positive' : neg ? 'negative' : 'neutral') + '.', actions: c.fcr ? ['Send confirmation e-mail'] : ['Schedule a callback within 24h', 'Update the ticket with the findings'], sentiment: pos ? 'positive' : neg ? 'negative' : 'neutral' };
  };

  /* ---------- call drawer ---------- */
  drill.call = function (id) {
    var i = MCM.lowerBound(0), c = null; for (var k = MCM.calls.length - 1; k >= 0; k--) if (MCM.calls[k].id === id) { c = MCM.calls[k]; break; } if (!c) { UI.toast('Call ' + id + ' not found', { kind: 'bad' }); return; }
    var q = MCM.qById[c.q], a = MCM.aById[c.agent], m = meta(c.id), sm = drill.summary(c), tr = c.outcome === 'answered' ? drill.transcript(c) : [];
    var segs = [['IVR', c.ivr || 0, '#94a3b8'], ['Queue wait', c.outcome === 'abandoned' && c.abandonStage === 'ivr' ? 0 : c.wait, '#f59e0b'], ['Ring', c.ring || 0, '#0ea5e9'], ['Talk', c.talk, '#2563eb'], ['Hold', c.hold, '#8b5cf6'], ['Wrap-up', c.wrap, '#16a34a']], tot = segs.reduce(function (s, x) { return s + x[1]; }, 0) || 1;
    var canRec = MCM.can('recordings');
    var html = '<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1.4rem">' + outcomeTag(c) + UI.tag(c.dir === 'in' ? 'Inbound' : 'Outbound', 'info') + UI.tag(q.name) + (c.xfer ? UI.tag('Transferred to ' + MCM.qById[c.xferTo].name, 'warn') : '') + (c.repeat ? UI.tag('Repeat caller', 'warn') : '') + '</div>' +
      '<h3 style="margin-bottom:.8rem">Timeline</h3><div class="tl">' + segs.map(function (s) { return s[1] ? '<i title="' + s[0] + ': ' + f.dur(s[1]) + '" style="width:' + (s[1] / tot * 100) + '%;background:' + s[2] + '"></i>' : ''; }).join('') + '</div><div class="legend">' + segs.filter(function (s) { return s[1]; }).map(function (s) { return '<span><i style="background:' + s[2] + ';display:inline-block;width:.9rem;height:.9rem;border-radius:.5rem;margin-right:.4rem"></i>' + s[0] + ' ' + f.dur(s[1]) + '</span>'; }).join('') + '</div>' +
      '<div class="grid g2 mt"><dl class="kv"><dt>Call ID</dt><dd class="mono">' + c.id + '</dd><dt>Start</dt><dd>' + T.dt(c.ts) + '</dd><dt>Caller</dt><dd>' + esc(MCM.mask(c.from)) + '</dd><dt>Queue</dt><dd><a href="#" data-q="' + q.id + '">' + esc(q.name) + '</a> (' + q.ext + ')</dd><dt>IVR path</dt><dd>' + (c.path ? esc(c.path.join(' > ')) : '-') + '</dd><dt>Agent</dt><dd>' + (a ? '<a href="#" data-a="' + a.id + '">' + esc(a.name) + '</a>' : '-') + '</dd></dl>' +
      '<dl class="kv"><dt>Wait / ASA</dt><dd>' + f.dur(c.wait) + (c.wait <= q.sl.sec ? ' ' + UI.tag('in SL', 'ok') : ' ' + UI.tag('over SL', 'bad')) + '</dd><dt>Handle time</dt><dd>' + f.dur(c.talk + c.hold + c.wrap) + '</dd><dt>Sentiment</dt><dd>' + (c.sent == null ? '-' : UI.tag(sm.sentiment, c.sent > .15 ? 'ok' : c.sent < -.15 ? 'bad' : '') + ' (' + f.dec(c.sent, 2) + ')') + '</dd><dt>CSAT</dt><dd>' + (c.csat || '-') + '</dd><dt>QA score</dt><dd>' + (c.qa != null ? c.qa : 'not evaluated') + '</dd><dt>Audio quality (MOS)</dt><dd>' + (c.mos || '-') + '</dd><dt>Wrap-up code</dt><dd>' + esc(c.wrapCode || '-') + '</dd></dl></div>' +
      '<h3 class="mt" style="margin-bottom:.8rem">Disposition, tags and notes</h3><div class="fg c2"><label>Disposition<select class="inp" data-m="disp"' + (MCM.can('quality') || MCM.can('supervise') || MCM.user.role === 'Agent' ? '' : ' disabled') + '>' + UI.opts(MCM.DISP, m.disp || c.disp) + '</select></label><label>Tags<input class="inp" data-m="tags" value="' + esc((m.tags || c.tags || []).join(', ')) + '" placeholder="vip, upsell"></label></div><label class="fg mt" style="display:grid;gap:.45rem;font-size:1.1rem;font-weight:600">Notes<textarea class="inp" data-m="note" placeholder="Add a note about this call...">' + esc(m.note || '') + '</textarea></label><div style="margin-top:.8rem"><button class="btn sm pri" data-savem>Save</button></div>';
    if (c.outcome === 'answered' || c.outcome === 'voicemail') {
      html += '<h3 class="mt" style="margin-bottom:.8rem">Recording</h3>';
      if (c.rec && canRec) { var peaks = []; var h2 = hash(c.id); for (var p = 0; p < 90; p++) peaks.push(.15 + ((h2 = (h2 * 1103515245 + 12345) & 0x7fffffff) % 1000) / 1000 * .85); html += '<div class="card" style="padding:1.2rem 1.6rem"><div style="display:flex;align-items:center;gap:1.2rem"><button class="btn pri" data-play style="width:4.2rem;padding:0">' + UI.icon('play') + '</button><div style="flex:1"><svg viewBox="0 0 900 60" preserveAspectRatio="none" style="width:100%;height:5rem;cursor:pointer" data-wave>' + peaks.map(function (v, j) { return '<rect x="' + (j * 10) + '" y="' + (30 - v * 28) + '" width="6" height="' + (v * 56) + '" rx="3" fill="var(--faint)" data-b="' + j + '"/>'; }).join('') + '</svg></div><span class="mono" data-pos>0:00 / ' + f.dur(c.talk + c.hold) + '</span></div><div style="display:flex;gap:.6rem;margin-top:.8rem"><select class="inp sm" data-speed style="min-width:7rem"><option>1x</option><option>1.5x</option><option>2x</option></select><button class="btn sm" data-dlrec>' + UI.icon('dl') + 'Download</button><span class="muted" style="font-size:1.05rem;align-self:center">Retained ' + MCM.settings.recordingRetentionDays + ' days. Access is audit-logged. Demo player (no audio file).</span></div></div>'; }
      else html += '<div class="note warn">' + (c.rec ? 'Your role (' + MCM.user.role + ') cannot play recordings.' : 'No recording for this interaction.') + '</div>';
      if (tr.length) html += '<h3 class="mt" style="margin-bottom:.8rem">Transcript <input class="inp sm" data-trq placeholder="Search transcript..." style="float:right;min-width:18rem"></h3><div data-tr class="feed" style="max-height:30rem">' + tr.map(function (l) { return '<div data-line><time>' + f.dur(l.t) + '</time><b style="width:6rem;flex:none;color:' + (l.sp === 'Agent' ? 'var(--brand)' : 'var(--ink)') + '">' + l.sp + '</b><span style="flex:1">' + esc(l.text) + '</span><span class="sdot" title="Sentiment ' + f.dec(l.s, 2) + '" style="margin-top:.5rem;background:' + (l.s > .15 ? 'var(--ok-dot)' : l.s < -.15 ? 'var(--bad)' : 'var(--faint)') + '"></span></div>'; }).join('') + '</div>';
      html += '<h3 class="mt" style="margin-bottom:.8rem">AI summary</h3><div class="card" style="background:var(--surface2)"><p>' + esc(sm.text) + '</p><p class="mt"><b>Action items</b></p><ul style="margin:.4rem 0 0 1.8rem">' + sm.actions.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' + (c.topics.length ? '<div style="margin-top:1rem">' + c.topics.map(function (x) { return UI.tag(x, 'brand'); }).join(' ') + '</div>' : '') + '<div class="muted" style="margin-top:.8rem;font-size:1.05rem">Generated summary - demo content.</div></div>';
    }
    html += '<div style="display:flex;gap:.8rem;margin-top:2rem;flex-wrap:wrap">' + (c.outcome === 'answered' && MCM.can('quality') ? '<button class="btn pri" data-eval>Evaluate this call</button>' : '') + (c.dir === 'in' && c.outcome !== 'answered' && MCM.can('supervise') ? '<button class="btn" data-cb>Schedule callback</button>' : '') + '<button class="btn" data-copy>' + UI.icon('link') + 'Copy link</button></div>';
    var body = UI.drawer('Call ' + c.id, html, { sub: esc(MCM.mask(c.from)) + ' - ' + T.dt(c.ts) });
    MCM.audit('View call', c.id);
    var playing = null, pos = 0, speed = 1, dur = c.talk + c.hold;
    body.onclick = function (e) {
      var t = e.target, el;
      if ((el = t.closest('[data-q]'))) { e.preventDefault(); drill.queue(el.dataset.q); }
      else if ((el = t.closest('[data-a]'))) { e.preventDefault(); drill.agent(el.dataset.a); }
      else if (t.closest('[data-savem]')) { saveMeta(c.id, { disp: $('[data-m=disp]', body).value, tags: $('[data-m=tags]', body).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), note: $('[data-m=note]', body).value }); MCM.audit('Call notes saved', c.id); UI.toast('Saved', { kind: 'ok', ms: 1500 }); }
      else if (t.closest('[data-play]')) {
        var btn = t.closest('[data-play]');
        if (playing) { clearInterval(playing); playing = null; btn.innerHTML = UI.icon('play'); return; }
        btn.innerHTML = UI.icon('pause'); playing = setInterval(function () { pos += speed; if (pos >= dur) { pos = 0; clearInterval(playing); playing = null; btn.innerHTML = UI.icon('play'); } paint(); }, 1000);
      }
      else if ((el = t.closest('[data-wave]'))) { var r = el.getBoundingClientRect(); pos = Math.round((e.clientX - r.left) / r.width * dur); paint(); }
      else if (t.closest('[data-dlrec]')) { MCM.audit('Recording download', c.id); UI.toast('Download logged. Connect a storage backend to serve audio files.', {}); }
      else if (t.closest('[data-copy]')) UI.copy(location.href.split('#')[0] + '#/calls/log?call=' + c.id);
      else if (t.closest('[data-eval]')) { UI.closeDrawer(true); MCM.go('quality', 'evaluations', { call: c.id }); }
      else if (t.closest('[data-cb]')) { MCM.callbacks.unshift({ id: 'cb' + Date.now(), kind: 'callback', q: c.q, from: c.from, created: Date.now(), due: Date.now() + 3600000, status: 'pending', agent: null, attempts: 0, dur: 0, note: 'From call ' + c.id }); MCM.saveCallbacks(); MCM.audit('Callback created', c.id); UI.toast('Callback scheduled in 1 hour', { kind: 'ok' }); }
    };
    body.onchange = function (e) { if (e.target.matches('[data-speed]')) speed = parseFloat(e.target.value); };
    body.oninput = function (e) { if (e.target.matches('[data-trq]')) { var q = e.target.value.toLowerCase(); body.querySelectorAll('[data-line]').forEach(function (l) { l.style.display = !q || l.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; }); } };
    function paint() { var ps = $('[data-pos]', body); if (ps) ps.textContent = f.dur(pos) + ' / ' + f.dur(dur); var n = 90, upto = Math.round(pos / dur * n); body.querySelectorAll('[data-b]').forEach(function (r) { r.setAttribute('fill', +r.dataset.b < upto ? 'var(--brand)' : 'var(--faint)'); }); }
    var dr = $('.drawer'); var obs = new MutationObserver(function () { if (!document.body.contains(dr)) { clearInterval(playing); obs.disconnect(); } }); obs.observe(document.body, { childList: true });
  };

  /* ---------- agent drawer ---------- */
  drill.agent = function (id) {
    var a = MCM.aById[id], R = MCM.F.resolve(), list = MCM.query({ agents: [id], queues: [], teams: [], channel: 'all', dir: 'all' }), st = MCM.agentStats(list, R).filter(function (x) { return x.agent.id === id; })[0], g = st.agg, la = MCM.live.agents[id], goals = MCM.goals;
    var sh = MCM.shift(a, MCM.TODAY), ev = MCM.evals.filter(function (x) { return x.agent === id; }).slice(-5).reverse(), co = MCM.coachSessions.filter(function (x) { return x.agent === id; }).slice(0, 4);
    var html = '<div style="display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:1.4rem">' + UI.status(la.status) + UI.tag(a.role, 'brand') + UI.tag(a.team) + UI.tag(a.site) + '<span class="muted">in status ' + f.dur((Date.now() - la.since) / 1000) + '</span></div>' +
      '<div class="grid g3">' + [['Handled', f.n(g.handled), null], ['AHT', f.dur(g.aht), g.aht && g.aht > goals.aht ? 'bad' : 'ok'], ['Occupancy', f.pct(st.occupancy, 0), st.occupancy > 90 ? 'warn' : ''], ['Adherence', f.pct(st.adherence, 1), st.adherence != null && st.adherence < goals.adherence ? 'bad' : 'ok'], ['QA score', g.qa != null ? f.dec(g.qa, 1) : '-', g.qa != null && g.qa < goals.qa ? 'warn' : 'ok'], ['CSAT', g.csat != null ? f.dec(g.csat, 2) : '-', g.csat != null && g.csat < goals.csat ? 'warn' : 'ok']].map(function (k) { return UI.kpi({ label: k[0], value: k[1], status: k[2] }); }).join('') + '</div>' +
      '<div class="grid g2 mt"><dl class="kv"><dt>Extension</dt><dd>' + a.ext + '</dd><dt>E-mail</dt><dd>' + esc(a.email) + '</dd><dt>Skills</dt><dd>' + a.skills.join(', ') + '</dd><dt>Queues</dt><dd>' + a.queues.map(function (q) { return '<a href="#" data-q="' + q + '">' + esc(MCM.qById[q].name) + '</a>'; }).join(', ') + '</dd></dl><dl class="kv"><dt>Period</dt><dd>' + esc(R.label) + '</dd><dt>Avg talk / hold / wrap</dt><dd>' + f.dur(g.avgTalk) + ' / ' + f.dur(g.avgHold) + ' / ' + f.dur(g.avgWrap) + '</dd><dt>Transfer rate</dt><dd>' + f.pct(g.xferRate) + '</dd><dt>Shrinkage</dt><dd>' + f.pct(st.shrink) + '</dd></dl></div>';
    html += '<h3 class="mt" style="margin-bottom:.8rem">Today\'s schedule</h3>' + (sh ? '<div class="tl">' + sh.items.map(function (it) { var w = (it.to - it.from) / (sh.end - sh.start) * 100; return '<i title="' + it.type + ' ' + T.time(it.from) + '-' + T.time(it.to) + '" style="width:' + w + '%;background:' + (it.type === 'work' ? 'var(--brand)' : it.type === 'break' ? '#7c3aed' : '#d97706') + '"></i>'; }).join('') + '</div><div class="muted" style="margin-top:.5rem">' + T.time(sh.start) + ' - ' + T.time(sh.end) + ' (blue = work, purple = break, orange = lunch)</div>' : '<div class="muted">Day off</div>');
    html += '<h3 class="mt" style="margin-bottom:.8rem">Calls per day</h3><div id="dr-ch"></div><h3 class="mt" style="margin-bottom:.8rem">Recent calls</h3><div id="dr-tbl" class="card flush"></div>';
    html += '<div class="grid g2 mt"><div><h3 style="margin-bottom:.8rem">Recent evaluations</h3>' + (ev.length ? ev.map(function (x) { return '<div style="display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--line2)"><span>' + T.dm(x.ts) + ' - ' + x.call + '</span><b>' + x.score + '</b></div>'; }).join('') : '<div class="muted">None</div>') + '</div><div><h3 style="margin-bottom:.8rem">Coaching</h3>' + (co.length ? co.map(function (x) { return '<div style="display:flex;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--line2)"><span>' + T.dm(x.ts) + ' - ' + esc(x.topic) + '</span>' + UI.tag(x.status, x.status === 'completed' ? 'ok' : '') + '</div>'; }).join('') : '<div class="muted">None</div>') + '</div></div>';
    if (MCM.can('supervise')) html += '<h3 class="mt" style="margin-bottom:.8rem">Supervisor controls</h3><div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:center"><select class="inp sm" data-force>' + UI.opts(Object.keys(MCM.STATUS).map(function (k) { return [k, MCM.STATUS[k][0]]; }), la.status) + '</select><button class="btn sm" data-setst>Set status</button><button class="btn sm danger" data-logout>Log agent out</button></div>';
    var body = UI.drawer(esc(a.name), html, { sub: 'Agent ' + a.ext + ' - ' + a.team });
    MCM.audit('View agent', a.name);
    var days = [], vals = [], now = MCM.TODAY; for (var d = 13; d >= 0; d--) { var ds = now - d * T.day, cl = MCM.query({ agents: [id], from: ds, to: ds + T.day, queues: [], teams: [], channel: 'all', dir: 'all' }); days.push(T.dm(ds)); vals.push(cl.length); }
    UI.chart($('#dr-ch', body), { type: 'bar', labels: days, series: [{ name: 'Calls', data: vals }], height: 16, legend: false });
    var recent = list.slice(-40).reverse();
    UI.table($('#dr-tbl', body), { id: 'drag', noun: 'calls', pageSize: 6, search: false, colChooser: false, rows: recent, onRow: function (r) { drill.call(r.id); }, cols: [{ k: 'ts', label: 'Time', html: function (r) { return T.dt(r.ts); }, val: function (r) { return r.ts; } }, { k: 'q', label: 'Queue', html: function (r) { return esc(MCM.qById[r.q].name); } }, { k: 'o', label: 'Outcome', html: outcomeTag, noSort: true }, { k: 't', label: 'Talk', r: 1, html: function (r) { return f.dur(r.talk); }, val: function (r) { return r.talk; } }] });
    body.onclick = function (e) { var t = e.target, el; if ((el = t.closest('[data-q]'))) { e.preventDefault(); drill.queue(el.dataset.q); } else if (t.closest('[data-setst]')) { var v = $('[data-force]', body).value; la.status = v; la.since = Date.now(); la.forced = v === 'dnd' || v === 'offline' || v === 'training'; la.call = null; MCM.audit('Force agent status', a.name + ' -> ' + v); UI.toast(a.name + ' set to ' + MCM.STATUS[v][0], { kind: 'ok' }); MCM.bus.emit('tick', MCM.live); } else if (t.closest('[data-logout]')) { la.status = 'offline'; la.forced = true; la.since = Date.now(); MCM.audit('Agent logged out', a.name); UI.toast(a.name + ' logged out', { kind: 'ok' }); } };
  };

  /* ---------- queue drawer ---------- */
  drill.queue = function (id) {
    var q = MCM.qById[id], R = MCM.F.resolve(), list = MCM.query({ queues: [id], teams: [], channel: 'all', dir: 'in' }), g = MCM.agg(list), lq = MCM.liveQueue(id, 15), step = MCM.stepFor(R), bk = MCM.buckets(list, R.from, R.to, step);
    var html = '<div style="display:flex;gap:.8rem;flex-wrap:wrap;margin-bottom:1.4rem">' + UI.tag('Ext ' + q.ext) + UI.tag(q.channel) + UI.tag(q.site) + UI.tag('SL goal ' + q.sl.target + '% in ' + q.sl.sec + 's', 'brand') + (q.active ? UI.tag('Active', 'ok') : UI.tag('Off', 'warn')) + '</div>' +
      '<div class="grid g3">' + [UI.kpi({ label: 'Offered', value: f.n(g.offered) }), UI.kpi({ label: 'Service level', value: f.pct(g.sl, 1), status: g.sl == null ? '' : UI.slClass(g.sl, q.sl.target), def: 'sl' }), UI.kpi({ label: 'ASA', value: f.dur(g.asa), status: g.asa > q.asaGoal ? 'warn' : 'ok', def: 'asa' }), UI.kpi({ label: 'Abandon rate', value: f.pct(g.abandonRate), status: g.abandonRate > q.abandonGoal ? 'bad' : 'ok', def: 'abandonRate' }), UI.kpi({ label: 'AHT', value: f.dur(g.aht), def: 'aht' }), UI.kpi({ label: 'Right now', value: lq.waiting + ' waiting', sub: lq.available + ' available / ' + lq.staffed + ' staffed' })].join('') + '</div>' +
      '<h3 class="mt" style="margin-bottom:.8rem">Volume and service level</h3><div id="dq-ch"></div><div class="grid g2 mt"><div><h3 style="margin-bottom:.8rem">Outcomes</h3><div id="dq-do"></div></div><div><h3 style="margin-bottom:.8rem">Abandon stage</h3><div id="dq-ab"></div></div></div><h3 class="mt" style="margin-bottom:.8rem">Agents in this queue</h3><div id="dq-ag" class="card flush"></div>' + (MCM.can('manage-queues') ? '<div style="margin-top:1.4rem"><button class="btn" data-go="settings/queues">Edit service-level goals</button></div>' : '');
    var body = UI.drawer(esc(q.name), html, { sub: 'Queue ' + q.ext + ' - ' + esc(R.label) }); MCM.audit('View queue', q.name);
    UI.chart($('#dq-ch', body), { type: 'bar', labels: bk.map(function (b) { return step >= T.day ? T.dm(b.t) : T.time(b.t); }), series: [{ name: 'Offered', data: bk.map(function (b) { return b.agg.offered; }), color: 'var(--c2)' }, { name: 'Service level %', axis: 'r', type: 'line', color: 'var(--c3)', data: bk.map(function (b) { return b.agg.sl == null ? null : +b.agg.sl.toFixed(1); }), fmt: function (v) { return f.pct(v); } }], fmt2: function (v) { return v.toFixed(0) + '%' }, height: 18 });
    UI.donut($('#dq-do', body), { items: [{ name: 'Answered', value: g.answered, color: 'var(--c3)' }, { name: 'Abandoned', value: g.abandoned, color: 'var(--c5)' }, { name: 'Voicemail', value: g.voicemail, color: 'var(--c4)' }], center: { v: f.pct(g.answerRate, 0), l: 'answered' } });
    $('#dq-ab', body).innerHTML = UI.hbars([{ label: 'In IVR', value: g.ivrAb }, { label: 'In queue', value: g.qAb }, { label: 'While ringing', value: g.rAb }], {});
    var by = MCM.groupBy(list.filter(function (c) { return c.agent; }), function (c) { return c.agent; }), rows = Object.keys(by).map(function (k) { return { a: MCM.aById[k], g: MCM.agg(by[k]) }; });
    UI.table($('#dq-ag', body), { id: 'dqag', noun: 'agents', pageSize: 6, search: false, colChooser: false, rows: rows, sort: 'h', onRow: function (r) { drill.agent(r.a.id); }, cols: [{ k: 'n', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b>'; }, val: function (r) { return r.a.name; } }, { k: 'h', label: 'Handled', r: 1, html: function (r) { return f.n(r.g.handled); }, val: function (r) { return r.g.handled; } }, { k: 'aht', label: 'AHT', r: 1, html: function (r) { return f.dur(r.g.aht); }, val: function (r) { return r.g.aht; } }, { k: 'cs', label: 'CSAT', r: 1, html: function (r) { return f.dec(r.g.csat, 2); }, val: function (r) { return r.g.csat; } }] });
    body.onclick = function (e) { var el; if ((el = e.target.closest('[data-go]'))) { UI.closeDrawer(true); MCM.go('settings', 'queues'); } };
  };

  /* ---------- helper for pages: compact call table columns ---------- */
  drill.callCols = function () {
    return [
      { k: 'ts', label: 'Time', html: function (r) { return '<b>' + T.dt(r.ts) + '</b>'; }, val: function (r) { return r.ts; } },
      { k: 'id', label: 'Call ID', html: function (r) { return '<span class="mono">' + r.id + '</span>'; }, val: function (r) { return r.id; } },
      { k: 'dir', label: 'Dir', html: function (r) { return r.dir === 'in' ? 'In' : 'Out'; }, val: function (r) { return r.dir; } },
      { k: 'from', label: 'Number', html: function (r) { return esc(MCM.mask(r.from)); }, val: function (r) { return r.from; } },
      { k: 'q', label: 'Queue', html: function (r) { return esc(MCM.qById[r.q].name); }, val: function (r) { return MCM.qById[r.q].name; } },
      { k: 'ag', label: 'Agent', html: function (r) { return r.agent ? esc(MCM.aById[r.agent].name) : '<span class="faint">-</span>'; }, val: function (r) { return r.agent ? MCM.aById[r.agent].name : ''; } },
      { k: 'out', label: 'Outcome', html: outcomeTag, val: function (r) { return r.outcome; } },
      { k: 'wait', label: 'Wait', r: 1, html: function (r) { return f.dur(r.wait); }, val: function (r) { return r.wait; } },
      { k: 'talk', label: 'Talk', r: 1, html: function (r) { return f.dur(r.talk); }, val: function (r) { return r.talk; } },
      { k: 'disp', label: 'Disposition', html: function (r) { return esc(r.disp || '-'); }, val: function (r) { return r.disp || ''; } },
      { k: 'sent', label: 'Sentiment', r: 1, html: function (r) { return r.sent == null ? '-' : '<span class="' + (r.sent > .15 ? 'ok-t' : r.sent < -.15 ? 'bad-t' : '') + '">' + f.dec(r.sent, 2) + '</span>'; }, val: function (r) { return r.sent; } },
      { k: 'csat', label: 'CSAT', r: 1, html: function (r) { return r.csat || '-'; }, val: function (r) { return r.csat; } }
    ];
  };
})();
