/* Light / dark theme for the shell. The choice is pushed into whichever section is on screen (see embed-bridge.js). */
(function (g) {
  'use strict';
  var U = g.UCAAS, KEY = 'ucaas-theme', root = document.documentElement;

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable */ } }

  U.theme = {
    current: function () { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; },
    set: function (t) {
      if (t === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      write(t);
      if (U.router) U.router.post({ ucaas: 'theme', theme: t });
    },
    toggle: function () { U.theme.set(U.theme.current() === 'dark' ? 'light' : 'dark'); },
    init: function () {
      var saved = read();
      if (!saved && g.matchMedia && g.matchMedia('(prefers-color-scheme: dark)').matches) saved = 'dark';
      if (saved === 'dark') root.setAttribute('data-theme', 'dark');
      document.getElementById('themeBtn').addEventListener('click', U.theme.toggle);
    }
  };
})(window);
