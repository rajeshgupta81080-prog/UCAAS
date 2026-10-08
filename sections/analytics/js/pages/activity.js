/* Agent Activity - 24h timelines per agent and time-in-state summary with schedule exceptions. */
MCM.page({
  id: 'activity', title: 'Agent Activity', label: 'Agent<br>Activity', icon: 'activity', filters: ['date', 'team'],
  tabs: [['timeline', 'Timeline'], ['summary', 'Summary']],
  render: function (ctx) {
    var UI = window.UI, f = UI.f, T = MCM.T, R = ctx.R, tab = ctx.tab, esc = UI.esc, F = MCM.F, TODAY = MCM.TODAY, NOW = Date.now();
    function csvName(n) { return MCM.can('export') ? n : undefined; }
    var agents = MCM.agents.filter(function (a) { return a.role !== 'Admin' && (!F.teams.length || F.teams.indexOf(a.team) >= 0); });
    var COL = { talk: '#2563eb', hold: '#8b5cf6', wrap: '#16a34a', available: '#bbf7d0', brk: '#a855f7', lunch: '#f59e0b', off: 'var(--chip-bg)' };

    /* ---------------- TIMELINE ---------------- */
    if (tab === 'timeline') {
      var days = []; for (var d = 0; d < 14; d++) days.push([TODAY - d * T.day, (d === 0 ? 'Today - ' : d === 1 ? 'Yesterday - ' : '') + T.date(TODAY - d * T.day)]);
      var daySel = +MCM.store.get('actDay', TODAY); if (!days.some(function (x) { return x[0] === daySel; })) daySel = TODAY;
      var agSel = MCM.store.get('actAgent', 'all'); if (agSel !== 'all' && !agents.some(function (a) { return a.id === agSel; })) agSel = 'all';
      var ds = daySel, de = ds + T.day, shown = agSel === 'all' ? agents : agents.filter(function (a) { return a.id === agSel; });
      var calls = MCM.query({ from: ds, to: de, queues: [], teams: [], channel: 'all', dir: 'all' }), by = MCM.groupBy(calls, function (c) { return c.agent; });
      function pctOf(t) { return Math.max(0, Math.min(100, (t - ds) / T.day * 100)); }
      function blk(from, to, color, title, extra, z) {
        var l = pctOf(from), w = pctOf(to) - l; if (w <= 0) return '';
        return '<i ' + (extra || '') + ' title="' + esc(title) + '" style="position:absolute;top:0;bottom:0;left:' + l + '%;width:' + Math.max(w, 0.12) + '%;background:' + color + ';z-index:' + (z || 1) + (extra ? ';cursor:pointer' : '') + '"></i>';
      }
      function rowFor(a) {
        var sh = MCM.shift(a, ds), h = '';
        if (sh) sh.items.forEach(function (it) {
          var fut = it.from > NOW, nm = it.type === 'work' ? 'Available / idle' : it.type === 'break' ? 'Break' : 'Lunch';
          var col = it.type === 'work' ? COL.available : it.type === 'break' ? COL.brk : COL.lunch;
          h += '<i title="' + nm + (fut ? ' (scheduled)' : '') + ' ' + T.time(it.from) + '-' + T.time(it.to) + '" style="position:absolute;top:0;bottom:0;left:' + pctOf(it.from) + '%;width:' + (pctOf(it.to) - pctOf(it.from)) + '%;background:' + col + ';opacity:' + (fut && ds === TODAY ? .45 : 1) + '"></i>';
        });
        (by[a.id] || []).forEach(function (c) {
          if (c.outcome !== 'answered') return;
          var s = c.ts + (c.wait || 0) * 1000, e1 = s + c.talk * 1000, e2 = e1 + c.hold * 1000, e3 = e2 + c.wrap * 1000, tag = (c.dir === 'in' ? 'In' : 'Out') + ' call ' + c.id + ' ' + MCM.qById[c.q].name;
          h += blk(s, e1, COL.talk, 'Talk ' + T.time(s, true) + ' (' + f.dur(c.talk) + ') - ' + tag + '. Click to open.', 'data-call="' + c.id + '"', 3);
          if (c.hold) h += blk(e1, e2, COL.hold, 'Hold ' + f.dur(c.hold) + ' - ' + tag, 'data-call="' + c.id + '"', 2);
          if (c.wrap) h += blk(e2, e3, COL.wrap, 'Wrap-up ' + f.dur(c.wrap) + ' - ' + tag, 'data-call="' + c.id + '"', 2);
        });
        if (ds === TODAY) h += '<i title="Now" style="position:absolute;top:-2px;bottom:-2px;left:' + pctOf(NOW) + '%;width:2px;background:var(--bad);z-index:5"></i>';
        var cl = (by[a.id] || []).filter(function (c) { return c.outcome === 'answered'; });
        return '<div style="display:grid;grid-template-columns:16rem 1fr;gap:1rem;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--line2)"><div><a href="#" data-ag="' + a.id + '"><b>' + esc(a.name) + '</b></a><div class="muted" style="font-size:1.05rem">' + (sh ? T.time(sh.start) + '-' + T.time(sh.end) : 'Day off') + ' - ' + cl.length + ' calls</div></div><div style="position:relative;height:2.6rem;border-radius:.5rem;background:' + COL.off + ';overflow:hidden;box-shadow:inset 0 0 0 1px var(--line2)">' + h + '</div></div>';
      }
      var axis = '<div style="display:grid;grid-template-columns:16rem 1fr;gap:1rem"><div></div><div style="position:relative;height:1.8rem">' + [0, 3, 6, 9, 12, 15, 18, 21, 24].map(function (hh) { return '<span class="muted" style="position:absolute;left:' + hh / 24 * 100 + '%;transform:translateX(' + (hh === 24 ? '-100%' : hh === 0 ? '0' : '-50%') + ');font-size:1.05rem">' + (hh < 10 ? '0' : '') + hh + ':00</span>'; }).join('') + '</div></div>';
      var leg = [['Talk', COL.talk], ['Hold', COL.hold], ['Wrap-up', COL.wrap], ['Available / idle', COL.available], ['Break', COL.brk], ['Lunch', COL.lunch], ['Off shift', 'var(--chip-bg)']];
      var tot = 0; shown.forEach(function (a) { tot += (by[a.id] || []).filter(function (c) { return c.outcome === 'answered'; }).length; });
      ctx.el.innerHTML = '<div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:1.5rem"><label class="sel"><select data-actd>' + UI.opts(days, daySel) + '</select></label><label class="sel"><select data-acta>' + UI.opts([['all', 'All agents (' + agents.length + ')']].concat(agents.map(function (a) { return [a.id, a.name]; })), agSel) + '</select></label><span class="muted">' + shown.length + ' agents, ' + f.n(tot) + ' handled calls on ' + T.date(ds) + '. Times in ' + esc(MCM.settings.tz) + '.</span></div>' +
        UI.card('24-hour timeline', axis + (shown.length ? shown.map(rowFor).join('') : UI.empty('No agents', 'Change the team filter.')) + '<div class="legend" style="margin-top:1.2rem">' + leg.map(function (l) { return '<span style="display:inline-flex;align-items:center;gap:.5rem;margin-right:1.4rem"><i style="background:' + l[1] + ';display:inline-block;width:1.2rem;height:1.2rem;border-radius:.5rem;box-shadow:inset 0 0 0 1px var(--line2)"></i>' + l[0] + '</span>'; }).join('') + '</div>', { sub: 'Hover a block for detail. Click a talk, hold or wrap block to open the call. Idle time is scheduled work time without a call.' });
      ctx.el.addEventListener('change', function (e) {
        if (e.target.matches('[data-actd]')) { MCM.store.set('actDay', +e.target.value); ctx.refresh(); }
        else if (e.target.matches('[data-acta]')) { MCM.store.set('actAgent', e.target.value); ctx.refresh(); }
      });
      ctx.on('[data-call]', function (e, el) { MCM.drill.call(el.dataset.call); });
      ctx.on('[data-ag]', function (e, el) { e.preventDefault(); MCM.drill.agent(el.dataset.ag); });
    }

    /* ---------------- SUMMARY ---------------- */
    else {
      var list = MCM.query({ queues: [], teams: [], channel: 'all', dir: 'all' }), st = MCM.agentStats(list, R), stBy = {}; st.forEach(function (x) { stBy[x.agent.id] = x; });
      var firstD = Math.floor((R.from - TODAY) / T.day), lastD = Math.floor((R.to - 1 - TODAY) / T.day), rows = [], exc = [], capped = false;
      if (lastD - firstD > 31) { firstD = lastD - 31; capped = true; }
      var winSec = (R.to - R.from) / 1000;
      agents.forEach(function (a) {
        var s = stBy[a.id], g = s.agg, brk = 0, lunch = 0, sched = 0, work = 0;
        for (var dd = firstD; dd <= lastD; dd++) {
          var dsx = TODAY + dd * T.day, sh = MCM.shift(a, dsx); if (!sh) continue;
          sh.items.forEach(function (it) { var x = Math.max(it.from, R.from), y = Math.min(it.to, R.to); if (y <= x) return; var sec = (y - x) / 1000; sched += sec; if (it.type === 'work') work += sec; else if (it.type === 'break') brk += sec; else lunch += sec; });
          if (dsx <= NOW) MCM.adherence(a, dsx).exceptions.forEach(function (ex) { exc.push({ a: a, day: dsx, type: ex.type, min: ex.min }); });
        }
        var busy = g.talk + g.hold + g.wrap, avail = Math.max(0, work - busy), shiftTot = busy + avail + brk + lunch;
        rows.push({ a: a, talk: g.talk, hold: g.hold, wrap: g.wrap, avail: avail, brk: brk, lunch: lunch, off: Math.max(0, winSec - sched), shiftTot: shiftTot, occ: s.occupancy });
      });
      var sum = rows.reduce(function (t, r) { ['talk', 'hold', 'wrap', 'avail', 'brk', 'lunch'].forEach(function (k) { t[k] += r[k]; }); return t; }, { talk: 0, hold: 0, wrap: 0, avail: 0, brk: 0, lunch: 0 });
      var allTot = sum.talk + sum.hold + sum.wrap + sum.avail + sum.brk + sum.lunch || 1;
      var SEG = [['talk', 'Talk', COL.talk], ['hold', 'Hold', COL.hold], ['wrap', 'Wrap-up', COL.wrap], ['avail', 'Available', COL.available], ['brk', 'Break', COL.brk], ['lunch', 'Lunch', COL.lunch]];
      function stack(r) {
        var t = r.shiftTot || 1; return '<div class="tl" style="height:2.2rem;min-width:24rem">' + SEG.map(function (s) { return r[s[0]] > 0 ? '<i title="' + s[1] + ': ' + f.hm(r[s[0]]) + ' (' + (r[s[0]] / t * 100).toFixed(1) + '%)" style="width:' + r[s[0]] / t * 100 + '%;background:' + s[2] + '"></i>' : ''; }).join('') + '</div>';
      }
      ctx.el.innerHTML = '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>Period: ' + esc(R.label) + (capped ? ' (exceptions and schedule time limited to the last 31 days)' : '') + '. Bars show how scheduled shift time was spent; off-shift time is listed in the table. Talk, hold and wrap come from the same calls as the Calls and Agents pages.</span></div>' +
        '<div class="grid g5">' + SEG.slice(0, 5).map(function (s) { return UI.kpi({ label: s[1], value: f.pct(sum[s[0]] / allTot * 100, 1), sub: f.hm(sum[s[0]]) }); }).join('') + '</div>' +
        '<div class="mt">' + UI.card('Time in state per agent', rows.map(function (r) { return '<div style="display:grid;grid-template-columns:16rem 1fr 6rem;gap:1rem;align-items:center;padding:.35rem 0"><b>' + esc(r.a.name) + '</b>' + stack(r) + '<span class="muted" style="text-align:right">' + f.hm(r.shiftTot) + '</span></div>'; }).join('') + '<div class="legend" style="margin-top:1rem">' + SEG.map(function (s) { return '<span style="display:inline-flex;align-items:center;gap:.5rem;margin-right:1.4rem"><i style="background:' + s[2] + ';display:inline-block;width:1.2rem;height:1.2rem;border-radius:.5rem"></i>' + s[1] + '</span>'; }).join('') + '</div>') + '</div>' +
        '<div class="mt">' + UI.card('Time in state - table', '<div id="as-t"></div>', { flush: true }) + '</div>' +
        '<div class="mt">' + UI.card('Schedule exceptions', '<div id="as-x"></div>', { flush: true, sub: 'Late starts, long breaks and early leaves from the adherence engine. Click a row to open the agent.' }) + '</div>';
      function hmv(k) { return function (r) { return f.hm(r[k]); }; }
      function cn(k, label) { return { k: k, label: label, r: 1, html: hmv(k), val: function (r) { return r[k]; }, csv: function (r) { return Math.round(r[k] / 60); } }; }
      UI.table(UI.$('#as-t', ctx.el), {
        id: 'asum', noun: 'agents', csv: csvName('agent-time-in-state'), pageSize: 15, rows: rows, sort: 'talk', onRow: function (r) { MCM.drill.agent(r.a.id); },
        cols: [{ k: 'n', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b>'; }, val: function (r) { return r.a.name; } }, { k: 'tm', label: 'Team', html: function (r) { return esc(r.a.team); }, val: function (r) { return r.a.team; } },
          cn('talk', 'Talk'), cn('hold', 'Hold'), cn('wrap', 'Wrap-up'), cn('avail', 'Available'), cn('brk', 'Break'), cn('lunch', 'Lunch'), cn('off', 'Off shift'),
          { k: 'occ', label: 'Occupancy', r: 1, html: function (r) { return f.pct(r.occ, 0); }, val: function (r) { return r.occ; } }]
      });
      UI.table(UI.$('#as-x', ctx.el), {
        id: 'aexc', noun: 'exceptions', csv: csvName('schedule-exceptions'), pageSize: 12, rows: exc, sort: 'day', onRow: function (r) { MCM.drill.agent(r.a.id); },
        emptyTitle: 'No exceptions', emptySub: 'Everyone followed their schedule in this period.',
        cols: [{ k: 'day', label: 'Date', html: function (r) { return T.date(r.day); }, val: function (r) { return r.day; } }, { k: 'n', label: 'Agent', html: function (r) { return '<b>' + esc(r.a.name) + '</b>'; }, val: function (r) { return r.a.name; } }, { k: 'tm', label: 'Team', html: function (r) { return esc(r.a.team); }, val: function (r) { return r.a.team; } },
          { k: 'type', label: 'Exception', html: function (r) { return UI.tag(r.type, r.type === 'Early leave' ? 'warn' : 'bad'); }, val: function (r) { return r.type; } }, { k: 'min', label: 'Minutes', r: 1, html: function (r) { return r.min + ' min'; }, val: function (r) { return r.min; } }]
      });
    }
  }
});
