/* Interactions host. The Meetings app is always loaded: its left rail is the Interactions menu.
   Choosing "Phone" or "Tasks" on the rail opens that page over the Meetings content, next to the rail; choosing "Video" closes it.
   Route: #/dialer or #/video. The dialer loads the first time it is opened and then stays alive, so an active call survives a switch. */
(function (g) {
  'use strict';
  var video = document.getElementById('pane-video');
  var panes = ['dialer', 'tasks'].reduce(function (o, k) { o[k] = document.getElementById('pane-' + k); return o; }, {});
  var current = null;

  function pageFromHash() {
    var id = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    return g.IX_PAGES[id] ? id : g.IX_DEFAULT;
  }

  function railMsg() { video.contentWindow.postMessage({ ucaas: 'rail', active: g.IX_RAIL[current] }, '*'); }

  function show(id) {
    if (id === current) return;
    current = id;
    Object.keys(panes).forEach(function (k) {
      var f = panes[k];
      if (k === id && !f.getAttribute('src')) f.setAttribute('src', g.IX_PAGES[k]);
      f.hidden = k !== id;
    });
    railMsg();
  }
  function go(id) { if (location.hash !== '#/' + id) location.hash = '#/' + id; else show(id); }

  /* the Meetings app reports where its rail ends; the dialer sits right after it (below it on narrow screens, where the rail becomes a row) */
  g.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.ucaas !== 'rail-box' || e.source !== video.contentWindow) return;
    Object.keys(panes).forEach(function (k) {
      panes[k].style.setProperty('--l', m.stacked ? '0px' : Math.round(m.right) + 'px');
      panes[k].style.setProperty('--t', m.stacked ? Math.round(m.bottom) + 'px' : '0px');
    });
  });
  video.addEventListener('load', railMsg);

  window.addEventListener('hashchange', function () { show(pageFromHash()); });

  /* rail clicks arrive as UCAAS_goto('interactions/<page>') from the Meetings app; handle them here */
  g.UCAAS_interceptGoto = function (target) {
    var m = /^interactions\/(\w+)$/.exec(target || '');
    if (!m || !g.IX_PAGES[m[1]]) return false;
    go(m[1]);
    return true;
  };
  g.UCAAS_onNavigate = function (rest) { go(g.IX_PAGES[rest.split('/')[0]] ? rest.split('/')[0] : g.IX_DEFAULT); };

  if (!location.hash) { try { history.replaceState(null, '', '#/' + g.IX_DEFAULT); } catch (e) { /* ignore */ } }
  show(pageFromHash());
})(window);
