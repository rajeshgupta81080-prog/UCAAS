/* Tab 3 - Ringing & voicemail: ring time, who it applies to, number diagnostics, shared voicemail settings. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, S = CRX.store;
  var RING = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

  CRX.registerTab({
    id: 'ringing-voicemail', title: 'Ringing & voicemail', short: 'Ringing & Voicemail', icon: 'bell',
    desc: 'How long phones ring before a call moves on, who the setting applies to, and the voicemail options.',
    products: ['switch'],
    settings: [{ id: 'ring-time', label: 'Default ring time', keywords: 'seconds rings voicemail drop call' }, { id: 'ring-apply', label: 'Use ring time for people added from now on', keywords: 'new users existing users' },
      { id: 'ring-diagnostics', label: 'Show numbers that would drop a call', keywords: 'diagnostics numbers voicemail' }],
    labels: { ringSeconds: 'Default ring time (seconds)', applyToNew: 'New people start with this ring time' },
    anchors: { ringSeconds: 'ring-time', applyToNew: 'ring-apply' },
    defaults: function () { return { ringSeconds: 30, applyToNew: true }; },
    validate: function (d) { var e = {}; if (!U.isInt(d.ringSeconds, 5, 60)) e.ringSeconds = 'Ring time must be a whole number from 5 to 60 seconds.'; return e; },
    risks: function (d, saved) {
      return d.ringSeconds < saved.ringSeconds && d.ringSeconds < 15 ? [{ title: 'Very short ring time', message: 'Phones will ring under 15 seconds, so calls may skip people. Use “Show numbers that would drop a call” first.' }] : [];
    },
    render: function (ctx) {
      var strip = ctx.dyn(function () {
        var s = ctx.get('ringSeconds'), ok = U.isInt(s, 5, 60);
        return h('div.strip', h('div.strip-i', h('small', 'Ring for'), h('b', ok ? s + ' seconds' : 'Not set')), h('span.strip-a', icon('chevR', 16)),
          h('div.strip-i', h('small', 'about'), h('b', ok ? Math.round(s / 5) + ' rings' : 'Not set')), h('span.strip-a', icon('chevR', 16)),
          h('div.strip-i', h('small', 'then'), h('b', 'Voicemail or the next step')), h('span.strip-n', 'Edit in the cards below.'));
      });
      var timeline = ctx.dyn(function () {
        var s = Number(ctx.get('ringSeconds')) || 0, pct = Math.max(0, Math.min(100, s / 60 * 100));
        return h('div.tl', { role: 'img', 'aria-label': 'Timeline: the phone rings for ' + s + ' seconds, then the call goes to voicemail' },
          h('div.tl-bar', h('span.tl-ring', { style: { width: pct + '%' } }, 'Rings'), h('span.tl-vm', { style: { width: (100 - pct) + '%' } }, s < 60 ? 'Voicemail / next step' : '')),
          h('div.tl-ax', h('i', '0 s'), h('i', '15 s'), h('i', '30 s'), h('i', '45 s'), h('i', '60 s')));
      });
      function diagnostics() {
        var m = UI.Modal({ title: 'Numbers that would drop a call', desc: 'Checking which numbers end a call instead of reaching voicemail…', size: 'lg', body: UI.Skeleton(4), footer: [UI.Button({ label: 'Close', kind: 'secondary', onClick: function () { m.close(); } })] });
        setTimeout(function () {
          var rows = [['+91 80 4567 0104', 'Enterprise hotline', 'Rings 1 person · no voicemail', 'The call would end after ' + ctx.get('ringSeconds') + ' seconds.'], ['1800 123 4567', 'Toll-free support', 'Rings a ring group · no overflow', 'The call would end if nobody answers.']];
          m.setBody(h('div', UI.Banner({ tone: 'warn', compact: true, title: U.plural(rows.length, 'number') + ' would drop a call', children: 'Add voicemail or an overflow destination before shortening the ring time.' }),
            h('div.table-lite', h('table.tl', h('thead', h('tr', h('th', 'Number'), h('th', 'Name'), h('th', 'Routing'), h('th', 'What happens'))),
              h('tbody', rows.map(function (r) { return h('tr', h('th', { scope: 'row' }, r[0]), h('td', r[1]), h('td', r[2]), h('td', r[3])); }))))));
        }, 700);
      }
      function vmToggle(path, title, desc, badges, extra, after) {
        var id = U.uid('vm');
        return UI.Row({ title: title, desc: desc, badges: badges, extra: extra, control: UI.Toggle({ checked: !!S.get('phone-rules').voicemail[path], label: title, id: id, onChange: function (v) { S.set('phone-rules', 'voicemail.' + path, v); if (after) after(v); } }) });
      }
      var emailSubs = h('div.indent', { hidden: !S.get('phone-rules').voicemail.emailCopy },
        vmToggle('emailToOwner', 'Send it to the person whose mailbox it is', 'Off sends everything to one fixed inbox.'),
        vmToggle('emailAttach', 'Attach the recording to the email', 'On sends the audio outside this system. Leave off if unsure.'),
        vmToggle('emailUserMayChange', 'Let people change this for themselves', 'Off means only an admin can change it.'));
      return h('div.stack',
        strip,
        UI.Section({ id: 'ring-time', icon: 'bell', title: 'Ring time', badges: UI.StatusBadge('active'), desc: 'Seconds a phone rings before the call moves on.',
          children: UI.Card({ children: [
            h('div.grid2',
              ctx.fieldSelect('ringSeconds', RING.map(function (s) { return { value: s, label: s + ' seconds — about ' + Math.round(s / 5) + ' rings' + (s === 30 ? ' (recommended)' : '') }; }), { label: 'Default ring time', required: true, hint: 'Allowed range: 5 to 60 seconds.', input: { number: true } }),
              h('div', h('div.fld-l', 'What this does to a call'), timeline)),
            UI.Banner({ tone: 'info', compact: true, title: 'Too short or too long?', children: 'Too short and calls skip people; too long and customers hang up before reaching voicemail.' }),
            UI.LiveImpact('Applied on every call. Reaches the phone system within about a minute.')] })}),
        UI.Section({ id: 'ring-apply', icon: 'users', title: 'Who it applies to', badges: UI.StatusBadge('active'), desc: 'Existing people keep their own ring time.',
          children: UI.Card({ children: [
            ctx.toggleRow('applyToNew', { title: 'Use this for people added from now on', desc: 'New people start with this ring time. Existing people keep theirs; it is applied once, when each person is created.' }),
            UI.Row({ id: 'ring-diagnostics', title: 'Show numbers that would drop a call', desc: 'Finds numbers where a call would end instead of reaching voicemail. Use it before shortening the ring time.',
              control: UI.Button({ label: 'Show numbers', icon: 'search', kind: 'secondary', onClick: diagnostics }) })] })}),
        UI.Section({ id: 'vm-here', icon: 'mail', title: 'Voicemail', desc: 'The same voicemail settings as on Phone rules — changing them here changes them there.',
          children: UI.Card({ children: [
            vmToggle('userMayChange', 'Who may change voicemail settings', 'Off: only an admin can change voicemail settings. On: people may change their own.', UI.StatusBadge('app')),
            vmToggle('emailCopy', 'Email a copy of new voicemail', 'Sends one email per new message, as it arrives. Saved only: no email is sent yet.', null, null, function (v) { emailSubs.hidden = !v; }),
            emailSubs,
            vmToggle('toText', 'Voicemail to text', 'Transcribes messages as well as keeping the audio. Company-wide.', UI.StatusBadge('active')),
            h('div.card-note', icon('info', 13), 'Applies to the whole company. Saved with the Save settings button above.')] })}));
    }
  });
})(window);
