/* Link to the other sections: whatever is saved here is reported to the shell, which applies it everywhere
   (company time zone in the top bar, opening hours / holidays / recording in Dashboard, Calls, Tasks and Meetings, duty policy, ...). */
(function (g) {
  'use strict';
  var CRX = g.CRX, S = CRX.store;

  function titleOf(id) { var t = CRX.tabs.filter(function (x) { return x.id === id; })[0]; return t ? t.title : id; }
  function report(ids) {
    if (!g.UCAAS_emit) return;                                   // opened on its own, not inside UCAAS
    g.UCAAS_emit('settings', { settings: JSON.parse(JSON.stringify(S.saved)), tabs: (ids || []).map(titleOf) });
  }

  S.on('saved', report);                                          // after every successful save
  /* and once at start (after the app has booted), so the shell always has the current rules */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { report([]); }); else report([]);
})(window);
