/* Tab 13 - Security: MFA, idle timeout, IP allow/block lists with emergency bypass, SAML SSO. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util, S = CRX.store, D = CRX.data;

  /* ---- IPv4 helpers ---- */
  function ipToInt(ip) { var p = ip.split('.').map(Number); return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; }
  function validEntry(v) {
    var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(v.trim());
    if (!m) return false;
    for (var i = 1; i <= 4; i++) if (+m[i] > 255) return false;
    return m[5] === undefined || +m[5] <= 32;
  }
  function covers(entry, ip) {
    var p = entry.trim().split('/'), bits = p[1] === undefined ? 32 : +p[1];
    if (bits === 0) return true;
    var mask = (~0 << (32 - bits)) >>> 0;
    return ((ipToInt(p[0]) & mask) >>> 0) === ((ipToInt(ip) & mask) >>> 0);
  }
  function now() { return Date.now(); }
  function fmtLeft(ms) { var s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 3600) + 'h ' + U.pad(Math.floor(s % 3600 / 60)) + 'm ' + U.pad(s % 60) + 's'; }

  /** Immediate actions (arming the bypass) act at once, like the real control; they bypass the dirty/save cycle. */
  function immediate(path, value, label, from, to) {
    U.setPath(S.saved.security, path, value); U.setPath(S.draft.security, path, U.clone(value));
    S.history.unshift({ id: U.uid('h'), user: S.CURRENT_USER, tab: 'security', section: 'Security', change: label, from: from, to: to, at: new Date().toISOString(), status: 'Delivered', products: ['auth'] });
    S.persist(); S.emit('change', 'security');
  }

  CRX.registerTab({
    id: 'security', title: 'Security', short: 'Security', icon: 'shield',
    desc: 'Sign-in rules for everyone in the company. A weak rule here exposes call logs, recordings, transcripts and billing.',
    products: ['auth'],
    settings: [{ id: 'sec-mfa', label: 'Require multi-factor authentication', keywords: 'mfa 2fa emailed code exception trusted device' }, { id: 'sec-idle', label: 'Idle timeout', keywords: 'sign people out inactive' },
      { id: 'sec-ip', label: 'IP allowlist / blocklist', keywords: 'network cidr emergency bypass lockout' }, { id: 'sec-sso', label: 'Single sign-on (SAML)', keywords: 'saml sso identity provider okta azure' }],
    labels: { 'mfa.required': 'Require MFA for password sign-in', 'mfa.exceptions': 'MFA exception list', 'mfa.trustedDays': 'Trusted-device period (days)', 'idle.enabled': 'Sign people out when idle', 'idle.minutes': 'Idle timeout (minutes)',
      'ip.enabled': 'IP restrictions', 'ip.mode': 'IP rule mode', 'ip.entries': 'IP allow/block list', 'sso.enabled': 'Single sign-on (SAML)', 'sso.provider': 'Identity provider', 'sso.entityId': 'Identity provider entity ID', 'sso.ssoUrl': 'Single sign-on URL', 'sso.fingerprint': 'Certificate fingerprint' },
    formats: { 'ip.mode': { allow: 'Only allow these', block: 'Block these' }, 'mfa.trustedDays': function (d) { return d + (d === 1 ? ' day' : ' days'); }, 'idle.minutes': function (m) { return m + ' minutes'; } },
    anchors: { mfa: 'sec-mfa', idle: 'sec-idle', ip: 'sec-ip', bypass: 'sec-ip', sso: 'sec-sso' },
    normalize: CRX.pruneWhen([{ on: function (x) { return x.mfa.required; }, drop: ['mfa.trustedDays', 'mfa.exceptions'] }, { on: function (x) { return x.idle.enabled; }, drop: ['idle.minutes'] }, { on: function (x) { return x.sso.enabled; }, drop: ['sso.provider', 'sso.entityId', 'sso.ssoUrl', 'sso.fingerprint'] }]),
    defaults: function () {
      return { mfa: { required: false, exceptions: [], trustedDays: 30 }, idle: { enabled: false, minutes: 30 },
        ip: { enabled: false, mode: 'allow', entries: [{ id: 'ip1', value: '203.0.113.0/24', note: 'Bengaluru office' }, { id: 'ip2', value: '198.51.100.17', note: 'VPN gateway' }] },
        bypass: { armedUntil: null, reason: '', armedBy: '' },
        sso: { enabled: false, provider: 'Okta', entityId: '', ssoUrl: '', fingerprint: '' } };
    },
    validate: function (d) {
      var e = {};
      if (d.mfa.required && !U.isInt(d.mfa.trustedDays, 1, 90)) e['mfa.trustedDays'] = 'Trusted-device period must be 1 to 90 days.';
      if (d.idle.enabled && !U.isInt(d.idle.minutes, 5, 480)) e['idle.minutes'] = 'Idle timeout must be 5 to 480 minutes.';
      var bad = d.ip.entries.filter(function (x) { return !validEntry(x.value); });
      if (bad.length) e['ip.entries'] = '“' + bad[0].value + '” is not a valid IPv4 address or CIDR range.';
      if (d.ip.enabled && d.ip.mode === 'allow' && !d.ip.entries.length) e['ip.entries'] = 'An allowlist with no networks would block everyone. Add at least one network.';
      if (d.sso.enabled) {
        if (!d.sso.entityId.trim()) e['sso.entityId'] = 'Enter the identity provider’s entity ID.';
        if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(d.sso.ssoUrl.trim())) e['sso.ssoUrl'] = 'Enter the https:// sign-in URL from your identity provider.';
        if (!/^([0-9A-Fa-f]{2}:?){19}[0-9A-Fa-f]{2}$|^([0-9A-Fa-f]{2}:?){31}[0-9A-Fa-f]{2}$/.test(d.sso.fingerprint.trim())) e['sso.fingerprint'] = 'Enter the certificate’s SHA-1 or SHA-256 fingerprint (hex, colons optional).';
      }
      return e;
    },
    risks: function (d, saved) {
      var out = [];
      if (d.ip.enabled && d.ip.mode === 'allow' && !d.ip.entries.some(function (x) { return validEntry(x.value) && covers(x.value, D.currentIp); }))
        out.push({ title: 'You could lock yourself out', message: 'The allowlist does not include your current network (' + D.currentIp + '). Arm the emergency bypass first, or add your network.' });
      if (d.ip.enabled && d.ip.mode === 'block' && d.ip.entries.some(function (x) { return validEntry(x.value) && covers(x.value, D.currentIp); }))
        out.push({ title: 'Your own network is blocked', message: 'The blocklist covers your current network (' + D.currentIp + ').' });
      if (saved.mfa.required && !d.mfa.required) out.push({ title: 'MFA turned off', message: 'Everyone signing in with a password will no longer need the emailed code.' });
      if (d.sso.enabled && !saved.sso.enabled) out.push({ title: 'Sign-in moves to your identity provider', message: 'Password sign-in is handed over to SAML. Make sure the provider is working and an admin can still sign in.' });
      return out;
    },
    render: function (ctx) {
      /* ---------- MFA ---------- */
      var mfa = UI.SecurityPolicyCard({ id: 'sec-mfa', icon: 'key', title: 'Require multi-factor authentication', badges: UI.StatusBadge('active'),
        desc: 'Everyone signing in with a password must enter the emailed code.',
        status: ctx.toggle('mfa.required', 'Require MFA for password sign-in', { onChange: function () { ctx.rerender(); } }),
        children: ctx.dyn(function () {
          var on = ctx.get('mfa.required');
          return [
            on ? ctx.fieldSelect('mfa.trustedDays', [{ value: 1, label: '1 day' }, { value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 30, label: '30 days' }, { value: 60, label: '60 days' }, { value: 90, label: '90 days' }], { label: 'Trusted-device behaviour', hint: 'People on the exception list may skip the code on a trusted device for this long.', input: { number: true } }) : null,
            h('div.fld', { dataset: { errPath: 'security::mfa.exceptions' } }, h('label.fld-l', 'MFA exception list'),
              on ? UI.UserSelector({ value: ctx.get('mfa.exceptions'), blockAdmins: true, onChange: function (v) { ctx.set('mfa.exceptions', v); } }) : h('div.disabled-note', icon('lock', 14), 'Turn on the MFA requirement above to edit this list.'),
              h('div.fld-h', 'Search finds people by name, extension, email or role. Admins cannot be added: the list shows “Admin — cannot be exempted”.'), h('div.fld-e', { role: 'alert' }))];
        }, function () { return [ctx.get('mfa.required')]; }) });

      /* ---------- idle ---------- */
      var idle = UI.SecurityPolicyCard({ id: 'sec-idle', icon: 'clock', title: 'Idle timeout', badges: UI.StatusBadge('active'), desc: 'Signs people out after a period of inactivity.',
        status: ctx.toggle('idle.enabled', 'Sign people out when idle', { onChange: function () { ctx.rerender(); } }),
        children: ctx.dyn(function () { return ctx.get('idle.enabled') ? ctx.fieldSelect('idle.minutes', [5, 10, 15, 30, 60, 120, 240, 480].map(function (m) { return { value: m, label: m < 60 ? m + ' minutes' : (m / 60) + (m === 60 ? ' hour' : ' hours') }; }), { label: 'Sign out after', input: { number: true } }) : h('div.mut', 'Off — people stay signed in until they sign out.'); }, function () { return [ctx.get('idle.enabled')]; }) });

      /* ---------- IP ---------- */
      function bypassPanel() {
        var b = ctx.get('bypass'), left = b.armedUntil ? b.armedUntil - now() : 0;
        if (left > 0) return h('div.bypass.armed', h('div', h('b', icon('warn', 14), 'Emergency bypass is armed'), h('p', 'Every network may sign in until ' + new Date(b.armedUntil).toLocaleTimeString() + ' (' + fmtLeft(left) + ' left). Reason: “' + b.reason + '”.')),
          UI.Button({ label: 'Disarm now', kind: 'secondary', size: 'sm', onClick: function () { immediate('bypass', { armedUntil: null, reason: '', armedBy: '' }, 'Emergency bypass', 'Armed', 'Disarmed'); UI.toast('Emergency bypass disarmed.', 'info'); ctx.rerender(); } }));
        return h('div.bypass', h('div', h('b', 'Emergency bypass'), h('p', 'Not armed. Allows every network for 2 hours. Arm it before you need it, for example before changing the network list.')), h('div.acts', UI.Button({ label: 'Show recent activity', kind: 'ghost', size: 'sm', onClick: activity }), UI.Button({ label: 'Arm 2h window', icon: 'bolt', kind: 'secondary', size: 'sm', onClick: arm })));
      }
      function arm() {
        var reason = '', ack = false, e = h('div.fld-e', { role: 'alert' });
        var m = UI.Modal({ title: 'Arm emergency bypass', desc: 'Allows sign-in from every network for 2 hours, ignoring the allowlist or blocklist.', size: 'sm',
          body: h('div.form', UI.Banner({ tone: 'warn', compact: true, title: 'This weakens your network protection', children: 'Anyone with valid credentials can sign in from anywhere until the window ends. It is recorded in the configuration history.' }),
            h('div.fld', h('label.fld-l', { for: 'by-r' }, 'Reason ', h('span.req', '*')), UI.Input({ id: 'by-r', placeholder: 'e.g. travelling next week', maxlength: 120, label: 'Reason', onInput: function (v) { reason = v; } })),
            h('div.fld', h('label.fld-l', 'Duration'), h('div.static', '2 hours (fixed)')), UI.Checkbox({ label: 'I understand every network will be allowed for 2 hours.', onChange: function (c) { ack = c; } }), e),
          footer: [UI.Button({ label: 'Cancel', kind: 'secondary', onClick: function () { m.close(); } }), UI.Button({ label: 'Arm 2h window', kind: 'danger', onClick: function () {
            if (reason.trim().length < 5) { e.textContent = 'Enter a reason of at least 5 characters.'; return; }
            if (!ack) { e.textContent = 'Confirm that you understand before arming.'; return; }
            immediate('bypass', { armedUntil: now() + 2 * 3600 * 1000, reason: reason.trim(), armedBy: S.CURRENT_USER }, 'Emergency bypass', 'Not armed', 'Armed for 2 hours — ' + reason.trim());
            m.close(); UI.toast('Emergency bypass armed for 2 hours.', 'warn'); ctx.rerender();
          } })] });
      }
      function activity() {
        var rows = S.history.filter(function (x) { return x.tab === 'security'; }).slice(0, 8);
        UI.Drawer({ title: 'Recent security activity', desc: 'From the configuration history.', body: rows.length ? UI.AuditTimeline(rows.map(function (r) { return { title: r.change, meta: r.user + ' · ' + U.fmtDateTime(r.at), body: r.from + ' → ' + r.to, tone: 'neutral' }; })) : h('p.mut', 'No recent activity.') });
      }
      var ipEntries = h('div');
      function paintEntries() {
        var list = ctx.get('ip.entries');
        ipEntries.replaceChildren(list.length ? h('ul.ips', list.map(function (x) {
          var yours = validEntry(x.value) && covers(x.value, D.currentIp);
          return h('li', h('code', x.value), h('span.mut', x.note || ''), yours ? UI.Pill('Includes your network', 'info', 'check') : null, UI.IconButton('trash', 'Remove ' + x.value, function () { ctx.set('ip.entries', list.filter(function (y) { return y.id !== x.id; })); paintEntries(); }, { size: 'sm' }));
        })) : UI.EmptyState({ icon: 'globe', title: 'No networks listed', body: 'Add the IPv4 addresses or CIDR ranges this rule applies to.', why: 'The list is empty.' }));
      }
      paintEntries();
      var addVal = '', addNote = '', addErr = h('div.fld-e', { role: 'alert' });
      var addIn = UI.Input({ placeholder: '203.0.113.0/24', label: 'IP address or CIDR range', onInput: function (v) { addVal = v; } }), noteIn = UI.Input({ placeholder: 'Note (optional)', label: 'Note', onInput: function (v) { addNote = v; } });
      function addEntry() {
        addErr.textContent = '';
        if (!validEntry(addVal)) { addErr.textContent = 'Enter a valid IPv4 address (203.0.113.7) or CIDR range (203.0.113.0/24).'; addIn.focus(); return; }
        if (ctx.get('ip.entries').some(function (x) { return x.value === addVal.trim(); })) { addErr.textContent = 'That network is already listed.'; return; }
        ctx.set('ip.entries', ctx.get('ip.entries').concat([{ id: U.uid('ip'), value: addVal.trim(), note: addNote.trim() }])); addIn.value = noteIn.value = ''; addVal = addNote = ''; paintEntries();
      }
      var ip = UI.SecurityPolicyCard({ id: 'sec-ip', icon: 'globe', title: 'IP allowlist / blocklist', badges: UI.StatusBadge('active'), desc: 'Networks people may or may not sign in from. When off, no network restriction is enforced and the list stays saved for next time.',
        status: ctx.toggle('ip.enabled', 'Restrict sign-in by network', { onChange: function () { ctx.rerender(); } }),
        children: [
          UI.Seg({ label: 'IP rule mode', value: ctx.get('ip.mode'), options: [{ value: 'allow', label: 'Only allow these' }, { value: 'block', label: 'Block these' }], onChange: function (v) { ctx.set('ip.mode', v); } }),
          ctx.dyn(function () {
            var on = ctx.get('ip.enabled'), mode = ctx.get('ip.mode'), mine = ctx.get('ip.entries').some(function (x) { return validEntry(x.value) && covers(x.value, D.currentIp); });
            return [h('div.cur-ip', icon('mapPin', 14), 'Your current network: ', h('code', D.currentIp), on && mode === 'allow' ? (mine ? UI.Pill('Allowed', 'ok', 'check') : UI.Pill('Not on the list', 'danger', 'warn')) : null),
              on && mode === 'allow' && !mine ? UI.Banner({ tone: 'danger', compact: true, title: 'You could lock yourself out', children: 'Your current network is not on the allowlist. Add it, or arm the emergency bypass first.' }) : null,
              !on ? UI.Banner({ tone: 'info', compact: true, children: 'Restriction is off. The list below is kept for when you turn it on.' }) : null];
          }),
          h('div.fld', { dataset: { errPath: 'security::ip.entries' } }, ipEntries, h('div.fld-e', { role: 'alert' })),
          h('div.ip-add', addIn, noteIn, UI.Button({ label: 'Add', icon: 'plus', kind: 'secondary', onClick: addEntry })), addErr,
          ctx.dyn(bypassPanel)] });

      /* ---------- SSO ---------- */
      var ssoStatus = ctx.dyn(function () {
        var s = ctx.get('sso'), complete = s.entityId.trim() && s.ssoUrl.trim() && s.fingerprint.trim();
        return h('div.chips-row', s.enabled ? UI.Pill('Enabled', 'ok', 'check') : UI.Pill('Disabled', 'neutral'), complete ? UI.Pill('Configuration complete', 'ok', 'check') : UI.Pill('Configuration incomplete', 'warn', 'warn'),
          UI.Pill('Provider: ' + s.provider, 'info'));
      });
      var sso = UI.SecurityPolicyCard({ id: 'sec-sso', icon: 'users', title: 'Single sign-on (SAML)', badges: UI.StatusBadge('active'), desc: 'Hands sign-in over to your identity provider.',
        status: ctx.toggle('sso.enabled', 'Use SAML single sign-on', { onChange: function () { ctx.rerender(); } }),
        children: [ssoStatus, ctx.dyn(function () {
          if (!ctx.get('sso.enabled')) return h('div.mut', 'Off — people sign in with their password' + (ctx.get('mfa.required') ? ' and the emailed code.' : '.'));
          return [ctx.get('mfa.required') ? UI.Banner({ tone: 'info', compact: true, children: 'MFA applies to password sign-in only. People signing in through SSO use your provider’s own checks.' }) : null,
            h('div.grid2', ctx.fieldSelect('sso.provider', ['Okta', 'Azure AD', 'Google Workspace', 'OneLogin', 'Other SAML provider'], { label: 'Identity provider' }), ctx.fieldText('sso.entityId', { label: 'Entity ID', required: true, input: { placeholder: 'https://idp.example.com/entity' } })),
            ctx.fieldText('sso.ssoUrl', { label: 'Single sign-on URL', required: true, input: { placeholder: 'https://idp.example.com/sso/saml', inputmode: 'url' } }),
            ctx.fieldText('sso.fingerprint', { label: 'Certificate fingerprint', required: true, hint: 'SHA-1 or SHA-256, hex, colons optional.', input: { placeholder: 'AB:CD:…', spellcheck: false } }),
            UI.Button({ label: 'Test connection', icon: 'refresh', kind: 'secondary', size: 'sm', onClick: function () {
              S.validate('security');
              var errs = Object.keys(S.errors.security).filter(function (k) { return k.indexOf('sso.') === 0; });
              UI.syncErrors(document.getElementById('panel'));
              if (errs.length) UI.toast('Complete the SAML configuration first.', 'warn'); else UI.toast('Connection test passed (simulated).', 'ok');
            } })];
        }, function () { return [ctx.get('sso.enabled'), ctx.get('mfa.required')]; })] });

      var glance = ctx.dyn(function () {
        var d = ctx.d, armed = d.bypass.armedUntil && d.bypass.armedUntil > now();
        return UI.Glance([
          { icon: 'key', label: 'Multi-factor sign-in', value: d.mfa.required ? 'Required' : 'Not required', sub: d.mfa.required ? U.plural(d.mfa.exceptions.length, 'exception') : 'Password only', tone: d.mfa.required ? 'ok' : 'warn' },
          { icon: 'clock', label: 'Idle timeout', value: d.idle.enabled ? d.idle.minutes + ' minutes' : 'Off', sub: d.idle.enabled ? 'Signs people out when idle' : 'People stay signed in', tone: d.idle.enabled ? 'ok' : 'neutral' },
          { icon: 'globe', label: 'Network rules', value: !d.ip.enabled ? 'Off' : d.ip.mode === 'allow' ? 'Allowlist' : 'Blocklist', sub: U.plural(d.ip.entries.length, 'network') + (armed ? ' · bypass armed' : ''), tone: armed ? 'warn' : d.ip.enabled ? 'ok' : 'neutral' },
          { icon: 'users', label: 'Single sign-on', value: d.sso.enabled ? 'SAML on' : 'Off', sub: d.sso.enabled ? d.sso.provider : 'Password sign-in', tone: d.sso.enabled ? 'ok' : 'neutral' }]);
      });
      return h('div.stack', glance, UI.LiveImpact('Security rules apply to everyone at their next sign-in.'), mfa, idle, ip, sso);
    }
  });
})(window);
