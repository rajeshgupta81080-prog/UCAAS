/* Settings - users, queues, codes, integrations, API, compliance, audit, general.
   Write controls are Admin only. Anything that would need a backend is labelled "Demo data". */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc, S = MCM.store;

  /* ---------- re-apply persisted overrides at load (data.js does not read them) ---------- */
  (function () {
    var ov = S.get('agentOverrides', {}); Object.keys(ov).forEach(function (id) { var a = MCM.aById[id]; if (a) Object.assign(a, ov[id]); });
    var c = S.get('codes', null); if (c) [['wrap', MCM.WRAP], ['disp', MCM.DISP], ['tags', MCM.TAGS], ['topics', MCM.TOPICS]].forEach(function (p) { if (Array.isArray(c[p[0]])) { p[1].length = 0; c[p[0]].forEach(function (x) { p[1].push(x); }); } });
    try { var h = location.hash; if ((!h || h === '#' || h === '#/') && S.get('landing') && S.get('landing') !== 'queues') location.hash = '#/' + S.get('landing'); } catch (e) {}
  })();

  var ZONES = ['Asia/Kolkata', 'UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Africa/Johannesburg'];
  var PERMS = [['view', 'View dashboards and data'], ['export', 'Export CSV / Excel'], ['supervise', 'Monitor, whisper and barge calls'], ['alerts', 'Manage alerts and rules'], ['quality', 'Evaluate and calibrate quality'], ['coach', 'Coaching sessions'], ['wfm', 'Workforce management actions'], ['recordings', 'Listen to recordings'], ['manage-queues', 'Change queue settings']];
  var INTEG = [
    { id: 'salesforce', name: 'Salesforce', cat: 'CRM', desc: 'Screen-pop callers and log every call as a Task on the matching Contact or Lead.', map: [['call.from', 'Task.Phone', 'out'], ['call.agent', 'Task.OwnerId', 'out'], ['call.talk', 'Task.CallDurationInSeconds', 'out'], ['call.disp', 'Task.CallDisposition', 'out'], ['call.wrapCode', 'Task.Subject', 'out'], ['Contact.Phone', 'caller lookup key', 'in']] },
    { id: 'zendesk', name: 'Zendesk', cat: 'Helpdesk', desc: 'Create or update tickets from calls and show ticket history to the agent.', map: [['call.id', 'ticket.external_id', 'out'], ['call.from', 'ticket.requester.phone', 'out'], ['call.disp', 'ticket.status', 'out'], ['call.topics', 'ticket.tags', 'out'], ['ticket.id', 'call note link', 'in']] },
    { id: 'hubspot', name: 'HubSpot', cat: 'CRM', desc: 'Sync contacts and log calls to the HubSpot timeline.', map: [['call.from', 'engagement.metadata.toNumber', 'out'], ['call.talk', 'engagement.metadata.durationMilliseconds', 'out'], ['call.disp', 'engagement.metadata.disposition', 'out'], ['contact.email', 'caller profile', 'in']] },
    { id: 'teams', name: 'Microsoft Teams', cat: 'Collaboration', desc: 'Send alert notifications to a channel and sync agent presence.', map: [['alert.ruleName', 'message.title', 'out'], ['alert.scopeName', 'message.subtitle', 'out'], ['agent.status', 'presence.availability', 'both']] },
    { id: 'slack', name: 'Slack', cat: 'Collaboration', desc: 'Post alerts and daily summaries to a Slack channel.', map: [['alert.ruleName', 'attachment.title', 'out'], ['alert.value', 'attachment.fields[0]', 'out'], ['summary.sl', 'daily summary block', 'out']] },
    { id: 'gcal', name: 'Google Calendar', cat: 'Scheduling', desc: 'Publish published schedules and approved time off to agent calendars.', map: [['shift.start', 'event.start', 'out'], ['shift.end', 'event.end', 'out'], ['shift.items(break, lunch)', 'event.description', 'out'], ['timeoff.type', 'event.summary', 'out']] },
    { id: 'webhooks', name: 'Webhooks', cat: 'Developer', desc: 'Push call, agent and alert events to your own HTTPS endpoints (configure them on the API tab).', map: [['call.started / call.ended', 'POST body.type', 'out'], ['agent.status', 'POST body.data', 'out'], ['alert.fired', 'POST body.data', 'out']] }
  ];

  function adm() { return MCM.can('*'); }
  function me() { return (MCM.aById[MCM.user.id] || {}).name || MCM.user.role; }
  function nid(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1000); }
  function json(o) { return '<pre class="mono" style="background:var(--surface2);padding:1.2rem;border-radius:.75rem;max-height:46vh;overflow:auto;font-size:1.1rem;white-space:pre">' + esc(JSON.stringify(o, null, 2)) + '</pre>'; }
  function download(name, mime, text) { var b = new Blob([text], { type: mime }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function rolePerms(role) { var keep = MCM.user.role, out = {}; try { MCM.user.role = role; PERMS.forEach(function (p) { out[p[0]] = MCM.can(p[0]); }); } finally { MCM.user.role = keep; } return out; }
  var pendingTz = S.get('pendingTz', null);
  function persistSettings() { MCM.saveSettings(); if (pendingTz) { var s = S.get('settings', {}); s.tz = pendingTz; S.set('settings', s); } }
  function maskKey(k) { return k.slice(0, 9) + '••••••••••••' + k.slice(-4); }
  function randKey() { var c = 'abcdefghijklmnopqrstuvwxyz0123456789', s = 'mcm_demo_'; for (var i = 0; i < 28; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function iso(ts) { return new Date(ts).toISOString(); }

  MCM.page({
    id: 'settings', title: 'Settings', icon: 'settings', filters: [], live: false, autoRefresh: false, roles: ['Admin', 'Supervisor', 'Read-only', 'Coach'],
    tabs: [['users', 'Users'], ['queues', 'Queues'], ['codes', 'Codes and tags'], ['integrations', 'Integrations'], ['api', 'API'], ['compliance', 'Compliance'], ['audit', 'Audit log'], ['general', 'General']],
    render: function (ctx) {
      var tab = ctx.tab, el = ctx.el, A = adm();
      var notice = A ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + MCM.user.role + ') can view settings but only Admin can change them.</div>';
      function onChange(selector, fn) { el.addEventListener('change', function (e) { var t = e.target.closest(selector); if (t) fn(t, e); }); }
      function guard(what) { if (!adm()) { MCM.deny(what || 'change settings'); return false; } return true; }
      function q(sel) { return el.querySelector(sel); }
      var dis = A ? '' : ' disabled';

      /* ================= USERS ================= */
      if (tab === 'users') {
        var ags = MCM.agents, invites = S.get('invites', []), ovr = function () { return S.get('agentOverrides', {}); };
        var byRole = {}; ags.forEach(function (a) { byRole[a.role] = (byRole[a.role] || 0) + 1; });
        var matrix = {}; MCM.roles.forEach(function (r) { matrix[r] = rolePerms(r); });
        el.innerHTML = notice + '<div class="grid g4">' + [UI.kpi({ label: 'Users', value: ags.length }), UI.kpi({ label: 'Active', value: ags.filter(function (a) { return a.active !== false; }).length }), UI.kpi({ label: 'Supervisors and coaches', value: (byRole.Supervisor || 0) + (byRole.Coach || 0) }), UI.kpi({ label: 'Pending invites', value: invites.length })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Directory', '<div id="su"></div>', { flush: true, sub: 'Click a row to edit. Edits are applied in memory and saved as overrides in this browser; sharing them across users needs a backend.', acts: A ? '<button class="btn pri sm" data-invite>' + UI.icon('plus') + 'Invite user</button>' : '' }) + '</div>' +
          (invites.length ? '<div class="mt">' + UI.card('Pending invitations ' + UI.preview(), '<div id="sinv"></div>', { flush: true }) + '</div>' : '') +
          '<div class="mt">' + UI.card('Role permissions', '<div id="srm"></div>', { flush: true, sub: 'Read-only reference. Use <b>View as</b> in the avatar menu (top right) to experience any role.' }) + '</div>';
        var utbl = UI.table(document.getElementById('su'), {
          id: 'susers', noun: 'users', csv: 'directory', pageSize: 12, rows: ags, sort: 'name', dir: 'asc', onRow: function (a) { editUser(a); },
          cols: [
            { k: 'name', label: 'Name', html: function (a) { return '<b>' + esc(a.name) + '</b>'; }, val: function (a) { return a.name; } },
            { k: 'ext', label: 'Ext', html: function (a) { return esc(a.ext); }, val: function (a) { return a.ext; } },
            { k: 'email', label: 'E-mail', html: function (a) { return esc(a.email); }, val: function (a) { return a.email; } },
            { k: 'role', label: 'Role', html: function (a) { return UI.tag(a.role, a.role === 'Admin' ? 'brand' : a.role === 'Supervisor' ? 'info' : ''); }, val: function (a) { return a.role; } },
            { k: 'team', label: 'Team', html: function (a) { return esc(a.team); }, val: function (a) { return a.team; } },
            { k: 'site', label: 'Site', html: function (a) { return esc(a.site); }, val: function (a) { return a.site; } },
            { k: 'skills', label: 'Skills', html: function (a) { return esc((a.skills || []).join(', ')); }, val: function (a) { return (a.skills || []).join(', '); } },
            { k: 'queues', label: 'Queues', html: function (a) { return '<span title="' + esc(a.queues.map(function (id) { return MCM.qById[id].name; }).join(', ')) + '">' + a.queues.length + ' queue' + (a.queues.length === 1 ? '' : 's') + '</span>'; }, val: function (a) { return a.queues.map(function (id) { return MCM.qById[id].name; }).join(', '); } },
            { k: 'active', label: 'Active', html: function (a) { return a.active !== false ? UI.tag('Active', 'ok') : UI.tag('Inactive'); }, val: function (a) { return a.active !== false ? 'Active' : 'Inactive'; } }
          ]
        });
        UI.table(document.getElementById('srm'), { id: 'srmx', noun: 'permissions', search: false, colChooser: false, pageSize: 20, csv: 'role-permissions', rows: PERMS, cols: [{ k: 'p', label: 'Permission', html: function (p) { return '<b>' + p[0] + '</b> <span class="muted">' + p[1] + '</span>'; }, val: function (p) { return p[0]; } }].concat(MCM.roles.map(function (r) { return { k: r, label: r, r: 1, noSort: true, html: function (p) { return matrix[r][p[0]] ? '<span class="ok-t">Yes</span>' : '<span class="faint">-</span>'; }, val: function (p) { return matrix[r][p[0]] ? 'Yes' : 'No'; } }; })) });
        if (invites.length) UI.table(document.getElementById('sinv'), { id: 'sinvt', noun: 'invites', search: false, colChooser: false, pageSize: 8, rows: invites, cols: [{ k: 'email', label: 'E-mail', html: function (i) { return '<b>' + esc(i.email) + '</b>'; }, val: function (i) { return i.email; } }, { k: 'name', label: 'Name', html: function (i) { return esc(i.name); }, val: function (i) { return i.name; } }, { k: 'role', label: 'Role', html: function (i) { return esc(i.role); }, val: function (i) { return i.role; } }, { k: 'team', label: 'Team', html: function (i) { return esc(i.team); }, val: function (i) { return i.team; } }, { k: 'ts', label: 'Invited', html: function (i) { return T.dt(i.ts); }, val: function (i) { return i.ts; } }, { k: 'act', label: '', noSort: true, noCsv: true, html: function (i) { return A ? '<button class="btn xs danger" data-invrev="' + i.id + '">Revoke</button>' : ''; } }] });

        function editUser(a) {
          var queueBoxes = MCM.queues.map(function (qq) { return '<label style="display:flex;gap:.6rem;align-items:center;font-weight:500"><input type="checkbox" data-eq="' + qq.id + '"' + (a.queues.indexOf(qq.id) >= 0 ? ' checked' : '') + dis + '> ' + esc(qq.name) + '</label>'; }).join('');
          UI.modal({
            title: esc(a.name), body: '<p class="muted" style="margin-bottom:1rem">' + esc(a.email) + ' - ext ' + esc(a.ext) + '</p><div class="fg c2"><label>Role<select class="inp" data-e="role"' + dis + '>' + UI.opts(MCM.roles, a.role) + '</select></label><label>Team<select class="inp" data-e="team"' + dis + '>' + UI.opts(MCM.teams, a.team) + '</select></label><label>Site<select class="inp" data-e="site"' + dis + '>' + UI.opts(MCM.sites, a.site) + '</select></label><label>Skills (comma separated)<input class="inp" data-e="skills" value="' + esc((a.skills || []).join(', ')) + '"' + dis + '></label></div><div class="fg mt"><label>Queues</label><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem 1.6rem">' + queueBoxes + '</div><label style="display:flex;gap:.8rem;align-items:center;font-weight:500"><input type="checkbox" data-e="active"' + (a.active !== false ? ' checked' : '') + dis + '> Active</label></div><div class="note mt">' + UI.icon('info') + '<span>Saved as an override in this browser and applied in memory. Persisting directory changes for all users needs a backend.</span></div>',
            foot: A ? [{ label: 'Cancel' }, { label: 'Save', pri: true, fn: function (m) {
              var role = m.querySelector('[data-e="role"]').value, act = m.querySelector('[data-e="active"]').checked;
              if (a.id === MCM.user.id && (role !== a.role || !act)) { UI.toast('You cannot change your own role or deactivate yourself.', { kind: 'bad' }); return false; }
              var qs = Array.prototype.slice.call(m.querySelectorAll('[data-eq]:checked')).map(function (i) { return i.dataset.eq; });
              if (!qs.length && role !== 'Admin') { UI.toast('Assign at least one queue', { kind: 'bad' }); return false; }
              var upd = { role: role, team: m.querySelector('[data-e="team"]').value, site: m.querySelector('[data-e="site"]').value, queues: qs, skills: m.querySelector('[data-e="skills"]').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), active: act };
              var changes = Object.keys(upd).filter(function (k) { return JSON.stringify(upd[k]) !== JSON.stringify(a[k]); });
              Object.assign(a, upd); var o = ovr(); o[a.id] = upd; S.set('agentOverrides', o);
              MCM.audit('User edited', a.name + ': ' + (changes.join(', ') || 'no changes')); UI.toast('Saved ' + a.name, { kind: 'ok' }); setTimeout(ctx.refresh, 0);
            } }] : [{ label: 'Close', pri: true }]
          });
        }
        ctx.on('[data-invite]', function () {
          if (!guard('invite users')) return;
          UI.modal({ title: 'Invite user', body: '<div class="fg"><label>Name<input class="inp" data-i="name"></label><label>E-mail<input class="inp" type="email" data-i="email" placeholder="name@company.com"></label><div class="fg c2"><label>Role<select class="inp" data-i="role">' + UI.opts(MCM.roles.filter(function (r) { return r !== 'Admin'; }), 'Agent') + '</select></label><label>Team<select class="inp" data-i="team">' + UI.opts(MCM.teams, MCM.teams[0]) + '</select></label></div></div><div class="note mt">' + UI.icon('info') + '<span>No e-mail is sent in this demo. The invitation is recorded here ' + UI.preview() + '</span></div>', foot: [{ label: 'Cancel' }, { label: 'Send invite', pri: true, fn: function (m) {
            var g = function (k) { return m.querySelector('[data-i="' + k + '"]').value.trim(); };
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g('email'))) { UI.toast('Enter a valid e-mail address', { kind: 'bad' }); return false; }
            var l = S.get('invites', []); l.unshift({ id: nid('inv'), name: g('name') || g('email'), email: g('email'), role: g('role'), team: g('team'), ts: Date.now() }); S.set('invites', l); MCM.audit('User invited', g('email') + ' as ' + g('role')); UI.toast('Invitation recorded', { kind: 'ok' }); setTimeout(ctx.refresh, 0);
          } }] });
        });
        ctx.on('[data-invrev]', function (e, b) { if (!guard('revoke invitations')) return; var l = S.get('invites', []).filter(function (i) { return i.id !== b.dataset.invrev; }); S.set('invites', l); MCM.audit('Invitation revoked', b.dataset.invrev); ctx.refresh(); });
      }

      /* ================= QUEUES ================= */
      else if (tab === 'queues') {
        var hoursQ = function () { return S.get('queueHours', {}); }, DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        var biz = S.get('bizHours', null) || DAYS.map(function (d, i) { return { d: d, on: i < 6, from: i < 5 ? '08:00' : '09:00', to: i < 5 ? '20:00' : '14:00' }; });
        var hol = S.get('holidays', null) || [{ id: 'h1', date: '2026-10-02', name: 'Gandhi Jayanti' }, { id: 'h2', date: '2026-11-08', name: 'Diwali' }, { id: 'h3', date: '2026-12-25', name: 'Christmas Day' }, { id: 'h4', date: '2027-01-26', name: 'Republic Day' }];
        var ovf = S.get('overflowRules', null) || [{ id: 'o1', queue: 'q1', metric: 'wait', after: 120, target: 'q3', enabled: true }, { id: 'o2', queue: 'q7', metric: 'waiting', after: 3, target: 'q3', enabled: true }];
        var qopts = MCM.queues.map(function (x) { return [x.id, x.name]; });
        el.innerHTML = notice + UI.card('Queue settings', '<div id="sq"></div>', { flush: true, sub: 'Service-level goals, hours and status per queue. Saved through the shared queue config and written to the audit log.' }) +
          '<div class="grid g2 mt">' + UI.card('Business hours', '<div id="sbh"></div>', { flush: true, sub: 'Default opening hours (' + MCM.settings.tz + '). ' + UI.preview() + ' Routing does not read these yet.' }) + UI.card('Holiday calendar', '<div id="shol"></div>', { flush: true, sub: 'Closed days.' , acts: A ? '<input type="date" class="inp sm" data-hdate style="min-width:11rem"><input class="inp sm" data-hname placeholder="Holiday name" style="min-width:14rem"><button class="btn sm pri" data-hadd>Add</button>' : '' }) + '</div>' +
          '<div class="mt">' + UI.card('Overflow rules', '<div id="sov"></div>', { flush: true, sub: 'Send contacts to another queue when waiting too long. ' + UI.preview(), acts: A ? sel2('data-oq', qopts, 'q1') + sel2('data-om', [['wait', 'wait over (s)'], ['waiting', 'callers waiting over']], 'wait') + '<input type="number" class="inp sm" data-oa value="120" style="min-width:7rem;width:8rem">' + sel2('data-ot', qopts, 'q3') + '<button class="btn sm pri" data-oadd>Add rule</button>' : '' }) + '</div>';
        function sel2(a, o, v) { return '<select class="inp sm" ' + a + ' style="min-width:12rem">' + UI.opts(o, v) + '</select>'; }
        var inpS = 'min-width:6rem;width:7rem';
        UI.table(document.getElementById('sq'), {
          id: 'sqt', noun: 'queues', search: false, colChooser: false, csv: 'queue-settings', pageSize: 20, rows: MCM.queues,
          cols: [
            { k: 'n', label: 'Queue', html: function (x) { return '<b>' + esc(x.name) + '</b> ' + UI.tag(x.channel); }, val: function (x) { return x.name; } },
            { k: 'ext', label: 'Ext', html: function (x) { return x.ext; }, val: function (x) { return x.ext; } },
            { k: 'sl', label: 'SL target %', r: 1, noSort: 1, html: function (x) { return '<input class="inp sm" style="' + inpS + '" type="number" min="1" max="100" data-sq="' + x.id + '" data-sk="target" value="' + x.sl.target + '"' + dis + '>'; }, val: function (x) { return x.sl.target; } },
            { k: 'sec', label: 'SL threshold (s)', r: 1, noSort: 1, html: function (x) { return '<input class="inp sm" style="' + inpS + '" type="number" min="1" data-sq="' + x.id + '" data-sk="sec" value="' + x.sl.sec + '"' + dis + '>'; }, val: function (x) { return x.sl.sec; } },
            { k: 'asa', label: 'ASA goal (s)', r: 1, noSort: 1, html: function (x) { return '<input class="inp sm" style="' + inpS + '" type="number" min="1" data-sq="' + x.id + '" data-sk="asaGoal" value="' + x.asaGoal + '"' + dis + '>'; }, val: function (x) { return x.asaGoal; } },
            { k: 'ab', label: 'Abandon goal %', r: 1, noSort: 1, html: function (x) { return '<input class="inp sm" style="' + inpS + '" type="number" min="1" max="100" data-sq="' + x.id + '" data-sk="abandonGoal" value="' + x.abandonGoal + '"' + dis + '>'; }, val: function (x) { return x.abandonGoal; } },
            { k: 'from', label: 'Opens', noSort: 1, html: function (x) { var h = hoursQ()[x.id] || { from: '08:00', to: '20:00' }; return '<input class="inp sm" type="time" style="min-width:9rem" data-sq="' + x.id + '" data-sk="hfrom" value="' + h.from + '"' + dis + '>'; }, val: function (x) { return (hoursQ()[x.id] || { from: '08:00' }).from; } },
            { k: 'to', label: 'Closes', noSort: 1, html: function (x) { var h = hoursQ()[x.id] || { from: '08:00', to: '20:00' }; return '<input class="inp sm" type="time" style="min-width:9rem" data-sq="' + x.id + '" data-sk="hto" value="' + h.to + '"' + dis + '>'; }, val: function (x) { return (hoursQ()[x.id] || { to: '20:00' }).to; } },
            { k: 'mem', label: 'Members', r: 1, html: function (x) { return '<span title="' + esc(MCM.agents.filter(function (a) { return a.queues.indexOf(x.id) >= 0; }).map(function (a) { return a.name; }).join(', ')) + '">' + MCM.agents.filter(function (a) { return a.queues.indexOf(x.id) >= 0; }).length + '</span>'; }, val: function (x) { return MCM.agents.filter(function (a) { return a.queues.indexOf(x.id) >= 0; }).length; } },
            { k: 'act', label: 'Active', noSort: 1, html: function (x) { return UI.sw(x.active, 'data-qact="' + x.id + '"' + dis); }, val: function (x) { return x.active ? 'Active' : 'Inactive'; } }
          ]
        });
        onChange('[data-sq][data-sk]', function (i) {
          if (!guard('change queue settings')) return; var x = MCM.qById[i.dataset.sq], k = i.dataset.sk, v = i.value;
          if (k === 'hfrom' || k === 'hto') { var h = hoursQ(), c = h[x.id] || { from: '08:00', to: '20:00' }; c[k === 'hfrom' ? 'from' : 'to'] = v; h[x.id] = c; S.set('queueHours', h); }
          else { v = +v; if (isNaN(v) || v < 1) { UI.toast('Enter a positive number', { kind: 'bad' }); return; } if (k === 'target') x.sl.target = v; else if (k === 'sec') x.sl.sec = v; else x[k] = v; MCM.saveQueueCfg(); }
          MCM.audit('Queue setting changed', x.name + ' ' + k + '=' + v); UI.toast('Saved ' + x.name, { kind: 'ok', ms: 1400 });
        });
        ctx.on('[data-qact]', function (e, b) { if (!guard('change queue status')) return; var x = MCM.qById[b.dataset.qact]; x.active = !x.active; MCM.saveQueueCfg(); MCM.audit('Queue ' + (x.active ? 'enabled' : 'disabled'), x.name); ctx.refresh(); });

        UI.table(document.getElementById('sbh'), {
          id: 'sbhx', noun: 'days', search: false, colChooser: false, pageSize: 8, rows: biz, csv: 'business-hours',
          cols: [{ k: 'd', label: 'Day', html: function (r) { return '<b>' + r.d + '</b>'; }, val: function (r) { return DAYS.indexOf(r.d); } }, { k: 'on', label: 'Open', noSort: 1, html: function (r) { return UI.sw(r.on, 'data-bho="' + r.d + '"' + dis); }, val: function (r) { return r.on ? 'Open' : 'Closed'; } }, { k: 'from', label: 'From', noSort: 1, html: function (r) { return '<input type="time" class="inp sm" style="min-width:9rem" data-bh="' + r.d + ':from" value="' + r.from + '"' + (A && r.on ? '' : ' disabled') + '>'; }, val: function (r) { return r.from; } }, { k: 'to', label: 'To', noSort: 1, html: function (r) { return '<input type="time" class="inp sm" style="min-width:9rem" data-bh="' + r.d + ':to" value="' + r.to + '"' + (A && r.on ? '' : ' disabled') + '>'; }, val: function (r) { return r.to; } }]
        });
        function saveBiz(what) { S.set('bizHours', biz); MCM.audit('Business hours changed', what); }
        ctx.on('[data-bho]', function (e, b) { if (!guard('change business hours')) return; var r = biz.filter(function (x) { return x.d === b.dataset.bho; })[0]; r.on = !r.on; saveBiz(r.d + (r.on ? ' open' : ' closed')); ctx.refresh(); });
        onChange('[data-bh]', function (i) { if (!guard('change business hours')) return; var k = i.dataset.bh.split(':'), r = biz.filter(function (x) { return x.d === k[0]; })[0]; r[k[1]] = i.value; saveBiz(k[0] + ' ' + k[1] + ' ' + i.value); });

        UI.table(document.getElementById('shol'), {
          id: 'sholt', noun: 'holidays', search: false, colChooser: false, pageSize: 8, rows: hol, sort: 'date', dir: 'asc', csv: 'holidays',
          cols: [{ k: 'date', label: 'Date', html: function (h) { return '<b>' + esc(h.date) + '</b>'; }, val: function (h) { return h.date; } }, { k: 'name', label: 'Holiday', html: function (h) { return esc(h.name); }, val: function (h) { return h.name; } }, { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (h) { return A ? '<button class="btn xs danger" data-hdel="' + h.id + '">Remove</button>' : ''; } }]
        });
        ctx.on('[data-hadd]', function () { if (!guard('edit the holiday calendar')) return; var d = q('[data-hdate]').value, n = q('[data-hname]').value.trim(); if (!d || !n) { UI.toast('Enter a date and a name', { kind: 'bad' }); return; } hol.push({ id: nid('h'), date: d, name: n }); S.set('holidays', hol); MCM.audit('Holiday added', d + ' ' + n); ctx.refresh(); });
        ctx.on('[data-hdel]', function (e, b) { if (!guard('edit the holiday calendar')) return; var h = hol.filter(function (x) { return x.id === b.dataset.hdel; })[0]; S.set('holidays', hol.filter(function (x) { return x !== h; })); MCM.audit('Holiday removed', h.date + ' ' + h.name); ctx.refresh(); });

        UI.table(document.getElementById('sov'), {
          id: 'sovt', noun: 'rules', search: false, colChooser: false, pageSize: 8, rows: ovf, csv: 'overflow-rules',
          cols: [{ k: 'queue', label: 'When queue', html: function (r) { return '<b>' + esc(MCM.qById[r.queue].name) + '</b>'; }, val: function (r) { return MCM.qById[r.queue].name; } }, { k: 'cond', label: 'Condition', html: function (r) { return r.metric === 'wait' ? 'longest wait over ' + r.after + ' s' : 'more than ' + r.after + ' callers waiting'; }, val: function (r) { return r.metric + ' ' + r.after; } }, { k: 'target', label: 'Overflow to', html: function (r) { return esc(MCM.qById[r.target].name); }, val: function (r) { return MCM.qById[r.target].name; } }, { k: 'en', label: 'Enabled', noSort: 1, html: function (r) { return UI.sw(r.enabled, 'data-oen="' + r.id + '"' + dis); }, val: function (r) { return r.enabled ? 'Yes' : 'No'; } }, { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (r) { return A ? '<button class="btn xs danger" data-odel="' + r.id + '">Delete</button>' : ''; } }]
        });
        ctx.on('[data-oadd]', function () {
          if (!guard('add overflow rules')) return; var a = +q('[data-oa]').value, s = q('[data-oq]').value, t = q('[data-ot]').value; if (s === t) { UI.toast('Source and target must differ', { kind: 'bad' }); return; } if (!(a > 0)) { UI.toast('Enter a positive threshold', { kind: 'bad' }); return; }
          ovf.push({ id: nid('o'), queue: s, metric: q('[data-om]').value, after: a, target: t, enabled: true }); S.set('overflowRules', ovf); MCM.audit('Overflow rule added', MCM.qById[s].name + ' -> ' + MCM.qById[t].name); ctx.refresh();
        });
        ctx.on('[data-oen]', function (e, b) { if (!guard('change overflow rules')) return; var r = ovf.filter(function (x) { return x.id === b.dataset.oen; })[0]; r.enabled = !r.enabled; S.set('overflowRules', ovf); MCM.audit('Overflow rule ' + (r.enabled ? 'enabled' : 'disabled'), MCM.qById[r.queue].name); ctx.refresh(); });
        ctx.on('[data-odel]', function (e, b) { if (!guard('delete overflow rules')) return; var r = ovf.filter(function (x) { return x.id === b.dataset.odel; })[0]; S.set('overflowRules', ovf.filter(function (x) { return x !== r; })); MCM.audit('Overflow rule deleted', MCM.qById[r.queue].name); ctx.refresh(); });
      }

      /* ================= CODES ================= */
      else if (tab === 'codes') {
        var LISTS = [['wrap', 'Wrap-up codes', MCM.WRAP, function (c) { return c.wrapCode; }, 'Chosen by the agent after the call.'], ['disp', 'Dispositions', MCM.DISP, function (c) { return c.disp; }, 'Outcome of the conversation.'], ['tags', 'Tags', MCM.TAGS, function (c) { return c.tags; }, 'Free labels on a call.'], ['topics', 'Call purposes (topics)', MCM.TOPICS, function (c) { return c.topics; }, 'Detected or selected reason for the call.']];
        var usage = {}; LISTS.forEach(function (l) { usage[l[0]] = {}; });
        MCM.query({ from: MCM.TODAY - 44 * T.day, to: Date.now(), ignoreFilters: true }).forEach(function (c) { LISTS.forEach(function (l) { var v = l[3](c); (Array.isArray(v) ? v : [v]).forEach(function (x) { if (x) usage[l[0]][x] = (usage[l[0]][x] || 0) + 1; }); }); });
        el.innerHTML = notice + '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>Changes apply to the shared lists immediately and are saved in this browser. Existing calls keep the value they were recorded with (45-day usage shown).</span></div><div class="grid g2">' + LISTS.map(function (l) { return UI.card(l[1], '<div id="cl_' + l[0] + '"></div>', { flush: true, sub: l[4], acts: A ? '<input class="inp sm" data-cnew="' + l[0] + '" placeholder="New item" style="min-width:14rem"><button class="btn sm pri" data-cadd="' + l[0] + '">Add</button>' : '' }); }).join('') + '</div>';
        function saveCodes(what) { S.set('codes', { wrap: MCM.WRAP.slice(), disp: MCM.DISP.slice(), tags: MCM.TAGS.slice(), topics: MCM.TOPICS.slice() }); MCM.audit('Codes changed', what); }
        LISTS.forEach(function (l) {
          UI.table(document.getElementById('cl_' + l[0]), { id: 'sc_' + l[0], noun: 'items', search: false, colChooser: false, pageSize: 8, csv: 'codes-' + l[0], rows: l[2].map(function (n) { return { name: n, n: usage[l[0]][n] || 0 }; }), sort: 'name', dir: 'asc',
            cols: [{ k: 'name', label: 'Name', html: function (r) { return '<b>' + esc(r.name) + '</b>'; }, val: function (r) { return r.name; } }, { k: 'n', label: 'Used (45 d)', r: 1, html: function (r) { return f.n(r.n); }, val: function (r) { return r.n; } }, { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (r) { return A ? '<button class="btn xs" data-cren="' + l[0] + '|' + esc(r.name) + '">Rename</button> <button class="btn xs danger" data-cdel="' + l[0] + '|' + esc(r.name) + '">Delete</button>' : ''; } }] });
        });
        function listOf(k) { return LISTS.filter(function (l) { return l[0] === k; })[0]; }
        ctx.on('[data-cadd]', function (e, b) { if (!guard('edit codes')) return; var k = b.dataset.cadd, inp = q('[data-cnew="' + k + '"]'), v = inp.value.trim(), l = listOf(k); if (!v) return; if (l[2].some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) { UI.toast('Already exists', { kind: 'bad' }); return; } l[2].push(v); saveCodes(l[1] + ' + ' + v); ctx.refresh(); });
        ctx.on('[data-cdel]', function (e, b) { if (!guard('edit codes')) return; var p = b.dataset.cdel.split('|'), l = listOf(p[0]); UI.confirm('Delete "' + esc(p[1]) + '" from ' + esc(l[1]) + '? Past calls keep their recorded value.', 'Delete').then(function (ok) { if (!ok) return; l[2].splice(l[2].indexOf(p[1]), 1); saveCodes(l[1] + ' - ' + p[1]); ctx.refresh(); }); });
        ctx.on('[data-cren]', function (e, b) { if (!guard('edit codes')) return; var p = b.dataset.cren.split('|'), l = listOf(p[0]); UI.modal({ title: 'Rename', body: '<div class="fg"><label>New name<input class="inp" data-x value="' + esc(p[1]) + '"></label></div>', foot: [{ label: 'Cancel' }, { label: 'Rename', pri: true, fn: function (m) { var v = m.querySelector('[data-x]').value.trim(); if (!v) return false; if (v !== p[1] && l[2].indexOf(v) >= 0) { UI.toast('Already exists', { kind: 'bad' }); return false; } l[2][l[2].indexOf(p[1])] = v; saveCodes(l[1] + ': ' + p[1] + ' -> ' + v); setTimeout(ctx.refresh, 0); } }] }); });
      }

      /* ================= INTEGRATIONS ================= */
      else if (tab === 'integrations') {
        var IS = function () { return S.get('integrations', {}); }, st = IS();
        el.innerHTML = notice + '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>' + UI.preview() + ' No backend is attached, so connecting only records the choice and a simulated sync time. Nothing is sent to these services.</span></div><div class="grid g3">' + INTEG.map(function (it) {
          var s = st[it.id] || {}, on = !!s.on;
          return '<section class="card"><div class="ch"><div><h3>' + esc(it.name) + '</h3><div class="sub">' + esc(it.cat) + '</div></div>' + (on ? UI.tag('Connected', 'ok') : UI.tag('Not connected')) + '</div><p style="font-size:1.2rem;color:var(--ink2);margin-bottom:1.2rem;min-height:4.5rem">' + esc(it.desc) + '</p><dl class="kv" style="grid-template-columns:10rem 1fr;margin-bottom:1.4rem"><dt>Last sync</dt><dd>' + (on && s.last ? T.dt(s.last) + ' <span class="muted">(' + f.ago(s.last) + ')</span>' : '-') + '</dd><dt>Sync status</dt><dd>' + (on ? UI.tag('OK', 'ok') + ' <span class="muted">simulated</span>' : '<span class="faint">-</span>') + '</dd></dl><div style="display:flex;gap:.8rem;flex-wrap:wrap"><button class="btn sm ' + (on ? '' : 'pri') + '" data-itg="' + it.id + '"' + dis + '>' + (on ? 'Disconnect' : 'Connect') + '</button>' + (on ? '<button class="btn sm" data-isync="' + it.id + '"' + dis + '>Sync now</button>' : '') + '<button class="btn sm" data-imap="' + it.id + '">Field mapping</button></div></section>';
        }).join('') + '</div>';
        ctx.on('[data-itg]', function (e, b) {
          if (!guard('change integrations')) return; var it = INTEG.filter(function (x) { return x.id === b.dataset.itg; })[0], cur = IS(), on = !(cur[it.id] && cur[it.id].on);
          var go = function () { cur[it.id] = { on: on, last: on ? Date.now() : null }; S.set('integrations', cur); MCM.audit('Integration ' + (on ? 'connected' : 'disconnected'), it.name); UI.toast(it.name + (on ? ' connected (demo)' : ' disconnected'), { kind: on ? 'ok' : '' }); ctx.refresh(); };
          if (on) go(); else UI.confirm('Disconnect ' + esc(it.name) + '?', 'Disconnect').then(function (ok) { if (ok) go(); });
        });
        ctx.on('[data-isync]', function (e, b) { if (!guard('sync integrations')) return; var cur = IS(); cur[b.dataset.isync].last = Date.now(); S.set('integrations', cur); MCM.audit('Integration sync', b.dataset.isync); UI.toast('Sync completed (simulated)', { kind: 'ok' }); ctx.refresh(); });
        ctx.on('[data-imap]', function (e, b) {
          var it = INTEG.filter(function (x) { return x.id === b.dataset.imap; })[0];
          UI.modal({ title: esc(it.name) + ' field mapping', body: '<p class="muted" style="margin-bottom:1rem">' + UI.preview() + ' Sample mapping between MCM fields and ' + esc(it.name) + '.</p><div class="tw"><table class="t"><thead><tr><th>MCM field</th><th>' + esc(it.name) + ' field</th><th>Direction</th></tr></thead><tbody>' + it.map.map(function (m) { return '<tr><td class="mono">' + esc(m[0]) + '</td><td class="mono">' + esc(m[1]) + '</td><td>' + UI.tag(m[2] === 'out' ? 'MCM to ' + it.name : m[2] === 'in' ? it.name + ' to MCM' : 'Both ways') + '</td></tr>'; }).join('') + '</tbody></table></div>', foot: [{ label: 'Close', pri: true }] });
        });
      }

      /* ================= API ================= */
      else if (tab === 'api') {
        var keys = S.get('apiKeys', []), hooks = S.get('webhooks', []), EVENTS = ['call.started', 'call.ended', 'agent.status', 'alert.fired'];
        var EP = [['GET', '/v1/calls', 'List calls (filter by from, to, queue, agent, outcome)', 'calls'], ['GET', '/v1/queues', 'Queues with live metrics', 'queues'], ['GET', '/v1/agents/status', 'Current status of every agent', 'agents'], ['GET', '/v1/analytics/summary', 'Today\'s service level, ASA, AHT and volumes', 'summary']];
        el.innerHTML = notice + '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>' + UI.preview() + ' There is no server behind these keys, endpoints or webhooks. Payloads are built from the live demo data so you can see the shape.</span></div>' +
          UI.card('API keys', '<div id="sk"></div>', { flush: true, sub: 'Demo keys are stored in this browser only.', acts: A ? '<button class="btn pri sm" data-kgen>' + UI.icon('plus') + 'Generate key</button>' : '' }) +
          '<div class="mt">' + UI.card('Webhook endpoints', '<div id="sw"></div>', { flush: true, acts: A ? '<input class="inp sm" data-wurl placeholder="https://example.com/hooks/mcm" style="min-width:26rem">' + EVENTS.map(function (ev) { return '<label style="display:flex;gap:.4rem;align-items:center;font-size:1.1rem;font-weight:500"><input type="checkbox" data-wev="' + ev + '" checked>' + ev + '</label>'; }).join('') + '<button class="btn sm pri" data-wadd>Add endpoint</button>' : '' }) + '</div>' +
          '<div class="mt">' + UI.card('REST API', '<div id="sr"></div>', { flush: true, sub: 'Base URL https://api.example.com . Authenticate with <span class="mono">Authorization: Bearer &lt;key&gt;</span>.' }) + '</div>';
        UI.table(document.getElementById('sk'), { id: 'sapik', noun: 'keys', search: false, colChooser: false, csv: 'api-keys-masked', pageSize: 8, rows: keys, emptyTitle: 'No API keys', emptySub: 'Generate a demo key to see how it would look.',
          cols: [{ k: 'name', label: 'Name', html: function (k) { return '<b>' + esc(k.name) + '</b>'; }, val: function (k) { return k.name; } }, { k: 'key', label: 'Key', html: function (k) { return '<span class="mono">' + esc(maskKey(k.key)) + '</span>'; }, val: function (k) { return maskKey(k.key); } }, { k: 'scope', label: 'Scope', html: function (k) { return UI.tag(k.scope); }, val: function (k) { return k.scope; } }, { k: 'created', label: 'Created', html: function (k) { return T.dt(k.created); }, val: function (k) { return k.created; } }, { k: 'st', label: 'Status', html: function (k) { return k.revoked ? UI.tag('Revoked', 'bad') : UI.tag('Active', 'ok'); }, val: function (k) { return k.revoked ? 'Revoked' : 'Active'; } }, { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (k) { return (k.revoked ? '' : '<button class="btn xs" data-kcopy="' + k.id + '">Copy</button>') + (A && !k.revoked ? ' <button class="btn xs danger" data-krev="' + k.id + '">Revoke</button>' : ''); } }] });
        UI.table(document.getElementById('sw'), { id: 'swh', noun: 'endpoints', search: false, colChooser: false, csv: 'webhooks', pageSize: 8, rows: hooks, emptyTitle: 'No webhook endpoints', emptySub: 'Add an HTTPS URL and choose the events to send.',
          cols: [{ k: 'url', label: 'URL', html: function (h) { return '<span class="mono">' + esc(h.url) + '</span>'; }, val: function (h) { return h.url; } }, { k: 'ev', label: 'Events', html: function (h) { return h.events.map(function (x) { return UI.tag(x); }).join(' '); }, val: function (h) { return h.events.join(' '); } }, { k: 'en', label: 'Active', noSort: 1, html: function (h) { return UI.sw(h.active, 'data-wen="' + h.id + '"' + dis); }, val: function (h) { return h.active ? 'Yes' : 'No'; } }, { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (h) { return '<button class="btn xs" data-wtest="' + h.id + '">Send test event</button>' + (A ? ' <button class="btn xs danger" data-wdel="' + h.id + '">Delete</button>' : ''); } }] });
        UI.table(document.getElementById('sr'), { id: 'srest', noun: 'endpoints', search: false, colChooser: false, csv: 'rest-endpoints', pageSize: 8, rows: EP, cols: [{ k: 'm', label: 'Method', html: function (r) { return UI.tag(r[0], 'ok'); }, val: function (r) { return r[0]; } }, { k: 'p', label: 'Path', html: function (r) { return '<span class="mono"><b>' + r[1] + '</b></span>'; }, val: function (r) { return r[1]; } }, { k: 'd', label: 'Description', html: function (r) { return r[2]; }, val: function (r) { return r[2]; } }, { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (r) { return '<button class="btn xs" data-ep="' + r[3] + '">Sample response</button>'; } }] });

        ctx.on('[data-kgen]', function () {
          if (!guard('generate API keys')) return;
          UI.modal({ title: 'Generate API key', body: '<div class="fg"><label>Name<input class="inp" data-k="name" value="Integration key"></label><label>Scope<select class="inp" data-k="scope">' + UI.opts(['read-only', 'read-write'], 'read-only') + '</select></label></div><div class="note mt">' + UI.icon('info') + '<span>Demo key: it is not valid against any server.</span></div>', foot: [{ label: 'Cancel' }, { label: 'Generate', pri: true, fn: function (m) {
            var name = m.querySelector('[data-k="name"]').value.trim(), scope = m.querySelector('[data-k="scope"]').value; if (!name) return false;
            var key = randKey(), l = S.get('apiKeys', []); l.unshift({ id: nid('k'), name: name, key: key, scope: scope, created: Date.now(), revoked: false }); S.set('apiKeys', l); MCM.audit('API key generated', name + ' (' + scope + ')');
            setTimeout(function () { UI.modal({ title: 'Key generated', body: '<p>Copy it now. In a real deployment it would be shown only once.</p><p class="mono" style="background:var(--surface2);padding:1rem 1.2rem;border-radius:.5rem;margin-top:1rem;word-break:break-all">' + esc(key) + '</p>', foot: [{ label: 'Copy', fn: function () { UI.copy(key); return false; } }, { label: 'Done', pri: true, fn: function () { setTimeout(ctx.refresh, 0); } }] }); }, 0);
          } }] });
        });
        ctx.on('[data-kcopy]', function (e, b) { var k = keys.filter(function (x) { return x.id === b.dataset.kcopy; })[0]; if (k) { UI.copy(k.key); MCM.audit('API key copied', k.name); } });
        ctx.on('[data-krev]', function (e, b) { if (!guard('revoke API keys')) return; var k = keys.filter(function (x) { return x.id === b.dataset.krev; })[0]; UI.confirm('Revoke "' + esc(k.name) + '"? Clients using it will stop working.', 'Revoke').then(function (ok) { if (!ok) return; k.revoked = true; S.set('apiKeys', keys); MCM.audit('API key revoked', k.name); ctx.refresh(); }); });
        ctx.on('[data-wadd]', function () {
          if (!guard('add webhooks')) return; var url = q('[data-wurl]').value.trim(), evs = Array.prototype.slice.call(el.querySelectorAll('[data-wev]:checked')).map(function (i) { return i.dataset.wev; });
          if (!/^https:\/\/[^\s/]+\.[^\s]+$/i.test(url)) { UI.toast('Enter a valid https:// URL', { kind: 'bad' }); return; } if (!evs.length) { UI.toast('Choose at least one event', { kind: 'bad' }); return; }
          hooks.push({ id: nid('w'), url: url, events: evs, active: true }); S.set('webhooks', hooks); MCM.audit('Webhook added', url + ' [' + evs.join(', ') + ']'); ctx.refresh();
        });
        ctx.on('[data-wen]', function (e, b) { if (!guard('change webhooks')) return; var h = hooks.filter(function (x) { return x.id === b.dataset.wen; })[0]; h.active = !h.active; S.set('webhooks', hooks); MCM.audit('Webhook ' + (h.active ? 'enabled' : 'disabled'), h.url); ctx.refresh(); });
        ctx.on('[data-wdel]', function (e, b) { if (!guard('delete webhooks')) return; var h = hooks.filter(function (x) { return x.id === b.dataset.wdel; })[0]; S.set('webhooks', hooks.filter(function (x) { return x !== h; })); MCM.audit('Webhook deleted', h.url); ctx.refresh(); });
        function lastCall() { return MCM.calls[MCM.calls.length - 1]; }
        function event(type) {
          var c = lastCall(), data;
          if (type === 'call.started') data = { call_id: c.id, queue: MCM.qById[c.q].name, direction: c.dir, from: MCM.mask(c.from), agent_id: c.agent || null, started_at: iso(c.ts) };
          else if (type === 'call.ended') data = { call_id: c.id, queue: MCM.qById[c.q].name, direction: c.dir, from: MCM.mask(c.from), agent_id: c.agent || null, outcome: c.outcome, wait_s: c.wait, talk_s: c.talk, disposition: c.disp || null, ended_at: iso(c.ts + (c.wait + c.talk + c.hold) * 1000) };
          else if (type === 'agent.status') { var a = MCM.agents.filter(function (x) { return x.role === 'Agent'; })[0], la = MCM.live.agents[a.id]; data = { agent_id: a.id, name: a.name, status: la.status, since: iso(la.since) }; }
          else { var al = MCM.alerts[0]; data = al ? { alert_id: al.id, rule: al.ruleName, scope: al.scopeName, metric: al.metric, value: al.value, threshold: al.threshold, severity: al.sev, raised_at: iso(al.ts) } : { alert_id: 'al_sample', rule: MCM.alertRules[0].name, scope: MCM.queues[0].name, metric: MCM.alertRules[0].metric, value: 71.4, threshold: MCM.alertRules[0].value, severity: MCM.alertRules[0].sev, raised_at: iso(Date.now()) }; }
          return { id: 'evt_' + Math.floor(Date.now() / 1000).toString(36), type: type, created: iso(Date.now()), data: data };
        }
        ctx.on('[data-wtest]', function (e, b) {
          var h = hooks.filter(function (x) { return x.id === b.dataset.wtest; })[0], evs = h.events;
          UI.modal({ title: 'Test event', body: '<p class="muted" style="margin-bottom:1rem">POST ' + esc(h.url) + ' <span class="muted">(not sent - demo)</span></p><label class="fg" style="margin-bottom:1rem"><span>Event</span><select class="inp" data-evsel>' + UI.opts(evs, evs[0]) + '</select></label><div id="evbody">' + json(event(evs[0])) + '</div>', onOpen: function (m) { m.querySelector('[data-evsel]').onchange = function (ev) { m.querySelector('#evbody').innerHTML = json(event(ev.target.value)); }; }, foot: [{ label: 'Copy JSON', fn: function (m) { UI.copy(m.querySelector('#evbody pre').textContent); return false; } }, { label: 'Close', pri: true }] });
          MCM.audit('Webhook test event', h.url);
        });
        ctx.on('[data-ep]', function (e, b) {
          var k = b.dataset.ep, out;
          if (k === 'calls') out = { data: MCM.calls.slice(-2).map(function (c) { return { id: c.id, started_at: iso(c.ts), queue: c.q, direction: c.dir, from: MCM.mask(c.from), agent_id: c.agent || null, outcome: c.outcome, wait_s: c.wait, talk_s: c.talk, disposition: c.disp || null }; }), total: MCM.calls.length, page: 1 };
          else if (k === 'queues') out = { data: MCM.queues.slice(0, 3).map(function (x) { var lq = MCM.liveQueue(x.id, 15); return { id: x.id, name: x.name, ext: x.ext, channel: x.channel, waiting: lq.waiting, longest_wait_s: Math.round(lq.longest), agents_available: lq.available, service_level_pct: lq.agg.sl == null ? null : +lq.agg.sl.toFixed(1), sl_target_pct: x.sl.target }; }), total: MCM.queues.length };
          else if (k === 'agents') out = { data: MCM.agents.filter(function (a) { return a.role === 'Agent'; }).slice(0, 3).map(function (a) { var la = MCM.live.agents[a.id]; return { agent_id: a.id, name: a.name, status: la.status, since: iso(la.since), queues: a.queues }; }), as_of: iso(Date.now()) };
          else { var g = MCM.agg(MCM.query({ from: MCM.TODAY, to: Date.now(), ignoreFilters: true, dir: 'in' })); out = { period: 'today', timezone: MCM.settings.tz, offered: g.offered, answered: g.answered, abandoned: g.abandoned, service_level_pct: g.sl == null ? null : +g.sl.toFixed(1), asa_s: Math.round(g.asa), aht_s: Math.round(g.aht), abandon_rate_pct: +g.abandonRate.toFixed(1) }; }
          var ep = EP.filter(function (x) { return x[3] === k; })[0];
          UI.modal({ title: ep[0] + ' ' + ep[1], body: '<p class="muted" style="margin-bottom:1rem">Sample response built from live demo data ' + UI.preview() + '</p>' + json(out), foot: [{ label: 'Copy JSON', fn: function (m) { UI.copy(m.querySelector('pre').textContent); return false; } }, { label: 'Close', pri: true }] });
        });
      }

      /* ================= COMPLIANCE ================= */
      else if (tab === 'compliance') {
        var cons = S.get('consent', { on: true, text: 'This call may be recorded for quality and training purposes.' }), dnc = S.get('dnc', []), dsr = S.get('dsr', []), cs = MCM.settings;
        el.innerHTML = notice + '<div class="grid g2">' + UI.card('Retention', '<div class="fg c2"><label>Call data (days)<input class="inp" type="number" min="7" max="3650" data-ret="retentionDays" value="' + cs.retentionDays + '"' + dis + '></label><label>Recordings (days)<input class="inp" type="number" min="7" max="3650" data-ret="recordingRetentionDays" value="' + cs.recordingRetentionDays + '"' + dis + '></label></div><div style="margin-top:1.4rem"><button class="btn pri" data-retsave' + dis + '>Save retention</button></div><div class="muted mt" style="font-size:1.1rem">' + UI.preview() + ' Purging runs on a server; here the values are stored and shown in the audit log.</div>') +
          UI.card('PII masking', '<div style="display:flex;align-items:center;gap:1.2rem">' + UI.sw(cs.piiMask, 'data-pii' + dis) + '<div><b>Mask phone numbers everywhere</b><div class="muted">Example: <span class="mono">' + esc(MCM.mask('+91 9876543210') || '') + '</span></div></div></div><div class="muted mt" style="font-size:1.1rem">Applies app-wide through MCM.mask() and takes effect immediately.</div><hr style="margin:1.6rem 0;border:0;border-top:1px solid var(--line)"><div style="display:flex;align-items:center;gap:1.2rem">' + UI.sw(cons.on, 'data-cons' + dis) + '<div style="flex:1"><b>Recording consent announcement</b></div></div><label class="fg mt"><span style="font-size:1.1rem;font-weight:600">Announcement text</span><textarea class="inp" data-constext' + dis + '>' + esc(cons.text) + '</textarea></label><div style="margin-top:1rem"><button class="btn sm" data-conssave' + dis + '>Save announcement</button></div>') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Do-not-call list', '<div class="muted" style="margin-bottom:1rem;font-size:1.15rem"><b>' + f.n(dnc.length) + '</b> numbers on the list' + (MCM.campaigns.length ? ' - campaigns also suppressed ' + f.n(MCM.campaigns.reduce(function (s, c) { return s + c.dnc; }, 0)) + ' leads' : '') + '.</div><label class="fg"><span style="font-size:1.1rem;font-weight:600">Paste numbers (one per line or comma separated)</span><textarea class="inp" data-dncin placeholder="+91 98765 43210" ' + dis + '></textarea></label><div style="margin-top:1rem;display:flex;gap:1rem"><button class="btn pri sm" data-dncadd' + dis + '>Add to list</button><button class="btn sm danger" data-dncclr' + dis + '>Clear list</button></div><div id="sdnc" style="margin-top:1.4rem"></div>', { sub: 'Numbers are masked in the table when PII masking is on.' }) +
          UI.card('Data-subject requests (GDPR / DPDP)', '<div class="fg c3"><label>Type<select class="inp" data-dsrt' + dis + '>' + UI.opts(['Access', 'Erasure', 'Rectification', 'Portability'], 'Access') + '</select></label><label style="grid-column:span 2">Data subject (name or e-mail)<input class="inp" data-dsrs' + dis + '></label></div><div style="margin:1rem 0 1.4rem"><button class="btn pri sm" data-dsradd' + dis + '>Log request</button> <span class="muted" style="font-size:1.1rem">Due 30 days after receipt.</span></div><div id="sdsr"></div>') + '</div>';
        ctx.on('[data-retsave]', function () {
          if (!guard('change retention')) return; var a = +q('[data-ret="retentionDays"]').value, b = +q('[data-ret="recordingRetentionDays"]').value; if (!(a >= 7 && b >= 7)) { UI.toast('Retention must be at least 7 days', { kind: 'bad' }); return; }
          cs.retentionDays = a; cs.recordingRetentionDays = b; persistSettings(); MCM.audit('Retention changed', 'calls ' + a + ' d, recordings ' + b + ' d'); UI.toast('Retention saved', { kind: 'ok' });
        });
        ctx.on('[data-pii]', function () { if (!guard('change PII masking')) return; cs.piiMask = !cs.piiMask; persistSettings(); MCM.audit('PII masking ' + (cs.piiMask ? 'enabled' : 'disabled'), 'Phone numbers ' + (cs.piiMask ? 'masked' : 'visible')); UI.toast('PII masking ' + (cs.piiMask ? 'on' : 'off'), { kind: 'ok' }); ctx.refresh(); });
        ctx.on('[data-cons]', function () { if (!guard('change consent settings')) return; cons.on = !cons.on; S.set('consent', cons); MCM.audit('Recording consent ' + (cons.on ? 'enabled' : 'disabled'), ''); ctx.refresh(); });
        ctx.on('[data-conssave]', function () { if (!guard('change consent settings')) return; cons.text = q('[data-constext]').value.trim(); S.set('consent', cons); MCM.audit('Consent announcement edited', cons.text.slice(0, 80)); UI.toast('Saved', { kind: 'ok' }); });
        UI.table(document.getElementById('sdnc'), { id: 'sdnct', noun: 'numbers', csv: 'dnc-list-masked', pageSize: 6, colChooser: false, rows: dnc.map(function (n) { return { n: n }; }), emptyTitle: 'List is empty', emptySub: 'Paste numbers above.', cols: [{ k: 'n', label: 'Number', html: function (r) { return '<span class="mono">' + esc(MCM.mask(r.n)) + '</span>'; }, val: function (r) { return MCM.mask(r.n); } }, { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (r) { return A ? '<button class="btn xs danger" data-dncdel="' + esc(r.n) + '">Remove</button>' : ''; } }] });
        ctx.on('[data-dncadd]', function () {
          if (!guard('edit the DNC list')) return; var raw = q('[data-dncin]').value.split(/[\n,;]+/).map(function (x) { return x.trim(); }).filter(Boolean), bad = 0, added = 0;
          raw.forEach(function (n) { var digits = n.replace(/\D/g, ''); if (digits.length < 7 || digits.length > 15) { bad++; return; } var norm = (n[0] === '+' ? '+' : '') + digits; if (dnc.indexOf(norm) < 0) { dnc.push(norm); added++; } });
          S.set('dnc', dnc); MCM.audit('DNC list updated', added + ' added' + (bad ? ', ' + bad + ' invalid' : '')); UI.toast(added + ' added' + (bad ? ', ' + bad + ' invalid skipped' : ''), { kind: bad ? '' : 'ok' }); ctx.refresh();
        });
        ctx.on('[data-dncdel]', function (e, b) { if (!guard('edit the DNC list')) return; S.set('dnc', dnc.filter(function (x) { return x !== b.dataset.dncdel; })); MCM.audit('DNC number removed', ''); ctx.refresh(); });
        ctx.on('[data-dncclr]', function () { if (!guard('edit the DNC list')) return; UI.confirm('Remove all ' + dnc.length + ' numbers from the DNC list?', 'Clear').then(function (ok) { if (!ok) return; S.set('dnc', []); MCM.audit('DNC list cleared', dnc.length + ' numbers'); ctx.refresh(); }); });
        UI.table(document.getElementById('sdsr'), { id: 'sdsrt', noun: 'requests', csv: 'dsr-log', pageSize: 6, colChooser: false, rows: dsr, sort: 'ts', dir: 'desc', emptyTitle: 'No requests logged', emptySub: 'Log a request when a data subject contacts you.',
          cols: [{ k: 'id', label: 'Ref', html: function (r) { return '<span class="mono">' + r.id.toUpperCase().slice(0, 8) + '</span>'; }, val: function (r) { return r.id; } }, { k: 'type', label: 'Type', html: function (r) { return esc(r.type); }, val: function (r) { return r.type; } }, { k: 'who', label: 'Subject', html: function (r) { return esc(r.who); }, val: function (r) { return r.who; } }, { k: 'ts', label: 'Received', html: function (r) { return T.date(r.ts); }, val: function (r) { return r.ts; } }, { k: 'due', label: 'Due', html: function (r) { var late = r.status !== 'done' && r.due < Date.now(); return '<span class="' + (late ? 'bad-t' : '') + '">' + T.date(r.due) + (late ? ' (overdue)' : '') + '</span>'; }, val: function (r) { return r.due; } }, { k: 'st', label: 'Status', html: function (r) { return r.status === 'done' ? UI.tag('Completed', 'ok') : UI.tag('Open', 'warn'); }, val: function (r) { return r.status; } }, { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (r) { return r.status !== 'done' && A ? '<button class="btn xs" data-dsrdone="' + r.id + '">Mark complete</button>' : ''; } }] });
        ctx.on('[data-dsradd]', function () { if (!guard('log data-subject requests')) return; var w = q('[data-dsrs]').value.trim(); if (!w) { UI.toast('Enter the data subject', { kind: 'bad' }); return; } var now = Date.now(); dsr.unshift({ id: nid('dsr'), type: q('[data-dsrt]').value, who: w, ts: now, due: now + 30 * T.day, status: 'open' }); S.set('dsr', dsr); MCM.audit('Data-subject request logged', q('[data-dsrt]').value + ' - ' + w); ctx.refresh(); });
        ctx.on('[data-dsrdone]', function (e, b) { if (!guard('update data-subject requests')) return; var r = dsr.filter(function (x) { return x.id === b.dataset.dsrdone; })[0]; r.status = 'done'; S.set('dsr', dsr); MCM.audit('Data-subject request completed', r.type + ' - ' + r.who); ctx.refresh(); });
      }

      /* ================= AUDIT ================= */
      else if (tab === 'audit') {
        var actF = 'all';
        function auditRows() { var l = S.get('audit', []); return actF === 'all' ? l : l.filter(function (r) { return r.action === actF; }); }
        function actions() { var m = {}; S.get('audit', []).forEach(function (r) { m[r.action] = 1; }); return Object.keys(m).sort(); }
        function frame() { el.innerHTML = notice + UI.card('Audit log', '<div id="sa"></div>', { flush: true, sub: 'Last 300 changes and exports, newest first. Updates live.', acts: '<select class="inp sm" data-aud style="min-width:18rem">' + UI.opts([['all', 'All actions']].concat(actions().map(function (a) { return [a, a]; })), actF) + '</select>' }); }
        frame();
        var atbl = UI.table(document.getElementById('sa'), { id: 'saud', noun: 'entries', csv: 'audit-log', pageSize: 15, rows: auditRows(), sort: 'ts', dir: 'desc', emptyTitle: 'No audit entries yet', emptySub: 'Changes and exports will appear here.',
          cols: [{ k: 'ts', label: 'Time', html: function (r) { return T.dt(r.ts); }, val: function (r) { return r.ts; }, csv: function (r) { return iso(r.ts); } }, { k: 'user', label: 'User', html: function (r) { return '<b>' + esc(r.user) + '</b>'; }, val: function (r) { return r.user; } }, { k: 'role', label: 'Role', html: function (r) { return UI.tag(r.role); }, val: function (r) { return r.role; } }, { k: 'action', label: 'Action', html: function (r) { return esc(r.action); }, val: function (r) { return r.action; } }, { k: 'detail', label: 'Detail', html: function (r) { return '<span title="' + esc(r.detail) + '">' + esc(r.detail) + '</span>'; }, val: function (r) { return r.detail; } }] });
        onChange('[data-aud]', function (t) { actF = t.value; atbl.setRows(auditRows()); });
        ctx.sub('audit', function () { if (!document.querySelector('.modal,.pop')) { atbl.setRows(auditRows()); var s = q('[data-aud]'); if (s && s.options.length - 1 !== actions().length) { s.innerHTML = UI.opts([['all', 'All actions']].concat(actions().map(function (a) { return [a, a]; })), actF); } } });
      }

      /* ================= GENERAL ================= */
      else if (tab === 'general') {
        var gs = MCM.settings, theme = S.get('theme', 'light') === 'dark' ? 'dark' : 'light', cur = pendingTz || gs.tz;
        var CUR = [['USD', 'US dollar (USD)'], ['EUR', 'Euro (EUR)'], ['GBP', 'Pound sterling (GBP)'], ['INR', 'Indian rupee (INR)'], ['AED', 'UAE dirham (AED)'], ['AUD', 'Australian dollar (AUD)']];
        var pages = Object.keys(MCM.pages).filter(function (id) { return !MCM.pages[id].roles || MCM.pages[id].roles.indexOf(MCM.user.role) >= 0; }).map(function (id) { return [id, MCM.pages[id].title]; });
        el.innerHTML = notice + '<div class="grid g2">' + UI.card('Regional', '<div class="fg"><label>Timezone<select class="inp" data-g="tz"' + dis + '>' + UI.opts(ZONES.indexOf(cur) >= 0 ? ZONES : [cur].concat(ZONES), cur) + '</select></label>' + (pendingTz && pendingTz !== gs.tz ? '<div class="note warn">' + UI.icon('info') + '<span>Saved: <b>' + esc(pendingTz) + '</b>. The app is still using <b>' + esc(gs.tz) + '</b> until you reload.</span><button class="btn sm pri" data-reload>Reload now</button></div>' : '<div class="muted" style="font-size:1.1rem">Changing the timezone re-bases all data and needs a reload.</div>') + '<div class="fg c2"><label>Currency<select class="inp" data-g="currency"' + dis + '>' + UI.opts(CUR, gs.currency) + '</select></label><label>Date format<select class="inp" data-g="dateFormat"' + dis + '>' + UI.opts(['DD MMM YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], S.get('dateFormat', 'DD MMM YYYY')) + '</select></label></div><div class="muted" style="font-size:1.1rem">Currency and date format are saved as preferences; amounts and dates still render as $ and DD MMM YYYY in this demo ' + UI.preview() + '</div><label>Language<select class="inp" data-g="lang"' + dis + '><option value="en" selected>English</option><option disabled>Hindi (coming soon)</option><option disabled>Spanish (coming soon)</option><option disabled>German (coming soon)</option></select></label></div>') +
          UI.card('Billing and display', '<div class="fg c2"><label>Prepaid balance (USD)<input class="inp" type="number" min="0" step="0.01" data-g="walletBalance" value="' + gs.walletBalance + '"' + dis + '></label><label>Cost per minute (USD)<input class="inp" type="number" min="0" step="0.001" data-g="ratePerMin" value="' + gs.ratePerMin + '"' + dis + '></label></div><div class="fg c2 mt"><label>Default landing page<select class="inp" data-g="landing"' + dis + '>' + UI.opts(pages, S.get('landing', 'queues')) + '</select></label><label>Theme<select class="inp" data-g="theme"' + dis + '>' + UI.opts([['light', 'Light'], ['dark', 'Dark']], theme) + '</select></label></div><div style="margin-top:1.4rem"><button class="btn pri" data-gsave' + dis + '>Save billing settings</button></div><div class="muted mt" style="font-size:1.1rem">Balance updates the wallet in the top bar. Cost per minute drives the cost figures on analytics pages after a reload.</div>') + '</div>' +
          UI.card('Data', '<div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:center"><button class="btn" data-export>' + UI.icon('dl') + 'Export all settings (JSON)</button><button class="btn danger" data-reset' + dis + '>Reset demo data</button><span class="muted" style="font-size:1.15rem">Reset clears every saved setting, filter, rule, evaluation and audit entry in this browser and reloads.</span></div>', {});
        ctx.on('[data-reload]', function () { location.reload(); });
        onChange('[data-g="tz"]', function (t) { if (!guard('change the timezone')) return; pendingTz = t.value; S.set('pendingTz', pendingTz); var s = S.get('settings', {}); s.tz = pendingTz; S.set('settings', s); MCM.audit('Timezone changed', pendingTz + ' (applies after reload)'); UI.toast('Timezone saved. Reload to apply.', { kind: 'ok', action: { label: 'Reload', fn: function () { location.reload(); } } }); ctx.refresh(); });
        onChange('[data-g="currency"]', function (t) { if (!guard('change currency')) return; gs.currency = t.value; persistSettings(); MCM.audit('Currency changed', t.value); UI.toast('Saved', { kind: 'ok', ms: 1200 }); });
        onChange('[data-g="dateFormat"]', function (t) { if (!guard('change date format')) return; S.set('dateFormat', t.value); MCM.audit('Date format changed', t.value); UI.toast('Saved', { kind: 'ok', ms: 1200 }); });
        onChange('[data-g="lang"]', function (t) { if (!guard('change language')) return; gs.lang = t.value; persistSettings(); });
        ctx.on('[data-gsave]', function () {
          if (!guard('change billing settings')) return; var w = +q('[data-g="walletBalance"]').value, r = +q('[data-g="ratePerMin"]').value;
          if (isNaN(w) || w < 0 || isNaN(r) || r < 0) { UI.toast('Enter valid non-negative numbers', { kind: 'bad' }); return; }
          var land = q('[data-g="landing"]').value, th = q('[data-g="theme"]').value;
          gs.walletBalance = w; gs.ratePerMin = r; persistSettings(); var wl = document.getElementById('wallet'); if (wl) wl.textContent = f.money(w);
          S.set('landing', land); S.set('theme', th); if (th === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
          MCM.audit('General settings changed', 'balance ' + f.money(w) + ', rate ' + r + '/min, landing ' + land + ', theme ' + th); UI.toast('Settings saved', { kind: 'ok' }); setTimeout(ctx.refresh, 30);
        });
        ctx.on('[data-export]', function () {
          var o = {}; Object.keys(localStorage).filter(function (k) { return k.indexOf('mcm2.') === 0; }).forEach(function (k) { try { o[k.slice(5)] = JSON.parse(localStorage.getItem(k)); } catch (e) { o[k.slice(5)] = localStorage.getItem(k); } });
          download('mcm-settings-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json', JSON.stringify({ exportedAt: iso(Date.now()), exportedBy: me(), settings: o }, null, 2)); MCM.audit('Export settings', Object.keys(o).length + ' keys'); UI.toast('Settings exported', { kind: 'ok' });
        });
        ctx.on('[data-reset]', function () { if (!guard('reset demo data')) return; UI.confirm('Clear all saved settings, filters, alert rules, evaluations and audit data in this browser, then reload?', 'Reset').then(function (ok) { if (ok) { Object.keys(localStorage).filter(function (k) { return k.indexOf('mcm2.') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); location.reload(); } }); });
      }
    }
  });
})();
