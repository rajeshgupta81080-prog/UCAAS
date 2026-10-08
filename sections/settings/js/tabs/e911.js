/* Tab 4 - Emergency address (E911). Safety-sensitive: stored record only, never routes emergency calls. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, D = CRX.data;

  function empty(d) { return !(d.line1 || d.line2 || d.country || d.city || d.postal || d.callback); }

  CRX.registerTab({
    id: 'emergency-address', title: 'Emergency address (E911)', short: 'E911', icon: 'mapPin',
    desc: 'The street address and callback number kept on record for emergency responders.',
    products: ['switch'],
    settings: [{ id: 'e911-address', label: 'Emergency address (E911)', keywords: 'street city postal callback number 911 999 responders safety' }],
    labels: { line1: 'Street address', line2: 'Suite / floor / building', country: 'Country', city: 'City', postal: 'Postal code', callback: 'Emergency callback number', ack: 'Acknowledged: address does not route emergency calls' },
    anchors: { line1: 'e911-address', line2: 'e911-address', country: 'e911-address', city: 'e911-address', postal: 'e911-address', callback: 'e911-address', ack: 'e911-address' },
    defaults: function () { return { line1: '', line2: '', country: '', city: '', postal: '', callback: '', ack: false, savedOn: null }; },
    validate: function (d) {
      var e = {};
      if (empty(d) && !d.ack) return e;
      if (!d.line1.trim()) e.line1 = 'Enter the street address.';
      if (!d.country) e.country = 'Select a country.';
      if (!d.city.trim()) e.city = 'Enter the city.';
      if (!d.postal.trim()) e.postal = 'Enter the postal code.';
      else if (!/^[A-Za-z0-9][A-Za-z0-9 \-]{2,9}$/.test(d.postal.trim())) e.postal = 'Enter a valid postal code (3–10 letters, digits, spaces or hyphens).';
      if (!d.callback.trim()) e.callback = 'Enter a callback number in international format.';
      else if (!/^\+[1-9]\d{6,14}$/.test(d.callback.replace(/[\s\-()]/g, ''))) e.callback = 'Use international format, for example +14155550123.';
      if (!d.ack) e.ack = 'Tick the box to confirm you understand before saving.';
      return e;
    },
    render: function (ctx) {
      var summary = ctx.dyn(function () {
        var s = ctx.saved(), c = D.country(s.country);
        var has = s.line1 && s.city;
        return UI.Card({ children: h('div.e9-head',
          h('div.e9-i', icon('mapPin', 18)),
          h('div', h('div.e9-t', 'Stored company emergency address'), has ? h('div.e9-a', [s.line1, s.line2, s.city + ' ' + s.postal, c ? c.name : ''].filter(Boolean).join(', '), h('br'), 'Callback ' + s.callback) : h('div.mut', 'Nothing saved yet')),
          has ? UI.Pill('On record', 'ok', 'check') : UI.Pill('Nothing saved yet', 'neutral')) });
      });
      return h('div.stack',
        UI.Banner({ tone: 'danger', title: 'Recorded only. 911 and 999 calls do not use this address.', children: ['Keep another phone available for emergencies, and make sure staff know. Storing an address here does ', h('b', 'not'), ' route or locate emergency calls.'] }),
        h('div.e9-compare', h('div.e9-c', h('b', icon('check', 14), 'What this stores'), h('p', 'The street address and callback number kept on record for your company.')),
          h('div.e9-c.no', h('b', icon('x', 14), 'What it does not do'), h('p', 'It does not route emergency calls, tell responders where a caller is, or replace a dedicated emergency phone.'))),
        summary,
        UI.Section({ id: 'e911-address', icon: 'mapPin', title: 'Emergency address', desc: 'Required to save once you start entering an address.',
          children: UI.Card({ children: [
            h('div.form',
              ctx.fieldText('line1', { label: 'Street address', required: true, input: { placeholder: '100 Market Street', maxlength: 120 } }),
              ctx.fieldText('line2', { label: 'Suite / floor / building (optional)', input: { placeholder: 'Suite 400, 4th floor', maxlength: 80 } }),
              ctx.fieldSelect('country', CRX.countryOptions('Select country…'), { label: 'Country', required: true }),
              h('div.grid2', ctx.fieldText('city', { label: 'City', required: true, input: { maxlength: 60 } }), ctx.fieldText('postal', { label: 'Postal code', required: true, input: { maxlength: 10 } })),
              ctx.fieldText('callback', { label: 'Emergency callback number', required: true, hint: 'International format.', input: { placeholder: '+14155550123', inputmode: 'tel', maxlength: 20 } })),
            ctx.field('ack', { control: function (id) {
              return h('label.ack', h('input.chk', { type: 'checkbox', id: id, checked: !!ctx.get('ack'), onChange: function (e) { ctx.set('ack', e.target.checked); } }),
                h('span', h('b', 'I understand this address does not route emergency calls.'), h('small', 'Required to save.')));
            } })] }) }));
    }
  });
})(window);
