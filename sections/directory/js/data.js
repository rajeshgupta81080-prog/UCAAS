/* Demo directory: 36 people in 6 teams. Deterministic, built from fixed name lists. */
(function (g) {
  'use strict';
  var first = ['Sarah', 'Marcus', 'Priya', 'Daniel', 'Aisha', 'Tom', 'Elena', 'Ravi', 'Chloe', 'Omar', 'Hannah', 'Lucas', 'Mei', 'Jorge', 'Fatima', 'Ben', 'Nina', 'Samuel'];
  var last = ['Jenkins', 'Lee', 'Nair', 'Reyes', 'Khan', 'Becker', 'Rossi', 'Patel', 'Dubois', 'Haddad', 'Olsen', 'Meyer', 'Tan', 'Silva', 'Rahman', 'Clarke', 'Petrov', 'Adams'];
  var teams = [
    { id: 'Support', lead: 'Sarah Jenkins', queue: 'Support', about: 'First-line customer support.' },
    { id: 'Sales', lead: 'Marcus Lee', queue: 'Sales', about: 'Inbound and outbound sales.' },
    { id: 'Billing', lead: 'Priya Nair', queue: 'Billing', about: 'Invoices, payments and refunds.' },
    { id: 'Technical', lead: 'Daniel Reyes', queue: 'Technical', about: 'Escalated technical issues.' },
    { id: 'VIP', lead: 'Aisha Khan', queue: 'VIP', about: 'Priority accounts.' },
    { id: 'Management', lead: 'Johnny Doe', queue: '—', about: 'Admins and supervisors.' }
  ];
  var roles = { Support: 'Support agent', Sales: 'Sales rep', Billing: 'Billing specialist', Technical: 'Tier 2 engineer', VIP: 'Account manager', Management: 'Supervisor' };
  var statuses = ['Available', 'On call', 'Break', 'Offline'];
  var palette = ['#2563eb', '#0f766e', '#c2570c', '#7c3aed', '#be185d', '#4b5565', '#0369a1', '#15803d'];

  var people = [];
  for (var i = 0; i < 36; i++) {
    var f = first[i % first.length], l = last[(i * 7 + (i >= 18 ? 5 : 0)) % last.length], t = teams[i % teams.length];
    var name = f + ' ' + l;
    people.push({
      id: 'P' + (1000 + i), name: name, team: t.id, role: i < 6 ? (i === 5 ? 'Admin' : 'Team lead') : roles[t.id],
      ext: String(2100 + i * 3), phone: '+1 415 555 ' + ('0000' + (1200 + i * 17)).slice(-4),
      email: (f + '.' + l).toLowerCase() + '@example.com', status: statuses[(i * 5 + (i >> 2)) % 4],
      location: ['San Francisco', 'London', 'Berlin', 'Remote'][i % 4], color: palette[i % palette.length]
    });
  }
  /* team leads are real people in their team */
  teams.forEach(function (t, k) { people[k].name = t.lead; people[k].email = t.lead.toLowerCase().replace(' ', '.') + '@example.com'; people[k].team = t.id; });

  g.DIR_DATA = {
    people: people,
    teams: teams,
    statuses: statuses,
    statusColor: { 'Available': 'var(--ok)', 'On call': 'var(--primary)', 'Break': '#f59e0b', 'Offline': 'var(--toggle-off)' }
  };
})(window);
