/* Tab 1 - Phone rules: location, opening hours, recording -> transcription -> monitoring, caller ID, voicemail, supervision. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, S = CRX.store, D = CRX.data;

  function scope() { return { give: false, lock: false }; }
  function day(open) { return { open: open, ranges: open ? [{ from: '09:00', to: '18:00' }] : [] }; }

  var SCOPES = [['location', 'Where this company works'], ['hours', 'When you are open'], ['recording', 'Call recording'], ['transcription', 'Transcription'], ['monitoring', 'Call monitoring'], ['callerId', 'The number people see']];

  function recordingLabel(r) { return r.mode === 'off' ? 'Nothing is recorded' : r.mode === 'auto' ? 'Calls are recorded automatically' : 'Recorded only when someone starts recording'; }
  function numberOf(id) { return D.numbers.filter(function (n) { return n.id === id; })[0]; }
  function shownNumber(c) {
    var n = numberOf(c.numberId); if (!n) return '';
    var digits = n.number.replace(/[^\d]/g, '');
    if (c.strip) digits = digits.slice(c.strip);
    var base = c.strip || c.prefix || c.suffix ? digits : n.number;
    return (c.prefix || '') + base + (c.suffix || '');
  }

  CRX.registerTab({
    id: 'phone-rules', title: 'Phone rules', short: 'Phone Rules', icon: 'phone',
    desc: 'The rules everybody starts with: where the company works, when it is open, what is recorded and which number people see.',
    products: ['switch', 'recording', 'reports'],
    settings: [
      { id: 'location', label: 'Company location, country and time zone', keywords: 'timezone clock where company works india' },
      { id: 'hours', label: 'Opening hours', keywords: 'schedule open closed 24 hours weekdays closed-hours destination' },
      { id: 'recording', label: 'Call recording', keywords: 'record automatic manual notice' },
      { id: 'transcription', label: 'Transcription', keywords: 'write calls out as text transcript' },
      { id: 'monitoring', label: 'Call monitoring', keywords: 'sentiment recap follow-ups topics transcripts' },
      { id: 'caller-id', label: 'Outbound caller ID (the number people see)', keywords: 'prefix suffix number display' },
      { id: 'voicemail', label: 'Voicemail card', keywords: 'email copy voicemail to text pin message length' },
      { id: 'supervision', label: 'Call supervision policy', keywords: 'monitor whisper barge takeover announce supervisor conference' }
    ],
    labels: { 'location.country': 'Company country', 'location.timezone': 'Company time zone', 'hours.mode': 'Opening hours mode', 'hours.weekdays.from': 'Opens at (weekdays)', 'hours.weekdays.to': 'Closes at (weekdays)',
      'hours.days': 'Custom opening hours', 'recording.mode': 'Call recording', 'recording.direction': 'Recording direction', 'transcription.enabled': 'Transcription', 'monitoring.enabled': 'Call monitoring',
      'callerId.numberId': 'Outgoing caller ID', 'callerId.prefix': 'Caller ID prefix', 'callerId.suffix': 'Caller ID suffix', 'callerId.strip': 'Leading digits removed',
      'voicemail.userMayChange': 'Who may change voicemail settings', 'voicemail.emailCopy': 'Email a copy of new voicemail', 'voicemail.emailToOwner': 'Email goes to the mailbox owner', 'voicemail.emailAttach': 'Attach the recording to the email', 'voicemail.emailUserMayChange': 'People may change the email copy', 'voicemail.toText': 'Voicemail to text',
      'location': 'Company location', 'hours': 'Opening hours', 'recording': 'Call recording', 'transcription': 'Transcription', 'monitoring': 'Call monitoring', 'callerId': 'Outbound caller ID',
      'supervision.announce': 'Announce a supervisor joining a call', 'supervision.direction': 'Which direction is recorded', 'supervision.conference': 'When a conference changes', 'supervision.externalTransfer': 'External transfer permission' },
    formats: {
      'recording.mode': { off: 'Nothing is recorded', auto: 'Recorded automatically', manual: 'Only when someone starts it' },
      'recording.direction': { both: 'Both directions', inbound: 'Incoming only', outbound: 'Outgoing only' },
      'hours.mode': { '24h': 'Open 24 hours', weekdays: 'Weekdays', custom: 'Custom schedule' },
      'callerId.numberId': function (id) { var n = numberOf(id); return n ? n.number : id; },
      'supervision.announce': { announce: 'Announce the supervisor', silent: 'Stay silent' },
      'supervision.direction': { both: 'Both directions', inbound: 'Inbound only', outbound: 'Outbound only' },
      'supervision.conference': { 'continue': 'Continue recording', restart: 'Start a new recording', stop: 'Stop recording' },
      'supervision.externalTransfer': { company: 'Company-wide', office: 'Per office' }
    },
    anchors: { location: 'location', hours: 'hours', recording: 'recording', transcription: 'transcription', monitoring: 'monitoring', callerId: 'caller-id', voicemail: 'voicemail', supervision: 'supervision',
      'supervision.announce': 'sup-announce', 'supervision.direction': 'sup-direction', 'supervision.conference': 'sup-conference', 'supervision.externalTransfer': 'sup-externalTransfer',
      'supervision.scopes.announce': 'sup-announce', 'supervision.scopes.direction': 'sup-direction', 'supervision.scopes.conference': 'sup-conference', 'supervision.scopes.externalTransfer': 'sup-externalTransfer' },
    normalize: CRX.pruneWhen([{ on: function (x) { return x.voicemail.emailCopy; }, drop: ['voicemail.emailToOwner', 'voicemail.emailAttach', 'voicemail.emailUserMayChange'] }, { on: function (x) { return x.recording.mode === 'auto'; }, drop: ['recording.direction'] }, { on: function (x) { return x.hours.mode === 'weekdays'; }, drop: ['hours.weekdays'] }, { on: function (x) { return x.hours.mode === 'custom'; }, drop: ['hours.days'] }]),
    defaults: function () {
      return {
        location: { country: 'IN', timezone: 'Asia/Kolkata', scope: { give: true, lock: true } },
        hours: { mode: 'weekdays', weekdays: { from: '09:00', to: '18:00' },
          days: { mon: day(true), tue: day(true), wed: day(true), thu: day(true), fri: day(true), sat: day(false), sun: day(false) }, scope: { give: true, lock: false } },
        recording: { mode: 'off', direction: 'both', scope: scope() },
        transcription: { enabled: false, scope: scope() },
        monitoring: { enabled: false, scope: scope() },
        callerId: { numberId: 'n1', prefix: '', suffix: '', strip: 0, scope: scope() },
        voicemail: { userMayChange: false, emailCopy: false, emailToOwner: true, emailAttach: false, emailUserMayChange: false, toText: false },
        supervision: { announce: 'announce', direction: 'both', conference: 'continue', externalTransfer: 'company',
          scopes: { announce: scope(), direction: scope(), conference: scope(), externalTransfer: scope() } }
      };
    },
    validate: function (d) {
      var e = {};
      if (!d.location.country) e['location.country'] = 'Choose the country the company works in.';
      if (!d.location.timezone) e['location.timezone'] = 'Choose a time zone. Opening hours and holidays depend on it.';
      else { var c = D.country(d.location.country); if (c && c.zones.indexOf(d.location.timezone) < 0) e['location.timezone'] = 'This time zone does not belong to the selected country.'; }
      Object.assign(e, UI.validateHours(d.hours));
      if (!d.callerId.numberId) e['callerId.numberId'] = 'Choose the number people will see.';
      if (!/^\+?\d{0,6}$/.test(d.callerId.prefix || '')) e['callerId.prefix'] = 'Use digits only (an optional leading +), up to 6 characters.';
      if (!/^\d{0,6}$/.test(d.callerId.suffix || '')) e['callerId.suffix'] = 'Use digits only, up to 6 characters.';
      if (d.callerId.strip !== '' && !U.isInt(d.callerId.strip, 0, 6)) e['callerId.strip'] = 'Enter a whole number from 0 to 6.';
      return e;
    },
    risks: function (d, saved) {
      var out = [];
      var bad = SCOPES.filter(function (s) { return d[s[0]].scope.lock && !d[s[0]].scope.give; }).map(function (s) { return s[1]; });
      if (bad.length) out.push({ title: 'Locked without giving a value', message: bad.join(', ') + ' — everyone is frozen where they are today and nothing is switched on.' });
      var pol = S.get('policies');
      if (d.recording.mode === 'auto' && pol && !pol.recordingNotice.announce) out.push({ title: 'Recording without an announcement', message: 'Calls will be recorded automatically while “Announce recording to callers” is off in Policies. Many countries require telling callers.' });
      if (d.hours.scope.lock && d.hours.scope.give && d.hours.mode === '24h') out.push({ title: 'Locked 24-hour schedule', message: 'Everyone is locked to “open 24 hours”, so closed-hours destinations will never trigger.' });
      return out;
    },

    render: function (ctx) {
      var d = ctx.d;
      var editor;

      /* ---- A. location ---- */
      function locationSummary() {
        var l = ctx.get('location'), c = D.country(l.country);
        if (!l.country || !l.timezone) return UI.Banner({ tone: 'warn', title: 'Not set yet', children: 'Nothing that depends on the clock will behave predictably until it is. Set the company location first.' });
        return h('div.loc',
          h('div.loc-i', icon('mapPin', 18)),
          UI.KV([['Country', c ? c.name : l.country], ['Time zone', l.timezone.replace('_', ' ')], ['Local time now', CRX.tzNow(l.timezone) + ' · offset ' + CRX.tzOffset(l.timezone)]]));
      }
      function openLocation() {
        var country = ctx.get('location.country'), tz = ctx.get('location.timezone');
        var tzSel = h('div'), pre = h('div.fld-h'), cInfo = h('div.fld-h'), err = h('div.fld-e.show', { role: 'alert' });
        var cSel = UI.Select({ options: CRX.countryOptions('Select country…'), value: country, label: 'Country', id: 'loc-c', onChange: function (v) { country = v; var c = D.country(v); tz = c ? c.zones[0] : ''; paintTz(); } });
        function paintCode() { var c = D.country(country); cInfo.textContent = c ? 'Country code ' + c.code + ' · Dialling code ' + c.dial : ''; }
        function paintTz() {
          paintCode();
          var c = D.country(country);
          tzSel.replaceChildren(UI.Select({ options: c ? c.zones : [{ value: '', label: 'Choose a country first' }], value: tz, label: 'Time zone', id: 'loc-t', disabled: !c, onChange: function (v) { tz = v; pre.textContent = tz ? 'It is now ' + CRX.tzNow(tz) + ' there (' + CRX.tzOffset(tz) + ').' : ''; } }));
          pre.textContent = tz ? 'It is now ' + CRX.tzNow(tz) + ' there (' + CRX.tzOffset(tz) + ').' : '';
        }
        paintTz();
        var m = UI.Modal({ title: 'Change company location', desc: 'The company time zone is the clock for opening hours, holidays and times shown in reports.',
          body: h('div.form', h('div.fld', h('label.fld-l', { for: 'loc-c' }, 'Country ', h('span.req', '*')), cSel, cInfo), h('div.fld', h('label.fld-l', { for: 'loc-t' }, 'Time zone ', h('span.req', '*')), tzSel, pre), err),
          footer: [UI.Button({ label: 'Cancel', kind: 'secondary', onClick: function () { m.close(); } }), UI.Button({ label: 'Apply', kind: 'primary', onClick: function () {
            if (!country) { err.textContent = 'Choose a country.'; return; }
            if (!tz) { err.textContent = 'Choose a time zone.'; return; }
            ctx.set('location.country', country); ctx.set('location.timezone', tz);
            if (editor) editor.refresh(); m.close(); UI.toast('Company location updated. Remember to save.', 'info');
          } })] });
      }
      var sLocation = UI.Section({ id: 'location', icon: 'mapPin', title: 'Company location', badges: UI.StatusBadge('active'),
        desc: 'The company time zone controls opening hours, holidays and the times shown in reports.',
        children: UI.Card({ children: [
          h('div.loc-row', ctx.dyn(locationSummary), UI.Button({ label: 'Change', icon: 'edit', kind: 'secondary', onClick: openLocation })),
          ctx.dyn(function () { return [ctx.err('location.country') ? h('div.fld-e.show', ctx.err('location.country')) : null, ctx.err('location.timezone') ? h('div.fld-e.show', ctx.err('location.timezone')) : null]; }),
          ctx.scope('location.scope', { noun: 'the company location' })] }) });

      /* ---- B. opening hours ---- */
      editor = UI.ScheduleEditor(ctx, 'hours');
      var sHours = UI.Section({ id: 'hours', icon: 'clock', title: 'Opening hours', badges: UI.StatusBadge('active'),
        desc: 'Calls outside these hours follow the closed-hours destination on the number that was dialled.',
        children: UI.Card({ children: [editor, UI.LiveImpact('Outside these hours a call goes to the closed-hours destination set on the number dialled. Changes reach the phone system within about a minute.'), ctx.scope('hours.scope', { noun: 'the opening hours' })] }) });

      /* ---- C. recording pipeline ---- */
      function pipeline() {
        var r = ctx.get('recording'), t = ctx.get('transcription'), m = ctx.get('monitoring');
        var rOn = r.mode !== 'off', tOn = t.enabled, mOn = m.enabled && t.enabled;
        function step(n, title, on, blocked, text) {
          return h('li.pipe-s' + (on ? '.on' : '') + (blocked ? '.blocked' : ''), h('span.pipe-n', on ? icon('check', 13) : n), h('div', h('b', title), h('small', text)));
        }
        return h('ol.pipe', { 'aria-label': 'How recording, transcription and monitoring depend on each other' },
          step(1, 'Recording', rOn, false, recordingLabel(r)),
          step(2, 'Transcription', tOn, false, tOn ? (rOn ? 'Recorded calls are written out as text' : 'On, but nothing is recorded yet') : 'Off — calls stay audio only'),
          step(3, 'Call monitoring', mOn, !tOn, !tOn ? 'Needs transcription' : mOn ? 'Transcripts are read for recap and sentiment' : 'Off'));
      }
      /* Announcement players shown under the chosen recording mode. */
      function player(label, length) {
        var total = length, t = 0, timer = null, bar, time, btn;
        function fmt(x) { return Math.floor(x / 60) + ':' + ('0' + Math.floor(x % 60)).slice(-2); }
        function paint() { time.textContent = fmt(t) + ' / ' + fmt(total); bar.value = String(Math.round(t / total * 1000)); btn.replaceChildren(icon(timer ? 'pause' : 'play', 14)); btn.setAttribute('aria-label', (timer ? 'Pause ' : 'Play ') + label); }
        function stop() { clearInterval(timer); timer = null; }
        btn = h('button.mp-b', { type: 'button', onClick: function () {
          if (timer) { stop(); paint(); return; }
          if (t >= total) t = 0;
          timer = setInterval(function () { t += .1; if (t >= total) { t = total; stop(); } paint(); }, 100); paint(); } });
        bar = h('input.mp-bar', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': label + ' position', onInput: function () { t = Number(bar.value) / 1000 * total; paint(); } });
        time = h('span.mp-t');
        var wrap = h('div.mp', btn, time, bar, h('span.mp-i', icon('wave', 15)), h('span.mp-i', icon('more', 15)));
        wrap.stop = stop; paint();
        return wrap;
      }
      var sRecording = UI.Section({ id: 'recording', icon: 'mic', title: 'Call recording', badges: UI.StatusBadge('active'),
        desc: 'Choose whether calls are recorded automatically or only when somebody starts recording.',
        children: [UI.Card({ title: 'Recording → transcription → monitoring', desc: 'Each step needs the one before it.', children: ctx.dyn(pipeline) }),
          UI.Card({ children: [
            UI.RadioCards({ label: 'Call recording mode', value: d.recording.mode, options: [
              { value: 'off', title: 'Nothing is recorded', desc: 'The company has no opinion. Each person keeps their own choice.' },
              { value: 'auto', title: 'Record calls automatically', desc: 'Every call to or from a person, menu, queue or forwarded outside number.' },
              { value: 'manual', title: 'Only when someone starts recording', desc: 'People choose during the call.' }],
              onChange: function (v) { ctx.set('recording.mode', v); } }),
            ctx.dyn(function () {
              var r = ctx.get('recording'), pol = S.get('policies'), out = [];
              function ann(label, sr, len, note) { return h('div.ro-a', h('div.ro-l', label), player(sr, len), h('div.ro-n', note)); }
              var rp = null;
              if (r.mode === 'auto') rp = [
                h('div.ro-a', h('label.ro-l', { for: 'rec-dir' }, 'Direction recorded'),
                  UI.Select({ id: 'rec-dir', value: r.direction, label: 'Direction recorded', options: [{ value: 'both', label: 'Both directions' }, { value: 'inbound', label: 'Incoming calls only' }, { value: 'outbound', label: 'Outgoing calls only' }], onChange: function (v) { ctx.set('recording.direction', v); } }),
                  h('div.ro-n', 'Which side of each call is recorded.')),
                ann('Call Recording Announcement', 'Call recording announcement', 3, 'Played to the caller before the call connects.')];
              if (r.mode === 'manual') rp = [
                ann('Announcement on Start', 'Announcement on start', 1, 'Played when someone starts recording.'),
                ann('Announcement on Stop', 'Announcement on stop', 1, 'Played when the recording stops.')];
              if (rp) out.push(h('div.ro-opt', h('div.ro-g', rp)));
              if (r.mode !== 'off') out.push(pol && pol.recordingNotice.announce
                ? UI.Banner({ tone: 'info', compact: true, title: 'Recording notice is on', children: ['The caller hears the notice before the call connects; on outbound calls the person called hears it. ', UI.Link('Edit in Policies', 'policies')] })
                : UI.Banner({ tone: 'warn', compact: true, title: 'Recording notice is off', children: ['Many countries require telling callers. ', UI.Link('Turn it on in Policies', 'policies')] }));
              return out;
            }, function () { return [ctx.get('recording.mode'), ctx.get('recording.direction'), (S.get('policies') || { recordingNotice: {} }).recordingNotice.announce]; }),
            UI.LiveImpact('Each recording appears next to its call in the call logs.'),
            ctx.scope('recording.scope', { noun: 'call recording' })] })] });

      /* ---- D. transcription ---- */
      var sTrans = UI.Section({ id: 'transcription', icon: 'msg', title: 'Transcription', badges: UI.StatusBadge('active'),
        desc: 'Write recorded calls out as text so they can be read and searched instead of listened to.',
        children: UI.Card({ children: [
          ctx.toggleRow('transcription.enabled', { title: 'Write calls out as text', desc: 'When a recorded call ends, its recording is turned into text as well as kept.',
            onChange: function (v) { if (!v && ctx.get('monitoring.enabled')) { ctx.set('monitoring.enabled', false); UI.toast('Call monitoring was switched off because it needs transcription.', 'warn'); } } }),
          ctx.dyn(function () {
            var t = ctx.get('transcription.enabled'), rec = ctx.get('recording.mode') !== 'off';
            return [
              !t ? UI.Banner({ tone: 'warn', compact: true, title: 'Call monitoring cannot run', children: 'With transcription off, call monitoring has no text to read, so it stays off too.' }) : null,
              t && !rec ? UI.Banner({ tone: 'info', compact: true, title: 'Nothing to transcribe yet', children: 'Transcription applies to recorded calls and recording is currently off.' }) : null,
              h('div.chips-row', h('span.mut', 'Where the transcript appears:'), UI.Pill('Call logs', t ? 'ok' : 'neutral', 'list'), UI.Pill('Phones', t ? 'ok' : 'neutral', 'phone'))];
          }, function () { return [ctx.get('transcription.enabled'), ctx.get('recording.mode') !== 'off']; }),
          UI.LiveImpact('A transcript appears on the call under Call logs and Phones.'),
          ctx.scope('transcription.scope', { noun: 'transcription' })] }) });

      /* ---- E. monitoring ---- */
      var sMon = UI.Section({ id: 'monitoring', icon: 'sparkle', title: 'Call monitoring', badges: UI.StatusBadge('active'),
        desc: 'Read each transcript once and store what a supervisor needs to decide which calls are worth a listen.',
        children: UI.Card({ children: [
          ctx.dyn(function () {
            var t = ctx.get('transcription.enabled');
            return [UI.Row({ title: 'Look through transcripts automatically', desc: t ? 'Every transcribed call is read once; the result is stored on the call.' : 'Turn on transcription first — monitoring reads the transcript.',
              badges: !t ? UI.Pill('Needs transcription', 'warn', 'lock') : null,
              control: UI.Toggle({ checked: ctx.get('monitoring.enabled') && t, disabled: !t, label: 'Look through transcripts automatically', onChange: function (v) { ctx.set('monitoring.enabled', v); } }) })];
          }, function () { return [ctx.get('transcription.enabled'), ctx.get('monitoring.enabled')]; }),
          h('div.insights', { 'aria-label': 'What monitoring stores on each call' },
            [['Recap', 'A short summary of the call'], ['Follow-ups', 'Actions promised on the call'], ['Topics', 'What was discussed'], ['Sentiment', 'Positive, neutral or negative']].map(function (x) {
              return h('div.ins', h('b', x[0]), h('small', x[1])); })),
          h('div.ins-sample', h('div.ins-sh', UI.Avatar('Ananya Sharma'), h('span', h('b', 'Ananya Sharma'), h('small', ' · Support · 6 min · sample')), UI.Pill('Positive', 'ok')),
            h('p', 'Recap: Customer asked to move the invoice date; agent confirmed the change and sent a corrected copy.'), h('p.mut', 'Follow-up: Email corrected invoice by 5 pm · Topics: invoice, billing date')),
          ctx.scope('monitoring.scope', { noun: 'call monitoring' })] }) });

      /* ---- F. caller ID ---- */
      function callerPreview() {
        var c = ctx.get('callerId');
        return h('div.fld', h('div.fld-l', 'The other person sees'), h('div.cid-pre', icon('phone', 16), h('b', shownNumber(c) || '—')), h('div.fld-h', c.prefix || c.suffix || c.strip ? 'After prefix, suffix and digit removal.' : 'The number exactly as stored.'));
      }
      var sCid = UI.Section({ id: 'caller-id', icon: 'phone', title: 'Outbound caller ID', badges: UI.StatusBadge('active'),
        desc: 'What shows on the other person’s phone when somebody calls out.',
        children: UI.Card({ children: [
          h('div.grid2', ctx.fieldSelect('callerId.numberId', D.numbers.map(function (n) { return { value: n.id, label: n.number + ' — ' + n.label }; }), { label: 'Number people see', required: true, hint: 'Taken from your main numbers.' }),
            ctx.dyn(callerPreview, function () { return [ctx.get('callerId')]; })),
          h('div.grid3',
            ctx.fieldText('callerId.prefix', { label: 'Add prefix', hint: 'Digits only, e.g. +91', input: { placeholder: 'None', maxlength: 7, inputmode: 'tel' } }),
            ctx.fieldText('callerId.suffix', { label: 'Add suffix', hint: 'Digits only', input: { placeholder: 'None', maxlength: 6, inputmode: 'numeric' } }),
            ctx.fieldText('callerId.strip', { label: 'Remove leading digits', hint: '0 to 6 digits', input: { type: 'number', min: 0, max: 6, number: true, inputmode: 'numeric' } })),
          h('p.cid-rel', icon('info', 14), h('span', ['Looking for “use the office number” or “hide my number”? Those live in ', UI.Link('Calling', 'calling'), ' (coming soon).'])),
          UI.LiveImpact('Every outgoing call shows the number chosen here.'),
          ctx.scope('callerId.scope', { noun: 'the outgoing caller ID' })] }) });

      /* ---- G. voicemail ---- */
      function more(label, desc, value, tab, linkLabel) {
        var go = tab === '#pin' ? function (e) { e.preventDefault(); CRX.shellLeave('Voicemail PIN rollout'); } : function (e) { e.preventDefault(); CRX.app.go(tab); };
        return h('tr', h('th', { scope: 'row' }, label, h('small', desc)), h('td.val', value),
          h('td.go', h('a.tlink', { href: tab === '#pin' ? '#' : '#/' + tab, onClick: go }, linkLabel, icon('chevR', 13))));
      }
      function moreRules() {
        var g1 = S.get('greetings'), p = S.get('policies'), r = S.get('ringing-voicemail');
        var gv = g1.voicemail.enabled ? (CRX.recordingFind(g1.voicemail.recordingId) || {}).name || 'Custom recording' : 'The standard greeting';
        var ret = p.retention.voicemail;
        return h('div.table-lite', h('table.tl.tl-roomy', h('caption.sr-only', 'Voicemail rules set on other screens (read-only)'), h('thead', h('tr', h('th', 'Rule'), h('th', 'Current value'), h('th', 'Where it is set'))),
          h('tbody',
            more('Voicemail greeting', 'Played before the tone', gv, 'greetings', 'Greetings'),
            more('Longest message', 'Recording stops at this length', p.voicemail.maxMinutes + ' minutes', 'policies', 'Policies'),
            more('Shortest voicemail PIN', 'Checked when a person sets a PIN', p.voicemail.minPin + ' digits', 'policies', 'Policies'),
            more('Who has no PIN, or one too short', 'A report only; changes nothing', '3 people', '#pin', 'Open PIN rollout'),
            more('How long messages are kept', 'A nightly clean-up deletes what is past its date', ret.mode === 'indefinite' ? 'Kept until somebody deletes them' : ret.mode === 'sweep' ? 'Deleted on the next nightly sweep' : ret.days + ' days', 'policies', 'Policies'),
            more('New people start with voicemail to text', 'Applied once, when a person is created', p.voicemail.newToText ? 'On' : 'Off', 'policies', 'Policies'),
            more('How long a phone rings before voicemail', 'Applied on every call', r.ringSeconds + ' seconds', 'ringing-voicemail', 'Ringing & voicemail'))));
      }
      var sVm = UI.Section({ id: 'voicemail', icon: 'mail', title: 'Voicemail',
        desc: 'Company-wide voicemail behaviour and a read-only summary of rules set on other screens.',
        children: [UI.Card({ children: [
          ctx.toggleRow('voicemail.userMayChange', { title: 'Who may change voicemail settings', badges: UI.StatusBadge('app'), desc: 'Off: only an admin can change voicemail settings. On: people may change their own.' }),
          ctx.toggleRow('voicemail.emailCopy', { title: 'Email a copy of new voicemail', desc: 'Sends one email per new message, as it arrives. Saved only: no email is sent yet.' }),
          ctx.dyn(function () {
            var on = ctx.get('voicemail.emailCopy');
            return on ? h('div.indent',
              ctx.toggleRow('voicemail.emailToOwner', { title: 'Send it to the person whose mailbox it is', desc: 'Off sends everything to one fixed inbox.' }),
              ctx.toggleRow('voicemail.emailAttach', { title: 'Attach the recording to the email', desc: 'On sends the audio outside this system. Leave off if unsure.' }),
              ctx.toggleRow('voicemail.emailUserMayChange', { title: 'Let people change this for themselves', desc: 'Off means only an admin can change it.' })) : null;
          }),
          ctx.toggleRow('voicemail.toText', { title: 'Voicemail to text', badges: UI.StatusBadge('active'), desc: 'Transcribes messages as well as keeping the audio. Company-wide.' })] }),
          UI.Card({ title: 'More voicemail rules', desc: 'Read-only. Each rule is set on the screen linked in its row.', children: ctx.dyn(moreRules) })] });

      /* ---- H. supervision (coming soon) ---- */
      var SUP = [
        ['announce', 'Announce a supervisor joining a call', [['announce', 'Announce the supervisor to the call (default)'], ['silent', 'Stay silent']], 'Monitor, whisper, barge and takeover are silent today on every call. Silent-by-default is a legal choice in two-party-consent places, so the default here is to announce.'],
        ['direction', 'Which direction is recorded', [['both', 'Both directions (default)'], ['inbound', 'Inbound only'], ['outbound', 'Outbound only']], 'Whether the company records both sides of a call, inbound only, or outbound only.'],
        ['conference', 'When a conference changes', [['continue', 'Continue recording (default)'], ['restart', 'Start a new recording'], ['stop', 'Stop recording']], 'What happens to a recording already running when a conference call adds or drops a person.'],
        ['externalTransfer', 'External transfer permission', [['company', 'Company-wide (today’s behaviour)'], ['office', 'Resolved per office']], 'Whether the existing external-transfer rule is one company-wide answer, or resolved per office.']];
      var sSup = UI.Section({ id: 'supervision', icon: 'users', title: 'Call supervision policy', badges: UI.StatusBadge('soon'),
        desc: 'Company-wide rules for supervisors who listen in on calls.',
        children: UI.Card({ tone: 'soon', children: [
          UI.Banner({ tone: 'soon', compact: true, title: 'Not yet enforced', children: 'You can save these now, but the phone switch does not obey them yet. They will be honoured by the switch recording policy when it ships.' }),
          SUP.map(function (s) {
            return h('div.sup', UI.Row({ id: 'sup-' + s[0], title: s[1], desc: s[3], badges: UI.Pill('Not yet enforced', 'soon', 'clock'), control: ctx.select('supervision.' + s[0], s[2].map(function (o) { return { value: o[0], label: o[1] }; }), { label: s[1], cls: 'sel-w' }) }),
              ctx.scope('supervision.scopes.' + s[0], { noun: s[1].toLowerCase() }));
          }),
          h('div.sup-foot', icon('info', 13), 'Saved for your whole company. Each rule is saved and resolved the moment you set it, but nothing on a call reads it yet.')] }) });

      /* ---- page ---- */
      var glance = ctx.dyn(function () {
        var l = ctx.get('location'), hrs = ctx.get('hours'), rec = ctx.get('recording'), cid = ctx.get('callerId'), n = numberOf(cid.numberId);
        var sc = SCOPES.map(function (s) { return ctx.get(s[0] + '.scope'); });
        var enforced = sc.filter(function (x) { return x.give && x.lock; }).length, given = sc.filter(function (x) { return x.give; }).length, locked = sc.filter(function (x) { return x.lock; }).length;
        return UI.Glance([
          { icon: 'globe', label: 'Company time zone', value: l.timezone ? l.timezone.replace('_', ' ') : 'Not set', sub: l.timezone ? 'Local time ' + CRX.tzNow(l.timezone) : 'Set this first', tone: l.timezone ? 'ok' : 'warn' },
          { icon: 'clock', label: 'Opening hours', value: hrs.mode === '24h' ? 'Open 24 hours' : hrs.mode === 'weekdays' ? 'Weekdays' : 'Custom', sub: UI.hoursSummary(hrs), tone: hrs.mode === '24h' ? 'warn' : 'ok' },
          { icon: 'mic', label: 'Recording', value: rec.mode === 'off' ? 'Off' : rec.mode === 'auto' ? 'Automatic' : 'Manual', sub: 'Transcription ' + (ctx.get('transcription.enabled') ? 'on' : 'off') + ' · Monitoring ' + (ctx.get('monitoring.enabled') ? 'on' : 'off'), tone: rec.mode === 'off' ? 'neutral' : 'info' },
          { icon: 'phone', label: 'Caller ID', value: shownNumber(cid) || '—', sub: n ? n.label : 'Not set', tone: 'neutral' },
          { icon: 'lock', label: 'Company control', value: enforced + ' of ' + sc.length + ' enforced', sub: given + ' given to everyone · ' + locked + ' locked', tone: enforced ? 'ok' : 'neutral' }]);
      });
      var lockWarn = ctx.dyn(function () {
        var bad = SCOPES.filter(function (s) { return ctx.get(s[0] + '.scope.lock') && !ctx.get(s[0] + '.scope.give'); }).map(function (s) { return s[1]; });
        return bad.length ? UI.Banner({ tone: 'warn', title: 'Check before you save', children: ['Locked without giving anyone a value: ' + bad.join(', ') + '. This freezes everybody where they are and does not switch anything on.'] }) : null;
      });
      return h('div.stack',
        UI.Banner({ tone: 'info', compact: true, title: 'Calling other countries', children: ['Rules for which countries your team can call are on the ', UI.Link('Calling tab', 'calling'), '.'] }),
        glance, lockWarn, sLocation, sHours, sRecording, sTrans, sMon, sCid, sVm, sSup);
    }
  });
})(window);
