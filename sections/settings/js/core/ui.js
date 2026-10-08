/* Reusable presentational components. All return DOM nodes; none own business state. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, U = CRX.util, UI = CRX.ui;

  /* ---------- status system ---------- */
  var STATUS = {
    active: ['Active', 'Enforced by the phone system today.'],
    soon: ['Coming soon', 'Can be saved, but nothing on a call reads it yet.'],
    app: ['In this app only', 'Controls this app only, not the phone switch.'],
    builtin: ['Built in', 'Ships with the system. Limits can be edited; it cannot be removed.']
  };
  UI.StatusBadge = function (kind, label) {
    var s = STATUS[kind] || [label || kind, ''];
    return h('span.badge.badge-' + kind, { title: s[1] }, label || s[0]);
  };
  /** Neutral/semantic pill. tone: neutral | ok | warn | danger | info | soon */
  UI.Pill = function (text, tone, ic) {
    return h('span.pill-s.pill-' + (tone || 'neutral'), ic ? icon(ic, 12) : null, text);
  };

  /* ---------- buttons ---------- */
  UI.Button = function (o) {
    var b = h('button.cbtn.cbtn-' + (o.kind || 'secondary') + (o.size ? '.cbtn-' + o.size : ''), {
      type: o.type || 'button', disabled: !!o.disabled, title: o.title, 'aria-label': o.ariaLabel,
      onClick: o.onClick, id: o.id, 'aria-haspopup': o.haspopup, 'aria-expanded': o.expanded
    }, o.icon ? icon(o.icon, o.iconSize || 15) : null, o.label ? h('span', o.label) : null);
    if (o.cls) b.className += ' ' + o.cls;
    return b;
  };
  UI.IconButton = function (name, label, onClick, extra) {
    return UI.Button(Object.assign({ icon: name, kind: 'ghost', size: 'sm', cls: 'cbtn-sq', ariaLabel: label, title: label, onClick: onClick }, extra || {}));
  };

  /* ---------- form controls ---------- */
  UI.Toggle = function (o) {
    var on = !!o.checked;
    var b = h('button.tgl' + (on ? '.on' : ''), {
      type: 'button', role: 'switch', 'aria-checked': String(on), 'aria-label': o.label, 'aria-labelledby': o.labelledby,
      'aria-describedby': o.describedby, disabled: !!o.disabled, id: o.id, title: o.title,
      onClick: function () {
        if (b.disabled) return;
        on = !on; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on));
        o.onChange && o.onChange(on);
      }
    }, h('span.tgl-knob'));
    return b;
  };
  UI.Select = function (o) {
    var opts = (o.options || []).map(function (x) { return typeof x === 'object' ? x : { value: x, label: x }; });
    var s = h('select.csel', { id: o.id, disabled: !!o.disabled, 'aria-label': o.label, 'aria-labelledby': o.labelledby, 'aria-describedby': o.describedby,
      onChange: function () { o.onChange && o.onChange(s.value); } },
      opts.map(function (x) { return h('option', { value: x.value, disabled: !!x.disabled }, x.label); }));
    s.value = o.value == null ? '' : o.value;
    if (o.cls) s.className += ' ' + o.cls;
    return s;
  };
  UI.Input = function (o) {
    var i = h('input.inp', {
      id: o.id, type: o.type || 'text', value: o.value == null ? '' : o.value, placeholder: o.placeholder, maxlength: o.maxlength,
      inputmode: o.inputmode, min: o.min, max: o.max, step: o.step, disabled: !!o.disabled, autocomplete: 'off', spellcheck: o.spellcheck === false ? 'false' : null,
      'aria-label': o.label, 'aria-describedby': o.describedby, readonly: o.readonly, name: o.name,
      onInput: function () { o.onInput && o.onInput(i.value, i); },
      onChange: function () { o.onChange && o.onChange(i.value, i); },
      onBlur: function () { o.onBlur && o.onBlur(i.value, i); },
      onKeydown: o.onKeydown
    });
    if (o.cls) i.className += ' ' + o.cls;
    if (!o.suffix && !o.prefix) return i;
    return h('div.inp-wrap', o.prefix ? h('span.inp-fix', o.prefix) : null, i, o.suffix ? h('span.inp-fix', o.suffix) : null);
  };
  UI.Textarea = function (o) {
    var t = h('textarea.inp.txa', { id: o.id, rows: o.rows || 3, placeholder: o.placeholder, maxlength: o.maxlength, 'aria-label': o.label, 'aria-describedby': o.describedby,
      onInput: function () { o.onInput && o.onInput(t.value, t); } });
    t.value = o.value || '';
    return t;
  };
  UI.Checkbox = function (o) {
    var c = h('input.chk', { type: 'checkbox', checked: !!o.checked, disabled: !!o.disabled, id: o.id, 'aria-label': o.ariaLabel,
      onChange: function () { o.onChange && o.onChange(c.checked); } });
    if (!o.label) return c;
    return h('label.chk-row', c, h('span', o.label));
  };
  UI.Seg = function (o) {
    var wrap = h('div.seg-c', { role: 'radiogroup', 'aria-label': o.label });
    if (o.cls) wrap.className += ' ' + o.cls;
    function paint() {
      wrap.innerHTML = '';
      o.options.forEach(function (op) {
        var sel = op.value === o.value;
        wrap.appendChild(h('button.seg-b' + (sel ? '.on' : ''), {
          type: 'button', role: 'radio', 'aria-checked': String(sel), disabled: !!o.disabled || !!op.disabled, tabindex: sel ? 0 : -1,
          onClick: function () { if (o.value === op.value) return; o.value = op.value; paint(); o.onChange && o.onChange(op.value); },
          onKeydown: function (e) {
            var i = o.options.findIndex(function (x) { return x.value === o.value; });
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (i + 1) % o.options.length;
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (i + o.options.length - 1) % o.options.length;
            else return;
            e.preventDefault(); o.value = o.options[i].value; paint(); o.onChange && o.onChange(o.value);
            wrap.querySelector('[tabindex="0"]').focus();
          }
        }, op.label));
      });
    }
    paint();
    return wrap;
  };
  UI.RadioCards = function (o) {
    var name = U.uid('rc');
    var wrap = h('div.rcards', { role: 'radiogroup', 'aria-label': o.label });
    o.options.forEach(function (op) {
      var r = h('input', { type: 'radio', name: name, value: op.value, checked: op.value === o.value, disabled: !!o.disabled || !!op.disabled,
        onChange: function () { o.value = op.value; o.onChange && o.onChange(op.value); paint(); } });
      var card = h('label.rcard', r, h('span.rcard-t', op.title, op.badge || null), op.desc ? h('span.rcard-d', op.desc) : null);
      wrap.appendChild(card);
    });
    function paint() { Array.prototype.forEach.call(wrap.children, function (c) { c.classList.toggle('sel', c.querySelector('input').checked); }); }
    paint();
    return wrap;
  };

  /** Label + control + hint + inline error slot. `path` ties the slot to store errors. */
  UI.Field = function (o) {
    var id = o.id || U.uid('f');
    var control = typeof o.control === 'function' ? o.control(id) : o.control;
    var f = h('div.fld' + (o.inline ? '.fld-inline' : ''), { dataset: o.path ? { errPath: o.tab + '::' + o.path } : {} },
      o.label ? h('label.fld-l', { for: id }, o.label, o.required ? h('span.req', { 'aria-hidden': 'true' }, ' *') : null, o.badge || null) : null,
      control,
      o.hint ? h('div.fld-h', { id: id + '-h' }, o.hint) : null,
      h('div.fld-e', { id: id + '-e', role: 'alert' }));
    return f;
  };
  /** Sync every error slot in `root` with the store (field-level validation). */
  UI.syncErrors = function (root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-err-path]'), function (f) {
      var p = f.dataset.errPath.split('::'), msg = (CRX.store.errors[p[0]] || {})[p[1]];
      var slot = f.querySelector('.fld-e');
      if (slot.textContent !== (msg || '')) slot.textContent = msg || '';
      f.classList.toggle('has-error', !!msg);
      Array.prototype.forEach.call(f.querySelectorAll('input,select,textarea,.tgl'), function (c) {
        if (msg) { c.setAttribute('aria-invalid', 'true'); c.setAttribute('aria-describedby', slot.id); } else c.removeAttribute('aria-invalid');
      });
    });
  };

  /* ---------- feedback ---------- */
  var BANNER_ICON = { info: 'info', warn: 'warn', danger: 'danger', ok: 'bolt', soon: 'clock', neutral: 'info' };
  UI.Banner = function (o) {
    var kids = Array.isArray(o.children) ? o.children : [o.children];
    return h('div.banner.banner-' + (o.tone || 'info') + (o.compact ? '.compact' : ''), { role: o.tone === 'danger' ? 'alert' : null },
      h('span.banner-i', icon(o.icon || BANNER_ICON[o.tone || 'info'], 16)),
      h('div.banner-b', o.title ? h('div.banner-t', o.title) : null, h('div.banner-x', kids), o.actions ? h('div.banner-a', o.actions) : null));
  };
  UI.WarningBanner = function (o) { return UI.Banner(Object.assign({ tone: 'warn' }, o)); };
  UI.InfoBanner = function (o) { return UI.Banner(Object.assign({ tone: 'info' }, o)); };
  UI.LiveImpact = function (text) {
    return UI.Banner({ tone: 'ok', title: 'Live on phone system', compact: true, children: text || 'Changes reach the phone system within about a minute of saving.' });
  };
  UI.EmptyState = function (o) {
    return h('div.empty', h('div.empty-i', icon(o.icon || 'list', 22)), h('div.empty-t', o.title),
      o.body ? h('p.empty-b', o.body) : null, o.why ? h('p.empty-w', o.why) : null,
      o.actions && o.actions.length ? h('div.empty-a', o.actions) : null);
  };
  UI.Skeleton = function (n) {
    var w = h('div.skel', { 'aria-hidden': 'true' });
    for (var i = 0; i < (n || 4); i++) w.appendChild(h('div.skel-l', { style: { width: (95 - (i * 13) % 45) + '%' } }));
    return w;
  };

  /* ---------- layout ---------- */
  UI.Section = function (o) {
    return h('section.sect', { id: o.id, 'aria-labelledby': o.id + '-t', dataset: { setting: o.id } },
      h('header.sect-h', h('div.sect-hl',
        h('h2.sect-t', { id: o.id + '-t' }, o.icon ? h('span.sect-ico', icon(o.icon, 15)) : null, h('span', o.title), o.badges || null),
        o.desc ? h('p.sect-d', o.desc) : null), o.actions ? h('div.sect-a', o.actions) : null),
      o.children);
  };
  UI.Card = function (o) {
    return h('div.ccard' + (o.tone ? '.ccard-' + o.tone : ''), { id: o.id, dataset: o.id ? { setting: o.id } : {} },
      o.title ? h('header.ccard-h', h('div.ccard-hl', h('h3.ccard-t', o.title, o.badges || null), o.desc ? h('p.ccard-d', o.desc) : null), o.center ? h('div.ccard-c', o.center) : null, o.actions ? h('div.ccard-a', o.actions) : null) : null,
      h('div.ccard-b', o.children), o.footer ? h('footer.ccard-f', o.footer) : null);
  };
  /** One setting: title + description on the left, control on the right. */
  UI.Row = function (o) {
    var id = U.uid('row');
    return h('div.srow' + (o.disabled ? '.dis' : ''), { id: o.id, dataset: o.id ? { setting: o.id } : {} },
      h('div.srow-l', h('div.srow-t', { id: id + '-t' }, o.title, o.badges || null), o.desc ? h('div.srow-d', { id: id + '-d' }, o.desc) : null, o.extra || null),
      o.control ? h('div.srow-c', o.control) : null);
  };
  /** At-a-glance tiles: [{icon,label,value,sub,tone:'ok'|'warn'|'info'|'neutral'}] */
  UI.Glance = function (items) {
    return h('div.glance', items.map(function (i) {
      return h('div.gl.tone-' + (i.tone || 'neutral'), h('span.gl-i', icon(i.icon || 'info', 16)),
        h('div.gl-b', h('div.gl-l', i.label), h('div.gl-v', { title: String(i.value) }, i.value), i.sub ? h('div.gl-s', String(i.sub).replace(/(\d)–(\d)/g, '$1⁠–⁠$2')) : null));
    }));
  };
  /** In-app link to another Company Rules tab (a real anchor: keyboard, middle-click and screen readers behave). */
  UI.Link = function (label, tabId) {
    return h('a.link', { href: '#/' + tabId, onClick: function (e) { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); CRX.app.go(tabId); } }, label);
  };
  UI.Chip = function (text, onRemove, label) {
    return h('span.chip', text, onRemove ? h('button.chip-x', { type: 'button', 'aria-label': 'Remove ' + (label || text), onClick: onRemove }, icon('x', 11)) : null);
  };
  UI.Avatar = function (name) { return h('span.avt', { 'aria-hidden': 'true' }, U.initials(name)); };
  UI.KV = function (pairs) {
    return h('dl.kv', pairs.map(function (p) { return [h('dt', p[0]), h('dd', p[1])]; }));
  };

  /* ---------- menus (popover list) ---------- */
  UI.Menu = function (anchorBtn, items) {
    var menu = null;
    function close() { if (menu) { menu.remove(); menu = null; anchorBtn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', outside, true); document.removeEventListener('keydown', key, true); } }
    function outside(e) { if (menu && !menu.contains(e.target) && !anchorBtn.contains(e.target)) close(); }
    function key(e) {
      if (e.key === 'Escape') { close(); anchorBtn.focus(); return; }
      var btns = Array.prototype.slice.call(menu.querySelectorAll('button:not([disabled])')), i = btns.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i + btns.length - 1) % btns.length].focus(); }
    }
    anchorBtn.addEventListener('click', function () {
      if (menu) { close(); return; }
      var list = typeof items === 'function' ? items() : items;
      menu = h('div.menu', { role: 'menu' }, list.map(function (it) {
        if (it.sep) return h('div.menu-sep', { role: 'separator' });
        return h('button.menu-i' + (it.danger ? '.danger' : ''), { type: 'button', role: 'menuitem', disabled: !!it.disabled, onClick: function () { close(); it.onClick(); } },
          it.icon ? icon(it.icon, 14) : null, h('span', it.label), it.hint ? h('small', it.hint) : null);
      }));
      anchorBtn.parentNode.appendChild(menu);
      anchorBtn.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', outside, true); document.addEventListener('keydown', key, true);
      var f = menu.querySelector('button:not([disabled])'); if (f) f.focus();
    });
    return anchorBtn;
  };
})(window);
