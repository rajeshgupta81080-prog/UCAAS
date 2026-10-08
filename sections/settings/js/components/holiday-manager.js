/* HolidayManager: public-holiday import with real rules (fixed dates, "Nth weekday", Easter-based, weekend shifting),
   an inline add/edit form (first day, last day, repeats every year, reduced hours), a card list and copy-to-lines. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, D = CRX.data;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- dates ---------- */
  function pd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()); }
  function dmy(s) { var d = pd(s); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function range(a, b) {
    if (!b || b === a) return dmy(a);
    var x = pd(a), y = pd(b);
    if (x.getFullYear() !== y.getFullYear()) return dmy(a) + ' – ' + dmy(b);
    if (x.getMonth() === y.getMonth()) return x.getDate() + '–' + y.getDate() + ' ' + MON[x.getMonth()] + ' ' + x.getFullYear();
    return x.getDate() + ' ' + MON[x.getMonth()] + ' – ' + y.getDate() + ' ' + MON[y.getMonth()] + ' ' + x.getFullYear();
  }
  function validDate(s) { // compare calendar parts, not toISOString (which shifts by the UTC offset)
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) return false;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3];
  }
  function t12(hhmm) { // '13:00' -> '1:00 PM'
    var m = /^(\d{2}):(\d{2})$/.exec(hhmm || ''); if (!m) return '';
    var hr = +m[1], ap = hr >= 12 ? 'PM' : 'AM'; hr = hr % 12 || 12; return hr + ':' + m[2] + ' ' + ap;
  }
  function mins(hhmm) { var m = /^(\d{2}):(\d{2})$/.exec(hhmm || ''); return m ? (+m[1]) * 60 + (+m[2]) : NaN; }
  UI.holidayHoursError = function (x) { // used by the tab-level validation too
    if (!x.reduced) return '';
    if (isNaN(mins(x.opens)) || isNaN(mins(x.closes))) return 'Set when you open and when you close.';
    return mins(x.closes) <= mins(x.opens) ? 'Closing time must be later than opening time.' : '';
  };
  function nth(y, m, dow, n) { // n = 1..4, or -1 for the last one
    if (n > 0) { var d = new Date(y, m - 1, 1); return new Date(y, m - 1, 1 + (dow - d.getDay() + 7) % 7 + (n - 1) * 7); }
    var last = new Date(y, m, 0); return new Date(y, m - 1, last.getDate() - (last.getDay() - dow + 7) % 7);
  }
  function easter(y) { // Gregorian computus
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), gg = Math.floor((b - f + 1) / 3),
      hh = (19 * a + b - d - gg + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451),
      mo = Math.floor((hh + l - 7 * m + 114) / 31), day = ((hh + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, day);
  }

  /* ---------- public holiday rules per country ---------- */
  function F(md, name) { return { t: 'fixed', md: md, name: name }; }
  function N(month, dow, n, name) { return { t: 'nth', month: month, dow: dow, n: n, name: name }; }
  function E(off, name) { return { t: 'easter', off: off, name: name }; }
  var RULES = {
    IN: [F('01-26', 'Republic Day'), F('08-15', 'Independence Day'), F('10-02', 'Gandhi Jayanti'), F('12-25', 'Christmas Day')],
    US: [F('01-01', 'New Year’s Day'), N(1, 1, 3, 'Martin Luther King Jr. Day'), N(5, 1, -1, 'Memorial Day'), F('06-19', 'Juneteenth'), F('07-04', 'Independence Day'), N(9, 1, 1, 'Labor Day'), F('11-11', 'Veterans Day'), N(11, 4, 4, 'Thanksgiving Day'), F('12-25', 'Christmas Day')],
    GB: [F('01-01', 'New Year’s Day'), E(-2, 'Good Friday'), E(1, 'Easter Monday'), N(5, 1, 1, 'Early May bank holiday'), N(5, 1, -1, 'Spring bank holiday'), N(8, 1, -1, 'Summer bank holiday'), F('12-25', 'Christmas Day'), F('12-26', 'Boxing Day')],
    CA: [F('01-01', 'New Year’s Day'), E(-2, 'Good Friday'), F('07-01', 'Canada Day'), N(9, 1, 1, 'Labour Day'), F('11-11', 'Remembrance Day'), N(10, 1, 2, 'Thanksgiving Day'), F('12-25', 'Christmas Day'), F('12-26', 'Boxing Day')],
    AU: [F('01-01', 'New Year’s Day'), F('01-26', 'Australia Day'), E(-2, 'Good Friday'), E(1, 'Easter Monday'), F('04-25', 'Anzac Day'), F('12-25', 'Christmas Day'), F('12-26', 'Boxing Day')],
    DE: [F('01-01', 'Neujahr'), E(-2, 'Karfreitag'), E(1, 'Ostermontag'), F('05-01', 'Tag der Arbeit'), F('10-03', 'Tag der Deutschen Einheit'), F('12-25', 'Weihnachtstag'), F('12-26', 'Zweiter Weihnachtstag')],
    FR: [F('01-01', 'Jour de l’An'), E(1, 'Lundi de Pâques'), F('05-01', 'Fête du Travail'), F('07-14', 'Fête nationale'), F('11-11', 'Armistice 1918'), F('12-25', 'Noël')],
    SG: [F('01-01', 'New Year’s Day'), E(-2, 'Good Friday'), F('05-01', 'Labour Day'), F('08-09', 'National Day'), F('12-25', 'Christmas Day')],
    AE: [F('01-01', 'New Year’s Day'), F('12-02', 'National Day'), F('12-03', 'National Day (second day)')]
  };
  var SHIFT = { GB: 'next-mon', CA: 'next-mon', AU: 'next-mon', US: 'nearest' }; // fixed-date holidays on a weekend move to a working day

  var NOTES = {
    IN: 'The three national holidays and Christmas. The Hindu, Sikh, Jain and Buddhist festivals — Diwali, Holi, Dussehra, Janmashtami, Guru Nanak Jayanti, Mahavir Jayanti, Buddha Purnima — and the Islamic festivals follow lunar calendars, which cannot be worked out from a rule, so they are not here. Add those by hand.',
    US: 'Federal holidays: the fixed dates, plus the ones that fall on a set weekday (Martin Luther King Jr. Day, Memorial Day, Labor Day, Thanksgiving). A fixed holiday that lands on a weekend is moved to the nearest working day. State and local holidays are not here. Add those by hand.',
    GB: 'Bank holidays for England and Wales: New Year’s Day, Good Friday, Easter Monday, the May and August bank holidays, Christmas Day and Boxing Day. A holiday on a weekend moves to the next Monday. Scotland and Northern Ireland have different days and are not here.',
    CA: 'Federal holidays: New Year’s Day, Good Friday, Canada Day, Labour Day, Thanksgiving, Remembrance Day, Christmas Day and Boxing Day. A holiday on a weekend moves to the next Monday. Provincial holidays (Family Day, Civic Holiday and others) differ by province and are not here. Add those by hand.',
    AU: 'National holidays. A holiday on a weekend moves to the next Monday. State and territory holidays (such as Labour Day and Melbourne Cup Day) differ and are not here. Add those by hand.',
    DE: 'Holidays observed in every state. Holidays that only some states keep (Epiphany, Corpus Christi, Reformation Day, All Saints’ Day) are not here. Add those by hand.',
    FR: 'The fixed national holidays and Easter Monday. Ascension, Whit Monday, 8 May, the Assumption and All Saints’ Day are not here yet. Add those by hand.',
    SG: 'The fixed national holidays and Good Friday. Festivals that follow lunar calendars — Chinese New Year, Hari Raya, Deepavali, Vesak — cannot be worked out from a rule, so they are not here. Add those by hand.',
    AE: 'The fixed national holidays. Islamic holidays depend on the moon sighting, so they are not here. Add those by hand.'
  };

  /** All public holidays of a country in a year, as holiday items. */
  function publicHolidays(cc, year) {
    var rules = RULES[cc]; if (!rules) return null;
    var taken = {}, out = [];
    rules.forEach(function (r) {
      var d, orig = null;
      if (r.t === 'fixed') {
        var p = r.md.split('-'); d = new Date(year, +p[0] - 1, +p[1]); var dow = d.getDay();
        if (SHIFT[cc] && (dow === 0 || dow === 6)) {
          orig = iso(d);
          d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (SHIFT[cc] === 'nearest' ? (dow === 6 ? -1 : 1) : (dow === 6 ? 2 : 1)));
          while (taken[iso(d)]) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); // two holidays never share a day
        }
      } else if (r.t === 'nth') d = nth(year, r.month, r.dow, r.n);
      else { var e = easter(year); d = new Date(e.getFullYear(), e.getMonth(), e.getDate() + r.off); }
      taken[iso(d)] = 1;
      out.push({ id: U.uid('hol'), name: r.name, from: iso(d), to: iso(d), repeats: r.t === 'fixed', reduced: false, source: 'Public', country: cc, moves: r.t !== 'fixed', observedOf: orig });
    });
    return out;
  }

  UI.HolidayManager = function (ctx) {
    var q = '', country = ctx.get('country') || 'IN', year = 2026, editId = null, formOpen = false;
    var listHost = h('div.hol-list'), counter = h('span.cnt');

    function items() { return ctx.get('items').map(function (x) { if (!x.from && x.date) { x.from = x.date; x.to = x.date; } return x; }); }
    function savedById() { var m = {}; ctx.saved().items.forEach(function (x) { m[x.id] = x; }); return m; }
    function setItems(list) { ctx.set('items', list); }

    /** Scroll the newly added row(s) into view and flash them, so it is obvious where they landed (always the bottom). */
    function reveal(ids) {
      setTimeout(function () {
        var rows = ids.map(function (id) { return listHost.querySelector('[data-id="' + id + '"]'); }).filter(Boolean);
        if (!rows.length) return;
        rows[rows.length - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        rows.forEach(function (r) { r.classList.add('flash'); setTimeout(function () { r.classList.remove('flash'); }, 1800); });
      }, 60);
    }

    /* ---------- import ---------- */
    function freshFor(cc, yr) { // holidays of that country/year that are not in the list yet (null: no built-in list)
      var set = cc ? publicHolidays(cc, yr) : null; if (!set) return null;
      var have = {}; items().forEach(function (x) { have[x.name.toLowerCase() + '|' + x.from] = 1; });
      return set.filter(function (x) { return !have[x.name.toLowerCase() + '|' + x.from]; });
    }
    function addPublic() {
      var fresh = freshFor(country, year); if (!fresh || !fresh.length) return;
      setItems(items().concat(fresh)); paint(); reveal(fresh.map(function (x) { return x.id; }));
      UI.toast(U.plural(fresh.length, 'public holiday') + ' added for ' + D.country(country).name + ' ' + year + '.', 'ok');
    }
    /** Button text, enabled state and the explanatory note follow the chosen country and year. */
    function refreshImport() {
      var fresh = freshFor(country, year), name = country ? D.country(country).name : '';
      importBtn.querySelector('span').textContent = !country ? 'Add holidays' : !fresh ? 'No list yet' : fresh.length ? 'Add ' + U.plural(fresh.length, 'holiday') : 'Already added';
      importBtn.disabled = !fresh || !fresh.length;
      CRX.setKids(importNote, !country ? h('span', 'Choose a country to see which public holidays are included.')
        : NOTES[country] ? [h('b', name + ': '), NOTES[country]] : [h('b', name + ': '), 'There is no built-in list for this country yet. Add its holidays by hand.']);
    }

    /* ---------- add / edit holiday: one form, opened in a modal ---------- */
    var modal = null;
    function closeForm() { if (modal) modal.close(); }
    function openForm(id) {
      editId = id || null; formOpen = true; paint();   // paint() marks the row being edited behind the modal
      var cur = editId ? items().filter(function (x) { return x.id === editId; })[0] : null;
      var st = cur ? { name: cur.name, from: cur.from, to: cur.to === cur.from ? '' : cur.to, repeats: cur.repeats, reduced: cur.reduced }
                   : { name: '', from: '', to: '', repeats: true, reduced: false };
      st.opens = (cur && cur.opens) || '09:00'; st.closes = (cur && cur.closes) || '13:00';
      var err = { name: h('div.fld-e', { role: 'alert' }), from: h('div.fld-e', { role: 'alert' }), to: h('div.fld-e', { role: 'alert' }), time: h('div.fld-e', { role: 'alert' }) };
      var nameIn = UI.Input({ id: 'hf-name', value: st.name, maxlength: 60, placeholder: 'e.g. Christmas Day', label: 'Name', onInput: function (v) { st.name = v; err.name.textContent = ''; } });
      var fromIn = UI.Input({ id: 'hf-from', type: 'date', value: st.from, label: 'First day', onInput: function (v) { st.from = v; err.from.textContent = ''; } });
      var toIn = UI.Input({ id: 'hf-to', type: 'date', value: st.to, label: 'Last day (leave empty for the same day)', onInput: function (v) { st.to = v; err.to.textContent = ''; } });
      var opensIn = UI.Input({ id: 'hf-opens', type: 'time', value: st.opens, label: 'Opens at', cls: 'inp-time', onInput: function (v) { st.opens = v; err.time.textContent = ''; } });
      var closesIn = UI.Input({ id: 'hf-closes', type: 'time', value: st.closes, label: 'Closes at', cls: 'inp-time', onInput: function (v) { st.closes = v; err.time.textContent = ''; } });
      var timeBox = h('div.hf-times', { hidden: !st.reduced },
        h('div.fld', h('label.fld-l', { for: 'hf-opens' }, 'Opens at'), opensIn),
        h('div.fld', h('label.fld-l', { for: 'hf-closes' }, 'Closes at'), closesIn), err.time);
      function submit() {
        Object.keys(err).forEach(function (k) { err[k].textContent = ''; });
        var name = st.name.trim(), bad = null;
        if (!name) { err.name.textContent = 'Enter a name for the holiday.'; bad = bad || nameIn; }
        if (!st.from) { err.from.textContent = 'Pick the first day.'; bad = bad || fromIn; }
        else if (!validDate(st.from)) { err.from.textContent = 'That is not a valid date.'; bad = bad || fromIn; }
        var to = st.to || st.from;
        if (st.to && !validDate(st.to)) { err.to.textContent = 'That is not a valid date.'; bad = bad || toIn; }
        else if (st.from && validDate(st.from) && validDate(to) && pd(to) < pd(st.from)) { err.to.textContent = 'The last day cannot be before the first day.'; bad = bad || toIn; }
        if (!bad && items().some(function (x) { return x.id !== editId && x.name.toLowerCase() === name.toLowerCase() && x.from === st.from; })) { err.name.textContent = 'There is already a holiday with this name on that day.'; bad = nameIn; }
        var hoursErr = UI.holidayHoursError({ reduced: st.reduced, opens: st.opens, closes: st.closes });
        if (hoursErr) { err.time.textContent = hoursErr; bad = bad || closesIn; }
        if (bad) { bad.focus(); return; }
        var item = { id: cur ? cur.id : U.uid('hol'), name: name, from: st.from, to: to, repeats: st.repeats, reduced: st.reduced, opens: st.reduced ? st.opens : '', closes: st.reduced ? st.closes : '', source: cur ? cur.source : 'Custom', country: cur ? cur.country : '', moves: cur ? cur.moves : false, observedOf: cur ? cur.observedOf : null };
        setItems(cur ? items().map(function (x) { return x.id === cur.id ? item : x; }) : items().concat([item]));
        closeForm(); UI.toast(cur ? '“' + name + '” updated.' : '“' + name + '” added.', 'ok');
        if (!cur) reveal([item.id]);
      }
      // an option card: title + one-line explanation + switch (extra content, like the opening hours, lives inside the card)
      function tile(title, desc, key, after, extra) {
        var id = U.uid('ht');
        return h('div.hf-tile' + (st[key] ? '.on' : ''), h('div.hf-tile-top', h('div.hf-tile-tx', h('div.hf-tile-t', { id: id }, title), h('div.hf-tile-d', desc)),
          UI.Toggle({ checked: st[key], labelledby: id, onChange: function (v) { st[key] = v; after && after(v); } })), extra || null);
      }
      var repeatTile = (function () {
        var id = U.uid('ht');
        return h('div.hf-tile', h('div.hf-tile-top', h('div.hf-tile-tx', h('div.hf-tile-t', { id: id }, 'How often'), h('div.hf-tile-d', 'Once: this date only. Every year: applies again on the same date each year.')),
          UI.Seg({ cls: 'pill', label: 'How often this holiday applies', value: st.repeats ? 'every' : 'once', options: [{ value: 'once', label: 'Once' }, { value: 'every', label: 'Every year' }], onChange: function (v) { st.repeats = v === 'every'; } })));
      })();
      var reducedTile;
      reducedTile = tile('Open with reduced hours', 'Open for part of the day instead of shutting all day.', 'reduced', function (v) {
        reducedTile.classList.toggle('on', v); timeBox.hidden = !v; if (!v) err.time.textContent = ''; else opensIn.focus();
      }, timeBox);
      var form = h('form.hform-m', { onSubmit: function (e) { e.preventDefault(); submit(); }, 'aria-label': cur ? 'Edit holiday' : 'New holiday' },
        h('div.hf-grid',
          h('div.fld.hf-name', h('label.fld-l', { for: 'hf-name' }, 'Name ', h('span.req', '*')), nameIn, err.name),
          h('div.fld', h('label.fld-l', { for: 'hf-from' }, 'First day ', h('span.req', '*')), fromIn, err.from),
          h('div.fld', h('label.fld-l', { for: 'hf-to' }, 'Last day ', h('span.opt', '(optional)')), toIn, err.to)),
        h('div.hf-opts',
          repeatTile,
          reducedTile),
        h('p.hf-hint', 'Leave the last day empty for a single-day holiday. Choose “Once” for anything that moves — Thanksgiving, Easter, Diwali, Eid — and add next year’s date when you know it.'),
        h('button', { type: 'submit', hidden: true, tabindex: '-1', 'aria-hidden': 'true' }));   // lets Enter submit from any field
      modal = UI.Modal({ title: cur ? 'Edit holiday' : 'New holiday', desc: cur ? 'Change the details, then save.' : 'A day (or run of days) your company is closed.', size: 'md', body: form, initialFocus: '#hf-name', persistent: true, escClose: true, // a stray click on the backdrop must not discard what was typed
        onClose: function () { modal = null; formOpen = false; editId = null; paint(); },
        footer: [UI.Button({ label: 'Cancel', kind: 'secondary', onClick: closeForm }), UI.Button({ label: cur ? 'Save changes' : 'Add holiday', kind: 'primary', onClick: submit })] });
    }

    /* ---------- list ---------- */
    function remove(row) {
      setItems(items().filter(function (x) { return x.id !== row.id; })); if (editId === row.id) closeForm(); paint();
      UI.toast('“' + row.name + '” removed.', 'info', { action: { label: 'Undo', onClick: function () { setItems(items().concat([row])); paint(); } } });
    }
    function paint() {
      var all = items(), sv = savedById();
      counter.textContent = U.plural(all.length, 'holiday');
      var rows = all.filter(function (x) { return !q || (x.name + ' ' + range(x.from, x.to)).toLowerCase().indexOf(q) >= 0; });  // insertion order: whatever is added last appears last
      toolbar.hidden = !all.length;
      if (!all.length) { listHost.replaceChildren(UI.EmptyState({ icon: 'calendar', title: 'No company holidays yet', body: 'Holidays are days your company is closed; calls follow the closed-hours behaviour on those days.',
        why: 'Nothing has been added. Add a country’s public holidays above, or add one by hand.', actions: [UI.Button({ label: 'Add holiday', icon: 'plus', kind: 'primary', onClick: function () { openForm(); } })] })); }
      else if (!rows.length) listHost.replaceChildren(UI.EmptyState({ icon: 'search', title: 'No holidays match', body: 'Try a different search.' }));
      else listHost.replaceChildren.apply(listHost, rows.map(function (r) {
        var s = sv[r.id], tag = !s ? UI.Pill('New', 'info') : JSON.stringify(s) !== JSON.stringify(r) ? UI.Pill('Edited', 'warn') : null;
        var note = r.observedOf ? 'Observed on this day; the holiday itself is ' + dmy(r.observedOf) : r.moves ? 'Falls on a different date each year' : null;
        return h('div.hol' + (editId === r.id ? '.editing' : ''), { dataset: { id: r.id } },
          h('div.hol-l', h('div.hol-n', r.name, tag),
            // what the day looks like sits with the date, not among the action buttons
            h('div.hol-d', range(r.from, r.to), h('span.hol-sep', ' · '), r.reduced ? h('span.hol-h.part', icon('clock', 12), r.opens && r.closes ? 'Open ' + t12(r.opens) + ' – ' + t12(r.closes) : 'Reduced hours') : h('span.hol-h', 'Shut all day')),
            note ? h('div.hol-note', note) : null),
          h('div.hol-r', UI.Seg({ cls: 'pill', label: 'How often ' + r.name + ' applies', value: r.repeats ? 'every' : 'once',
              options: [{ value: 'once', label: 'Once' }, { value: 'every', label: 'Every year' }],
              onChange: function (v) { setItems(items().map(function (x) { if (x.id === r.id) { var y = U.clone(x); y.repeats = v === 'every'; return y; } return x; })); paint(); } }),
            UI.IconButton('edit', 'Edit ' + r.name, function () { openForm(r.id); }), UI.IconButton('trash', 'Remove ' + r.name, function () { remove(r); })));
      }));
      refreshImport();
      copyNote.textContent = !ctx.saved().items.length ? 'Save company holidays first' : (ctx.get('copiedTo') || []).length ? 'Copying to ' + U.plural(ctx.get('copiedTo').length, 'line') : '';
    }

    /* ---------- copy to lines: grouped picker, applied explicitly ---------- */
    var linesOpen = false, sel = {};
    var GROUPS = [
      { key: 'queues', title: 'Call queues', hint: 'Holidays borrow the queue’s holiday action, or its closed-hours action.', rows: D.queues.map(function (x) { return { id: x.id, name: x.name + ' queue', sub: 'Extension ' + x.ext }; }) },
      { key: 'ivrs', title: 'IVR menus', hint: 'Holidays borrow what the menu already does outside opening hours.', rows: D.ivrs.map(function (x) { return { id: x.id, name: x.name, sub: 'Extension ' + x.ext, flag: x.noAction ? 'No closed-hours action' : '' }; }) },
      { key: 'people', title: 'People', hint: 'Holidays borrow the person’s closed-hours action.', rows: D.users.map(function (x) { return { id: x.id, name: x.name, sub: 'Extension ' + x.ext }; }) },
      { key: 'numbers', title: 'Numbers', hint: 'Only numbers that already have call handling set up can take a holiday.', rows: D.numbers.filter(function (x) { return x.handled; }).map(function (x) { return { id: x.id, name: x.label, sub: x.number }; }) }
    ];
    var linesHost = h('div.lp', { hidden: true });
    function picked() { return Object.keys(sel).filter(function (k) { return sel[k]; }); }
    function holds(id) { return (ctx.saved().copiedTo || []).indexOf(id) >= 0 ? ctx.saved().items.length : 0; }
    function applyLines() {
      var ids = picked(), have = (ctx.get('copiedTo') || []).slice();
      if (!ids.length) return;
      ids.forEach(function (id) { if (have.indexOf(id) < 0) have.push(id); });
      ctx.set('copiedTo', have); sel = {}; paint(); paintLines();
      UI.toast('Holidays will be copied to ' + U.plural(ids.length, 'line') + ' when you save.', 'ok');
    }
    function paintLines() {
      var n = picked().length, ready = ctx.saved().items.length > 0;
      var vm = h('div.lp-sw', UI.Toggle({ checked: !!ctx.get('ownVoicemail'), labelledby: 'lp-vm-t', onChange: function (v) { ctx.set('ownVoicemail', v); } }),
        h('div', h('b#lp-vm-t', 'For people with no closed-hours action, use their own voicemail'),
          h('p', 'Off by default. A person’s own mailbox is the one fallback that means what it says; queues, menus and numbers are always skipped instead, because choosing what they do on a holiday is a routing decision, not a default.')));
      var groups = GROUPS.map(function (g) {
        var ids = g.rows.map(function (r) { return r.id; }), on = ids.filter(function (i) { return sel[i]; }).length;
        var head = UI.Checkbox({ checked: ids.length && on === ids.length, disabled: !ids.length, ariaLabel: 'Select all ' + g.title,
          onChange: function (c) { ids.forEach(function (i) { sel[i] = c; }); paintLines(); } });
        head.indeterminate = on > 0 && on < ids.length;
        return h('section.lp-g', h('div.lp-gh', h('label.lp-gt', head, h('b', g.title), h('span.mut', '(' + ids.length + ')')), h('span.lp-gd', g.hint)),
          ids.length ? h('div.lp-rows', { tabindex: ids.length > 4 ? '0' : null, role: 'group', 'aria-label': g.title }, g.rows.map(function (r) {
            var held = holds(r.id);
            return h('label.lp-r', UI.Checkbox({ checked: !!sel[r.id], ariaLabel: r.name, onChange: function (c) { sel[r.id] = c; paintLines(); } }),
              h('span.lp-n', h('b', r.name), h('small', r.sub)), r.flag ? h('span.lp-f', r.flag) : held ? h('span.lp-f', 'Already holds ' + held) : null);
          })) : h('div.lp-none', 'None on this account.'));
      });
      var go = UI.Button({ label: n ? 'Apply to ' + U.plural(n, 'line') : 'Apply to 0 lines', kind: 'primary', disabled: !n || !ready, onClick: applyLines });
      CRX.setKids(linesHost, [vm, groups,
        h('div.lp-foot', h('span', n + (n === 1 ? ' line' : ' lines') + ' selected'), go),
        h('p.lp-note', ready ? 'Lines are saved one at a time, not all at once, so a big run does not hit the switch in one burst. You can stop part-way — the lines already saved keep their holidays.' : 'Add and save company holidays first; there is nothing to copy yet.')]);
    }
    function toggleLines() {
      linesOpen = !linesOpen; linesHost.hidden = !linesOpen; if (linesOpen) paintLines();
      copyBtn.querySelector('span').textContent = linesOpen ? 'Hide lines' : 'Choose lines';
      copyBtn.setAttribute('aria-expanded', String(linesOpen));
    }

    var addBtn = UI.Button({ label: 'Add holiday', icon: 'plus', kind: 'secondary', size: 'sm', onClick: function () { openForm(); } });
    var importBtn = UI.Button({ label: 'Add holidays', icon: 'plus', kind: 'primary', onClick: addPublic });
    var importNote = h('p.hol-cnote', { 'aria-live': 'polite' });
    var yrSel = UI.Select({ options: [2025, 2026, 2027, 2028], value: year, label: 'Year', onChange: function (v) { year = Number(v); refreshImport(); } });
    var cSel = UI.Select({ options: CRX.countryOptions('Select a country…'), value: country, label: 'Country', onChange: function (v) { country = v; if (v) ctx.set('country', v); refreshImport(); } });
    var copyBtn = UI.Button({ label: 'Choose lines', kind: 'secondary', size: 'sm', cls: 'cbtn-disc', expanded: false, onClick: toggleLines }), copyNote = h('span.mut');
    copyBtn.appendChild(icon('chevR', 14));
    var searchIn = UI.Input({ placeholder: 'Search holidays…', label: 'Search holidays', onInput: function (v) { q = v.trim().toLowerCase(); paint(); } });
    var toolbar = h('div.tb-s.tb-head', icon('search', 14), searchIn); // search lives in the card header, not on its own row

    var root = h('div.stack', { dataset: { setting: 'holidays' } },
      UI.Banner({ tone: 'info', compact: true, title: 'Judged in the company time zone', children: 'On a holiday the company is treated as closed. Holidays use the time zone set in Phone rules.' }),
      UI.Card({ title: 'Add a country’s public holidays', desc: 'Fixed dates, moving ones (like Thanksgiving or Easter) and weekend shifts are worked out for the year you pick.',
        children: [h('div.hol-add', h('div.fld', h('label.fld-l', 'Country'), cSel), h('div.fld', h('label.fld-l', 'Year'), yrSel), importBtn), importNote] }),
      UI.Card({ title: 'Company holidays', desc: 'Days your company is closed.', center: toolbar, actions: [counter, addBtn],
        children: [listHost] }),
      UI.Card({ title: ['Copy these holidays onto your lines', h('span.opt-t', 'optional')], desc: 'Optional. Show these dates on each line’s own screen.', actions: [copyNote, copyBtn], children: [linesHost] }));
    root.repaint = paint;
    paint();
    return root;
  };
})(window);
