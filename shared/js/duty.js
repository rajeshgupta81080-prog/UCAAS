/* The "On duty" pill in the top bar. Each user is on or off duty (kept in the shared key `ucaas-duty`, so the Directory can show it too).
   Company Rules > Duty policy says who may change it: agents themselves only when "Agents may change their own duty" is on;
   supervisors may change an agent's duty (in the Directory) when "Supervisors may change an agent's duty" is on. Managers and admins always control their own. */
(function (g) {
  'use strict';
  var U = g.UCAAS, KEY = 'ucaas-duty', FIRST = (219 * 3600 + 12 * 60 + 30) * 1000;
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function write(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* ignore */ } }
  function mine() {
    var m = read(), r = U.roles.current();
    if (!m[r]) { m[r] = { on: true, since: Date.now() - FIRST }; write(m); }
    return m[r];
  }
  function agentsOwn() { var d = (U.bus.state.settings || {})['duty-policy']; return !d || d.agentsOwn !== false; }

  U.duty = {
    canToggleOwn: function () { return U.roles.current() !== 'agent' || agentsOwn(); },
    toggle: function () {
      if (!U.duty.canToggleOwn()) { U.toast('Your duty is set by a supervisor (Company Rules > Duty policy).'); return; }
      var m = read(), r = U.roles.current(), cur = mine();
      m[r] = { on: !cur.on, since: Date.now() }; write(m);
      U.duty.refresh();
      U.router.post({ ucaas: 'duty', on: m[r].on });
      U.toast(m[r].on ? 'You are on duty.' : 'You are off duty. Queues stop sending you calls.');
    },
    isOn: function () { return mine().on; },
    refresh: function () {
      var d = mine(), pill = document.getElementById('dutyPill'); if (!pill) return;
      var secs = Math.max(0, Math.floor((Date.now() - d.since) / 1000));
      pill.classList.toggle('off', !d.on);
      pill.querySelector('.dl').textContent = d.on ? 'On duty ' : 'Off duty ';
      document.getElementById('duty').textContent = d.on ? Math.floor(secs / 3600) + ':' + pad(Math.floor(secs % 3600 / 60)) + ':' + pad(secs % 60) : '';
      pill.title = U.duty.canToggleOwn() ? 'Click to go ' + (d.on ? 'off' : 'on') + ' duty' : 'Your duty is set by a supervisor';
    },
    init: function () {
      document.getElementById('dutyPill').addEventListener('click', U.duty.toggle);
      U.duty.refresh(); setInterval(U.duty.refresh, 1000);
    }
  };
})(window);
