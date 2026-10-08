/* Tab 11 - Campaign timers: defaults for new campaigns / company-wide / guard rails. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util;
  var WRAP = [{ value: 'optional', label: 'Optional — the agent may skip it (no skip action yet; behaves as the timer)' }, { value: 'required-wait', label: 'Required — no time limit' },
    { value: 'required-move', label: 'Required, then moves on when time runs out' }, { value: 'required-forced', label: 'Required, and forced closed when time runs out — behaves the same as above' },
    { value: 'on-request', label: 'Only when the agent asks for it — not in effect, gives no wrap-up' }];

  function num(label, path, ctx, o) {
    return ctx.fieldText(path, { label: label, hint: o.hint, required: o.required, input: Object.assign({ type: 'number', number: true, inputmode: 'numeric' }, o.input) });
  }

  CRX.registerTab({
    id: 'campaign-timers', title: 'Campaign timers', short: 'Campaigns', icon: 'clock',
    desc: 'Defaults every new campaign starts with, a company-wide lead check, and guard rails every campaign is held to.',
    products: ['campaigns'],
    settings: [{ id: 'camp-defaults', label: 'Defaults for new campaigns', keywords: 'preview time wrap-up wait after call' }, { id: 'camp-company', label: 'Check for leads every (seconds)', keywords: 'polling lead interval company-wide' },
      { id: 'camp-limits', label: 'Campaign limits', keywords: 'line ceiling lines all campaigns calls to one person per day per week guard rails' }],
    labels: { 'defaults.previewSeconds': 'Preview time (seconds)', 'defaults.wrapSeconds': 'Wrap-up time (seconds)', 'defaults.wrapRule': 'Wrap-up rule', 'defaults.waitSeconds': 'Wait after a call (seconds)',
      'company.leadPollSeconds': 'Check for leads every (seconds)', 'limits.lineCeiling': 'Line ceiling per campaign', 'limits.totalLines': 'Lines for all campaigns together',
      'limits.person.enabled': 'Limit calls to one person', 'limits.person.perDay': 'Calls to one person per day', 'limits.person.perWeek': 'Calls to one person per week' },
    formats: { 'defaults.wrapRule': function (v) { var w = WRAP.filter(function (x) { return x.value === v; })[0]; return w ? w.label : v; } },
    anchors: { defaults: 'camp-defaults', company: 'camp-company', limits: 'camp-limits' },
    normalize: CRX.pruneWhen([{ on: function (x) { return x.limits.person.enabled; }, drop: ['limits.person.perDay', 'limits.person.perWeek'] }]),
    defaults: function () {
      return { defaults: { previewSeconds: 30, wrapSeconds: 30, wrapRule: 'required-move', waitSeconds: 0 }, company: { leadPollSeconds: 15 },
        limits: { lineCeiling: 200, totalLines: '', person: { enabled: false, perDay: 3, perWeek: 10 } } };
    },
    validate: function (d) {
      var e = {};
      if (!U.isInt(d.defaults.previewSeconds, 10, 300)) e['defaults.previewSeconds'] = 'Preview time must be 10 to 300 seconds.';
      if (!U.isInt(d.defaults.wrapSeconds, 10, 1200)) e['defaults.wrapSeconds'] = 'Wrap-up time must be 10 to 1200 seconds.';
      if (!U.isInt(d.defaults.waitSeconds, 0, 60)) e['defaults.waitSeconds'] = 'Wait after a call must be 0 to 60 seconds.';
      if (!U.isInt(d.company.leadPollSeconds, 5, 120)) e['company.leadPollSeconds'] = 'Lead check interval must be 5 to 120 seconds.';
      if (d.limits.lineCeiling !== '' && !U.isInt(d.limits.lineCeiling, 1, 500)) e['limits.lineCeiling'] = 'Line ceiling must be 1 to 500 lines (or empty for the platform default of 200).';
      if (d.limits.totalLines !== '' && !U.isInt(d.limits.totalLines, 1, 500)) e['limits.totalLines'] = 'Total lines must be 1 to 500 (or empty for no limit).';
      var p = d.limits.person;
      if (p.enabled) {
        if (!U.isInt(p.perDay, 1, 50)) e['limits.person.perDay'] = 'Calls per day must be 1 to 50.';
        if (!U.isInt(p.perWeek, 1, 200)) e['limits.person.perWeek'] = 'Calls per week must be 1 to 200.';
        else if (U.isInt(p.perDay, 1, 50) && p.perWeek < p.perDay) e['limits.person.perWeek'] = 'The weekly limit cannot be lower than the daily limit.';
      }
      return e;
    },
    risks: function (d) {
      var out = [];
      if (d.limits.totalLines === '') out.push({ title: 'No limit across all campaigns', message: 'Several busy campaigns could take every line and leave callers to your own numbers hearing engaged.' });
      if (!d.limits.person.enabled) out.push({ title: 'No cap on calls to one person', message: 'A person on four lists could be called by all four. This is an important compliance point.' });
      return out;
    },
    render: function (ctx) {
      var totalWarn = ctx.dyn(function () {
        var t = ctx.get('limits.totalLines'), c = ctx.get('limits.lineCeiling');
        return t !== '' && c !== '' && Number(t) < Number(c) ? UI.Banner({ tone: 'warn', compact: true, title: 'Total is below one campaign’s ceiling', children: 'A single campaign can never reach its ceiling of ' + c + ' lines because all campaigns together are capped at ' + t + '.' }) : null;
      }, function () { return [ctx.get('limits.totalLines'), ctx.get('limits.lineCeiling')]; });
      var glance = ctx.dyn(function () {
        var d = ctx.d, p = d.limits.person;
        return UI.Glance([
          { icon: 'sliders', label: 'New campaign defaults', value: d.defaults.previewSeconds + 's preview · ' + d.defaults.wrapSeconds + 's wrap-up', sub: d.defaults.waitSeconds + 's wait between calls', tone: 'neutral' },
          { icon: 'phone', label: 'Line ceiling', value: (d.limits.lineCeiling === '' ? 200 : d.limits.lineCeiling) + ' lines', sub: d.limits.totalLines === '' ? 'No limit across campaigns' : d.limits.totalLines + ' lines across all campaigns', tone: d.limits.totalLines === '' ? 'warn' : 'ok' },
          { icon: 'users', label: 'Calls to one person', value: p.enabled ? p.perDay + '/day · ' + p.perWeek + '/week' : 'No cap', sub: 'Across all campaigns', tone: p.enabled ? 'ok' : 'warn' },
          { icon: 'refresh', label: 'Lead check', value: 'Every ' + d.company.leadPollSeconds + 's', sub: 'Company-wide', tone: 'neutral' }]);
      });
      return h('div.stack', glance,
        UI.Section({ id: 'camp-defaults', icon: 'sliders', title: 'Defaults for new campaigns', badges: UI.StatusBadge('active'),
          desc: 'Existing campaigns are unchanged. These apply when a campaign is created.', children: UI.Card({ children: [
            UI.Banner({ tone: 'info', compact: true, title: 'New campaigns only', children: 'Changing these defaults does not touch campaigns that already exist. Company-wide limits below always cap a campaign afterwards.' }),
            h('div.grid2', num('Preview time (seconds)', 'defaults.previewSeconds', ctx, { required: true, hint: '10 to 300. How long an agent may look at a lead before the call is placed.', input: { min: 10, max: 300 } }),
              num('Wrap-up time (seconds)', 'defaults.wrapSeconds', ctx, { required: true, hint: '10 to 1200. Time after a call for notes.', input: { min: 10, max: 1200 } })),
            h('div.grid2', ctx.fieldSelect('defaults.wrapRule', WRAP, { label: 'Wrap-up rule', hint: 'Whether wrap-up is required, and what happens when time ends.' }),
              num('Wait after a call (seconds)', 'defaults.waitSeconds', ctx, { required: true, hint: '0 to 60. Pause before the next call.', input: { min: 0, max: 60 } }))] }) }),
        UI.Section({ id: 'camp-company', icon: 'globe', title: 'Company-wide', badges: UI.StatusBadge('active'), desc: 'Campaigns cannot change this.', children: UI.Card({ children:
          h('div.grid2', num('Check for leads every (seconds)', 'company.leadPollSeconds', ctx, { required: true, hint: '5 to 120. How often the system looks for new leads to call.', input: { min: 5, max: 120 } })) }) }),
        UI.Section({ id: 'camp-limits', icon: 'shield', title: 'Campaign limits', badges: UI.StatusBadge('active'), desc: 'Guard rails every campaign is held to, whatever its own settings say.', children: [
          UI.LiveImpact('A change reaches campaigns that are already running within about a minute.'),
          UI.Card({ title: 'Lines', children: [
            h('div.grid2', num('Line ceiling per campaign', 'limits.lineCeiling', ctx, { hint: '1 to 500. Empty uses the platform default of 200. A campaign asking for more is cut down to this.', input: { min: 1, max: 500, placeholder: '200', suffix: 'lines' } }),
              num('Lines for all campaigns together', 'limits.totalLines', ctx, { hint: '1 to 500. Empty = no limit. Campaign calls are not counted against your incoming-call allowance, so busy campaigns could take every line.', input: { min: 1, max: 500, placeholder: 'Off', suffix: 'lines' } })), totalWarn,
            h('p.mut', 'When the limit is reached a campaign simply places no new call and its board says why; nobody already talking is cut off.')] }),
          UI.Card({ title: 'Calls to one person, across all campaigns', desc: 'Each campaign counts its own attempts, so a person on four lists could be called by all four. This caps the total, judged at the called person’s own clock.', children: [
            ctx.toggleRow('limits.person.enabled', { title: 'Limit calls to one person', desc: 'Currently ' + (ctx.get('limits.person.enabled') ? 'on' : 'off') + '.' }),
            ctx.dyn(function () { return ctx.get('limits.person.enabled') ? h('div.indent.grid2', num('Daily limit', 'limits.person.perDay', ctx, { hint: '1 to 50 calls per day', input: { min: 1, max: 50, suffix: 'per day' } }), num('Weekly limit', 'limits.person.perWeek', ctx, { hint: '1 to 200 calls per week', input: { min: 1, max: 200, suffix: 'per week' } })) : null; }, function () { return [ctx.get('limits.person.enabled')]; })] })] }));
    }
  });
})(window);
