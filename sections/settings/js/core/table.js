/* DataTable: sortable, paginated, accessible, stacks into cards on small screens. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui;

  UI.DataTable = function (o) {
    var st = { key: o.sortKey || null, dir: o.sortDir || 'asc', page: 0 };
    var rows = o.rows || [];
    var pageSize = o.pageSize || 0;
    var root = h('div.dt');

    function sorted() {
      var r = rows.slice();
      if (st.key) {
        var col = o.columns.filter(function (c) { return c.key === st.key; })[0];
        var val = col && col.sortValue ? col.sortValue : function (x) { return x[st.key]; };
        r.sort(function (a, b) {
          var x = val(a), y = val(b);
          if (x == null) x = ''; if (y == null) y = '';
          var c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
          return st.dir === 'asc' ? c : -c;
        });
      }
      return r;
    }

    function render() {
      root.innerHTML = '';
      if (!rows.length) { root.appendChild(typeof o.empty === 'function' ? o.empty() : o.empty || UI.EmptyState({ title: 'Nothing to show' })); return; }
      var all = sorted(), total = all.length;
      var pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      if (st.page >= pages) st.page = pages - 1;
      var view = pageSize ? all.slice(st.page * pageSize, st.page * pageSize + pageSize) : all;

      var head = h('tr', o.columns.map(function (c) {
        var sortedHere = st.key === c.key;
        var th = h('th' + (c.cls ? '.' + c.cls : ''), { scope: 'col', 'aria-sort': c.sortable ? (sortedHere ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none') : null, style: c.align ? { textAlign: c.align } : null },
          c.sortable ? h('button.dt-sort', { type: 'button', onClick: function () {
            if (st.key === c.key) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.key = c.key; st.dir = 'asc'; }
            render();
          } }, c.label, icon(sortedHere ? (st.dir === 'asc' ? 'chevL' : 'chevR') : 'chev', 11, 'dt-arrow' + (sortedHere ? ' on' : ''))) : c.label);
        return th;
      }));
      var body = view.map(function (row, i) {
        var tr = h('tr' + (o.onRowClick ? '.clickable' : ''), { tabindex: o.onRowClick ? 0 : null, dataset: o.rowKey ? { key: row[o.rowKey] } : {},
          onClick: o.onRowClick ? function (e) { if (e.target.closest('button,a,input,select,label,.tgl')) return; o.onRowClick(row); } : null,
          onKeydown: o.onRowClick ? function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === tr) { e.preventDefault(); o.onRowClick(row); } } : null });
        o.columns.forEach(function (c) {
          var v = c.render ? c.render(row, i) : row[c.key];
          tr.appendChild(h('td' + (c.cls ? '.' + c.cls : ''), { 'data-label': c.label, style: c.align ? { textAlign: c.align } : null }, v));
        });
        return tr;
      });
      root.appendChild(h('div.dt-scroll', h('table.dt-t', o.caption ? h('caption.sr-only', o.caption) : null, h('thead', head), h('tbody', body))));
      if (pageSize && total > pageSize) {
        root.appendChild(h('div.dt-pager', h('span', (st.page * pageSize + 1) + '–' + Math.min(total, (st.page + 1) * pageSize) + ' of ' + total),
          h('div.dt-pb', UI.Button({ label: 'Previous', kind: 'secondary', size: 'sm', disabled: st.page === 0, onClick: function () { st.page--; render(); } }),
            h('span.dt-pn', 'Page ' + (st.page + 1) + ' of ' + pages),
            UI.Button({ label: 'Next', kind: 'secondary', size: 'sm', disabled: st.page >= pages - 1, onClick: function () { st.page++; render(); } }))));
      }
    }
    root.update = function (r) { rows = r; render(); };
    root.resetPage = function () { st.page = 0; };
    render();
    return root;
  };
})(window);
