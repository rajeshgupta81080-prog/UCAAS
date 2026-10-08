/* MultiPicker + CountrySelector / UserSelector / QueueSelector: searchable listbox with removable chips. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util;

  /** o: {options:[{id,label,sub,disabledReason}], value:[ids], onChange(ids), placeholder, ariaLabel, emptyText, chipLabel(opt)} */
  UI.MultiPicker = function (o) {
    var value = (o.value || []).slice();
    var open = false, active = 0, query = '';
    var listId = U.uid('lb');
    var chips = h('div.mp-chips');
    var input = h('input.mp-in', { type: 'text', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': listId, 'aria-autocomplete': 'list',
      placeholder: o.placeholder || 'Search…', 'aria-label': o.ariaLabel || 'Search', autocomplete: 'off',
      onFocus: function () { show(true); }, onInput: function () { query = input.value; active = 0; show(true); }, onKeydown: key });
    var list = h('ul.mp-list', { id: listId, role: 'listbox', 'aria-multiselectable': 'true', hidden: true });
    var root = h('div.mp', { onClick: function (e) { if (e.target === root || e.target === chips) input.focus(); } }, chips, input, list);

    function byId(id) { return o.options.filter(function (x) { return x.id === id; })[0]; }
    function filtered() {
      var q = query.trim().toLowerCase();
      return o.options.filter(function (x) { return !q || (x.label + ' ' + (x.sub || '')).toLowerCase().indexOf(q) >= 0; });
    }
    function paintChips() {
      chips.replaceChildren.apply(chips, value.map(function (id) {
        var op = byId(id); if (!op) return null;
        return UI.Chip(o.chipLabel ? o.chipLabel(op) : op.label, function () { toggle(id); input.focus(); }, op.label);
      }).filter(Boolean));
    }
    function paintList() {
      var f = filtered();
      list.replaceChildren.apply(list, f.length ? f.map(function (op, i) {
        var sel = value.indexOf(op.id) >= 0;
        return h('li.mp-o' + (sel ? '.sel' : '') + (i === active ? '.act' : '') + (op.disabledReason ? '.dis' : ''), {
          role: 'option', 'aria-selected': String(sel), 'aria-disabled': op.disabledReason ? 'true' : null,
          onMousedown: function (e) { e.preventDefault(); if (!op.disabledReason) toggle(op.id); }
        }, h('span.mp-chk', sel ? icon('check', 12) : null), h('span.mp-ol', op.label), op.sub || op.disabledReason ? h('small', op.disabledReason || op.sub) : null);
      }) : [h('li.mp-none', o.emptyText || 'No matches')]);
      var a = list.querySelector('.act'); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    }
    function show(v) {
      open = v; list.hidden = !v; input.setAttribute('aria-expanded', String(v));
      if (v) paintList();
    }
    function toggle(id) {
      var i = value.indexOf(id);
      if (i >= 0) value.splice(i, 1); else { if (o.max && value.length >= o.max) { UI.toast('You can select up to ' + o.max + '.', 'warn'); return; } value.push(id); }
      paintChips(); if (open) paintList();
      o.onChange && o.onChange(value.slice());
    }
    function key(e) {
      var f = filtered();
      if (e.key === 'ArrowDown') { e.preventDefault(); show(true); active = Math.min(active + 1, f.length - 1); paintList(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); paintList(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (open && f[active] && !f[active].disabledReason) toggle(f[active].id); }
      else if (e.key === 'Escape') { if (open) { e.stopPropagation(); show(false); } }
      else if (e.key === 'Backspace' && !input.value && value.length) { toggle(value[value.length - 1]); }
    }
    input.addEventListener('blur', function () { setTimeout(function () { if (!root.contains(document.activeElement)) show(false); }, 100); });
    root.setValue = function (v) { value = v.slice(); paintChips(); if (open) paintList(); };
    paintChips();
    return root;
  };

  UI.CountrySelector = function (o) {
    return UI.MultiPicker({
      options: CRX.data.countries.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (c) { return { id: c.code, label: c.name, sub: c.region }; }),
      value: o.value, onChange: o.onChange, placeholder: o.placeholder || 'Search countries…', ariaLabel: o.ariaLabel || 'Countries', emptyText: 'No country matches your search'
    });
  };
  UI.UserSelector = function (o) {
    return UI.MultiPicker({
      options: CRX.data.users.map(function (u) {
        return { id: u.id, label: u.name, sub: 'ext ' + u.ext + ' · ' + u.role + (o.blockAdmins && u.role === 'Admin' ? '' : ''), disabledReason: o.blockAdmins && u.role === 'Admin' ? 'Admin — cannot be exempted' : null };
      }),
      value: o.value, onChange: o.onChange, placeholder: o.placeholder || 'Search by name, extension, email or role…', ariaLabel: o.ariaLabel || 'People', emptyText: 'No person matches your search'
    });
  };
  UI.QueueSelector = function (o) {
    return UI.MultiPicker({
      options: CRX.data.queues.map(function (q) { return { id: q.id, label: q.name }; }),
      value: o.value, onChange: o.onChange, placeholder: o.placeholder || 'Choose queues…', ariaLabel: o.ariaLabel || 'Queues', emptyText: 'No queue matches'
    });
  };
})(window);
