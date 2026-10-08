/* Shell role -> Analytics role (Admin, Supervisor, Coach, Agent, Read-only). */
(function (g) {
  'use strict';
  var MAP = { admin: 'Admin', location_admin: 'Supervisor', manager: 'Supervisor', agent: 'Agent' };
  g.UCAAS_onRole = function (r) {
    var to = MAP[r];
    if (!to || !g.MCM || !MCM.user || MCM.user.role === to) return;
    MCM.user.role = to; MCM.store.set('user', MCM.user);
    if (MCM.audit) MCM.audit('Role switched', to);
    MCM.refreshNav();
    g.dispatchEvent(new HashChangeEvent('hashchange'));   // re-run the router: pages this role may not see are left
  };
})(window);
