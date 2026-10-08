/* Dashboard entry: draw the widgets once, then let the live numbers drift every few seconds. */
(function (g) {
  'use strict';
  var D = g.DB_DATA, W = g.DBWidgets, $ = function (s) { return document.querySelector(s); };

  /* inside UCAAS this asks the shell to navigate; opened alone it falls back to the root index.html */
  function go(target) {
    if (g.UCAAS_goto) g.UCAAS_goto(target); else g.location.href = '../../index.html#/' + target;
  }

  function draw() {
    var h = new Date().getHours();
    $('#greeting').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', ' + D.user.first;
    $('#today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    W.quick($('#quick')); W.kpis($('#kpis')); W.volume($('#volume'), 'today');
    W.agents($('#agents')); W.queues($('#queues tbody')); W.feed($('#feed'));
  }

  function tick() {
    D.kpis[0].value += Math.round(Math.random() * 3);
    D.queues.forEach(function (q) {
      q.waiting = Math.max(0, q.waiting + (Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : 1) : 0));
      q.longest = q.waiting ? Math.max(8, q.longest + Math.round((Math.random() - 0.4) * 20)) : 0;
    });
    W.kpis($('#kpis')); W.queues($('#queues tbody'));
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-go]');
    if (t) { e.preventDefault(); go(t.getAttribute('data-go')); return; }
    var r = e.target.closest('[data-range]');
    if (r) {
      Array.prototype.forEach.call(document.querySelectorAll('#rangeSeg button'), function (b) { b.classList.toggle('on', b === r); });
      W.volume($('#volume'), r.getAttribute('data-range'));
    }
  });

  draw();
  setInterval(tick, 4000);
})(window);
