/* Shell role -> Directory: agents can look people up but do not see the Teams view. */
(function (g) {
  'use strict';
  g.UCAAS_onRole = function (r) {
    document.documentElement.setAttribute('data-role', r);
    if (r === 'agent' && /^#\/?teams/.test(location.hash)) location.hash = '#/people';
  };
})(window);
