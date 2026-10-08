'use strict';
/* =====================================================================
   CallFlow – Genesys-inspired Calls & Meetings Task Workspace
   Frontend-only prototype. All telephony / video / routing is SIMULATED.
   ===================================================================== */

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MIN = 60000, HOUR = 3600000, DAY = 86400000;
const now = () => Date.now();
const sod = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const sameDay = (a, b) => sod(a) === sod(b);
const fmtTime = ts => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtDate = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtDay = ts => { const n = sod(now()), d = sod(ts); return d === n ? 'Today' : d === n + DAY ? 'Tomorrow' : d === n - DAY ? 'Yesterday' : fmtDate(ts); };
const fmtDT = ts => fmtDay(ts) + ' ' + fmtTime(ts);
const pad = n => String(n).padStart(2, '0');
const dur = sec => { sec = Math.max(0, Math.round(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`; };
const toDateInput = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const toTimeInput = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const parseDT = (d, t) => (d && t) ? new Date(`${d}T${t}`).getTime() : NaN;
const uid = p => p + Math.random().toString(36).slice(2, 9);
const ico = (n, c = '') => `<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const initials = n => String(n).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
class UserError extends Error { }
const fail = m => { throw new UserError(m); };
const hue = n => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const avBg = n => `background:hsl(${hue(n)} 55% 42%)`;

/* ---------- constants ---------- */
const PRIORITIES = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
const PRI_RANK = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
const PRI_LABEL = { URGENT: 'Urgent', HIGH: 'High', NORMAL: 'Normal', LOW: 'Low' };
const STATUSES = ['UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'RESCHEDULED', 'CANCELLED', 'FAILED'];
const STATUS_LABEL = { UNASSIGNED: 'Unassigned', ASSIGNED: 'Assigned', ACCEPTED: 'Accepted', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', MISSED: 'Missed', RESCHEDULED: 'Rescheduled', CANCELLED: 'Cancelled', FAILED: 'Failed' };
const SUB_LABEL = { DIALING: 'Dialing', RINGING: 'Ringing', CONNECTED: 'Connected', ON_HOLD: 'On Hold', TRANSFERRED: 'Transferred', WRAP_UP: 'Wrap-up', SCHEDULED: 'Scheduled', JOINING: 'Joining', IN_MEETING: 'In Meeting' };
const TERMINAL = ['COMPLETED', 'MISSED', 'CANCELLED', 'FAILED'];
const ACTIVE = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'RESCHEDULED'];
const LIVE_SUBS = ['DIALING', 'RINGING', 'CONNECTED', 'ON_HOLD', 'WRAP_UP', 'JOINING', 'IN_MEETING'];
const PRESENCE = [
  { id: 'Available', color: '#2fbf71' }, { id: 'Busy', color: '#e5484d' }, { id: 'Away', color: '#f5a524' },
  { id: 'Do Not Disturb', color: '#a31621' }, { id: 'Offline', color: '#8a94a8' }];
const presColor = s => (PRESENCE.find(p => p.id === s) || {}).color || '#8a94a8';
const CALL_OUTCOMES = ['Successful', 'Customer Interested', 'Customer Not Interested', 'Follow-up Required', 'No Answer', 'Busy', 'Voicemail', 'Wrong Number'];
const CALL_DISPOSITIONS = ['Information Provided', 'Sale Progressed', 'Renewal Confirmed', 'Callback Requested', 'Escalated', 'Issue Resolved', 'Do Not Call'];
const MTG_OUTCOMES = ['Completed', 'Customer Interested', 'Demo Completed', 'Follow-up Required', 'Reschedule Required', 'No Show', 'Cancelled'];
const OUTCOME_STATUS = { 'No Answer': 'MISSED', 'Busy': 'MISSED', 'Wrong Number': 'FAILED', 'No Show': 'MISSED', 'Cancelled': 'CANCELLED', 'Reschedule Required': 'RESCHEDULED' };
const TEAMS = [
  { id: 't_sales', name: 'Sales Team' }, { id: 't_cs', name: 'Customer Success' }, { id: 't_ent', name: 'Enterprise Support' },
  { id: 't_am', name: 'Account Management' }, { id: 't_ps', name: 'Partner Success' }];
const QUEUES = [
  { id: 'q_sales', name: 'Sales Calls', team: 't_sales', skills: ['sales', 'voice'], type: 'CALL' },
  { id: 'q_follow', name: 'Customer Follow-up', team: 't_cs', skills: ['followup', 'voice'], type: 'CALL' },
  { id: 'q_ent', name: 'Enterprise Calls', team: 't_ent', skills: ['enterprise', 'voice'], type: 'CALL' },
  { id: 'q_demo', name: 'Product Demo Meetings', team: 't_sales', skills: ['demo', 'video'], type: 'MEETING' },
  { id: 'q_cmtg', name: 'Customer Meetings', team: 't_cs', skills: ['customer', 'video'], type: 'MEETING' },
  { id: 'q_renew', name: 'Renewal Calls', team: 't_am', skills: ['renewals', 'voice'], type: 'CALL' }];
const KNOWN_PEOPLE = ['John Smith', 'Sarah Williams', 'Mike Brown', 'Rajesh Gupta', 'Maria Garcia', 'Robert Chen', 'Emily Wilson', 'David Miller'];
const teamName = id => (TEAMS.find(t => t.id === id) || {}).name || '—';
const queueObj = id => QUEUES.find(q => q.id === id);
const queueName = id => (queueObj(id) || {}).name || '—';

/* ---------- state ---------- */
const STORE_KEY = 'ucaas.tasks.v4';
const AppState = {
  currentUserId: 'a1', role: 'supervisor',
  agents: [], teams: TEAMS, queues: QUEUES, customers: [], tasks: [], notifications: [], activities: [],
  calls: {}, meetings: {}, counters: { CALL: 1021, MTG: 2011 },
  filters: {}, prefs: { callBehavior: 'answer', autoWrap: false },
  ui: { view: 'dashboard', taskId: null, drawerTaskId: null, menu: null, calMode: 'week', calDate: now(), wsTab: 'activity', dashScope: 'team', demoOpen: false, actFilter: 'all', navOpen: false, incoming: null }
};
const me = () => agent(AppState.currentUserId);
const isSup = () => AppState.role === 'supervisor';
const agent = id => AppState.agents.find(a => a.id === id);
const task = id => AppState.tasks.find(t => t.id === id);
const customer = id => AppState.customers.find(c => c.id === id);
const agentName = id => id ? (agent(id) || {}).name || 'Unknown' : 'Unassigned';
const defaultFilters = view => ({ type: 'all', status: 'all', priority: 'all', assignment: view === 'mytasks' ? 'mine' : view === 'unassigned' ? 'unassigned' : 'all', agent: '', date: 'all', from: '', to: '', queue: 'all',
  ...(view === 'calls' ? { type: 'CALL' } : view === 'meetings' ? { type: 'MEETING' } : {}), sortBy: 'scheduled', sortDir: 'asc' });
function filtersFor(view) { return AppState.filters[view] || (AppState.filters[view] = defaultFilters(view)); }

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 120);
}
function saveNow() {
  try {
    const { currentUserId, role, agents, customers, tasks, notifications, activities, calls, meetings, counters, filters, prefs } = AppState;
    const ui = { calMode: AppState.ui.calMode, dashScope: AppState.ui.dashScope };
    localStorage.setItem(STORE_KEY, JSON.stringify({ currentUserId, role, agents, customers, tasks, notifications, activities, calls, meetings, counters, filters, prefs, ui }));
  } catch (e) { console.warn('persist failed', e); }
}
function loadState() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { data = null; }
  if (!data || !data.tasks) { data = seedData(); }
  const ui = data.ui; delete data.ui;
  Object.assign(AppState, data);
  Object.assign(AppState.ui, ui || {});
  AppState.ui.calDate = now();
}
function resetDemo() {
  Object.values(timers).forEach(clearTimeout);
  try { localStorage.removeItem(STORE_KEY); } catch (e) { }
  const fresh = seedData(); const ui = fresh.ui; delete fresh.ui;
  AppState.filters = {}; AppState.calls = {}; AppState.meetings = {};
  Object.assign(AppState, fresh);
  Object.assign(AppState.ui, ui || {}, { drawerTaskId: null, taskId: null, menu: null, incoming: null });
  saveNow();
}

/* ---------- seed data ---------- */
function seedData() {
  const t0 = now(); const d0 = new Date(t0);
  let h = d0.getHours() + d0.getMinutes() / 60; if (h < 10) d0.setHours(10, 0, 0, 0); else if (h > 16) d0.setHours(16, 0, 0, 0);
  d0.setMinutes(Math.round(d0.getMinutes() / 15) * 15, 0, 0);
  const anchor = d0.getTime();
  const W = (dayOff, hh, mm = 0) => sod(anchor) + dayOff * DAY + hh * HOUR + mm * MIN;
  const rel = m => anchor + m * MIN;
  const A = (id, name, status, team, level, skills) => ({ id, name, status, team, level, skills, shift: [8, 18] });
  const agents = [
    A('a1', 'Rajesh Gupta', 'Available', 't_sales', 3, ['sales', 'demo', 'enterprise', 'video', 'voice']),
    A('a2', 'Sarah Williams', 'Available', 't_sales', 3, ['sales', 'demo', 'renewals', 'video', 'voice']),
    A('a3', 'Michael Brown', 'Busy', 't_cs', 2, ['followup', 'customer', 'renewals', 'video', 'voice']),
    A('a4', 'John Davis', 'Available', 't_ent', 2, ['enterprise', 'customer', 'voice', 'video']),
    A('a5', 'Emily Wilson', 'Away', 't_am', 2, ['renewals', 'enterprise', 'customer', 'voice', 'video']),
    A('a6', 'David Miller', 'Offline', 't_sales', 1, ['sales', 'voice']),
    A('a7', 'Priya Nair', 'Available', 't_cs', 3, ['customer', 'followup', 'demo', 'video', 'voice']),
    A('a8', 'Carlos Mendez', 'Available', 't_am', 1, ['renewals', 'customer', 'voice'])];
  const C = [['John Smith', 'Acme Corp', 'Enterprise'], ['Maria Garcia', 'Globex Industries', 'Mid-Market'], ['Robert Chen', 'Initech', 'Mid-Market'], ['Linda Park', 'Umbrella Logistics', 'Enterprise'],
    ['James Wright', 'Stark Dynamics', 'Enterprise'], ['Olivia Martin', 'Wayne Enterprises', 'Enterprise'], ['Daniel Kim', 'Hooli Cloud', 'Mid-Market'], ['Sophia Rossi', 'Soylent Foods', 'SMB'],
    ['William Turner', 'Cyberdyne Systems', 'Enterprise'], ['Ava Johnson', 'Vandelay Imports', 'SMB'], ['Ethan Brooks', 'Pied Piper Tech', 'SMB'], ['Isabella Cruz', 'Wonka Confections', 'Mid-Market'],
    ['Noah Patel', 'Oscorp Labs', 'Mid-Market'], ['Mia Anderson', 'Gringotts Finance', 'Enterprise'], ['Lucas Fernandez', 'Tyrell Corp', 'Mid-Market'], ['Charlotte Dubois', 'Massive Dynamic', 'Enterprise'],
    ['Henry Walker', 'Aperture Science', 'SMB'], ['Amelia Scott', 'Black Mesa Energy', 'Mid-Market'], ['Jack Morgan', 'Nakatomi Trading', 'Enterprise'], ['Grace Lee', 'Dunder Mifflin Paper', 'SMB']];
  const HIST = ['Discussed licensing options and next steps', 'Reviewed usage report and open questions', 'Walkthrough of the new release', 'Pricing and contract terms review', 'Onboarding progress check-in', 'Resolved a billing question'];
  const customers = C.map((c, i) => ({
    id: 'c' + (i + 1), name: c[0], company: c[1], tier: c[2], phone: `+1 (415) 555-01${pad(10 + i * 3)}`, email: c[0].toLowerCase().replace(' ', '.') + '@' + c[1].toLowerCase().replace(/[^a-z]/g, '') + '.com',
    since: 2019 + i % 6, history: [
      { type: 'CALL', daysAgo: 3 + i % 6, summary: HIST[i % 6], outcome: i % 3 ? 'Successful' : 'Follow-up Required' },
      { type: 'MEETING', daysAgo: 12 + i % 9, summary: HIST[(i + 3) % 6], outcome: i % 4 ? 'Completed' : 'Demo Completed' }]
  }));
  const tasks = [], activities = [];
  const qTeam = q => (queueObj(q) || {}).team;
  const log = (t, ts, type, text, actor) => activities.push({ id: uid('e'), ts, taskId: t.id, type, text, actor: actor || 'system' });
  function mk(type, num, ci, title, pri, status, when, ag, q, plan, ex = {}) {
    const c = customers[ci], a = ag ? agent2(ag) : null;
    const t = {
      id: (type === 'CALL' ? 'CALL-' : 'MTG-') + num, type, title, customerId: c.id, customer: c.name, company: c.company, contact: c.name, phone: c.phone,
      participants: type === 'MEETING' ? (ex.participants || [c.name, 'Sarah Williams', 'Rajesh Gupta']) : [], description: ex.description || (type === 'CALL' ? `Outbound call regarding: ${title}.` : `Meeting with ${c.company}: ${title}.`),
      priority: pri, status, sub: null, assignedAgent: ag || null, assignedTeam: a ? a.team : qTeam(q), queue: q || null, createdAt: when - 16 * HOUR - num % 7 * 11 * MIN, scheduledAt: when,
      dueAt: when + (type === 'CALL' ? 15 * MIN : plan * MIN), plannedDuration: plan, duration: ex.duration || 0, notes: ex.notes || '', outcome: ex.outcome || '', disposition: ex.disposition || '', direction: ex.direction || 'Outbound', parentId: null
    };
    if (type === 'MEETING' && (status === 'ASSIGNED' || status === 'ACCEPTED' || status === 'RESCHEDULED')) t.sub = 'SCHEDULED';
    if (ex.sub) t.sub = ex.sub;
    if (ex.flags) Object.assign(t, ex.flags);
    tasks.push(t);
    // seeded history
    const nm = a ? a.name : null, tc = t.createdAt;
    log(t, tc, 'created', `${type === 'CALL' ? 'Call' : 'Meeting'} task created`, 'a1');
    if (status === 'UNASSIGNED') log(t, tc + 2 * MIN, 'assigned', `Task routed to queue ${queueName(q)} (awaiting claim)`, 'system');
    else {
      log(t, tc + 2 * MIN, 'assigned', ex.auto ? `System automatically assigned task to ${nm}` : `Task assigned to ${nm}`, ex.auto ? 'system' : 'a1');
      if (['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'FAILED'].includes(status)) log(t, tc + 60 * MIN, 'accepted', `${nm} accepted task`, ag);
    }
    if (['IN_PROGRESS', 'COMPLETED', 'FAILED'].includes(status)) log(t, when, 'started', type === 'CALL' ? 'Call started' : 'Meeting started', ag);
    if (status === 'COMPLETED' || status === 'FAILED') {
      if (type === 'CALL') { log(t, when + 20000, 'connected', 'Customer connected', ag); log(t, when + (t.duration + 20) * 1000, 'ended', `Call ended (${dur(t.duration)})`, ag); }
      else log(t, when + t.duration * 1000, 'meeting_ended', `Meeting ended (${dur(t.duration)})`, ag);
      log(t, when + (t.duration + 90) * 1000, status === 'COMPLETED' ? 'completed' : 'failed', `Wrap-up completed – outcome: ${t.outcome}`, ag);
    }
    if (status === 'MISSED') log(t, when + 5 * MIN, 'missed', `Call attempt unsuccessful – ${t.outcome || 'no answer'}`, ag);
    if (status === 'CANCELLED') log(t, when - 2 * HOUR, 'cancelled', 'Task cancelled by Sarah Williams', 'a2');
    if (status === 'RESCHEDULED') log(t, tc + 3 * HOUR, 'rescheduled', `Task rescheduled to ${fmtDT(when)}`, 'a1');
    return t;
  }
  const agent2 = id => agents.find(a => a.id === id);
  // 20 calls
  // 10 meetings
  const notifications = [];
  // prevent duplicate system notifications for conditions that already hold at seed time
  tasks.forEach(t => { t.overdueNotified = isOverdue(t, t0); t.reminded = (t.scheduledAt - t0) < 6 * MIN && t.scheduledAt > t0; });
  activities.sort((a, b) => a.ts - b.ts);
  return { currentUserId: 'a1', role: 'supervisor', agents, customers, tasks, notifications, activities, calls: {}, meetings: {}, counters: { CALL: 1001, MTG: 2001 }, filters: {}, prefs: { callBehavior: 'answer', autoWrap: false }, ui: { calMode: 'week', dashScope: 'team' } };
}

/* ---------- derived helpers ---------- */
const isTerminal = t => TERMINAL.includes(t.status);
const isLive = t => !!t.sub && LIVE_SUBS.includes(t.sub);
const computeDue = t => t.scheduledAt + (t.type === 'CALL' ? 15 * MIN : t.plannedDuration * MIN);
function isOverdue(t, at = now()) { return !isTerminal(t) && t.status !== 'IN_PROGRESS' && !isLive(t) && (t.dueAt || computeDue(t)) < at; }
const statusLabel = t => t.sub && !isTerminal(t) ? SUB_LABEL[t.sub] : STATUS_LABEL[t.status];
function statusClass(t) {
  const k = t.sub && !isTerminal(t) ? t.sub : t.status;
  if (['COMPLETED', 'CONNECTED', 'IN_MEETING'].includes(k)) return 'ok';
  if (['MISSED', 'CANCELLED', 'FAILED'].includes(k)) return 'bad';
  if (['DIALING', 'RINGING', 'ON_HOLD', 'WRAP_UP', 'JOINING', 'RESCHEDULED', 'IN_PROGRESS', 'TRANSFERRED'].includes(k)) return 'warn';
  if (['ASSIGNED', 'ACCEPTED', 'SCHEDULED'].includes(k)) return 'info';
  return '';
}
const isMine = t => t.assignedAgent === AppState.currentUserId;
const isAvail = a => !['Offline', 'Do Not Disturb'].includes(a.status);
function workload(id) {
  const ts = AppState.tasks.filter(t => t.assignedAgent === id && ACTIVE.includes(t.status));
  return { total: ts.length, calls: ts.filter(t => t.type === 'CALL').length, meetings: ts.filter(t => t.type === 'MEETING').length, current: ts.find(t => t.status === 'IN_PROGRESS') };
}
const reqSkills = t => t.queue ? queueObj(t.queue).skills : [t.type === 'CALL' ? 'voice' : 'video'];
function inPool(a, t) {
  if (t.queue) { const q = queueObj(t.queue); return a.team === q.team || q.skills.filter(s => s !== 'voice' && s !== 'video').some(s => a.skills.includes(s)); }
  if (t.assignedTeam) return a.team === t.assignedTeam;
  return true;
}

/* ---------- activity / notifications ---------- */
function logEvent(taskId, type, text, actor) {
  AppState.activities.push({ id: uid('e'), ts: now(), taskId, type, text, actor: actor === undefined ? AppState.currentUserId : actor });
  if (AppState.activities.length > 1500) AppState.activities.splice(0, 200);
}
function notify(to, type, text, taskId, opts = {}) {
  AppState.notifications.unshift({ id: uid('n'), ts: now(), to, type, text, taskId: taskId || null, read: false });
  if (AppState.notifications.length > 200) AppState.notifications.length = 200;
  if (to === AppState.currentUserId && opts.toast !== false) toast(text, type === 'overdue' ? 'warn' : 'info');
}
const taskEvents = id => AppState.activities.filter(a => a.taskId === id).sort((a, b) => b.ts - a.ts);

/* ---------- assignment engine ---------- */
function scoreAgents(t, scope = {}) {
  const draftTask = { ...t, queue: scope.queue !== undefined ? scope.queue : t.queue, assignedTeam: scope.team !== undefined ? scope.team : t.assignedTeam };
  const req = reqSkills(draftTask);
  const when = t.scheduledAt || now(); const span = (t.plannedDuration || 20) * MIN;
  return AppState.agents.map(a => {
    const w = workload(a.id);
    const reasons = [];
    if (!['Available', 'Busy'].includes(a.status)) reasons.push(a.status);
    if (!inPool(a, draftTask)) reasons.push('not in team/queue');
    const availability = a.status === 'Available' ? 30 : a.status === 'Busy' ? 12 : 0;
    const matched = req.filter(s => a.skills.includes(s)).length;
    const skill = Math.round(30 * (req.length ? matched / req.length : 1));
    const workloadScore = Math.round(20 * Math.max(0, 1 - w.total / 6));
    const lv = a.level - 1; const pr = { URGENT: [2, 6, 10], HIGH: [4, 8, 10], NORMAL: [10, 8, 6], LOW: [10, 7, 4] }[t.priority || 'NORMAL'][lv];
    const conflict = AppState.tasks.some(o => o.id !== t.id && o.assignedAgent === a.id && ACTIVE.includes(o.status) && Math.abs(o.scheduledAt - when) < Math.max(span, 20 * MIN));
    const schedule = conflict ? 0 : 10;
    const total = availability + skill + workloadScore + pr + schedule;
    return { agent: a, total, parts: { availability, skill, workload: workloadScore, priority: pr, schedule }, eligible: reasons.length === 0, reasons, load: w.total, conflict };
  }).sort((x, y) => (y.eligible - x.eligible) || (y.total - x.total) || (x.load - y.load) || x.agent.name.localeCompare(y.agent.name));
}
const autoAssign = (t, scope) => scoreAgents(t, scope).find(r => r.eligible) || null;

function setSub(t, sub) { t.sub = sub; }
function assignTask(id, a, { reassign = false } = {}) {
  const t = task(id); if (!t) fail('Task not found');
  if (isTerminal(t)) fail(`Task is ${STATUS_LABEL[t.status]} and cannot be assigned`);
  if (isLive(t)) fail('Cannot reassign while the interaction is live – end it first');
  if (reassign && !isSup() && t.assignedAgent !== AppState.currentUserId) fail('Only supervisors can reassign other agents’ tasks');
  const prev = t.assignedAgent; const mode = a.mode || 'direct';
  if (a.team) t.assignedTeam = a.team;
  if (a.queue) { t.queue = a.queue; if (!a.team) t.assignedTeam = queueObj(a.queue).team; }
  if (mode === 'direct' || mode === 'auto') {
    let target, auto = null;
    if (mode === 'auto') { auto = autoAssign(t, { team: a.team || undefined, queue: a.queue || undefined }); if (!auto) fail('No eligible agent available for auto-assignment'); target = auto.agent; }
    else { target = agent(a.agentId); if (!target) fail('Select an agent'); if (!isAvail(target)) fail(`Agent unavailable: ${target.name} is ${target.status}`); if (target.id === prev && reassign) fail('Task is already assigned to this agent'); }
    t.assignedAgent = target.id; t.status = 'ASSIGNED'; t.sub = t.type === 'MEETING' ? 'SCHEDULED' : null; t.reminded = false; t.overdueNotified = false;
    if (t.type === 'MEETING' && !t.participants.includes(target.name)) t.participants.push(target.name);
    if (reassign && prev) {
      logEvent(id, 'reassigned', `Task reassigned from ${agentName(prev)} to ${target.name}`);
      notify(target.id, 'reassigned', `Task reassigned to you: ${t.id} ${t.title}`, id, { toast: target.id === AppState.currentUserId && false });
      if (prev !== target.id) notify(prev, 'reassigned', `${t.id} was reassigned from you to ${target.name}`, id, { toast: false });
    } else if (mode === 'auto') {
      logEvent(id, 'assigned', `System automatically assigned task to ${target.name} (score ${auto.total}/100)`, 'system');
      notify(target.id, 'assigned', `New task assigned: ${t.id} ${t.title}`, id, { toast: false });
    } else {
      logEvent(id, 'assigned', `Task assigned to ${target.name}`);
      notify(target.id, 'assigned', `New task assigned: ${t.id} ${t.title}`, id, { toast: false });
    }
    save(); return { agent: target, auto, mode };
  }
  // team or queue: routed to pool
  if (!(mode === 'queue' ? t.queue : t.assignedTeam)) fail(`Select a ${mode} first`);
  t.assignedAgent = null; t.status = 'UNASSIGNED'; t.sub = null;
  const where = mode === 'queue' ? `queue ${queueName(t.queue)}` : `team ${teamName(t.assignedTeam)}`;
  logEvent(id, 'assigned', `${prev ? `Task released from ${agentName(prev)} and r` : 'R'}outed to ${where} (available to claim)`);
  save(); return { mode };
}
function autoAssignTask(id, scope = {}) { return assignTask(id, { mode: 'auto', ...scope }); }
function claimTask(id, agentId = AppState.currentUserId) {
  const t = task(id), a = agent(agentId);
  if (t.status !== 'UNASSIGNED') fail('Task is no longer available to claim');
  if (!isAvail(a)) fail(`Agent unavailable: you are ${a.status}`);
  if (!inPool(a, t)) fail(`${a.name} is not a member of ${t.queue ? queueName(t.queue) : teamName(t.assignedTeam)}`);
  t.assignedAgent = a.id; t.status = 'ACCEPTED'; t.sub = t.type === 'MEETING' ? 'SCHEDULED' : null;
  if (t.type === 'MEETING' && !t.participants.includes(a.name)) t.participants.push(a.name);
  logEvent(id, 'claimed', `Task claimed by ${a.name}`, a.id); save(); return t;
}
function releaseTask(id) {
  const t = task(id);
  if (!['ASSIGNED', 'ACCEPTED', 'RESCHEDULED'].includes(t.status)) fail('Only tasks that have not started can be released');
  if (t.assignedAgent !== AppState.currentUserId && !isSup()) fail('You can only release your own tasks');
  const prev = t.assignedAgent; t.assignedAgent = null; t.status = 'UNASSIGNED'; t.sub = null;
  logEvent(id, 'released', `Task released by ${agentName(prev)} back to ${t.queue ? queueName(t.queue) : 'pool'}`); save(); return t;
}
function acceptTask(id) {
  const t = task(id);
  if (!['ASSIGNED', 'RESCHEDULED'].includes(t.status)) fail('Task cannot be accepted in its current state');
  if (!t.assignedAgent) fail('Task is not assigned');
  t.status = 'ACCEPTED'; logEvent(id, 'accepted', `${agentName(t.assignedAgent)} accepted task`, t.assignedAgent); save(); return t;
}
function declineTask(id) { const t = task(id); const n = agentName(t.assignedAgent); releaseTask(id); logEvent(id, 'released', `${n} declined the task`); }
function startTask(id) {
  const t = task(id), a = agent(AppState.currentUserId);
  if (t.status === 'IN_PROGRESS') return t;
  if (!['ASSIGNED', 'ACCEPTED', 'RESCHEDULED'].includes(t.status)) fail(`Cannot start a task that is ${STATUS_LABEL[t.status]}`);
  if (t.assignedAgent !== a.id) fail(t.assignedAgent ? `Task is assigned to ${agentName(t.assignedAgent)}` : 'Claim or assign this task before starting it');
  if (a.status === 'Offline') fail('Agent unavailable: set your presence to Available before starting a task');
  if (t.status !== 'ACCEPTED') logEvent(id, 'accepted', `${a.name} accepted task`);
  t.status = 'IN_PROGRESS'; t.startedAt = now(); logEvent(id, 'started', 'Task started');
  if (a.status === 'Available') { a.prevStatus = 'Available'; a.status = 'Busy'; }
  save(); return t;
}
function restorePresence() {
  const a = me(); const live = AppState.tasks.some(t => t.assignedAgent === a.id && isLive(t) && t.sub !== 'WRAP_UP');
  if (a.prevStatus && a.status === 'Busy' && !live) { a.status = a.prevStatus; a.prevStatus = null; }
}
function setPresence(agentId, status) {
  const a = agent(agentId); if (!a || a.status === status) return; a.status = status; a.prevStatus = null;
  logEvent(null, 'presence', `${a.name}: Agent presence changed to ${status}`, agentId); save();
}
const OUTCOME_FINAL = o => OUTCOME_STATUS[o] || 'COMPLETED';
function completeTask(id, { outcome, disposition, notes } = {}) {
  const t = task(id);
  outcome = outcome || t.outcome;
  if (!outcome) fail('Cannot complete task without wrap-up – choose an outcome first');
  t.outcome = outcome; if (disposition !== undefined) t.disposition = disposition; if (notes !== undefined) t.notes = notes;
  t.status = OUTCOME_FINAL(outcome); t.sub = null; t.completedAt = now();
  const label = t.status === 'COMPLETED' ? 'Task completed' : `Task closed as ${STATUS_LABEL[t.status]}`;
  logEvent(id, t.status === 'COMPLETED' ? 'completed' : t.status.toLowerCase(), `${label} – outcome: ${outcome}`);
  restorePresence(); save(); return t;
}
function rescheduleTask(id, { scheduledAt, plannedDuration, reason }) {
  const t = task(id);
  if (!scheduledAt || isNaN(scheduledAt)) fail(t.type === 'MEETING' ? 'Meeting time required' : 'Date and time required');
  if (scheduledAt < now() - 5 * MIN) fail('Cannot reschedule to a time in the past');
  if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(t.status)) fail(`Cannot reschedule a ${STATUS_LABEL[t.status].toLowerCase()} task`);
  if (isLive(t)) fail('Cannot reschedule while the interaction is live');
  const old = t.scheduledAt; t.scheduledAt = scheduledAt; if (plannedDuration) t.plannedDuration = plannedDuration; t.dueAt = computeDue(t);
  t.status = t.assignedAgent ? 'RESCHEDULED' : 'UNASSIGNED'; t.sub = t.assignedAgent && t.type === 'MEETING' ? 'SCHEDULED' : null; t.reminded = false; t.overdueNotified = false; t.outcome = '';
  logEvent(id, 'rescheduled', `Task rescheduled from ${fmtDT(old)} to ${fmtDT(scheduledAt)}${reason ? ' – ' + reason : ''}`);
  notify(AppState.currentUserId, 'system', `${t.id} rescheduled to ${fmtDT(scheduledAt)}`, id, { toast: false });
  if (t.assignedAgent && t.assignedAgent !== AppState.currentUserId) notify(t.assignedAgent, 'reassigned', `${t.id} rescheduled to ${fmtDT(scheduledAt)}`, id, { toast: false });
  save(); return t;
}
function cancelTask(id, reason) {
  const t = task(id);
  if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(t.status)) fail(`Task is already ${STATUS_LABEL[t.status].toLowerCase()}`);
  if (isLive(t)) fail('End the live interaction before cancelling this task');
  t.status = 'CANCELLED'; t.sub = null; delete AppState.calls[id]; delete AppState.meetings[id];
  logEvent(id, 'cancelled', `Task cancelled${reason ? ' – ' + reason : ''}`);
  if (t.assignedAgent && t.assignedAgent !== AppState.currentUserId) notify(t.assignedAgent, 'system', `${t.id} was cancelled`, id, { toast: false });
  save(); return t;
}
function deleteTask(id) {
  const t = task(id); if (isLive(t)) fail('End the live interaction before deleting this task');
  AppState.tasks = AppState.tasks.filter(x => x.id !== id); AppState.activities = AppState.activities.filter(a => a.taskId !== id);
  AppState.notifications = AppState.notifications.filter(n => n.taskId !== id); delete AppState.calls[id]; delete AppState.meetings[id]; save();
}
function createTask(d, assignment) {
  const type = d.type;
  if (!d.title || !d.title.trim()) fail(type === 'CALL' ? 'Call purpose is required' : 'Meeting title is required');
  if (!d.customerId) fail('Customer is required');
  if (type === 'CALL') { if (!d.phone || !d.phone.trim()) fail('Phone number required'); if (d.phone.replace(/\D/g, '').length < 7) fail('Enter a valid phone number (at least 7 digits)'); }
  if (!d.scheduledAt || isNaN(d.scheduledAt)) fail(type === 'MEETING' ? 'Meeting time required' : 'Date and time required');
  if (type === 'MEETING' && d.endAt && d.endAt <= d.scheduledAt) fail('Meeting end time must be after the start time');
  const c = customer(d.customerId); const num = AppState.counters[type === 'CALL' ? 'CALL' : 'MTG']++;
  const t = {
    id: (type === 'CALL' ? 'CALL-' : 'MTG-') + num, type, title: d.title.trim(), customerId: c.id, customer: c.name, company: c.company, contact: d.contact || c.name, phone: type === 'CALL' ? d.phone : c.phone,
    participants: type === 'MEETING' ? (d.participants || []) : [], description: d.description || '', priority: d.priority || 'NORMAL', status: 'UNASSIGNED', sub: null, assignedAgent: null,
    assignedTeam: d.team || null, queue: d.queue || null, createdAt: now(), scheduledAt: d.scheduledAt, plannedDuration: d.plannedDuration || (type === 'CALL' ? 20 : 30), duration: 0, notes: d.notes || '', outcome: '', disposition: '',
    direction: d.direction || 'Outbound', parentId: d.parentId || null, dueAt: 0
  };
  t.dueAt = computeDue(t); AppState.tasks.push(t);
  logEvent(t.id, 'created', `${type === 'CALL' ? 'Call' : 'Meeting'} task created${d.parentId ? ' (follow-up of ' + d.parentId + ')' : ''}`);
  let result = null;
  try { if (assignment || t.queue || t.assignedTeam) result = assignTask(t.id, assignment || { mode: t.queue ? 'queue' : 'team', team: t.assignedTeam, queue: t.queue }); }
  catch (e) { if (!(e instanceof UserError)) throw e; AppState.tasks = AppState.tasks.filter(x => x.id !== t.id); AppState.activities = AppState.activities.filter(a => a.taskId !== t.id); AppState.counters[type === 'CALL' ? 'CALL' : 'MTG']--; throw e; }
  save(); return { task: t, result };
}
const timers = {};
function schedule(key, ms, fn) { clearTimeout(timers[key]); timers[key] = setTimeout(() => { delete timers[key]; try { fn(); } catch (e) { if (!(e instanceof UserError)) console.error(e); } }, ms); }
function cancelTimers(prefix) { Object.keys(timers).filter(k => k.startsWith(prefix)).forEach(k => { clearTimeout(timers[k]); delete timers[k]; }); }

/* =====================================================================
   CALL ENGINE (simulated softphone – no real telephony)
   idle → dialing → ringing → connected ⇄ hold (→ consult) → wrapup → completed
   ===================================================================== */
const LIVE_CALL = ['dialing', 'ringing', 'connected', 'hold', 'consult'];
const tomorrow10 = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d.getTime(); };
function ensureCall(id) {
  const t = task(id);
  return AppState.calls[id] || (AppState.calls[id] = { state: 'idle', dial: t.phone, muted: false, speaker: false, padOpen: false, dtmf: '', participants: [], consult: null, heldMs: 0, holdSince: 0, connectedAt: 0, endedAt: 0, talkMs: 0, wrap: null });
}
function callTalkMs(s) {
  if (!s.connectedAt) return s.talkMs || 0;
  if (s.endedAt) return s.talkMs;
  const held = s.heldMs + (s.holdSince ? now() - s.holdSince : 0);
  return Math.max(0, now() - s.connectedAt - held);
}
const holdMs = s => s.heldMs + (s.holdSince ? now() - s.holdSince : 0);
function otherLive(id) {
  const t = AppState.tasks.find(x => x.id !== id && x.assignedAgent === AppState.currentUserId && isLive(x) && x.sub !== 'WRAP_UP');
  return t;
}
function startCall(id, number) {
  const t = task(id); if (t.type !== 'CALL') fail('Not a call task');
  number = (number || '').trim();
  if (!number) fail('Phone number required');
  if (number.replace(/\D/g, '').length < 7) fail('Enter a valid phone number (at least 7 digits)');
  const ex = AppState.calls[id]; if (ex && LIVE_CALL.includes(ex.state)) fail('A call is already in progress');
  const o = otherLive(id); if (o) fail(`You already have an active interaction (${o.id}) – end it first`);
  startTask(id);
  const s = AppState.calls[id] = { state: 'dialing', dial: number, number, muted: false, speaker: false, padOpen: false, dtmf: '', participants: [], consult: null, heldMs: 0, holdSince: 0, connectedAt: 0, endedAt: 0, talkMs: 0, wrap: null, startedAt: now() };
  t.sub = 'DIALING'; logEvent(id, 'dialed', `Call dialed to ${number}`);
  schedule('call:' + id, 1200, () => ringCall(id)); save(); return s;
}
function ringCall(id) {
  const s = AppState.calls[id]; if (!s || s.state !== 'dialing') return;
  s.state = 'ringing'; task(id).sub = 'RINGING'; logEvent(id, 'ringing', 'Call ringing');
  const b = AppState.prefs.callBehavior;
  if (b === 'answer') schedule('call:' + id, 2400, () => connectCall(id));
  else if (b === 'busy') schedule('call:' + id, 2000, () => customerEnds(id, 'Busy'));
  else if (b === 'voicemail') schedule('call:' + id, 3000, () => customerEnds(id, 'Voicemail'));
  else schedule('call:' + id, 7000, () => customerEnds(id, 'No Answer'));
  render();
}
function customerEnds(id, outcome) {
  const s = AppState.calls[id]; if (!s || !LIVE_CALL.includes(s.state)) return;
  logEvent(id, 'ended', outcome === 'No Answer' ? 'No answer – ringing timed out' : `Call ended by far end (${outcome})`, 'system');
  endCall(id, { outcome }); toast(`Call ended: ${outcome}`, 'warn'); render();
}
function connectCall(id) {
  const s = AppState.calls[id]; if (!s) fail('No active call');
  if (!['dialing', 'ringing'].includes(s.state)) fail('Call is not ringing');
  cancelTimers('call:' + id);
  s.state = 'connected'; s.connectedAt = now(); task(id).sub = 'CONNECTED'; logEvent(id, 'connected', 'Customer connected');
  save(); render(); toast('Call connected', 'success');
}
function holdCall(id) {
  const s = AppState.calls[id]; if (!s || s.state !== 'connected') fail('Only a connected call can be put on hold');
  s.state = 'hold'; s.holdSince = now(); task(id).sub = 'ON_HOLD'; logEvent(id, 'hold', 'Call put on hold'); save();
}
function resumeCall(id) {
  const s = AppState.calls[id]; if (!s || s.state !== 'hold') fail('Call is not on hold');
  s.heldMs += now() - s.holdSince; s.holdSince = 0; s.state = 'connected'; task(id).sub = 'CONNECTED'; logEvent(id, 'resumed', 'Call resumed'); save();
}
function muteCall(id) {
  const s = AppState.calls[id]; if (!s || !['connected', 'hold', 'consult'].includes(s.state)) fail('No active call to mute');
  s.muted = !s.muted; logEvent(id, 'mute', s.muted ? 'Microphone muted' : 'Microphone unmuted'); save();
}
function speakerCall(id) { const s = ensureCall(id); s.speaker = !s.speaker; save(); }
function dialDigit(id, d) {
  const s = ensureCall(id);
  if (['connected', 'hold', 'consult'].includes(s.state)) s.dtmf = (s.dtmf + d).slice(-24);
  else if (['idle', 'wrapup'].includes(s.state) || !s.state) s.dial = (s.dial + d).slice(0, 24);
  save();
}
function dialBack(id) { const s = ensureCall(id); if (s.state === 'idle') s.dial = s.dial.slice(0, -1); else s.dtmf = s.dtmf.slice(0, -1); save(); }
function dialClear(id) { const s = ensureCall(id); if (s.state === 'idle') s.dial = ''; else s.dtmf = ''; save(); }
function transferCall(id, agentId, type = 'cold') {
  const s = AppState.calls[id], t = task(id);
  if (!s || !['connected', 'hold', 'consult'].includes(s.state)) fail('No active call to transfer');
  if (s.state === 'hold') fail('Cannot transfer while call is on hold – resume the call first');
  if (s.state === 'consult') fail('A consultation is already in progress');
  const target = agent(agentId); if (!target) fail('Select an agent to transfer to');
  if (target.id === AppState.currentUserId) fail('You cannot transfer a call to yourself');
  if (!isAvail(target)) fail(`Agent unavailable: ${target.name} is ${target.status}`);
  if (type === 'cold') return finishTransfer(id, target, 'cold');
  s.state = 'consult'; s.holdSince = now(); s.consult = { agentId: target.id, state: 'ringing' }; t.sub = 'ON_HOLD';
  logEvent(id, 'consult', `Warm transfer: consulting ${target.name} (customer on hold)`);
  schedule('call:' + id + ':consult', 2200, () => { const c = AppState.calls[id]; if (c && c.consult && c.consult.state === 'ringing') { c.consult.state = 'connected'; logEvent(id, 'consult', `${target.name} answered the consultation`, target.id); save(); render(); toast(`${target.name} answered – complete or cancel the transfer`, 'info'); } });
  save();
}
function completeTransfer(id) {
  const s = AppState.calls[id]; if (!s || s.state !== 'consult') fail('No consultation in progress');
  if (s.consult.state !== 'connected') fail('Wait for the agent to answer before completing the transfer');
  return finishTransfer(id, agent(s.consult.agentId), 'warm');
}
function cancelConsult(id) {
  const s = AppState.calls[id]; if (!s || s.state !== 'consult') fail('No consultation in progress');
  cancelTimers('call:' + id + ':consult');
  const n = agentName(s.consult.agentId); s.heldMs += now() - s.holdSince; s.holdSince = 0; s.state = 'connected'; s.consult = null; task(id).sub = 'CONNECTED';
  logEvent(id, 'consult', `Consultation with ${n} cancelled – customer resumed`); save();
}
function finishTransfer(id, target, kind) {
  const s = AppState.calls[id], t = task(id), from = me();
  t.duration += Math.round(callTalkMs(s) / 1000); cancelTimers('call:' + id);
  t.assignedAgent = target.id; t.assignedTeam = target.team; t.status = 'ASSIGNED'; t.sub = 'TRANSFERRED'; t.notes = (t.notes ? t.notes + '\n' : '') + `[${fmtTime(now())}] Call transferred (${kind}) to ${target.name}.`;
  delete AppState.calls[id];
  logEvent(id, 'transferred', `Call transferred (${kind}) from ${from.name} to ${target.name} – ownership changed`);
  notify(target.id, 'transfer', `Transfer request: ${t.id} ${t.customer} transferred from ${from.name} (${kind})`, id, { toast: false });
  restorePresence(); save(); return target;
}
function addParticipant(id, { name, phone, newCall = false }) {
  const s = AppState.calls[id];
  if (!s || !['connected', 'hold'].includes(s.state)) fail('No active call');
  if (s.state === 'hold' && !newCall) fail('Cannot add a participant while the call is on hold – resume first');
  phone = (phone || '').trim(); if (!phone) fail('Phone number required');
  if (phone.replace(/\D/g, '').length < 4 && !/^ext/i.test(phone)) fail('Enter a valid number or extension');
  if (s.participants.length >= 4) fail('Conference limit reached (4 added participants)');
  const p = { id: uid('p'), name: name || phone, phone, status: 'dialing', muted: false };
  s.participants.push(p); logEvent(id, 'participant', `Participant added: ${p.name} (dialing)`);
  schedule(`call:${id}:p:${p.id}`, 1800, () => {
    const c = AppState.calls[id]; const q = c && c.participants.find(x => x.id === p.id); if (!q) return;
    q.status = 'connected'; logEvent(id, 'participant', `${q.name} joined the conference`, 'system');
    if (c.state === 'hold') { resumeCall(id); }
    save(); render(); toast(`${q.name} joined – conference active`, 'success');
  });
  save(); return p;
}
function removeParticipant(id, pid) { const s = AppState.calls[id]; const p = s.participants.find(x => x.id === pid); if (!p) return; s.participants = s.participants.filter(x => x.id !== pid); cancelTimers(`call:${id}:p:${pid}`); logEvent(id, 'participant', `Participant removed: ${p.name}`); save(); }
function muteParticipant(id, pid) { const p = AppState.calls[id].participants.find(x => x.id === pid); if (p) { p.muted = !p.muted; logEvent(id, 'mute', `${p.name} ${p.muted ? 'muted' : 'unmuted'}`); save(); } }
function endConference(id) { const s = AppState.calls[id]; const n = s.participants.length; s.participants.forEach(p => cancelTimers(`call:${id}:p:${p.id}`)); s.participants = []; logEvent(id, 'participant', `Conference ended – ${n} participant(s) removed, customer remains connected`); save(); }
function endCall(id, { outcome = '' } = {}) {
  const s = AppState.calls[id], t = task(id); if (!s || !LIVE_CALL.includes(s.state)) fail('No active call');
  cancelTimers('call:' + id);
  const wasConnected = !!s.connectedAt;
  if (s.holdSince) { s.heldMs += now() - s.holdSince; s.holdSince = 0; }
  s.endedAt = now(); s.talkMs = wasConnected ? Math.max(0, s.endedAt - s.connectedAt - s.heldMs) : 0;
  s.participants = []; s.consult = null; s.state = 'wrapup'; t.sub = 'WRAP_UP'; t.duration += Math.round(s.talkMs / 1000);
  if (wasConnected) logEvent(id, 'ended', `Call ended (talk time ${dur(s.talkMs / 1000)})`);
  else if (!outcome) logEvent(id, 'ended', 'Call cancelled before answer');
  logEvent(id, 'wrapup_started', 'Wrap-up started');
  s.wrap = { outcome, disposition: '', notes: t.notes || '', followup: false, fuDate: toDateInput(tomorrow10()), fuTime: '10:00' };
  save(); return s;
}
function createFollowUp(t, { date, time, title }) {
  const at = parseDT(date, time);
  if (!at || isNaN(at)) fail('Follow-up date and time required');
  if (at < now()) fail('Follow-up must be scheduled in the future');
  return createTask({ type: 'CALL', title: title || `Follow-up: ${t.title}`, customerId: t.customerId, contact: t.contact, phone: t.phone, priority: t.priority, scheduledAt: at, team: t.assignedTeam, queue: t.queue, parentId: t.id, notes: `Follow-up created from ${t.id} (${t.outcome || 'wrap-up'}).`, description: `Follow-up to ${t.id}` },
    { mode: 'direct', agentId: AppState.currentUserId });
}
function wrapUpCall(id) {
  const s = AppState.calls[id], t = task(id); if (!s || s.state !== 'wrapup') fail('Call is not in wrap-up');
  const w = s.wrap; if (!w.outcome) fail('Cannot complete task without wrap-up – choose an outcome first');
  if (w.followup) { const at = parseDT(w.fuDate, w.fuTime); if (isNaN(at) || !w.fuDate || !w.fuTime) fail('Follow-up date and time required'); if (at < now()) fail('Follow-up must be scheduled in the future'); }
  completeTask(id, { outcome: w.outcome, disposition: w.disposition, notes: w.notes });
  let fu = null; if (w.followup) { fu = createFollowUp(t, { date: w.fuDate, time: w.fuTime }).task; logEvent(id, 'followup', `Follow-up task ${fu.id} created`); }
  delete AppState.calls[id]; save(); return { task: t, followUp: fu };
}

/* ---------- incoming call simulation ---------- */
function simulateIncomingCall() {
  const cands = AppState.customers.filter(c => !AppState.tasks.some(t => t.customerId === c.id && ACTIVE.includes(t.status)));
  const c = (cands.length ? cands : AppState.customers)[Math.floor(Math.random() * (cands.length || AppState.customers.length))];
  const reasons = ['Billing question', 'Product inquiry', 'Renewal enquiry', 'Service issue', 'Pricing request'];
  const m = me(); const canTake = isAvail(m) && !otherLive('');
  const { task: t } = createTask({ type: 'CALL', title: 'Inbound – ' + reasons[Math.floor(Math.random() * reasons.length)], customerId: c.id, phone: c.phone, priority: 'HIGH', scheduledAt: now(), direction: 'Inbound', queue: 'q_sales', team: 't_sales', plannedDuration: 15 },
    canTake ? { mode: 'direct', agentId: m.id } : { mode: 'queue', queue: 'q_sales' });
  logEvent(t.id, 'incoming', `Incoming call from ${c.name} (${c.phone})`, 'system');
  if (!canTake) { toast('Incoming call routed to Sales Calls queue (you are unavailable)', 'warn'); return t; }
  AppState.ui.incoming = t.id;
  notify(m.id, 'incoming', `Incoming call: ${c.name} (${c.company})`, t.id, { toast: false });
  schedule('incoming', 25000, () => { if (AppState.ui.incoming === t.id) missIncoming(t.id); });
  render(); return t;
}
function missIncoming(id) {
  const t = task(id); AppState.ui.incoming = null; if (!t || t.status !== 'ASSIGNED') return;
  t.status = 'MISSED'; t.outcome = 'No Answer'; logEvent(id, 'missed', 'Incoming call missed – not answered', 'system');
  notify(AppState.currentUserId, 'overdue', `Missed incoming call: ${t.customer}`, id, { toast: true }); save(); render();
}
function acceptIncoming() {
  const id = AppState.ui.incoming; if (!id) return; const t = task(id);
  clearTimeout(timers.incoming); AppState.ui.incoming = null;
  startTask(id);
  AppState.calls[id] = { state: 'connected', dial: t.phone, number: t.phone, muted: false, speaker: false, padOpen: false, dtmf: '', participants: [], consult: null, heldMs: 0, holdSince: 0, connectedAt: now(), endedAt: 0, talkMs: 0, wrap: null, startedAt: now() };
  t.sub = 'CONNECTED'; logEvent(id, 'connected', 'Inbound call answered by agent'); save(); navigate('#/task/' + id);
}
function declineIncoming() {
  const id = AppState.ui.incoming; if (!id) return; clearTimeout(timers.incoming); AppState.ui.incoming = null;
  declineTask(id); toast('Call declined and returned to the queue', 'info'); render();
}

/* =====================================================================
   MEETING ENGINE (simulated – no WebRTC)
   scheduled → joining → in_meeting ⇄ left → wrap-up → completed
   ===================================================================== */
const CHAT_REPLIES = ['Can everyone see my screen?', 'Thanks – that makes sense.', 'Could you go back one slide?', 'Great, let’s note that as an action item.', 'Sorry, I was on mute.', 'I’ll share the doc after the call.'];
function ensureMeeting(id) {
  return AppState.meetings[id] || (AppState.meetings[id] = { state: 'lobby', mic: true, cam: true, speaker: true, sharing: false, panel: null, parts: [], chat: [], chatDraft: '', startedAt: 0, endedAt: 0, wrap: null, rejoin: false });
}
const meetingElapsedMs = s => s.startedAt ? (s.endedAt || now()) - s.startedAt : 0;
function joinMeeting(id) {
  const t = task(id); if (t.type !== 'MEETING') fail('Not a meeting task');
  if (t.status === 'CANCELLED') fail('Cannot join cancelled meeting');
  if (isTerminal(t)) fail(`Cannot join a meeting that is ${STATUS_LABEL[t.status].toLowerCase()}`);
  if (!t.assignedAgent) fail('Claim or assign this meeting before joining');
  if (t.assignedAgent !== AppState.currentUserId) fail(`This meeting is hosted by ${agentName(t.assignedAgent)} – reassign it to yourself to join`);
  const o = otherLive(id); if (o) fail(`You already have an active interaction (${o.id}) – end it first`);
  const s = ensureMeeting(id); if (['joining', 'in_meeting'].includes(s.state)) fail('You are already in this meeting');
  startTask(id);
  const rejoin = s.state === 'left';
  s.state = 'joining'; s.rejoin = rejoin; t.sub = 'JOINING'; logEvent(id, rejoin ? 'meeting_joined' : 'meeting_joining', rejoin ? 'Rejoining meeting' : 'Joining meeting');
  schedule('mtg:' + id + ':join', 1300, () => enterMeeting(id)); save(); return s;
}
const startMeeting = joinMeeting;
function enterMeeting(id) {
  const s = AppState.meetings[id], t = task(id); if (!s || s.state !== 'joining') return;
  s.state = 'in_meeting'; t.sub = 'IN_MEETING';
  if (!s.startedAt) {
    s.startedAt = now(); const host = agentName(t.assignedAgent);
    s.parts = t.participants.filter(n => n !== host).map(n => ({ name: n, state: 'disconnected', mic: Math.random() > .3, cam: Math.random() > .25, speaking: false }));
    logEvent(id, 'meeting_started', 'Meeting started');
  } else logEvent(id, 'meeting_joined', 'Rejoined meeting');
  save(); render(); meetingTick(id, true);
}
function meetingTick(id, first) {
  const s = AppState.meetings[id]; if (!s || s.state !== 'in_meeting') return;
  schedule('mtg:' + id + ':tick', first ? 900 : 3200, () => {
    const m = AppState.meetings[id]; if (!m || m.state !== 'in_meeting') return;
    const down = m.parts.filter(p => p.state === 'disconnected');
    const up = m.parts.filter(p => p.state === 'connected');
    if (down.length && (!m.allJoined)) { const p = down[0]; p.state = 'connected'; logEvent(id, 'participant', `${p.name} joined the meeting`, 'system'); if (!m.parts.some(x => x.state === 'disconnected')) m.allJoined = true; }
    else {
      const r = Math.random();
      if (r < .1 && up.length > 1) { const p = up[Math.floor(Math.random() * up.length)]; p.mic = !p.mic; }
      else if (r < .18 && up.length) { const p = up[Math.floor(Math.random() * up.length)]; p.cam = !p.cam; }
      else if (r < .22 && up.length > 2) { const p = up[up.length - 1]; p.state = 'disconnected'; p.speaking = false; m.allJoined = false; logEvent(id, 'participant', `${p.name} lost connection`, 'system'); }
    }
    m.parts.forEach(p => p.speaking = false);
    const talkers = m.parts.filter(p => p.state === 'connected' && p.mic);
    if (talkers.length && Math.random() < .8) talkers[Math.floor(Math.random() * talkers.length)].speaking = true;
    save(); render(); meetingTick(id);
  });
}
function muteMeeting(id) { const s = AppState.meetings[id]; if (!s || s.state !== 'in_meeting') fail('Join the meeting first'); s.mic = !s.mic; logEvent(id, 'mute', s.mic ? 'Microphone unmuted' : 'Microphone muted'); save(); }
function cameraMeeting(id) { const s = AppState.meetings[id]; if (!s || s.state !== 'in_meeting') fail('Join the meeting first'); s.cam = !s.cam; logEvent(id, 'camera', s.cam ? 'Camera turned on' : 'Camera turned off'); save(); }
function speakerMeeting(id) { const s = AppState.meetings[id]; if (!s || s.state !== 'in_meeting') fail('Join the meeting first'); s.speaker = !s.speaker; save(); }
function shareScreen(id) {
  const s = AppState.meetings[id]; if (!s || s.state !== 'in_meeting') fail('Join the meeting first');
  s.sharing = !s.sharing; logEvent(id, 'share', s.sharing ? 'Screen sharing started (simulated)' : 'Screen sharing stopped'); save();
}
function panelMeeting(id, p) { const s = AppState.meetings[id]; s.panel = s.panel === p ? null : p; save(); }
function sendChat(id, text) {
  const s = AppState.meetings[id]; text = (text || '').trim(); if (!text) return;
  s.chat.push({ from: 'You', text, ts: now() }); s.chatDraft = '';
  const up = s.parts.filter(p => p.state === 'connected');
  if (up.length) schedule('mtg:' + id + ':chat', 1500, () => { const m = AppState.meetings[id]; if (m && m.state === 'in_meeting') { m.chat.push({ from: up[0].name, text: CHAT_REPLIES[Math.floor(Math.random() * CHAT_REPLIES.length)], ts: now() }); save(); render(); } });
  save();
}
function leaveMeeting(id) {
  const s = AppState.meetings[id]; if (!s || s.state !== 'in_meeting') fail('You are not in the meeting');
  cancelTimers('mtg:' + id); s.state = 'left'; s.sharing = false; task(id).sub = null; logEvent(id, 'meeting_left', 'Host left the meeting (meeting still open)'); save();
}
function endMeeting(id) {
  const s = AppState.meetings[id], t = task(id); if (!s || !['in_meeting', 'left', 'joining'].includes(s.state)) fail('No active meeting to end');
  cancelTimers('mtg:' + id); s.endedAt = now(); s.sharing = false; s.state = 'wrapup'; t.sub = 'WRAP_UP'; t.duration += Math.round(meetingElapsedMs(s) / 1000);
  logEvent(id, 'meeting_ended', `Meeting ended (${dur(meetingElapsedMs(s) / 1000)})`); logEvent(id, 'wrapup_started', 'Wrap-up started');
  const names = [agentName(t.assignedAgent), ...s.parts.map(p => p.name)];
  s.wrap = { outcome: '', notes: t.notes || '', attended: Object.fromEntries(names.map(n => [n, true])), followup: false, fuDate: toDateInput(tomorrow10()), fuTime: '10:00' };
  save(); return s;
}
function wrapUpMeeting(id) {
  const s = AppState.meetings[id], t = task(id); if (!s || s.state !== 'wrapup') fail('Meeting is not in wrap-up');
  const w = s.wrap; if (!w.outcome) fail('Cannot complete task without wrap-up – choose an outcome first');
  if (w.followup) { const at = parseDT(w.fuDate, w.fuTime); if (isNaN(at) || !w.fuDate || !w.fuTime) fail('Follow-up date and time required'); if (at < now()) fail('Follow-up must be scheduled in the future'); }
  const attended = Object.keys(w.attended).filter(n => w.attended[n]);
  completeTask(id, { outcome: w.outcome, notes: (w.notes ? w.notes + '\n' : '') + `Attendees: ${attended.join(', ') || 'none'}` });
  let fu = null; if (w.followup) { fu = createFollowUp(t, { date: w.fuDate, time: w.fuTime, title: `Follow-up call: ${t.title}` }).task; logEvent(id, 'followup', `Follow-up task ${fu.id} created`); }
  const resched = w.outcome === 'Reschedule Required';
  delete AppState.meetings[id]; save(); return { task: t, followUp: fu, resched };
}

/* ---------- boot-time simulation recovery ---------- */
function resumeSims() {
  Object.entries(AppState.calls).forEach(([id, s]) => {
    if (!task(id)) { delete AppState.calls[id]; return; }
    if (s.state === 'dialing') schedule('call:' + id, 800, () => ringCall(id));
    else if (s.state === 'ringing') { s.state = 'dialing'; schedule('call:' + id, 500, () => ringCall(id)); }
    if (s.consult && s.consult.state === 'ringing') schedule('call:' + id + ':consult', 1200, () => { s.consult.state = 'connected'; save(); render(); });
    s.participants.filter(p => p.status === 'dialing').forEach(p => schedule(`call:${id}:p:${p.id}`, 1000, () => { p.status = 'connected'; save(); render(); }));
  });
  Object.entries(AppState.meetings).forEach(([id, s]) => {
    if (!task(id)) { delete AppState.meetings[id]; return; }
    if (s.state === 'joining') schedule('mtg:' + id + ':join', 800, () => enterMeeting(id));
    else if (s.state === 'in_meeting') meetingTick(id, true);
  });
}

/* ---------- system tick: reminders & overdue ---------- */
function systemTick() {
  const n = now(), uid0 = AppState.currentUserId; let changed = false;
  AppState.tasks.forEach(t => {
    if (t.assignedAgent !== uid0 || isTerminal(t) || t.status === 'IN_PROGRESS') return;
    const until = t.scheduledAt - n;
    if (!t.reminded && until <= 5 * MIN && until > -2 * MIN) { t.reminded = true; changed = true; notify(uid0, 'reminder', `${t.type === 'MEETING' ? 'Meeting' : 'Call'} starts in ${Math.max(1, Math.round(until / MIN))} minutes: ${t.title}`, t.id); }
    if (!t.overdueNotified && isOverdue(t, n)) { t.overdueNotified = true; changed = true; notify(uid0, 'overdue', `${t.type === 'CALL' ? 'Call' : 'Meeting'} task overdue: ${t.id} ${t.title}`, t.id); }
  });
  if (changed) { save(); render(); }
}
