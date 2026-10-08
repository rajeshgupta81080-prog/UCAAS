/* Dummy history, delivery status and recent alerts so every audit view has realistic content. */
(function (g) {
  'use strict';
  var CRX = g.CRX;
  function ago(h) { return new Date(Date.now() - h * 3600 * 1000).toISOString(); }

  CRX.seed = {
    history: function () {
      var R = [
        ['Johnny Doe', 'phone-rules', 'Phone rules', 'Time zone', 'Not set', 'Asia/Kolkata', 2, 'Delivered'],
        ['Johnny Doe', 'phone-rules', 'Phone rules', 'Opening hours', '24 hours', 'Mon–Fri 09:00–18:00', 2.2, 'Delivered'],
        ['Arjun Singh', 'policies', 'Policies', 'Announce recording to callers', 'Off', 'On', 5, 'Delivered'],
        ['Priya Kapoor', 'break-reasons', 'Break reasons', 'Training allowance (min)', '30', '45', 8, 'Delivered'],
        ['Johnny Doe', 'security', 'Security', 'Idle timeout', 'Off', 'On (30 min)', 20, 'Delivered'],
        ['Sneha Reddy', 'calling', 'Calling', 'Transfers to international numbers', 'On', 'Off', 26, 'Delivered'],
        ['Johnny Doe', 'security', 'Security', 'Require MFA for password sign-in', 'Off', 'On', 27, 'Delivered'],
        ['Karan Malhotra', 'alerts', 'Alerts', 'Alert rule “Abandon rate increased”', 'Off', 'On', 30, 'Delivered'],
        ['Arjun Singh', 'campaign-timers', 'Campaign timers', 'Line ceiling per campaign', '250', '200', 49, 'Delivered'],
        ['Johnny Doe', 'ringing-voicemail', 'Ringing & voicemail', 'Default ring time (seconds)', '20', '30', 52, 'Delivered'],
        ['Priya Kapoor', 'duty-policy', 'Duty policy', 'Supervisors may change agent duty', 'Off', 'On', 55, 'Delivered'],
        ['Sneha Reddy', 'greetings', 'Greetings', 'Welcome message', 'Off', 'On (Welcome – standard)', 72, 'Delivered'],
        ['Johnny Doe', 'holidays', 'Holidays', 'Company holidays', '0 items', '4 items', 74, 'Delivered'],
        ['Arjun Singh', 'caller-id-name', 'Caller ID name', 'Name to send', 'Not set', 'Acme Corp', 96, 'Delivered'],
        ['Johnny Doe', 'desk-phones', 'Desk phones', 'People may set up their own desk phone', 'Off', 'On', 120, 'Failed'],
        ['Rahul Mehta', 'break-reasons', 'Break reasons', 'Lost connection grace (seconds)', '30', '60', 140, 'Delivered'],
        ['Johnny Doe', 'phone-rules', 'Phone rules', 'Call recording', 'Nothing recorded', 'Record automatically', 160, 'Delivered'],
        ['Johnny Doe', 'phone-rules', 'Phone rules', 'Transcription', 'Off', 'On', 160.1, 'Delivered'],
        ['Sneha Reddy', 'policies', 'Policies', 'Recording retention', 'Keep indefinitely', '365 days', 190, 'Delivered'],
        ['Priya Kapoor', 'alerts', 'Alerts', 'Alert rule “Queue wait time exceeded”', 'Not set', 'Sales, Support', 215, 'Delivered'],
        ['Karan Malhotra', 'campaign-timers', 'Campaign timers', 'Wrap-up time (seconds)', '45', '30', 240, 'Delivered'],
        ['Johnny Doe', 'security', 'Security', 'IP rule mode', 'Block these', 'Only allow these', 262, 'Delivered'],
        ['Arjun Singh', 'calling', 'Calling', 'Menu keys may forward outside', 'Off', 'On', 288, 'Delivered'],
        ['Johnny Doe', 'policies', 'Policies', 'International calling for new users', 'Allowed', 'Blocked', 310, 'Delivered'],
        ['Sneha Reddy', 'phone-rules', 'Phone rules', 'Outgoing caller ID', 'Main line · Mumbai', 'Main line · Bengaluru', 330, 'Delivered'],
        ['Johnny Doe', 'ringing-voicemail', 'Ringing & voicemail', 'New people start with this ring time', 'Off', 'On', 355, 'Delivered'],
        ['Priya Kapoor', 'duty-policy', 'Duty policy', 'Agents may change their own duty', 'Off', 'On', 380, 'Delivered']
      ];
      return R.map(function (r, i) {
        return { id: 'h' + (i + 1), user: r[0], tab: r[1], section: r[2], change: r[3], from: r[4], to: r[5], at: ago(r[6]), status: r[7], products: [] };
      });
    },
    delivery: function () {
      return [
        { product: 'switch', name: 'Phone switch', change: 'Opening hours and time zone', status: 'Delivered', updated: ago(2), detail: 'Confirmed by the product within about a minute of saving.' },
        { product: 'recording', name: 'Recording & transcripts', change: 'Call recording and transcription', status: 'Delivered', updated: ago(160), detail: 'Confirmed by the product within about a minute of saving.' },
        { product: 'queues', name: 'Contact-centre queues', change: 'Alert rule: Abandon rate increased', status: 'Delivered', updated: ago(30), detail: 'Confirmed by the product within about a minute of saving.' },
        { product: 'campaigns', name: 'Campaign engine', change: 'Line ceiling per campaign', status: 'Delivered', updated: ago(49), detail: 'Running campaigns picked up the new limit.' },
        { product: 'auth', name: 'Sign-in service', change: 'Idle timeout', status: 'Delivered', updated: ago(20), detail: 'Applies from each person’s next sign-in.' },
        { product: 'desk', name: 'Desk-phone provisioning', change: 'Self setup turned on', status: 'Failed', updated: ago(120), detail: 'Request failed with status code 404 — the provisioning service could not be reached. Retry delivery.' },
        { product: 'reports', name: 'Reports', change: 'Time zone', status: 'Unknown', updated: ago(2), detail: 'No confirmation received yet. Reports read the time zone on their next refresh.' }
      ];
    },
    recent: function () {
      return [
        { id: 'a1', at: ago(0.4), queue: 'Support', type: 'Queue wait time exceeded', recipient: 'Priya Kapoor', status: 'Acknowledged' },
        { id: 'a2', at: ago(1.6), queue: 'Sales', type: 'Service level below threshold', recipient: 'Karan Malhotra', status: 'Sent' },
        { id: 'a3', at: ago(7), queue: 'Billing', type: 'Abandon rate increased', recipient: 'Priya Kapoor', status: 'Acknowledged' },
        { id: 'a4', at: ago(26), queue: 'Enterprise Support', type: 'Queue wait time exceeded', recipient: 'Karan Malhotra', status: 'Failed' }
      ];
    }
  };
})(window);
