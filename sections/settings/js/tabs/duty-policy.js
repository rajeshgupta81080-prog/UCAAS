/* Tab 10 - Duty policy: who may set an agent's duty; sign out an idle agent. Role-based cards. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, S = CRX.store;

  function role(title, ic, desc, children) {
    return h('div.role', h('div.role-h', h('span.role-i', icon(ic, 18)), h('div', h('h3', title), h('p', desc))), h('div.role-b', children));
  }

  CRX.registerTab({
    id: 'duty-policy', title: 'Duty policy', short: 'Duty', icon: 'user',
    desc: 'Who may set an agent’s duty — on duty (ready for queue calls) or off duty.',
    products: ['queues'],
    settings: [{ id: 'duty-agents', label: 'Agents may change their own duty', keywords: 'on duty off duty agent' }, { id: 'duty-supervisors', label: 'Supervisors may change an agent’s duty', keywords: 'supervisor' }, { id: 'duty-signout', label: 'Sign out an idle agent', keywords: 'browser gone idle sign out' }],
    labels: { agentsOwn: 'Agents may change their own duty', supervisors: 'Supervisors may change an agent’s duty', signOutIdle: 'Sign out after the browser has been gone', signOutMinutes: 'Minutes before an idle agent is signed out' },
    anchors: { agentsOwn: 'duty-agents', supervisors: 'duty-supervisors', signOutIdle: 'duty-signout', signOutMinutes: 'duty-signout' },
    normalize: CRX.pruneWhen([{ on: function (x) { return x.signOutIdle; }, drop: ['signOutMinutes'] }]),
    defaults: function () { return { agentsOwn: true, supervisors: false, signOutIdle: false, signOutMinutes: 15 }; },
    validate: function (d) { var e = {}; if (d.signOutIdle && !U.isInt(d.signOutMinutes, 1, 1440)) e.signOutMinutes = 'Enter a whole number of minutes from 1 to 1440.'; return e; },
    risks: function (d) { return !d.agentsOwn && !d.supervisors ? [{ title: 'Nobody can change an agent’s duty', message: 'Neither agents nor supervisors may set duty, so agents cannot go on or off duty at all.' }] : []; },
    render: function (ctx) {
      var matrix = ctx.dyn(function () {
        var a = ctx.get('agentsOwn'), s = ctx.get('supervisors');
        function cell(ok) { return ok ? UI.Pill('Yes', 'ok', 'check') : UI.Pill('No', 'neutral', 'x'); }
        return UI.Card({ title: 'Who can set duty today', desc: 'Summary of the choices below.', children: h('div.table-lite', h('table.tl', h('thead', h('tr', h('th', 'Role'), h('th', 'Own duty'), h('th', 'An agent’s duty'))),
          h('tbody', h('tr', h('th', { scope: 'row' }, 'Agent'), h('td', cell(a)), h('td', cell(false))), h('tr', h('th', { scope: 'row' }, 'Supervisor'), h('td', cell(true)), h('td', cell(s))), h('tr', h('th', { scope: 'row' }, 'Admin'), h('td', cell(true)), h('td', cell(true)))))) });
      });
      var grace = ctx.dyn(function () { var gsec = S.get('break-reasons').lostSeconds; return h('div.srow-n', icon('info', 13), 'Uses the lost-connection grace period (' + (gsec === '' ? 60 : gsec) + ' seconds) set under Break reasons.'); });
      return h('div.stack', matrix,
        UI.Section({ id: 'duty-agents', icon: 'user', title: 'Who sets an agent’s duty', badges: UI.StatusBadge('active'), children: h('div.roles',
          role('Agents', 'user', 'If agents set their own duty, they control when they receive queue calls.', ctx.toggleRow('agentsOwn', { title: 'Agents may change their own duty', desc: 'Agents switch between on duty and off duty themselves.' })),
          role('Supervisors', 'users', 'Lets supervisors put agents on or off duty during busy or quiet times.', ctx.toggleRow('supervisors', { id: 'duty-supervisors', title: 'Supervisors may change an agent’s duty', desc: 'A supervisor can set duty on behalf of an agent.' }))) }),
        UI.Section({ id: 'duty-signout', icon: 'lock', title: 'Sign out an idle agent', badges: UI.StatusBadge('active'), children: UI.Card({ children: [
          ctx.toggleRow('signOutIdle', { title: 'Sign out after the browser has been gone', desc: 'Stops queues from sending calls to someone who has walked away.', extra: grace }),
          ctx.dyn(function () {
            return ctx.get('signOutIdle') ? h('div.indent', ctx.fieldText('signOutMinutes', { label: 'Minutes', required: true, hint: 'Whole minutes, 1 to 1440. How long the browser can be gone before the agent is signed out.', input: { type: 'number', min: 1, max: 1440, number: true, inputmode: 'numeric', suffix: 'minutes' } })) : null;
          }, function () { return [ctx.get('signOutIdle')]; }),
          UI.LiveImpact('Queues stop offering calls to a signed-out agent within about a minute.')] }) }));
    }
  });
})(window);
