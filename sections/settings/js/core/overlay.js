/* Toast, Modal, Drawer and ConfirmationDialog. Accessible: role=dialog, aria-modal, focus trap, Esc, focus return. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util;

  /* ---------- toasts ---------- */
  // A repeated message updates the existing toast (x2, x3...) instead of stacking copies; at most 2 are visible.
  UI.toast = function (msg, tone, opts) {
    var region = document.getElementById('toasts');
    if (!region) return;
    opts = opts || {};
    var key = (tone || 'info') + '|' + msg, ms = opts.ms || (tone === 'danger' ? 7000 : 3200);
    var existing = Array.prototype.filter.call(region.children, function (n) { return n.dataset.key === key && !n.classList.contains('out'); })[0];
    if (existing) {
      existing._n = (existing._n || 1) + 1;
      existing.querySelector('.toast-n').textContent = '×' + existing._n; existing.querySelector('.toast-n').hidden = false;
      clearTimeout(existing._t); existing._t = setTimeout(existing._dismiss, ms);
      existing.classList.remove('bump'); void existing.offsetWidth; existing.classList.add('bump');
      return;
    }
    var ic = { ok: 'ok', warn: 'warn', danger: 'danger', info: 'info' }[tone || 'info'] || 'info';
    var t = h('div.toast.toast-' + (tone || 'info'), { dataset: { key: key } }, icon(ic, 15), h('span.toast-m', msg), h('span.toast-n', { hidden: true }),
      opts.action ? h('button.toast-a', { type: 'button', onClick: function () { opts.action.onClick(); dismiss(); } }, opts.action.label) : null,
      h('button.toast-x', { type: 'button', 'aria-label': 'Dismiss', onClick: function () { dismiss(); } }, icon('x', 13)));
    function dismiss() { clearTimeout(t._t); t.classList.add('out'); setTimeout(function () { t.remove(); }, 180); }
    t._dismiss = dismiss; t._t = setTimeout(dismiss, ms);
    region.appendChild(t);
    while (region.children.length > 2) region.firstChild.remove();
  };

  /* ---------- overlay core ---------- */
  var stack = [];
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function open(kind, o) {
    var returnTo = document.activeElement;
    var titleId = U.uid('ov-t');
    var closed = false;
    var bodyWrap = h('div.ov-body', o.body);
    var panel = h('div.ov-panel.ov-' + kind + (o.size ? '.ov-' + o.size : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' },
      h('header.ov-head', h('div.ov-ht', h('h2.ov-title', { id: titleId }, o.title), o.desc ? h('p.ov-desc', o.desc) : null),
        h('button.ov-close', { type: 'button', 'aria-label': 'Close', onClick: function () { handle.close('x'); } }, icon('x', 16))),
      bodyWrap,
      o.footer ? h('footer.ov-foot', o.footer) : null);
    var backdrop = h('div.ov-backdrop', { onMousedown: function (e) { if (e.target === backdrop && !o.persistent) handle.close('backdrop'); } }, panel);
    document.body.appendChild(backdrop);
    document.body.classList.add('ov-open');
    requestAnimationFrame(function () { backdrop.classList.add('in'); });

    function onKey(e) {
      if (stack[stack.length - 1] !== handle) return;
      if (e.key === 'Escape') { e.stopPropagation(); if (!o.persistent || o.escClose) handle.close('esc'); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(panel.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
      if (!f.length) { e.preventDefault(); return; }
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);

    var handle = {
      el: panel, body: bodyWrap,
      setBody: function (n) { bodyWrap.innerHTML = ''; bodyWrap.appendChild(n); },
      close: function (reason) {
        if (closed) return; closed = true;
        if (o.onClose && o.onClose(reason) === false) { closed = false; return; }
        stack.splice(stack.indexOf(handle), 1);
        document.removeEventListener('keydown', onKey, true);
        backdrop.classList.remove('in'); backdrop.classList.add('out');
        setTimeout(function () { backdrop.remove(); if (!stack.length) document.body.classList.remove('ov-open'); }, 160);
        if (returnTo && returnTo.focus && document.contains(returnTo)) returnTo.focus();
      }
    };
    stack.push(handle);
    setTimeout(function () {
      if (o.focusPanel) { panel.focus(); return; }
      var f = o.initialFocus ? panel.querySelector(o.initialFocus) : panel.querySelector('input:not([type=hidden]),select,textarea');
      (f || panel.querySelector('.ov-foot .cbtn-primary,.ov-foot .cbtn-danger') || panel).focus();
    }, 30);
    return handle;
  }
  UI.Modal = function (o) { return open('modal', o); };
  UI.Drawer = function (o) { return open('drawer', o); };
  UI.closeAllOverlays = function () { stack.slice().forEach(function (x) { x.close('programmatic'); }); };

  /** Resolves true when confirmed. */
  UI.confirm = function (o) {
    return new Promise(function (resolve) {
      var m = UI.Modal({
        title: o.title, size: 'sm', persistent: !!o.persistent,
        body: h('div.confirm-b', o.icon !== false ? h('div.confirm-i.' + (o.danger ? 'danger' : 'warn'), icon(o.danger ? 'danger' : 'warn', 20)) : null, h('div.confirm-t', o.message, o.details || null)),
        footer: [UI.Button({ label: o.cancelLabel || 'Cancel', kind: 'secondary', onClick: function () { m.close('cancel'); } }),
          UI.Button({ label: o.confirmLabel || 'Confirm', kind: o.danger ? 'danger' : 'primary', onClick: function () { resolve(true); done = true; m.close('ok'); } })],
        onClose: function () { if (!done) resolve(false); }
      });
      var done = false;
    });
  };

  /** Unsaved-changes dialog. Resolves 'continue' | 'discard' | 'save'. */
  UI.unsavedDialog = function (summary) {
    return new Promise(function (resolve) {
      var choice = 'continue';
      var m = UI.Modal({
        title: 'Unsaved changes', size: 'sm', persistent: true, escClose: true,
        body: h('div.confirm-b', h('div.confirm-i.warn', icon('warn', 20)), h('div.confirm-t', "You have changes that haven't been saved.", summary ? h('div.confirm-s', summary) : null)),
        footer: [UI.Button({ label: 'Continue editing', kind: 'secondary', onClick: function () { choice = 'continue'; m.close('c'); } }),
          UI.Button({ label: 'Discard changes', kind: 'ghost', onClick: function () { choice = 'discard'; m.close('d'); } }),
          UI.Button({ label: 'Save changes', kind: 'primary', onClick: function () { choice = 'save'; m.close('s'); } })],
        onClose: function () { resolve(choice); }
      });
    });
  };
})(window);
