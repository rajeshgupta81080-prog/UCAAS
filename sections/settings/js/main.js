/* Entry point: all tabs and components are registered by now. */
(function () {
  'use strict';
  function start() { window.CRX.boot(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
