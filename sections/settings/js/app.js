/* Company Rules workspace: sticky page header, tab navigator, router, save workflow, dirty tracking,
   unsaved-changes guard and settings search. Tabs register themselves with CRX.registerTab(). */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, S = CRX.store;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  var app = CRX.app = { cur: null, ctx: null };
  var el = {};
  var booted = false;

  function tab(id) { return S.tab(id) || CRX.tabs[0]; }
  function idFromHash() { var id = (location.hash || '').replace(/^#\/?/, '').split('/')[0]; return CRX.tabs.some(function (t) { return t.id === id; }) ? id : CRX.tabs[0].id; }
  app.go = function (id) { if (location.hash === '#/' + id) { selectTab(id); } else location.hash = '#/' + id; };

  /* ------------------------------------------------------------------ header */
  function buildHeader() {
    el.status = h('div.ws-status', { role: 'status', 'aria-live': 'polite' });
    el.saveBtn = UI.Button({ label: 'Save settings', kind: 'primary', id: 'saveBtn', onClick: doSave });
    el.discardBtn = UI.Button({ label: 'Discard', kind: 'ghost', onClick: discardAll });

    el.searchIn = h('input.ws-search-in', { type: 'text', placeholder: 'Search settings…', 'aria-label': 'Search settings', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'wsSearchList', autocomplete: 'off',
      onInput: runSearch, onFocus: runSearch, onKeydown: searchKey });
    el.searchList = h('ul.ws-search-list', { id: 'wsSearchList', role: 'listbox', hidden: true });
    el.search = h('div.ws-search', icon('search', 14), el.searchIn, el.searchList);

    el.groupHost = h('div.ws-groups');
    el.tabList = h('div.ws-tablist', { id: 'wsTabList', role: 'tablist', 'aria-label': 'Company Rules sections', onScroll: tabEdges });
    el.tabL = h('button.ws-tabarrow.l', { type: 'button', 'aria-label': 'Scroll tabs left', onClick: function () { el.tabList.scrollBy({ left: -280, behavior: 'smooth' }); } }, icon('chevL', 14));
    el.tabR = h('button.ws-tabarrow.r', { type: 'button', 'aria-label': 'Scroll tabs right', onClick: function () { el.tabList.scrollBy({ left: 280, behavior: 'smooth' }); } }, icon('chevR', 14));

    el.head = h('header.ws-head',
      h('div.ws-top',
        h('nav.ws-crumbs', { 'aria-label': 'Breadcrumb' }, h('ol', h('li', h('a', { href: '#/' + CRX.tabs[0].id, onClick: function (e) { e.preventDefault(); CRX.shellLeave('Admin Hub'); } }, 'Admin Hub')),
          h('li', h('a', { href: '#/' + CRX.tabs[0].id, onClick: function (e) { e.preventDefault(); CRX.shellLeave('Company'); } }, 'Company')), h('li', { 'aria-current': 'page' }, 'Company Rules'))),
        el.search),
      h('div.ws-bar',
        h('div.ws-title', h('h1', 'Company Rules'), h('p', 'Company-wide calling, communication, security and operational policies.')),
        h('div.ws-actions', el.status, el.discardBtn, el.saveBtn)),
      el.groupHost,
      h('div.ws-tabs', el.tabL, el.tabList, el.tabR));

    el.panel = h('div.ws-panel', { id: 'panel', role: 'tabpanel', tabindex: '-1' });
    el.savebar = h('div.savebar', { hidden: true }, h('span.savebar-t'), el.sbDiscard = UI.Button({ label: 'Discard', kind: 'ghost', onClick: discardAll }), el.sbSave = UI.Button({ label: 'Save settings', kind: 'primary', onClick: doSave }));
    $('#workspace').replaceChildren(el.head, el.panel, el.savebar);
    paintTabs();
    syncHeadHeight();
    if (window.ResizeObserver) new ResizeObserver(syncHeadHeight).observe(el.head);
    window.addEventListener('resize', syncHeadHeight);
  }

  // 17 tabs are grouped by what they govern: a small area switcher on top, and only that area's tabs below.
  var GROUPS = [{ id: 'calls', label: 'Calls & communication' }, { id: 'centre', label: 'Contact centre' }, { id: 'admin', label: 'Administration' }];
  var TAB_GROUP = { 'phone-rules': 'calls', greetings: 'calls', 'ringing-voicemail': 'calls', 'emergency-address': 'calls', holidays: 'calls', calling: 'calls', messaging: 'calls', policies: 'calls',
    'break-reasons': 'centre', 'duty-policy': 'centre', 'campaign-timers': 'centre', alerts: 'centre',
    security: 'admin', 'profile-fields': 'admin', 'caller-id-name': 'admin', 'change-log': 'admin', 'desk-phones': 'admin' };
  var lastInGroup = {}, tabSig = '';
  function groupTabs(g) { return CRX.tabs.filter(function (t) { return TAB_GROUP[t.id] === g; }); }
  function paintTabs() {
    var curGroup = TAB_GROUP[app.cur];
    lastInGroup[curGroup] = app.cur;
    var sig = app.cur + '|' + CRX.tabs.map(function (t) { return (S.isDirty(t.id) ? 1 : 0) + (S.hasErrors(t.id) ? 2 : 0); }).join('');
    if (sig === tabSig && el.tabList.firstChild) return;
    tabSig = sig;
    // area switcher (reuses the segmented control) with a dot when an area holds unsaved edits
    el.groupHost.replaceChildren(UI.Seg({ label: 'Settings areas', value: curGroup, options: GROUPS.map(function (g) {
      var dirty = groupTabs(g.id).some(function (t) { return S.isDirty(t.id); });
      return { value: g.id, label: [g.label, dirty ? h('span.ws-dot.on-dark', { role: 'img', 'aria-label': 'has unsaved changes' }) : null] };
    }), onChange: function (gid) { app.go(lastInGroup[gid] || groupTabs(gid)[0].id); } }));
    var kids = groupTabs(curGroup).map(function (t) {
      var dirty = S.isDirty(t.id), bad = S.hasErrors(t.id) && dirty, sel = t.id === app.cur;
      return h('button.ws-tab' + (sel ? '.on' : ''), { type: 'button', role: 'tab', id: 'tab-' + t.id, 'aria-selected': String(sel), 'aria-controls': 'panel', tabindex: sel ? 0 : -1,
        dataset: { id: t.id }, onClick: function () { app.go(t.id); }, onKeydown: tabKey },
        h('span.ws-tab-l', t.short),
        t.status === 'soon' ? [' ', h('span.ws-tab-soon', 'Soon')] : null,
        dirty ? h('span.ws-dot' + (bad ? '.bad' : ''), { role: 'img', 'aria-label': bad ? 'Has errors' : 'Unsaved changes', title: bad ? 'Has errors' : 'Unsaved changes' }) : null);
    });
    el.tabList.replaceChildren.apply(el.tabList, kids);
    var on = el.tabList.querySelector('.on'); if (on) { var l = el.tabList, r = on.getBoundingClientRect(), lr = l.getBoundingClientRect(); if (r.left < lr.left + 30 || r.right > lr.right - 30) l.scrollLeft += (r.left + r.width / 2) - (lr.left + lr.width / 2); }
    tabEdges();
  }
  function tabEdges() {
    var l = el.tabList; if (!l) return;
    el.tabL.classList.toggle('show', l.scrollLeft > 4);
    el.tabR.classList.toggle('show', l.scrollLeft + l.clientWidth < l.scrollWidth - 4);
  }
  function tabKey(e) {
    var ids = groupTabs(TAB_GROUP[app.cur]).map(function (t) { return t.id; }), i = ids.indexOf(app.cur), n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % ids.length; else if (e.key === 'ArrowLeft') n = (i + ids.length - 1) % ids.length;
    else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = ids.length - 1; else return;
    e.preventDefault(); app.go(ids[n]);
    setTimeout(function () { var b = $('#tab-' + ids[n]); if (b) b.focus(); }, 0);
  }

  function paintStatus() {
    var dirty = S.dirtyIds(), n = dirty.length, st = S.status;
    var saveBtns = [el.saveBtn, el.sbSave], discardBtns = [el.discardBtn];
    var label = st === 'saving' ? 'Saving…' : 'Save settings';
    saveBtns.forEach(function (b) { b.disabled = !n || st === 'saving'; b.classList.toggle('busy', st === 'saving'); b.querySelector('span').textContent = label; });
    discardBtns.forEach(function (b) { b.hidden = !n || st === 'saving'; });
    var names = dirty.map(function (id) { return tab(id).short; });
    var kids;
    if (st === 'saving') kids = [h('span.spin', { 'aria-hidden': 'true' }), 'Saving changes…'];
    else if (n) kids = [h('span.ws-dot'), h('span', h('b', 'Unsaved changes'), h('small', ' · ' + (names.length > 2 ? names.slice(0, 2).join(', ') + ' +' + (names.length - 2) : names.join(', '))))];
    else if (st === 'saved') kids = [icon('ok', 15, 'ok'), h('span', h('b', 'Saved successfully'), g.__propagated ? h('small', ' · Configuration propagated') : h('small', ' · Propagating…'))];
    else if (st === 'error') kids = [icon('danger', 15, 'bad'), h('span', h('b', 'Couldn’t save'), h('small', ' · Changes kept'))];
    else kids = [icon('check', 15, 'mut'), h('span.mut', S.savedAt ? 'All changes saved · ' + U.ago(S.savedAt) : 'No unsaved changes')];
    var reviewable = n && st !== 'saving';
    var node = reviewable ? h('button.ws-status-b', { type: 'button', onClick: reviewChanges, title: 'Review unsaved changes' }, kids) : h('div.ws-status-i', kids);
    el.status.replaceChildren(node);
    $('.savebar-t', el.savebar).textContent = n ? U.plural(n, 'section') + ' with unsaved changes' : '';
    el.savebar.hidden = !n;
    paintTabs();
  }

  /* ------------------------------------------------------------------ panel */
  function selectTab(id) {
    if (app.cur === id && el.panel.firstChild) return;
    app.cur = id; renderPanel();
  }
  function renderPanel(keep) {
    var t = tab(app.cur);
    app.ctx = CRX.makeCtx(t.id);
    el.panel.setAttribute('aria-labelledby', 'tab-' + t.id);
    document.title = t.title + ' – Company Rules – Admin Hub';
    CRX.syncSidebar(t.id);
    paintTabs();
    if (S.loadError) {
      el.panel.replaceChildren(h('div.panel-in', UI.EmptyState({ icon: 'danger', title: 'Unable to load configuration',
        body: 'Something went wrong while loading Company Rules.', why: 'This is a simulated failure. Nothing was lost — retry to load the saved settings.',
        actions: [UI.Button({ label: 'Retry', icon: 'refresh', kind: 'primary', onClick: function () { S.loadError = false; renderPanel(); } })] })));
      return;
    }
    var prev = window.scrollY;
    if (!keep) el.panel.replaceChildren(h('div.panel-in', UI.Skeleton(6)));
    var build = function () {
      var node;
      try { node = t.render(app.ctx); }
      catch (err) {
        console.error(err);
        node = UI.EmptyState({ icon: 'danger', title: 'This section could not be displayed', body: String(err && err.message || err), actions: [UI.Button({ label: 'Retry', kind: 'primary', onClick: renderPanel })] });
      }
      el.panel.replaceChildren(h('div.panel-in' + (keep ? '' : '.enter'),   // an in-place refresh (a switch that reveals more) must not replay the fade-in: it looks like a page reload
        h('div.panel-intro', h('h2', t.title, t.status === 'soon' ? UI.StatusBadge('soon') : null), h('p', t.desc)), withRail(node),
        t.defaults ? h('footer.ws-foot', h('span.ws-foot-n', icon('users', 14), 'Applies to the whole company. Save from the bar at the top of the page.')) : null));
      paintStatus();
      UI.syncErrors(el.panel);
      if (!booted) booted = true;
      window.scrollTo(0, keep ? prev : 0);
    };
    if (!app.rendered && !keep) { app.rendered = true; setTimeout(build, 380); } else build();
  }
  app.renderPanel = renderPanel;

  /** Open a tab, scroll to one of its sections (under the sticky header) and flash it. */
  app.focusSetting = function (tabId, settingId) {
    app.go(tabId);
    if (!settingId) { window.scrollTo(0, 0); return; }
    var tries = 0;
    (function seek() {
      var n = el.panel.querySelector('[data-setting="' + settingId + '"]');
      if (n && !el.panel.querySelector('.skel')) {
        n.scrollIntoView({ block: 'start', behavior: 'smooth' });
        n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash');
        setTimeout(function () { n.classList.remove('flash'); }, 2000);
      } else if (tries++ < 40) setTimeout(seek, 60);
    })();
  };

  /** Long tabs get a sticky "On this page" list built from their sections (needs 3 or more). */
  function withRail(node) {
    var picks = [['section.sect', function (n) { var t = n.querySelector('.sect-t > span:not(.sect-ico):not(.badge)'); return t && t.textContent; }],
      ['.spc', function (n) { var t = n.querySelector('.spc-t h3'); return t && t.firstChild && t.firstChild.textContent; }],
      ['.ccard[data-setting]', function (n) { var t = n.querySelector('.ccard-t'); return t && t.firstChild && t.firstChild.textContent; }]];
    for (var i = 0; i < picks.length; i++) {
      var nodes = Array.prototype.slice.call(node.querySelectorAll(picks[i][0])).filter(function (n) { return !n.parentElement.closest(picks[i][0]); });
      var items = nodes.map(function (n) { return { n: n, label: (picks[i][1](n) || '').trim() }; }).filter(function (x) { return x.label; });
      if (items.length < 3) continue;
      var spy;
      var rail = h('nav.rail', { 'aria-label': 'On this page' }, h('div.rail-t', 'On this page'), items.map(function (x, i) {
        return h('a', { href: '#', onClick: function (e) { e.preventDefault(); spy.select(i); x.n.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, x.label);
      }));
      spy = UI.scrollSpy(rail, items.map(function (x) { return x.n; }));
      return h('div.with-rail', h('div.wr-main', node), rail);
    }
    return node;
  }

  /** Keeps CSS aware of the sticky header's real height (it changes with wrapping and screen size). */
  function syncHeadHeight() {
    if (!el.head) return;
    var sticky = getComputedStyle(el.head).position === 'sticky';
    var hgt = sticky ? el.head.offsetHeight : el.head.querySelector('.ws-tabs').offsetHeight;
    document.documentElement.style.setProperty('--ws-head-h', hgt + 'px');
  }

  /* ------------------------------------------------------------------ store events */
  S.on('change', function (id) {
    if (!id || id === app.cur) { if (app.ctx) { app.ctx._runDyn(); } UI.syncErrors(el.panel); }
    if (S.status === 'saved' || S.status === 'idle') g.__propagated = g.__propagated && S.status === 'saved';
    paintStatus();
  });
  S.on('status', function () { if (S.status === 'saving') g.__propagated = false; paintStatus(); });
  S.on('discard', function () { renderPanel(true); });
  S.on('propagated', function () { g.__propagated = true; paintStatus(); UI.toast('Configuration propagated to the phone system.', 'ok'); });
  S.on('delivery', function () { if (app.cur === 'change-log' && app.ctx && app.ctx.onDelivery) app.ctx.onDelivery(); });
  S.on('toast', function (t) { UI.toast(t.msg, t.tone); });

  /* ------------------------------------------------------------------ save workflow */
  function focusFirstError() {
    setTimeout(function () {
      var f = el.panel.querySelector('.has-error input,.has-error select,.has-error textarea,.has-error .tgl,.has-error [tabindex]') || el.panel.querySelector('.has-error');
      if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (f.focus) f.focus({ preventScroll: true }); }
    }, 60);
  }
  function doSave() {
    var ids = S.dirtyIds(); if (!ids.length || S.status === 'saving') return Promise.resolve(false);
    var bad = S.firstInvalid(ids);
    if (bad) {
      var count = Object.keys(S.errors[bad]).length;
      app.go(bad);
      UI.toast('Fix ' + U.plural(count, 'error') + ' in ' + tab(bad).title + ' before saving.', 'danger');
      S.emit('change'); focusFirstError();
      return Promise.resolve(false);
    }
    var risks = [];
    ids.forEach(function (id) { var t = tab(id); if (t.risks) t.risks(S.get(id), S.getSaved(id), S).forEach(function (r) { risks.push(r); }); });
    var gate = risks.length ? UI.confirm({ title: 'Review before saving', message: 'These changes need a second look:', confirmLabel: 'Save anyway', danger: true,
      details: h('ul.risk-list', risks.map(function (r) { return h('li', h('b', r.title), r.message ? ' — ' + r.message : ''); })) }) : Promise.resolve(true);
    return gate.then(function (ok) {
      if (!ok) return false;
      return S.save(ids).then(function (r) {
        if (r.ok) { UI.toast('Settings saved. Changes reach the phone system within about a minute.', 'ok'); return true; }
        if (r.invalid) { app.go(r.invalid); focusFirstError(); return false; }
        UI.toast(r.error, 'danger', { action: { label: 'Retry', onClick: doSave } });
        return false;
      });
    });
  }
  app.save = doSave;
  function discardAll() {
    if (!S.anyDirty()) return;
    UI.confirm({ title: 'Discard all changes?', message: 'Your unsaved edits in ' + S.dirtyIds().map(function (i) { return tab(i).short; }).join(', ') + ' will be lost.', confirmLabel: 'Discard changes', danger: true })
      .then(function (ok) { if (ok) { S.discard(); UI.toast('Changes discarded.', 'info'); } });
  }
  function valueChip(v) {
    return h('span.rv-chip' + (v === 'On' ? '.on' : v === 'Off' ? '.off' : v === 'Not set' ? '.none' : ''), v);
  }
  function reviewChanges() {
    var ids = S.dirtyIds(); if (!ids.length) return;
    var groups = ids.map(function (id) { var t = tab(id); return { id: id, t: t, ch: S.diff(t, S.getSaved(id), S.get(id)) }; });
    var total = groups.reduce(function (n, g) { return n + g.ch.length; }, 0), withErrors = groups.filter(function (g) { return S.hasErrors(g.id); }).length;
    var body = h('div.rv',
      h('div.rv-sum', UI.Pill(U.plural(groups.length, 'section'), 'info', 'list'), UI.Pill(U.plural(total, 'change'), 'neutral', 'edit'), withErrors ? UI.Pill(U.plural(withErrors, 'section') + ' with errors', 'danger', 'warn') : UI.Pill('Ready to save', 'ok', 'check')),
      groups.map(function (g) {
        return h('section.rv-g',
          h('header.rv-gh', h('span.rv-gi', icon(g.t.icon || 'list', 16)), h('div.rv-gt', h('h3', g.t.title), h('small', U.plural(g.ch.length, 'change'))),
            S.hasErrors(g.id) ? UI.Pill('Has errors', 'danger', 'warn') : null,
            UI.Button({ label: 'Open', icon: 'external', kind: 'ghost', size: 'sm', onClick: function () { d.close(); app.focusSetting(g.id, null); } })),
          h('ul.rv-list', g.ch.map(function (c) {
            return h('li.rv-c', h('button.rv-row', { type: 'button', title: 'Go to this setting', onClick: function () { d.close(); app.focusSetting(g.id, S.anchorFor(g.t, c.path)); } },
              h('div.rv-l', h('span', c.label), h('span.rv-go', 'Go to setting', icon('chevR', 12))),
              h('div.rv-d', h('div.rv-side', h('small', 'Before'), valueChip(c.from)), h('span.rv-arrow', icon('chevR', 14)), h('div.rv-side.after', h('small', 'After'), valueChip(c.to)))));
          })));
      }));
    var d = UI.Drawer({ title: 'Review changes', desc: 'Compared with the last saved configuration. Nothing is applied until you save.', body: body, focusPanel: true,
      footer: [UI.Button({ label: 'Discard all', icon: 'undo', kind: 'ghost', onClick: function () { d.close(); discardAll(); } }),
        UI.Button({ label: 'Save settings', kind: 'primary', onClick: function () { d.close(); doSave(); } })] });
  }
  app.exportConfig = exportConfig;
  function exportConfig() {
    var blob = new Blob([JSON.stringify({ company: 'Acme Corporation', exportedAt: new Date().toISOString(), configuration: S.saved }, null, 2)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: 'company-rules-configuration.json' }); document.body.appendChild(a); a.click(); a.remove();
    UI.toast('Configuration exported.', 'ok');
  }

  /* ------------------------------------------------------------------ unsaved guard */
  app.guardLeave = function (proceed) {
    if (!S.anyDirty()) { proceed(); return; }
    UI.unsavedDialog(S.dirtyIds().map(function (i) { return tab(i).short; }).join(', ')).then(function (c) {
      if (c === 'discard') { S.discard(); proceed(); }
      else if (c === 'save') doSave().then(function (ok) { if (ok) proceed(); });
    });
  };
  window.addEventListener('beforeunload', function (e) { if (S.anyDirty()) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); } });

  /* ------------------------------------------------------------------ settings search */
  var searchSel = 0, hits = [];
  function entries() {
    var out = [];
    CRX.tabs.forEach(function (t) {
      out.push({ tab: t.id, id: null, label: t.title, sub: 'Section', kw: t.desc });
      (t.settings || []).forEach(function (s) { out.push({ tab: t.id, id: s.id, label: s.label, sub: t.title, kw: s.keywords || '' }); });
    });
    return out;
  }
  function runSearch() {
    var q = el.searchIn.value.trim().toLowerCase();
    if (!q) { closeSearch(); return; }
    hits = entries().filter(function (e) { return (e.label + ' ' + e.sub + ' ' + e.kw).toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return (b.label.toLowerCase().indexOf(q) === 0) - (a.label.toLowerCase().indexOf(q) === 0); }).slice(0, 9);
    searchSel = 0;
    el.searchList.replaceChildren.apply(el.searchList, hits.length ? hits.map(function (e, i) {
      return h('li' + (i === 0 ? '.on' : ''), { role: 'option', onMousedown: function (ev) { ev.preventDefault(); pick(e); } }, h('b', e.label), h('small', e.sub));
    }) : [h('li.none', 'No settings match “' + el.searchIn.value + '”')]);
    el.searchList.hidden = false; el.searchIn.setAttribute('aria-expanded', 'true');
  }
  function closeSearch() { el.searchList.hidden = true; el.searchIn.setAttribute('aria-expanded', 'false'); }
  function pick(e) {
    closeSearch(); el.searchIn.value = '';
    app.focusSetting(e.tab, e.id);
  }
  function searchKey(e) {
    var items = Array.prototype.slice.call(el.searchList.children);
    if (e.key === 'Escape') { closeSearch(); el.searchIn.blur(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!hits.length) return;
      searchSel = (searchSel + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
      items.forEach(function (li, i) { li.classList.toggle('on', i === searchSel); });
    } else if (e.key === 'Enter' && hits[searchSel]) { e.preventDefault(); pick(hits[searchSel]); }
  }
  document.addEventListener('click', function (e) { if (el.search && !el.search.contains(e.target)) closeSearch(); });

  window.addEventListener('scroll', function () { if (el.head) el.head.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

  /* ------------------------------------------------------------------ boot */
  CRX.boot = function () {
    S.init();
    CRX.initShell();
    app.cur = idFromHash();
    buildHeader();
    paintStatus();
    renderPanel();
    window.addEventListener('hashchange', function () { var id = idFromHash(); if (id !== app.cur) selectTab(id); });
    window.addEventListener('resize', tabEdges);
    setInterval(function () { if (S.status === 'idle' && !S.anyDirty()) paintStatus(); }, 60000);
  };
})(window);
