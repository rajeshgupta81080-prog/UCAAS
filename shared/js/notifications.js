/* Bell drop-down in the top bar. Unread state lives in memory for the session. */
(function (g) {
  'use strict';
  var U = g.UCAAS, esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var repaint = function () {};
  var seq = 0;

  U.notify = {
    /** add a live notification (newest first) */
    add: function (n) { n.id = n.id || 'live' + (++seq); U.notifications.unshift(n); repaint(); },
    init: function () {
      var btn = document.getElementById('bellBtn'), panel = document.getElementById('notifPanel'), badge = document.getElementById('bellBadge');
      var read = {};

      function unread() { return U.notifications.filter(function (n) { return !read[n.id]; }).length; }
      function paint() {
        var n = unread();
        badge.textContent = n; badge.hidden = !n;
        btn.setAttribute('aria-label', 'Notifications, ' + n + ' unread');
        panel.innerHTML = '<h6>Notifications <button type="button" data-all>Mark all read</button></h6>' +
          (U.notifications.map(function (x) {
            return '<button type="button" class="note' + (read[x.id] ? ' read' : '') + '" data-id="' + x.id + '"><i class="dot"></i><div><b>' + esc(x.title) + '</b><span>' + esc(x.body) + '</span></div></button>';
          }).join('') || '<div class="empty">You are all caught up.</div>');
      }
      repaint = paint;
      function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        panel.hidden = !panel.hidden; btn.setAttribute('aria-expanded', String(!panel.hidden));
      });
      panel.addEventListener('click', function (e) {
        if (e.target.closest('[data-all]')) { U.notifications.forEach(function (n) { read[n.id] = true; }); paint(); return; }
        var item = e.target.closest('[data-id]');
        if (!item) return;
        var n = U.notifications.filter(function (x) { return x.id === item.getAttribute('data-id'); })[0];
        read[n.id] = true; paint(); close();
        U.router.go(n.target);
      });
      document.addEventListener('click', function (e) { if (!e.target.closest('.notif-wrap')) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
      paint();
    }
  };
})(window);
