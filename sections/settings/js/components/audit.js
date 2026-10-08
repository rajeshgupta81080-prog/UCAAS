/* AuditTimeline + SecurityPolicyCard (small shared components). */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util;

  /** items: [{title, meta, tone:'ok'|'warn'|'danger'|'neutral', body}] */
  UI.AuditTimeline = function (items) {
    return h('ol.atl', items.map(function (it) {
      return h('li.atl-i.tone-' + (it.tone || 'neutral'), h('span.atl-dot', { 'aria-hidden': 'true' }),
        h('div.atl-t', it.title), it.meta ? h('div.atl-m', it.meta) : null, it.body ? h('div.atl-b', it.body) : null);
    }));
  };

  /** Highlights the rail link of the section being read.
      A fixed trigger line fails on short pages (middle sections can never reach it), so the line travels from just
      under the sticky header (page top) to the bottom of the viewport (page bottom): every section gets its turn.
      Returns {select(i)} so a clicked link stays highlighted even when the page is too short to scroll that far. */
  UI.scrollSpy = function (rail, nodes) {
    var pinned = null;
    function links() { return Array.prototype.slice.call(rail.querySelectorAll('a')); }
    function paint(cur) {
      links().forEach(function (a, i) { a.classList.toggle('on', i === cur); if (i === cur) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }
    function update() {
      if (!rail.isConnected) { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); return; }
      if (pinned) {
        if (pinned.settledY != null && Math.abs(window.scrollY - pinned.settledY) > 30) pinned = null;
        else { paint(pinned.i); return; }
      }
      var head = document.querySelector('.ws-head'), tabs = document.querySelector('.ws-tabs');
      var top = (head && getComputedStyle(head).position === 'sticky' ? head : tabs).getBoundingClientRect().bottom + 32;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      var line = top + p * Math.max(0, window.innerHeight - top - 24);
      var cur = 0;
      nodes.forEach(function (n, i) { if (n.getBoundingClientRect().top <= line) cur = i; });
      paint(cur);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    setTimeout(update, 0);
    return {
      select: function (i) {
        pinned = { i: i, settledY: null };
        paint(i);
        setTimeout(function () { if (pinned && pinned.i === i) pinned.settledY = window.scrollY; }, 900);
      }
    };
  };

  UI.deliveryPill = function (status) {
    var map = { Delivered: ['ok', 'ok'], Pending: ['info', 'clock'], Failed: ['danger', 'danger'], Unknown: ['neutral', 'info'] };
    var m = map[status] || ['neutral', 'info'];
    return UI.Pill(status, m[0], m[1]);
  };

  /** Titled card for a security control: status pill on the right, optional explanation. */
  UI.SecurityPolicyCard = function (o) {
    return h('div.spc' + (o.enabled ? '.on' : ''), { id: o.id, dataset: o.id ? { setting: o.id } : {} },
      h('div.spc-h', h('span.spc-i', icon(o.icon || 'shield', 16)),
        h('div.spc-t', h('h3', o.title, o.badges || null), o.desc ? h('p', o.desc) : null),
        o.status ? h('div.spc-s', o.status) : null),
      o.children ? h('div.spc-b', o.children) : null);
  };
})(window);
