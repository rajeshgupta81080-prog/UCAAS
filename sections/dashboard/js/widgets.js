/* Dashboard widgets: each one turns DB_DATA into markup. Plain functions, so main.js can re-run them on every tick. */
(function (g) {
  'use strict';
  var D = g.DB_DATA, C = g.DBCharts, esc = C.esc;

  function fmt(v, kind) {
    if (kind === 'pct') return v.toFixed(1) + '%';
    if (kind === 'sec') return Math.floor(v / 60) + ':' + ('0' + Math.round(v % 60)).slice(-2);
    return Math.round(v).toLocaleString();
  }

  function kpis(el) {
    el.innerHTML = D.kpis.map(function (k) {
      var good = k.goodWhenDown ? k.delta < 0 : k.delta > 0;
      var cls = k.delta === 0 ? 'flat' : good ? 'up' : 'down', arrow = k.delta === 0 ? '–' : k.delta > 0 ? '▲' : '▼';
      return '<div class="kpi" data-kpi="' + k.id + '"><div class="l">' + esc(k.label) + '</div><div class="v">' + fmt(k.value, k.fmt) + '</div>' +
        (k.note ? '<div class="d flat"><span class="muted" style="font-weight:400">' + esc(k.note) + '</span></div>'
          : '<div class="d ' + cls + '">' + arrow + ' ' + Math.abs(k.delta).toFixed(1) + '% <span class="muted" style="font-weight:400">vs yesterday</span></div>') +
        (k.spark ? C.spark(k.spark, cls === 'down' ? 'var(--danger)' : 'var(--primary)') : '') + '</div>';
    }).join('');
  }

  function volume(el, range) { el.innerHTML = C.bars(range === 'week' ? D.days : D.hours); }

  function agents(el) {
    el.innerHTML = C.donut(D.agents, 'agents') + '<ul>' + D.agents.map(function (a) {
      return '<li><i style="background:' + a.color + '"></i>' + esc(a.label) + '<b>' + a.n + '</b></li>';
    }).join('') + '</ul>';
  }

  function queues(tbody) {
    tbody.innerHTML = D.queues.map(function (q) {
      var lim = g.DBLimits || { wait: 120, sl: 80 }, c = q.sl >= 90 ? 'var(--ok)' : q.sl >= lim.sl ? '#f59e0b' : 'var(--danger)';
      return '<tr><td><b>' + esc(q.name) + '</b></td><td class="r">' + q.waiting + '</td><td class="r' + (q.longest > (g.DBLimits || { wait: 120 }).wait ? ' warn' : '') + '">' + (q.longest ? fmt(q.longest, 'sec') : '–') + '</td><td class="r">' + q.agents +
        '</td><td><div class="sl"><div class="bar"><i style="width:' + q.sl + '%;background:' + c + '"></i></div><span>' + q.sl + '%</span></div></td></tr>';
    }).join('');
  }

  function feed(ul, log) {
    var live = (log || []).slice(0, 6).map(function (l) { return { ic: l.text.charAt(0), text: l.text, sub: 'Just now · ' + new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), go: l.target || 'interactions/tasks' }; });
    ul.innerHTML = live.concat(D.feed).slice(0, 8).map(function (f) {
      return '<li><div class="ic">' + esc(f.ic) + '</div><div class="tx"><a class="link" href="#" data-go="' + esc(f.go) + '">' + esc(f.text) + '</a><small>' + esc(f.sub) + '</small></div></li>';
    }).join('');
  }

  function quick(el) {
    el.innerHTML = [
      ['Start a call', 'interactions/dialer', true], ['Start a meeting', 'interactions/video'],
      ['Live analytics', 'analytics/live'], ['Find a person', 'directory/people']
    ].map(function (b) { return '<button type="button" class="btn' + (b[2] ? ' primary' : '') + '" data-go="' + b[1] + '">' + b[0] + '</button>'; }).join('');
  }

  g.DBWidgets = { kpis: kpis, esc: esc, volume: volume, agents: agents, queues: queues, feed: feed, quick: quick, fmt: fmt };
})(window);
