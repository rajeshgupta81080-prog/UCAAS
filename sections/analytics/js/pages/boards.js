/* Boards - wallboard builder + full-screen wallboard. Tiles are rendered once per screen and patched on the board's refresh rate.
   Boards are saved in MCM.store('boards'); a board can be shared as a link (#/boards/wallboard?cfg=<url-safe base64 json>). */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc, L = MCM.live;

  /* ---------- tile catalogue ---------- */
  /* dir: 'high' = higher is worse, 'low' = lower is worse, null = no thresholds */
  var TYPES = {
    sl: { label: 'Service level', kind: 'kpi', dir: 'low', warn: 85, bad: 80, size: 'S', unit: '%' },
    offered: { label: 'Offered today', kind: 'kpi', dir: null, size: 'S' },
    abandon: { label: 'Abandon rate', kind: 'kpi', dir: 'high', warn: 5, bad: 10, size: 'S', unit: '%' },
    asa: { label: 'Average speed of answer', kind: 'kpi', dir: 'high', warn: 20, bad: 40, size: 'S', unit: 's' },
    aht: { label: 'Average handle time', kind: 'kpi', dir: 'high', warn: 330, bad: 450, size: 'S', unit: 's' },
    longest: { label: 'Longest wait', kind: 'kpi', dir: 'high', warn: 60, bad: 120, size: 'S', unit: 's' },
    waiting: { label: 'Waiting now', kind: 'kpi', dir: 'high', warn: 4, bad: 8, size: 'S', unit: '' },
    available: { label: 'Available agents', kind: 'kpi', dir: 'low', warn: 3, bad: 1, size: 'S', unit: '' },
    inprogress: { label: 'Calls in progress', kind: 'kpi', dir: null, size: 'S' },
    csat: { label: 'CSAT today', kind: 'kpi', dir: 'low', warn: 4.3, bad: 4, size: 'S', unit: '' },
    status: { label: 'Agents by status', kind: 'donut', dir: null, size: 'M' },
    queues: { label: 'Queue table', kind: 'table', dir: null, size: 'L' },
    trend: { label: 'Service level trend', kind: 'spark', dir: null, size: 'M' },
    top: { label: 'Top agents', kind: 'list', dir: null, size: 'M' },
    alerts: { label: 'Active alerts', kind: 'list', dir: null, size: 'M' },
    clock: { label: 'Clock', kind: 'clock', dir: null, size: 'S' }
  };
  var TYPE_KEYS = Object.keys(TYPES);
  var SPAN = { S: 3, M: 6, L: 12 };
  var COL = { cOk: '#16a34a', cWarn: '#f59e0b', cBad: '#ef4444' };
  var uid = function () { return 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36); };
  function tile(type, scope, over) { var d = TYPES[type]; return Object.assign({ id: uid(), type: type, scope: scope || 'all', size: d.size, warn: d.warn, bad: d.bad, cOk: COL.cOk, cWarn: COL.cWarn, cBad: COL.cBad }, over || {}); }
  function defaults() {
    return [
      { id: 'b-overview', name: 'Contact centre overview', theme: 'auto', rotate: 20, refresh: 5, screens: [
        ['sl', 'offered', 'abandon', 'asa', 'longest', 'waiting', 'available', 'inprogress', 'queues'].map(function (t) { return tile(t); }),
        [tile('status'), tile('trend'), tile('top'), tile('alerts'), tile('csat'), tile('aht'), tile('clock')]
      ] },
      { id: 'b-sales', name: 'Sales floor', theme: 'dark', rotate: 0, refresh: 3, screens: [
        [tile('sl', 'q1'), tile('offered', 'q1'), tile('abandon', 'q1'), tile('longest', 'q1'), tile('sl', 'q6'), tile('abandon', 'q6'), tile('available', 'q6'), tile('waiting', 'q6'), tile('status', 'q1'), tile('top', 'q1'), tile('trend', 'q1'), tile('clock')]
      ] }
    ];
  }
  function loadBoards() { var b = MCM.store.get('boards', null); if (!b || !b.length) b = defaults(); return b; }
  function saveBoards(b) { MCM.store.set('boards', b); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sanitize(c) {
    c = c || {}; var o = { id: String(c.id || 'b' + uid()), name: String(c.name || 'Wallboard').slice(0, 60), theme: ['light', 'dark', 'auto'].indexOf(c.theme) >= 0 ? c.theme : 'auto', rotate: Math.max(0, Math.min(600, +c.rotate || 0)), refresh: Math.max(2, Math.min(30, +c.refresh || 5)), screens: [] };
    (Array.isArray(c.screens) ? c.screens : []).slice(0, 12).forEach(function (s) {
      var arr = []; (Array.isArray(s) ? s : []).slice(0, 40).forEach(function (t) {
        if (!t || !TYPES[t.type]) return; var scope = t.scope === 'all' || MCM.qById[t.scope] ? t.scope : 'all';
        arr.push(tile(t.type, scope, { id: String(t.id || uid()), size: SPAN[t.size] ? t.size : TYPES[t.type].size, warn: t.warn != null && isFinite(t.warn) ? +t.warn : TYPES[t.type].warn, bad: t.bad != null && isFinite(t.bad) ? +t.bad : TYPES[t.type].bad, cOk: /^#[0-9a-f]{6}$/i.test(t.cOk) ? t.cOk : COL.cOk, cWarn: /^#[0-9a-f]{6}$/i.test(t.cWarn) ? t.cWarn : COL.cWarn, cBad: /^#[0-9a-f]{6}$/i.test(t.cBad) ? t.cBad : COL.cBad }));
      }); o.screens.push(arr);
    });
    if (!o.screens.length) o.screens.push([]); return o;
  }
  function enc(o) { var s = btoa(unescape(encodeURIComponent(JSON.stringify(o)))); return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  function shareUrl(cfg) { var o = clone(cfg); delete o.id; return location.href.split('#')[0] + '#/boards/wallboard?cfg=' + enc(o); }

  /* ---------- tile data ---------- */
  function scopeQs(scope) { return scope === 'all' ? MCM.queues.filter(function (q) { return q.active; }) : [MCM.qById[scope]].filter(Boolean); }
  function scopeLabel(scope) { return scope === 'all' ? 'All queues' : (MCM.qById[scope] ? MCM.qById[scope].name : 'Queue'); }
  function today(scope, cache) {
    if (cache[scope]) return cache[scope];
    var l = MCM.query({ from: MCM.TODAY, to: Date.now() + 1, dir: 'in', queues: scope === 'all' ? [] : [scope], teams: [], channel: 'all' });
    return (cache[scope] = { list: l, g: MCM.agg(l) });
  }
  function scopeAgents(scope) { var ids = scopeQs(scope).map(function (q) { return q.id; }); return MCM.agents.filter(function (a) { return a.queues.some(function (q) { return ids.indexOf(q) >= 0; }); }); }
  function waitingOf(scope) { var ids = scopeQs(scope).map(function (q) { return q.id; }); return L.waiting.filter(function (w) { return ids.indexOf(w.q) >= 0; }); }
  function kpiVal(t, cache) {
    var g = today(t.scope, cache).g, now = Date.now(), goal = t.scope !== 'all' && MCM.qById[t.scope] ? MCM.qById[t.scope].sl.target : 80;
    switch (t.type) {
      case 'sl': return { num: g.sl, text: f.pct(g.sl, 1), sub: 'goal ' + goal + '%' };
      case 'offered': return { num: g.offered, text: f.n(g.offered), sub: f.n(g.answered) + ' answered' };
      case 'abandon': return { num: g.abandonRate, text: f.pct(g.abandonRate, 1), sub: f.n(g.abandoned) + ' abandoned' };
      case 'asa': return { num: g.asa, text: f.dur(g.asa), sub: 'answered calls' };
      case 'aht': return { num: g.aht, text: f.dur(g.aht), sub: f.n(g.handled) + ' handled' };
      case 'csat': return { num: g.csat, text: f.dec(g.csat, 2), sub: f.n(g.csatN) + ' ratings' };
      case 'longest': var m = 0; waitingOf(t.scope).forEach(function (w) { m = Math.max(m, (now - w.since) / 1000); }); return { num: m, text: f.dur(m), sub: 'current longest caller' };
      case 'waiting': var n = waitingOf(t.scope).length; return { num: n, text: String(n), sub: 'callers in queue' };
      case 'available': var av = scopeAgents(t.scope).filter(function (a) { return L.agents[a.id].status === 'available'; }).length; return { num: av, text: String(av), sub: 'of ' + scopeAgents(t.scope).filter(function (a) { return L.agents[a.id].status !== 'offline'; }).length + ' staffed' };
      case 'inprogress': var ids = scopeQs(t.scope).map(function (q) { return q.id; }), c = L.calls.filter(function (x) { return ids.indexOf(x.q) >= 0; }).length; return { num: c, text: String(c), sub: 'live calls' };
    }
    return { num: null, text: '-', sub: '' };
  }
  function toneOf(t, num) {
    var d = TYPES[t.type]; if (!d.dir || num == null || isNaN(num) || t.warn == null || t.bad == null) return '';
    if (d.dir === 'high') return num >= t.bad ? 'bad' : num >= t.warn ? 'warn' : 'ok';
    return num < t.bad ? 'bad' : num < t.warn ? 'warn' : 'ok';
  }
  function colorOf(t, tone) { return tone === 'bad' ? t.cBad : tone === 'warn' ? t.cWarn : tone === 'ok' ? t.cOk : ''; }
  function head(t) { return '<div class="bd-l">' + esc(TYPES[t.type].label) + '</div><div class="bd-sc">' + esc(scopeLabel(t.scope)) + '</div>'; }
  function renderTile(t, cache) {
    var d = TYPES[t.type], now = Date.now();
    if (d.kind === 'kpi') { var k = kpiVal(t, cache), tone = toneOf(t, k.num); return { tone: tone, color: colorOf(t, tone), html: head(t) + '<div class="bd-v" style="' + (tone ? 'color:' + colorOf(t, tone) : '') + '">' + k.text + '</div><div class="bd-s">' + esc(k.sub) + '</div>' }; }
    if (t.type === 'clock') return { tone: '', html: '<div class="bd-l">Local time</div><div class="bd-sc">' + esc(MCM.settings.tz) + '</div><div class="bd-v">' + T.time(now) + '</div><div class="bd-s">' + T.date(now) + '</div>' };
    if (t.type === 'status') {
      var cnt = {}; scopeAgents(t.scope).forEach(function (a) { var s = L.agents[a.id].status; cnt[s] = (cnt[s] || 0) + 1; });
      var items = Object.keys(MCM.STATUS).filter(function (s) { return cnt[s]; }).map(function (s) { return { name: MCM.STATUS[s][0], value: cnt[s], color: MCM.STATUS[s][1] }; }), tot = items.reduce(function (a, b) { return a + b.value; }, 0);
      return { tone: '', html: head(t) + '<div data-donut></div>', after: function (el) { var h = el.querySelector('[data-donut]'); if (h) UI.donut(h, { items: items, center: { v: String(tot), l: 'agents' } }); } };
    }
    if (t.type === 'trend') {
      var td = today(t.scope, cache), bk = MCM.buckets(td.list, MCM.TODAY, now + 1, 1800000).filter(function (b) { return b.agg.offered > 0; }).slice(-16), data = bk.map(function (b) { return b.agg.sl == null ? 0 : +b.agg.sl.toFixed(1); });
      return { tone: '', html: head(t) + '<div class="bd-v" style="font-size:3rem">' + f.pct(td.g.sl, 1) + '</div><div style="height:9rem;margin-top:.6rem">' + (data.length > 1 ? UI.spark(data, 'var(--brand)') : '<div class="bd-s">Not enough data yet</div>') + '</div><div class="bd-s">Half-hourly service level today' + (data.length ? ', low ' + f.pct(Math.min.apply(null, data), 0) + ' / high ' + f.pct(Math.max.apply(null, data), 0) : '') + '</div>' };
    }
    if (t.type === 'queues') {
      var rows = scopeQs(t.scope).map(function (q) {
        var lq = MCM.liveQueue(q.id, 15), tg = lq.agg.sl == null ? '' : UI.slClass(lq.agg.sl, q.sl.target);
        return '<tr><td><b>' + esc(q.name) + '</b></td><td class="r">' + lq.waiting + '</td><td class="r">' + f.dur(lq.longest) + '</td><td class="r">' + lq.available + '/' + lq.staffed + '</td><td class="r">' + lq.active + '</td><td class="r ' + (tg === 'ok' ? 'ok-t' : tg === 'warn' ? 'warn-t' : tg === 'bad' ? 'bad-t' : '') + '"><b>' + f.pct(lq.agg.sl, 0) + '</b></td><td class="r">' + f.pct(lq.agg.abandonRate, 1) + '</td></tr>';
      }).join('');
      return { tone: '', html: head(t) + '<table class="bd-tbl"><thead><tr><th>Queue</th><th class="r">Waiting</th><th class="r">Longest</th><th class="r">Avail</th><th class="r">Active</th><th class="r">SL 15m</th><th class="r">Abandon</th></tr></thead><tbody>' + rows + '</tbody></table>' };
    }
    if (t.type === 'top') {
      var by = MCM.groupBy(today(t.scope, cache).list.filter(function (c) { return c.agent; }), function (c) { return c.agent; });
      var tops = Object.keys(by).map(function (k) { return { a: MCM.aById[k], g: MCM.agg(by[k]) }; }).sort(function (x, y) { return y.g.handled - x.g.handled; }).slice(0, 5);
      return { tone: '', html: head(t) + (tops.length ? '<ol class="bd-ol">' + tops.map(function (r, i) { return '<li><span class="bd-rk">' + (i + 1) + '</span><b>' + esc(r.a.name) + '</b><span class="bd-s">AHT ' + f.dur(r.g.aht) + '</span><span class="bd-n">' + r.g.handled + '</span></li>'; }).join('') + '</ol>' : '<div class="bd-s">No handled calls yet today</div>') };
    }
    if (t.type === 'alerts') {
      var ids2 = scopeQs(t.scope).map(function (q) { return q.id; });
      var al = MCM.alerts.filter(function (a) { return !a.resolved && (t.scope === 'all' || ids2.indexOf(a.scope) >= 0); }).slice(0, 6);
      return { tone: al.some(function (a) { return a.sev === 'high'; }) ? 'bad' : al.length ? 'warn' : '', color: al.some(function (a) { return a.sev === 'high'; }) ? t.cBad : al.length ? t.cWarn : '', html: head(t) + (al.length ? '<ul class="bd-ul">' + al.map(function (a) { return '<li><span class="sdot" style="background:' + (a.sev === 'high' ? 'var(--bad)' : '#f59e0b') + '"></span><b>' + esc(a.ruleName) + '</b><span class="bd-s">' + esc(a.scopeName) + ' - ' + f.ago(a.ts) + '</span></li>'; }).join('') + '</ul>' : '<div class="bd-s" style="color:var(--ok)">No active alerts</div>') };
    }
    return { tone: '', html: '' };
  }

  var CSS = '<style>' +
    '.bd-board{--bd-pad:1.6rem;background:var(--bg);color:var(--ink);border-radius:1.25rem;padding:2rem;min-height:40rem}' +
    '.bd-board.light{--bg:#e9edf7;--surface:#fff;--surface2:#f8fafc;--ink:#141b34;--ink2:#3d4563;--line:#e6e9f2;--line2:#eef1f6;--muted:#64748b;--chip-bg:#eef2f7;--ok:#15803d;--warn:#b45309;--bad:#b91c1c}' +
    '.bd-board.dark{--bg:#0b1020;--surface:#141b34;--surface2:#1a2240;--ink:#eef0fb;--ink2:#c3c9e3;--line:#262d4a;--line2:#1d2644;--muted:#8d9bb8;--chip-bg:#1b2744;--ok:#6ee7a1;--warn:#fbbf55;--bad:#fda4af}' +
    '.bd-top{display:flex;align-items:center;gap:1.4rem;margin-bottom:1.6rem;flex-wrap:wrap}.bd-top h2{font-size:2.2rem;flex:1}.bd-dots{display:flex;gap:.5rem}.bd-dots i{width:1rem;height:1rem;border-radius:50%;background:var(--line)}.bd-dots i.on{background:var(--brand)}' +
    '.bd-esc{display:none;color:var(--muted);font-size:1.1rem}body.tv .bd-esc{display:inline}.bd-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:1.4rem;grid-auto-rows:minmax(15rem,auto)}' +
    '.bd-t{background:var(--surface);border:.2rem solid var(--line);border-radius:1.25rem;padding:var(--bd-pad);display:flex;flex-direction:column;min-width:0;overflow:hidden}' +
    '.bd-l{font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}.bd-sc{font-size:1rem;color:var(--faint);margin-bottom:.8rem}' +
    '.bd-v{font-size:5.2rem;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin-top:auto}.bd-s{font-size:1.1rem;color:var(--muted)}' +
    'body.tv .bd-v{font-size:7rem}body.tv .bd-l{font-size:1.5rem}body.tv .bd-top h2{font-size:3rem}body.tv .bd-t{--bd-pad:2rem}body.tv .bd-s{font-size:1.4rem}' +
    '.bd-tbl{width:100%;border-collapse:collapse;font-size:1.3rem}.bd-tbl th{text-align:left;font-size:1rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);padding:.6rem .8rem;border-bottom:1px solid var(--line)}.bd-tbl td{padding:.7rem .8rem;border-bottom:1px solid var(--line2)}.bd-tbl .r{text-align:right}' +
    '.bd-ol,.bd-ul{list-style:none;padding:0;display:grid;gap:.8rem;font-size:1.3rem}.bd-ol li,.bd-ul li{display:flex;gap:1rem;align-items:center}.bd-ol li b,.bd-ul li b{flex:1;min-width:0}.bd-rk{width:2.4rem;height:2.4rem;border-radius:50%;background:var(--brand-soft);color:var(--brand);display:grid;place-items:center;font-weight:700}.bd-n{font-weight:800;font-size:1.6rem}' +
    '.bd-row{display:flex;gap:1rem;align-items:center;flex-wrap:wrap;padding:1rem 0;border-bottom:1px solid var(--line2)}.bd-row .inp{min-width:0;height:2.9rem}.bd-row input[type=number]{width:7rem}.bd-row input[type=color]{width:3.6rem;padding:.2rem;min-width:0}.bd-row .grow{flex:1;min-width:14rem}' +
    '.bd-pb{display:none;margin-left:1rem}</style>';

  /* ---------- board mount ---------- */
  function mount(ctx, host, cfg, o) {
    o = o || {}; var st = { screen: Math.min(o.screen || 0, Math.max(0, cfg.screens.length - 1)), last: Date.now(), hold: false };
    function tiles() { return cfg.screens[st.screen] || []; }
    function build() {
      var n = cfg.screens.length;
      host.innerHTML = '<div class="bd-board ' + (cfg.theme === 'auto' ? '' : cfg.theme) + '"><div class="bd-top"><h2>' + esc(cfg.name) + (o.preview ? ' <span class="tag info">Preview</span>' : '') + '</h2><span class="bd-esc">Esc to exit TV mode</span><span class="tag" data-live></span>' + (n > 1 ? '<div class="bd-dots">' + cfg.screens.map(function (_, i) { return '<i class="' + (i === st.screen ? 'on' : '') + '"></i>'; }).join('') + '</div><span class="muted" style="font-size:1.1rem">Screen ' + (st.screen + 1) + ' of ' + n + '</span>' : '') + '</div><div class="bd-grid">' +
        (tiles().length ? tiles().map(function (t) { return '<div class="bd-t" data-tid="' + esc(t.id) + '" style="grid-column:span ' + SPAN[t.size] + '"></div>'; }).join('') : '<div class="bd-t" style="grid-column:span 12">' + UI.empty('This screen has no tiles', 'Add tiles in the builder.') + '</div>') + '</div></div>';
      patch();
    }
    function patch() {
      var lv = host.querySelector('[data-live]'); if (lv) { lv.textContent = L.running ? 'Live - every ' + cfg.refresh + 's' : 'Paused'; lv.className = 'tag ' + (L.running ? 'ok' : 'warn'); }
      if (!L.running && host.querySelector('.bd-t[data-rendered]')) return;
      var cache = {};
      tiles().forEach(function (t) {
        var el = host.querySelector('[data-tid="' + t.id + '"]'); if (!el) return;
        var r = renderTile(t, cache); el.innerHTML = r.html; el.setAttribute('data-rendered', '1');
        el.style.borderColor = r.tone ? (r.color || colorOf(t, r.tone)) : ''; var c = r.color || colorOf(t, r.tone); el.style.background = r.tone && c && c.length === 7 ? 'linear-gradient(' + c + '1c,' + c + '1c),var(--surface)' : '';
        if (r.after) r.after(el);
      });
    }
    function go(d) { var n = cfg.screens.length; st.screen = (st.screen + d + n) % n; st.last = Date.now(); build(); }
    build();
    ctx.every(Math.max(2, Math.min(30, cfg.refresh || 5)) * 1000, patch);
    if (!o.norotate) ctx.every(1000, function () { if (!st.hold && cfg.rotate > 0 && cfg.screens.length > 1 && Date.now() - st.last >= cfg.rotate * 1000) go(1); });
    return { next: function () { go(1); }, prev: function () { go(-1); }, rebuild: function (screen) { if (screen != null) st.screen = Math.min(screen, cfg.screens.length - 1); build(); }, hold: function (v) { st.hold = v; return st.hold; }, isHeld: function () { return st.hold; } };
  }

  var draft = null, draftId = null, editScreen = 0;

  MCM.page({
    id: 'boards', title: 'Boards', icon: 'boards', filters: [], live: true, tvRefresh: true, autoRefresh: false,
    tabs: [['wallboard', 'Wallboard'], ['builder', 'Builder']],
    render: function (ctx) {
      var tab = ctx.tab, boards = loadBoards(), sel = MCM.store.get('boardSel', null);
      if (!boards.some(function (b) { return b.id === sel; })) sel = boards[0].id;
      var canEdit = MCM.can('supervise');
      function saved() { return boards.filter(function (b) { return b.id === sel; })[0]; }

      /* ================= WALLBOARD ================= */
      if (tab === 'wallboard') {
        var shared = null, err = '';
        if (ctx.params.cfg) { try { shared = sanitize(dec(ctx.params.cfg)); shared.id = 'shared'; } catch (e) { err = 'The shared wallboard link could not be read.'; } }
        var cfg = shared || sanitize(saved());
        ctx.acts((shared ? '<button class="btn" data-bw="import">Save a copy</button>' : '<label class="sel"><select id="bd-wsel">' + UI.opts(boards.map(function (b) { return [b.id, b.name]; }), sel) + '</select></label>') +
          '<button class="btn" data-bw="prev" title="Previous screen">Prev</button><button class="btn" data-bw="next">Next</button><button class="btn" data-bw="hold">Pause rotation</button>' +
          (shared ? '' : '<button class="btn" data-bw="edit">' + UI.icon('edit') + 'Edit</button>') + '<button class="btn pri" data-bw="tv">' + UI.icon('expand') + 'TV mode</button>');
        ctx.el.innerHTML = CSS + (err ? '<div class="note warn" style="margin-bottom:1.5rem">' + esc(err) + ' Showing the default board instead.</div>' : '') + (shared ? '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>You are viewing a shared wallboard configuration. Use Save a copy to keep it in your boards.</span></div>' : '') + '<div id="bd-host"></div>';
        var ctrl = mount(ctx, ctx.el.querySelector('#bd-host'), cfg, {});
        var pa = document.getElementById('pacts'); if (pa) pa.onchange = function (e) { if (e.target.id === 'bd-wsel') { MCM.store.set('boardSel', e.target.value); ctx.refresh(); } };
        ctx.on('[data-bw]', function (e, el) {
          var a = el.dataset.bw;
          if (a === 'next') ctrl.next(); else if (a === 'prev') ctrl.prev();
          else if (a === 'hold') { var h = ctrl.hold(!ctrl.isHeld()); el.textContent = h ? 'Resume rotation' : 'Pause rotation'; }
          else if (a === 'tv') { ctx.fullscreen(true); UI.toast('TV mode on. Press Esc to exit.', { ms: 2500 }); }
          else if (a === 'edit') ctx.setTab('builder');
          else if (a === 'import') { if (!canEdit) return MCM.deny('save wallboards'); var c = sanitize(shared); c.id = 'b' + uid(); c.name += ' (shared)'; boards.push(c); saveBoards(boards); MCM.store.set('boardSel', c.id); MCM.audit('Wallboard imported from link', c.name); UI.toast('Saved to your boards', { kind: 'ok' }); MCM.go('boards', 'wallboard'); }
        });
        // the page act buttons live in #pacts (inside the view) so ctx.on delegation covers them
      }

      /* ================= BUILDER ================= */
      else if (tab === 'builder') {
        if (!draft || draftId !== sel) { draft = sanitize(clone(saved())); draftId = sel; editScreen = 0; }
        if (editScreen >= draft.screens.length) editScreen = 0;
        var dis = canEdit ? '' : ' disabled';
        function dirty() { return JSON.stringify(sanitize(saved())) !== JSON.stringify(sanitize(draft)); }
        var qopts = [['all', 'All queues']].concat(MCM.queues.map(function (q) { return [q.id, q.name]; }));
        function tileRow(t, i, n) {
          var d = TYPES[t.type], thr = d.dir ? '<span class="muted">Warn at</span><input class="inp sm" type="number" step="any" data-tf="warn" value="' + t.warn + '"' + dis + '><span class="muted">Bad at</span><input class="inp sm" type="number" step="any" data-tf="bad" value="' + t.bad + '"' + dis + '><span class="muted" title="Colours: ok / warn / bad">Colours</span><input class="inp sm" type="color" data-tf="cOk" value="' + t.cOk + '"' + dis + '><input class="inp sm" type="color" data-tf="cWarn" value="' + t.cWarn + '"' + dis + '><input class="inp sm" type="color" data-tf="cBad" value="' + t.cBad + '"' + dis + '><span class="muted" style="font-size:1.05rem">' + (d.dir === 'high' ? 'higher is worse' : 'lower is worse') + (d.unit ? ' (' + d.unit + ')' : '') + '</span>' : '<span class="muted" style="font-size:1.05rem">No thresholds for this tile</span>';
          return '<div class="bd-row" data-ti="' + i + '"><b class="grow">' + (i + 1) + '. ' + esc(d.label) + '</b><select class="inp sm" data-tf="scope"' + dis + '>' + UI.opts(qopts, t.scope) + '</select><select class="inp sm" data-tf="size"' + dis + '>' + UI.opts([['S', 'Small'], ['M', 'Medium'], ['L', 'Large']], t.size) + '</select>' + thr +
            '<button class="btn xs" data-b="up"' + (i === 0 ? ' disabled' : '') + dis + ' title="Move up">Up</button><button class="btn xs" data-b="down"' + (i === n - 1 ? ' disabled' : '') + dis + ' title="Move down">Down</button><button class="btn xs danger" data-b="rm"' + dis + '>Remove</button></div>';
        }
        function listHtml() { var tl = draft.screens[editScreen]; return tl.length ? tl.map(function (t, i) { return tileRow(t, i, tl.length); }).join('') : UI.empty('No tiles on this screen', 'Pick a tile from the catalogue below and press Add tile.'); }
        ctx.el.innerHTML = CSS + (canEdit ? '' : '<div class="note warn" style="margin-bottom:1.5rem">Your role (' + MCM.user.role + ') can view wallboards but not edit them.</div>') +
          UI.card('Wallboards', '<div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:center"><label class="sel"><select id="bd-sel">' + UI.opts(boards.map(function (b) { return [b.id, b.name]; }), sel) + '</select></label><button class="btn" data-b="new"' + dis + '>' + UI.icon('plus') + 'New</button><button class="btn" data-b="dup"' + dis + '>Duplicate</button><button class="btn danger" data-b="del"' + dis + '>' + UI.icon('trash') + 'Delete</button><span class="grow" style="flex:1"></span><span class="tag warn" id="bd-dirty" style="display:none">Unsaved changes</span><button class="btn" data-b="share">' + UI.icon('link') + 'Share link</button><button class="btn" data-b="open">Open wallboard</button><button class="btn pri" data-b="save"' + dis + '>Save</button></div>' +
            '<div class="fg c3 mt"><label>Name<input class="inp" data-df="name" value="' + esc(draft.name) + '"' + dis + '></label><label>Theme<select class="inp" data-df="theme"' + dis + '>' + UI.opts([['auto', 'Auto (follow app theme)'], ['light', 'Light'], ['dark', 'Dark']], draft.theme) + '</select></label><label>Screen rotation (seconds, 0 = off)<input class="inp" type="number" min="0" max="600" data-df="rotate" value="' + draft.rotate + '"' + dis + '></label><label>Refresh rate (seconds, 2-30)<input class="inp" type="number" min="2" max="30" data-df="refresh" value="' + draft.refresh + '"' + dis + '></label></div>') +
          '<div class="mt">' + UI.card('Screens and tiles', '<div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem">' + UI.seg(draft.screens.map(function (_, i) { return [i, 'Screen ' + (i + 1)]; }), editScreen, 'scr', 'sm') + '<button class="btn sm" data-b="addscreen"' + dis + '>' + UI.icon('plus') + 'Add screen</button><button class="btn sm danger" data-b="rmscreen"' + (draft.screens.length < 2 ? ' disabled' : dis) + '>Remove screen</button></div><div id="bd-list">' + listHtml() + '</div>' +
            '<div style="display:flex;gap:.8rem;align-items:center;margin-top:1.4rem;flex-wrap:wrap"><label class="sel"><select id="bd-add"' + dis + '>' + UI.opts(TYPE_KEYS.map(function (k) { return [k, TYPES[k].label]; })) + '</select></label><button class="btn pri" data-b="addtile"' + dis + '>Add tile</button><span class="muted">Tile catalogue: service level, offered, abandon %, ASA, AHT, longest wait, waiting, available agents, calls in progress, status donut, queue table, SL trend, CSAT, top agents, alerts, clock.</span></div>', { sub: 'Tiles flow into a 12-column grid: small = 3, medium = 6, large = 12 columns. Threshold colours are applied to the tile value and border.' }) + '</div>' +
          '<div class="mt">' + UI.card('Live preview', '<div id="bd-pv"></div>', { sub: 'Shows the screen being edited using live data. Unsaved changes appear here immediately.' }) + '</div>';
        var pv = mount(ctx, ctx.el.querySelector('#bd-pv'), draft, { screen: editScreen, norotate: true, preview: true });
        var markDirty = function () { var d = ctx.el.querySelector('#bd-dirty'); if (d) d.style.display = dirty() ? '' : 'none'; };
        markDirty();
        function relist() { ctx.el.querySelector('#bd-list').innerHTML = listHtml(); pv.rebuild(editScreen); markDirty(); }
        ctx.el.addEventListener('change', function (e) {
          var el = e.target;
          if (el.id === 'bd-sel') { MCM.store.set('boardSel', el.value); draft = null; ctx.refresh(); return; }
          if (!canEdit) return;
          var df = el.closest('[data-df]');
          if (df) { var k = df.dataset.df; draft[k] = (k === 'rotate' || k === 'refresh') ? +df.value : df.value; if (k === 'refresh') draft.refresh = Math.max(2, Math.min(30, draft.refresh || 5)); if (k === 'rotate') draft.rotate = Math.max(0, draft.rotate || 0); pv.rebuild(editScreen); markDirty(); return; }
          var tf = el.closest('[data-tf]'), row = el.closest('[data-ti]');
          if (tf && row) { var t = draft.screens[editScreen][+row.dataset.ti], key = tf.dataset.tf; t[key] = (key === 'warn' || key === 'bad') ? (tf.value === '' ? null : +tf.value) : tf.value; pv.rebuild(editScreen); markDirty(); }
        });
        ctx.on('[data-scr]', function (e, el) { editScreen = +el.dataset.scr; ctx.refresh(); });
        ctx.on('[data-b]', function (e, el) {
          var a = el.dataset.b, tl = draft.screens[editScreen];
          var mut = ['new', 'dup', 'del', 'save', 'addscreen', 'rmscreen', 'addtile', 'up', 'down', 'rm'];
          if (mut.indexOf(a) >= 0 && !canEdit) return MCM.deny('edit wallboards');
          if (a === 'addtile') { var ty = ctx.el.querySelector('#bd-add').value; tl.push(tile(ty)); relist(); }
          else if (a === 'rm' || a === 'up' || a === 'down') { var i = +el.closest('[data-ti]').dataset.ti; if (a === 'rm') tl.splice(i, 1); else { var j = a === 'up' ? i - 1 : i + 1; if (j >= 0 && j < tl.length) { var x = tl[i]; tl[i] = tl[j]; tl[j] = x; } } relist(); }
          else if (a === 'addscreen') { draft.screens.push([]); editScreen = draft.screens.length - 1; ctx.refresh(); }
          else if (a === 'rmscreen') { if (draft.screens.length > 1) { draft.screens.splice(editScreen, 1); editScreen = Math.max(0, editScreen - 1); ctx.refresh(); } }
          else if (a === 'save') { var c = sanitize(draft); c.id = sel; var ix = boards.findIndex(function (b) { return b.id === sel; }); boards[ix] = c; saveBoards(boards); draft = sanitize(clone(c)); MCM.audit('Wallboard saved', c.name); UI.toast('Wallboard saved', { kind: 'ok' }); markDirty(); }
          else if (a === 'new') { var nb = sanitize({ id: 'b' + uid(), name: 'New wallboard', screens: [[tile('sl'), tile('offered'), tile('waiting'), tile('available')]], refresh: 5 }); boards.push(nb); saveBoards(boards); MCM.store.set('boardSel', nb.id); draft = null; MCM.audit('Wallboard created', nb.name); ctx.refresh(); }
          else if (a === 'dup') { var cp = sanitize(clone(draft)); cp.id = 'b' + uid(); cp.name = draft.name + ' (copy)'; cp.screens.forEach(function (s) { s.forEach(function (t) { t.id = uid(); }); }); boards.push(cp); saveBoards(boards); MCM.store.set('boardSel', cp.id); draft = null; MCM.audit('Wallboard duplicated', cp.name); UI.toast('Duplicated as "' + cp.name + '"', { kind: 'ok' }); ctx.refresh(); }
          else if (a === 'del') {
            UI.confirm('Delete the wallboard "' + esc(saved().name) + '"? This cannot be undone.', 'Delete').then(function (ok) {
              if (!ok) return; var nm = saved().name; boards = boards.filter(function (b) { return b.id !== sel; }); if (!boards.length) boards = [sanitize({ id: 'b' + uid(), name: 'Untitled wallboard', screens: [[tile('sl'), tile('waiting')]] })];
              saveBoards(boards); MCM.store.set('boardSel', boards[0].id); draft = null; MCM.audit('Wallboard deleted', nm); ctx.refresh();
            });
          }
          else if (a === 'share') { var url = shareUrl(sanitize(draft)); MCM.audit('Wallboard share link created', draft.name); UI.copy(url); }
          else if (a === 'open') { if (canEdit && dirty()) { UI.toast('Unsaved changes are not shown on the wallboard until you save.', { ms: 3500 }); } MCM.go('boards', 'wallboard'); }
        });
      }
    }
  });
})();
