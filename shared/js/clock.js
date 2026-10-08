/* Top-bar clock, timezone label and the on-duty timer. */
(function (g) {
  'use strict';
  var U = g.UCAAS;
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var zone = '', fmt = null;

  function gmtLabel(tz) {
    var off = -new Date().getTimezoneOffset();
    if (tz) {
      try {
        var p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0];
        if (p) return p.value.replace('UTC', 'GMT');
      } catch (e) { /* unknown zone: fall back to the browser's */ }
    }
    var a = Math.abs(off);
    return 'GMT' + (off < 0 ? '-' : '+') + Math.floor(a / 60) + (a % 60 ? ':' + pad(a % 60) : '');
  }

  U.clock = {
    /** show the company time zone (empty string = the browser's own) */
    setZone: function (tz) {
      zone = tz || ''; fmt = null;
      if (zone) { try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch (e) { zone = ''; } }
      var el = document.getElementById('tz'); el.textContent = gmtLabel(zone); el.title = zone || 'Browser time zone';
    },
    init: function () {
      U.clock.setZone(U.policies ? U.policies.zone() : '');
      var clock = document.getElementById('clock');
      function tick() {
        var d = new Date();
        clock.textContent = fmt ? fmt.format(d) : pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
      }
      tick(); setInterval(tick, 1000);
    }
  };
})(window);
