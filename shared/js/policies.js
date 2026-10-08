/* Company Rules that the shell itself applies, as soon as they are saved:
   - Phone rules > company time zone      -> the top-bar clock and its GMT label
   - Duty policy > sign out idle people    -> an "inactive" lock screen after N idle minutes
   Everything else is applied inside the sections (see their js/link.js). */
(function (g) {
  'use strict';
  var U = g.UCAAS, lastActive = Date.now(), locked = false, timer = null;

  function settings() { return U.bus.state.settings || {}; }
  function zone() { var p = settings()['phone-rules']; return p && p.location && p.location.timezone || ''; }

  U.policies = {
    zone: zone,
    idleMinutes: function () {
      var d = settings()['duty-policy'], sec = settings()['security'], list = [];
      if (d && d.signOutIdle) list.push(Math.max(1, Number(d.signOutMinutes) || 15));
      if (sec && sec.idle && sec.idle.enabled) list.push(Math.max(1, Number(sec.idle.minutes) || 30));
      return list.length ? Math.min.apply(null, list) : 0;
    },
    company: function () { var c = settings()['caller-id-name']; return c && c.name || ''; },
    touch: function () { if (!locked) lastActive = Date.now(); },
    init: function () {
      ['mousemove', 'keydown', 'click', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, U.policies.touch, true); });
      timer = setInterval(function () {
        var m = U.policies.idleMinutes();
        if (m && !locked && Date.now() - lastActive > m * 60000) lock(m);
      }, 5000);
      document.getElementById('lockResume').addEventListener('click', function () {
        locked = false; lastActive = Date.now(); document.getElementById('lockScreen').hidden = true;
      });
    }
  };

  function lock(m) {
    locked = true;
    document.getElementById('lockMsg').textContent = 'You were signed out after ' + m + ' minute' + (m === 1 ? '' : 's') + ' without activity, as set in Company Rules (duty policy / security).';
    document.getElementById('lockScreen').hidden = false;
    document.getElementById('lockResume').focus();
  }

  /** called whenever settings arrive or change */
  U.settingsApplied = function () { U.clock.setZone(zone()); if (U.duty) U.duty.refresh(); if (U.router && U.router.title) U.router.title(); };
})(window);
