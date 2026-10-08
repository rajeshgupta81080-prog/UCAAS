/* ScheduleEditor: 24 hours / weekdays / custom schedule with multiple ranges, closed days and a week preview. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util;
  var DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];

  function mins(t) { var p = String(t || '').split(':'); return p.length === 2 ? (+p[0]) * 60 + (+p[1]) : NaN; }

  /** Effective weekly schedule as [{key,label,open,ranges:[{from,to}]}] for any mode. */
  var effective = UI.effectiveHours = function (hours) {
    return DAYS.map(function (d, i) {
      if (hours.mode === '24h') return { key: d[0], label: d[1], open: true, ranges: [{ from: '00:00', to: '24:00' }] };
      if (hours.mode === 'weekdays') return { key: d[0], label: d[1], open: i < 5, ranges: i < 5 ? [{ from: hours.weekdays.from, to: hours.weekdays.to }] : [] };
      var day = hours.days[d[0]];
      return { key: d[0], label: d[1], open: !!day.open, ranges: day.open ? day.ranges.slice() : [] };
    });
  };
  UI.hoursSummary = function (hours) {
    if (hours.mode === '24h') return 'Open 24 hours, every day';
    if (hours.mode === 'weekdays') return 'Mon–Fri ' + hours.weekdays.from + '–' + hours.weekdays.to + ' · Sat–Sun closed';
    var e = effective(hours).filter(function (d) { return d.open; });
    return e.length ? U.plural(e.length, 'day') + ' a week, custom ranges' : 'Closed every day';
  };

  /** Validation used by the Phone rules tab. Returns {path: message}. */
  UI.validateHours = function (hours) {
    var err = {};
    function bad(f, t) { var a = mins(f), b = mins(t); return isNaN(a) || isNaN(b) || a >= b; }
    if (hours.mode === 'weekdays' && bad(hours.weekdays.from, hours.weekdays.to)) err['hours.weekdays'] = 'Closing time must be later than opening time.';
    if (hours.mode === 'custom') {
      var any = false;
      DAYS.forEach(function (d) {
        var day = hours.days[d[0]];
        if (!day.open) return;
        any = true;
        if (!day.ranges.length) { err['hours.days.' + d[0]] = 'Add at least one time range or mark the day closed.'; return; }
        var sorted = day.ranges.slice().sort(function (a, b) { return mins(a.from) - mins(b.from); });
        for (var i = 0; i < sorted.length; i++) {
          if (bad(sorted[i].from, sorted[i].to)) { err['hours.days.' + d[0]] = 'Each range must close later than it opens.'; return; }
          if (i && mins(sorted[i].from) < mins(sorted[i - 1].to)) { err['hours.days.' + d[0]] = 'Time ranges overlap.'; return; }
        }
      });
      if (!any) err['hours.days'] = 'Every day is closed. Choose at least one open day, or use “Open 24 hours”.';
    }
    return err;
  };

  UI.ScheduleEditor = function (ctx, path, o) {
    o = o || {};
    var root = h('div.sched');
    function hours() { return ctx.get(path); }
    function tzLabel() {
      var tz = ctx.get(o.tzPath || 'location.timezone');
      return tz ? h('span.pill-s.pill-info', icon('clock', 12), tz.replace('_', ' ') + ' · now ' + CRX.tzNow(tz) + ' (' + CRX.tzOffset(tz) + ')') : h('span.pill-s.pill-warn', icon('warn', 12), 'Time zone not set');
    }
    function errBox(p) { var m = ctx.err(p); return m ? h('div.fld-e.show', { role: 'alert' }, m) : null; }

    function time(val, label, onChange, invalid) {
      var i = h('input.inp.inp-time' + (invalid ? '.invalid' : ''), { type: 'time', value: val, 'aria-label': label, step: 300, onChange: function () { onChange(i.value || val); } });
      return i;
    }
    function bar(ranges) {
      var t = h('div.wk-track', { 'aria-hidden': 'true' });
      ranges.forEach(function (r) {
        var a = mins(r.from), b = r.to === '24:00' ? 1440 : mins(r.to);
        if (isNaN(a) || isNaN(b) || b <= a) return;
        t.appendChild(h('span.wk-seg', { style: { left: (a / 14.4) + '%', width: ((b - a) / 14.4) + '%' } }));
      });
      return t;
    }

    function render() {
      var hr = hours();
      CRX.setKids(root,
        h('div.sched-top',
          UI.Seg({ label: 'Opening hours mode', value: hr.mode, options: [{ value: '24h', label: 'Open 24 hours' }, { value: 'weekdays', label: 'Weekdays' }, { value: 'custom', label: 'Custom schedule' }],
            onChange: function (v) {
              if (v === 'custom' && hr.mode !== 'custom') {
                var eff = effective(hr); DAYS.forEach(function (d, i) { hr.days[d[0]] = { open: eff[i].open && !(hr.mode === '24h' && false), ranges: eff[i].ranges.map(function (r) { return { from: r.from, to: r.to === '24:00' ? '23:59' : r.to }; }) }; });
              }
              ctx.set(path + '.mode', v); render();
            } }),
          tzLabel()),
        hr.mode === '24h' ? UI.Banner({ tone: 'warn', compact: true, title: 'Nothing is ever treated as out of hours', children: 'While hours are 24/7, closed-hours destinations on numbers and queues never trigger.' }) : null,
        hr.mode === 'weekdays' ? h('div.sched-wd', h('span.sched-lbl', 'Monday – Friday'),
          time(hr.weekdays.from, 'Opens at', function (v) { ctx.set(path + '.weekdays.from', v); render(); }, !!ctx.err('hours.weekdays')),
          h('span.sched-to', 'to'),
          time(hr.weekdays.to, 'Closes at', function (v) { ctx.set(path + '.weekdays.to', v); render(); }, !!ctx.err('hours.weekdays')),
          h('span.muted', 'Saturday and Sunday are closed')) : null,
        hr.mode === 'weekdays' ? errBox('hours.weekdays') : null,
        hr.mode === 'custom' ? h('div.sched-days', errBox('hours.days'), DAYS.map(function (d, di) {
          var day = hr.days[d[0]];
          var rangesBox = h('div.sched-ranges');
          if (!day.open) rangesBox.appendChild(h('span.sched-closed', 'Closed'));
          else {
            day.ranges.forEach(function (r, ri) {
              rangesBox.appendChild(h('div.sched-range',
                time(r.from, d[1] + ' range ' + (ri + 1) + ' opens', function (v) { ctx.set(path + '.days.' + d[0] + '.ranges.' + ri + '.from', v); render(); }, !!ctx.err('hours.days.' + d[0])),
                h('span.sched-to', 'to'),
                time(r.to, d[1] + ' range ' + (ri + 1) + ' closes', function (v) { ctx.set(path + '.days.' + d[0] + '.ranges.' + ri + '.to', v); render(); }, !!ctx.err('hours.days.' + d[0])),
                day.ranges.length > 1 ? UI.IconButton('x', 'Remove range ' + (ri + 1) + ' on ' + d[1], function () { day.ranges.splice(ri, 1); ctx.set(path + '.days.' + d[0] + '.ranges', day.ranges); render(); }, { size: 'sm' }) : null));
            });
            if (day.ranges.length < 3) rangesBox.appendChild(UI.Button({ label: 'Add range', icon: 'plus', kind: 'ghost', size: 'sm', onClick: function () {
              var last = day.ranges[day.ranges.length - 1]; var from = last ? last.to : '09:00';
              day.ranges.push({ from: mins(from) >= 1260 ? '21:00' : from, to: '23:00' }); ctx.set(path + '.days.' + d[0] + '.ranges', day.ranges); render();
            } }));
          }
          return h('div.sched-day' + (ctx.err('hours.days.' + d[0]) ? '.bad' : ''),
            h('div.sched-dn', UI.Toggle({ checked: day.open, label: d[1] + ' open', onChange: function (v) {
              ctx.set(path + '.days.' + d[0] + '.open', v);
              if (v && !day.ranges.length) ctx.set(path + '.days.' + d[0] + '.ranges', [{ from: '09:00', to: '18:00' }]);
              render();
            } }), h('span', d[1]), di === 0 ? UI.Button({ label: 'Copy to weekdays', kind: 'ghost', size: 'sm', onClick: function () {
              ['tue', 'wed', 'thu', 'fri'].forEach(function (k) { hr.days[k] = U.clone(hr.days.mon); });
              ctx.set(path + '.days', hr.days); render(); UI.toast('Monday’s hours copied to Tuesday–Friday.', 'info');
            } }) : null),
            h('div.sched-dr', rangesBox, errBox('hours.days.' + d[0])));
        })) : null,
        h('div.wk', { role: 'img', 'aria-label': 'Weekly preview: ' + effective(hr).map(function (d) { return d.label + ' ' + (d.open ? d.ranges.map(function (r) { return r.from + ' to ' + r.to; }).join(', ') : 'closed'); }).join('; ') },
          h('div.wk-head', h('span', 'Week preview'), h('span.wk-scale', h('i', '00'), h('i', '06'), h('i', '12'), h('i', '18'), h('i', '24'))),
          effective(hr).map(function (d) { return h('div.wk-row', h('span.wk-d', d.label.slice(0, 3)), bar(d.ranges), h('span.wk-s', d.open ? (d.ranges.length ? d.ranges.map(function (r) { return r.from + '–' + r.to; }).join(', ') : '—') : 'Closed')); })),
        h('div.sched-note', icon('info', 14), h('span', h('b', 'When closed: '), 'a call goes to the closed-hours destination set on the number that was dialled. A number that rings a person and has no destination goes to that person’s voicemail. A number, menu or queue can also keep its own hours and close on its own even while the company is open.')));
    }
    render();
    root.refresh = render; // used when the time zone changes
    return root;
  };
})(window);
