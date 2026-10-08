/* RecordingDrawer: "Add a recording" with three sources — Choose File, Record (microphone) and Text to Speech.
   File and microphone use the real browser APIs (FileReader-free object URLs, MediaRecorder); text to speech uses
   speechSynthesis. Only metadata is stored in the draft; the audio itself stays in memory for this session. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, D = CRX.data;
  CRX.blobs = CRX.blobs || {};

  var TYPE = { welcome: 'Welcome_greeting', hold: 'On_hold_music', voicemail: 'Voicemail_greeting', ringback: 'Ringback_tone' };
  var MAX_MB = 10, MAX_REC_SECS = 60, MAX_TTS = 500, EXT = /\.(mp3|wav|m4a|ogg|aac)$/i;
  function fmt(secs) { secs = Math.max(1, Math.round(secs)); return Math.floor(secs / 60) + ':' + U.pad(secs % 60); }
  function clock(s) { return Math.floor(s / 60) + ':' + U.pad(s % 60); }
  function size(bytes) { return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB'; }

  /** Underline tab strip used inside overlays. */
  UI.Tabs = function (o) {
    var wrap = h('div.utabs', { role: 'tablist', 'aria-label': o.label });
    function paint() {
      wrap.replaceChildren.apply(wrap, o.tabs.map(function (t) {
        var on = t.id === o.value;
        return h('button.utab' + (on ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(on), tabindex: on ? 0 : -1, id: 'utab-' + t.id,
          onClick: function () { if (o.value !== t.id) { o.value = t.id; paint(); o.onChange(t.id); } },
          onKeydown: function (e) {
            var i = o.tabs.findIndex(function (x) { return x.id === o.value; });
            if (e.key === 'ArrowRight') i = (i + 1) % o.tabs.length; else if (e.key === 'ArrowLeft') i = (i + o.tabs.length - 1) % o.tabs.length; else return;
            e.preventDefault(); o.value = o.tabs[i].id; paint(); o.onChange(o.value); wrap.querySelector('[tabindex="0"]').focus();
          } }, t.label);
      }));
    }
    paint();
    return wrap;
  };

  /** ctx: Greetings tab context. kind: welcome|hold|voicemail|ringback. onAdded(item) runs after the recording is added. */
  UI.RecordingDrawer = function (ctx, kind, onAdded) {
    var st = { tab: 'file', name: '', nameTouched: false, file: null, fileUrl: null, secs: null, fileErr: '',
      recState: 'idle', recUrl: null, recSecs: 0, recErr: '', text: '', voice: '', ttsErr: '' };
    var recorder = null, stream = null, recTimer = null, chunks = [];
    var pane = h('div.rd-pane'), primary, errName = h('div.fld-e', { role: 'alert' });
    var nameIn = UI.Input({ id: 'rd-name', placeholder: 'Enter Name', maxlength: 60, label: 'Name', onInput: function (v) { st.name = v; st.nameTouched = true; errName.textContent = ''; } });
    var hasSpeech = !!(g.speechSynthesis && g.SpeechSynthesisUtterance);

    /* ---------- readiness ---------- */
    function secsNow() { return st.tab === 'file' ? st.secs : st.tab === 'record' ? st.recSecs : Math.max(2, Math.round(st.text.trim().split(/\s+/).filter(Boolean).length / 2.5)); }
    function sourceReady() {
      if (st.tab === 'file') return !!st.file && !st.fileErr && st.secs !== null;
      if (st.tab === 'record') return st.recState === 'done' && !!st.recUrl;
      return st.text.trim().length >= 5 && st.text.length <= MAX_TTS;
    }
    function refresh() {
      if (!primary) return;
      primary.disabled = !sourceReady();
      primary.querySelector('span').textContent = st.tab === 'file' ? 'Upload' : st.tab === 'record' ? 'Save recording' : 'Create recording';
    }

    /* ---------- panes ---------- */
    function filePane() {
      var input = h('input', { type: 'file', accept: 'audio/*,.mp3,.wav,.m4a,.ogg,.aac', hidden: true, onChange: function () { pick(input.files[0]); input.value = ''; } });
      function pick(f) {
        if (!f) return;
        if (st.fileUrl) URL.revokeObjectURL(st.fileUrl);
        st.file = null; st.fileUrl = null; st.secs = null; st.fileErr = '';
        if (!(f.type.indexOf('audio') === 0 || EXT.test(f.name))) st.fileErr = 'Choose an audio file (MP3, WAV, M4A or OGG).';
        else if (f.size > MAX_MB * 1048576) st.fileErr = 'That file is ' + size(f.size) + '. The limit is ' + MAX_MB + ' MB.';
        if (st.fileErr) { paint(); refresh(); return; }
        st.file = f; st.fileUrl = URL.createObjectURL(f);
        if (!st.nameTouched || !st.name) { st.name = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60); nameIn.value = st.name; }
        var a = new Audio(); a.preload = 'metadata';
        a.onloadedmetadata = function () { st.secs = isFinite(a.duration) && a.duration > 0 ? a.duration : 1; paint(); refresh(); };
        a.onerror = function () { st.fileErr = 'This file could not be read as audio. Try another file.'; st.file = null; paint(); refresh(); };
        a.src = st.fileUrl; paint(); refresh();
      }
      var zone = h('div.dz', { tabindex: 0, role: 'button', 'aria-label': 'Upload file: choose an audio file or drop it here',
        onClick: function () { input.click(); }, onKeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } },
        onDragover: function (e) { e.preventDefault(); zone.classList.add('over'); }, onDragleave: function () { zone.classList.remove('over'); },
        onDrop: function (e) { e.preventDefault(); zone.classList.remove('over'); pick(e.dataTransfer.files[0]); } },
        icon('upload', 26), h('b', 'Upload File'), h('small', 'Click to browse, or drag and drop. MP3, WAV, M4A or OGG, up to ' + MAX_MB + ' MB.'));
      var card = st.file ? h('div.dz-file', icon('wave', 18), h('div.dz-fn', h('b', st.file.name), h('small', size(st.file.size) + (st.secs !== null ? ' · ' + fmt(st.secs) : ' · reading…'))),
        UI.IconButton('x', 'Remove file', function () { if (st.fileUrl) URL.revokeObjectURL(st.fileUrl); st.file = null; st.fileUrl = null; st.secs = null; paint(); refresh(); }, { size: 'sm' }),
        h('audio', { controls: true, src: st.fileUrl, preload: 'metadata' })) : null;
      return [input, st.file ? card : zone, st.fileErr ? h('div.fld-e.show', { role: 'alert' }, st.fileErr) : null];
    }

    function stopStream() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } clearInterval(recTimer); }
    function startRec() {
      st.recErr = '';
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && g.MediaRecorder)) { st.recErr = 'This browser cannot record audio. Use Choose File or Text to Speech instead.'; paint(); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
        stream = s; chunks = [];
        recorder = new MediaRecorder(s);
        recorder.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        recorder.onstop = function () {
          var blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          if (st.recUrl) URL.revokeObjectURL(st.recUrl);
          st.recUrl = URL.createObjectURL(blob); st.recState = 'done'; stopStream(); paint(); refresh();
        };
        st.recState = 'recording'; st.recSecs = 0; recorder.start();
        recTimer = setInterval(function () { st.recSecs++; if (st.recSecs >= MAX_REC_SECS) stopRec(); else paint(); }, 1000);
        paint(); refresh();
      }, function (err) {
        st.recErr = err && err.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in the browser’s site settings, then try again.' : 'No microphone was found.';
        st.recState = 'idle'; paint(); refresh();
      });
    }
    function stopRec() { if (recorder && recorder.state !== 'inactive') recorder.stop(); }
    function recPane() {
      if (st.recState === 'recording') return h('div.rec-ui.live', h('span.rec-dot'), h('div.rec-t', h('b', 'Recording…'), h('small', clock(st.recSecs) + ' / ' + clock(MAX_REC_SECS))),
        UI.Button({ label: 'Stop', icon: 'stop', kind: 'danger', onClick: stopRec }));
      if (st.recState === 'done') return h('div.rec-ui.done', h('div.rec-t', h('b', 'Recording ready'), h('small', fmt(st.recSecs) + ' · listen before saving')), h('audio', { controls: true, src: st.recUrl }),
        UI.Button({ label: 'Record again', icon: 'refresh', kind: 'secondary', size: 'sm', onClick: function () { if (st.recUrl) URL.revokeObjectURL(st.recUrl); st.recUrl = null; st.recState = 'idle'; st.recSecs = 0; paint(); refresh(); } }));
      return h('div.rec-ui', h('div.rec-t', h('b', 'Record with your microphone'), h('small', 'Up to ' + MAX_REC_SECS + ' seconds. Your browser will ask for microphone access.')),
        UI.Button({ label: 'Start recording', icon: 'mic', kind: 'primary', onClick: startRec }), st.recErr ? h('div.fld-e.show', { role: 'alert' }, st.recErr) : null);
    }

    function voices() { return hasSpeech ? g.speechSynthesis.getVoices().filter(function (v) { return /^(en|hi)/i.test(v.lang); }).slice(0, 14) : []; }
    function ttsPane() {
      if (!hasSpeech) return [UI.Banner({ tone: 'warn', compact: true, title: 'Text to speech is not available', children: 'This browser has no speech engine. Use Choose File or Record instead.' })];
      var vs = voices();
      var ta = UI.Textarea({ id: 'rd-text', rows: 5, maxlength: MAX_TTS, placeholder: 'Thank you for calling Acme Corporation. Your call is important to us…', value: st.text, label: 'Text to speak',
        onInput: function (v) { st.text = v; cnt.textContent = v.length + '/' + MAX_TTS; est.textContent = 'Estimated length ' + clock(Math.max(2, Math.round((v.trim().split(/\s+/).filter(Boolean).length || 1) / 2.5))); refresh(); } });
      var cnt = h('span.counter-s', st.text.length + '/' + MAX_TTS), est = h('small.mut', 'Estimated length ' + clock(Math.max(2, Math.round((st.text.trim().split(/\s+/).filter(Boolean).length || 1) / 2.5))));
      var sel = UI.Select({ id: 'rd-voice', label: 'Voice', value: st.voice, options: [{ value: '', label: 'Default voice' }].concat(vs.map(function (v) { return { value: v.name, label: v.name + ' (' + v.lang + ')' }; })), onChange: function (v) { st.voice = v; } });
      var speaking = false, pv;
      function preview() {
        if (speaking) { g.speechSynthesis.cancel(); speaking = false; pv.querySelector('span').textContent = 'Preview'; return; }
        if (st.text.trim().length < 5) { st.ttsErr = 'Type at least a few words first.'; errT.textContent = st.ttsErr; return; }
        errT.textContent = ''; var u = new SpeechSynthesisUtterance(st.text.trim());
        var v = vs.filter(function (x) { return x.name === st.voice; })[0]; if (v) u.voice = v;
        u.onend = u.onerror = function () { speaking = false; pv.querySelector('span').textContent = 'Preview'; };
        speaking = true; pv.querySelector('span').textContent = 'Stop'; g.speechSynthesis.speak(u);
      }
      pv = UI.Button({ label: 'Preview', icon: 'play', kind: 'secondary', size: 'sm', onClick: preview });
      var errT = h('div.fld-e', { role: 'alert' });
      return [h('div.fld', h('label.fld-l', { for: 'rd-text' }, 'Text to speak'), ta, h('div.fld-h', h('span', 'At least a few words. Speaks at about 150 words a minute.'), cnt)),
        h('div.fld', h('label.fld-l', { for: 'rd-voice' }, 'Voice'), sel), h('div.rd-pv', pv, est), errT];
    }

    function paint() {
      var kids = st.tab === 'file' ? filePane() : st.tab === 'record' ? [recPane()] : ttsPane();
      pane.replaceChildren.apply(pane, kids.filter(Boolean));
    }

    /* ---------- submit ---------- */
    function submit() {
      errName.textContent = '';
      var name = st.name.trim();
      var taken = D.recordings.concat(ctx.get('library')).some(function (r) { return r.name.toLowerCase() === name.toLowerCase(); });
      if (name.length < 3) errName.textContent = 'Enter a name of at least 3 characters.';
      else if (taken) errName.textContent = 'A recording with this name already exists.';
      if (errName.textContent) { nameIn.focus(); return; }
      if (!sourceReady()) return;
      var item = { id: U.uid('rec'), name: name, kind: kind, type: TYPE[kind], source: st.tab, secs: secsNow(), length: fmt(secsNow()) };
      if (st.tab === 'file') { item.fileName = st.file.name; CRX.blobs[item.id] = st.fileUrl; st.fileUrl = null; }
      else if (st.tab === 'record') { CRX.blobs[item.id] = st.recUrl; st.recUrl = null; }
      else { item.text = st.text.trim(); item.voice = st.voice; if (g.speechSynthesis) g.speechSynthesis.cancel(); }
      ctx.set('library', ctx.get('library').concat([item]));
      ctx.set(kind + '.recordingId', item.id); ctx.set(kind + '.enabled', true);
      d.close('added');
      UI.toast('“' + name + '” added and selected. Remember to save.', 'ok');
      onAdded && onAdded(item);
    }

    function cleanup() {
      if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
      stopStream(); if (g.speechSynthesis) g.speechSynthesis.cancel();
      if (st.fileUrl) URL.revokeObjectURL(st.fileUrl); if (st.recUrl) URL.revokeObjectURL(st.recUrl);
      if (CRX.recordings) CRX.recordings.stop();
    }

    primary = UI.Button({ label: 'Upload', kind: 'primary', disabled: true, onClick: submit });
    var body = h('div.rd',
      UI.Tabs({ label: 'Recording source', value: st.tab, tabs: [{ id: 'file', label: 'Choose File' }, { id: 'record', label: 'Record' }, { id: 'tts', label: 'Text to Speech' }],
        onChange: function (id) { st.tab = id; paint(); refresh(); } }),
      pane,
      h('div.fld', h('label.fld-l', { for: 'rd-name' }, 'Name ', h('span.req', '*')), nameIn, errName),
      h('div.fld', h('label.fld-l', { for: 'rd-type' }, 'Type'), UI.Input({ id: 'rd-type', value: TYPE[kind], readonly: true, label: 'Type', cls: 'ro' })));
    paint();
    var d = UI.Drawer({ title: 'Add a recording', desc: 'Upload a file, record with your microphone, or turn text into speech.', body: body, focusPanel: true, onClose: cleanup,
      footer: [UI.Button({ label: 'Cancel', kind: 'secondary', onClick: function () { d.close('cancel'); } }), primary] });
    if (hasSpeech) g.speechSynthesis.onvoiceschanged = function () { if (st.tab === 'tts' && !st.text) paint(); };
    refresh();
    return d;
  };
})(window);
