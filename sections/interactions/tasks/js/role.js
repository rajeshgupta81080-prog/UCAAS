/* Shell role -> Tasks role: supervisors (admin, location admin, manager) see the whole team's work, agents only their own. */
(function (g) {
  'use strict';
  g.UCAAS_onRole = function (r) {
    var to = r === 'agent' ? 'agent' : 'supervisor';
    if (AppState.role === to) return;
    AppState.role = to; save(); render();
  };
})(window);
