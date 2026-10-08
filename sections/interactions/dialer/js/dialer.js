/* ============================== Data ============================== */
const INITIAL_AGENT = {
  name: "Sarah Jenkins", role: "Tier 2 Support Specialist", id: "AGT-8842",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  callsToday: 24, aht: "04:12", holdTimeAvg: "00:34", csat: "4.9/5.0"
};
const AGENT_STATUSES = [
  { id: "available", label: "Available",        color: "c-emerald" },
  { id: "on_queue",  label: "On Queue",         color: "c-cyan" },
  { id: "on_break",  label: "On Break",         color: "c-amber" },
  { id: "busy",      label: "Busy / In Meeting", color: "c-rose" },
  { id: "offline",   label: "Offline",          color: "c-slate" }
];
let CALLER_ID = "+1 631 309 1186";   // replaced by Company Rules > Phone rules > Outbound caller ID once those are known
const EXTENSION = "1000";
const WEBRTC = {
  registered:   { label: "WebRTC · registered",    cls: "ok" },
  connecting:   { label: "WebRTC · connecting…",   cls: "warn" },
  disconnected: { label: "WebRTC · disconnected",  cls: "off" }
};
const COUNTRY_DATA = "AF Afghanistan:93,AL Albania:355,DZ Algeria:213,AS American Samoa:1684,AD Andorra:376,AO Angola:244,AI Anguilla:1264,AG Antigua and Barbuda:1268,AR Argentina:54,AM Armenia:374,AW Aruba:297,AU Australia:61,AT Austria:43,AZ Azerbaijan:994,BS Bahamas:1242,BH Bahrain:973,BD Bangladesh:880,BB Barbados:1246,BY Belarus:375,BE Belgium:32,BZ Belize:501,BJ Benin:229,BM Bermuda:1441,BT Bhutan:975,BO Bolivia:591,BA Bosnia and Herzegovina:387,BW Botswana:267,BR Brazil:55,IO British Indian Ocean Territory:246,VG British Virgin Islands:1284,BN Brunei:673,BG Bulgaria:359,BF Burkina Faso:226,BI Burundi:257,KH Cambodia:855,CM Cameroon:237,CA Canada:1,CV Cape Verde:238,KY Cayman Islands:1345,CF Central African Republic:236,TD Chad:235,CL Chile:56,CN China:86,CO Colombia:57,KM Comoros:269,CG Congo:242,CD DR Congo:243,CK Cook Islands:682,CR Costa Rica:506,CI Côte d'Ivoire:225,HR Croatia:385,CU Cuba:53,CW Curaçao:599,CY Cyprus:357,CZ Czechia:420,DK Denmark:45,DJ Djibouti:253,DM Dominica:1767,DO Dominican Republic:1809,EC Ecuador:593,EG Egypt:20,SV El Salvador:503,GQ Equatorial Guinea:240,ER Eritrea:291,EE Estonia:372,SZ Eswatini:268,ET Ethiopia:251,FK Falkland Islands:500,FO Faroe Islands:298,FJ Fiji:679,FI Finland:358,FR France:33,GF French Guiana:594,PF French Polynesia:689,GA Gabon:241,GM Gambia:220,GE Georgia:995,DE Germany:49,GH Ghana:233,GI Gibraltar:350,GR Greece:30,GL Greenland:299,GD Grenada:1473,GP Guadeloupe:590,GU Guam:1671,GT Guatemala:502,GG Guernsey:44,GN Guinea:224,GW Guinea-Bissau:245,GY Guyana:592,HT Haiti:509,HN Honduras:504,HK Hong Kong:852,HU Hungary:36,IS Iceland:354,IN India:91,ID Indonesia:62,IR Iran:98,IQ Iraq:964,IE Ireland:353,IM Isle of Man:44,IL Israel:972,IT Italy:39,JM Jamaica:1876,JP Japan:81,JE Jersey:44,JO Jordan:962,KZ Kazakhstan:7,KE Kenya:254,KI Kiribati:686,XK Kosovo:383,KW Kuwait:965,KG Kyrgyzstan:996,LA Laos:856,LV Latvia:371,LB Lebanon:961,LS Lesotho:266,LR Liberia:231,LY Libya:218,LI Liechtenstein:423,LT Lithuania:370,LU Luxembourg:352,MO Macao:853,MG Madagascar:261,MW Malawi:265,MY Malaysia:60,MV Maldives:960,ML Mali:223,MT Malta:356,MH Marshall Islands:692,MQ Martinique:596,MR Mauritania:222,MU Mauritius:230,YT Mayotte:262,MX Mexico:52,FM Micronesia:691,MD Moldova:373,MC Monaco:377,MN Mongolia:976,ME Montenegro:382,MS Montserrat:1664,MA Morocco:212,MZ Mozambique:258,MM Myanmar:95,NA Namibia:264,NR Nauru:674,NP Nepal:977,NL Netherlands:31,NC New Caledonia:687,NZ New Zealand:64,NI Nicaragua:505,NE Niger:227,NG Nigeria:234,NU Niue:683,KP North Korea:850,MK North Macedonia:389,MP Northern Mariana Islands:1670,NO Norway:47,OM Oman:968,PK Pakistan:92,PW Palau:680,PS Palestine:970,PA Panama:507,PG Papua New Guinea:675,PY Paraguay:595,PE Peru:51,PH Philippines:63,PL Poland:48,PT Portugal:351,PR Puerto Rico:1787,QA Qatar:974,RE Réunion:262,RO Romania:40,RU Russia:7,RW Rwanda:250,BL Saint Barthélemy:590,SH Saint Helena:290,KN Saint Kitts and Nevis:1869,LC Saint Lucia:1758,MF Saint Martin:590,PM Saint Pierre and Miquelon:508,VC Saint Vincent and the Grenadines:1784,WS Samoa:685,SM San Marino:378,ST São Tomé and Príncipe:239,SA Saudi Arabia:966,SN Senegal:221,RS Serbia:381,SC Seychelles:248,SL Sierra Leone:232,SG Singapore:65,SX Sint Maarten:1721,SK Slovakia:421,SI Slovenia:386,SB Solomon Islands:677,SO Somalia:252,ZA South Africa:27,KR South Korea:82,SS South Sudan:211,ES Spain:34,LK Sri Lanka:94,SD Sudan:249,SR Suriname:597,SE Sweden:46,CH Switzerland:41,SY Syria:963,TW Taiwan:886,TJ Tajikistan:992,TZ Tanzania:255,TH Thailand:66,TL Timor-Leste:670,TG Togo:228,TK Tokelau:690,TO Tonga:676,TT Trinidad and Tobago:1868,TN Tunisia:216,TR Türkiye:90,TM Turkmenistan:993,TC Turks and Caicos Islands:1649,TV Tuvalu:688,UG Uganda:256,UA Ukraine:380,AE United Arab Emirates:971,GB United Kingdom:44,US United States:1,UY Uruguay:598,VI US Virgin Islands:1340,UZ Uzbekistan:998,VU Vanuatu:678,VA Vatican City:379,VE Venezuela:58,VN Vietnam:84,WF Wallis and Futuna:681,YE Yemen:967,ZM Zambia:260,ZW Zimbabwe:263";
const COUNTRIES = COUNTRY_DATA.split(',').map((s) => { const [n, d] = s.split(':'); return { iso: n.slice(0, 2), name: n.slice(3), dial: d }; });
// Country of a full +number: longest matching dial prefix; shared codes prefer the main country.
const PREFERRED = ['US', 'GB', 'RU', 'RE', 'GP'];
const countryFromNumber = (num) => {
  if (!/^\s*\+/.test(String(num || ''))) return null;
  const digits = String(num).replace(/\D/g, '');
  const hits = COUNTRIES.filter((c) => digits.startsWith(c.dial));
  if (!hits.length) return null;
  const best = Math.max(...hits.map((c) => c.dial.length));
  const top = hits.filter((c) => c.dial.length === best);
  return top.find((c) => PREFERRED.includes(c.iso)) || top[0];
};
const countryLine = (num, cls = '') => {
  const c = countryFromNumber(num);
  return c ? `<div class="call-country${cls}">${flag(c)}<span>${esc(c.name)}</span></div>` : '';
};
const flag = (c) => `<img class="flag" src="https://flagcdn.com/w40/${c.iso.toLowerCase()}.png" alt="${c.iso}" width="20" height="15" loading="lazy" />`;
const SPEED_DIAL = [
  { name: "Robert Chen",     number: "+1 (555) 234-5678", company: "Acme Corp",       tier: "VIP Gold",       status: "available", email: "robert.chen@acme.example", queue: "Sales", campaign: "Product Demo", dnis: "Main Line" },
  { name: "Elena Rostova",   number: "+1 (555) 876-5432", company: "Global Tech",     tier: "Platinum",       status: "available", email: "elena.rostova@globaltech.example", queue: "Sales", campaign: "Renewals", dnis: "Main Line" },
  { name: "Marcus Vance",    number: "+1 (555) 432-1098", company: "Vance Logistics", tier: "Standard",       status: "offline", email: "marcus.vance@vance.example", queue: "Support", campaign: "Logistics Onboarding", dnis: "Support Line" },
  { name: "Aria Montgomery", number: "+1 (555) 321-9876", company: "Apex Holdings",   tier: "VIP Enterprise", status: "available", email: "aria.montgomery@apex.example", queue: "Sales", campaign: "Enterprise Upsell", dnis: "Main Line" }
];
// status: one of STATUS_META's keys — presence for the Contacts nav page (contactsPageView()); also usable
// anywhere else in the app that wants a directory member's live status.
const DIRECTORY = [
  { name: "Samarth More", role: "Manager", ext: "3222", dept: "Support", status: "available" },
  { name: "Neel Sahani",  role: "Manager", ext: "2643", dept: "Sales", status: "queue" },
  { name: "Ashraf Dalai", role: "Sub-admin", ext: "3390", dept: "Support", status: "break" },
  { name: "Vivek Gupta",  role: "Manager", ext: "4251", dept: "Support", status: "busy" },
  { name: "Rahul Chaudhari", role: "Supervisor", ext: "5178", dept: "Sales", status: "offline" },
  { name: "Priya Singh",  role: "Supervisor", ext: "3187", dept: "Support", status: "available" },
  { name: "Ajay Jain",    role: "Agent", ext: "6045", dept: "Billing", status: "busy" }
];
// Presence categories for the Contacts nav page (contactsPageView()) — color + label in one place so the legend,
// the filter dropdown and each contact row can never fall out of sync.
const STATUS_META = {
  available: { label: 'Available', color: '#16a34a' },
  queue: { label: 'On Queue', color: '#0891b2' },
  break: { label: 'On Break', color: '#d97706' },
  busy: { label: 'Busy / In Meeting', color: '#dc2626' },
  offline: { label: 'Offline', color: '#94a3b8' }
};
const MAX_LEGS = 5;
// Add Call sources: recent numbers come from call history (one row per number); contacts are directory + saved contacts
const recentNumbers = () => {
  const seen = new Set();
  return historyData().filter((h) => !seen.has(h.number) && seen.add(h.number))
    .map((h) => ({ name: h.name, number: h.number, when: `${h.date ? h.date.slice(0, 6) : ''}${h.date && /^\d/.test(h.time) ? ' ' : ''}${!h.date || /^\d/.test(h.time) ? h.time : ''}`.trim() }));
};
const addContacts = () => {
  const seen = new Set();
  return [...DIRECTORY.map((d) => ({ name: d.name, number: d.ext, status: d.status, info: { name: d.name, number: d.ext, company: d.role, sentiment: 'Neutral' } })),
    ...SPEED_DIAL.map((c) => ({ name: c.name, number: c.number, status: c.status }))].filter((c) => !seen.has(c.number) && seen.add(c.number));
};
const callLegNumbers = () => new Set([S.activeContact && S.activeContact.number, ...S.conf.map((p) => p.number),
  ...S.heldCalls.flatMap((c) => [c.contact.number, ...(c.participants || []).map((p) => p.number)])]);
/* Call Park: codes, demo agent profile (RBAC) and simulated colleagues */
const PARK_CODES = ['*71', '*72', '*73', '*74', '*75', '*76', '*77', '*78', '*79'];
const PARK_TTL = 180; // seconds a call stays parked before it times out
// Full agent roster for the navbar Active Agent switcher AND the Call Park "Assign to" dropdown (one shared list,
// not two) — status is 'online' / 'busy' / 'offline'. PARK_AGENT (the signed-in identity used throughout
// RBAC/attribution — vmVisible, ParkService, call logging, the header) is a `let` bound to one of these records
// and reassigned by switchActiveAgent() on A.agentSwitchPick, so every PARK_AGENT.xxx read elsewhere just works
// against whichever agent is "active" without a second parallel state system.
const AGENTS = [
  { id: 'rahul-c', name: 'Rahul Chaurasiya', ext: '3222', role: 'agent', status: 'online', departments: ['Sales', 'Support'] },
  { id: 'rohit', name: 'Rohit Sharma', ext: '3218', role: 'agent', status: 'online', departments: ['Sales', 'Support'] },
  { id: 'priya', name: 'Priya Nair', ext: '3214', role: 'supervisor', status: 'online', departments: ['Sales', 'Support', 'Billing'] },
  { id: 'amit', name: 'Amit Verma', ext: '3221', role: 'agent', status: 'busy', departments: ['Support'] },
  { id: 'sarah', name: 'Sarah Wilson', ext: '3230', role: 'manager', status: 'offline', departments: ['Sales', 'Support', 'Billing'] },
  { id: 'kenji', name: 'Kenji Tanaka', ext: '3242', role: 'agent', status: 'online', departments: ['Billing', 'Support'] }
];
let PARK_AGENT = AGENTS[0];
const roleLabel = (r) => r.charAt(0).toUpperCase() + r.slice(1);
const PARK_SIM = [
  { name: 'John Smith',   number: '+91 98765 43210', by: 'Vivek Gupta',     department: 'Sales' },
  { name: 'Sarah Wilson', number: '+91 99887 77665', by: 'Rahul Chaudhari', department: 'Support' },
  { name: 'Amit Kumar',   number: '+1 415 289 7742', by: 'Ashraf Dalai',    department: 'Billing' },
  { name: 'Sneha Patil',  number: '+1 213 458 9871', by: 'Priya Singh',     department: 'Sales' }
];
const PARK_UNAVAILABLE = ['*77'];
const isParkRetrievalCode = (s) => /^\*\d{2,3}$/.test(String(s).trim());
const pastel = (name) => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return `background:hsl(${h} 75% 90%);color:hsl(${h} 45% 25%)`; };
// Directory = DIRECTORY (extensions) followed by SPEED_DIAL / saved contacts; this order is the result order
const dirEntries = () => [
  ...DIRECTORY.map((d) => ({ name: d.name, role: d.role, number: d.ext, ext: d.ext })),
  ...SPEED_DIAL.map((c) => ({ name: c.name, role: c.company, number: c.number, contact: c }))
];
// Returns ALL matches (null when the input is empty or a star code such as *71); callers slice for the compact preview.
// Names match case-insensitively by substring, every word of the query must match ("vivek g"). Numbers and extensions match on digits only,
// so "+91 98765", "9876543210" and "919876543210" are treated alike.
const dirSearch = (q) => {
  q = q.trim().toLowerCase();
  if (!q || /^[*#]/.test(q)) return null;
  const numeric = !/[a-z]/.test(q), d = q.replace(/\D/g, '');
  if (numeric && !d) return null;
  const words = q.split(/\s+/);
  // Match relevance (UI-only, 0-99): exact > prefix > word start > substring. It ranks matches for this query; it is not a customer or agent score.
  const scored = dirEntries().map((e) => {
    if (!numeric) {
      const n = e.name.toLowerCase();
      if (!(n.includes(q) || words.every((w) => n.includes(w)))) return null;
      const ws = n.split(/\s+/), score = n === q ? 99 : n.startsWith(q) ? 95 : ws.some((w) => w.startsWith(q)) ? 90 : words.every((w) => ws.some((x) => x.startsWith(w))) ? 86 : n.includes(q) ? 78 : 70;
      return { ...e, score };
    }
    const ed = e.number.replace(/\D/g, '');
    if (!(ed.includes(d) || (ed.length >= 10 && d.length >= 10 && (d.endsWith(ed.slice(-10)) || ed.endsWith(d.slice(-10)))))) return null;
    return { ...e, score: ed === d ? 99 : ed.endsWith(d) ? 92 : ed.startsWith(d) ? 88 : 76 };
  }).filter(Boolean);
  return scored.map((e, i) => [e, i]).sort((a, b) => b[0].score - a[0].score || a[1] - b[1]).map((x) => x[0]);
};
const DIR_PREVIEW = 3;
const WAVE_BARS = [[.4,.0],[.7,.15],[1,.3],[.7,.45],[.5,.6],[1,.05],[.7,.2],[.4,.35],[.7,.5],[1,.65],[.7,.1],[.5,.25],[1,.4],[.7,.55],[.4,.7]];
const COPILOT_ACTIONS = [
  { key: "summary", icon: "tasks",    title: "Summarize call",    sub: "Get key points instantly", prompt: "Summarize this call", tint: "purple" },
  { key: "actions", icon: "checkCircle", title: "Action items",   sub: "Find and list tasks",      prompt: "List the action items from this call", tint: "blue" },
  { key: "suggest", icon: "sparkles", title: "Smart suggestions", sub: "Get real-time guidance",   prompt: "What should I do next on this call?", tint: "amber" }
];
const CALL_HISTORY_DATA = [
  // Rohit Sharma is SC_PEOPLE[0], the default active-call contact for most demo scenarios (single, multi2-5, incoming,
  // conference3/5) — give it real history too, so opening the app's most common state doesn't land on an empty list.
  { id: "h0a", name: "Rohit Sharma", number: "+91 98765 43210", type: "outbound", time: "4:35 PM", date: "29 Sep 2026", duration: "01:12", rec: "rc9", status: "Completed", sentiment: "Positive", account: "ACC-71001", count: 3 },
  { id: "h0b", name: "Rohit Sharma", number: "+91 98765 43210", type: "outbound", time: "2:20 PM", date: "28 Sep 2026", duration: "00:00", status: "Cancelled", sentiment: "Neutral", account: "ACC-71001", count: 3 },
  { id: "h1", name: "Robert Chen",     number: "+1 (555) 234-5678", type: "inbound",  time: "10:14 AM",  date: "26 Sep 2026", duration: "01:02", rec: "rc2", status: "Completed",   sentiment: "Positive",      account: "ACC-90421", count: 12, transcript: true },
  { id: "h2", name: "Samantha Wright", number: "+1 (555) 998-1122", type: "missed",   time: "09:48 AM",  date: "26 Sep 2026", duration: "00:18", rec: "rc4", status: "Abandoned",   sentiment: "Neutral",       account: "ACC-11204", count: 3, voicemail: true },
  { id: "h3", name: "Elena Rostova",   number: "+1 (555) 876-5432", type: "outbound", time: "09:15 AM",  date: "26 Sep 2026", duration: "00:48", rec: "rc3", status: "Completed",   sentiment: "Very Positive", account: "ACC-78331", count: 7, transcript: true },
  { id: "h4", name: "David Kim",       number: "+1 (555) 334-9988", type: "inbound",  time: "Yesterday", date: "25 Sep 2026", duration: "00:35", rec: "rc5", status: "Transferred", sentiment: "Negative",      account: "ACC-55102", count: 2 },
  { id: "h5", name: "Aria Montgomery", number: "+1 (555) 321-9876", type: "outbound", time: "Yesterday", date: "25 Sep 2026", duration: "01:11", rec: "rc6", status: "Completed",   sentiment: "Positive",      account: "ACC-33901", count: 5 },
  // The remaining SC_PEOPLE (conference/multi-call demo contacts), SPEED_DIAL contact without a record yet (Marcus
  // Vance), every DIRECTORY extension, and the scripted incoming caller (SC_INBOUND) — so History is never empty
  // for any contact the demo scenarios can put you on a call with, not just Rohit Sharma.
  { id: "h6",  name: "Priya Nair",       number: "+91 99887 77665",   type: "outbound", time: "11:02 AM", date: "27 Sep 2026", duration: "02:04", status: "Completed",  sentiment: "Neutral",  account: "ACC-71002", count: 2 },
  { id: "h7",  name: "Amit Verma",       number: "+91 91234 56780",   type: "outbound", time: "3:47 PM",  date: "27 Sep 2026", duration: "00:56", status: "Completed",  sentiment: "Positive", account: "ACC-71003", count: 2 },
  { id: "h8",  name: "Sarah Wilson",     number: "+1 (415) 555-0132", type: "inbound",  time: "Yesterday", date: "25 Sep 2026", duration: "01:34", status: "Completed", sentiment: "Needs Support", account: "ACC-71004", count: 4 },
  { id: "h9",  name: "Kenji Tanaka",     number: "+81 90 1234 5678",  type: "outbound", time: "09:10 AM", date: "24 Sep 2026", duration: "00:41", status: "Completed",  sentiment: "Neutral",  account: "ACC-71005", count: 1 },
  { id: "h10", name: "Elena Rossi",      number: "+39 333 123 4567",  type: "missed",   time: "08:55 AM", date: "24 Sep 2026", duration: "00:00", status: "Abandoned",  sentiment: "Neutral",  account: "ACC-71006", count: 1 },
  { id: "h11", name: "Marcus Vance",     number: "+1 (555) 432-1098", type: "outbound", time: "1:15 PM",  date: "23 Sep 2026", duration: "02:28", status: "Completed",  sentiment: "Neutral",  account: "ACC-40118", count: 3 },
  { id: "h12", name: "Vikram Singh",     number: "+91 98111 22334",   type: "inbound",  time: "4:02 PM",  date: "27 Sep 2026", duration: "01:19", status: "Completed",  sentiment: "Needs Support", account: "ACC-88192", count: 2 },
  { id: "h13", name: "Samarth More",     number: "3222", type: "outbound", time: "10:30 AM", date: "26 Sep 2026", duration: "03:12", status: "Completed",  sentiment: "Neutral", account: "EXT-3222", count: 5 },
  { id: "h14", name: "Neel Sahani",      number: "2643", type: "inbound",  time: "2:47 PM",  date: "26 Sep 2026", duration: "01:05", status: "Completed",  sentiment: "Positive", account: "EXT-2643", count: 3 },
  { id: "h15", name: "Ashraf Dalai",     number: "3390", type: "outbound", time: "11:58 AM", date: "25 Sep 2026", duration: "00:00", status: "Cancelled",  sentiment: "Neutral", account: "EXT-3390", count: 2 },
  { id: "h16", name: "Vivek Gupta",      number: "4251", type: "outbound", time: "3:41 PM",  date: "24 Sep 2026", duration: "00:27", rec: "rc7", status: "Completed",  sentiment: "Positive", account: "EXT-4251", count: 6 },
  { id: "h17", name: "Rahul Chaudhari",  number: "5178", type: "outbound", time: "5:03 PM",  date: "24 Sep 2026", duration: "00:38", status: "Completed",  sentiment: "Neutral", account: "EXT-5178", count: 1 },
  { id: "h18", name: "Priya Singh",      number: "3187", type: "missed",   time: "8:14 AM",  date: "24 Sep 2026", duration: "00:00", status: "Abandoned",  sentiment: "Neutral", account: "EXT-3187", count: 1 },
  { id: "h19", name: "Ajay Jain",        number: "6045", type: "outbound", time: "12:41 PM", date: "23 Sep 2026", duration: "01:47", status: "Completed",  sentiment: "Positive", account: "EXT-6045", count: 2 }
];
const DISPOSITION_CODES = [
  "Resolved - Standard Inquiry", "Resolved - Technical Fix Applied", "Escalated - Level 2 Queue",
  "Escalated - Supervisor Assistance", "Follow-up Required - Callback Scheduled",
  "Sales Opportunity - Warm Transfer", "Invalid Contact / Spam"
];
const KEYPAD_BUTTONS = [
  { num: "1", sub: "" }, { num: "2", sub: "ABC" }, { num: "3", sub: "DEF" },
  { num: "4", sub: "GHI" }, { num: "5", sub: "JKL" }, { num: "6", sub: "MNO" },
  { num: "7", sub: "PQRS" }, { num: "8", sub: "TUV" }, { num: "9", sub: "WXYZ" },
  { num: "*", sub: "" }, { num: "0", sub: "+" }, { num: "#", sub: "" }
];
const TRANSFER_TARGETS = ['Level 2 Technical Support', 'Supervisor Escalations', 'Billing & Payments'];
const PANELS = ['Copilot', 'Summary', 'Transcript', 'Notes', 'History', 'Contact'];
const TAB_EMPTY_STATES = {
  Copilot: { heading: 'Live transcript appears during a call.', detail: 'When transcription is on for your account, the transcript shows here once the call connects. Proactive suggestions are not switched on yet. You can still ask Copilot about the call below.' },
  Summary: { heading: 'Your call summary will appear here.', detail: 'Finish a call to review its summary and key outcomes.' },
  Transcript: { heading: 'Live transcript appears during a call.', detail: 'Connect a call to see the conversation transcript here.' },
  Notes: { heading: 'No notes yet.', detail: 'Notes for this call will appear here.' },
  History: { heading: 'Call history will appear here.', detail: 'Select a call to review its details.' },
  Contact: { heading: 'Contact details will appear here.', detail: 'Contact information will appear when a call is selected.' }
};

/* ============================== Icons (inline SVG) ============================== */
const PHONE = '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>';
const ICONS = {
  phone: PHONE,
  phoneOff: '<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/>',
  phoneCall: PHONE + '<path d="M14.05 2a9 9 0 0 1 8 7.94"/><path d="M14.05 6A5 5 0 0 1 18 10"/>',
  phoneIncoming: PHONE + '<polyline points="16 2 16 8 22 8"/><line x1="22" x2="16" y1="2" y2="8"/>',
  phoneOutgoing: PHONE + '<polyline points="22 8 22 2 16 2"/><line x1="16" x2="22" y1="8" y2="2"/>',
  phoneForwarded: PHONE + '<polyline points="18 2 22 6 18 10"/><line x1="14" x2="22" y1="6" y2="6"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  micOff: '<line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" x2="12" y1="19" y2="22"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  grid: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
  disc: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  mic2: '<path d="m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12"/><path d="M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5"/><circle cx="16" cy="7" r="5"/>',
  voicemail: '<circle cx="6" cy="12" r="4"/><circle cx="18" cy="12" r="4"/><line x1="6" x2="18" y1="16" y2="16"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  chevDown: '<path d="m6 9 6 6 6-6"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>',
  shrink: '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>',
  winMin: '<path d="M5 12h14"/>',
  winRestore: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h9A1.5 1.5 0 0 1 21 4.5v9a1.5 1.5 0 0 1-1.5 1.5H18"/>',
  chevUp: '<path d="m18 15-6-6-6 6"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  maximize: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
  minimize: '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/>',
  barChart: '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  dots: '<circle cx="5" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/>',
  tasks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  headset: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  filter: '<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h5"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  backspace: '<path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><line x1="18" x2="12" y1="9" y2="15"/><line x1="12" x2="18" y1="9" y2="15"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  chevRight: '<path d="m9 18 6-6-6-6"/>',
  chevLeft: '<path d="m15 18-6-6 6-6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/>',
  extLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  rew10: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  fwd10: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
  volumeX: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  moreV: '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.41l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  phonePlus: PHONE + '<line x1="19" x2="19" y1="2" y2="8"/><line x1="16" x2="22" y1="5" y2="5"/>',
  parking: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  mapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  list: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  arrowUpRight: '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
  arrowDownLeft: '<line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/>'
};
const ic = (name, size = 16, cls = '') =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/* ============================== Helpers ============================== */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rid = () => Math.random().toString(36).slice(2, 7);
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600), mins = Math.floor((seconds % 3600) / 60), secs = seconds % 60;
  const p = (n) => n.toString().padStart(2, '0');
  return hrs > 0 ? `${p(hrs)}:${p(mins)}:${p(secs)}` : `${p(mins)}:${p(secs)}`;
};
const mergeUniquePeople = (people) => {
  const seen = new Set();
  return people.filter((person, index) => {
    if (!person) return false;
    const n = String(person.number || '').replace(/\D/g, '');
    const nm = String(person.name || '').trim().toLowerCase();
    const key = person.id ? `id:${person.id}` : n ? `number:${n}` : nm ? `name:${nm}` : `unknown:${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const personName = (p) => p.name || p.number || 'Unknown caller';
const initials = (p) => personName(p).split(/\s+/).map((x) => x[0] || '').join('').slice(0, 2).toUpperCase();

/* ============================== Recordings ============================== */
// Demo dataset. `tr` rows are [start s, end s, 'a' agent | 'c' caller, text]. No audio files exist, so audio is synthesised
// in the browser (see synthRecording) and is a real WAV Blob that HTML5 Audio plays, seeks and downloads.
const RECORDINGS = [
  { id: 'rc1', callId: 'CALL-20260918-0142', name: 'Manish Verma', number: '+91 85914 16020', account: 'ACC-61207', agent: 'Spidey Parker', department: 'Support', direction: 'outbound', status: 'Completed', start: '2026-09-18T12:39:32', duration: 44, hasRecording: true,
    tr: [[0, 8, 'a', 'Hello, this is Spidey from Support. Am I speaking with Manish?'], [9, 17, 'c', 'Yes, this is Manish. I had a question about my invoice.'], [18, 28, 'a', 'Sure. I can see last week\'s invoice. The amount was charged twice.'], [29, 36, 'c', 'Right, can you refund the extra charge?'], [37, 44, 'a', 'Absolutely. I will raise the refund now and send you a confirmation.']] },
  { id: 'rc2', callId: 'CALL-20260926-0311', name: 'Robert Chen', number: '+1 (555) 234-5678', account: 'ACC-90421', agent: 'Spidey Parker', department: 'Sales', direction: 'inbound', status: 'Completed', start: '2026-09-26T10:14:05', duration: 62, hasRecording: true,
    tr: [[0, 9, 'c', 'Hi, I am looking to upgrade our plan to the enterprise tier.'], [10, 20, 'a', 'Great choice. How many seats do you need, and do you want the dialer add-on?'], [21, 32, 'c', 'About forty seats, and yes, the dialer. What would the pricing look like?'], [33, 47, 'a', 'For forty seats with the dialer it comes to a monthly rate I can send you in writing today.'], [48, 62, 'c', 'Perfect, please send it over and we will decide by Friday.']] },
  { id: 'rc3', callId: 'CALL-20260926-0298', name: 'Elena Rostova', number: '+1 (555) 876-5432', account: 'ACC-78331', agent: 'Spidey Parker', department: 'Sales', direction: 'outbound', status: 'Completed', start: '2026-09-26T09:15:40', duration: 48, hasRecording: true,
    tr: [[0, 10, 'a', 'Good morning Elena, I am following up on the demo we booked for this week.'], [11, 22, 'c', 'Hi, yes. Thursday afternoon works best for our team.'], [23, 35, 'a', 'Thursday at three it is. I will send the calendar invite right after this call.'], [36, 48, 'c', 'Thank you. Please include the security overview document as well.']] },
  { id: 'rc4', callId: 'CALL-20260926-0305', name: 'Samantha Wright', number: '+1 (555) 998-1122', account: 'ACC-11204', agent: 'Spidey Parker', department: 'Support', direction: 'missed', status: 'Abandoned', start: '2026-09-26T09:48:11', duration: 18, hasRecording: true, tr: null },
  { id: 'rc5', callId: 'CALL-20260925-0410', name: 'David Kim', number: '+1 (555) 334-9988', account: 'ACC-55102', agent: 'Spidey Parker', department: 'Support', direction: 'inbound', status: 'Transferred', start: '2026-09-25T16:02:50', duration: 35, hasRecording: true, tr: null },
  { id: 'rc6', callId: 'CALL-20260925-0377', name: 'Aria Montgomery', number: '+1 (555) 321-9876', account: 'ACC-33901', agent: 'Spidey Parker', department: 'Sales', direction: 'outbound', status: 'Completed', start: '2026-09-25T11:20:18', duration: 71, hasRecording: true,
    tr: [[0, 11, 'a', 'Hi Aria, calling to confirm the renewal terms we discussed last month.'], [12, 24, 'c', 'Yes, we would like to renew for another twelve months at the same rate.'], [25, 40, 'a', 'I can do that. I will also add two extra seats at no cost as a loyalty benefit.'], [41, 55, 'c', 'That is very kind. Can you also update the billing contact on the account?'], [56, 71, 'a', 'Of course. Send me the new billing email and I will update it today.']] },
  { id: 'rc7', callId: 'CALL-20260924-0120', name: 'Vivek Gupta', number: '4251', ext: '4251', account: 'ACC-80842', agent: 'Spidey Parker', department: 'Support', direction: 'outbound', status: 'Completed', start: '2026-09-24T15:41:09', duration: 27, hasRecording: true,
    tr: [[0, 9, 'a', 'Vivek, can you take a look at the escalated ticket from this morning?'], [10, 19, 'c', 'Yes, I already saw it. I will call the customer back within the hour.'], [20, 27, 'a', 'Thanks. Please add your notes to the ticket when you are done.']] },
  { id: 'rc8', callId: 'CALL-20260924-0098', name: 'Sneha Patil', number: '+1 213 458 9871', account: 'ACC-41877', agent: 'Spidey Parker', department: 'Billing', direction: 'inbound', status: 'Completed', start: '2026-09-24T10:05:33', duration: 40, hasRecording: false, tr: null },
  { id: 'rc9', callId: 'CALL-20260929-0163', name: 'Rohit Sharma', number: '+91 98765 43210', account: 'ACC-71001', agent: 'Spidey Parker', department: 'Sales', direction: 'outbound', status: 'Completed', start: '2026-09-29T16:35:00', duration: 72, hasRecording: true,
    tr: [[0, 10, 'a', 'Hi Rohit, calling to check in after your last onboarding session.'], [11, 24, 'c', 'Thanks for calling. Things are going well, though I had a question about the export feature.'], [25, 42, 'a', 'Sure, I can walk you through that. You will find it under Reports, then Export All.'], [43, 58, 'c', 'Got it, I see it now. That solves my issue for today.'], [59, 72, 'a', 'Glad to hear it. Let me know if anything else comes up.']] }
];
// Voicemails: same shape as recordings (+ assignment / read / resolved / notes). `agent` is the greeting that plays before the caller.
const VOICEMAILS = [
  { id: 'vm1', kind: 'vm', callId: 'VM-20260923-0071', name: 'Ashraf Dalai', number: '+91 99873 12801', ext: '3390', account: 'ACC-52310', agent: 'Voicemail greeting', department: 'Support', direction: 'inbound', status: 'Completed', start: '2026-09-23T14:16:28', duration: 18, hasRecording: true, read: false, resolved: false, assignedTo: null, notes: '', followNote: '',
    tr: [[0, 4, 'a', 'Please leave a message after the tone.'], [5, 12, 'c', 'Hi, this is Ashraf. I wanted to confirm my recent bill.'], [13, 18, 'c', 'Please give me a call back when you can.']] },
  { id: 'vm2', kind: 'vm', callId: 'VM-20260923-0069', name: 'Vivek Gupta', number: '+91 99873 12802', ext: '4251', account: 'ACC-80842', agent: 'Voicemail greeting', department: 'Support', direction: 'inbound', status: 'Completed', start: '2026-09-23T11:02:40', duration: 31, hasRecording: true, read: false, resolved: false, assignedTo: 'Spidey Parker', notes: '', followNote: '',
    tr: [[0, 4, 'a', 'Please leave a message after the tone.'], [5, 16, 'c', 'Hello, Vivek here. The escalated ticket from this morning needs your approval.'], [17, 31, 'c', 'It is blocking the customer, so please review it before end of day and call me.']] },
  { id: 'vm3', kind: 'vm', callId: 'VM-20260922-0064', name: 'Rahul Chaudhari', number: '+91 99873 12803', ext: '5178', account: 'ACC-33210', agent: 'Voicemail greeting', department: 'Sales', direction: 'inbound', status: 'Completed', start: '2026-09-22T17:45:10', duration: 25, hasRecording: true, read: true, resolved: false, assignedTo: null, notes: '', followNote: '', tr: null },
  { id: 'vm4', kind: 'vm', callId: 'VM-20260922-0060', name: 'Priya Singh', number: '+91 99873 12804', ext: '3187', account: 'ACC-70418', agent: 'Voicemail greeting', department: 'Support', direction: 'inbound', status: 'Completed', start: '2026-09-22T10:20:05', duration: 42, hasRecording: true, read: false, resolved: false, assignedTo: 'Samarth More', notes: '', followNote: '',
    tr: [[0, 4, 'a', 'Please leave a message after the tone.'], [5, 20, 'c', 'Hi, Priya from the support desk. A customer asked for a refund status update.'], [21, 34, 'c', 'I told them we would confirm today, so I need the refund reference number.'], [35, 42, 'c', 'Thanks, please call me back.']] },
  { id: 'vm5', kind: 'vm', callId: 'VM-20260921-0052', name: 'Robert Chen', number: '+1 (555) 234-5678', account: 'ACC-90421', agent: 'Voicemail greeting', department: 'Sales', direction: 'inbound', status: 'Completed', start: '2026-09-21T15:31:52', duration: 36, hasRecording: true, read: true, resolved: true, assignedTo: 'Spidey Parker', notes: 'Sent the pricing sheet.', followNote: 'Called back, confirmed the quote.',
    tr: [[0, 4, 'a', 'Please leave a message after the tone.'], [5, 22, 'c', 'Hi, it is Robert Chen. I reviewed the enterprise proposal and have two questions about seats.'], [23, 36, 'c', 'Could you call me tomorrow morning? Thank you.']] },
  { id: 'vm6', kind: 'vm', callId: 'VM-20260921-0049', name: 'Manish Verma', number: '+91 85914 16020', account: 'ACC-61207', agent: 'Voicemail greeting', department: 'Support', direction: 'inbound', status: 'Completed', start: '2026-09-21T09:12:33', duration: 22, hasRecording: true, read: false, resolved: false, assignedTo: null, notes: '', followNote: '',
    tr: [[0, 4, 'a', 'Please leave a message after the tone.'], [5, 22, 'c', 'This is Manish. I still have not received the refund for the duplicate charge. Please call me.']] },
  { id: 'vm7', kind: 'vm', callId: 'VM-20260920-0041', name: 'Ajay Jain', number: '+91 99873 12807', ext: '6045', account: 'ACC-44120', agent: 'Voicemail greeting', department: 'Billing', direction: 'inbound', status: 'Completed', start: '2026-09-20T13:05:19', duration: 19, hasRecording: true, read: false, resolved: false, assignedTo: null, notes: '', followNote: '', tr: null },
  { id: 'vm8', kind: 'vm', callId: 'VM-20260920-0038', name: 'Sneha Patil', number: '+1 213 458 9871', account: 'ACC-41877', agent: 'Voicemail greeting', department: 'Sales', direction: 'inbound', status: 'Completed', start: '2026-09-20T08:40:02', duration: 28, hasRecording: false, read: true, resolved: false, assignedTo: null, notes: '', followNote: '', tr: null }
];
const recSegs = (r) => r.tr ? r.tr.map(([t0, t1, w, text]) => ({ t0, t1, role: w, who: w === 'a' ? r.agent : r.name, text })) : null;
// recordings and voicemails share one audio player (one AUDIO element), so lookups by id cover both lists
const recById = (id) => S.recordings.find((r) => r.id === id) || S.voicemails.find((v) => v.id === id);
const curItem = () => (S.activeTab === 'voicemails' ? S.voicemails.find((v) => v.id === S.vmSel) : S.activeTab === 'recordings' ? S.recordings.find((r) => r.id === S.recSel) : wsRecording(wsCall()));
// Single switch for all the app's built-in demo content (there's no backend, so this IS the only data source).
// OFF hides the seeded CALL_HISTORY_DATA / RECORDINGS / VOICEMAILS rows (both the hand-curated "base" set and the
// freshly-generated "random" extras below) everywhere they're listed, without touching anything created live this
// session (S.callLog, recordings from logEndedCall, notes, etc.).
/* Whose is it? Every demo row belongs to one user of the hierarchy (a fixed, repeatable split), and a user sees their own rows and those of the roles below them:
   Admin everything, Location Admin the manager's and agent's, Manager own and the agent's, Agent only own. Calls made in the app carry the signed-in user. */
const OWNER_ROLES = ['agent', 'agent', 'manager', 'location_admin', 'admin', 'agent', 'manager'];
const seedOwner = (id) => { let n = 0; for (const ch of String(id)) n = (n * 31 + ch.charCodeAt(0)) >>> 0; return OWNER_ROLES[n % OWNER_ROLES.length]; };
const canSeeOwner = (owner) => (window.UCAAS_canSee ? window.UCAAS_canSee(owner) : true);
const rowVisible = (row) => canSeeOwner(row.owner || seedOwner(row.id));
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// calls made and received in the app (S.callLog), shaped like history rows: this is what a user's History is made of when the demo rows are off
const liveHistory = () => S.callLog.filter(rowVisible).map((c) => {
  const d = new Date(c.at || Date.now()), h = d.getHours() % 12 || 12, secs = c.duration || 0;
  return { id: c.id, owner: c.owner, name: c.name, number: c.number, type: /in/i.test(c.direction || '') ? 'inbound' : 'outbound', time: `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`,
    date: `${d.getDate()} ${MON3[d.getMonth()]} ${d.getFullYear()}`, duration: `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, rec: c.recId || undefined,
    status: c.status || 'Completed', sentiment: c.sentiment || 'Neutral', account: (c.contact && c.contact.account) || '-', count: 1 };
});
const seedHistory = () => (S.dummyData ? [...CALL_HISTORY_DATA, ...S.dummyExtraHistory] : []).filter(rowVisible);
const historyData = () => [...liveHistory(), ...seedHistory()];
const retained = (row, kind) => (typeof linkRetained === 'function' ? linkRetained(row, kind) : true);   // Company Rules > Policies > retention
const visRecordings = () => S.recordings.filter((r) => (S.dummyData || !r.seed) && rowVisible(r) && retained(r, 'recordings'));
const visVoicemails = () => S.voicemails.filter((v) => (S.dummyData || !v.seed) && rowVisible(v) && retained(v, 'voicemail'));

/* ---- Linked demo history (replaces the old random ~50-rows-per-contact "dummy universe"): nothing is
   mass-generated. A contact's call list is exactly (1) their hand-curated CALL_HISTORY_DATA rows, plus (2) one
   call row for every curated RECORDINGS/VOICEMAILS item no history row references yet — a recording or a
   voicemail is evidence of exactly one call, so it hangs off its own call record instead of floating free —
   plus (3) a deterministic top-up ONLY until the contact reaches their seed row's declared `count` (e.g.
   "Robert Chen: 12"), seeded per number so a refresh never changes it. Every count in the UI is derived from
   these rows (contactCallCount), so the History badge, Interaction History, Recordings and Voicemails can
   never disagree, for any contact present or future. */
const seedFromStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry32 = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function buildLinkedHistory() {
  // local digit-key (digitsOf/sameNumber are declared further down the file; same normalization: last 10 digits)
  const kOf = (n) => { const d = String(n || '').replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : d; };
  const groups = {};
  CALL_HISTORY_DATA.forEach((h) => {
    const k = kOf(h.number), g = groups[k] = groups[k] || { name: h.name, number: h.number, account: h.account, rows: 0, refs: new Set(), want: 0 };
    g.rows += 1;
    if (h.rec) g.refs.add(h.rec);
    if (h.vm) g.refs.add(h.vm);
    g.want = Math.max(g.want, h.count || 0);
  });
  const extra = [];
  const timeStr = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  // (2) every curated recording/voicemail that no history row references yet gets its own call row, in its
  // contact's group (matched by number or extension); media for a brand-new number creates that contact's group.
  [...RECORDINGS, ...VOICEMAILS].forEach((m) => {
    let g = groups[kOf(m.number)] || (m.ext ? groups[kOf(m.ext)] : null);
    if (!g) g = groups[kOf(m.number)] = { name: m.name, number: m.number, account: m.account, rows: 0, refs: new Set(), want: 0 };
    if (g.refs.has(m.id)) return;
    g.refs.add(m.id);
    const vm = m.kind === 'vm', when = new Date(m.start);
    g.rows += 1;
    extra.push({ id: `hx-${m.id}`, name: g.name, number: g.number, type: vm ? 'inbound' : m.direction === 'missed' ? 'missed' : m.direction,
      time: timeStr(when), date: dateStr(when), at: when.getTime(), duration: formatTime(m.duration), status: vm ? 'Completed' : m.status,
      voicemail: vm, transcript: !!m.tr, rec: vm ? null : m.id, vm: vm ? m.id : null, agent: vm ? null : m.agent, queue: m.department || null,
      sentiment: 'Neutral', account: m.account });
  });
  // (3) deterministic top-up to the declared count only (never beyond a handful, never random per render)
  Object.entries(groups).forEach(([k, g]) => {
    const rng = mulberry32(seedFromStr(k)), pick = (arr) => arr[Math.floor(rng() * arr.length)];
    for (let i = g.rows; i < g.want; i++) {
      const status = pick(['Completed', 'Completed', 'Completed', 'Missed', 'Cancelled']);
      const when = new Date(); when.setHours(0, 0, 0, 0);
      when.setDate(when.getDate() - (1 + Math.floor(rng() * 21)));
      when.setHours(9 + Math.floor(rng() * 9), Math.floor(rng() * 60), Math.floor(rng() * 60), 0);
      extra.push({ id: `hf-${k}-${i}`, name: g.name, number: g.number, type: status === 'Missed' ? 'missed' : rng() < 0.5 ? 'outbound' : 'inbound',
        time: timeStr(when), date: dateStr(when), at: when.getTime(), duration: status === 'Completed' ? formatTime(15 + Math.floor(rng() * 300)) : '00:00',
        status, sentiment: pick(['Positive', 'Neutral', 'Negative']), account: g.account });
    }
  });
  return extra;
}
const EXTRA_HISTORY = buildLinkedHistory();
const fileBase = (r) => (r.kind === 'vm' ? `${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${recBase(r).slice(-10)}` : recBase(r));
const fileStamp = (r) => (r.kind === 'vm' ? recStamp(r).replace(/-/g, '') : recStamp(r));
const p2 = (x) => String(x).padStart(2, '0');
const recBase = (r) => { const d = new Date(r.start); return `${r.name.replace(/[^\w]+/g, '_')}_${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const recStamp = (r) => { const d = new Date(r.start); return `${p2(d.getHours())}-${p2(d.getMinutes())}-${p2(d.getSeconds())}`; };
const recDay = (r) => new Date(r.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const recFull = (r) => `${new Date(r.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${new Date(r.start).toLocaleTimeString('en-GB')}`;
const statusCls = (s) => /complet/i.test(s) ? 'ok' : /fail|abandon|miss|reject/i.test(s) ? 'bad' : /cancel/i.test(s) ? 'muted' : 'info';
const hl = (t, q) => {
  if (!q) return esc(t);
  const lo = t.toLowerCase(); let out = '', i = 0, j;
  while ((j = lo.indexOf(q, i)) >= 0) { out += `${esc(t.slice(i, j))}<mark>${esc(t.slice(j, j + q.length))}</mark>`; i = j + q.length; }
  return out + esc(t.slice(i));
};

// Real audio: 8 kHz mono 16-bit WAV. Agent and caller segments use different pitches, so seeking from the transcript is audible.
const AUDIO = new Audio();
const recAudioCache = new Map();
// Stand-in test audio for the recording/voicemail player (there is no real audio in this demo). Each transcript segment
// plays a soft pentatonic arpeggio (bell/chime-like, gentle attack + natural decay) instead of a harsh synthetic buzz —
// agent in a lower octave, customer in a higher one — so it's pleasant to preview, not a claim of a real voice recording.
function synthRecording(rec) {
  const SR = 8000, n = rec.duration * SR, pcm = new Float32Array(n), TAU = 6.28318;
  const segs = recSegs(rec) || Array.from({ length: Math.ceil(rec.duration / 6) }, (_, i) => ({ t0: i * 6, t1: Math.min(rec.duration, i * 6 + 4.5), role: i % 2 ? 'c' : 'a' }));
  const PENT = [0, 2, 4, 7, 9]; // major pentatonic semitone offsets: always sounds consonant, never a "wrong" note
  segs.forEach((s, k) => {
    const baseMidi = s.role === 'a' ? 57 : 69, noteLen = 0.42;
    let idx = 0;
    for (let t0 = s.t0; t0 < s.t1; t0 += noteLen) {
      const t1 = Math.min(s.t1, t0 + noteLen), a = Math.floor(t0 * SR), b = Math.min(n, Math.floor(t1 * SR)), len = (b - a) / SR || 1;
      const semis = PENT[(k + idx) % PENT.length] + 12 * Math.floor(((k + idx) % (PENT.length * 2)) / PENT.length);
      const freq = 440 * Math.pow(2, (baseMidi + semis - 69) / 12);
      for (let i = a; i < b; i++) {
        const t = (i - a) / SR, env = Math.sin(Math.PI * Math.min(1, t / len)) * Math.exp(-2.2 * t), ph = TAU * freq * t;
        pcm[i] += env * 0.34 * (Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph));
      }
      idx++;
    }
  });
  let peak = 0.01; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(pcm[i]));
  const g = Math.min(1, 0.9 / peak), pcm16 = new Int16Array(n);
  for (let i = 0; i < n; i++) pcm16[i] = Math.max(-1, Math.min(1, pcm[i] * g)) * 32767;
  const B = 64, peaks = [], per = Math.ceil(n / B);
  for (let b = 0; b < B; b++) { let m = 0; for (let i = b * per; i < Math.min(n, (b + 1) * per); i++) m = Math.max(m, Math.abs(pcm16[i])); peaks.push(m / 32767); }
  const top = Math.max(...peaks, 0.01);
  const norm = peaks.map((p) => Math.max(0.08, p / top));
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, pcm16[i], true);
  const blob = new Blob([buf], { type: 'audio/wav' });
  return { blob, url: URL.createObjectURL(blob), peaks: norm };
}
const recAudio = (rec) => { if (!recAudioCache.has(rec.id)) recAudioCache.set(rec.id, synthRecording(rec)); return recAudioCache.get(rec.id); };
function downloadBlob(name, blob) {
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); return true; } catch (e) { return false; }
}

/* ============================== State ============================== */
const S = {
  nav: 'phone', activeTab: 'keypad', compactMode: false, agentStatus: 'available', statusOpen: false,
  // Call workspace (Copilot/Summary/Transcript/Notes/History/Contact) fullscreen toggle — hides the left Phone
  // column so .ws fills the row; a plain CSS layout change, not a transform/zoom hack, so nothing it renders resets.
  wsFullscreen: false,
  dirSel: '', wsAiView: null, wsChat: {}, wsTrsDismissed: {}, partSel: null, partMuted: {}, partHold: {}, partJoin: {}, partSeen: {}, floatMin: false, floatPanel: 'Call', floatMore: false, floatBig: false, incomingChoice: false, acceptMode: 'hold', incomingMin: false, wsSel: null, wsAnchor: null, callLog: [], callNotes: {}, callSummary: {}, endedFrom: '', wsNoteDraft: '', wsNoteEdit: null, wsActDraft: '', wsAdd: false, wsNewName: '', wsLast: '', wsEmail: '', wsCompany: '', wsTier: 'Standard', wsQueue: '', wsCampaign: '', wsMoreDetails: false, wsHistOpen: {}, parkDialog: null, contactsAdded: {}, contactsSearch: '', contactsFilter: 'all', contactsFilterOpen: false,
  wrapCallbackOpen: false, wrapCallbackAt: '', wrapCallbackOwner: 'me', wrapCallbackError: '', wrapCallbackSaving: false, wrapCallbackFail: false,
  wrapNotesOpen: false, wrapNoteDraft: '', wrapClearConfirm: false, wrapUnsaved: null, callbacks: {}, wrapSubmitting: false,
  dirAllQ: '', scenOpen: false, scenName: 'multi5', scenFocus: false, scenRefocus: false,
  // "Park Call Assigned to Me" popover — two separate open-flags since it can be launched from either the
  // scenario-picker dropdown (.scen, parkAssignedOpen) or the navbar Agent Switcher (.as-wrap, asParkAssignedOpen),
  // which can in principle both be open at once. Same parkAssignedPanel() view either way. Personal to whichever
  // agent is active; never touched by switchActiveAgent().
  parkAssignedOpen: false, asParkAssignedOpen: false,
  dialNumber: '',
  focusQ: false, webrtc: navigator.onLine ? 'connecting' : 'disconnected',
  callState: 'idle', callType: 'outbound', activeContact: null, callDuration: 0,
  isMuted: false, isOnHold: false, isRecording: true, recSecs: 0, recPaused: false, recMenuOpen: false,
  dtmfOpen: false, transferOpen: false, addCallOpen: false, moreOpen: false, moreAnim: false, copied: false, wsCopied: false,
  activeCallId: null, heldCalls: [], conf: [], disposition: '', notes: '', activeParkSlot: null,
  // Brief "Connecting…" phase right after picking up a parked call (see retrieveParked()) — a transient UI flag,
  // not a new S.callState value, so every existing branch on 'idle'/'ringing'/'connected'/'on_hold'/'wrap_up' stays correct.
  connecting: false,
  // History workspace divider: the left panel's share of the width, kept within 35–65% (see the drag handlers below).
  wsDividerPos: 40,
  incoming: null,
  histFilter: 'all', histSearch: '', histSel: null, histDateFilter: 'all',
  // Separate filter/search for the workspace's own Interaction History timeline (right side) — independent of
  // Column 1's histFilter/histSearch, since the two panels can show different scopes (all contacts vs one contact).
  wsHistStatus: 'all', wsHistDir: 'all', wsHistSearch: '',
  // Inline voicemail follow-up, scoped to the workspace History tab's Voicemails list only (separate from
  // S.vmSel/S.vmDraft, which belong to the real Voicemails tab's own Follow-up sub-tab — kept independent so
  // the two can't collide if both happen to reference the same voicemail).
  histVmOpen: null, histVmDraft: '',
  // Switchable Voicemails/Recordings tabs in the workspace History sidebar (wsHistSidebar) — only one list shows
  // at a time; the Interaction History panel next to it is unaffected by this.
  wshMediaTab: 'vm',
  audioKey: null,
  // Navbar "Dummy Data" switch: ON shows the built-in demo history/recordings/voicemails (the app's only data
  // source, there being no backend) everywhere they're read; OFF hides them without touching session-created ones.
  // EXTRA_HISTORY is built once at load (deterministic, no Math.random()) — the switch only shows/hides it.
  dummyData: false, dummyExtraHistory: EXTRA_HISTORY,   // demo rows are off: every user starts with their own, empty history
  // call-tools local state
  parked: [], parkLog: {}, parkSuccess: null, toasts: [], toastSeq: 0, simIdx: 0,
  // A slot a call was picked up FROM stays locked (parkSlotState() -> 'in_use') until that call actually ends —
  // it is deliberately NOT part of S.parked (which is only "sitting parked, not yet picked up"). Global/shared
  // across every agent, same as S.parked, since a park slot is one physical resource, not a per-agent thing.
  // Keyed by parkId -> { agentId, agentName, callId }. See retrieveParked() / A.hangup / clearAllSessions.
  slotBusy: {},
  // Active Agent switcher (navbar): PARK_AGENT (the signed-in identity used throughout RBAC/attribution) is kept
  // in sync with S.activeAgentId by switchActiveAgent() — see AGENTS below. agentSessions holds every OTHER
  // agent's own frozen live-call state (see SESSION_FIELDS) while they're not the one on screen — switching
  // agents is a real session swap, not just a label change, so nobody's call/park/notification state is lost.
  activeAgentId: 'rahul-c', agentSwitcherOpen: false, agentSwitcherQuery: '', agentSessions: {},
  recordings: RECORDINGS.map((r) => ({ ...r, seed: 'base' })), recSel: null, recFilter: 'all', recSearch: '', recMenu: null, recConfirm: null,
  recAudioId: null, recPlaying: false, recRate: 1, recVol: 1, recMuted: false, recDrag: false, recTq: '', recTqIdx: 0, recScrollSeg: false, recScroll: false,
  recNotes: {}, recActions: {}, recActDraft: '',
  voicemails: VOICEMAILS.map((v) => ({ ...v, seed: 'base' })), vmSel: null, vmFilter: 'all', vmSearch: '', vmTab: 'Transcript', vmMenu: false, vmConfirm: false, vmDraft: { n: {}, f: {} },
  newCallNumber: '', addPadOpen: false, addRecentAll: false, addContactsAll: false, addStatusFilter: 'all', addStatusOpen: false, dtmfDigits: '', transferMode: 'Warm', transferQuery: '', transferTarget: '', transferStage: 'search', transferSourceId: '',
  // workspace local state
  activePanel: 'Copilot', question: '',
  chipsOpen: {}
};
const T = { consult: null, key: null };
// Per-agent call session: every field here is "live state for whoever's call this is" — captured out of S into
// S.agentSessions[otherAgentId] the moment you switch away, and restored into S the moment you switch back (see
// switchActiveAgent()). SESSION_DEFAULTS is a snapshot of S's own real initial values, taken once at load, so a
// brand-new agent who's never been active starts genuinely idle instead of a hand-maintained duplicate literal.
const SESSION_FIELDS = ['callState', 'callType', 'activeContact', 'callDuration', 'isMuted', 'isOnHold', 'isRecording',
  'recSecs', 'recPaused', 'recMenuOpen', 'dtmfOpen', 'transferOpen', 'addCallOpen', 'moreOpen', 'moreAnim',
  'activeCallId', 'heldCalls', 'conf', 'disposition', 'notes', 'activeParkSlot', 'connecting', 'incoming', 'incomingChoice', 'acceptMode', 'incomingMin',
  'endedFrom', 'dialNumber', 'transferMode', 'transferQuery', 'transferTarget', 'transferStage', 'transferSourceId',
  'wrapCallbackOpen', 'wrapCallbackAt', 'wrapCallbackOwner', 'wrapCallbackError',
  'wrapCallbackSaving', 'wrapCallbackFail', 'wrapNotesOpen', 'wrapNoteDraft', 'wrapClearConfirm', 'wrapUnsaved', 'wrapSubmitting'];
const SESSION_DEFAULTS = {};
SESSION_FIELDS.forEach((k) => { SESSION_DEFAULTS[k] = S[k]; });
const snapshotAgentSession = () => { const s = {}; SESSION_FIELDS.forEach((k) => { s[k] = S[k]; }); return s; };
const applyAgentSession = (snap) => { SESSION_FIELDS.forEach((k) => { S[k] = snap && k in snap ? snap[k] : SESSION_DEFAULTS[k]; }); };
// Read/write one field of an agent's session without necessarily making them the active agent — used by timers
// (e.g. the outbound auto-connect below) that must land on the right agent even if the user switched away mid-ring.
const agentSessionGet = (agentId, key) => (agentId === PARK_AGENT.id ? S[key] : ((S.agentSessions[agentId] || SESSION_DEFAULTS))[key]);
const agentSessionPatch = (agentId, patch) => {
  if (agentId === PARK_AGENT.id) { Object.assign(S, patch); return; }
  S.agentSessions[agentId] = { ...(S.agentSessions[agentId] || SESSION_DEFAULTS), ...patch };
};
// Floating call window position: kept outside S (purely a viewport position, not app state) so dragging never
// triggers/waits on a full render. floatPos survives across renders and is re-applied to the DOM after each one.
let floatPos = null, floatDrag = null;
let toolsWereMounted = false, panelsWereOpen = false, floatWasShown = false;

/* ============================== Logic (ported 1:1) ============================== */
function handleKeyPress(digit, append = true) {
  if (append) S.dialNumber += digit;
  S.audioKey = digit;
  clearTimeout(T.key);
  // drop the pressed look without a full re-render, so a click landing at that moment is not lost
  T.key = setTimeout(() => { S.audioKey = null; document.querySelectorAll('.key.hit').forEach((k) => k.classList.remove('hit')); }, 200);
}


function startOutboundCall(numberToCall = S.dialNumber, contactInfo = null) {
  const target = numberToCall || S.dialNumber;
  if (!target || S.webrtc !== 'registered') return;
  if (typeof linkCallBlocked === 'function' && linkCallBlocked(target)) return;
  if (typeof linkCallWarning === 'function') linkCallWarning();
  if (isParkRetrievalCode(target)) { if (retrieveParked(target.trim())) S.dialNumber = ''; return; }
  if (S.callState === 'connected' || S.callState === 'on_hold') { addCallLeg(target, contactInfo); return; }
  if (S.callState === 'wrap_up') {
    // close the ended call's wrap-up so a new, separate call can start; held calls stay held.
    // Log it first (same as a real Submit) so it doesn't vanish from History — this covers Call Again and any other
    // new dial started straight from Wrap-up without clicking Submit / Close first.
    logEndedCall();
    S.disposition = ''; S.notes = ''; S.activeContact = null; S.activeCallId = null; S.conf = [];
    S.callDuration = 0; S.isOnHold = false; S.callState = 'idle';
    S.wrapCallbackOpen = false; S.wrapCallbackAt = ''; S.wrapNotesOpen = false; S.wrapNoteDraft = ''; S.wrapClearConfirm = false; S.wrapUnsaved = null;
  }
  if (S.callState !== 'idle') return;

  S.activeCallId = `call-${Date.now()}-${rid()}`;
  S.conf = []; S.floatMin = false; S.floatPanel = 'Call'; S.floatMore = false; S.floatBig = false; floatPos = null;
  S.callType = 'outbound';
  S.callState = 'ringing';
  S.activeTab = 'active';
  S.callDuration = 0; S.recSecs = 0; S.recPaused = false; S.recMenuOpen = false;
  S.isMuted = false;
  S.isOnHold = false;
  S.activeContact = contactInfo || {
    name: (SPEED_DIAL.find((s) => s.number === target) || {}).name || target,
    number: target,
    account: 'ACC-' + Math.floor(10000 + Math.random() * 90000),
    company: 'Direct Enterprise Dial',
    sentiment: 'Neutral'
  };
  // Simulate auto-answer after 2.5 seconds — agent-aware (not a blind write into S) so this lands correctly even
  // if the user switches agents mid-ring: agentSessionPatch targets whichever agent's call this really is.
  const callerId = PARK_AGENT.id, ringCallId = S.activeCallId;
  setTimeout(() => {
    if (agentSessionGet(callerId, 'callState') === 'ringing' && agentSessionGet(callerId, 'activeCallId') === ringCallId) {
      agentSessionPatch(callerId, { callState: 'connected' });
      render();
    }
  }, 2500);
}

function triggerSimulatedIncomingCall() {
  if (S.callState !== 'idle') return;
  S.incoming = { name: 'Marcus Vance', number: '+1 (555) 432-1098', company: 'Vance Logistics', account: 'ACC-88192', sentiment: 'Needs Support' };
  S.incomingMin = false; S.incomingChoice = false;
}

function answerIncomingCall() {
  if (!S.incoming) return;
  // answering while another call is active (scenarios, inbound + N): keep that call as a held leg instead of dropping it
  if (S.activeContact && (S.callState === 'connected' || S.callState === 'on_hold')) S.heldCalls = [...S.heldCalls, snapshotCurrent()];
  const restore = S.incoming._parkRestore; // set by the park-timeout ringback below: reconnects the SAME call, not a fresh one
  const fromAgentId = S.incoming.fromAgentId; // agent-to-agent test call — see callAgent()
  S.floatMin = false; S.floatPanel = 'Call'; S.floatMore = false; S.floatBig = false; floatPos = null;
  if (restore) {
    S.activeContact = restore.contact; S.activeCallId = restore.id; S.conf = restore.participants || [];
    S.callDuration = restore.duration; S.recSecs = restore.recSecs || 0; S.isRecording = restore.recording; S.recPaused = !!restore.recPaused; S.recMenuOpen = false; S.callType = restore.callType;
  } else {
    S.activeContact = S.incoming;
    // Agent-to-agent calls share one id (set by callAgent()) so the caller's frozen session can be found again below.
    S.activeCallId = fromAgentId ? S.incoming.callId : `incoming-${Date.now()}-${rid()}`;
    S.conf = [];
    S.callType = 'inbound';
    S.callDuration = 0; S.recSecs = 0; S.isRecording = false; S.recPaused = false; S.recMenuOpen = false;
  }
  S.callState = 'connected';
  S.incoming = null;
  S.activeTab = 'active';
  S.isMuted = false;
  S.isOnHold = false;
  // Let the caller's own (possibly frozen, off-screen) session know the call connected — their activeContact was
  // already pointing at us from callAgent(), so only the live call fields need to catch up.
  if (fromAgentId) agentSessionPatch(fromAgentId, { callState: 'connected', callDuration: 0 });
}

function handleToggleHold() {
  S.isOnHold = !S.isOnHold;
  S.callState = S.isOnHold ? 'on_hold' : 'connected';
}
/* ---- Call Park ----
   ParkService is the only place that owns the parked-call pool. It is in-memory here; a backend/WebSocket
   implementation should replace park / retrieve / sweep (retrieve must be atomic server-side so two agents
   cannot take the same call) and push pool changes to every authorized agent. */
const ParkService = {
  // A call reserved for a specific agent can only be retrieved by that agent (or an admin) — everyone else in the
  // department can still see it in their list (visible() below), just not take it; see parkedView()'s "Assigned to" note.
  canRetrieve: (agent, e) => {
    if (e.assignedTo && e.assignedTo !== agent.name && !['admin', 'location_admin'].includes(agent.role)) return false;
    return ['admin', 'location_admin'].includes(agent.role) || agent.departments.includes(e.department) || e.assignedTo === agent.name;
  },
  visible: (agent) => S.parked.filter((e) => ['admin', 'location_admin'].includes(agent.role) || agent.departments.includes(e.department) || e.assignedTo === agent.name),
  park(call, requestedSlot) {
    const code = requestedSlot || PARK_CODES.find((c) => !S.parked.some((e) => e.parkId === c));
    if (!code) return null;
    if (S.parked.some((e) => e.parkId === code)) return null; // requested slot is occupied
    delete S.parkLog[code];
    const e = { id: `park-${Date.now()}-${rid()}`, parkId: code, ...call, parkedAtMs: Date.now(),
      parkedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'parked' };
    S.parked = [...S.parked, e];
    return e;
  },
  retrieve(parkId, agent) {
    const e = S.parked.find((x) => x.parkId === parkId);
    if (!e) return { ok: false, reason: S.parkLog[parkId] || 'notfound' };
    if (e.assignedTo && e.assignedTo !== agent.name && !['admin', 'location_admin'].includes(agent.role)) return { ok: false, reason: 'assigned', assignedTo: e.assignedTo };
    if (!ParkService.canRetrieve(agent, e)) return { ok: false, reason: 'forbidden' };
    S.parked = S.parked.filter((x) => x !== e);
    S.parkLog[parkId] = 'taken';
    return { ok: true, entry: e };
  },
  sweep() {
    const gone = S.parked.filter((e) => (Date.now() - e.parkedAtMs) / 1000 >= PARK_TTL);
    if (gone.length) { S.parked = S.parked.filter((e) => !gone.includes(e)); gone.forEach((e) => { S.parkLog[e.parkId] = 'expired'; }); }
    return gone;
  }
};

// Every toast belongs to one agent (whoever was active when it was pushed, unless the caller names a different
// recipient — e.g. notifying the other party of an agent-to-agent call). toastStack() only renders toasts that
// belong to PARK_AGENT; a toast meant for someone else isn't lost, it just doesn't render until they switch in.
function pushToast(t, ttl = 0) {
  const id = ++S.toastSeq;
  S.toasts = [...S.toasts, { agentId: PARK_AGENT.id, ...t, id, fresh: true }];
  if (ttl) setTimeout(() => { S.toasts = S.toasts.filter((x) => x.id !== id); render(); }, ttl);
}

// Opens the Call Park dialog (slot picker) instead of parking immediately — parkConfirm() below does the actual park.
function openParkDialog() {
  if (!S.activeContact || !['connected', 'on_hold'].includes(S.callState)) return;
  S.parkDialog = { slot: '', assignTo: '', notifyAssignedOnly: false, slotMsg: '', agentQuery: '', agentListOpen: false };
}
// Five real slot states, all derived live from shared/global state, never fabricated per-render: In Use (a call was
// picked up FROM this slot and is still active — S.slotBusy, checked first since it outranks everything else: the
// slot stays locked for the whole life of that call, through any number of agent switches) > Reserved (parked +
// assigned to a specific agent, not yet picked up) > Busy (parked, no one specifically assigned) > Unavailable
// (out of service) > Available.
function parkSlotState(code) {
  if (PARK_UNAVAILABLE.includes(code)) return 'unavailable';
  if (S.slotBusy[code]) return 'in_use';
  const e = S.parked.find((x) => x.parkId === code);
  if (!e) return 'available';
  return e.assignedTo ? 'reserved' : 'busy';
}
// Who should actually get a "Parked Call Alert" for this entry — the one real effect of the "Notify only assigned
// agent" checkbox. Assigned: just the assignee when checked; the assignee PLUS every other agent in the same
// department when unchecked (the normal "visible to the team" behavior). Unassigned: every department-eligible
// agent (same as always — that checkbox only exists once an agent is picked, see the "disabled" UI state).
function parkEligibleRecipients(e) {
  const assignee = e.assignedTo ? AGENTS.find((a) => a.name === e.assignedTo) : null;
  if (e.assignedTo) {
    const ids = assignee ? [assignee.id] : [];
    if (!e.notifyAssignedOnly) AGENTS.forEach((a) => { if (a.id !== (assignee && assignee.id) && a.departments.includes(e.department)) ids.push(a.id); });
    return ids;
  }
  return AGENTS.filter((a) => a.departments.includes(e.department)).map((a) => a.id);
}
function parkConfirm() {
  if (!S.parkDialog) return;
  const requested = S.parkDialog.slot.trim();
  if (requested && !PARK_CODES.includes(requested)) { toastErr(`Enter a valid park slot between ${PARK_CODES[0]} and ${PARK_CODES[PARK_CODES.length - 1]}.`); return; }
  if (requested && parkSlotState(requested) !== 'available') { toastErr(`Park slot ${requested} is currently busy.`); return; }
  if (!requested && PARK_CODES.every((c) => parkSlotState(c) !== 'available')) { toastErr('No park slots are currently available.'); return; }
  const c = S.activeContact, dept = PARK_AGENT.departments[0], assignTo = S.parkDialog.assignTo || null;
  const assignedAgent = assignTo ? AGENTS.find((a) => a.name === assignTo) : null;
  const e = ParkService.park({ callerName: c.name, callerNumber: c.number, parkedBy: PARK_AGENT.name, department: dept, destination: `${dept} Department`,
    contact: c, participants: S.conf, duration: S.callDuration, recording: S.isRecording, recSecs: S.recSecs, callType: S.callType,
    // assignedToId (not just the display name) is the real source of truth for "is this assigned to ME" — see
    // myAssignedParkedCalls() — so a future name collision between two AGENTS couldn't misattribute a call.
    // notifiedIds tracks every agent who's already gotten a toast for this entry — plural, not a single boolean,
    // since "Notify only assigned agent" OFF can mean several independent recipients, each notified once.
    assignedTo: assignTo, assignedToId: assignedAgent ? assignedAgent.id : null, notifyAssignedOnly: assignTo ? S.parkDialog.notifyAssignedOnly : false, notifiedIds: [] }, requested || null);
  if (!e) { toastErr('No park slots are currently available.'); return; }
  S.parkDialog = null;
  closePanels('');
  if (S.heldCalls.length) restoreHeldCall(S.heldCalls[S.heldCalls.length - 1].id);
  else { S.activeContact = null; S.activeCallId = null; S.conf = []; S.callDuration = 0; S.recSecs = 0; S.isOnHold = false; S.callState = 'idle'; }
  S.activeTab = 'active';
  S.parkSuccess = { id: e.id, mode: 'parked' };
  // The rich "Parked Call Alert" (Pick Call / View Details) only makes sense for whoever is actually eligible right
  // now — see parkEligibleRecipients(). If the signed-in agent isn't one of them, the alert instead fires later
  // from switchActiveAgent() once an eligible agent becomes active (see AGENTS/PARK_AGENT above).
  if (parkEligibleRecipients(e).includes(PARK_AGENT.id)) { e.notifiedIds.push(PARK_AGENT.id); pushToast({ kind: 'park', parkId: e.parkId, self: true }); }
}

// The single real release point for a park-slot lock (see S.slotBusy / S.activeParkSlot) — called from A.hangup
// (both branches), and from clearAllSessions() for the current call and every still-held one. The callId check
// guards against releasing a slot that's since been re-locked by a different call (shouldn't happen given today's
// call model, but matching on identity rather than just the slot name costs nothing and is the honest thing to do).
function releaseParkSlot(slot, callId) {
  if (slot && S.slotBusy[slot] && S.slotBusy[slot].callId === callId) delete S.slotBusy[slot];
}

// Calls sitting parked (not yet picked up) and assigned specifically to the current agent — once picked up, an
// entry leaves S.parked entirely (see retrieveParked()), so this naturally drops to 0 the instant it's connected,
// with no separate ASSIGNED/CONNECTED status field needed. Matches by assignedToId (set in parkConfirm()), not
// just the display name, so a future name collision between two AGENTS records couldn't misattribute a call.
const myAssignedParkedCalls = () => S.parked.filter((e) => e.assignedToId === PARK_AGENT.id);
// Shared by A.parkAssignedToggle / A.asParkAssignedToggle (the scenario-dropdown and Agent-Switcher-dropdown copies
// of "Park Call Assigned to Me"): zero assigned calls gives honest feedback instead of opening an empty panel; one
// call opens its full details panel directly (parkSuccessView() in mode:'view' — caller, number, slot, call type,
// parked by/at, live waiting timer, status, and a real Pick Up Call button); two or more opens the compact list
// panel so the agent can choose which one's details to open. dropdownCloseFields is which dropdown-open flag(s) to
// close for the 0/1-call cases — the 2+ case leaves the calling dropdown open and swaps its content to the list.
function parkAssignedOpenFlow(dropdownCloseFields, panelFlag) {
  let mine = myAssignedParkedCalls();
  if (!mine.length) {
    const seeded = seedDemoParkedCallForMe();
    if (seeded) mine = [seeded];
  }
  if (!mine.length) {
    dropdownCloseFields.forEach((f) => { S[f] = false; });
    pushToast({ kind: 'info', msg: 'No Assigned Parked Calls', sub: 'Every park slot is currently in use.' }, 4000);
    return;
  }
  if (mine.length === 1) {
    dropdownCloseFields.forEach((f) => { S[f] = false; });
    S.parkSuccess = { id: mine[0].id, mode: 'view' };
    return;
  }
  S[panelFlag] = true;
}

function retrieveParked(parkId) {
  if (S.callState === 'ringing') { pushToast({ kind: 'err', msg: 'Finish or cancel the ringing call first.' }, 4500); return false; }
  const r = ParkService.retrieve(parkId, PARK_AGENT);
  if (!r.ok) {
    pushToast({ kind: 'err', msg: { notfound: 'Parked call not found.', taken: `This parked call has already been taken by another agent.`, expired: `Parked call ${parkId} is no longer available.`,
      forbidden: `You are not authorized to retrieve parked call ${parkId}.`, assigned: `This parked call is assigned to ${r.assignedTo}.` }[r.reason] }, 4500);
    return false;
  }
  const e = r.entry;
  S.toasts = S.toasts.filter((t) => t.parkId !== parkId);
  if (S.callState === 'connected' || S.callState === 'on_hold') S.heldCalls = [...S.heldCalls, snapshotCurrent()];
  else if (S.callState === 'wrap_up') { S.disposition = ''; S.notes = ''; }
  S.activeCallId = e.id; S.activeContact = e.contact; S.callDuration = e.duration; S.conf = e.participants || [];
  S.isMuted = false; S.isRecording = e.recording; S.recSecs = e.recSecs || 0; S.recPaused = !!e.recPaused; S.recMenuOpen = false; S.callType = e.callType;
  S.isOnHold = false; S.callState = 'connected'; S.activeTab = 'active';
  // The slot doesn't free up just because it left S.parked — it stays locked (parkSlotState() -> 'in_use') for the
  // whole life of this call, through any number of agent switches, until A.hangup/clearAllSessions releases it below.
  S.activeParkSlot = parkId;
  S.slotBusy[parkId] = { agentId: PARK_AGENT.id, agentName: PARK_AGENT.name, callId: e.id, since: Date.now() };
  // Real callState is 'connected' immediately (so the call genuinely exists, holds, transfers, etc. right away) —
  // S.connecting is purely a ~700ms cosmetic "Connecting…" phase on top of that, agent-aware so a switch mid-flash
  // can't land it on the wrong agent (same pattern as the outbound/add-call-leg auto-connect timers).
  S.connecting = true;
  const agentId = PARK_AGENT.id, pickedCallId = e.id;
  setTimeout(() => {
    if (agentSessionGet(agentId, 'activeCallId') === pickedCallId) { agentSessionPatch(agentId, { connecting: false }); render(); }
  }, 700);
  pushToast({ kind: 'ok', msg: `Connected to ${e.callerName}` }, 3000);
  return true;
}

// "Park Call Assigned to Me" is a demo trigger, like the existing Test-inbound and Simulate-colleague buttons: with
// nothing genuinely parked for this agent yet it seeds ONE demo parked call (caller from the existing PARK_SIM
// dummy roster, parked by another real AGENTS record, assigned to whoever clicked), so the click always opens a
// real scenario instead of an empty state. Only falls through to the honest empty state when no park slot is free.
function seedDemoParkedCallForMe() {
  const code = PARK_CODES.find((c) => parkSlotState(c) === 'available');
  if (!code) return null;
  const p = PARK_SIM[S.simIdx++ % PARK_SIM.length];
  const parkedBy = AGENTS.find((a) => a.id !== PARK_AGENT.id && a.status === 'online') || AGENTS[0];
  const dept = PARK_AGENT.departments[0];
  return ParkService.park({ callerName: p.name, callerNumber: p.number, parkedBy: parkedBy.name, department: dept, destination: `${dept} Department`,
    contact: { name: p.name, number: p.number, account: `ACC-${Math.floor(10000 + Math.random() * 90000)}`, company: 'Parked caller', sentiment: 'Neutral' },
    participants: [], duration: Math.floor(10 + Math.random() * 50), recording: true, recSecs: 0, callType: 'inbound',
    assignedTo: PARK_AGENT.name, assignedToId: PARK_AGENT.id, notifyAssignedOnly: true, notifiedIds: [PARK_AGENT.id] }, code);
}
function simulateColleaguePark() {
  const p = PARK_SIM[S.simIdx++ % PARK_SIM.length];
  const e = ParkService.park({ callerName: p.name, callerNumber: p.number, parkedBy: p.by, department: p.department, destination: `${p.department} Department`,
    contact: { name: p.name, number: p.number, account: `ACC-${Math.floor(10000 + Math.random() * 90000)}`, company: 'Parked caller', sentiment: 'Neutral' },
    participants: [], duration: Math.floor(30 + Math.random() * 300), recording: true, recSecs: 0, callType: 'inbound', notifiedIds: [] });
  if (!e) { pushToast({ kind: 'err', msg: 'No park slots available.' }, 4500); return; }
  if (parkEligibleRecipients(e).includes(PARK_AGENT.id)) { e.notifiedIds.push(PARK_AGENT.id); pushToast({ kind: 'park', parkId: e.parkId, self: false }); }
  else pushToast({ kind: 'info', msg: `Simulation: ${p.by} parked a ${p.department} call (${e.parkId}). You are not authorized, so you are not notified.` }, 6000);
}

// Active Agent switcher: PARK_AGENT is reassigned to the picked AGENTS record, which every RBAC/attribution check
// elsewhere (ParkService, vmVisible, call logging, the header) reads live — no second "current agent" state to sync.
// The outgoing agent's entire live call session is snapshotted into S.agentSessions first and the incoming agent's
// is restored in its place, so switching never ends, holds, or resets anyone's call — see SESSION_FIELDS above.
function switchActiveAgent(id) {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent || agent.status === 'offline') return;
  if (agent.id === PARK_AGENT.id) { S.agentSwitcherOpen = false; return; }
  S.agentSessions[PARK_AGENT.id] = snapshotAgentSession();
  PARK_AGENT = agent;
  S.activeAgentId = id;
  S.agentSwitcherOpen = false;
  S.agentSwitcherQuery = '';
  applyAgentSession(S.agentSessions[id]);
  // Any parked call this agent is eligible to hear about — the assignee, or (per "Notify only assigned agent")
  // every department teammate too — but hasn't yet, because someone else was active when it happened. Fires now,
  // the moment this agent actually becomes the one looking at the screen; each agent is only ever notified once
  // per entry (notifiedIds), so re-switching back and forth never re-sends the same alert.
  S.parked.filter((e) => parkEligibleRecipients(e).includes(agent.id) && !e.notifiedIds.includes(agent.id))
    .forEach((e) => { e.notifiedIds.push(agent.id); pushToast({ kind: 'park', parkId: e.parkId, self: true }); });
  pushToast({ kind: 'ok', msg: `Switched to ${agent.name}`, sub: `You are now acting as ${agent.name} (${agent.ext}).` }, 4000);
}

// Agent-to-agent test call: rings the target agent's own session (even while they're not the one on screen) with a
// real incoming call they must Accept/Decline — reusing the exact same S.incoming/toastView()/A.answer machinery
// built for customer calls, just with another AGENTS record standing in as the "caller". Both sides share one
// activeCallId (see answerIncomingCall()'s fromAgentId branch) so accept/hangup can patch each other correctly.
function callAgent(targetId) {
  const target = AGENTS.find((a) => a.id === targetId);
  if (!target || target.id === PARK_AGENT.id || target.status === 'offline') return;
  if (S.callState !== 'idle') { toastErr('Finish or park your current call before calling another agent.'); return; }
  S.agentSwitcherOpen = false; S.agentSwitcherQuery = '';
  const sharedId = `agentcall-${Date.now()}-${rid()}`;
  const internalContact = (a) => ({ name: a.name, number: a.ext, account: `EXT-${a.ext}`, company: 'Internal extension', sentiment: 'Neutral', internal: true, fromAgentId: a.id });
  S.activeCallId = sharedId; S.conf = []; S.callType = 'outbound'; S.callState = 'ringing'; S.activeTab = 'active';
  S.callDuration = 0; S.recSecs = 0; S.recPaused = false; S.recMenuOpen = false; S.isMuted = false; S.isOnHold = false;
  S.activeContact = internalContact(target);
  agentSessionPatch(target.id, { incoming: { ...internalContact(PARK_AGENT), callId: sharedId }, incomingChoice: false, incomingMin: false });
  pushToast({ kind: 'info', msg: `Calling ${target.name} (${target.ext})…` }, 2500);
}

const snapshotCurrent = () => ({
  id: S.activeCallId || `call-${Date.now()}`, contact: S.activeContact, seconds: S.callDuration,
  muted: S.isMuted, recording: S.isRecording, recSecs: S.recSecs, recPaused: S.recPaused, recMenuOpen: false, participants: S.conf,
  // Carries a picked-up call's park-slot lock through hold/swap, so it isn't silently lost (and the slot left
  // locked forever) if the agent holds this call to juggle another leg before eventually hanging up.
  parkSlot: S.activeParkSlot
});
function loadCall(held) {
  S.activeCallId = held.id; S.activeContact = held.contact; S.callDuration = held.seconds;
  S.isMuted = held.muted; S.isRecording = held.recording; S.recSecs = held.recSecs || 0; S.recPaused = !!held.recPaused; S.recMenuOpen = false; S.conf = held.participants || [];
  S.isOnHold = false; S.callState = 'connected'; S.activeParkSlot = held.parkSlot || null;
}

function restoreHeldCall(callId) {
  const held = S.heldCalls.find((c) => c.id === callId);
  if (!held) return;
  S.heldCalls = S.heldCalls.filter((c) => c.id !== callId);
  loadCall(held);
  S.activeTab = 'active';
}

function swapHeldCall(callId) {
  const held = S.heldCalls.find((c) => c.id === callId);
  if (!held || !S.activeContact) return;
  const current = snapshotCurrent();
  S.heldCalls = S.heldCalls.map((c) => (c.id === callId ? current : c));
  loadCall(held);
}

function mergeAllHeldCalls() {
  if (!S.heldCalls.length) return;
  S.conf = mergeUniquePeople([...S.conf, ...S.heldCalls.flatMap((c) => [c.contact, ...(c.participants || [])])]);
  // Once merged, these legs are no longer independently trackable (only the one foreground S.activeParkSlot
  // survives a merge) — release each one's own lock now rather than leaking it forever.
  S.heldCalls.forEach((c) => releaseParkSlot(c.parkSlot, c.id));
  S.heldCalls = [];
  S.isOnHold = false;
  S.callState = 'connected';
}

const endHeldCall = (callId) => {
  const held = S.heldCalls.find((c) => c.id === callId);
  if (held) releaseParkSlot(held.parkSlot, held.id);
  S.heldCalls = S.heldCalls.filter((c) => c.id !== callId);
};

function openAddCall() {
  if (!S.activeContact || S.callState === 'wrap_up' || S.callState === 'ringing') return;
  S.isOnHold = true;
  S.callState = 'on_hold';
  S.addCallOpen = true;
  S.focusAdd = true;
}

// one inline panel at a time: opening DTMF / Add Call / Transfer closes the others
function closePanels(keep) {
  if (keep !== 'dtmf') S.dtmfOpen = false;
  if (keep !== 'transfer' && S.transferOpen) closeTransfer();
  if (keep !== 'add' && S.addCallOpen) cancelAddCall();
}

const addLegs = () => 1 + S.heldCalls.length + S.conf.length;
function cancelAddCallUi() {
  S.newCallNumber = '';
  S.addCallOpen = false; S.addPadOpen = false; S.addRecentAll = false; S.addContactsAll = false; S.addStatusFilter = 'all'; S.addStatusOpen = false;
}

function cancelAddCall() {
  S.newCallNumber = '';
  S.addCallOpen = false; S.addPadOpen = false; S.addRecentAll = false; S.addContactsAll = false; S.addStatusFilter = 'all'; S.addStatusOpen = false;
  if (S.activeContact) { S.isOnHold = false; S.callState = 'connected'; }
}

function addCallLeg(number, contactInfo = null) {
  S.heldCalls = [...S.heldCalls, snapshotCurrent()];
  const matched = SPEED_DIAL.find((p) => p.number === number);
  S.activeContact = contactInfo || (matched
    ? { ...matched, account: `ACC-${Math.floor(10000 + Math.random() * 90000)}`, sentiment: 'Neutral' }
    : { name: number, number, account: 'New contact', company: 'External caller', sentiment: 'Unknown' });
  S.activeCallId = `call-${Date.now()}-${rid()}`;
  S.conf = [];
  S.callType = 'outbound';
  S.callDuration = 0; S.recSecs = 0; S.recPaused = false; S.recMenuOpen = false;
  S.isMuted = false;
  S.isOnHold = false;
  S.callState = 'ringing';
  S.addCallOpen = false;
  S.activeTab = 'active';
  S.activeParkSlot = null; // this new leg isn't a park pickup — the old one's lock already moved onto the held-call snapshot above
  const callerId = PARK_AGENT.id, ringCallId = S.activeCallId;
  setTimeout(() => {
    if (agentSessionGet(callerId, 'callState') === 'ringing' && agentSessionGet(callerId, 'activeCallId') === ringCallId) {
      agentSessionPatch(callerId, { callState: 'connected' });
      render();
    }
  }, 1200);
}

function beginWarmConsult(sourceId) {
  if (sourceId === S.activeCallId) { S.isOnHold = true; S.callState = 'on_hold'; }
}
function cancelWarmConsult(sourceId) {
  if (sourceId === S.activeCallId && S.activeContact) { S.isOnHold = false; S.callState = 'connected'; }
}

function finishTransferredCall(sourceId) {
  S.transferOpen = false;
  if (sourceId !== S.activeCallId) { endHeldCall(sourceId); return; }
  // The transferred-away call is leaving this agent's line for good — release whatever park slot it came from
  // before the foreground swaps to a held call (or clears entirely) and overwrites S.activeParkSlot.
  releaseParkSlot(S.activeParkSlot, sourceId);
  if (S.heldCalls.length) { restoreHeldCall(S.heldCalls[S.heldCalls.length - 1].id); return; }
  S.activeContact = null; S.activeCallId = null; S.conf = []; S.activeParkSlot = null;
  S.callDuration = 0; S.isOnHold = false; S.callState = 'idle'; S.activeTab = 'keypad';
}

function handleCompleteWrapUp() {
  logEndedCall();
  S.disposition = '';
  S.notes = '';
  S.wrapCallbackOpen = false; S.wrapCallbackAt = ''; S.wrapNotesOpen = false; S.wrapNoteDraft = ''; S.wrapClearConfirm = false; S.wrapUnsaved = null;
  if (S.heldCalls.length) { restoreHeldCall(S.heldCalls[S.heldCalls.length - 1].id); return; }
  S.callState = 'idle'; S.activeContact = null; S.activeCallId = null; S.conf = [];
  S.callDuration = 0; S.activeTab = 'keypad';
  S.agentStatus = 'available'; // only reached when there's no held call to return to — genuinely "available" now
}
// Shared by Submit and Close: a real simulated save (like the 2.5s outbound-connect delay elsewhere in this demo),
// with a re-entrancy guard so a double-click can't submit wrap-up twice, then a success toast once it's done.
function submitWrapUp() {
  if (S.wrapSubmitting) return;
  S.wrapSubmitting = true;
  const contactName = (S.activeContact && S.activeContact.name) || 'this call';
  const agentId = PARK_AGENT.id;
  setTimeout(() => {
    // Only finish the save if that agent is still the one on screen — switching away mid-save just leaves their
    // own session sitting in "Saving…" until they switch back to it, rather than risking writing into whoever's live now.
    if (PARK_AGENT.id !== agentId) return;
    S.wrapSubmitting = false;
    handleCompleteWrapUp();
    pushToast({ kind: 'ok', msg: `Wrap-up saved successfully — ${contactName}.` }, 3000);
    render();
  }, 450);
}
// Destructive: drops the ended call AND any held legs without logging them to history (no disposition was submitted),
// then returns to idle. Calls already in S.callLog / CALL_HISTORY_DATA are untouched.
function clearAllSessions() {
  // Abandoning a held leg is still "ending" it for park-slot purposes — release every held call's lock too, not
  // just the foreground one (which A.hangup already released on the way into wrap-up).
  releaseParkSlot(S.activeParkSlot, S.activeCallId);
  S.heldCalls.forEach((c) => releaseParkSlot(c.parkSlot, c.id));
  S.heldCalls = [];
  S.disposition = ''; S.notes = '';
  S.activeContact = null; S.activeCallId = null; S.conf = []; S.activeParkSlot = null;
  S.callDuration = 0; S.isOnHold = false; S.callState = 'idle'; S.activeTab = 'keypad';
  S.wrapCallbackOpen = false; S.wrapCallbackAt = ''; S.wrapCallbackError = ''; S.wrapCallbackFail = false;
  S.wrapNotesOpen = false; S.wrapNoteDraft = ''; S.wrapClearConfirm = false; S.wrapUnsaved = null;
}
// True while the agent has entered but not yet saved a callback or a quick note in the Wrap-up screen.
const wrapHasUnsaved = () => (S.wrapNotesOpen && S.wrapNoteDraft.trim() !== '') || (S.wrapCallbackOpen && !!S.wrapCallbackAt && !S.wrapCallbackSaving);

/* ---- transfer panel (ActiveCallTools) ---- */
function setTransferStage(stage) {
  S.transferStage = stage;
  clearTimeout(T.consult);
  if (stage === 'consulting') {
    const agentId = PARK_AGENT.id;
    T.consult = setTimeout(() => { if (PARK_AGENT.id === agentId && S.transferStage === 'consulting') { S.transferStage = 'ready'; render(); } }, 1000);
  }
}
function resetTransferLocal() {
  clearTimeout(T.consult);
  S.transferStage = 'search'; S.transferTarget = ''; S.transferQuery = ''; S.transferSourceId = '';
}
function closeTransfer(resumeConsult = true) {
  if (resumeConsult && (S.transferStage === 'consulting' || S.transferStage === 'ready')) cancelWarmConsult(S.transferSourceId);
  S.transferOpen = false;
  resetTransferLocal();
}
function completeTransfer() {
  const src = S.transferSourceId;
  closeTransfer(false);
  finishTransferredCall(src);
}
function transferCalls() {
  return [
    ...(S.activeContact ? [{ id: S.activeCallId, name: S.activeContact.name, label: S.callState === 'on_hold' ? 'On hold' : 'Active call' }] : []),
    ...S.heldCalls.map((c) => ({ id: c.id, name: c.contact.name, label: 'On hold' }))
  ];
}

/* ---- Recordings: selection + real audio playback ---- */
const toastErr = (msg) => pushToast({ kind: 'err', msg }, 3500);
function recSelectId(id) {
  if (S.recSel === id) return;
  if (!AUDIO.paused) AUDIO.pause();
  S.recSel = id; S.recTq = ''; S.recTqIdx = 0; S.recMenu = null; S.recConfirm = null; S.recScroll = true;
}
function recLoad(rec) {
  if (S.recAudioId === rec.id) return;
  if (!AUDIO.paused) AUDIO.pause();
  AUDIO.src = recAudio(rec).url;
  AUDIO.playbackRate = S.recRate; AUDIO.volume = S.recVol; AUDIO.muted = S.recMuted;
  S.recAudioId = rec.id; S.recPlaying = false;
}
const recPlayFail = () => { S.recPlaying = false; toastErr('Unable to play recording.'); render(); };
function recPlayToggle(id) {
  const rec = recById(id);
  if (!rec) return;
  if (!rec.hasRecording) { toastErr('Recording unavailable.'); return; }
  if (rec.kind === 'vm') vmSelectId(id); else recSelectId(id);
  recLoad(rec);
  if (AUDIO.paused) AUDIO.play().catch(recPlayFail); else AUDIO.pause();
}
function recSeekTo(t, play) {
  const rec = curItem();
  if (!rec || !rec.hasRecording) { toastErr('Recording unavailable.'); return; }
  recLoad(rec);
  const go = () => { AUDIO.currentTime = Math.max(0, Math.min(rec.duration, t)); if (play) AUDIO.play().catch(recPlayFail); };
  if (AUDIO.readyState >= 1) go(); else AUDIO.addEventListener('loadedmetadata', go, { once: true });
}
function recDownload(id) {
  const rec = recById(id);
  if (!rec || !rec.hasRecording) { toastErr(rec && rec.kind === 'vm' ? 'Voicemail recording is unavailable.' : 'Recording file is unavailable.'); return; }
  if (!downloadBlob(`${fileBase(rec)}_${fileStamp(rec)}.wav`, recAudio(rec).blob)) toastErr('Download failed. Please try again.');
}
function recDownloadTranscript(kind) {
  const rec = curItem(), segs = rec && recSegs(rec);
  if (!segs) { toastErr('Transcript unavailable.'); return; }
  const t = (s) => formatTime(s);
  const body = kind === 'csv'
    ? ['start,end,speaker,text', ...segs.map((s) => `${t(s.t0)},${t(s.t1)},"${s.who.replace(/"/g, '""')}","${s.text.replace(/"/g, '""')}"`)].join('\r\n')
    : segs.map((s) => `${t(s.t0)} - ${t(s.t1)}\r\n${s.who}: ${s.text}\r\n`).join('\r\n');
  if (!downloadBlob(`${fileBase(rec)}_transcript.${kind}`, new Blob([body], { type: kind === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8' }))) toastErr('Download failed. Please try again.');
}
function recCopy(text, what) {
  if (!navigator.clipboard) { toastErr('Copy is not available in this browser.'); return; }
  navigator.clipboard.writeText(text).then(() => { pushToast({ kind: 'ok', msg: `${what} copied.` }, 2500); render(); }).catch(() => { toastErr('Copy failed.'); render(); });
}
function callBackTo(number, info) {
  if (S.webrtc !== 'registered') { toastErr('Station is not registered.'); return; }
  if (S.callState === 'ringing') { toastErr('Finish or cancel the ringing call first.'); return; }
  startOutboundCall(number, info);
}
function recCall(id) {
  const r = recById(id);
  if (r) callBackTo(r.number, { name: r.name, number: r.number, account: r.account, company: r.department, sentiment: 'Neutral' });
}
function recDelete(id) {
  const r = recById(id);
  if (!r) return;
  if (S.recAudioId === id) { AUDIO.pause(); AUDIO.removeAttribute('src'); AUDIO.load(); S.recAudioId = null; S.recPlaying = false; }
  const c = recAudioCache.get(id);
  if (c) { URL.revokeObjectURL(c.url); recAudioCache.delete(id); }
  S.recordings = S.recordings.filter((x) => x.id !== id);
  if (S.recSel === id) S.recSel = null;
  S.recConfirm = null; S.recMenu = null;
  pushToast({ kind: 'ok', msg: 'Recording removed. Demo data: this is not a permanent delete.' }, 4000);
}
function syncPlayerDom() {
  const rec = curItem();
  if (!rec || S.recAudioId !== rec.id) return;
  const cur = AUDIO.currentTime, f = Math.min(1, cur / rec.duration);
  document.querySelectorAll('.js-rp-cur').forEach((n) => { n.textContent = formatTime(Math.floor(cur)); });
  const sk = document.querySelector('.rp-seek');
  if (sk && !S.recDrag) { sk.value = cur; sk.style.setProperty('--pct', `${f * 100}%`); }
  document.querySelectorAll('.rp-wave i').forEach((b, i, all) => b.classList.toggle('on', i / all.length < f));
  const segs = recSegs(rec);
  if (segs) document.querySelectorAll('.seg').forEach((el) => { const s = segs[+el.dataset.n]; el.classList.toggle('now', !!s && cur >= s.t0 && cur < s.t1); });
}
AUDIO.addEventListener('play', () => { S.recPlaying = true; render(); });
AUDIO.addEventListener('pause', () => { S.recPlaying = false; render(); });
AUDIO.addEventListener('ended', () => { S.recPlaying = false; render(); });
AUDIO.addEventListener('error', () => { if (!AUDIO.getAttribute('src')) return; S.recPlaying = false; toastErr('Unable to play recording.'); render(); });
AUDIO.addEventListener('timeupdate', syncPlayerDom);
AUDIO.addEventListener('seeked', syncPlayerDom);

/* ---- Voicemails (RBAC: PARK_AGENT is the signed-in demo user) ---- */
const isMgr = () => PARK_AGENT.role !== 'agent';
const vmVisible = (v) => isMgr() || PARK_AGENT.departments.includes(v.department) || v.assignedTo === PARK_AGENT.name;
const vmCanDelete = (v) => isMgr() || v.assignedTo === PARK_AGENT.name;
const vmCanAssign = (who) => isMgr() || !who || who === PARK_AGENT.name || PARK_AGENT.departments.includes((DIRECTORY.find((d) => d.name === who) || {}).dept);
const vmUsers = () => [PARK_AGENT.name, ...DIRECTORY.map((d) => d.name)];
const vmFollow = (v) => (v.resolved ? 'Resolved' : v.read ? 'Reviewed' : 'Not reviewed yet');
const vmUpdate = (id, patch) => { S.voicemails = S.voicemails.map((v) => (v.id === id ? { ...v, ...patch } : v)); };
function vmFiltered() {
  const q = S.vmSearch.trim().toLowerCase();
  return visVoicemails().filter(vmVisible).filter((v) => v.id === S.vmSel || (
    (S.vmFilter === 'all' || (S.vmFilter === 'unread' && !v.read) || (S.vmFilter === 'mine' && v.assignedTo === PARK_AGENT.name) || (S.vmFilter === 'unassigned' && !v.assignedTo))
    && (!q || [v.name, v.number, v.ext, v.assignedTo, v.department, v.account, v.callId].some((x) => x && String(x).toLowerCase().includes(q)))));
}
function vmCloseDetails() {
  if (S.vmSel && S.recAudioId === S.vmSel && !AUDIO.paused) AUDIO.pause();
  S.vmSel = null; S.vmMenu = false; S.vmConfirm = false;
}
// selected voicemail that no longer matches the active search / filter is closed instead of left stale
function vmEnsureSel() {
  const q = S.vmSearch.trim().toLowerCase(), v = S.voicemails.find((x) => x.id === S.vmSel);
  if (!v) return;
  const ok = vmVisible(v) && (S.vmFilter === 'all' || (S.vmFilter === 'unread' && !v.read) || (S.vmFilter === 'mine' && v.assignedTo === PARK_AGENT.name) || (S.vmFilter === 'unassigned' && !v.assignedTo))
    && (!q || [v.name, v.number, v.ext, v.assignedTo, v.department, v.account, v.callId].some((x) => x && String(x).toLowerCase().includes(q)));
  if (!ok) vmCloseDetails();
}
function vmSelectId(id) {
  if (S.vmSel === id) return;
  if (!AUDIO.paused) AUDIO.pause();
  S.vmSel = id; S.recTq = ''; S.recTqIdx = 0; S.vmMenu = false; S.vmConfirm = false; S.recScroll = true;
  if (!recById(id).read) vmUpdate(id, { read: true });
}
function vmDelete(id) {
  if (S.recAudioId === id) { AUDIO.pause(); AUDIO.removeAttribute('src'); AUDIO.load(); S.recAudioId = null; S.recPlaying = false; }
  const c = recAudioCache.get(id);
  if (c) { URL.revokeObjectURL(c.url); recAudioCache.delete(id); }
  S.voicemails = S.voicemails.filter((v) => v.id !== id);
  if (S.vmSel === id) S.vmSel = null;
  S.vmConfirm = false; S.vmMenu = false;
  pushToast({ kind: 'ok', msg: 'Voicemail removed. Demo data: this is not a permanent delete.' }, 4000);
}

/* ---- Call workspace (right panel): ONE selected call drives all six tabs ----
   Selected call = S.wsSel when it was chosen during the current foreground call (S.wsAnchor === S.activeCallId), otherwise the
   foreground call itself. Sources: live active call, held calls, ended calls (S.callLog) and CALL_HISTORY_DATA. */
const digitsOf = (n) => String(n || '').replace(/\D/g, '');
const sameNumber = (a, b) => { const x = digitsOf(a), y = digitsOf(b); return !!x && !!y && (x === y || (x.length >= 10 && y.length >= 10 && x.slice(-10) === y.slice(-10))); };
function contactFor(number) {
  const d = DIRECTORY.find((x) => sameNumber(x.ext, number));
  if (d) return { name: d.name, number: d.ext, company: '', email: `${d.name.toLowerCase().replace(/[^a-z]+/g, '.')}@teloz.example`, tags: d.role, queue: d.dept, campaign: '', dnis: '', status: 'available', sub: d.role, ext: d.ext };
  const c = SPEED_DIAL.find((x) => sameNumber(x.number, number));
  return c ? { name: c.name, number: c.number, company: c.company, email: c.email || '', tags: c.tier || '', queue: c.queue || '', campaign: c.campaign || '', dnis: c.dnis || '', status: c.status, sub: c.company } : null;
}
// Creates or updates a saved (SPEED_DIAL) contact; DIRECTORY (internal extension) entries are never editable here.
function upsertContact(number, f) {
  const name = `${f.first || ''} ${f.last || ''}`.trim().replace(/\s+/g, ' ');
  if (!name) return false;
  const existing = SPEED_DIAL.find((x) => sameNumber(x.number, number));
  const data = { name, number, company: (f.company || '').trim(), tier: f.tier || 'Standard', email: (f.email || '').trim(),
    status: existing ? existing.status : 'available', queue: (f.queue || '').trim(), campaign: (f.campaign || '').trim(), dnis: existing ? existing.dnis : '' };
  if (existing) Object.assign(existing, data); else SPEED_DIAL.push(data);
  return true;
}
const NOTES_KEY = 'teloz.callNotes';
const loadNotes = () => { try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || {}; } catch (e) { return {}; } };
const persistNotes = () => { try { localStorage.setItem(NOTES_KEY, JSON.stringify(S.callNotes)); } catch (e) { /* storage unavailable: notes stay in memory */ } };
const CONTACTS_ADDED_KEY = 'teloz.contactsAdded';
const loadContactsAdded = () => { try { return JSON.parse(localStorage.getItem(CONTACTS_ADDED_KEY)) || {}; } catch (e) { return {}; } };
const persistContactsAdded = () => { try { localStorage.setItem(CONTACTS_ADDED_KEY, JSON.stringify(S.contactsAdded)); } catch (e) { /* storage unavailable: added-state stays in memory */ } };
const CALLBACKS_KEY = 'teloz.callbacks';
const loadCallbacks = () => { try { return JSON.parse(localStorage.getItem(CALLBACKS_KEY)) || {}; } catch (e) { return {}; } };
// unlike the other persistNote helpers, a failure here is surfaced to the agent (real Schedule Callback error path) instead of swallowed, since Wrap-up explicitly asks for one
const persistCallbacks = () => { localStorage.setItem(CALLBACKS_KEY, JSON.stringify(S.callbacks)); };
const localIso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
const fmtWhen = (d) => `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
// Real GMT offset of this browser (not a hardcoded zone): "GMT+5:30", "GMT-4", etc.
const tzOffsetStr = () => { const m = -new Date().getTimezoneOffset(), sign = m >= 0 ? '+' : '-', h = Math.floor(Math.abs(m) / 60), mm = Math.abs(m) % 60; return `GMT${sign}${h}${mm ? ':' + String(mm).padStart(2, '0') : ''}`; };
const fmtWhenFull = (d) => `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour12: false })} ${tzOffsetStr()}`;
// "just now" / "5 minutes ago" / "3 hours ago" / "a day ago" / "4 days ago" / falls back to the date once it's old
const relTime = (ms) => {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) { const m = Math.floor(s / 60); return `${m} minute${m === 1 ? '' : 's'} ago`; }
  if (s < 86400) { const h = Math.floor(s / 3600); return `${h} hour${h === 1 ? '' : 's'} ago`; }
  const d = Math.floor(s / 86400);
  return d === 1 ? 'a day ago' : d < 30 ? `${d} days ago` : fmtWhen(new Date(ms));
};
const durSecs = (s) => String(s).split(':').reduce((a, x) => a * 60 + (+x || 0), 0);

/* ---- Shared date-range filter for the History tab (Column 1 list + the right workspace's Interaction History) ----
   One function, one set of boundaries, applied to both sides so neither can drift out of sync with the other. */
const DATE_RANGES = [['all', 'All Time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['last7', 'Last 7 Days'], ['last15', 'Last 15 Days'], ['month', 'This Month']];
// CALL_HISTORY_DATA/historyData() rows only carry date/time strings; this is the one place that turns them into an epoch ms, reused everywhere a row needs sorting or range-checking.
const histAt = (h) => ('at' in h ? h.at : Date.parse(/^\d/.test(h.time) ? `${h.date} ${h.time}` : h.date) || Date.now());
function dateRangeBounds(key) {
  const now = Date.now(), d = new Date(), startToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (key === 'today') return [startToday, now];
  if (key === 'yesterday') return [startToday - 86400000, startToday];
  if (key === 'last7') return [now - 7 * 86400000, now];
  if (key === 'last15') return [now - 15 * 86400000, now];
  if (key === 'month') return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), now];
  return null; // 'all'
}
const inDateRange = (at, key) => { const b = dateRangeBounds(key); return !b || (at >= b[0] && at <= b[1]); };

// records an ended foreground call (after wrap-up) so it stays selectable: recap, recording, notes and history keep working
function logEndedCall() {
  const c = S.activeContact;
  if (!c || !S.activeCallId) return;
  const id = S.activeCallId, cancelled = S.endedFrom === 'ringing', secs = cancelled ? 0 : S.callDuration, start = new Date(Date.now() - secs * 1000);
  const dir = S.callType === 'inbound' ? 'inbound' : 'outbound', recId = S.isRecording && secs > 0 ? `rc-${id}` : null;
  S.callLog = [{ id, owner: window.UCAAS_user || 'admin', name: S.conf.length ? 'Conference call' : c.name, number: c.number, contact: c, participants: S.conf.slice(), status: cancelled ? 'Cancelled' : 'Completed', direction: dir === 'inbound' ? 'Inbound' : 'Outbound',
    duration: secs, when: fmtWhen(start), result: cancelled ? 'Cancelled before answer' : 'Answered · disconnected normally', sentiment: c.sentiment, disposition: S.disposition, recId, ended: true, at: start.getTime() }, ...S.callLog];
  if (recId) S.recordings = [{ id: recId, owner: window.UCAAS_user || 'admin', callId: id, name: c.name, number: c.number, account: c.account, agent: PARK_AGENT.name, department: c.company || '-', direction: dir, status: 'Completed', start: localIso(start), duration: secs, hasRecording: true, tr: null }, ...S.recordings];
  // the Wrap-up Notes textarea (S.notes) previously vanished on submit without being saved anywhere; fold it into the
  // real per-call notes store so it shows up in the Notes tab / History like any note added there.
  const wrapNote = S.notes.trim();
  if (wrapNote) S.callNotes[id] = [{ id: rid(), text: wrapNote, author: PARK_AGENT.name, ts: Date.now(), callId: id, contact: c.number }, ...(S.callNotes[id] || [])];
  if (wrapNote) persistNotes();
  S.wsSel = id; S.wsAnchor = null;
  if (typeof linkSaveCalls === 'function') linkSaveCalls();
}
function wsCall() {
  const sel = S.wsAnchor === S.activeCallId ? S.wsSel : null;
  const mk = (o) => ({ live: false, participants: [], ...o });
  const byId = (id) => {
    if (S.activeContact && id === S.activeCallId) {
      const c = S.activeContact, ended = S.callState === 'wrap_up', st = { ringing: 'Ringing', connected: 'Connected', on_hold: 'On hold', wrap_up: 'Completed' }[S.callState] || 'Connected';
      return mk({ id, live: !ended, active: true, name: S.conf.length ? 'Conference call' : c.name, number: c.number, contact: c, participants: S.conf.length ? [c, ...S.conf] : [], status: st,
        direction: S.callType === 'inbound' ? 'Inbound' : 'Outbound', duration: S.callDuration, when: fmtWhen(new Date(Date.now() - S.callDuration * 1000)), result: ended ? 'Answered · disconnected normally' : 'In progress', sentiment: c.sentiment, recId: null });
    }
    const hc = S.heldCalls.find((x) => x.id === id);
    if (hc) return mk({ id, live: true, name: hc.participants && hc.participants.length ? 'Conference call' : hc.contact.name, number: hc.contact.number, contact: hc.contact, participants: hc.participants && hc.participants.length ? [hc.contact, ...hc.participants] : [], status: 'On hold', direction: '-', duration: hc.seconds, when: '-', result: 'In progress', sentiment: hc.contact.sentiment });
    const lg = S.callLog.find((x) => x.id === id);
    if (lg) return mk(lg);
    const h = historyData().find((x) => x.id === id);
    if (h) return mk({ id, name: h.name, number: h.number, contact: { name: h.name, number: h.number, account: h.account, sentiment: h.sentiment }, status: h.type === 'missed' ? 'Missed' : h.status, direction: h.type === 'outbound' ? 'Outbound' : 'Inbound',
      duration: durSecs(h.duration), when: `${h.date}${/^\d/.test(h.time) ? ', ' + h.time : ''}`, result: h.type === 'missed' ? 'Not answered' : h.status === 'Completed' ? 'Answered · disconnected normally' : h.status, sentiment: h.sentiment, recId: h.rec || h.vm || null, hist: true });
    return null;
  };
  return (sel && byId(sel)) || (S.activeContact && S.activeCallId && byId(S.activeCallId)) || null;
}
// past interactions for the selected call's number: ended calls of this session, then CALL_HISTORY_DATA
function wsHistory(call) {
  const row = (o) => ({ ...o });
  // Every row here is for the same number, so its Queue (a property of the contact, not of one call) comes from the
  // real directory/saved-contact record once — DIRECTORY's department, or a SPEED_DIAL contact's queue — not invented.
  const ct = contactFor(call.number), queue = (ct && ct.queue) || null;
  return [
    ...S.callLog.filter((c) => sameNumber(c.number, call.number)).map((c) => row({ id: c.id, title: `${c.status} call`, at: c.at, direction: c.direction, duration: formatTime(c.duration), result: c.result, status: c.status, agent: PARK_AGENT.name, queue, wrap: c.disposition, recId: c.recId })),
    ...seedHistory().filter((h) => sameNumber(h.number, call.number)).map((h) => row({ id: h.id, title: h.voicemail ? 'Voicemail' : h.type === 'missed' ? 'Missed call' : `${h.status} call`, at: histAt(h),
      direction: h.type === 'outbound' ? 'Outbound' : 'Inbound', duration: h.duration, result: h.result || (h.type === 'missed' ? 'Not answered' : h.status === 'Completed' ? 'Answered · disconnected normally' : h.status), status: h.type === 'missed' ? 'Missed' : h.status, agent: h.agent || PARK_AGENT.name, queue: h.queue || queue, wrap: h.wrap || null, recId: h.rec || h.vm || null, voicemail: !!h.voicemail }))
  ].sort((a, b) => b.at - a.at);
}
// One source of truth for "how many calls does this contact have": the actual call records for that number (the
// session call log plus the history data). The left badge and the right Interaction History both use this, so they
// can't disagree, and no hand-maintained count field is involved.
const contactCallCount = (number) => S.callLog.filter((c) => sameNumber(c.number, number)).length + seedHistory().filter((h) => sameNumber(h.number, number)).length;
const wsRecording = (call) => (call && call.recId ? recById(call.recId) || null : null);
const wsSummary = (id) => S.callSummary[id] || (S.callSummary[id] = { actions: [], outcome: '', draft: null });
function wsSelectId(id) {
  S.wsSel = id; S.wsAnchor = S.activeCallId; S.recTq = ''; S.recTqIdx = 0; S.wsNoteEdit = null; S.wsNoteDraft = ''; S.wsAdd = false;
  if (!AUDIO.paused) AUDIO.pause();
}

/* ---- Conference participants: per-participant flags live in S.partMuted / S.partHold (no media layer exists), Remove changes the real conference ---- */
const partKey = (number) => `${S.activeCallId}|${number}`;
// Join stamps: people already on the call when it is first seen joined at its start (offset 0); anyone who appears later joined at the current call time.
// Duration = S.callDuration - offset, so it follows the one call timer (pauses on hold, stops at hang-up).
function syncPartJoin() {
  if (!S.activeContact || !S.activeCallId) return;
  const first = !S.partSeen[S.activeCallId];
  [S.activeContact, ...S.conf].forEach((p) => { const k = partKey(p.number); if (!S.partJoin[k]) S.partJoin[k] = first ? { at: Date.now() - S.callDuration * 1000, off: 0 } : { at: Date.now(), off: S.callDuration }; });
  S.partSeen[S.activeCallId] = true;
}
function removeParticipant(number) {
  if (!S.conf.length) return;
  const p = S.activeContact.number === number ? S.activeContact : S.conf.find((x) => x.number === number);
  if (!p) return;
  if (S.activeContact.number === number) { S.activeContact = S.conf[0]; S.conf = S.conf.slice(1); } else S.conf = S.conf.filter((x) => x.number !== number);
  delete S.partMuted[partKey(number)]; delete S.partHold[partKey(number)]; delete S.partJoin[partKey(number)];
  S.partSel = null;
  pushToast({ kind: 'ok', msg: `Removed ${personName(p)} from the call.` }, 3000);
}

/* ============================== Actions ============================== */
const A = {
  nav: (v) => { if (v === 'video') { if (window.UCAAS_goto) UCAAS_goto('interactions/video'); else location.href = '../video/video-meetings.html'; return; } S.nav = v; },
  tab: (v) => { if (v !== S.activeTab) { if (!AUDIO.paused) AUDIO.pause(); S.wsSel = null; } S.activeTab = v; },
  recFilter: (v) => { S.recFilter = v; },
  recSelect: (v) => { recSelectId(v); },
  recPlay: (v) => { recPlayToggle(v); },
  recPlayCur: () => { const it = curItem(); if (it) recPlayToggle(it.id); },
  recDl: (v) => { recDownload(v); },
  recTr: (v) => { const r = recById(v); if (!r) return; recSelectId(v); if (r.tr) S.activePanel = 'Transcript'; else toastErr('Transcript unavailable.'); },
  recTrGo: () => { S.activePanel = 'Transcript'; },
  recCall: (v) => { recCall(v); },
  recMore: (v) => { S.recMenu = S.recMenu === v ? null : v; S.recConfirm = null; },
  recNoteGo: (v) => { recSelectId(v); S.activePanel = 'Notes'; S.recMenu = null; },
  recContactGo: (v) => { recSelectId(v); S.activePanel = 'Contact'; S.recMenu = null; },
  recCopyNum: (v) => { const r = recById(v); if (r) recCopy(r.number, 'Number'); },
  recCopyId: (v) => { const r = recById(v); if (r) recCopy(r.callId, 'Call ID'); },
  recDelAsk: (v) => { S.recConfirm = v; },
  recDelNo: () => { S.recConfirm = null; },
  recDelDo: (v) => { recDelete(v); },
  recSkip: (v) => { const r = curItem(); if (!r || !r.hasRecording) return; recLoad(r); AUDIO.currentTime = Math.max(0, Math.min(r.duration, AUDIO.currentTime + +v)); },
  recMute: () => { S.recMuted = !S.recMuted; AUDIO.muted = S.recMuted; },
  recSeg: (v) => { const r = curItem(), s = r && recSegs(r); if (s && s[+v]) recSeekTo(s[+v].t0, true); },
  recTqNav: (v) => {
    const r = curItem(), segs = r && recSegs(r), q = S.recTq.trim().toLowerCase();
    if (!segs || !q) return;
    const hits = segs.map((s, i) => (s.text.toLowerCase().includes(q) ? i : -1)).filter((i) => i >= 0);
    if (!hits.length) return;
    S.recTqIdx = (S.recTqIdx + +v + hits.length) % hits.length;
    S.recScrollSeg = true;
    recSeekTo(segs[hits[S.recTqIdx]].t0, false);
  },
  recTdl: (v) => { recDownloadTranscript(v); },
  recActToggle: (v) => { const l = S.recActions[S.recSel] || []; S.recActions[S.recSel] = l.map((a) => (a.id === v ? { ...a, done: !a.done } : a)); },
  vmSelect: (v) => { vmSelectId(v); },
  vmFilter: (v) => { S.vmFilter = v; vmEnsureSel(); },
  vmClose: () => { vmCloseDetails(); },
  vmTab: (v) => { S.vmTab = v; },
  vmMore: () => { S.vmMenu = !S.vmMenu; S.vmConfirm = false; },
  vmRead: () => { const v = curItem(); if (v) { vmUpdate(v.id, { read: !v.read }); S.vmMenu = false; } },
  vmResolve: () => { const v = curItem(); if (v) { vmUpdate(v.id, { resolved: !v.resolved }); pushToast({ kind: 'ok', msg: v.resolved ? 'Marked unresolved.' : 'Marked resolved.' }, 2500); } },
  vmSaveNote: () => { const v = curItem(); if (!v) return; vmUpdate(v.id, { notes: S.vmDraft.n[v.id] ?? v.notes }); pushToast({ kind: 'ok', msg: 'Note saved.' }, 2500); },
  vmSaveFollow: () => { const v = curItem(); if (!v) return; vmUpdate(v.id, { followNote: S.vmDraft.f[v.id] ?? v.followNote }); pushToast({ kind: 'ok', msg: 'Follow-up note saved.' }, 2500); },
  vmCopyNum: () => { const v = curItem(); if (v) recCopy(v.number, 'Phone number'); },
  vmCopyExt: () => { const v = curItem(); if (v && v.ext) recCopy(v.ext, 'Extension'); },
  vmCopyId: () => { const v = curItem(); if (v) recCopy(v.callId, 'Call ID'); },
  vmContactGo: () => { S.vmTab = 'Contact'; S.vmMenu = false; },
  vmNoteGo: () => { S.vmTab = 'Notes'; S.vmMenu = false; },
  // Inline Follow-up for the workspace History tab's Voicemails list (wsHistSidebar) — expands in place instead of
  // navigating away, per the "stay on History" requirement. Writes through the same real vmUpdate() store as the
  // Voicemails tab's own Follow-up form, just addressed by explicit id instead of curItem()/S.vmSel.
  histVmToggle: (v) => { S.histVmOpen = S.histVmOpen === v ? null : v; S.histVmDraft = ''; },
  histVmResolve: () => {
    const id = S.histVmOpen, it = id && recById(id);
    if (!it) return;
    vmUpdate(id, { resolved: !it.resolved });
    pushToast({ kind: 'ok', msg: it.resolved ? 'Marked unresolved.' : 'Marked resolved.' }, 2500);
  },
  histVmSave: () => {
    const id = S.histVmOpen, it = id && recById(id);
    if (!it) return;
    vmUpdate(id, { followNote: S.histVmDraft || it.followNote });
    pushToast({ kind: 'ok', msg: 'Follow-up note saved.' }, 2500);
    S.histVmDraft = '';
  },
  vmDelAsk: () => { S.vmConfirm = true; S.vmMenu = false; },
  vmDelNo: () => { S.vmConfirm = false; },
  vmDelDo: (v) => { const it = recById(v); if (it && vmCanDelete(it)) vmDelete(v); else toastErr('You are not allowed to delete this voicemail.'); },
  recActDel: (v) => { S.recActions[S.recSel] = (S.recActions[S.recSel] || []).filter((a) => a.id !== v); },
  toggleStatus: () => { S.statusOpen = !S.statusOpen; },
  scenToggle: () => { S.scenOpen = !S.scenOpen; S.scenFocus = S.scenOpen; S.parkAssignedOpen = false; },
  scen: (v) => { loadScenario(v); S.scenOpen = false; S.scenRefocus = true; },
  // Opens in place of the normal scenario list (same .scen dropdown, same position/outside-click/Escape handling) —
  // not a scenario, so it deliberately does NOT call loadScenario().
  parkAssignedToggle: () => parkAssignedOpenFlow(['scenOpen'], 'parkAssignedOpen'),
  parkAssignedClose: () => { S.scenOpen = false; S.parkAssignedOpen = false; },
  parkAssignedTake: (v) => { if (retrieveParked(v)) { S.scenOpen = false; S.parkAssignedOpen = false; } },
  setStatus: (v) => { S.agentStatus = v; S.statusOpen = false; },
  agentSwitcherToggle: () => { S.agentSwitcherOpen = !S.agentSwitcherOpen; if (!S.agentSwitcherOpen) { S.agentSwitcherQuery = ''; S.asParkAssignedOpen = false; } },
  // Same "Park Call Assigned to Me" feature as A.parkAssignedToggle, launched from the Agent Switcher dropdown instead.
  asParkAssignedToggle: () => parkAssignedOpenFlow(['agentSwitcherOpen'], 'asParkAssignedOpen'),
  asParkAssignedClose: () => { S.agentSwitcherOpen = false; S.asParkAssignedOpen = false; },
  asParkAssignedTake: (v) => { if (retrieveParked(v)) { S.agentSwitcherOpen = false; S.asParkAssignedOpen = false; } },
  // Switching is always immediate and non-destructive now — each agent's live call session is snapshotted/restored
  // by switchActiveAgent() (see SESSION_FIELDS), so there's nothing left to confirm or lose.
  agentSwitchPick: (id) => switchActiveAgent(id),
  agentCallPick: (id) => callAgent(id),
  toggleCompact: () => { S.compactMode = !S.compactMode; if (S.compactMode) { S.activePanel = 'Copilot'; S.question = ''; } },
  // Single expand/collapse control for the call workspace (History etc.) — toggles one boolean, never shows a
  // second "close" button. Hiding the left Phone column (instead of a position:fixed overlay) means every bit of
  // existing state (tab, filters, search, scroll) is untouched, since it's the same DOM, just more of it on screen.
  wsFullToggle: () => { S.wsFullscreen = !S.wsFullscreen; },
  // Navbar "Dummy Data" switch. The dataset itself (EXTRA_HISTORY, layered on top of the hand-curated
  // CALL_HISTORY_DATA/RECORDINGS/VOICEMAILS — never replaced or mutated, so scenario-linked history like Rohit
  // Sharma / rc9 always keeps working) is built once at page load, deterministically — this switch only shows or
  // hides it via historyData()/visRecordings()/visVoicemails(); it never regenerates anything. Turning it off
  // doesn't delete anything, and clears any open selection that was pointing at a row that just disappeared, so
  // no orphaned detail panel is left showing.
  dummyToggle: () => {
    S.dummyData = !S.dummyData;
    if (S.dummyData) return;
    S.histSel = null;
    if (S.wsSel && (CALL_HISTORY_DATA.some((h) => h.id === S.wsSel) || S.dummyExtraHistory.some((h) => h.id === S.wsSel))) S.wsSel = null;
    if (S.recSel && (S.recordings.find((r) => r.id === S.recSel) || {}).seed) { S.recSel = null; S.recMenu = null; S.recConfirm = null; }
    if (S.vmSel && (S.voicemails.find((v) => v.id === S.vmSel) || {}).seed) vmCloseDetails();
  },
  testInbound: () => triggerSimulatedIncomingCall(),
  answer: () => {
    if (S.incoming && S.activeContact && ['connected', 'on_hold'].includes(S.callState)) { S.incomingChoice = true; S.acceptMode = 'hold'; return; }
    answerIncomingCall();
  },
  // Declining an agent-to-agent test call ends it on the caller's side too, instead of leaving them stuck "ringing"
  // forever — they get a toast the moment they're next active (see pushToast()'s agentId scoping).
  reject: () => {
    if (S.incoming && S.incoming.fromAgentId) {
      agentSessionPatch(S.incoming.fromAgentId, { callState: 'idle', activeContact: null, activeCallId: null, callDuration: 0 });
      pushToast({ kind: 'err', msg: `${PARK_AGENT.name} declined your call.`, agentId: S.incoming.fromAgentId }, 5000);
    }
    S.incoming = null; S.incomingChoice = false; S.incomingMin = false;
  },
  incomingMin: () => { S.incomingMin = true; },
  incomingExpand: () => { S.incomingMin = false; },
  incomingMode: (v) => { if (v !== 'multi') S.acceptMode = v; },
  incomingCancel: () => { S.incomingChoice = false; },
  incomingConfirm: () => {
    if (S.acceptMode === 'end') {
      S.endedFrom = S.callState;
      logEndedCall();
      S.disposition = ''; S.notes = '';
      if (S.heldCalls.length) restoreHeldCall(S.heldCalls[S.heldCalls.length - 1].id);
      else { S.callState = 'idle'; S.activeContact = null; S.activeCallId = null; S.conf = []; S.callDuration = 0; S.activeTab = 'keypad'; }
    }
    S.incomingChoice = false;
    answerIncomingCall();
  },
  clearDial: () => { S.dialNumber = ''; },
  key: (v) => handleKeyPress(v),
  dial: () => startOutboundCall(),
  dirSel: (v) => { const c = (dirSearch(S.dialNumber) || [])[+v]; if (c) S.dirSel = S.dirSel === c.number ? '' : c.number; },
  dirAll: () => { const qn = S.dialNumber.trim().toLowerCase(); S.dirAllQ = S.dirAllQ === qn ? '' : qn; },
  dirCall: (v) => {
    const c = (dirSearch(S.dialNumber) || [])[+v];
    if (!c) return;
    startOutboundCall(c.number, c.contact || { name: c.name, number: c.number, account: 'ACC-' + Math.floor(10000 + Math.random() * 90000), company: c.role, sentiment: 'Neutral' });
  },
  back: () => { S.dialNumber = S.dialNumber.slice(0, -1); },
  wsAi: (v) => { const c = wsCall(); if (c) S.wsAiView = { callId: c.id, kind: v }; },
  wsTrsDismiss: (v) => { S.wsTrsDismissed[v] = true; },
  partSel: (v) => { S.partSel = S.partSel && S.partSel.callId === S.activeCallId && S.partSel.number === v ? null : { callId: S.activeCallId, number: v }; },
  partClose: () => { S.partSel = null; },
  partMute: (v) => { const k = partKey(v); S.partMuted[k] = !S.partMuted[k]; },
  partHold: (v) => { const k = partKey(v); S.partHold[k] = !S.partHold[k]; },
  partRemove: (v) => { removeParticipant(v); },
  mute: () => { S.isMuted = !S.isMuted; },
  hold: () => handleToggleHold(),
  dtmf: () => { if (!S.dtmfOpen) closePanels('dtmf'); S.dtmfOpen = !S.dtmfOpen; },
  closeDtmf: () => { S.dtmfOpen = false; },
  transfer: () => { closePanels('transfer'); S.transferOpen = true; },
  addCall: () => { closePanels('add'); openAddCall(); },
  // doubles as Start (button in the control grid, recording off) and Stop (the popup's Stop button, recording on)
  rec: () => { S.isRecording = !S.isRecording; S.recPaused = false; S.recMenuOpen = false; },
  recMenuToggle: () => { S.recMenuOpen = !S.recMenuOpen; },
  recPauseGo: () => { if (S.isRecording && !S.recPaused) S.recPaused = true; },
  recResume: () => { if (S.isRecording && S.recPaused) S.recPaused = false; },
  park: () => openParkDialog(),
  // Busy/Reserved/In Use/Unavailable slots stay clickable (not `disabled`) so clicking one can explain why, instead
  // of silently doing nothing — matches the "no modal, just a small inline message" requirement.
  parkSlotPick: (v) => {
    if (!S.parkDialog) return;
    const st = parkSlotState(v);
    if (st !== 'available') {
      const who = st === 'in_use' ? (S.slotBusy[v] || {}).agentName : st === 'reserved' ? ((S.parked.find((x) => x.parkId === v) || {}).assignedTo) : null;
      S.parkDialog.slotMsg = st === 'unavailable' ? `Park slot ${v} is not in service.`
        : st === 'in_use' ? `Slot ${v} is currently in use by ${who}.`
        : st === 'reserved' ? `Slot ${v} is reserved for ${who}.`
        : `Slot ${v} is currently busy — another call is already parked here.`;
      return;
    }
    S.parkDialog.slotMsg = '';
    S.parkDialog.slot = S.parkDialog.slot === v ? '' : v;
  },
  parkNotifyToggle: () => { if (S.parkDialog && S.parkDialog.assignTo) S.parkDialog.notifyAssignedOnly = !S.parkDialog.notifyAssignedOnly; },
  // Searchable "Assign to" combobox: picking an agent sets assignTo (and turns notify-only-them on by default,
  // same as before), closes the list and clears the search so the chip card takes over; Clear reopens it.
  parkAssignPick: (v) => {
    if (!S.parkDialog) return;
    const a = AGENTS.find((x) => x.id === v);
    if (!a || a.status === 'offline') return;
    S.parkDialog.assignTo = a.name; S.parkDialog.notifyAssignedOnly = true; S.parkDialog.agentListOpen = false; S.parkDialog.agentQuery = '';
  },
  parkAssignClear: () => { if (S.parkDialog) { S.parkDialog.assignTo = ''; S.parkDialog.notifyAssignedOnly = false; S.parkDialog.agentListOpen = true; } },
  parkAgentListToggle: () => { if (S.parkDialog) S.parkDialog.agentListOpen = !S.parkDialog.agentListOpen; },
  parkRefresh: () => {},
  parkCancel: () => { S.parkDialog = null; },
  parkConfirm: () => parkConfirm(),
  parkCopy: (v) => { if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => {}); pushToast({ kind: 'ok', msg: `Copied ${v}.` }, 2000); },
  parkTake: (v) => { retrieveParked(v); },
  // "View Details" (from a Parked Call Alert toast, or clicking an entry in the "Park Call Assigned to Me" list/
  // single-call case) opens the SAME panel parkConfirm() shows right after you park — mode:'view' instead of
  // 'parked' swaps its header/message/action button for viewing+picking up an existing reservation, rather than
  // building a second details view. Also closes whichever dropdown it was opened from.
  parkViewDetails: (v) => { const e = S.parked.find((x) => x.parkId === v); if (e) S.parkSuccess = { id: e.id, mode: 'view' }; },
  parkDetailOpen: (v) => {
    const e = S.parked.find((x) => x.parkId === v);
    if (e) S.parkSuccess = { id: e.id, mode: 'view' };
    S.scenOpen = false; S.parkAssignedOpen = false; S.agentSwitcherOpen = false; S.asParkAssignedOpen = false;
  },
  // Pick Up Call from the detail panel — same real retrieveParked() as every other pickup entry point.
  parkDetailPickup: (v) => { if (retrieveParked(v)) S.parkSuccess = null; },
  parkSuccessClose: () => { S.parkSuccess = null; },
  parkSuccessGoCall: () => { S.parkSuccess = null; S.activeTab = 'active'; },
  toastClose: (v) => { S.toasts = S.toasts.filter((t) => String(t.id) !== v); },
  simPark: () => simulateColleaguePark(),
  more: () => { S.moreOpen = !S.moreOpen; S.moreAnim = true; },
  copyNum: () => {
    const n = S.activeContact && S.activeContact.number;
    if (!n || !navigator.clipboard) return;
    navigator.clipboard.writeText(n).then(() => { S.copied = true; render(); setTimeout(() => { S.copied = false; render(); }, 1500); }).catch(() => {});
  },
  wsCopyNum: (v) => {
    if (!v || !navigator.clipboard) return;
    navigator.clipboard.writeText(v).then(() => { S.wsCopied = true; render(); setTimeout(() => { S.wsCopied = false; render(); }, 1500); }).catch(() => {});
  },
  // An agent-to-agent test call (S.activeContact.internal) doesn't go through wrap-up disposition — that's a
  // customer-service concept — and ends the OTHER agent's side too, even if they're off-screen right now.
  hangup: () => {
    if (S.activeContact && S.activeContact.internal) {
      const otherId = S.activeContact.fromAgentId, otherName = PARK_AGENT.name, callId = S.activeCallId;
      if (otherId) {
        const otherIncoming = agentSessionGet(otherId, 'incoming');
        if (otherIncoming && otherIncoming.callId === callId) {
          // target hadn't answered yet — cancel their still-ringing notification, don't just leave it dangling
          agentSessionPatch(otherId, { incoming: null });
          pushToast({ kind: 'info', msg: `${otherName} cancelled the call.`, agentId: otherId }, 4000);
        } else if (agentSessionGet(otherId, 'activeCallId') === callId && agentSessionGet(otherId, 'callState') !== 'idle') {
          agentSessionPatch(otherId, { callState: 'idle', activeContact: null, activeCallId: null, callDuration: 0 });
          pushToast({ kind: 'info', msg: `Call with ${otherName} ended.`, agentId: otherId }, 4000);
        }
      }
      S.callState = 'idle'; S.activeContact = null; S.activeCallId = null; S.conf = []; S.callDuration = 0; S.isOnHold = false; S.floatMin = false;
      return;
    }
    // The call is genuinely over the moment Hang Up is pressed — wrap-up is just disposition/notes on an already-
    // ended call, so the park slot (if this call was picked up from one) releases right here, not at Submit, since
    // an abandoned/never-submitted wrap-up must not leave the slot locked forever.
    releaseParkSlot(S.activeParkSlot, S.activeCallId);
    S.activeParkSlot = null;
    S.endedFrom = S.callState; S.callState = 'wrap_up'; S.floatMin = false;
  },
  floatMin: () => { S.floatMin = true; S.floatMore = false; S.floatBig = false; },
  floatMore: () => { S.floatMore = !S.floatMore; },
  floatPanel: (v) => { S.floatPanel = v; S.floatMin = false; },
  floatExpand: () => { S.floatMin = false; S.floatMore = false; },
  floatBig: () => { S.floatBig = !S.floatBig; },
  floatGoto: () => { S.nav = 'phone'; S.activeTab = 'active'; },
  floatTool: (v) => { S.nav = 'phone'; S.activeTab = 'active'; A[v](); },
  swap: (v) => swapHeldCall(v),
  mergeAll: () => mergeAllHeldCalls(),
  endHeld: (v) => endHeldCall(v),
  endAll: () => { S.heldCalls.forEach((c) => releaseParkSlot(c.parkSlot, c.id)); S.heldCalls = []; A.hangup(); },
  wrapDone: () => submitWrapUp(),
  // "Close" finishes wrap-up the same real way Submit does — a disposition is required (the app's actual business
  // rule; the button is disabled with a tooltip until one is chosen, same idiom as Merge Calls / Contacts Add elsewhere).
  wrapClose: () => {
    if (!S.disposition) return;
    if (wrapHasUnsaved()) { S.wrapUnsaved = 'close'; return; }
    submitWrapUp();
  },
  wrapUnsavedKeep: () => { S.wrapUnsaved = null; },
  wrapUnsavedDiscard: () => {
    const act = S.wrapUnsaved;
    S.wrapUnsaved = null;
    S.wrapNotesOpen = false; S.wrapNoteDraft = '';
    S.wrapCallbackOpen = false; S.wrapCallbackAt = ''; S.wrapCallbackError = '';
    if (act === 'close') submitWrapUp();
  },
  wrapClearAsk: () => { S.wrapClearConfirm = true; },
  wrapClearNo: () => { S.wrapClearConfirm = false; },
  wrapClearDo: () => clearAllSessions(),
  wrapCallAgain: () => {
    const c = S.activeContact;
    if (!c) return;
    callBackTo(c.number, { name: c.name, number: c.number, account: c.account, company: c.company, sentiment: c.sentiment });
  },
  wrapToggleCallback: () => {
    S.wrapCallbackOpen = !S.wrapCallbackOpen;
    if (S.wrapCallbackOpen) { S.wrapCallbackError = ''; S.wrapCallbackFail = false; S.wrapNotesOpen = false; }
  },
  wrapCallbackOwner: (v) => { S.wrapCallbackOwner = v; },
  wrapCallbackCancel: () => { S.wrapCallbackOpen = false; S.wrapCallbackAt = ''; S.wrapCallbackError = ''; S.wrapCallbackFail = false; },
  wrapCallbackSave: () => {
    if (S.wrapCallbackSaving) return; // guards against a double-click firing two saves
    const c = S.activeContact;
    if (!c || !S.activeCallId) return;
    if (!S.wrapCallbackAt) { S.wrapCallbackError = 'Please select a date and time.'; return; }
    const when = new Date(S.wrapCallbackAt);
    if (isNaN(when.getTime()) || when.getTime() <= Date.now()) { S.wrapCallbackError = 'Please select a future date and time.'; return; }
    S.wrapCallbackError = ''; S.wrapCallbackFail = false; S.wrapCallbackSaving = true;
    const id = S.activeCallId, owner = S.wrapCallbackOwner, at = when.getTime(), contactName = c.name, number = c.number;
    setTimeout(() => {
      S.wrapCallbackSaving = false;
      try {
        S.callbacks = { ...S.callbacks, [id]: { at, owner, contactName, number, createdAt: Date.now() } };
        persistCallbacks();
        if (typeof linkCallbackSaved === 'function') linkCallbackSaved(id, S.callbacks[id]);
        S.wrapCallbackOpen = false; S.wrapCallbackAt = '';
        pushToast({ kind: 'ok', msg: `Callback scheduled for ${fmtWhen(new Date(at))}.` }, 3500);
      } catch (e) {
        S.wrapCallbackFail = true; // real failure path: localStorage unavailable (private browsing, quota, etc.)
      }
      render();
    }, 500);
  },
  wrapToggleNotes: () => {
    S.wrapNotesOpen = !S.wrapNotesOpen;
    if (S.wrapNotesOpen) { S.wrapCallbackOpen = false; } else { S.wrapNoteDraft = ''; }
  },
  wrapNotesCancel: () => { S.wrapNotesOpen = false; S.wrapNoteDraft = ''; },
  // Saves directly against the ended call (S.activeCallId), independent of wsCall()'s current workspace selection —
  // the wrap-up screen is always about THIS call, even if the agent has a different call selected on the right panel.
  // Uses its own draft (S.wrapNoteDraft), never S.wsNoteDraft, so this textarea can't collide with the Notes tab's.
  wrapNoteSave: () => {
    const id = S.activeCallId, text = S.wrapNoteDraft.trim();
    if (!id || !text) return;
    S.callNotes[id] = [{ id: rid(), text, author: PARK_AGENT.name, ts: Date.now(), callId: id, contact: (S.activeContact || {}).number }, ...(S.callNotes[id] || [])];
    persistNotes();
    pushToast({ kind: 'ok', msg: 'Note saved.' }, 2500);
    S.wrapNotesOpen = false; S.wrapNoteDraft = '';
  },
  gotoKeypad: () => { S.activeTab = 'keypad'; },
  histFilter: (v) => { S.histFilter = v; },
  // Clicking a contact in the History list never opens a detail card here — it only highlights the row and
  // switches the right workspace to this contact's deep History (Contact Summary, Voicemails, Recordings,
  // Interaction History). The right side is the one and only detail workspace.
  histSelect: (v) => { S.histSel = v; wsSelectId(v); S.activePanel = 'History'; },
  histCall: (v) => { const c = historyData().find((h) => h.id === v); if (c) startOutboundCall(c.number, c); },
  // Jumps the right workspace's Voicemails/Recordings sidebar to the real Transcript viewer for that item
  // (Recordings/Voicemails are their own top-level tabs with their own workspace, reused as-is, not duplicated).
  mediaTr: (v) => {
    const r = recById(v);
    if (!r || !r.tr) return;
    if (r.kind === 'vm') { S.activeTab = 'voicemails'; vmSelectId(v); S.vmTab = 'Transcript'; }
    else { S.activeTab = 'recordings'; recSelectId(v); S.activePanel = 'Transcript'; }
  },
  addContact: () => {
    const c = historyData().find((h) => h.id === S.histSel);
    if (c) saveContact(c.name, c.number);
  },
  panel: (v) => { S.activePanel = v; },
  wsSelect: (v) => { wsSelectId(v); },
  wsHistPlay: (v) => { wsSelectId(v); S.activePanel = 'Transcript'; S.floatPanel = 'Transcript'; },
  // Expanding an Interaction History row also selects the matching record in the Column 1 History list (when one
  // exists for this contact/number), so both columns stay synchronized in either direction — never just left-to-right.
  wsHistToggle: (v) => {
    S.wsHistOpen[v] = !S.wsHistOpen[v];
    if (S.wsHistOpen[v]) S.histSel = historyData().some((h) => h.id === v) ? v : S.histSel;
  },
  wsDial: () => { const c = wsCall(); if (c) callBackTo(c.number, { name: c.name, number: c.number, account: (c.contact && c.contact.account) || `ACC-${Math.floor(10000 + Math.random() * 90000)}`, company: (c.contact && c.contact.company) || '', sentiment: c.sentiment || 'Neutral' }); },
  wsHistClear: () => { S.wsHistSearch = ''; S.wsHistStatus = 'all'; S.wsHistDir = 'all'; S.histDateFilter = 'all'; },
  wshMediaTab: (v) => { S.wshMediaTab = v; },
  wsGoNotes: () => { S.activePanel = 'Notes'; },
  wsNoteSave: () => {
    const c = wsCall(), text = S.wsNoteDraft.trim();
    if (!c || !text) return;
    const list = S.callNotes[c.id] || [];
    S.callNotes[c.id] = S.wsNoteEdit ? list.map((n) => (n.id === S.wsNoteEdit ? { ...n, text, edited: Date.now() } : n))
      : [{ id: rid(), text, author: PARK_AGENT.name, ts: Date.now(), callId: c.id, contact: c.number }, ...list];
    persistNotes();
    pushToast({ kind: 'ok', msg: S.wsNoteEdit ? 'Note updated.' : 'Note saved.' }, 2500);
    S.wsNoteDraft = ''; S.wsNoteEdit = null;
  },
  wsNoteEdit: (v) => { const c = wsCall(), n = c && (S.callNotes[c.id] || []).find((x) => x.id === v); if (n) { S.wsNoteEdit = v; S.wsNoteDraft = n.text; S.focusNote = true; } },
  wsFmt: (k) => {
    const t = document.querySelector('[data-k=wsnote]'), v = S.wsNoteDraft; if (!t) return;
    const a = t.selectionStart, b = t.selectionEnd; let out, ca, cb;
    if (k === 'ul' || k === 'ol') {
      const ls = v.lastIndexOf('\n', a - 1) + 1, e = v.indexOf('\n', b), le = e < 0 ? v.length : e;
      const lines = v.slice(ls, le).split('\n').map((x, i) => (k === 'ul' ? (/^- /.test(x) ? x : `- ${x}`) : (/^\d+\. /.test(x) ? x : `${i + 1}. ${x}`))).join('\n');
      out = v.slice(0, ls) + lines + v.slice(le); ca = cb = ls + lines.length;
    } else {
      const m = { b: '**', i: '*', u: '++' }[k];
      out = v.slice(0, a) + m + v.slice(a, b) + m + v.slice(b); ca = a + m.length; cb = b + m.length;
    }
    S.wsNoteDraft = out; S.noteCaret = [ca, cb]; S.focusNote = true;
  },
  wsNoteCancel: () => { S.wsNoteEdit = null; S.wsNoteDraft = ''; },
  wsNoteDel: (v) => { const c = wsCall(); if (!c) return; S.callNotes[c.id] = (S.callNotes[c.id] || []).filter((n) => n.id !== v); persistNotes(); if (S.wsNoteEdit === v) { S.wsNoteEdit = null; S.wsNoteDraft = ''; } pushToast({ kind: 'ok', msg: 'Note deleted.' }, 2500); },
  wsActToggle: (v) => { const c = wsCall(); if (c) { const s = wsSummary(c.id); s.actions = s.actions.map((a) => (a.id === v ? { ...a, done: !a.done } : a)); } },
  wsActDel: (v) => { const c = wsCall(); if (c) { const s = wsSummary(c.id); s.actions = s.actions.filter((a) => a.id !== v); } },
  wsSaveSummary: () => { const c = wsCall(); if (!c) return; const s = wsSummary(c.id); s.outcome = s.draft ?? s.outcome; s.draft = null; pushToast({ kind: 'ok', msg: 'Summary saved.' }, 2500); },
  wsAddOpen: () => {
    const c = wsCall(); if (!c) return;
    const ct = contactFor(c.number), editingSaved = ct && !ct.ext; // DIRECTORY (internal extension) contacts are never editable
    const [first, ...rest] = editingSaved ? ct.name.split(' ') : (c.name !== c.number && !/^\d/.test(c.name) ? [c.name] : ['']);
    S.wsAdd = true; S.wsNewName = first || ''; S.wsLast = rest.join(' '); S.wsEmail = editingSaved ? ct.email : ''; S.wsCompany = editingSaved ? ct.company : ''; S.wsTier = (editingSaved && ct.tags) || 'Standard';
    S.wsQueue = editingSaved ? ct.queue : ''; S.wsCampaign = editingSaved ? ct.campaign : ''; S.wsMoreDetails = false;
    S.focusNew = true;
  },
  wsAddCancel: () => { S.wsAdd = false; },
  wsMoreDetails: () => { S.wsMoreDetails = !S.wsMoreDetails; },
  wsAddSave: () => {
    const c = wsCall();
    if (!c) return;
    const existed = !!contactFor(c.number);
    if (upsertContact(c.number, { first: S.wsNewName, last: S.wsLast, email: S.wsEmail, company: S.wsCompany, tier: S.wsTier, queue: S.wsQueue, campaign: S.wsCampaign })) {
      S.wsAdd = false; pushToast({ kind: 'ok', msg: existed ? 'Contact updated.' : 'Contact added.' }, 2500);
    } else toastErr('First name is required.');
  },
  chips: (v) => { S.chipsOpen[v] = !S.chipsOpen[v]; },
  // tools
  dtmfDigit: (v) => { S.dtmfDigits += v; handleKeyPress(v, false); },
  dtmfClear: () => { S.dtmfDigits = ''; },
  dtmfBack: () => { S.dtmfDigits = S.dtmfDigits.slice(0, -1); },
  cancelAdd: () => cancelAddCall(),
  addUse: (v) => { S.newCallNumber = v; S.focusAdd = true; },
  addPad: () => { S.addPadOpen = !S.addPadOpen; },
  addKey: (v) => { S.newCallNumber += v; handleKeyPress(v, false); },
  addAllRecent: () => { S.addRecentAll = !S.addRecentAll; },
  addAllContacts: () => { S.addContactsAll = !S.addContactsAll; },
  addStatusToggle: () => { S.addStatusOpen = !S.addStatusOpen; },
  addStatusFilter: (v) => { S.addStatusFilter = v; S.addStatusOpen = false; S.addContactsAll = false; },
  addStatusClear: () => { S.addStatusFilter = 'all'; S.addStatusOpen = false; },
  addPerson: (v) => {
    const c = addContacts().find((x) => x.number === v);
    if (!c || callLegNumbers().has(c.number) || addLegs() >= MAX_LEGS) return;
    addCallLeg(c.number, c.info ? { ...c.info, account: `ACC-${Math.floor(10000 + Math.random() * 90000)}` } : null);
    cancelAddCallUi();
  },
  closeTransferBtn: () => closeTransfer(),
  srcPick: (v) => { S.transferSourceId = v; },
  mode: (v) => { S.transferMode = v; },
  target: (v) => { S.transferTarget = v; },
  tContinue: () => setTransferStage('confirm'),
  tBack: () => setTransferStage('search'),
  tConfirm: () => {
    if (S.transferMode === 'Blind') completeTransfer();
    else { beginWarmConsult(S.transferSourceId); setTransferStage('consulting'); }
  },
  tCancelConsult: () => { cancelWarmConsult(S.transferSourceId); setTransferStage('search'); },
  tComplete: () => completeTransfer(),
  contactAdd: (v) => {
    if (S.contactsAdded[v]) return;
    const c = DIRECTORY.find((x) => x.ext === v);
    S.contactsAdded = { ...S.contactsAdded, [v]: true };
    persistContactsAdded();
    pushToast({ kind: 'ok', msg: `${c ? c.name : 'Contact'} added to your list.` }, 2500);
  },
  contactsFilterToggle: () => { S.contactsFilterOpen = !S.contactsFilterOpen; },
  contactsFilter: (v) => { S.contactsFilter = v; S.contactsFilterOpen = false; },
  contactsViewAll: () => { S.contactsFilter = 'all'; S.contactsSearch = ''; }
};
/* ---- Scenario picker: preset call sessions written into S with the same fields the real telephony actions use ---- */
const SC_PEOPLE = [
  { name: 'Rohit Sharma', number: '+91 98765 43210', account: 'ACC-71001', company: 'Tata Consultancy', sentiment: 'Positive' },
  { name: 'Priya Nair', number: '+91 99887 77665', account: 'ACC-71002', company: 'Infosys', sentiment: 'Neutral' },
  { name: 'Amit Verma', number: '+91 91234 56780', account: 'ACC-71003', company: 'Wipro', sentiment: 'Positive' },
  { name: 'Sarah Wilson', number: '+1 (415) 555-0132', account: 'ACC-71004', company: 'Northwind Traders', sentiment: 'Needs Support' },
  { name: 'Kenji Tanaka', number: '+81 90 1234 5678', account: 'ACC-71005', company: 'Sakura Systems', sentiment: 'Neutral' },
  { name: 'Elena Rossi', number: '+39 333 123 4567', account: 'ACC-71006', company: 'Milano Retail', sentiment: 'Positive' }
];
const scHeld = (i, secs) => ({ id: `scn-held-${i}`, contact: { ...SC_PEOPLE[i] }, seconds: secs, muted: false, recording: true, recSecs: secs, participants: [] });
const SC_ACTIVE = { callState: 'connected', activeContact: SC_PEOPLE[0], activeCallId: 'scn-active', heldCalls: [], conf: [], incoming: null, callDuration: 272, isRecording: true, recSecs: 272, isOnHold: false };
const SC_INBOUND = { name: 'Vikram Singh', number: '+91 98111 22334', company: 'Apex Holdings', account: 'ACC-88192', sentiment: 'Needs Support' };
const SCENARIO_DATA = {
  empty: { callState: 'idle', activeContact: null, activeCallId: null, heldCalls: [], conf: [], incoming: null, callDuration: 0, isRecording: false, recSecs: 0, isOnHold: false },
  single: { ...SC_ACTIVE },
  multi2: { ...SC_ACTIVE, heldCalls: [scHeld(1, 95)] },
  multi3: { ...SC_ACTIVE, heldCalls: [scHeld(1, 95), scHeld(2, 180)] },
  multi4: { ...SC_ACTIVE, heldCalls: [scHeld(1, 95), scHeld(2, 180), scHeld(3, 44)] },
  multi5: { ...SC_ACTIVE, heldCalls: [scHeld(1, 95), scHeld(2, 180), scHeld(3, 44), scHeld(4, 310)] },
  incomingOnly: { callState: 'idle', activeContact: null, activeCallId: null, heldCalls: [], conf: [], incoming: SC_INBOUND, callDuration: 0, isRecording: false, recSecs: 0, isOnHold: false },
  incoming: { ...SC_ACTIVE, callState: 'on_hold', isOnHold: true, heldCalls: [scHeld(1, 95)], incoming: SC_INBOUND },
  incomingMax: { ...SC_ACTIVE, callState: 'on_hold', isOnHold: true, heldCalls: [scHeld(1, 95), scHeld(2, 180), scHeld(3, 44)], incoming: SC_INBOUND },
  conference3: { ...SC_ACTIVE, conf: [SC_PEOPLE[1], SC_PEOPLE[2]] },
  conference5: { ...SC_ACTIVE, conf: [SC_PEOPLE[1], SC_PEOPLE[2], SC_PEOPLE[3], SC_PEOPLE[4]] }
};
const SCEN_GROUPS = [
  ['Active calls', [['single', '1 · Single Ongoing'], ['multi2', '2 · Multi-call'], ['multi3', '3 · Multi-call'], ['multi4', '4 · Multi-call'], ['multi5', '5 · Multi-call (Max)']]],
  ['Inbound', [['incomingOnly', 'Incoming'], ['incoming', 'Inbound + 2'], ['incomingMax', 'Inbound + 4']]],
  ['Conference', [['conference3', 'Conference · 3'], ['conference5', 'Conference · 5']]],
  ['Other', [['empty', 'Idle']]]
];
function loadScenario(key) {
  const src = SCENARIO_DATA[key];
  if (!src) { toastErr('Unknown scenario.'); return; }
  // "Incoming" triggered while a real call is already live (connected/on_hold): ring a second caller on top of it
  // instead of wiping the live call with the preset, so the existing call is genuinely preserved, not re-simulated.
  if (key === 'incomingOnly' && S.activeContact && (S.callState === 'connected' || S.callState === 'on_hold') && !S.incoming) {
    S.incoming = structuredClone(SC_INBOUND);
    S.incomingMin = false; S.incomingChoice = false;
    return;
  }
  const d = { ...SCENARIO_DATA.empty, ...structuredClone(src) };
  if (!Array.isArray(d.heldCalls)) d.heldCalls = [];
  if (!Array.isArray(d.conf)) d.conf = [];
  if (AUDIO && !AUDIO.paused) AUDIO.pause();
  Object.assign(S, {
    callState: d.callState, activeContact: d.activeContact, activeCallId: d.activeCallId, heldCalls: d.heldCalls, conf: d.conf, incoming: d.incoming,
    callDuration: d.callDuration, isRecording: d.isRecording, recSecs: d.recSecs, recPaused: false, recMenuOpen: false, isOnHold: d.isOnHold, isMuted: false,
    callType: d.incoming ? 'inbound' : 'outbound', disposition: '', notes: '',
    dtmfOpen: false, transferOpen: false, addCallOpen: false, moreOpen: false, moreAnim: false, newCallNumber: '', dtmfDigits: '',
    addPadOpen: false, addRecentAll: false, addContactsAll: false, addStatusFilter: 'all', addStatusOpen: false, transferQuery: '', transferTarget: '', transferStage: 'search', transferSourceId: '',
    activeTab: d.callState === 'idle' ? 'keypad' : 'active', scenName: key, wsSel: null, wsAnchor: null, partSel: null, partMuted: {}, partHold: {}, partJoin: {}, partSeen: {}, wsAiView: null,
    incomingMin: false, incomingChoice: false,
    wrapCallbackOpen: false, wrapCallbackAt: '', wrapCallbackError: '', wrapCallbackSaving: false, wrapCallbackFail: false, wrapNotesOpen: false, wrapNoteDraft: '', wrapClearConfirm: false, wrapUnsaved: null
  });
  clearTimeout(T.consult);
}
// label shown in the picker trigger, derived from live call state only
// during wrap-up the foreground call has already ended, so it no longer counts as a leg
const scenLegs = () => addLegs() - (S.callState === 'wrap_up' ? 1 + S.conf.length : 0);
function scenLabel() {
  if ((S.callState === 'idle' || scenLegs() === 0) && !S.incoming) return 'IDLE';
  if (S.callState !== 'wrap_up' && S.conf.length > 0) return `CONFERENCE · ${S.conf.length + 1}`;
  if (S.incoming && S.callState !== 'connected') return S.heldCalls.length === 0 ? 'INCOMING' : `INBOUND · ${1 + S.heldCalls.length}`;
  const n = scenLegs();
  if (n === 1) return '1 · SINGLE ONGOING';
  return n >= MAX_LEGS ? `${n} · MULTI-CALL (MAX)` : `${n} · MULTI-CALL`;
}
// scenario key that matches the live state (null when the state is not one of the presets), used to mark the current option
function scenKey() {
  if ((S.callState === 'idle' || scenLegs() === 0) && !S.incoming) return 'empty';
  if (S.callState !== 'wrap_up' && S.conf.length > 0) return ({ 2: 'conference3', 4: 'conference5' })[S.conf.length] || null;
  if (S.incoming && S.callState !== 'connected') return ({ 0: 'incomingOnly', 1: 'incoming', 3: 'incomingMax' })[S.heldCalls.length] || null;
  const n = scenLegs();
  return n === 1 ? 'single' : n <= MAX_LEGS ? `multi${n}` : null;
}

const I = {
  recSearch: (v) => { S.recSearch = v; },
  contactsSearch: (v) => { S.contactsSearch = v; },
  agentSwitcherQuery: (v) => { S.agentSwitcherQuery = v; },
  wsNote: (v) => { S.wsNoteDraft = v; },
  wsActIn: (v) => { S.wsActDraft = v; },
  wsNewName: (v) => { S.wsNewName = v; },
  wsLast: (v) => { S.wsLast = v; },
  wsEmail: (v) => { S.wsEmail = v; },
  wsCompany: (v) => { S.wsCompany = v; },
  wsTier: (v) => { S.wsTier = v; },
  wsQueue: (v) => { S.wsQueue = v; },
  wsCampaign: (v) => { S.wsCampaign = v; },
  parkSlot: (v) => { if (S.parkDialog) S.parkDialog.slot = v; },
  parkAgentQuery: (v) => { if (S.parkDialog) { S.parkDialog.agentQuery = v; S.parkDialog.agentListOpen = true; } },
  wsOutcome: (v) => { const c = wsCall(); if (c) wsSummary(c.id).draft = v; },
  vmSearch: (v) => { S.vmSearch = v; vmEnsureSel(); },
  vmNote: (v) => { if (S.vmSel) S.vmDraft.n[S.vmSel] = v; },
  histVmNote: (v) => { S.histVmDraft = v; },
  histVmAssign: (v) => {
    const id = S.histVmOpen, it = id && recById(id);
    if (!it) return;
    if (!vmCanAssign(v || null)) { toastErr('Unable to update assignment.'); return; }
    vmUpdate(id, { assignedTo: v || null });
  },
  vmFollow: (v) => { if (S.vmSel) S.vmDraft.f[S.vmSel] = v; },
  vmAssign: (v) => {
    const it = curItem(), who = v || null;
    if (!it) return;
    if (!vmCanAssign(who)) { toastErr('Unable to update assignment.'); return; }
    vmUpdate(it.id, { assignedTo: who });
    pushToast({ kind: 'ok', msg: who ? `Assigned to ${who}.` : 'Voicemail unassigned.' }, 2500);
    vmEnsureSel();
  },
  recTq: (v) => { S.recTq = v; S.recTqIdx = 0; },
  recNote: (v) => { if (S.recSel) S.recNotes[S.recSel] = v; },
  recActIn: (v) => { S.recActDraft = v; },
  recRate: (v) => { S.recRate = +v; AUDIO.playbackRate = S.recRate; },
  dial: (v) => { S.dialNumber = v; },
  disposition: (v) => { S.disposition = v; },
  notes: (v) => { S.notes = v; },
  wrapCallbackAt: (v) => { S.wrapCallbackAt = v; S.wrapCallbackError = ''; S.wrapCallbackFail = false; },
  wrapNoteDraft: (v) => { S.wrapNoteDraft = v; },
  histSearch: (v) => { S.histSearch = v; },
  histDateFilter: (v) => { S.histDateFilter = v; },
  wsHistSearch: (v) => { S.wsHistSearch = v; },
  wsHistStatus: (v) => { S.wsHistStatus = v; },
  wsHistDir: (v) => { S.wsHistDir = v; },
  newCall: (v) => { S.newCallNumber = v; },
  tq: (v) => { S.transferQuery = v; },
  question: (v) => { S.question = v; },
  scen: (v) => { loadScenario(v); }
};
const F = {
  wsAct: () => {
    const c = wsCall(), text = S.wsActDraft.trim();
    if (!c || !text) return;
    const s = wsSummary(c.id);
    s.actions = [...s.actions, { id: rid(), text, done: false }];
    S.wsActDraft = '';
  },
  wsAddSave: () => { A.wsAddSave(); },
  recAct: () => {
    const text = S.recActDraft.trim();
    if (!text || !S.recSel) return;
    S.recActions[S.recSel] = [...(S.recActions[S.recSel] || []), { id: rid(), text, done: false }];
    S.recActDraft = '';
  },
  addCall: () => {
    const number = S.newCallNumber.trim();
    if (isParkRetrievalCode(number)) { if (retrieveParked(number)) cancelAddCallUi(); return; }
    if (!/^[+*#\d\s().-]+$/.test(number) || !/\d/.test(number) || addLegs() >= MAX_LEGS) return;
    addCallLeg(number);
    S.newCallNumber = '';
    S.addCallOpen = false; S.addPadOpen = false; S.addRecentAll = false; S.addContactsAll = false; S.addStatusFilter = 'all'; S.addStatusOpen = false;
  },
  ask: () => {
    const c = wsCall(), q = S.question.trim();
    if (!c || !q) return;
    (S.wsChat[c.id] = S.wsChat[c.id] || []).push({ q, a: 'AI is unavailable: no AI service is connected to this demo, so Copilot cannot answer questions about this call.' });
    S.question = ''; S.activePanel = 'Copilot';
  }
};

/* ============================== Views ============================== */
function chipsView(people, compact, key) {
  const members = (people || []).filter(Boolean);
  if (!members.length) return '';
  const c = compact ? ' compact' : '';
  const expanded = !!S.chipsOpen[key];
  if (members.length > 2 && !expanded) {
    return `<button type="button" class="chip-btn${c}" data-a="chips" data-v="${esc(key)}" title="Show all: ${esc(members.map(personName).join(', '))}" aria-label="Show all ${members.length} conference participants">
      <span class="stack-av">${members.slice(0, 3).map((p) => `<span class="ini a20">${esc(initials(p))}</span>`).join('')}</span>
      <span class="truncate">${members.length} people in call</span>
      <span class="show">Show names ${ic('chevDown', 12)}</span></button>`;
  }
  return `<div class="chips${c}">
    <div class="chips-row" aria-label="People in this call">
      ${members.map((p) => `<span class="chip${c}" title="${esc(personName(p))}"><span class="ini">${esc(initials(p))}</span><span class="truncate">${esc(personName(p))}</span></span>`).join('')}
    </div>
    ${members.length > 2 ? `<button type="button" class="hide-names" data-a="chips" data-v="${esc(key)}">Hide names ${ic('chevUp', 12)}</button>` : ''}
  </div>`;
}

// selectable participants of the active conference, with a compact action popup for the selected one
function partChips() {
  const people = [S.activeContact, ...S.conf].filter(Boolean);
  const sel = S.partSel && S.partSel.callId === S.activeCallId ? S.partSel.number : null;
  const chip = (p) => {
    const k = partKey(p.number), on = sel === p.number;
    return `<button type="button" role="listitem" class="chip part${on ? ' on' : ''}" data-a="partSel" data-v="${esc(p.number)}" aria-pressed="${on}" title="${esc(personName(p))}"><span class="ini">${esc(initials(p))}</span><span class="truncate">${esc(personName(p))}</span>${S.partMuted[k] ? ic('micOff', 12) : ''}${S.partHold[k] ? ic('pause', 12) : ''}</button>`;
  };
  const p = sel && people.find((x) => x.number === sel), k = p && partKey(p.number), ct = p && contactFor(p.number), jn = p && S.partJoin[k];
  const pop = p ? `<div class="part-pop" role="dialog" aria-label="Participant actions for ${esc(personName(p))}">
      <div class="pp-h"><span class="ini" style="${pastel(personName(p))}">${esc(initials(p))}</span><div><b class="truncate">${esc(personName(p))}</b><span class="truncate">${[ct && ct.ext ? esc(ct.ext) : esc(p.number), ct && ct.ext ? esc(ct.sub) : '', jn ? new Date(jn.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '', jn ? `<span class="mono js-part-dur" data-off="${jn.off}">${formatTime(Math.max(0, S.callDuration - jn.off))}</span>` : ''].filter(Boolean).join(' &middot; ')}</span></div>
        <button type="button" class="rec-b" data-a="partClose" title="Close" aria-label="Close participant actions">${ic('x', 14)}</button></div>
      <div class="rec-btns"><button type="button" class="rec-sec sm${S.partMuted[k] ? ' pon' : ''}" data-a="partMute" data-v="${esc(p.number)}" aria-pressed="${!!S.partMuted[k]}">${ic(S.partMuted[k] ? 'micOff' : 'mic', 14)}<span>${S.partMuted[k] ? 'Unmute' : 'Mute'}</span></button>
        <button type="button" class="rec-sec sm${S.partHold[k] ? ' pon' : ''}" data-a="partHold" data-v="${esc(p.number)}" aria-pressed="${!!S.partHold[k]}">${ic(S.partHold[k] ? 'play' : 'pause', 14)}<span>${S.partHold[k] ? 'Resume' : 'Hold'}</span></button>
        <button type="button" class="rec-sec sm danger" data-a="partRemove" data-v="${esc(p.number)}">${ic('phoneOff', 14)}<span>Remove</span></button></div></div>` : '';
  return `<div class="conf-box"><div class="h">People in this call (${people.length})</div><div class="chips-row part-row" role="list" aria-label="People in this call">${people.map(chip).join('')}</div>${pop}</div>`;
}

const NAV_ITEMS = [['home', 'Home'], ['phone', 'Phone'], ['chat', 'Chat'], ['agent', 'Agent'], ['video', 'Video'], ['inbox', 'Inbox'], ['contact', 'Contact'], ['dept', 'Dept'], ['campaign', 'Campaign'], ['reports', 'Reports']];

const agentStatLabel = (st) => (st === 'online' ? 'Online' : st === 'busy' ? 'Busy' : 'Offline');
// True while `agent` (anyone, not just the one on screen) has a live call — reads their own frozen session when
// they're not currently active, so "In Call" stays correct for every agent regardless of who's being viewed.
const agentHasLiveCall = (agent) => ['ringing', 'connected', 'on_hold'].includes(agentSessionGet(agent.id, 'callState'));
// One status badge everywhere an agent is shown: a real call always wins ("In Call"), then their baseline
// online/busy/offline — "Idle" (vs "Online") only distinguishes the agent currently on screen, matching the
// reference design where the active agent's own badge reads differently from everyone else's.
function agentStatusInfo(agent) {
  if (agentHasLiveCall(agent)) return { cls: 'busy', label: 'In Call' };
  if (agent.status === 'offline') return { cls: 'offline', label: 'Offline' };
  if (agent.status === 'busy') return { cls: 'busy', label: 'Busy' };
  return { cls: 'online', label: agent.id === PARK_AGENT.id ? 'Idle' : 'Online' };
}
// Navbar Active Agent switcher: picking a row reassigns PARK_AGENT (see switchActiveAgent()) so the whole app —
// RBAC, Call Park ownership/notifications, call attribution, the header — follows without a second state system.
function agentSwitcherView() {
  const cur = PARK_AGENT, curInfo = agentStatusInfo(cur);
  return `<div class="as-wrap${S.agentSwitcherOpen ? ' open' : ''}">
    <button type="button" class="as-trigger" data-a="agentSwitcherToggle" aria-haspopup="listbox" aria-expanded="${S.agentSwitcherOpen}" aria-label="Active agent: ${esc(cur.name)}, ${curInfo.label}">
      <span class="as-av" style="${pastel(cur.name)}">${esc(initials({ name: cur.name }))}<span class="as-dot ${curInfo.cls}"></span></span>
      <span class="as-nm">${esc(cur.name)}</span>${ic('chevDown', 12, 'as-chev')}
    </button>
    ${S.agentSwitcherOpen ? agentSwitcherPanel() : ''}
  </div>`;
}
function agentSwitcherPanel() {
  if (S.asParkAssignedOpen) return parkAssignedPanel('asParkAssignedClose', 'asParkAssignedTake');
  const q = S.agentSwitcherQuery.trim().toLowerCase();
  const others = AGENTS.filter((a) => a.id !== PARK_AGENT.id && (!q || a.name.toLowerCase().includes(q) || a.ext.includes(q)));
  const row = (a) => {
    const si = agentStatusInfo(a), canCall = a.status !== 'offline' && S.callState === 'idle';
    return `<div class="as-row${a.status === 'offline' ? ' as-dis' : ''}" role="option" aria-selected="false">
      <button type="button" class="as-rowbtn" data-a="agentSwitchPick" data-v="${a.id}" ${a.status === 'offline' ? 'disabled' : ''} title="${a.status === 'offline' ? `${esc(a.name)} is offline and can't be selected right now.` : `Switch to ${esc(a.name)}`}">
        <span class="as-av" style="${pastel(a.name)}">${esc(initials({ name: a.name }))}<span class="as-dot ${si.cls}"></span></span>
        <div class="as-info"><b class="truncate">${esc(a.name)}</b><span>${esc(roleLabel(a.role))} &middot; ${esc(a.ext)}</span></div>
      </button>
      <span class="as-stat ${si.cls}">${si.label}</span>
      ${canCall ? `<button type="button" class="as-call" data-a="agentCallPick" data-v="${a.id}" title="Call ${esc(a.name)} (${esc(a.ext)})" aria-label="Call ${esc(a.name)}">${ic('phone', 13)}</button>` : ''}
    </div>`;
  };
  const curInfo = agentStatusInfo(PARK_AGENT);
  return `<div class="as-panel" role="listbox" aria-label="Switch active agent">
    <label class="as-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input type="text" data-k="asq" data-i="agentSwitcherQuery" value="${esc(S.agentSwitcherQuery)}" placeholder="Search agent by name or extension..." autocomplete="off" /></label>
    <div class="as-list">
      <div class="as-grp">Current agent</div>
      <div class="as-row as-cur" role="option" aria-selected="true">
        <span class="as-av" style="${pastel(PARK_AGENT.name)}">${esc(initials({ name: PARK_AGENT.name }))}<span class="as-dot ${curInfo.cls}"></span></span>
        <div class="as-info"><b class="truncate">${esc(PARK_AGENT.name)}</b><span>${esc(roleLabel(PARK_AGENT.role))} &middot; ${esc(PARK_AGENT.ext)}</span></div>
        ${ic('check', 14, 'as-ck')}</div>
      <div class="as-grp">Parked Calls</div>
      <button type="button" class="as-row as-pka-row" data-a="asParkAssignedToggle">
        <span class="as-pka-ic">${ic('phone', 13)}</span>
        <div class="as-info"><b>Park Call Assigned to Me</b></div>
        ${myAssignedParkedCalls().length ? `<span class="pk-n">${myAssignedParkedCalls().length}</span>` : ''}
      </button>
      ${others.length ? `<div class="as-grp">Other agents</div>${others.map(row).join('')}` : `<div class="as-empty">No agents found.</div>`}
    </div>
    <div class="as-foot">${ic('swap', 14)}<div><b>Switch agent</b><span>Changes the active agent for the dialer</span></div></div>
  </div>`;
}
// Opens inside EITHER the .scen demo-scenario dropdown OR the navbar Agent Switcher dropdown — both trigger it via
// their own toggle (A.parkAssignedToggle / A.asParkAssignedToggle) and pass their own close/pick-up action names,
// since each dropdown has to close itself, not the other one. One shared panel, not two copies — a compact list of
// this agent's own assigned-but-not-yet-picked-up parked calls, reusing the exact .pk-item/.pk-take card from
// parkedView() rather than a second card design. Scrolls internally past a handful of entries so the dropdown
// never grows unreasonably tall.
// Each row is itself clickable (opens that call's full details via parkDetailOpen, closing every open dropdown) —
// "Clicking each opens its own details" — while the Take Call button stays a one-click quick action; since the
// button is the DOM-closer ancestor with its own data-a, clicking it takes the call directly without opening details.
function parkAssignedPanel(closeAction, takeAction) {
  const mine = myAssignedParkedCalls();
  return `<div class="scen-panel pka-panel" role="dialog" aria-label="Parked calls assigned to me">
    <div class="pka-head"><b>${ic('parking', 14)}Parked Calls</b><button type="button" class="cls" data-a="${closeAction}" aria-label="Close">${ic('x', 14)}</button></div>
    <div class="pka-list">${mine.length ? mine.map((e) => `<div class="pk-item pk-item-click" data-a="parkDetailOpen" data-v="${esc(e.parkId)}" role="button" tabindex="0">
      <div class="pk-top"><div class="pk-mid"><b class="truncate">${esc(e.callerName)}</b><span class="mono truncate">${esc(e.callerNumber)}</span></div>
        <span class="pk-id mono">${esc(e.parkId)}</span></div>
      <div class="pk-meta"><span class="truncate">Parked by: ${esc(e.parkedBy)}</span><span>Waiting <b class="mono js-park-age" data-since="${e.parkedAtMs}">${formatTime(Math.floor((Date.now() - e.parkedAtMs) / 1000))}</b></span></div>
      <button type="button" class="pk-take" data-a="${takeAction}" data-v="${esc(e.parkId)}">${ic('phone', 14)}<span>Take Call</span></button></div>`).join('')
      : `<div class="as-empty">No parked calls assigned to you right now.</div>`}</div>
  </div>`;
}
function headerView() {
  const cur = AGENT_STATUSES.find((x) => x.id === S.agentStatus) || AGENT_STATUSES[0];
  const dotColor = { 'c-emerald': '#16a34a', 'c-cyan': '#06b6d4', 'c-amber': '#f59e0b', 'c-rose': '#dc2626', 'c-slate': '#64748b' }[cur.color];
  return `<header class="topbar">
  <div class="tb-logo" title="Workspace">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M7 17V9M12 17V5M17 17v-6"/></svg>
  </div>
  <div class="tb-search">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
    <input placeholder="Search here..." />
  </div>
  <div class="tb-spacer"></div>

  <div class="scen${S.scenOpen ? ' open' : ''}" title="Demo scenarios">
    <button type="button" class="scen-trigger" id="scen" data-a="scenToggle" aria-haspopup="listbox" aria-expanded="${S.scenOpen}" aria-label="Scenario picker, current: ${esc(scenLabel())}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M3 12h12M3 18h6"/></svg>
      <span>${esc(scenLabel())}</span>${ic('chevDown', 12, 'scen-chev')}</button>
    ${S.scenOpen ? (S.parkAssignedOpen ? parkAssignedPanel('parkAssignedClose', 'parkAssignedTake') : `<div class="scen-panel" role="listbox" aria-label="Scenario picker">${SCEN_GROUPS.map(([g, opts]) => `<div class="scen-group" role="presentation">${g}</div>${opts.map(([v, l]) => {
      const on = scenKey() === v;
      return `<button type="button" role="option" class="scen-opt${on ? ' on' : ''}" data-a="scen" data-v="${v}" aria-selected="${on}" tabindex="-1"><span>${l}</span>${on ? ic('checkCircle', 14) : ''}</button>`;
    }).join('')}${
      // "Parked Calls" sits after Conference and before Other, like every other section here — always listed,
      // same as "Idle" / "Conference · 3" etc., not hidden away; the count badge (and the popover opened by
      // clicking it) is what actually reflects live state, same real data either way (myAssignedParkedCalls()).
      g === 'Conference' ? (() => { const n = myAssignedParkedCalls().length; return `<div class="scen-group" role="presentation">Parked Calls</div>
      <button type="button" role="option" class="scen-opt" data-a="parkAssignedToggle" tabindex="-1"><span class="scen-opt-ic">${ic('phone', 13)}<span>Park Call Assigned to Me</span></span>${n ? `<span class="pk-n">${n}</span>` : ''}</button>`; })() : ''
    }`).join('')}</div>`) : ''}
  </div>

  ${agentSwitcherView()}

  <button type="button" class="dd-pill${S.dummyData ? ' on' : ''}" data-a="dummyToggle" role="switch" aria-checked="${S.dummyData}" title="Populate call history with demo data" aria-label="Dummy data, currently ${S.dummyData ? 'on' : 'off'}">
    <span class="dd-ic">${ic('database', 14)}</span><span class="dd-label">Dummy Data</span><span class="dd-sw"></span>
  </button>

  <div class="tb-icons">
    <button class="ti opt" title="Tasks"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l-3 3-1-1.5M9 13l-3 3-1-1.5M9 20l-3 3-1-1.5M13 7h8M13 14h8M13 21h8"/></svg><span class="badge">1</span></button>
    <button class="ti opt" title="Calendar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg></button>
    <button class="ti opt" title="Audio"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2h-1v-7M4 14v3a2 2 0 0 0 2 2h1v-7"/></svg></button>
    <button class="ti opt" title="Analytics"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M7 17V9M12 17V5M17 17v-6"/></svg></button>
    <button class="ti opt" title="Video"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/></svg></button>
    <button class="ti" title="Simulate a colleague parking a call" aria-label="Simulate a colleague parking a call" data-a="simPark">${ic('parking', 18)}</button>
    <button class="ti" title="Test inbound call" data-a="testInbound"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg><span class="greenring"></span></button>
    <button class="ti" title="Notifications"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16zM10 21a2 2 0 0 0 4 0"/></svg><span class="badge">9+</span></button>
  </div>
  <div class="tb-bal">$38.04</div>
  <button class="ti opt" title="Compact / expand dialer" data-a="toggleCompact"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button>
  <div class="tb-user" data-a="toggleStatus" style="cursor:pointer" title="Change status">
    <div class="ua" style="--dot:${dotColor}">${esc(initials({ name: PARK_AGENT.name }))}</div>
    <div class="uti">Hi, ${esc(PARK_AGENT.name)}<span class="nm"><b>${esc(roleLabel(PARK_AGENT.role))}</b></span></div>
  </div>
${S.statusOpen ? `<div class="status-menu tb-status">${AGENT_STATUSES.map((st) =>
    `<button class="status-item" data-a="setStatus" data-v="${st.id}"><span class="dot dot-8 ${st.color}"></span><span>${esc(st.label)}</span></button>`).join('')}</div>` : ''}
</header>`;
}

function sidebarView() {
  return `<nav class="navside" aria-label="Primary navigation">
    <button class="nv${S.nav === 'home' ? ' on' : ''}" data-a="nav" data-v="home"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-8 9 8M5 10v10h14V10"/></svg><span class="lb">Home</span></button>
    <button class="nv${S.nav === 'phone' ? ' on' : ''}" data-a="nav" data-v="phone"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg><span class="lb">Phone</span></button>
    <button class="nv${S.nav === 'chat' ? ' on' : ''}" data-a="nav" data-v="chat"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12c0 4.4-4 8-9 8-1.5 0-3-.3-4.2-.9L3 21l1.6-4.5C3.6 15.1 3 13.6 3 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></svg><span class="lb">Chat</span></button>
    <button class="nv${S.nav === 'agent' ? ' on' : ''}" data-a="nav" data-v="agent"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3zM19 11a7 7 0 0 1-14 0M12 18v3"/></svg><span class="lb">Agent</span></button>
    <button class="nv${S.nav === 'video' ? ' on' : ''}" data-a="nav" data-v="video"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4z"/></svg><span class="lb">Video</span></button>
    <button class="nv${S.nav === 'inbox' ? ' on' : ''}" data-a="nav" data-v="inbox"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9 6 9-6M3 7v10h18V7"/></svg><span class="lb">Inbox</span></button>
    <button class="nv${S.nav === 'contact' ? ' on' : ''}" data-a="nav" data-v="contact"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg><span class="lb">Contact</span></button>
    <button class="nv${S.nav === 'dept' ? ' on' : ''}" data-a="nav" data-v="dept"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V10l7-5 7 5v11"/></svg><span class="lb">Dept</span></button>
    <button class="nv${S.nav === 'campaign' ? ' on' : ''}" data-a="nav" data-v="campaign"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg><span class="lb">Campaign</span></button>
    <button class="nv${S.nav === 'reports' ? ' on' : ''}" data-a="nav" data-v="reports"><svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg><span class="lb">Reports</span></button>
  </nav>`;
}

function parkedView() {
  const list = ParkService.visible(PARK_AGENT);
  if (!list.length) return '';
  return `<section class="parked" aria-label="Parked calls">
    <div class="sec-title">${ic('parking', 14)}Parked calls<span class="pk-n">${list.length}</span></div>
    <div class="pk-list">${list.map((e) => {
      const mine = !e.assignedTo || e.assignedTo === PARK_AGENT.name;
      return `<div class="pk-item">
      <div class="pk-top"><div class="pk-mid"><b class="truncate">${esc(e.callerName)}</b><span class="mono truncate">${esc(e.callerNumber)}</span></div>
        <span class="pk-id mono" title="Park ID: dial it to retrieve this call">${esc(e.parkId)}</span></div>
      <div class="pk-meta"><span class="truncate">Parked by: ${esc(e.parkedBy)}</span><span>Parked: <b class="mono js-park-age" data-since="${e.parkedAtMs}">${formatTime(Math.floor((Date.now() - e.parkedAtMs) / 1000))}</b> ago</span></div>
      ${e.assignedTo ? `<span class="hst ${mine ? 'ok' : 'info'} truncate">${mine ? 'Reserved for you' : `Reserved for ${esc(e.assignedTo)}`}</span>` : ''}
      ${mine
        ? `<button type="button" class="pk-take" data-a="parkTake" data-v="${esc(e.parkId)}" title="Take this call">${ic('phone', 14)}<span>Take Call</span></button>`
        : `<div class="pk-assigned-note">${ic('info', 13)}<span>Assigned to ${esc(e.assignedTo)}</span></div>`}</div>`;
    }).join('')}</div>
  </section>`;
}

// Persistent floating call window: reuses the same S.callState/S.activeContact/S.conf/timer as the Phone Active Call tab
// (data-a="mute"/"hold"/"rec"/"hangup" are the same handlers used there). Only rendered when a call is live and the user is off the Phone nav.
function floatOverlay() {
  if (!S.activeContact || !['ringing', 'connected', 'on_hold', 'wrap_up'].includes(S.callState) || S.nav === 'phone') { floatWasShown = false; return ''; }
  const justShown = !floatWasShown; floatWasShown = true;
  if (S.callState === 'wrap_up') return floatWrapUpView(justShown);
  const s = S.callState, c = S.activeContact, people = [c, ...S.conf], isConf = S.conf.length > 0;
  const label = s === 'ringing' ? 'Connecting…' : s === 'on_hold' ? 'On hold' : 'Connected';
  const dotCls = s === 'ringing' ? 'c-amber-400 ping' : s === 'on_hold' ? 'c-amber' : 'c-emerald-400';
  const name = isConf ? 'Conference call' : esc(c.name);
  const timer = s === 'connected' && !S.isOnHold;
  if (S.floatMin) {
    const menuItem = (a, icon, lbl, v, disabled, title) => `<button type="button" class="fb-mi" data-a="${a}" ${v ? `data-v="${v}"` : ''} role="menuitem" ${disabled ? 'disabled' : ''} ${title ? `title="${esc(title)}"` : ''}>${ic(icon, 15)}<span>${esc(lbl)}</span></button>`;
    const canMerge = ['connected', 'on_hold'].includes(s) && S.heldCalls.length > 0;
    const menu = S.floatMore ? `<div class="fb-menu" role="menu" aria-label="More call actions">
      ${menuItem('mute', S.isMuted ? 'micOff' : 'mic', S.isMuted ? 'Unmute' : 'Mute')}
      ${menuItem('hold', S.isOnHold ? 'play' : 'pause', S.isOnHold ? 'Resume' : 'Hold')}
      ${menuItem('floatTool', 'grid', 'Open Keypad', 'dtmf')}
      ${menuItem('floatTool', 'phonePlus', 'Add Call', 'addCall', s === 'ringing')}
      ${menuItem('floatTool', 'phoneForwarded', 'Transfer Call', 'transfer')}
      ${menuItem('mergeAll', 'users', 'Merge Calls', null, !canMerge, canMerge ? '' : 'No other call to merge with')}
      ${menuItem('floatTool', 'parking', 'Park Call', 'park', s === 'ringing')}
      ${menuItem('floatExpand', 'expand', 'Open Full Call')}
      ${menuItem('floatPanel', 'user', 'Call Details', 'Contact')}
      <button type="button" class="fb-mi danger" data-a="hangup" role="menuitem">${ic('phoneOff', 15)}<span>End Call</span></button>
    </div>` : '';
    return `<div class="float-bar${justShown ? ' fw-in' : ''}" role="complementary" aria-label="Active call">
      <span class="fw-drag" data-drag="1" title="Drag to move" aria-hidden="true">${ic('grip', 12)}</span>
      <button type="button" class="fb-idclick" data-a="floatExpand" title="Open full call">
        <span class="ini fb-av" style="${pastel(name)}">${isConf ? ic('users', 14) : esc(initials({ name }))}</span>
        <span class="dot ${dotCls}"></span>
        <span class="fb-name truncate">${name}</span>
      </button>
      <span class="fb-timer mono${timer ? ' js-timer' : ''}">${formatTime(S.callDuration)}</span>
      <button type="button" class="fb-btn" data-a="mute" title="${S.isMuted ? 'Unmute microphone' : 'Mute microphone'}" aria-pressed="${S.isMuted}">${ic(S.isMuted ? 'micOff' : 'mic', 16)}</button>
      <button type="button" class="fb-btn" data-a="hold" title="${S.isOnHold ? 'Resume call' : 'Hold call'}" aria-pressed="${S.isOnHold}">${ic(S.isOnHold ? 'play' : 'pause', 16)}</button>
      <button type="button" class="fb-btn danger" data-a="hangup" title="End call">${ic('phoneOff', 16)}</button>
      <div class="fb-more-wrap"><button type="button" class="fb-btn${S.floatMore ? ' on' : ''}" data-a="floatMore" title="More" aria-haspopup="menu" aria-expanded="${S.floatMore}">${ic('moreV', 16)}</button>${menu}</div>
    </div>`;
  }
  const ctrl = (a, on, label, icon, title, v) => `<button type="button" class="fw-ctrl${on ? ' on' : ''}" data-a="${a}" ${v ? `data-v="${v}"` : ''} title="${esc(title)}" aria-pressed="${!!on}">${ic(icon, 16)}<span>${esc(label)}</span></button>`;
  const ct = !isConf && contactFor(c.number);
  const tag = ct && ct.tags ? esc(ct.tags).split(/,\s*/)[0].toUpperCase() : '';
  const wsc = wsCall();
  const P = S.floatPanel || 'Call';
  const tab = (v, lbl) => `<button type="button" class="fw-tab${P === v ? ' on' : ''}" data-a="floatPanel" data-v="${v}" aria-current="${P === v}">${esc(lbl)}</button>`;
  const panel = P === 'Call' || !wsc ? '' : `<div class="fw-scroll">${
    P === 'History' ? wsHistoryTab(wsc)
    : P === 'Transcript' ? wsTranscriptTab(wsc)
    : P === 'Notes' ? wsNotesTab(wsc)
    : P === 'AI Assist' ? wsCopilot(wsc) + `<form class="ws-form fw-ask" data-f="ask"><div class="q-wrap">${ic('sparkles', 14, 'fill')}<input type="text" class="q-in" data-k="fwq" data-i="question" value="${esc(S.question)}" ${wsc.active && wsc.live && S.callState === 'connected' ? '' : 'disabled'} aria-label="Ask AI about this call" placeholder="Ask AI about this call..." /></div><button type="submit" class="send" ${wsc.active && wsc.live && S.callState === 'connected' && S.question.trim() ? '' : 'disabled'} aria-label="Send" title="Send">${ic('send', 16)}</button></form>`
    : wsContactTab(wsc)
  }</div>`;
  return `<div class="float-win${S.floatBig ? ' fw-big' : ''}${justShown ? ' fw-in' : ''}" role="complementary" aria-label="Active call">
    <div class="fw-head" ${S.floatBig ? '' : 'data-drag="1" title="Drag to move"'}><span class="dot ${dotCls}"></span><b>${label}</b>
      <div class="fw-wctrl">
        <button type="button" class="fb-btn" data-a="floatMin" title="Minimize" aria-label="Minimize to floating pill">${ic('winMin', 15)}</button>
        <button type="button" class="fb-btn" data-a="floatBig" title="${S.floatBig ? 'Restore' : 'Fullscreen'}" aria-label="${S.floatBig ? 'Restore call window' : 'Expand call window to fullscreen'}" aria-pressed="${S.floatBig}">${ic(S.floatBig ? 'winRestore' : 'maximize', 14)}</button>
        <button type="button" class="fb-btn" data-a="floatMin" title="Close (call keeps running in the floating pill)" aria-label="Close popup, keep call running">${ic('x', 16)}</button>
      </div></div>
    <div class="fw-who"><span class="ini fw-av" style="${pastel(name)}">${isConf ? ic('users', 16) : esc(initials({ name }))}</span>
      <div><b class="truncate">${name}</b><span class="truncate">${isConf ? `People in this call (${people.length})` : esc(c.number)}</span>${tag ? `<span class="fw-tag">${tag}</span>` : ''}</div>
      <span class="fw-timer mono${timer ? ' js-timer' : ''}">${formatTime(S.callDuration)}</span></div>
    ${isConf ? `<div class="chips-row part-row fw-chips">${people.map((p) => `<span class="chip" title="${esc(personName(p))}"><span class="ini">${esc(initials(p))}</span><span class="truncate">${esc(personName(p))}</span></span>`).join('')}</div>` : ''}
    <nav class="fw-tabs" aria-label="Call workspace">${tab('Call', 'Call')}${tab('History', 'Call History')}${tab('Transcript', 'Transcript')}${tab('Notes', 'Notes')}${tab('AI Assist', 'AI Assist')}${tab('Contact', 'Contact Info')}</nav>
    ${P === 'Call' ? `${S.heldCalls.length ? `<div class="fw-mc">
      <div class="fw-mc-row on"><span class="ini fw-mc-av" style="${pastel(name)}">${isConf ? ic('users', 14) : esc(initials({ name }))}</span>
        <div class="fw-mc-mid"><b class="truncate">${name}</b><span class="hst ok">${s === 'on_hold' ? 'On hold' : 'Active'}</span></div>
        <span class="fw-mc-t mono${timer ? ' js-timer' : ''}">${formatTime(S.callDuration)}</span></div>
      ${S.heldCalls.map((hc) => {
        const hname = hc.participants && hc.participants.length ? 'Conference call' : hc.contact.name;
        return `<div class="fw-mc-row"><span class="ini fw-mc-av" style="${pastel(hname)}">${esc(initials(hc.contact))}</span>
        <div class="fw-mc-mid"><b class="truncate">${esc(hname)}</b><span class="hst muted">On hold</span></div>
        <span class="fw-mc-t mono">${formatTime(hc.seconds)}</span>
        <button type="button" class="fb-btn" data-a="swap" data-v="${esc(hc.id)}" title="Swap to this call" aria-label="Swap to ${esc(hname)}">${ic('swap', 14)}</button></div>`;
      }).join('')}
      <div class="fw-mc-btns"><button type="button" class="rec-sec sm" data-a="mergeAll" ${['connected', 'on_hold'].includes(s) ? '' : 'disabled'}>${ic('users', 14)}<span>Merge</span></button>
        <button type="button" class="rec-sec sm danger" data-a="endAll">${ic('phoneOff', 14)}<span>End All</span></button>
        <button type="button" class="rec-sec sm" data-a="floatMore">${ic('moreV', 14)}<span>More</span></button></div>
    </div>` : ''}<div class="fw-grid">
      ${ctrl('hold', S.isOnHold, S.isOnHold ? 'Resume' : 'Hold', S.isOnHold ? 'play' : 'pause', S.isOnHold ? 'Resume call' : 'Put call on hold')}
      ${ctrl('mute', S.isMuted, S.isMuted ? 'Unmute' : 'Mute', S.isMuted ? 'micOff' : 'mic', S.isMuted ? 'Unmute microphone' : 'Mute microphone')}
      <button type="button" class="fw-ctrl" disabled title="Speaker routing isn't available in this demo (no audio device API)">${ic('volume', 16)}<span>Speaker</span></button>
      ${ctrl('floatTool', false, 'Transfer', 'phoneForwarded', 'Open Transfer on the Phone tab', 'transfer')}
      ${ctrl('floatTool', false, 'Add Call', 'phonePlus', 'Open Add Call on the Phone tab', 'addCall')}
      ${ctrl('rec', S.isRecording, S.isRecording ? (S.recPaused ? 'Rec paused' : 'Rec On') : 'Record', 'disc', S.isRecording ? 'Stop recording' : 'Start recording')}
    </div>
    <div class="fw-grid fw-grid2">
      ${ctrl('floatTool', false, 'Keypad', 'grid', 'Open DTMF keypad on the Phone tab', 'dtmf')}
      ${ctrl('floatGoto', false, 'Open Phone', 'phone', 'Go to the full Active Call view')}
    </div>` : panel}
    <button type="button" class="fw-hang" data-a="hangup" title="End this call">${ic('phoneOff', 18)}<span>Hang up call</span></button>
  </div>`;
}
// Call Park dialog: opened by A.park (openParkDialog), confirmed by A.parkConfirm (parkConfirm). Availability is
// Four real slot states (available/busy/reserved/unavailable), derived live from S.parked/PARK_UNAVAILABLE —
// see parkSlotState(). "Reserved" = parked + assigned to a specific agent; "Busy" = parked, nobody assigned.
function parkDialogView() {
  if (!S.parkDialog) return '';
  const c = S.activeContact, d = S.parkDialog;
  const slot = d.slot.trim();
  const slotState = slot ? parkSlotState(slot) : null;
  const invalidManual = slot && !PARK_CODES.includes(slot);
  const occupiedManual = slot && !invalidManual && slotState !== 'available';
  const noneFree = !slot && PARK_CODES.every((c2) => parkSlotState(c2) !== 'available');
  const canPark = !invalidManual && !occupiedManual && !noneFree;
  const assignedAgent = AGENTS.find((a) => a.name === d.assignTo);
  const letter = /^[A-Za-z]/.test(c.name || '') ? esc(c.name.charAt(0)) : ic('phone', 18);
  // One real "who" per slot, formatted "Name (ext)" when it's a known agent — the assignee once Reserved, whoever
  // picked it up once In Use, or whoever originally parked it while still just Busy (unassigned, not yet taken).
  const slotWho = (code, st) => {
    if (st === 'in_use') { const busy = S.slotBusy[code]; return AGENTS.find((a) => a.id === busy.agentId) || { name: busy.agentName, ext: '' }; }
    const e = S.parked.find((x) => x.parkId === code);
    if (!e) return null;
    if (st === 'reserved') return AGENTS.find((a) => a.name === e.assignedTo) || { name: e.assignedTo, ext: '' };
    if (st === 'busy') return AGENTS.find((a) => a.name === e.parkedBy) || { name: e.parkedBy, ext: '' };
    return null;
  };
  const slotSince = (code, st) => (st === 'in_use' ? S.slotBusy[code].since : (S.parked.find((x) => x.parkId === code) || {}).parkedAtMs) || null;
  // Agent search combobox: the chip (once someone's assigned) and the pickable list are independent — the list
  // shows whenever nobody's assigned yet, the chevron is toggled open, or the agent actively typed a query.
  const agentQuery = (d.agentQuery || '').trim().toLowerCase();
  const agentMatches = AGENTS.filter((a) => !agentQuery || a.name.toLowerCase().includes(agentQuery) || a.ext.includes(agentQuery) || roleLabel(a.role).toLowerCase().includes(agentQuery));
  const showAgentList = !d.assignTo || d.agentListOpen || agentQuery;
  const agentRow = (a) => { const si = agentStatusInfo(a); return `<button type="button" class="pk-agent-row${a.status === 'offline' ? ' as-dis' : ''}" data-a="parkAssignPick" data-v="${a.id}" ${a.status === 'offline' ? 'disabled' : ''}>
      <span class="as-av" style="${pastel(a.name)}">${esc(initials({ name: a.name }))}<span class="as-dot ${si.cls}"></span></span>
      <div class="as-info"><b class="truncate">${esc(a.name)}</b><span>${esc(a.ext)} &middot; ${esc(roleLabel(a.role))} &middot; ${si.label}${a.name === PARK_AGENT.name ? ' (You)' : ''}</span></div></button>`; };
  return `<section class="toast toast-wide pk-wide" role="dialog" aria-label="Call Park">
    <header><div class="ttl"><span class="pk-ttl-badge">${ic('parking', 18)}</span><div><span>Call Park</span><p class="pk-ttl-sub">Park the current call on an available slot or assign it to an agent.</p></div></div>
      <button type="button" class="cls" data-a="parkCancel" aria-label="Cancel">${ic('x', 16)}</button></header>
    <div class="ic-choice">
      <div class="pk-callinfo">
        <span class="ini pk-callinfo-av" style="${pastel(c.name)}">${letter}</span>
        <div class="pk-callinfo-id"><b class="truncate">${esc(c.name)}</b>${c.name === c.number ? '' : `<span class="mono truncate">${esc(c.number)}</span>`}</div>
        <div class="pk-callinfo-meta">
          <div><span class="rec-mut">Call Duration</span><b class="mono js-timer">${formatTime(S.callDuration)}</b></div>
          <div><span class="rec-mut">Extension</span><b class="mono">${esc(PARK_AGENT.ext)}</b></div>
          <div><span class="rec-mut">Call Type</span><b>${ic(S.callType === 'outbound' ? 'arrowUpRight' : 'arrowDownLeft', 11)}${S.callType === 'outbound' ? 'Outbound' : 'Inbound'}</b></div>
        </div>
      </div>
      <b class="pk-slots-lbl">Park ID</b>
      <label class="ce-f"><input type="text" data-k="parkslot" data-i="parkSlot" value="${esc(d.slot)}" placeholder="Auto-assign (or enter *71 – *79)" class="mono" /></label>
      ${invalidManual ? `<p class="pk-err">Enter a valid park slot between ${PARK_CODES[0]} and ${PARK_CODES[PARK_CODES.length - 1]}.</p>`
        : occupiedManual ? `<p class="pk-err">Park slot ${esc(slot)} is currently ${slotState === 'unavailable' ? 'not in service' : slotState === 'in_use' ? 'in use' : slotState}.</p>`
        : noneFree ? '<p class="pk-err">No park slots are currently available.</p>' : ''}
      <b class="pk-slots-lbl">Assign to <i class="rec-mut">(optional)</i></b>
      <label class="pk-agent-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input type="text" data-k="parkAgentQ" data-i="parkAgentQuery" value="${esc(d.agentQuery || '')}" placeholder="Search agent by name, extension or team..." autocomplete="off" /></label>
      ${d.assignTo && assignedAgent ? (() => { const si = agentStatusInfo(assignedAgent); return `<div class="pk-agent-chip">
        <span class="as-av" style="${pastel(assignedAgent.name)}">${esc(initials({ name: assignedAgent.name }))}<span class="as-dot ${si.cls}"></span></span>
        <div class="as-info"><b class="truncate">${esc(assignedAgent.name)}</b><span>${esc(assignedAgent.ext)} &middot; ${esc(roleLabel(assignedAgent.role))} &middot; ${si.label}</span></div>
        <button type="button" class="pk-agent-x" data-a="parkAssignClear" title="Remove assignment" aria-label="Remove assignment">${ic('x', 14)}</button>
        <button type="button" class="pk-agent-chev${d.agentListOpen ? ' on' : ''}" data-a="parkAgentListToggle" title="Change agent" aria-label="Change agent">${ic('chevDown', 14)}</button>
      </div>`; })() : ''}
      ${showAgentList ? `<div class="pk-agent-list">${agentMatches.length ? agentMatches.map(agentRow).join('') : '<div class="as-empty">No agents found.</div>'}</div>` : ''}
      <label class="pk-notify${d.assignTo ? '' : ' off'}"><input type="checkbox" data-a="parkNotifyToggle" ${d.notifyAssignedOnly ? 'checked' : ''} ${d.assignTo ? '' : 'disabled'} />
        <span>Notify only assigned agent</span>${ic('info', 13)}</label>
      ${d.assignTo ? '' : '<p class="rec-mut pk-notify-hint">Assign an agent to enable agent-only notification.</p>'}
      ${assignedAgent && (assignedAgent.status === 'busy' || agentHasLiveCall(assignedAgent)) ? `<p class="pk-err">${esc(assignedAgent.name)} is currently busy. They may not pick this up right away.</p>` : ''}
      <div class="pk-legend">
        <b class="pk-legend-h">Slot states at a glance:</b>
        <div class="pk-legend-grid">
          <div class="pk-legend-cell"><span class="pk-legend-dot on"></span><div><b>Available</b><span>Free, can park here</span></div></div>
          <div class="pk-legend-cell"><span class="pk-legend-dot busy"></span><div><b>Busy</b><span>A call is parked here, no agent assigned</span></div></div>
          <div class="pk-legend-cell"><span class="pk-legend-dot reserved"></span><div><b>Reserved</b><span>Parked + assigned to an agent</span></div></div>
          <div class="pk-legend-cell"><span class="pk-legend-dot off"></span><div><b>Unavailable</b><span>Disabled by admin</span></div></div>
        </div>
      </div>
      <div class="pk-slots-head"><b class="pk-slots-lbl" style="margin:0">Available Park Slots (${PARK_CODES.filter((c2) => parkSlotState(c2) === 'available').length})</b>
        <button type="button" class="pk-refresh" data-a="parkRefresh" title="Refresh slot states" aria-label="Refresh slot states">${ic('refresh', 13)}<span>Refresh</span></button></div>
      <div class="pk-slots">${PARK_CODES.map((code) => {
        const st = parkSlotState(code), on = slot === code;
        const who = slotWho(code, st), since = slotSince(code, st);
        const label = { available: 'Available', busy: 'Busy', reserved: 'Reserved', in_use: 'Busy', unavailable: 'Unavailable' }[st];
        const sub = st === 'available' ? 'Click to select' : on ? 'Click to assign agent' : st === 'unavailable' ? 'Disabled by admin' : null;
        return `<button type="button" class="pk-slot pk-slot-${st}${on ? ' on' : ''}" data-a="parkSlotPick" data-v="${code}" aria-pressed="${on}" aria-label="${code} — ${label}${who ? ' — ' + who.name : ''}">
          <span class="pk-slot-ic">${ic('phone', 10)}</span>
          <span class="pk-slot-body">
            <span class="pk-slot-top"><span class="mono">${code}</span>${on ? `<span class="pk-slot-sel">${ic('check', 9)}Selected</span>` : `<span class="pk-slot-st">${label}</span>`}</span>
            ${who ? `<span class="pk-slot-who truncate">${esc(who.ext ? `${who.name} (${who.ext})` : who.name)}</span>` : sub ? `<span class="pk-slot-sub">${sub}</span>` : ''}
            ${since ? `<span class="pk-slot-dur mono js-park-age" data-since="${since}">${formatTime(Math.floor((Date.now() - since) / 1000))}</span>` : ''}
          </span></button>`;
      }).join('')}</div>
      ${d.slotMsg ? `<p class="pk-err pk-slot-msg">${esc(d.slotMsg)}</p>` : ''}
      ${slot && canPark ? `<div class="pk-selected-note">${ic('info', 14)}<span>Selected Slot: <b class="mono">${esc(slot)}</b><br/>Call will be parked on <b class="mono">${esc(slot)}</b>${d.assignTo
        ? (d.notifyAssignedOnly ? ` and only ${esc(d.assignTo)}${assignedAgent ? ` (${esc(assignedAgent.ext)})` : ''} will be notified.` : ` and assigned to ${esc(d.assignTo)} — the rest of the ${esc(PARK_AGENT.departments[0])} team will be notified too.`)
        : '.'}</span></div>` : ''}
      <div class="btns"><button type="button" class="dec" data-a="parkCancel"><span>Cancel</span></button><button type="button" class="ans" data-a="parkConfirm" ${canPark ? '' : 'disabled'}>${ic('parking', 16)}<span>Park Call</span></button></div>
    </div>
  </section>`;
}
// Two real contexts share this one panel instead of a second details view: mode 'parked' replaces the Park dialog
// the instant parkConfirm() succeeds (a real confirmation screen, not an immediate close) — Close/"Go to Call".
// mode 'view' is opened later by anyone looking at an existing reservation (the "Park Call Assigned to Me"
// row/list, or a toast's "View Details") — same fields plus a live Waiting timer and Call Type, and a real
// "Pick Up Call" action (disabled with the honest reason when this agent isn't actually eligible to take it).
function parkSuccessView() {
  if (!S.parkSuccess) return '';
  const { id, mode } = S.parkSuccess;
  const e = S.parked.find((x) => x.id === id);
  if (!e) { S.parkSuccess = null; return ''; }
  const assignedAgent = AGENTS.find((a) => a.name === e.assignedTo);
  const viewing = mode === 'view';
  const mine = e.assignedToId === PARK_AGENT.id;
  const statusLabel = e.assignedTo ? (mine ? 'Reserved for you' : `Reserved for ${e.assignedTo}`) : 'Waiting for pickup';
  const canPickup = ParkService.canRetrieve(PARK_AGENT, e);
  return `<section class="toast toast-wide pk-wide" role="dialog" aria-label="${viewing ? 'Parked call details' : 'Call parked successfully'}">
    <header class="pk-success-hd"><div class="ttl${viewing ? '' : ' pk-ok'}">${ic(viewing ? 'parking' : 'checkCircle', 20)}<span>${viewing ? 'Parked Call' : 'Call Parked Successfully'}</span></div>
      <button type="button" class="cls" data-a="parkSuccessClose" aria-label="Close">${ic('x', 16)}</button></header>
    <div class="ic-choice">
      <div class="pk-success-slot">
        <span class="mono pk-success-code">${esc(e.parkId)}</span>
        <span class="hst ${e.assignedTo ? (mine ? 'ok' : 'info') : 'muted'}">${statusLabel}</span>
        ${assignedAgent ? `<div class="pk-success-agent">${vmAv(assignedAgent.name)}<div><b>${esc(assignedAgent.name)}</b><span class="rec-mut">${esc(assignedAgent.ext)}</span></div></div>` : ''}
      </div>
      <dl class="rec-dl">
        <div><dt>Caller</dt><dd>${esc(e.callerName)} <span class="mono">(${esc(e.callerNumber)})</span></dd></div>
        <div><dt>Park ID</dt><dd class="mono">${esc(e.parkId)} ${e.assignedTo ? '(Reserved)' : ''}</dd></div>
        ${viewing ? `<div><dt>Call Type</dt><dd>${e.callType === 'outbound' ? 'Outbound' : 'Inbound'}</dd></div>` : ''}
        <div><dt>Assigned To</dt><dd>${e.assignedTo ? `${esc(e.assignedTo)}${assignedAgent ? ' · ' + esc(assignedAgent.ext) : ''}` : 'Unassigned'}</dd></div>
        <div><dt>Parked At</dt><dd>${esc(fmtWhen(new Date(e.parkedAtMs)))}</dd></div>
        <div><dt>Parked By</dt><dd>${esc(e.parkedBy)}${e.parkedBy === PARK_AGENT.name ? ' (You)' : ''}</dd></div>
        ${viewing ? `<div><dt>Waiting</dt><dd class="mono js-park-age" data-since="${e.parkedAtMs}">${formatTime(Math.floor((Date.now() - e.parkedAtMs) / 1000))}</dd></div>` : ''}
        <div><dt>Status</dt><dd>${e.assignedTo ? statusLabel : 'Visible to the ' + esc(e.department) + ' team'}</dd></div>
      </dl>
      ${viewing
        ? (canPickup ? '' : `<p class="pk-err">${esc(e.assignedTo)} is the only one who can pick up this call.</p>`)
        : `<p class="rec-mut pk-success-msg">${e.assignedTo
            ? (e.notifyAssignedOnly ? `Only ${esc(e.assignedTo)} has been notified.` : `${esc(e.assignedTo)} and the rest of the ${esc(e.department)} team have been notified.`)
            : `Call parked successfully. No specific agent was assigned — visible to the ${esc(e.department)} team.`}</p>`}
      <div class="btns"><button type="button" class="dec" data-a="parkSuccessClose">${viewing ? ic('phoneOff', 14) : ''}<span>${viewing ? 'Ignore' : 'Close'}</span></button>
        ${viewing
          ? `<button type="button" class="ans" data-a="parkDetailPickup" data-v="${esc(e.parkId)}" ${canPickup ? '' : 'disabled'}>${ic('phone', 16)}<span>Pick Up Call</span></button>`
          : `<button type="button" class="ans" data-a="parkSuccessGoCall"><span>Go to Call</span></button>`}</div>
    </div>
  </section>`;
}
function toastStack() {
  // Agent-scoped: a toast pushed for a different agent (e.g. an agent-to-agent call notification, or a park alert
  // for whoever it's assigned to) simply isn't rendered while someone else is active — see pushToast()'s agentId.
  const mine = S.toasts.filter((t) => t.agentId === PARK_AGENT.id);
  if (!mine.length) return '';
  const icon = { ok: 'checkCircle', err: 'bell', info: 'bell' };
  return `<div class="tstack" role="region" aria-label="Notifications">${mine.map((t) => {
    const cls = `tst ${t.kind}${t.fresh ? ' fresh' : ''}`;
    if (t.kind === 'park') {
      const e = S.parked.find((x) => x.parkId === t.parkId);
      if (!e) return '';
      // Assigned specifically to the signed-in agent (assignedToId, not just name — see myAssignedParkedCalls())
      // gets the personal "assigned to you" framing; an unassigned, department-visible park (e.g. from
      // simulateColleaguePark()) reads "Parked Call Available" instead — same two-tier flow as the real Incoming
      // Call toast/popup pair: this toast is the ambient alert, "View Parked Call" opens the same decision popup
      // (parkSuccessView mode 'view', Decline / Pick Up Call) rather than letting you take the call from the toast
      // itself. The header X is the only dismiss affordance — it only closes the toast, never touches the parked
      // call, which stays reachable again from "Park Call Assigned to Me" at any time.
      const mine = e.assignedToId === PARK_AGENT.id;
      const btns = `<button type="button" class="tst-dis" data-a="toastClose" data-v="${t.id}">${ic('phoneOff', 14)}<span>Ignore</span></button>
           <button type="button" class="pk-take" data-a="parkViewDetails" data-v="${esc(e.parkId)}">${ic('parking', 14)}<span>View Parked Call</span></button>`;
      return `<div class="${cls}" role="alert"><div class="tst-h">${ic('parking', 16, t.fresh ? 'tst-pulse' : '')}<b>${mine ? 'Parked Call Assigned' : 'Parked Call Available'}</b>
          <button type="button" class="tst-x" data-a="toastClose" data-v="${t.id}" title="Dismiss" aria-label="Dismiss notification">${ic('x', 14)}</button></div>
        <div class="tst-b"><span class="tst-note">${mine ? 'A parked call is waiting for you.' : `A call has been parked on <span class="pk-id mono">${esc(e.parkId)}</span> by ${t.self ? 'you' : esc(e.parkedBy)}`}</span>
          <b class="truncate">${esc(e.callerName)}</b><span class="mono">${esc(e.callerNumber)}</span></div>
        <div class="tst-btns">${btns}</div></div>`;
    }
    return `<div class="${cls}" role="status">${ic(icon[t.kind] || 'bell', 16)}<span>${esc(t.msg)}${t.sub ? `<small class="tst-sub">${esc(t.sub)}</small>` : ''}</span>
      <button type="button" class="tst-x" data-a="toastClose" data-v="${t.id}" title="Dismiss" aria-label="Dismiss notification">${ic('x', 14)}</button></div>`;
  }).join('')}</div>`;
}

function toastView() {
  const c = S.incoming;
  if (!c) return '';
  const ini = (c.name || c.number || 'Caller').split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2).toUpperCase();
  // Answering while another call is genuinely live shows a real choice instead of silently auto-holding it (see A.answer/A.incomingConfirm).
  // This decision dialog is deliberately its own plain light card (not the dark incoming notification), since it's a form, not a ringing alert.
  if (S.incomingChoice) {
    const cur = S.conf.length ? 'the current conference' : esc(S.activeContact.name);
    const opt = (v, label, detail) => `<label class="ic-opt${S.acceptMode === v ? ' on' : ''}"><input type="radio" name="incomingMode" value="${v}" ${S.acceptMode === v ? 'checked' : ''} data-a="incomingMode" data-v="${v}" /><span><b>${esc(label)}</b><span>${detail}</span></span></label>`;
    return `<section class="toast toast-wide" role="alertdialog" aria-label="Answer incoming call">
      <header><div class="ttl">${ic('phoneIncoming', 20)}<span>Answer ${esc(c.name)}</span></div>
        <button type="button" class="cls" data-a="incomingCancel" aria-label="Cancel">${ic('x', 16)}</button></header>
      <div class="ic-choice">
        ${opt('hold', 'Hold current call and answer', `${cur} will be placed on hold.`)}
        ${opt('end', 'End current call and answer', `${cur} will be disconnected.`)}
        <label class="ic-opt disabled" title="This demo has one foreground call at a time, so two calls can't both stay fully active without one on hold."><input type="radio" name="incomingMode" disabled /><span><b>Answer without holding</b><span>Not supported by this demo's call model.</span></span></label>
        <div class="btns"><button type="button" class="ans" data-a="incomingConfirm"><span>Answer</span></button><button type="button" class="dec" data-a="incomingCancel"><span>Cancel</span></button></div>
      </div>
    </section>`;
  }
  if (S.incomingMin) {
    return `<div class="ic-bar${S.incoming ? ' fw-in' : ''}" role="complementary" aria-label="Incoming call">
      <button type="button" class="fb-idclick" data-a="incomingExpand" title="Open incoming call">
        <span class="ini fb-av" style="${pastel(c.name)}">${esc(ini)}</span>
        <span class="fb-name truncate">${esc(c.name)}</span>
        <span class="ic-bar-sub">${c._parkRestore ? 'Returned' : 'Incoming…'}</span>
      </button>
      <button type="button" class="fb-btn danger" data-a="reject" title="Decline" aria-label="Decline call">${ic('phoneOff', 16)}</button>
      <button type="button" class="fb-btn ok" data-a="answer" title="Accept" aria-label="Accept call">${ic('phone', 16, 'fill')}</button>
    </div>`;
  }
  const parkBack = c._parkRestore;
  return `<section class="toast toast-dark" role="alertdialog" aria-label="${parkBack ? 'Call returned from park' : 'Incoming call'}">
    <header>
      <div class="ttl">${ic(parkBack ? 'parking' : 'phoneIncoming', 20)}<span>${parkBack ? 'Call Returned' : 'Incoming Call…'}</span></div>
      <div class="fw-wctrl"><button type="button" class="fb-btn" data-a="incomingMin" title="Minimize" aria-label="Minimize to a small pill">${ic('winMin', 15)}</button>
        <button type="button" class="fb-btn" data-a="reject" title="Decline" aria-label="Decline call">${ic('x', 16)}</button></div>
    </header>
    <div class="body">
      <div class="who"><span class="av">${esc(ini)}</span>
        <div><div class="nm truncate">${esc(c.name)}</div><div class="nb truncate">${esc(c.number)}</div></div></div>
      ${parkBack ? `<p class="rec-mut" style="margin-top:10px">Park ID <b class="mono">${esc(parkBack.parkId)}</b> · Park timeout reached. The call has been returned.</p>`
        : `<div class="tags"><span class="tag1">Account <strong>${esc(c.account)}</strong></span><span class="tag2">${esc(c.company)}</span></div>`}
    </div>
    <div class="btns">
      <button type="button" class="dec" data-a="reject">${ic('phoneOff', 16)}<span>Decline</span></button>
      <button type="button" class="ans" data-a="answer">${ic('phone', 16, 'fill')}<span>Accept</span></button>
    </div>
  </section>`;
}

// The flag appears once the typed +country code is recognised (no picker: the user types + and the code).
function numFlag() {
  const c = countryFromNumber(S.dialNumber);
  return `<span class="cc-flag" ${c ? `title="${esc(c.name)}" role="img" aria-label="${esc(c.name)}"` : 'aria-hidden="true"'}>${c ? flag(c) : ic('search', 16)}</span>`;
}

function readyStateView() {
  const st = WEBRTC[S.webrtc];
  const c = countryFromNumber(CALLER_ID);
  return `<section class="ready" aria-label="Ready state">
    <div class="sec-title">${ic('zap', 14)}Ready state</div>
    <div class="rrow"><span class="k">Station</span><span class="v ${st.cls}" role="status"><i></i>${st.label}</span></div>
    <div class="rrow"><span class="k">Extension</span><span class="v mono">${esc(EXTENSION)}</span></div>
    <div class="rrow"><span class="k">Caller ID</span><span class="v">${c ? flag(c) : ''}<span class="mono">${esc(CALLER_ID)}</span></span></div>
    ${typeof linkReadyRows === 'function' ? linkReadyRows() : ''}
  </section>${typeof linkStatusView === 'function' ? linkStatusView() : ''}${typeof linkScheduledView === 'function' ? linkScheduledView() : ''}`;
}

// directory results: every match is listed; above DIR_PREVIEW rows the list gets its own small scrollbar (.dir-scroll) until "View all" expands it
function dirPreview(matches, qn, ready) {
  const total = matches.length, expanded = S.dirAllQ === qn, shown = matches;
  const head = `${total || 'No'} ${total === 1 ? 'match' : 'matches'} &middot; Directory`;
  const more = total > DIR_PREVIEW ? `<button type="button" class="dir-va" data-a="dirAll" aria-expanded="${expanded}">${expanded ? 'Show less' : `View all results (${total})`} <span aria-hidden="true">${expanded ? '&lsaquo;' : '&rsaquo;'}</span></button>` : '';
  const dialable = !/[a-z]/.test(qn) && qn.replace(/\D/g, '').length >= 6;
  const body = shown.length
    ? `<div class="dir-list${total > DIR_PREVIEW && !expanded ? ' dir-scroll' : ''}" data-q="${esc(qn)}">${shown.map((c, i) => `<div class="dir-item${S.dirSel === c.number ? ' on' : ''}" data-a="dirSel" data-v="${i}"><span class="ini">${esc(initials(c))}</span>
        <div class="txt"><div class="nm"><span class="truncate">${esc(c.name)}</span><span class="dir-score" title="Search match relevance">${c.score}</span></div><div class="co truncate">${esc(c.role)} · <span class="mono">${c.ext ? 'ext ' + esc(c.ext) : esc(c.number)}</span></div></div>
        <button type="button" class="dir-call" data-a="dirCall" data-v="${i}" ${ready ? '' : 'disabled'} aria-label="Call ${esc(c.name)}" title="Call ${esc(c.name)}">${ic('phone', 16)}</button></div>`).join('')}</div>`
    : `<div class="dir-empty">${dialable ? '<span>No directory match. Press Call to dial this number.</span>' : '<b>No matches found</b><span>Try searching by name, phone number or extension.</span>'}</div>`;
  return `<div class="dir"><div class="dir-head"><span>${head}</span>${more}</div>${body}</div>`;
}

function keypadTab() {
  const q = S.dialNumber.trim();
  const valid = /^[+*#\d\s().-]+$/.test(q);
  const canDial = !!q && valid && S.webrtc === 'registered' && ['idle', 'connected', 'on_hold', 'wrap_up'].includes(S.callState);
  const matches = dirSearch(q);
  const ready = S.webrtc === 'registered' && ['idle', 'connected', 'on_hold', 'wrap_up'].includes(S.callState);
  const cas = countryFromNumber(CALLER_ID);
  return `<div class="kp"><div class="kp-scroll"><div class="stack">
    <div class="callas">
      <div class="eyebrow">Calling as</div>
      <span class="cas-pill" title="Caller ID">${cas ? flag(cas) : ''}<b class="mono">${esc(CALLER_ID)}</b></span>
    </div>
    <div class="numwrap">
      <div class="numbox">
        ${numFlag()}
        <input type="text" class="dial-in" data-k="dial" data-i="dial" inputmode="tel" autocomplete="off" value="${esc(S.dialNumber)}" placeholder="Search contacts or dial a number" aria-label="Search contacts or dial a number" />
        <button type="button" class="ib" data-a="back" ${S.dialNumber ? '' : 'disabled'} title="Backspace" aria-label="Backspace">${ic('backspace', 20)}</button>
      </div>
    </div>
    ${matches ? dirPreview(matches, q.toLowerCase(), ready) : ''}
    <div class="kp-dock"><div class="pad">
      ${KEYPAD_BUTTONS.map((b) => `<button class="key${S.audioKey === b.num ? ' hit' : ''}" data-a="key" data-v="${esc(b.num)}" aria-label="${esc(b.num)}"><span class="n">${esc(b.num)}</span>${b.sub ? `<span class="s">${b.sub}</span>` : ''}</button>`).join('')}
    </div>
    <div class="call-row">
      <button class="call-btn ${canDial ? 'ok' : 'no'}" data-a="dial" ${canDial ? '' : 'disabled'} title="${S.webrtc === 'registered' ? 'Call' : 'Waiting for WebRTC registration'}">${ic('phone', 16)}<span>Call</span></button>
      <button type="button" class="clear-btn" data-a="clearDial" ${S.dialNumber ? '' : 'disabled'} title="Clear number" aria-label="Clear number">${ic('x', 20)}</button>
    </div></div>
    ${typeof linkClosedBanner === 'function' ? linkClosedBanner() : ''}${parkedView()}${readyStateView()}
  </div></div></div>`;
}

function toolsView() {
  if (!(S.dtmfOpen || S.transferOpen || S.addCallOpen)) return '';
  const anim = !panelsWereOpen ? ' call-tools-rise' : '';
  let html = '';

  if (S.dtmfOpen) {
    html += `<section class="tool-sec">
      <div class="tool-head"><span class="tool-title">${ic('hash', 16, 'ic-teal')}<span>In-Call DTMF Keypad</span></span>
        <button class="x-btn" data-a="closeDtmf" title="Close keypad" aria-label="Close DTMF keypad">${ic('x', 16)}</button></div>
      <div class="dtmf-out"><output aria-live="polite" aria-label="Entered DTMF digits">${S.dtmfDigits ? esc(S.dtmfDigits) : '<span>Enter digits during this call</span>'}</output>
        <button type="button" class="dtmf-clear" data-a="dtmfClear" title="Clear digits" aria-label="Clear DTMF digits" ${S.dtmfDigits ? '' : 'disabled'}>Clear</button></div>
      <div class="pad">${KEYPAD_BUTTONS.map((b) => `<button class="dtmf-key" data-a="dtmfDigit" data-v="${esc(b.num)}">${esc(b.num)}</button>`).join('')}</div>
      <button class="close-kp" data-a="closeDtmf">Close Keypad</button>
    </section>`;
  }

  if (S.addCallOpen) {
    const q = S.newCallNumber.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    const legs = addLegs(), full = legs >= MAX_LEGS;
    const valid = /^[+*#\d\s().-]+$/.test(q) && /\d/.test(q);
    const hit = (name, num) => !q || name.toLowerCase().includes(q) || (qd && num.replace(/\D/g, '').includes(qd));
    const recents = recentNumbers().filter((r) => hit(r.name, r.number));
    const contactsSearched = addContacts().filter((c) => hit(c.name, c.number));
    const contacts = contactsSearched.filter((c) => S.addStatusFilter === 'all' || c.status === S.addStatusFilter);
    const inCall = callLegNumbers();
    const rShown = S.addRecentAll ? recents : recents.slice(0, 3), cShown = S.addContactsAll ? contacts : contacts.slice(0, 7);
    const av = (n) => `<span class="ini add-av" style="${pastel(n)}">${esc(initials({ name: n }))}</span>`;
    const head = (label, all, on, act) => `<div class="add-sec-h"><span>${label}</span>${all ? `<button type="button" class="add-va" data-a="${act}" aria-expanded="${on}">${on ? 'Show less' : 'View all'}</button>` : ''}</div>`;
    const filtered = S.addStatusFilter !== 'all';
    const fMeta = filtered ? STATUS_META[S.addStatusFilter] : null;
    const statusFilter = `<div class="ct-filter add-status-filter">
      <button type="button" class="ct-filter-btn" data-a="addStatusToggle" aria-haspopup="listbox" aria-expanded="${S.addStatusOpen}" aria-label="Filter contacts by status">${fMeta ? `<i class="ct-dot" style="background:${fMeta.color}"></i>` : ic('filter', 14)}<span>${esc(fMeta ? fMeta.label : 'All Status')}</span>${ic('chevDown', 14)}</button>
      ${S.addStatusOpen ? `<div class="ct-filter-menu" role="listbox">
        ${Object.entries(STATUS_META).map(([k, m]) => `<button type="button" class="ct-filter-opt${S.addStatusFilter === k ? ' on' : ''}" style="${S.addStatusFilter === k ? `background:${m.color}1f;color:${m.color}` : ''}" data-a="addStatusFilter" data-v="${k}" role="option" aria-selected="${S.addStatusFilter === k}">${S.addStatusFilter === k ? ic('check', 14) : `<i class="ct-dot" style="background:${m.color}"></i>`}${esc(m.label)}</button>`).join('')}
      </div>` : ''}
    </div>`;
    html += `<section class="tool-sec add-sec"><form data-f="addCall" class="add-form" autocomplete="off">
      <div class="add-head"><span class="add-ico">${ic('phonePlus', 18)}</span><div class="add-ttl"><b>Add Call</b><span>Add someone to this call.</span></div>
        <span class="add-step" title="Participants in this call">${Math.min(legs + 1, MAX_LEGS)} of ${MAX_LEGS}</span>
        <button type="button" class="x-btn" data-a="cancelAdd" title="Close" aria-label="Close add call panel">${ic('x', 16)}</button></div>
      <div class="add-search">${ic('search', 16)}<input id="add-call-number" type="text" class="add-in" data-k="newCall" data-i="newCall" data-autofocus="1" value="${esc(S.newCallNumber)}" placeholder="Name or number" aria-label="Name or number" />
        <button type="button" class="add-padbtn${S.addPadOpen ? ' on' : ''}" data-a="addPad" title="${S.addPadOpen ? 'Hide dialpad' : 'Show dialpad'}" aria-label="Toggle dialpad" aria-pressed="${S.addPadOpen}">${ic('grid', 16)}</button></div>
      ${S.addPadOpen ? `<div class="pad">${KEYPAD_BUTTONS.map((b) => `<button type="button" class="dtmf-key" data-a="addKey" data-v="${esc(b.num)}">${esc(b.num)}</button>`).join('')}</div>` : ''}
      <button type="submit" class="add-callbtn" ${valid && !full ? '' : 'disabled'} title="${full ? 'Call limit reached' : 'Call this number and add it to the call'}">${ic('phoneCall', 16)}<span>Call to add</span></button>
      ${full ? `<p class="add-note">Call limit reached (${MAX_LEGS}).</p>` : ''}
      ${rShown.length ? `<div class="add-block">${head('Recent numbers', recents.length > 3, S.addRecentAll, 'addAllRecent')}<div class="add-list">${rShown.map((r) => `<div class="add-row">${av(r.name)}
        <div class="add-mid"><b class="truncate">${esc(r.name)}</b><span class="truncate">${esc(r.number)}${r.when ? ' · ' + esc(r.when) : ''}</span></div>
        <button type="button" class="add-use" data-a="addUse" data-v="${esc(r.number)}" aria-label="Use number ${esc(r.number)}">Use number</button></div>`).join('')}</div></div>` : ''}
      <div class="add-block">
        <div class="add-sec-h add-sec-h-filter"><span>Contacts${filtered || contacts.length !== contactsSearched.length ? ` (${contacts.length})` : ''}</span>
          <div class="add-sec-h-tools">${statusFilter}${contacts.length > 7 ? `<button type="button" class="add-va" data-a="addAllContacts" aria-expanded="${S.addContactsAll}">${S.addContactsAll ? 'Show less' : 'View all'}</button>` : ''}</div>
        </div>
        ${cShown.length ? `<div class="add-list">${cShown.map((c) => { const dup = inCall.has(c.number); const st = STATUS_META[c.status]; return `<div class="add-row">${av(c.name)}
        <div class="add-mid"><b class="truncate">${esc(c.name)}</b>${st ? `<span class="ct-status"><i class="ct-dot" style="background:${st.color}"></i>${esc(st.label)}</span>` : ''}</div>
        <button type="button" class="add-plus" data-a="addPerson" data-v="${esc(c.number)}" ${dup || full ? 'disabled' : ''} aria-label="${dup ? esc(c.name) + ' is already in this call' : 'Add ' + esc(c.name) + ' to call'}">${dup ? 'Added' : ic('plus', 14) + '<span>Add</span>'}</button></div>`; }).join('')}</div>`
          : `<div class="add-empty">${ic('users', 22)}<b>No contacts${filtered ? ' with this status' : ' found'}</b><span>${filtered ? 'Try another status or clear the current filter.' : 'Try a different search.'}</span>${filtered ? `<button type="button" class="add-va-clear" data-a="addStatusClear">Clear filter</button>` : ''}</div>`}
      </div>
      ${rShown.length || contactsSearched.length ? '' : '<p class="no-match">No contacts or numbers found</p>'}
    </form></section>`;
  }

  if (S.transferOpen) {
    const calls = transferCalls();
    const q = S.transferQuery.toLowerCase();
    const list = TRANSFER_TARGETS.filter((t) => t.toLowerCase().includes(q));
    let body = '';
    if (S.transferStage === 'search') {
      body += calls.length > 1 ? `<div class="panel-gray"><p class="h">Call to transfer</p><div class="wrap-row">
        ${calls.map((c) => `<button type="button" class="src-btn${S.transferSourceId === c.id ? ' on' : ''}" data-a="srcPick" data-v="${esc(c.id)}">${esc(c.name)} · ${esc(c.label)}</button>`).join('')}</div></div>` : '';
      body += `<div class="mode-wrap">${['Blind', 'Warm'].map((m) => `<button type="button" class="mode${S.transferMode === m ? ' on' : ''}" data-a="mode" data-v="${m}">${m} transfer</button>`).join('')}</div>
        <div><label for="transfer-target-search" class="tool-lbl" style="margin-bottom:4px">Search agent or target queue</label>
          <div class="rel">${ic('search', 14)}<input id="transfer-target-search" class="tool-in sm" data-k="tq" data-i="tq" value="${esc(S.transferQuery)}" placeholder="Search queues or extensions..." /></div></div>
        <div class="targets"><div class="h">Available Queues</div>
          ${list.map((t) => `<button type="button" class="target${S.transferTarget === t ? ' on' : ''}" data-a="target" data-v="${esc(t)}"><b>${esc(t)}</b><span class="a">Available</span></button>`).join('')}
          ${list.length ? '' : '<p class="no-match">No matching transfer targets.</p>'}</div>
        <button type="button" class="btn-pri full" data-a="tContinue" ${S.transferTarget ? '' : 'disabled'}>Continue</button>`;
    } else if (S.transferStage === 'confirm') {
      body = `<div class="confirm-box"><p class="t">Transfer this call to ${esc(S.transferTarget)}?</p><p class="m">${S.transferMode} transfer</p>
        <div class="r"><button type="button" class="btn-out on-s800" data-a="tBack">Back</button>
        <button type="button" class="btn-pri" data-a="tConfirm">${S.transferMode === 'Blind' ? 'Confirm transfer' : 'Start warm consult'}</button></div></div>`;
    } else if (S.transferStage === 'consulting') {
      body = `<div class="consulting">${ic('phoneCall', 24, 'pulse')}<p class="t">Calling ${esc(S.transferTarget)}…</p><p class="m">The current call is held during the consultation.</p></div>`;
    } else if (S.transferStage === 'ready') {
      body = `<div class="ready-box"><p class="t">Transfer target connected</p><p class="m">Complete the warm transfer or return to the call.</p>
        <div class="r"><button type="button" class="btn-out" data-a="tCancelConsult">Cancel consult</button>
        <button type="button" class="btn-pri" data-a="tComplete">Complete transfer</button></div></div>`;
    }
    html += `<section class="tool-sec">
      <div class="tool-head p12"><div><span class="tool-title lg">${ic('phoneForwarded', 16, 'ic-indigo')}Transfer Call</span>
        <p class="hint">Choose a transfer type and destination.</p></div>
        <button type="button" class="x-btn" data-a="closeTransferBtn" aria-label="Close transfer panel">${ic('x', 16)}</button></div>
      ${body}</section>`;
  }
  return `<div class="tools${anim}">${html}</div>`;
}

// Full post-call Wrap-up: real ended-call data (contact/status/cause/duration), plus Schedule Callback / Add Notes /
// Call Again / Clear All Sessions / Close around the existing disposition-required Submit flow (kept as-is below).
// Shared derived facts about the call being wrapped up — used by both the Phone-tab wrapUpView() and the
// floating-window floatWrapUpView(), so the two skins can never disagree about status/cause/tag/etc.
function wrapFacts() {
  const c = S.activeContact || {};
  const name = c.name || 'Unknown Contact', number = c.number || '';
  const ct = number ? contactFor(number) : null, tag = (ct && ct.tags) || '';
  const cancelled = S.endedFrom === 'ringing';
  const statusLabel = cancelled ? 'Cancelled' : 'Completed', causeLabel = cancelled ? 'Cause: Cancelled' : 'Cause: Terminated';
  const avatar = /^[A-Za-z]/.test(name) ? esc(initials({ name })) : ic('phone', 18);
  return { name, number, tag, cancelled, statusLabel, causeLabel, avatar, cb: S.callbacks[S.activeCallId] };
}
// The four expandable/confirm sub-panels (Schedule Callback, Add Notes, Clear Sessions confirm, Unsaved-changes
// confirm) are identical in both skins — only the outer contact/meta/action layout differs by width.
function wrapSubPanels() {
  const minAt = localIso(new Date(Date.now() + 60000)).slice(0, 16); // a minute out, so "right now" isn't rejected by min
  const callbackForm = S.wrapCallbackOpen ? `<div class="wrap-sub-card">
    <div class="wrap-sub-h"><b>Schedule Callback</b><button type="button" class="x-btn" data-a="wrapCallbackCancel" aria-label="Cancel schedule callback">${ic('x', 14)}</button></div>
    <label class="lbl11">Date &amp; time</label>
    <input type="datetime-local" class="field" data-k="cbat" data-i="wrapCallbackAt" min="${minAt}" value="${esc(S.wrapCallbackAt)}" aria-label="Callback date and time" />
    <label class="lbl11" style="margin-top:10px">Who calls back?</label>
    <div class="wrap-radio">
      <label class="ic-opt${S.wrapCallbackOwner === 'me' ? ' on' : ''}"><input type="radio" name="cbowner" data-a="wrapCallbackOwner" data-v="me" ${S.wrapCallbackOwner === 'me' ? 'checked' : ''} /><span><b>Call me back</b><span>You get the reminder at that time, and the contact becomes due then.</span></span></label>
      <label class="ic-opt${S.wrapCallbackOwner === 'team' ? ' on' : ''}"><input type="radio" name="cbowner" data-a="wrapCallbackOwner" data-v="team" ${S.wrapCallbackOwner === 'team' ? 'checked' : ''} /><span><b>Anyone on the team</b><span>No personal reminder; the contact becomes due for whoever is free.</span></span></label>
    </div>
    ${S.wrapCallbackError ? `<p class="wrap-err">${esc(S.wrapCallbackError)}</p>` : ''}
    ${S.wrapCallbackFail ? `<p class="wrap-err">Unable to schedule callback.</p>` : ''}
    <div class="wrap-btnrow"><button type="button" class="rec-sec" data-a="wrapCallbackCancel">Cancel</button>
      <button type="button" class="primary-sm wrap-save" data-a="wrapCallbackSave" ${S.wrapCallbackSaving ? 'disabled' : ''} aria-label="Save callback">${S.wrapCallbackSaving ? 'Saving callback…' : S.wrapCallbackFail ? 'Try Again' : 'Save'}</button></div>
  </div>` : '';

  const notesForm = S.wrapNotesOpen ? `<div class="wrap-sub-card">
    <div class="wrap-sub-h"><b>Add Notes</b><button type="button" class="x-btn" data-a="wrapNotesCancel" aria-label="Cancel add notes">${ic('x', 14)}</button></div>
    <textarea class="field" rows="3" data-k="wrapnote" data-i="wrapNoteDraft" maxlength="500" placeholder="Customer was unavailable. Will call again tomorrow." aria-label="Note text">${esc(S.wrapNoteDraft)}</textarea>
    <span class="wrap-count">${S.wrapNoteDraft.length} / 500</span>
    <div class="wrap-btnrow"><button type="button" class="rec-sec" data-a="wrapNotesCancel">Cancel</button>
      <button type="button" class="primary-sm wrap-save" data-a="wrapNoteSave" ${S.wrapNoteDraft.trim() ? '' : 'disabled'} aria-label="Save note">Save Note</button></div>
  </div>` : '';

  const clearConfirm = S.wrapClearConfirm ? `<div class="rec-confirm" role="alertdialog" aria-label="Clear all sessions"><div><b>Clear all sessions?</b><span>This will clear the current call/session state. Historical calls are not affected.</span></div>
    <button type="button" class="rc-no" data-a="wrapClearNo">Cancel</button><button type="button" class="rc-del" data-a="wrapClearDo">Clear Sessions</button></div>` : '';

  const unsavedConfirm = S.wrapUnsaved ? `<div class="rec-confirm" role="alertdialog" aria-label="Unsaved changes"><div><b>Unsaved changes</b><span>You have unsaved changes. Close without saving?</span></div>
    <button type="button" class="rc-no" data-a="wrapUnsavedKeep">Keep Editing</button><button type="button" class="rc-del" data-a="wrapUnsavedDiscard">Discard</button></div>` : '';

  return { callbackForm, notesForm, clearConfirm, unsavedConfirm };
}

function wrapUpView() {
  const { name, number, tag, cancelled, statusLabel, causeLabel, avatar, cb } = wrapFacts();
  const { callbackForm, notesForm, clearConfirm, unsavedConfirm } = wrapSubPanels();
  const copyBtn = number ? `<button type="button" class="wrap-copy" data-a="copyNum" title="Copy number" aria-label="Copy number">${ic(S.copied ? 'checkCircle' : 'copy', 12)}</button>` : '';
  return `<div class="wrap-card wrap-rich">
    <div class="wrap-title"><span class="wrap-title-ic">${ic('checkCircle', 15)}</span><span>Wrap-up</span></div>
    <p class="wrap-lede">Choose the outcome, add notes, then finish this call.</p>

    <div class="wrap-contact">
      <span class="ini wrap-av" style="${pastel(name)}">${avatar}</span>
      <div class="wrap-cinfo"><b class="truncate">${esc(name)}</b>${number ? `<span class="truncate">${esc(number)}${copyBtn}</span>` : ''}${tag ? `<span class="wrap-tag">${esc(tag)}</span>` : ''}</div>
      <span class="wrap-endbadge"><i class="wrap-dot"></i>Call Ended</span>
    </div>

    <div class="wrap-meta">
      <div class="wrap-meta-cell"><span class="wrap-meta-ic ${cancelled ? 'bad' : 'ok'}">${ic(cancelled ? 'xCircle' : 'checkCircle', 14)}</span><div><span>Status</span><b>${esc(statusLabel)}</b></div></div>
      <div class="wrap-meta-cell"><span class="wrap-meta-ic">${ic('tag', 14)}</span><div><span>Cause</span><b>${esc(causeLabel)}</b></div></div>
      <div class="wrap-meta-cell"><span class="wrap-meta-ic">${ic('clock', 14)}</span><div><span>Duration</span><b class="mono">${formatTime(S.callDuration)}</b></div></div>
    </div>

    ${cb ? `<div class="wrap-note-ok">${ic('checkCircle', 14)}<span>Callback scheduled for ${esc(fmtWhen(new Date(cb.at)))} &middot; ${cb.owner === 'me' ? 'Call me back' : 'Anyone on the team'}</span></div>` : ''}

    <div><label class="lbl11">Select Interaction Outcome *</label>
      <select class="field" data-k="disp" data-i="disposition"><option value="">-- Choose Disposition Code --</option>
        ${DISPOSITION_CODES.map((code) => `<option value="${esc(code)}" ${S.disposition === code ? 'selected' : ''}>${esc(code)}</option>`).join('')}</select></div>
    <div><label class="lbl11">Wrap-up Notes</label>
      <textarea class="field" rows="3" data-k="notes" data-i="notes" maxlength="500" placeholder="Add interaction summary notes...">${esc(S.notes)}</textarea>
      <span class="wrap-count">${S.notes.length} / 500</span></div>
    <button class="primary-sm wrap-submit" data-a="wrapDone" ${S.disposition && !S.wrapSubmitting ? '' : 'disabled'}>${S.wrapSubmitting ? 'Saving…' : `${ic('send', 13)}<span>Submit &amp; Return to Available</span>`}</button>

    <div class="wrap-actions">
      <button type="button" class="wrap-abtn" data-a="wrapToggleCallback" aria-expanded="${S.wrapCallbackOpen}" ${S.wrapSubmitting ? 'disabled' : ''}>${ic('calendar', 14)}<span>Schedule Callback</span></button>
      <button type="button" class="wrap-abtn" data-a="wrapToggleNotes" aria-expanded="${S.wrapNotesOpen}" ${S.wrapSubmitting ? 'disabled' : ''}>${ic('file', 14)}<span>Add Notes</span></button>
      <button type="button" class="wrap-abtn" data-a="wrapCallAgain" aria-label="Call ${esc(name)} again" ${S.wrapSubmitting ? 'disabled' : ''}>${ic('phoneCall', 14)}<span>Call Again</span></button>
      <button type="button" class="wrap-abtn danger" data-a="wrapClearAsk" ${S.wrapSubmitting ? 'disabled' : ''}>${ic('trash', 14)}<span>Clear All Sessions</span></button>
      <button type="button" class="wrap-abtn" data-a="wrapClose" ${S.disposition && !S.wrapSubmitting ? '' : 'disabled'} title="${S.disposition ? '' : 'Select an interaction outcome first'}">${ic('x', 14)}<span>${S.wrapSubmitting ? 'Saving…' : 'Close'}</span></button>
    </div>

    ${callbackForm}${notesForm}${clearConfirm}${unsavedConfirm}
  </div>`;
}

// Floating-window skin: shown by floatOverlay() when a call has just ended (S.callState === 'wrap_up') while the
// agent is away from the Phone tab. Same S.disposition/S.notes/S.wrapCallback*/S.wrapNote* state and A.wrap* actions
// as wrapUpView() (via wrapFacts()/wrapSubPanels()) — only the layout is narrower: single-column status rows and
// full-width stacked action buttons instead of the 3-up meta grid and 2-up action grid.
function floatWrapUpView(justShown) {
  const { name, number, tag, cancelled, statusLabel, causeLabel, avatar, cb } = wrapFacts();
  const { callbackForm, notesForm, clearConfirm, unsavedConfirm } = wrapSubPanels();
  const copyBtn = number ? `<button type="button" class="wrap-copy" data-a="copyNum" title="Copy number" aria-label="Copy number">${ic(S.copied ? 'checkCircle' : 'copy', 12)}</button>` : '';
  const canClose = S.disposition && !S.wrapSubmitting;
  return `<div class="float-win fw-wrapup${justShown ? ' fw-in' : ''}" role="complementary" aria-label="Wrap-up">
    <div class="wrap-card wrap-rich fw-wrapup-card">
      <div class="wrap-title" data-drag="1" title="Drag to move"><span class="wrap-title-ic">${ic('checkCircle', 15)}</span><span>Wrap-up</span></div>
      <p class="wrap-lede">Choose the outcome, add notes, then finish this call.</p>

      <div class="wrap-contact">
        <span class="ini wrap-av" style="${pastel(name)}">${avatar}</span>
        <div class="wrap-cinfo"><b class="truncate">${esc(name)}</b>${number ? `<span class="truncate">${esc(number)}${copyBtn}</span>` : ''}${tag ? `<span class="wrap-tag">${esc(tag)}</span>` : ''}</div>
        <span class="wrap-endbadge"><i class="wrap-dot"></i>Call Ended</span>
      </div>

      <div class="fw-wu-row ${cancelled ? 'bad' : 'ok'}"><span class="fw-wu-ic">${ic(cancelled ? 'xCircle' : 'checkCircle', 14)}</span><span>${cancelled ? 'Call Ended' : 'Call Completed'}</span></div>
      <div class="fw-wu-row info"><span class="fw-wu-ic">${ic('tag', 14)}</span><span>${esc(causeLabel)}</span></div>
      <div class="fw-wu-row"><span class="fw-wu-ic">${ic('clock', 14)}</span><span>Duration</span><b class="mono">${formatTime(S.callDuration)}</b></div>

      ${cb ? `<div class="wrap-note-ok">${ic('checkCircle', 14)}<span>Callback scheduled for ${esc(fmtWhen(new Date(cb.at)))} &middot; ${cb.owner === 'me' ? 'Call me back' : 'Anyone on the team'}</span></div>` : ''}

      <div><label class="lbl11">Select Interaction Outcome *</label>
        <select class="field" data-k="disp" data-i="disposition"><option value="">-- Choose Disposition Code --</option>
          ${DISPOSITION_CODES.map((code) => `<option value="${esc(code)}" ${S.disposition === code ? 'selected' : ''}>${esc(code)}</option>`).join('')}</select></div>
      <div><label class="lbl11">Wrap-up Notes</label>
        <textarea class="field" rows="2" data-k="notes" data-i="notes" maxlength="500" placeholder="Add interaction summary notes...">${esc(S.notes)}</textarea>
        <span class="wrap-count">${S.notes.length} / 500</span></div>

      <div class="fw-wu-actions">
        <button type="button" class="wrap-abtn" data-a="wrapToggleCallback" aria-expanded="${S.wrapCallbackOpen}" ${S.wrapSubmitting ? 'disabled' : ''}>${ic('calendar', 14)}<span>Schedule Callback</span></button>
        <button type="button" class="wrap-abtn" data-a="wrapToggleNotes" aria-expanded="${S.wrapNotesOpen}" ${S.wrapSubmitting ? 'disabled' : ''}>${ic('file', 14)}<span>Add Notes</span></button>
        <button type="button" class="wrap-abtn fw-wu-primary" data-a="wrapCallAgain" aria-label="Call ${esc(name)} again" ${S.wrapSubmitting ? 'disabled' : ''}>${ic('phoneCall', 14)}<span>Call Again</span></button>
        <button type="button" class="wrap-abtn danger" data-a="wrapClearAsk" ${S.wrapSubmitting ? 'disabled' : ''}>${ic('trash', 14)}<span>Clear All Sessions</span></button>
        <button type="button" class="wrap-abtn fw-wu-close" data-a="wrapClose" ${canClose ? '' : 'disabled'} title="${S.disposition ? '' : 'Select an interaction outcome first'}">${ic('x', 14)}<span>${S.wrapSubmitting ? 'Saving…' : 'Close'}</span></button>
      </div>

      ${callbackForm}${notesForm}${clearConfirm}${unsavedConfirm}
    </div>
  </div>`;
}

// recorded share of the call so far; the 1 s interval updates .js-rec / .rec-pop-wave directly without a re-render
const recPct = () => (S.callDuration ? Math.min(100, Math.round((S.recSecs / S.callDuration) * 100)) : 0);
// compact dropdown anchored under the Recording control button: status, timer, waveform, Pause / Play / Stop
function recMenuPopup() {
  const p = S.recPaused, bars = [...WAVE_BARS, ...WAVE_BARS.slice().reverse(), ...WAVE_BARS];
  const played = Math.round((bars.length * recPct()) / 100);
  return `<div class="rec-pop" role="dialog" aria-label="Recording controls">
    <div class="rec-pop-arrow" aria-hidden="true"></div>
    <div class="rec-pop-h"><span class="dot${p ? ' off' : ''}"></span><b>${p ? 'Paused' : 'Recording…'}</b>
      <span class="rec-pop-t mono"><span class="js-rec">${formatTime(S.recSecs)}</span> / <span class="js-timer">${formatTime(S.callDuration)}</span></span></div>
    <div class="rec-pop-wave${p ? ' paused' : ''}" aria-hidden="true">${bars.map(([h, d], i) => `<i class="${i < played ? 'on' : ''}" style="--h:${h};--d:${d}s"></i>`).join('')}</div>
    <div class="rec-pop-ctl">
      <button type="button" class="rec-pop-b${p ? '' : ' active'}" data-a="recPauseGo" ${p ? 'disabled' : ''} title="Pause recording" aria-label="Pause recording">${ic('pause', 16)}<span>Pause</span></button>
      <button type="button" class="rec-pop-b${p ? ' active' : ''}" data-a="recResume" ${p ? '' : 'disabled'} title="Resume recording" aria-label="Resume recording">${ic('play', 16)}<span>Play</span></button>
      <button type="button" class="rec-pop-b stop" data-a="rec" title="Stop recording" aria-label="Stop recording">${ic('stop', 16)}<span>Stop</span></button>
    </div></div>`;
}
function activeTab() {
  const s = S.callState;
  if (s === 'idle') {
    return `<div class="stack"><div class="idle-card">${ic('phoneOff', 40)}<div class="t">No Active Line Connected</div>
      <p>Use the keypad to place a call or wait for inbound calls.</p><button data-a="gotoKeypad">Open Keypad</button></div>${parkedView()}</div>`;
  }
  if (s === 'wrap_up') {
    return wrapUpView();
  }

  const contact = S.activeContact || {};
  const viewId = (wsCall() || {}).id;
  const letter = /^[A-Za-z]/.test(contact.name || '') ? esc(contact.name.charAt(0)) : ic('phone', 22);
  const numIsName = contact.name === contact.number; // plain-number calls: show the number once
  const label = S.connecting ? 'Connecting…' : s === 'ringing' ? 'Ringing' : s === 'on_hold' ? 'On hold' : 'Connected';
  const amber = S.connecting || s === 'ringing' || s === 'on_hold';
  const displayName = S.conf.length ? 'Conference call' : esc(contact.name);
  const confPeople = [S.activeContact, ...S.conf];
  const canMerge = s === 'connected' || s === 'on_hold';
  const copyBtn = `<button type="button" class="copy-btn" data-a="copyNum" title="Copy number" aria-label="Copy number">${ic(S.copied ? 'checkCircle' : 'copy', 14)}</button>`;
  let card;
  if (S.heldCalls.length > 0) {
    card = `<div class="mini-call${viewId === S.activeCallId ? ' ws-viewing' : ''}" role="button" tabindex="0" data-a="wsSelect" data-v="${esc(S.activeCallId)}" title="View this call in the workspace"><div class="mini-av">${letter}</div>
      <div class="mini-mid"><div class="mini-name truncate">${displayName}</div>${numIsName ? '' : `<div class="mini-num mono truncate">${esc(contact.number)}</div>`}${countryLine(contact.number, ' mini')}
        ${S.conf.length ? chipsView(confPeople, true, 'main-compact') : ''}</div>
      <div class="mini-right"><div class="mini-state"><span class="dot ${S.connecting || s === 'ringing' ? 'c-amber-400 ping' : s === 'on_hold' ? 'c-amber' : 'c-emerald-400'}"></span>
        <span class="${amber ? 'amber-600' : 'emerald-600'}">${label}</span></div>
        <div class="mini-timer mono js-timer">${formatTime(S.callDuration)}</div></div></div>`;
  } else {
    const ct = contactFor(contact.number);
    const liveLabel = S.connecting ? 'Connecting…' : s === 'ringing' ? 'Ringing' : s === 'on_hold' ? 'On hold' : 'Live call';
    card = `<div class="call-card">
      <div class="cc-top">
        <div class="lc-live"><span class="dot ${S.connecting || s === 'ringing' ? 'c-amber-400 ping' : s === 'on_hold' ? 'c-amber' : 'c-emerald-400'}"></span><span>${liveLabel}</span><span class="lc-sep" aria-hidden="true">|</span><span class="mono js-timer">${formatTime(S.callDuration)}</span></div>
        <div class="cc-tools">
          ${S.isRecording ? `<span class="state-pill ${S.recPaused ? 'paused' : 'rec'}"><span class="dot"></span>${S.recPaused ? 'Paused' : 'Recording'}</span>` : ''}
          <span class="state-pill ${s === 'connected' && !S.connecting ? 'ok' : 'warn'}"><span class="dot"></span>${label}</span>
          <span class="sig s${{ registered: 3, connecting: 1, disconnected: 0 }[S.webrtc]}" role="img" title="Network: ${esc(WEBRTC[S.webrtc].label)}" aria-label="Network: ${esc(WEBRTC[S.webrtc].label)}"><i></i><i></i><i></i></span>
        </div>
      </div>
      <div class="cc-main">
        <div class="big-avatar${s === 'connected' ? '' : ' idle'}">${S.conf.length ? ic('users', 22) : /^[A-Za-z]/.test(contact.name || '') ? esc(initials(contact)) : ic('phone', 22)}<i class="av-dot"></i></div>
        <div class="cc-info"><div class="call-name truncate">${displayName}${numIsName ? copyBtn : ''}</div>
          ${ct && ct.queue ? `<span class="lc-tag">${ic('users', 12)}Queue · ${esc(ct.queue)}</span>` : ''}
          ${numIsName ? '' : `<div class="call-num mono">${esc(contact.number)}${copyBtn}</div>`}${countryLine(contact.number)}
          <div class="call-acc truncate">${esc([contact.account, ct && ct.company].filter(Boolean).join(' · '))}</div></div>
      </div>
      ${S.conf.length ? partChips() : ''}
      <div class="lc-thiscall"><span>This call</span><b class="mono js-timer">${formatTime(S.callDuration)}</b></div>
      <div class="wave lc-wave${s === 'connected' && !S.isMuted && !(S.isRecording && S.recPaused) ? ' on' : ''}" aria-hidden="true">${[...WAVE_BARS, ...WAVE_BARS.slice().reverse(), ...WAVE_BARS].map(([h, d]) => `<i style="--h:${h};--d:${d}s"></i>`).join('')}</div>
    </div>`;
  }
  const cdCt = contactFor(contact.number);
  const startedAt = new Date(Date.now() - S.callDuration * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const customerLine = contact.account ? `${displayName} (${contact.account})` : displayName;
  const detailRow = (icon, k, v) => `<div class="detail-row">${ic(icon, 15)}<div class="truncate"><b class="dt">${k}</b><span class="dd truncate">${v}</span></div></div>`;
  const details = `<section class="cd${S.moreOpen !== S.moreAnim ? ' open' : ''}" aria-label="Call details">
    <button type="button" class="cd-head" data-a="more" aria-expanded="${S.moreOpen}" aria-controls="cd-body">${ic('more', 16)}<span>Call Details</span>${ic('chevUp', 16, 'cd-chev')}</button>
    <div class="cd-body" id="cd-body"><div class="cd-inner"><div class="detail-list">
      <div class="detail-col">
        ${detailRow('users', 'Queue / Campaign', esc((cdCt && cdCt.queue) || '—'))}
        ${detailRow('phone', 'Phone Number', esc(contact.number))}
        ${detailRow('user', 'Customer', esc(customerLine))}
      </div>
      <div class="detail-col">
        ${detailRow('mapPin', 'Location', esc((cdCt && cdCt.company) || '—'))}
        ${detailRow(S.callType === 'inbound' ? 'phoneIncoming' : 'phoneOutgoing', 'Call Type', S.callType === 'inbound' ? 'Inbound' : 'Outbound')}
        ${detailRow('clock', 'Start Time', esc(startedAt))}
      </div>
    </div></div></div></section>`;

  const held = S.heldCalls.length ? `<section class="held">
    <header><div class="hl"><span class="sq sq-32">${ic('pause', 16)}</span><div style="min-width:0">
      <h3 class="truncate">${S.heldCalls.length} ${S.heldCalls.length === 1 ? 'call' : 'calls'} on hold</h3><p>Switch or merge with the active call</p></div></div>
      <button type="button" class="white-btn" data-a="mergeAll" ${canMerge ? '' : 'disabled'}>${ic('users', 14)}Merge all</button></header>
    <div class="held-list">${S.heldCalls.map((c) => `<article class="held-item${viewId === c.id ? ' ws-viewing' : ''}" role="button" tabindex="0" data-a="wsSelect" data-v="${esc(c.id)}" title="View this call in the workspace">
      <span class="sq sq-36">${ic('pause', 16)}</span>
      <div class="held-mid"><div class="n truncate">${c.participants && c.participants.length > 0 ? 'Conference call' : esc(c.contact.name)}</div>
        <div class="m"><span>${formatTime(c.seconds)}</span><span aria-hidden="true">·</span><span>On hold</span></div></div>
      <div class="held-act">
        <button type="button" class="swap-btn" data-a="swap" data-v="${esc(c.id)}" ${canMerge ? '' : 'disabled'}>${ic('swap', 14)}Swap</button>
        <button type="button" class="end-btn" data-a="endHeld" data-v="${esc(c.id)}" aria-label="End held call with ${esc(c.contact.name)}" title="End held call">${ic('phoneOff', 16)}</button></div>
      ${c.participants && c.participants.length > 0 ? `<div class="held-chips">${chipsView([c.contact, ...c.participants], false, 'held-' + c.id)}</div>` : ''}
    </article>`).join('')}</div></section>` : '';

  return `<div class="stack">
    <div class="lc-controls">
      <button type="button" class="lc-ctl${S.isMuted ? ' on' : ''}" data-a="mute" title="${S.isMuted ? 'Unmute microphone' : 'Mute microphone'}" aria-pressed="${S.isMuted}"><span class="ic-circle">${ic(S.isMuted ? 'micOff' : 'mic', 20)}</span><span>${S.isMuted ? 'Unmute' : 'Mute'}</span></button>
      <button type="button" class="lc-ctl${S.isOnHold ? ' on' : ''}" data-a="hold" title="${S.isOnHold ? 'Resume call' : 'Put call on hold'}" aria-pressed="${S.isOnHold}"><span class="ic-circle">${ic(S.isOnHold ? 'play' : 'pause', 20)}</span><span>${S.isOnHold ? 'Resume' : 'Hold'}</span></button>
      <button type="button" class="lc-ctl" data-a="transfer" title="Transfer call"><span class="ic-circle">${ic('phoneForwarded', 20)}</span><span>Transfer</span></button>
      <button type="button" class="lc-ctl" data-a="addCall" title="Add another call" ${s === 'ringing' ? 'disabled' : ''}><span class="ic-circle">${ic('phonePlus', 20)}</span><span>Add Call</span></button>
      ${S.isRecording
    ? `<div class="lc-ctl-wrap">
          <button type="button" class="lc-ctl rec on${S.recPaused ? ' paused' : ''}${S.recMenuOpen ? ' menu-open' : ''}" data-a="recMenuToggle" title="Recording options" aria-haspopup="true" aria-expanded="${S.recMenuOpen}"><span class="ic-circle">${ic('disc', 20)}</span><span class="lc-rec-lbl">${S.recPaused ? 'Paused' : 'Recording'}${ic('chevDown', 12, 'lc-rec-chev')}</span></button>
          ${S.recMenuOpen ? recMenuPopup() : ''}
        </div>`
    : `<button type="button" class="lc-ctl" data-a="rec" title="Start recording" aria-pressed="false"><span class="ic-circle">${ic('disc', 20)}</span><span>Record</span></button>`}
      <button type="button" class="lc-ctl danger" data-a="hangup" title="End this call"><span class="ic-circle">${ic('phoneOff', 20)}</span><span>End call</span></button>
      <button type="button" class="lc-ctl${S.dtmfOpen ? ' on' : ''}" data-a="dtmf" title="Open DTMF keypad" aria-pressed="${S.dtmfOpen}"><span class="ic-circle">${ic('grid', 20)}</span><span>Keypad</span></button>
      <button type="button" class="lc-ctl" data-a="mergeAll" title="Merge held calls into this call" ${canMerge && S.heldCalls.length ? '' : 'disabled'}><span class="ic-circle">${ic('users', 20)}</span><span>Merge calls</span></button>
      <button type="button" class="lc-ctl" data-a="park" title="Park call: generates a Park ID others can dial to retrieve it" ${s === 'ringing' ? 'disabled' : ''}><span class="ic-circle">${ic('parking', 20)}</span><span>Park</span></button>
      <button type="button" class="lc-ctl${S.moreOpen ? ' on' : ''}" data-a="more" title="Show call details" aria-pressed="${S.moreOpen}" aria-controls="cd-body"><span class="ic-circle">${ic('more', 20)}</span><span>More</span></button>
    </div>
    ${toolsView()}
    ${card}${held}
    ${details}${parkedView()}
  </div>`;
}

function historyTab() {
  const list = historyData().filter((it) => {
    const okType = S.histFilter === 'all' ? true : it.type === S.histFilter;
    const okDate = inDateRange(histAt(it), S.histDateFilter);
    const q = S.histSearch.toLowerCase();
    return okType && okDate && (it.name.toLowerCase().includes(q) || it.number.includes(S.histSearch) || it.account.toLowerCase().includes(q) || it.status.toLowerCase().includes(q));
  });
  const sel = historyData().find((h) => h.id === S.histSel);
  const icon = { inbound: 'phoneIncoming', outbound: 'phoneOutgoing', missed: 'phoneOff' };
  const stCls = statusCls;
  const inContacts = (n) => SPEED_DIAL.some((c) => c.number === n);
  const numFlagOf = (n) => { const c = countryFromNumber(n); return c ? flag(c) : ''; };
  const dir = { inbound: 'Inbound', outbound: 'Outbound', missed: 'Missed' };
  const card = (it) => `<div class="hist-item${sel && sel.id === it.id ? ' sel' : ''}" role="button" tabindex="0" data-a="histSelect" data-v="${it.id}" title="View call details" aria-pressed="${!!sel && sel.id === it.id}">
      <div class="hist-ic ${it.type}" title="${dir[it.type]} call">${ic(icon[it.type], 18)}</div>
      <div class="hist-mid"><div class="n truncate">${esc(it.name)}</div><div class="p mono">${numFlagOf(it.number)}<span class="truncate">${esc(it.number)}</span></div>
        <div class="hist-badges"><span class="hst ${stCls(it.status)}">${esc(it.status)}</span>${it.voicemail ? '<span class="hst vm">Voicemail</span>' : ''}${it.transcript ? '<span class="hst tr">Transcript</span>' : ''}${inContacts(it.number) ? '' : '<span class="hnc">Not in contacts</span>'}</div></div>
      <div class="hist-right">${contactCallCount(it.number) > 1 ? `<span class="hcount" title="${contactCallCount(it.number)} calls with this contact">${contactCallCount(it.number)}</span>` : ''}<div class="tm">${esc(it.time)}</div><div class="du mono">${esc(it.duration)}</div></div>
      <button type="button" class="hist-call" data-a="histCall" data-v="${it.id}" title="Call again" aria-label="Call ${esc(it.name)} again">${ic('phone', 16)}</button></div>`;
  const empty = (h, t) => `<div class="hist-empty">${ic('clock', 32)}<b>${h}</b><span>${t}</span></div>`;
  return `<div class="stack-3">
    <div>
      <div class="hist-in-wrap">${ic('search', 16)}<input type="text" class="hist-in" data-k="hist" data-i="histSearch" placeholder="Search contacts &amp; calls..." aria-label="Search call history" value="${esc(S.histSearch)}" /></div>
      <div class="filters">${['all', 'inbound', 'outbound', 'missed'].map((t) => `<button class="flt${S.histFilter === t ? ' on' : ''}" data-a="histFilter" data-v="${t}" aria-pressed="${S.histFilter === t}">${t}</button>`).join('')}
        <select class="flt hist-daterange" data-i="histDateFilter" aria-label="Filter call history by date range">${DATE_RANGES.map(([k, l]) => `<option value="${k}" ${S.histDateFilter === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="hist-list">${list.map(card).join('')}${list.length ? '' : !S.dummyData ? empty('No call history yet', 'Calls you make and receive will appear here.') : !CALL_HISTORY_DATA.length ? empty('No call history yet', 'Calls you make and receive will appear here.') : S.histDateFilter !== 'all' ? empty('No calls in this date range', `Try a wider range than "${DATE_RANGES.find((d) => d[0] === S.histDateFilter)[1]}".`) : S.histFilter !== 'all' && !S.histSearch.trim() ? empty(`No ${S.histFilter} calls`, 'Try another filter.') : empty('No calls found', 'Try a different search or filter.')}</div>
  </div>`;
}

function emptyTab(icon, title, sub, heading, text) {
  return `<div class="stack">
    <div class="rec-head"><span class="sq">${ic(icon, 20)}</span><div><h2>${title}</h2><p>${sub}</p></div></div>
    <div class="empty"><span class="sq">${ic(icon, 20)}</span><h3>${heading}</h3><p>${text}</p></div></div>`;
}

/* ---- Recordings views ---- */
const recFlag = (n) => { const c = countryFromNumber(n); return c ? flag(c) : ''; };
const recDirIcon = { inbound: 'phoneIncoming', outbound: 'phoneOutgoing', missed: 'phoneOff' };
function recFiltered() {
  const q = S.recSearch.trim().toLowerCase();
  return visRecordings().filter((r) => (S.recFilter === 'all' || r.direction === S.recFilter)
    && (!q || [r.name, r.number, r.ext, r.account, r.agent, r.callId, r.department].some((x) => x && String(x).toLowerCase().includes(q))));
}

function recRow(r) {
  const on = S.recSel === r.id, playing = on && S.recAudioId === r.id && S.recPlaying;
  const b = (act, icon, label, extra = '') => `<button type="button" class="rec-b${extra}" data-a="${act}" data-v="${r.id}" title="${label}" aria-label="${label}"`;
  const menu = S.recMenu === r.id ? `<div class="rec-menu" role="menu">
      <button type="button" role="menuitem" data-a="recSelect" data-v="${r.id}">Open details</button>
      <button type="button" role="menuitem" data-a="recNoteGo" data-v="${r.id}">Add note</button>
      <button type="button" role="menuitem" data-a="recCopyNum" data-v="${r.id}">Copy number</button>
      <button type="button" role="menuitem" data-a="recCopyId" data-v="${r.id}">Copy call ID</button>
      <button type="button" role="menuitem" data-a="recContactGo" data-v="${r.id}">Open contact</button>
      <button type="button" role="menuitem" class="danger" data-a="recDelAsk" data-v="${r.id}">Delete recording</button></div>` : '';
  const confirm = S.recConfirm === r.id ? `<div class="rec-confirm" role="alertdialog" aria-label="Delete recording"><div><b>Delete recording?</b><span>This action cannot be undone.</span></div>
      <button type="button" class="rc-no" data-a="recDelNo">Cancel</button><button type="button" class="rc-del" data-a="recDelDo" data-v="${r.id}">Delete</button></div>` : '';
  return `<div class="hist-item rec-item${on ? ' sel' : ''}" role="button" tabindex="0" data-a="recSelect" data-v="${r.id}" aria-pressed="${on}" title="View recording details">
    <div class="rec-top"><div class="hist-ic ${r.direction}" title="${esc(r.direction)} call">${ic(recDirIcon[r.direction], 18)}</div>
      <div class="hist-mid"><div class="n truncate">${esc(r.name)}</div><div class="p mono">${recFlag(r.number)}<span class="truncate">${esc(r.number)}</span></div>
        <div class="hist-badges"><span class="hst ${statusCls(r.status)}">${esc(r.status)}</span><span class="hst ${r.hasRecording ? 'info' : 'muted'}">${r.hasRecording ? 'Recorded' : 'No recording'}</span>${r.tr ? '<span class="hst tr">Transcript</span>' : ''}</div></div>
      <div class="hist-right"><div class="tm">${recDay(r)}</div><div class="du mono">${formatTime(r.duration)}</div></div></div>
    <div class="rec-acts">
      ${b('recPlay', '', playing ? 'Pause recording' : 'Play recording', playing ? ' on' : '')} ${r.hasRecording ? '' : 'disabled'}>${ic(playing ? 'pause' : 'play', 16)}</button>
      ${b('recDl', '', 'Download recording')} ${r.hasRecording ? '' : 'disabled'}>${ic('download', 16)}</button>
      ${b('recTr', '', r.tr ? 'Open transcript' : 'Transcript unavailable')} ${r.tr ? '' : 'disabled'}>${ic('file', 16)}</button>
      ${b('recCall', '', `Call back ${esc(r.name)}`, ' call')}>${ic('phone', 16)}</button>
      ${b('recMore', '', 'More actions', S.recMenu === r.id ? ' on' : '')} aria-expanded="${S.recMenu === r.id}">${ic('moreV', 16)}</button></div>
    ${menu}${confirm}</div>`;
}

function recordingsTab() {
  const list = recFiltered(), all = visRecordings(), total = all.reduce((s, r) => s + r.duration, 0);
  return `<div class="stack-3">
    <div class="rec-head2"><span class="rec-hi">${ic('mic2', 18)}</span><div><b>Recordings</b><span>Review and manage your call recordings.</span></div>
      <div class="rec-cnt" title="Recordings and total length"><b>${all.length}</b><span class="mono">${formatTime(total)}</span></div></div>
    <div>
      <div class="hist-in-wrap">${ic('search', 16)}<input type="text" class="hist-in" data-k="recq" data-i="recSearch" placeholder="Search recordings, name or number..." aria-label="Search recordings" value="${esc(S.recSearch)}" /></div>
      <div class="filters">${['all', 'inbound', 'outbound', 'missed'].map((t) => `<button class="flt${S.recFilter === t ? ' on' : ''}" data-a="recFilter" data-v="${t}" aria-pressed="${S.recFilter === t}">${t}</button>`).join('')}</div>
    </div>
    <div class="hist-list">${list.map(recRow).join('')}${list.length ? '' : `<div class="hist-empty">${ic('mic2', 32)}<b>${all.length ? 'No recordings found' : 'No recordings yet'}</b><span>${all.length ? 'Try changing your search or filter.' : 'Recorded calls will appear here.'}</span></div>`}</div>
  </div>`;
}

function recPlayer(r) {
  if (!r.hasRecording) return `<div class="rp rp-off">${ic('mic2', 18)}<span>Recording file is unavailable.</span></div>`;
  const a = recAudio(r), on = S.recAudioId === r.id, cur = on ? AUDIO.currentTime : 0, playing = on && S.recPlaying, f = Math.min(1, cur / r.duration);
  const muted = S.recMuted || S.recVol === 0, ctl = (act, icon, label, v = '') => `<button type="button" class="rp-b" data-a="${act}" ${v ? `data-v="${v}"` : ''} title="${label}" aria-label="${label}">${ic(icon, 18)}</button>`;
  return `<div class="rp" aria-label="Recording player">
    <div class="rp-wave" title="Click to seek">${a.peaks.map((p, i) => `<i class="${i / a.peaks.length < f ? 'on' : ''}" style="--h:${p.toFixed(2)}"></i>`).join('')}</div>
    <div class="rp-time"><span class="mono js-rp-cur">${formatTime(Math.floor(cur))}</span>
      <input type="range" class="rp-seek" min="0" max="${r.duration}" step="0.1" value="${cur.toFixed(1)}" style="--pct:${f * 100}%" aria-label="Seek" /><span class="mono">${formatTime(r.duration)}</span></div>
    <div class="rp-ctl">
      <select class="rp-rate" data-i="recRate" aria-label="Playback speed" title="Playback speed">${[0.75, 1, 1.25, 1.5, 2].map((x) => `<option value="${x}" ${S.recRate === x ? 'selected' : ''}>${x}x</option>`).join('')}</select>
      ${ctl('recSkip', 'rew10', 'Back 10 seconds', '-10')}
      <button type="button" class="rp-play" data-a="recPlayCur" title="${playing ? 'Pause' : 'Play'}" aria-label="${playing ? 'Pause' : 'Play'}">${ic(playing ? 'pause' : 'play', 20)}</button>
      ${ctl('recSkip', 'fwd10', 'Forward 10 seconds', '10')}
      <span class="rp-gap"></span>
      ${ctl('recMute', muted ? 'volumeX' : 'volume', muted ? 'Unmute' : 'Mute')}
      <input type="range" class="rp-vol" min="0" max="1" step="0.05" value="${S.recMuted ? 0 : S.recVol}" style="--pct:${(S.recMuted ? 0 : S.recVol) * 100}%" aria-label="Volume" />
      ${ctl('recDl', 'download', 'Download recording', r.id)}
    </div></div>`;
}

function transcriptView(r) {
  const segs = recSegs(r);
  let body = '';
  if (!segs) body = `<div class="rec-empty">${ic('file', 28)}<b>Transcript unavailable for this ${r.kind === 'vm' ? 'voicemail' : 'recording'}.</b></div>`;
  else {
    const q = S.recTq.trim().toLowerCase();
    const hits = q ? segs.map((s, i) => (s.text.toLowerCase().includes(q) ? i : -1)).filter((i) => i >= 0) : [];
    const curHit = hits.length ? hits[S.recTqIdx % hits.length] : -1;
    const nowT = S.recAudioId === r.id ? AUDIO.currentTime : -1;
    body = `<div class="tr-bar"><div class="tr-search">${ic('search', 14)}<input type="text" data-k="trq" data-i="recTq" value="${esc(S.recTq)}" placeholder="Search transcript..." aria-label="Search transcript" /></div>
      ${q ? `<span class="tr-cnt mono">${hits.length ? (S.recTqIdx % hits.length) + 1 : 0}/${hits.length}</span>
        <button type="button" class="rec-b" data-a="recTqNav" data-v="-1" title="Previous match" aria-label="Previous match" ${hits.length ? '' : 'disabled'}>${ic('chevUp', 14)}</button>
        <button type="button" class="rec-b" data-a="recTqNav" data-v="1" title="Next match" aria-label="Next match" ${hits.length ? '' : 'disabled'}>${ic('chevDown', 14)}</button>` : ''}
      <button type="button" class="rec-sec sm" data-a="recTdl" data-v="txt" title="Download transcript as TXT">${ic('download', 14)}<span>TXT</span></button>
      <button type="button" class="rec-sec sm" data-a="recTdl" data-v="csv" title="Download transcript as CSV">${ic('download', 14)}<span>CSV</span></button></div>
      ${q && !hits.length ? '<p class="rec-mut">No matches in this transcript.</p>' : ''}
      <div class="tr-list">${segs.map((s, i) => `<button type="button" class="seg ${s.role}${i === curHit ? ' cur' : ''}${nowT >= s.t0 && nowT < s.t1 ? ' now' : ''}" data-n="${i}" data-a="recSeg" data-v="${i}" title="Play from ${formatTime(s.t0)}">
        <span class="seg-t mono">${formatTime(s.t0)} - ${formatTime(s.t1)}</span><b>${esc(s.who)}</b><span class="seg-x">${hl(s.text, q)}</span></button>`).join('')}</div>`;
  }
  return body;
}

function recWorkspace(r) {
  const segs = recSegs(r), P = S.activePanel;
  const dirLabel = { inbound: 'Inbound', outbound: 'Outbound', missed: 'Missed' }[r.direction];
  const ctx = `<div class="cur-call" role="status" aria-label="Selected recording"><span class="cur-av">${ic(recDirIcon[r.direction], 18)}</span>
    <div class="cur-mid"><div class="n truncate">${esc(r.name)}</div><div class="call-country mini">${recFlag(r.number)}<span class="mono">${esc(r.number)}</span></div></div>
    <div class="cur-r"><div class="st ${statusCls(r.status) === 'ok' ? 'available' : statusCls(r.status) === 'bad' ? 'offline' : 'busy'}"><i></i>${esc(r.status)}</div><div class="t mono">${formatTime(r.duration)}</div></div></div>`;
  const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  let body = '';
  if (P === 'Copilot') {
    body = `<section class="rec-card"><h3>Call recording details</h3><dl class="rec-dl">
      ${row('Contact', esc(r.name))}${row('Phone number', `<span class="rec-fl">${recFlag(r.number)}<span class="mono">${esc(r.number)}</span></span>`)}${r.ext ? row('Extension', esc(r.ext)) : ''}
      ${row('Date &amp; time', esc(recFull(r)))}${row('Duration', `<span class="mono">${formatTime(r.duration)}</span>`)}${row('Direction', dirLabel)}
      ${row('Agent', esc(r.agent))}${row('Department', esc(r.department))}${row('Status', `<span class="hst ${statusCls(r.status)}">${esc(r.status)}</span>`)}
      ${row('Recording', r.hasRecording ? 'Recorded' : 'Unavailable')}${row('Transcript', r.tr ? 'Available' : 'None')}${row('Account', esc(r.account))}${row('Call ID', `<span class="mono">${esc(r.callId)}</span>`)}</dl>
      <div class="rec-tags">${r.hasRecording ? '<span class="hst info">Recorded</span>' : ''}${r.tr ? '<span class="hst tr">Transcript</span>' : ''}</div>
      <div class="rec-btns"><button type="button" class="rec-pri" data-a="recCall" data-v="${r.id}">${ic('phone', 14)}<span>Call back</span></button>
        <button type="button" class="rec-sec" data-a="recTrGo" ${r.tr ? '' : 'disabled'} title="${r.tr ? 'Open transcript' : 'Transcript unavailable'}">${ic('extLink', 14)}<span>Open Transcript</span></button></div></section>
      <div class="ws-cards">${COPILOT_ACTIONS.map((c) => `<button type="button" class="ws-card" disabled title="AI is not connected in this demo"><span class="ci ci-${c.tint}">${ic(c.icon, 18)}</span><span><b>${esc(c.title)}</b><span>AI not connected</span></span>${ic('chevRight', 15, 'ws-chev')}</button>`).join('')}</div>`;
  } else if (P === 'Summary') {
    const items = S.recActions[r.id] || [];
    body = `<section class="rec-card"><h3>${ic('sparkles', 14)}AI summary</h3><p class="rec-mut">AI summary is not available: no AI service is connected to this demo.</p></section>
      <section class="rec-card"><h3>Action items</h3>
        <form data-f="recAct" class="rec-actform"><input type="text" data-k="recact" data-i="recActIn" value="${esc(S.recActDraft)}" placeholder="Add an action item..." aria-label="New action item" /><button type="submit" class="rec-pri" ${S.recActDraft.trim() ? '' : 'disabled'}>Add</button></form>
        <div class="ai-list">${items.map((a) => `<div class="ai-item${a.done ? ' done' : ''}"><button type="button" class="ai-chk" role="checkbox" aria-checked="${a.done}" data-a="recActToggle" data-v="${a.id}" title="${a.done ? 'Mark as open' : 'Mark as done'}">${a.done ? ic('checkCircle', 16) : '<i></i>'}</button>
          <span>${esc(a.text)}</span><button type="button" class="ai-del" data-a="recActDel" data-v="${a.id}" title="Delete action item" aria-label="Delete action item">${ic('x', 14)}</button></div>`).join('')}
          ${items.length ? '' : '<p class="rec-mut">No action items yet.</p>'}</div></section>`;
  } else if (P === 'Transcript') {
    body = transcriptView(r);
  } else if (P === 'Notes') {
    body = `<section class="rec-card"><h3>Notes</h3><textarea class="field rec-note" rows="6" data-k="recnote" data-i="recNote" placeholder="Add a note..." aria-label="Recording notes">${esc(S.recNotes[r.id] || '')}</textarea>
      <p class="rec-mut">Notes are kept for this session only (no backend).</p></section>`;
  } else if (P === 'History') {
    const others = visRecordings().filter((x) => x.number === r.number && x.id !== r.id);
    body = `<section class="rec-card"><h3>Other recordings with this number</h3>${others.length ? others.map((x) => `<button type="button" class="rec-link" data-a="recSelect" data-v="${x.id}"><span>${esc(recDay(x))} · ${dirLabelOf(x)}</span><span class="mono">${formatTime(x.duration)}</span></button>`).join('') : '<p class="rec-mut">No other recordings for this contact.</p>'}</section>`;
  } else {
    body = `<section class="rec-card"><h3>Contact</h3><dl class="rec-dl">${row('Name', esc(r.name))}${row('Phone number', `<span class="rec-fl">${recFlag(r.number)}<span class="mono">${esc(r.number)}</span></span>`)}${r.ext ? row('Extension', esc(r.ext)) : ''}${row('Account', esc(r.account))}${row('Department', esc(r.department))}</dl>
      <div class="rec-btns"><button type="button" class="rec-pri" data-a="recCall" data-v="${r.id}">${ic('phone', 14)}<span>Call back</span></button>
        <button type="button" class="rec-sec" data-a="recCopyNum" data-v="${r.id}">${ic('copy', 14)}<span>Copy number</span></button></div></section>`;
  }
  const form = P === 'Copilot' ? `<form class="ws-form" data-f="ask"><select class="ws-pill" aria-label="Copilot scope" disabled><option>Answers from this recording</option></select>
      <div class="ws-row"><div class="q-wrap">${ic('sparkles', 16, 'fill')}<input type="text" class="q-in" disabled aria-label="Ask Copilot about this recording" placeholder="AI is not connected in this demo" /></div>
      <button type="submit" class="send" disabled aria-label="Send question">${ic('send', 20)}</button></div></form>` : '';
  return `<section class="ws">
    <nav aria-label="Recording workspace" class="ws-nav">${PANELS.map((p) => `<button type="button" class="ws-tab${P === p ? ' on' : ''}" data-a="panel" data-v="${p}" ${P === p ? 'aria-current="page"' : ''}>${p === 'Copilot' ? ic('sparkles', 16, 'fill') : ''}${p}</button>`).join('')}</nav>
    ${recPlayer(r)}
    <div class="ws-scroll rec-scroll">${ctx}${body}</div>${form}</section>`;
}
/* ---- Voicemail views ---- */
const vmAv = (n, cls = '') => `<span class="ini vm-av${cls}" style="${pastel(n)}">${esc(initials({ name: n }))}</span>`;
const vmSub = (v) => `${v.ext ? esc(v.ext) : esc(v.number)} &bull; ${esc(v.department)}`;

function vmRow(v) {
  const on = S.vmSel === v.id, playing = S.recAudioId === v.id && S.recPlaying;
  const b = (act, label, extra = '') => `<button type="button" class="rec-b${extra}" data-a="${act}" data-v="${v.id}" title="${label}" aria-label="${label}"`;
  return `<div class="hist-item rec-item vm-item${v.read ? '' : ' unread'}${on ? ' sel' : ''}" role="button" tabindex="0" data-a="vmSelect" data-v="${v.id}" aria-pressed="${on}" title="Open voicemail">
    <div class="rec-top">${vmAv(v.name)}${v.read ? '' : '<i class="vm-dot" title="Unread"></i>'}
      <div class="hist-mid"><div class="n truncate">${esc(v.name)}</div><div class="p mono"><span class="truncate">${vmSub(v)}</span></div>
        <div class="hist-badges"><span class="hst ${statusCls(v.status)}">${esc(v.status)}</span><span class="hst vm">Voicemail</span>${v.tr ? '<span class="hst tr">Transcript</span>' : ''}${v.resolved ? '<span class="hst ok">Resolved</span>' : ''}${v.assignedTo ? `<span class="hst info truncate">${esc(v.assignedTo)}</span>` : ''}</div></div>
      <div class="hist-right"><div class="tm">${ic(recDirIcon[v.direction], 11)} ${recDay(v)}</div><div class="tm mono">${new Date(v.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div><div class="du mono">${formatTime(v.duration)}</div></div></div>
    <div class="rec-acts">
      ${b('recPlay', playing ? 'Pause voicemail' : 'Play voicemail', playing ? ' on' : '')} ${v.hasRecording ? '' : 'disabled'}>${ic(playing ? 'pause' : 'play', 16)}</button>
      ${b('recDl', 'Download voicemail')} ${v.hasRecording ? '' : 'disabled'}>${ic('download', 16)}</button>
      ${b('recCall', `Call back ${esc(v.name)}`, ' call')}>${ic('phone', 16)}</button></div></div>`;
}

function voicemailsTab() {
  const all = visVoicemails().filter(vmVisible), list = vmFiltered(), unread = all.filter((v) => !v.read).length;
  const F = [['all', 'All'], ['unread', `Unread${unread ? ` (${unread})` : ''}`], ['mine', 'Assigned to me'], ['unassigned', 'Unassigned']];
  return `<div class="stack-3">
    <div class="rec-head2"><span class="rec-hi">${ic('voicemail', 18)}</span><div><b>Voicemails</b><span>Listen to messages callers left for you.</span></div>
      <div class="rec-cnt" title="Voicemails you can access"><b>${all.length}</b><span>${unread} unread</span></div></div>
    <div>
      <div class="hist-in-wrap">${ic('search', 16)}<input type="text" class="hist-in" data-k="vmq" data-i="vmSearch" placeholder="Search voicemails, name or number..." aria-label="Search voicemails" value="${esc(S.vmSearch)}" /></div>
      <div class="filters">${F.map(([k, l]) => `<button class="flt${S.vmFilter === k ? ' on' : ''}" data-a="vmFilter" data-v="${k}" aria-pressed="${S.vmFilter === k}">${l}</button>`).join('')}</div>
    </div>
    <div class="hist-list">${list.map(vmRow).join('')}${list.length ? '' : `<div class="hist-empty">${ic('voicemail', 32)}<b>${all.length ? 'No voicemails found' : 'No voicemails yet'}</b><span>${all.length ? 'Try changing your search or filter.' : 'Messages callers leave will appear here.'}</span></div>`}</div>
  </div>`;
}

function vmWorkspace(v) {
  const T = S.vmTab, dt = new Date(v.start), me = PARK_AGENT.name;
  const when = `${dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${dt.toLocaleTimeString('en-GB', { timeZoneName: 'short' })}`;
  const row = (k, val) => `<div><dt>${k}</dt><dd>${val}</dd></div>`;
  const canDel = vmCanDelete(v);
  const menu = S.vmMenu ? `<div class="rec-menu" role="menu">
      <button type="button" role="menuitem" data-a="vmCopyNum">Copy phone number</button>${v.ext ? '<button type="button" role="menuitem" data-a="vmCopyExt">Copy extension</button>' : ''}
      <button type="button" role="menuitem" data-a="vmCopyId">Copy call ID</button><button type="button" role="menuitem" data-a="vmContactGo">Open contact</button>
      <button type="button" role="menuitem" data-a="vmRead">Mark ${v.read ? 'unread' : 'read'}</button><button type="button" role="menuitem" data-a="vmNoteGo">Add note</button>
      ${canDel ? '<button type="button" role="menuitem" class="danger" data-a="vmDelAsk">Delete voicemail</button>' : ''}</div>` : '';
  const confirm = S.vmConfirm ? `<div class="rec-confirm" role="alertdialog" aria-label="Delete voicemail"><div><b>Delete voicemail?</b><span>This action cannot be undone.</span></div>
      <button type="button" class="rc-no" data-a="vmDelNo">Cancel</button><button type="button" class="rc-del" data-a="vmDelDo" data-v="${v.id}">Delete</button></div>` : '';
  let body = '';
  if (T === 'Transcript') body = transcriptView(v);
  else if (T === 'AI Summary') body = `<section class="rec-card"><h3>${ic('sparkles', 14)}AI summary</h3><p class="rec-mut">AI summary is not available for this voicemail. No AI service is connected to this demo.</p></section>`;
  else if (T === 'Notes') {
    const draft = S.vmDraft.n[v.id] ?? v.notes;
    body = `<section class="rec-card"><h3>Notes</h3><textarea class="field rec-note" rows="5" data-k="vmnote" data-i="vmNote" placeholder="Add a note..." aria-label="Voicemail notes">${esc(draft)}</textarea>
      <div class="rec-btns"><button type="button" class="rec-pri" data-a="vmSaveNote" ${draft === v.notes ? 'disabled' : ''}>Save</button>${draft === v.notes && v.notes ? '<span class="rec-mut">Saved</span>' : ''}</div></section>`;
  } else if (T === 'Follow-up') {
    const draft = S.vmDraft.f[v.id] ?? v.followNote;
    body = `<section class="rec-card"><h3>Voicemail follow-up</h3>
      <dl class="rec-dl">${row('Status', `<span class="hst ${v.resolved ? 'ok' : v.read ? 'info' : 'muted'}">${vmFollow(v)}</span>`)}
        ${row('Assigned to', `<select class="rp-rate vm-assign" data-i="vmAssign" aria-label="Assigned to"><option value="">Unassigned</option>${vmUsers().map((n) => `<option value="${esc(n)}" ${v.assignedTo === n ? 'selected' : ''} ${vmCanAssign(n) ? '' : 'disabled'}>${esc(n)}${n === me ? ' (me)' : ''}${vmCanAssign(n) ? '' : ' - no access'}</option>`).join('')}</select>`)}</dl>
      <button type="button" class="vm-resolve${v.resolved ? ' on' : ''}" role="checkbox" aria-checked="${v.resolved}" data-a="vmResolve">${v.resolved ? ic('checkCircle', 16) : '<i></i>'}<span>${v.resolved ? 'Resolved' : 'Unresolved'}</span></button>
      <label class="rec-mut vm-lbl" for="vm-follow">Note</label>
      <textarea id="vm-follow" class="field rec-note" rows="3" data-k="vmfollow" data-i="vmFollow" placeholder="e.g. Called back, left a message">${esc(draft)}</textarea>
      <div class="rec-btns"><button type="button" class="rec-pri" data-a="vmSaveFollow" ${draft === v.followNote ? 'disabled' : ''}>Save</button></div></section>`;
  } else {
    body = `<section class="rec-card"><h3>Contact</h3><dl class="rec-dl">${row('Name', esc(v.name))}${row('Phone number', `<span class="rec-fl">${recFlag(v.number)}<span class="mono">${esc(v.number)}</span></span>`)}${v.ext ? row('Extension', esc(v.ext)) : ''}${row('Account', esc(v.account))}${row('Department', esc(v.department))}</dl>
      <div class="rec-btns"><button type="button" class="rec-pri" data-a="recCall" data-v="${v.id}">${ic('phone', 14)}<span>Call back</span></button>
        <button type="button" class="rec-sec" data-a="vmCopyNum">${ic('copy', 14)}<span>Copy number</span></button></div></section>`;
  }
  return `<section class="ws">
    <div class="vm-top"><b>Voicemail details</b><button type="button" class="rec-b" data-a="vmClose" title="Close voicemail details" aria-label="Close voicemail details">${ic('x', 16)}</button></div>
    <div class="ws-scroll rec-scroll">
      <div class="vm-head">${vmAv(v.name, ' lg')}<div class="vm-hn"><b class="truncate">${esc(v.name)}</b><span class="mono truncate">${vmSub(v)}</span></div>
        <button type="button" class="rec-b${S.vmMenu ? ' on' : ''}" data-a="vmMore" title="More actions" aria-label="More actions" aria-expanded="${S.vmMenu}">${ic('moreV', 16)}</button></div>
      ${menu}${confirm}
      <dl class="rec-dl vm-meta">${row('Date &amp; time', esc(when))}${row('Duration', `<span class="mono">${formatTime(v.duration)}</span>`)}${row('Status', `<span class="hst ${statusCls(v.status)}">${esc(v.status)}</span>`)}
        ${row('Direction', v.direction === 'inbound' ? 'Inbound' : 'Outbound')}${row('From number', `<span class="rec-fl">${recFlag(v.number)}<span class="mono">${esc(v.number)}</span></span>`)}${row('Assigned to', esc(v.assignedTo || 'Unassigned'))}${row('Type', 'Voicemail')}${row('Call ID', `<span class="mono">${esc(v.callId)}</span>`)}</dl>
      <div class="rec-btns vm-acts"><button type="button" class="rec-pri" data-a="recCall" data-v="${v.id}">${ic('phone', 14)}<span>Call back</span></button>
        <button type="button" class="rec-sec" data-a="vmContactGo">${ic('user', 14)}<span>Open in Contact</span></button></div>
      ${recPlayer(v)}
      <div class="vm-tabs" role="tablist">${['Transcript', 'AI Summary', 'Notes', 'Follow-up', 'Contact'].map((t) => `<button type="button" role="tab" class="vm-tab${T === t ? ' on' : ''}" aria-selected="${T === t}" data-a="vmTab" data-v="${t}">${t}</button>`).join('')}</div>
      ${body}</div></section>`;
}
const dirLabelOf = (x) => ({ inbound: 'Inbound', outbound: 'Outbound', missed: 'Missed' }[x.direction]);

function leftCol() {
  const tabs = [['keypad', 'Keypad', 'grid'], ['active', 'Active Call', 'phoneCall'], ['history', 'History', 'clock'], ['recordings', 'Recordings', 'mic2'], ['voicemails', 'Voicemails', 'voicemail']];
  let content = '';
  if (S.activeTab === 'keypad') content = keypadTab();
  else if (S.activeTab === 'active') content = activeTab();
  else if (S.activeTab === 'history') content = historyTab();
  else if (S.activeTab === 'recordings') content = recordingsTab();
  else content = voicemailsTab();
  return `<div class="phone-col"><div class="left">
    <div class="tabs">${tabs.map(([id, label, icn]) => `<button class="tab${S.activeTab === id ? ' on' : ''}" data-a="tab" data-v="${id}" ${S.activeTab === id ? 'aria-current="page"' : ''}>
      ${id === 'active' && S.callState !== 'idle' ? '<span class="pingdot ping"></span>' : ''}${ic(icn, 16)}<span class="t">${label}</span></button>`).join('')}</div>
    <div class="tab-body${S.activeTab === 'keypad' ? ' kp-body' : ''}" id="tab-body">${content}</div>
  </div></div>`;
}

/* ---- Call workspace views ---- */
const wsStatusCls = (s) => (/connected|complet/i.test(s) ? 'available' : /miss|cancel|fail|abandon/i.test(s) ? 'offline' : 'busy');
const wsFlag = (n) => { const c = countryFromNumber(n); return c ? flag(c) : ''; };

function wsCtx(call) {
  const timer = call.active && call.live && S.callState === 'connected' && !S.isOnHold;
  const cc = countryFromNumber(call.number);
  const account = call.contact && call.contact.account;
  const ccLine = [cc ? esc(cc.name) : null, account ? esc(account) : null].filter(Boolean).join(' | ');
  const numLine = call.participants.length
    ? `<div class="ws-ps truncate" title="${esc(call.participants.map((p) => personName(p)).join(', '))}">${call.participants.map((p) => `${esc(personName(p))} (${esc(p.number)})`).join(' + ')}</div>`
    : `<div class="ws-numline mono">${ic('phone', 13)}<span>${esc(call.number)}</span><button type="button" class="copy-btn" data-a="wsCopyNum" data-v="${esc(call.number)}" title="Copy number" aria-label="Copy number">${ic(S.wsCopied ? 'checkCircle' : 'copy', 13)}</button></div>`;
  return `<div class="cur-call ws-ctx" role="status" aria-label="Selected call"><span class="cur-av">${ic(call.participants.length ? 'users' : 'phone', 18)}</span>
    <div class="cur-mid"><div class="n truncate">${esc(call.name)}</div>${numLine}
      ${ccLine ? `<div class="ws-acc truncate">${cc ? flag(cc) : ''} ${ccLine}</div>` : ''}</div>
    <div class="cur-r"><div class="st ${wsStatusCls(call.status)}"><i></i>${esc(call.status)}</div><div class="t mono${timer ? ' js-timer' : ''}">${formatTime(call.duration)}</div></div>
    <button type="button" class="cc-more${S.moreOpen ? ' on' : ''}" data-a="more" title="Call details" aria-label="Call details" aria-expanded="${S.moreOpen}">${ic('moreV', 16)}</button></div>`;
}

function wsSelectedCard(call) {
  const n = wsHistory(call).length, row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<section class="rec-card"><h3>Selected call</h3><dl class="rec-dl">
    ${row('Contact', esc(call.name))}${row('Number', `<span class="rec-fl">${wsFlag(call.number)}<span class="mono">${esc(call.number)}</span></span>`)}
    ${row('Direction', esc(call.direction))}${row('Status', `<span class="hst ${statusCls(call.status) === 'info' && /connected|hold|ring/i.test(call.status) ? (call.status === 'Connected' ? 'ok' : 'muted') : statusCls(call.status)}">${esc(call.status)}</span>`)}
    ${row('Result', esc(call.result))}${row('When', esc(call.when))}${row('Duration', `<span class="mono">${formatTime(call.duration)}</span>`)}${row('Of', n ? `${n} ${n === 1 ? 'call' : 'calls'} · showing the latest` : 'No earlier calls')}</dl>
    ${call.participants.length ? `<div class="ws-people"><b>Participants</b>${call.participants.map((p) => `<span class="hst info">${esc(p.name)}</span>`).join('')}</div>` : ''}</section>`;
}

function wsEmpty(P) {
  const cards = COPILOT_ACTIONS.map((c) => `<button type="button" class="ws-card" disabled title="Available once a call is connected"><span class="ci ci-${c.tint}">${ic(c.icon, 18)}</span><span><b>${esc(c.title)}</b><span>${esc(c.sub)}</span></span>${ic('chevRight', 15, 'ws-chev')}</button>`).join('');
  const msg = { Copilot: ['Live transcript appears during a call.', TAB_EMPTY_STATES.Copilot.detail], Summary: ['No recap yet.', 'Select or start a call to see its summary.'], Transcript: ['No transcript captured for this call.', 'Select or start a call to see its transcript.'],
    Notes: ['No notes on this call yet.', 'Select or start a call to add notes.'], History: ['No previous interactions found.', 'Select or start a call to see its history.'], Contact: ['Contact details will appear here.', 'Contact information will appear when a call is selected.'] }[P];
  return `<div class="ws-body"><div class="ws-ico">${ic('sparkles', 32, 'fill')}</div><h2>${esc(msg[0])}</h2><p>${esc(msg[1])}</p></div><div class="ws-cards">${cards}</div>`;
}

const WS_AI = { summary: 'AI recap is unavailable for this call.', suggest: 'Smart suggestions are unavailable.' };
function wsAiResult(call) {
  const v = S.wsAiView;
  if (!v || v.callId !== call.id) return '';
  if (v.kind === 'actions') {
    const items = wsSummary(call.id).actions;
    return `<section class="rec-card"><h3>Action items</h3>${items.length ? `<div class="ai-list">${items.map((a) => `<div class="ai-item${a.done ? ' done' : ''}"><button type="button" class="ai-chk" role="checkbox" aria-checked="${a.done}" data-a="wsActToggle" data-v="${a.id}" title="${a.done ? 'Mark as open' : 'Mark as done'}">${a.done ? ic('checkCircle', 16) : '<i></i>'}</button><span>${esc(a.text)}</span></div>`).join('')}</div>`
      : '<p class="rec-mut">No action items have been generated yet.</p>'}<p class="rec-mut">AI extraction is not connected. Items you add on the Summary tab show up here.</p></section>`;
  }
  return `<section class="rec-card"><h3>${v.kind === 'summary' ? 'Call recap' : 'Smart suggestions'}</h3><p class="rec-mut">${WS_AI[v.kind]}</p></section>`;
}
function wsCopilot(call) {
  const rec = wsRecording(call);
  const noTr = !call.live && !(rec && rec.tr) ? '<p class="rec-mut">No transcript captured for this call.</p>' : '';
  const trsBanner = S.wsTrsDismissed[call.id] ? '' : `<div class="ws-trs">${ic('mic2', 16)}<div><b>Live transcription is unavailable.</b><span>Live transcripts are not connected in this demo, so nothing is captured while you talk.</span></div>
    <button type="button" class="ws-trs-x" data-a="wsTrsDismiss" data-v="${esc(call.id)}" title="Dismiss" aria-label="Dismiss">${ic('x', 14)}</button></div>`;
  const cards = COPILOT_ACTIONS.map((c) => `<button type="button" class="ws-card${S.wsAiView && S.wsAiView.callId === call.id && S.wsAiView.kind === c.key ? ' on' : ''}" data-a="wsAi" data-v="${c.key}"><span class="ci ci-${c.tint}">${ic(c.icon, 18)}</span><span><b>${esc(c.title)}</b><span>${esc(c.sub)}</span></span>${ic('chevRight', 15, 'ws-chev')}</button>`).join('');
  const chat = (S.wsChat[call.id] || []).map((m) => `<div class="ws-chat"><p class="q">${esc(m.q)}</p><p class="a">${ic('sparkles', 12, 'fill')} ${esc(m.a)}</p></div>`).join('');
  const tail = `<div class="ws-cards">${cards}</div>${wsAiResult(call)}${chat ? `<section class="rec-card"><h3>Questions</h3>${chat}</section>` : ''}`;
  if (call.live) {
    return `${trsBanner}
      <div class="ws-body"><div class="ws-ico">${ic('sparkles', 32, 'fill')}</div><h2>Live transcript appearing during a call.</h2><p>You are on a live call. Ask Copilot to get key points, action items, or real-time guidance.</p></div>${tail}`;
  }
  return `<section class="rec-card ws-endc"><h3>${ic('sparkles', 14)}Copilot <span class="hst muted ws-live">Call ended</span></h3><p class="rec-mut">Live call has ended. Transcript and notes are available in the tabs above.</p>${noTr}</section>
    ${wsSelectedCard(call)}<div class="ws-short"><button type="button" class="rec-sec" data-a="panel" data-v="Transcript">${ic('file', 14)}<span>Transcript</span></button><button type="button" class="rec-sec" data-a="panel" data-v="Notes">${ic('file', 14)}<span>Notes</span></button><button type="button" class="rec-sec" data-a="panel" data-v="History">${ic('clock', 14)}<span>All calls with this number</span></button></div>${tail}`;
}

// talk ratio and turn count come from the selected call's real transcript (null when none was captured)
function wsMeasures(call) {
  const rec = wsRecording(call), segs = rec && recSegs(rec);
  if (!segs) return { segs: null, pa: null, turns: 0, words: 0 };
  const a = segs.filter((x) => x.role === 'a').reduce((t, x) => t + x.t1 - x.t0, 0), c = segs.filter((x) => x.role === 'c').reduce((t, x) => t + x.t1 - x.t0, 0);
  return { segs, pa: Math.round((a / (a + c || 1)) * 100), turns: segs.length, words: segs.reduce((t, x) => t + x.text.trim().split(/\s+/).length, 0) };
}
function wsSummaryTab(call) {
  const s = wsSummary(call.id), outcome = s.draft ?? s.outcome ?? '', saved = s.outcome || (call.disposition || '');
  const sel = outcome || saved;
  const m = wsMeasures(call), mrow = (k, badge, v) => `<div class="ws-mrow"><span>${k}</span><i class="hst ${badge ? 'info' : 'muted'}">${badge || 'n/a'}</i><b>${v}</b></div>`;
  return `<section class="rec-card"><h3>Call recap <span class="ws-tag">AI recap not connected</span></h3>
    <div class="ws-sub"><b>Call measures</b><div class="ws-meas">${mrow('Sentiment', call.sentiment ? 'Reported' : '', esc(call.sentiment || 'Unavailable'))}${mrow('Talk ratio', m.segs ? 'Measured' : '', m.segs ? `Agent ${m.pa}% · Customer ${100 - m.pa}% (${m.words} words)` : 'Unavailable')}${mrow('Checklist', '', 'Not configured')}${mrow('Transcript turns', m.segs ? 'Counted' : '', m.segs ? m.turns : 0)}</div></div>
    <div class="ws-sub"><b>Key points</b><p class="rec-mut">No AI recap for this call.</p><button type="button" class="rec-sec sm" disabled title="AI is not connected in this demo">${ic('sparkles', 14)}<span>Generate recap</span></button></div>
    <div class="ws-sub"><b>Action items</b>
      <form data-f="wsAct" class="rec-actform"><input type="text" data-k="wsact" data-i="wsActIn" value="${esc(S.wsActDraft)}" placeholder="Add an action item..." aria-label="New action item" /><button type="submit" class="rec-pri" ${S.wsActDraft.trim() ? '' : 'disabled'}>Add</button></form>
      <div class="ai-list">${s.actions.map((a) => `<div class="ai-item${a.done ? ' done' : ''}"><button type="button" class="ai-chk" role="checkbox" aria-checked="${a.done}" data-a="wsActToggle" data-v="${a.id}" title="${a.done ? 'Mark as open' : 'Mark as done'}">${a.done ? ic('checkCircle', 16) : '<i></i>'}</button>
        <span>${esc(a.text)}</span><button type="button" class="ai-del" data-a="wsActDel" data-v="${a.id}" title="Delete action item" aria-label="Delete action item">${ic('x', 14)}</button></div>`).join('')}${s.actions.length ? '' : '<p class="rec-mut">No action items yet.</p>'}</div></div>
    <div class="ws-sub"><b>Call outcome</b><div class="rec-btns"><select class="rp-rate vm-assign" data-i="wsOutcome" aria-label="Call outcome"><option value="">Select outcome</option>${DISPOSITION_CODES.map((d) => `<option value="${esc(d)}" ${sel === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
      <button type="button" class="rec-pri" data-a="wsSaveSummary" ${s.draft == null || s.draft === s.outcome ? 'disabled' : ''}>Save Summary</button></div>${s.outcome ? `<p class="rec-mut">Saved outcome: ${esc(s.outcome)}</p>` : ''}</div></section>`;
}

function wsTranscriptTab(call) {
  const rec = wsRecording(call), { segs, pa } = wsMeasures(call);
  let ratio = '<p class="rec-mut">Not available without a transcript.</p>';
  if (segs) {
    ratio = `<div class="ws-ratio"><span>Agent</span><i style="--w:${pa}%"></i><b>${pa}%</b></div><div class="ws-ratio"><span>Customer</span><i style="--w:${100 - pa}%"></i><b>${100 - pa}%</b></div>`;
  }
  const left = segs ? transcriptView(rec) : `<div class="rec-empty">${ic('file', 28)}<b>No transcript captured for this call.</b>${call.live ? '<span>Live transcription is not connected in this demo.</span>' : ''}</div>`;
  return `<div class="wst"><section class="rec-card"><h3>Transcript records${call.live && segs ? ' <span class="hst ok ws-live">Live</span>' : ''}</h3>${left}</section>
    <section class="rec-card"><h3>Conversation insights</h3><div class="ws-sub"><b>Sentiment</b><p>${esc(call.sentiment || '-')}</p></div>
      <div class="ws-sub"><b>Call summary</b><p class="rec-mut">No AI recap for this call.</p><button type="button" class="rec-sec sm" disabled title="AI is not connected in this demo">${ic('sparkles', 14)}<span>Generate recap</span></button></div>
      <div class="ws-sub"><b>Talk ratio</b>${ratio}</div></section></div>
    <section class="rec-card ws-recbox"><h3>Recording</h3>${rec ? recPlayer(rec) : '<p class="rec-mut">No recording for this call.</p>'}</section>`;
}

// Contacts nav page (S.nav === 'contact'): real search + status filter over the existing DIRECTORY data, with an
// "Added" pin state persisted to localStorage (contactsAdded). Not a real company directory backend — Add just
// means "pin to my personal quick list" client-side, same honesty level as everything else in this demo.
function contactsPageView() {
  const q = S.contactsSearch.trim().toLowerCase();
  const matches = DIRECTORY.filter((c) => {
    if (S.contactsFilter !== 'all' && c.status !== S.contactsFilter) return false;
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.ext.includes(q) || c.dept.toLowerCase().includes(q);
  });
  const filterLabel = S.contactsFilter === 'all' ? 'All Status' : STATUS_META[S.contactsFilter].label;
  const counts = Object.keys(STATUS_META).reduce((m, k) => { m[k] = DIRECTORY.filter((c) => c.status === k).length; return m; }, {});
  const row = (c) => {
    const added = !!S.contactsAdded[c.ext];
    const st = STATUS_META[c.status];
    return `<div class="ct-row">
      <span class="ini ct-av" style="${pastel(c.name)}">${esc(initials(c))}</span>
      <div class="ct-info"><b class="truncate">${esc(c.name)}</b><span class="ct-status"><i class="ct-dot" style="background:${st.color}"></i>${esc(st.label)}</span></div>
      <button type="button" class="ct-add${added ? ' added' : ''}" data-a="contactAdd" data-v="${esc(c.ext)}" ${added ? 'disabled' : ''}>${added ? ic('check', 14) : ic('plus', 14)}<span>${added ? 'Added' : 'Add'}</span></button>
    </div>`;
  };
  const filterMenu = `<div class="ct-filter-menu" role="listbox">
    ${Object.entries(STATUS_META).map(([k, m]) => `<button type="button" class="ct-filter-opt${S.contactsFilter === k ? ' on' : ''}" style="${S.contactsFilter === k ? `background:${m.color}1f;color:${m.color}` : ''}" data-a="contactsFilter" data-v="${k}"><i class="ct-dot" style="background:${m.color}"></i>${esc(m.label)}</button>`).join('')}
  </div>`;
  const legendCard = `<div class="ct-legend"><h3>Status Legend${ic('info', 14, 'ct-info-ic')}</h3>${Object.entries(STATUS_META).map(([k, m]) => `<div class="ct-leg-row"><i class="ct-dot" style="background:${m.color}"></i><span>${esc(m.label)}</span></div>`).join('')}</div>`;
  const countCard = `<div class="ct-legend ct-count-card"><h3>Status Count${ic('info', 14, 'ct-info-ic')}</h3>${Object.entries(STATUS_META).map(([k, m]) => `<div class="ct-leg-row"><i class="ct-dot" style="background:${m.color}"></i><span>${esc(m.label)}</span><b class="ct-cbadge" style="background:${m.color}1f;color:${m.color}">${counts[k]}</b></div>`).join('')}</div>`;
  const legendMobile = `<div class="ct-legend ct-legend-mobile"><h3>Status Legend${ic('info', 14, 'ct-info-ic')}</h3><div class="ct-leg-grid">${Object.entries(STATUS_META).map(([k, m]) => `<div class="ct-leg-row"><i class="ct-dot" style="background:${m.color}"></i><span>${esc(m.label)}</span></div>`).join('')}</div></div>`;
  return `<div class="wrap"><div class="ws"><div class="ct-page">
    <div class="ct-head">
      <button type="button" class="ct-back" data-a="nav" data-v="phone" aria-label="Back to Phone">${ic('chevLeft', 18)}</button>
      <div class="ct-head-title"><h2>Contacts <span class="ct-count">(${DIRECTORY.length})</span></h2><p class="rec-mut">Directory of internal agents and queues.</p></div>
      <button type="button" class="ct-filter-ic" data-a="contactsFilterToggle" aria-haspopup="listbox" aria-expanded="${S.contactsFilterOpen}" aria-label="Filter by status">${ic('filter', 16)}</button>
      <div class="ct-tools">
        <div class="hist-in-wrap ct-search">${ic('search', 16)}<input type="text" class="hist-in" data-k="ctq" data-i="contactsSearch" placeholder="Search contacts..." aria-label="Search contacts" value="${esc(S.contactsSearch)}" /></div>
        <div class="ct-filter">
          <button type="button" class="ct-filter-btn" data-a="contactsFilterToggle" aria-haspopup="listbox" aria-expanded="${S.contactsFilterOpen}">${ic('filter', 14)}<span>${esc(filterLabel)}</span>${ic('chevDown', 14)}</button>
          ${S.contactsFilterOpen ? filterMenu : ''}
        </div>
        <button type="button" class="rec-sec sm ct-viewall" data-a="contactsViewAll">View all</button>
      </div>
    </div>
    <div class="ct-body">
      <div class="ct-list">${matches.length ? matches.map(row).join('') : `<div class="rec-empty">${ic('users', 28)}<b>No contacts found</b><span>Try another name, extension or status.</span></div>`}</div>
      <div class="ct-side">${legendCard}${countCard}</div>
      ${legendMobile}
    </div>
  </div></div></div>`;
}

// notes keep light markup in plain text: **bold**, *italic*, ++underline++, "- " bullets, "1. " numbers; rendered after esc()
const fmtNote = (t) => {
  const inl = (x) => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\+\+(.+?)\+\+/g, '<u>$1</u>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  const out = []; let list = null;
  const flush = () => { if (list) { out.push(`<${list.tag}>${list.items.join('')}</${list.tag}>`); list = null; } };
  t.split('\n').forEach((ln) => {
    const m = /^(-|\d+\.) (.*)$/.exec(ln), tag = m ? (m[1] === '-' ? 'ul' : 'ol') : null;
    if (list && list.tag !== tag) flush();
    if (m) { if (!list) list = { tag, items: [] }; list.items.push(`<li>${inl(m[2])}</li>`); } else out.push(`<span>${inl(ln)}</span>`);
  });
  flush();
  return out.join('');
};
function wsNotesTab(call) {
  const notes = S.callNotes[call.id] || [], editing = !!S.wsNoteEdit, fb = (k, ico, t) => `<button type="button" class="ws-fb" data-a="wsFmt" data-v="${k}" title="${t}" aria-label="${t}">${ico}</button>`;
  return `<section class="rec-card"><h3>Notes <span class="pk-n">${notes.length}</span><span class="ws-tag">This call</span></h3>
    <textarea class="field rec-note" rows="4" data-k="wsnote" data-i="wsNote" placeholder="Write a note about this call..." aria-label="Call note">${esc(S.wsNoteDraft)}</textarea>
    <div class="ws-fmt" role="toolbar" aria-label="Formatting">${fb('b', '<b>B</b>', 'Bold')}${fb('i', '<i>I</i>', 'Italic')}${fb('u', '<u>U</u>', 'Underline')}${fb('ul', '&bull;', 'Bulleted list')}${fb('ol', '1.', 'Numbered list')}<button type="button" class="ws-fb r" disabled title="Attachments are not available in this demo" aria-label="Attach file">${ic('file', 14)}</button></div>
    <div class="rec-btns"><button type="button" class="rec-pri ws-wide" data-a="wsNoteSave" ${S.wsNoteDraft.trim() ? '' : 'disabled'}>${editing ? 'Update Note' : 'Save Note'}</button>${editing ? '<button type="button" class="rec-sec" data-a="wsNoteCancel">Cancel</button>' : ''}</div></section>
    <section class="rec-card"><h3>Previous notes</h3>${notes.length ? notes.map((n) => `<div class="ws-note"><span class="ini vm-av" style="${pastel(n.author)}">${esc(initials({ name: n.author }))}</span>
      <div class="ws-note-b"><div class="nt">${fmtNote(n.text)}</div><span class="rec-mut">${esc(n.author)} · ${esc(fmtWhen(new Date(n.ts)))}${n.edited ? ' · edited' : ''}</span></div>
      <div class="ws-note-a"><button type="button" class="rec-b" data-a="wsNoteEdit" data-v="${n.id}" title="Edit note" aria-label="Edit note">${ic('file', 14)}</button><button type="button" class="rec-b" data-a="wsNoteDel" data-v="${n.id}" title="Delete note" aria-label="Delete note">${ic('trash', 14)}</button></div></div>`).join('') : '<p class="rec-mut">No notes on this call yet.</p>'}</section>`;
}

// "—" for any field this project genuinely doesn't track (queue, wrap-up on legacy rows) — never fabricated.
const dash = (v) => (v ? esc(v) : '—');
// Compact sidebar for the History tab: real recordings for this number (same S.recordings store the Recordings tab
// and recWorkspace's "Other recordings" panel already use) with Play/Download/Transcript/Call — not a parallel data set.
function wsHistSidebar(call) {
  // Match by number OR extension — some curated voicemails carry the caller's full number with the contact's
  // extension in .ext (e.g. an internal contact selected by extension), and they belong to the same person.
  const mine = (x) => sameNumber(x.number, call.number) || (x.ext && sameNumber(x.ext, call.number));
  const vms = visVoicemails().filter(mine);
  const recs = visRecordings().filter(mine);
  const me = PARK_AGENT.name;
  const actions = (x) => {
    const playing = S.recAudioId === x.id && S.recPlaying;
    return `<div class="rec-acts">
      <button type="button" class="rec-b${playing ? ' on' : ''}" data-a="recPlay" data-v="${x.id}" ${x.hasRecording ? '' : 'disabled'} title="${playing ? 'Pause' : 'Play'}" aria-label="${playing ? 'Pause' : 'Play'} recording">${ic(playing ? 'pause' : 'play', 14)}</button>
      <button type="button" class="rec-b" data-a="recDl" data-v="${x.id}" ${x.hasRecording ? '' : 'disabled'} title="Download" aria-label="Download recording">${ic('download', 14)}</button>
      <button type="button" class="rec-b" data-a="mediaTr" data-v="${x.id}" ${x.tr ? '' : 'disabled'} title="Transcript" aria-label="Open transcript">${ic('file', 14)}</button>
      <button type="button" class="rec-b" data-a="recCall" data-v="${x.id}" title="Call back" aria-label="Call back ${esc(x.name)}">${ic('phone', 14)}</button></div>`;
  };
  // Clicking a voicemail row expands its deep details + a real inline Follow-up form right here (not a navigate-away
  // jump) — the outer row carries the toggle action, the inner Play/Download/Transcript/Call buttons each carry
  // their own data-a, so the delegated click handler's closest() match stops at whichever element was actually clicked.
  // Only .rec-top (the header row) is the expand/collapse toggle target — the follow-up form below it (a <select>
  // and <textarea>, neither of which carries its own data-a) must NOT be inside that toggle's hit area, or every
  // click to open the dropdown or focus the note field would bubble up and immediately collapse the panel again.
  const vmRow = (v) => {
    const open = S.histVmOpen === v.id;
    return `<div class="hist-item rec-item wsh-rec-item${open ? ' open' : ''}">
      <div class="rec-top" role="button" tabindex="0" data-a="histVmToggle" data-v="${v.id}" aria-expanded="${open}">${vmAv(v.name)}
        <div class="hist-mid"><div class="wsh-rtitle"><span class="n truncate">Received by ${esc(v.name)}</span><span class="mono wsh-rdur">${formatTime(v.duration)}</span></div>
          <div class="p mono wsh-rdate">${esc(fmtWhenFull(new Date(v.start)))}</div></div></div>
      <div class="wsh-racts-row"><div class="hist-badges"><span class="hst ${statusCls(v.status)}">${esc(v.status)}</span><span class="hst vm">Voicemail</span>${v.tr ? '<span class="hst tr">Transcript</span>' : ''}</div>${actions(v)}</div>
      ${open ? `<div class="hist-vm-follow">
        <div class="vmf-head">${ic('tag', 13)}<b>Voicemail follow-up</b><span class="hst ${v.resolved ? 'ok' : v.read ? 'info' : 'muted'}">${esc(vmFollow(v))}</span></div>
        <div class="vmf-row">
          <label class="vmf-lbl" for="vmf-assign-${v.id}">Assigned to</label>
          <select id="vmf-assign-${v.id}" class="rp-rate vm-assign" data-i="histVmAssign" aria-label="Assigned to">
            <option value="">Unassigned</option>${vmUsers().map((n) => `<option value="${esc(n)}" ${v.assignedTo === n ? 'selected' : ''} ${vmCanAssign(n) ? '' : 'disabled'}>${esc(n)}${n === me ? ' (me)' : ''}${vmCanAssign(n) ? '' : ' - no access'}</option>`).join('')}</select>
        </div>
        <button type="button" class="vm-resolve${v.resolved ? ' on' : ''}" role="checkbox" aria-checked="${v.resolved}" data-a="histVmResolve">${v.resolved ? ic('checkCircle', 16) : '<i></i>'}<span>${v.resolved ? 'Resolved' : 'Unresolved'}</span></button>
        <div class="vmf-row">
          <label class="vmf-lbl" for="vmf-note-${v.id}">Note</label>
          <textarea id="vmf-note-${v.id}" class="field rec-note" rows="2" data-k="histvmnote" data-i="histVmNote" placeholder="e.g. Called back, left a message">${esc(S.histVmDraft)}</textarea>
        </div>
        <button type="button" class="rec-pri sm" data-a="histVmSave">${ic('check', 13)}<span>Save</span></button>
      </div>` : ''}</div>`;
  };
  const recRow = (x) => `<div class="hist-item rec-item wsh-rec-item">
      <div class="rec-top">${vmAv(x.name)}
        <div class="hist-mid"><div class="wsh-rtitle"><span class="n truncate">${x.direction === 'outbound' ? 'Outbound' : 'Inbound'} call recording</span><span class="mono wsh-rdur">${formatTime(x.duration)}</span></div>
          <div class="p mono wsh-rdate">${esc(fmtWhenFull(new Date(x.start)))}</div></div></div>
      <div class="wsh-racts-row"><div class="hist-badges"><span class="hst ${statusCls(x.status)}">${esc(x.status)}</span>${x.tr ? '<span class="hst tr">Transcript</span>' : ''}</div>${actions(x)}</div></div>`;
  const tab = S.wshMediaTab === 'rec' ? 'rec' : 'vm';
  return `<aside class="wsh-side">
    <div class="rec-head2 wsh-retain"><span class="rec-hi">${ic('voicemail', 18)}</span>
      <div><b>Voicemail retention</b><span>Recordings and transcripts stay available until you delete them — this demo has no backend, so there is no admin-set retention period.</span></div></div>
    <div class="filters wsh-media-tabs" role="tablist" aria-label="Voicemails or Recordings">
      <button type="button" class="flt${tab === 'vm' ? ' on' : ''}" role="tab" aria-selected="${tab === 'vm'}" data-a="wshMediaTab" data-v="vm">Voicemails <span class="pk-n">${vms.length}</span></button>
      <button type="button" class="flt${tab === 'rec' ? ' on' : ''}" role="tab" aria-selected="${tab === 'rec'}" data-a="wshMediaTab" data-v="rec">Recordings <span class="pk-n">${recs.length}</span></button>
    </div>
    <div class="wsh-side-list">${tab === 'vm'
      ? (vms.length ? vms.map(vmRow).join('') : '<p class="rec-mut">No voicemails for this number.</p>')
      : (recs.length ? recs.map(recRow).join('') : '<p class="rec-mut">No recordings for this number.</p>')}</div>
  </aside>`;
}
// Interaction History filters: status and direction are two independent, combinable facets (not one flat
// single-select) — "Voicemail + Inbound" must narrow to records matching BOTH, not just one or the other.
// Kept separate from Column 1's histFilter/histSearch, which have their own independent state.
const WSH_STATUSES = ['all', 'Completed', 'Cancelled', 'Missed', 'Not connected', 'voicemail'];
const WSH_DIRS = ['all', 'Inbound', 'Outbound'];
const wshFilterLabel = (f) => (f === 'all' ? 'All' : f === 'voicemail' ? 'Voicemail' : f);
// Small timeline-node border color per interaction status/type (matches the approved reference timeline design).
function wshNodeCls(r) {
  if (r.voicemail) return 'vm';
  if (/transfer/i.test(r.status)) return 'transfer';
  if (/conference/i.test(r.status) || r.type === 'conference') return 'conf';
  if (/complet/i.test(r.status)) return 'ok';
  if (/miss|abandon/i.test(r.status)) return 'bad';
  if (/cancel/i.test(r.status)) return 'muted';
  return 'info'; // Not connected / anything else
}
function wshMatchFilter(r) {
  const s = S.wsHistStatus, d = S.wsHistDir;
  const okStatus = s === 'all' ? true : s === 'voicemail' ? !!r.voicemail : s === 'Missed' ? /miss/i.test(r.status) : r.status === s;
  const okDir = d === 'all' ? true : r.direction === d;
  return okStatus && okDir;
}
function wsHistoryTab(call) {
  const allRows = wsHistory(call), dateRows = allRows.filter((r) => inDateRange(r.at, S.histDateFilter));
  const q = S.wsHistSearch.trim().toLowerCase();
  const rows = dateRows.filter((r) => wshMatchFilter(r) && (!q || [r.title, r.status, r.direction, r.result, r.queue].some((x) => x && String(x).toLowerCase().includes(q))));
  const filtersActive = S.wsHistSearch || S.wsHistStatus !== 'all' || S.wsHistDir !== 'all' || S.histDateFilter !== 'all';
  return `<div class="wsh-split" style="--divider-position:${S.wsDividerPos}%">${wsHistSidebar(call)}<div class="wsh-divider" role="separator" aria-orientation="vertical" aria-label="Resize panels" title="Drag to resize"><span class="wsh-handle" data-drag-split="1"></span></div><div class="wsh-main"><section class="rec-card">
    <div class="wsh-fixed">
      <h3>Interaction History <span class="pk-n">${rows.length}</span><span class="ws-tag">Call logs · live</span></h3>
      <div class="ws-thisnum"><div><span class="rec-mut">This number</span><b class="mono">${esc(call.number)}</b></div><button type="button" class="rec-pri" data-a="wsDial" aria-label="Call ${esc(call.number)}">${ic('phone', 14)}<span>Call</span></button></div>
      <div class="hist-in-wrap wsh-search">${ic('search', 15)}<input type="text" class="hist-in" data-k="wshist" data-i="wsHistSearch" placeholder="Search this contact's interactions..." aria-label="Search interaction history" value="${esc(S.wsHistSearch)}" /></div>
      <div class="wsh-filterbar" role="group" aria-label="Interaction filters">
        <label class="wsh-fld"><span>Status:</span><select class="flt wsh-sel" data-i="wsHistStatus" aria-label="Filter by status">${WSH_STATUSES.map((f) => `<option value="${f}" ${S.wsHistStatus === f ? 'selected' : ''}>${esc(wshFilterLabel(f))}</option>`).join('')}</select></label>
        <label class="wsh-fld"><span>Direction:</span><select class="flt wsh-sel" data-i="wsHistDir" aria-label="Filter by direction">${WSH_DIRS.map((f) => `<option value="${f}" ${S.wsHistDir === f ? 'selected' : ''}>${esc(wshFilterLabel(f))}</option>`).join('')}</select></label>
        <label class="wsh-fld"><span>Date:</span><select class="flt wsh-sel" data-i="histDateFilter" aria-label="Filter interaction history by date range">${DATE_RANGES.map(([k, l]) => `<option value="${k}" ${S.histDateFilter === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${filtersActive ? `<button type="button" class="flt wsh-clear" data-a="wsHistClear" aria-label="Clear filters" title="Clear filters">${ic('x', 12)}</button>` : ''}</div>
    </div>
    <div class="wsh-tl-scroll"><div class="wsh-tl${rows.length ? '' : ' empty'}">${rows.map((r) => {
      const open = !!S.wsHistOpen[r.id], d = new Date(r.at), nodeCls = wshNodeCls(r);
      const media = r.recId ? recById(r.recId) : null;
      return `<div class="wsh-item${open ? ' open' : ''}">
        <span class="wsh-node wsh-node-${nodeCls}"></span>
        <div class="wsh-h${open ? ' open' : ''}">
          <div class="wsh-toggle" role="button" tabindex="0" data-a="wsHistToggle" data-v="${r.id}" aria-expanded="${open}" aria-label="${open ? 'Collapse' : 'Expand'} ${esc(r.title.toLowerCase())}">
            <div class="wsh-top"><b class="truncate">${esc(r.title)}</b><span class="mono wsh-dur">${esc(r.duration)}</span></div>
            <div class="wsh-meta"><span class="wsh-when">${esc(fmtWhenFull(d))}</span><span class="wsh-rel">${esc(relTime(r.at))}</span></div>
          </div>
          <div class="wsh-row3">
            <div class="wsh-badges"><span class="hst info">${esc(r.direction)}</span><span class="hst ${statusCls(r.status)}">${esc(r.status)}</span></div>
            <div class="wsh-qacts">
              <button type="button" class="rec-b" data-a="wsHistPlay" data-v="${r.id}" ${media && media.hasRecording ? '' : 'disabled'} title="Play" aria-label="Play recording">${ic('play', 13)}</button>
              <button type="button" class="rec-b" data-a="recDl" data-v="${r.recId || ''}" ${media && media.hasRecording ? '' : 'disabled'} title="Download" aria-label="Download recording">${ic('download', 13)}</button>
              <button type="button" class="rec-b" data-a="mediaTr" data-v="${r.recId || ''}" ${media && media.tr ? '' : 'disabled'} title="Transcript" aria-label="Open transcript">${ic('file', 13)}</button>
              <button type="button" class="rec-b" data-a="wsDial" title="Call" aria-label="Call ${esc(call.number)}">${ic('phone', 13)}</button>
              <button type="button" class="rec-b wsh-chevbtn" data-a="wsHistToggle" data-v="${r.id}" aria-expanded="${open}" aria-label="${open ? 'Collapse details' : 'Expand details'}">${ic('chevDown', 13, 'wsh-chev')}</button>
            </div>
          </div>
        </div>
        ${open ? `<div class="wsh-body">
          <dl class="rec-dl"><div><dt>Result</dt><dd>${dash(r.result)}</dd></div><div><dt>Handled by</dt><dd>${dash(r.agent)}</dd></div>
            <div><dt>Queue</dt><dd>${dash(r.queue)}</dd></div><div><dt>Wrap-up code</dt><dd>${dash(r.wrap)}</dd></div></dl>
          <div class="rec-btns"><button type="button" class="rec-sec sm" data-a="wsHistPlay" data-v="${r.id}" ${r.recId ? '' : 'disabled'} title="${r.recId ? '' : 'No recording for this call'}">${ic('play', 14)}<span>Play recording</span></button>
            <button type="button" class="rec-sec sm" data-a="recDl" data-v="${r.recId || ''}" ${r.recId ? '' : 'disabled'} title="${r.recId ? '' : 'No recording for this call'}">${ic('download', 14)}<span>Download</span></button>
            <button type="button" class="rec-sec sm" data-a="wsSelect" data-v="${r.id}">${ic('file', 14)}<span>Open details</span></button></div>
        </div>` : ''}
      </div>`;
    }).join('')}${rows.length ? '' : `<div class="hist-empty"><b>No interactions found</b><span>${allRows.length ? 'Try changing the filters or date range.' : 'Calls with ' + esc(call.name) + ' will appear here.'}</span></div>`}</div></div>
  </section></div></div>`;
}

// The edit/add form is shared: it upserts a SPEED_DIAL (saved-contact) record either way (see upsertContact()).
// DIRECTORY entries (internal extensions, identified by ct.ext) are never editable — they aren't this app's data to change.
function wsContactForm(call, editingSaved) {
  const field = (lbl, k, i, req, placeholder, type) => `<label class="ce-f"><span>${esc(lbl)}${req ? ' *' : ''}</span><input type="${type || 'text'}" data-k="${k}" data-i="${i}" value="${esc(S[i])}" placeholder="${esc(placeholder || '')}" ${req ? 'required' : ''} /></label>`;
  return `<section class="rec-card"><h3>Contact Info</h3>
    <form data-f="wsAddSave" class="ce-form">
      <div class="ce-photo"><span class="ce-photo-ico" title="Photo upload isn't available in this demo">${ic('user', 22)}</span><div><b>Add a photo</b><span>Optional</span></div></div>
      <label class="ce-f"><span>Saving as</span><select data-i="wsTier" aria-label="Contact type">${['Lead', 'Standard', 'VIP Gold', 'Platinum', 'VIP Enterprise'].map((t) => `<option value="${esc(t)}" ${S.wsTier === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <div class="ce-row">${field('First name', 'wsnew', 'wsNewName', true, 'Enter first name')}${field('Last name', 'wslast', 'wsLast', false, 'Enter last name')}</div>
      <div class="ce-row"><label class="ce-f"><span>Email</span><input type="email" data-i="wsEmail" value="${esc(S.wsEmail)}" placeholder="Enter email" /></label>
        <label class="ce-f"><span>Phone number *</span><input type="text" class="mono" value="${esc(call.number)}" disabled title="The call's number can't be changed here" /></label></div>
      <label class="ce-f"><span>Company</span><input type="text" data-i="wsCompany" value="${esc(S.wsCompany)}" placeholder="Enter company" /></label>
      <button type="button" class="ce-more" data-a="wsMoreDetails" aria-expanded="${S.wsMoreDetails}">${ic('chevDown', 13, S.wsMoreDetails ? 'ce-more-open' : '')}<span>More details</span></button>
      ${S.wsMoreDetails ? `<div class="ce-row"><label class="ce-f"><span>Queue</span><input type="text" data-i="wsQueue" value="${esc(S.wsQueue)}" placeholder="Enter queue" /></label>
        <label class="ce-f"><span>Campaign</span><input type="text" data-i="wsCampaign" value="${esc(S.wsCampaign)}" placeholder="Enter campaign" /></label></div>` : ''}
      <div class="rec-btns"><button type="submit" class="rec-pri" ${S.wsNewName.trim() ? '' : 'disabled'}>Save changes</button><button type="button" class="rec-sec" data-a="wsAddCancel">Cancel</button></div>
    </form></section>`;
}
function wsContactTab(call) {
  const ct = contactFor(call.number), row = (k, v) => `<div><dt>${k}</dt><dd>${v && v !== '' ? esc(v) : '-'}</dd></div>`;
  const people = call.participants.length ? `<section class="rec-card"><h3>Conference participants</h3><div class="ws-people">${call.participants.map((p) => `<span class="hst info">${esc(p.name)}</span>`).join('')}</div></section>` : '';
  if (ct) {
    const editingSaved = !ct.ext; // a DIRECTORY (internal extension) contact, vs a saved SPEED_DIAL one
    if (S.wsAdd) return `${people}${wsContactForm(call, true)}`;
    return `${people}<section class="rec-card"><div class="ws-cthead">${vmAv(ct.name, ' lg')}<div class="vm-hn"><b>${esc(ct.name)}</b><span><i class="ws-dot ${ct.status === 'offline' ? 'off' : ''}"></i>${ct.status === 'offline' ? 'Offline' : 'Available'}${ct.sub ? ' · ' + esc(ct.sub) : ''}</span></div></div>
      <div class="ws-cbtns"><button type="button" class="rec-pri" data-a="wsDial">${ic('phone', 14)}<span>Call</span></button>
        <button type="button" class="rec-sec" disabled title="Messaging is not available in this demo">${ic('chat', 14)}<span>Message</span></button>
        <button type="button" class="rec-sec" data-a="wsGoNotes">${ic('file', 14)}<span>Add Note</span></button></div></section>
      <section class="rec-card"><h3>Contact record <span class="hst ${editingSaved ? 'info' : 'ok'}">${editingSaved ? 'Saved contact' : 'Directory'}</span></h3><dl class="rec-dl">${row('Number', ct.number)}${row('Company', ct.company)}${row('Email', ct.email)}${row('Tags', ct.tags)}${row('Queue', ct.queue)}${row('Campaign', ct.campaign)}${row('DNIS · flow', ct.dnis)}</dl>
        <button type="button" class="rec-pri ws-wide" ${editingSaved ? 'data-a="wsAddOpen"' : 'disabled title="This is an internal extension, not a saved contact, so it can\'t be edited here"'}>Edit Contact</button></section>`;
  }
  const nm = call.name !== call.number && !/^\d/.test(call.name) ? call.name : 'Unknown Contact';
  if (S.wsAdd) return `${people}${wsContactForm(call, false)}`;
  return `${people}<section class="rec-card"><div class="ws-cthead">${vmAv(nm === 'Unknown Contact' ? 'Unknown Contact' : nm, ' lg')}<div class="vm-hn"><b>${esc(nm)}</b><span>Not in the contact book <span class="hst muted">No record</span></span></div></div>
    <div class="ws-cbtns two"><button type="button" class="rec-pri" data-a="wsAddOpen">${ic('plus', 14)}<span>Add to contacts</span></button><button type="button" class="rec-sec" data-a="wsDial">${ic('phone', 14)}<span>Call</span></button></div></section>
    <section class="rec-card"><h3>Contact record</h3><dl class="rec-dl">${row('Number', call.number)}${row('Company', '')}${row('Email', '')}${row('Tags', '')}${row('Queue', '')}${row('Campaign', '')}${row('DNIS · flow', '')}</dl></section>`;
}

function callWorkspace() {
  const call = wsCall(), P = S.activePanel;
  const canAsk = !!call && call.active && call.live && S.callState === 'connected';
  let body = '';
  if (!call) body = wsEmpty(P);
  // History has its own contact header (wsHistSidebar/Interaction History already show number + name + Call),
  // so the generic "currently selected call" context card is redundant there and was removed at the user's request.
  else body = (P === 'History' ? '' : wsCtx(call)) + (P === 'Copilot' ? wsCopilot(call) : P === 'Summary' ? wsSummaryTab(call) : P === 'Transcript' ? wsTranscriptTab(call) : P === 'Notes' ? wsNotesTab(call) : P === 'History' ? wsHistoryTab(call) : wsContactTab(call));
  const showForm = P === 'Copilot' || (P === 'Contact' && !call);
  return `<section class="ws${S.wsFullscreen ? ' ws-full' : ''}">
    <nav aria-label="Call workspace" class="ws-nav">${PANELS.map((p) => `<button type="button" class="ws-tab${P === p ? ' on' : ''}" data-a="panel" data-v="${p}" ${P === p ? 'aria-current="page"' : ''}>${p === 'Copilot' ? ic('sparkles', 16, 'fill') : ''}${p}</button>`).join('')}
      <button type="button" class="ws-full-btn" data-a="wsFullToggle" title="${S.wsFullscreen ? 'Minimize' : 'Fullscreen'}" aria-label="${S.wsFullscreen ? 'Minimize' : 'Fullscreen'}">${ic(S.wsFullscreen ? 'shrink' : 'expand', 15)}</button></nav>
    <div class="ws-scroll${call ? ' rec-scroll' : ''}">${body}</div>
    ${showForm ? `<form class="ws-form" data-f="ask">
      <select class="ws-pill" aria-label="Copilot scope"><option>Answers from this call</option></select>
      <div class="ws-row"><div class="q-wrap">${ic('sparkles', 16, 'fill')}<input type="text" class="q-in" data-k="q" data-i="question" value="${esc(S.question)}" ${canAsk ? '' : 'disabled'} aria-label="Ask Copilot about this call" placeholder="${canAsk ? 'Ask Copilot anything about this call...' : 'Available once a call is connected'}" /></div>
        <button type="submit" class="send" ${canAsk && S.question.trim() ? '' : 'disabled'} aria-label="Send question" title="Send">${ic('send', 20)}</button></div></form>` : ''}
  </section>`;
}

function workspaceView() {
  const rec = S.activeTab === 'recordings' && curItem();
  if (rec) return recWorkspace(rec);
  const vm = S.activeTab === 'voicemails' && curItem();
  if (vm) return vmWorkspace(vm);
  return callWorkspace();
}

/* ============================== Render ============================== */
function render() {
  // keep transfer source in sync (effect in original ActiveCallTools)
  const toolsMounted = S.activeTab === 'active' && S.callState !== 'idle' && S.callState !== 'wrap_up';
  if (!toolsMounted && toolsWereMounted) {
    S.newCallNumber = ''; S.dtmfDigits = ''; S.transferMode = 'Warm'; S.moreOpen = false; resetTransferLocal();
  }
  toolsWereMounted = toolsMounted;
  if (toolsMounted && S.transferOpen && !S.transferSourceId) {
    const calls = transferCalls();
    if (calls.length) S.transferSourceId = calls[0].id;
  }

  // preserve focus / scroll across the re-render
  const a = document.activeElement;
  const focusKey = a && a.dataset ? a.dataset.k : null;
  const sel = focusKey && a.selectionStart != null ? [a.selectionStart, a.selectionEnd] : null;
  const body = document.getElementById('tab-body');
  const bodyScroll = body ? body.scrollTop : 0;
  const wrapEl = document.querySelector('.wrap');
  const wrapScroll = wrapEl ? wrapEl.scrollTop : 0;
  const wsEl = document.querySelector('.ws-scroll');
  const wsScroll = wsEl ? wsEl.scrollTop : 0;
  const kpEl = document.querySelector('.kp-scroll'), kpScroll = kpEl ? kpEl.scrollTop : 0;
  const dlEl = document.querySelector('.dir-scroll'), dlQ = dlEl ? dlEl.dataset.q : null, dlTop = dlEl ? dlEl.scrollTop : 0;
  // in the call-workspace tabs only the selected call's recording may play
  // On the History tab specifically, the workspace's Voicemails/Recordings sidebar may legitimately play any item
  // belonging to the selected contact's own number, not just the exact call's own linked recording — so the guard
  // there is "same contact", not "same call". Keypad/Active Call still require the exact same call's recording.
  if (['keypad', 'active'].includes(S.activeTab) && !AUDIO.paused && S.recAudioId !== (wsRecording(wsCall()) || {}).id) AUDIO.pause();
  if (S.activeTab === 'history' && !AUDIO.paused) {
    const playing = recById(S.recAudioId), sameContact = playing && wsCall() && sameNumber(playing.number, wsCall().number);
    if (!sameContact) AUDIO.pause();
  }

  syncPartJoin();
  const app = document.getElementById('app');
  app.innerHTML = `<div class="shell">
    ${headerView()}
    ${toastView()}${parkDialogView()}${parkSuccessView()}${toastStack()}${floatOverlay()}
    <div class="body-row">
      ${sidebarView()}
      <div class="main${S.compactMode ? ' compact' : ''}">
        ${S.nav === 'phone' ? `<div class="wrap">
          ${S.wsFullscreen ? '' : leftCol()}
          ${S.compactMode ? '' : workspaceView()}
        </div>` : S.nav === 'contact' ? contactsPageView() : (() => { const n = NAV_ITEMS.find((x) => x[0] === S.nav); return `<div class="wrap"><div class="ws"><div class="ws-body"><div class="ws-ico">${ic('grid', 32)}</div><h2>${n[1]}</h2><p>This section is not part of the dialer demo.</p></div></div></div>`; })()}
      </div>
    </div>
  </div>`;
  applyFloatPos();
  syncDividerToTabs();
  S.toasts.forEach((t) => { t.fresh = false; });
  const panelsNow = toolsMounted && (S.dtmfOpen || S.transferOpen || S.addCallOpen);
  const panelJustOpened = panelsNow && !panelsWereOpen;
  panelsWereOpen = panelsNow;

  const nb = document.getElementById('tab-body');
  if (nb) nb.scrollTop = bodyScroll;
  const nw = document.querySelector('.wrap');
  if (nw && wrapScroll) nw.scrollTop = wrapScroll;
  const nws = document.querySelector('.ws-scroll');
  if (nws && wsScroll) nws.scrollTop = wsScroll;
  const ndl = document.querySelector('.dir-scroll');
  if (ndl && dlQ !== null && ndl.dataset.q === dlQ) ndl.scrollTop = dlTop;
  const nkp = document.querySelector('.kp-scroll');
  if (nkp && kpScroll) nkp.scrollTop = kpScroll;
  if (S.focusNote) { S.focusNote = false; const t = app.querySelector('[data-k=wsnote]'); if (t) { t.focus(); if (S.noteCaret) { t.setSelectionRange(S.noteCaret[0], S.noteCaret[1]); S.noteCaret = null; } } }
  if (S.focusNew) { S.focusNew = false; const t = app.querySelector('[data-k=wsnew]'); if (t) t.focus(); }
  if (S.scenFocus) { S.scenFocus = false; const o = app.querySelector('.scen-opt.on') || app.querySelector('.scen-opt'); if (o) o.focus(); }
  if (S.scenRefocus) { S.scenRefocus = false; const t = app.querySelector('.scen-trigger'); if (t) t.focus(); }
  if (S.recScrollSeg) { S.recScrollSeg = false; const sg = document.querySelector('.seg.cur'); if (sg) sg.scrollIntoView({ block: 'nearest' }); }
  if (S.recScroll) { S.recScroll = false; if (window.innerWidth < 980) { const w = document.querySelector('.ws'); if (w) w.scrollIntoView({ block: 'start' }); } }
  if (S.moreAnim) {
    S.moreAnim = false;
    const cd = document.querySelector('.cd');
    if (cd) requestAnimationFrame(() => requestAnimationFrame(() => cd.classList.toggle('open', S.moreOpen)));
  }
  if (panelJustOpened) { const tl = document.querySelector('.tools'); if (tl) tl.scrollIntoView({ block: 'nearest' }); }
  if (S.recMenuOpen) {
    // clamp against .tab-body (the overflow:hidden scroller), not the viewport: that's what would actually clip it
    const pop = document.querySelector('.rec-pop'), bound = document.querySelector('.tab-body');
    if (pop && bound) {
      pop.classList.remove('edge-l', 'edge-r');
      const br = bound.getBoundingClientRect(), pr = pop.getBoundingClientRect();
      if (pr.right > br.right - 8) pop.classList.add('edge-r');
      else if (pr.left < br.left + 8) pop.classList.add('edge-l');
    }
  }
  if (S.focusAdd) {
    S.focusAdd = false;
    const el = app.querySelector('[data-autofocus]');
    if (el) el.focus();
  } else if (S.focusQ) {
    S.focusQ = false;
    const el = app.querySelector('[data-k="q"]');
    if (el) el.focus();
  } else if (focusKey) {
    const el = app.querySelector(`[data-k="${focusKey}"]`);
    if (el && !el.disabled) {
      el.focus();
      if (sel) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* not selectable */ } }
    }
  }
}

/* ============================== Events ============================== */
document.addEventListener('keydown', (e) => {
  // keyboard DTMF while the in-call keypad is open (ignored when typing in a field)
  if (S.dtmfOpen && S.activeTab === 'active' && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
    if (/^[0-9*#]$/.test(e.key)) { A.dtmfDigit(e.key); render(); return; }
    if (e.key === 'Backspace') { e.preventDefault(); A.dtmfBack(); render(); return; }
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('role') === 'button') { e.preventDefault(); e.target.click(); }
});
// scenario picker: close on outside click / Escape, arrow-key navigation between options
document.addEventListener('click', (e) => {
  if (S.scenOpen && !e.target.closest('.scen')) { S.scenOpen = false; S.parkAssignedOpen = false; if (!e.target.closest('[data-a]')) render(); }
  if (S.partSel && !e.target.closest('.conf-box')) { S.partSel = null; if (!e.target.closest('[data-a]')) render(); }
  if (S.floatMore && !e.target.closest('.fb-more-wrap')) { S.floatMore = false; if (!e.target.closest('[data-a]')) render(); }
  if (S.contactsFilterOpen && !e.target.closest('.ct-filter') && !e.target.closest('.ct-filter-ic')) { S.contactsFilterOpen = false; if (!e.target.closest('[data-a]')) render(); }
  if (S.addStatusOpen && !e.target.closest('.ct-filter')) { S.addStatusOpen = false; if (!e.target.closest('[data-a]')) render(); }
  if (S.recMenuOpen && !e.target.closest('.lc-ctl-wrap')) { S.recMenuOpen = false; if (!e.target.closest('[data-a]')) render(); }
  if (S.agentSwitcherOpen && !e.target.closest('.as-wrap')) { S.agentSwitcherOpen = false; S.agentSwitcherQuery = ''; S.asParkAssignedOpen = false; if (!e.target.closest('[data-a]')) render(); }
});
// Floating call window: re-applies the last dragged position (if any) after every render, since innerHTML rebuild wipes inline styles.
function applyFloatPos() {
  const el = document.querySelector('.float-win, .float-bar');
  // fullscreen is governed entirely by the .fw-big CSS class; a leftover dragged inline position would fight it, so skip re-applying while it's on
  if (el && floatPos && !el.classList.contains('fw-big')) { el.style.left = floatPos.left + 'px'; el.style.top = floatPos.top + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; }
}
document.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest && e.target.closest('[data-drag]');
  if (!handle || e.target.closest('button')) return; // don't start a drag (and steal pointer capture) when the press actually lands on a button inside the drag handle, e.g. the fw-head window controls
  const el = handle.closest('.float-win, .float-bar');
  if (!el) return;
  const r = el.getBoundingClientRect();
  floatDrag = { el, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, moved: false };
  el.classList.add('fw-dragging');
  handle.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', (e) => {
  if (!floatDrag) return;
  floatDrag.moved = true;
  const m = 8, w = floatDrag.w, h = floatDrag.h;
  const left = Math.max(m, Math.min(innerWidth - w - m, e.clientX - floatDrag.dx));
  const top = Math.max(m, Math.min(innerHeight - h - m, e.clientY - floatDrag.dy));
  floatDrag.el.style.left = left + 'px'; floatDrag.el.style.top = top + 'px';
  floatDrag.el.style.right = 'auto'; floatDrag.el.style.bottom = 'auto';
});
document.addEventListener('pointerup', () => {
  if (!floatDrag) return;
  if (floatDrag.moved) {
    floatPos = { left: parseFloat(floatDrag.el.style.left), top: parseFloat(floatDrag.el.style.top) };
    // a mouse drag still fires a trailing click on the handle; swallow just that one so dragging the minimized card doesn't also expand it.
    // Touch drags often fire no click at all, so this self-removes on a short timeout instead of lingering and blocking a later real click.
    const el = floatDrag.el, block = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    el.addEventListener('click', block, true);
    setTimeout(() => el.removeEventListener('click', block, true), 300);
  }
  floatDrag.el.classList.remove('fw-dragging');
  floatDrag = null;
});
// The divider sits exactly on the History|Contact boundary of the workspace nav above it: the boundary's x-position
// is measured after every render and on resize, then converted to a share of the .wsh-split width (container-
// relative, so zoom and window width keep it aligned). 6.5px is half the 13px divider column, so the 1px line
// lands on the boundary rather than its left edge.
// Default-position tuning: how far right of the History|Contact boundary the divider sits (px). Drag is unaffected.
const DIVIDER_NUDGE_PX = 24;
function syncDividerToTabs() {
  const split = document.querySelector('.wsh-split');
  const hist = [...document.querySelectorAll('.ws-nav .ws-tab')].find((t) => t.textContent.trim() === 'History');
  if (!split || !hist) return;
  const sr = split.getBoundingClientRect();
  if (!sr.width) return;
  const pct = Math.max(0, Math.min(100, ((hist.getBoundingClientRect().right - sr.left) / sr.width) * 100));
  split.style.setProperty('--divider-position', `calc(${pct.toFixed(3)}% - 6.5px + ${DIVIDER_NUDGE_PX}px)`);
}
addEventListener('resize', syncDividerToTabs);
// History divider drag: the position is measured against the .wsh-split container (never the viewport), clamped to
// 35–65%, and written straight onto the element while dragging so nothing re-renders mid-drag; the final value is
// saved to S.wsDividerPos on release so the next render keeps it. Only ever changes the one CSS variable.
let splitDrag = null;
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest && e.target.closest('[data-drag-split]');
  if (!h) return;
  const split = h.closest('.wsh-split');
  if (!split) return;
  e.preventDefault();
  splitDrag = { split, h, pct: null };
  h.classList.add('dragging');
  h.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', (e) => {
  if (!splitDrag) return;
  const r = splitDrag.split.getBoundingClientRect();
  const pct = Math.max(35, Math.min(65, ((e.clientX - r.left) / r.width) * 100));
  splitDrag.pct = pct;
  splitDrag.split.style.setProperty('--divider-position', `${pct.toFixed(1)}%`);
});
document.addEventListener('pointerup', () => {
  if (!splitDrag) return;
  if (splitDrag.pct != null) S.wsDividerPos = Math.round(splitDrag.pct * 10) / 10;
  splitDrag.h.classList.remove('dragging');
  splitDrag = null;
});
addEventListener('resize', () => {
  if (!floatPos) return;
  const el = document.querySelector('.float-win, .float-bar');
  if (!el) return;
  const r = el.getBoundingClientRect(), m = 8;
  floatPos.left = Math.max(m, Math.min(innerWidth - r.width - m, floatPos.left));
  floatPos.top = Math.max(m, Math.min(innerHeight - r.height - m, floatPos.top));
  applyFloatPos();
});
document.addEventListener('keydown', (e) => {
  const trigger = e.target.closest && e.target.closest('.scen-trigger');
  if (e.key === 'Escape' && S.parkSuccess) { S.parkSuccess = null; render(); return; }
  if (e.key === 'Escape' && S.parkDialog) { S.parkDialog = null; render(); return; }
  if (e.key === 'Escape' && S.wsFullscreen) { S.wsFullscreen = false; render(); return; }
  if (e.key === 'Escape' && S.floatMore) { S.floatMore = false; render(); return; }
  if (e.key === 'Escape' && S.contactsFilterOpen) { S.contactsFilterOpen = false; render(); return; }
  if (e.key === 'Escape' && S.addStatusOpen) { S.addStatusOpen = false; render(); return; }
  if (e.key === 'Escape' && S.recMenuOpen) { S.recMenuOpen = false; render(); return; }
  if (e.key === 'Escape' && S.agentSwitcherOpen) { S.agentSwitcherOpen = false; S.agentSwitcherQuery = ''; S.asParkAssignedOpen = false; render(); return; }
  if (e.key === 'Escape' && S.partSel && !S.scenOpen) { S.partSel = null; render(); return; }
  if (!S.scenOpen && trigger && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); S.scenOpen = true; S.scenFocus = true; S.parkAssignedOpen = false; render(); return; }
  if (!S.scenOpen) return;
  if (e.key === 'Escape') { S.scenOpen = false; S.parkAssignedOpen = false; S.scenRefocus = true; render(); return; }
  if (S.parkAssignedOpen) return;
  const opts = [...document.querySelectorAll('.scen-opt')], i = opts.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
    e.preventDefault();
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? opts.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
    if (opts[n]) opts[n].focus();
  }
});
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.a];
  if (!fn) return;
  if (el.classList.contains('fb-mi') && el.dataset.a !== 'floatMore') S.floatMore = false; // the floating pill's More menu closes once an item is picked
  fn(el.dataset.v, el, e);
  render();
});
// Player sliders update the audio directly (no re-render), so dragging is not interrupted
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t.classList) return;
  if (t.classList.contains('rp-seek')) {
    const r = curItem();
    if (!r) return;
    S.recDrag = true; recLoad(r);
    AUDIO.currentTime = +t.value;
    t.style.setProperty('--pct', `${(+t.value / r.duration) * 100}%`);
    document.querySelectorAll('.js-rp-cur').forEach((n) => { n.textContent = formatTime(Math.floor(+t.value)); });
  } else if (t.classList.contains('rp-vol')) {
    S.recVol = +t.value; AUDIO.volume = S.recVol;
    if (S.recMuted && S.recVol > 0) { S.recMuted = false; AUDIO.muted = false; }
    t.style.setProperty('--pct', `${S.recVol * 100}%`);
  }
});
document.addEventListener('change', (e) => { if (e.target.classList && e.target.classList.contains('rp-seek')) S.recDrag = false; });
document.addEventListener('click', (e) => {
  const w = e.target.closest && e.target.closest('.rp-wave');
  const r = w && curItem();
  if (!r) return;
  const box = w.getBoundingClientRect();
  recLoad(r);
  AUDIO.currentTime = Math.max(0, Math.min(r.duration, ((e.clientX - box.left) / box.width) * r.duration));
});
document.addEventListener('input', (e) => {
  const el = e.target;
  const fn = el.dataset && el.dataset.i && I[el.dataset.i];
  if (!fn) return;
  fn(el.value);
  render();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.k === 'dial' && S.dialNumber && ['idle', 'connected', 'on_hold', 'wrap_up'].includes(S.callState)) {
    A.dial(); render();
  }
});
document.addEventListener('submit', (e) => {
  const el = e.target.closest('[data-f]');
  if (!el) return;
  e.preventDefault();
  const fn = F[el.dataset.f];
  if (fn) { fn(); render(); }
});

// Call timer: ticks only while connected and not on hold
setInterval(() => {
  document.querySelectorAll('.js-park-age').forEach((n) => { n.textContent = formatTime(Math.floor((Date.now() - +n.dataset.since) / 1000)); });
  const gone = ParkService.sweep();
  if (gone.length) {
    gone.forEach((e) => { S.toasts = S.toasts.filter((t) => t.parkId !== e.parkId); });
    // A call rings back to whoever actually parked it — not just whichever agent happens to be on screen when the
    // sweep fires — by writing straight into that agent's own session (same pattern as callAgent()/switchActiveAgent's
    // deferred park-alert). Reuses the existing incoming-call flow: Answer reconnects the exact same call via
    // answerIncomingCall's _parkRestore branch. Calls parked by a simulated colleague (no matching AGENTS record)
    // have no real owner to ring back to, so they just expire with a plain toast.
    gone.forEach((e) => {
      const owner = AGENTS.find((a) => a.name === e.parkedBy);
      if (owner && !agentSessionGet(owner.id, 'incoming')) {
        agentSessionPatch(owner.id, { incoming: { name: e.callerName, number: e.callerNumber, account: (e.contact && e.contact.account) || '', company: e.destination, sentiment: 'Neutral', _parkRestore: e } });
      } else {
        pushToast({ kind: 'info', msg: `Parked call ${e.parkId} timed out.`, ...(owner ? { agentId: owner.id } : {}) }, 5000);
      }
    });
    render();
  }
  if (S.callState === 'connected' && !S.isOnHold) {
    S.callDuration += 1;
    document.querySelectorAll('.js-timer').forEach((n) => { n.textContent = formatTime(S.callDuration); });
    document.querySelectorAll('.js-part-dur').forEach((n) => { n.textContent = formatTime(Math.max(0, S.callDuration - +n.dataset.off)); });
    if (S.isRecording && !S.recPaused) {
      S.recSecs += 1;
      document.querySelectorAll('.js-rec').forEach((n) => { n.textContent = formatTime(S.recSecs); });
      document.querySelectorAll('.rec-pop-wave').forEach((el) => {
        const bars = [...el.children], played = Math.round((bars.length * recPct()) / 100);
        bars.forEach((bar, i) => bar.classList.toggle('on', i < played));
      });
    }
  }
}, 1000);

// Station registration follows the browser's connectivity: offline -> disconnected, back online -> re-register.
window.addEventListener('offline', () => { S.webrtc = 'disconnected'; render(); });
window.addEventListener('online', () => {
  S.webrtc = 'connecting'; render();
  setTimeout(() => { S.webrtc = navigator.onLine ? 'registered' : 'disconnected'; render(); }, 700);
});
S.callNotes = loadNotes();
S.contactsAdded = loadContactsAdded();
loadScenario('empty');
render();
if (navigator.onLine) setTimeout(() => { S.webrtc = 'registered'; render(); }, 700);
