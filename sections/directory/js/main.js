/* Directory entry + tiny router.  #/people  #/people/<team>  #/teams */
(function (g) {
  'use strict';
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [data-view]'));
  var $ = function (s) { return document.querySelector(s); };

  function parse() {
    var seg = (location.hash || '').replace(/^#\/?/, '').split('/');
    return { view: seg[0] === 'teams' ? 'teams' : 'people', team: decodeURIComponent(seg[1] || '') };
  }

  function show() {
    var r = parse();
    tabs.forEach(function (t) { var on = t.dataset.view === r.view; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $('#view-people').hidden = r.view !== 'people';
    $('#view-teams').hidden = r.view !== 'teams';
    if (r.view === 'people') { g.DirPeople.setTeam(r.team); g.DirPeople.render(); }
    else { g.DirTeams.render($('#teamCards')); $('#count').textContent = g.DIR_DATA.teams.length + ' teams'; }
  }

  tabs.forEach(function (t) { t.addEventListener('click', function () { location.hash = '#/' + t.dataset.view; }); });
  $('#teamCards').addEventListener('click', function (e) {
    var b = e.target.closest('[data-team]'); if (b) location.hash = '#/people/' + encodeURIComponent(b.dataset.team);
  });
  g.addEventListener('hashchange', show);

  g.DirPeople.init();
  if (!location.hash) { try { history.replaceState(null, '', '#/people'); } catch (e) { /* ignore */ } }
  show();
})(window);
