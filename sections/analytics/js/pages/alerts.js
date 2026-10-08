/* Alerts - active alerts (ack / mute / resolve / open), rule builder with test, history with MTTA / MTTR and notification settings.
   The engine lives in data.js (MCM.evalAlerts); this page only reads/edits MCM.alertRules and MCM.alerts. */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc;
  var SUGGEST = {
    sl: 'Check staffing for this queue: pull agents out of wrap-up or break, or enable overflow to a sister queue.',
    longest: 'Escalate the oldest waiting caller, add agents to the queue and consider offering callbacks.',
    waiting: 'Queue is building up: ask supervisors to take calls, move cross-skilled agents in, enable callbacks.',
    noagents: 'Nobody is available: contact the supervisor, request overtime or route to the fallback queue.',
    abandon: 'Review wait times and IVR messaging; check for a staffing gap in the last 15 minutes.',
    adherence: 'Coach the agent on schedule adherence and check the explanation log in WFM.',
    occupancy: 'Agents are saturated: add capacity or reduce wrap-up time to avoid burnout.'
  };
  var CHANNELS = [['toast', 'In-app toast'], ['email', 'E-mail'], ['sms', 'SMS'], ['webhook', 'Webhook']];
  function minfo(key) { return MCM.ALERT_METRICS.filter(function (m) { return m[0] === key; })[0] || [key, key, '', '>', 0]; }
  function fmtV(metric, v) { var m = minfo(metric); return v == null ? '-' : f.dec(v, m[2] === '%' ? 1 : 0) + (m[2] ? (m[2] === 's' ? ' s' : m[2]) : ''); }
  function me() { return (MCM.aById[MCM.user.id] || {}).name || MCM.user.role; }
  function canA() { return MCM.can('alerts'); }
  function scopeLabel(s) { return s === 'all' ? 'All voice queues' : s === 'agents' ? 'Agents (today)' : (MCM.qById[s] || {}).name || s; }
  function nid() { return 'r' + Date.now().toString(36) + Math.floor(Math.random() * 100); }
  function clearExpired() {
    var now = Date.now(), ch = false;
    MCM.alertRules.forEach(function (r) { if (r.mutedUntil && r.mutedUntil <= now) { r.muted = false; delete r.mutedUntil; ch = true; } });
    if (ch) MCM.saveAlertRules(); return ch;
  }
  /* current value of a metric for one scope id (mirrors the engine in data.js) */
  function curValue(rule, sid) {
    if (rule.scope === 'agents') return MCM.adherence(MCM.aById[sid], MCM.TODAY).pct;
    var lq = MCM.liveQueue(sid, 15);
    switch (rule.metric) {
      case 'sl': return lq.agg.sl; case 'longest': return lq.longest; case 'waiting': return lq.waiting; case 'noagents': return lq.available;
      case 'abandon': return lq.agg.offered >= 5 ? lq.agg.abandonRate : null;
      case 'occupancy': { var tot = 0, n = 0; MCM.agents.forEach(function (a) { if (a.queues.indexOf(sid) < 0) return; var s = MCM.live.agents[a.id].status; if (s !== 'offline') { n++; if (s === 'on_call' || s === 'wrap') tot++; } }); return n ? tot / n * 100 : null; }
    } return null;
  }
  function testRule(rule) {
    var scopes = rule.scope === 'all' ? MCM.queues.filter(function (q) { return q.active && q.channel === 'voice'; }).map(function (q) { return q.id; }) : rule.scope === 'agents' ? MCM.agents.filter(function (a) { return a.role === 'Agent' && MCM.live.agents[a.id].status !== 'offline'; }).map(function (a) { return a.id; }) : [rule.scope];
    var rows = scopes.map(function (sid) { var v = curValue(rule, sid), fire = v != null && (rule.op === '<' ? v < rule.value : v > rule.value); return { sid: sid, name: rule.scope === 'agents' ? MCM.aById[sid].name : (MCM.qById[sid] || {}).name, v: v, fire: fire }; });
    var n = rows.filter(function (r) { return r.fire; }).length;
    return '<p style="margin-bottom:1rem"><b>' + esc(rule.name || 'Rule') + '</b>: ' + esc(minfo(rule.metric)[1]) + ' ' + esc(rule.op) + ' ' + esc(rule.value) + esc(minfo(rule.metric)[2]) + '</p>' +
      '<div class="note ' + (n ? 'warn' : '') + '" style="margin-bottom:1rem">' + UI.icon('info') + '<span>' + (n ? 'Would fire right now for <b>' + n + '</b> of ' + rows.length + ' scope(s).' : 'Would not fire right now (' + rows.length + ' scope(s) checked).') + '</span></div>' +
      '<div class="tw"><table class="t"><thead><tr><th>Scope</th><th class="r">Current value</th><th>Result</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td><b>' + esc(r.name) + '</b></td><td class="r">' + fmtV(rule.metric, r.v) + '</td><td>' + (r.v == null ? UI.tag('No data') : r.fire ? UI.tag('Would fire', 'bad') : UI.tag('OK', 'ok')) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function openTarget(al) { if (MCM.qById[al.scope]) MCM.drill.queue(al.scope); else if (MCM.aById[al.scope]) MCM.drill.agent(al.scope); }
  function sevTag(s) { return UI.tag(s, s === 'high' ? 'bad' : s === 'medium' ? 'warn' : 'info'); }
  function prefs() {
    var p = MCM.store.get('alertPrefs', null);
    if (!p) p = { sev: { high: { toast: true, email: true, sms: true, webhook: true }, medium: { toast: true, email: true, sms: false, webhook: false }, low: { toast: true, email: false, sms: false, webhook: false } }, quiet: { on: false, from: '22:00', to: '07:00' } };
    return p;
  }
  /* deterministic back-fill for the 14-day chart (demo) */
  function backfill() {
    var out = {}, rules = MCM.alertRules;
    for (var d = 13; d >= 1; d--) {
      var ds = MCM.TODAY - d * T.day, r = MCM.rng(7000 + Math.floor(ds / 86400000)), day = [];
      rules.forEach(function (rule, i) { var w = [1.6, 1.2, 1.0, .35, 1.3, .5][i % 6], n = Math.floor(r() * 3 * w + r() * .6); if (n > 0) day.push({ rule: rule.id, name: rule.name, sev: rule.sev, n: n }); });
      out[ds] = day;
    }
    return out;
  }

  MCM.page({
    id: 'alerts', title: 'Alerts', icon: 'alerts', filters: ['date'], roles: ['Admin', 'Supervisor', 'Coach', 'Read-only'], autoRefresh: false,
    tabs: [['active', 'Active'], ['rules', 'Rules'], ['history', 'History']],
    render: function (ctx) {
      var tab = ctx.tab, el = ctx.el, R = ctx.R, can = canA();
      clearExpired();
      var note = can ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + MCM.user.role + ') can view alerts but not acknowledge, mute or edit rules.</div>';
      function onChange(selector, fn) { el.addEventListener('change', function (e) { var t = e.target.closest(selector); if (t) fn(t, e); }); }
      ctx.sub('alerts', function () { if (!document.querySelector('.modal,.pop') && !(document.activeElement && /input|textarea|select/i.test(document.activeElement.tagName))) ctx.refresh(); });
      ctx.every(10000, function () { if (clearExpired() && !document.querySelector('.modal')) ctx.refresh(); });

      /* ================= ACTIVE ================= */
      if (tab === 'active') {
        var rule = function (id) { return MCM.alertRules.filter(function (r) { return r.id === id; })[0]; };
        var actRows = function () { return MCM.alerts.filter(function (a) { return !a.resolved; }); };
        var act = actRows(), recent = MCM.alerts.filter(function (a) { return a.resolved && a.resolvedTs > Date.now() - 6 * 3600000; }).slice(0, 8);
        var hi = act.filter(function (a) { return a.sev === 'high'; }).length, un = act.filter(function (a) { return !a.ack; }).length, mutedN = MCM.alertRules.filter(function (r) { return r.muted; }).length;
        el.innerHTML = note + '<div class="grid g4">' + [
          UI.kpi({ label: 'Active alerts', value: act.length, status: act.length ? 'warn' : 'ok', sub: 'unresolved' }),
          UI.kpi({ label: 'High severity', value: hi, status: hi ? 'bad' : 'ok' }),
          UI.kpi({ label: 'Not acknowledged', value: un, status: un ? 'warn' : 'ok' }),
          UI.kpi({ label: 'Muted rules', value: mutedN, sub: mutedN ? 'notifications suppressed' : 'none' })
        ].join('') + '</div>' +
          '<div class="mt">' + UI.card('Active alerts', '<div id="aa"></div>', { flush: true, sub: 'Live: new alerts appear automatically. Click a row to open the queue or agent.', acts: can && un ? '<button class="btn sm" data-aackall>' + UI.icon('check') + 'Acknowledge all</button>' : '' }) + '</div>' +
          '<div class="mt">' + UI.card('Recently resolved (6 h)', recent.length ? '<ul class="plain" style="font-size:1.2rem">' + recent.map(function (a) { return '<li>' + UI.tag('resolved', 'ok') + ' <b>' + esc(a.ruleName) + '</b> - ' + esc(a.scopeName) + ' <span class="muted">' + f.ago(a.resolvedTs) + ' (lasted ' + f.dur((a.resolvedTs - a.ts) / 1000) + ')' + (a.resolvedBy ? ' - manual' : '') + '</span></li>'; }).join('') + '</ul>' : UI.empty('Nothing resolved recently')) + '</div>';
        var tbl = UI.table(document.getElementById('aa'), {
          id: 'alact', noun: 'alerts', csv: 'active-alerts', pageSize: 10, rows: act, sort: 'ts', dir: 'desc', onRow: openTarget, emptyTitle: 'No active alerts', emptySub: 'All monitored metrics are within thresholds.',
          cols: [
            { k: 'sev', label: 'Severity', html: function (a) { return sevTag(a.sev); }, val: function (a) { return { high: 3, medium: 2, low: 1 }[a.sev]; }, csv: function (a) { return a.sev; } },
            { k: 'rule', label: 'Rule', html: function (a) { return '<b>' + esc(a.ruleName) + '</b>'; }, val: function (a) { return a.ruleName; } },
            { k: 'scope', label: 'Scope', html: function (a) { return esc(a.scopeName); }, val: function (a) { return a.scopeName; } },
            { k: 'val', label: 'Current vs threshold', html: function (a) { return '<b class="bad-t">' + fmtV(a.metric, a.value) + '</b> <span class="muted">' + esc(a.op) + ' ' + fmtV(a.metric, a.threshold) + '</span>'; }, val: function (a) { return Math.round(a.value * 10) / 10; }, csv: function (a) { return fmtV(a.metric, a.value) + ' (threshold ' + a.op + ' ' + a.threshold + ')'; } },
            { k: 'ts', label: 'Since', html: function (a) { return T.time(a.ts) + ' <span class="muted" data-since="' + a.ts + '">' + f.dur((Date.now() - a.ts) / 1000) + '</span>'; }, val: function (a) { return a.ts; }, csv: function (a) { return T.dt(a.ts); } },
            { k: 'st', label: 'Status', html: function (a) { var r = rule(a.rule); return (a.ack ? UI.tag('Acknowledged', 'info') : UI.tag('New', 'warn')) + (r && r.muted ? ' ' + UI.tag('Muted' + (r.mutedUntil ? ' until ' + T.time(r.mutedUntil) : ''), '') : ''); }, val: function (a) { return a.ack ? 'Acknowledged' : 'New'; } },
            { k: 'sug', label: 'Suggested action', html: function (a) { return '<div style="white-space:normal;min-width:22rem;line-height:1.35">' + esc(SUGGEST[a.metric] || 'Investigate the affected queue.') + '</div>'; }, val: function (a) { return SUGGEST[a.metric] || ''; } },
            { k: 'act', label: '', noSort: true, noCsv: true, html: function (a) { var r = rule(a.rule); return '<div style="display:flex;gap:.5rem">' + (can ? (a.ack ? '' : '<button class="btn xs" data-aack="' + a.id + '">Ack</button>') + (r && r.muted ? '<button class="btn xs" data-aunmute="' + a.rule + '">Unmute</button>' : '<button class="btn xs" data-amute="' + a.rule + '">Mute</button>') + '<button class="btn xs" data-ares="' + a.id + '">Resolve</button>' : '') + '<button class="btn xs" data-aopen="' + a.id + '">Open</button></div>'; } }
          ]
        });
        function find(id) { return MCM.alerts.filter(function (a) { return a.id === id; })[0]; }
        ctx.on('[data-aack]', function (e, b) { if (!can) return MCM.deny('acknowledge alerts'); var a = find(b.dataset.aack); if (!a) return; a.ack = true; a.ackBy = me(); a.ackTs = Date.now(); MCM.saveAlerts(); MCM.audit('Alert acknowledged', a.ruleName + ' - ' + a.scopeName); MCM.bus.emit('alerts'); });
        ctx.on('[data-aackall]', function () { if (!can) return MCM.deny('acknowledge alerts'); var n = 0; MCM.alerts.forEach(function (a) { if (!a.resolved && !a.ack) { a.ack = true; a.ackBy = me(); a.ackTs = Date.now(); n++; } }); MCM.saveAlerts(); MCM.audit('Alerts acknowledged', n + ' alerts'); MCM.bus.emit('alerts'); });
        ctx.on('[data-aopen]', function (e, b) { var a = find(b.dataset.aopen); if (a) openTarget(a); });
        ctx.on('[data-ares]', function (e, b) {
          if (!can) return MCM.deny('resolve alerts'); var a = find(b.dataset.ares); if (!a) return;
          UI.confirm('Resolve "' + esc(a.ruleName) + '" for ' + esc(a.scopeName) + ' manually? If the condition is still true the engine will raise it again within seconds - mute the rule instead to silence it.', 'Resolve').then(function (ok) {
            if (!ok) return; a.resolved = true; a.resolvedTs = Date.now(); a.resolvedBy = me(); if (!a.ack) { a.ack = true; a.ackBy = me(); a.ackTs = a.resolvedTs; } MCM.saveAlerts(); MCM.audit('Alert resolved manually', a.ruleName + ' - ' + a.scopeName); MCM.bus.emit('alerts');
          });
        });
        ctx.on('[data-aunmute]', function (e, b) { if (!can) return MCM.deny('change rules'); var r = rule(b.dataset.aunmute); if (!r) return; r.muted = false; delete r.mutedUntil; MCM.saveAlertRules(); MCM.audit('Rule unmuted', r.name); ctx.refresh(); });
        ctx.on('[data-amute]', function (e, b) {
          if (!can) return MCM.deny('mute rules'); var r = rule(b.dataset.amute); if (!r) return;
          UI.pop(b, '<div class="hd">Mute "' + esc(r.name) + '"</div><button class="it" data-mm="30">For 30 minutes</button><button class="it" data-mm="day">Until tomorrow</button>', function (pop) {
            pop.onclick = function (ev) { var x = ev.target.closest('[data-mm]'); if (!x) return; r.muted = true; r.mutedUntil = x.dataset.mm === '30' ? Date.now() + 30 * 60000 : T.sod(Date.now()) + T.day; MCM.saveAlertRules(); MCM.audit('Rule muted', r.name + ' until ' + T.dt(r.mutedUntil)); UI.closePop(); UI.toast('Muted until ' + T.time(r.mutedUntil), { kind: 'ok' }); ctx.refresh(); };
          });
        });
        ctx.every(1000, function () { Array.prototype.forEach.call(el.querySelectorAll('[data-since]'), function (s) { s.textContent = f.dur((Date.now() - +s.dataset.since) / 1000); }); });
        ctx.every(5000, function () { if (!document.querySelector('.modal,.pop')) tbl.setRows(actRows()); });
      }

      /* ================= RULES ================= */
      else if (tab === 'rules') {
        var P = prefs();
        el.innerHTML = note + UI.card('Alert rules', '<div id="ar"></div>', { flush: true, sub: 'Rules are evaluated every 5 seconds against live queue metrics. E-mail, SMS and webhook delivery ' + UI.preview() + ' - only in-app toasts are real.', acts: can ? '<button class="btn pri sm" data-rnew>' + UI.icon('plus') + 'New rule</button>' : '' }) +
          '<div class="mt">' + UI.card('Notification settings', '<div id="ap"></div>', { sub: 'Per-severity channels and quiet hours. Saved in this browser ' + UI.preview() }) + '</div>';
        UI.table(document.getElementById('ar'), {
          id: 'alrules', noun: 'rules', csv: 'alert-rules', pageSize: 12, rows: MCM.alertRules, sort: 'name', dir: 'asc',
          cols: [
            { k: 'name', label: 'Rule', html: function (r) { return '<b>' + esc(r.name) + '</b>'; }, val: function (r) { return r.name; } },
            { k: 'cond', label: 'Condition', html: function (r) { return esc(minfo(r.metric)[1]) + ' <b>' + esc(r.op) + ' ' + esc(r.value) + esc(minfo(r.metric)[2]) + '</b>'; }, val: function (r) { return minfo(r.metric)[1] + ' ' + r.op + ' ' + r.value; } },
            { k: 'scope', label: 'Scope', html: function (r) { return esc(scopeLabel(r.scope)); }, val: function (r) { return scopeLabel(r.scope); } },
            { k: 'sev', label: 'Severity', html: function (r) { return sevTag(r.sev); }, val: function (r) { return r.sev; } },
            { k: 'mode', label: 'Mode', html: function (r) { return UI.tag(r.mode); }, val: function (r) { return r.mode; } },
            { k: 'notify', label: 'Notify', html: function (r) { return (r.notify || []).map(function (n) { return UI.tag(n); }).join(' '); }, val: function (r) { return (r.notify || []).join('+'); } },
            { k: 'muted', label: 'Muted', html: function (r) { return r.muted ? UI.tag(r.mutedUntil ? 'until ' + T.time(r.mutedUntil) : 'muted', 'warn') : '<span class="faint">-</span>'; }, val: function (r) { return r.muted ? 'yes' : 'no'; } },
            { k: 'en', label: 'Enabled', html: function (r) { return UI.sw(r.enabled, 'data-ren="' + r.id + '"' + (can ? '' : ' disabled')); }, val: function (r) { return r.enabled ? 'yes' : 'no'; } },
            { k: 'act', label: '', noSort: true, noCsv: true, html: function (r) { return '<div style="display:flex;gap:.5rem"><button class="btn xs" data-rtest="' + r.id + '">Test</button>' + (can ? '<button class="btn xs" data-redit="' + r.id + '">Edit</button><button class="btn xs" data-rdup="' + r.id + '">Duplicate</button><button class="btn xs danger" data-rdel="' + r.id + '">Delete</button>' : '') + '</div>'; } }
          ]
        });
        /* notification settings */
        var ph = '<div class="tw"><table class="t"><thead><tr><th>Severity</th>' + CHANNELS.map(function (c) { return '<th class="r">' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>' + ['high', 'medium', 'low'].map(function (s) { return '<tr><td>' + sevTag(s) + '</td>' + CHANNELS.map(function (c) { return '<td class="r"><input type="checkbox" data-pref="' + s + ':' + c[0] + '"' + (P.sev[s][c[0]] ? ' checked' : '') + (can ? '' : ' disabled') + '></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
          '<div class="fg c3 mt" style="align-items:end"><label>Quiet hours<span style="display:flex;gap:1rem;align-items:center">' + UI.sw(P.quiet.on, 'data-quiet' + (can ? '' : ' disabled')) + '<span class="muted">' + (P.quiet.on ? 'on' : 'off') + '</span></span></label><label>From<input type="time" class="inp" data-qfrom value="' + P.quiet.from + '"' + (can ? '' : ' disabled') + '></label><label>To<input type="time" class="inp" data-qto value="' + P.quiet.to + '"' + (can ? '' : ' disabled') + '></label></div><div class="muted mt" style="font-size:1.1rem">During quiet hours only high-severity alerts are delivered (demo setting).</div>';
        document.getElementById('ap').innerHTML = ph;
        function savePrefs(what) { MCM.store.set('alertPrefs', P); MCM.audit('Notification settings changed', what); }
        onChange('[data-pref]', function (t) { if (!can) { t.checked = !t.checked; return MCM.deny('change notification settings'); } var k = t.dataset.pref.split(':'); P.sev[k[0]][k[1]] = t.checked; savePrefs(k[0] + ' ' + k[1] + '=' + t.checked); });
        onChange('[data-qfrom]', function (t) { P.quiet.from = t.value; savePrefs('quiet from ' + t.value); });
        onChange('[data-qto]', function (t) { P.quiet.to = t.value; savePrefs('quiet to ' + t.value); });
        ctx.on('[data-quiet]', function (e, b) { if (!can) return MCM.deny('change notification settings'); P.quiet.on = !P.quiet.on; savePrefs('quiet hours ' + (P.quiet.on ? 'on' : 'off')); ctx.refresh(); });

        function get(id) { return MCM.alertRules.filter(function (r) { return r.id === id; })[0]; }
        ctx.on('[data-ren]', function (e, b) { if (!can) return MCM.deny('change rules'); var r = get(b.dataset.ren); r.enabled = !r.enabled; MCM.saveAlertRules(); MCM.audit('Rule ' + (r.enabled ? 'enabled' : 'disabled'), r.name); ctx.refresh(); });
        ctx.on('[data-rtest]', function (e, b) { UI.modal({ title: 'Test rule', body: testRule(get(b.dataset.rtest)), foot: [{ label: 'Close', pri: true }] }); });
        ctx.on('[data-rdup]', function (e, b) { if (!can) return MCM.deny('change rules'); var r = get(b.dataset.rdup), c = JSON.parse(JSON.stringify(r)); c.id = nid(); c.name = r.name + ' (copy)'; c.muted = false; delete c.mutedUntil; MCM.alertRules.push(c); MCM.saveAlertRules(); MCM.audit('Rule duplicated', r.name); ctx.refresh(); });
        ctx.on('[data-rdel]', function (e, b) { if (!can) return MCM.deny('delete rules'); var r = get(b.dataset.rdel); UI.confirm('Delete rule "' + esc(r.name) + '"? Existing alerts stay in history.', 'Delete').then(function (ok) { if (!ok) return; MCM.alertRules.splice(MCM.alertRules.indexOf(r), 1); MCM.saveAlertRules(); MCM.audit('Rule deleted', r.name); ctx.refresh(); }); });
        ctx.on('[data-rnew]', function () { if (!can) return MCM.deny('create rules'); builder(null); });
        ctx.on('[data-redit]', function (e, b) { if (!can) return MCM.deny('edit rules'); builder(get(b.dataset.redit)); });

        function builder(rule) {
          var isNew = !rule, r = rule ? JSON.parse(JSON.stringify(rule)) : { id: nid(), name: '', metric: 'sl', op: '<', value: 80, scope: 'all', sev: 'medium', mode: 'instant', notify: ['toast'], muted: false, enabled: true };
          var scopes = [['all', 'All voice queues']].concat(MCM.queues.map(function (q) { return [q.id, q.name]; })).concat([['agents', 'Agents (today adherence)']]);
          var body = '<div class="fg c2"><label style="grid-column:1/3">Name<input class="inp" data-b="name" value="' + esc(r.name) + '" placeholder="e.g. Service level low"></label>' +
            '<label>Metric<select class="inp" data-b="metric">' + UI.opts(MCM.ALERT_METRICS.map(function (m) { return [m[0], m[1] + (m[2] ? ' (' + m[2] + ')' : '')]; }), r.metric) + '</select></label>' +
            '<label>Scope<select class="inp" data-b="scope">' + UI.opts(scopes, r.scope) + '</select></label>' +
            '<label>Operator<select class="inp" data-b="op">' + UI.opts([['<', 'is below (<)'], ['>', 'is above (>)']], r.op) + '</select></label>' +
            '<label>Threshold<input class="inp" type="number" data-b="value" value="' + r.value + '"></label>' +
            '<label>Severity<select class="inp" data-b="sev">' + UI.opts(['high', 'medium', 'low'], r.sev) + '</select></label>' +
            '<label>Mode<select class="inp" data-b="mode">' + UI.opts([['instant', 'Instant (fire immediately)'], ['interval', 'Interval (sustained over the window)']], r.mode) + '</select></label></div>' +
            '<div class="fg mt"><label>Notify</label><div style="display:flex;gap:1.6rem;flex-wrap:wrap">' + CHANNELS.map(function (c) { return '<label style="display:flex;gap:.6rem;align-items:center;font-weight:500"><input type="checkbox" data-bn="' + c[0] + '"' + (r.notify.indexOf(c[0]) >= 0 ? ' checked' : '') + '> ' + c[1] + '</label>'; }).join('') + '</div><label style="display:flex;gap:.8rem;align-items:center;font-weight:500"><input type="checkbox" data-b="enabled"' + (r.enabled ? ' checked' : '') + '> Rule enabled</label></div>' +
            '<div class="muted mt" style="font-size:1.1rem">Agent scope always evaluates today\'s adherence. Interval mode is stored; the demo engine evaluates all rules every 5 seconds.</div><div id="btest" class="mt"></div>';
          function read(m) {
            var o = Object.assign({}, r); m.querySelectorAll('[data-b]').forEach(function (i) { var k = i.dataset.b; o[k] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; });
            o.notify = Array.prototype.slice.call(m.querySelectorAll('[data-bn]:checked')).map(function (i) { return i.dataset.bn; }); return o;
          }
          UI.modal({
            title: isNew ? 'New alert rule' : 'Edit rule', body: body,
            onOpen: function (m) {
              m.onchange = function (e) {
                var t = e.target.closest('[data-b]'); if (!t) return;
                if (t.dataset.b === 'metric') { var mi = minfo(t.value); m.querySelector('[data-b="op"]').value = mi[3]; m.querySelector('[data-b="value"]').value = mi[4]; m.querySelector('[data-b="scope"]').value = t.value === 'adherence' ? 'agents' : (m.querySelector('[data-b="scope"]').value === 'agents' ? 'all' : m.querySelector('[data-b="scope"]').value); }
                if (t.dataset.b === 'scope') { if (t.value === 'agents') m.querySelector('[data-b="metric"]').value = 'adherence'; else if (m.querySelector('[data-b="metric"]').value === 'adherence') { var mm = minfo('sl'); m.querySelector('[data-b="metric"]').value = 'sl'; m.querySelector('[data-b="op"]').value = mm[3]; m.querySelector('[data-b="value"]').value = mm[4]; } }
              };
            },
            foot: [{ label: 'Cancel' }, { label: 'Test rule', fn: function (m) { m.querySelector('#btest').innerHTML = testRule(read(m)); return false; } }, {
              label: 'Save rule', pri: true, fn: function (m) {
                var o = read(m); if (!o.name.trim()) { UI.toast('Give the rule a name', { kind: 'bad' }); return false; } if (isNaN(o.value)) { UI.toast('Enter a numeric threshold', { kind: 'bad' }); return false; }
                o.name = o.name.trim(); if (isNew) MCM.alertRules.push(o); else { MCM.alertRules[MCM.alertRules.indexOf(rule)] = o; }
                MCM.saveAlertRules(); MCM.audit(isNew ? 'Rule created' : 'Rule edited', o.name + ' (' + o.metric + ' ' + o.op + ' ' + o.value + ', ' + o.scope + ')'); UI.toast('Rule saved', { kind: 'ok' }); setTimeout(ctx.refresh, 0);
              }
            }]
          });
        }
      }

      /* ================= HISTORY ================= */
      else if (tab === 'history') {
        var all = MCM.alerts.filter(function (a) { return a.ts >= R.from && a.ts < R.to; }), BF = backfill(), days = [];
        for (var d = 13; d >= 0; d--) days.push(MCM.TODAY - d * T.day);
        function cnt(ds, sev) { return MCM.alerts.filter(function (a) { return a.ts >= ds && a.ts < ds + T.day && a.sev === sev; }).length; }
        var demoDay = days.map(function (ds) { return (BF[ds] || []).reduce(function (s, x) { return s + x.n; }, 0); });
        var ackd = all.filter(function (a) { return a.ackTs; }), resd = all.filter(function (a) { return a.resolved && a.resolvedTs; });
        var mtta = ackd.length ? ackd.reduce(function (s, a) { return s + (a.ackTs - a.ts); }, 0) / ackd.length / 1000 : null, mttr = resd.length ? resd.reduce(function (s, a) { return s + (a.resolvedTs - a.ts); }, 0) / resd.length / 1000 : null;
        var demoMtta = 4.2 * 60, demoMttr = 18 * 60;
        var noisy = {}; MCM.alerts.forEach(function (a) { if (a.ts >= MCM.TODAY - 13 * T.day) noisy[a.ruleName] = (noisy[a.ruleName] || 0) + 1; }); Object.keys(BF).forEach(function (k) { BF[k].forEach(function (x) { noisy[x.name] = (noisy[x.name] || 0) + x.n; }); });
        var nz = Object.keys(noisy).map(function (k) { return { label: k, value: noisy[k] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 6);
        el.innerHTML = note + '<div class="grid g4">' + [
          UI.kpi({ label: 'Alerts in range', value: all.length, sub: R.label }),
          UI.kpi({ label: 'Still active', value: all.filter(function (a) { return !a.resolved; }).length, sub: all.filter(function (a) { return a.sev === 'high'; }).length + ' high severity' }),
          UI.kpi({ label: 'Mean time to acknowledge', value: mtta != null ? f.dur(mtta) : f.dur(demoMtta), sub: mtta != null ? ackd.length + ' acknowledged' : 'no real data yet - demo estimate', status: mtta == null ? '' : mtta > 600 ? 'warn' : 'ok' }),
          UI.kpi({ label: 'Mean time to resolve', value: mttr != null ? f.dur(mttr) : f.dur(demoMttr), sub: mttr != null ? resd.length + ' resolved' : 'no real data yet - demo estimate' })
        ].join('') + '</div>' +
          '<div class="grid g21 mt">' + UI.card('Alerts by day (14 days)', '<div id="hc"></div>', { sub: 'Grey bars are back-filled demo history (seeded, deterministic) - ' + UI.preview() + ' Real alerts raised in this browser are stacked by severity.' }) + UI.card('Top noisy rules', '<div id="hn"></div>', { sub: '14 days, includes demo back-fill' }) + '</div>' +
          '<div class="mt">' + UI.card('Alert log', '<div id="ht"></div>', { flush: true, sub: 'Real alerts only (' + R.label + ').' }) + '</div>';
        UI.chart(document.getElementById('hc'), { type: 'stack', height: 22, labels: days.map(function (d) { return T.dm(d); }), series: [{ name: 'Demo back-fill', color: 'var(--faint)', data: demoDay }, { name: 'High', color: 'var(--c5)', data: days.map(function (d) { return cnt(d, 'high'); }) }, { name: 'Medium', color: 'var(--c4)', data: days.map(function (d) { return cnt(d, 'medium'); }) }, { name: 'Low', color: 'var(--c2)', data: days.map(function (d) { return cnt(d, 'low'); }) }] });
        document.getElementById('hn').innerHTML = nz.length ? UI.hbars(nz) : UI.empty('No alerts');
        UI.table(document.getElementById('ht'), {
          id: 'alhist', noun: 'alerts', csv: 'alert-history', pageSize: 12, rows: all, sort: 'ts', dir: 'desc', onRow: openTarget,
          cols: [
            { k: 'ts', label: 'Raised', html: function (a) { return T.dt(a.ts); }, val: function (a) { return a.ts; } },
            { k: 'sev', label: 'Severity', html: function (a) { return sevTag(a.sev); }, val: function (a) { return a.sev; } },
            { k: 'rule', label: 'Rule', html: function (a) { return '<b>' + esc(a.ruleName) + '</b>'; }, val: function (a) { return a.ruleName; } },
            { k: 'scope', label: 'Scope', html: function (a) { return esc(a.scopeName); }, val: function (a) { return a.scopeName; } },
            { k: 'val', label: 'Value', r: 1, html: function (a) { return fmtV(a.metric, a.value) + ' <span class="muted">' + esc(a.op) + ' ' + fmtV(a.metric, a.threshold) + '</span>'; }, val: function (a) { return Math.round(a.value * 10) / 10; }, csv: function (a) { return fmtV(a.metric, a.value); } },
            { k: 'ack', label: 'Acknowledged', html: function (a) { return a.ack ? UI.tag('Yes' + (a.ackTs ? ' - ' + f.dur((a.ackTs - a.ts) / 1000) : ''), 'info') : UI.tag('No', 'warn'); }, val: function (a) { return a.ack ? 'Yes' : 'No'; } },
            { k: 'dur', label: 'Duration', r: 1, html: function (a) { return a.resolved ? f.dur((a.resolvedTs - a.ts) / 1000) : '<span class="warn-t">ongoing</span>'; }, val: function (a) { return a.resolved ? Math.round((a.resolvedTs - a.ts) / 1000) : null; }, csv: function (a) { return a.resolved ? f.dur((a.resolvedTs - a.ts) / 1000) : 'ongoing'; } },
            { k: 'st', label: 'Status', html: function (a) { return a.resolved ? UI.tag(a.resolvedBy ? 'Resolved (manual)' : 'Resolved', 'ok') : UI.tag('Active', 'bad'); }, val: function (a) { return a.resolved ? 'Resolved' : 'Active'; } }
          ]
        });
      }
    }
  });
})();
