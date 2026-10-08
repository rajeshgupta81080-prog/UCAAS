/* RuleScope: the "Give this to everyone" + "Lock it" control, with the four-state explanation. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui;

  var STATES = {
    'false-false': { key: 'none', label: 'No company value', tone: 'neutral', ic: 'unlock',
      text: 'The company has no forced value. People keep what they have and may change it.' },
    'true-false': { key: 'starting', label: 'Starting value', tone: 'info', ic: 'users',
      text: 'Everyone gets the company value now, but may change it later.' },
    'false-true': { key: 'freeze', label: 'Freeze only', tone: 'warn', ic: 'warn',
      text: 'Everyone is frozen exactly as they are today. Nothing is switched on and nobody can change it.' },
    'true-true': { key: 'enforced', label: 'Enforced', tone: 'ok', ic: 'lock',
      text: 'Everyone gets the company value and nobody can change it.' }
  };
  UI.scopeState = function (s) { return STATES[!!s.give + '-' + !!s.lock]; };

  /** path points at {give:boolean, lock:boolean} inside the tab draft.
      Collapsed by default to ONE line (state + "Change"); the two switches open on demand, so the control stays
      available on every setting without repeating a large block down the page. */
  UI.RuleScope = function (ctx, path, o) {
    o = o || {};
    var noun = o.noun || 'this setting';
    var gid = CRX.util.uid('sg'), lid = CRX.util.uid('sl'), pid = CRX.util.uid('sp');
    var open = false;
    var badge = h('span.scope-badge'), text = h('span.scope-text'), warn = h('div.scope-warn', { role: 'status' });
    var toggleBtn = UI.Button({ label: 'Company control', icon: 'sliders', kind: 'ghost', size: 'sm', expanded: 'false', onClick: function () { setOpen(!open); } });
    toggleBtn.setAttribute('aria-controls', pid);
    var panel = h('div.scope-top', { id: pid, hidden: true });
    function setOpen(v) { open = v; panel.hidden = !v; toggleBtn.setAttribute('aria-expanded', String(v)); }
    function paint() {
      var s = ctx.get(path) || {}, st = UI.scopeState(s);
      head.className = 'scope-head tone-' + st.tone;
      CRX.setKids(badge, icon(st.ic, 13), st.label); text.textContent = st.text;
      warn.hidden = st.key !== 'freeze';
      CRX.setKids(warn, st.key === 'freeze' ? [icon('warn', 14), h('span', h('b', 'Check before you save. '), 'Locking ' + noun + ' without giving anyone a value freezes everybody where they are. To set a value for everyone, also turn on “Give this to everyone”.')] : null);
    }
    function sw(key, id, title, desc, ic) {
      return h('div.scope-sw',
        UI.Toggle({ checked: !!(ctx.get(path) || {})[key], labelledby: id + '-l', describedby: id + '-d', id: id,
          onChange: function (v) { ctx.set(path + '.' + key, v); paint(); o.onChange && o.onChange(); } }),
        h('div', h('div.scope-t', { id: id + '-l' }, icon(ic, 13), title), h('div.scope-d', { id: id + '-d' }, desc)));
    }
    CRX.setKids(panel, sw('give', gid, 'Give this to everyone', 'Copies the company value to every person now.', 'users'), sw('lock', lid, 'Lock it', 'Stops people changing it on their own phone.', 'lock'));
    var head = h('div.scope-head', badge, text, toggleBtn);
    paint();
    return h('div.scope', { role: 'group', 'aria-label': 'Company control for ' + noun }, head, warn, panel);
  };

  /** Collects every scope in a draft that is locked without a value. */
  UI.lockedWithoutGive = function (scopes) {
    return scopes.filter(function (s) { return s.scope && s.scope.lock && !s.scope.give; }).map(function (s) { return s.name; });
  };
})(window);
