/* Shell role -> what the Dashboard shows. Agents get the personal view; everyone else sees team-wide cards too. */
(function (g) {
  'use strict';
  var NAMES = { admin: 'Admin', location_admin: 'Location Admin', manager: 'Manager / Supervisor', agent: 'Agent' };
  g.UCAAS_onRole = function (r) {
    document.documentElement.setAttribute('data-role', r);
    var el = document.getElementById('roleTag');
    if (el) el.textContent = NAMES[r] || '';
  };
})(window);
