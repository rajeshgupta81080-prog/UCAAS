/* Teams view: one card per team with its members; "View members" jumps to People filtered by that team. */
(function (g) {
  'use strict';
  var D = g.DIR_DATA;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function initials(n) { return n.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase(); }

  g.DirTeams = {
    render: function (el) {
      el.innerHTML = D.teams.map(function (t) {
        var members = D.people.filter(function (p) { return p.team === t.id; });
        var shown = members.slice(0, 5).map(function (p) { return '<span class="av" style="background:' + p.color + '" title="' + esc(p.name) + '">' + esc(initials(p.name)) + '</span>'; }).join('');
        var more = members.length > 5 ? '<span class="av more">+' + (members.length - 5) + '</span>' : '';
        return '<article class="card team"><h3>' + esc(t.id) + '</h3><div class="lead">Lead: ' + esc(t.lead) + '</div><p class="muted" style="margin:0 0 12px">' + esc(t.about) + '</p>' +
          '<div class="stack">' + shown + more + '</div><div class="meta"><span>' + members.length + ' members · queue ' + esc(t.queue) + '</span><button type="button" data-team="' + esc(t.id) + '">View members</button></div></article>';
      }).join('');
    }
  };
})(window);
