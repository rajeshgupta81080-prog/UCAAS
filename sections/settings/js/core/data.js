/* Reference data and realistic dummy data used across the prototype. Frontend-only. */
(function (g) {
  'use strict';
  var CRX = g.CRX;

  var DIAL = {};
  'IN:91,US:1,GB:44,CA:1,AU:61,DE:49,FR:33,ES:34,IT:39,NL:31,IE:353,CH:41,SE:46,AE:971,SA:966,SG:65,JP:81,KR:82,CN:86,HK:852,PK:92,BD:880,LK:94,NP:977,PH:63,ID:62,MY:60,TH:66,VN:84,NZ:64,ZA:27,NG:234,KE:254,EG:20,BR:55,MX:52,AR:54,CO:57,TR:90,RU:7,PL:48'.split(',').forEach(function (x) { var p = x.split(':'); DIAL[p[0]] = p[1]; });

  // [iso, name, region, [time zones]]
  var C = [
    ['IN', 'India', 'Asia', ['Asia/Kolkata']],
    ['US', 'United States', 'Americas', ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']],
    ['GB', 'United Kingdom', 'Europe', ['Europe/London']],
    ['CA', 'Canada', 'Americas', ['America/Toronto', 'America/Vancouver']],
    ['AU', 'Australia', 'Oceania', ['Australia/Sydney', 'Australia/Perth']],
    ['DE', 'Germany', 'Europe', ['Europe/Berlin']],
    ['FR', 'France', 'Europe', ['Europe/Paris']],
    ['ES', 'Spain', 'Europe', ['Europe/Madrid']],
    ['IT', 'Italy', 'Europe', ['Europe/Rome']],
    ['NL', 'Netherlands', 'Europe', ['Europe/Amsterdam']],
    ['IE', 'Ireland', 'Europe', ['Europe/Dublin']],
    ['CH', 'Switzerland', 'Europe', ['Europe/Zurich']],
    ['SE', 'Sweden', 'Europe', ['Europe/Stockholm']],
    ['AE', 'United Arab Emirates', 'Asia', ['Asia/Dubai']],
    ['SA', 'Saudi Arabia', 'Asia', ['Asia/Riyadh']],
    ['SG', 'Singapore', 'Asia', ['Asia/Singapore']],
    ['JP', 'Japan', 'Asia', ['Asia/Tokyo']],
    ['KR', 'South Korea', 'Asia', ['Asia/Seoul']],
    ['CN', 'China', 'Asia', ['Asia/Shanghai']],
    ['HK', 'Hong Kong', 'Asia', ['Asia/Hong_Kong']],
    ['PK', 'Pakistan', 'Asia', ['Asia/Karachi']],
    ['BD', 'Bangladesh', 'Asia', ['Asia/Dhaka']],
    ['LK', 'Sri Lanka', 'Asia', ['Asia/Colombo']],
    ['NP', 'Nepal', 'Asia', ['Asia/Kathmandu']],
    ['PH', 'Philippines', 'Asia', ['Asia/Manila']],
    ['ID', 'Indonesia', 'Asia', ['Asia/Jakarta']],
    ['MY', 'Malaysia', 'Asia', ['Asia/Kuala_Lumpur']],
    ['TH', 'Thailand', 'Asia', ['Asia/Bangkok']],
    ['VN', 'Vietnam', 'Asia', ['Asia/Ho_Chi_Minh']],
    ['NZ', 'New Zealand', 'Oceania', ['Pacific/Auckland']],
    ['ZA', 'South Africa', 'Africa', ['Africa/Johannesburg']],
    ['NG', 'Nigeria', 'Africa', ['Africa/Lagos']],
    ['KE', 'Kenya', 'Africa', ['Africa/Nairobi']],
    ['EG', 'Egypt', 'Africa', ['Africa/Cairo']],
    ['BR', 'Brazil', 'Americas', ['America/Sao_Paulo']],
    ['MX', 'Mexico', 'Americas', ['America/Mexico_City']],
    ['AR', 'Argentina', 'Americas', ['America/Argentina/Buenos_Aires']],
    ['CO', 'Colombia', 'Americas', ['America/Bogota']],
    ['TR', 'Turkey', 'Europe', ['Europe/Istanbul']],
    ['RU', 'Russia', 'Europe', ['Europe/Moscow']],
    ['PL', 'Poland', 'Europe', ['Europe/Warsaw']]
  ].map(function (c) { return { code: c[0], name: c[1], region: c[2], zones: c[3], dial: '+' + DIAL[c[0]] }; });

  var USERS = [
    { id: 'u1', name: 'Ananya Sharma', ext: '2101', role: 'Agent', email: 'ananya.sharma@acme.example' },
    { id: 'u2', name: 'Rahul Mehta', ext: '2102', role: 'Agent', email: 'rahul.mehta@acme.example' },
    { id: 'u3', name: 'Priya Kapoor', ext: '2103', role: 'Supervisor', email: 'priya.kapoor@acme.example' },
    { id: 'u4', name: 'Arjun Singh', ext: '2104', role: 'Sub-admin', email: 'arjun.singh@acme.example' },
    { id: 'u5', name: 'Johnny Doe', ext: '1000', role: 'Admin', email: 'johnny.doe@acme.example' },
    { id: 'u6', name: 'Meera Iyer', ext: '2106', role: 'Agent', email: 'meera.iyer@acme.example' },
    { id: 'u7', name: 'Karan Malhotra', ext: '2107', role: 'Supervisor', email: 'karan.malhotra@acme.example' },
    { id: 'u8', name: 'Sneha Reddy', ext: '2108', role: 'Admin', email: 'sneha.reddy@acme.example' }
  ];
  var QUEUES = [
    { id: 'q1', name: 'Sales', ext: '5850' }, { id: 'q2', name: 'Support', ext: '5851' }, { id: 'q3', name: 'Billing', ext: '5852' }, { id: 'q4', name: 'Enterprise Support', ext: '5853' }
  ];
  var IVRS = [
    { id: 'i1', name: 'Main menu', ext: '7600' }, { id: 'i2', name: 'After-hours menu', ext: '7601', noAction: true }, { id: 'i3', name: 'Support menu', ext: '7602', noAction: true }
  ];
  var NUMBERS = [
    { id: 'n1', number: '+91 80 4567 0001', label: 'Main line · Bengaluru', handled: true },
    { id: 'n2', number: '+91 22 4567 0002', label: 'Mumbai office', handled: true },
    { id: 'n3', number: '+91 11 4567 0003', label: 'Delhi office' },
    { id: 'n4', number: '1800 123 4567', label: 'Toll-free support' }
  ];
  var LINES = [
    { id: 'l1', name: 'Sales – Main', number: '+91 80 4567 0101' },
    { id: 'l2', name: 'Support – Main', number: '+91 80 4567 0102' },
    { id: 'l3', name: 'Billing desk', number: '+91 80 4567 0103' },
    { id: 'l4', name: 'Enterprise hotline', number: '+91 80 4567 0104' },
    { id: 'l5', name: 'Reception', number: '+91 80 4567 0100' }
  ];
  var LANGUAGES = ['English (United States)', 'English (United Kingdom)', 'English (India)', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese (Brazil)', 'Arabic', 'Japanese'];
  var RECORDINGS = [
    { id: 'r1', name: 'Welcome – standard (EN)', length: '0:12' },
    { id: 'r2', name: 'Welcome – festive (EN)', length: '0:15' },
    { id: 'r3', name: 'Hold music – calm piano', length: '2:30' },
    { id: 'r4', name: 'Hold music – upbeat', length: '3:05' },
    { id: 'r5', name: 'Voicemail – standard greeting', length: '0:09' },
    { id: 'r6', name: 'Voicemail – after hours', length: '0:14' },
    { id: 'r7', name: 'Ringback – classic', length: '0:06' },
    { id: 'r8', name: 'Ringback – soft chime', length: '0:05' }
  ];

  // Fixed-date public holidays only (month-day, name) so the dummy data is deterministic.
  var HOLIDAYS = {
    IN: [['01-26', 'Republic Day'], ['08-15', 'Independence Day'], ['10-02', 'Gandhi Jayanti'], ['12-25', 'Christmas Day']],
    US: [['01-01', "New Year's Day"], ['06-19', 'Juneteenth'], ['07-04', 'Independence Day'], ['11-11', "Veterans Day"], ['12-25', 'Christmas Day']],
    GB: [['01-01', "New Year's Day"], ['12-25', 'Christmas Day'], ['12-26', 'Boxing Day']],
    CA: [['01-01', "New Year's Day"], ['07-01', 'Canada Day'], ['11-11', 'Remembrance Day'], ['12-25', 'Christmas Day'], ['12-26', 'Boxing Day']],
    AU: [['01-01', "New Year's Day"], ['01-26', 'Australia Day'], ['04-25', 'Anzac Day'], ['12-25', 'Christmas Day'], ['12-26', 'Boxing Day']],
    DE: [['01-01', 'Neujahr'], ['05-01', 'Tag der Arbeit'], ['10-03', 'Tag der Deutschen Einheit'], ['12-25', 'Weihnachtstag'], ['12-26', 'Zweiter Weihnachtstag']],
    FR: [['01-01', "Jour de l'An"], ['05-01', 'Fête du Travail'], ['07-14', 'Fête nationale'], ['11-11', 'Armistice 1918'], ['12-25', 'Noël']],
    SG: [['01-01', "New Year's Day"], ['05-01', 'Labour Day'], ['08-09', 'National Day'], ['12-25', 'Christmas Day']],
    AE: [['01-01', "New Year's Day"], ['12-02', 'National Day'], ['12-03', 'National Day (second day)']]
  };

  var PRODUCTS = [
    { id: 'switch', name: 'Phone switch', desc: 'Connects live calls' },
    { id: 'recording', name: 'Recording & transcripts', desc: 'Call recording, transcription, monitoring' },
    { id: 'queues', name: 'Contact-centre queues', desc: 'Queues, agents, duty and alerts' },
    { id: 'campaigns', name: 'Campaign engine', desc: 'Outbound dialling campaigns' },
    { id: 'auth', name: 'Sign-in service', desc: 'MFA, idle timeout, IP rules, SSO' },
    { id: 'desk', name: 'Desk-phone provisioning', desc: 'Handset passwords and self setup' },
    { id: 'reports', name: 'Reports', desc: 'Time zone and call reports' }
  ];

  var DESK_PHONES = [
    { id: 'd1', user: 'Ananya Sharma', ext: '2101', model: 'Yealink T54W', mac: '00:15:65:2A:9C:11', status: 'Online', seen: '2 min ago' },
    { id: 'd2', user: 'Rahul Mehta', ext: '2102', model: 'Poly VVX 450', mac: '64:16:7F:3B:20:A4', status: 'Online', seen: '1 min ago' },
    { id: 'd3', user: 'Priya Kapoor', ext: '2103', model: 'Yealink T46U', mac: '80:5E:C0:77:1D:E2', status: 'Offline', seen: '3 days ago' },
    { id: 'd4', user: 'Reception', ext: '1001', model: 'Cisco 8851', mac: '00:BE:75:0C:44:81', status: 'Provisioning', seen: 'just now' },
    { id: 'd5', user: 'Arjun Singh', ext: '2104', model: 'Yealink T54W', mac: '00:15:65:2B:03:5C', status: 'Online', seen: '5 min ago' }
  ];

  CRX.data = {
    countries: C, users: USERS, queues: QUEUES, ivrs: IVRS, numbers: NUMBERS, lines: LINES, languages: LANGUAGES,
    recordings: RECORDINGS, holidays: HOLIDAYS, products: PRODUCTS, deskPhones: DESK_PHONES,
    currentIp: '203.0.113.42',
    country: function (code) { return C.filter(function (c) { return c.code === code; })[0]; },
    user: function (id) { return USERS.filter(function (u) { return u.id === id; })[0]; }
  };
})(window);
