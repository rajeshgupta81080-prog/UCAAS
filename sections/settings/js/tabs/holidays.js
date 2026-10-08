/* Tab 5 - Holidays. */
(function (g) {
  'use strict';
  var CRX = g.CRX, UI = CRX.ui, U = CRX.util;

  CRX.registerTab({
    id: 'holidays', title: 'Holidays', short: 'Holidays', icon: 'calendar',
    desc: 'Days your company is closed. On a holiday the company is treated as closed, so calls follow the closed-hours behaviour.',
    products: ['switch'],
    settings: [{ id: 'holidays', label: 'Company holidays', keywords: 'public holidays closed days add country year copy lines' }],
    labels: { items: 'Company holidays', copiedTo: 'Holidays copied to lines', ownVoicemail: 'Use own voicemail when no closed-hours action', country: 'Holiday country' },
    anchors: { items: 'holidays', copiedTo: 'holidays', ownVoicemail: 'holidays', country: 'holidays' },
    defaults: function () { return { country: 'IN', items: [], copiedTo: [], ownVoicemail: false }; },
    validate: function (d) {
      var e = {}, seen = {};
      d.items.forEach(function (x) {
        var from = x.from || x.date, to = x.to || from, k = x.name.trim().toLowerCase() + '|' + from;
        if (!x.name.trim()) e.items = 'Every holiday needs a name.';
        else if (seen[k]) e.items = 'Two holidays are both called “' + x.name + '” on ' + from + '.';
        else if (to < from) e.items = '“' + x.name + '” ends before it starts.';
        else if (UI.holidayHoursError(x)) e.items = '“' + x.name + '”: ' + UI.holidayHoursError(x);
        seen[k] = 1;
      });
      return e;
    },
    // Rebuild only when the saved snapshot changes (after Save) so the Status column refreshes without disturbing typing.
    render: function (ctx) {
      return ctx.dyn(function () { return UI.HolidayManager(ctx); }, function () { return [ctx.saved().items, ctx.saved().copiedTo]; });
    }
  });
})(window);
