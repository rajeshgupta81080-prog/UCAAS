/* Shell role -> the dialer's active agent: agent = Rahul (agent), manager = Priya (supervisor), admin / location admin = Sarah (manager). */
(function (g) {
  'use strict';
  var MAP = { admin: 'sarah', location_admin: 'sarah', manager: 'priya', agent: 'rahul-c' };
  g.UCAAS_onRole = function (r) {
    var id = MAP[r], a = AGENTS.find(function (x) { return x.id === id; });
    if (!a || PARK_AGENT.id === id) return;
    if (a.status === 'offline') a.status = 'online';      // the switch ignores offline agents
    switchActiveAgent(id); render();
  };
})(window);
