/* Predictable, API-shaped state: one saved snapshot + one editable draft per tab.
   Dirty = draft differs from saved. Save validates, diffs into the change history,
   persists to localStorage and simulates propagation to each product. */
(function (g) {
  'use strict';
  var CRX = g.CRX, U = CRX.util;
  var KEY = 'crx.company-rules.v1';
  var listeners = {};

  var S = CRX.store = {
    saved: {}, draft: {}, errors: {},
    history: [], delivery: [], recent: [],
    status: 'idle',          // idle | saving | saved | error
    loadError: false,
    failNextSave: false,
    savedAt: null,
    CURRENT_USER: 'Johnny Doe'
  };

  S.on = function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); };
  S.emit = function (evt, a, b) { (listeners[evt] || []).slice().forEach(function (fn) { fn(a, b); }); };
  S.tab = function (id) { return CRX.tabs.filter(function (t) { return t.id === id; })[0]; };

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ data: S.saved, history: S.history, delivery: S.delivery, recent: S.recent, savedAt: S.savedAt }));
    } catch (e) { /* storage unavailable: prototype keeps working in memory */ }
  }

  S.init = function () {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { stored = null; }
    CRX.tabs.forEach(function (t) {
      if (!t.defaults) return;
      var def = t.defaults();
      S.saved[t.id] = U.merge(def, stored && stored.data ? stored.data[t.id] : undefined);
      S.draft[t.id] = U.clone(S.saved[t.id]);
      S.errors[t.id] = t.validate ? t.validate(S.draft[t.id], S) || {} : {};
    });
    S.history = stored && stored.history ? stored.history : CRX.seed.history();
    S.delivery = stored && stored.delivery ? stored.delivery : CRX.seed.delivery();
    S.recent = stored && stored.recent ? stored.recent : CRX.seed.recent();
    S.savedAt = stored ? stored.savedAt : null;
    if (!stored) persist();
  };

  S.get = function (id) { return S.draft[id]; };
  S.getSaved = function (id) { return S.saved[id]; };
  /** Normalized pair used for comparing: tab.normalize(side, otherSide) removes settings that are hidden/irrelevant. */
  S.views = function (tab, draft, saved) {
    if (!tab || !tab.normalize) return [draft, saved];
    return [tab.normalize(U.clone(draft), saved, true), tab.normalize(U.clone(saved), draft, false)];
  };
  S.isDirty = function (id) {
    if (S.draft[id] === undefined) return false;
    var v = S.views(S.tab(id), S.draft[id], S.saved[id]);
    return !U.same(v[0], v[1]);
  };
  S.dirtyIds = function () { return CRX.tabs.filter(function (t) { return t.defaults && S.isDirty(t.id); }).map(function (t) { return t.id; }); };
  S.anyDirty = function () { return S.dirtyIds().length > 0; };

  S.validate = function (id) {
    var t = S.tab(id);
    S.errors[id] = t && t.validate ? t.validate(S.draft[id], S) || {} : {};
    return S.errors[id];
  };
  S.hasErrors = function (id) { return Object.keys(S.errors[id] || {}).length > 0; };
  S.firstInvalid = function (ids) {
    ids = ids || S.dirtyIds();
    for (var i = 0; i < ids.length; i++) { S.validate(ids[i]); if (S.hasErrors(ids[i])) return ids[i]; }
    return null;
  };

  /** Mutate the draft and notify. Use for every user edit. */
  S.set = function (id, path, value) { U.setPath(S.draft[id], path, value); S.changed(id); };
  S.changed = function (id) {
    S.validate(id);
    if (S.status === 'saved' || S.status === 'error') S.status = 'idle';
    S.emit('change', id);
  };
  S.discard = function (ids) {
    (ids || S.dirtyIds()).forEach(function (id) { S.draft[id] = U.clone(S.saved[id]); S.validate(id); });
    S.status = 'idle';
    S.emit('discard', ids);
    S.emit('change');
  };

  /* ---------- diff -> history entries ---------- */
  function flat(o, p, out) {
    if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).forEach(function (k) { flat(o[k], p ? p + '.' + k : k, out); });
    else out[p] = o;
    return out;
  }
  function words(s) { return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').toLowerCase().replace(/^./, function (c) { return c.toUpperCase(); }); }
  S.fmtVal = function (v, tab, path) {
    if (v === undefined || v === null || v === '') return 'Not set';
    var f = tab && tab.formats && tab.formats[path];
    if (f) { var r = typeof f === 'function' ? f(v) : f[v]; if (r !== undefined && r !== null) return r; }
    if (v === undefined || v === null || v === '') return 'Not set';
    if (typeof v === 'boolean') return v ? 'On' : 'Off';
    if (Array.isArray(v)) {
      if (!v.length) return 'None';
      if (v.every(function (x) { return typeof x !== 'object'; })) { var s = v.join(', '); return s.length > 70 ? U.plural(v.length, 'item') : s; }
      return U.plural(v.length, 'item');
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };
  /** "monitoring.scope.lock" -> "Call monitoring · Lock it" (never raw path text like "Scope › Lock"). */
  S.labelFor = function (tab, path) {
    var segs = path.split('.').filter(function (x) { return !/^\d+$/.test(x); }), L = tab.labels || {};
    var si = segs.indexOf('scope') >= 0 ? segs.indexOf('scope') : segs.indexOf('scopes');
    if (si >= 0 && (segs[segs.length - 1] === 'give' || segs[segs.length - 1] === 'lock')) {
      var base = segs.slice(0, si).concat(si === segs.indexOf('scopes') ? segs.slice(si + 1, -1) : []).join('.');
      var name = L[base] || L[base + '.enabled'] || L[base + '.mode'] || words(base.split('.').pop());
      return name + ' · ' + (segs[segs.length - 1] === 'give' ? 'Give this to everyone' : 'Lock it');
    }
    return segs.map(words).join(' › ');
  };
  /** Which section (data-setting id) holds a given setting path. Longest matching prefix wins. */
  S.anchorFor = function (tab, path) {
    var a = (tab && tab.anchors) || {}, segs = String(path).split('.');
    for (var n = segs.length; n > 0; n--) { var key = segs.slice(0, n).join('.'); if (a[key]) return a[key]; }
    return null;
  };
  S.diff = function (tab, before, after) {
    var v = S.views(tab, after, before); after = v[0]; before = v[1];
    var a = flat(before, '', {}), b = flat(after, '', {}), keys = {}, out = [];
    Object.keys(a).concat(Object.keys(b)).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      if (U.same(a[k], b[k])) return;
      // a hidden (dropped) side compared with an empty/off value is not a real change, e.g. "Not set -> Off"
      function blank(v) { return v === false || v === '' || v === null || (Array.isArray(v) && !v.length); }
      if ((a[k] === undefined && blank(b[k])) || (b[k] === undefined && blank(a[k]))) return;
      var label = tab.labels && tab.labels[k] || S.labelFor(tab, k);
      out.push({ path: k, label: label, from: S.fmtVal(a[k], tab, k), to: S.fmtVal(b[k], tab, k) });
    });
    return out;
  };

  function commit(ids) {
    var now = new Date().toISOString(), entries = [], touched = {};
    ids.forEach(function (id) {
      var tab = S.tab(id), changes = S.diff(tab, S.saved[id], S.draft[id]);
      changes.slice(0, 10).forEach(function (c, i) {
        entries.push({ id: U.uid('h'), user: S.CURRENT_USER, tab: id, section: tab.title, change: c.label, from: c.from, to: c.to, at: now, status: 'Pending', products: tab.products || [], anchor: S.anchorFor(tab, c.path) });
      });
      if (changes.length > 10) entries.push({ id: U.uid('h'), user: S.CURRENT_USER, tab: id, section: tab.title, change: 'and ' + (changes.length - 10) + ' more settings', from: '—', to: '—', at: now, status: 'Pending', products: tab.products || [] });
      (tab.products || []).forEach(function (p) { touched[p] = (touched[p] ? touched[p] + ', ' : '') + tab.short; });
      S.saved[id] = U.clone(S.draft[id]);
    });
    S.history = entries.concat(S.history);
    S.delivery.forEach(function (row) {
      if (touched[row.product]) { row.status = 'Pending'; row.change = 'Updated: ' + touched[row.product]; row.updated = now; row.detail = 'Waiting for the product to confirm receipt.'; }
    });
    S.savedAt = now;
    persist();
    return entries.map(function (e) { return e.id; });
  }

  S.settleDelivery = function (entryIds) {
    S.history.forEach(function (e) { if (entryIds.indexOf(e.id) >= 0) e.status = 'Delivered'; });
    S.delivery.forEach(function (r) { if (r.status === 'Pending') { r.status = 'Delivered'; r.detail = 'Confirmed by the product within about a minute of saving.'; r.updated = new Date().toISOString(); } });
    persist();
    S.emit('delivery');
  };

  S.retryDelivery = function (productId) {
    S.delivery.forEach(function (r) { if (r.product === productId) { r.status = 'Pending'; r.detail = 'Retrying…'; r.updated = new Date().toISOString(); } });
    persist(); S.emit('delivery');
    setTimeout(function () {
      S.delivery.forEach(function (r) { if (r.product === productId) { r.status = 'Delivered'; r.detail = 'Delivered on retry.'; r.updated = new Date().toISOString(); } });
      persist(); S.emit('delivery'); S.emit('toast', { tone: 'ok', msg: 'Delivery retried and confirmed.' });
    }, 1200);
  };

  /** Validates, then saves (simulated latency). Resolves {ok, ids} or {ok:false, invalid|error}. */
  S.save = function (ids) {
    ids = ids || S.dirtyIds();
    if (!ids.length) return Promise.resolve({ ok: true, ids: [] });
    var bad = S.firstInvalid(ids);
    if (bad) { S.emit('change'); return Promise.resolve({ ok: false, invalid: bad }); }
    S.status = 'saving'; S.emit('status');
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (S.failNextSave) {
          S.failNextSave = false; S.status = 'error'; S.emit('status');
          resolve({ ok: false, error: 'The configuration service did not respond. Your changes are still here — try again.' });
          return;
        }
        var entryIds = commit(ids);
        S.status = 'saved'; S.emit('status'); S.emit('change'); S.emit('saved', ids);
        setTimeout(function () { if (S.status === 'saved') { S.status = 'idle'; S.emit('status'); } }, 5000);
        setTimeout(function () { S.settleDelivery(entryIds); S.emit('propagated', ids); }, 1800);
        resolve({ ok: true, ids: ids });
      }, 700);
    });
  };

  S.resetDemo = function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } location.reload(); };
  S.persist = persist;
})(window);
