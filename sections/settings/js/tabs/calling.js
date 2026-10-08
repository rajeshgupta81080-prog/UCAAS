/* Tab 6 - Calling: country restrictions, caller ID options (coming soon), transfers, IVR forwarding. Cost and fraud control. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, D = CRX.data;

  CRX.registerTab({
    id: 'calling', title: 'Calling', short: 'Calling', icon: 'phone',
    desc: 'Which countries your team can call, caller-ID options and call transfers. The main protection against costly or fraudulent calls.',
    products: ['switch'],
    settings: [
      { id: 'calling-countries', label: 'Calling other countries', keywords: 'international restrict allow list countries fraud' },
      { id: 'calling-cid', label: 'Outbound caller ID options', keywords: 'office number hide unknown anonymous' },
      { id: 'calling-transfer', label: 'Transferring a call outside the company', keywords: 'external transfer international both legs' },
      { id: 'calling-outbound-transfer', label: 'Transferring a call your team made', keywords: 'outbound transfer' },
      { id: 'calling-ivr', label: 'Sending a caller out of a phone menu', keywords: 'ivr menu forward outside number domestic' }],
    labels: { 'countries.restrict': 'Only allow calls to chosen countries', 'countries.list': 'Allowed countries', 'callerId.useOffice': 'Team may use office/group number as caller ID', 'callerId.allowHide': 'Team may hide caller ID',
      'transfer.external': 'Transfer outside the company', 'transfer.international': 'Transfer to international numbers', 'outboundTransfer.allow': 'Transfer a call the team made',
      'ivr.forward': 'Menu keys may forward outside', 'ivr.domesticOnly': 'Menu forwarding: own country only' },
    anchors: { countries: 'calling-countries', callerId: 'calling-cid', transfer: 'calling-transfer', outboundTransfer: 'calling-outbound-transfer', ivr: 'calling-ivr' },
    normalize: CRX.pruneWhen([{ on: function (x) { return x.countries.restrict; }, drop: ['countries.list'] }, { on: function (x) { return x.transfer.external; }, drop: ['transfer.international'] }, { on: function (x) { return x.ivr.forward; }, drop: ['ivr.domesticOnly'] }]),
    defaults: function () {
      return { countries: { restrict: false, list: [] }, callerId: { useOffice: false, allowHide: false }, transfer: { external: true, international: true }, outboundTransfer: { allow: true }, ivr: { forward: true, domesticOnly: false } };
    },
    validate: function () { return {}; },
    risks: function (d, saved) {
      var out = [];
      if (d.countries.restrict && !d.countries.list.length) out.push({ title: 'Restriction with no countries', message: 'No list chosen means every country is still allowed.' });
      if (saved.ivr.forward && !d.ivr.forward) out.push({ title: 'Phone-menu forwarding turned off', message: 'Every menu key that forwards to an outside number is blocked, including menus that already exist.' });
      if (saved.transfer.external && !d.transfer.external) out.push({ title: 'Outside transfers turned off', message: 'Team members will no longer be able to hand live calls to outside numbers.' });
      return out;
    },
    render: function (ctx) {
      var both = h('span.badge.badge-cost', icon('dollar', 11), 'Billed for both legs');
      var scoreboard = ctx.dyn(function () {
        var c = ctx.get('countries'), t = ctx.get('transfer'), o = ctx.get('outboundTransfer'), i = ctx.get('ivr');
        function line(ok, good, bad) { return h('li.pos' + (ok ? '.good' : '.warn'), icon(ok ? 'check' : 'warn', 14), h('span', ok ? good : bad)); }
        return UI.Card({ title: 'Cost and fraud posture', desc: 'A quick read of the choices below.', children: h('ul.posture',
          line(c.restrict && c.list.length > 0, 'Calls limited to ' + U.plural(c.list.length, 'country', 'countries') + '.', 'Every country can be called.'),
          line(!t.external || !t.international, 'Transfers to other countries are blocked.', 'Live calls can be handed to numbers abroad.'),
          line(!o.allow, 'Outbound calls cannot be passed to outside numbers.', 'Outbound calls can be passed on — you pay for both legs.'),
          line(!i.forward || i.domesticOnly, i.forward ? 'Menus may forward only inside your own country.' : 'Menu keys cannot forward outside.', 'Menu keys may forward abroad — billed for both legs.')) });
      });

      var countries = UI.Section({ id: 'calling-countries', icon: 'globe', title: 'Calling other countries', badges: UI.StatusBadge('active'), desc: 'Enforced by the phone system itself.',
        children: UI.Card({ children: [
          ctx.dyn(function () { return !ctx.get('countries.restrict') ? UI.Banner({ tone: 'warn', compact: true, title: 'Every country is allowed until you pick a list', children: 'Calls can be made to any country. Nothing is restricted.' }) : null; }, function () { return [ctx.get('countries.restrict')]; }),
          ctx.toggleRow('countries.restrict', { title: 'Only allow calls to the countries chosen below', desc: 'Turn on and tick countries to restrict. No list chosen means every country is allowed.' }),
          ctx.dyn(function () {
            if (!ctx.get('countries.restrict')) return null;
            return [h('div.fld', h('label.fld-l', 'Allowed countries'), UI.CountrySelector({ value: ctx.get('countries.list'), onChange: function (v) { ctx.set('countries.list', v); } }),
              h('div.fld-h', 'Search and select the countries your team may call.')),
              ctx.dyn(function () { return !ctx.get('countries.list').length ? UI.Banner({ tone: 'warn', compact: true, title: 'No list chosen', children: 'Until you choose at least one country, every country is still allowed.' }) : null; }, function () { return [ctx.get('countries.list').length === 0]; })];
          }, function () { return [ctx.get('countries.restrict')]; })] }) });

      var cid = UI.Section({ id: 'calling-cid', icon: 'user', title: 'Outbound caller ID', badges: UI.StatusBadge('soon'), desc: 'People can currently choose only the numbers assigned to them.',
        children: UI.Card({ tone: 'soon', children: [
          ctx.toggleRow('callerId.useOffice', { title: 'Allow team members to use the office number or group numbers they belong to as caller ID', badges: UI.Pill('Not active yet', 'soon', 'clock'), desc: 'Would show the office or group number instead of their own.' }),
          ctx.toggleRow('callerId.allowHide', { title: 'Allow team members to hide their caller ID; calls appear as “unknown”', badges: UI.Pill('Not active yet', 'soon', 'clock'), desc: 'Your number still shows today. The person called would see no number.' })] }) });

      var transfer = UI.Section({ id: 'calling-transfer', icon: 'external', title: 'Transferring calls', badges: UI.StatusBadge('active'), desc: 'Handing a live call to a number outside the company.',
        children: [UI.Card({ id: 'calling-transfer-c', title: 'Transferring a call outside the company', badges: both, children: [
            ctx.toggleRow('transfer.external', { title: 'Allow team members to transfer calls outside of the company', desc: 'Hands a live call to any outside number. Off stops transfers to outside numbers.' }),
            ctx.dyn(function () { return ctx.get('transfer.external') ? h('div.indent', ctx.toggleRow('transfer.international', { title: 'Allow transfers to international numbers', desc: 'Also allows numbers abroad. Off stops transfers to other countries.' })) : null; }, function () { return [ctx.get('transfer.external')]; })] }),
          UI.Card({ id: 'calling-outbound-transfer', title: 'Transferring a call your team made', badges: both, children:
            ctx.toggleRow('outboundTransfer.allow', { title: 'Allow transferring an outbound call to an external number', desc: 'Lets people pass on a call they placed themselves. You pay for both legs — leave off unless needed.' }) })] });

      var ivr = UI.Section({ id: 'calling-ivr', icon: 'list', title: 'Sending a caller out of a phone menu', badges: UI.StatusBadge('active'), desc: 'Forwarding from IVR menus to outside numbers.',
        children: UI.Card({ children: [
          ctx.toggleRow('ivr.forward', { title: 'Let a menu key forward to an outside number', badges: both, desc: 'You are billed for both legs. Off blocks every menu key that forwards outside — existing menus included.' }),
          ctx.dyn(function () { return ctx.get('ivr.forward') ? h('div.indent', ctx.toggleRow('ivr.domesticOnly', { title: 'Only to numbers in your own country', desc: 'On keeps a menu from dialling abroad.' })) : UI.Banner({ tone: 'warn', compact: true, title: 'All menu forwarding is blocked', children: 'Every menu key that forwards to an outside number stops working, including menus that already exist.' }); }, function () { return [ctx.get('ivr.forward')]; })] }) });

      return h('div.stack', UI.Banner({ tone: 'info', compact: true, title: 'Why this tab matters', children: 'A transfer or menu forward to an outside number uses two call legs and you are billed for both. These settings are your main protection against expensive or fraudulent calls abroad.' }),
        scoreboard, countries, cid, transfer, ivr, UI.LiveImpact('Country, transfer and menu rules are enforced by the switch and reach it within about a minute.'));
    }
  });
})(window);
