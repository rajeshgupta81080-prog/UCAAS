/* Shell entry point: every module has registered itself on window.UCAAS by now. */
(function () {
  'use strict';
  var U = window.UCAAS;
  function start() {
    U.bus.init();
    U.theme.init();
    U.clock.init();
    U.notify.init();
    U.roles.init();
    U.duty.init();
    U.search.init();
    U.policies.init();
    U.router.init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
