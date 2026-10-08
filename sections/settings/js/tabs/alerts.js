/* Tab 12 - Alerts: rule table + builder, recent alerts with refresh and filters. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, S = CRX.store, D = CRX.data;

  function names(ids, list) { return ids.map(function (id) { var x = list.filter(function (y) { return y.id === id; })[0]; return x ? x.name : null; }).filter(Boolean); }
  function alertPill(s) { return UI.Pill(s, { Sent: 'info', Acknowledged: 'ok', Failed: 'danger' }[s] || 'neutral'); }

  CRX.registerTab({
    id: 'alerts', title: 'Alerts', short: 'Alerts', icon: 'bell',
    desc: 'Who is told when a queue is in trouble.',
    products: ['queues'],
    settings: [{ id: 'alert-rules', label: 'Alert rules', keywords: 'queue wait time service level abandon rate recipients' }, { id: 'recent-alerts', label: 'Recent alerts', keywords: 'fired history refresh' }],
    labels: { rules: 'Alert rules' },
    anchors: { rules: 'alert-rules' },
    defaults: function () {
      var base = { op: 'above', windowMin: 15, minCalls: 1, allQueues: false, audience: 'people', email: true, sms: false, webhook: false, webhookUrl: '' };
      function rule(o) { return Object.assign({}, base, o); }
      return { rules: [
        rule({ id: 'al1', name: 'Queue wait time exceeded', queues: ['q1', 'q2'], trigger: 'wait', threshold: 120, recipients: ['u3', 'u7'], enabled: true }),
        rule({ id: 'al2', name: 'Service level below threshold', queues: ['q1', 'q3'], trigger: 'sl', op: 'below', threshold: 80, recipients: ['u7'], enabled: true }),
        rule({ id: 'al3', name: 'Abandon rate increased', queues: ['q4'], trigger: 'abandon', threshold: 10, recipients: ['u3'], enabled: false })] };
    },
    validate: function (d) { var e = {}; d.rules.forEach(function (r) { if (!r.allQueues && !r.queues.length) e.rules = 'Every rule needs at least one queue.'; else if (r.audience !== 'all' && !r.recipients.length) e.rules = 'Every rule needs at least one person to tell.'; else if (r.email === false && !r.sms && !r.webhook) e.rules = 'Every rule needs at least one way to tell people.'; }); return e; },
    render: function (ctx) {
      var rulesHost = h('div'), recentHost = h('div'), rq = 'all', rs = 'all', loading = false;
      function rules() { return ctx.get('rules'); }
      function setRules(l) { ctx.set('rules', l); paintRules(); }

      function edit(r) { UI.AlertRuleBuilder(r, function (nr) { setRules(r ? rules().map(function (x) { return x.id === nr.id ? nr : x; }) : rules().concat([nr])); UI.toast(r ? 'Rule updated.' : 'Rule added.', 'ok'); }); }
      function remove(r) { UI.confirm({ title: 'Delete “' + r.name + '”?', message: 'Nobody will be told when this condition happens.', confirmLabel: 'Delete rule', danger: true }).then(function (ok) { if (ok) { setRules(rules().filter(function (x) { return x.id !== r.id; })); UI.toast('Rule deleted. Remember to save.', 'info'); } }); }
      function details(r) {
        var fired = S.recent.filter(function (a) { return a.type === r.name || a.type === (UI.ALERT_TRIGGERS[r.trigger] || {}).label; });
        var d = UI.Drawer({ title: r.name, desc: 'Alert rule details', body: h('div',
          UI.KV([['Status', r.enabled ? UI.Pill('On', 'ok') : UI.Pill('Off', 'neutral')], ['Condition', UI.alertSentence(r)], ['Judged once', (r.minCalls || 1) + ' call' + ((r.minCalls || 1) === 1 ? '' : 's') + ' in the window'], ['Queues', UI.alertQueues(r, D.queues).join(', ')], ['Who is told', UI.alertWho(r, D.users)], ['How', UI.alertHow(r)]]),
          h('h3.dr-h', 'Recently fired'), fired.length ? UI.AuditTimeline(fired.map(function (a) { return { title: a.queue + ' → ' + a.recipient, meta: U.fmtDateTime(a.at) + ' · ' + U.ago(a.at), tone: a.status === 'Failed' ? 'danger' : 'ok', body: a.status }; })) : h('p.mut', 'This rule has not fired yet.')),
          footer: [UI.Button({ label: 'Delete', kind: 'ghost', onClick: function () { d.close(); remove(r); } }), UI.Button({ label: 'Edit rule', icon: 'edit', kind: 'primary', onClick: function () { d.close(); edit(r); } })] });
      }
      function paintRules() {
        var list = rules();
        rulesHost.replaceChildren(!list.length ? UI.EmptyState({ icon: 'bell', title: 'No rules yet', body: 'Alert rules tell a supervisor when a queue is in trouble — for example when callers wait too long.', why: 'No rules have been created.', actions: [UI.Button({ label: 'Add rule', icon: 'plus', kind: 'primary', onClick: function () { edit(null); } })] })
          : UI.DataTable({ caption: 'Alert rules', rows: list, rowKey: 'id', onRowClick: details, columns: [
            { key: 'name', label: 'Rule', sortable: true, render: function (r) { return h('b', r.name); } },
            { key: 'queues', label: 'Queues', render: function (r) { return h('div.chips', UI.alertQueues(r, D.queues).map(function (n) { return UI.Chip(n); })); } },
            { key: 'trigger', label: 'Trigger', render: function (r) { return UI.describeTrigger(r); } },
            { key: 'recipients', label: 'Who is told', render: function (r) { return UI.alertWho(r, D.users); } },
            { key: 'enabled', label: 'Status', render: function (r) { return h('div.stat', UI.Toggle({ checked: r.enabled, label: (r.enabled ? 'Disable ' : 'Enable ') + r.name, onChange: function (v) { ctx.set('rules', rules().map(function (x) { if (x.id === r.id) { var y = U.clone(x); y.enabled = v; return y; } return x; })); } })); } },
            { key: 'a', label: 'Actions', align: 'right', render: function (r) { return h('div.acts', UI.IconButton('edit', 'Edit ' + r.name, function () { edit(r); }), UI.IconButton('trash', 'Delete ' + r.name, function () { remove(r); })); } }] }));
      }

      function paintRecent() {
        if (loading) { recentHost.replaceChildren(UI.Skeleton(4)); return; }
        var all = S.recent, list = all.filter(function (a) { return (rq === 'all' || a.queue === rq) && (rs === 'all' || a.status === rs); });
        recentHost.replaceChildren(!all.length ? UI.EmptyState({ icon: 'bell', title: 'Nothing has fired yet', body: 'Recent alerts appear here when a rule’s condition is met.', why: 'No alert has been triggered.' })
          : !list.length ? UI.EmptyState({ icon: 'filter', title: 'No alerts match', body: 'Clear a filter to see more.' })
          : UI.DataTable({ caption: 'Recent alerts', rows: list, rowKey: 'id', sortKey: 'at', sortDir: 'desc', pageSize: 8, columns: [
            { key: 'at', label: 'Time', sortable: true, render: function (a) { return h('span', U.fmtDateTime(a.at), h('small.mut', ' · ' + U.ago(a.at))); } },
            { key: 'queue', label: 'Queue', sortable: true }, { key: 'type', label: 'Alert type', sortable: true }, { key: 'recipient', label: 'Recipient' },
            { key: 'status', label: 'Status', render: function (a) { return alertPill(a.status); } }] }));
      }
      function refresh() { loading = true; paintRecent(); setTimeout(function () { loading = false; paintRecent(); UI.toast('Recent alerts refreshed.', 'info', { ms: 1800 }); }, 650); }
      paintRules(); paintRecent();

      var glance = ctx.dyn(function () {
        var rl = rules(), on = rl.filter(function (r) { return r.enabled; }), qs = {};
        on.forEach(function (r) { (r.allQueues ? D.queues.map(function (q) { return q.id; }) : r.queues).forEach(function (q) { qs[q] = 1; }); });
        var last = S.recent.slice().sort(function (a, b) { return new Date(b.at) - new Date(a.at); })[0];
        return UI.Glance([
          { icon: 'bell', label: 'Rules on', value: on.length + ' of ' + rl.length, sub: rl.length - on.length ? U.plural(rl.length - on.length, 'rule') + ' switched off' : 'All rules active', tone: on.length ? 'ok' : 'warn' },
          { icon: 'users', label: 'Queues covered', value: Object.keys(qs).length + ' of ' + D.queues.length, sub: D.queues.filter(function (q) { return !qs[q.id]; }).map(function (q) { return q.name; }).join(', ') || 'Every queue is watched', tone: Object.keys(qs).length === D.queues.length ? 'ok' : 'warn' },
          { icon: 'clock', label: 'Last alert', value: last ? U.ago(last.at) : 'Nothing yet', sub: last ? last.queue + ' · ' + last.status : 'No alert has fired', tone: 'neutral' }]);
      });
      return h('div.stack', glance,
        UI.Section({ id: 'alert-rules', icon: 'bell', title: 'Alert rules', badges: UI.StatusBadge('active'), desc: 'Alerts connect queue health to the right supervisor so problems are noticed quickly.',
          actions: UI.Button({ label: 'Add rule', icon: 'plus', kind: 'primary', size: 'sm', onClick: function () { edit(null); } }),
          children: UI.Card({ children: [ctx.dyn(function () { return ctx.err('rules') ? UI.Banner({ tone: 'danger', compact: true, title: 'Fix before saving', children: ctx.err('rules') }) : null; }), rulesHost] }) }),
        UI.Section({ id: 'recent-alerts', icon: 'list', title: 'Recent alerts', desc: 'What has fired recently.',
          actions: UI.Button({ label: 'Refresh', icon: 'refresh', kind: 'secondary', size: 'sm', onClick: refresh }),
          children: UI.Card({ children: [h('div.toolbar',
            UI.Select({ options: [{ value: 'all', label: 'All queues' }].concat(D.queues.map(function (q) { return q.name; })), value: 'all', label: 'Filter by queue', onChange: function (v) { rq = v; paintRecent(); } }),
            UI.Select({ options: [{ value: 'all', label: 'All statuses' }, 'Sent', 'Acknowledged', 'Failed'], value: 'all', label: 'Filter by status', onChange: function (v) { rs = v; paintRecent(); } })), recentHost] }) }));
    }
  });
})(window);
