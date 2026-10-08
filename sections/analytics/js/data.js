/* MCM Analytics v2 - shared data model.
   ONE set of queues / agents / calls used by every page (fixes "pages don't reconcile").
   All data is deterministic demo data (seeded RNG) - replace MCM.api with real endpoints later. */
(function () {
  var MCM = window.MCM = window.MCM || {};

  /* ---------- tiny utils ---------- */
  function rng(seed) { var a = seed | 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  MCM.rng = rng;
  var S = MCM.store = {
    get: function (k, d) { try { var v = localStorage.getItem('mcm2.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('mcm2.' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('mcm2.' + k); } catch (e) {} }
  };
  var bus = MCM.bus = (function () { var h = {}; return { on: function (e, f) { (h[e] = h[e] || []).push(f); return f; }, off: function (e, f) { h[e] = (h[e] || []).filter(function (x) { return x !== f; }); }, emit: function (e, a) { (h[e] || []).slice().forEach(function (f) { try { f(a); } catch (x) { console.error(x); } }); } }; })();

  /* ---------- settings ---------- */
  var settings = MCM.settings = Object.assign({ tz: 'Asia/Kolkata', currency: 'USD', piiMask: false, retentionDays: 90, recordingRetentionDays: 60, lang: 'en', walletBalance: 89.82, ratePerMin: 0.012 }, S.get('settings', {}));
  MCM.saveSettings = function () { S.set('settings', settings); };

  /* ---------- time helpers (timezone aware) ---------- */
  var T = MCM.T = {
    _fp: null, _fpTz: null,
    parts: function (ts) {
      if (T._fpTz !== settings.tz) { T._fpTz = settings.tz; T._fp = new Intl.DateTimeFormat('en-GB', { timeZone: settings.tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' }); }
      var f = T._fp.formatToParts(new Date(ts)), o = {};
      f.forEach(function (p) { o[p.type] = p.value; });
      return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second, wd: o.weekday };
    },
    sod: function (ts) {
      var p = T.parts(ts), utc = Date.UTC(p.y, p.mo - 1, p.d), wall = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s), real = Math.floor(ts / 1000) * 1000;
      return utc - (wall - real);
    },
    day: 86400000, hour: 3600000,
    dow: function (ts) { return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[T.parts(ts).wd]; },
    hourOf: function (ts) { return T.parts(ts).h; },
    time: function (ts, sec) { return new Intl.DateTimeFormat('en-GB', { timeZone: settings.tz, hour: '2-digit', minute: '2-digit', second: sec ? '2-digit' : undefined, hourCycle: 'h23' }).format(new Date(ts)); },
    date: function (ts) { return new Intl.DateTimeFormat('en-GB', { timeZone: settings.tz, day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ts)); },
    dm: function (ts) { return new Intl.DateTimeFormat('en-GB', { timeZone: settings.tz, day: '2-digit', month: 'short' }).format(new Date(ts)); },
    dt: function (ts) { return T.dm(ts) + ' ' + T.time(ts); },
    wday: function (ts) { return T.parts(ts).wd; }
  };
  var NOW = MCM.now0 = Date.now();
  var TODAY = T.sod(NOW);
  MCM.TODAY = TODAY;
  var HIST_DAYS = 45;

  /* ---------- reference data ---------- */
  var QDEF = [
    ['q1', 'Inbound - NewCallQueue', '2435', 'voice', 'Sales', 95, 20, 80, 12, 60],
    ['q2', 'Chat QUEUE', '4424', 'chat', 'Support', 100, 30, 85, 8, 90],
    ['q3', 'Support', '2501', 'voice', 'Support', 160, 20, 80, 10, 75],
    ['q4', 'Billing', '2502', 'voice', 'Billing', 90, 30, 80, 8, 60],
    ['q5', 'Tech Support', '2503', 'voice', 'Support', 110, 30, 75, 12, 120],
    ['q6', 'Retention', '2504', 'voice', 'Sales', 50, 20, 85, 6, 45],
    ['q7', 'VIP Desk', '2505', 'voice', 'Escalations', 18, 20, 85, 6, 30],
    ['q8', 'Spanish Support', '2506', 'voice', 'Support', 55, 30, 80, 10, 60]
  ];
  var qcfg = S.get('queueCfg', {});
  var queues = MCM.queues = QDEF.map(function (d, i) {
    var q = { id: d[0], name: d[1], ext: d[2], channel: d[3], dept: d[4], base: d[5], sl: { sec: d[6], target: d[7] }, abandonGoal: d[8], asaGoal: d[9], active: true, site: i % 2 ? 'Mumbai' : 'Pune' };
    var c = qcfg[q.id]; if (c) { q.sl = c.sl || q.sl; q.abandonGoal = c.abandonGoal != null ? c.abandonGoal : q.abandonGoal; q.asaGoal = c.asaGoal != null ? c.asaGoal : q.asaGoal; q.active = c.active !== false; }
    return q;
  });
  var qById = MCM.qById = {}; queues.forEach(function (q) { qById[q.id] = q; });
  MCM.saveQueueCfg = function () { var o = {}; queues.forEach(function (q) { o[q.id] = { sl: q.sl, abandonGoal: q.abandonGoal, asaGoal: q.asaGoal, active: q.active }; }); S.set('queueCfg', o); };

  var TEAMS = MCM.teams = ['Sales', 'Support', 'Billing', 'Escalations'];
  var SITES = MCM.sites = ['Pune', 'Mumbai'];
  var ROLES = MCM.roles = ['Admin', 'Supervisor', 'Coach', 'Agent', 'Read-only'];
  var NAMES = [
    ['Johnny Doe', '1000', 'Admin', 'Escalations'], ['Adnan Shaikh', '7242', 'Supervisor', 'Support'], ['Rehmath Ali Shaikh', '6073', 'Agent', 'Support'],
    ['Priya Nair', '6101', 'Agent', 'Sales'], ['Rahul Verma', '6102', 'Agent', 'Sales'], ['Sneha Kulkarni', '6103', 'Agent', 'Sales'], ['Aman Gupta', '6104', 'Agent', 'Sales'],
    ['Neha Iyer', '6105', 'Agent', 'Support'], ['Vikram Rao', '6106', 'Agent', 'Support'], ['Divya Menon', '6107', 'Agent', 'Support'], ['Karan Mehta', '6108', 'Agent', 'Support'],
    ['Ananya Das', '6109', 'Agent', 'Support'], ['Mohit Sharma', '6110', 'Agent', 'Support'], ['Pooja Joshi', '6111', 'Agent', 'Billing'], ['Sanjay Patil', '6112', 'Agent', 'Billing'],
    ['Farhan Qureshi', '6113', 'Agent', 'Billing'], ['Isha Kapoor', '6114', 'Agent', 'Billing'], ['Rohan Desai', '6115', 'Agent', 'Escalations'], ['Meera Pillai', '6116', 'Agent', 'Escalations'],
    ['Arjun Nambiar', '6117', 'Agent', 'Sales'], ['Kavya Reddy', '6118', 'Agent', 'Support'], ['Tarun Bansal', '6119', 'Agent', 'Support'], ['Lakshmi Rao', '6120', 'Coach', 'Support'], ['Zoya Khan', '6121', 'Supervisor', 'Sales']
  ];
  var TEAMQ = { Sales: ['q1', 'q6'], Support: ['q2', 'q3', 'q5', 'q8'], Billing: ['q4', 'q2'], Escalations: ['q7', 'q3'] };
  var SHIFTS = [8, 9, 10, 12, 14, 8, 9, 11];
  var r0 = rng(77);
  var agents = MCM.agents = NAMES.map(function (n, i) {
    var team = n[3], base = TEAMQ[team].slice();
    if (i % 5 === 0 && base.indexOf('q1') < 0 && team !== 'Escalations') base.push(TEAMQ[team][0] === 'q3' ? 'q5' : 'q3');
    return { id: 'a' + (i + 1), name: n[0], ext: n[1], role: n[2], team: team, queues: base, site: SITES[i % 2], shiftStart: SHIFTS[i % SHIFTS.length], off: [(i * 3) % 7, (i * 3 + 3) % 7 === (i * 3) % 7 ? 0 : (i * 3 + 4) % 7], skill: 0.85 + r0() * 0.3, qaBase: 74 + r0() * 20, csatBase: 3.7 + r0() * 1.1, email: n[0].toLowerCase().replace(/[^a-z]+/g, '.') + '@mcmbpo.com', skills: [['English', 'Hindi'], ['English', 'Marathi'], ['English', 'Spanish'], ['English', 'Hindi', 'Billing']][i % 4], active: true };
  });
  var aById = MCM.aById = {}; agents.forEach(function (a) { aById[a.id] = a; });
  MCM.agentUsers = agents; // directory
  MCM.defaultUser = agents[0];

  MCM.DISP = ['Resolved', 'Follow-up needed', 'Escalated', 'Sale closed', 'Callback scheduled', 'Wrong number', 'Information only', 'Complaint', 'Refund issued', 'No resolution'];
  MCM.WRAP = ['Billing query', 'Plan upgrade', 'Technical fault', 'Password reset', 'Cancellation', 'New connection', 'Payment failed', 'Feedback'];
  MCM.TAGS = ['vip', 'churn-risk', 'compliance', 'upsell', 'repeat', 'escalation', 'training'];
  MCM.TOPICS = ['Pricing', 'Refund', 'Outage', 'Cancellation', 'Billing dispute', 'Upgrade', 'Delivery', 'Login problem', 'Competitor mention', 'Complaint'];

  /* ---------- flows (IVR) ---------- */
  var flows = MCM.flows = [
    { id: 'f1', name: 'Main IVR', ext: '2000', site: 'Pune', menus: [['1', 'Sales', 'q1'], ['2', 'Support', 'q3'], ['3', 'Billing', 'q4'], ['4', 'Tech Support', 'q5'], ['5', 'Retention', 'q6'], ['9', 'Operator', 'q3']], w: [24, 30, 16, 20, 6, 4] },
    { id: 'f2', name: 'VIP Hotline', ext: '2010', site: 'Mumbai', menus: [['1', 'VIP Desk', 'q7'], ['2', 'Account manager', 'q7']], w: [80, 20] },
    { id: 'f3', name: 'Spanish IVR', ext: '2020', site: 'Pune', menus: [['1', 'Soporte', 'q8'], ['2', 'Facturacion', 'q4']], w: [70, 30] },
    { id: 'f4', name: 'After-hours IVR', ext: '2030', site: 'Mumbai', menus: [['1', 'Leave voicemail', 'vm'], ['2', 'Request callback', 'cb'], ['3', 'Emergency line', 'q5']], w: [55, 30, 15] }
  ];
  var QFLOW = { q1: 'f1', q3: 'f1', q4: 'f1', q5: 'f1', q6: 'f1', q7: 'f2', q8: 'f3', q2: null };

  /* ---------- scheduling (shared with WFM page) ---------- */
  MCM.shift = function (agent, dayStart) {
    var dow = T.dow(dayStart + 12 * 3600000);
    if (agent.off.indexOf(dow) >= 0) return null;
    var h = agent.shiftStart, s = dayStart + h * 3600000, e = s + 9 * 3600000;
    return { start: s, end: e, items: [
      { type: 'work', from: s, to: s + 2 * 3600000 }, { type: 'break', from: s + 2 * 3600000, to: s + 2 * 3600000 + 900000 },
      { type: 'work', from: s + 2 * 3600000 + 900000, to: s + 4 * 3600000 }, { type: 'lunch', from: s + 4 * 3600000, to: s + 4 * 3600000 + 1800000 },
      { type: 'work', from: s + 4 * 3600000 + 1800000, to: s + 6.5 * 3600000 }, { type: 'break', from: s + 6.5 * 3600000, to: s + 6.5 * 3600000 + 900000 },
      { type: 'work', from: s + 6.5 * 3600000 + 900000, to: e }] };
  };
  MCM.shiftState = function (agent, ts) {
    var sh = MCM.shift(agent, T.sod(ts)); if (!sh) return 'off';
    if (ts < sh.start || ts >= sh.end) return 'off';
    for (var i = 0; i < sh.items.length; i++) if (ts >= sh.items[i].from && ts < sh.items[i].to) return sh.items[i].type;
    return 'work';
  };

  /* ---------- call generation ---------- */
  var HW = [.2, .1, .1, .1, .1, .2, .5, 1.2, 3, 5, 6, 6.5, 5, 5.5, 6.5, 6, 5, 3.5, 2, 1.2, .8, .5, .3, .2], HWS = HW.reduce(function (a, b) { return a + b; }, 0);
  var DW = [.25, 1.2, 1.1, 1, 1, .95, .4];
  var calls = MCM.calls = [], callSeq = 0;
  var CALLERS = []; (function () { var r = rng(5); for (var i = 0; i < 2600; i++) CALLERS.push('+91 9' + (100000000 + Math.floor(r() * 899999999))); })();
  MCM.mask = function (n) { return settings.piiMask && n ? String(n).replace(/\d(?=[\d\s-]{4,})/g, '*') : n; };

  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function pickW(r, w) { var s = w.reduce(function (a, b) { return a + b; }, 0), x = r() * s, i = 0; while (i < w.length - 1 && x >= w[i]) { x -= w[i]; i++; } return i; }
  function gauss(r) { return (r() + r() + r() + r() - 2) / 0.58; }
  function lognorm(r, mean, sd) { var v = mean * Math.exp(gauss(r) * sd - sd * sd / 2); return Math.max(1, Math.round(v)); }

  function onShift(q, ts) { return agents.filter(function (a) { return a.queues.indexOf(q.id) >= 0 && a.role !== 'Admin' && MCM.shiftState(a, ts) === 'work'; }); }
  MCM.onShift = onShift;

  function makeCall(r, q, ts, dir) {
    var hr = T.hourOf(ts), staff = onShift(q, ts), c = { id: 'C' + (100000 + (++callSeq)), ts: ts, q: q.id, dir: dir, ch: q.channel, flow: QFLOW[q.id] };
    var lam = q.base * DW[T.dow(ts)] * HW[hr] / HWS, load = staff.length ? lam / (staff.length * 6.5) : 5;
    c.from = pick(r, CALLERS); c.repeat = r() < 0.12; c.fcr = !c.repeat && r() < 0.86;
    if (dir === 'out') {
      var ag = staff.length ? pick(r, staff) : pick(r, agents.filter(function (a) { return a.role === 'Agent'; }));
      c.agent = ag.id; c.wait = 0; c.ivr = 0; c.ring = lognorm(r, 14, 0.6);
      c.outcome = r() < 0.62 ? 'answered' : 'noanswer'; c.talk = c.outcome === 'answered' ? lognorm(r, 230 * ag.skill, 0.7) : 0; c.hold = c.outcome === 'answered' && r() < .2 ? lognorm(r, 30, .6) : 0; c.wrap = c.outcome === 'answered' ? lognorm(r, 40, .5) : 0;
      c.disp = c.outcome === 'answered' ? pick(r, MCM.DISP) : 'No answer'; return finish(r, c, ag);
    }
    c.ivr = flows.length && c.flow ? lognorm(r, 22, 0.5) : 0;
    c.path = null;
    if (c.flow) { var f = flows.filter(function (x) { return x.id === c.flow; })[0], k = f.menus.map(function (m, i) { return m[2] === q.id ? f.w[i] : 0; }); var mi = k.some(Boolean) ? pickW(r, k) : 0; c.path = [f.name, f.menus[mi][0] + ':' + f.menus[mi][1]]; }
    var after = hr < 7 || hr >= 20;
    if (!staff.length) { c.outcome = r() < .45 ? 'voicemail' : 'abandoned'; c.wait = lognorm(r, 40, .8); c.abandonStage = 'queue'; c.talk = 0; c.hold = 0; c.wrap = 0; c.ring = 0; return finish(r, c, null); }
    var mean = 6 + 90 * Math.pow(Math.max(0, load - 0.55), 1.4) + (r() < .03 ? 80 : 0);
    c.wait = Math.max(1, Math.round(-Math.log(1 - r() * .999) * mean));
    var pab = Math.min(.5, 0.012 + c.wait / 900 + (load > 1 ? .08 : 0));
    var ag2 = pick(r, staff);
    if (r() < pab) { c.outcome = 'abandoned'; c.agent = null; c.abandonStage = r() < .1 ? 'ivr' : (r() < .12 ? 'ring' : 'queue'); c.ring = c.abandonStage === 'ring' ? lognorm(r, 9, .4) : 0; c.talk = 0; c.hold = 0; c.wrap = 0; if (c.abandonStage === 'ivr') c.wait = 0; else c.wait = Math.min(c.wait, 400); return finish(r, c, null); }
    if (after && r() < .25) { c.outcome = 'voicemail'; c.talk = 0; c.hold = 0; c.wrap = 0; c.ring = 0; c.agent = null; return finish(r, c, null); }
    c.agent = ag2.id; c.outcome = 'answered'; c.ring = lognorm(r, 9, .5);
    var tm = q.id === 'q5' ? 360 : q.id === 'q2' ? 420 : q.id === 'q7' ? 300 : 230;
    c.talk = lognorm(r, tm * ag2.skill, .7); c.hold = r() < .28 ? lognorm(r, 38, .6) : 0; c.wrap = lognorm(r, 38, .5);
    c.disp = pick(r, MCM.DISP); c.xfer = r() < .08; if (c.xfer) { c.xferTo = pick(r, queues.filter(function (x) { return x.id !== q.id; })).id; }
    return finish(r, c, ag2);
  }
  function finish(r, c, ag) {
    if (c.outcome === 'answered') {
      var sbase = c.wait > 90 ? -0.15 : 0.15; c.sent = Math.max(-1, Math.min(1, +(sbase + (ag ? (ag.csatBase - 4) * 0.25 : 0) + gauss(r) * 0.35).toFixed(2)));
      c.csat = r() < .38 ? Math.max(1, Math.min(5, Math.round(ag.csatBase + gauss(r) * .9 + (c.wait > 90 ? -.6 : 0)))) : null;
      c.qa = r() < .08 ? Math.max(40, Math.min(100, Math.round(ag.qaBase + gauss(r) * 8))) : null;
      c.mos = +(4.45 - r() * r() * 1.2).toFixed(2);
      var tp = []; if (r() < .45) tp.push(pick(r, MCM.TOPICS)); if (r() < .15) tp.push(pick(r, MCM.TOPICS));
      c.topics = tp; c.tags = r() < .1 ? [pick(r, MCM.TAGS)] : [];
      c.wrapCode = pick(r, MCM.WRAP); c.rec = c.ch === 'voice' && r() < .9;
    } else { c.sent = null; c.csat = null; c.qa = null; c.topics = []; c.tags = []; }
    return c;
  }
  MCM.nextCallId = function () { return 'C' + (100000 + (++callSeq)); };

  (function generate() {
    var r = rng(20260901 + Math.floor(TODAY / 86400000));
    var out = [];
    for (var d = HIST_DAYS; d >= 0; d--) {
      var ds = TODAY - d * T.day, endTs = d === 0 ? NOW - 90000 : ds + T.day;
      queues.forEach(function (q) {
        var dw = DW[T.dow(ds + 12 * 3600000)], n = Math.round(q.base * dw * (0.9 + r() * 0.2));
        for (var i = 0; i < n; i++) {
          var hr = pickW(r, HW), ts = ds + hr * 3600000 + Math.floor(r() * 3600000);
          if (ts > endTs) continue;
          out.push(makeCall(r, q, ts, 'in'));
        }
        var nout = Math.round(n * 0.28 * (q.channel === 'voice' ? 1 : 0));
        for (var j = 0; j < nout; j++) { var h2 = 8 + Math.floor(r() * 10), ts2 = ds + h2 * 3600000 + Math.floor(r() * 3600000); if (ts2 > endTs) continue; out.push(makeCall(r, q, ts2, 'out')); }
      });
    }
    out.sort(function (a, b) { return a.ts - b.ts; });
    out.forEach(function (c, i) { c.id = 'C' + (100001 + i); }); callSeq = out.length;
    out.forEach(function (c) { calls.push(c); });
  })();
  MCM.makeCall = function (q, ts, dir) { var r = rng(Math.floor(ts) % 1e9 + callSeq); var c = makeCall(r, q, ts, dir); return c; };
  MCM.addCall = function (c) { calls.push(c); bus.emit('calls', c); };

  /* ---------- AI bot calls ---------- */
  var aiCalls = MCM.aiCalls = [];
  (function () {
    var r = rng(991), intents = ['Order status', 'Balance enquiry', 'Reset password', 'Plan details', 'Cancel service', 'Book appointment', 'Report outage', 'Update address'];
    for (var d = HIST_DAYS; d >= 0; d--) { var ds = TODAY - d * T.day, n = Math.round(150 * DW[T.dow(ds + 12 * 3600000)] * (.9 + r() * .2)); for (var i = 0; i < n; i++) { var ts = ds + pickW(r, HW) * 3600000 + Math.floor(r() * 3600000); if (ts > NOW) continue; var it = pick(r, intents), cont = r() < (it === 'Cancel service' ? .35 : it === 'Report outage' ? .5 : .74); aiCalls.push({ ts: ts, intent: it, contained: cont, handoff: !cont && r() < .85, dur: lognorm(r, cont ? 95 : 60, .5), sent: +(gauss(r) * .35 + (cont ? .2 : -.1)).toFixed(2), csat: r() < .3 ? Math.max(1, Math.min(5, Math.round(3.9 + gauss(r) * .9 + (cont ? .3 : -.8)))) : null, q: 'q' + (1 + Math.floor(r() * 4)) }); } }
    aiCalls.sort(function (a, b) { return a.ts - b.ts; });
  })();

  /* ---------- campaigns / callbacks / voicemail ---------- */
  var campaigns = MCM.campaigns = [
    { id: 'cp1', name: 'Renewal Reminder - Oct', type: 'Progressive', status: 'Running', leads: 4200, attempts: 3180, connected: 1410, abandoned: 41, dialAhead: 3, talk: 214, owner: 'a22' },
    { id: 'cp2', name: 'Win-back Q4', type: 'Predictive', status: 'Running', leads: 2600, attempts: 1940, connected: 702, abandoned: 58, dialAhead: 4, talk: 188, owner: 'a2' },
    { id: 'cp3', name: 'Payment Due - Week 40', type: 'Preview', status: 'Paused', leads: 1800, attempts: 1203, connected: 612, abandoned: 0, dialAhead: 1, talk: 165, owner: 'a14' },
    { id: 'cp4', name: 'Feedback Survey', type: 'Progressive', status: 'Completed', leads: 900, attempts: 900, connected: 391, abandoned: 12, dialAhead: 2, talk: 96, owner: 'a3' },
    { id: 'cp5', name: 'New Plan Launch', type: 'Predictive', status: 'Scheduled', leads: 5200, attempts: 0, connected: 0, abandoned: 0, dialAhead: 3, talk: 0, owner: 'a4' }
  ];
  (function () {
    var r = rng(33); campaigns.forEach(function (c) { c.dnc = Math.round(c.leads * .02 * (.5 + r())); c.machine = Math.round(c.attempts * (.06 + r() * .08)); c.noAnswer = c.attempts - c.connected - c.machine - c.abandoned; if (c.noAnswer < 0) c.noAnswer = 0; });
  })();
  var callbacks = MCM.callbacks = S.get('callbacks', null);
  if (!callbacks) {
    var rc = rng(808); callbacks = MCM.callbacks = [];
    for (var i = 0; i < 26; i++) { var q = queues[Math.floor(rc() * 6)]; callbacks.push({ id: 'cb' + i, kind: i % 3 === 0 ? 'voicemail' : 'callback', q: q.id, from: pick(rc, CALLERS), created: NOW - Math.floor(rc() * 30) * 3600000 * 1.7 - 600000, due: NOW + (rc() * 10 - 3) * 3600000, status: ['pending', 'pending', 'pending', 'completed', 'failed'][Math.floor(rc() * 5)], agent: rc() < .6 ? pick(rc, agents).id : null, attempts: Math.floor(rc() * 3), dur: i % 3 === 0 ? 8 + Math.floor(rc() * 70) : 0, note: '' }); }
  }
  MCM.saveCallbacks = function () { S.set('callbacks', callbacks); };

  /* ---------- filters ---------- */
  var F = MCM.F = Object.assign({ preset: 'today', from: null, to: null, compare: false, queues: [], teams: [], channel: 'all', dir: 'all' }, S.get('filters', {}));
  MCM.PRESETS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'], ['lastmonth', 'Last month'], ['custom', 'Custom range']];
  F.save = function () { S.set('filters', { preset: F.preset, from: F.from, to: F.to, compare: F.compare, queues: F.queues, teams: F.teams, channel: F.channel, dir: F.dir }); };
  F.resolve = function () {
    var p = F.preset, f, t, label = (MCM.PRESETS.filter(function (x) { return x[0] === p; })[0] || [0, 'Today'])[1];
    if (p === 'today') { f = TODAY; t = NOW; }
    else if (p === 'yesterday') { f = TODAY - T.day; t = TODAY; }
    else if (p === '7d') { f = TODAY - 6 * T.day; t = NOW; }
    else if (p === '30d') { f = TODAY - 29 * T.day; t = NOW; }
    else if (p === 'month') { var pp = T.parts(NOW); f = TODAY - (pp.d - 1) * T.day; t = NOW; }
    else if (p === 'lastmonth') { var pq = T.parts(NOW), ms = TODAY - (pq.d - 1) * T.day; var prevLen = new Date(Date.UTC(pq.y, pq.mo - 1, 0)).getUTCDate(); f = ms - prevLen * T.day; t = ms; }
    else { f = F.from || TODAY; t = (F.to || TODAY) + T.day; if (t > NOW) t = NOW; label = T.dm(f) + ' - ' + T.dm(t - 1); }
    var len = t - f, pf = f - len - (p === 'today' ? 0 : 0), pt = f;
    if (p === 'today') { pf = TODAY - T.day; pt = pf + (NOW - TODAY); }
    return { from: f, to: t, pfrom: pf, pto: pt, label: label, days: Math.max(1, Math.round((t - f) / T.day)), compare: F.compare };
  };
  function lowerBound(ts) { var lo = 0, hi = calls.length; while (lo < hi) { var m = (lo + hi) >> 1; if (calls[m].ts < ts) lo = m + 1; else hi = m; } return lo; }
  MCM.lowerBound = lowerBound;
  /* range query; opts override global filters: {from,to,queues,agents,teams,channel,dir,ignoreFilters} */
  MCM.query = function (o) {
    o = o || {}; var R = F.resolve(), from = o.from != null ? o.from : R.from, to = o.to != null ? o.to : R.to;
    var qs = o.queues || (o.ignoreFilters ? [] : F.queues), tm = o.teams || (o.ignoreFilters ? [] : F.teams), ch = o.channel || (o.ignoreFilters ? 'all' : F.channel), dr = o.dir || (o.ignoreFilters ? 'all' : F.dir), ag = o.agents || [];
    var i = lowerBound(from), out = [];
    for (; i < calls.length; i++) {
      var c = calls[i]; if (c.ts >= to) break;
      if (qs.length && qs.indexOf(c.q) < 0) continue;
      if (ch !== 'all' && c.ch !== ch) continue;
      if (dr !== 'all' && c.dir !== dr) continue;
      if (ag.length && ag.indexOf(c.agent) < 0) continue;
      if (tm.length) { var a = aById[c.agent]; var team = a ? a.team : qById[c.q].dept; if (tm.indexOf(team) < 0) continue; }
      out.push(c);
    }
    return out;
  };
  MCM.queryPrev = function (o) { var R = F.resolve(); o = Object.assign({}, o, { from: R.pfrom, to: R.pto }); return MCM.query(o); };

  /* ---------- aggregation (metric definitions live in MCM.GLOSSARY) ---------- */
  MCM.agg = function (list) {
    var r = { total: list.length, offered: 0, answered: 0, abandoned: 0, shortAb: 0, voicemail: 0, outbound: 0, outConnected: 0, inSL: 0, waitSum: 0, waitMax: 0, abWaitSum: 0, talk: 0, hold: 0, wrap: 0, handled: 0, xfer: 0, fcr: 0, repeat: 0, csatN: 0, csatSum: 0, csatGood: 0, qaN: 0, qaSum: 0, sentN: 0, sentSum: 0, ivrAb: 0, qAb: 0, rAb: 0 };
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.dir === 'out') { r.outbound++; if (c.outcome === 'answered') { r.outConnected++; r.talk += c.talk; r.hold += c.hold; r.wrap += c.wrap; r.handled++; } continue; }
      r.offered++;
      if (c.outcome === 'answered') {
        r.answered++; r.waitSum += c.wait; if (c.wait > r.waitMax) r.waitMax = c.wait; r.talk += c.talk; r.hold += c.hold; r.wrap += c.wrap; r.handled++;
        if (c.wait <= qById[c.q].sl.sec) r.inSL++;
        if (c.xfer) r.xfer++; if (c.fcr) r.fcr++; if (c.repeat) r.repeat++;
        if (c.csat != null) { r.csatN++; r.csatSum += c.csat; if (c.csat >= 4) r.csatGood++; }
        if (c.qa != null) { r.qaN++; r.qaSum += c.qa; }
        if (c.sent != null) { r.sentN++; r.sentSum += c.sent; }
      } else if (c.outcome === 'abandoned') {
        r.abandoned++; r.abWaitSum += c.wait; if (c.wait < 5) r.shortAb++;
        if (c.abandonStage === 'ivr') r.ivrAb++; else if (c.abandonStage === 'ring') r.rAb++; else r.qAb++;
      } else if (c.outcome === 'voicemail') r.voicemail++;
    }
    var denom = r.offered - r.shortAb - r.voicemail;
    r.sl = denom > 0 ? r.inSL / denom * 100 : null;
    r.asa = r.answered ? r.waitSum / r.answered : 0;
    r.aht = r.handled ? (r.talk + r.hold + r.wrap) / r.handled : 0;
    r.avgTalk = r.handled ? r.talk / r.handled : 0; r.avgHold = r.handled ? r.hold / r.handled : 0; r.avgWrap = r.handled ? r.wrap / r.handled : 0;
    r.abandonRate = r.offered ? r.abandoned / r.offered * 100 : 0;
    r.answerRate = r.offered ? r.answered / r.offered * 100 : 0;
    r.avgAbWait = r.abandoned ? r.abWaitSum / r.abandoned : 0;
    r.xferRate = r.answered ? r.xfer / r.answered * 100 : 0;
    r.fcrRate = r.answered ? r.fcr / r.answered * 100 : 0;
    r.repeatRate = r.answered ? r.repeat / r.answered * 100 : 0;
    r.csat = r.csatN ? r.csatSum / r.csatN : null; r.csatPct = r.csatN ? r.csatGood / r.csatN * 100 : null;
    r.qa = r.qaN ? r.qaSum / r.qaN : null; r.sent = r.sentN ? r.sentSum / r.sentN : null;
    r.minutes = (r.talk + r.hold) / 60; r.cost = r.minutes * settings.ratePerMin;
    return r;
  };
  MCM.groupBy = function (list, keyFn) { var m = {}; list.forEach(function (c) { var k = keyFn(c); if (k == null) return; (m[k] = m[k] || []).push(c); }); return m; };
  /* time buckets between from..to; returns [{t,list,agg}] */
  MCM.buckets = function (list, from, to, step) {
    var n = Math.max(1, Math.ceil((to - from) / step)), b = []; for (var i = 0; i < n; i++) b.push({ t: from + i * step, list: [] });
    list.forEach(function (c) { var k = Math.floor((c.ts - from) / step); if (k >= 0 && k < n) b[k].list.push(c); });
    b.forEach(function (x) { x.agg = MCM.agg(x.list); }); return b;
  };
  MCM.stepFor = function (R) { var span = R.to - R.from; return span <= 2 * T.day ? 1800000 : span <= 10 * T.day ? 3600000 * 6 : T.day; };

  /* ---------- agent daily stats (staffed time, occupancy, adherence) ---------- */
  MCM.agentStats = function (list, R) {
    R = R || F.resolve(); var by = MCM.groupBy(list, function (c) { return c.agent; }), out = [];
    agents.forEach(function (a) {
      var l = by[a.id] || [], g = MCM.agg(l), staffed = 0, sched = 0, adhSum = 0, adhN = 0;
      for (var d = Math.floor((R.from - TODAY) / T.day); d <= Math.floor((R.to - 1 - TODAY) / T.day); d++) {
        var ds = TODAY + d * T.day, sh = MCM.shift(a, ds); if (!sh) continue;
        var s = Math.max(sh.start, R.from), e = Math.min(sh.end, R.to); if (e <= s) continue;
        var work = 0; sh.items.forEach(function (it) { if (it.type === 'work') { var x = Math.max(it.from, s), y = Math.min(it.to, e); if (y > x) work += y - x; } });
        staffed += work / 1000; sched += (e - s) / 1000; var ad = MCM.adherence(a, ds); adhSum += ad.pct; adhN++;
      }
      var busy = g.talk + g.hold + g.wrap, occ = staffed ? Math.min(98, busy / staffed * 100) : 0;
      out.push({ agent: a, agg: g, handled: g.handled, staffed: staffed, sched: sched, occupancy: occ, adherence: adhN ? adhSum / adhN : null, shrink: sched ? (sched - staffed) / sched * 100 : 0 });
    });
    return out;
  };
  MCM.adherence = function (a, dayStart) {
    var r = rng(parseInt(a.id.slice(1), 10) * 977 + Math.floor(dayStart / 86400000)), pct = Math.max(70, Math.min(100, 93 + gauss(r) * 4 * (a.skill < .9 ? 1.6 : 1)));
    var ex = []; if (pct < 90) ex.push({ type: 'Late start', min: Math.round((100 - pct) * .8) }); if (pct < 86) ex.push({ type: 'Long break', min: Math.round((100 - pct) * .6) }); if (r() < .12) ex.push({ type: 'Early leave', min: 10 + Math.floor(r() * 25) });
    return { pct: +pct.toFixed(1), conformance: +(Math.min(100, pct + 2 + r() * 3)).toFixed(1), exceptions: ex };
  };

  /* ---------- forecast (interval) ---------- */
  MCM.forecast = function (qid, dayStart) {
    var q = qById[qid], dow = T.dow(dayStart + 12 * 3600000), out = [], r = rng(parseInt(qid.slice(1), 10) * 31 + Math.floor(dayStart / 86400000));
    var bias = (r() - .5) * .08;
    for (var i = 0; i < 48; i++) {
      var h = Math.floor(i / 2), w = HW[h] / HWS / 2 * 2, fc = q.base * DW[dow] * w / 2 * 2 / 2 * 1; fc = q.base * DW[dow] * (HW[h] / HWS) / 2; var ts = dayStart + i * 1800000;
      var act = 0; var cnt = 0; var lo = lowerBound(ts), hi = lowerBound(ts + 1800000); for (var k = lo; k < hi; k++) if (calls[k].q === qid && calls[k].dir === 'in') cnt++;
      var past = ts + 1800000 <= NOW;
      var fcv = fc * (1 + bias + (r() - .5) * .12), ahtS = (q.id === 'q5' ? 420 : q.id === 'q2' ? 480 : 300), req = Math.max(0, Math.ceil(fcv * ahtS / 1800 / 0.85 * 1.05 * 1));
      out.push({ ts: ts, fc: fcv, act: past ? cnt : null, aht: ahtS, req: fcv < .2 ? 0 : req });
    }
    return out;
  };

  /* ---------- live simulation ---------- */
  var live = MCM.live = { agents: {}, calls: [], waiting: [], events: [], tick: 0, running: true, sessions: S.get('sessions', []) };
  var rl = rng(Math.floor(NOW / 60000));
  agents.forEach(function (a) {
    var st = MCM.shiftState(a, NOW), status = 'offline';
    if (a.role === 'Admin') status = 'offline';
    else if (st === 'work') status = rl() < .55 ? 'on_call' : rl() < .85 ? 'available' : 'wrap';
    else if (st === 'break') status = 'break'; else if (st === 'lunch') status = 'lunch';
    live.agents[a.id] = { status: status, since: NOW - Math.floor(rl() * 600) * 1000, call: null, forced: false };
  });
  MCM.STATUS = { available: ['Available', '#16a34a'], on_call: ['On call', '#2563eb'], wrap: ['Wrap-up', '#d97706'], break: ['Break', '#7c3aed'], lunch: ['Lunch', '#9333ea'], dnd: ['Do not disturb', '#dc2626'], training: ['Training', '#0891b2'], offline: ['Offline', '#94a3b8'] };
  function startCall(c, agentId, ts) {
    var lc = { id: c.id, q: c.q, from: c.from, agent: agentId, start: ts, dir: c.dir, plan: c, sent: c.sent == null ? 0.1 : c.sent, mon: null, hold: false };
    live.calls.push(lc); var la = live.agents[agentId]; la.status = 'on_call'; la.since = ts; la.call = lc.id; return lc;
  }
  var rs = rng(Math.floor(NOW / 1000));
  function liveTick() {
    if (!live.running) return; var now = Date.now(); live.tick++;
    // arrivals
    queues.forEach(function (q) {
      if (!q.active) return; var hr = T.hourOf(now), lam = q.base * DW[T.dow(now)] * HW[hr] / HWS / 3600 * 4; // x4 to keep wall lively
      if (rs() < lam) {
        var c = MCM.makeCall(q, now, 'in'); c.ts = now; live.waiting.push({ id: c.id, q: q.id, from: c.from, since: now, plan: c });
      }
    });
    // routing
    live.waiting.slice().forEach(function (w) {
      var qa = agents.filter(function (a) { var s = live.agents[a.id]; return a.queues.indexOf(w.q) >= 0 && s.status === 'available'; });
      var waited = (now - w.since) / 1000;
      if (qa.length && waited >= 3) { qa.sort(function (x, y) { return live.agents[x.id].since - live.agents[y.id].since; }); var ag = qa[0]; live.waiting.splice(live.waiting.indexOf(w), 1); w.plan.wait = Math.round(waited); w.plan.agent = ag.id; w.plan.outcome = 'answered'; var lc = startCall(w.plan, ag.id, now); lc.target = Math.max(40, w.plan.talk || 150); pushEvent('answer', w.q, ag.name + ' answered ' + MCM.mask(w.from)); }
      else if (waited > 25 && rs() < 0.004 + waited / 40000) { live.waiting.splice(live.waiting.indexOf(w), 1); var c2 = w.plan; c2.wait = Math.round(waited); c2.outcome = 'abandoned'; c2.agent = null; c2.abandonStage = 'queue'; c2.talk = 0; c2.hold = 0; c2.wrap = 0; c2.ring = 0; c2.sent = null; c2.csat = null; c2.qa = null; c2.topics = []; c2.tags = []; MCM.addCall(c2); pushEvent('abandon', w.q, 'Abandoned after ' + Math.round(waited) + 's'); }
    });
    // ending calls
    live.calls.slice().forEach(function (lc) {
      var el = (now - lc.start) / 1000; lc.sent = Math.max(-1, Math.min(1, lc.sent + (rs() - .5) * .08));
      if (el >= (lc.target || 120)) { live.calls.splice(live.calls.indexOf(lc), 1); var p = lc.plan; p.talk = Math.round(el); p.disp = p.disp || pick(rs, MCM.DISP); p.sent = +lc.sent.toFixed(2); MCM.addCall(p); var la = live.agents[lc.agent]; if (la) { la.status = 'wrap'; la.since = now; la.call = null; la.wrapFor = 20 + Math.floor(rs() * 40); } }
    });
    // wrap -> available, shift transitions
    agents.forEach(function (a) {
      var s = live.agents[a.id]; if (s.forced) return; var el = (now - s.since) / 1000;
      if (s.status === 'wrap' && el >= (s.wrapFor || 30)) { s.status = 'available'; s.since = now; }
      if (live.tick % 20 === 0 && a.role !== 'Admin') {
        var st = MCM.shiftState(a, now);
        if (st === 'work' && (s.status === 'offline' || s.status === 'break' || s.status === 'lunch')) { s.status = 'available'; s.since = now; }
        if ((st === 'break' || st === 'lunch') && (s.status === 'available')) { s.status = st; s.since = now; }
        if (st === 'off' && (s.status === 'available' || s.status === 'break' || s.status === 'lunch')) { s.status = 'offline'; s.since = now; }
      }
    });
    if (live.events.length > 60) live.events.length = 60;
    bus.emit('tick', live);
  }
  function pushEvent(type, q, text) { live.events.unshift({ ts: Date.now(), type: type, q: q, text: text }); }
  MCM.pushEvent = pushEvent;
  MCM.liveTick = liveTick;
  MCM.startLive = function () { if (MCM._lt) return; MCM._lt = setInterval(liveTick, 1000); };
  MCM.setLive = function (on) { live.running = on; bus.emit('livechange', on); };
  /* rolling per-queue live metrics (last N minutes) */
  MCM.liveQueue = function (qid, mins) {
    var from = Date.now() - (mins || 15) * 60000, i = lowerBound(from), list = []; for (; i < calls.length; i++) if (calls[i].q === qid && calls[i].dir === 'in') list.push(calls[i]);
    var g = MCM.agg(list), w = live.waiting.filter(function (x) { return x.q === qid; }), now = Date.now();
    var ag = agents.filter(function (a) { return a.queues.indexOf(qid) >= 0 && live.agents[a.id].status !== 'offline'; });
    return { agg: g, waiting: w.length, longest: w.length ? Math.max.apply(null, w.map(function (x) { return (now - x.since) / 1000; })) : 0, available: ag.filter(function (a) { return live.agents[a.id].status === 'available'; }).length, staffed: ag.length, onCall: ag.filter(function (a) { return live.agents[a.id].status === 'on_call'; }).length, active: live.calls.filter(function (x) { return x.q === qid; }).length };
  };

  /* ---------- quality: scorecards & evaluations ---------- */
  var scorecards = MCM.scorecards = S.get('scorecards', null) || [
    { id: 'sc1', name: 'Voice - Standard', passMark: 80, active: true, sections: [
      { name: 'Opening', questions: [{ t: 'Greeted with the approved script', w: 5 }, { t: 'Verified caller identity', w: 10, critical: true }] },
      { name: 'Discovery', questions: [{ t: 'Asked open questions', w: 10 }, { t: 'Active listening, no interruptions', w: 10 }] },
      { name: 'Resolution', questions: [{ t: 'Correct and complete answer', w: 25 }, { t: 'Followed process / knowledge base', w: 15 }, { t: 'Set clear next steps', w: 10 }] },
      { name: 'Compliance', questions: [{ t: 'Recording disclosure given', w: 10, critical: true }, { t: 'No sensitive data read aloud', w: 0, critical: true }] },
      { name: 'Closing', questions: [{ t: 'Summarised and confirmed satisfaction', w: 5 }] }] },
    { id: 'sc2', name: 'Chat - Standard', passMark: 75, active: true, sections: [{ name: 'Handling', questions: [{ t: 'Responded within 60s', w: 20 }, { t: 'Tone and grammar', w: 20 }, { t: 'Accurate resolution', w: 40 }, { t: 'Closing and survey invite', w: 20 }] }] },
    { id: 'sc3', name: 'Sales - Retention', passMark: 85, active: false, sections: [{ name: 'Retention', questions: [{ t: 'Probed cancellation reason', w: 30 }, { t: 'Offered retention option', w: 40 }, { t: 'Compliant disclosures', w: 30, critical: true }] }] }
  ];
  MCM.saveScorecards = function () { S.set('scorecards', scorecards); };
  var evals = MCM.evals = S.get('evals', null);
  if (!evals) {
    evals = MCM.evals = []; var re = rng(555), rev = agents.filter(function (a) { return ['Admin', 'Supervisor', 'Coach'].indexOf(a.role) >= 0; }), cand = calls.filter(function (c) { return c.qa != null && c.ts < NOW - T.day; }).slice(-120);
    cand.forEach(function (c, i) { var a = aById[c.agent]; evals.push({ id: 'ev' + (i + 1), call: c.id, agent: c.agent, ts: c.ts + 3600000 * 5, scorecard: c.ch === 'chat' ? 'sc2' : 'sc1', score: c.qa, evaluator: pick(re, rev).id, mode: re() < .35 ? 'auto' : 'manual', status: re() < .06 ? 'disputed' : re() < .12 ? 'calibration' : 'final', critFail: c.qa < 55, comment: '' }); });
  }
  MCM.saveEvals = function () { S.set('evals', evals); };

  /* ---------- audit ---------- */
  MCM.user = Object.assign({ id: 'a1', role: 'Admin' }, S.get('user', {}));
  MCM.audit = function (action, detail) { var l = S.get('audit', []); l.unshift({ ts: Date.now(), user: (aById[MCM.user.id] || {}).name, role: MCM.user.role, action: action, detail: detail || '' }); if (l.length > 300) l.length = 300; S.set('audit', l); bus.emit('audit'); };

  /* ---------- glossary (metric definitions with formulas) ---------- */
  MCM.GLOSSARY = {
    offered: ['Offered', 'Inbound interactions that entered a queue.', 'count(inbound)'],
    answered: ['Answered', 'Offered interactions connected to an agent.', 'count(answered)'],
    abandoned: ['Abandoned', 'Callers who hung up before reaching an agent (includes IVR, queue and ring stages).', 'count(abandoned)'],
    sl: ['Service level', 'Share of offered contacts answered within the queue threshold. Abandons shorter than 5 s and voicemails are excluded from the denominator.', 'answered <= threshold / (offered - short abandons - voicemail)'],
    asa: ['Average speed of answer', 'Average wait of answered contacts.', 'sum(wait of answered) / answered'],
    aht: ['Average handle time', 'Talk + hold + after-call work per handled contact.', '(talk + hold + wrap) / handled'],
    abandonRate: ['Abandon rate', 'Abandoned as a share of offered.', 'abandoned / offered'],
    fcr: ['First-contact resolution', 'Answered contacts with no repeat contact from the same caller within 7 days.', 'resolved-first / answered'],
    xfer: ['Transfer rate', 'Answered contacts transferred to another queue.', 'transferred / answered'],
    occupancy: ['Occupancy', 'Share of staffed (available) time spent handling contacts.', '(talk + hold + wrap) / staffed time'],
    adherence: ['Adherence', 'Share of scheduled time the agent was in the scheduled state.', 'time in schedule / scheduled time'],
    conformance: ['Conformance', 'Share of scheduled work time the agent was available or handling.', 'worked time / scheduled work time'],
    shrinkage: ['Shrinkage', 'Paid time not available for contacts (breaks, training, meetings, absence).', '(scheduled - staffed) / scheduled'],
    csat: ['CSAT', 'Mean of 1-5 survey scores; % good = scores 4-5.', 'sum(score) / responses'],
    qa: ['QA score', 'Mean evaluation score (0-100) from scorecards.', 'sum(score) / evaluations'],
    wape: ['WAPE', 'Forecast accuracy: weighted absolute percentage error.', 'sum(|actual - forecast|) / sum(actual)'],
    containment: ['AI containment', 'AI-handled calls resolved without human hand-off.', 'contained / AI calls']
  };

  /* ---------- notifications / alert rules ---------- */
  MCM.ALERT_METRICS = [
    ['sl', 'Service level (15 min)', '%', '<', 80], ['longest', 'Longest wait', 's', '>', 120], ['waiting', 'Callers waiting', '', '>', 8],
    ['noagents', 'Available agents', '', '<', 1], ['abandon', 'Abandon rate (15 min)', '%', '>', 10], ['adherence', 'Agent adherence (today)', '%', '<', 85], ['occupancy', 'Occupancy (today)', '%', '>', 90]
  ];
  MCM.alertRules = S.get('alertRules', null) || [
    { id: 'r1', name: 'Service level low', metric: 'sl', op: '<', value: 80, scope: 'all', sev: 'high', mode: 'interval', notify: ['toast', 'email'], muted: false, enabled: true },
    { id: 'r2', name: 'Long wait', metric: 'longest', op: '>', value: 120, scope: 'all', sev: 'high', mode: 'instant', notify: ['toast'], muted: false, enabled: true },
    { id: 'r3', name: 'Callers piling up', metric: 'waiting', op: '>', value: 8, scope: 'all', sev: 'medium', mode: 'instant', notify: ['toast', 'sms'], muted: false, enabled: true },
    { id: 'r4', name: 'No agents available', metric: 'noagents', op: '<', value: 1, scope: 'q7', sev: 'high', mode: 'instant', notify: ['toast', 'email', 'webhook'], muted: false, enabled: true },
    { id: 'r5', name: 'Abandon rate high', metric: 'abandon', op: '>', value: 10, scope: 'all', sev: 'medium', mode: 'interval', notify: ['toast'], muted: false, enabled: true },
    { id: 'r6', name: 'Agent adherence low', metric: 'adherence', op: '<', value: 85, scope: 'agents', sev: 'low', mode: 'interval', notify: ['email'], muted: false, enabled: true }
  ];
  MCM.saveAlertRules = function () { S.set('alertRules', MCM.alertRules); };
  MCM.alerts = S.get('alertHistory', []); // {id,rule,ruleName,scope,scopeName,metric,value,sev,ts,ack,ackBy,resolved,resolvedTs,notified}
  MCM.saveAlerts = function () { if (MCM.alerts.length > 400) MCM.alerts.length = 400; S.set('alertHistory', MCM.alerts); };
  function metricValue(metric, scope, scopeId) {
    if (scope === 'agents') return null;
    var lq = MCM.liveQueue(scopeId, 15);
    switch (metric) {
      case 'sl': return lq.agg.sl; case 'longest': return lq.longest; case 'waiting': return lq.waiting; case 'noagents': return lq.available;
      case 'abandon': return lq.agg.offered >= 5 ? lq.agg.abandonRate : null;
      case 'occupancy': { var ids = agents.filter(function (a) { return a.queues.indexOf(scopeId) >= 0; }); var tot = 0, n = 0; ids.forEach(function (a) { var s = live.agents[a.id].status; if (s !== 'offline') { n++; if (s === 'on_call' || s === 'wrap') tot++; } }); return n ? tot / n * 100 : null; }
    } return null;
  }
  MCM.evalAlerts = function () {
    var changed = false, now = Date.now();
    MCM.alertRules.forEach(function (rule) {
      if (!rule.enabled) return;
      var scopes = rule.scope === 'all' ? queues.filter(function (q) { return q.active && q.channel === 'voice'; }).map(function (q) { return q.id; }) : rule.scope === 'agents' ? agents.filter(function (a) { return a.role === 'Agent' && live.agents[a.id].status !== 'offline'; }).map(function (a) { return a.id; }) : [rule.scope];
      scopes.forEach(function (sid) {
        var v = rule.scope === 'agents' ? MCM.adherence(aById[sid], TODAY).pct : metricValue(rule.metric, rule.scope, sid);
        var trig = v != null && (rule.op === '<' ? v < rule.value : v > rule.value);
        var cur = MCM.alerts.filter(function (a) { return a.rule === rule.id && a.scope === sid && !a.resolved; })[0];
        if (trig && !cur) {
          var al = { id: 'al' + now + Math.floor(Math.random() * 1e4), rule: rule.id, ruleName: rule.name, scope: sid, scopeName: rule.scope === 'agents' ? aById[sid].name : qById[sid].name, metric: rule.metric, value: v, threshold: rule.value, op: rule.op, sev: rule.sev, ts: now, ack: false, resolved: false, notify: rule.notify, muted: rule.muted };
          MCM.alerts.unshift(al); changed = true; bus.emit('alert', al);
        } else if (trig && cur) { cur.value = v; }
        else if (!trig && cur) { cur.resolved = true; cur.resolvedTs = now; changed = true; bus.emit('alertresolved', cur); }
      });
    });
    if (changed) { MCM.saveAlerts(); bus.emit('alerts'); }
  };

  /* ---------- reports: saved views & schedules ---------- */
  MCM.savedViews = S.get('savedViews', []); MCM.saveViews = function () { S.set('savedViews', MCM.savedViews); };
  MCM.schedules = S.get('schedules', null) || [
    { id: 's1', report: 'queue-summary', name: 'Daily queue summary', freq: 'Daily 07:00', to: 'ops@mcmbpo.com', fmt: 'CSV', channel: 'email', enabled: true, last: null },
    { id: 's2', report: 'agent-performance', name: 'Weekly agent scorecard', freq: 'Mon 08:00', to: 'supervisors@mcmbpo.com', fmt: 'XLS', channel: 'email', enabled: true, last: null }
  ];
  MCM.saveSchedules = function () { S.set('schedules', MCM.schedules); };

  /* ---------- time off, trades (WFM) ---------- */
  MCM.timeoff = S.get('timeoff', null) || [
    { id: 't1', agent: 'a4', from: TODAY + 3 * T.day, to: TODAY + 4 * T.day, type: 'Vacation', status: 'pending', note: 'Family trip' },
    { id: 't2', agent: 'a9', from: TODAY + 6 * T.day, to: TODAY + 6 * T.day, type: 'Sick', status: 'approved', note: '' },
    { id: 't3', agent: 'a13', from: TODAY + 10 * T.day, to: TODAY + 12 * T.day, type: 'Vacation', status: 'pending', note: '' },
    { id: 't4', agent: 'a6', from: TODAY + 1 * T.day, to: TODAY + 1 * T.day, type: 'Personal', status: 'denied', note: 'Coverage gap' },
    { id: 't5', agent: 'a17', from: TODAY + 8 * T.day, to: TODAY + 9 * T.day, type: 'Vacation', status: 'pending', note: '' }
  ];
  MCM.trades = S.get('trades', null) || [
    { id: 'x1', from: 'a5', to: 'a7', day: TODAY + 2 * T.day, status: 'pending', note: 'Appointment' },
    { id: 'x2', from: 'a10', to: 'a12', day: TODAY + 4 * T.day, status: 'approved', note: '' },
    { id: 'x3', from: 'a14', to: 'a16', day: TODAY + 5 * T.day, status: 'pending', note: 'Exam' }
  ];
  MCM.saveWfm = function () { S.set('timeoff', MCM.timeoff); S.set('trades', MCM.trades); };

  /* ---------- coaching ---------- */
  MCM.coachSessions = S.get('coach', null) || (function () {
    var r = rng(444), out = []; for (var i = 0; i < 14; i++) { var a = pick(r, agents.filter(function (x) { return x.role === 'Agent'; })); out.push({ id: 'co' + i, agent: a.id, coach: pick(r, agents.filter(function (x) { return ['Supervisor', 'Coach'].indexOf(x.role) >= 0; })).id, ts: NOW - Math.floor(r() * 20) * T.day - Math.floor(r() * 8) * 3600000, topic: pick(r, ['Empathy', 'Hold etiquette', 'Compliance script', 'Upsell', 'De-escalation', 'Product knowledge']), status: pick(r, ['completed', 'completed', 'scheduled', 'in-progress']), note: 'Reviewed 3 recent calls and agreed an action plan.', score: Math.round(70 + r() * 25) }); }
    return out.sort(function (a, b) { return b.ts - a.ts; });
  })();
  MCM.saveCoach = function () { S.set('coach', MCM.coachSessions); };
  MCM.goals = S.get('goals', null) || { sl: 80, aht: 330, csat: 4.3, qa: 85, adherence: 92 };

  /* kick off alert engine once everything exists */
  MCM.start = function () { MCM.startLive(); setInterval(function () { MCM.evalAlerts(); }, 5000); setTimeout(MCM.evalAlerts, 600); };
})();
