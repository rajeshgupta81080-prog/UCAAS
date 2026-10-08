/* Tab 2 - Greetings: welcome message, on-hold music, voicemail message, ringback tone. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, D = CRX.data;

  var KINDS = [
    { key: 'welcome', title: 'Welcome message', icon: 'wave', when: 'As soon as the call is answered, before it rings anybody.', pool: ['r1', 'r2'] },
    { key: 'hold', title: 'On-hold music', icon: 'play', when: 'While the caller is on hold.', pool: ['r3', 'r4'] },
    { key: 'voicemail', title: 'Voicemail message', icon: 'mail', when: 'Before the caller leaves a message (before the beep).', pool: ['r5', 'r6'] },
    { key: 'ringback', title: 'Ringback tone', icon: 'phone', when: 'Instead of the usual ringing while the caller waits.', pool: ['r7', 'r8'] }
  ];
  /* The recording library = built-in recordings + the ones this company added (draft state, so unsaved ones work too). */
  function library() { var d = CRX.store.get('greetings'); return d && d.library ? d.library : []; }
  function rec(id) { return D.recordings.concat(library()).filter(function (r) { return r.id === id; })[0]; }
  function poolFor(kind) { return D.recordings.filter(function (r) { return kind.pool.indexOf(r.id) >= 0; }).concat(library().filter(function (r) { return r.kind === kind.key; })); }
  CRX.recordingFind = rec;

  /* One clip plays at a time: real audio for uploaded/recorded files, the speech engine for text-to-speech,
     and a short simulated preview for the built-in demo recordings. */
  var playing = null;
  function stopPlaying() {
    if (!playing) return;
    clearInterval(playing.t); if (playing.stop) playing.stop(); playing.reset(); playing = null;
  }
  CRX.recordings = { stop: stopPlaying };
  function player(recId) {
    var r = rec(recId), fill = h('i'), bar = h('span.pl-bar', fill), label = h('span.pl-t', r ? '0:00 / ' + r.length : ''), btn;
    function reset() { fill.style.width = '0'; btn.replaceChildren(icon('play', 14)); btn.setAttribute('aria-label', 'Play ' + (r ? r.name : '')); label.textContent = r ? '0:00 / ' + r.length : ''; }
    function running() { btn.replaceChildren(icon('pause', 14)); btn.setAttribute('aria-label', 'Stop preview'); }
    function simulate(ms, extra) {
      var p = 0; running();
      playing = { btn: btn, reset: reset, stop: extra, t: setInterval(function () {
        p += 100; fill.style.width = Math.min(100, p / ms * 100) + '%'; label.textContent = '0:0' + Math.min(9, Math.floor(p / 1000)) + ' / ' + r.length;
        if (p >= ms) stopPlaying();
      }, 100) };
    }
    btn = h('button.pl-b', { type: 'button', disabled: !r, 'aria-label': 'Play preview', onClick: function () {
      if (playing && playing.btn === btn) { stopPlaying(); return; }
      stopPlaying();
      var url = CRX.blobs && CRX.blobs[recId];
      if (url) {                                   // uploaded file or microphone recording
        var a = new Audio(url);
        a.ontimeupdate = function () { if (a.duration) { fill.style.width = (a.currentTime / a.duration * 100) + '%'; label.textContent = Math.floor(a.currentTime / 60) + ':' + U.pad(Math.floor(a.currentTime % 60)) + ' / ' + r.length; } };
        a.onended = stopPlaying; a.onerror = function () { stopPlaying(); UI.toast('This recording could not be played.', 'warn'); };
        running(); playing = { btn: btn, reset: reset, stop: function () { a.pause(); } };
        a.play().catch(function () { stopPlaying(); UI.toast('The browser blocked playback. Click play again.', 'warn'); });
      } else if (r.source === 'tts' && window.speechSynthesis) {   // text to speech
        var u = new SpeechSynthesisUtterance(r.text);
        var v = window.speechSynthesis.getVoices().filter(function (x) { return x.name === r.voice; })[0]; if (v) u.voice = v;
        u.onend = u.onerror = stopPlaying;
        simulate(Math.max(2000, (r.secs || 3) * 1000), function () { window.speechSynthesis.cancel(); });
        window.speechSynthesis.speak(u);
      } else simulate(6000);                       // built-in demo recording
    } }, icon('play', 14));
    return h('div.pl', btn, bar, label);
  }

  CRX.registerTab({
    id: 'greetings', title: 'Greetings', short: 'Greetings', icon: 'wave',
    desc: 'The recordings a caller hears. Each recording is off until you turn it on and choose a recording.',
    products: ['switch'],
    settings: KINDS.map(function (k) { return { id: 'greeting-' + k.key, label: k.title, keywords: 'recording greeting ' + k.when }; }),
    labels: { library: 'Recordings added', 'welcome.enabled': 'Welcome message', 'welcome.recordingId': 'Welcome recording', 'hold.enabled': 'On-hold music', 'hold.recordingId': 'On-hold recording',
      'voicemail.enabled': 'Voicemail message', 'voicemail.recordingId': 'Voicemail recording', 'ringback.enabled': 'Ringback tone', 'ringback.recordingId': 'Ringback recording' },
    formats: (function () {
      var f = {};
      ['welcome', 'hold', 'voicemail', 'ringback'].forEach(function (k) { f[k + '.recordingId'] = function (id) { var r = rec(id); return r ? r.name : (id || 'Not set'); }; });
      return f;
    })(),
    anchors: { welcome: 'greeting-welcome', hold: 'greeting-hold', voicemail: 'greeting-voicemail', ringback: 'greeting-ringback' },
    normalize: CRX.pruneWhen(['welcome', 'hold', 'voicemail', 'ringback'].map(function (k) { return { on: function (x) { return x[k].enabled; }, drop: [k + '.recordingId', k + '.scope'] }; })),
    defaults: function () {
      function k(on, id) { return { enabled: on, recordingId: id, scope: { give: false, lock: false } }; }
      return { welcome: k(true, 'r1'), hold: k(false, ''), voicemail: k(false, ''), ringback: k(false, ''), library: [] };
    },
    validate: function (d) {
      var e = {};
      KINDS.forEach(function (k) { if (d[k.key].enabled && !d[k.key].recordingId) e[k.key + '.recordingId'] = 'Choose a recording, or switch this greeting off.'; });
      return e;
    },
    render: function (ctx) {
      function choose(kind) {
        var sel = ctx.get(kind.key + '.recordingId');
        var list = h('div.rlist', { role: 'radiogroup', 'aria-label': 'Recordings for ' + kind.title });
        function paint() {
          list.replaceChildren.apply(list, poolFor(kind).map(function (r) {
            return h('label.rl' + (sel === r.id ? '.sel' : ''), h('input', { type: 'radio', name: 'rec-' + kind.key, checked: sel === r.id, onChange: function () { sel = r.id; paint(); } }),
              h('span.rl-n', r.name, h('small', r.length + (r.source ? ' · ' + ({ file: 'uploaded file', record: 'recorded', tts: 'text to speech' }[r.source] || '') : ''))), player(r.id));
          }));
        }
        paint();
        var m = UI.Modal({ title: 'Choose recording — ' + kind.title, desc: 'Preview a recording, then select it — or add a new one.', body: h('div', list, h('div.rl-add', UI.Button({ label: 'Add a recording', icon: 'upload', kind: 'secondary', size: 'sm', onClick: function () { UI.RecordingDrawer(ctx, kind.key, function () { m.close(); ctx.rerender(); }); } }))),
          onClose: function () { stopPlaying(); },
          footer: [UI.Button({ label: 'Cancel', kind: 'secondary', onClick: function () { m.close(); } }), UI.Button({ label: 'Use this recording', kind: 'primary', onClick: function () {
            if (!sel) { UI.toast('Select a recording first.', 'warn'); return; }
            ctx.set(kind.key + '.recordingId', sel); if (!ctx.get(kind.key + '.enabled')) ctx.set(kind.key + '.enabled', true);
            m.close(); ctx.rerender();
          } })] });
      }
      var cards = KINDS.map(function (k) {
        var body = ctx.dyn(function () {
          var c = ctx.get(k.key), r = rec(c.recordingId);
          var status = r ? UI.Pill('On', 'ok', 'check') : UI.Pill('Needs a recording', 'warn', 'warn');
          return [h('div.gr-row',
            h('div.gr-rec', r ? [h('b', r.name), h('small', r.length + ' · ' + (k.key === 'hold' ? 'plays on loop' : 'plays once') + (r.source ? ' · ' + ({ file: 'uploaded file', record: 'recorded', tts: 'text to speech' }[r.source] || '') : ''))] : h('span.mut', 'No recording selected')),
            r ? player(r.id) : null,
            h('div.acts', UI.Button({ label: r ? 'Change' : 'Choose recording', icon: r ? 'edit' : 'plus', kind: 'secondary', size: 'sm', onClick: function () { choose(k); } }),
              UI.Button({ label: 'Upload', icon: 'upload', kind: 'secondary', size: 'sm', title: 'Add a recording: upload a file, record, or text to speech', onClick: function () { UI.RecordingDrawer(ctx, k.key, function () { ctx.rerender(); }); } }))),
            ctx.err(k.key + '.recordingId') ? h('div.fld-e.show', { role: 'alert' }, ctx.err(k.key + '.recordingId')) : null,
            h('div.gr-st', status, c.scope.give ? UI.Pill('Given to everyone', 'info', 'users') : null, c.scope.lock ? UI.Pill('Locked', 'ok', 'lock') : UI.Pill('People may override', 'neutral', 'unlock'))];
        }, function () { return [ctx.get(k.key)]; });
        return UI.Card({ id: 'greeting-' + k.key, title: k.title, desc: 'Heard: ' + k.when, badges: UI.StatusBadge('active'),
          actions: [ctx.toggle(k.key + '.enabled', k.title + ' on or off', { onChange: function (v) { if (v && !ctx.get(k.key + '.recordingId')) { choose(k); } } })],
          // everything below the header only exists while the greeting is switched on
          children: ctx.dyn(function () { return ctx.get(k.key + '.enabled') ? [body, ctx.scope(k.key + '.scope', { noun: k.title.toLowerCase() })] : null; },
            function () { return [ctx.get(k.key + '.enabled')]; }) });
      });
      return h('div.stack',
        UI.Banner({ tone: 'ok', title: 'How it works on real calls', compact: true, children: ['On calls to a person or a group: the welcome message plays before ringing, the ringback tone plays while they ring, the on-hold music plays when they put the caller on hold, and the voicemail message plays before the beep. A person’s own choice on their Greetings tab wins over the company’s unless the company has locked it. A new choice reaches the switch within a minute.'] }),
        UI.Banner({ tone: 'info', compact: true, title: 'Queues use their own recordings', children: 'A queue plays the recordings chosen on the queue itself, not the company greetings. Set greetings on queues separately.' }),
        cards);
    }
  });
})(window);
