/* The link between sections. Sections cannot see each other (only one is loaded at a time), so they talk through the shell:

     section -> shell   { ucaas:'emit', type:'item',     item }        a task / scheduled call / scheduled meeting was created or changed
                        { ucaas:'emit', type:'settings', settings }    Company Rules saved (all tabs, as saved)
                        { ucaas:'emit', type:'dial',     number, name } "call this person now"
     shell -> section   { ucaas:'items', items, log } | { ucaas:'settings', settings } | { ucaas:'dial', req }

   The shell keeps the shared list of items, the activity log and the last settings in localStorage, so a section opened later
   starts from the same picture. Every section reconciles that picture into its own data (see each section's js/link.js).

   Item: { id:'<origin>:<id>', kind:'call'|'meeting', origin, title, contact, phone, at (ms), duration (min), priority,
           status:'scheduled'|'done'|'cancelled', owner, participants:[], updatedAt } */
(function (g) {
  'use strict';
  var U = g.UCAAS, KEY = 'ucaas-bus', SETTINGS_KEY = 'crx.company-rules.v1';
  var st = { items: [], log: [], settings: null, dial: null, notices: [] };

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) { st.items = s.items || []; st.log = s.log || []; st.settings = s.settings || null; st.notices = s.notices || []; } } catch (e) { /* ignore */ }
    if (!st.settings) {                                   // Company Rules was saved earlier but no section has reported it yet
      try { var c = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); if (c && c.data) st.settings = c.data; } catch (e) { /* ignore */ }
    }
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify({ items: st.items, log: st.log, settings: st.settings, notices: st.notices })); } catch (e) { /* ignore */ } }

  var KIND = { call: 'Call', meeting: 'Meeting' };
  function when(ts) { return new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function addLog(text, target, owner) {
    st.log.unshift({ id: Date.now() + Math.random(), ts: Date.now(), text: text, target: target || '', ownerId: owner || U.roles.current() });
    st.log = st.log.slice(0, 60);
  }

  var visible = function (x) { return U.roles.canSee(x.ownerId); };

  function onItem(item) {
    if (!item || !item.id || !KIND[item.kind]) return;
    var i, old = null;
    for (i = 0; i < st.items.length; i++) if (st.items[i].id === item.id) { old = st.items[i]; break; }
    item.updatedAt = Date.now();
    if (!old) {
      item.ownerId = item.ownerId || U.roles.current(); item.ownerName = item.ownerName || U.roles.person();   // whose it is: decides who may see it
      st.items.unshift(item);
      var line = KIND[item.kind] + ' scheduled: ' + item.title + ' · ' + when(item.at);
      addLog(line, 'interactions/tasks');
      U.notify.add({ title: KIND[item.kind] + ' scheduled', body: item.title + ' · ' + when(item.at), target: 'interactions/tasks' });
    } else {
      var statusChanged = old.status !== item.status;
      st.items[i] = Object.assign({}, old, item);
      if (statusChanged && item.status === 'done') addLog(KIND[item.kind] + ' completed: ' + item.title, 'interactions/tasks');
      else if (statusChanged && item.status === 'cancelled') addLog(KIND[item.kind] + ' cancelled: ' + item.title, 'interactions/tasks');
      else if (old.at !== item.at || old.title !== item.title) addLog(KIND[item.kind] + ' updated: ' + item.title + ' · ' + when(item.at), 'interactions/tasks');
      else return;                                          // nothing visible changed: stay quiet
    }
    st.items = st.items.slice(0, 300);
    persist(); broadcast();
  }

  function onSettings(s, tabs) {
    var first = !st.settings;
    st.settings = s; persist();
    if (!first && tabs && tabs.length) {
      /* company-wide: everyone sees it in the activity list, and every other user gets it in their bell the next time they are here */
      addLog('Company settings updated: ' + tabs.join(', '), 'settings/' + tabs[0], 'agent');
      var by = U.roles.person();
      st.notices.unshift({ ts: Date.now(), title: 'Company rules updated', body: tabs.join(', ') + ' · by ' + by, target: 'settings/' + tabs[0], role: ['admin'] });
      st.notices = st.notices.slice(0, 30);
      var seen = {}; try { seen = JSON.parse(localStorage.getItem('ucaas-notices-seen') || '{}'); } catch (e) { /* ignore */ }
      seen[U.roles.current()] = Date.now() + 1; try { localStorage.setItem('ucaas-notices-seen', JSON.stringify(seen)); } catch (e) { /* ignore */ }
    }
    U.settingsApplied();
    U.router.post({ ucaas: 'settings', settings: st.settings });
    broadcast();
  }

  function broadcast() { U.router.post(itemsMsg()); }
  function itemsMsg() { return { ucaas: 'items', items: st.items.filter(visible), log: st.log.filter(visible) }; }

  U.bus = {
    state: st,
    init: function () { load(); },
    /** what a section that has just loaded needs to be told */
    sync: function () {
      var out = [itemsMsg()];
      if (st.settings) out.push({ ucaas: 'settings', settings: st.settings });
      if (st.dial) out.push({ ucaas: 'dial', req: st.dial });
      return out;
    },
    handle: function (m) {
      if (m.type === 'item') onItem(m.item);
      else if (m.type === 'settings') onSettings(m.settings, m.tabs);
      else if (m.type === 'dial') {
        st.dial = { id: Date.now(), number: String(m.number || ''), name: String(m.name || '') };
        U.router.go('interactions/dialer');
        U.router.post({ ucaas: 'dial', req: st.dial });
      }
    }
  };
})(window);
