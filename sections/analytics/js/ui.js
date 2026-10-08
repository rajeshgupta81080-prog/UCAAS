/* MCM Analytics v2 - shared UI kit: formatters, KPI, table (sort/search/page/columns/CSV), SVG charts, drawer, modal, toast. */
(function () {
  var UI = window.UI = {};
  var $ = UI.$ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = UI.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = UI.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function rem() { return parseFloat(getComputedStyle(document.documentElement).fontSize) || 10; }

  /* ---------- formatters ---------- */
  var f = UI.f = {
    n: function (v, d) { return v == null || isNaN(v) ? '-' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); },
    pct: function (v, d) { return v == null || isNaN(v) ? '-' : Number(v).toFixed(d == null ? 1 : d) + '%'; },
    dur: function (s) { if (s == null || isNaN(s)) return '-'; s = Math.round(s); var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (x < 10 ? '0' : '') + x; },
    hm: function (s) { if (s == null) return '-'; var h = Math.floor(s / 3600), m = Math.round(s / 60) % 60; return h + 'h ' + (m < 10 ? '0' : '') + m + 'm'; },
    money: function (v, d) { return v == null ? '-' : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }); },
    dec: function (v, d) { return v == null || isNaN(v) ? '-' : Number(v).toFixed(d == null ? 1 : d); },
    ago: function (ts) { var s = Math.max(0, (Date.now() - ts) / 1000); return s < 60 ? Math.round(s) + 's ago' : s < 3600 ? Math.round(s / 60) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; }
  };
  UI.initials = function (n) { return String(n || '?').split(/\s+/).map(function (x) { return x[0]; }).slice(0, 2).join('').toUpperCase(); };

  /* ---------- icons ---------- */
  var ICONS = UI.ICONS = {
    queues: '<rect x="8" y="3" width="13" height="13" rx="3.5"/><path d="M16 16v1.5a3.5 3.5 0 0 1-3.5 3.5h-6A3.5 3.5 0 0 1 3 17.5v-6A3.5 3.5 0 0 1 6.5 8H8"/>',
    agents: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="10" r="3.2"/><path d="M6 19c1-3 4-4 6-4s5 1 6 4"/>',
    calls: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    flows: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M9 9l6 6M12 6h6v4M6 12v6h4"/>',
    boards: '<path d="M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01" stroke-width="3.6"/>',
    live: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2zM14 3a7 7 0 0 1 7 7M14 7a3 3 0 0 1 3 3"/>',
    callbacks: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M12 7v4M10 9l2-2 2 2M8 21h8M12 17v4M3 14l3 3M21 14l-3 3"/>',
    campaigns: '<path d="M5 4h.01M12 4h.01M19 4h.01M5 9.5h.01M12 9.5h.01M19 9.5h.01M5 15h.01M12 15h.01M19 15h.01M12 20.5h.01" stroke-width="3.2"/>',
    speech: '<circle cx="12" cy="12" r="9.5"/><rect x="9" y="6" width="6" height="8" rx="3"/><path d="M8 12v.5a4 4 0 0 0 8 0V12M12 16.5V19"/>',
    reports: '<rect x="3" y="11" width="5" height="10" rx="1"/><rect x="9.5" y="3" width="5" height="18" rx="1"/><rect x="16" y="8" width="5" height="13" rx="1"/>',
    aiwall: '<path d="M9 4a4 4 0 0 0-4 4 4 4 0 0 0-2 3.5A4 4 0 0 0 5 15a4 4 0 0 0 4 5h1V4zM14 8h3M14 12h4M14 16h3M20 6v4"/><circle cx="18" cy="6" r="1"/>',
    monitoring: '<rect x="3" y="3" width="18" height="11" rx="2.5" fill="currentColor"/><path d="M12 14v6M7 20h10M3 10h18" stroke-width="2"/>',
    coaching: '<circle cx="9" cy="8" r="3.3"/><path d="M3 20c0-3.5 3-5.5 6-5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M14 20c0-3 2-5 5-5s3 1 3 1"/>',
    activity: '<path d="M2 12h5l3-9 4 18 3-9h5"/>',
    quality: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.5 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z"/>',
    wfm: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4M8 14h3M13 14h3M8 17.5h3"/>',
    alerts: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    dl: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', chev: '<path d="M6 9l6 6 6-6"/>', cal: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>', play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>', pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    check: '<path d="M5 12l5 5 9-10"/>', cols: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>', expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', ear: '<path d="M6 8a6 6 0 1 1 11 3c-1 2-3 3-3 6a3 3 0 0 1-6 0"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'
  };
  UI.icon = function (n, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24">' + (ICONS[n] || '') + '</svg>'; };

  /* ---------- small components ---------- */
  UI.tag = function (t, k) { return '<span class="tag ' + (k || '') + '">' + esc(t) + '</span>'; };
  UI.status = function (key) { var s = MCM.STATUS[key] || [key, '#999']; return '<span class="tag" style="background:' + s[1] + '22;color:' + s[1] + '"><span class="sdot" style="background:' + s[1] + '"></span>' + s[0] + '</span>'; };
  UI.slClass = function (v, target) { if (v == null) return ''; return v >= target ? 'ok' : v >= target - 10 ? 'warn' : 'bad'; };
  UI.slCell = function (v, target) { if (v == null) return '<span class="faint">-</span>'; var c = UI.slClass(v, target); return '<span class="sl ' + (c === 'ok' ? 'ok-t' : c === 'warn' ? 'warn-t' : 'bad-t') + '">' + f.pct(v, 1) + '</span>'; };
  UI.bar = function (v, max, cls) { var p = Math.max(0, Math.min(100, v / (max || 100) * 100)); return '<div class="bar ' + (cls || '') + '"><i style="width:' + p + '%"></i></div>'; };
  UI.empty = function (t, s) { return '<div class="empty"><b>' + esc(t) + '</b>' + (s ? esc(s) : '') + '</div>'; };
  UI.preview = function () { return '<span class="preview-badge" title="Needs a backend / integration to be real">Demo data</span>'; };

  /* KPI: opts {label,value,unit,delta,good,spark,status,def,sub} - delta = {abs,pct,fmt} computed by caller via UI.delta */
  UI.delta = function (cur, prev, o) {
    o = o || {}; if (cur == null || prev == null || !MCM.F.compare) return null;
    var d = cur - prev, pc = prev ? d / Math.abs(prev) * 100 : 0, good = o.good === 'down' ? d <= 0 : d >= 0;
    return { text: (d >= 0 ? '+' : '') + (o.fmt ? o.fmt(d) : f.n(d, o.dec || 0)) + ' (' + (pc >= 0 ? '+' : '') + pc.toFixed(1) + '%)', up: good, arrow: d >= 0 ? 'up' : 'down' };
  };
  UI.kpi = function (o) {
    var d = o.delta ? '<div class="d ' + (o.delta.up ? 'up' : 'dn') + '">' + (o.delta.arrow === 'up' ? '▲' : '▼') + ' ' + o.delta.text + ' <span class="cmp">vs prev</span></div>' : (o.sub ? '<div class="d">' + o.sub + '</div>' : '<div class="d">&nbsp;</div>');
    return '<div class="card kpi ' + (o.status || '') + (o.go ? ' click' : '') + '"' + (o.go ? ' data-go="' + o.go + '"' : '') + '><div class="lb">' + esc(o.label) + (o.def ? '<button class="info" data-def="' + o.def + '" title="Definition">' + UI.icon('info') + '</button>' : '') + '</div><div class="v">' + o.value + (o.unit ? '<small>' + o.unit + '</small>' : '') + '</div>' + d + (o.spark ? '<div class="spark">' + UI.spark(o.spark, o.color) + '</div>' : '') + '</div>';
  };
  UI.spark = function (data, color) {
    if (!data || data.length < 2) return ''; var w = 200, h = 28, mx = Math.max.apply(null, data), mn = Math.min.apply(null, data), rg = mx - mn || 1;
    var p = data.map(function (v, i) { return (i / (data.length - 1) * w).toFixed(1) + ',' + (h - 3 - (v - mn) / rg * (h - 6)).toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:100%"><polyline points="' + p + '" fill="none" stroke="' + (color || 'var(--brand)') + '" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
  };
  UI.card = function (title, body, o) { o = o || {}; return '<section class="card ' + (o.flush ? 'flush ' : '') + (o.cls || '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '>' + (title || o.acts ? '<div class="ch"><div><h3>' + title + '</h3>' + (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') + '</div><div style="display:flex;gap:.6rem;align-items:center">' + (o.acts || '') + '</div></div>' : '') + body + '</section>'; };
  UI.seg = function (items, active, attr, cls) { return '<div class="seg ' + (cls || '') + '">' + items.map(function (x) { var k = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<button class="' + (k == active ? 'on' : '') + '" data-' + (attr || 'seg') + '="' + esc(k) + '">' + esc(l) + '</button>'; }).join('') + '</div>'; };

  /* ---------- exports ---------- */
  function download(name, mime, text) { var b = new Blob([text], { type: mime }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  UI.csv = function (name, heads, rows) {
    var q = function (v) { v = v == null ? '' : String(v).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    download(name + '.csv', 'text/csv;charset=utf-8', '﻿' + [heads].concat(rows).map(function (r) { return r.map(q).join(','); }).join('\r\n'));
    MCM.audit('Export CSV', name + ' (' + rows.length + ' rows)'); UI.toast('Exported ' + rows.length + ' rows to ' + name + '.csv', { kind: 'ok' });
  };
  UI.xls = function (name, heads, rows) {
    var cell = function (v) { return '<td>' + esc(String(v == null ? '' : v).replace(/<[^>]+>/g, '')) + '</td>'; };
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table><tr>' + heads.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>' + rows.map(function (r) { return '<tr>' + r.map(cell).join('') + '</tr>'; }).join('') + '</table></body></html>';
    download(name + '.xls', 'application/vnd.ms-excel', html); MCM.audit('Export Excel', name + ' (' + rows.length + ' rows)'); UI.toast('Exported ' + rows.length + ' rows to Excel', { kind: 'ok' });
  };
  UI.printPdf = function () { window.print(); };

  /* ---------- table ---------- */
  var TS = UI._ts = {};
  /* opts: id, cols[{k,label,html(row),val(row),r,hide,csv(row),noSort}], rows, pageSize, search, csv, onRow, extra(html), foot(html), bulk:[{label,fn(rows)}], select */
  UI.table = function (host, o) {
    var st = TS[o.id] || (TS[o.id] = { sort: o.sort || null, dir: o.dir || 'desc', page: 0, q: '', hide: {}, sel: {} });
    var rows = o.rows, size = o.pageSize || 12;
    function view() {
      var cols = o.cols.filter(function (c) { return !st.hide[c.k]; }), list = rows;
      if (st.q) { var q = st.q.toLowerCase(); list = list.filter(function (r) { return o.cols.some(function (c) { var v = c.val ? c.val(r) : (c.html ? c.html(r) : ''); return String(v == null ? '' : v).replace(/<[^>]+>/g, '').toLowerCase().indexOf(q) >= 0; }); }); }
      if (st.sort) { var c0 = o.cols.filter(function (c) { return c.k === st.sort; })[0]; if (c0) { var g = c0.val || c0.html; list = list.slice().sort(function (a, b) { var x = g(a), y = g(b); if (x == null) return 1; if (y == null) return -1; var r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true }); return st.dir === 'asc' ? r : -r; }); } }
      var pages = Math.max(1, Math.ceil(list.length / size)); if (st.page >= pages) st.page = pages - 1;
      var slice = size >= 9999 ? list : list.slice(st.page * size, st.page * size + size);
      var h = '';
      if (o.search !== false || o.csv || o.extra || o.colChooser !== false) h += '<div class="tb">' + (o.search !== false ? '<input class="inp" data-q placeholder="Search ' + (o.noun || 'rows') + '..." value="' + esc(st.q) + '">' : '') + (o.extra || '') + '<span class="grow"></span><span class="muted" style="font-size:1.1rem">' + f.n(list.length) + ' ' + (o.noun || 'rows') + '</span>' + (o.colChooser !== false ? '<button class="btn sm" data-cols>' + UI.icon('cols') + 'Columns</button>' : '') + (o.csv ? '<button class="btn sm" data-csv>' + UI.icon('dl') + 'CSV</button><button class="btn sm" data-xls>Excel</button>' : '') + '</div>';
      if (o.bulk && Object.keys(st.sel).length) h += '<div class="tb" style="background:var(--brand-soft)"><b>' + Object.keys(st.sel).length + ' selected</b>' + o.bulk.map(function (b, i) { return '<button class="btn sm" data-bulk="' + i + '">' + b.label + '</button>'; }).join('') + '</div>';
      h += '<div class="tw"><table class="t"><thead><tr>' + (o.bulk ? '<th style="width:3.6rem"><input type="checkbox" data-all></th>' : '') + cols.map(function (c) { return '<th class="' + (c.r ? 'r ' : '') + (c.noSort ? '' : 'sortable') + '" data-sort="' + c.k + '">' + c.label + (st.sort === c.k ? '<span class="ar">' + (st.dir === 'asc' ? '▲' : '▼') + '</span>' : '') + '</th>'; }).join('') + '</tr></thead><tbody>';
      if (!slice.length) h += '<tr><td colspan="' + (cols.length + 1) + '">' + UI.empty(o.emptyTitle || 'No data for this selection', o.emptySub || 'Try a wider date range or fewer filters.') + '</td></tr>';
      slice.forEach(function (r, i) {
        var key = o.key ? o.key(r) : i; h += '<tr class="row ' + (o.onRow ? 'click' : '') + '" data-i="' + rows.indexOf(r) + '">' + (o.bulk ? '<td><input type="checkbox" data-sel="' + esc(key) + '"' + (st.sel[key] ? ' checked' : '') + '></td>' : '') + cols.map(function (c) { return '<td class="' + (c.r ? 'r' : '') + '">' + (c.html ? c.html(r) : esc(r[c.k])) + '</td>'; }).join('') + '</tr>';
      });
      h += '</tbody>' + (o.foot ? '<tfoot>' + o.foot(list, cols) + '</tfoot>' : '') + '</table></div>';
      if (size < 9999 && list.length > size) { h += '<div class="tf"><span>Showing ' + (st.page * size + 1) + '-' + Math.min(list.length, st.page * size + size) + ' of ' + f.n(list.length) + '</span><div class="pg"><button data-pg="-1"' + (st.page === 0 ? ' disabled' : '') + '>‹</button>'; var s0 = Math.max(0, Math.min(st.page - 2, pages - 5)); for (var p = s0; p < Math.min(pages, s0 + 5); p++) h += '<button data-pg="' + p + '" class="' + (p === st.page ? 'on' : '') + '">' + (p + 1) + '</button>'; h += '<button data-pg="+1"' + (st.page >= pages - 1 ? ' disabled' : '') + '>›</button></div></div>'; }
      host.innerHTML = h; host._list = list;
      var qi = $('[data-q]', host); if (qi && st.focus) { qi.focus(); qi.setSelectionRange(qi.value.length, qi.value.length); }
    }
    function exportRows() { var cols = o.cols.filter(function (c) { return !st.hide[c.k] && !c.noCsv; }); return { heads: cols.map(function (c) { return c.label.replace(/<[^>]+>/g, ''); }), rows: (host._list || rows).map(function (r) { return cols.map(function (c) { return c.csv ? c.csv(r) : (c.val ? c.val(r) : (c.html ? c.html(r) : r[c.k])); }); }) }; }
    host.onclick = function (e) {
      var t = e.target, el;
      if ((el = t.closest('[data-sort]')) && el.classList.contains('sortable')) { var k = el.dataset.sort; if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = k; st.dir = 'desc'; } st.focus = false; view(); return; }
      if ((el = t.closest('[data-pg]'))) { var v = el.dataset.pg; st.page = v === '-1' ? st.page - 1 : v === '+1' ? st.page + 1 : +v; st.focus = false; view(); return; }
      if (t.closest('[data-csv]')) { var x = exportRows(); UI.csv(o.csv, x.heads, x.rows); return; }
      if (t.closest('[data-xls]')) { var y = exportRows(); UI.xls(o.csv, y.heads, y.rows); return; }
      if (t.closest('[data-cols]')) { var b = t.closest('[data-cols]'); UI.pop(b, '<div class="hd">Show columns</div>' + o.cols.map(function (c) { return '<label><input type="checkbox" data-col="' + c.k + '"' + (st.hide[c.k] ? '' : ' checked') + '> ' + c.label.replace(/<[^>]+>/g, '') + '</label>'; }).join(''), function (pop) { pop.onchange = function (ev) { var cb = ev.target.closest('[data-col]'); if (cb) { st.hide[cb.dataset.col] = !cb.checked; view(); } }; }); return; }
      if ((el = t.closest('[data-bulk]'))) { var sel = rows.filter(function (r) { return st.sel[o.key(r)]; }); o.bulk[+el.dataset.bulk].fn(sel); return; }
      if (t.closest('[data-sel],[data-all]')) return;
      if (o.onRow && (el = t.closest('tr.row')) && !t.closest('button,a,input,select')) o.onRow(rows[+el.dataset.i], e);
    };
    host.oninput = function (e) { if (e.target.matches('[data-q]')) { st.q = e.target.value; st.page = 0; st.focus = true; view(); } };
    host.onchange = function (e) {
      var s = e.target.closest('[data-sel]'); if (s) { if (s.checked) st.sel[s.dataset.sel] = 1; else delete st.sel[s.dataset.sel]; view(); }
      if (e.target.matches('[data-all]')) { (host._list || rows).forEach(function (r) { if (e.target.checked) st.sel[o.key(r)] = 1; else delete st.sel[o.key(r)]; }); view(); }
    };
    view();
    return { setRows: function (r) { rows = r; view(); }, refresh: view, state: st };
  };

  /* ---------- popover ---------- */
  var openPop = null;
  UI.pop = function (anchor, html, after) {
    UI.closePop(); var p = document.createElement('div'); p.className = 'pop'; p.innerHTML = html; document.body.appendChild(p);
    var r = anchor.getBoundingClientRect(); p.style.top = (r.bottom + 6 + window.scrollY) + 'px'; p.style.left = Math.min(r.left, innerWidth - p.offsetWidth - 12) + 'px';
    openPop = p; setTimeout(function () { document.addEventListener('mousedown', outside); }, 0);
    function outside(e) { if (!p.contains(e.target) && !anchor.contains(e.target)) { UI.closePop(); } }
    p._out = outside; if (after) after(p); return p;
  };
  UI.closePop = function () { if (openPop) { document.removeEventListener('mousedown', openPop._out); openPop.remove(); openPop = null; } };

  /* ---------- drawer / modal / toast ---------- */
  var drawerEl = null;
  UI.drawer = function (title, body, o) {
    o = o || {}; UI.closeDrawer(true);
    var sc = document.createElement('div'); sc.className = 'scrim'; var d = document.createElement('aside'); d.className = 'drawer';
    d.innerHTML = '<div class="dh"><div><h3>' + title + '</h3>' + (o.sub ? '<div class="muted" style="margin-top:.4rem">' + o.sub + '</div>' : '') + '</div><div style="display:flex;gap:.6rem">' + (o.acts || '') + '<button class="btn sm" data-x>' + UI.icon('x') + '</button></div></div><div class="db">' + body + '</div>';
    document.body.appendChild(sc); document.body.appendChild(d); requestAnimationFrame(function () { sc.classList.add('on'); d.classList.add('on'); });
    sc.onclick = function () { UI.closeDrawer(); }; d.querySelector('[data-x]').onclick = function () { UI.closeDrawer(); };
    drawerEl = { sc: sc, d: d, onClose: o.onClose }; if (o.onOpen) o.onOpen(d.querySelector('.db'), d); return d.querySelector('.db');
  };
  UI.closeDrawer = function (now) { if (!drawerEl) return; var x = drawerEl; drawerEl = null; x.sc.classList.remove('on'); x.d.classList.remove('on'); setTimeout(function () { x.sc.remove(); x.d.remove(); }, now ? 0 : 200); if (x.onClose) x.onClose(); };
  UI.drawerOpen = function () { return !!drawerEl; };
  var modalEl = null;
  UI.modal = function (o) {
    UI.closeModal(); var sc = document.createElement('div'); sc.className = 'scrim on'; sc.style.zIndex = 94; var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div class="mh"><h2>' + o.title + '</h2><button class="btn sm" data-x>' + UI.icon('x') + '</button></div><div class="mb">' + (o.body || '') + '</div>' + (o.foot ? '<div class="mf">' + o.foot.map(function (b, i) { return '<button class="btn ' + (b.pri ? 'pri' : '') + (b.danger ? ' danger' : '') + '" data-f="' + i + '">' + b.label + '</button>'; }).join('') + '</div>' : '');
    document.body.appendChild(sc); document.body.appendChild(m); modalEl = [sc, m];
    sc.onclick = m.querySelector('[data-x]').onclick = function () { UI.closeModal(); };
    m.onclick = function (e) { var b = e.target.closest('[data-f]'); if (b) { var r = o.foot[+b.dataset.f].fn ? o.foot[+b.dataset.f].fn(m) : null; if (r !== false) UI.closeModal(); } };
    if (o.onOpen) o.onOpen(m); return m;
  };
  UI.closeModal = function () { if (modalEl) { modalEl[0].remove(); modalEl[1].remove(); modalEl = null; } };
  UI.confirm = function (msg, okLabel) { return new Promise(function (res) { UI.modal({ title: 'Please confirm', body: '<p>' + msg + '</p>', foot: [{ label: 'Cancel', fn: function () { res(false); } }, { label: okLabel || 'Confirm', pri: true, fn: function () { res(true); } }] }); }); };
  UI.def = function (key) { var g = MCM.GLOSSARY[key]; if (!g) return; UI.modal({ title: g[0], body: '<p>' + g[1] + '</p><p class="mt"><b>Formula</b></p><p class="mono" style="background:var(--surface2);padding:1rem 1.2rem;border-radius:.5rem">' + g[2] + '</p>', foot: [{ label: 'Close', pri: true }] }); };
  UI.toast = function (msg, o) {
    o = o || {}; var box = $('.toasts') || (function () { var b = document.createElement('div'); b.className = 'toasts'; document.body.appendChild(b); return b; })();
    var t = document.createElement('div'); t.className = 'toast ' + (o.kind || ''); t.innerHTML = '<span>' + msg + '</span>' + (o.action ? '<button>' + o.action.label + '</button>' : ''); box.appendChild(t);
    if (o.action) t.querySelector('button').onclick = function () { o.action.fn(); t.remove(); };
    setTimeout(function () { t.remove(); }, o.ms || 4500);
  };

  /* ---------- charts ---------- */
  var PAL = UI.PAL = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)'];
  function nice(max) { if (max <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(max))), n = max / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  /* opts: type line|area|bar|stack, labels[], series[{name,data[],color,axis:'r'?,type:'line'?}], height(rem), fmt, fmt2, goal, min, max, tickEvery, legend(bool) */
  UI.chart = function (host, o) {
    var hidden = {}; var tip;
    function draw() {
      var R = rem(), W = host.clientWidth || 800, H = (o.height || 26) * R, padL = 5.4 * R, padR = (o.series.some(function (s) { return s.axis === 'r'; }) ? 5.4 : 1.4) * R, padT = 1.2 * R, padB = 3 * R;
      var iw = W - padL - padR, ih = H - padT - padB, n = o.labels.length;
      var vis = o.series.filter(function (s, i) { return !hidden[i]; });
      function rangeOf(ax) {
        var ss = vis.filter(function (s) { return (s.axis === 'r') === (ax === 'r'); }); if (!ss.length) return [0, 1];
        var mx = 0, mn = 0; if (o.type === 'stack' && ax !== 'r') { for (var i = 0; i < n; i++) { var t = 0; ss.forEach(function (s) { t += s.data[i] || 0; }); mx = Math.max(mx, t); } } else ss.forEach(function (s) { s.data.forEach(function (v) { if (v != null) { mx = Math.max(mx, v); mn = Math.min(mn, v); } }); });
        if (ax !== 'r' && o.goal != null) mx = Math.max(mx, o.goal);
        var lo = o.min != null && ax !== 'r' ? o.min : mn, hi = o.max != null && ax !== 'r' ? o.max : nice(mx * 1.08); if (ax === 'r' && mx > 40 && mx <= 100 && hi > 100) hi = 100; return [lo, hi];
      }
      var yl = rangeOf('l'), yr = rangeOf('r'), bandW = iw / n;
      function X(i) { return padL + (o.type === 'line' || o.type === 'area' ? (n === 1 ? iw / 2 : i / (n - 1) * iw) : bandW * (i + .5)); }
      function Y(v, ax) { var r = ax === 'r' ? yr : yl; return padT + ih - (v - r[0]) / ((r[1] - r[0]) || 1) * ih; }
      var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
      for (var k = 0; k <= 4; k++) { var v = yl[0] + (yl[1] - yl[0]) * k / 4, y = Y(v); s += '<line class="gl" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (padL - .8 * R) + '" y="' + (y + .35 * R) + '" text-anchor="end">' + (o.fmt ? o.fmt(v) : UI.f.n(v, v % 1 ? 1 : 0)) + '</text>'; if (o.series.some(function (s) { return s.axis === 'r' && !hidden[o.series.indexOf(s)]; })) { var vr = yr[0] + (yr[1] - yr[0]) * k / 4; s += '<text x="' + (W - padR + .8 * R) + '" y="' + (y + .35 * R) + '">' + (o.fmt2 ? o.fmt2(vr) : UI.f.n(vr, vr % 1 ? 1 : 0)) + '</text>'; } }
      var every = o.tickEvery || Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / (7.2 * R)))));
      for (var i = 0; i < n; i += every) s += '<text x="' + X(i) + '" y="' + (H - padB + 1.9 * R) + '" text-anchor="middle">' + esc(o.labels[i]) + '</text>';
      if (o.goal != null) { var gy = Y(o.goal); s += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '" stroke="var(--ok-dot)" stroke-width="1.5" stroke-dasharray="6 5"/><text x="' + (W - padR - 4) + '" y="' + (gy - 6) + '" text-anchor="end" style="fill:var(--ok)">goal ' + (o.fmt ? o.fmt(o.goal) : o.goal) + '</text>'; }
      var bars = o.series.filter(function (s, i) { return !hidden[i] && (o.type === 'bar' || o.type === 'stack') && s.type !== 'line'; }), bi = 0, stackBase = [];
      o.series.forEach(function (sr, si) {
        if (hidden[si]) return; var col = sr.color || PAL[si % PAL.length], isLine = sr.type === 'line' || o.type === 'line' || o.type === 'area';
        if (!isLine) {
          if (o.type === 'stack') { var bw = Math.min(bandW * .7, 4 * R); for (var i2 = 0; i2 < n; i2++) { var val = sr.data[i2] || 0, base = stackBase[i2] || 0, y0 = Y(base), y1 = Y(base + val); stackBase[i2] = base + val; if (val > 0) s += '<rect x="' + (X(i2) - bw / 2) + '" y="' + y1 + '" width="' + bw + '" height="' + Math.max(0, y0 - y1) + '" fill="' + col + '" rx="2"/>'; } }
          else { var cnt = bars.length, bw2 = Math.min(bandW * .8 / cnt, 3.2 * R); for (var i3 = 0; i3 < n; i3++) { var vv = sr.data[i3]; if (vv == null) continue; var y2 = Y(vv, sr.axis), yb = Y(Math.max(0, yl[0]), sr.axis); s += '<rect x="' + (X(i3) - bw2 * cnt / 2 + bi * bw2) + '" y="' + Math.min(y2, yb) + '" width="' + (bw2 - 1) + '" height="' + Math.abs(yb - y2) + '" fill="' + col + '" rx="2"/>'; } bi++; }
        } else {
          var pts = [], seg = [], d = ''; sr.data.forEach(function (v2, i4) { if (v2 == null) { if (seg.length) pts.push(seg); seg = []; } else seg.push([X(i4), Y(v2, sr.axis)]); }); if (seg.length) pts.push(seg);
          pts.forEach(function (sg) { var path = sg.map(function (p, j) { return (j ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' '); if (o.type === 'area' && !sr.axis) s += '<path d="' + path + ' L' + sg[sg.length - 1][0] + ' ' + (padT + ih) + ' L' + sg[0][0] + ' ' + (padT + ih) + 'Z" fill="' + col + '" opacity=".12"/>'; s += '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"' + (sr.dash ? ' stroke-dasharray="6 5"' : '') + '/>'; if (sg.length === 1) s += '<circle cx="' + sg[0][0] + '" cy="' + sg[0][1] + '" r="3.5" fill="' + col + '"/>'; });
        }
      });
      s += '<line id="xh" y1="' + padT + '" y2="' + (padT + ih) + '" stroke="var(--faint)" stroke-dasharray="3 3" style="display:none"/><rect id="ov" x="' + padL + '" y="' + padT + '" width="' + iw + '" height="' + ih + '" fill="transparent"/></svg>';
      host.innerHTML = s + (o.legend === false || o.series.length < 2 ? '' : '<div class="legend">' + o.series.map(function (sr, i) { return '<button class="' + (hidden[i] ? 'off' : '') + '" data-lg="' + i + '"><i style="background:' + (sr.color || PAL[i % PAL.length]) + '"></i>' + esc(sr.name) + '</button>'; }).join('') + '</div>');
      host.classList.add('chart');
      var ov = host.querySelector('#ov'), xh = host.querySelector('#xh');
      ov.onmousemove = function (e) {
        var rc = ov.getBoundingClientRect(), mx = e.clientX - rc.left, idx = (o.type === 'line' || o.type === 'area') ? Math.round(mx / iw * (n - 1)) : Math.floor(mx / bandW); idx = Math.max(0, Math.min(n - 1, idx));
        xh.setAttribute('x1', X(idx)); xh.setAttribute('x2', X(idx)); xh.style.display = '';
        if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; host.appendChild(tip); }
        tip.innerHTML = '<b>' + esc(o.tipLabels ? o.tipLabels[idx] : o.labels[idx]) + '</b>' + o.series.map(function (sr, i) { if (hidden[i]) return ''; var v3 = sr.data[idx]; return '<div><span class="sdot" style="background:' + (sr.color || PAL[i % PAL.length]) + ';margin-right:.5rem"></span>' + esc(sr.name) + ': <b style="display:inline">' + (v3 == null ? '-' : (sr.fmt || o.fmt || function (x) { return UI.f.n(x, x % 1 ? 1 : 0); })(v3)) + '</b></div>'; }).join('');
        tip.style.display = ''; tip.style.left = Math.max(60, Math.min(W - 60, X(idx))) + 'px'; tip.style.top = (e.clientY - host.getBoundingClientRect().top - 8) + 'px';
      };
      ov.onmouseleave = function () { xh.style.display = 'none'; if (tip) tip.style.display = 'none'; };
      if (o.onClick) ov.onclick = function (e) { var rc = ov.getBoundingClientRect(), mx = e.clientX - rc.left; var idx = (o.type === 'line' || o.type === 'area') ? Math.round(mx / iw * (n - 1)) : Math.floor(mx / bandW); o.onClick(Math.max(0, Math.min(n - 1, idx))); };
      tip = null; host.style.position = 'relative';
    }
    host.onclick = function (e) { var b = e.target.closest('[data-lg]'); if (b) { var i = +b.dataset.lg; hidden[i] = !hidden[i]; draw(); } };
    draw();
    if (window.ResizeObserver) { var last = host.clientWidth, ro = new ResizeObserver(function () { if (!document.body.contains(host)) { ro.disconnect(); return; } if (Math.abs(host.clientWidth - last) > 4) { last = host.clientWidth; draw(); } }); ro.observe(host); }
    return { redraw: draw, update: function (n2) { Object.assign(o, n2); draw(); } };
  };
  /* donut: items [{name,value,color}], center {v,l} */
  UI.donut = function (host, o) {
    var tot = o.items.reduce(function (a, b) { return a + b.value; }, 0), R = 70, C = 2 * Math.PI * R, off = 0;
    var arcs = o.items.map(function (it, i) { var len = tot ? it.value / tot * C : 0, a = '<circle cx="90" cy="90" r="' + R + '" fill="none" stroke="' + (it.color || PAL[i % PAL.length]) + '" stroke-width="26" stroke-dasharray="' + len + ' ' + (C - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 90 90)"><title>' + esc(it.name) + ': ' + UI.f.n(it.value) + ' (' + (tot ? (it.value / tot * 100).toFixed(1) : 0) + '%)</title></circle>'; off += len; return a; }).join('');
    host.innerHTML = '<div style="display:flex;align-items:center;gap:2.5rem;flex-wrap:wrap"><svg viewBox="0 0 180 180" style="width:17rem;flex:none"><circle cx="90" cy="90" r="' + R + '" fill="none" stroke="var(--chip-bg)" stroke-width="26"/>' + arcs + '<text x="90" y="92" text-anchor="middle" style="font-size:26px;font-weight:700;fill:var(--ink)">' + (o.center ? o.center.v : UI.f.n(tot)) + '</text><text x="90" y="112" text-anchor="middle" style="font-size:11px;fill:var(--muted)">' + (o.center ? o.center.l : 'Total') + '</text></svg><ul class="plain" style="flex:1;min-width:14rem">' + o.items.map(function (it, i) { return '<li style="display:flex;align-items:center;gap:.8rem;font-size:1.2rem"><span class="sdot" style="background:' + (it.color || PAL[i % PAL.length]) + '"></span><span style="flex:1">' + esc(it.name) + '</span><b>' + UI.f.n(it.value) + '</b><span class="muted" style="width:5.4rem;text-align:right">' + (tot ? (it.value / tot * 100).toFixed(1) : '0.0') + '%</span></li>'; }).join('') + '</ul></div>';
  };
  /* horizontal bars: items [{label,value,max,fmt,color,sub}] -> html */
  UI.hbars = function (items, o) {
    o = o || {}; var mx = o.max || Math.max.apply(null, items.map(function (x) { return x.value; }).concat([1]));
    return '<div style="display:grid;gap:1rem">' + items.map(function (it) { return '<div' + (it.go ? ' class="click" data-go="' + it.go + '" style="cursor:pointer"' : '') + '><div style="display:flex;justify-content:space-between;font-size:1.2rem;margin-bottom:.35rem"><span>' + esc(it.label) + (it.sub ? ' <span class="muted">' + it.sub + '</span>' : '') + '</span><b>' + (it.fmt ? it.fmt(it.value) : UI.f.n(it.value)) + '</b></div><div class="bar"><i style="width:' + Math.max(1, it.value / mx * 100) + '%;' + (it.color ? 'background:' + it.color : '') + '"></i></div></div>'; }).join('') + '</div>';
  };
  /* heatmap: rowLabels, colLabels, m[r][c], fmt, hue */
  UI.heat = function (host, o) {
    var mx = 0; o.m.forEach(function (r) { r.forEach(function (v) { if (v != null && v > mx) mx = v; }); });
    var h = '<div class="hm" style="grid-template-columns:7rem repeat(' + o.colLabels.length + ',minmax(0,1fr))"><div class="hl"></div>' + o.colLabels.map(function (c) { return '<div class="hl" style="justify-content:center;padding:0">' + c + '</div>'; }).join('');
    o.m.forEach(function (r, ri) { h += '<div class="hl">' + esc(o.rowLabels[ri]) + '</div>'; r.forEach(function (v, ci) { var a = v == null || !mx ? 0 : v / mx; h += '<div title="' + esc(o.rowLabels[ri] + ' ' + o.colLabels[ci] + ': ' + (o.fmt ? o.fmt(v) : v)) + '" style="background:' + (v == null ? 'var(--chip-bg)' : 'rgba(' + (o.rgb || '37,99,235') + ',' + (0.12 + a * .88).toFixed(2) + ')') + ';color:' + (a > .45 ? '#fff' : 'var(--ink2)') + '">' + (o.cells === false ? '' : (v == null ? '' : (o.fmt ? o.fmt(v) : Math.round(v)))) + '</div>'; }); });
    host.innerHTML = h + '</div>';
  };

  /* ---------- helpers ---------- */
  UI.copy = function (text) { try { navigator.clipboard.writeText(text); UI.toast('Copied to clipboard', { kind: 'ok' }); } catch (e) { UI.toast('Copy failed', { kind: 'bad' }); } };
  UI.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };
  UI.sw = function (on, attr) { return '<button class="sw ' + (on ? 'on' : '') + '" ' + (attr || '') + ' aria-pressed="' + !!on + '"></button>'; };
  UI.opts = function (arr, sel) { return arr.map(function (x) { var k = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(k) + '"' + (k == sel ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); };
  UI.can = function (perm) { return MCM.can ? MCM.can(perm) : true; };
})();
