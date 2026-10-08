/* Tab 17 - Desk phones: handset admin password, self setup, phone list and device status. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, D = CRX.data;

  function generate() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%', out = '', a = new Uint32Array(16);
    (g.crypto || g.msCrypto).getRandomValues(a);
    for (var i = 0; i < 16; i++) out += chars[a[i] % chars.length];
    return out;
  }
  var STATUS_TONE = { Online: 'ok', Offline: 'danger', Provisioning: 'info' };

  CRX.registerTab({
    id: 'desk-phones', title: 'Desk phones', short: 'Desk Phones', icon: 'desk',
    desc: 'Rules for every handset in the company.',
    products: ['desk'],
    settings: [{ id: 'desk-password', label: 'Handset admin password', keywords: 'generate password factory reset handsets' }, { id: 'desk-self', label: 'Self setup — people may set up their own desk phone', keywords: 'my phone provisioning' }, { id: 'desk-list', label: 'Phone list and device status', keywords: 'handsets yealink poly online offline' }],
    labels: { adminPassword: 'Handset admin password', selfSetup: 'People may set up their own desk phone' },
    anchors: { adminPassword: 'desk-password', generatedAt: 'desk-password', selfSetup: 'desk-self' },
    defaults: function () { return { adminPassword: '', selfSetup: false, generatedAt: null }; },
    validate: function () { return {}; },
    risks: function (d, saved) {
      var out = [];
      if (saved.adminPassword && !d.adminPassword) out.push({ title: 'Handset password removed', message: 'Every phone resets to its factory admin password, which is public knowledge.' });
      if (d.adminPassword && d.adminPassword !== saved.adminPassword) out.push({ title: 'Handset password changes on every phone', message: 'Anyone who has the new password can configure every handset in the company. Store it securely.' });
      return out;
    },
    render: function (ctx) {
      var shown = false;
      var pw = ctx.dyn(function () {
        var p = ctx.get('adminPassword');
        if (!p) return h('div.pw-empty', h('div', h('b', 'None generated'), h('small', 'Handsets use their factory admin password.')), UI.Button({ label: 'Generate a password', icon: 'key', kind: 'primary', onClick: function () { ctx.set('adminPassword', generate()); ctx.set('generatedAt', new Date().toISOString()); shown = true; } }));
        var score = (p.length >= 16 ? 2 : 1) + (/[A-Z]/.test(p) && /[a-z]/.test(p) ? 1 : 0) + (/\d/.test(p) ? 1 : 0) + (/[^A-Za-z0-9]/.test(p) ? 1 : 0);
        return h('div.pw', h('div.pw-row', h('code.pw-v', shown ? p : '•'.repeat(p.length)),
          UI.IconButton(shown ? 'eyeOff' : 'eye', shown ? 'Hide password' : 'Show password', function () { shown = !shown; ctx._runDyn(); }),
          UI.IconButton('copy', 'Copy password', function () { (navigator.clipboard ? navigator.clipboard.writeText(p) : Promise.reject()).then(function () { UI.toast('Password copied.', 'ok', { ms: 1800 }); }, function () { UI.toast('Copy is not available here — show the password and copy it manually.', 'warn'); }); })),
          h('div.pw-meta', UI.Pill(score >= 5 ? 'Strong' : 'Good', 'ok', 'shield'), h('small.mut', ' 16 characters · generated ' + (ctx.get('generatedAt') ? U.ago(ctx.get('generatedAt')) : ''))),
          h('div.acts', UI.Button({ label: 'Generate a new password', icon: 'refresh', kind: 'secondary', size: 'sm', onClick: function () {
            UI.confirm({ title: 'Generate a new password?', message: 'The new password is sent to every handset when you save. Anyone with the old one loses access.', confirmLabel: 'Generate', danger: false }).then(function (ok) { if (ok) { ctx.set('adminPassword', generate()); ctx.set('generatedAt', new Date().toISOString()); shown = true; } });
          } }), UI.Button({ label: 'Remove password', icon: 'trash', kind: 'ghost', size: 'sm', onClick: function () {
            UI.confirm({ title: 'Remove the handset password?', message: 'Removing it resets every phone to its factory admin password.', confirmLabel: 'Remove password', danger: true }).then(function (ok) { if (ok) { ctx.set('adminPassword', ''); ctx.set('generatedAt', null); } });
          } })));
      });
      function phoneList() {
        UI.Drawer({ title: 'Phone list', desc: 'Every handset in the company (dummy data).', body: UI.DataTable({ caption: 'Handsets', rows: D.deskPhones, rowKey: 'id', columns: [
          { key: 'user', label: 'Assigned to', sortable: true, render: function (r) { return h('div', h('b', r.user), h('small.mut', ' · ext ' + r.ext)); } }, { key: 'model', label: 'Model', sortable: true },
          { key: 'mac', label: 'MAC address', render: function (r) { return h('code', r.mac); } }, { key: 'status', label: 'Status', sortable: true, render: function (r) { return UI.Pill(r.status, STATUS_TONE[r.status], r.status === 'Online' ? 'check' : r.status === 'Offline' ? 'x' : 'refresh'); } },
          { key: 'seen', label: 'Last seen' }] }) });
      }
      var counts = D.deskPhones.reduce(function (a, p) { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
      return h('div.stack',
        UI.Banner({ tone: 'warn', title: 'Handset settings are powerful', children: 'A shared admin password is convenient but anyone who has it can configure every handset. Self setup saves admin time but lets users attach devices themselves.' }),
        UI.Section({ id: 'desk-password', icon: 'key', title: 'Handset admin password', badges: UI.StatusBadge('active'), desc: 'One admin login password for every handset. Removing it resets every phone to its factory admin password.', children: UI.Card({ children: pw }) }),
        UI.Section({ id: 'desk-self', icon: 'user', title: 'Self setup', badges: UI.StatusBadge('active'), children: UI.Card({ children: ctx.toggleRow('selfSetup', { title: 'People may set up their own desk phone', desc: 'Lets people add their own desk phone from My Phone.' }) }) }),
        UI.Section({ id: 'desk-list', icon: 'desk', title: 'Phone list and device status', desc: 'Handsets across the company.', actions: UI.Button({ label: 'Open the phone list', icon: 'external', kind: 'secondary', size: 'sm', onClick: phoneList }),
          children: UI.Card({ children: h('div.devstats', ['Online', 'Offline', 'Provisioning'].map(function (s) { return h('div.dev', h('b', counts[s] || 0), UI.Pill(s, STATUS_TONE[s])); }), h('div.dev', h('b', D.deskPhones.length), h('span.mut', 'Total handsets'))) }) }),
        UI.LiveImpact('Handset settings are provisioned to phones within about a minute of saving.'));
    }
  });
})(window);
