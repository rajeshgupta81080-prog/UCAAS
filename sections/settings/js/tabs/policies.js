/* Tab 8 - Policies: language, recording access, voicemail policy, recording announcement, retention, international default. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, S = CRX.store;

  var WORDINGS = [
    'This call may be recorded or transcribed by us, or by a third party acting on our behalf.',
    'For quality and training, this call may be recorded and transcribed by us or by a third party service provider working on our behalf.',
    'To help us take notes, this call may be recorded, transcribed and monitored by us and by third party providers acting on our behalf.',
    'Before we begin: this call may be recorded or transcribed, either by our team or by a third party we work with, so that we can support you better.'
  ];
  var RET = [{ value: 'indefinite', label: 'Keep indefinitely (default)' }, { value: 'days', label: 'Keep for a set number of days' }, { value: 'sweep', label: 'Delete on the next nightly sweep' }];

  CRX.registerTab({
    id: 'policies', title: 'Policies', short: 'Policies', icon: 'shield',
    desc: 'Company-wide language, voicemail, recording, retention and dialling rules. The compliance centre.',
    products: ['switch', 'recording'],
    settings: [
      { id: 'pol-language', label: 'Default language and default country', keywords: 'prompt language ivr voices number search' },
      { id: 'pol-access', label: 'Who may listen to call recordings', keywords: 'play own calls admins' },
      { id: 'pol-voicemail', label: 'Voicemail policy', keywords: 'minimum pin length maximum message minutes new people' },
      { id: 'pol-notice', label: 'Call recording notice', keywords: 'announce recording consent wording one-party two-party' },
      { id: 'pol-retention', label: 'Data retention', keywords: 'keep delete recordings voicemail days legal hold' },
      { id: 'pol-intl', label: 'International calling for new users', keywords: 'blocked allowed dial abroad default' }],
    labels: { 'language': 'Prompt language', 'country': 'Default country', 'access.own': 'People can play their own calls', 'access.admins': 'Admins can play anyone’s calls',
      'voicemail.minPin': 'Minimum voicemail PIN length', 'voicemail.maxMinutes': 'Maximum voicemail length (minutes)', 'voicemail.newToText': 'New people start with voicemail-to-text',
      'recordingNotice.announce': 'Announce recording to callers', 'recordingNotice.playFor': 'Recording notice played for', 'recordingNotice.wording': 'Announcement wording',
      'retention.recordings.mode': 'Recording retention', 'retention.recordings.days': 'Recording retention (days)', 'retention.voicemail.mode': 'Voicemail retention', 'retention.voicemail.days': 'Voicemail retention (days)',
      'internationalForNew': 'International calling for new users' },
    formats: { 'recordingNotice.playFor': { all: 'All callers', 'except-one-party': 'All except one-party-consent states' },
      'retention.recordings.mode': { indefinite: 'Keep indefinitely', days: 'Keep for a set number of days', sweep: 'Delete on the next nightly sweep' }, 'retention.voicemail.mode': { indefinite: 'Keep indefinitely', days: 'Keep for a set number of days', sweep: 'Delete on the next nightly sweep' },
      internationalForNew: { blocked: 'Blocked for new users', allowed: 'Allowed for new users' }, country: function (c) { var x = CRX.data.country(c); return x ? x.name : c; } },
    anchors: { language: 'pol-language', country: 'pol-language', access: 'pol-access', voicemail: 'pol-voicemail', recordingNotice: 'pol-notice', retention: 'pol-retention', internationalForNew: 'pol-intl' },
    normalize: CRX.pruneWhen([{ on: function (x) { return x.retention.recordings.mode === 'days'; }, drop: ['retention.recordings.days'] }, { on: function (x) { return x.retention.voicemail.mode === 'days'; }, drop: ['retention.voicemail.days'] }, { on: function (x) { return x.recordingNotice.announce; }, drop: ['recordingNotice.playFor', 'recordingNotice.wording'] }]),
    defaults: function () {
      return { language: 'English (United States)', country: '', access: { own: true, admins: true }, voicemail: { minPin: 4, maxMinutes: 3, newToText: false },
        recordingNotice: { announce: true, playFor: 'all', wording: '' }, retention: { recordings: { mode: 'indefinite', days: 365 }, voicemail: { mode: 'indefinite', days: 90 } }, internationalForNew: 'blocked' };
    },
    validate: function (d) {
      var e = {};
      if (!U.isInt(d.voicemail.minPin, 4, 10)) e['voicemail.minPin'] = 'Use a whole number from 4 to 10 digits.';
      if (!U.isInt(d.voicemail.maxMinutes, 3, 15)) e['voicemail.maxMinutes'] = 'Use a whole number from 3 to 15 minutes.';
      ['recordings', 'voicemail'].forEach(function (k) { if (d.retention[k].mode === 'days' && !U.isInt(d.retention[k].days, 1, 3650)) e['retention.' + k + '.days'] = 'Enter a whole number of days from 1 to 3650.'; });
      if (d.recordingNotice.wording.length > 400) e['recordingNotice.wording'] = 'Keep the announcement under 400 characters.';
      return e;
    },
    risks: function (d, saved) {
      var out = [];
      if (saved.recordingNotice.announce && !d.recordingNotice.announce) out.push({ title: 'Recording announcement turned off', message: 'Many countries require telling callers. Check local rules first.' });
      ['recordings', 'voicemail'].forEach(function (k) {
        var a = saved.retention[k], b = d.retention[k];
        var shorter = (a.mode !== 'sweep' && b.mode === 'sweep') || (a.mode === 'indefinite' && b.mode === 'days') || (a.mode === 'days' && b.mode === 'days' && b.days < a.days);
        if (shorter) out.push({ title: 'Shorter ' + (k === 'recordings' ? 'recording' : 'voicemail') + ' retention', message: (b.mode === 'sweep' ? 'Everything of this kind that is already stored' : 'Audio and transcripts past the new limit') + ' will be deleted by the nightly clean-up and cannot be restored.' });
      });
      if (!d.access.admins && saved.access.admins) out.push({ title: 'Admins can no longer play others’ calls', message: 'Tell your team before changing who may hear recordings.' });
      return out;
    },
    render: function (ctx) {
      var wording = ctx.dyn(function () {
        var w = ctx.get('recordingNotice.wording');
        return h('div.fld', h('label.fld-l', { for: 'pol-wording' }, 'Announcement wording'),
          h('div.chips-row', h('span.mut', 'Ready-made:'), WORDINGS.map(function (t, i) { return h('button.chip-btn', { type: 'button', title: t, onClick: function () { ctx.set('recordingNotice.wording', t); ctx.rerender(); } }, 'Option ' + (i + 1)); }),
            h('button.chip-btn', { type: 'button', onClick: function () { ctx.set('recordingNotice.wording', ''); ctx.rerender(); } }, 'Use stock notice')),
          UI.Textarea({ id: 'pol-wording', rows: 3, maxlength: 420, placeholder: 'Empty — callers hear the stock notice', value: w, label: 'Announcement wording', onInput: function (v) { ctx.set('recordingNotice.wording', v); } }),
          h('div.fld-h', 'Leave empty to use the stock notice, or type your own.'), h('div.fld-e', { role: 'alert' }));
      }, function () { return [ctx.get('recordingNotice.announce')]; });
      // the wording field needs UI.syncErrors binding
      var wordingField = h('div', { dataset: { errPath: 'policies::recordingNotice.wording' } }, wording);
      var preview = ctx.dyn(function () {
        var n = ctx.get('recordingNotice');
        return n.announce ? h('div.notice-pre', icon('play', 14), h('div', h('small', 'What callers hear before the call connects'), h('p', '“' + (n.wording.trim() || 'This call may be recorded for quality and training purposes.') + '”'))) : null;
      });
      function retentionCard(key, title) {
        return h('div.ret', h('div.fld', h('label.fld-l', title), ctx.select('retention.' + key + '.mode', RET, { label: title, cls: 'sel-w' })),
          ctx.dyn(function () { return ctx.get('retention.' + key + '.mode') === 'days' ? ctx.fieldText('retention.' + key + '.days', { label: 'Keep for (days)', hint: '1 to 3650 days', input: { type: 'number', min: 1, max: 3650, number: true } }) : null; },
            function () { return [ctx.get('retention.' + key + '.mode')]; }));
      }
      var glance = ctx.dyn(function () {
        var d = ctx.d, ret = d.retention;
        function r(x) { return x.mode === 'indefinite' ? 'Kept indefinitely' : x.mode === 'sweep' ? 'Deleted on the next sweep' : 'Kept for ' + x.days + ' days'; }
        return UI.Glance([
          { icon: 'mic', label: 'Recording notice', value: d.recordingNotice.announce ? 'Announced' : 'Not announced', sub: d.recordingNotice.announce ? (d.recordingNotice.playFor === 'all' ? 'To all callers' : 'Except one-party-consent states') : 'Check local rules', tone: d.recordingNotice.announce ? 'ok' : 'warn' },
          { icon: 'clock', label: 'Recording retention', value: r(ret.recordings), sub: 'Voicemail: ' + r(ret.voicemail).toLowerCase(), tone: ret.recordings.mode === 'indefinite' ? 'neutral' : ret.recordings.mode === 'sweep' ? 'warn' : 'info' },
          { icon: 'eye', label: 'Who may listen', value: d.access.admins ? 'Admins hear all' : 'Admins: own calls', sub: d.access.own ? 'People hear their own calls' : 'People cannot play their own', tone: 'neutral' },
          { icon: 'globe', label: 'New users abroad', value: d.internationalForNew === 'blocked' ? 'Blocked' : 'Allowed', sub: 'Default for people added later', tone: d.internationalForNew === 'blocked' ? 'ok' : 'warn' }]);
      });
      return h('div.stack', glance,
        UI.Section({ id: 'pol-language', icon: 'globe', title: 'Defaults', badges: UI.StatusBadge('active'), children: UI.Card({ children: h('div.grid2',
          ctx.fieldSelect('language', ['English (United States)', 'English (United Kingdom)', 'English (India)', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese (Brazil)', 'Arabic', 'Japanese'], { label: 'Default language', hint: 'Used for voicemail prompts and phone-menu (IVR) voices.' }),
          ctx.fieldSelect('country', CRX.countryOptions('No default chosen'), { label: 'Default country', hint: 'The country your number search opens on.' })) }) }),
        UI.Section({ id: 'pol-access', icon: 'eye', title: 'Who may listen to call recordings', badges: UI.StatusBadge('active'), children: UI.Card({ children: [
          ctx.toggleRow('access.own', { title: 'People can play their own calls', desc: 'Off: nobody hears their own calls.' }),
          ctx.toggleRow('access.admins', { title: 'Admins can play anyone’s calls', desc: 'Off: admins see only their own. Tell your team before changing.' })] }) }),
        UI.Section({ id: 'pol-voicemail', icon: 'mail', title: 'Voicemail policy', badges: UI.StatusBadge('active'), children: UI.Card({ children: [
          h('div.grid2', ctx.fieldText('voicemail.minPin', { label: 'Minimum PIN length', hint: '4 to 10 digits. Checked when a person sets a new PIN.', input: { type: 'number', min: 4, max: 10, number: true, suffix: 'digits' } }),
            ctx.fieldText('voicemail.maxMinutes', { label: 'Maximum message length', hint: '3 to 15 minutes. The system stops the recording at this length.', input: { type: 'number', min: 3, max: 15, number: true, suffix: 'minutes' } })),
          ctx.toggleRow('voicemail.newToText', { title: 'New people start with voicemail-to-text on', desc: 'Applies to people added from now on; it is applied once, when each person is created.' })] }) }),
        UI.Section({ id: 'pol-notice', icon: 'mic', title: 'Call recording notice', badges: UI.StatusBadge('active'), desc: 'What callers are told about recording. This is not legal advice — check local rules.',
          children: UI.Card({ children: [
            ctx.dyn(function () { var m = S.get('phone-rules').recording.mode; return UI.KV([['What is recorded today', [m === 'off' ? 'Nothing is recorded' : m === 'auto' ? 'Calls are recorded automatically' : 'Only when someone starts recording', ' ', UI.Link('Phone rules › Call recording', 'phone-rules')]]]); }),
            ctx.toggleRow('recordingNotice.announce', { title: 'Announce recording to callers', desc: 'Many countries require it. Check local rules before turning it off.' }),
            ctx.dyn(function () {
              if (!ctx.get('recordingNotice.announce')) return UI.Banner({ tone: 'warn', compact: true, title: 'Callers will not be told', children: 'Turning the announcement off is not allowed in many places. Check local rules.' });
              return [h('div.fld', h('label.fld-l', 'Play the notice for'), UI.RadioCards({ label: 'Play the notice for', value: ctx.get('recordingNotice.playFor'), options: [
                { value: 'all', title: 'All callers', desc: 'Every recorded call. The safe choice.' },
                { value: 'except-one-party', title: 'All except one-party-consent states', desc: 'Skips US one-party-consent states by area code. Incoming calls only.' }], onChange: function (v) { ctx.set('recordingNotice.playFor', v); } })), wordingField, preview];
            }, function () { return [ctx.get('recordingNotice.announce')]; })] }) }),
        UI.Section({ id: 'pol-retention', icon: 'clock', title: 'Data retention', badges: UI.StatusBadge('active'), children: [
          UI.Banner({ tone: 'warn', title: 'Deleted audio and transcripts cannot be restored', children: 'A legal hold cannot be placed yet: the table that would record one has not been installed. Until it is, the nightly clean-up does not delete any voicemail at all for this company — it holds everything, because it cannot check for a hold.' }),
          UI.Card({ children: h('div.grid2', retentionCard('recordings', 'Call recordings'), retentionCard('voicemail', 'Voicemail messages')) })] }),
        UI.Section({ id: 'pol-intl', icon: 'globe', title: 'International calling', badges: UI.StatusBadge('active'), children: UI.Card({ children:
          UI.Row({ title: 'Default for new users', desc: 'Whether newly created users may dial abroad. Blocked is recommended.', control: ctx.select('internationalForNew', [{ value: 'blocked', label: 'Blocked for new users (recommended)' }, { value: 'allowed', label: 'Allowed for new users' }], { label: 'International calling default', cls: 'sel-w' }) }) }) }));
    }
  });
})(window);
