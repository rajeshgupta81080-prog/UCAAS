/* Company Rules in Analytics: the company time zone and the retention periods are the ones set in Company Rules. */
(function (g) {
  'use strict';
  g.UCAAS_onSettings = function () {
    var r = g.UCAAS_rules && g.UCAAS_rules(); if (!r || !g.MCM || !MCM.settings) return;
    var s = MCM.settings, changed = false;
    function set(k, v) { if (v && s[k] !== v) { s[k] = v; changed = true; } }
    set('tz', r.timezone); set('recordingRetentionDays', r.retention.recordings); set('retentionDays', r.retention.voicemail);
    if (changed) g.dispatchEvent(new HashChangeEvent('hashchange'));          // draw the open page again with the new values
  };
})(window);
