/* Per-tab context: thin, bound helpers so tab modules stay declarative.
   Inputs write straight into the draft; `dyn` blocks re-render themselves when the draft changes,
   so typing never loses focus and no whole-panel re-render is needed. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, UI = CRX.ui, U = CRX.util, S = CRX.store;

  CRX.makeCtx = function (tabId) {
    var dyns = [];
    var ctx = {
      id: tabId, S: S, UI: UI, h: h, U: U, data: CRX.data,
      get d() { return S.get(tabId); },
      saved: function () { return S.getSaved(tabId); },
      get: function (path) { return U.getPath(S.get(tabId), path); },
      set: function (path, value) { S.set(tabId, path, value); },
      err: function (path) { return (S.errors[tabId] || {})[path]; },
      /** Re-render the whole panel (only for discard/reset/navigation-level changes). */
      rerender: function () { CRX.app.renderPanel(true); },

      /** Block that re-evaluates `fn()` whenever this tab's draft changes. fn returns a Node/array/null. */
      dyn: function (fn, deps) {
        // `deps` (optional): returns the values the block depends on. When given, the block is only
        // rebuilt if they change - required for blocks that contain inputs the user may be typing in.
        var el = h('div.dyn'), last, entry;
        function run(force) {
          if (!force && !el.isConnected) { entry.dead = true; return; } // removed from the page: stop tracking
          if (deps) { var sig = JSON.stringify(deps()); if (!force && sig === last) return; last = sig; }
          el.replaceChildren.apply(el, [].concat(fn()).filter(function (x) { return x != null && x !== false; }));
        }
        entry = { run: run, dead: false };
        run(true); dyns.push(entry);
        return el;
      },
      _runDyn: function () {
        dyns.slice().forEach(function (e) { if (!e.dead) e.run(); });
        dyns = dyns.filter(function (e) { return !e.dead; });
      },
      /* ---- bound controls ---- */
      toggle: function (path, label, o) {
        o = o || {};
        return UI.Toggle({ checked: !!ctx.get(path), label: label, disabled: o.disabled, id: o.id, describedby: o.describedby,
          onChange: function (v) { ctx.set(path, v); o.onChange && o.onChange(v); } });
      },
      select: function (path, options, o) {
        o = o || {};
        return UI.Select({ options: options, value: ctx.get(path), label: o.label, id: o.id, disabled: o.disabled, cls: o.cls,
          onChange: function (v) { var val = o.number ? Number(v) : v; ctx.set(path, val); o.onChange && o.onChange(val); } });
      },
      text: function (path, o) {
        o = o || {};
        var cur = ctx.get(path);
        return UI.Input(Object.assign({}, o, { value: cur == null ? '' : cur,
          onInput: function (v) {
            var val = o.number ? (v === '' ? '' : Number(v)) : v;
            ctx.set(path, val); o.onInput && o.onInput(val);
          } }));
      },
      /** Field wrapper bound to an error path. control: node or (id)=>node */
      field: function (path, o) { return UI.Field(Object.assign({ tab: tabId, path: path }, o)); },
      fieldText: function (path, o) {
        return ctx.field(path, { label: o.label, hint: o.hint, required: o.required, badge: o.badge, control: function (id) { return ctx.text(path, Object.assign({}, o.input, { id: id })); } });
      },
      fieldSelect: function (path, options, o) {
        return ctx.field(path, { label: o.label, hint: o.hint, required: o.required, control: function (id) { return ctx.select(path, options, Object.assign({}, o.input, { id: id })); } });
      },
      /** Toggle row: title/description left, switch right. */
      toggleRow: function (path, o) {
        var id = U.uid('tg');
        return UI.Row({ id: o.id, title: o.title, desc: o.desc, badges: o.badges, extra: o.extra, disabled: o.disabled,
          control: ctx.toggle(path, o.title, { id: id, onChange: o.onChange, disabled: o.disabled }) });
      },
      scope: function (path, o) { return UI.RuleScope(ctx, path, o); }
    };
    return ctx;
  };

  CRX.countryOptions = function (withBlank) {
    var groups = {};
    CRX.data.countries.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (c) { (groups[c.region] = groups[c.region] || []).push(c); });
    var out = withBlank ? [{ value: '', label: withBlank }] : [];
    Object.keys(groups).sort().forEach(function (r) { groups[r].forEach(function (c) { out.push({ value: c.code, label: c.name }); }); });
    return out;
  };
  CRX.tzNow = function (tz) {
    try { return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); } catch (e) { return ''; }
  };
  CRX.tzOffset = function (tz) {
    try {
      var p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0];
      return p ? p.value : '';
    } catch (e) { return ''; }
  };
})(window);
