/* Tab 14 - Profile fields (coming soon) and Tab 15 - Caller ID name. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util;

  /* ---------------- Profile fields: honest "coming soon" ---------------- */
  CRX.registerTab({
    id: 'profile-fields', title: 'Profile fields', short: 'Profile Fields', icon: 'user', status: 'soon',
    desc: 'Extra details kept on each person, beyond the standard name, extension and role.',
    settings: [{ id: 'profile-fields', label: 'Profile fields (extra details on each person)', keywords: 'employee id custom fields coming soon' }],
    render: function (ctx) {
      function soon() {
        var m = UI.Modal({ title: 'Add a field — coming soon', size: 'sm', body: h('div.confirm-b', h('div.confirm-i.info', icon('clock', 20)), h('div.confirm-t', 'Profile fields are not available yet.', h('div.confirm-s', 'When released you will be able to store extra facts on each person, such as an employee ID. Nothing can be saved here today.'))),
          footer: UI.Button({ label: 'Got it', kind: 'primary', onClick: function () { m.close(); } }) });
      }
      return h('div.stack',
        UI.Banner({ tone: 'soon', title: 'Coming soon', children: 'This feature has not been released yet, and no backend exists for it.' }),
        UI.Section({ id: 'profile-fields', icon: 'user', title: 'Your fields', badges: UI.StatusBadge('soon'), actions: UI.Button({ label: 'Add a field', icon: 'plus', kind: 'secondary', size: 'sm', onClick: soon }),
          children: UI.Card({ tone: 'soon', children: UI.EmptyState({ icon: 'list', title: 'No extra fields yet', body: 'Custom fields let a company store extra facts on each person — for example an employee ID.', why: 'Profile fields are not released yet, so there is nothing to configure.', actions: [UI.Button({ label: 'Add a field', icon: 'plus', kind: 'secondary', onClick: soon })] }) }) }));
    }
  });

  /* ---------------- Caller ID name ---------------- */
  var MAX = 15;
  CRX.registerTab({
    id: 'caller-id-name', title: 'Caller ID name', short: 'Caller ID', icon: 'phone',
    desc: 'The business name sent on outbound calls.',
    products: ['switch'],
    settings: [{ id: 'cid-name', label: 'Caller ID name (business name sent with calls)', keywords: 'cnam name outbound display 15 characters' }],
    labels: { name: 'Caller ID name' },
    anchors: { name: 'cid-name' },
    defaults: function () { return { name: 'Acme Corp' }; },
    validate: function (d) {
      var e = {};
      if (d.name.length > MAX) e.name = 'The name can be at most ' + MAX + ' characters (' + d.name.length + ' entered).';
      else if (!/^[A-Za-z0-9 .,&'\-]*$/.test(d.name)) e.name = 'Use letters, numbers, spaces and . , & \' - only.';
      return e;
    },
    render: function (ctx) {
      var counter = ctx.dyn(function () { var n = ctx.get('name').length; return h('span.counter' + (n > MAX ? '.over' : n >= MAX - 2 ? '.near' : ''), { 'aria-live': 'polite' }, n + '/' + MAX); });
      var preview = ctx.dyn(function () {
        var n = ctx.get('name').trim(), num = '+91 80 4567 0001';
        return h('div.phone-pre', h('small', 'Preview — incoming call'), h('div.phone', h('div.phone-n', n && ctx.get('name').length <= MAX ? n : 'Unknown caller'), h('div.phone-s', num), h('div.phone-b', h('span.ph-x', icon('x', 16)), h('span.ph-ok', icon('phone', 16)))),
          h('small.mut', 'How it might look. Your name is only sent; whether it is shown is up to the other person’s phone company.'));
      }, function () { return [ctx.get('name')]; });
      return h('div.stack',
        UI.Banner({ tone: 'soon', title: 'Saved, but not on calls yet', children: 'This is the name we send with the call. Whether the person you are calling sees it is decided by their phone company, not by us.' }),
        UI.Section({ id: 'cid-name', icon: 'phone', title: 'Name to send', badges: UI.Pill('Not on calls yet', 'soon', 'clock'), children: UI.Card({ children: h('div.grid2',
          h('div', ctx.field('name', { label: 'Name to send', hint: 'Maximum 15 characters, e.g. “Acme Ltd”.', control: function (id) { return h('div.inp-count', ctx.text('name', { id: id, placeholder: 'Acme Ltd', spellcheck: false }), counter); } })),
          preview) }) }),
        UI.Banner({ tone: 'info', compact: true, title: 'US and Canada', children: 'In the United States and Canada the name is not carried with the call at all: it is looked up in the carrier’s own CNAM directory, and being listed there is a separate registration we do not do for you.' }));
    }
  });
})(window);
