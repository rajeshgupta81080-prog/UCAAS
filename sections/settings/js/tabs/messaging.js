/* Tab 7 - Messaging: company SMS/MMS rules, texting from unregistered US numbers (10DLC) and the HELP auto-reply. */
(function (g) {
  'use strict';
  var CRX = g.CRX, h = CRX.h, icon = CRX.icon, UI = CRX.ui, U = CRX.util;

  var TEMPLATE = '{Business name}: this is our customer support line. For help, reply to this message, email {support email} or call {support phone}. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out.';
  var MAX_REPLY = 1000;

  /* ---- how many text messages a reply becomes (GSM-7 with extension table, otherwise UCS-2) ---- */
  var GSM_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
  var GSM_EXT = '^{}\\[~]|€\f';
  function segments(text) {
    var units = 0, ext = false, ucs = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      if (GSM_EXT.indexOf(ch) >= 0) { units += 2; ext = true; } else if (GSM_BASIC.indexOf(ch) >= 0) units += 1; else { ucs = true; break; }
    }
    var enc = ucs ? 'UCS2' : ext ? 'GSM_7BIT_EXT' : 'GSM_7BIT';
    if (ucs) units = text.length;
    var single = ucs ? 70 : 160, multi = ucs ? 67 : 153;
    var segs = units === 0 ? 0 : units <= single ? 1 : Math.ceil(units / multi);
    return { chars: units, segs: segs, per: segs > 1 ? multi : single, enc: enc }; // like the carrier: { } [ ] \ ^ ~ | and the euro sign count as 2
  }

  // The 10DLC brand status comes from the registration screens, not from this tab, so it is shown read-only.
  var BRAND = { status: 'unverified' };
  var BRAND_PILL = { unverified: ['Brand not verified', 'danger', 'Unverified brand: US texts are refused.'], pending: ['Verification pending', 'warn', 'Your brand is being reviewed.'], verified: ['Brand verified', 'ok', 'US texts can be sent once a campaign is approved.'] };

  var RELATED = [['10DLC Compliance', 'The registration US carriers require for business text messaging.', 'doc'], ['SMS/Calling Rates', 'What text messages and calls cost.', 'dollar'],
    ['Templates', 'Reusable message templates.', 'list'], ['Canned Messages', 'Quick replies for agents.', 'msg'], ['Broadcasting', 'Send one message to many people.', 'wave']];

  CRX.registerTab({
    id: 'messaging', title: 'Messaging', short: 'Messaging', icon: 'msg',
    desc: 'Company SMS and MMS rules.',
    products: ['switch'],
    settings: [
      { id: 'sms-allow', label: 'Allow SMS and MMS', keywords: 'texting inbound outbound customers text messages' },
      { id: 'sms-unregistered', label: 'Allow texting from unregistered US numbers', keywords: '10dlc brand campaign registration us only' },
      { id: 'sms-help', label: 'HELP reply (auto-reply when someone texts HELP)', keywords: 'help message template segments stop opt out' }],
    labels: { allowSms: 'Allow SMS and MMS', allowUnregistered: 'Allow texting from unregistered US numbers', helpReply: 'HELP reply' },
    anchors: { allowSms: 'sms-allow', allowUnregistered: 'sms-unregistered', helpReply: 'sms-help' },
    defaults: function () { return { allowSms: false, allowUnregistered: false, helpReply: TEMPLATE }; },
    validate: function (d) {
      var e = {}, r = d.helpReply.trim();
      if (!r) e.helpReply = 'Enter the reply people get when they text HELP, or use the template.';
      else if (d.helpReply.length > MAX_REPLY) e.helpReply = 'Keep the reply under ' + MAX_REPLY + ' characters (' + d.helpReply.length + ' entered).';
      return e;
    },
    risks: function (d, saved) {
      var out = [];
      if (saved.allowSms && !d.allowSms) out.push({ title: 'All customer texting stops', message: 'Turning off “Allow SMS and MMS” stops every text to and from customers.' });
      if (d.allowSms && d.allowUnregistered && BRAND.status !== 'verified') out.push({ title: 'Brand not verified', message: 'Texting from unregistered US numbers is allowed, but while your 10DLC brand is unverified US texts are refused.' });
      if (d.helpReply.trim() && !/stop/i.test(d.helpReply)) out.push({ title: 'The HELP reply does not mention STOP', message: 'Carriers expect the reply to tell people how to opt out (for example “Reply STOP to opt out”).' });
      return out;
    },
    render: function (ctx) {
      /* ---------- 1. SMS and MMS on / off ---------- */
      var sAllow = UI.Section({ id: 'sms-allow', icon: 'msg', title: 'Inbound and outbound SMS/MMS', badges: UI.StatusBadge('active'), desc: 'Texting with people outside the company.',
        children: UI.Card({ children: ctx.toggleRow('allowSms', { title: 'Allow SMS and MMS', desc: 'Off stops all customer texting.' }) }) });

      /* ---------- 2. unregistered US numbers + 10DLC status ---------- */
      var brand = BRAND_PILL[BRAND.status];
      var sUnreg = UI.Section({ id: 'sms-unregistered', icon: 'shield', title: 'Outbound SMS/MMS from unregistered numbers (US only)', badges: UI.StatusBadge('active'), desc: 'Texting from US numbers without an approved campaign.',
        children: UI.Card({ children: [
          ctx.dyn(function () {
            var on = ctx.get('allowSms');
            return ctx.toggleRow('allowUnregistered', { title: 'Allow texting from unregistered US numbers', desc: on ? 'Keep off unless registered.' : 'Turn on “Allow SMS and MMS” first — with texting off, nothing is sent.', disabled: !on });
          }, function () { return [ctx.get('allowSms')]; }),
          ctx.dyn(function () {
            return ctx.get('allowSms') && ctx.get('allowUnregistered') && BRAND.status !== 'verified'
              ? UI.Banner({ tone: 'warn', compact: true, title: 'Allowed, but your brand is not verified', children: 'While the brand is unverified, US texts are still refused. Register your brand and an SMS campaign to send.' }) : null;
          }, function () { return [ctx.get('allowSms'), ctx.get('allowUnregistered')]; }),
          h('div.tenlc', h('div.tenlc-h', h('b', 'Your 10DLC registration right now'), UI.Pill(brand[0], brand[1], brand[1] === 'ok' ? 'check' : 'warn')), h('p', brand[2]),
            h('div.acts.start', UI.Button({ label: 'Register or check your brand', icon: 'external', kind: 'secondary', size: 'sm', onClick: function () { CRX.shellLeave('10DLC Compliance › Brands'); } }),
              UI.Button({ label: 'Register an SMS campaign', icon: 'external', kind: 'secondary', size: 'sm', onClick: function () { CRX.shellLeave('10DLC Compliance › Campaigns'); } })))] }) });

      /* ---------- 3. HELP reply with live segment count ---------- */
      var ta = UI.Textarea({ id: 'sms-help-reply', rows: 5, maxlength: MAX_REPLY + 200, value: ctx.get('helpReply'), label: 'HELP reply', onInput: function (v) { ctx.set('helpReply', v); } });
      var stats = ctx.dyn(function () {
        var t = ctx.get('helpReply'), s = segments(t);
        var line = s.segs === 0 ? 'Empty — nothing would be sent.' : s.chars + ' characters · ' + U.plural(s.segs, 'segment') + ' · ' + s.per + ' characters per segment (' + s.enc + ')';
        return h('div.sms-stats', h('span.mut', line),
          s.segs > 1 ? h('span.sms-warn', icon('warn', 13), 'Over one segment. It will arrive as ' + s.segs + ' texts and be billed as ' + s.segs + '.') : s.segs === 1 ? h('span.sms-ok', icon('check', 13), 'Fits in one text.') : null);
      }, function () { return [ctx.get('helpReply')]; });
      var sHelp = UI.Section({ id: 'sms-help', icon: 'info', title: 'HELP message', badges: UI.StatusBadge('active'), desc: 'Auto-reply when someone texts HELP.',
        children: UI.Card({ children: [
          ctx.field('helpReply', { control: function () {
            return h('div', h('div.sms-lh', h('label.fld-l', { for: 'sms-help-reply' }, 'HELP reply'),
              UI.Button({ label: 'Use the template', icon: 'undo', kind: 'ghost', size: 'sm', onClick: function () { ta.value = TEMPLATE; ctx.set('helpReply', TEMPLATE); ta.focus(); } })), ta); } }),
          stats,
          h('div.fld-h', 'Text in {braces}, such as {Business name}, is filled in when the message is sent. Include how to opt out (“Reply STOP”).')] }) });

      var sRelated = UI.Section({ id: 'messaging-related', icon: 'list', title: 'Related areas', desc: 'These live elsewhere in the Admin Hub sidebar.',
        children: h('div.related', RELATED.map(function (r) {
          return h('button.rel', { type: 'button', onClick: function () { CRX.shellLeave(r[0]); } }, h('span.rel-i', icon(r[2], 16)), h('span', h('b', r[0]), h('small', r[1])), icon('external', 13));
        })) });

      return h('div.stack', sAllow, sUnreg, sHelp, sRelated);
    }
  });
})(window);
