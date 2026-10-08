/* Small status toast in the corner of the shell. Sections can raise one through UCAAS_toast() in embed-bridge.js. */
(function (g) {
  'use strict';
  var U = g.UCAAS;
  U.toast = function (text) {
    var region = document.getElementById('toasts'), el = document.createElement('div');
    el.className = 'toast'; el.textContent = text;
    region.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
  };
})(window);
