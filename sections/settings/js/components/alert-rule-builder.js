/* AlertRuleBuilder: modal to create/edit a queue alert rule: what to watch, which queues, who is told and how. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, UI = CRX.ui, U = CRX.util;

  // `trigger` keeps the old key names (wait / sl / abandon) so existing rules and the recent-alerts match keep working.
  var TRIGGERS = {
    sl: { label: 'Service level', unit: '%', field: 'Percent', min: 1, max: 100, def: 80, op: 'below', hint: 'The share of calls answered within the queue’s target time. Short hang-ups are left out.' },
    asa: { label: 'Average speed of answer', unit: 'seconds', field: 'Seconds', min: 1, max: 3600, def: 40, op: 'above', hint: 'How long callers wait, on average, before an agent picks up.' },
    wait: { label: 'Longest wait', unit: 'seconds', field: 'Seconds', min: 10, max: 3600, def: 120, op: 'above', hint: 'The time the longest-waiting caller has been in the queue.' },
    abandon: { label: 'Abandon rate', unit: '%', field: 'Percent', min: 1, max: 100, def: 10, op: 'above', hint: 'The share of callers who hang up before an agent answers.' },
    waiting: { label: 'Calls waiting', unit: 'calls', field: 'Calls', min: 1, max: 500, def: 5, op: 'above', hint: 'How many callers are in the queue at the same moment.' }
  };
  var WINDOWS = [5, 15, 30, 60];
  UI.ALERT_TRIGGERS = TRIGGERS;

  function defaults() {
    return { id: U.uid('al'), name: '', trigger: 'sl', op: 'below', threshold: TRIGGERS.sl.def, windowMin: 15, minCalls: 1, allQueues: true, queues: [], audience: 'all', recipients: [], email: true, sms: false, webhook: false, webhookUrl: '', enabled: true };
  }
  function fill(r) { var d = defaults(); Object.keys(d).forEach(function (k) { if (r[k] === undefined) r[k] = (k === 'allQueues' ? !(r.queues && r.queues.length) : k === 'audience' ? 'people' : d[k]); }); if (r.op === undefined || !r.op) r.op = (TRIGGERS[r.trigger] || {}).op || 'above'; return r; }

  UI.alertSentence = function (r) {
    var t = TRIGGERS[r.trigger]; if (!t) return '';
    var unit = t.unit === '%' ? '%' : ' ' + t.unit;
    return t.label + ' ' + (r.op === 'below' ? 'drops below' : 'goes above') + ' ' + r.threshold + unit + ' over the last ' + (r.windowMin || 15) + ' minutes';
  };
  UI.describeTrigger = function (r) { var t = TRIGGERS[r.trigger]; return t ? t.label + ' ' + (r.op === 'below' ? '< ' : '> ') + r.threshold + (t.unit === '%' ? '%' : ' ' + (t.unit === 'seconds' ? 's' : t.unit)) + ' · ' + (r.windowMin || 15) + ' min' : '—'; };
  UI.alertQueues = function (r, queues) { return r.allQueues ? ['All queues'] : (r.queues || []).map(function (id) { var q = queues.filter(function (x) { return x.id === id; })[0]; return q ? q.name : null; }).filter(Boolean); };
  UI.alertWho = function (r, users) { return r.audience === 'all' ? 'All admins and supervisors' : (r.recipients || []).map(function (id) { var u = users.filter(function (x) { return x.id === id; })[0]; return u ? u.name : null; }).filter(Boolean).join(', '); };
  UI.alertHow = function (r) { return [r.email !== false ? 'Email' : null, r.sms ? 'Text message' : null, r.webhook ? 'Webhook' : null].filter(Boolean).join(', ') || 'Nothing selected'; };

  /** existing: rule to edit or null. onSave(rule) receives the finished rule. */
  UI.AlertRuleBuilder = function (existing, onSave) {
    var r = existing ? fill(U.clone(existing)) : defaults();
    var errEls = { value: h('div.fld-e', { role: 'alert' }), min: h('div.fld-e', { role: 'alert' }), queues: h('div.fld-e', { role: 'alert' }), who: h('div.fld-e', { role: 'alert' }), how: h('div.fld-e', { role: 'alert' }), hook: h('div.fld-e', { role: 'alert' }) };

    /* live title */
    var title = h('span.arb-title'), nameIn;
    function paintTitle() { title.textContent = UI.alertSentence(r); if (nameIn) nameIn.placeholder = UI.alertSentence(r); }

    /* what to watch */
    var valHost = h('div.fld'), hintEl = h('div.fld-h'), opSel, valLbl;
    function paintValue() {
      var t = TRIGGERS[r.trigger];
      valHost.replaceChildren(h('label.fld-l', { for: 'al-v' }, t.field), UI.Input({ id: 'al-v', type: 'number', min: t.min, max: t.max, value: r.threshold, label: t.field, inputmode: 'numeric', onInput: function (v) { r.threshold = v === '' ? '' : Number(v); paintTitle(); } }), errEls.value);
      hintEl.textContent = t.hint + ' Allowed ' + t.min + '–' + t.max + ' ' + t.unit + '.';
    }
    var watchSel = UI.Select({ id: 'al-w', value: r.trigger, label: 'Watch', options: Object.keys(TRIGGERS).map(function (k) { return { value: k, label: TRIGGERS[k].label }; }),
      onChange: function (v) { r.trigger = v; r.threshold = TRIGGERS[v].def; r.op = TRIGGERS[v].op; opHost.replaceChildren(makeOp()); paintValue(); paintTitle(); } });
    function makeOp() { return UI.Select({ id: 'al-o', value: r.op, label: 'When it', options: [{ value: 'below', label: 'drops below' }, { value: 'above', label: 'goes above' }], onChange: function (v) { r.op = v; paintTitle(); } }); }
    var opHost = h('div', makeOp());
    var winSel = UI.Select({ id: 'al-win', value: String(r.windowMin), label: 'Over the', options: WINDOWS.map(function (m) { return { value: String(m), label: 'last ' + m + ' minutes' }; }), onChange: function (v) { r.windowMin = Number(v); paintTitle(); } });
    var minIn = UI.Input({ id: 'al-min', type: 'number', min: 1, max: 1000, value: r.minCalls, label: 'Minimum calls', inputmode: 'numeric', cls: 'arb-n', onInput: function (v) { r.minCalls = v === '' ? '' : Number(v); } });

    /* queues: chips */
    var chipHost = h('div.arb-chips', { role: 'group', 'aria-label': 'On which queues' });
    function paintChips() {
      var qs = CRX.data.queues;
      chipHost.replaceChildren.apply(chipHost, [h('button.qchip' + (r.allQueues ? '.on' : ''), { type: 'button', 'aria-pressed': String(r.allQueues), onClick: function () { r.allQueues = true; r.queues = []; paintChips(); } }, 'All queues')].concat(qs.map(function (q) {
        var on = !r.allQueues && r.queues.indexOf(q.id) >= 0;
        return h('button.qchip' + (on ? '.on' : ''), { type: 'button', 'aria-pressed': String(on), onClick: function () {
          var i = r.queues.indexOf(q.id); r.allQueues = false;
          if (i >= 0) r.queues.splice(i, 1); else r.queues.push(q.id);
          if (!r.queues.length) r.allQueues = true; paintChips(); } }, q.name);
      })));
    }

    /* who is told */
    var peopleHost = h('div.arb-people', { hidden: r.audience !== 'people' }, UI.UserSelector({ value: r.recipients, onChange: function (v) { r.recipients = v; } }));
    function radio(value, label) {
      var i = h('input', { type: 'radio', name: 'al-aud', value: value, checked: r.audience === value, onChange: function () { r.audience = value; peopleHost.hidden = value !== 'people'; } });
      return h('label.arb-radio', i, h('span', label));
    }

    /* how */
    var hookIn = UI.Input({ id: 'al-hook', type: 'url', value: r.webhookUrl, placeholder: 'https://…', label: 'Webhook address', onInput: function (v) { r.webhookUrl = v; } });
    var hookBox = h('div.arb-hook', { hidden: !r.webhook }, h('label.fld-l', { for: 'al-hook' }, 'Webhook address'), hookIn, errEls.hook);
    function how(label, key, extra, after) {
      var id = U.uid('arb');
      return h('div.arb-how', UI.Toggle({ checked: !!r[key], labelledby: id, onChange: function (v) { r[key] = v; after && after(v); } }), h('span', { id: id }, label), extra || null);
    }

    function submit() {
      Object.keys(errEls).forEach(function (k) { errEls[k].textContent = ''; });
      var t = TRIGGERS[r.trigger], bad = false;
      if (!U.isInt(r.threshold, t.min, t.max)) { errEls.value.textContent = 'Enter a whole number from ' + t.min + ' to ' + t.max + '.'; bad = true; }
      if (!U.isInt(r.minCalls, 1, 1000)) { errEls.min.textContent = 'Enter a whole number from 1 to 1000.'; bad = true; }
      if (r.audience === 'people' && !r.recipients.length) { errEls.who.textContent = 'Choose who should be told, or pick all admins and supervisors.'; bad = true; }
      if (!r.email && !r.sms && !r.webhook) { errEls.how.textContent = 'Choose at least one way to tell them.'; bad = true; }
      if (r.webhook && !/^https?:\/\/\S+$/i.test(r.webhookUrl.trim())) { errEls.hook.textContent = 'Enter a web address that starts with https://'; bad = true; }
      if (bad) return;
      r.name = r.name.trim() || UI.alertSentence(r); r.webhookUrl = r.webhook ? r.webhookUrl.trim() : ''; onSave(r); m.close();
    }

    nameIn = UI.Input({ id: 'al-n', value: r.name, maxlength: 80, placeholder: UI.alertSentence(r), label: 'Name (optional)', onInput: function (v) { r.name = v; } });
    paintValue(); paintTitle(); paintChips();
    var m = UI.Modal({ title: existing ? 'Edit alert rule' : 'Add alert rule', desc: 'Tell the right people when a queue is in trouble.', size: 'lg',
      body: h('form.form.arb', { onSubmit: function (e) { e.preventDefault(); submit(); } },
        h('div.arb-head', h('span.arb-type', 'Rule type: Queue'), title),
        h('div.fld', h('label.fld-l', { for: 'al-n' }, 'Name ', h('span.opt', '(optional)')), nameIn),
        h('div.arb-grid',
          h('div.fld', h('label.fld-l', { for: 'al-w' }, 'Watch'), watchSel),
          h('div.fld', h('label.fld-l', { for: 'al-o' }, 'When it'), opHost),
          valHost,
          h('div.fld', h('label.fld-l', { for: 'al-win' }, 'Over the'), winSel)),
        hintEl,
        h('div.arb-min', h('label.fld-l', { for: 'al-min' }, 'Only judge once the window has at least'), minIn, h('span.mut', 'calls'), errEls.min),
        h('div.fld', h('div.fld-l', 'On which queues'), chipHost, errEls.queues),
        h('div.arb-cols',
          h('div.fld', h('div.fld-l', 'Who is told'), h('div.arb-radios', { role: 'radiogroup', 'aria-label': 'Who is told' }, radio('all', 'All admins and supervisors'), radio('people', 'These people')), peopleHost, errEls.who),
          h('div.fld', h('div.fld-l', 'How'),
            how('Email', 'email'),
            how('Text message', 'sms', UI.Pill('Costs credits', 'warn')),
            how('Webhook (optional)', 'webhook', null, function (v) { hookBox.hidden = !v; }), hookBox, errEls.how))),
      footer: [UI.Button({ label: 'Cancel', kind: 'secondary', onClick: function () { m.close(); } }), UI.Button({ label: existing ? 'Save rule' : 'Add rule', kind: 'primary', onClick: submit })] });
    return m;
  };
})(window);
