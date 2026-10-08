/* Hash router for the shell.   #/<section>[/<page>[/...]]   e.g. #/analytics/queues, #/settings/phone-rules
   One iframe hosts the active section. Switching section loads that section's index.html; moving inside the same section
   sends a `navigate` message instead, so the section never reloads.

   Messages (always objects with a `ucaas` key):
     shell -> section : theme {theme} | role {role} | items {items,log} | settings {settings} | dial {req} | navigate {rest} | menu
     section -> shell : hello | route {rest} | goto {target} | toast {text} | emit {type,...} | activity                                       */
(function (g) {
  'use strict';
  var U = g.UCAAS, frame, loading, shown = null, reported = null;

  function parse() {
    var seg = (location.hash || '').replace(/^#\/?/, '').split('/');
    var sec = U.section(seg[0]) || U.section(U.defaultSection);
    return { sec: sec, rest: seg[0] === sec.id ? seg.slice(1).join('/') : '' };
  }

  function apply() {
    var r = parse();
    if (!U.roles.allowed(r.sec.id)) { location.replace('#/' + U.defaultSection); return; }
    Array.prototype.forEach.call(document.querySelectorAll('.nav a'), function (a) {
      var on = a.getAttribute('data-section') === r.sec.id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.getElementById('menuBtn').classList.toggle('on-settings', r.sec.id === 'settings');
    U.router.title();

    if (shown === r.sec.id) {
      if (r.rest !== reported) { reported = r.rest; post({ ucaas: 'navigate', rest: r.rest }); }
      return;
    }
    shown = r.sec.id; reported = r.rest;
    loading.classList.remove('done');
    frame.src = r.sec.entry + (r.rest ? '#/' + r.rest : '');
  }

  function post(msg) { if (frame && frame.contentWindow) frame.contentWindow.postMessage(msg, '*'); }

  /** everything a section needs to know when it opens */
  function sendState() {
    post({ ucaas: 'theme', theme: U.theme.current() });
    post({ ucaas: 'role', role: U.roles.current() });
    U.bus.sync().forEach(post);
    post({ ucaas: 'duty', on: U.duty ? U.duty.isOn() : true });
  }

  function onMessage(e) {
    var m = e.data;
    if (!m || typeof m !== 'object' || !m.ucaas || e.source !== frame.contentWindow) return;
    if (m.ucaas === 'hello') sendState();
    else if (m.ucaas === 'emit') U.bus.handle(m);
    else if (m.ucaas === 'activity') U.policies.touch();
    else if (m.ucaas === 'route') {
      reported = m.rest || '';
      var h = '#/' + shown + (reported ? '/' + reported : '');
      if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (err) { /* file:// quirks */ } }
    }
    else if (m.ucaas === 'goto') U.router.go(String(m.target || ''));
    else if (m.ucaas === 'toast') U.toast(String(m.text || ''));
  }

  U.router = {
    post: post,
    title: function () { var c = U.policies && U.policies.company(); document.title = parse().sec.label + ' – ' + (c || 'UCAAS'); },
    /** load the open section again (its stored data belongs to the signed-in user, which just changed) */
    reload: function () {
      var r = parse(); shown = null; reported = r.rest;
      loading.classList.remove('done'); frame.src = 'about:blank';
      setTimeout(apply, 30);
    },
    section: function () { return parse().sec.id; },
    go: function (path) {
      var h = '#/' + path;
      if (location.hash === h) apply(); else location.hash = h;
    },
    init: function () {
      frame = document.getElementById('view'); loading = document.getElementById('loading');
      frame.addEventListener('load', function () { loading.classList.add('done'); sendState(); });
      window.addEventListener('message', onMessage);
      window.addEventListener('hashchange', apply);
      document.getElementById('menuBtn').addEventListener('click', function () { post({ ucaas: 'menu' }); });
      if (!location.hash) { try { history.replaceState(null, '', '#/' + U.defaultSection); } catch (err) { /* ignore */ } }
      apply();
    }
  };
})(window);
