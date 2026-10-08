
/* =====================================================================
   UI LAYER – UCaaS look & feel on top of the engine above
   ===================================================================== */
const Z = .8;
const MONL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const P = {
home:'<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
phoneoff:'<path d="M10.7 13.3a16 16 0 0 0 3 2.3l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9M2 2l20 20"/>',
video:'<path d="M23 7l-7 5 7 5z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
videooff:'<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.7 0H14a2 2 0 0 1 2 2v3.3l1 1L23 7v10M1 1l22 22"/>',
inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
tasks:'<rect x="4" y="4" width="16" height="18" rx="2"/><path d="M9 2h6v4H9z"/><path d="M9 14l2 2 4-4"/>',
dash:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
act:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
calday:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><rect x="8" y="14" width="3" height="3"/>',
bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
search:'<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
kanban:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v12"/>',
cl:'<path d="M15 18l-6-6 6-6"/>',cr:'<path d="M9 18l6-6-6-6"/>',cd:'<path d="M6 9l6 6 6-6"/>',
dl:'<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>',dr:'<path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>',
dots:'<circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/>',
user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
x:'<path d="M18 6L6 18M6 6l12 12"/>',
filter:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>',
check:'<path d="M20 6L9 17l-5-5"/>',
trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
up:'<path d="M12 19V5M5 12l7-7 7 7"/>',down:'<path d="M12 5v14M19 12l-7 7-7-7"/>',
undo:'<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/>',
micoff:'<path d="M1 1l22 22M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.6M19 10v1a7 7 0 0 1-.9 3.4M5 10v1a7 7 0 0 0 11.7 5.2M12 18v4M8 22h8"/>',
vol:'<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M19 5a9 9 0 0 1 0 14M15.5 8.5a5 5 0 0 1 0 7"/>',
pause:'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
play:'<path d="M5 3l14 9-14 9z"/>',
pad:'<circle cx="5" cy="5" r="1.4"/><circle cx="12" cy="5" r="1.4"/><circle cx="19" cy="5" r="1.4"/><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/><circle cx="5" cy="19" r="1.4"/><circle cx="12" cy="19" r="1.4"/><circle cx="19" cy="19" r="1.4"/>',
xfer:'<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
share:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
send:'<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
bolt:'<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
alert:'<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
refresh:'<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>'
};
const ic = (n, s = 16, sw = 2) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

const TYPE = { CALL: { ic: 'phone', c: '#16a34a', bg: '#dcfce7', tint: '#eefbf3', label: 'Call' }, MEETING: { ic: 'video', c: '#7c3aed', bg: '#ede9fe', tint: '#f4f0ff', label: 'Meeting' } };
const PRI_C = { URGENT: ['#fee2e2', '#b91c1c'], HIGH: ['#ffedd5', '#c2410c'], NORMAL: ['#dbeafe', '#2563eb'], LOW: ['#eceff5', '#5b6578'] };
const ST_C = { ok: ['#dcfce7', '#15803d'], bad: ['#fee2e2', '#b91c1c'], warn: ['#fef3c7', '#b45309'], info: ['#dbeafe', '#1d4ed8'], '': ['#eceff5', '#5b6578'] };
const STAT_COLOR = { UNASSIGNED: '#94a3b8', ASSIGNED: '#60a5fa', ACCEPTED: '#3b82f6', IN_PROGRESS: '#f59e0b', COMPLETED: '#22c55e', MISSED: '#ef4444', RESCHEDULED: '#a78bfa', CANCELLED: '#64748b', FAILED: '#b91c1c' };
const PENDING = ['ASSIGNED', 'ACCEPTED', 'RESCHEDULED'];
const priPill = p => `<span class="pill" style="background:${PRI_C[p][0]};color:${PRI_C[p][1]}">${PRI_LABEL[p]}</span>`;
const stPill = t => { const c = ST_C[statusClass(t)]; return `<span class="pill" style="background:${c[0]};color:${c[1]}">${esc(statusLabel(t))}</span>${isOverdue(t) ? '<span class="pill od">Overdue</span>' : ''}`; };
const typePill = ty => `<span class="pill" style="background:${TYPE[ty].bg};color:${TYPE[ty].c}">${TYPE[ty].label}</span>`;
const tBox = (t, s = 32) => `<div class="cbox" style="width:${s}px;height:${s}px;background:${TYPE[t.type].bg};color:${TYPE[t.type].c}">${ic(TYPE[t.type].ic, s * .5)}</div>`;
const avatar = (n, s = 28) => `<span class="av" style="${avBg(n)};width:${s}px;height:${s}px;font-size:${Math.round(s * .38)}px">${esc(initials(n))}</span>`;
const pdot = st => `<i class="pdot" style="background:${presColor(st)}"></i>`;
const fDateFull = ts => { const d = new Date(ts); return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); };
const opts = (arr, sel, lab = x => x) => arr.map(x => { const v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : lab(x); return `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const nextSlot = () => { const d = new Date(now() + 30 * MIN); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); return d.getTime(); };

/* ---------- toast, router, run ---------- */
function toast(msg, kind = 'info', undo) {
  const el = document.createElement('div'); el.className = 'toast ' + kind;
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button>${undo.label || 'Undo'}</button>` : ''}`;
  if (undo) $('button', el).onclick = () => { undo.fn(); el.remove(); };
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), undo ? 6000 : kind === 'error' ? 4500 : 3000);
}
let memHash = '';
const curHash = () => location.hash || memHash;
function navigate(h) {
  if (curHash() === h) { render(); return; }
  try { location.hash = h; } catch (e) { }
  if (location.hash !== h) { memHash = h; render(); } else memHash = '';
}
const R = { p: 'tasks', id: null };
function parseRoute() { const h = curHash().replace(/^#\/?/, '') || 'tasks'; const [p, id] = h.split('/'); R.p = ['dashboard', 'tasks', 'calls', 'meetings', 'team', 'unassigned', 'activity', 'settings', 'task'].includes(p) ? p : 'tasks';
  /* inside UCAAS only the Tasks page is shown (task details still open) */
  if (document.documentElement.classList.contains('embedded') && R.p !== 'task') R.p = 'tasks'; R.id = id || null; }
function run(fn, okMsg) {
  try { const r = fn(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'success'); save(); render(); return r; }
  catch (e) { if (e instanceof UserError) { toast(e.message, 'error'); render(); } else { console.error(e); toast('Unexpected error: ' + e.message, 'error'); } return undefined; }
}
const V = { tview: 'list', pg: {}, moreOpen: false, sel: null, miniM: null, drawer: null, search: '', teamAgent: '', qsel: '' };
const U = AppState.ui;
const PS = 8;
const fkey = () => R.p === 'task' ? 'tasks' : R.p;
const F = () => { const f = filtersFor(fkey()); f.tab = f.tab || 'all'; f.q = f.q || ''; f.queue = f.queue || 'all'; return f; };
function go(page, preset = {}) {
  const k = page; delete AppState.filters[k]; Object.assign(filtersFor(k), preset); V.pg = {}; V.drawer = null; navigate('#/' + page);
}

/* ---------- filtering / sorting ---------- */
function filterTasks(f) {
  const n = now(), t0 = sod(n), q = (f.q || '').toLowerCase().trim();
  const r = AppState.tasks.filter(t => {
    const tab = f.tab || 'all';
    if (tab === 'my' && !isMine(t)) return false;
    if (tab === 'upcoming' && (isTerminal(t) || t.scheduledAt <= n)) return false;
    if (tab === 'overdue' && !isOverdue(t)) return false;
    if (tab === 'completed' && t.status !== 'COMPLETED') return false;
    if (f.type !== 'all' && t.type !== f.type) return false;
    if (f.status !== 'all') { if (f.status === 'PENDING') { if (!PENDING.includes(t.status)) return false; } else if (f.status === 'OVERDUE') { if (!isOverdue(t)) return false; } else if (t.status !== f.status) return false; }
    if (f.priority !== 'all' && t.priority !== f.priority) return false;
    if (f.assignment === 'mine' && !isMine(t)) return false;
    if (f.assignment === 'unassigned' && t.assignedAgent) return false;
    if (f.assignment === 'assigned' && !t.assignedAgent) return false;
    if (f.agent && t.assignedAgent !== f.agent) return false;
    if (f.queue && f.queue !== 'all' && t.queue !== f.queue) return false;
    if (f.date === 'today' && !sameDay(t.scheduledAt, n)) return false;
    if (f.date === 'tomorrow' && !sameDay(t.scheduledAt, n + DAY)) return false;
    if (f.date === 'week' && !(t.scheduledAt >= t0 && t.scheduledAt < t0 + 7 * DAY)) return false;
    if (f.date === 'custom') { if (f.from && t.scheduledAt < parseDT(f.from, '00:00')) return false; if (f.to && t.scheduledAt > parseDT(f.to, '23:59')) return false; }
    if (q && !(`${t.id} ${t.title} ${t.customer} ${t.company} ${t.contact} ${t.phone} ${agentName(t.assignedAgent)} ${t.description}`).toLowerCase().includes(q)) return false;
    return true;
  });
  const key = f.sortBy || 'scheduled', dir = f.sortDir === 'desc' ? -1 : 1;
  const val = t => key === 'priority' ? PRI_RANK[t.priority] : key === 'status' ? STATUSES.indexOf(t.status) : key === 'title' ? t.title.toLowerCase() : key === 'type' ? t.type : key === 'assignee' ? agentName(t.assignedAgent).toLowerCase() : key === 'duration' ? t.duration : t.scheduledAt;
  return r.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : a.scheduledAt - b.scheduledAt) * dir; });
}

/* ---------- task actions ---------- */
function quick(t) {
  if (isTerminal(t)) return null;
  if (t.status === 'UNASSIGNED') return { act: 'claim', l: 'Claim' };
  if (!isMine(t)) return null;
  if (isLive(t)) return { act: 'ws', l: 'Open', g: 1 };
  if (t.status === 'ASSIGNED') return { act: 'accept', l: 'Accept' };
  return { act: 'ws', l: t.type === 'CALL' ? 'Dial' : 'Join', g: 1 };
}
function menuItems(t) {
  const m = isMine(t), term = isTerminal(t), live = isLive(t), done = ['COMPLETED', 'CANCELLED', 'FAILED'].includes(t.status);
  const L = [{ l: 'View details', ic: 'eye', act: 'drawer', id: t.id }, { l: live ? 'Open interaction' : t.type === 'CALL' ? 'Open call workspace' : 'Open meeting workspace', ic: TYPE[t.type].ic, act: 'ws', id: t.id }];
  if (m && ['ASSIGNED', 'RESCHEDULED'].includes(t.status)) L.push({ l: 'Accept', ic: 'check', act: 'accept', id: t.id });
  if (m && t.status === 'ASSIGNED') L.push({ l: 'Decline', ic: 'x', act: 'decline', id: t.id });
  if (t.status === 'UNASSIGNED') L.push({ l: 'Claim', ic: 'user', act: 'claim', id: t.id });
  if (['ASSIGNED', 'ACCEPTED', 'RESCHEDULED'].includes(t.status) && (m || isSup())) L.push({ l: 'Release to pool', ic: 'undo', act: 'release', id: t.id });
  if (!term && !live && (isSup() || m || t.status === 'UNASSIGNED')) L.push({ l: t.assignedAgent ? 'Reassign…' : 'Assign…', ic: 'users', act: 'assign', id: t.id });
  if (!done && !live) L.push({ l: 'Reschedule…', ic: 'cal', act: 'resched', id: t.id });
  L.push('-');
  if (!done && !live) L.push({ l: 'Cancel task', ic: 'x', act: 'cancel', id: t.id, danger: 1 });
  if (!live) L.push({ l: 'Delete', ic: 'trash', act: 'delete', id: t.id, danger: 1 });
  return L;
}

/* ---------- chrome ---------- */
const NAV = [['dash', 'Dashboard', 'dashboard'], ['tasks', 'Tasks', 'tasks'], ['phone', 'Calls', 'calls'], ['video', 'Meetings', 'meetings'], ['users', 'Team', 'team', 1], ['inbox', 'Unassigned', 'unassigned'], ['act', 'Activity', 'activity'], ['gear', 'Settings', 'settings']];
function renderSide() {
  const un = AppState.tasks.filter(t => t.status === 'UNASSIGNED').length;
  const cur = R.p === 'task' ? (task(R.id) ? (task(R.id).type === 'CALL' ? 'calls' : 'meetings') : 'tasks') : R.p;
  $('#side').innerHTML = NAV.filter(n => !n[3] || isSup()).map(([i, l, k]) => `<button class="nav ${cur === k ? 'active' : ''}" data-act="nav" data-v="${k}" ${cur === k ? 'aria-current="page"' : ''}>${ic(i, 20)}<span>${l}</span>${k === 'unassigned' && un ? `<b class="nb">${un}</b>` : ''}</button>`).join('');
}
function renderTop() {
  const a = me();
  $('#presLbl').textContent = a.status; $('#presDot').style.background = presColor(a.status);
  $('#avBtn').textContent = initials(a.name);
  const mine = AppState.notifications.filter(n => n.to === a.id), un = mine.filter(n => !n.read).length;
  const b = $('#bellBadge'); b.textContent = un > 9 ? '9+' : un; b.style.display = un ? 'grid' : 'none';
  const ico = { assigned: 'user', reassigned: 'users', overdue: 'alert', reminder: 'clock', incoming: 'phone', transfer: 'xfer', system: 'bell' };
  $('#notifPop').innerHTML = `<div class="ph">Notifications <span><button data-act="readall">Mark all read</button> · <button data-act="clearnotes">Clear</button></span></div><div style="max-height:380px;overflow:auto">` +
    (mine.length ? mine.slice(0, 25).map(n => `<div class="nt ${n.read ? 'rd' : 'un'}" data-act="note" data-id="${n.id}"><i></i><div><div>${esc(n.text)}</div><small>${fmtDT(n.ts)}</small></div></div>`).join('') : '<div class="empty">No notifications</div>') + '</div>';
}
function renderBanner() {
  const el = $('#incoming'), id = U.incoming, t = id && task(id);
  if (!t || t.status !== 'ASSIGNED') { el.className = ''; el.innerHTML = ''; return; }
  el.className = 'open';
  el.innerHTML = `<div class="incbox">${ic('phone', 26)}<div><b>Incoming call</b><small>${esc(t.customer)} · ${esc(t.company)} · ${esc(t.phone)}</small></div><button class="btn green sm" data-act="answer">Answer</button><button class="btn red sm" data-act="decline-in">Decline</button></div>`;
}
function tickClock() {
  const d = new Date(); $('#clk').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const o = -d.getTimezoneOffset(), a = Math.abs(o); $('#gmt').textContent = `GMT${o >= 0 ? '+' : '-'}${Math.floor(a / 60)}${a % 60 ? ':' + pad(a % 60) : ''}`;
  updateLive();
}
function updateLive() {
  $$('[data-live]').forEach(el => {
    const id = el.dataset.id, k = el.dataset.live;
    if (k === 'talk') { const s = AppState.calls[id]; if (s) el.textContent = dur(callTalkMs(s) / 1000); }
    else if (k === 'hold') { const s = AppState.calls[id]; if (s) el.textContent = dur(holdMs(s) / 1000); }
    else if (k === 'mtg') { const s = AppState.meetings[id]; if (s) el.textContent = dur(meetingElapsedMs(s) / 1000); }
  });
}

/* ---------- page shell ---------- */
const TITLES = { dashboard: ['Dashboard', 'Live overview of your team’s calls, meetings and work items', 'dash'], tasks: ['Tasks', 'View and manage your scheduled calls, meetings and upcoming activities', 'tasks'], calls: ['Calls', 'All call work items', 'phone'], meetings: ['Meetings', 'All meeting work items', 'video'], team: ['Team Tasks', 'Supervisor workload, queues and reassignment', 'users'], unassigned: ['Unassigned', 'Work waiting in team and queue pools', 'inbox'], activity: ['Activity', 'Global activity timeline', 'act'], settings: ['Settings & Demo', 'Simulation preferences, roles and demo controls', 'gear'] };
function pageHead() {
  if (R.p === 'task') return '';
  const [t, s, i] = TITLES[R.p];
  const listy = ['tasks', 'calls', 'meetings'].includes(R.p);
  const vb = [['list', 'List', 'list'], ['calendar', 'Calendar', 'cal'], ['day', 'Day', 'calday'], ['kanban', 'Kanban', 'kanban']];
  const on = k => k === 'day' ? (V.tview === 'calendar' && U.calMode === 'day') : k === 'calendar' ? (V.tview === 'calendar' && U.calMode !== 'day') : V.tview === k;
  return `<div class="pagehead"><div class="ico">${ic(i, 20)}</div><div><h1>${t}</h1><p>${s}</p></div><div class="grow"></div>
    <button class="btn primary" data-act="createmenu">${ic('plus', 15, 2.4)} Add Task</button>
    ${listy ? `<div class="seg">${vb.map(([k, l, ico]) => `<button class="btn ${on(k) ? 'active' : ''}" data-act="tview" data-v="${k}">${ic(ico, 15)}<span>${l}</span></button>`).join('')}</div>` : ''}</div>`;
}
function render() {
  if (render.busy) return; render.busy = true;
  try {
    parseRoute();
    const ae = document.activeElement, keep = ae && ae.id && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName) && !ae.closest('#modal') ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
    renderTop(); renderSide(); renderBanner();
    const pg = $('#page'), top = $('#main').scrollTop;
    let body = '';
    if (R.p === 'task') body = viewWorkspace(R.id);
    else if (R.p === 'dashboard') body = viewDashboard();
    else if (R.p === 'team') body = viewTeam();
    else if (R.p === 'unassigned') body = viewUnassigned();
    else if (R.p === 'activity') body = viewActivity();
    else if (R.p === 'settings') body = viewSettings();
    else body = viewTasks();
    const fit = ['tasks', 'calls', 'meetings'].includes(R.p);
    $('#main').classList.toggle('fit', fit); pg.className = fit ? 'fit' : '';
    pg.innerHTML = pageHead() + body;
    $('#main').scrollTop = top;
    renderDrawer();
    if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus(); try { el.setSelectionRange(keep.s, keep.e); } catch (e) { } } }
    updateLive();
  } finally { render.busy = false; }
}

/* ---------- task table ---------- */
function taskTable(list, key, o = {}) {
  const f = filtersFor(fkey()); const pages = Math.max(1, Math.ceil(list.length / PS)); let pgn = Math.min(V.pg[key] || 1, pages); V.pg[key] = pgn;
  const rows = list.slice((pgn - 1) * PS, pgn * PS);
  const th = (k, l) => `<div class="s" data-act="sort" data-v="${k}">${l}${(f.sortBy || 'scheduled') === k ? ic(f.sortDir === 'desc' ? 'down' : 'up', 11, 2.4) : ''}</div>`;
  let h = `<div class="twrap"><div class="thead" role="row">${th('title', 'Task')}${th('type', 'Type')}${th('scheduled', 'Scheduled')}${th('priority', 'Priority')}${th('assignee', 'Assignee')}${th('status', 'Status')}${th('duration', 'Duration')}<div style="text-align:right">Actions</div></div>`;
  h += rows.length ? rows.map(t => { const q = quick(t); return `<div class="trow" data-act="drawer" data-id="${t.id}" tabindex="0">
    <div class="ttl">${tBox(t)}<div style="min-width:0"><b>${esc(t.title)}</b><small>${esc(t.customer)} · ${esc(t.company)}</small><small class="u">${esc(t.id)}${t.parentId ? ' · follow-up of ' + esc(t.parentId) : ''}${t.direction === 'Inbound' ? ' · Inbound' : ''}</small></div></div>
    <div>${typePill(t.type)}</div>
    <div class="sch">${fDateFull(t.scheduledAt)}<br><span>${fmtTime(t.scheduledAt)}</span></div>
    <div>${priPill(t.priority)}</div>
    <div style="display:flex;align-items:center;gap:6px;min-width:0">${t.assignedAgent ? avatar(agentName(t.assignedAgent), 22) + `<span style="font-size:12px">${esc(agentName(t.assignedAgent))}</span>` : `<span style="color:var(--muted);font-size:12px">${esc(t.queue ? queueName(t.queue) : t.assignedTeam ? teamName(t.assignedTeam) : 'Unassigned')}</span>`}</div>
    <div>${stPill(t)}</div>
    <div style="font-size:12px;color:#51608a">${t.duration ? dur(t.duration) : '—'}</div>
    <div class="act-cell">${q ? `<button class="rowbtn ${q.g ? 'g' : ''}" data-act="${q.act}" data-id="${t.id}">${q.l}</button>` : ''}<button class="iconbtn" style="width:28px;height:28px" data-act="rowmenu" data-id="${t.id}" aria-label="More actions">${ic('dots', 16)}</button></div></div>`; }).join('')
    : `<div class="empty" style="padding:48px 10px">${ic('search', 28)}<div style="margin-top:8px"><b>${o.empty || 'No tasks match your filters'}</b></div>${o.hint || 'Try changing the filters or <button style="color:var(--blue);font-weight:600" data-act="clearf">clear them</button>.'}</div>`;
  h += '</div>';
  const from = list.length ? (pgn - 1) * PS + 1 : 0, to = Math.min(list.length, pgn * PS);
  const nums = []; for (let i = 1; i <= pages; i++) { if (i === 1 || i === pages || Math.abs(i - pgn) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…'); }
  h += `<div class="pager"><span class="info">Showing ${from}-${to} of ${list.length}</span><div class="pgs"><button data-act="pg" data-k="${key}" data-v="1" ${pgn === 1 ? 'disabled' : ''}>${ic('dl', 14)}</button><button data-act="pg" data-k="${key}" data-v="${pgn - 1}" ${pgn === 1 ? 'disabled' : ''}>${ic('cl', 14)}</button>${nums.map(n => n === '…' ? '<span style="color:var(--muted)">…</span>' : `<button class="${n === pgn ? 'on' : ''}" data-act="pg" data-k="${key}" data-v="${n}">${n}</button>`).join('')}<button data-act="pg" data-k="${key}" data-v="${pgn + 1}" ${pgn === pages ? 'disabled' : ''}>${ic('cr', 14)}</button><button data-act="pg" data-k="${key}" data-v="${pages}" ${pgn === pages ? 'disabled' : ''}>${ic('dr', 14)}</button></div></div>`;
  return h;
}
function filterBar(f, o = {}) {
  const nf = [f.type !== 'all' && !o.noType, f.assignment !== 'all' && !o.noAssign, f.agent, f.date !== 'all', f.queue !== 'all' && f.queue].filter(Boolean).length;
  return `<div class="fbar">
    <label class="in">${ic('search', 15)}<input id="fq" placeholder="Search tasks..." value="${esc(f.q)}" aria-label="Search tasks"></label>
    <select class="sel" id="fprio" style="margin-left:auto" aria-label="Priority"><option value="all">All Priorities</option>${opts(PRIORITIES, f.priority, p => PRI_LABEL[p])}</select>
    <select class="sel" id="fstat" aria-label="Status"><option value="all">All Status</option><option value="PENDING" ${f.status === 'PENDING' ? 'selected' : ''}>Pending (assigned / accepted)</option><option value="OVERDUE" ${f.status === 'OVERDUE' ? 'selected' : ''}>Overdue</option>${opts(STATUSES, f.status, s => STATUS_LABEL[s])}</select>
    <button class="btn" data-act="more" id="fmore">${ic('filter', 15)} More Filters ${nf ? `<span class="count">${nf}</span>` : ''}</button>
    <div class="more ${V.moreOpen ? 'open' : ''}" id="morePop">
      ${o.noType ? '' : `<div><label>Type</label><select class="sel" id="ftype" style="width:100%"><option value="all">All types</option><option value="CALL" ${f.type === 'CALL' ? 'selected' : ''}>Calls</option><option value="MEETING" ${f.type === 'MEETING' ? 'selected' : ''}>Meetings</option></select></div>`}
      ${o.noAssign ? '' : `<div><label>Assignment</label><select class="sel" id="fassign" style="width:100%">${opts([['all', 'All'], ['mine', 'Assigned to me'], ['assigned', 'Assigned (anyone)'], ['unassigned', 'Unassigned']], f.assignment)}</select></div>`}
      <div><label>Agent</label><select class="sel" id="fagent" style="width:100%"><option value="">Any agent</option>${opts(AppState.agents.map(a => [a.id, a.name]), f.agent)}</select></div>
      <div><label>Queue</label><select class="sel" id="fqueue" style="width:100%"><option value="all">Any queue</option>${opts(QUEUES.map(q => [q.id, q.name]), f.queue)}</select></div>
      <div><label>Date</label><select class="sel" id="fdate" style="width:100%">${opts([['all', 'Any date'], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'Next 7 days'], ['custom', 'Custom range…']], f.date)}</select></div>
      ${f.date === 'custom' ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label>From</label><input type="date" class="fi" id="ffrom" value="${esc(f.from)}"></div><div><label>To</label><input type="date" class="fi" id="fto" value="${esc(f.to)}"></div></div>` : ''}
      <div style="display:flex;justify-content:space-between"><button class="btn sm" data-act="clearf">Clear all</button><button class="btn sm primary" data-act="more">Done</button></div>
    </div></div>`;
}

/* ---------- Tasks / Calls / Meetings page ---------- */
function viewTasks() {
  const f = F(), list = filterTasks(f);
  if (!V.miniM) { const d = new Date(U.calDate); V.miniM = { y: d.getFullYear(), m: d.getMonth() }; }
  const tabs = [['all', 'All Tasks'], ['my', 'My Tasks'], ['upcoming', 'Upcoming'], ['overdue', 'Overdue'], ['completed', 'Completed']];
  const head = `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab ${f.tab === k ? 'active' : ''}" data-act="tab" data-v="${k}" role="tab">${l} (${filterTasks({ ...f, tab: k }).length})</button>`).join('')}</div>` + filterBar(f, { noType: R.p !== 'tasks' });
  const body = V.tview === 'kanban' ? `<div class="cview">${kanbanHTML(list)}</div>` : V.tview === 'calendar' ? `<div class="cview">${calendarHTML(list)}</div>` : taskTable(list, 'main');
  return `<div class="content fit"><aside class="col left"><section class="card">${miniCal(list)}</section><section class="card">${quickActions()}</section></aside><section class="card center"><div class="cfill">${head}${body}</div></section></div>`;
}
function miniCal(list = AppState.tasks) {
  const { y, m } = V.miniM, first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay()); let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); const ts = d.getTime();
    const types = [...new Set(list.filter(t => sameDay(t.scheduledAt, ts)).map(t => t.type))];
    const dots = types.map(c => `<i style="background:${TYPE[c].c}"></i>`).join('');
    const isT = sameDay(ts, now()), isS = sameDay(ts, U.calDate);
    cells += `<div class="d ${d.getMonth() !== m ? 'o' : ''} ${isT ? 'today' : ''} ${isS && !isT ? 'sel' : ''}" data-act="pick" data-v="${ts}" tabindex="0">${d.getDate()}<span class="dots">${isT ? '' : dots}</span></div>`;
  }
  return `<h3 style="margin-bottom:8px">Calendar <button class="sqbtn" style="width:auto;padding:0 8px;font-size:11px" data-act="gotoday">Today</button></h3>
  <div class="mc-title"><button data-act="mm" data-v="-12" aria-label="Previous year">${ic('dl', 14)}</button><button data-act="mm" data-v="-1" aria-label="Previous month">${ic('cl', 14)}</button><span class="lbl">${MONL[m]} ${y}</span><button data-act="mm" data-v="1" aria-label="Next month">${ic('cr', 14)}</button><button data-act="mm" data-v="12" aria-label="Next year">${ic('dr', 14)}</button></div>
  <div class="mc-grid">${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(x => `<div class="dow">${x}</div>`).join('')}${cells}</div>
  <div class="legend"><span><i style="background:var(--blue)"></i>Today</span><span><i style="background:${TYPE.CALL.c}"></i>Call</span><span><i style="background:${TYPE.MEETING.c}"></i>Meeting</span></div>`;
}
function dayEvents() {
  const list = AppState.tasks.filter(t => sameDay(t.scheduledAt, U.calDate) && (isMine(t) || isSup())).sort((a, b) => a.scheduledAt - b.scheduledAt);
  const isT = sameDay(U.calDate, now());
  return `<h3>${isT ? "Today's Events" : 'Events · ' + fmtDate(U.calDate)}<span class="count">${list.length}</span></h3>
  <div class="dv-head" style="margin-top:-2px"><button class="sqbtn" data-act="pick" data-v="${U.calDate - DAY}" aria-label="Previous day">${ic('cl', 14)}</button><span style="flex:1;text-align:center;font-weight:600;font-size:12px">${fDateFull(U.calDate)}</span><button class="sqbtn" data-act="pick" data-v="${U.calDate + DAY}" aria-label="Next day">${ic('cr', 14)}</button>${isT ? '' : '<button class="btn sm" data-act="gotoday">Today</button>'}</div>
  <div class="evlist">` + (list.length ? list.map(t => `<div class="ev" data-act="drawer" data-id="${t.id}" tabindex="0">${tBox(t)}<div style="min-width:0"><b>${esc(t.title)}</b><small>${fmtTime(t.scheduledAt)} - ${fmtTime(t.scheduledAt + t.plannedDuration * MIN)}</small><small>${esc(t.company)}</small></div><span class="go">${ic('cr', 14)}</span></div>`).join('') : `<div class="empty">No events on this day.<br><button class="btn sm" style="margin-top:10px" data-act="quick" data-v="call">${ic('plus', 13)} Add a call</button></div>`) + '</div>';
}
function quickActions() {
  const q = [['New Call', 'phone', '#e3f8ec', '#16a34a', 'call'], ['Schedule Meeting', 'video', '#f1eaff', '#7c3aed', 'meeting'], ['My Tasks', 'user', '#e8f0ff', '#1d6bf3', 'my'], ['View Calendar', 'cal', '#e8f0ff', '#1d6bf3', 'cal']];
  return `<h3>Quick Actions</h3><div class="qgrid">${q.map(([l, i, bg, c, v]) => `<button class="qa" style="background:${bg}" data-act="quick" data-v="${v}"><span class="cbox" style="width:26px;height:26px;background:${c};color:#fff">${ic(i, 14)}</span>${l}</button>`).join('')}</div>`;
}

/* ---------- kanban ---------- */
const KCOLS = [['unassigned', 'Unassigned', t => t.status === 'UNASSIGNED'], ['accepted', 'Assigned / Accepted', t => PENDING.includes(t.status)], ['progress', 'In Progress', t => t.status === 'IN_PROGRESS'], ['done', 'Completed', t => t.status === 'COMPLETED'], ['closed', 'Missed · Failed · Cancelled', t => ['MISSED', 'FAILED', 'CANCELLED'].includes(t.status)]];
function kanbanHTML(list) {
  return `<div class="kb lg five">${KCOLS.map(([k, l, fn]) => { const items = list.filter(fn).sort((a, b) => a.scheduledAt - b.scheduledAt); return `<div class="kcol ${k === 'done' ? 'done' : k === 'progress' ? 'prog' : 'todo'}" data-col="${k}"><h4>${l} (${items.length})</h4>${items.map(t => `<div class="kcard" draggable="true" data-id="${t.id}" data-act="drawer" tabindex="0"><b>${esc(t.title)}</b>${typePill(t.type)} ${priPill(t.priority)}<small>${esc(t.customer)}</small><div class="dt">${ic('cal', 11)}${fmtDT(t.scheduledAt)}</div>${t.assignedAgent ? `<small>${esc(agentName(t.assignedAgent))}</small>` : ''}</div>`).join('') || '<div class="empty" style="padding:10px">Empty</div>'}</div>`; }).join('')}</div>`;
}

/* ---------- calendar (day / week / month) ---------- */
const CAL_H = 56, CAL_START = 7, CAL_END = 21;
function laneLayout(evs) {
  const out = []; let active = [];
  evs.forEach(e => { const s = e.scheduledAt, en = s + Math.max(e.plannedDuration, 25) * MIN; active = active.filter(a => a.en > s); let lane = 0; while (active.some(a => a.lane === lane)) lane++; const o = { e, s, en, lane }; active.push(o); out.push(o); });
  out.forEach(o => { o.n = Math.max(...out.filter(x => x.s < o.en && x.en > o.s).map(x => x.lane)) + 1; });
  return out;
}
function calendarHTML(evs) {
  const mode = U.calMode === 'month' ? 'month' : U.calMode === 'day' ? 'day' : 'week', base = sod(U.calDate);
  const d0 = new Date(base);
  let title, days = [];
  if (mode === 'day') { days = [base]; title = new Date(base).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  else if (mode === 'week') { const s = base - d0.getDay() * DAY; days = [...Array(7)].map((_, i) => s + i * DAY); title = `${fmtDate(days[0])} – ${fmtDate(days[6])}, ${new Date(days[6]).getFullYear()}`; }
  else title = `${MONL[d0.getMonth()]} ${d0.getFullYear()}`;
  const bar = `<div class="calbar"><button class="sqbtn" data-act="calnav" data-v="-1" aria-label="Previous">${ic('cl', 14)}</button><button class="sqbtn" data-act="calnav" data-v="1" aria-label="Next">${ic('cr', 14)}</button><h3>${title}</h3><button class="btn sm" data-act="gotoday">Today</button><span class="sp"></span>
    <div class="mini-seg">${['day', 'week', 'month'].map(k => `<button class="${mode === k ? 'on' : ''}" data-act="calmode" data-v="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>`;
  if (mode === 'month') {
    const first = new Date(d0.getFullYear(), d0.getMonth(), 1), start = new Date(first); start.setDate(1 - first.getDay()); let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const ts = d.getTime(), l = evs.filter(t => sameDay(t.scheduledAt, ts)).sort((a, b) => a.scheduledAt - b.scheduledAt);
      cells += `<div class="mcell ${d.getMonth() !== d0.getMonth() ? 'o' : ''} ${sameDay(ts, now()) ? 'today' : ''} ${sameDay(ts, U.calDate) ? 'sel' : ''}" data-act="mcell" data-v="${ts}"><span class="n">${d.getDate()}</span>${l.slice(0, 3).map(t => `<span class="chip" style="background:${TYPE[t.type].tint};color:${TYPE[t.type].c};border-color:${TYPE[t.type].c};${t.status === 'CANCELLED' ? 'opacity:.5;text-decoration:line-through' : ''}" data-act="drawer" data-id="${t.id}">${esc(fmtTime(t.scheduledAt).replace(':00', '').replace(' ', '').toLowerCase())} ${esc(t.title)}</span>`).join('')}${l.length > 3 ? `<span class="more-l" data-act="dayfrom" data-v="${ts}">+${l.length - 3} more</span>` : ''}</div>`;
    }
    return `<div class="calw">${bar}<div class="mgrid">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => `<div class="dow">${x}</div>`).join('')}${cells}</div></div>`;
  }
  const cols = `54px repeat(${days.length},minmax(0,1fr))`;
  let head = `<div class="tg-head" style="grid-template-columns:${cols}"><div style="cursor:default"></div>${days.map(ts => `<div class="${sameDay(ts, now()) ? 'today' : ''}" data-act="dayfrom" data-v="${ts}">${new Date(ts).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</div>`).join('')}</div>`;
  const hours = [...Array(CAL_END - CAL_START)].map((_, i) => `<div>${fmtTime(new Date(base).setHours(CAL_START + i, 0, 0, 0)).replace(':00', '')}</div>`).join('');
  const cs = days.map(ts => {
    const list = evs.filter(t => sameDay(t.scheduledAt, ts)).sort((a, b) => a.scheduledAt - b.scheduledAt), L = laneLayout(list); let h = '', hidden = [];
    L.forEach(o => {
      if (o.lane >= 3) { hidden.push(o); return; }
      const w = 100 / Math.min(o.n, 3), top = Math.max(0, (o.s - (ts + CAL_START * HOUR)) / MIN * CAL_H / 60), ht = Math.max(22, (o.en - o.s) / MIN * CAL_H / 60 - 2), ty = TYPE[o.e.type];
      h += `<div class="cevt ${o.e.status === 'CANCELLED' ? 'x' : ''}" style="top:${top}px;height:${ht}px;left:calc(${o.lane * w}% + 1px);width:calc(${w}% - 3px);background:${ty.tint};border-color:${ty.c};color:${ty.c}" data-act="drawer" data-id="${o.e.id}" title="${esc(o.e.title)} · ${fmtTime(o.s)}"><b>${esc(o.e.title)}</b>${fmtTime(o.s)}</div>`;
    });
    hidden.sort((a, b) => a.s - b.s); let cl = null; const clusters = []; hidden.forEach(o => { if (cl && o.s < cl.en) { cl.n++; cl.en = Math.max(cl.en, o.en); } else { cl = { s: o.s, en: o.en, n: 1 }; clusters.push(cl); } });
    clusters.forEach(c => { h += `<span class="cmore" style="top:${Math.max(0, (c.s - (ts + CAL_START * HOUR)) / MIN * CAL_H / 60)}px" data-act="dayfrom" data-v="${ts}">+${c.n}</span>`; });
    const nowTs = now(); if (sameDay(ts, nowTs) && nowTs >= ts + CAL_START * HOUR && nowTs <= ts + CAL_END * HOUR) h += `<div class="nowline" style="top:${(nowTs - (ts + CAL_START * HOUR)) / MIN * CAL_H / 60}px"></div>`;
    return `<div class="dcol ${sameDay(ts, now()) ? 'today' : ''}" data-act="slot" data-v="${ts}" style="height:${(CAL_END - CAL_START) * CAL_H}px">${h}</div>`;
  }).join('');
  return `<div class="calw">${bar}<div class="tg">${head}<div class="tg-body" style="grid-template-columns:${cols}"><div class="tg-hours">${hours}</div>${cs}</div></div></div>`;
}

/* ---------- dashboard ---------- */
function viewDashboard() {
  const mine = U.dashScope === 'mine', base = AppState.tasks.filter(t => !mine || isMine(t)), n = now();
  const today = base.filter(t => sameDay(t.scheduledAt, n));
  const K = [
    ['Calls today', today.filter(t => t.type === 'CALL').length, 'phone', '#16a34a', '#dcfce7', { type: 'CALL', date: 'today' }],
    ['Meetings today', today.filter(t => t.type === 'MEETING').length, 'video', '#7c3aed', '#ede9fe', { type: 'MEETING', date: 'today' }],
    ['Pending', base.filter(t => PENDING.includes(t.status)).length, 'clock', '#2563eb', '#dbeafe', { status: 'PENDING' }],
    ['In progress', base.filter(t => t.status === 'IN_PROGRESS').length, 'bolt', '#d97706', '#fef3c7', { status: 'IN_PROGRESS' }],
    ['Completed', base.filter(t => t.status === 'COMPLETED').length, 'check', '#15803d', '#dcfce7', { status: 'COMPLETED' }],
    ['Missed', base.filter(t => t.status === 'MISSED').length, 'phoneoff', '#b91c1c', '#fee2e2', { status: 'MISSED' }],
    ['Unassigned', AppState.tasks.filter(t => t.status === 'UNASSIGNED').length, 'inbox', '#475569', '#e2e8f0', { status: 'UNASSIGNED' }],
    ['Overdue', base.filter(t => isOverdue(t)).length, 'alert', '#b91c1c', '#fee2e2', { status: 'OVERDUE' }]];
  const live = AppState.tasks.find(t => isMine(t) && isLive(t));
  const up = AppState.tasks.filter(t => isMine(t) && !isTerminal(t) && !isLive(t)).sort((a, b) => a.scheduledAt - b.scheduledAt).slice(0, 6);
  const counts = STATUSES.map(s => [s, base.filter(t => t.status === s).length]), tot = Math.max(1, base.length);
  const evs = AppState.activities.filter(a => sameDay(a.ts, n)).sort((a, b) => b.ts - a.ts).slice(0, 9);
  const liveHtml = live ? `<div class="banner">${ic(TYPE[live.type].ic, 20)}<div><b>Live ${TYPE[live.type].label.toLowerCase()}: ${esc(live.title)}</b> · ${esc(live.customer)} · <span>${esc(statusLabel(live))}</span></div><span class="sp"></span><button class="btn green sm" data-act="ws" data-id="${live.id}">Return to interaction</button></div>` : '';
  return `${liveHtml}
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><b style="font-size:14px">Overview</b><div class="mini-seg"><button class="${!mine ? 'on' : ''}" data-act="dscope" data-v="team">Team</button><button class="${mine ? 'on' : ''}" data-act="dscope" data-v="mine">Mine</button></div></div>
  <div class="kpis">${K.map(([l, v, i, c, bg, p]) => `<button class="kpi" data-act="kpi" data-p='${JSON.stringify(p)}'><span class="cbox" style="width:40px;height:40px;background:${bg};color:${c}">${ic(i, 20)}</span><span><b>${v}</b><small>${l}</small></span></button>`).join('')}</div>
  <div class="grid2"><section class="card"><div class="sec-h"><h3>Upcoming work</h3><button class="btn sm" data-act="nav" data-v="tasks">View all</button></div><div class="ulist">${up.length ? up.map(t => `<div class="urow" data-act="drawer" data-id="${t.id}" tabindex="0">${tBox(t)}<div><b>${esc(t.title)}</b><small>${esc(t.customer)} · ${fmtDT(t.scheduledAt)}</small></div><span class="sp">${stPill(t)}</span>${quick(t) ? `<button class="rowbtn ${quick(t).g ? 'g' : ''}" data-act="${quick(t).act}" data-id="${t.id}">${quick(t).l}</button>` : ''}</div>`).join('') : '<div class="empty">Nothing upcoming – you’re all caught up.</div>'}</div></section>
  <section class="card"><div class="sec-h"><h3>Status mix</h3><span style="color:var(--muted)">${base.length} tasks</span></div><div class="mix">${counts.filter(c => c[1]).map(([s, v]) => `<i style="width:${v / tot * 100}%;background:${STAT_COLOR[s]}" title="${STATUS_LABEL[s]}: ${v}"></i>`).join('')}</div><div class="leg">${counts.map(([s, v]) => `<span><i style="background:${STAT_COLOR[s]}"></i>${STATUS_LABEL[s]} ${v}</span>`).join('')}</div></section></div>
  <div class="grid2"><section class="card"><div class="sec-h"><h3>Queue snapshot</h3></div>${queueTable()}</section>
  <section class="card"><div class="sec-h"><h3>Today’s activity</h3><button class="btn sm" data-act="nav" data-v="activity">All activity</button></div><div class="tlv">${evs.length ? evs.map(tlEntry).join('') : '<div class="empty">No activity yet today.</div>'}</div></section></div>`;
}
function queueTable() {
  return `<table class="qtbl"><tr><th>Queue</th><th>Team</th><th>Waiting</th><th>Active</th><th>Available agents</th></tr>${QUEUES.map(q => {
    const w = AppState.tasks.filter(t => t.queue === q.id && t.status === 'UNASSIGNED').length, a = AppState.tasks.filter(t => t.queue === q.id && ACTIVE.includes(t.status)).length;
    const av = AppState.agents.filter(x => x.status === 'Available' && inPool(x, { queue: q.id })).length;
    return `<tr><td><button style="font-weight:600;color:var(--blue)" data-act="queuego" data-v="${q.id}">${esc(q.name)}</button></td><td>${esc(teamName(q.team))}</td><td>${w ? `<span class="pill" style="background:#fef3c7;color:#b45309">${w}</span>` : '0'}</td><td>${a}</td><td>${av}</td></tr>`; }).join('')}</table>`;
}
const tlEntry = e => `<div class="tle"><div class="t">${fmtTime(e.ts)}</div><div class="l"><i></i></div><div class="x">${esc(e.text)}<small>${e.taskId ? `<button style="color:var(--blue)" data-act="drawer" data-id="${e.taskId}">${esc(e.taskId)}</button> · ` : ''}${esc(e.actor === 'system' ? 'System' : agentName(e.actor))} · ${fmtDay(e.ts)}</small></div></div>`;

/* ---------- team / unassigned / activity / settings ---------- */
function viewTeam() {
  if (!isSup()) return `<div class="card empty" style="padding:50px">${ic('users', 32)}<div style="margin-top:8px"><b>Supervisor access required</b></div>Switch role to Supervisor from the profile menu to see Team Tasks.</div>`;
  const f = F(); if (V.teamAgent) f.agent = V.teamAgent; else f.agent = '';
  const act = AppState.tasks.filter(t => ACTIVE.includes(t.status)), onl = AppState.agents.filter(a => a.status === 'Available').length;
  const K = [['Active tasks', act.length, 'tasks', '#2563eb', '#dbeafe'], ['Unassigned', AppState.tasks.filter(t => t.status === 'UNASSIGNED').length, 'inbox', '#475569', '#e2e8f0'], ['In progress', AppState.tasks.filter(t => t.status === 'IN_PROGRESS').length, 'bolt', '#d97706', '#fef3c7'], ['Overdue', AppState.tasks.filter(t => isOverdue(t)).length, 'alert', '#b91c1c', '#fee2e2']];
  return `<div class="kpis">${K.map(([l, v, i, c, bg]) => `<div class="kpi" style="cursor:default"><span class="cbox" style="width:40px;height:40px;background:${bg};color:${c}">${ic(i, 20)}</span><span><b>${v}</b><small>${l}</small></span></div>`).join('')}</div>
  <section class="card" style="margin-bottom:16px"><div class="sec-h"><h3>Agent workload <span style="color:var(--muted);font-weight:400">· ${onl} available</span></h3>${V.teamAgent ? `<button class="btn sm" data-act="teamagent" data-v="">Show all agents</button>` : ''}</div>
  <div class="grid3" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${AppState.agents.map(a => { const w = workload(a.id); return `<button class="agcard ${V.teamAgent === a.id ? 'on' : ''}" data-act="teamagent" data-v="${a.id}">${avatar(a.name, 38)}<div style="flex:1;min-width:0"><b>${esc(a.name)}</b><small>${pdot(a.status)} ${a.status} · ${esc(teamName(a.team))}</small><small>${w.total} active (${w.calls} calls · ${w.meetings} meetings)</small>${w.current ? `<small style="color:var(--blue)">Now: ${esc(w.current.id)}</small>` : ''}</div></button>`; }).join('')}</div></section>
  <div class="grid2"><section class="card"><div class="sec-h"><h3>Queue workload</h3></div>${queueTable()}</section><section class="card"><div class="sec-h"><h3>Auto-assign</h3></div><p style="margin:0 0 10px;color:var(--muted)">Route the highest-priority waiting item to the best available agent using the 100-point scoring engine.</p><button class="btn primary" data-act="autonext">${ic('bolt', 14)} Auto-assign next unassigned task</button></section></div>
  <section class="card" style="padding:0;overflow:hidden"><div style="padding:14px 14px 0"><h3 style="margin:0">${V.teamAgent ? esc(agentName(V.teamAgent)) + '’s tasks' : 'All team tasks'}</h3></div>${filterBar(f, { noAssign: true })}${taskTable(filterTasks(f), 'team')}</section>`;
}
function viewUnassigned() {
  const f = F(); f.assignment = 'unassigned';
  const qc = QUEUES.map(q => { const w = AppState.tasks.filter(t => t.queue === q.id && t.status === 'UNASSIGNED').length; const av = AppState.agents.filter(x => x.status === 'Available' && inPool(x, { queue: q.id })); return `<button class="qcard" style="text-align:left;${f.queue === q.id ? 'border-color:#6ea0f7;background:#f3f7ff' : ''}" data-act="queuego" data-v="${q.id}"><h4>${esc(q.name)}</h4><small style="color:var(--muted)">${esc(teamName(q.team))}</small><div class="n">${w}</div><small>waiting · ${av.length} agent(s) available</small></button>`; }).join('');
  return `<div class="grid3" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr));margin-bottom:16px">${qc}</div>
  <section class="card" style="padding:0;overflow:hidden">${f.queue !== 'all' ? `<div style="padding:14px 14px 0"><b>${esc(queueName(f.queue))}</b> <button class="btn sm" data-act="queuego" data-v="all">Show all queues</button></div>` : ''}${filterBar(f, { noAssign: true })}${taskTable(filterTasks(f).filter(t => t.status === 'UNASSIGNED'), 'un', { empty: 'No unassigned work', hint: 'Everything has an owner.' })}</section>`;
}
function viewActivity() {
  const fl = U.actFilter || 'all', q = (V.actQ || '').toLowerCase();
  const typeOf = e => e.type === 'presence' ? 'presence' : e.taskId ? (task(e.taskId) ? (task(e.taskId).type === 'CALL' ? 'calls' : 'meetings') : 'tasks') : 'system';
  const list = AppState.activities.filter(e => (fl === 'all' || typeOf(e) === fl || (fl === 'assignment' && ['assigned', 'reassigned', 'claimed', 'released', 'transferred'].includes(e.type))) && (!q || e.text.toLowerCase().includes(q) || (e.taskId || '').toLowerCase().includes(q))).sort((a, b) => b.ts - a.ts).slice(0, 150);
  return `<section class="card"><div class="fbar" style="padding:0 0 12px"><label class="in">${ic('search', 15)}<input id="actq" placeholder="Search activity..." value="${esc(V.actQ || '')}"></label><select class="sel" id="actf" style="margin-left:auto">${opts([['all', 'All events'], ['calls', 'Calls'], ['meetings', 'Meetings'], ['assignment', 'Assignment'], ['presence', 'Presence']], fl)}</select></div><div class="tlv">${list.map(tlEntry).join('') || '<div class="empty">No activity matches.</div>'}</div></section>`;
}
function viewSettings() {
  const b = AppState.prefs.callBehavior, bytes = (() => { try { return (localStorage.getItem(STORE_KEY) || '').length; } catch (e) { return 0; } })();
  return `<div class="settings-g">
  <section class="card"><h3>Simulation preferences</h3><div class="fg"><div class="full"><label>Far-end behaviour when dialing</label><select class="sel" style="width:100%" id="setcall">${opts([['answer', 'Answers the call'], ['noanswer', 'No answer (rings out)'], ['busy', 'Busy'], ['voicemail', 'Goes to voicemail']], b)}</select></div>
  <div class="full"><label>Role</label><div class="radios"><label><input type="radio" name="role" value="supervisor" ${isSup() ? 'checked' : ''} data-act="role" data-v="supervisor"> Supervisor</label><label><input type="radio" name="role" value="agent" ${!isSup() ? 'checked' : ''} data-act="role" data-v="agent"> Agent</label></div></div>
  <div class="full"><label>My presence</label><select class="sel" style="width:100%" id="setpres">${opts(PRESENCE.map(p => p.id), me().status)}</select></div></div></section>
  <section class="card"><h3>Storage</h3><div class="statrow"><span>${AppState.tasks.length} tasks</span><span>${AppState.activities.length} events</span><span>${AppState.notifications.length} notifications</span><span>${(bytes / 1024).toFixed(1)} KB stored</span></div><p style="color:var(--muted)">Data is kept in this browser’s localStorage and survives refreshes, including live calls and meetings.</p><button class="btn danger" data-act="reset">${ic('refresh', 14)} Reset demo data</button></section>
  <section class="card" style="grid-column:1/-1"><h3>Demo controls</h3><div class="demo-btns">
    <button class="btn" data-act="d-incoming">${ic('phone', 14)} Simulate incoming call</button>
    <button class="btn" data-act="d-connect">Connect ringing call</button>
    <button class="btn" data-act="d-endcall">Far end hangs up</button>
    <button class="btn" data-act="d-mtgstart">Start my next meeting</button>
    <button class="btn" data-act="d-mtgend">End live meeting</button>
    <button class="btn" data-act="d-auto">Auto-assign a waiting task</button>
    <button class="btn" data-act="d-reassign">Reassign a task to someone else</button>
    <button class="btn" data-act="d-xfer">Send me a transfer request</button>
    <button class="btn" data-act="d-note">Push a notification</button>
    <select class="sel" id="d-agent" aria-label="Agent">${opts(AppState.agents.filter(a => a.id !== me().id).map(a => [a.id, a.name]), '')}</select>
    <select class="sel" id="d-pres" aria-label="Presence">${opts(PRESENCE.map(p => p.id), '')}</select>
    <button class="btn" data-act="d-setpres">Set agent presence</button></div></section></div>`;
}

/* ---------- drawer ---------- */
function renderDrawer() {
  const d = $('#drawer'), t = V.drawer && task(V.drawer);
  if (!t) { d.classList.remove('open'); $('#drawerBg').classList.remove('open'); d.innerHTML = ''; return; }
  const cu = customer(t.customerId) || {}, evs = taskEvents(t.id), kids = AppState.tasks.filter(x => x.parentId === t.id), par = t.parentId && task(t.parentId);
  const hist = AppState.tasks.filter(x => x.customerId === t.customerId && x.id !== t.id && isTerminal(x)).sort((a, b) => b.scheduledAt - a.scheduledAt).slice(0, 4);
  const m = menuItems(t).filter(i => i !== '-' && !['drawer'].includes(i.act));
  const q = quick(t);
  d.innerHTML = `<div class="dh">${tBox(t, 40)}<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:15px">${esc(t.title)}</div><div style="margin:4px 0;color:var(--muted)">${esc(t.id)} · ${esc(t.customer)}</div><div>${typePill(t.type)} ${priPill(t.priority)} ${stPill(t)}</div></div><button class="iconbtn" data-act="drawerclose" aria-label="Close details">${ic('x', 18)}</button></div>
  <div class="db">
   <div class="dsec"><h5>Information</h5><div class="kv"><span>Description</span><div>${esc(t.description) || '—'}</div><span>Direction</span><div>${esc(t.direction)}</div><span>Scheduled</span><div>${fmtDT(t.scheduledAt)} (${t.plannedDuration} min)</div><span>Due</span><div>${fmtDT(t.dueAt || computeDue(t))}</div><span>Actual duration</span><div>${t.duration ? dur(t.duration) : '—'}</div><span>Outcome</span><div>${esc(t.outcome) || '—'}${t.disposition ? ' · ' + esc(t.disposition) : ''}</div></div></div>
   <div class="dsec"><h5>Assignment</h5><div class="kv"><span>Assigned to</span><div>${t.assignedAgent ? esc(agentName(t.assignedAgent)) : 'Unassigned'}</div><span>Team</span><div>${esc(teamName(t.assignedTeam))}</div><span>Queue</span><div>${esc(queueName(t.queue))}</div></div></div>
   <div class="dsec"><h5>Customer</h5><div class="kv"><span>Name</span><div>${esc(t.contact)}</div><span>Company</span><div>${esc(t.company)}</div><span>Phone</span><div>${esc(t.phone)}</div><span>Email</span><div>${esc(cu.email || '—')}</div></div></div>
   ${t.type === 'MEETING' ? `<div class="dsec"><h5>Participants</h5><div>${t.participants.map(p => `<span class="chipx" style="background:#eef4ff;color:#1d4ed8">${esc(p)}</span>`).join('') || '—'}</div></div>` : ''}
   ${t.notes ? `<div class="dsec"><h5>Notes</h5><div style="white-space:pre-wrap;font-size:12.5px">${esc(t.notes)}</div></div>` : ''}
   <div class="dsec"><h5>Activity timeline</h5><div class="tlv">${evs.slice(0, 14).map(tlEntry).join('') || '<div class="empty">No events</div>'}</div></div>
   <div class="dsec"><h5>Interaction history</h5>${par ? `<div class="urow" data-act="drawer" data-id="${par.id}">${tBox(par, 28)}<div><b>Follow-up of ${esc(par.id)}</b><small>${esc(par.title)}</small></div></div>` : ''}${kids.map(k => `<div class="urow" data-act="drawer" data-id="${k.id}" style="margin-top:6px">${tBox(k, 28)}<div><b>Follow-up ${esc(k.id)}</b><small>${esc(k.title)} · ${fmtDT(k.scheduledAt)}</small></div></div>`).join('')}${hist.map(h => `<div class="urow" data-act="drawer" data-id="${h.id}" style="margin-top:6px">${tBox(h, 28)}<div><b>${esc(h.title)}</b><small>${fmtDT(h.scheduledAt)} · ${esc(h.outcome || STATUS_LABEL[h.status])}</small></div></div>`).join('')}${!par && !kids.length && !hist.length ? '<div class="empty">No related interactions</div>' : ''}</div>
  </div>
  <div class="df">${q ? `<button class="btn ${q.g ? 'green' : 'primary'}" data-act="${q.act}" data-id="${t.id}">${q.l === 'Dial' ? ic('phone', 14) + ' Start call' : q.l === 'Join' ? ic('video', 14) + ' Join meeting' : q.l}</button>` : `<button class="btn" data-act="ws" data-id="${t.id}">Open workspace</button>`}
   ${m.filter(i => i.act !== 'ws' && !(q && i.act === q.act)).map(i => `<button class="btn ${i.danger ? 'danger' : ''}" data-act="${i.act}" data-id="${t.id}">${ic(i.ic, 14)} ${i.l}</button>`).join('')}</div>`;
  d.classList.add('open'); $('#drawerBg').classList.add('open');
}
