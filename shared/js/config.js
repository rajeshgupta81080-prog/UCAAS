/* UCAAS registry: the five top-bar sections and the pages inside each.
   `entry` is the section's own index.html; the part of the URL after `#/<section>/` is handed to that page as its hash.
   `pages` feeds the top-bar search and route validation. */
(function (g) {
  'use strict';
  var U = g.UCAAS = g.UCAAS || {};

  U.defaultSection = 'dashboard';

  U.sections = [
    { id: 'dashboard', label: 'Dashboard', entry: 'sections/dashboard/index.html', pages: [
      { id: '', title: 'Overview' }
    ] },
    { id: 'directory', label: 'Directory', entry: 'sections/directory/index.html', pages: [
      { id: 'people', title: 'People' },
      { id: 'teams', title: 'Teams' }
    ] },
    { id: 'interactions', label: 'Interactions', entry: 'sections/interactions/index.html', pages: [
      { id: 'dialer', title: 'Dialer (calls)' },
      { id: 'video', title: 'Video meetings' },
      { id: 'tasks', title: 'Tasks' }
    ] },
    { id: 'analytics', label: 'Analytics', entry: 'sections/analytics/index.html', pages: [
      ['queues', 'Queues'], ['agents', 'Agents'], ['calls', 'Calls'], ['flows', 'Flows'], ['boards', 'Boards'],
      ['live', 'Live'], ['monitoring', 'Monitoring'], ['callbacks', 'Callbacks'], ['campaigns', 'Campaigns'],
      ['aiwall', 'AI Wall'], ['speech', 'Speech'], ['quality', 'Quality'], ['coaching', 'Coaching'],
      ['activity', 'Agent Activity'], ['reports', 'Reports'], ['wfm', 'WFM'], ['alerts', 'Alerts'], ['settings', 'Analytics settings']
    ].map(function (p) { return { id: p[0], title: p[1] }; }) },
    { id: 'settings', label: 'Settings', entry: 'sections/settings/index.html', pages: [
      ['phone-rules', 'Phone rules'], ['greetings', 'Greetings'], ['ringing-voicemail', 'Ringing & voicemail'],
      ['emergency-address', 'Emergency address (E911)'], ['holidays', 'Holidays'], ['calling', 'Calling'],
      ['messaging', 'Messaging'], ['policies', 'Policies'], ['break-reasons', 'Break reasons'], ['duty-policy', 'Duty policy'],
      ['campaign-timers', 'Campaign timers'], ['alerts', 'Alerts'], ['security', 'Security'],
      ['profile-fields', 'Profile fields'], ['caller-id-name', 'Caller ID name'], ['change-log', 'Change log'], ['desk-phones', 'Desk phones']
    ].map(function (p) { return { id: p[0], title: p[1] }; }) }
  ];

  U.section = function (id) {
    for (var i = 0; i < U.sections.length; i++) if (U.sections[i].id === id) return U.sections[i];
    return null;
  };

  /* demo notifications for the bell */
  U.notifications = [
    { id: 'n1', title: 'Queue "Support" is over SLA', body: '3 callers waiting more than 2 minutes.', target: 'analytics/live' },
    { id: 'n2', title: 'Holiday schedule needs review', body: 'Two company holidays have no greeting assigned.', target: 'settings/holidays' }
  ];
})(window);
