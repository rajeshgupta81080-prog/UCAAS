/* Tab 9 - Break reasons: activity codes table + lost-connection grace. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util;
  var CATS = ['Break', 'Meal', 'Off-queue work'];

  function code(id, name, cat, allow, max, paid, work, pick, builtin) { return { id: id, name: name, category: cat, allowance: allow, maxPerDay: max, paid: paid, work: work, agentPick: pick, builtin: !!builtin }; }

  CRX.registerTab({
    id: 'break-reasons', title: 'Break reasons', short: 'Break Reasons', icon: 'clock',
    desc: 'Activity codes agents can pick when off a call, and how long a dropped connection is tolerated.',
    products: ['queues'],
    settings: [{ id: 'activity-codes', label: 'Activity codes (Break, Lunch, Busy, Training…)', keywords: 'break reasons allowance paid work agent may pick off-queue' }, { id: 'lost-connection', label: 'Lost connection — grace before sign-out', keywords: 'seconds browser disconnect signed out' }],
    labels: { codes: 'Activity codes', lostSeconds: 'Lost-connection grace (seconds)' },
    anchors: { codes: 'activity-codes', lostSeconds: 'lost-connection' },
    defaults: function () {
      return { codes: [code('c1', 'Break', 'Break', 15, '', true, false, true, true), code('c2', 'Lunch', 'Meal', 30, 1, false, false, true, true), code('c3', 'Busy', 'Off-queue work', '', '', true, true, true, true),
        code('c4', 'Training', 'Off-queue work', 45, 2, true, true, true), code('c5', 'Meeting', 'Off-queue work', 60, 3, true, true, false)], lostSeconds: 60 };
    },
    validate: function (d) {
      var e = {}, names = {};
      d.codes.forEach(function (c) {
        var k = c.name.trim().toLowerCase();
        if (!k) e.codes = 'Every activity code needs a name.'; else if (names[k]) e.codes = 'Two activity codes are named “' + c.name + '”.'; names[k] = 1;
        if (c.allowance !== '' && !U.isInt(c.allowance, 1, 480)) e.codes = '“' + c.name + '”: allowance must be 1–480 minutes (or empty for none).';
        if (c.maxPerDay !== '' && !U.isInt(c.maxPerDay, 1, 24)) e.codes = '“' + c.name + '”: max per day must be 1–24 (or empty for no cap).';
      });
      if (d.lostSeconds !== '' && !U.isInt(d.lostSeconds, 15, 86400)) e.lostSeconds = 'Enter a whole number of seconds from 15 to 86400 (or leave empty for 1 minute).';
      return e;
    },
    render: function (ctx) {
      var tableHost = h('div'), q = '', cat = 'all';
      function codes() { return ctx.get('codes'); }
      function setCodes(list) { ctx.set('codes', list); paint(); }

      function openEdit(existing) {
        var c = existing ? U.clone(existing) : code(U.uid('c'), '', 'Off-queue work', 30, '', true, true, true, false);
        var errs = {};
        var nameI = UI.Input({ id: 'br-n', value: c.name, maxlength: 30, disabled: c.builtin, placeholder: 'e.g. Training', label: 'Name', onInput: function (v) { c.name = v; } });
        var catS = UI.Select({ id: 'br-c', options: CATS, value: c.category, label: 'Category', disabled: c.builtin, onChange: function (v) { c.category = v; } });
        var alI = UI.Input({ id: 'br-a', type: 'number', min: 1, max: 480, value: c.allowance, placeholder: 'No limit', suffix: 'min', label: 'Allowance', onInput: function (v) { c.allowance = v === '' ? '' : Number(v); } });
        var mxI = UI.Input({ id: 'br-m', type: 'number', min: 1, max: 24, value: c.maxPerDay, placeholder: 'No cap', suffix: 'per day', label: 'Max per day', onInput: function (v) { c.maxPerDay = v === '' ? '' : Number(v); } });
        var e = { n: h('div.fld-e', { role: 'alert' }), a: h('div.fld-e', { role: 'alert' }), m: h('div.fld-e', { role: 'alert' }) };
        function sw(key, label, hint) { return h('div.mrow', h('div', h('b', label), h('small', hint)), UI.Toggle({ checked: c[key], label: label, onChange: function (v) { c[key] = v; } })); }
        function submit() {
          e.n.textContent = e.a.textContent = e.m.textContent = '';
          var dup = codes().some(function (x) { return x.id !== c.id && x.name.trim().toLowerCase() === c.name.trim().toLowerCase(); });
          if (!c.name.trim()) e.n.textContent = 'Enter a name.'; else if (dup) e.n.textContent = 'An activity code with this name already exists.';
          if (c.allowance !== '' && !U.isInt(c.allowance, 1, 480)) e.a.textContent = 'Enter 1–480 minutes, or leave empty.';
          if (c.maxPerDay !== '' && !U.isInt(c.maxPerDay, 1, 24)) e.m.textContent = 'Enter 1–24, or leave empty.';
          if (e.n.textContent || e.a.textContent || e.m.textContent) return;
          c.name = c.name.trim();
          setCodes(existing ? codes().map(function (x) { return x.id === c.id ? c : x; }) : codes().concat([c]));
          m.close(); UI.toast(existing ? '“' + c.name + '” updated.' : '“' + c.name + '” added.', 'ok');
        }
        var m = UI.Modal({ title: existing ? 'Edit ' + existing.name : 'Add a reason', desc: c.builtin ? 'Built-in codes can have their limits edited but cannot be renamed or removed.' : 'An activity code an agent can pick when off a call.', size: 'md',
          body: h('form.form', { onSubmit: function (ev) { ev.preventDefault(); submit(); } },
            h('div.grid2', h('div.fld', h('label.fld-l', { for: 'br-n' }, 'Name ', h('span.req', '*')), nameI, e.n), h('div.fld', h('label.fld-l', { for: 'br-c' }, 'Category'), catS)),
            h('div.grid2', h('div.fld', h('label.fld-l', { for: 'br-a' }, 'Allowance'), alI, h('div.fld-h', 'How long it may last. Empty = no limit.'), e.a), h('div.fld', h('label.fld-l', { for: 'br-m' }, 'Max per day'), mxI, h('div.fld-h', 'How many times a day. Empty = no cap.'), e.m)),
            sw('paid', 'Paid', 'The time counts as paid.'), sw('work', 'Work', 'The time counts as work time.'), sw('agentPick', 'Agent may pick', 'Agents can choose it themselves.')),
          footer: [UI.Button({ label: 'Cancel', kind: 'secondary', onClick: function () { m.close(); } }), UI.Button({ label: existing ? 'Save reason' : 'Add reason', kind: 'primary', onClick: submit })] });
      }
      function remove(c) {
        UI.confirm({ title: 'Delete “' + c.name + '”?', message: 'Agents will no longer be able to pick it. Reports keep the time already logged against it.', confirmLabel: 'Delete reason', danger: true })
          .then(function (ok) { if (ok) { setCodes(codes().filter(function (x) { return x.id !== c.id; })); UI.toast('“' + c.name + '” deleted. Remember to save.', 'info'); } });
      }
      function flag(c, key, label) { return UI.Toggle({ checked: c[key], label: label + ' — ' + c.name, onChange: function (v) { var list = codes().map(function (x) { if (x.id === c.id) { var y = U.clone(x); y[key] = v; return y; } return x; }); ctx.set('codes', list); } }); }

      function paint() {
        var rows = codes().filter(function (c) { return (cat === 'all' || c.category === cat) && (!q || c.name.toLowerCase().indexOf(q) >= 0); });
        tableHost.replaceChildren(!codes().length
          ? UI.EmptyState({ icon: 'clock', title: 'No activity codes', body: 'Activity codes are what agents can be doing when off a call.', why: 'All codes were removed.', actions: [UI.Button({ label: 'Add a reason', icon: 'plus', kind: 'primary', onClick: function () { openEdit(); } })] })
          : !rows.length ? UI.EmptyState({ icon: 'search', title: 'No codes match', body: 'Try a different search or category.' })
          : UI.DataTable({ caption: 'Activity codes', rows: rows, rowKey: 'id', sortKey: null, columns: [
            { key: 'name', label: 'Code', sortable: true, render: function (c) { return h('b', c.name); } },
            { key: 'category', label: 'Category', sortable: true },
            { key: 'allowance', label: 'Allowance (min)', sortable: true, sortValue: function (c) { return c.allowance === '' ? 9999 : c.allowance; }, render: function (c) { return c.allowance === '' ? h('span.mut', 'none') : c.allowance; } },
            { key: 'maxPerDay', label: 'Max per day', sortable: true, sortValue: function (c) { return c.maxPerDay === '' ? 9999 : c.maxPerDay; }, render: function (c) { return c.maxPerDay === '' ? h('span.mut', 'no cap') : c.maxPerDay; } },
            { key: 'paid', label: 'Paid', render: function (c) { return flag(c, 'paid', 'Paid'); } },
            { key: 'work', label: 'Work', render: function (c) { return flag(c, 'work', 'Work'); } },
            { key: 'agentPick', label: 'Agent may pick', render: function (c) { return flag(c, 'agentPick', 'Agent may pick'); } },
            { key: 'builtin', label: 'Status', render: function (c) { return c.builtin ? UI.StatusBadge('builtin') : UI.Pill('Custom', 'neutral'); } },
            { key: 'a', label: 'Actions', align: 'right', render: function (c) { return h('div.acts', UI.IconButton('edit', 'Edit ' + c.name, function () { openEdit(c); }), c.builtin ? null : UI.IconButton('trash', 'Delete ' + c.name, function () { remove(c); })); } }] }));
      }
      paint();

      var human = ctx.dyn(function () { var s = ctx.get('lostSeconds'); return h('div.fld-h.live', s === '' ? 'Empty uses the default of 1 minute.' : U.isInt(s, 15, 86400) ? s + ' seconds = ' + U.humanSeconds(s) : ''); }, function () { return [ctx.get('lostSeconds')]; });

      var glance = ctx.dyn(function () {
        var c = codes(), gs = ctx.get('lostSeconds');
        return UI.Glance([
          { icon: 'list', label: 'Activity codes', value: c.length + ' codes', sub: c.filter(function (x) { return x.builtin; }).length + ' built in · ' + c.filter(function (x) { return !x.builtin; }).length + ' custom', tone: 'neutral' },
          { icon: 'user', label: 'Agents may pick', value: c.filter(function (x) { return x.agentPick; }).length + ' of ' + c.length, sub: 'Chosen by agents themselves', tone: 'info' },
          { icon: 'dollar', label: 'Paid time', value: c.filter(function (x) { return x.paid; }).length + ' paid', sub: c.filter(function (x) { return x.work; }).length + ' count as work', tone: 'neutral' },
          { icon: 'refresh', label: 'Lost connection', value: gs === '' ? '1 minute' : U.humanSeconds(gs), sub: 'Grace before sign-out', tone: 'neutral' }]);
      });
      return h('div.stack', glance,
        UI.Section({ id: 'activity-codes', icon: 'clock', title: 'Activity codes', badges: UI.StatusBadge('active'), desc: 'What an agent can be doing when off a call. These feed availability, staffing reports and pay calculations.',
          children: UI.Card({ children: [
            h('div.toolbar', h('div.tb-s', icon('search', 14), UI.Input({ placeholder: 'Search codes…', label: 'Search activity codes', onInput: function (v) { q = v.trim().toLowerCase(); paint(); } })),
              UI.Select({ options: [{ value: 'all', label: 'All categories' }].concat(CATS), value: 'all', label: 'Filter by category', onChange: function (v) { cat = v; paint(); } }),
              h('div.tb-r', UI.Button({ label: 'Add reason', icon: 'plus', kind: 'primary', size: 'sm', onClick: function () { openEdit(); } }))),
            ctx.dyn(function () { return ctx.err('codes') ? UI.Banner({ tone: 'danger', compact: true, title: 'Fix before saving', children: ctx.err('codes') }) : null; }),
            tableHost,
            UI.Banner({ tone: 'info', compact: true, children: ['Paid and Work flags matter for timesheets and for deciding who counts as available to take calls. ', UI.StatusBadge('builtin'), ' codes ship with the system: their limits can be edited, but they cannot be removed.'] })] }) }),
        UI.Section({ id: 'lost-connection', icon: 'refresh', title: 'Lost connection', badges: UI.StatusBadge('active'), desc: 'Grace before sign-out. Sets how long an agent stays signed in after their browser loses connection.',
          children: UI.Card({ children: h('div.grid2',
            h('div', ctx.field('lostSeconds', { label: 'Grace period', hint: 'Allowed 15 to 86400 seconds. Default 60.', control: function (id) { return ctx.text('lostSeconds', { id: id, type: 'number', min: 15, max: 86400, number: true, suffix: 'seconds', placeholder: '60' }); } }), human),
            h('div.fld', h('div.fld-l', 'Default'), UI.Button({ label: 'Reset to 60 seconds', icon: 'undo', kind: 'secondary', onClick: function () { ctx.set('lostSeconds', 60); ctx.rerender(); } }))) }) }));
    }
  });
})(window);
