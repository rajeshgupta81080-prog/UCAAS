/* MCM Analytics v2 - app shell: router, filter bar, command palette, notifications, roles. */
(function () {
  var UI = window.UI, $ = UI.$, esc = UI.esc;
  var pages = MCM.pages = {}, order = [];
  MCM.page = function (p) { pages[p.id] = p; order.push(p.id); };

  /* ---------- roles & permissions ---------- */
  var PERMS = { Admin: ['*'], Supervisor: ['view', 'export', 'supervise', 'alerts', 'quality', 'coach', 'wfm', 'recordings', 'manage-queues'], Coach: ['view', 'export', 'quality', 'coach', 'recordings'], Agent: ['view'], 'Read-only': ['view'] };
  MCM.can = function (p) { var l = PERMS[MCM.user.role] || []; return l.indexOf('*') >= 0 || l.indexOf(p) >= 0; };
  MCM.deny = function (what) { UI.toast('Your role (' + MCM.user.role + ') cannot ' + (what || 'do this') + '. Switch role from the avatar menu.', { kind: 'bad' }); return false; };

  /* ---------- navigation model (same sidebar items as MCM-Analytics, plus the missing modules) ---------- */
  var NAV = ['queues', 'agents', 'calls', 'flows', 'boards', '-', 'live', 'monitoring', 'callbacks', 'campaigns', 'aiwall', '-', 'speech', 'quality', 'coaching', 'activity', 'reports', '-', 'wfm', '-', 'alerts', 'settings'];
  var TOPNAV = [['Dashboard', 'boards', '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'], ['Directory', 'settings/users', '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="10" r="3"/><path d="M6 19c1-3 4-4 6-4s5 1 6 4"/>'], ['Interactions', 'calls', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'], ['Analytics', 'queues', '<path d="M5 20V10M12 20V4M19 20v-7"/>'], ['Settings', 'settings', '<circle cx="9" cy="7" r="3.2"/><path d="M3 20c0-3.5 3-5.5 6-5.5M15 17h6M18 14v6"/>']];
  var AGENT_PAGES = ['agents', 'calls', 'activity', 'quality', 'coaching', 'wfm'];
  function visible(id) { var p = pages[id]; if (!p) return false; if (p.roles && p.roles.indexOf(MCM.user.role) < 0) return false; if (MCM.user.role === 'Agent' && AGENT_PAGES.indexOf(id) < 0) return false; return true; }

  /* ---------- router ---------- */
  var cur = { id: null, tab: null, params: {} }, view, body, timers = [], subs = [], handlers = [];
  function parse() {
    var h = (location.hash || '#/queues').replace(/^#\/?/, ''), q = h.split('?'), seg = q[0].split('/'), params = {};
    if (q[1]) q[1].split('&').forEach(function (kv) { var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return { id: seg[0] || 'queues', tab: seg[1] || null, params: params };
  }
  MCM.go = function (id, tab, params) { var h = '#/' + id + (tab ? '/' + tab : '') + (params ? '?' + Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&') : ''); if (location.hash === h) route(); else location.hash = h; };
  function cleanup() { timers.forEach(clearInterval); timers = []; subs.forEach(function (s) { MCM.bus.off(s[0], s[1]); }); subs = []; handlers = []; }
  function makeCtx(p) {
    var ctx = {
      el: body, tab: cur.tab, params: cur.params, page: p, R: MCM.F.resolve(), F: MCM.F,
      refresh: function () { render(true); }, setTab: function (t) { MCM.go(p.id, t, null); },
      go: MCM.go, q: MCM.query, prev: MCM.queryPrev,
      on: function (sel, fn) { handlers.push([sel, fn]); },
      every: function (ms, fn) { timers.push(setInterval(function () { if (document.body.contains(body)) fn(); }, ms)); },
      sub: function (evt, fn) { MCM.bus.on(evt, fn); subs.push([evt, fn]); },
      acts: function (html) { var a = $('#pacts'); if (a) a.innerHTML = html; },
      meta: function (html) { var m = $('#pmeta'); if (m) m.innerHTML = html; },
      fullscreen: function (on) { document.body.classList.toggle('tv', !!on); }
    };
    return ctx;
  }
  function renderChrome(p) {
    var tabs = p.tabs ? '<div class="tabs" role="tablist">' + p.tabs.map(function (t) { return '<button role="tab" class="' + (t[0] === cur.tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' : '';
    view.innerHTML = '<div class="ph"><div><h1>' + esc(p.title) + '</h1><div class="meta" id="pmeta"></div></div><div class="acts" id="pacts"></div></div>' + tabs + '<div id="pbody"></div>';
    body = $('#pbody', view);
  }
  function render(soft) {
    var p = pages[cur.id]; if (!p) return;
    var scroll = view.scrollTop; cleanup(); if (!soft) { document.body.classList.remove('tv'); }
    if (p.tabs && !cur.tab) cur.tab = p.tabs[0][0];
    renderChrome(p); renderFilters(p); var ctx = makeCtx(p);
    var R = ctx.R; ctx.meta('<span>' + UI.icon('cal') + ' ' + esc(p.filters && p.filters.indexOf('date') >= 0 ? R.label + (R.compare ? ' vs previous period' : '') : 'Live') + '</span><span>' + esc(MCM.settings.tz) + '</span>' + (p.sub ? '<span>' + p.sub + '</span>' : ''));
    try { p.render(ctx); } catch (e) { console.error(e); body.innerHTML = UI.card('This page hit an error', '<pre style="white-space:pre-wrap;color:var(--bad)">' + esc(e.stack || e) + '</pre>'); }
    view.scrollTop = soft ? scroll : 0; MCM._ctx = ctx;
  }
  function route() {
    var r = parse(); if (!pages[r.id]) r.id = 'queues';
    if (!visible(r.id)) { r.id = MCM.user.role === 'Agent' ? 'agents' : 'queues'; if (!visible(r.id)) r.id = order.filter(visible)[0]; }
    UI.closeDrawer(true); UI.closeModal(); UI.closePop();
    cur = { id: r.id, tab: r.tab, params: r.params }; markNav(); render(false);
  }

  /* delegated clicks (data-go, data-tab, data-def and page handlers) */
  function onClick(e) {
    var t = e.target, el;
    if ((el = t.closest('.tabs [data-tab]'))) { cur.tab = el.dataset.tab; MCM.go(cur.id, cur.tab, null); return; }
    handlers.forEach(function (h) { var m = t.closest(h[0]); if (m && view.contains(m)) h[1](e, m); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target, el;
    if ((el = t.closest('[data-def]'))) { UI.def(el.dataset.def); return; }
    if ((el = t.closest('[data-go]')) && !t.closest('.pop,.palette')) { var g = el.dataset.go.split('/'); UI.closeDrawer(true); UI.closeModal(); MCM.go(g[0], g[1] || null); }
  });

  /* ---------- sidebar ---------- */
  var side = $('#side');
  function buildNav() {
    side.innerHTML = ''; var last = null;
    NAV.forEach(function (n) {
      if (n === '-') { if (last !== '-' && side.lastChild) { side.appendChild(document.createElement('hr')); last = '-'; } return; }
      if (!visible(n)) return; var p = pages[n], a = document.createElement('a'); a.href = '#/' + n; a.dataset.v = n; a.innerHTML = UI.icon(p.icon || n) + (p.label || p.title) + (n === 'alerts' ? '<span class="nb" id="nbAlerts" style="display:none"></span>' : ''); side.appendChild(a); last = n;
    });
    if (side.lastChild && side.lastChild.tagName === 'HR') side.lastChild.remove(); updateBadges();
  }
  function markNav() {
    side.querySelectorAll('a').forEach(function (a) { var on = a.dataset.v === cur.id; a.classList.toggle('on', on); if (on) { var t = a.offsetTop, b = t + a.offsetHeight; if (t < side.scrollTop) side.scrollTop = t - 20; else if (b > side.scrollTop + side.clientHeight) side.scrollTop = b - side.clientHeight + 20; } });
    document.querySelectorAll('.tnav a').forEach(function (a) { var key = a.dataset.k, on = (key === 'Settings' && cur.id === 'settings' && cur.tab !== 'users') || (key === 'Directory' && cur.id === 'settings' && cur.tab === 'users') || (key === 'Dashboard' && cur.id === 'boards') || (key === 'Interactions' && cur.id === 'calls') || (key === 'Analytics' && ['settings', 'boards', 'calls'].indexOf(cur.id) < 0); a.classList.toggle('on', on); });
    document.title = (pages[cur.id] ? pages[cur.id].title + ' - ' : '') + 'MCM Analytics';
  }
  function updateBadges() {
    var act = MCM.alerts.filter(function (a) { return !a.resolved && !a.ack; }).length, b = $('#bellBadge'), n = $('#nbAlerts');
    b.textContent = act; b.classList.toggle('hide', !act); if (n) { n.textContent = act; n.style.display = act ? '' : 'none'; }
  }

  /* ---------- filter bar ---------- */
  var fbar = $('#fbar');
  function ymd(ts) { var p = MCM.T.parts(ts); return p.y + '-' + (p.mo < 10 ? '0' : '') + p.mo + '-' + (p.d < 10 ? '0' : '') + p.d; }
  function fromYmd(s) { var a = s.split('-'); return MCM.T.sod(Date.UTC(+a[0], +a[1] - 1, +a[2], 12)); }
  function renderFilters(p) {
    var F = MCM.F, fl = p.filters || [], h = '';
    if (!fl.length && p.live === false) { fbar.style.display = 'none'; return; } fbar.style.display = '';
    if (fl.indexOf('date') >= 0) {
      h += '<label class="sel">' + UI.icon('cal') + '<select data-f="preset">' + UI.opts(MCM.PRESETS, F.preset) + '</select></label>';
      if (F.preset === 'custom') h += '<input type="date" class="inp sm" data-f="from" value="' + ymd(F.from || MCM.TODAY) + '" max="' + ymd(MCM.TODAY) + '"><span class="muted">to</span><input type="date" class="inp sm" data-f="to" value="' + ymd(F.to || MCM.TODAY) + '" max="' + ymd(MCM.TODAY) + '">';
      h += '<button class="btn ' + (F.compare ? 'pri' : '') + '" data-f="compare" title="Compare with the previous period">Compare</button>';
    }
    if (fl.indexOf('queue') >= 0) h += '<button class="sel" data-pop="queue">' + UI.icon('queues') + (F.queues.length ? F.queues.length + ' queue' + (F.queues.length > 1 ? 's' : '') : 'All queues') + UI.icon('chev') + '</button>';
    if (fl.indexOf('team') >= 0) h += '<button class="sel" data-pop="team">' + UI.icon('agents') + (F.teams.length ? F.teams.join(', ') : 'All teams') + UI.icon('chev') + '</button>';
    if (fl.indexOf('channel') >= 0) h += '<label class="sel"><select data-f="channel">' + UI.opts([['all', 'All channels'], ['voice', 'Voice'], ['chat', 'Chat']], F.channel) + '</select></label>';
    if (fl.indexOf('dir') >= 0) h += '<label class="sel"><select data-f="dir">' + UI.opts([['all', 'In + Out'], ['in', 'Inbound'], ['out', 'Outbound']], F.dir) + '</select></label>';
    if (fl.some(function (x) { return x !== 'date' && x !== 'queue' && x !== 'team' && x !== 'channel' && x !== 'dir'; }) === false && (F.queues.length || F.teams.length || F.channel !== 'all' || F.dir !== 'all')) h += '<button class="btn ghost sm" data-f="reset">Clear filters</button>';
    h += '<span class="grow"></span>';
    if (p.live !== false) h += '<button class="btn livebtn" id="liveBtn"><span class="ldot' + (MCM.live.running ? '' : ' off') + '"></span>' + (MCM.live.running ? 'Live' : 'Paused') + '</button>';
    h += '<button class="btn" data-f="refresh" title="Refresh">' + UI.icon('refresh') + '</button>';
    h += '<button class="btn" data-f="help" title="Metric definitions">' + UI.icon('info') + 'Glossary</button>';
    fbar.innerHTML = h;
  }
  fbar.addEventListener('change', function (e) {
    var el = e.target.closest('[data-f]'); if (!el) return; var F = MCM.F, k = el.dataset.f;
    if (k === 'preset') { F.preset = el.value; if (el.value === 'custom' && !F.from) { F.from = MCM.TODAY - 6 * MCM.T.day; F.to = MCM.TODAY; } }
    else if (k === 'from') { F.from = fromYmd(el.value); if (F.to && F.to < F.from) F.to = F.from; }
    else if (k === 'to') { F.to = fromYmd(el.value); if (F.from && F.to < F.from) F.from = F.to; }
    else if (k === 'channel' || k === 'dir') F[k] = el.value;
    F.save(); render(true);
  });
  fbar.addEventListener('click', function (e) {
    var t = e.target, F = MCM.F, el;
    if ((el = t.closest('[data-f]')) && el.tagName === 'BUTTON') {
      var k = el.dataset.f; if (k === 'compare') F.compare = !F.compare; else if (k === 'reset') { F.queues = []; F.teams = []; F.channel = 'all'; F.dir = 'all'; } else if (k === 'refresh') { render(true); UI.toast('Refreshed', { ms: 1200 }); return; } else if (k === 'help') { glossary(); return; }
      F.save(); render(true); return;
    }
    if ((el = t.closest('[data-pop]'))) {
      var kind = el.dataset.pop, list = kind === 'queue' ? MCM.queues.map(function (q) { return [q.id, q.name]; }) : MCM.teams.map(function (x) { return [x, x]; }), sel = kind === 'queue' ? F.queues : F.teams;
      UI.pop(el, '<div class="hd">' + (kind === 'queue' ? 'Queues' : 'Teams') + '</div>' + list.map(function (x) { return '<label><input type="checkbox" value="' + x[0] + '"' + (sel.indexOf(x[0]) >= 0 ? ' checked' : '') + '> ' + esc(x[1]) + '</label>'; }).join('') + '<div class="row"><button class="btn sm" data-clr>Clear</button></div>', function (pop) {
        pop.onchange = function () { var v = Array.prototype.slice.call(pop.querySelectorAll('input:checked')).map(function (i) { return i.value; }); if (kind === 'queue') F.queues = v; else F.teams = v; F.save(); render(true); };
        pop.onclick = function (ev) { if (ev.target.closest('[data-clr]')) { if (kind === 'queue') F.queues = []; else F.teams = []; F.save(); UI.closePop(); render(true); } };
      }); return;
    }
    if (t.closest('#liveBtn')) { MCM.setLive(!MCM.live.running); renderFilters(pages[cur.id]); }
  });
  function glossary() {
    var G = MCM.GLOSSARY; UI.modal({ title: 'Metric definitions', body: '<div class="tw"><table class="t"><thead><tr><th>Metric</th><th>Meaning</th><th>Formula</th></tr></thead><tbody>' + Object.keys(G).map(function (k) { return '<tr><td><b>' + G[k][0] + '</b></td><td style="white-space:normal;min-width:24rem">' + G[k][1] + '</td><td class="mono" style="white-space:normal;font-size:1.05rem">' + G[k][2] + '</td></tr>'; }).join('') + '</tbody></table></div>', foot: [{ label: 'Close', pri: true }] });
  }

  /* ---------- top bar ---------- */
  function buildTop() {
    var n = $('#tnav'); n.innerHTML = TOPNAV.map(function (t) { return '<a href="#/' + t[1] + '" data-k="' + t[0] + '"><svg class="i" viewBox="0 0 24 24">' + t[2] + '</svg>' + t[0] + '</a>'; }).join('');
    $('#wallet').textContent = UI.f.money(MCM.settings.walletBalance);
    $('#avatar').textContent = UI.initials((MCM.aById[MCM.user.id] || {}).name);
  }
  function clock() {
    var d = new Date(), p = MCM.T.parts(d.getTime()), z = function (n) { return (n < 10 ? '0' : '') + n; };
    $('#clock').textContent = z(p.h) + ':' + z(p.mi) + ':' + z(p.s); $('#clock').parentNode.title = MCM.settings.tz;
    var duty = MCM.store.get('duty', { on: true, since: Date.now() - 193 * 3600000 - 40 * 60000 }), s = $('#duty'), pill = $('#dutyPill');
    var sec = Math.floor((Date.now() - duty.since) / 1000); s.textContent = duty.on ? Math.floor(sec / 3600) + ':' + z(Math.floor(sec / 60) % 60) + ':' + z(sec % 60) : 'off';
    pill.firstChild.style.background = duty.on ? '#16a34a' : '#94a3b8'; pill.firstChild.nextSibling.data = duty.on ? 'On duty ' : 'Off duty ';
  }
  $('#dutyPill').onclick = function () { var d = MCM.store.get('duty', { on: true, since: Date.now() - 193 * 3600000 }); d = d.on ? { on: false, since: Date.now() } : { on: true, since: Date.now() }; MCM.store.set('duty', d); MCM.audit('Duty status', d.on ? 'On duty' : 'Off duty'); var la = MCM.live.agents[MCM.user.id]; if (la) { la.status = d.on ? 'available' : 'offline'; la.since = Date.now(); la.forced = !d.on; } clock(); };
  $('#theme').onclick = function () { var root = document.documentElement, d = root.getAttribute('data-theme') === 'dark'; if (d) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', 'dark'); MCM.store.set('theme', d ? 'light' : 'dark'); setTimeout(function () { render(true); }, 30); };
  (function () { if (MCM.store.get('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); })();

  /* notifications */
  $('#bell').onclick = function (e) {
    var list = MCM.alerts.slice(0, 8);
    UI.pop(e.currentTarget, '<div class="hd">Notifications</div>' + (list.length ? list.map(function (a) { return '<button class="it" data-go="alerts"><span class="sdot" style="background:' + (a.resolved ? 'var(--faint)' : a.sev === 'high' ? 'var(--bad)' : '#f59e0b') + '"></span><span style="flex:1"><b>' + esc(a.ruleName) + '</b><br><span class="muted">' + esc(a.scopeName) + ' - ' + UI.f.ago(a.ts) + (a.resolved ? ' - resolved' : a.ack ? ' - acknowledged' : '') + '</span></span></button>'; }).join('') : '<div class="empty">No notifications</div>') + '<div class="row"><button class="btn sm" data-go="alerts">Open alert centre</button><button class="btn sm" data-ackall>Acknowledge all</button></div>', function (pop) {
      pop.style.left = Math.max(10, e.currentTarget.getBoundingClientRect().right - 340) + 'px'; pop.style.width = '34rem';
      pop.onclick = function (ev) { if (ev.target.closest('[data-ackall]')) { MCM.alerts.forEach(function (a) { a.ack = true; }); MCM.saveAlerts(); updateBadges(); UI.closePop(); if (cur.id === 'alerts') render(true); } else if (ev.target.closest('[data-go]')) { UI.closePop(); MCM.go('alerts'); } };
    });
  };
  MCM.bus.on('alert', function (al) { updateBadges(); if (!al.muted && al.notify.indexOf('toast') >= 0) UI.toast('<b>' + esc(al.ruleName) + '</b> - ' + esc(al.scopeName) + ' (' + UI.f.dec(al.value, 0) + ')', { kind: al.sev === 'high' ? 'bad' : '', ms: 7000, action: { label: 'View', fn: function () { MCM.go('alerts'); } } }); if (cur.id === 'alerts') render(true); });
  MCM.bus.on('alerts', updateBadges);

  /* avatar menu: role switch */
  $('#avatar').onclick = function (e) {
    var u = MCM.aById[MCM.user.id];
    UI.pop(e.currentTarget, '<div class="hd">' + esc(u.name) + ' - ' + MCM.user.role + '</div><div class="hd">View as role (demo)</div>' + MCM.roles.map(function (r) { return '<button class="it" data-role="' + r + '">' + (r === MCM.user.role ? '✓' : '&nbsp;&nbsp;') + ' ' + r + '</button>'; }).join('') + '<div class="hd">App</div><button class="it" data-keys>Keyboard shortcuts</button><button class="it" data-reset>Reset demo data</button>', function (pop) {
      pop.style.left = Math.max(10, e.currentTarget.getBoundingClientRect().right - 280) + 'px';
      pop.onclick = function (ev) {
        var r = ev.target.closest('[data-role]'); if (r) { MCM.user.role = r.dataset.role; MCM.store.set('user', MCM.user); MCM.audit('Role switched', r.dataset.role); UI.closePop(); buildNav(); route(); UI.toast('Now viewing as ' + MCM.user.role); }
        if (ev.target.closest('[data-keys]')) { UI.closePop(); UI.modal({ title: 'Keyboard shortcuts', body: '<dl class="kv"><dt>Ctrl + K  or  /</dt><dd>Command palette (search pages, agents, queues, calls)</dd><dt>Esc</dt><dd>Close drawer, dialog or palette</dd><dt>g then q / a / c / r / l</dt><dd>Go to Queues / Agents / Calls / Reports / Live</dd></dl>', foot: [{ label: 'Close', pri: true }] }); }
        if (ev.target.closest('[data-reset]')) { UI.closePop(); UI.confirm('Clear all saved settings, filters, alert rules, evaluations and audit data in this browser?', 'Reset').then(function (ok) { if (ok) { Object.keys(localStorage).filter(function (k) { return k.indexOf('mcm2.') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); location.reload(); } }); }
      };
    });
  };

  /* ---------- command palette ---------- */
  var pal = null;
  function openPalette(q) {
    closePalette(); var sc = document.createElement('div'); sc.className = 'scrim on'; sc.style.zIndex = 99; var el = document.createElement('div'); el.className = 'palette'; el.innerHTML = '<input placeholder="Search pages, agents, queues, calls, reports..." autocomplete="off"><div class="res"></div>'; document.body.appendChild(sc); document.body.appendChild(el); pal = [sc, el];
    var inp = el.querySelector('input'), res = el.querySelector('.res'), items = [], sel = 0; inp.value = q || '';
    function build(term) {
      term = term.toLowerCase().trim(); items = [];
      order.filter(visible).forEach(function (id) { var p = pages[id]; items.push({ t: p.title, s: 'Page', go: [id] }); (p.tabs || []).forEach(function (tb) { items.push({ t: p.title + ' / ' + tb[1], s: 'Tab', go: [id, tb[0]] }); }); });
      MCM.queues.forEach(function (x) { items.push({ t: x.name, s: 'Queue ' + x.ext, fn: function () { MCM.drill.queue(x.id); } }); });
      MCM.agents.forEach(function (x) { items.push({ t: x.name, s: 'Agent ' + x.ext, fn: function () { MCM.drill.agent(x.id); } }); });
      if (term.length >= 3) { var n = 0; for (var i = MCM.calls.length - 1; i >= 0 && n < 6; i--) { var c = MCM.calls[i]; if (c.id.toLowerCase() === term || c.from.replace(/\D/g, '').indexOf(term.replace(/\D/g, '')) >= 0 && /\d{3,}/.test(term)) { items.push({ t: c.id + ' - ' + MCM.mask(c.from), s: 'Call ' + MCM.T.dt(c.ts), fn: (function (id) { return function () { MCM.drill.call(id); }; })(c.id) }); n++; } } }
      var out = term ? items.filter(function (x) { return x.t.toLowerCase().indexOf(term) >= 0 || x.s.toLowerCase().indexOf(term) >= 0; }) : items.slice(0, 14);
      items = out.slice(0, 40); sel = 0; paint();
    }
    function paint() { res.innerHTML = items.length ? items.map(function (x, i) { return '<button class="' + (i === sel ? 'on' : '') + '" data-i="' + i + '">' + esc(x.t) + '<small>' + esc(x.s) + '</small></button>'; }).join('') : '<div class="empty">No matches</div>'; }
    function run(i) { var x = items[i]; if (!x) return; closePalette(); if (x.go) MCM.go(x.go[0], x.go[1]); else x.fn(); }
    inp.oninput = function () { build(inp.value); };
    inp.onkeydown = function (e) { if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); paint(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); } else if (e.key === 'Enter') run(sel); };
    res.onclick = function (e) { var b = e.target.closest('[data-i]'); if (b) run(+b.dataset.i); };
    sc.onclick = closePalette; build(inp.value); inp.focus();
  }
  function closePalette() { if (pal) { pal[0].remove(); pal[1].remove(); pal = null; } }
  MCM.openPalette = openPalette;
  $('#searchBox').addEventListener('mousedown', function (e) { e.preventDefault(); openPalette(''); });
  var gKey = 0;
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(''); return; }
    if (e.key === 'Escape') { if (pal) closePalette(); else if (UI.drawerOpen()) UI.closeDrawer(); else { UI.closeModal(); UI.closePop(); if (document.body.classList.contains('tv')) document.body.classList.remove('tv'); } return; }
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); openPalette(''); return; }
    if (e.key === 'g') { gKey = Date.now(); return; }
    if (Date.now() - gKey < 900) { var m = { q: 'queues', a: 'agents', c: 'calls', r: 'reports', l: 'live' }[e.key]; if (m) { gKey = 0; MCM.go(m); } }
  });

  /* ---------- boot ---------- */
  view = $('#view'); view.addEventListener('click', onClick);
  MCM.render = function () { render(true); };
  MCM.refreshNav = function () { buildNav(); markNav(); };
  MCM.boot = function () {
    buildTop(); buildNav(); clock(); setInterval(clock, 1000); window.addEventListener('hashchange', route); route(); MCM.start();
    // gentle auto refresh of analytic pages (only while viewing today, live on, nothing open)
    setInterval(function () {
      var p = pages[cur.id]; if (!p || p.autoRefresh === false || !MCM.live.running) return; if (UI.drawerOpen() || document.querySelector('.modal,.pop,.palette') || document.activeElement && /input|textarea|select/i.test(document.activeElement.tagName)) return;
      if (document.body.classList.contains('tv') && !p.tvRefresh) return; var R = MCM.F.resolve(); if (p.filters && p.filters.indexOf('date') >= 0 && R.to < MCM.T.sod(Date.now()) + 1) return; render(true);
    }, 30000);
  };
})();
