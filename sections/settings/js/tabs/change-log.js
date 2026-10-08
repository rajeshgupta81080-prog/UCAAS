/* Tab 16 - Change log: Delivery view + Configuration history (search, filters, date range, export, detail drawer). */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, S = CRX.store, D = CRX.data;

  function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
  function download(name, text, type) {
    var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: type })), download: name }); document.body.appendChild(a); a.click(); a.remove();
  }

  CRX.registerTab({
    id: 'change-log', title: 'Change log', short: 'Change Log', icon: 'list',
    desc: 'Change and propagation log — what changed, and whether each product received it.',
    settings: [{ id: 'delivery', label: 'Delivery status per product', keywords: 'propagation delivered pending failed' }, { id: 'history', label: 'Configuration history', keywords: 'audit who changed what export filter' }],
    render: function (ctx) {
      var view = 'delivery';
      var deliveryHost = h('div'), historyHost = h('div'), tabsHost = h('div');
      var f = { q: '', user: 'all', section: 'all', status: 'all', from: '', to: '' };

      /* ---------- delivery ---------- */
      function paintDelivery(loading, error) {
        if (error) { deliveryHost.replaceChildren(UI.EmptyState({ icon: 'danger', title: 'The propagation dashboard could not be read', body: 'Request failed with status code 404.', why: 'The page could not load its data at that moment. Report it to the platform team if it persists.', actions: [UI.Button({ label: 'Retry', icon: 'refresh', kind: 'primary', onClick: function () { loadDelivery(); } })] })); return; }
        if (loading) { deliveryHost.replaceChildren(UI.Skeleton(5)); return; }
        var failed = S.delivery.filter(function (r) { return r.status === 'Failed'; }).length;
        CRX.setKids(deliveryHost,
          failed ? UI.Banner({ tone: 'danger', compact: true, title: failed + ' product' + (failed > 1 ? 's' : '') + ' did not receive the latest change', children: 'Open the row for details, then retry delivery.' }) : S.delivery.some(function (r) { return r.status === 'Pending'; }) ? UI.Banner({ tone: 'info', compact: true, title: 'Delivery in progress', children: 'Changes reach each product within about a minute of saving.' }) : null,
          UI.DataTable({ caption: 'Delivery status by product', rows: S.delivery, rowKey: 'product', onRowClick: deliveryDetail, columns: [
            { key: 'name', label: 'Product', sortable: true, render: function (r) { var p = D.products.filter(function (x) { return x.id === r.product; })[0]; return h('div', h('b', r.name), h('small.mut', p ? ' · ' + p.desc : '')); } },
            { key: 'change', label: 'Change', render: function (r) { return r.change; } },
            { key: 'status', label: 'Status', sortable: true, render: function (r) { return UI.deliveryPill(r.status); } },
            { key: 'updated', label: 'Updated', sortable: true, sortValue: function (r) { return new Date(r.updated).getTime(); }, render: function (r) { return U.ago(r.updated); } },
            { key: 'd', label: 'Details', align: 'right', render: function (r) { return h('div.acts', r.status === 'Failed' ? UI.Button({ label: 'Retry', icon: 'refresh', kind: 'secondary', size: 'sm', onClick: function () { S.retryDelivery(r.product); } }) : null, UI.Button({ label: 'Details', kind: 'ghost', size: 'sm', onClick: function () { deliveryDetail(r); } })); } }] }));
      }
      function loadDelivery() { paintDelivery(true); setTimeout(function () { paintDelivery(false, !!ctx._failDelivery); ctx._failDelivery = false; }, 550); }
      function deliveryDetail(r) {
        UI.Drawer({ title: r.name, desc: 'Delivery details', body: h('div', UI.KV([['Status', UI.deliveryPill(r.status)], ['Latest change', r.change], ['Updated', U.fmtDateTime(r.updated) + ' (' + U.ago(r.updated) + ')']]),
          UI.Banner({ tone: r.status === 'Failed' ? 'danger' : r.status === 'Delivered' ? 'ok' : 'info', compact: true, children: r.detail }),
          h('h3.dr-h', 'Timeline'), UI.AuditTimeline([{ title: 'Change saved', meta: U.fmtDateTime(r.updated), tone: 'ok' }, { title: 'Sent to ' + r.name, meta: 'within about a minute', tone: 'ok' },
            { title: r.status === 'Delivered' ? 'Receipt confirmed' : r.status === 'Failed' ? 'Delivery failed' : r.status === 'Pending' ? 'Waiting for confirmation' : 'No confirmation received', tone: r.status === 'Delivered' ? 'ok' : r.status === 'Failed' ? 'danger' : 'neutral' }])),
          footer: r.status === 'Failed' ? UI.Button({ label: 'Retry delivery', icon: 'refresh', kind: 'primary', onClick: function () { S.retryDelivery(r.product); } }) : null });
      }
      ctx.onDelivery = function () { if (view === 'delivery') paintDelivery(false); paintHistory(); };

      /* ---------- history ---------- */
      function filtered() {
        var q = f.q.toLowerCase(), from = f.from ? new Date(f.from + 'T00:00:00').getTime() : 0, to = f.to ? new Date(f.to + 'T23:59:59').getTime() : Infinity;
        return S.history.filter(function (x) {
          var t = new Date(x.at).getTime();
          return (f.user === 'all' || x.user === f.user) && (f.section === 'all' || x.section === f.section) && (f.status === 'all' || x.status === f.status) && t >= from && t <= to &&
            (!q || (x.change + ' ' + x.user + ' ' + x.section + ' ' + x.from + ' ' + x.to).toLowerCase().indexOf(q) >= 0);
        });
      }
      function historyDetail(r) {
        UI.Drawer({ title: r.change, desc: r.section + ' · ' + U.fmtDateTime(r.at), body: h('div',
          UI.KV([['Changed by', h('span.who', UI.Avatar(r.user), r.user)], ['Section', r.section], ['Date / time', U.fmtDateTime(r.at)], ['Delivery', UI.deliveryPill(r.status)]]),
          h('div.diff', h('div.diff-c', h('small', 'Previous value'), h('div.diff-v.old', r.from)), icon('chevR', 16), h('div.diff-c', h('small', 'New value'), h('div.diff-v.new', r.to))),
          h('h3.dr-h', 'Audit timeline'), UI.AuditTimeline([{ title: 'Changed by ' + r.user, meta: U.fmtDateTime(r.at), tone: 'neutral' }, { title: 'Saved to company configuration', meta: U.fmtDateTime(r.at), tone: 'ok' },
            { title: r.status === 'Delivered' ? 'Delivered to products' : r.status === 'Failed' ? 'Delivery failed — retry from the Delivery view' : 'Delivery pending', tone: r.status === 'Delivered' ? 'ok' : r.status === 'Failed' ? 'danger' : 'neutral' }])),
          footer: r.tab && S.tab(r.tab) ? UI.Button({ label: 'Open ' + r.section, kind: 'secondary', onClick: function () { UI.closeAllOverlays(); CRX.app.focusSetting(r.tab, r.anchor || null); } }) : null });
      }
      function paintHistory() {
        var all = S.history, rows = filtered();
        historyHost.querySelector('.hist-count') && (historyHost.querySelector('.hist-count').textContent = U.plural(rows.length, 'change') + (rows.length !== all.length ? ' of ' + all.length : ''));
        var table = !all.length ? UI.EmptyState({ icon: 'list', title: 'No configuration history', body: 'Every saved change to Company Rules is recorded here with who made it and when.', why: 'Nothing has been saved yet.' })
          : !rows.length ? UI.EmptyState({ icon: 'filter', title: 'No changes match your filters', body: 'Try a wider date range or clear a filter.', actions: [UI.Button({ label: 'Clear filters', kind: 'secondary', onClick: clearFilters })] })
          : UI.DataTable({ caption: 'Configuration history', rows: rows, rowKey: 'id', sortKey: 'at', sortDir: 'desc', pageSize: 10, onRowClick: historyDetail, columns: [
            { key: 'user', label: 'User', sortable: true, render: function (r) { return h('span.who', UI.Avatar(r.user), r.user); } },
            { key: 'change', label: 'Change', sortable: true }, { key: 'section', label: 'Section', sortable: true },
            { key: 'from', label: 'Previous value', render: function (r) { return h('span.old', r.from); } }, { key: 'to', label: 'New value', render: function (r) { return h('span.new', r.to); } },
            { key: 'at', label: 'Date / time', sortable: true, sortValue: function (r) { return new Date(r.at).getTime(); }, render: function (r) { return U.fmtDateTime(r.at); } },
            { key: 'status', label: 'Status', sortable: true, render: function (r) { return UI.deliveryPill(r.status); } }] });
        tableSlot.replaceChildren(table);
      }
      var tableSlot = h('div');
      function clearFilters() { f = { q: '', user: 'all', section: 'all', status: 'all', from: '', to: '' }; buildHistory(); }
      function exportCsv() {
        var rows = filtered();
        if (!rows.length) { UI.toast('Nothing to export with the current filters.', 'warn'); return; }
        download('company-rules-history.csv', ['User,Change,Section,Previous value,New value,Date/time,Status'].concat(rows.map(function (r) { return [r.user, r.change, r.section, r.from, r.to, U.fmtDateTime(r.at), r.status].map(csvCell).join(','); })).join('\n'), 'text/csv');
        UI.toast('Exported ' + U.plural(rows.length, 'change') + ' to CSV.', 'ok');
      }
      function buildHistory() {
        var users = ['all'].concat(S.history.map(function (x) { return x.user; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort());
        var sections = ['all'].concat(S.history.map(function (x) { return x.section; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort());
        function sel(key, opts, label, all) { return UI.Select({ options: opts.map(function (o) { return o === 'all' ? { value: 'all', label: all } : o; }), value: f[key], label: label, onChange: function (v) { f[key] = v; paintHistory(); } }); }
        historyHost.replaceChildren(
          h('div.toolbar.wrap', h('div.tb-s', icon('search', 14), UI.Input({ placeholder: 'Search changes, people, values…', label: 'Search configuration history', value: f.q, onInput: function (v) { f.q = v.trim(); paintHistory(); } })),
            sel('user', users, 'Filter by user', 'All users'), sel('section', sections, 'Filter by section', 'All sections'), sel('status', ['all', 'Delivered', 'Pending', 'Failed'], 'Filter by status', 'All statuses'),
            h('div.dates', UI.Input({ type: 'date', label: 'From date', value: f.from, onInput: function (v) { f.from = v; paintHistory(); } }), h('span.mut', 'to'), UI.Input({ type: 'date', label: 'To date', value: f.to, onInput: function (v) { f.to = v; paintHistory(); } })),
            h('div.tb-r', h('span.hist-count.mut'), UI.Button({ label: 'Clear', kind: 'ghost', size: 'sm', onClick: clearFilters }), UI.Button({ label: 'Export CSV', icon: 'download', kind: 'secondary', size: 'sm', onClick: exportCsv }))),
          tableSlot);
        paintHistory();
      }

      function paintView() {
        tabsHost.replaceChildren(UI.Seg({ label: 'Change log view', value: view, options: [{ value: 'delivery', label: 'Delivery' }, { value: 'history', label: 'Configuration history' }], onChange: function (v) { view = v; paintView(); } }));
        deliveryHost.hidden = view !== 'delivery'; historyHost.hidden = view !== 'history';
        if (view === 'delivery') loadDelivery(); else buildHistory();
      }
      var root = h('div.stack', UI.Section({ id: 'delivery', icon: 'server', title: 'Change and propagation log', desc: 'Delivery shows whether each product received the latest change. Configuration history shows who changed what, and when.',
        actions: [UI.Button({ label: 'Export configuration', icon: 'download', kind: 'secondary', size: 'sm', onClick: function () { CRX.app.exportConfig(); } }),
          UI.Button({ label: 'Refresh', icon: 'refresh', kind: 'secondary', size: 'sm', onClick: function () { if (view === 'delivery') loadDelivery(); else { buildHistory(); UI.toast('History refreshed.', 'info', { ms: 1500 }); } } })],
        children: UI.Card({ children: [tabsHost, deliveryHost, historyHost] }) }));
      paintView();
      return root;
    }
  });
})(window);
