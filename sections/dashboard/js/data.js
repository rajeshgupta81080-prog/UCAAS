/* Demo data for the Dashboard. Deterministic (seeded) so the page looks the same on every load; live numbers drift in main.js. */
(function (g) {
  'use strict';
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  var rnd = rng(20260);

  /* calls per hour, 00:00 - 23:00: quiet at night, two daytime peaks */
  var hours = [];
  for (var h = 0; h < 24; h++) {
    var load = Math.max(0.04, Math.exp(-Math.pow((h - 10.5) / 2.6, 2)) + 0.8 * Math.exp(-Math.pow((h - 15) / 2.4, 2)));
    var total = Math.round(20 + load * 130 + rnd() * 14);
    hours.push({ label: (h < 10 ? '0' : '') + h, answered: Math.round(total * (0.9 + rnd() * 0.07)), abandoned: Math.round(total * (0.02 + rnd() * 0.05)) });
  }
  var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d, i) {
    var base = i > 4 ? 380 : 1500 + Math.round(rnd() * 260);
    return { label: d, answered: Math.round(base * 0.94), abandoned: Math.round(base * (0.03 + rnd() * 0.03)) };
  });

  g.DB_DATA = {
    user: { first: 'Johnny' },
    hours: hours,
    days: days,
    kpis: [
      { id: 'calls', label: 'Calls today', value: 1284, fmt: 'int', delta: 8.2, spark: [40, 52, 49, 61, 70, 66, 78, 84, 80, 92] },
      { id: 'answer', label: 'Answer rate', value: 94.6, fmt: 'pct', delta: 1.4, spark: [90, 92, 91, 93, 92, 94, 93, 95, 94, 95] },
      { id: 'wait', label: 'Avg wait', value: 38, fmt: 'sec', delta: -6.1, goodWhenDown: true, spark: [52, 49, 47, 45, 46, 42, 41, 40, 39, 38] },
      { id: 'meet', label: 'Meetings today', value: 17, fmt: 'int', delta: 0, spark: [3, 5, 4, 6, 5, 7, 6, 7, 6, 7] },
      { id: 'sla', label: 'Service level', value: 86.2, fmt: 'pct', delta: -2.3, spark: [91, 90, 89, 90, 88, 87, 88, 86, 87, 86] }
    ],
    agents: [
      { label: 'Available', n: 14, color: 'var(--ok)' },
      { label: 'On call', n: 11, color: 'var(--primary)' },
      { label: 'Break', n: 4, color: '#f59e0b' },
      { label: 'Offline', n: 5, color: 'var(--toggle-off)' }
    ],
    queues: [
      { name: 'Support', waiting: 3, longest: 142, agents: 9, sl: 82 },
      { name: 'Sales', waiting: 1, longest: 31, agents: 6, sl: 93 },
      { name: 'Billing', waiting: 0, longest: 0, agents: 4, sl: 97 },
      { name: 'Technical', waiting: 2, longest: 76, agents: 5, sl: 88 },
      { name: 'VIP', waiting: 0, longest: 0, agents: 3, sl: 99 }
    ],
    feed: [
      { ic: 'C', text: 'Missed call from +1 415 555 0142', sub: 'Support queue · 2 min ago', go: 'interactions/dialer' },
      { ic: 'M', text: 'Weekly sync starts in 15 minutes', sub: 'Video meeting · 10:30', go: 'interactions/video' },
      { ic: 'A', text: 'SLA alert on Support cleared', sub: 'Analytics · 12 min ago', go: 'analytics/alerts' },
      { ic: 'S', text: 'Holiday greeting updated by Priya N.', sub: 'Settings · 1 h ago', go: 'settings/change-log' },
      { ic: 'D', text: 'Marcus Lee joined the Sales team', sub: 'Directory · today', go: 'directory/people' }
    ]
  };
})(window);
