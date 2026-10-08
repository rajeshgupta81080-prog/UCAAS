/* =========================================================
   MCM / Teloz — Video Meetings prototype
   Pure vanilla JS, mock state only, no backend.
   ========================================================= */

(function () {
"use strict";

/* ============================================================
   0. UTILITIES
   ============================================================ */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const on = (el, ev, fn, opts) => { if (el) el.addEventListener(ev, fn, opts); };
// the interface is sized in rem (see "UI SCALE" in style.css); 1 = 16px root. Used where JS works with px offsets.
const uiScale = () => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
const uid = (prefix) => prefix + "_" + Math.random().toString(36).slice(2, 9);

function rand3() { return String(Math.floor(100 + Math.random() * 900)); }
function genMeetingId() { return `${rand3()}-${rand3()}-${rand3()}`; }
function randomAlphaNum(len) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function genMeetingLink() { return `https://meet.mcm.example/${randomAlphaNum(7)}`; }
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ============================================================
   0b. CUSTOM SELECT - one reusable rotating-chevron dropdown for every <select> in the app
   ============================================================
   A native <select> exposes no real "is the popup open" state to CSS/JS, so a smoothly rotating chevron
   isn't achievable on it as-is. Every <select> is progressively enhanced into a real combobox instead: the
   original <select> stays in the DOM completely unchanged (same id, same value, same "change" event, still
   the thing every existing line of code reads/writes/listens to) but visually hidden; a trigger button + a
   Bootstrap dropdown listbox take its place, giving a real open/close state (so the chevron always matches
   reality), non-clipping "fixed" popper positioning (the same trick #lobbyFxPanel already relies on), and
   free ArrowUp/Down/Home/End keyboard cycling from Bootstrap's own dropdown behaviour. A MutationObserver
   keeps the listbox in sync whenever existing code repopulates the select's <option>s or (dis/en)ables it;
   the trigger also always re-reads the select's current value right before it opens, to cover a plain
   `select.value = x` property set, which - unlike innerHTML - fires no observable DOM mutation. */
const MCM_SELECT_SKIP_IDS = ["fieldHost"]; // data-only field, never shown to the user
const mcmSelectLabel = (select) => { const opt = select.options[select.selectedIndex]; return opt ? opt.textContent.trim() : ""; };
function mcmSelectSyncTrigger(select) {
  const trigger = select._mcmTrigger;
  if (!trigger) return;
  trigger.querySelector(".mcm-select-label").textContent = mcmSelectLabel(select);
  trigger.disabled = select.disabled;
}
function mcmSelectRenderMenu(select) {
  const menu = select._mcmMenu;
  if (!menu) return;
  menu.innerHTML = Array.from(select.options).map((opt) =>
    `<button type="button" class="dropdown-item mcm-select-option" role="option" data-value="${escapeHtml(opt.value)}" aria-selected="${opt.selected}"${opt.disabled ? " disabled" : ""}>${escapeHtml(opt.textContent.trim())}</button>`
  ).join("");
}
function mcmSelectRefresh(select) { mcmSelectRenderMenu(select); mcmSelectSyncTrigger(select); }
// ONE active custom-select dropdown at a time, tracked explicitly - opening a new one always closes whichever
// select this variable currently points to, and the trigger's own click handler is the single place that
// decides open vs close (it reads aria-expanded itself rather than trusting an implicit toggle), so there is
// exactly one source of truth for "is this one open" and no way for two mechanisms to fight over it.
let mcmActiveSelect = null;
function mcmCloseSelect(select) {
  if (!select || select._mcmTrigger.getAttribute("aria-expanded") !== "true") return;
  bootstrap.Dropdown.getOrCreateInstance(select._mcmTrigger).hide();
}
// One shared listener for every enhanced select on the page (not one per dropdown): with autoClose:false, closing
// on an outside click is entirely our own responsibility now.
document.addEventListener("click", (e) => {
  if (!mcmActiveSelect) return;
  if (mcmActiveSelect._mcmTrigger.contains(e.target) || mcmActiveSelect._mcmMenu.contains(e.target)) return;
  mcmCloseSelect(mcmActiveSelect);
});
function enhanceSelect(select) {
  if (select.dataset.mcmEnhanced || MCM_SELECT_SKIP_IDS.includes(select.id)) return;
  select.dataset.mcmEnhanced = "1";

  const wrap = document.createElement("span");
  wrap.className = "mcm-select-wrap";
  select.parentNode.insertBefore(wrap, select);

  const dropdown = document.createElement("span");
  dropdown.className = "dropdown mcm-select-dropdown";

  const trigger = document.createElement("button");
  trigger.type = "button";
  // NOT data-bs-toggle="dropdown": that wires Bootstrap's own implicit click delegate, which is one more moving
  // part to reason about once this button is nested this deeply. The click handler below drives the Dropdown
  // API directly and explicitly instead, so "does this click open or close it" is never in question.
  trigger.className = ("mcm-select-trigger " + select.className).trim();
  trigger.setAttribute("data-bs-popper-config", '{"strategy":"fixed"}');
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = '<span class="mcm-select-label"></span><span class="mcm-select-chevron"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';

  const menu = document.createElement("div");
  menu.className = "dropdown-menu mcm-select-menu";
  menu.setAttribute("role", "listbox");

  if (select.id) {
    const labelEl = document.querySelector(`label[for="${select.id}"]`);
    if (labelEl) { if (!labelEl.id) labelEl.id = select.id + "-mcmLabel"; trigger.setAttribute("aria-labelledby", labelEl.id); }
  }

  select.classList.add("mcm-select-native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  wrap.appendChild(select);
  dropdown.appendChild(trigger);
  dropdown.appendChild(menu);
  wrap.appendChild(dropdown);
  select._mcmTrigger = trigger;
  select._mcmMenu = menu;

  // existing code sets `.value =` / `.disabled =` as plain property assignments in several places (never through
  // setAttribute), which a MutationObserver cannot see at all - wrapping both accessors is what makes the trigger
  // provably stay in sync (not just "in sync because it happens to run right after an innerHTML repopulation").
  ["value", "disabled"].forEach((prop) => {
    const native = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
    Object.defineProperty(select, prop, {
      configurable: true,
      get() { return native.get.call(select); },
      set(v) { native.set.call(select, v); mcmSelectSyncTrigger(select); },
    });
  });

  on(menu, "click", (e) => {
    const opt = e.target.closest(".mcm-select-option");
    if (!opt || opt.disabled) return;
    select.value = opt.getAttribute("data-value");
    select.dispatchEvent(new Event("change", { bubbles: true }));
    mcmSelectSyncTrigger(select);
    bootstrap.Dropdown.getOrCreateInstance(trigger).hide(); // explicit - see the autoClose:false note below
  });
  on(trigger, "click", (e) => {
    e.stopPropagation();
    // autoClose:false: Bootstrap's own built-in "close on any click" listener is global (one document listener
    // shared by every Dropdown instance on the page) and, observed empirically, could leave its internal shown/hidden
    // state one step out of sync with this trigger's aria-expanded after a menu-item click closed it from under a
    // *different* code path than the one that opened it - a later click would then silently no-op. Taking exclusive,
    // explicit control of open/close/outside-click here (mirrors the ⋮ action menu's own approach) removes that class
    // of bug entirely: this trigger's own click handler and mcmCloseActiveSelect() below are the only things that
    // ever call show()/hide() on it.
    const bsDropdown = bootstrap.Dropdown.getOrCreateInstance(trigger, { popperConfig: { strategy: "fixed" }, autoClose: false });
    if (trigger.getAttribute("aria-expanded") === "true") { bsDropdown.hide(); return; }
    if (mcmActiveSelect && mcmActiveSelect !== select) mcmCloseSelect(mcmActiveSelect);
    bsDropdown.show();
  });
  on(trigger, "keydown", (e) => {
    if (trigger.getAttribute("aria-expanded") === "true") return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); trigger.click(); }
  });
  // Bootstrap's own dropdown keyboard handling (Arrow nav, Escape-to-close) is wired to data-bs-toggle, which this
  // trigger deliberately doesn't carry (see the click handler above) - so Escape needs its own explicit handling
  // here, delegated across the trigger+menu, and it must stop the keypress from also reaching the page's broader
  // "Escape closes everything" handler, so one press closes just this dropdown and leaves the Filter popup open.
  on(dropdown, "keydown", (e) => {
    if (e.key === "Escape" && trigger.getAttribute("aria-expanded") === "true") {
      e.stopPropagation();
      bootstrap.Dropdown.getOrCreateInstance(trigger).hide();
      trigger.focus();
    }
  });
  on(trigger, "show.bs.dropdown", () => {
    mcmActiveSelect = select;
    mcmSelectRefresh(select);
    // `position:fixed` (the "fixed" popper strategy every dropdown here uses to escape clipping) resolves a
    // percentage width against the VIEWPORT, not the trigger - that's what stretched every menu edge-to-edge.
    // Measuring the trigger's real rendered width and setting it explicitly is the only way to match it exactly.
    menu.style.width = trigger.getBoundingClientRect().width + "px";
  });
  on(trigger, "hidden.bs.dropdown", () => { if (mcmActiveSelect === select) mcmActiveSelect = null; });
  on(select, "change", () => mcmSelectSyncTrigger(select));
  new MutationObserver(() => mcmSelectRefresh(select)).observe(select, { childList: true, attributes: true, attributeFilter: ["disabled"] });

  mcmSelectRefresh(select);
}
function enhanceAllSelects() { $$("select").forEach(enhanceSelect); }

// The Background thumbnails reuse the SAME scene art the real effect composites (fxDrawScene, section 13c further
// down), just drawn small - so a thumbnail is an accurate small preview of what the background will actually look
// like, not a separate, independently-designed swatch color. Applied once at init; there's nothing to keep in sync
// afterward since the scene art itself never changes at runtime.
function initBgThumbPreviews() {
  ["office", "home", "classroom", "beach"].forEach((kind) => {
    const url = fxDrawScene(kind, 160, 120).toDataURL("image/png");
    $$(`.swatch-${kind}`).forEach((el) => { el.style.backgroundImage = `url(${url})`; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; });
  });
}

const TODAY = new Date(2026, 8, 23); // 2026-09-23
const TODAY_ISO = "2026-09-23";

function parseISO(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function formatDateBadge(dateStr) {
  const d = parseISO(dateStr);
  return { month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(), day: d.getDate() };
}
function formatFullDate(dateStr) {
  const d = parseISO(dateStr);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function to12h(timeStr) {
  if (!timeStr) return "--:--";
  let [h, m] = timeStr.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}
function nowHHMM() {
  const d = new Date();
  return to12h(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
}
function addMinutesToTime(timeStr, mins) {
  let [h, m] = timeStr.split(":").map(Number);
  let total = h * 60 + m + Number(mins);
  total = ((total % 1440) + 1440) % 1440;
  const nh = Math.floor(total / 60), nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}
function formatTimeRange(m) {
  return `${to12h(m.startTime)} - ${to12h(addMinutesToTime(m.startTime, m.duration))}`;
}
function formatDurationLabel(mins) {
  mins = Number(mins);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), rem = mins % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}
function formatMMSS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ============================================================
   1. MOCK DATA
   ============================================================ */
/* ---- organisation + people + roles (RBAC data; the rules themselves live in section 2b) ----
   Admin (global) > Location Admin (one location) > Manager (one or more teams) > Agent (own / assigned). The demo user switcher picks WHO the current user is (ME);
   the role, location, team, ownership and assignment of that user decide what the rest of the app shows and allows. Nothing here is trusted by a real backend:
   in production every check in section 2b has to be repeated on the server (see the note there). */
const LOCATIONS = { mumbai: { id: "mumbai", name: "Mumbai" }, delhi: { id: "delhi", name: "Delhi" } };
const TEAMS = {
  team1: { id: "team1", team: "team1", name: "Team 1", locationId: "mumbai", managerId: "u3" },
  team2: { id: "team2", team: "team2", name: "Team 2", locationId: "mumbai", managerId: "u4" },
  team3: { id: "team3", team: "team3", name: "Team 3", locationId: "delhi", managerId: "u9" }, // another location: nobody in Mumbai may see it
};
const TEAM_LABELS = Object.fromEntries(Object.values(TEAMS).map((t) => [t.id, t.name]));
// switcher: appears in the demo user switcher (the 8 test users); the two Delhi users exist so that location isolation can be tested
const USERS = [
  { id: "u1", name: "Vivek Gupta", initials: "VG", email: "vivek.gupta@teloz.com", role: "admin", label: "Admin", short: "Admin", locationId: null, teamId: null, managerId: null, switcher: true },
  { id: "u2", name: "Rahul Chaurasiya", initials: "RC", email: "rahul.chaurasiya@teloz.com", role: "location_admin", label: "Location Admin - Mumbai", short: "Loc. Admin", locationId: "mumbai", teamId: null, managerId: "u1", switcher: true },
  { id: "u3", name: "Samarth More", initials: "SM", email: "samarth.more@teloz.com", role: "manager", label: "Manager 1", short: "Manager 1", locationId: "mumbai", teamId: "team1", managerId: "u2", switcher: true },
  { id: "u4", name: "Kamran Khan", initials: "KK", email: "kamran.khan@teloz.com", role: "manager", label: "Manager 2", short: "Manager 2", locationId: "mumbai", teamId: "team2", managerId: "u2", switcher: true },
  { id: "u5", name: "Amit Sharma", initials: "AS", email: "amit.sharma@teloz.com", role: "agent", label: "Agent 1", short: "Agent 1", locationId: "mumbai", teamId: "team1", managerId: "u3", switcher: true },
  { id: "u6", name: "Priya Nair", initials: "PN", email: "priya.nair@teloz.com", role: "agent", label: "Agent 2", short: "Agent 2", locationId: "mumbai", teamId: "team1", managerId: "u3", switcher: true },
  { id: "u7", name: "Neha Verma", initials: "NV", email: "neha.verma@teloz.com", role: "agent", label: "Agent 3", short: "Agent 3", locationId: "mumbai", teamId: "team2", managerId: "u4", switcher: true },
  { id: "u8", name: "Ananya Iyer", initials: "AI", email: "ananya.iyer@teloz.com", role: "agent", label: "Agent 4", short: "Agent 4", locationId: "mumbai", teamId: "team2", managerId: "u4", switcher: true },
  { id: "u9", name: "Deepak Malhotra", initials: "DM", email: "deepak.malhotra@teloz.com", role: "manager", label: "Manager 3 - Delhi", short: "Manager 3", locationId: "delhi", teamId: "team3", managerId: "u1", switcher: false },
  { id: "u10", name: "Rohan Mehta", initials: "RM", email: "rohan.mehta@teloz.com", role: "agent", label: "Agent 5 - Delhi", short: "Agent 5", locationId: "delhi", teamId: "team3", managerId: "u9", switcher: false },
];
let ME = USERS[0]; // the CURRENT USER: the demo user switcher replaces it, and every role check, scope filter and "You" in the app reads it
const DEMO_USERS = []; // people who exist only while the Notes & Coach demo runs: never in USERS (so no invite / search list shows them), never saved
function userById(id) { return USERS.find((u) => u.id === id) || DEMO_USERS.find((u) => u.id === id); }
function userByName(name) { return USERS.find((u) => u.name === name); }
const ROLES = {
  admin:          { label: "Admin",                short: "Admin",          desc: "Entire system",            icon: "crown" },
  location_admin: { label: "Location Admin",       short: "Location Admin", desc: "Assigned location",        icon: "building" },
  manager:        { label: "Manager / Supervisor", short: "Manager",        desc: "Assigned team(s)",         icon: "users" },
  agent:          { label: "Agent",                short: "Agent",          desc: "Own / assigned meetings",  icon: "user" },
};
const managedTeamIds = (u) => Object.values(TEAMS).filter((t) => t.managerId === u.id).map((t) => t.id);
const teamAgents = (teamId) => USERS.filter((u) => u.role === "agent" && u.teamId === teamId);
function userDesc(u) { // the second line of each entry in the demo user switcher
  if (u.role === "admin") return "Full system access";
  if (u.role === "location_admin") return `Location: ${LOCATIONS[u.locationId].name}`;
  if (u.role === "manager") return `${TEAM_LABELS[u.teamId]} • ${teamAgents(u.teamId).map((a) => a.label).join(", ")}`;
  return `${TEAM_LABELS[u.teamId]} • ${(userById(u.managerId) || {}).label}`;
}

/* ---- meetings + recordings: every one belongs to a location and (usually) a team, and has a host, participants and assigned agents ----
   Field names (the existing model, extended): hostId = organizer | participants = participant ids | assignedTo = assigned agent ids | team = team id | locationId | date + startTime + duration = start / end
   | hasRecording = recording available | transcriptAvailable */
const DEFAULT_SECURITY = {
  whoCanJoin: "Invited participants only",
  waitingRoom: true,
  password: false, passwordValue: "",
  allowBeforeHost: false,
  permMic: true, permCam: true, permScreen: false, permChat: true,
};

function baseMeeting(overrides) {
  const host = userById((overrides && overrides.hostId) || ME.id) || ME;
  const meeting = Object.assign({
    id: uid("m"),
    title: "",
    description: "",
    date: TODAY_ISO,
    startTime: "10:00",
    duration: 30,
    timezone: "GMT+5:30",
    hostId: ME.id,
    participants: [],
    guests: [],
    invitations: {},                                            // per-invitee status ledger: { [userId]: { status, invitedBy, invitedAt, respondedAt } }
    meetingType: "Video",
    recurring: "Does not repeat",
    reminder: "10",
    status: "Upcoming",
    meetingCode: genMeetingId(),
    link: genMeetingLink(),
    createdAt: Date.now(),
    security: DEFAULT_SECURITY,
    chatCount: 0,
    isDemo: false,
    team: host.teamId || "",                                   // the team that manages it ("" = location-wide)
    locationId: host.locationId || ME.locationId || "mumbai",  // the location it belongs to
    assignedTo: [],                                            // agents it is assigned to
    managerCanDelete: false,                                   // the admin explicitly lets the team manager delete it
    hasRecording: false, transcriptAvailable: false,
  }, overrides);
  meeting.security = Object.assign({}, DEFAULT_SECURITY, overrides && overrides.security);
  return meeting;
}
const demoMeeting = (o) => baseMeeting(Object.assign({ isDemo: true, status: "Upcoming", security: { permScreen: true } }, o));

function buildDemoUpcoming() {
  return [
    demoMeeting({ title: "Product Discussion", description: "Review Q4 roadmap and prioritize upcoming features.", date: "2026-09-24", startTime: "10:30", duration: 45, hostId: "u1", participants: ["u2"], guests: [{ email: "client.review@example.com" }, { email: "partner.ops@example.com" }], team: "", locationId: "mumbai", security: { permScreen: false, password: true, passwordValue: "X7kP-92Lm" } }),
    demoMeeting({ title: "Client Demo", description: "Product demo for a prospective client.", date: "2026-09-26", startTime: "16:00", duration: 30, hostId: "u1", participants: ["u2"], guests: [{ email: "buyer@brightpath.io" }], team: "", locationId: "mumbai", security: { permScreen: false } }),
    demoMeeting({ title: "Manager 1 - Team Meeting", description: "Weekly Team 1 sync.", date: "2026-09-24", startTime: "15:00", duration: 30, hostId: "u3", participants: ["u5", "u6"], assignedTo: ["u5", "u6"], recurring: "Weekly", status: "Starting Soon", team: "team1" }),
    demoMeeting({ title: "Agent 1 - Client Call", description: "Walkthrough of onboarding steps for a new client.", date: "2026-09-25", startTime: "09:00", duration: 45, hostId: "u3", participants: ["u5"], assignedTo: ["u5"], guests: [{ email: "newclient@brightpath.io" }], meetingType: "Audio + Video", team: "team1" }),
    demoMeeting({ title: "Agent 2 - Product Demo", description: "Demo of the new dashboard.", date: "2026-09-26", startTime: "14:00", duration: 30, hostId: "u3", participants: ["u6"], assignedTo: ["u6"], team: "team1", managerCanDelete: true }),
    demoMeeting({ title: "Manager 2 - Team Meeting", description: "Weekly Team 2 sync.", date: "2026-09-25", startTime: "11:00", duration: 30, hostId: "u4", participants: ["u7", "u8"], assignedTo: ["u7", "u8"], recurring: "Weekly", team: "team2" }),
    demoMeeting({ title: "Agent 3 - Client Call", description: "Follow-up call with a client.", date: "2026-09-29", startTime: "10:00", duration: 45, hostId: "u4", participants: ["u7"], assignedTo: ["u7"], guests: [{ email: "agency.lead@adworks.com" }], team: "team2" }),
    demoMeeting({ title: "Agent 4 - Client Demo", description: "Live demo for a client.", date: "2026-09-30", startTime: "13:00", duration: 30, hostId: "u4", participants: ["u8"], assignedTo: ["u8"], team: "team2", managerCanDelete: true }),
  ];
}
function buildDemoOngoing() {
  return [
    demoMeeting({ title: "Team 1 Daily Standup", description: "Quick sync on blockers.", date: TODAY_ISO, startTime: "09:00", duration: 15, hostId: "u3", participants: ["u5", "u6"], assignedTo: ["u5", "u6"], status: "Live", team: "team1", liveStartedAt: Date.now() - 4 * 60000 }),
    demoMeeting({ title: "Team 2 Daily Standup", description: "Quick sync on blockers.", date: TODAY_ISO, startTime: "09:30", duration: 15, hostId: "u4", participants: ["u7", "u8"], assignedTo: ["u7", "u8"], status: "Live", team: "team2", liveStartedAt: Date.now() - 7 * 60000 }),
  ];
}
function buildDemoInvited() {
  return [
    demoMeeting({ title: "Q4 Planning Session", description: "Location planning session for the managers.", date: "2026-09-27", startTime: "12:00", duration: 60, hostId: "u2", participants: ["u3", "u4"], guests: [{ email: "guest.partner@example.com" }], status: "Invited", team: "", locationId: "mumbai" }),
  ];
}
function buildDemoHistory() { // past meetings + their recordings (a recording belongs to the meeting it was recorded in)
  const past = (title, o) => demoMeeting(Object.assign({ title, description: `${title}: notes and feedback.`, status: "Ended", chatCount: 6, hasRecording: true, transcriptAvailable: true, security: { permScreen: true } }, o));
  const meetings = [
    past("Agent 1 Review", { date: "2026-09-20", startTime: "10:00", duration: 40, hostId: "u3", participants: ["u5"], assignedTo: ["u5"], team: "team1", chatCount: 12 }),
    past("Agent 2 Review", { date: "2026-09-19", startTime: "11:00", duration: 35, hostId: "u3", participants: ["u6"], assignedTo: ["u6"], team: "team1", chatCount: 8 }),
    past("Agent 3 Review", { date: "2026-09-18", startTime: "10:30", duration: 40, hostId: "u4", participants: ["u7"], assignedTo: ["u7"], team: "team2", chatCount: 9 }),
    past("Agent 4 Review", { date: "2026-09-17", startTime: "15:00", duration: 30, hostId: "u4", participants: ["u8"], assignedTo: ["u8"], team: "team2", chatCount: 5 }),
    past("Delhi Sales Sync", { date: "2026-09-16", startTime: "12:00", duration: 50, hostId: "u9", participants: ["u10"], assignedTo: ["u10"], team: "team3", locationId: "delhi", chatCount: 7 }),
    past("Delhi Client Call", { date: "2026-09-15", startTime: "13:00", duration: 35, hostId: "u9", participants: ["u10"], assignedTo: ["u10"], team: "team3", locationId: "delhi", transcriptAvailable: false }),
  ];
  const sizes = [24.6, 18.2, 32.1, 12.4, 27.8, 15.3];
  const recordings = meetings.map((m, i) => ({ id: uid("rec"), meetingId: m.id, name: m.title, sizeMB: sizes[i], recordedOn: m.date, ownerId: m.hostId, members: m.participants.length + 1, sharedWith: m.participants.slice(),
    team: m.team, locationId: m.locationId, transcriptAvailable: m.transcriptAvailable, isDemo: true }));
  return { meetings, recordings };
}
function timeAgo(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
// what the signed-in user's bell shows: built only from the meetings and recordings that user may see, never from anybody else's.
// Real invitation events (state.notifications, added by sendInvitation/acceptInvite/declineInvite/cancelInvitation) come first, newest first;
// the "invited" computed item below is suppressed once a real one exists for that meeting, so the same invite is never announced twice.
function notificationsForUser() {
  const n = [];
  const mine = state.notifications.filter((x) => x.userId === ME.id).sort((a, b) => b.createdAt - a.createdAt);
  const realInviteMeetingIds = new Set(mine.filter((x) => x.type === "invite").map((x) => x.meetingId));
  mine.forEach((x) => {
    const found = x.meetingId ? findMeeting(x.meetingId) : null;
    const meeting = found && found.meeting;
    const stillPending = x.type === "invite" && meeting && meeting.invitations && meeting.invitations[ME.id] && meeting.invitations[ME.id].status === "pending";
    n.push({ icon: x.icon || "invite", title: x.title, text: x.text, time: timeAgo(x.createdAt), meetingId: stillPending ? x.meetingId : null });
  });
  const up = visibleMeetings("upcoming").slice().sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))[0];
  const inv = visibleMeetings("invited")[0];
  const rec = visibleRecordings().slice().sort((a, b) => b.recordedOn.localeCompare(a.recordedOn))[0];
  if (up) n.push({ icon: "clock", title: "Meeting starts soon", text: `${up.title} is your next meeting.`, time: "2m ago" });
  if (inv && !realInviteMeetingIds.has(inv.id)) n.push({ icon: "invite", title: `${(userById(inv.hostId) || {}).name || "Someone"} invited you to a meeting`, text: `You've been invited to “${inv.title}”.`, time: "1h ago" });
  if (rec) n.push({ icon: "recording", title: "Recording is ready", text: `${rec.name} recording is now available.`, time: "1d ago" });
  return n;
}
function addNotification(userId, notif) {
  state.notifications.unshift(Object.assign({ id: uid("notif"), userId, createdAt: Date.now() }, notif));
  if (state.notifications.length > 300) state.notifications.length = 300; // keep it bounded
  saveState();
  if (userId === ME.id) renderNotifications();
}

/* ============================================================
   2. STATE
   ============================================================ */
const STORAGE_KEY = "mcm-video-meetings-state-v1";
const THEME_KEY = "mcm-dark-mode";
const USER_KEY = "mcm-demo-user"; // the signed-in demo user: per tab (sessionStorage), and the last choice (localStorage) for a tab that has none yet

let state = {
  meetings: { upcoming: [], ongoing: [], invited: [], past: [] },
  recordings: [],
  demoData: true, // the sample organisation (Admin, Location Admin, 2 managers, 4 agents + their meetings) is on by default; the switch and "Clear demo data" turn it off
  filters: { location: "all", manager: "all", agent: "all" }, // Upcoming's hierarchical Location -> Manager -> Agent filter (applied; the popover holds the draft until Apply)
  sort: "soonest",
  search: "",
  ongoingFilters: { location: "all", manager: "all", agent: "all" }, // Ongoing has its own independent search/filter/sort/view, same shape as Upcoming's
  ongoingSort: "time-asc",
  ongoingSearch: "",
  ongoingListView: "list", // list | compact
  recFilters: { owner: "all", size: "all" },
  recSort: "newest",
  recSearch: "",
  listView: "list",
  calendarMonth: new Date(2026, 8, 1),
  calendarSelectedDate: null,
  calendarCardView: "card", // card | list — only the presentation of the selected date's meetings inside Calendar View, independent of state.listView
  sidebarView: "upcoming",
  recordingsSubView: "rec-all",
  analyticsTab: "overview", reportsType: "status", reportsRange: "all",
  pending: null,
  liveMeeting: null,
  liveStartTs: null,
  scheduleMode: "create", // create | edit | duplicate
  scheduleForm: { participants: [], guests: [] },
  inviteForm: { participants: [], guests: [], targetMeetingId: null },
  startInvite: { participants: [], guests: [] }, // pre-meeting "Invite Participants" queue: no real meeting/ID exists yet, so nothing is actually sent until Start Meeting creates one
  notifications: [], // real per-user invitation lifecycle events (sent/accepted/declined/cancelled) - separate from the always-computed "up next" / "recording ready" items
  prejoinContext: null,
  lobbyPrefs: { remember: false, mic: true, cam: true, noiseSuppression: true, touchUp: false, mirror: true, autoLight: true },
};

const RBAC_SCHEMA = 2; // bump when the ownership fields on meetings / recordings (or the people they point at) change
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      meetings: state.meetings,
      recordings: state.recordings,
      demoData: state.demoData,
      lobbyPrefs: state.lobbyPrefs,
      notifications: state.notifications,
      rbac: RBAC_SCHEMA,
    }));
  } catch (e) { /* ignore quota / privacy errors */ }
  try { publishMeetings(); } catch (e) { /* not ready yet */ }
}
// The sample organisation: added when the demo data is on, removed (only those items) when it is off. A meeting carries its own location / team / host / participants / assigned agents.
function fillDemoData(enabled) {
  const lists = state.meetings;
  if (enabled) {
    if (!Object.values(lists).some((l) => l.some((m) => m.isDemo))) {
      const history = buildDemoHistory();
      lists.upcoming.push(...buildDemoUpcoming());
      lists.ongoing.push(...buildDemoOngoing());
      lists.invited.push(...buildDemoInvited());
      lists.past.push(...history.meetings);
      state.recordings.push(...history.recordings);
    }
  } else {
    Object.keys(lists).forEach((k) => { lists[k] = lists[k].filter((m) => !m.isDemo); });
    state.recordings = state.recordings.filter((r) => !r.isDemo);
  }
  state.demoData = enabled;
}
function loadState() {
  let parsed = null;
  try { const raw = localStorage.getItem(STORAGE_KEY); parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; /* corrupt storage */ }
  if (parsed && typeof parsed.demoData === "boolean") state.demoData = parsed.demoData;
  if (parsed && parsed.lobbyPrefs && typeof parsed.lobbyPrefs === "object") Object.assign(state.lobbyPrefs, parsed.lobbyPrefs);
  state.notifications = (parsed && Array.isArray(parsed.notifications)) ? parsed.notifications : [];
  if (parsed && parsed.rbac === RBAC_SCHEMA && parsed.meetings) {
    state.meetings = parsed.meetings;
    state.recordings = parsed.recordings || [];
    return;
  }
  // first visit, or saved before people / locations / teams existed: start again from the sample organisation
  state.meetings = { upcoming: [], ongoing: [], invited: [], past: [] };
  state.recordings = [];
  fillDemoData(state.demoData);
  saveState();
}

function findMeeting(id) {
  for (const key of ["upcoming", "ongoing", "invited", "past"]) {
    const m = state.meetings[key].find((x) => x.id === id);
    if (m) return { meeting: m, listKey: key };
  }
  return null;
}
function removeMeetingFrom(listKey, id) {
  state.meetings[listKey] = state.meetings[listKey].filter((m) => m.id !== id);
}

/* ============================================================
   2b. ROLE-BASED ACCESS CONTROL
   WHO is signed in (ME, chosen with the demo user switcher) + ONE table of what each role may do = every check in the app.
   Roles: Admin (everything) > Location Admin (one location) > Manager / Supervisor (the team(s) they manage) > Agent (own / assigned).
   A role is granted a permission as a list of scopes (an empty list = never):
     all        anything, anywhere
     location   items of the user's own location (meetings, recordings, users, analytics of that location)
     team       items of the teams the user manages (Managers)
     own        items the user hosts / owns
     assigned   meetings assigned to the user (agents)
     invited    meetings the user was invited to (is a participant of)
     shared     recordings shared with the user / meetings the user took part in
     delegated  a team meeting the admin explicitly handed to managers for deletion
     self       the user's own record
     open       meetings that let participants share
   can(perm) asks "does this user have the permission at all?" (used to show / hide a control or a page);
   can(perm, item) also asks "is it allowed for THIS meeting / recording / user?".
   FRONT-END ONLY: hiding a control, filtering a list and guarding a route are conveniences, not security. A real deployment must repeat every one of
   these checks on the server for every API call (the same table, the same scopes) and must never send data the caller may not see.
   ============================================================ */
const ALL = ["all"], NEVER = [];
const grant = (admin, location_admin, manager, agent) => ({ admin, location_admin, manager, agent });
const EVERYONE = grant(ALL, ALL, ALL, ALL);
const LOC = ["location"], MGR = ["team", "own"];
const PERMISSIONS = {
  /* meetings */
  "meeting.view":       grant(ALL, LOC, ["team", "own", "invited"], ["assigned", "invited"]),
  "meeting.join":       grant(ALL, LOC, ["team", "own", "invited"], ["assigned", "invited"]),
  "meeting.leave":      EVERYONE,
  "meeting.create":     grant(ALL, ALL, ALL, NEVER),          // new meetings are always created inside the creator's own scope (see ownershipForNewMeeting)
  "meeting.edit":       grant(ALL, LOC, MGR, NEVER),          // also reschedule
  "meeting.cancel":     grant(ALL, LOC, MGR, NEVER),
  "meeting.delete":     grant(ALL, LOC, ["delegated"], NEVER), // Manager: only where the admin explicitly delegated it
  "meeting.end":        grant(ALL, LOC, MGR, NEVER),          // "End for all"
  "meeting.invite":     grant(ALL, LOC, MGR, NEVER),
  "meeting.settings":   grant(ALL, LOC, MGR, NEVER),
  "meeting.lock":       grant(ALL, LOC, MGR, NEVER),
  "meeting.moderate":   grant(ALL, LOC, MGR, NEVER),          // host / moderator powers inside the room
  /* participants */
  "participants.view":        EVERYONE,
  "participants.viewDetails": grant(ALL, LOC, ["team"], NEVER), // e-mail addresses and guest lists (an Agent only gets names)
  "participants.pin":         EVERYONE,
  "participants.message":     grant(ALL, LOC, ["team"], NEVER), // the shortcut in the participant menu (everyone can still use the chat "To:" picker)
  "participants.mute":        grant(ALL, LOC, ["team"], NEVER),
  "participants.stopVideo":   grant(ALL, LOC, ["team"], NEVER),
  "participants.remove":      grant(ALL, LOC, ["team"], NEVER),
  "participants.manage":      grant(ALL, LOC, ["team"], NEVER), // participant permissions, make host, lowering other people's hands
  /* the "Meeting settings" / "Participant management" shortcuts in More Actions are Admin-only (the others moderate from the participants panel / Details) */
  "room.settings":              grant(ALL, NEVER, NEVER, NEVER),
  "room.participantManagement": grant(ALL, NEVER, NEVER, NEVER),
  /* sharing + in-meeting features */
  "share.screen":       EVERYONE,                             // a meeting that restricts sharing still applies to whoever cannot moderate it
  "share.restrict":     grant(ALL, LOC, ["team"], NEVER),
  "chat": EVERYONE, "qa": EVERYONE, "reactions": EVERYONE, "hand": EVERYONE,
  "record.control":     grant(ALL, LOC, ["team"], NEVER),
  "captions": EVERYONE, "transcription": EVERYONE, "whiteboard": EVERYONE, "tile.hide": EVERYONE,
  "video.quality": EVERYONE, "effects": EVERYONE, "media.mic": EVERYONE, "media.camera": EVERYONE, "media.devices": EVERYONE,
  /* recordings + transcripts (a recording / transcript is checked on its own, not only through its meeting) */
  "recording.view":     grant(ALL, LOC, ["team"], ["own", "shared"]),
  "recording.play":     grant(ALL, LOC, ["team"], ["own", "shared"]),
  "recording.download": grant(ALL, LOC, ["team"], NEVER),
  "recording.share":    grant(ALL, LOC, NEVER, NEVER),
  "recording.delete":   grant(ALL, LOC, NEVER, NEVER),
  "transcript.view":    grant(ALL, LOC, ["team"], ["own", "shared"]),
  /* pages behind the top bar + administration */
  "dashboard.view":     EVERYONE,                             // an Agent's dashboard only counts their own meetings
  "directory.view":     grant(ALL, LOC, ["team"], NEVER),
  "user.view":          grant(ALL, LOC, ["team"], ["self"]),  // whose profile appears in lists, pickers and search (item = the user)
  "analytics.view":     grant(ALL, LOC, ["team"], NEVER),     // Location Admin: their location; Manager: their teams (item = { team, locationId })
  "reports.view":       grant(ALL, LOC, ["team"], NEVER),
  "data.export":        grant(ALL, LOC, ["team"], NEVER),     // never a global export for anyone but the Admin
  "settings.view":      grant(ALL, ALL, NEVER, NEVER),        // the Settings tab (its pages are checked one by one below)
  "system.settings":    grant(ALL, NEVER, NEVER, NEVER),      // /admin/settings
  "users.manage":       grant(ALL, NEVER, NEVER, NEVER),      // /admin/users
  "roles.manage":       grant(ALL, NEVER, NEVER, NEVER),      // /admin/roles
  "locations.manage":   grant(ALL, NEVER, NEVER, NEVER),      // /admin/locations
  "teams.manage":       grant(ALL, NEVER, NEVER, NEVER),      // /admin/teams
  "location.settings":  grant(ALL, LOC, NEVER, NEVER),        // /location/settings (a Location Admin: their own location only)
  "location.users":     grant(ALL, LOC, NEVER, NEVER),        // /location/users
  "location.teams":     grant(ALL, LOC, NEVER, NEVER),        // /location/teams
};
const subjectTeam = (s) => (s.team !== undefined ? s.team : s.teamId);
const SCOPES = {
  location: (u, s) => !!u.locationId && s.locationId === u.locationId,
  team: (u, s) => u.role === "manager" && managedTeamIds(u).includes(subjectTeam(s)),
  own: (u, s) => s.ownerId === u.id || s.hostId === u.id,
  assigned: (u, s) => (s.assignedTo || []).includes(u.id),
  invited: (u, s) => (s.participants || []).includes(u.id) && s.hostId !== u.id,
  shared: (u, s) => (s.sharedWith || []).includes(u.id) || (s.participants || []).includes(u.id),
  delegated: (u, s) => SCOPES.team(u, s) && s.managerCanDelete === true,
  self: (u, s) => s.id === u.id,
  open: (u, s) => !s.security || s.security.permScreen !== false,
};
// the ONE decision function: does this user (role + location + team + ownership + assignment) have this permission, for this item?
function canUser(user, perm, subject) {
  const scopes = ((PERMISSIONS[perm] || {})[user.role]) || NEVER;
  if (!scopes.length) return false;
  if (subject === undefined) return true; // asked without an item: does the role have it at all?
  return scopes.some((s) => s === "all" || (!!subject && SCOPES[s](user, subject)));
}
const can = (perm, subject) => canUser(ME, perm, subject); // "can the signed-in user ..."
const RBAC_DENIED = "Permission denied. You do not have access to perform this action.";
const RBAC_TIP = "Your role is not allowed to perform this action.";
function authorize(perm, subject) {
  if (can(perm, subject)) return true;
  toast(RBAC_DENIED, "error");
  return false;
}
// what the signed-in user gets to see: EVERY list, count, picker, search and export starts from these (filter first, render after)
const answered = (m, key) => (m[key] || []).includes(ME.id);
// a real (Invite Participants) invitation that THIS user hasn't accepted yet - whatever physical list the meeting lives in, it must not
// act like an accepted meeting for them (not shown as Upcoming/Ongoing) until they respond; the host is never subject to their own invite
const hasUnacceptedInvite = (m) => m.hostId !== ME.id && !!(m.invitations && m.invitations[ME.id] && m.invitations[ME.id].status !== "accepted");
function visibleMeetings(listKey) {
  let list = state.meetings[listKey];
  if (listKey === "invited") {
    list = list.filter((m) => !answered(m, "acceptedBy") && !answered(m, "declinedBy"));                       // still waiting for THIS user's answer
    // a real pending invitation for a meeting stored in upcoming/ongoing (created via Schedule Meeting, not the legacy demo "invited" bucket) belongs here too
    list = list.concat(["upcoming", "ongoing"].flatMap((k) => state.meetings[k].filter((m) => m.invitations && m.invitations[ME.id] && m.invitations[ME.id].status === "pending")));
  } else {
    list = list.filter((m) => !hasUnacceptedInvite(m));
  }
  if (listKey === "upcoming") list = list.concat(state.meetings.invited.filter((m) => answered(m, "acceptedBy") && !answered(m, "declinedBy"))); // accepted by this user
  return list.filter((m) => can("meeting.view", m));
}
/* Company Rules > Policies > retention: recordings older than the company keeps them are no longer listed */
const recRetained = (r) => { const R = window.UCAAS_rules && window.UCAAS_rules(); const days = R && R.retention.recordings; if (!days) return true; const t = Date.parse(r.recordedOn); return isNaN(t) || Date.now() - t <= days * 86400000; };
const visibleRecordings = () => state.recordings.filter((r) => can("recording.view", r) && recRetained(r));
const visibleUsers = () => USERS.filter((u) => can("user.view", u));
const hostCandidates = () => visibleUsers().filter((u) => u.role !== "agent"); // agents never host a meeting
const visibleTeams = () => Object.values(TEAMS).filter((t) => can("analytics.view", t));
// a new meeting is created inside its creator's own scope: a Manager's always belongs to their team, a Location Admin's to their location
function ownershipForNewMeeting(hostId) {
  const host = userById(hostId) || ME;
  if (ME.role === "manager") return { team: managedTeamIds(ME)[0] || ME.teamId || "", locationId: ME.locationId };
  if (ME.role === "location_admin") return { team: host.teamId || "", locationId: ME.locationId };
  return { team: host.teamId || "", locationId: host.locationId || "mumbai" };
}
// an object literal evaluates every value up front, so this stays an if/else rather than a role-keyed map: a Manager's branch must not run LOCATIONS[ME.locationId] for an Admin (locationId is null for that role), and vice-versa
function currentScopeLabel() {
  if (ME.role === "admin") return "All locations";
  if (ME.role === "location_admin") return `Location: ${LOCATIONS[ME.locationId].name}`;
  if (ME.role === "manager") return `${managedTeamIds(ME).map((t) => TEAM_LABELS[t]).join(", ")} only`;
  return "Your own meetings";
}

/* ---- who is signed in: the demo user switcher (development / demo only: a real app takes the user from the login session) ---- */
const ROLE_ICONS = {
  crown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="m4 18-2-12 6 5 4-8 4 8 6-5-2 12"/></svg>',
  building: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>',
  users: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
};
const CHECK_SVG = '<svg class="rbac-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
function renderRoleSelector() {
  const btn = $("#roleSwitchBtn");
  btn.setAttribute("data-role", ME.role);
  btn.setAttribute("aria-label", `Signed in as ${ME.label} (demo user). Switch user`);
  btn.title = `${ME.name} · ${ME.label} (demo user)`;
  $("#roleSwitchIcon").innerHTML = ROLE_ICONS[ROLES[ME.role].icon];
  $("#roleSwitchLabel").textContent = ME.short;
  $("#roleMenu").innerHTML = `<li role="none" class="rbac-menu-head"><span>Demo user switcher</span><span class="rbac-dev-tag">DEV</span></li>` + USERS.filter((u) => u.switcher).map((u) => {
    const selected = u.id === ME.id;
    return `<li role="none"><button class="dropdown-item rbac-opt${selected ? " active" : ""}" type="button" role="menuitemradio" data-user-option="${u.id}" aria-checked="${selected}" title="${escapeHtml(u.name)}">
      <span class="rbac-opt-icon" data-role="${u.role}" aria-hidden="true">${ROLE_ICONS[ROLES[u.role].icon]}</span>
      <span class="flex-grow-1"><span class="rbac-opt-title">${escapeHtml(u.label)}</span><span class="rbac-opt-desc">${escapeHtml(userDesc(u))}</span></span>
      ${CHECK_SVG.replace('class="rbac-check"', `class="rbac-check${selected ? "" : " invisible"}"`)}
    </button></li>`;
  }).join("");
}
// "who am I" appears in more than one place (navbar avatar, pre-join preview, live-room header): all of it follows the signed-in user
function renderIdentity() {
  $$("[data-me-initials]").forEach((el) => { el.textContent = ME.initials; });
  $$("[data-me-name]").forEach((el) => { el.textContent = ME.name; });
  $$("[data-me-first]").forEach((el) => { el.textContent = ME.name.split(" ")[0]; });
  const av = $("#navAvatar");
  if (av) av.title = `${ME.name} · ${ME.label}`;
}
// A control marked data-perm="..." is hidden (data-perm-mode="hide", the default) or shown disabled with a tooltip (data-perm-mode="lock")
// when the signed-in user isn't allowed to use it. Inside the meeting room "allowed" also means authorised for the meeting being attended.
function lockEl(el, locked, tip) {
  el.classList.toggle("rbac-locked", locked);
  if (locked) { el.setAttribute("aria-disabled", "true"); el.setAttribute("data-rbac-tip", tip || RBAC_TIP); }
  else { el.removeAttribute("aria-disabled"); el.removeAttribute("data-rbac-tip"); }
  // a locked card / row also disables the switches and selects inside it (a locked button stays clickable so it can explain itself)
  if (!/^(BUTTON|A)$/.test(el.tagName)) $$("input, select, textarea", el).forEach((c) => { c.disabled = locked; });
}
function applyRbacDom(root, subject) {
  $$("[data-perm]", root || document).forEach((el) => {
    const s = subject !== undefined ? subject : el.closest("#liveModalOverlay") ? state.liveMeeting || undefined : undefined;
    const allowed = can(el.getAttribute("data-perm"), s);
    const mode = el.getAttribute("data-perm-mode") || "hide";
    el.classList.toggle("rbac-hidden", !allowed && mode === "hide");
    lockEl(el, !allowed && mode === "lock", el.getAttribute("data-perm-tip"));
  });
}
// tooltips for locked controls (also for the ones drawn later, such as cards and menus)
function initRbacTooltips() {
  new bootstrap.Tooltip(document.body, { selector: "[data-rbac-tip]", trigger: "hover focus", placement: "top", container: "body", title(el) { return (el || this).getAttribute("data-rbac-tip"); } }); // Bootstrap 5.3 passes the trigger element in (older versions bound it to `this`)
}

// the signed-in user (or what they may do) changed: identity, nav, page, lists, counts, menus and the live room all follow it
function applyRbac() {
  renderIdentity();
  renderRoleSelector();
  applyRbacDom();
  populateHostSelect(); // the people this user may pick as host
  renderNotifications();
  renderAllViews(); // meeting data, card buttons and menus follow the user
  renderRoute();    // the page behind the top bar is checked again (a page the new user may not open turns into "Access denied")
  if (!$("#detailsDrawerOverlay").hidden && drawerContextMeeting) { // an open drawer shows the new user's buttons too, or closes if the meeting is no longer theirs
    if (can("meeting.view", drawerContextMeeting)) {
      const tab = $(".drawer-tab.active");
      setDrawerTab(tab ? tab.getAttribute("data-drawer-tab") : "overview");
    } else closeModal("detailsDrawerOverlay");
  }
  if (state.liveMeeting) applyRbacToLiveRoom();
}
function resolveCurrentUser() {
  let id = null;
  try { id = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY); } catch (e) { /* storage blocked */ }
  return USERS.find((u) => u.id === id && u.switcher) || USERS[0];
}
function setCurrentUser(id) {
  const user = USERS.find((u) => u.id === id && u.switcher);
  if (!user) return;
  const changed = user.id !== ME.id;
  ME = user;
  try { sessionStorage.setItem(USER_KEY, user.id); localStorage.setItem(USER_KEY, user.id); } catch (e) { /* storage blocked */ }
  if (changed) { // nothing typed / chosen as the previous user carries over
    state.search = ""; state.filters = hierarchyDefaults(); state.recFilters = { owner: "all", size: "all" }; state.recSearch = "";
    state.ongoingSearch = ""; state.ongoingFilters = hierarchyDefaults();
    $("#meetingSearchInput").value = ""; $("#recordingSearchInput").value = ""; $("#ongoingSearchInput").value = ""; $("#ongoingSearchClear").classList.add("d-none");
    ["#recFilterOwner", "#recFilterSize"].forEach((sel) => { const el = $(sel); if (el) el.value = "all"; });
    closeContextMenu();
    resetScheduleForm(); // the schedule form holds nothing the previous user chose
    if (!$("#commandPaletteOverlay").hidden) closeModal("commandPaletteOverlay");
    ["scheduleModalOverlay", "inviteModalOverlay", "joinModalOverlay", "rescheduleModalOverlay", "transcriptOverlay", "recordingPreviewOverlay"].forEach((id2) => { const el = $("#" + id2); if (el && !el.hidden) closeModal(id2); });
  }
  applyRbac();
  if (changed) toast(`Switched to ${user.label}.`);
}
function initRoleSelector() {
  on($("#roleMenu"), "click", (e) => {
    const opt = e.target.closest("[data-user-option]");
    if (opt) setCurrentUser(opt.getAttribute("data-user-option"));
  });
}

/* ============================================================
   2c. ROUTES + PAGES BEHIND THE TOP-BAR TABS
   Hash routes (#/dashboard, #/directory, #/analytics, #/settings, #/admin/users ...) work from file:// and any static host. Every route names the
   permission it needs; renderRoute() checks it (again after every user switch), so typing an address never opens a page the user may not use.
   Each page is built from the same scoped helpers as the meeting lists (visibleMeetings / visibleUsers / visibleRecordings): it never holds data
   the signed-in user may not see. The page itself is only a view: a real deployment also has to guard the matching API routes on the server.
   ============================================================ */
const SETTINGS_PAGES = [ // the Settings tab: each page and the permission it needs
  { route: "admin/users", label: "Users", perm: "users.manage", desc: "Every user in the system with their role, location and team." },
  { route: "admin/roles", label: "Roles & permissions", perm: "roles.manage", desc: "What each role may do, and over which scope." },
  { route: "admin/locations", label: "Locations", perm: "locations.manage", desc: "Locations with their teams, users and meetings." },
  { route: "admin/teams", label: "Teams", perm: "teams.manage", desc: "Teams, their managers and agents." },
  { route: "admin/settings", label: "System settings", perm: "system.settings", desc: "System-wide meeting defaults (Admin only)." },
  { route: "location/users", label: "Location users", perm: "location.users", desc: "People in your location." },
  { route: "location/teams", label: "Location teams", perm: "location.teams", desc: "Teams of your location." },
  { route: "location/settings", label: "Location settings", perm: "location.settings", desc: "Meeting defaults for your location." },
];
const ROUTES = {
  interactions: { title: "Video Meetings", tab: "interactions" },
  dashboard: { title: "Dashboard", tab: "dashboard", perm: "dashboard.view", desc: () => currentScopeLabel(), render: () => pageDashboard() },
  directory: { title: "Directory", tab: "directory", perm: "directory.view", desc: () => `People in your scope: ${currentScopeLabel()}`, render: () => pageDirectory() },
  analytics: { title: "Analytics", tab: "analytics", perm: "analytics.view", desc: () => `Meeting analytics · ${currentScopeLabel()}`, render: () => pageAnalytics() },
  settings: { title: "Settings", tab: "settings", perm: "settings.view", redirect: true },
};
SETTINGS_PAGES.forEach((p) => {
  ROUTES[p.route] = { title: p.label, tab: "settings", perm: p.perm, desc: () => p.desc, settings: true, render: () => ({
    "admin/users": pageAdminUsers, "admin/roles": pageAdminRoles, "admin/locations": pageAdminLocations, "admin/teams": pageAdminTeams, "admin/settings": pageSystemSettings,
    "location/users": pageLocationUsers, "location/teams": pageLocationTeams, "location/settings": pageLocationSettings,
  })[p.route]() };
});
// the pages of the Settings tab this user may open (the Admin manages everything globally, so the per-location pages are not listed for them)
const settingsPagesFor = () => SETTINGS_PAGES.filter((p) => can(p.perm) && !(ME.role === "admin" && p.route.startsWith("location/")));

const currentRouteKey = () => {
  let k = "";
  try { k = decodeURIComponent(location.hash.replace(/^#\/?/, "")); } catch (e) { k = ""; }
  k = k.replace(/\/+$/, "").toLowerCase();
  return k === "" || k === "meetings" ? "interactions" : k;
};
let pageMode = false, lastDenied = "";
// the user switcher lives beside "Meetings" in the sidebar; on a page (no sidebar) it moves into the page header so it is always at hand
function placeSwitcher(inPage) {
  const wrap = $("#roleSwitchWrap"), target = inPage ? $("#pageUserSlot") : $(".sidebar-header");
  if (wrap.parentElement !== target) target.appendChild(wrap);
}
function setPageMode(on) {
  if (on === pageMode) return;
  pageMode = on;
  $(".app-body").classList.toggle("page-mode", on);
  placeSwitcher(on);
  if (on) $$("[data-view-section]").forEach((s) => { s.hidden = true; });
  $("#view-page").hidden = !on;
  if (!on) switchSidebarView(state.sidebarView);
}
function renderRoute() {
  if (document.documentElement.classList.contains("meeting-tab")) return; // a meeting tab is only the room
  let key = currentRouteKey(), def = ROUTES[key];
  if (key === "interactions") { $$(".navbar-tabs .nav-tab").forEach((t) => t.classList.toggle("active", t.getAttribute("data-tab") === "interactions")); setPageMode(false); syncAnalyticsSidebar(false); return; }
  if (def && def.redirect) { // "Settings" opens the first settings page this user has
    const first = can(def.perm) ? settingsPagesFor()[0] : null;
    if (first) { key = first.route; def = ROUTES[key]; try { history.replaceState(null, "", "#/" + key); } catch (e) { /* file:// */ } }
  }
  setPageMode(true);
  $("#mainContent").scrollTop = 0;
  const body = $("#pageBody"), tab = def ? def.tab : "";
  $$(".navbar-tabs .nav-tab").forEach((t) => t.classList.toggle("active", t.getAttribute("data-tab") === tab));
  if (!def || (def.perm && !can(def.perm))) { // unknown address, or a page this user may not open: nothing of it is built
    syncAnalyticsSidebar(false);
    const notFound = !def;
    $("#pageTitle").textContent = notFound ? "Page not found" : "Access denied";
    $("#pageDesc").textContent = "";
    body.setAttribute("data-state", notFound ? "notfound" : "denied");
    body.innerHTML = `<div class="state-box" role="alert">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <h4>${notFound ? "This page does not exist." : "You do not have access to this page."}</h4>
      <p>${notFound ? "Check the address, or go back to your meetings." : `${escapeHtml(ME.label)} is not allowed to open “${escapeHtml(key)}”.`}</p>
      <a class="btn btn-primary btn-sm" href="#/interactions" data-page-back>Back to Meetings</a></div>`;
    if (!notFound && lastDenied !== key + "|" + ME.id) toast(RBAC_DENIED, "error");
    lastDenied = notFound ? "" : key + "|" + ME.id;
    return;
  }
  lastDenied = "";
  syncAnalyticsSidebar(key === "analytics");
  $("#pageTitle").textContent = def.title;
  $("#pageDesc").textContent = def.desc ? def.desc() : "";
  body.setAttribute("data-state", "ok");
  const sub = def.settings ? `<nav class="page-subnav" aria-label="Settings pages">${settingsPagesFor().map((p) => `<a class="nav-tab${p.route === key ? " active" : ""}" href="#/${p.route}">${escapeHtml(p.label)}</a>`).join("")}</nav>` : "";
  body.innerHTML = sub + def.render();
}
function initRouter() {
  window.addEventListener("hashchange", renderRoute);
}

/* ---- small building blocks for the pages ---- */
const roleTag = (u) => `<span class="role-tag" data-role="${u.role}">${escapeHtml(ROLES[u.role].short)}</span>`;
const locName = (id) => (LOCATIONS[id] ? LOCATIONS[id].name : "—");
const kpi = (label, value, sub) => `<div class="kpi-card"><div class="kpi-value">${value}</div><div class="kpi-label">${escapeHtml(label)}</div>${sub ? `<div class="kpi-sub">${escapeHtml(sub)}</div>` : ""}</div>`;
const pageTable = (heads, rows, empty) => `<div class="table-wrap page-table"><table class="recordings-table"><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
  rows.length ? rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${heads.length}" class="text-center py-4">${escapeHtml(empty || "Nothing to show.")}</td></tr>`}</tbody></table></div>`;
const pageSection = (title, html) => `<h2 class="page-section-title">${escapeHtml(title)}</h2>${html}`;
const userCell = (u) => `<div class="rec-name-cell"><span class="picker-avatar">${u.initials}</span>${escapeHtml(u.name)}<span class="text-secondary ms-1">(${escapeHtml(u.label)})</span></div>`;
const allVisibleMeetings = () => ["ongoing", "upcoming", "invited", "past"].flatMap((k) => visibleMeetings(k).map((m) => ({ m, listKey: k })));

function pageDashboard() {
  const up = visibleMeetings("upcoming"), live = visibleMeetings("ongoing"), inv = visibleMeetings("invited"), past = visibleMeetings("past"), recs = visibleRecordings();
  const next = [...live, ...up].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)).slice(0, 5);
  return `<div class="kpi-grid" id="dashKpis">${kpi("Upcoming meetings", up.length)}${kpi("Live now", live.length)}${kpi("Invitations", inv.length)}${kpi("Past meetings", past.length)}${kpi("Recordings", recs.length)}</div>`
    + pageSection(ME.role === "agent" ? "My next meetings" : "Next meetings in your scope", pageTable(["Meeting", "When", "Host", "Team", "Status"],
      next.map((m) => [escapeHtml(m.title), `${formatFullDate(m.date)} · ${formatTimeRange(m)}`, escapeHtml((userById(m.hostId) || {}).name || "—"), escapeHtml(TEAM_LABELS[m.team] || "All teams"), escapeHtml(m.status)]), "No upcoming meetings."));
}
function pageDirectory() {
  const rows = visibleUsers().map((u) => [userCell(u), roleTag(u), locName(u.locationId), escapeHtml(TEAM_LABELS[u.teamId] || "—"), escapeHtml((userById(u.managerId) || {}).name || "—"), escapeHtml(u.email)]);
  return `<div class="kpi-grid">${kpi("People", rows.length, currentScopeLabel())}</div>` + pageTable(["Name", "Role", "Location", "Team", "Reports to", "Email"], rows, "No people in your scope.");
}
const ANALYTICS_PLACEHOLDER_LABELS = {
  boards: "Boards", live: "Live", callbacks: "Callbacks", campaigns: "Campaigns", speech: "Speech", "ai-wall": "AI Wall",
  queue: "Queue", video: "Video", monitoring: "Monitoring", coaching: "Coaching", "agent-activity": "Agent Activity",
};
function pageAnalytics() {
  if (ANALYTICS_PLACEHOLDER_LABELS[state.analyticsTab]) return renderAnalyticsPlaceholder(state.analyticsTab);
  return state.analyticsTab === "reports" ? renderAnalyticsReports() : renderAnalyticsOverview();
}
function renderAnalyticsPlaceholder(key) {
  return `<div class="state-box" role="status">
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/></svg>
    <h4>${escapeHtml(ANALYTICS_PLACEHOLDER_LABELS[key])}</h4>
    <p>This part of Analytics isn't built in the prototype yet.</p>
  </div>`;
}
function syncAnalyticsSidebar(active) {
  $("#railModulesSection").hidden = active;
  $("#railAnalyticsSection").hidden = !active;
  if (active) $$("#railAnalyticsSection [data-analytics-tab]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-analytics-tab") === state.analyticsTab));
}
function renderAnalyticsOverview() {
  const mine = allVisibleMeetings().filter(({ m }) => can("analytics.view", m)).map(({ m }) => m); // analytics only count what the user may analyse (a Manager: their team, never the location-wide meetings they were merely invited to)
  const recs = visibleRecordings().filter((r) => can("analytics.view", r));
  const hours = mine.reduce((s, m) => s + Number(m.duration || 0), 0) / 60;
  const people = new Set(mine.flatMap((m) => [m.hostId, ...m.participants]));
  const teams = visibleTeams();
  const rowFor = (label, loc, mgr, list, teamRecs) => [escapeHtml(label), loc, mgr, list.length, list.filter((m) => m.status === "Live").length, teamRecs.length, new Set(list.flatMap((m) => [m.hostId, ...m.participants])).size];
  const rows = teams.map((t) => rowFor(t.name, locName(t.locationId), escapeHtml((userById(t.managerId) || {}).name || "—"), mine.filter((m) => m.team === t.id), recs.filter((r) => r.team === t.id)));
  if (ME.role === "admin" || ME.role === "location_admin") rows.push(rowFor("Location-wide (no team)", ME.role === "admin" ? "All" : locName(ME.locationId), "—", mine.filter((m) => !m.team), recs.filter((r) => !r.team)));
  return `<div class="kpi-grid" id="analyticsKpis">${kpi("Meetings", mine.length)}${kpi("Live now", mine.filter((m) => m.status === "Live").length)}${kpi("Meeting hours", hours.toFixed(1))}${kpi("Recordings", recs.length)}${kpi("People involved", people.size)}</div>`
    + pageSection("By team", pageTable(["Team", "Location", "Manager", "Meetings", "Live", "Recordings", "People"], rows, "No teams in your scope."));
}

/* ---- Analytics > Reports: same RBAC-scoped real meeting/recording data as Overview, sliced by report type + date range ---- */
const REPORT_TYPES = {
  status: { label: "Meeting Status Summary", note: "Status is read directly from each meeting's own record - the same value shown on its card." },
  attendance: { label: "Attendance Summary", note: "Accepted/Declined reflect each invitee's own response to their invitation, not just whether they were listed." },
  team: { label: "Team Summary", note: "Meetings and recordings are counted within the selected date range; People counts everyone who has ever hosted or attended." },
};
const REPORT_RANGES = { all: "All time", today: "Today", week: "Last 7 days", month: "This month" };
function reportsDateOk(dateStr, range) {
  if (range === "all") return true;
  if (!dateStr) return false;
  if (range === "today") return dateStr === TODAY_ISO;
  if (range === "week") { const diff = Math.round((parseISO(dateStr) - parseISO(TODAY_ISO)) / 86400000); return diff <= 0 && diff >= -6; }
  if (range === "month") return dateStr.slice(0, 7) === TODAY_ISO.slice(0, 7);
  return true;
}
// last-14-real-days activity, split into two 7-day halves so the KPI cards can show an honest trend + sparkline (independent of the report's own date-range filter)
function periodMeetings(list, offsetDays, days) {
  const end = parseISO(TODAY_ISO).getTime() - offsetDays * 86400000, start = end - (days - 1) * 86400000;
  return list.filter((m) => { const t = parseISO(m.date).getTime(); return t >= start && t <= end; });
}
function dailyCounts(list, days, valueFn) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) { const d = toISO(new Date(parseISO(TODAY_ISO).getTime() - i * 86400000)); out.push(valueFn(list.filter((m) => m.date === d))); }
  return out;
}
function trendPct(cur, prev) { return prev ? Math.round(((cur - prev) / prev) * 100) : (cur ? 100 : 0); }
function sparklinePath(values) {
  const max = Math.max(...values, 1), min = Math.min(...values, 0), span = max - min || 1;
  const stepX = values.length > 1 ? 64 / (values.length - 1) : 64;
  return values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${(18 - ((v - min) / span) * 18).toFixed(1)}`).join(" ");
}
function reportsKpiCard(label, value, cur, prev, series) {
  const pct = trendPct(cur, prev), up = pct >= 0;
  return `<div class="kpi-card reports-kpi-card">
    <div class="kpi-label">${escapeHtml(label)}</div>
    <div class="reports-kpi-row">
      <div class="kpi-value">${value}</div>
      <svg class="kpi-spark ${up ? "up" : "down"}" width="64" height="18" viewBox="0 0 64 18" preserveAspectRatio="none" aria-hidden="true"><path d="${sparklinePath(series)}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <span class="kpi-trend ${up ? "up" : "down"}"><i class="bi bi-arrow-${up ? "up" : "down"}"></i>${Math.abs(pct)}% vs prior 7 days</span>
  </div>`;
}
let lastReportExport = null; // {filename, heads, rows} for whatever report is on screen right now - Export CSV reads this, never a fake/canned table
function renderAnalyticsReports() {
  const range = state.reportsRange, type = state.reportsType;
  const all = allVisibleMeetings().filter(({ m }) => can("analytics.view", m)).map(({ m }) => m);
  const filtered = all.filter((m) => reportsDateOk(m.date, range));
  const recs = visibleRecordings().filter((r) => can("analytics.view", r)).filter((r) => reportsDateOk(r.recordedOn, range));
  const total = filtered.length, completed = filtered.filter((m) => m.status === "Ended").length, cancelled = filtered.filter((m) => m.status === "Cancelled").length;
  const rate = total ? Math.round((cancelled / total) * 100) + "%" : "—";

  const thisWeek = periodMeetings(all, 0, 7), lastWeek = periodMeetings(all, 7, 7);
  const completedThis = thisWeek.filter((m) => m.status === "Ended").length, completedLast = lastWeek.filter((m) => m.status === "Ended").length;
  const cancelledThis = thisWeek.filter((m) => m.status === "Cancelled").length, cancelledLast = lastWeek.filter((m) => m.status === "Cancelled").length;
  const rateThis = thisWeek.length ? Math.round((cancelledThis / thisWeek.length) * 100) : 0, rateLast = lastWeek.length ? Math.round((cancelledLast / lastWeek.length) * 100) : 0;

  let heads, rows, empty;
  if (type === "attendance") {
    heads = ["Meeting", "Host", "Date", "Invited", "Accepted", "Declined", "Duration", "Status"];
    rows = filtered.map((m) => {
      const invited = m.participants.length;
      const accepted = m.participants.filter((id) => (m.acceptedBy || []).includes(id)).length;
      const declined = m.participants.filter((id) => (m.declinedBy || []).includes(id)).length;
      return [m.title, (userById(m.hostId) || {}).name || "—", formatFullDate(m.date), invited, accepted, declined, `${m.duration} min`, m.status];
    });
    empty = "No meetings in this range.";
  } else if (type === "team") {
    const teams = visibleTeams();
    const rowFor = (label, loc, mgr, list, teamRecs) => [label, loc, mgr, list.length, list.filter((m) => m.status === "Live").length, teamRecs.length, new Set(list.flatMap((m) => [m.hostId, ...m.participants])).size];
    heads = ["Team", "Location", "Manager", "Meetings", "Live", "Recordings", "People"];
    rows = teams.map((t) => rowFor(t.name, locName(t.locationId), (userById(t.managerId) || {}).name || "—", filtered.filter((m) => m.team === t.id), recs.filter((r) => r.team === t.id)));
    if (ME.role === "admin" || ME.role === "location_admin") rows.push(rowFor("Location-wide (no team)", ME.role === "admin" ? "All" : locName(ME.locationId), "—", filtered.filter((m) => !m.team), recs.filter((r) => !r.team)));
    empty = "No teams in your scope.";
  } else {
    heads = ["Status", "Meetings", "Total hours"];
    rows = ["Live", "Starting Soon", "Upcoming", "Invited", "Ended", "Cancelled"].map((st) => {
      const list = filtered.filter((m) => m.status === st);
      return list.length ? [st, list.length, (list.reduce((s, m) => s + Number(m.duration || 0), 0) / 60).toFixed(1)] : null;
    }).filter(Boolean);
    empty = "No meetings in this range.";
  }
  lastReportExport = { filename: REPORT_TYPES[type].label, heads, rows };

  const canExport = can("data.export");
  const htmlRows = rows.map((r) => r.map((c) => escapeHtml(String(c))));
  return `
    <div class="reports-hero">
      <div class="reports-hero-text">
        <h2>Reports</h2>
        <p><span class="live-dot" aria-hidden="true"></span>Totals reflect real meetings in the selected range</p>
      </div>
      <label class="report-field">Range<select id="reportsRangeSelect">${Object.entries(REPORT_RANGES).map(([k, v]) => `<option value="${k}"${k === range ? " selected" : ""}>${escapeHtml(v)}</option>`).join("")}</select></label>
    </div>
    <div class="kpi-grid" id="reportsKpis">${reportsKpiCard("Total meetings", total, thisWeek.length, lastWeek.length, dailyCounts(all, 7, (l) => l.length))
    }${reportsKpiCard("Completed", completed, completedThis, completedLast, dailyCounts(all, 7, (l) => l.filter((m) => m.status === "Ended").length))
    }${reportsKpiCard("Cancelled", cancelled, cancelledThis, cancelledLast, dailyCounts(all, 7, (l) => l.filter((m) => m.status === "Cancelled").length))
    }${reportsKpiCard("Cancellation rate", rate, rateThis, rateLast, dailyCounts(all, 7, (l) => (l.length ? Math.round((l.filter((m) => m.status === "Cancelled").length / l.length) * 100) : 0)))}</div>
    <div class="reports-toolbar">
      <label class="report-field">Report<select id="reportsTypeSelect">${Object.entries(REPORT_TYPES).map(([k, v]) => `<option value="${k}"${k === type ? " selected" : ""}>${escapeHtml(v.label)}</option>`).join("")}</select></label>
      <button type="button" class="btn btn-outline btn-sm" id="reportsExportBtn"${canExport ? "" : ' data-perm="data.export" data-perm-mode="lock" data-perm-tip="Your role cannot export data."'}><i class="bi bi-download"></i> Export CSV</button>
    </div>
    <div class="report-card">
      <div class="report-card-head">
        <h3>${escapeHtml(REPORT_TYPES[type].label)}</h3>
        <span class="report-card-meta">${escapeHtml(REPORT_RANGES[range])} · ${rows.length} row${rows.length === 1 ? "" : "s"}</span>
      </div>
      <div class="report-note"><i class="bi bi-info-circle"></i><span>${escapeHtml(REPORT_TYPES[type].note)}</span></div>
      ${pageTable(heads, htmlRows, empty)}
    </div>
  `;
}
function exportReportsCsv() {
  if (!authorize("data.export") || !lastReportExport) return;
  const { filename, heads, rows } = lastReportExport;
  const csv = [heads, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${filename.replace(/[^\w-]+/g, "_")}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Report exported.");
}
function initAnalyticsReports() {
  on(document, "click", (e) => { // the sidebar tabs live outside #pageBody, so this listens app-wide
    const tabBtn = e.target.closest("[data-analytics-tab]");
    if (tabBtn) { state.analyticsTab = tabBtn.getAttribute("data-analytics-tab"); renderRoute(); }
  });
  on($("#pageBody"), "click", (e) => {
    if (e.target.closest("#reportsExportBtn")) exportReportsCsv();
  });
  on($("#pageBody"), "change", (e) => {
    if (e.target.id === "reportsTypeSelect") { state.reportsType = e.target.value; renderRoute(); }
    else if (e.target.id === "reportsRangeSelect") { state.reportsRange = e.target.value; renderRoute(); }
  });
}
function pageAdminUsers() {
  return `<div class="kpi-grid">${kpi("Users", USERS.length)}${kpi("Locations", Object.keys(LOCATIONS).length)}${kpi("Teams", Object.keys(TEAMS).length)}</div>`
    + pageTable(["Name", "Role", "Location", "Team", "Reports to", "Email"], USERS.map((u) => [userCell(u), roleTag(u), locName(u.locationId), escapeHtml(TEAM_LABELS[u.teamId] || "—"), escapeHtml((userById(u.managerId) || {}).name || "—"), escapeHtml(u.email)]));
}
function pageAdminRoles() {
  const roles = Object.keys(ROLES), label = { all: "All", location: "Location", team: "Team", own: "Own", assigned: "Assigned", invited: "Invited", shared: "Shared", delegated: "Delegated", self: "Self", open: "Open" };
  const cell = (perm, role) => { const s = PERMISSIONS[perm][role]; return s.length ? `<span class="perm-yes">${s.map((x) => label[x] || x).join(", ")}</span>` : '<span class="perm-no">—</span>'; };
  return pageTable(["Permission", ...roles.map((r) => escapeHtml(ROLES[r].short))], Object.keys(PERMISSIONS).map((p) => [`<code>${p}</code>`, ...roles.map((r) => cell(p, r))]));
}
function pageAdminLocations() {
  const all = ["upcoming", "ongoing", "invited", "past"].flatMap((k) => state.meetings[k]);
  return pageTable(["Location", "Users", "Teams", "Meetings", "Recordings"], Object.values(LOCATIONS).map((l) => [escapeHtml(l.name), USERS.filter((u) => u.locationId === l.id).length, Object.values(TEAMS).filter((t) => t.locationId === l.id).length, all.filter((m) => m.locationId === l.id).length, state.recordings.filter((r) => r.locationId === l.id).length]));
}
function teamRows(list) {
  const all = ["upcoming", "ongoing", "invited", "past"].flatMap((k) => state.meetings[k]);
  return list.map((t) => [escapeHtml(t.name), locName(t.locationId), escapeHtml((userById(t.managerId) || {}).name || "—"), escapeHtml(teamAgents(t.id).map((a) => a.name).join(", ") || "—"), all.filter((m) => m.team === t.id).length]);
}
const TEAM_HEADS = ["Team", "Location", "Manager", "Agents", "Meetings"];
function pageAdminTeams() { return pageTable(TEAM_HEADS, teamRows(Object.values(TEAMS))); }
function settingsRows(scope) {
  return [["Waiting room", "On"], ["Who can join", "Invited participants only"], ["Participants may share screen", "Off (moderators only)"], ["Recording retention", "90 days"], ["Transcripts", "Generated after a recorded meeting"], ["Scope", scope]].map((r) => [escapeHtml(r[0]), escapeHtml(r[1])]);
}
function pageSystemSettings() { return pageTable(["Setting", "Value"], settingsRows("The whole system")); }
function pageLocationUsers() { return pageTable(["Name", "Role", "Location", "Team", "Reports to", "Email"], visibleUsers().map((u) => [userCell(u), roleTag(u), locName(u.locationId), escapeHtml(TEAM_LABELS[u.teamId] || "—"), escapeHtml((userById(u.managerId) || {}).name || "—"), escapeHtml(u.email)])); }
function pageLocationTeams() { return pageTable(TEAM_HEADS, teamRows(Object.values(TEAMS).filter((t) => can("location.teams", t)))); }
function pageLocationSettings() { return pageTable(["Setting", "Value"], settingsRows(ME.locationId ? `Location: ${locName(ME.locationId)}` : "All locations")); }

/* ---- transcripts ---- */
const TRANSCRIPT_LINES = ["Thanks everyone for joining.", "Let's start with a quick recap of where we left off.", "The client asked for a follow-up on the onboarding steps.", "We agreed to share the recording once the call ends.", "Action item: send the summary by end of day.", "Any questions before we wrap up?", "That covers everything. Thanks, all."];
function openTranscript(subject) { // subject = the recording (or the meeting) the transcript belongs to
  if (!subject || !authorize("transcript.view", subject)) return;
  const title = subject.name || subject.title;
  const ids = [...new Set([subject.ownerId || subject.hostId, ...(subject.sharedWith || subject.participants || [])])].filter(Boolean);
  const speakers = ids.map(userById).filter(Boolean);
  $("#transcriptTitle").textContent = `Transcript · ${title}`;
  $("#transcriptMeta").textContent = `${speakers.length} speaker${speakers.length === 1 ? "" : "s"} · ${TRANSCRIPT_LINES.length} lines`;
  $("#transcriptLines").innerHTML = TRANSCRIPT_LINES.map((t, i) => `<div class="transcript-line"><span class="transcript-time">${formatMMSS(i * 47)}</span><strong>${escapeHtml((speakers[i % Math.max(1, speakers.length)] || ME).name)}</strong><span>${escapeHtml(t)}</span></div>`).join("");
  openModal("transcriptOverlay");
}

/* ============================================================
   3. TOASTS
   ============================================================ */
// A toast never piles up: a message in the same group (the same text, or the same "Label: value" / "Switched to …" family, or an explicit group) updates the
// toast already on screen (short "bump", timer restarted) instead of adding another; at most TOAST_MAX are shown (the oldest goes first) and each fades out on its own.
const TOAST_MAX = 3;
function toast(message, type, group) {
  type = type || "success";
  const container = $("#toastContainer");
  const family = group || (message.includes(": ") ? message.split(": ")[0] : /^Switched to /.test(message) ? "role" : "");
  const key = family ? `group|${family}` : `${type}|${message}`;
  const showFor = type === "error" ? 4800 : 3400;
  const arm = (t) => { clearTimeout(t._timer); t._timer = setTimeout(() => dismissToast(t), showFor); };
  const same = [...container.children].find((t) => t.dataset.key === key && !t.dataset.leaving);
  const iconSvg = type === "error"
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const fill = (t) => { t.className = "toast " + type; t.setAttribute("role", type === "error" ? "alert" : "status"); t.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`; };
  if (same) {                                            // new wording (or type) goes into the same toast
    fill(same); void same.offsetWidth; same.classList.add("toast-bump");
    arm(same);
    return;
  }
  const el = document.createElement("div");
  el.dataset.key = key;
  fill(el);
  container.appendChild(el);
  arm(el);
  const showing = [...container.children].filter((t) => !t.dataset.leaving);
  showing.slice(0, Math.max(0, showing.length - TOAST_MAX)).forEach(dismissToast);
}
function dismissToast(t) {
  if (!t || t.dataset.leaving) return;
  t.dataset.leaving = "1";
  clearTimeout(t._timer);
  t.style.opacity = "0"; t.style.transition = "opacity .2s ease";
  setTimeout(() => t.remove(), 220);
}

/* ============================================================
   4. MODAL HELPERS
   ============================================================ */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("open")));
}
function closeModal(id) {
  if (id === "startModalOverlay") { stopLobbyCamera(); fxAudio.stop(); resetMicTest(); clearDeviceTestTimers(); deviceTest.phase = "idle"; deviceTest.current = -1; deviceTest.results = {}; }
  const el = document.getElementById(id);
  if (!el || el.hidden || !el.classList.contains("open")) { if (el) el.hidden = true; return; }
  el.classList.remove("open");
  setTimeout(() => { el.hidden = true; }, 180);
}
function closeAllPopovers() {
  $$(".popover.open").forEach((p) => p.classList.remove("open"));
  $$('.toolbar-popover-wrap > [aria-expanded="true"]').forEach((b) => b.setAttribute("aria-expanded", "false"));
}
let contextMenuAnchor = null;
// The menu's natural (unclamped) size only depends on its current items, not on where the anchor is on screen - so
// it's measured once per open and reused, instead of re-forcing layout on every open.
let contextMenuNaturalHeight = 0, contextMenuWidth = 0, contextMenuOpenBelow = true, contextMenuOpenedAt = 0;
function positionContextMenu(recalcSide) {
  if (!contextMenuAnchor) return;
  const menu = $("#meetingActionMenu");
  const k = uiScale(), margin = 8 * k;
  const rect = contextMenuAnchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const preferredMax = 180 * k; // ~4-5 rows by design (matches the 11.25rem in style.css)
  if (recalcSide) contextMenuOpenBelow = spaceBelow >= contextMenuNaturalHeight || spaceBelow >= spaceAbove;
  const openBelow = contextMenuOpenBelow;
  const available = Math.max(140, openBelow ? spaceBelow : spaceAbove);
  const menuHeight = Math.min(contextMenuNaturalHeight, available, preferredMax);
  menu.style.maxHeight = menuHeight + "px";
  let top = openBelow ? rect.bottom + 6 * k : rect.top - menuHeight - 6 * k;
  top = Math.max(margin, Math.min(top, window.innerHeight - menuHeight - margin));
  let left = rect.right - contextMenuWidth;
  left = Math.max(margin, Math.min(left, window.innerWidth - contextMenuWidth - margin));
  menu.style.top = top + "px";
  menu.style.left = left + "px";
}
// Scrolling the PAGE/list behind the menu (any scrollable ancestor of the anchor - capture:true catches it without
// needing to know which one) closes the menu outright rather than trying to follow the row. Scrolling INSIDE the
// menu's own list (it's capped to ~5 rows and scrolls internally for the rest) must NOT count as that - it's the
// menu's own content, not the page moving - so a scroll whose target is the menu itself is explicitly ignored.
// The brief grace window on top of that ignores a scroll that's an incidental side effect of the very click that
// opened the menu (e.g. the browser auto-scrolling a partially-off-screen row into view).
document.addEventListener("scroll", (e) => {
  if (!contextMenuAnchor) return;
  const menu = $("#meetingActionMenu");
  if (menu.contains(e.target)) return; // scrolling the menu's own list, not the page - leave it open
  if (Date.now() - contextMenuOpenedAt > 150) closeContextMenu();
}, true);
window.addEventListener("resize", () => { if (contextMenuAnchor) positionContextMenu(true); });
function closeContextMenu() {
  if (contextMenuAnchor) contextMenuAnchor.classList.remove("active");
  contextMenuAnchor = null;
  const m = $("#meetingActionMenu");
  if (m.hidden || !m.classList.contains("open")) { m.hidden = true; return; }
  m.classList.remove("open");
  setTimeout(() => { m.hidden = true; }, 130);
}

document.addEventListener("click", (e) => {
  $$('[data-close-modal]').forEach((btn) => {
    if (btn === e.target || btn.contains(e.target)) closeModal(btn.getAttribute("data-close-modal"));
  });
});
// click outside modal content closes it
$$(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(overlay.id); });
});
// Escape inside an open dropdown (e.g. the video adjustments) closes just that dropdown, not the whole popup
let escInDropdown = false;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") escInDropdown = !!$(".modal-overlay:not(#liveModalOverlay):not([hidden]) .dropdown-menu.show"); }, true);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (escInDropdown) { escInDropdown = false; return; }
    $$(".modal-overlay").forEach((o) => { if (!o.hidden && o.id !== "liveModalOverlay") closeModal(o.id); });
    closeContextMenu();
    closeAllPopovers();
    $(".notif-dropdown")?.classList.remove("open");
  }
});

/* ============================================================
   5. DARK MODE / CLOCK / DUTY TIMER
   ============================================================ */
/* ONE theme for the whole app: html[data-theme="dark"], saved as THEME_KEY. The navbar button and the meeting-room header button both go through applyTheme();
   the meeting room (its colours are tokens in style.css) just follows it. */
const isDarkTheme = () => document.documentElement.getAttribute("data-theme") === "dark";
let themeFxTimer = 0;
function applyTheme(dark, animate = true) {
  const root = document.documentElement;
  if (animate) { root.classList.add("theme-switching"); clearTimeout(themeFxTimer); themeFxTimer = setTimeout(() => root.classList.remove("theme-switching"), 320); } // colours glide for a moment (CSS: theme-switching)
  if (dark) root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
  syncThemeUi();
}
function syncThemeUi() { // what Bootstrap's components inside the room, the header switch and the whiteboard ink need to know
  const dark = isDarkTheme(), room = $("#liveRoom"), btn = $("#liveThemeBtn");
  if (room) room.setAttribute("data-bs-theme", dark ? "dark" : "light");
  if (btn) { const next = dark ? "Switch to light mode" : "Switch to dark mode"; btn.setAttribute("aria-checked", String(dark)); btn.title = next; btn.setAttribute("aria-label", next); }
  if (live.wb && live.wb.open) wbRedraw();
}
function initDarkMode() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage unavailable */ }
  applyTheme(saved === "dark", false);
  const toggle = () => { const dark = !isDarkTheme(); applyTheme(dark); try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch { /* storage unavailable */ } };
  on($("#darkModeToggle"), "click", toggle);
  on($("#liveThemeBtn"), "click", toggle);
  window.addEventListener("storage", (e) => { if (e.key === THEME_KEY) applyTheme(e.newValue === "dark"); }); // the other tab (launcher / meeting) changed it
}

function initClock() {
  function tick() {
    const now = new Date();
    $("#liveClock").textContent = now.toLocaleTimeString("en-GB", { hour12: false });
  }
  tick();
  setInterval(tick, 1000);
}

let dutyState = "off";
let dutyStartTs = Date.now();
function initDutyTimer() {
  const pill = $("#statusPill");
  on(pill, "click", () => {
    dutyState = dutyState === "off" ? "on" : "off";
    dutyStartTs = Date.now();
    renderDutyPill();
  });
  function tick() {
    const elapsed = Math.floor((Date.now() - dutyStartTs) / 1000);
    $("#dutyTimer").textContent = formatMMSS(elapsed);
  }
  tick();
  setInterval(tick, 1000);
}
function renderDutyPill() {
  const dot = $("#statusPill .status-dot");
  const label = $("#statusPill span:nth-child(2)");
  if (dutyState === "on") { dot.classList.remove("off"); dot.style.background = "var(--green-500)"; label.textContent = "On duty"; }
  else { dot.classList.add("off"); dot.style.background = ""; label.textContent = "Off duty"; }
}

/* ============================================================
   6. NAVIGATION: ICON RAIL / SIDEBAR
   ============================================================ */
function initSidebarNav() {
  $$(".sidebar-item[data-view]").forEach((btn) => {
    on(btn, "click", () => switchSidebarView(btn.getAttribute("data-view")));
  });
  $$(".sidebar-subitem[data-view]").forEach((btn) => {
    on(btn, "click", () => switchSidebarView(btn.getAttribute("data-view")));
  });
  const recToggle = $("#recordingsToggle");
  on(recToggle, "click", () => {
    const expanded = recToggle.getAttribute("aria-expanded") === "true";
    recToggle.setAttribute("aria-expanded", String(!expanded));
    $("#recordingsSublist").classList.toggle("expanded", !expanded);
  });
  $$(".rail-item").forEach((r) => on(r, "click", (e) => {
    e.preventDefault();
    const k = r.getAttribute("data-rail");
    const page = { phone: "dialer", tasks: "tasks", video: "video" }[k];
    if (page) { if (window.UCAAS_goto) UCAAS_goto("interactions/" + page); else if (page !== "video") location.href = "../" + page + (page === "dialer" ? "/dialer.html" : "/index.html"); }
  }));
  /* inside UCAAS: tell the host where the rail ends (so the dialer opens beside it) and which rail item to highlight */
  if (window.parent !== window) {
    const sendRailBox = () => { const b = $(".icon-rail").getBoundingClientRect(); window.parent.postMessage({ ucaas: "rail-box", right: b.right, bottom: b.bottom, stacked: b.width > b.height }, "*"); };
    sendRailBox(); window.addEventListener("resize", sendRailBox);
    window.addEventListener("message", (e) => {
      const m = e.data;
      if (m && m.ucaas === "rail") $$(".rail-item").forEach((r) => r.classList.toggle("active", r.getAttribute("data-rail") === m.active));
    });
  }
}

const VIEW_SECTIONS = {
  upcoming: "view-upcoming", ongoing: "view-ongoing", invited: "view-invited",
  past: "view-past", "rec-all": "view-recordings", "rec-mine": "view-recordings", "rec-shared": "view-recordings",
};
function switchSidebarView(view) {
  state.sidebarView = view;
  const sectionId = VIEW_SECTIONS[view];
  $$("[data-view-section]").forEach((sec) => { sec.hidden = sec.id !== sectionId; });
  $("#mainContent").scrollTop = 0; // main content is its own scroller (the page never scrolls), so a new view starts at the top

  $$(".sidebar-item[data-view]").forEach((btn) => btn.classList.toggle("active", btn.getAttribute("data-view") === view));
  $$(".sidebar-subitem[data-view]").forEach((btn) => btn.classList.toggle("active", btn.getAttribute("data-view") === view));

  if (view.startsWith("rec-")) {
    state.recordingsSubView = view;
    const titles = { "rec-all": "All Recordings", "rec-mine": "My Recordings", "rec-shared": "Shared with me" };
    $("#recordingsTitle").textContent = titles[view];
    renderRecordings();
  } else if (view === "upcoming") renderUpcoming();
  else if (view === "ongoing") renderOngoing();
  else if (view === "invited") renderInvited();
  else if (view === "past") renderPast();
}

// The page itself never scrolls (the main content is its own scroller), so with nothing focused - or focus parked on a nav button - browsers no longer
// turn the scroll keys into a page scroll. Hand exactly those key presses to the main content; everything else keeps its native behaviour.
function initMainKeyboardScroll() {
  const main = $("#mainContent");
  const overflows = (el) => !!el && el.scrollHeight > el.clientHeight + 1;
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if ($$(".modal-overlay").some((o) => !o.hidden)) return; // dialogs and the live room own the keyboard
    const el = document.activeElement;
    if (el && el !== document.body) {
      if (main.contains(el) || el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return; // the browser already scrolls / edits
      if (!["PageUp", "PageDown", "Home", "End"].includes(e.key)) return; // Space and the arrows belong to the focused control
      if (overflows(el.closest(".sidebar-body, .icon-rail"))) return; // that list scrolls itself
    }
    const page = main.clientHeight * 0.9;
    let top;
    switch (e.key) {
      case "PageDown": top = main.scrollTop + page; break;
      case "PageUp": top = main.scrollTop - page; break;
      case " ": top = main.scrollTop + (e.shiftKey ? -page : page); break;
      case "ArrowDown": top = main.scrollTop + 60; break;
      case "ArrowUp": top = main.scrollTop - 60; break;
      case "Home": top = 0; break;
      case "End": top = main.scrollHeight; break;
      default: return;
    }
    e.preventDefault();
    main.scrollTo({ top });
  });
}

/* ============================================================
   7. RENDER: MEETING CARDS
   ============================================================ */
function memberGuestLine(m) {
  const membersCount = m.participants.length + 1;
  return `${membersCount} member${membersCount === 1 ? "" : "s"} • ${m.guests.length} guest${m.guests.length === 1 ? "" : "s"}`;
}
function statusClass(status) { return "status-" + status.replace(/\s+/g, ""); }

function meetingCardHTML(m, listKey) {
  const badge = formatDateBadge(m.date);
  const host = userById(m.hostId);
  const recurringChip = m.recurring !== "Does not repeat"
    ? `<span class="recurring-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>${m.recurring}</span>`
    : "";
  const liveDot = m.status === "Live" ? '<span class="live-dot-sm"></span>' : "";
  const cardStatus = listKey === "upcoming" && m.status === "Invited" ? "Upcoming" : m.status; // an invitation this user accepted is one of their upcoming meetings

  let actionsHTML = "";
  if (listKey === "upcoming") {
    const joinBtn = m.status === "Cancelled"
      ? `<button class="btn btn-outline btn-sm" disabled>Cancelled</button>`
      : `<button class="btn btn-primary btn-sm" data-action="join" data-id="${m.id}" data-list="${listKey}">Join</button>`;
    actionsHTML = `
      ${joinBtn}
      <button class="icon-menu-btn" data-action="menu" data-id="${m.id}" data-list="${listKey}" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>`;
  } else if (listKey === "ongoing") {
    actionsHTML = `
      <button class="btn btn-primary btn-sm" data-action="join" data-id="${m.id}" data-list="${listKey}">Join</button>
      <button class="btn btn-outline btn-sm" data-action="view" data-id="${m.id}" data-list="${listKey}">View</button>
      <button class="icon-menu-btn" data-action="menu" data-id="${m.id}" data-list="${listKey}" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>`;
  } else if (listKey === "invited") {
    actionsHTML = `
      <button class="btn btn-primary btn-sm" data-action="join" data-id="${m.id}" data-list="${listKey}">Join</button>
      <button class="btn btn-outline btn-sm" data-action="accept" data-id="${m.id}" data-list="${listKey}">Accept</button>
      <button class="btn btn-ghost btn-sm" data-action="decline" data-id="${m.id}" data-list="${listKey}">Decline</button>
      <button class="icon-menu-btn" data-action="menu" data-id="${m.id}" data-list="${listKey}" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>`;
  } else if (listKey === "past") {
    actionsHTML = `
      <button class="icon-menu-btn" data-action="menu" data-id="${m.id}" data-list="${listKey}" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>`;
  }

  const subRowExtra = listKey === "past" ? `<span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${m.chatCount || 0} chat messages</span>` : "";
  const isOngoing = listKey === "ongoing";
  // Ongoing gets its own live elapsed readout (ticked in place every second, see tickOngoingTimers) and the same avatar row the calendar cards use
  const elapsedBadge = isOngoing ? `<span class="live-elapsed-badge" data-live-elapsed="${m.id}" title="Time elapsed">00:00:00</span>` : "";

  return `
  <div class="meeting-card${isOngoing ? " meeting-card-live" : ""}" data-card-id="${m.id}" data-card-list="${listKey}">
    <div class="date-badge"><span class="month">${badge.month}</span><span class="day">${badge.day}</span></div>
    <div class="meeting-main">
      <div class="meeting-title-row">
        <h4>${escapeHtml(m.title)}</h4>
        <span class="status-chip ${statusClass(cardStatus)}">${liveDot}${cardStatus}</span>
        ${recurringChip}
        ${elapsedBadge}
      </div>
      <div class="meeting-meta-row">
        <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${formatTimeRange(m)}</span>
        <span>${formatDurationLabel(m.duration)}</span>
        <span>Host: ${host ? host.name : "—"}</span>
      </div>
      <div class="meeting-sub-row">
        <span>${memberGuestLine(m)}</span>
        <span>${m.meetingType}</span>
        ${subRowExtra}
        ${isOngoing ? cardAvatarsHTML(m) : ""}
      </div>
    </div>
    <div class="meeting-actions">${actionsHTML}</div>
  </div>`;
}

// avatar initials for a card: host + participants, first 3 shown, the rest collapsed into a "+N" chip (same look as .avatar-stack elsewhere)
function cardAvatarsHTML(m) {
  const people = [...new Set([m.hostId, ...m.participants])].map(userById).filter(Boolean);
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;
  return `<div class="avatar-stack">${shown.map((u) => `<span class="mini-avatar" title="${escapeHtml(u.name)}">${u.initials}</span>`).join("")}${extra > 0 ? `<span class="mini-avatar">+${extra}</span>` : ""}</div>`;
}
// Calendar View's card presentation of a meeting (compact grid, left status accent, avatars, Join/Start + View Details) — reuses the same
// data-action delegation as the list view (join/view/menu), so RBAC, the context menu and every handler behave identically to List View.
function calendarCardHTML(m) {
  const disabled = m.status === "Cancelled";
  const joinLabel = m.hostId === ME.id ? "Start" : "Join";
  const joinBtn = disabled
    ? `<button class="btn btn-outline btn-sm" disabled>Cancelled</button>`
    : `<button class="btn btn-primary btn-sm" data-action="join" data-id="${m.id}" data-list="upcoming"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>${joinLabel}</button>`;
  return `
  <div class="cal-card" data-cal-status="${m.status.replace(/\s+/g, "")}" data-card-id="${m.id}" data-card-list="upcoming">
    <div class="cal-card-top">
      <div class="cal-card-time"><span>${to12h(m.startTime)}</span><span>${to12h(addMinutesToTime(m.startTime, m.duration))}</span></div>
      <button class="icon-menu-btn" data-action="menu" data-id="${m.id}" data-list="upcoming" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
    </div>
    <h4 class="cal-card-title">${escapeHtml(m.title)}</h4>
    <span class="status-chip ${statusClass(m.status)}">${m.status}</span>
    ${m.description ? `<p class="cal-card-desc">${escapeHtml(m.description)}</p>` : ""}
    ${cardAvatarsHTML(m)}
    <div class="cal-card-actions">
      ${joinBtn}
      <button class="btn btn-outline btn-sm" data-action="view" data-id="${m.id}" data-list="upcoming">View Details</button>
    </div>
  </div>`;
}

// Ongoing's Compact View: small grid tiles, same visual language as Calendar View's cards, with the live elapsed readout and Join/View actions
function ongoingCompactCardHTML(m) {
  return `
  <div class="cal-card meeting-card-live" data-cal-status="Live" data-card-id="${m.id}" data-card-list="ongoing">
    <div class="cal-card-top">
      <span class="status-chip ${statusClass(m.status)}"><span class="live-dot-sm"></span>${m.status}</span>
      <span class="live-elapsed-badge" data-live-elapsed="${m.id}" title="Time elapsed">00:00:00</span>
      <button class="icon-menu-btn" data-action="menu" data-id="${m.id}" data-list="ongoing" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
    </div>
    <h4 class="cal-card-title">${escapeHtml(m.title)}</h4>
    <p class="cal-card-desc">${formatTimeRange(m)} • Host: ${escapeHtml((userById(m.hostId) || {}).name || "—")}</p>
    ${cardAvatarsHTML(m)}
    <div class="cal-card-actions">
      <button class="btn btn-primary btn-sm" data-action="join" data-id="${m.id}" data-list="ongoing">Join</button>
      <button class="btn btn-outline btn-sm" data-action="view" data-id="${m.id}" data-list="ongoing">View</button>
    </div>
  </div>`;
}
// Calendar View's compact row presentation (the List half of the selected date's own Card/List switch) — same delegation as the card, just a
// horizontal row instead of a tile; "View Details" lives in the ⋮ menu here to keep the row narrow, exactly as the compact mock calls for.
function calendarRowHTML(m) {
  const disabled = m.status === "Cancelled";
  const joinLabel = m.hostId === ME.id ? "Start" : "Join";
  const joinBtn = disabled
    ? `<button class="btn btn-outline btn-sm" disabled>Cancelled</button>`
    : `<button class="btn btn-primary btn-sm" data-action="join" data-id="${m.id}" data-list="upcoming">${joinLabel}</button>`;
  return `
  <div class="cal-row" data-cal-status="${m.status.replace(/\s+/g, "")}" data-card-id="${m.id}" data-card-list="upcoming">
    <div class="cal-row-time"><span>${to12h(m.startTime)}</span><span>${to12h(addMinutesToTime(m.startTime, m.duration))}</span></div>
    <div class="cal-row-main">
      <div class="cal-row-top"><h4>${escapeHtml(m.title)}</h4><span class="status-chip ${statusClass(m.status)}">${m.status}</span></div>
      <div class="cal-row-bottom">${m.description ? `<span class="cal-row-desc">${escapeHtml(m.description)}</span>` : ""}${cardAvatarsHTML(m)}</div>
    </div>
    <div class="cal-row-actions">
      ${joinBtn}
      <button class="icon-menu-btn" data-action="menu" data-id="${m.id}" data-list="upcoming" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
    </div>
  </div>`;
}

function renderListInto(container, meetings, listKey, emptyTitle, emptyDesc) {
  if (!meetings.length) {
    container.innerHTML = `<div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <h4>${emptyTitle}</h4><p>${emptyDesc}</p></div>`;
    return;
  }
  container.innerHTML = meetings.map((m) => meetingCardHTML(m, listKey)).join("");
}

/* ---- filtering/sorting for upcoming ---- */
/* ---- hierarchical Location -> Manager -> Agent filter, shared by Upcoming and Ongoing (each keeps its own applied state + draft popover) ---- */
const filtersFor = (listKey) => (listKey === "ongoing" ? state.ongoingFilters : state.filters);
function hierarchyDefaults() { // the baseline "nothing selected" state - for a scoped role that already means "my own location/team", never truly everyone
  if (ME.role === "location_admin") return { location: ME.locationId, manager: "all", agent: "all" };
  if (ME.role === "manager") return { location: ME.locationId, manager: ME.id, agent: "all" };
  return { location: "all", manager: "all", agent: "all" };
}
const hierarchyLocationOptions = () => (ME.role === "admin" ? Object.values(LOCATIONS) : [LOCATIONS[ME.locationId]].filter(Boolean));
const hierarchyManagerOptions = (locationId) => visibleUsers().filter((u) => u.role === "manager" && (locationId === "all" || u.locationId === locationId));
const hierarchyAgentOptions = (locationId, managerId) => visibleUsers().filter((u) => u.role === "agent" && (locationId === "all" || u.locationId === locationId) && (managerId === "all" || u.managerId === managerId));
// a meeting "belongs to" a manager if it's theirs to run (their team, or they host it) / an agent if it's assigned to or attended by them
function applyHierarchyFilter(list, listKey) {
  const f = filtersFor(listKey);
  if (f.location !== "all") list = list.filter((m) => m.locationId === f.location);
  if (f.manager !== "all") { const teamIds = managedTeamIds(userById(f.manager) || {}); list = list.filter((m) => m.hostId === f.manager || teamIds.includes(m.team)); }
  if (f.agent !== "all") list = list.filter((m) => m.hostId === f.agent || (m.assignedTo || []).includes(f.agent) || (m.participants || []).includes(f.agent));
  return list;
}
const FILTER_UI = {
  upcoming: { btn: "filterBtn", label: "filterBtnLabel", pop: "filterPopover", loc: "filterLocation", locGroup: "filterLocationGroup", mgr: "filterManager", agt: "filterAgent", apply: "filterApply", clear: "filterReset", chips: "filterChips", render: () => renderUpcoming() },
  ongoing: { btn: "filterBtnOngoing", label: "filterBtnLabelOngoing", pop: "filterPopoverOngoing", loc: "filterLocationOngoing", locGroup: "filterLocationGroupOngoing", mgr: "filterManagerOngoing", agt: "filterAgentOngoing", apply: "filterApplyOngoing", clear: "filterResetOngoing", chips: "filterChipsOngoing", render: () => renderOngoing() },
};
function populateFilterSelect(sel, options, allLabel, value) {
  sel.innerHTML = `<option value="all">${allLabel}</option>` + options.map((u) => `<option value="${u.id}">${escapeHtml(u.label || u.name)}</option>`).join("");
  sel.value = value !== "all" && options.some((u) => u.id === value) ? value : "all";
}
function syncFilterPopover(listKey) {
  const ui = FILTER_UI[listKey], f = filtersFor(listKey);
  const locSel = $("#" + ui.loc), mgrSel = $("#" + ui.mgr), agtSel = $("#" + ui.agt);
  const locOptions = hierarchyLocationOptions();
  locSel.innerHTML = (ME.role === "admin" ? '<option value="all">All Locations</option>' : "") + locOptions.map((l) => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join("");
  locSel.value = locOptions.some((l) => l.id === f.location) ? f.location : "all";
  locSel.disabled = ME.role !== "admin"; // Location Admin/Manager: pinned to their own location, never someone else's
  $("#" + ui.locGroup).hidden = ME.role === "manager"; // a Manager's location is implied by their team - nothing to pick
  if (ME.role === "manager") { mgrSel.innerHTML = `<option value="${ME.id}">${escapeHtml(ME.label)}</option>`; mgrSel.value = ME.id; mgrSel.disabled = true; }
  else { populateFilterSelect(mgrSel, hierarchyManagerOptions(locSel.value), "All Managers", f.manager); mgrSel.disabled = false; }
  populateFilterSelect(agtSel, hierarchyAgentOptions(locSel.value, mgrSel.value), "All Agents", f.agent);
}
const filterChipLabel = (key, id) => (key === "location" ? (LOCATIONS[id] || {}).name : (userById(id) || {}).label) || id;
function renderFilterChips(listKey) {
  const ui = FILTER_UI[listKey], f = filtersFor(listKey), box = $("#" + ui.chips), btnLabel = $("#" + ui.label);
  const active = ["location", "manager", "agent"].filter((k) => f[k] !== "all");
  const baseline = hierarchyDefaults(); // Location Admin/Manager: their own pinned scope never counts as an "active" filter chip
  const shown = active.filter((k) => f[k] !== baseline[k]);
  btnLabel.textContent = shown.length ? `Filter (${shown.length})` : "Filter";
  if (!box) return;
  if (!shown.length) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = shown.map((k) => `<span class="filter-chip">${escapeHtml(filterChipLabel(k, f[k]))}<button type="button" data-chip-remove="${k}" aria-label="Remove ${k} filter">&times;</button></span>`).join("")
    + (shown.length > 1 ? `<button type="button" class="filter-chip-clear" data-chip-clear-all>Clear all</button>` : "");
  $$('[data-chip-remove]', box).forEach((b) => on(b, "click", () => {
    const key = b.getAttribute("data-chip-remove");
    f[key] = baseline[key];
    if (key === "location") { f.manager = baseline.manager; f.agent = baseline.agent; }
    if (key === "manager") f.agent = baseline.agent;
    renderFilterChips(listKey);
    ui.render();
  }));
  const clearAllBtn = $('[data-chip-clear-all]', box);
  if (clearAllBtn) on(clearAllBtn, "click", () => { Object.assign(f, baseline); renderFilterChips(listKey); ui.render(); });
}
function initHierarchyFilter(listKey) {
  const ui = FILTER_UI[listKey];
  on($("#" + ui.btn), "click", (e) => {
    e.stopPropagation();
    const pop = $("#" + ui.pop);
    const wasOpen = pop.classList.contains("open");
    closeAllPopovers(); // always closes THIS popover too, so a second click on the same button must stop here rather than re-toggling it back open
    if (wasOpen) return;
    syncFilterPopover(listKey);
    pop.classList.add("open");
    e.currentTarget.setAttribute("aria-expanded", "true");
  });
  on($("#" + ui.loc), "change", () => {
    populateFilterSelect($("#" + ui.mgr), hierarchyManagerOptions($("#" + ui.loc).value), "All Managers", "all");
    populateFilterSelect($("#" + ui.agt), hierarchyAgentOptions($("#" + ui.loc).value, "all"), "All Agents", "all");
  });
  on($("#" + ui.mgr), "change", () => {
    const locSel = $("#" + ui.loc), mgrSel = $("#" + ui.mgr);
    if (mgrSel.value !== "all" && !locSel.disabled) { const mgr = userById(mgrSel.value); if (mgr) locSel.value = mgr.locationId; }
    populateFilterSelect($("#" + ui.agt), hierarchyAgentOptions(locSel.value, mgrSel.value), "All Agents", "all");
  });
  on($("#" + ui.apply), "click", () => {
    const f = filtersFor(listKey);
    f.location = $("#" + ui.loc).value; f.manager = $("#" + ui.mgr).value; f.agent = $("#" + ui.agt).value;
    closeAllPopovers();
    ui.render();
  });
  on($("#" + ui.clear), "click", () => {
    Object.assign(filtersFor(listKey), hierarchyDefaults());
    syncFilterPopover(listKey); // reflect the reset values in the Location/Manager/Agent selects
    ui.render();
    // Clear only resets the fields - the Filter popup itself stays open, unlike Apply
  });
}

function getFilteredSortedUpcoming() {
  let list = applyHierarchyFilter(visibleMeetings("upcoming"), "upcoming");
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter((m) => m.title.toLowerCase().includes(q) || (userById(m.hostId)?.name || "").toLowerCase().includes(q) || (userById(m.hostId)?.label || "").toLowerCase().includes(q));
  }
  const sortKey = state.sort;
  list.sort((a, b) => {
    if (sortKey === "recent") return b.createdAt - a.createdAt;
    const aT = parseISO(a.date).getTime() + timeToMinutes(a.startTime) * 60000;
    const bT = parseISO(b.date).getTime() + timeToMinutes(b.startTime) * 60000;
    return sortKey === "latest" ? bT - aT : aT - bT;
  });
  return list;
}
function timeToMinutes(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

function renderUpcoming() {
  const visible = visibleMeetings("upcoming");
  const list = getFilteredSortedUpcoming();
  $("#upcomingCount").textContent = `${list.length} Meeting(S)`; // reflects the applied hierarchy filter, not just the raw RBAC-visible count
  $("#upcomingToolbar").hidden = visible.length === 0;
  renderFilterChips("upcoming");
  if (state.listView === "list") {
    $("#upcomingListWrap").hidden = false;
    $("#calendarViewWrap").hidden = true;
    const container = $("#upcomingList");
    if (!visible.length) {
      renderListInto(container, [], "upcoming", "No upcoming meetings!", "Start or schedule a meeting to see it appear here");
    } else if (!list.length) {
      renderListInto(container, [], "upcoming", "No meetings match your filters", "Try adjusting search, filters or sort options.");
    } else {
      renderListInto(container, list, "upcoming");
    }
  } else {
    $("#upcomingListWrap").hidden = true;
    $("#calendarViewWrap").hidden = false;
    renderCalendar();
  }
}
function getFilteredSortedOngoing() {
  let list = applyHierarchyFilter(visibleMeetings("ongoing"), "ongoing");
  if (state.ongoingSearch.trim()) {
    const q = state.ongoingSearch.trim().toLowerCase();
    list = list.filter((m) => m.title.toLowerCase().includes(q) || m.meetingCode.includes(q)
      || (userById(m.hostId)?.name || "").toLowerCase().includes(q) || (userById(m.hostId)?.label || "").toLowerCase().includes(q)
      || m.participants.some((id) => (userById(id)?.name || "").toLowerCase().includes(q)));
  }
  const sortKey = state.ongoingSort;
  list.sort((a, b) => {
    if (sortKey === "name-asc") return a.title.localeCompare(b.title);
    if (sortKey === "name-desc") return b.title.localeCompare(a.title);
    if (sortKey === "participants") return (b.participants.length + 1) - (a.participants.length + 1);
    const aT = a.liveStartedAt || 0, bT = b.liveStartedAt || 0; // "earliest/latest" = how long each has been running
    return sortKey === "time-desc" ? bT - aT : aT - bT;
  });
  return list;
}
function renderOngoing() {
  const visible = visibleMeetings("ongoing");
  const list = getFilteredSortedOngoing();
  $("#ongoingCount").textContent = `${list.length} Meeting(S)`;
  $("#ongoingToolbar").hidden = visible.length === 0;
  renderFilterChips("ongoing");
  const compact = state.ongoingListView === "compact";
  $("#ongoingListWrap").hidden = compact;
  $("#ongoingCompactWrap").hidden = !compact;
  if (!visible.length) {
    const box = `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
      <h4>No ongoing meetings</h4><p>There are currently no live meetings in your permitted scope.</p>
      <button type="button" class="btn btn-outline btn-sm" data-goto-view="upcoming">View Upcoming</button></div>`;
    $("#ongoingList").innerHTML = box; $("#ongoingCompactGrid").innerHTML = box;
  } else if (!list.length) {
    renderListInto($("#ongoingList"), [], "ongoing", "No meetings match your filters", "Try adjusting search or filters.");
    $("#ongoingCompactGrid").innerHTML = `<div class="empty-state"><h4>No meetings match your filters</h4><p>Try adjusting search or filters.</p></div>`;
  } else if (compact) {
    $("#ongoingCompactGrid").innerHTML = `<div class="cal-card-grid">${list.map((m) => ongoingCompactCardHTML(m)).join("")}</div>`;
  } else {
    renderListInto($("#ongoingList"), list, "ongoing");
  }
  tickOngoingTimers();
}
function renderInvited() {
  const list = visibleMeetings("invited");
  $("#invitedCount").textContent = `${list.length} Meeting(S)`;
  renderListInto($("#invitedList"), list, "invited", "No invited meetings", "Meetings you're invited to will appear here.");
}
function renderPast() {
  const list = visibleMeetings("past");
  $("#pastCount").textContent = `${list.length} Meeting(S)`;
  renderListInto($("#pastList"), list, "past", "No past meetings", "Ended meetings will appear here.");
}
// every ongoing meeting's own elapsed-time readout, ticked in place every second - never a full re-render, so the list never jumps or flickers
function tickOngoingTimers() {
  $$('[data-live-elapsed]').forEach((el) => {
    const found = findMeeting(el.getAttribute("data-live-elapsed"));
    if (found) el.textContent = formatMMSS(Math.max(0, Math.floor((Date.now() - (found.meeting.liveStartedAt || Date.now())) / 1000)));
  });
}

/* ============================================================
   8. CALENDAR VIEW
   ============================================================ */
function renderCalendar() {
  const wrap = $("#calendarViewWrap");
  const month = state.calendarMonth;
  const y = month.getFullYear(), m = month.getMonth();
  const monthLabel = month.toLocaleString("en-US", { month: "long", year: "numeric" });
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();
  const trailing = (7 - ((firstDow + daysInMonth) % 7)) % 7;

  const meetingsByDate = {};
  applyHierarchyFilter(visibleMeetings("upcoming"), "upcoming").forEach((mt) => { (meetingsByDate[mt.date] = meetingsByDate[mt.date] || []).push(mt); });

  // a real 7-column month grid: muted, non-interactive lead-in/lead-out days from the adjacent months fill the first/last week, same as any SaaS calendar
  const isoOf = (yy, mm, dd) => `${yy}-${String(mm + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const outsideCell = (yy, mm, dd) => `<div class="calendar-cell outside"><span>${dd}</span></div>`;
  let cells = "";
  for (let i = firstDow - 1; i >= 0; i--) cells += outsideCell(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1, daysInPrevMonth - i);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoOf(y, m, d);
    const isToday = iso === TODAY_ISO;
    const isSelected = state.calendarSelectedDate === iso;
    const dayMeetings = meetingsByDate[iso] || [];
    const dots = dayMeetings.slice(0, 3).map(() => `<span class="calendar-mini-dot"></span>`).join("");
    cells += `<div class="calendar-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}" data-cal-date="${iso}">
      <span>${d}</span><div class="calendar-dot-row">${dots}</div>
    </div>`;
  }
  for (let d = 1; d <= trailing; d++) cells += outsideCell(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1, d);
  const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<div class="calendar-dow">${d}</div>`).join("");

  if (!state.calendarSelectedDate) state.calendarSelectedDate = TODAY_ISO; // so the panel has something to show the first time Calendar View opens
  const dayMeetings = meetingsByDate[state.calendarSelectedDate] || [];
  const cardView = state.calendarCardView !== "list"; // Card View is the default
  const meetingsHTML = !dayMeetings.length
    ? `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><h4>No meetings on this date</h4><p>Pick another date on the calendar to see its meetings here.</p></div>`
    : cardView
      ? `<div class="cal-card-grid">${dayMeetings.map((mt) => calendarCardHTML(mt)).join("")}</div>`
      : `<div class="cal-row-list">${dayMeetings.map((mt) => calendarRowHTML(mt)).join("")}</div>`;

  wrap.innerHTML = `
    <div class="cal-mini">
      <div class="calendar-header">
        <button type="button" data-cal-nav="prev" aria-label="Previous month"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
        <h4>${monthLabel}</h4>
        <button type="button" data-cal-nav="next" aria-label="Next month"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
      <div class="calendar-grid">${dowLabels}${cells}</div>
    </div>
    <div class="cal-cards-panel">
      <div class="cal-cards-header">
        <div>
          <h4>Meetings on ${formatFullDate(state.calendarSelectedDate)}</h4>
          <span class="count-badge">${dayMeetings.length} Meeting(S)</span>
        </div>
        <div class="cal-sub-toggle" role="group" aria-label="Display the selected date's meetings as">
          <button type="button" data-cal-view="card" class="${cardView ? "active" : ""}" aria-pressed="${cardView}" title="Card View" aria-label="Card View">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </button>
          <button type="button" data-cal-view="list" class="${cardView ? "" : "active"}" aria-pressed="${!cardView}" title="List View" aria-label="List View">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>
      ${meetingsHTML}
    </div>
  `;

  $$('[data-cal-nav]', wrap).forEach((btn) => on(btn, "click", () => {
    const dir = btn.getAttribute("data-cal-nav") === "next" ? 1 : -1;
    state.calendarMonth = new Date(y, m + dir, 1);
    renderCalendar();
  }));
  $$('[data-cal-date]', wrap).forEach((cell) => on(cell, "click", () => {
    state.calendarSelectedDate = cell.getAttribute("data-cal-date");
    renderCalendar();
  }));
  $$('[data-cal-view]', wrap).forEach((btn) => on(btn, "click", () => {
    state.calendarCardView = btn.getAttribute("data-cal-view"); // only the selected date's presentation — never touches state.listView
    renderCalendar();
  }));
}

/* ============================================================
   9. TOOLBAR: SEARCH / FILTER / SORT / VIEW TOGGLE
   ============================================================ */
function initUpcomingToolbar() {
  on($("#meetingSearchInput"), "input", (e) => { state.search = e.target.value; renderUpcoming(); });

  on($("#sortBtn"), "click", (e) => {
    e.stopPropagation();
    const wasOpen = $("#sortPopover").classList.contains("open");
    closeAllPopovers();
    if (wasOpen) return;
    $("#sortPopover").classList.add("open");
    e.currentTarget.setAttribute("aria-expanded", "true");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".toolbar-popover-wrap")) closeAllPopovers();
  });
  initHierarchyFilter("upcoming");
  $$('.popover-option[data-sort]').forEach((btn) => on(btn, "click", () => {
    state.sort = btn.getAttribute("data-sort");
    closeAllPopovers();
    renderUpcoming();
  }));
  $$('#upcomingViewToggle .vt-btn').forEach((btn) => on(btn, "click", () => {
    $$('#upcomingViewToggle .vt-btn').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.listView = btn.getAttribute("data-list-view");
    renderUpcoming();
  }));
  document.addEventListener("click", (e) => { if (e.target.closest("[data-goto-view]")) switchSidebarView(e.target.closest("[data-goto-view]").getAttribute("data-goto-view")); });
}
function initOngoingToolbar() {
  on($("#ongoingSearchInput"), "input", (e) => {
    state.ongoingSearch = e.target.value;
    $("#ongoingSearchClear").classList.toggle("d-none", !e.target.value);
    renderOngoing();
  });
  on($("#ongoingSearchClear"), "click", () => { $("#ongoingSearchInput").value = ""; state.ongoingSearch = ""; $("#ongoingSearchClear").classList.add("d-none"); renderOngoing(); });
  on($("#ongoingSortBtn"), "click", (e) => {
    e.stopPropagation();
    const wasOpen = $("#ongoingSortPopover").classList.contains("open");
    closeAllPopovers();
    if (wasOpen) return;
    $("#ongoingSortPopover").classList.add("open");
    e.currentTarget.setAttribute("aria-expanded", "true");
  });
  initHierarchyFilter("ongoing");
  $$('.popover-option[data-ongoing-sort]').forEach((btn) => on(btn, "click", () => {
    state.ongoingSort = btn.getAttribute("data-ongoing-sort");
    closeAllPopovers();
    renderOngoing();
  }));
  $$('#ongoingViewToggle .vt-btn').forEach((btn) => on(btn, "click", () => {
    $$('#ongoingViewToggle .vt-btn').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.ongoingListView = btn.getAttribute("data-ongoing-view");
    renderOngoing();
  }));
  setInterval(tickOngoingTimers, 1000); // each ongoing meeting's own elapsed-time readout, updated in place - never a re-render
}

/* ============================================================
   10. MEETING CARD ACTIONS (event delegation)
   ============================================================ */
function initCardActionDelegation() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    const listKey = btn.getAttribute("data-list");
    if (!id) return;
    const found = findMeeting(id);
    if (!found) return;
    const { meeting } = found;

    if (action === "join") requestJoin(meeting);
    else if (action === "view") openDetailsDrawer(meeting);
    else if (action === "accept") acceptInvite(meeting);
    else if (action === "decline") declineInvite(meeting);
    else if (action === "menu") {
      e.stopPropagation();
      const menu = $("#meetingActionMenu");
      if (!menu.hidden && contextMenuAnchor === btn) closeContextMenu();
      else openContextMenu(btn, meeting, listKey);
    }
  });
}

// updates this one person's entry in the meeting's invitation ledger and lets whoever invited them know how they answered
function setInvitationStatus(meeting, userId, status) {
  meeting.invitations = meeting.invitations || {};
  const prior = meeting.invitations[userId];
  meeting.invitations[userId] = Object.assign({ invitedBy: meeting.hostId, invitedAt: Date.now() }, prior, { status, respondedAt: Date.now() });
  const inviterId = meeting.invitations[userId].invitedBy;
  if (inviterId && inviterId !== userId && (status === "accepted" || status === "declined")) {
    addNotification(inviterId, {
      type: status === "accepted" ? "invitation_accepted" : "invitation_declined", icon: "invite",
      meetingId: meeting.id, title: `${userById(userId)?.name || "Someone"} ${status} your invitation`, text: meeting.title,
    });
  }
}
function acceptInvite(meeting) {
  if (!authorize("meeting.view", meeting)) return;
  (meeting.acceptedBy = meeting.acceptedBy || []).push(ME.id); // per person: everybody else invited keeps their own invitation
  setInvitationStatus(meeting, ME.id, "accepted");
  saveState();
  renderAllViews();
  toast("Meeting invitation accepted.");
}
function declineInvite(meeting) {
  if (!authorize("meeting.view", meeting)) return;
  (meeting.declinedBy = meeting.declinedBy || []).push(ME.id);
  setInvitationStatus(meeting, ME.id, "declined");
  saveState();
  renderAllViews();
  toast("Meeting invitation declined.");
}

/* ============================================================
   11. CONTEXT MENU
   ============================================================ */
const MENU_CONFIG = {
  upcoming: [
    { label: "View Details", action: "view" },
    { label: "Join Meeting", action: "join" },
    { label: "Edit Meeting", action: "edit" },
    { label: "Reschedule", action: "reschedule" },
    { label: "Copy Meeting Link", action: "copy" },
    { label: "Invite Participants", action: "invite" },
    { label: "Duplicate Meeting", action: "duplicate" },
    { sep: true },
    { label: "Cancel Meeting", action: "cancel", danger: true },
    { label: "Delete Meeting", action: "delete", danger: true },
  ],
  ongoing: [
    { label: "View Details", action: "view" },
    { label: "Join Meeting", action: "join" },
    { label: "Copy Meeting Link", action: "copy" },
    { label: "Invite Participants", action: "invite" },
    { label: "Meeting Settings", action: "settings" },
  ],
  invited: [
    { label: "View Details", action: "view" },
    { label: "Join Meeting", action: "join" },
    { label: "Copy Meeting Link", action: "copy" },
  ],
  past: [
    { label: "Info", action: "info" },
    { label: "Invited Members", action: "invited-members" },
    { label: "Attendees", action: "attendees" },
    { label: "Chat", action: "chat" },
    { label: "Copy Meeting Link", action: "copy" },
    { sep: true },
    { label: "Export Meeting Data", action: "export" },
    { label: "Delete Meeting", action: "delete", danger: true },
  ],
};
// what each menu action needs; an entry the role can't use on THIS meeting is simply not offered (Delete, for one, only shows for Admins and for Managers it was explicitly delegated to)
const MENU_PERM = {
  view: "meeting.view", info: "meeting.view", join: "meeting.join", edit: "meeting.edit", reschedule: "meeting.edit", copy: "meeting.view", invite: "meeting.invite",
  duplicate: "meeting.create", cancel: "meeting.cancel", delete: "meeting.delete", export: "data.export", "invited-members": "meeting.view", attendees: "participants.view", chat: "meeting.view",
  settings: "meeting.settings",
};
const MENU_ICONS = {
  view: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  join: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
  edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
  reschedule: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  invite: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  duplicate: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  cancel: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  "invited-members": '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  attendees: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  chat: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  delete: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  export: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  settings: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

function openContextMenu(anchorBtn, meeting, listKey) {
  if (contextMenuAnchor) contextMenuAnchor.classList.remove("active"); // only one row's ⋮ is ever "active" at a time
  contextMenuAnchor = anchorBtn;
  anchorBtn.classList.add("active");
  let menuItems = (MENU_CONFIG[listKey] || []).filter((item) => item.sep || can(MENU_PERM[item.action], meeting)); // only what this role may do with THIS meeting is offered
  if (listKey === "upcoming" && meeting.status === "Cancelled") {
    menuItems = menuItems.filter((item) => item.sep || ["view", "copy", "duplicate", "delete"].includes(item.action));
  }
  menuItems = menuItems.filter((item, i, all) => !item.sep || (i > 0 && !all[i - 1].sep && i < all.length - 1)); // no dangling separators
  const menu = $("#meetingActionMenu");
  menu.innerHTML = menuItems.map((item) => item.sep
    ? '<div class="context-menu-sep"></div>'
    : `<button class="context-menu-item ${item.danger ? "danger" : ""}" data-menu-action="${item.action}">${MENU_ICONS[item.action] || ""}${item.label}</button>`
  ).join("");

  // Smart placement: measure the button and the menu's own natural (unclamped) size, pick above/below by whichever
  // side actually has more room, then clamp both axes into the viewport with an 8px margin - never just "top:100%".
  menu.hidden = false;
  menu.style.maxHeight = "none"; // clear any max-height left over from the last time this menu opened, before measuring
  contextMenuNaturalHeight = menu.scrollHeight;
  contextMenuWidth = menu.offsetWidth;
  contextMenuOpenedAt = Date.now();
  positionContextMenu(true);
  requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("open")));

  $$('[data-menu-action]', menu).forEach((btn) => {
    btn.onclick = () => { closeContextMenu(); handleMenuAction(btn.getAttribute("data-menu-action"), meeting, listKey); };
  });
}

// Single persistent listener (not re-added per open) so closing the menu any
// way other than an outside click never leaves a stale listener behind.
function initContextMenuGlobalClose() {
  document.addEventListener("click", (ev) => {
    const menu = $("#meetingActionMenu");
    if (menu.hidden) return;
    if (menu.contains(ev.target)) return;
    if (ev.target.closest('[data-action="menu"]')) return; // let the delegation handler own open/retarget clicks
    closeContextMenu();
  });
}

function handleMenuAction(action, meeting, listKey) {
  if (!authorize(MENU_PERM[action], meeting)) return;
  switch (action) {
    case "view": case "info": openDetailsDrawer(meeting, "overview"); break;
    case "join": requestJoin(meeting); break;
    case "edit": openScheduleModal("edit", meeting); break;
    case "reschedule": openRescheduleModal(meeting); break;
    case "copy": copyMeetingLink(meeting); break;
    case "invite": openInviteModal(meeting); break;
    case "settings": openDetailsDrawer(meeting, "settings"); break;
    case "duplicate": duplicateMeeting(meeting); break;
    case "cancel": openCancelConfirm(meeting); break;
    case "delete": openDeleteMeetingConfirm(meeting); break;
    case "export": exportMeetingData(meeting); break;
    case "invited-members": openDetailsDrawer(meeting, "participants"); break;
    case "attendees": openDetailsDrawer(meeting, "participants"); break;
    case "chat": toast("Opening chat transcript..."); break;
  }
}

function copyMeetingLink(meeting) {
  const text = meeting.link;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast("Meeting link copied successfully.")).catch(() => toast("Meeting link copied successfully."));
  } else { toast("Meeting link copied successfully."); }
}

/* ============================================================
   12. SCHEDULE MEETING MODAL (create / edit / duplicate)
   ============================================================ */
function populateHostSelect(keepId) {
  const ids = hostCandidates().map((u) => u.id);
  if (keepId && !ids.includes(keepId) && userById(keepId)) ids.push(keepId); // editing a meeting keeps its host even when this user could not pick that person
  $("#fieldHost").innerHTML = ids.map((id) => `<option value="${id}">${escapeHtml(userById(id).name)}</option>`).join("");
}

const SCHEDULE_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const SCHEDULE_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
function populateTimeSelects() {
  $("#fieldTimeHour").innerHTML = SCHEDULE_HOURS.map((h) => `<option value="${h}">${h}</option>`).join("");
  $("#fieldTimeMinute").innerHTML = SCHEDULE_MINUTES.map((m) => `<option value="${m}">${String(m).padStart(2, "0")}</option>`).join("");
}
function setTimeSelectsFrom24h(timeStr) {
  let [h, m] = (timeStr || "10:00").split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  const roundedMin = SCHEDULE_MINUTES.reduce((closest, v) => (Math.abs(v - m) < Math.abs(closest - m) ? v : closest), 0);
  $("#fieldTimeHour").value = String(h12);
  $("#fieldTimeMinute").value = String(roundedMin);
  $("#fieldTimeAmPm").value = ampm;
}
function getTimeSelectsAs24h() {
  let h = Number($("#fieldTimeHour").value);
  const m = Number($("#fieldTimeMinute").value);
  const ampm = $("#fieldTimeAmPm").value;
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function setDurationPill(minutes) {
  $("#fieldDuration").value = String(minutes);
  $$(".duration-pill", $("#durationPills")).forEach((btn) => {
    btn.classList.toggle("active", Number(btn.getAttribute("data-duration")) === Number(minutes));
  });
}

function renderScheduleChips() {
  const hostId = $("#fieldHost").value || ME.id;
  const host = userById(hostId);
  const hostChip = host ? `<span class="chip host-chip" data-chip-id="${host.id}">${host.name}${host.id === ME.id ? " (You)" : ""}<button type="button" id="scheduleHostChipRemove" aria-label="Host">&times;</button></span>` : "";
  const participantChips = state.scheduleForm.participants.map((id) => {
    const u = userById(id);
    return `<span class="chip" data-chip-id="${id}">${u ? u.name : id}<button type="button" data-remove-chip="${id}" data-kind="participants" aria-label="Remove">&times;</button></span>`;
  }).join("");
  const guestChips = state.scheduleForm.guests.map((email) => `<span class="chip guest-chip" data-chip-id="${email}">${escapeHtml(email)}<span class="guest-tag">Guest</span><button type="button" data-remove-chip="${email}" data-kind="guests" aria-label="Remove">&times;</button></span>`).join("");
  $("#scheduleChips").innerHTML = hostChip + participantChips + guestChips;
  const hostRemoveBtn = $("#scheduleHostChipRemove");
  if (hostRemoveBtn) on(hostRemoveBtn, "click", () => toast("The host can't be removed from the meeting.", "error"));
  $$('[data-remove-chip][data-kind="participants"]', $("#scheduleChips")).forEach((btn) => on(btn, "click", () => {
    state.scheduleForm.participants = state.scheduleForm.participants.filter((id) => id !== btn.getAttribute("data-remove-chip"));
    renderScheduleChips();
    toast("Participant removed.");
  }));
  $$('[data-remove-chip][data-kind="guests"]', $("#scheduleChips")).forEach((btn) => on(btn, "click", () => {
    state.scheduleForm.guests = state.scheduleForm.guests.filter((em) => em !== btn.getAttribute("data-remove-chip"));
    renderScheduleChips();
    toast("Participant removed.");
  }));
}

// unambiguous mixed-case charset (no 0/O/1/I/l) so a read-aloud or hand-typed password is never confusing
function genSchedulePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}`;
}
function setSchedulePassword(on, value) {
  $("#fieldPassword").checked = on;
  if (value) $("#fieldPasswordInput").value = value;
  $("#err-fieldPasswordInput").textContent = "";
  bootstrap.Collapse.getOrCreateInstance($("#fieldPasswordFields"), { toggle: false })[on ? "show" : "hide"]();
}

function resetScheduleForm() {
  $("#scheduleForm").reset();
  $$("#scheduleForm select").forEach(mcmSelectRefresh); // native form.reset() bypasses every hook the custom-select trigger relies on to stay in sync
  $("#scheduleMeetingId").value = "";
  populateHostSelect();
  $("#fieldHost").value = ME.id;
  $("#fieldCountry").value = "";
  populateTimeSelects();
  setTimeSelectsFrom24h("10:00");
  setDurationPill(15);
  $("#descriptionCounter").textContent = "0/500";
  state.scheduleForm.participants = [];
  state.scheduleForm.guests = [];
  renderScheduleChips();
  $$(".field-error").forEach((el) => (el.textContent = ""));
  $("#meetingSettingsBody").hidden = true;
  $("#meetingSettingsTrigger").classList.remove("expanded");
  $("#fieldWhoCanJoin").value = "Invited participants only";
  $("#fieldRecurring").value = "Does not repeat";
  $("#fieldWaitingRoom").checked = true;
  $("#fieldAutoRecord").checked = false;
  $("#fieldRecordingAccess").checked = false;
  $("#fieldPasswordInput").value = ""; $("#fieldPasswordInput").type = "password";
  $("#fieldPasswordVisBtn").innerHTML = '<i class="bi bi-eye"></i>';
  setSchedulePassword(false);
  $("#fieldAllowBeforeHost").checked = false;
  $("#fieldReminderToggle").checked = true;
  $("#permMic").checked = true; $("#permCam").checked = true; $("#permScreen").checked = false; $("#permChat").checked = true;
}

function openScheduleModal(mode, meeting) {
  if (mode === "edit" ? !authorize("meeting.edit", meeting) : !authorize("meeting.create")) return;
  state.scheduleMode = mode;
  resetScheduleForm();
  $("#scheduleModalTitle").textContent = mode === "edit" ? "Edit Meeting" : "Schedule New Meeting";
  $("#scheduleModalSubtitle").textContent = mode === "edit" ? "Update your meeting details." : "Set up your meeting details and invite participants.";
  $("#scheduleSubmitBtn").textContent = mode === "edit" ? "Save Changes" : "Schedule Meeting";

  if (meeting) {
    $("#scheduleMeetingId").value = meeting.id;
    $("#fieldTitle").value = meeting.title;
    $("#fieldDescription").value = meeting.description || "";
    $("#descriptionCounter").textContent = `${$("#fieldDescription").value.length}/500`;
    let date = meeting.date, time = meeting.startTime;
    if (mode === "duplicate") {
      const d = parseISO(meeting.date); d.setDate(d.getDate() + 7);
      date = toISO(d);
    }
    $("#fieldDate").value = date;
    setTimeSelectsFrom24h(time);
    setDurationPill(meeting.duration);
    $("#fieldTimezone").value = meeting.timezone;
    const hostId = mode === "edit" || hostCandidates().some((u) => u.id === meeting.hostId) ? meeting.hostId : ME.id; // a copy is hosted by whoever makes it when the original host is outside their scope
    populateHostSelect(hostId);
    $("#fieldHost").value = hostId;
    $("#fieldMeetingType").value = meeting.meetingType;
    $("#fieldRecurring").value = meeting.recurring;
    $("#fieldReminderToggle").checked = Number(meeting.reminder) > 0;
    state.scheduleForm.participants = mode === "edit" ? meeting.participants.slice() : meeting.participants.filter((id) => visibleUsers().some((u) => u.id === id)); // a copy only carries people this user may see
    state.scheduleForm.guests = meeting.guests.map((g) => g.email);
    renderScheduleChips();
    $("#fieldWhoCanJoin").value = meeting.security.whoCanJoin;
    $("#fieldWaitingRoom").checked = meeting.security.waitingRoom;
    $("#fieldAutoRecord").checked = !!meeting.security.autoRecord;
    $("#fieldRecordingAccess").checked = !!meeting.security.recordingAccess;
    setSchedulePassword(!!meeting.security.password, meeting.security.password ? (meeting.security.passwordValue || genSchedulePassword()) : undefined);
    $("#fieldAllowBeforeHost").checked = meeting.security.allowBeforeHost;
    $("#permMic").checked = meeting.security.permMic;
    $("#permCam").checked = meeting.security.permCam;
    $("#permScreen").checked = meeting.security.permScreen;
    $("#permChat").checked = meeting.security.permChat;
    if (mode === "duplicate") $("#scheduleMeetingId").value = "";
  }
  applyRbacDom($("#scheduleModalOverlay"), mode === "edit" ? meeting : undefined); // e.g. the "More Settings" block needs the settings permission
  openModal("scheduleModalOverlay");
}

function renderChips(containerId, items, kind) {
  const container = $("#" + containerId);
  if (kind === "participants") {
    container.innerHTML = items.map((id) => {
      const u = userById(id);
      return `<span class="chip" data-chip-id="${id}">${u ? u.name : id}<button type="button" data-remove-chip="${id}" data-kind="participants" aria-label="Remove">&times;</button></span>`;
    }).join("");
  } else {
    container.innerHTML = items.map((email) => `<span class="chip guest-chip" data-chip-id="${email}">${escapeHtml(email)}<span class="guest-tag">Guest</span><button type="button" data-remove-chip="${email}" data-kind="guests" aria-label="Remove">&times;</button></span>`).join("");
  }
}

function initParticipantPicker(searchInputId, dropdownId, chipsId, formRef) {
  const input = $("#" + searchInputId);
  const dropdown = $("#" + dropdownId);
  function renderDropdown() {
    const q = input.value.trim().toLowerCase();
    const available = visibleUsers().filter((u) => !formRef.participants.includes(u.id) && (u.name.toLowerCase().includes(q) || u.label.toLowerCase().includes(q)));
    if (!available.length) { dropdown.innerHTML = '<div class="picker-empty">No matching members</div>'; }
    else {
      dropdown.innerHTML = available.map((u) => `<div class="picker-option" data-pick-id="${u.id}"><span class="picker-avatar">${u.initials}</span><span>${u.name}</span></div>`).join("");
    }
    dropdown.classList.add("open");
    $$('[data-pick-id]', dropdown).forEach((opt) => on(opt, "click", () => {
      formRef.participants.push(opt.getAttribute("data-pick-id"));
      renderChips(chipsId, formRef.participants, "participants");
      input.value = "";
      renderDropdown();
      input.focus();
    }));
  }
  on(input, "focus", renderDropdown);
  on(input, "input", renderDropdown);
  document.addEventListener("click", (e) => { if (!e.target.closest("#" + searchInputId) && !e.target.closest("#" + dropdownId)) dropdown.classList.remove("open"); });
  document.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(`[data-remove-chip][data-kind="participants"]`);
    if (removeBtn && removeBtn.closest("#" + chipsId)) {
      formRef.participants = formRef.participants.filter((id) => id !== removeBtn.getAttribute("data-remove-chip"));
      renderChips(chipsId, formRef.participants, "participants");
      toast("Participant removed.");
    }
  });
}

function initGuestEntry(inputId, addBtnId, chipsId, errId, formRef) {
  const input = $("#" + inputId);
  const addBtn = $("#" + addBtnId);
  function addGuest() {
    const val = input.value.trim();
    const errEl = errId ? $("#" + errId) : null;
    if (!val) return;
    if (!isValidEmail(val)) { if (errEl) errEl.textContent = "Enter a valid email address."; return; }
    if (formRef.guests.includes(val)) { if (errEl) errEl.textContent = "Guest already added."; return; }
    formRef.guests.push(val);
    renderChips(chipsId, formRef.guests, "guests");
    input.value = "";
    if (errEl) errEl.textContent = "";
    toast("Participant added.");
  }
  on(addBtn, "click", addGuest);
  on(input, "keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addGuest(); } });
  document.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(`[data-remove-chip][data-kind="guests"]`);
    if (removeBtn && removeBtn.closest("#" + chipsId)) {
      formRef.guests = formRef.guests.filter((em) => em !== removeBtn.getAttribute("data-remove-chip"));
      renderChips(chipsId, formRef.guests, "guests");
      toast("Participant removed.");
    }
  });
}

function initScheduleInvite() {
  const input = $("#scheduleInviteInput");
  const dropdown = $("#scheduleInviteDropdown");
  const errEl = $("#err-scheduleInvite");

  function renderDropdown() {
    const q = input.value.trim().toLowerCase();
    if (!q) { dropdown.classList.remove("open"); return; }
    const hostId = $("#fieldHost").value;
    const available = visibleUsers().filter((u) =>
      u.id !== hostId && !state.scheduleForm.participants.includes(u.id) &&
      (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.label.toLowerCase().includes(q))
    );
    if (!available.length) { dropdown.innerHTML = '<div class="picker-empty">No matching members</div>'; }
    else {
      dropdown.innerHTML = available.map((u) => `<div class="picker-option" data-pick-id="${u.id}"><span class="picker-avatar">${u.initials}</span><span>${u.name}</span></div>`).join("");
    }
    dropdown.classList.add("open");
    $$('[data-pick-id]', dropdown).forEach((opt) => on(opt, "click", () => {
      state.scheduleForm.participants.push(opt.getAttribute("data-pick-id"));
      renderScheduleChips();
      input.value = "";
      errEl.textContent = "";
      dropdown.classList.remove("open");
      input.focus();
    }));
  }

  function addFromInput() {
    const val = input.value.trim();
    if (!val) return;
    const hostId = $("#fieldHost").value;
    if (isValidEmail(val)) {
      if (state.scheduleForm.guests.includes(val)) { errEl.textContent = "Guest already added."; return; }
      state.scheduleForm.guests.push(val);
      renderScheduleChips();
      input.value = ""; errEl.textContent = ""; dropdown.classList.remove("open");
      toast("Participant added.");
      return;
    }
    const match = visibleUsers().find((u) => u.name.toLowerCase() === val.toLowerCase());
    if (match) {
      if (match.id === hostId) { errEl.textContent = "This person is already the host."; return; }
      if (state.scheduleForm.participants.includes(match.id)) { errEl.textContent = "Already added."; return; }
      state.scheduleForm.participants.push(match.id);
      renderScheduleChips();
      input.value = ""; errEl.textContent = ""; dropdown.classList.remove("open");
      toast("Participant added.");
      return;
    }
    errEl.textContent = "Enter a valid name or email address.";
  }

  on(input, "input", renderDropdown);
  on(input, "focus", renderDropdown);
  on(input, "keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addFromInput(); } });
  on($("#scheduleInviteAddBtn"), "click", addFromInput);
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#scheduleInvitePicker")) dropdown.classList.remove("open");
  });
}

function initScheduleModal() {
  populateHostSelect();
  initScheduleInvite();

  on($("#fieldDescription"), "input", () => {
    $("#descriptionCounter").textContent = `${$("#fieldDescription").value.length}/500`;
  });

  on($("#fieldPassword"), "change", (e) => {
    const on = e.target.checked;
    // turning it on again in the same session keeps whatever password was already there instead of replacing it
    setSchedulePassword(on, on ? ($("#fieldPasswordInput").value.trim() || genSchedulePassword()) : undefined);
  });
  on($("#fieldPasswordVisBtn"), "click", () => {
    const input = $("#fieldPasswordInput"), show = input.type === "password";
    input.type = show ? "text" : "password";
    $("#fieldPasswordVisBtn").innerHTML = `<i class="bi bi-eye${show ? "-slash" : ""}"></i>`;
    $("#fieldPasswordVisBtn").title = $("#fieldPasswordVisBtn").ariaLabel = show ? "Hide password" : "Show password";
  });
  on($("#fieldPasswordGenBtn"), "click", () => {
    $("#fieldPasswordInput").value = genSchedulePassword();
    $("#err-fieldPasswordInput").textContent = "";
  });
  on($("#fieldPasswordCopyBtn"), "click", () => {
    const val = $("#fieldPasswordInput").value;
    if (!val) return;
    const btn = $("#fieldPasswordCopyBtn");
    const done = () => {
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      btn.classList.add("copied");
      toast("Password copied");
      setTimeout(() => { btn.innerHTML = original; btn.classList.remove("copied"); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(val).then(done).catch(done);
    else done();
  });

  $$(".duration-pill", $("#durationPills")).forEach((btn) => on(btn, "click", () => setDurationPill(btn.getAttribute("data-duration"))));

  on($("#meetingSettingsTrigger"), "click", () => {
    const trigger = $("#meetingSettingsTrigger");
    const body = $("#meetingSettingsBody");
    const expand = body.hidden;
    body.hidden = !expand;
    trigger.classList.toggle("expanded", expand);
  });

  on($("#btnScheduleMeeting"), "click", () => openScheduleModal("create"));

  on($("#scheduleSubmitBtn"), "click", () => {
    let valid = true;
    const title = $("#fieldTitle").value.trim();
    const date = $("#fieldDate").value;
    const time = getTimeSelectsAs24h();
    const hostId = $("#fieldHost").value || ME.id;
    const passwordOn = $("#fieldPassword").checked, passwordValue = $("#fieldPasswordInput").value.trim();
    $("#err-fieldTitle").textContent = ""; $("#err-fieldDate").textContent = ""; $("#err-fieldTime").textContent = ""; $("#err-fieldPasswordInput").textContent = "";
    if (!title) { $("#err-fieldTitle").textContent = "Meeting topic is required."; valid = false; }
    if (!date) { $("#err-fieldDate").textContent = "Meeting date is required."; valid = false; }
    if (!time) { $("#err-fieldTime").textContent = "Start time is required."; valid = false; }
    if (passwordOn && !passwordValue) { $("#err-fieldPasswordInput").textContent = "A meeting password is required."; valid = false; }
    if (!valid) return;

    const existingId = $("#scheduleMeetingId").value;
    const data = {
      title, description: $("#fieldDescription").value.trim().slice(0, 500),
      date, startTime: time,
      duration: Number($("#fieldDuration").value),
      timezone: $("#fieldTimezone").value,
      hostId,
      participants: state.scheduleForm.participants.slice(),
      assignedTo: state.scheduleForm.participants.filter((id) => (userById(id) || {}).role === "agent"),
      guests: state.scheduleForm.guests.map((email) => ({ email })),
      meetingType: $("#fieldMeetingType").value,
      recurring: $("#fieldRecurring").value,
      reminder: $("#fieldReminderToggle").checked ? "10" : "0",
      security: {
        whoCanJoin: $("#fieldWhoCanJoin").value,
        waitingRoom: $("#fieldWaitingRoom").checked,
        autoRecord: $("#fieldAutoRecord").checked,
        recordingAccess: $("#fieldRecordingAccess").checked,
        password: passwordOn, passwordValue: passwordOn ? passwordValue : "",
        allowBeforeHost: $("#fieldAllowBeforeHost").checked,
        permMic: $("#permMic").checked, permCam: $("#permCam").checked,
        permScreen: $("#permScreen").checked, permChat: $("#permChat").checked,
      },
    };

    if (existingId) {
      const found = findMeeting(existingId);
      if (found) {
        if (!authorize("meeting.edit", found.meeting)) return;
        if (!can("meeting.settings", found.meeting)) delete data.security; // the settings block is only for roles that may change settings
        Object.assign(found.meeting, data);
        toast("Meeting updated successfully.");
      }
    } else {
      if (!authorize("meeting.create")) return;
      if (!can("meeting.settings")) delete data.security;
      const newMeeting = baseMeeting(Object.assign(data, { status: "Upcoming" }, ownershipForNewMeeting(hostId)));
      state.meetings.upcoming.push(newMeeting);
      newMeeting.participants.filter((id) => id !== newMeeting.hostId).forEach((id) => createInvitation(newMeeting, id)); // participants picked at creation time are real invitations too
      toast("Meeting scheduled successfully.");
    }
    saveState();
    closeModal("scheduleModalOverlay");
    switchSidebarView("upcoming");
    renderAllViews();
  });
}

function duplicateMeeting(meeting) {
  openScheduleModal("duplicate", meeting);
}

/* ============================================================
   13. JOIN MEETING MODAL + PRE-JOIN
   The password gate is centralised in requestJoin(): every way to join a meeting (typing an ID/link here, a meeting card's
   Join button, the ⋮ menu, the details drawer) calls it, so a password-protected meeting always asks - not just the ID flow.
   The host of a meeting is never asked for their own password.
   ============================================================ */
let joinMatched = null, joinBusy = false, joinCameFromIdStep = false;

function renderJoinStep(step) {
  const toPw = step === "password";
  const showBack = toPw && joinCameFromIdStep;
  $("#joinModalTitle").textContent = toPw ? "Enter Meeting Password" : "Join Meeting";
  $("#joinCancelBtn").hidden = showBack;
  $("#joinBackBtn").hidden = !showBack;
  $("#joinStepId").hidden = toPw;
  $("#joinStepPassword").hidden = !toPw;
}
function setJoinBusy(busy) {
  joinBusy = busy;
  const btn = $("#joinMeetingSubmitBtn");
  btn.disabled = busy;
  btn.innerHTML = busy ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Joining…' : "Join Meeting";
  $("#joinBackBtn").disabled = busy;
}
function goToJoinStep(step, dir) {
  renderJoinStep(step);
  setJoinBusy(false);
  const el = step === "password" ? $("#joinStepPassword") : $("#joinStepId");
  el.classList.remove("join-anim-fwd", "join-anim-back");
  void el.offsetWidth; // restart the animation even if this step was shown before
  el.classList.add(dir === "back" ? "join-anim-back" : "join-anim-fwd");
  if (step === "password") setTimeout(() => $("#joinPasswordInput").focus(), 160);
}
function resetJoinPasswordField() {
  $("#joinPasswordInput").value = "";
  $("#joinPasswordInput").type = "password";
  $("#joinPasswordVisBtn").innerHTML = '<i class="bi bi-eye"></i>';
  $("#joinPasswordVisBtn").title = $("#joinPasswordVisBtn").ariaLabel = "Show password";
  $("#err-joinPasswordInput").textContent = "";
}
function joinMeetingNow(meeting, adhoc) {
  closeModal("joinModalOverlay");
  openPrejoinFor(meeting, !!adhoc);
}
// the password belongs to the MEETING, not to any one person's invitation - anyone RBAC-eligible to join is asked for it alike
function meetingNeedsPasswordFrom(meeting) {
  return !!(meeting.security && meeting.security.password && meeting.security.passwordValue && meeting.hostId !== ME.id);
}
// the ONE gate every "join this meeting" action goes through, whichever button started it
function requestJoin(meeting, adhoc) {
  if (meeting.status === "Ended") { toast("This meeting has ended.", "error"); return; }
  if (!authorize("meeting.join", meeting)) return;
  if (!meetingNeedsPasswordFrom(meeting)) { joinMeetingNow(meeting, adhoc); return; }
  joinMatched = meeting;
  joinCameFromIdStep = false;
  resetJoinPasswordField();
  renderJoinStep("password");
  setJoinBusy(false);
  openModal("joinModalOverlay");
  setTimeout(() => $("#joinPasswordInput").focus(), 160);
}
function submitJoinPassword() {
  if (joinBusy || !joinMatched) return;
  const input = $("#joinPasswordInput"), errEl = $("#err-joinPasswordInput");
  const val = input.value;
  if (!val.trim()) { errEl.textContent = "Please enter the meeting password."; input.focus(); return; }
  setJoinBusy(true);
  setTimeout(() => {
    if (val !== joinMatched.security.passwordValue) {
      setJoinBusy(false);
      errEl.textContent = "Incorrect password. Please try again.";
      input.focus();
      return;
    }
    errEl.textContent = "";
    joinMeetingNow(joinMatched);
  }, 650);
}

function initJoinModal() {
  on($("#btnJoinMeeting"), "click", () => {
    joinMatched = null;
    joinCameFromIdStep = false;
    $("#joinMeetingInput").value = "";
    $("#err-joinMeetingInput").textContent = "";
    resetJoinPasswordField();
    renderJoinStep("id");
    setJoinBusy(false);
    openModal("joinModalOverlay");
  });

  on($("#joinPasswordVisBtn"), "click", () => {
    const input = $("#joinPasswordInput"), btn = $("#joinPasswordVisBtn");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.innerHTML = show ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    btn.title = btn.ariaLabel = show ? "Hide password" : "Show password";
  });

  on($("#joinBackBtn"), "click", () => {
    if (joinBusy) return;
    $("#err-joinPasswordInput").textContent = "";
    goToJoinStep("id", "back");
  });

  function submitJoinId() {
    const val = $("#joinMeetingInput").value.trim();
    const errEl = $("#err-joinMeetingInput");
    if (!val) { errEl.textContent = "Please enter a meeting ID or link."; return; }
    const codePattern = /^\d{3}-\d{3}-\d{3}$/;
    const linkPattern = /meet\.mcm\.example\/[a-z0-9]+/i;
    if (!codePattern.test(val) && !linkPattern.test(val)) {
      errEl.textContent = "That doesn't look like a valid meeting ID or link.";
      return;
    }
    errEl.textContent = "";
    const allMeetings = [...state.meetings.upcoming, ...state.meetings.ongoing, ...state.meetings.invited].filter((m) => can("meeting.join", m));
    const matched = allMeetings.find((m) => m.meetingCode === val || m.link.includes(val.split("/").pop()));
    if (!matched) {
      const ended = state.meetings.past.find((m) => (m.meetingCode === val || m.link.includes(val.split("/").pop())) && can("meeting.view", m));
      if (ended) { errEl.textContent = "This meeting has ended."; return; }
    }
    if (!matched && !can("meeting.create")) { errEl.textContent = "No meeting with that ID or link is available to you."; return; } // same answer whether it does not exist or is not yours
    if (!matched && !authorize("meeting.create")) return; // an unknown ID would start a new meeting
    if (matched && meetingNeedsPasswordFrom(matched)) {
      joinMatched = matched;
      joinCameFromIdStep = true;
      goToJoinStep("password");
      return;
    }
    if (matched) joinMeetingNow(matched);
    else joinMeetingNow(baseMeeting({ title: "Instant Meeting", hostId: ME.id, date: TODAY_ISO, startTime: new Date().toTimeString().slice(0, 5), status: "Upcoming", meetingCode: val, ...ownershipForNewMeeting(ME.id) }), true);
  }

  on($("#joinMeetingSubmitBtn"), "click", () => {
    if (joinBusy) return;
    if ($("#joinStepPassword").hidden) submitJoinId();
    else submitJoinPassword();
  });
  on($("#joinMeetingInput"), "keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submitJoinId(); } });
  on($("#joinPasswordInput"), "keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submitJoinPassword(); } });
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast("Meeting link copied successfully.")).catch(() => toast("Meeting link copied successfully."));
  } else { toast("Meeting link copied successfully."); }
}

function runMicTest(btn, testingLabel, doneLabel) {
  if (btn.disabled) return;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = testingLabel || "Testing…";
  setTimeout(() => {
    btn.textContent = doneLabel || "Sounds good ✓";
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1400);
  }, 1200);
}

function openPrejoinFor(meeting, adhoc) {
  if (!authorize("meeting.join", meeting)) return;
  state.prejoinContext = { meeting, adhoc: !!adhoc };
  $("#prejoinMeetingTitle").textContent = meeting.title;
  $("#prejoinHost").textContent = `Host: ${userById(meeting.hostId)?.name || "—"}`;
  $("#prejoinTime").textContent = `Scheduled: ${formatFullDate(meeting.date)}, ${to12h(meeting.startTime)}`;
  $("#prejoinMeetingIdText").textContent = meeting.meetingCode;
  const notStarted = meeting.status === "Upcoming" && meeting.date > TODAY_ISO;
  $("#prejoinNotStarted").hidden = !notStarted;
  $("#prejoinMicBtn").classList.add("active");
  $("#prejoinCamBtn").classList.add("active");
  openModal("prejoinModalOverlay");
}

function initPrejoinControls() {
  on($("#prejoinMicBtn"), "click", () => $("#prejoinMicBtn").classList.toggle("active"));
  on($("#prejoinCamBtn"), "click", () => $("#prejoinCamBtn").classList.toggle("active"));
  on($("#prejoinSpeakerBtn"), "click", () => $("#prejoinSpeakerBtn").classList.toggle("active"));
  on($("#prejoinMicTestBtn"), "click", () => runMicTest($("#prejoinMicTestBtn")));
  on($("#prejoinCopyLinkBtn"), "click", () => { const ctx = state.prejoinContext; if (ctx) copyTextToClipboard(ctx.meeting.link); });
  on($("#prejoinJoinBtn"), "click", () => {
    const ctx = state.prejoinContext;
    closeModal("prejoinModalOverlay");
    if (!ctx) return;
    startLiveMeeting(ctx.meeting, ctx.adhoc);
  });
}

/* ============================================================
   13c. VIDEO EFFECTS ENGINE
   One central settings object drives one processing pipeline, shared by the pre-join preview and the live room:
   camera -> background (blur / image, person cut out by MediaPipe selfie segmentation) -> lighting -> appearance -> colour -> canvas stream.
   The mirror is applied to the preview by CSS only (the processed stream itself is never flipped). Everything heavy is created lazily and released
   when its feature is switched off. Microphone clean-up (fxAudio) is a separate Web Audio chain.
   ============================================================ */
const FX_KEY = "mcm-video-fx-v1", FX_IMAGE_KEY = "mcm-video-fx-image-v1";
const FX_DEFAULTS = {
  background: "none", noiseSuppression: true, autoLighting: true, appearance: "off", smoothness: 40, lowLight: false,
  brightness: 0, contrast: 0, saturation: 0, sharpness: 0, warmth: 0, exposure: 0, mirror: true, hd: true,
};
const FX_BACKGROUNDS = ["none", "blur", "office", "home", "classroom", "beach", "custom"];
const FX_RANGES = ["brightness", "contrast", "saturation", "sharpness", "warmth", "exposure"];
const FX_LEVELS = { off: null, low: { b: 1.02, c: 1.03, s: 1.03, sharp: .12, smooth: .2 }, medium: { b: 1.035, c: 1.05, s: 1.05, sharp: .2, smooth: .32 }, high: { b: 1.05, c: 1.07, s: 1.07, sharp: .3, smooth: .45 } };
const FX_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// procedural stand-ins for the Office / Home / Classroom / Beach pictures (drawn once, on first use)
function fxDrawScene(kind, w, h) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  const R = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x * w, y * h, ww * w, hh * h); };
  const V = (y0, y1, a, b) => { const gr = g.createLinearGradient(0, y0 * h, 0, y1 * h); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
  const circle = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x * w, y * h, r * h, 0, Math.PI * 2); g.fill(); };
  if (kind === "office") {
    g.fillStyle = V(0, 1, "#ddd6ca", "#b7ae9f"); g.fillRect(0, 0, w, h);
    R(.06, .1, .3, .52, "#f5f2ea"); g.fillStyle = V(.12, .6, "#8fc7ee", "#eaf6fd"); g.fillRect(.07 * w, .12 * h, .28 * w, .48 * h); R(.205, .12, .01, .48, "#f5f2ea"); R(.07, .35, .28, .012, "#f5f2ea");
    R(.6, .28, .34, .02, "#6b4f33"); R(.6, .52, .34, .02, "#6b4f33");
    ["#c0563b", "#3b6ea5", "#e0b24a", "#4f8a5b", "#8a5aa8", "#c0563b", "#3b6ea5"].forEach((col, i) => { R(.62 + i * .042, .17, .034, .11, col); R(.62 + i * .042, .41, .034, .11, ["#e0b24a", "#4f8a5b", "#3b6ea5", "#c0563b", "#8a5aa8", "#e0b24a", "#4f8a5b"][i]); });
    R(0, .8, 1, .2, "#8a6f52"); R(0, .78, 1, .025, "#6f563d"); circle(.5, .74, .06, "#3f7d4e"); R(.485, .78, .03, .05, "#6f563d");
  } else if (kind === "home") {
    g.fillStyle = V(0, 1, "#e9d5b9", "#c9a97f"); g.fillRect(0, 0, w, h);
    R(.7, .12, .2, .3, "#5b4630"); R(.715, .145, .17, .25, "#a9c9d8"); R(.1, .1, .16, .22, "#f3ece0"); R(.115, .13, .13, .16, "#c46a4a");
    R(.08, .55, .5, .2, "#7b4b3a"); R(.06, .5, .1, .3, "#6b3f30"); R(.5, .5, .1, .3, "#6b3f30"); R(.12, .5, .38, .09, "#93604c");
    R(0, .82, 1, .18, "#a37b52"); R(.78, .5, .02, .32, "#4a3a2a"); circle(.79, .47, .06, "#f7e2a0"); circle(.9, .77, .07, "#4c8a55"); R(.885, .8, .03, .06, "#7a5236");
  } else if (kind === "classroom") {
    g.fillStyle = V(0, 1, "#e6e3d3", "#cbc7b3"); g.fillRect(0, 0, w, h);
    R(.14, .12, .72, .42, "#6b4f33"); R(.155, .145, .69, .37, "#2f5d47"); R(.2, .2, .25, .012, "#e8eee9"); R(.2, .26, .4, .012, "#e8eee9"); R(.2, .32, .3, .012, "#e8eee9"); R(.16, .52, .68, .02, "#a58a63");
    R(0, .78, 1, .22, "#a8896a"); [.06, .38, .7].forEach((x) => { R(x, .62, .24, .03, "#8a6a45"); R(x + .02, .65, .012, .13, "#5b4630"); R(x + .21, .65, .012, .13, "#5b4630"); });
    circle(.92, .2, .07, "#f7f3e6"); R(.916, .2, .004, .04, "#444");
  } else if (kind === "beach") {
    g.fillStyle = V(0, .55, "#5bb7e8", "#cdeaf6"); g.fillRect(0, 0, w, .55 * h);
    circle(.8, .2, .09, "#fff1a8"); circle(.22, .18, .05, "#ffffffcc"); circle(.27, .17, .06, "#ffffffcc"); circle(.32, .19, .045, "#ffffffcc");
    g.fillStyle = V(.5, .68, "#2f8fc4", "#5fc0d8"); g.fillRect(0, .5 * h, w, .18 * h);
    g.fillStyle = V(.66, 1, "#f2dfaa", "#d9bd7f"); g.fillRect(0, .66 * h, w, .34 * h);
    R(.84, .3, .012, .42, "#6b4f33"); g.fillStyle = "#3f8a52"; [-.06, -.02, .02, .06].forEach((dx, i) => { g.beginPath(); g.ellipse((.846 + dx) * w, (.3 + Math.abs(dx)) * h, .055 * w, .015 * h, dx * 6 + i * .1, 0, Math.PI * 2); g.fill(); });
  }
  return c;
}

const videoFx = (() => {
  const st = Object.assign({}, FX_DEFAULTS);
  const support = {
    filter: typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype,
    capture: typeof HTMLCanvasElement !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function",
    wasm: typeof WebAssembly === "object",
  };
  support.segmentation = support.capture && support.wasm;
  let custom = null, customPending = false; // { url, img } - the picture the user added (kept until replaced or removed); pending = still decoding

  const scenes = {};                       // procedural backgrounds, drawn once
  let source = null, sink = null;          // camera stream + who wants the picture
  let srcVideo = null, out = null, octx = null, person = null, pctx = null, probe = null, probeCtx = null, outStream = null;
  let running = false, raf = 0, lastT = 0, lastProbe = 0, gainCur = 1, gainTarget = 1, sharpEl = null;
  let maxW = 1280, avgMs = 8, framesSinceAdapt = 0, lastSeg = 0, segGap = 40, prevFrameT = 0, prevGap = 33, small = null, sg = null, half = null, hg = null; // adaptive quality: a slow machine renders a smaller picture instead of freezing the page
  let seg = null, segPromise = null, segState = "idle", segBusy = false, haveMask = false, maskA = null, maskB = null, maskW = 0, maskH = 0;
  let announced = null;                    // which stream the sink last received
  const listeners = new Set();
  const persistable = () => { const o = Object.assign({}, st); delete o.customBackground; return o; };

  /* ---- persistence ---- */
  function loadCustom() {
    try {
      const url = localStorage.getItem(FX_IMAGE_KEY);
      if (!url || !/^data:image\/(jpeg|png|webp);base64,/.test(url)) return;
      customPending = true;
      const img = new Image();
      img.onload = () => { customPending = false; custom = { url, img }; emit(); update(); };
      img.onerror = () => { customPending = false; if (st.background === "custom") { st.background = "none"; emit(); update(); } };
      img.src = url;
    } catch { /* storage unavailable */ }
  }
  function readStored() {
    try {
      const raw = JSON.parse(localStorage.getItem(FX_KEY) || "null");
      if (!raw || typeof raw !== "object") return {};
      return sanitize(raw);
    } catch { return {}; }
  }
  function sanitize(o) {
    const clean = {};
    Object.keys(FX_DEFAULTS).forEach((k) => {
      if (!(k in o)) return;
      const d = FX_DEFAULTS[k], v = o[k];
      if (typeof d === "boolean" && typeof v === "boolean") clean[k] = v;
      else if (typeof d === "number" && typeof v === "number" && isFinite(v)) clean[k] = k === "smoothness" ? Math.min(100, Math.max(0, v)) : Math.min(50, Math.max(-50, v));
      else if (k === "background" && FX_BACKGROUNDS.includes(v)) clean[k] = v;
      else if (k === "appearance" && v in FX_LEVELS) clean[k] = v;
    });
    return clean;
  }
  function persist() { try { localStorage.setItem(FX_KEY, JSON.stringify(persistable())); } catch { /* ignore */ } }

  /* ---- state ---- */
  function emit() { listeners.forEach((fn) => { try { fn(st); } catch (e) { console.warn(e); } }); }
  function set(patch) {
    let changed = false;
    Object.keys(patch).forEach((k) => { if (k in FX_DEFAULTS && st[k] !== patch[k]) { st[k] = patch[k]; changed = true; } });
    if (st.background === "custom" && !custom && !customPending) st.background = "none";
    if (!changed) return;
    persist(); update(); emit();
  }
  function reset(useStored) {
    Object.assign(st, FX_DEFAULTS, useStored ? readStored() : {});
    if (st.background === "custom" && !custom && !customPending) st.background = "none";
    update(); emit();
  }
  const colourActive = () => support.filter && (st.autoLighting || st.lowLight || st.appearance !== "off" || FX_RANGES.some((k) => st[k] !== 0));
  const bgActive = () => st.background !== "none" && (st.background === "blur" ? support.filter && support.segmentation : true) && (st.background === "custom" ? !!custom : true) && support.segmentation;
  const needsPipeline = () => !!source && support.capture && (colourActive() || bgActive());

  /* ---- custom background picture ---- */
  function fileProblem(file) {
    if (!file) return "No file was chosen.";
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) return "That file type isn't supported. Choose a JPG, PNG or WebP image.";
    if (file.size > FX_MAX_IMAGE_BYTES) return "That image is too large (8 MB max). Choose a smaller one.";
    return "";
  }
  async function setCustomFile(file) {
    const problem = fileProblem(file);
    if (problem) return { ok: false, message: problem };
    try {
      const bmp = await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file), img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
        img.src = url;
      });
      if (!bmp.naturalWidth || !bmp.naturalHeight) throw new Error("empty");
      const scale = Math.min(1, 1280 / bmp.naturalWidth, 720 / bmp.naturalHeight); // keeps the stored copy small
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(bmp.naturalWidth * scale)); c.height = Math.max(1, Math.round(bmp.naturalHeight * scale));
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", .86);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      custom = { url, img };
      try { localStorage.setItem(FX_IMAGE_KEY, url); } catch { /* too big to keep across reloads: still used now */ }
      set({ background: "custom" }); emit();
      return { ok: true };
    } catch { return { ok: false, message: "That image couldn't be read. It may be damaged - try another one." }; }
  }
  function removeCustom() {
    custom = null;
    try { localStorage.removeItem(FX_IMAGE_KEY); } catch { /* ignore */ }
    if (st.background === "custom") set({ background: "none" }); else { update(); }
    emit();
  }

  /* ---- segmentation model (loaded once, only when a background effect is chosen) ---- */
  function loadSegmenter() {
    if (segPromise) return segPromise;
    segState = "loading"; emit();
    segPromise = new Promise((resolve, reject) => {
      // the model and its wasm are fetched by URL, which browsers refuse for pages opened straight from disk (file://)
      if (location.protocol === "file:") return reject(new Error("file"));
      const s = document.createElement("script");
      s.src = "vendor/mediapipe/selfie_segmentation.js";
      s.onload = resolve; s.onerror = () => reject(new Error("script"));
      document.head.appendChild(s);
    }).then(async () => {
      const m = new window.SelfieSegmentation({ locateFile: (f) => `vendor/mediapipe/${f}` });
      m.setOptions({ modelSelection: 1, selfieMode: false });
      m.onResults(onMask);
      await m.initialize();
      seg = m; segState = "ready"; emit();
      return m;
    }).catch((err) => {
      segPromise = null; segState = "failed"; emit();
      toast(err && err.message === "file"
        ? "Background effects need this page to be opened from a web server (for example http://localhost:5500), not by double-clicking index.html. Your normal camera picture is being used."
        : "Background effects couldn't start in this browser. Your normal camera picture is being used.", "error");
      if (st.background !== "none") set({ background: "none" });
      throw err;
    });
    segPromise.catch(() => {});
    return segPromise;
  }
  function onMask(res) {
    if (!res || !res.segmentationMask) return;
    if (!maskA) { maskA = document.createElement("canvas"); maskB = document.createElement("canvas"); }
    const w = maskW, h = maskH;
    if (maskA.width !== w) { maskA.width = maskB.width = w; maskA.height = maskB.height = h; }
    const g = maskB.getContext("2d");
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over"; g.globalAlpha = .38; g.drawImage(maskA, 0, 0);          // previous mask: smooths flicker over time
    g.globalCompositeOperation = "lighter"; g.globalAlpha = .62; if (support.filter) g.filter = "blur(1.2px)"; g.drawImage(res.segmentationMask, 0, 0, w, h); g.filter = "none";
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    const t = maskA; maskA = maskB; maskB = t;
    haveMask = true;
  }

  /* ---- drawing ---- */
  function ensureCanvases() {
    if (out) return;
    out = document.createElement("canvas"); octx = out.getContext("2d", { alpha: false });
    person = document.createElement("canvas"); pctx = person.getContext("2d");
    small = document.createElement("canvas"); sg = small.getContext("2d"); half = document.createElement("canvas"); hg = half.getContext("2d");
    probe = document.createElement("canvas"); probe.width = 32; probe.height = 18; probeCtx = probe.getContext("2d", { willReadFrequently: true });
    if (!document.getElementById("fxSvgDefs")) {
      const wrap = document.createElement("div");
      wrap.innerHTML = '<svg id="fxSvgDefs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><filter id="fxSharpen" color-interpolation-filters="sRGB"><feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 0 0 0 1 0 0 0 0"/></filter></svg>';
      document.body.appendChild(wrap.firstChild);
    }
    sharpEl = document.querySelector("#fxSharpen feConvolveMatrix");
  }
  function scene(kind) {
    if (kind === "custom") return custom && custom.img;
    return scenes[kind] || (scenes[kind] = fxDrawScene(kind, 1280, 720));
  }
  function cover(g, img, w, h) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
    g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);       // fills the frame, keeps the aspect ratio, crops instead of stretching
  }
  function measureLight(now) {
    if (now - lastProbe < 250) return;
    lastProbe = now;
    if (!(st.autoLighting || st.lowLight)) { gainTarget = 1; return; }
    probeCtx.drawImage(srcVideo, 0, 0, 32, 18);
    const d = probeCtx.getImageData(0, 0, 32, 18).data, ys = [];
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) { const y = (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255; ys.push(y); sum += y; }
    ys.sort((a, b) => a - b);
    const mean = sum / ys.length, p95 = ys[Math.floor(ys.length * .95)];
    const goal = st.lowLight ? .5 : .44, cap = st.lowLight ? 2.2 : 1.6;
    let t = 1;
    if (mean < goal - .04) t = Math.min(cap, goal / Math.max(mean, .05));
    else if (mean > .64) t = Math.max(.82, .58 / mean);
    if (t > 1 && p95 > .93) t = 1;                                // never blow out highlights / skin
    if (Math.abs(t - gainTarget) > .04) gainTarget = t;           // dead-band: no twitching
  }
  function filterString(noSharpen) {
    const lvl = FX_LEVELS[st.appearance];
    let b = 1 + st.brightness / 100 + st.exposure / 100 * .8, c = 1 + st.contrast / 100, s = 1 + st.saturation / 100, sharp = st.sharpness / 100;
    b *= gainCur; c *= 1 + (gainCur - 1) * .15;
    if (lvl) { b *= lvl.b; c *= lvl.c; s *= lvl.s; sharp += lvl.sharp; }
    let f = `brightness(${b.toFixed(3)}) contrast(${c.toFixed(3)}) saturate(${s.toFixed(3)})`;
    if (noSharpen) { /* blurred copies get no sharpening */ } else if (sharp > .02) { setSharp(sharp); f += " url(#fxSharpen)"; } else if (sharp < -.02) f += ` blur(${(-sharp * 5 * Math.max(1, out.width / 640)).toFixed(2)}px)`;
    return f;
  }
  let lastSharp = -1;
  function setSharp(a) {
    a = Math.round(Math.min(.9, a) * 100) / 100;
    if (a === lastSharp || !sharpEl) return;
    lastSharp = a; sharpEl.setAttribute("kernelMatrix", `0 ${-a} 0 ${-a} ${1 + 4 * a} ${-a} 0 ${-a} 0`);
  }
  function warmthOverlay(W, H) {
    if (!st.warmth) return;
    octx.save(); octx.filter = "none"; octx.globalCompositeOperation = "soft-light";
    octx.globalAlpha = Math.min(.5, Math.abs(st.warmth) / 100 * .7);
    octx.fillStyle = st.warmth > 0 ? "#ff9a3c" : "#4f8dff"; octx.fillRect(0, 0, W, H); octx.restore();
  }
  function draw(now) {
    const vw = srcVideo.videoWidth, vh = srcVideo.videoHeight;
    if (!vw || !vh || srcVideo.readyState < 2) return;
    const t0 = performance.now(), W = Math.min(vw, maxW), H = Math.round(W * vh / vw);
    if (out.width !== W || out.height !== H) { out.width = person.width = W; out.height = person.height = H; maskW = 320; maskH = Math.round(320 * vh / vw); haveMask = false; }
    measureLight(now);
    gainCur += (gainTarget - gainCur) * .07;                       // eased: brightness never jumps
    const colour = colourActive(), f = colour ? filterString() : "none", fLite = colour ? filterString(true) : "none", lvl = FX_LEVELS[st.appearance];
    const smooth = support.filter && lvl ? Math.min(.6, lvl.smooth * (st.smoothness / 50)) : 0;
    const wantBg = bgActive() && st.background !== "none";
    // Heavy blurs are done on small copies of the frame (cheap) and scaled back up, never as a full-size filter
    const shrink = (canvas, g, img, div, filter) => {
      const w = Math.max(2, Math.round(W / div)), h = Math.max(2, Math.round(H / div));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      g.filter = filter; g.drawImage(img, 0, 0, w, h); g.filter = "none";
    };
    let subject = srcVideo;                                        // what the smoothing pass works on
    if (wantBg && haveMask && seg) {
      if (st.background === "blur") {
        shrink(small, sg, srcVideo, 5, `blur(2px) ${fLite === "none" ? "" : fLite}`);
        octx.drawImage(small, -W * .02, -H * .02, W * 1.04, H * 1.04);
      } else { const img = scene(st.background); if (img) cover(octx, img, W, H); else octx.drawImage(srcVideo, 0, 0, W, H); }
      pctx.globalCompositeOperation = "source-over"; pctx.clearRect(0, 0, W, H);
      pctx.drawImage(srcVideo, 0, 0, W, H);
      pctx.globalCompositeOperation = "destination-in"; pctx.drawImage(maskA, 0, 0, W, H);   // the mask is already softened at its own (small) size
      pctx.globalCompositeOperation = "source-over";
      octx.filter = f; octx.drawImage(person, 0, 0); octx.filter = "none";
      subject = person;
    } else {
      octx.filter = f; octx.drawImage(srcVideo, 0, 0, W, H); octx.filter = "none";
    }
    if (smooth) {                                                  // gentle skin smoothing: a soft half-size copy blended in at low opacity
      shrink(half, hg, subject, 2, fLite);
      octx.globalAlpha = smooth; octx.drawImage(half, 0, 0, W, H); octx.globalAlpha = 1;
    }
    warmthOverlay(W, H);
    const cost = Math.max(performance.now() - t0, prevGap - 33);   // how long the frame took, or how late it was
    prevGap = now - prevFrameT; prevFrameT = now;
    avgMs += (cost - avgMs) * .15;
    if (++framesSinceAdapt >= 24) {
      framesSinceAdapt = 0;
      const ladder = [480, 640, 960, 1280], at = ladder.indexOf(maxW);
      if (avgMs > 34 && at > 0) maxW = ladder[at - 1];
      else if (avgMs < 9 && at < ladder.length - 1 && vw > maxW) maxW = ladder[at + 1];
    }
    if (wantBg && seg && !segBusy && now - lastSeg > segGap) {     // one segmentation in flight at a time, spaced out on slow machines
      lastSeg = now; segBusy = true;
      const s0 = performance.now();
      seg.send({ image: srcVideo }).catch(() => {}).then(() => { segBusy = false; segGap = Math.min(400, Math.max(40, (performance.now() - s0) * 1.4)); });
    }
  }
  function frame(t) {
    raf = 0;
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (t - lastT < 28) return;                                    // ~30 fps is plenty
    lastT = t;
    try { draw(t); } catch (e) { console.warn("video effects frame failed", e); }
  }
  function startLoop() { if (running) return; running = true; lastT = 0; raf = requestAnimationFrame(frame); }
  function stopLoop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* ---- routing ---- */
  function update() {
    const want = needsPipeline();
    if (want && source) {
      ensureCanvases();
      if (bgActive() && !seg) loadSegmenter().catch(() => {});
      if (!outStream) outStream = out.captureStream(30);
      startLoop();
    } else stopLoop();
    if (!bgActive()) { haveMask = false; }
    announce();
  }
  function outputStream() { return needsPipeline() && outStream ? outStream : source; }
  function announce() {
    const s = outputStream();
    if (s === announced) return;
    announced = s;
    if (sink) sink(s);
  }
  function attach(stream, onOutput) {
    detach();
    source = stream; sink = onOutput; announced = null;
    if (!srcVideo) { srcVideo = document.createElement("video"); srcVideo.muted = true; srcVideo.playsInline = true; }
    srcVideo.srcObject = stream; const p = srcVideo.play(); if (p) p.catch(() => {});
    update();
    if (announced === null) { announced = source; if (sink) sink(source); }
  }
  function detach() {
    stopLoop();
    if (srcVideo) srcVideo.srcObject = null;
    source = null; sink = null; announced = null; haveMask = false;
    if (outStream) { outStream.getTracks().forEach((t) => t.stop()); outStream = null; }   // the canvas track belongs to the camera session that just ended
    if (probeCtx) probeCtx.clearRect(0, 0, 32, 18);
    gainCur = gainTarget = 1;
  }

  loadCustom();
  return {
    st, support, set, reset, readStored, persist, attach, detach, setCustomFile, removeCustom, fileProblem,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get custom() { return custom && custom.url; },
    get segState() { return segState; },
    get processing() { return running; },
    get stats() { return { avgMs: Math.round(avgMs), width: maxW, segGap: Math.round(segGap) }; }, // (for diagnostics)
    get output() { return outputStream(); },
  };
})();

if (location.search.indexOf("fxdebug") >= 0) window.__mcmFx = videoFx; // diagnostics only (?fxdebug)

/* ---- microphone clean-up: real Web Audio chain (high-pass -> voice presence -> gentle compressor -> adaptive noise gate) ---- */
const fxAudio = (() => {
  let ac = null, stream = null, gate = null, hp = null, presence = null, analyser = null, dest = null, timer = 0, token = 0;
  let state = "off", floor = .004, hold = 0, level = 0;
  const listeners = new Set();
  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext));
  const emit = () => listeners.forEach((fn) => { try { fn(state, level); } catch (e) { console.warn(e); } });
  function setState(s) { state = s; emit(); }
  function tick() {
    if (!analyser) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    level = Math.min(1, rms * 9);
    const suppress = videoFx.st.noiseSuppression;
    if (suppress) {
      floor = rms < floor ? rms : floor + (rms - floor) * .003;   // slow-moving estimate of the room's noise floor
      const open = rms > Math.max(floor * 2.6, .006);
      hold = open ? 10 : Math.max(0, hold - 1);                    // ~0.5 s hold so word endings are not clipped
      gate.gain.setTargetAtTime(hold > 0 ? 1 : .1, ac.currentTime, hold > 0 ? .01 : .12);
    } else gate.gain.setTargetAtTime(1, ac.currentTime, .02);
    emit();
  }
  function applyMode() {
    if (!ac) return;
    const on = videoFx.st.noiseSuppression;
    hp.frequency.setTargetAtTime(on ? 90 : 10, ac.currentTime, .02);
    presence.gain.setTargetAtTime(on ? 2.5 : 0, ac.currentTime, .02);
    const track = stream && stream.getAudioTracks()[0];
    if (track && track.applyConstraints) track.applyConstraints({ noiseSuppression: on, echoCancellation: true, autoGainControl: true }).catch(() => {});
  }
  async function start(deviceId) {
    stop(true);
    const t = ++token;
    if (!supported()) { setState("unsupported"); return; }
    setState("starting");
    try {
      const audio = { echoCancellation: true, noiseSuppression: videoFx.st.noiseSuppression, autoGainControl: true };
      if (deviceId) audio.deviceId = { exact: deviceId };
      let s;
      try { s = await navigator.mediaDevices.getUserMedia({ audio }); }
      catch (err) { if (!deviceId || !["OverconstrainedError", "NotFoundError"].includes(err.name)) throw err; delete audio.deviceId; s = await navigator.mediaDevices.getUserMedia({ audio }); }
      if (t !== token) { s.getTracks().forEach((x) => x.stop()); return; }
      stream = s;
      const track = s.getAudioTracks()[0];
      if (track) track.addEventListener("ended", () => { if (t === token) { stop(true); setState("lost"); } }); // the microphone was unplugged / switched off by the system
      const AC = window.AudioContext || window.webkitAudioContext;
      ac = new AC(); if (ac.state === "suspended") ac.resume().catch(() => {});
      const src = ac.createMediaStreamSource(stream);
      hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 90;
      presence = ac.createBiquadFilter(); presence.type = "peaking"; presence.frequency.value = 3000; presence.Q.value = 1; presence.gain.value = 2.5;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -26; comp.knee.value = 24; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
      gate = ac.createGain(); analyser = ac.createAnalyser(); analyser.fftSize = 1024;
      dest = ac.createMediaStreamDestination();                     // the cleaned-up track (nothing is played back, so no echo)
      src.connect(hp); hp.connect(presence); presence.connect(comp); comp.connect(gate); gate.connect(analyser); analyser.connect(dest);
      floor = .004; hold = 0; applyMode();
      timer = setInterval(tick, 50);
      setState("on");
    } catch (err) {
      if (t !== token) return;
      setState(err && (err.name === "NotAllowedError" || err.name === "SecurityError") ? "denied" : "unavailable");
    }
  }
  function stop(quiet) {
    token++;
    clearInterval(timer); timer = 0;
    if (stream) stream.getTracks().forEach((x) => x.stop());
    if (ac) ac.close().catch(() => {});
    stream = ac = gate = hp = presence = analyser = dest = null; level = 0;
    if (!quiet) setState("off"); else state = "off";
  }
  videoFx.subscribe(() => { if (ac) applyMode(); });
  return { start, stop, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, get state() { return state; }, get level() { return level; }, get output() { return dest && dest.stream; } };
})();

/* ---- the controls: every switch, slider and thumbnail below just calls videoFx.set() and redraws from the one state object ---- */
function fxPanelHtml(p) {
  const rng = (key, label, min = -50, max = 50, tip = "") => `<div class="mb-3"><div class="d-flex justify-content-between small"><label class="form-label mb-0 fw-semibold" for="${p}Fx-${key}"${tip ? ` title="${tip}"` : ""}>${label}</label><span class="text-body-secondary" data-fx-val="${key}">0</span></div><input type="range" class="form-range" min="${min}" max="${max}" step="1" id="${p}Fx-${key}" data-fx-range="${key}" aria-label="${label}"></div>`;
  const sw = (key, label, tip) => `<div class="d-flex align-items-center justify-content-between gap-2 mb-2"><label class="small fw-semibold" for="${p}Fx-${key}" title="${tip}">${label}</label><div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" role="switch" id="${p}Fx-${key}" data-fx-switch="${key}" title="${tip}"></div></div>`;
  return `<div class="small fw-semibold mb-1" id="${p}FxApLabel">Appearance enhancement</div>
    <div class="fx-seg mb-3" role="group" aria-labelledby="${p}FxApLabel">${["off", "low", "medium", "high"].map((l) => `<button type="button" data-fx-appearance="${l}" aria-pressed="false">${l[0].toUpperCase() + l.slice(1)}</button>`).join("")}</div>
    ${rng("smoothness", "Smoothness", 0, 100, "How much gentle skin smoothing the appearance enhancement adds.")}
    ${rng("brightness", "Brightness")}${rng("contrast", "Contrast")}${rng("saturation", "Saturation")}${rng("sharpness", "Sharpness")}${rng("warmth", "Warmth", -50, 50, "Negative is cooler, positive is warmer.")}${rng("exposure", "Exposure")}
    <hr>
    ${sw("lowLight", "Low-light enhancement", "Lifts a dark picture more strongly (works together with Auto adjust lighting).")}
    ${sw("hd", "HD camera", "Ask the camera for 720p at 30 fps. Turn off to use a lighter 480p picture.")}
    <p class="small text-body-secondary mb-2" data-fx-hd-note></p>
    <hr>
    <div class="d-flex justify-content-between align-items-center"><span class="small text-body-secondary" data-fx-support-note></span><button type="button" class="btn btn-outline btn-sm" data-fx-reset>Reset</button></div>`;
}

// which UI surfaces exist: the pre-join popup and the live room's Background & effects dialog
const FX_SURFACES = [
  { p: "lobby", thumbs: () => $$(".lobby-bg-thumb"), add: () => $("#lobbyAddImageBtn"), sw: { noiseSuppression: "#lobbyNoiseSuppression", appearance: "#lobbyTouchUp", autoLighting: "#lobbyAutoLighting", mirror: "#lobbyMirrorVideo" }, root: () => $("#lobbyFxPanel"), status: () => $("#lobbyEnhStatus") },
  { p: "live", thumbs: () => $$(".live-bg-thumb"), add: () => $("#liveBgAdd"), sw: { noiseSuppression: "#liveFxNoise", appearance: "#liveFxTouchUp", autoLighting: "#liveFxLight", mirror: "#liveFxMirror" }, root: () => $("#liveFxPanel"), status: () => $("#liveFxStatus") },
];
const fxThumbKind = (el) => el.getAttribute("data-bg-thumb") || el.getAttribute("data-live-bg") || (el.id === "lobbyAddImageBtn" || el.id === "liveBgAdd" ? "custom" : "");
let fxCameraInfo = { width: 0, height: 0 };

function fxStatusText() {
  const s = videoFx.st, a = fxAudio.state;
  if (!s.noiseSuppression) return { text: "Noise suppression disabled.", good: false };
  if (a === "on") return { text: "Noise suppression enabled.", good: true };
  if (a === "starting") return { text: "Starting your microphone…", good: false };
  if (a === "denied") return { text: "Microphone access is blocked, so noise suppression can't run.", good: false };
  if (a === "unavailable") return { text: "No microphone was found, so noise suppression can't run.", good: false };
  if (a === "unsupported") return { text: "Noise suppression isn't supported in this browser.", good: false };
  return { text: "Noise suppression will start when your microphone is on.", good: false };
}
function fxSyncUi() {
  const s = videoFx.st, sup = videoFx.support;
  FX_SURFACES.forEach((sf) => {
    sf.thumbs().forEach((t) => {
      const kind = fxThumbKind(t);
      if (!kind) return;
      const selected = kind === s.background;
      t.classList.toggle("active", selected);
      t.setAttribute("aria-pressed", String(selected));
      const disabled = (kind === "blur" && !(sup.filter && sup.segmentation)) || (kind !== "none" && kind !== "custom" && !sup.segmentation);
      t.disabled = disabled; t.title = disabled ? "Background effects aren't supported in this browser." : "";
    });
    const add = sf.add();
    if (add) {
      const has = !!videoFx.custom, sw = add.querySelector(".lobby-bg-swatch"), label = add.querySelector(".lobby-bg-label");
      if (sw) { sw.style.backgroundImage = has ? `url(${videoFx.custom})` : ""; sw.style.backgroundSize = "cover"; sw.style.backgroundPosition = "center"; sw.classList.toggle("swatch-add", !has); }
      if (sw && !sw.dataset.plus) sw.dataset.plus = sw.innerHTML;
      if (sw) sw.innerHTML = has ? "" : sw.dataset.plus;
      if (label) label.textContent = has ? "Custom" : "Add Image";
      add.title = has ? (s.background === "custom" ? "Click to change the image" : "Use your image") : "Upload a JPG, PNG or WebP background";
      const rm = add.querySelector("[data-fx-remove]"); if (rm) rm.classList.toggle("d-none", !has);
    }
    Object.entries(sf.sw).forEach(([key, sel]) => { const el = $(sel); if (el) el.checked = key === "appearance" ? s.appearance !== "off" : !!s[key]; });
    const root = sf.root();
    if (root) {
      $$("[data-fx-appearance]", root).forEach((b) => { const on = b.getAttribute("data-fx-appearance") === s.appearance; b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on)); });
      $$("[data-fx-range]", root).forEach((r) => { const k = r.getAttribute("data-fx-range"); if (Number(r.value) !== s[k]) r.value = s[k]; const v = root.querySelector(`[data-fx-val="${k}"]`); if (v) v.textContent = (k !== "smoothness" && s[k] > 0 ? "+" : "") + s[k]; r.disabled = !sup.filter; });
      $$("[data-fx-switch]", root).forEach((c) => { c.checked = !!s[c.getAttribute("data-fx-switch")]; if (c.getAttribute("data-fx-switch") === "lowLight") c.disabled = !sup.filter; });
      $$("[data-fx-appearance]", root).forEach((b) => { b.disabled = !sup.filter; });
      const hd = root.querySelector("[data-fx-hd-note]");
      if (hd) hd.textContent = fxCameraInfo.height ? `Camera is sending ${fxCameraInfo.width}×${fxCameraInfo.height}${fxCameraInfo.height >= 720 ? " (HD)" : ""}.` : "";
      const sn = root.querySelector("[data-fx-support-note]");
      if (sn) sn.textContent = sup.filter ? "" : "Colour adjustments need a newer browser.";
    }
    const status = sf.status();
    if (status) {
      const t = fxStatusText();
      const seg = videoFx.segState === "loading" && s.background !== "none" ? " Loading background effect…" : "";
      status.classList.toggle("text-success", t.good); status.classList.toggle("text-body-secondary", !t.good);
      status.innerHTML = `<span class="status-dot-sm ${t.good ? "good" : ""}"></span><span>${t.text}${seg}</span>`;
    }
  });
  const stage = $("#startCameraPreview");
  // the flat-gradient "impression" behind the avatar (.lobby-bg-layer, keyed off data-bg) must only ever stand in for
  // the real composited background while the camera is actually on - with the camera off this must read as "none",
  // otherwise a colour hint of the selected background leaks through behind the avatar when nothing should show at all.
  if (stage) {
    const camOn = lobbyIsOn("#startCamBtn");
    stage.dataset.bg = (camOn && s.background !== "custom") ? s.background : "none";
    stage.classList.toggle("mirrored", s.mirror);
  }
  const hdBadge = $("#cameraHdBadge");
  if (hdBadge) hdBadge.classList.toggle("d-none", !(fxCameraInfo.height >= 720) || !lobbyStream);
}
function fxCameraProblem(err) {
  const n = err && err.name;
  if (n === "NotAllowedError" || n === "SecurityError") return "Camera access was denied. Allow camera permission in your browser's address bar to use your video.";
  if (n === "NotFoundError" || n === "DevicesNotFoundError") return "No camera was found. Connect one and try again.";
  if (n === "NotReadableError" || n === "AbortError") return "Your camera is busy or unavailable - close other apps that use it and try again.";
  return "Your camera couldn't be started.";
}
function fxVideoConstraints(deviceId) {
  const v = videoFx.st.hd ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } };
  if (deviceId) v.deviceId = { exact: deviceId }; else v.facingMode = "user";
  return v;
}
function fxNoteCamera(stream) {
  const t = stream && stream.getVideoTracks()[0];
  const s = t && t.getSettings ? t.getSettings() : {};
  fxCameraInfo = { width: s.width || 0, height: s.height || 0 };
  fxSyncUi();
}
async function fxPickImage() {
  const input = $("#fxBgFile");
  input.value = "";
  input.click();
}
function fxCustomTile(sfIndex) {
  // first click uploads; when a picture exists a click selects it, and clicking it again lets you change it
  if (!videoFx.custom) return fxPickImage();
  if (videoFx.st.background !== "custom") return videoFx.set({ background: "custom" });
  return fxPickImage();
}
function initVideoFxUi() {
  // markup shared by both surfaces
  const lobbyPanel = $("#lobbyFxPanel"), livePanel = $("#liveFxPanel");
  if (lobbyPanel) lobbyPanel.innerHTML = fxPanelHtml("lobby");
  if (livePanel) livePanel.innerHTML = fxPanelHtml("live");
  FX_SURFACES.forEach((sf) => {
    const add = sf.add();
    if (add && !add.querySelector("[data-fx-remove]")) {
      add.classList.add("position-relative"); // (not inside .ratio: Bootstrap stretches every direct child of a ratio box)
      add.insertAdjacentHTML("beforeend", '<span class="badge rounded-pill text-bg-dark position-absolute top-0 end-0 m-1 d-none" data-fx-remove role="button" tabindex="0" aria-label="Remove custom background" title="Remove custom background"><i class="bi bi-x-lg"></i></span>');
    }
  });
  // explanations on the less obvious controls (the same Bootstrap tooltip the locked controls use)
  const tips = { noiseSuppression: "Noise suppression — filters steady background noise and makes your voice clearer.", appearance: "Touch up my appearance — a subtle brightness, contrast, sharpness and skin-smoothing boost. Fine-tune it under Adjust.", autoLighting: "Auto adjust lighting — automatically improves brightness in low-light conditions.", mirror: "Mirror my video — flips your own preview only; other people still see you the normal way round." };
  FX_SURFACES.forEach((sf) => Object.entries(sf.sw).forEach(([key, sel]) => { const el = $(sel); if (!el) return; el.setAttribute("data-rbac-tip", tips[key]); const lab = document.querySelector(`label[for="${el.id}"]`); if (lab) lab.setAttribute("data-rbac-tip", tips[key]); }));
  const file = $("#fxBgFile");
  on(file, "change", async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const res = await videoFx.setCustomFile(f);
    if (!res.ok) toast(res.message, "error"); else toast("Custom background applied.");
  });
  document.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-fx-remove]");
    if (rm) { e.preventDefault(); e.stopPropagation(); videoFx.removeCustom(); toast("Custom background removed."); return; }
    const reset = e.target.closest("[data-fx-reset]");
    if (reset) { videoFx.set({ brightness: 0, contrast: 0, saturation: 0, sharpness: 0, warmth: 0, exposure: 0, smoothness: FX_DEFAULTS.smoothness, appearance: "off", lowLight: false }); return; }
    const ap = e.target.closest("[data-fx-appearance]");
    if (ap) { videoFx.set({ appearance: ap.getAttribute("data-fx-appearance") }); return; }
    const add = e.target.closest("#lobbyAddImageBtn, #liveBgAdd");
    if (add) { fxCustomTile(); return; }
  }, true);
  document.addEventListener("keydown", (e) => { // the little x on the custom picture is a keyboard-reachable button too
    const rm = e.target.closest && e.target.closest("[data-fx-remove]");
    if (rm && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); videoFx.removeCustom(); toast("Custom background removed."); }
  });
  document.addEventListener("input", (e) => {
    const r = e.target.closest && e.target.closest("[data-fx-range]");
    if (r) videoFx.set({ [r.getAttribute("data-fx-range")]: Number(r.value) });
  });
  document.addEventListener("change", (e) => {
    const c = e.target.closest && e.target.closest("[data-fx-switch]");
    if (c) videoFx.set({ [c.getAttribute("data-fx-switch")]: c.checked });
    if (c && c.getAttribute("data-fx-switch") === "hd") fxRestartCamera();
  });
  FX_SURFACES.forEach((sf) => Object.entries(sf.sw).forEach(([key, sel]) => {
    const el = $(sel);
    if (el) on(el, "change", () => videoFx.set(key === "appearance" ? { appearance: el.checked ? "low" : "off" } : { [key]: el.checked }));
  }));
  // The lobby's "Adjust" panel is a floating (position:fixed) dropdown: its CSS cap (max-height: min(28rem, 70vh)) is only a preference. If the popup
  // window leaves less room than that next to the button, the panel would render partly outside the viewport - and its own scrollbar can only scroll
  // content that's actually rendered inside the box, never the part that's positioned past the screen edge, so the last rows (down to Reset) were
  // unreachable. Size it to whatever room is really there, every time it opens (and if the window is resized while it's open).
  const lobbyFxToggle = $("#lobbyFxToggle");
  if (lobbyFxToggle) {
    const fitLobbyFxPanel = () => {
      const panel = $("#lobbyFxPanel"), rect = lobbyFxToggle.getBoundingClientRect(), margin = 16;
      const room = Math.max(window.innerHeight - rect.bottom, rect.top) - margin; // whichever side (below/above the button) it ends up on has this much
      panel.style.maxHeight = Math.max(160, Math.min(28 * 16 * uiScale(), window.innerHeight * 0.7, room)) + "px";
    };
    on(lobbyFxToggle, "show.bs.dropdown", fitLobbyFxPanel);
    on(window, "resize", () => { if ($("#lobbyFxPanel").classList.contains("show")) fitLobbyFxPanel(); });
  }
  videoFx.subscribe(() => { fxSyncUi(); fxPushToLive(); updateLobbyCamBadge(); });
  fxAudio.subscribe((state, level) => { micTestFeed(state, level); fxSyncMeter(state, level); if (fxAudio._last !== state) { fxAudio._last = state; fxSyncUi(); } });
  fxSyncUi();
}
function fxSyncMeter(state, level) {
  const meter = $("#audioMeter");
  if (!meter) return;
  // the wave only moves with the real analyser level, and only while a microphone test is running or has passed; otherwise it stays flat
  const spans = meter.children, on = state === "on" && MIC_TEST_LIVE.includes(micTest.state);
  meter.classList.toggle("real", on);
  for (let i = 0; i < spans.length; i++) spans[i].style.height = on ? `${Math.round(12 + Math.min(1, Math.max(0, level * 1.15 - i * .085)) * 88)}%` : "";
}
function fxPushToLive() {
  const s = videoFx.st;
  live.fx = { touchUp: s.appearance !== "off", light: s.autoLighting, mirror: s.mirror, noise: s.noiseSuppression };
  live.bg = s.background;
  if ($("#liveModalOverlay").classList.contains("open")) refreshLiveTiles();
}
function fxRestartCamera() {
  if ($("#startModalOverlay").classList.contains("open") && lobbyIsOn("#startCamBtn")) startLobbyCamera();
  else if (state.liveMeeting && liveCamOn()) liveStartCamera();
}
function fxMicDeviceId(surface) {
  if (surface === "lobby") { const s = $("#lobbyMicSelect"); return s.dataset.real ? s.value : ""; }
  const id = live.devices.mic; return live.deviceList.mic.some((d) => d.id === id) ? id : "";
}

/* ============================================================
   14. START MEETING (PRE-JOIN) MODAL
   ============================================================ */
let startModalDraft = null;
let lobbyStream = null;
let lobbyCamToken = 0;

const lobbyStage = () => $("#startCameraPreview");
const lobbyIsOn = (sel) => $(sel).classList.contains("active");

/* ---- camera preview (real webcam when available, avatar otherwise) ---- */
function setLobbyVideoLive(live, caption = "") {
  lobbyStage().classList.toggle("has-video", live);
  $("#lobbyAvatarCaption").textContent = caption;
}
function stopLobbyStream() {
  if (document.pictureInPictureElement === $("#lobbyVideo")) document.exitPictureInPicture().catch(() => {}); // the preview is going away
  videoFx.detach();
  if (lobbyStream) lobbyStream.getTracks().forEach((t) => t.stop());
  lobbyStream = null;
  $$(".lobby-video").forEach((v) => { v.srcObject = null; });
  fxNoteCamera(null);
}
function stopLobbyCamera(caption = "") {
  lobbyCamToken++;
  stopLobbyStream();
  setLobbyVideoLive(false, caption);
}
async function startLobbyCamera() {
  stopLobbyStream();
  const token = ++lobbyCamToken;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("This browser can't access a camera.", "error"); return setLobbyVideoLive(false, "Camera preview unavailable"); }
  const select = $("#lobbyCamSelect");
  const deviceId = select.dataset.real && select.value ? select.value : "";
  try {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: fxVideoConstraints(deviceId) }); }
    catch (err) { // the chosen camera is gone: use the default one
      if (!deviceId || !["OverconstrainedError", "NotFoundError"].includes(err.name)) throw err;
      stream = await navigator.mediaDevices.getUserMedia({ video: fxVideoConstraints("") });
    }
    if (token !== lobbyCamToken) { stream.getTracks().forEach((t) => t.stop()); return; }
    lobbyStream = stream;
    // the preview shows whatever the effects pipeline outputs (the plain camera stream while no effect is active)
    videoFx.attach(stream, (out) => { const v = $("#lobbyVideo"); if (v.srcObject !== out) v.srcObject = out; const p = v.play(); if (p) p.catch(() => {}); });
    fxNoteCamera(stream);
    setLobbyVideoLive(true);
    refreshLobbyDevices();
  } catch (err) {
    if (token === lobbyCamToken) { setLobbyVideoLive(false, "Camera preview unavailable"); toast(fxCameraProblem(err), "error"); }
  }
}
async function refreshLobbyDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const fill = (select, kind) => {
      const list = devices.filter((d) => d.kind === kind && d.label);
      if (!list.length) return;
      const previous = select.value;
      select.innerHTML = list.map((d) => `<option value="${escapeHtml(d.deviceId)}">${escapeHtml(d.label)}</option>`).join("");
      const active = kind === "videoinput" && lobbyStream ? lobbyStream.getVideoTracks()[0]?.getSettings().deviceId : null;
      const wanted = [previous, active].find((id) => id && list.some((d) => d.deviceId === id));
      if (wanted) select.value = wanted;
      select.dataset.real = "1";
    };
    fill($("#lobbyMicSelect"), "audioinput");
    fill($("#lobbyCamSelect"), "videoinput");
    fill($("#lobbySpeakerSelect"), "audiooutput");
  } catch { /* keep the static device lists */ }
}

/* ---- microphone test ("Test Devices") ----
   The status and the wave come from the SAME real analysis: fxAudio's analyser level. Nothing is faked: the wave stays flat until a test runs, "working" needs real audio
   above the threshold, and "No audio detected" is only reported after the whole listening window passed without any. Permission granted is not "working".
   not-tested -> testing -> audio-detected -> microphone-working | testing -> no-audio-detected | testing -> error (Permission required / Microphone unavailable / Device unavailable) */
const MIC_TEST = { windowMs: 6000, level: .06, ticks: 5 }; // listen for 6 s; "meaningful audio" = level 0.06+ (about -41 dBFS) in at least 5 analyser ticks (~0.25 s) altogether
const MIC_TEST_LIVE = ["testing", "audio-detected", "microphone-working"];
const MIC_TEST_UI = {
  "not-tested": ["Not tested", "bi-circle-fill text-body-secondary"],
  testing: ["Testing microphone…", "bi-circle-fill text-success"],
  "audio-detected": ["Audio detected…", "bi-circle-fill text-success"],
  "microphone-working": ["Microphone working", "bi-check-lg text-success"],
  "no-audio-detected": ["No audio detected", "bi-circle-fill text-danger"],
  error: ["", "bi-circle-fill text-danger"],
};
const micTest = { state: "not-tested", voiced: 0, timer: 0 };
function setMicTest(state, errorText = "") {
  micTest.state = state;
  const [text, icon] = MIC_TEST_UI[state];
  $("#micTestText").textContent = errorText || text;
  $("#micTestIcon").className = `bi ${icon} mic-test-icon`;
  $("#micTestStatus").setAttribute("data-mic-state", state);
  fxSyncMeter(fxAudio.state, fxAudio.level); // the wave follows the state at once (flat / moving)
}
function resetMicTest() { clearTimeout(micTest.timer); micTest.timer = 0; micTest.voiced = 0; setMicTest("not-tested"); }
function micTestFeed(state, level) { // called for every analyser reading (every 50 ms) and every microphone state change
  const t = micTest;
  if (!MIC_TEST_LIVE.includes(t.state)) return;
  const problem = { denied: "Permission required", unavailable: "Microphone unavailable", unsupported: "Microphone unavailable", lost: "Device unavailable" }[state];
  if (problem) { clearTimeout(t.timer); t.timer = 0; setMicTest("error", problem); return; }
  if (state !== "on" || t.state === "microphone-working") return; // still starting, or already confirmed
  if (!t.timer) t.timer = setTimeout(() => { t.timer = 0; if (t.state !== "microphone-working") setMicTest("no-audio-detected"); }, MIC_TEST.windowMs); // the listening window starts once the analyser runs
  if (level >= MIC_TEST.level) {
    t.voiced++;
    if (t.state === "testing") setMicTest("audio-detected");
    if (t.voiced >= MIC_TEST.ticks) { clearTimeout(t.timer); t.timer = 0; setMicTest("microphone-working"); }
  }
}
function runMicTest() { // a fresh analysis every time, so the result belongs to this test (and a missing device / blocked permission shows up now)
  clearTimeout(micTest.timer); micTest.timer = 0; micTest.voiced = 0;
  setMicTest("testing");
  if (!lobbyIsOn("#startMicBtn")) setLobbyMic(true); else fxAudio.start(fxMicDeviceId("lobby"));
}

/* ---- Device test: walks Microphone -> Speaker -> Camera, stoppable at any moment ----
   Both the header "Test Devices" button and the Speaker row's own "Test" button drive this SAME state, so they
   can never disagree about what's running - clicking either one starts/stops the one test, and both relabel
   together. Results show inline on each of the three rows (mic reuses its own existing real analyser-driven
   status line unchanged; camera/speaker get an equivalent line each) - there is no separate popup/panel.
   Microphone uses the real analyser-based micTest above; Speaker plays a short best-effort tone (never blocks
   on it - autoplay can be refused); Camera reads the live preview's actual track state. */
const DEVICE_TEST_ROWS = [
  { key: "mic", label: "Microphone", testingText: "Testing microphone…" },
  { key: "speaker", label: "Speaker", testingText: "Testing speaker…" },
  { key: "camera", label: "Camera", testingText: "Testing camera…" },
];
const deviceTest = { phase: "idle", current: -1, results: {}, phaseTimer: 0, audioCtx: null };
function deviceTestRowState(i) {
  const key = DEVICE_TEST_ROWS[i].key;
  if (deviceTest.results[key]) return deviceTest.results[key]; // "pass" | "fail"
  return deviceTest.current === i ? "active" : "pending";
}
function renderDeviceTestRow(i, boxId, iconId, textId) {
  const box = $("#" + boxId);
  if (!box) return;
  const state = deviceTestRowState(i);
  if (state === "pending") { box.hidden = true; return; }
  const row = DEVICE_TEST_ROWS[i];
  const icon = { active: "bi-circle-fill text-success", pass: "bi-check-lg text-success", fail: "bi-circle-fill text-danger" }[state];
  const text = state === "active" ? row.testingText : state === "pass" ? `${row.label} working` : `${row.label} test failed`;
  box.hidden = false;
  $("#" + iconId).className = `bi ${icon} mic-test-icon`;
  $("#" + textId).textContent = text;
}
function renderDeviceTestUi() {
  // Microphone's own #micTestStatus/#micTestIcon/#micTestText already reflect this phase via setMicTest(), unchanged
  renderDeviceTestRow(1, "speakerTestStatus", "speakerTestIcon", "speakerTestText");
  renderDeviceTestRow(2, "camTestStatus", "camTestIcon", "camTestText");
  const running = deviceTest.phase === "running", failed = deviceTest.phase === "failure";
  const topBtn = $("#startTestDevicesBtn");
  if (topBtn) topBtn.innerHTML = running ? '<i class="bi bi-stop-fill me-1"></i>Stop Test' : failed ? "Try Again" : "Test Devices";
  const spkBtn = $("#startSpeakerTestBtn");
  if (spkBtn) spkBtn.innerHTML = running ? '<i class="bi bi-stop-fill me-1"></i>Stop Test' : failed ? "Try Again" : "Test";
}
function closeDeviceTestAudio() { if (deviceTest.audioCtx) { try { deviceTest.audioCtx.close(); } catch { /* already closed */ } deviceTest.audioCtx = null; } }
function clearDeviceTestTimers() { clearTimeout(deviceTest.phaseTimer); deviceTest.phaseTimer = 0; closeDeviceTestAudio(); }
function runDeviceMicPhase(i) {
  runMicTest(); // real analyser-based test - unchanged
  const check = () => {
    if (deviceTest.current !== i) return; // stopped or superseded
    if (micTest.state === "microphone-working") return finishDeviceTestPhase(i, true);
    if (micTest.state === "no-audio-detected" || micTest.state === "error") return finishDeviceTestPhase(i, false);
    deviceTest.phaseTimer = setTimeout(check, 200);
  };
  deviceTest.phaseTimer = setTimeout(check, 200);
}
function runDeviceSpeakerPhase(i) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    deviceTest.audioCtx = ctx;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.value = 440; gain.gain.value = 0.08;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  } catch { /* autoplay blocked or unsupported - the phase still completes visually, exactly like the mock in the spec */ }
  deviceTest.phaseTimer = setTimeout(() => { closeDeviceTestAudio(); finishDeviceTestPhase(i, true); }, 1400);
}
function runDeviceCameraPhase(i) {
  deviceTest.phaseTimer = setTimeout(() => {
    const track = lobbyStream && lobbyStream.getVideoTracks()[0];
    finishDeviceTestPhase(i, !!(lobbyIsOn("#startCamBtn") && track && track.readyState === "live"));
  }, 1200);
}
function finishDeviceTestPhase(i, passed) {
  deviceTest.results[DEVICE_TEST_ROWS[i].key] = passed ? "pass" : "fail";
  if (!passed) { deviceTest.phase = "failure"; deviceTest.current = -1; renderDeviceTestUi(); return; }
  runDeviceTestPhase(i + 1);
}
function runDeviceTestPhase(i) {
  if (i >= DEVICE_TEST_ROWS.length) { deviceTest.phase = "success"; deviceTest.current = -1; renderDeviceTestUi(); return; }
  deviceTest.current = i;
  renderDeviceTestUi();
  const key = DEVICE_TEST_ROWS[i].key;
  if (key === "mic") runDeviceMicPhase(i);
  else if (key === "speaker") runDeviceSpeakerPhase(i);
  else runDeviceCameraPhase(i);
}
function startDeviceTest() {
  clearDeviceTestTimers();
  deviceTest.phase = "running"; deviceTest.current = -1; deviceTest.results = {};
  runDeviceTestPhase(0);
}
function stopDeviceTest() {
  clearDeviceTestTimers();
  deviceTest.phase = "idle"; deviceTest.current = -1; deviceTest.results = {};
  resetMicTest(); // back to "Not tested" - this only resets the test STATUS, never the selected device
  renderDeviceTestUi();
}
function toggleDeviceTest() { if (deviceTest.phase === "running") stopDeviceTest(); else startDeviceTest(); }
function initDeviceTestPanel() {
  on($("#startTestDevicesBtn"), "click", toggleDeviceTest);
  on($("#startSpeakerTestBtn"), "click", toggleDeviceTest);
}

/* ---- mic / camera toggles ---- */
function setLobbyMic(on) {
  const btn = $("#startMicBtn");
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", String(on));
  $("#startMicLabel").textContent = on ? "Mic" : "Mic off";
  if (!on) resetMicTest();
  if (on && !$("#startModalOverlay").hidden) fxAudio.start(fxMicDeviceId("lobby")); else fxAudio.stop();
  fxSyncUi();
}
// background label shown in the preview badge - "none" shows nothing extra, everything else names itself
const FX_BG_LABELS = { blur: "Background Blur", office: "Office Background", home: "Home Background", classroom: "Classroom Background", beach: "Beach Background", custom: "Custom Background" };
function updateLobbyCamBadge() {
  const badge = $("#startPreviewCamStatusBadge");
  if (!badge) return;
  const on = lobbyIsOn("#startCamBtn");
  const bgLabel = on ? FX_BG_LABELS[videoFx.st.background] : "";
  badge.innerHTML = `<span class="status-dot-sm ${on ? "good" : ""}"></span> Camera is ${on ? "on" : "off"}`
    + (bgLabel ? `<span class="lobby-badge-sep"></span><i class="bi bi-image"></i> ${bgLabel}` : "");
}
function setLobbyCam(on) {
  const btn = $("#startCamBtn");
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", String(on));
  $("#startCamLabel").textContent = on ? "Camera" : "Start Video";
  updateLobbyCamBadge();
  $("#cameraHdBadge").classList.toggle("d-none", !on);
  if (on) startLobbyCamera(); else stopLobbyCamera("Camera is off");
  fxSyncUi(); // the avatar-side background hint (data-bg) depends on camera on/off too, not just the selected background
}

/* ---- meeting security (UI only: a prototype control, like the Schedule modal's own password switch - there is no join-time password check to wire it to) ---- */
function genLobbyPassword() { return "Teloz@" + Math.floor(1000 + Math.random() * 9000); }
function setLobbyPassword(on, value) {
  $("#lobbyPasswordToggle").checked = on;
  $("#lobbyPasswordHint").textContent = on ? "Participants will need a password to join" : "Protect your meeting with a password";
  if (value) $("#lobbyPasswordInput").value = value;
  bootstrap.Collapse.getOrCreateInstance($("#lobbyPasswordFields"), { toggle: false })[on ? "show" : "hide"]();
}
/* ---- background + enhancements ---- */
// (background, switches and adjustments live in videoFx; fxSyncUi() paints them onto this popup)
function setLobbyBackground(kind) { videoFx.set({ background: kind }); }
function updateLobbyEnhancements() { fxSyncUi(); }
/* ---- Picture-in-Picture for the preview (the browser's own window; the tile video keeps its native PiP button switched off so this stays the one way in) ---- */
function syncLobbyPip() {
  const btn = $("#startPipBtn"), on = document.pictureInPictureElement === $("#lobbyVideo"), ok = pipSupported();
  btn.classList.toggle("active", on);
  btn.classList.toggle("opacity-50", !ok);
  btn.setAttribute("aria-pressed", String(on));
  btn.setAttribute("aria-disabled", String(!ok));
  $("#startPipLabel").textContent = on ? "Exit PiP" : "PiP";
  const text = on ? "Exit Picture in Picture" : ok ? "Picture in Picture" : "Picture-in-Picture is not supported in this browser.";
  btn.title = text; btn.setAttribute("aria-label", text);
}
async function toggleLobbyPip() {
  const v = $("#lobbyVideo");
  if (document.pictureInPictureElement === v) { try { await document.exitPictureInPicture(); } catch { /* already closed */ } return; }
  if (!pipSupported()) { toast("Picture-in-Picture is not supported in this browser.", "error", "pip"); return; }
  if (!lobbyStream || !lobbyIsOn("#startCamBtn")) { toast("Turn your camera on to use Picture-in-Picture.", "error", "pip"); return; }
  try { v.disablePictureInPicture = false; await v.play().catch(() => {}); await v.requestPictureInPicture(); }
  catch { v.disablePictureInPicture = true; toast("Picture-in-Picture couldn't start right now.", "error", "pip"); }
}

function initStartModal() {
  on($("#btnStartMeeting"), "click", () => {
    if (!authorize("meeting.create")) return;
    $("#instantMeetingName").value = `${ME.name.split(" ")[0]}'s Meeting`;
    startModalDraft = { meetingCode: genMeetingId(), link: genMeetingLink() };
    state.startInvite = { participants: [], guests: [] }; // a fresh lobby session starts with no queued invitations
    $("#startMeetingIdText").textContent = startModalDraft.meetingCode;

    const remembered = state.lobbyPrefs.remember;
    const prefs = remembered ? state.lobbyPrefs : { mic: true, cam: true, noiseSuppression: true, touchUp: false, mirror: true, autoLight: true, password: false, passwordValue: "" };
    $("#lobbyRememberSettings").checked = remembered;
    videoFx.reset(remembered); // the fine adjustments only come back when "Remember my settings" was ticked
    videoFx.set({ noiseSuppression: prefs.noiseSuppression, mirror: prefs.mirror, autoLighting: prefs.autoLight, background: "none",
      appearance: prefs.touchUp ? (videoFx.st.appearance !== "off" ? videoFx.st.appearance : "low") : "off" });
    openModal("startModalOverlay");
    resetMicTest();
    setLobbyMic(prefs.mic);
    setLobbyCam(prefs.cam);
    setLobbyPassword(!!prefs.password, prefs.passwordValue || genLobbyPassword());
  });

  on($("#startMicBtn"), "click", () => setLobbyMic(!lobbyIsOn("#startMicBtn")));
  on($("#startCamBtn"), "click", () => setLobbyCam(!lobbyIsOn("#startCamBtn")));
  on($("#startPipBtn"), "click", toggleLobbyPip);
  on($("#lobbyVideo"), "enterpictureinpicture", syncLobbyPip);
  on($("#lobbyVideo"), "leavepictureinpicture", () => { $("#lobbyVideo").disablePictureInPicture = true; syncLobbyPip(); });
  syncLobbyPip();
  on($("#previewFullscreenBtn"), "click", () => {
    if (!document.fullscreenElement) { const p = lobbyStage().requestFullscreen && lobbyStage().requestFullscreen(); if (p) p.catch(() => toast("Fullscreen isn't supported here.")); }
    else document.exitFullscreen();
  });

  on($("#lobbyBgThumbRow"), "click", (e) => {
    const thumb = e.target.closest("[data-bg-thumb]");
    if (thumb) setLobbyBackground(thumb.getAttribute("data-bg-thumb"));
  });

  on($("#lobbyEnhancements"), "change", updateLobbyEnhancements);
  on($("#lobbyCamSelect"), "change", () => { if ($("#lobbyCamSelect").dataset.real && lobbyIsOn("#startCamBtn")) startLobbyCamera(); });
  on($("#lobbyMicSelect"), "change", () => { resetMicTest(); if ($("#lobbyMicSelect").dataset.real && lobbyIsOn("#startMicBtn")) fxAudio.start(fxMicDeviceId("lobby")); }); // another microphone: not tested yet
  on($("#lobbyRememberSettings"), "change", (e) => { state.lobbyPrefs.remember = e.target.checked; saveState(); });

  on($("#lobbyPasswordToggle"), "change", (e) => setLobbyPassword(e.target.checked));
  on($("#lobbyPasswordVisBtn"), "click", () => {
    const input = $("#lobbyPasswordInput"), show = input.type === "password";
    input.type = show ? "text" : "password";
    $("#lobbyPasswordVisBtn").innerHTML = `<i class="bi bi-eye${show ? "-slash" : ""}"></i>`;
    $("#lobbyPasswordVisBtn").title = $("#lobbyPasswordVisBtn").ariaLabel = show ? "Hide password" : "Show password";
  });
  on($("#lobbyPasswordGenBtn"), "click", () => { $("#lobbyPasswordInput").value = genLobbyPassword(); });

  on($("#lobbyInvitePeopleBtn"), "click", () => openInviteModal(null));
  on($("#startCopyLinkBtn"), "click", () => {
    if (!startModalDraft) return;
    const btn = $("#startCopyLinkBtn");
    const copy = () => {
      const original = btn.innerHTML;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      toast("Meeting link copied");
      setTimeout(() => { btn.innerHTML = original; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(startModalDraft.link).then(copy).catch(copy);
    } else copy();
  });

  initDeviceTestPanel(); // wires #startSpeakerTestBtn's click itself (it now drives the same shared mic->speaker->camera test as the header button)

  // Start Meeting: the meeting opens in a NEW browser tab (see "MEETING TAB" below); this tab keeps the Video Meetings page and the pre-join popup exactly as they are.
  let lastTabOpen = 0;
  on($("#startMeetingSubmitBtn"), "click", () => {
    if (Date.now() - lastTabOpen < 1500) return; // a double-click must not open two meeting tabs
    const picked = (sel) => { const s = $(sel); return { id: s.dataset.real ? s.value : "", name: s.selectedOptions[0] ? s.selectedOptions[0].textContent.trim() : "" }; };
    const mic = picked("#lobbyMicSelect"), cam = picked("#lobbyCamSelect"), spk = picked("#lobbySpeakerSelect");
    const cfg = {
      code: startModalDraft ? startModalDraft.meetingCode : genMeetingId(),
      link: startModalDraft ? startModalDraft.link : genMeetingLink(),
      name: $("#instantMeetingName").value.trim() || "Instant Meeting",
      mic: lobbyIsOn("#startMicBtn"), cam: lobbyIsOn("#startCamBtn"),
      micId: mic.id, micName: mic.name, camId: cam.id, camName: cam.name, spkId: spk.id, spkName: spk.name,
      bg: videoFx.st.background, mirror: videoFx.st.mirror, touchUp: videoFx.st.appearance !== "off",
      light: videoFx.st.autoLighting, noise: videoFx.st.noiseSuppression, useStored: true,
    };
    // The password never travels in the URL (a new tab's address bar/history is not the place for it): a short-lived localStorage
    // handoff, read once by instantMeeting() in the new tab and immediately deleted.
    const pwKey = "mcm-instant-pw-" + cfg.code;
    try { localStorage.setItem(pwKey, JSON.stringify({ password: $("#lobbyPasswordToggle").checked, passwordValue: $("#lobbyPasswordInput").value })); } catch (e) { /* storage blocked */ }
    // Same handoff, for the queued Invite Participants selection: nothing was actually sent while only the lobby existed, this is
    // what instantMeeting() in the new tab reads once the meeting has a real ID, to finally create/send the real invitations.
    const invKey = "mcm-instant-invite-" + cfg.code;
    const hasQueuedInvites = state.startInvite.participants.length || state.startInvite.guests.length;
    if (hasQueuedInvites) { try { localStorage.setItem(invKey, JSON.stringify(state.startInvite)); } catch (e) { /* storage blocked */ } }
    // Straight from the click, nothing asynchronous before it: that is what keeps browsers from treating the new tab as a blocked pop-up.
    const tab = window.open(meetingTabUrl(cfg), "_blank");
    if (!tab || tab.closed || typeof tab.closed === "undefined") {
      try { localStorage.removeItem(pwKey); } catch (e) { /* ignore */ }
      if (hasQueuedInvites) try { localStorage.removeItem(invKey); } catch (e) { /* ignore */ }
      toast("Your browser blocked the new tab. Allow pop-ups for this page, then click Start Meeting again.", "error");
      return;
    }
    lastTabOpen = Date.now();
    if ($("#lobbyRememberSettings").checked) {
      Object.assign(state.lobbyPrefs, {
        remember: true, mic: cfg.mic, cam: cfg.cam,
        noiseSuppression: cfg.noise, touchUp: cfg.touchUp, mirror: cfg.mirror, autoLight: cfg.light,
        password: $("#lobbyPasswordToggle").checked, passwordValue: $("#lobbyPasswordInput").value,
      });
      saveState();
    }
    toast("Your meeting opened in a new tab.");
  });
}

/* ============================================================
   14b. MEETING TAB
   Start Meeting opens the meeting screen in its own browser tab. There is no separate meeting page: the meeting UI is the live room
   below, and the tab is this same page opened with ?view=meeting&… (the "route"). It builds the same meeting object the pop-up used to
   build and starts the same live room, so nothing is duplicated. The pre-join choices travel in the URL.
   ============================================================ */
const MEETING_BGS = FX_BACKGROUNDS;
const APP_TITLE = document.title;

// pre-join choices -> URL of the meeting tab
function meetingTabUrl(cfg) {
  const url = new URL(location.href);
  url.search = ""; url.hash = "";
  const q = url.searchParams;
  q.set("view", "meeting");
  q.set("id", cfg.code); q.set("name", cfg.name); q.set("link", cfg.link);
  ["mic", "cam", "mirror", "touchUp", "light", "noise"].forEach((k) => q.set(k, cfg[k] ? "1" : "0"));
  q.set("bg", cfg.bg);
  ["micId", "micName", "camId", "camName", "spkId", "spkName"].forEach((k) => { if (cfg[k]) q.set(k, cfg[k]); });
  return url.toString();
}

// URL of the meeting tab -> pre-join choices (null on the normal page). Everything in a URL is untrusted, so each value is validated.
function readMeetingRoute() {
  const q = new URLSearchParams(location.search);
  if (q.get("view") !== "meeting") return null;
  const text = (k, max) => (q.get(k) || "").trim().slice(0, max);
  const flag = (k, dflt) => (q.has(k) ? q.get(k) !== "0" : dflt);
  return {
    code: /^\d{3}-\d{3}-\d{3}$/.test(q.get("id") || "") ? q.get("id") : genMeetingId(),
    link: /^https:\/\/meet\.mcm\.example\/[a-z0-9]{1,32}$/.test(q.get("link") || "") ? q.get("link") : genMeetingLink(),
    name: text("name", 80) || "Instant Meeting",
    settings: {
      mic: flag("mic", true), cam: flag("cam", true), mirror: flag("mirror", true), touchUp: flag("touchUp", false), light: flag("light", true), noise: flag("noise", true),
      bg: MEETING_BGS.includes(q.get("bg")) ? q.get("bg") : "none", useStored: true,
      micId: text("micId", 300), micName: text("micName", 120), camId: text("camId", 300), camName: text("camName", 120), spkId: text("spkId", 300), spkName: text("spkName", 120),
    },
  };
}

function instantMeeting(name, code, link) {
  const pwKey = "mcm-instant-pw-" + code;
  let security;
  try {
    const raw = localStorage.getItem(pwKey);
    if (raw) {
      const p = JSON.parse(raw);
      security = { password: !!p.password, passwordValue: p.password ? p.passwordValue : "" };
      localStorage.removeItem(pwKey);
    }
  } catch (e) { /* storage blocked / corrupt - falls back to no password, same as before this fix */ }
  const meeting = baseMeeting({
    title: name, hostId: ME.id, date: TODAY_ISO,
    startTime: new Date().toTimeString().slice(0, 5), duration: 30, status: "Live",
    participants: [], meetingCode: code, link, security, ...ownershipForNewMeeting(ME.id), // real: nobody has access until actually invited
  });
  // Activate whatever was queued in the pre-meeting "Invite Participants" modal, now that a real meeting/ID finally exists.
  const invKey = "mcm-instant-invite-" + code;
  try {
    const raw = localStorage.getItem(invKey);
    if (raw) {
      const queued = JSON.parse(raw);
      localStorage.removeItem(invKey);
      let sent = 0, failed = 0;
      (queued.participants || []).filter((id) => id !== meeting.hostId).forEach((id) => {
        try {
          if (!meeting.participants.includes(id)) meeting.participants.push(id);
          if (createInvitation(meeting, id)) sent++;
        } catch (e) { failed++; }
      });
      (queued.guests || []).forEach((email) => { if (!meeting.guests.some((g) => g.email === email)) meeting.guests.push({ email }); });
      if (sent || failed) toast(`Meeting started. ${sent} invitation${sent === 1 ? "" : "s"} sent${failed ? `, ${failed} failed` : ""}.`);
    }
  } catch (e) { /* storage blocked / corrupt - the meeting still starts, just without the queued invites */ }
  return meeting;
}
function findMeetingByCode(code) {
  for (const key of ["ongoing", "upcoming", "invited", "past"]) {
    const m = state.meetings[key].find((x) => x.meetingCode === code);
    if (m) return { meeting: m, listKey: key };
  }
  return null;
}

// This tab was opened by Start Meeting: go straight into the live room. Reloading the tab resumes the same meeting; a meeting that already ended is not revived.
function startMeetingTab(route) {
  document.documentElement.classList.add("meeting-tab");
  const found = findMeetingByCode(route.code);
  if (found && found.listKey === "past") { leaveMeetingTab(); toast("This meeting has already ended."); return; }
  if (found ? !can("meeting.join", found.meeting) : !can("meeting.create")) { leaveMeetingTab(); toast(RBAC_DENIED, "error"); return; } // e.g. a hand-edited URL
  const meeting = found ? found.meeting : instantMeeting(route.name, route.code, route.link);
  document.title = `${meeting.title} · Meeting`;
  startLiveMeeting(meeting, false, route.settings);
}
// The meeting is over: this tab turns back into the normal Video Meetings page (the existing behaviour after a meeting ends).
function leaveMeetingTab() {
  if (!document.documentElement.classList.contains("meeting-tab")) return;
  document.documentElement.classList.remove("meeting-tab");
  document.title = APP_TITLE;
  try { history.replaceState(null, "", location.pathname); } catch { /* some file:// pages can't rewrite their own URL */ }
}

// Both tabs share one saved state: when the other tab saves (a meeting started or ended, demo data toggled, ...), pick it up and redraw, so neither tab works from stale data or overwrites the other's changes.
function initTabSync() {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    loadState();
    $("#demoDataToggle").checked = state.demoData;
    applyRbac();
  });
}

/* ============================================================
   15. LIVE MEETING ROOM
   ============================================================ */
const live = {
  view: "speaker", pinnedId: null, speakerId: null, panel: null, hostId: null,
  hand: false, hideSelf: false, recState: "idle", recSecs: 0, quality: "auto", speaking: new Set(), autoPip: false, pipHint: false, pipOpening: false, pipClosing: false,
  sharing: false, shareStream: null, shareAudio: false,
  locked: false, onlyHostShare: false, perms: { unmute: true, chat: true, react: true }, blocked: [], joined: [], realMode: false, endedClosing: false,
  bg: "none", fx: { touchUp: false, light: true, mirror: true, noise: true },
  stream: null, streamFailed: false, camToken: 0, camId: "", spkId: "", micAsked: false, devices: { mic: "", cam: "", spk: "" }, deviceList: { mic: [], cam: [] },
  peers: {}, chat: [], qa: [], qaFilter: "all", qaAnswering: null, chatTo: "all", dialog: null, dialogReturn: null, confirmOk: null,
  wb: { open: false, strokes: [], tool: "pen", color: "#ffffff", drawing: null, observer: null },
  timers: { clock: null, speaking: null, rec: null, lock: null },
};
const LIVE_LANG = { en: "English", hi: "Hindi", es: "Spanish" };
const LIVE_QUALITY_H = { auto: 0, low: 240, standard: 480, high: 1080 };
const LIVE_STATIC_DEVICES = {
  mic: ["Microphone Array (Intel® Smart Sound Technology)", "Default - Microphone"],
  cam: ["Integrated Camera", "USB HD Webcam"],
};

const liveMicOn = () => $("#liveMicBtn").classList.contains("active");
const liveCamOn = () => $("#liveCamBtn").classList.contains("active");
// moderator powers (mute, remove, lock, record, answer Q&A, bypass "only the host can share" ...): the role's rights for THIS meeting, whoever is listed as host
const liveCanModerate = () => can("meeting.moderate", state.liveMeeting);
const liveHue = (id) => (id === ME.id ? 215 : (parseInt(id.replace(/\D/g, ""), 10) * 67 + 20) % 360);
const liveClock = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const liveTime = (offsetMin = 0) => liveClock(Date.now() - offsetMin * 60000);
const liveMobile = () => window.matchMedia("(max-width: 767.98px)").matches;
const liveMenu = (el) => bootstrap.Dropdown.getOrCreateInstance(el);

function livePeople() {
  const m = state.liveMeeting;
  if (!m) return [ME];
  // Real mode: only people who actually opened this meeting (this tab + whoever else's presence has arrived) - never the whole invite list up front.
  if (live.realMode) return [...new Set([ME.id, ...live.joined])].map(userById).filter(Boolean);
  return [...new Set([ME.id, m.hostId, ...m.participants, ...live.joined])].map(userById).filter(Boolean);
}
const liveTileUsers = () => livePeople().filter((u) => !(live.hideSelf && u.id === ME.id));
function livePeerState(u) {
  if (u.id === ME.id) return { muted: !liveMicOn(), camOff: !liveCamOn(), hand: live.hand };
  return live.peers[u.id] || { muted: false, camOff: false, hand: false };
}
function seedLivePeer(u, i) { live.peers[u.id] = { muted: i % 3 === 1, camOff: i % 4 === 3, hand: i === 2 }; }

/* ---- real-user presence (Demo Data OFF): other browser tabs of THIS SAME machine, each signed in as a different demo user via the role
   switcher, announce themselves through one shared localStorage key. There is no backend/websocket here, so this only works across tabs/windows
   of the same browser - it is real (not faked) join/leave + mic/cam sync, just scoped to one machine, per this prototype's constraints. */
const LIVE_PRESENCE_KEY = "mcm-live-presence-v1";
const LIVE_PRESENCE_STALE_MS = 12000, LIVE_PRESENCE_HEARTBEAT_MS = 4000;
let livePresenceTimer = null;
function readLivePresenceAll() {
  try { return JSON.parse(localStorage.getItem(LIVE_PRESENCE_KEY) || "{}"); } catch (e) { return {}; }
}
function writeLivePresenceAll(all) {
  try { localStorage.setItem(LIVE_PRESENCE_KEY, JSON.stringify(all)); } catch (e) { /* storage blocked / full */ }
}
function publishLivePresence() {
  if (!live.realMode || !state.liveMeeting) return;
  const all = readLivePresenceAll(), mid = state.liveMeeting.id;
  all[mid] = all[mid] || {};
  all[mid][ME.id] = { muted: !liveMicOn(), camOff: !liveCamOn(), hand: live.hand, ts: Date.now() };
  writeLivePresenceAll(all);
}
function clearLivePresenceSelf(meeting) {
  const mid = meeting && meeting.id;
  if (!mid) return;
  const all = readLivePresenceAll();
  if (!all[mid]) return;
  delete all[mid][ME.id];
  if (!Object.keys(all[mid]).length) delete all[mid];
  writeLivePresenceAll(all);
}
// merges every OTHER tab's fresh presence for the current meeting into live.joined / live.peers, then redraws
function applyLivePresence() {
  if (!live.realMode || !state.liveMeeting) return;
  const mine = readLivePresenceAll()[state.liveMeeting.id] || {};
  const now = Date.now();
  const freshIds = Object.keys(mine).filter((id) => id !== ME.id && now - mine[id].ts < LIVE_PRESENCE_STALE_MS);
  live.joined = freshIds;
  freshIds.forEach((id) => { live.peers[id] = { muted: !!mine[id].muted, camOff: !!mine[id].camOff, hand: !!mine[id].hand }; });
  Object.keys(live.peers).forEach((id) => { if (id !== ME.id && !freshIds.includes(id)) delete live.peers[id]; });
  renderLiveStage();
  if (live.panel === "participants") renderLivePanel();
}
function startLivePresenceSync() {
  stopLivePresenceSync();
  if (!live.realMode) return;
  publishLivePresence();
  applyLivePresence();
  livePresenceTimer = setInterval(() => { publishLivePresence(); applyLivePresence(); }, LIVE_PRESENCE_HEARTBEAT_MS);
}
function stopLivePresenceSync() {
  if (livePresenceTimer) { clearInterval(livePresenceTimer); livePresenceTimer = null; }
}
function initLivePresenceSync() {
  window.addEventListener("storage", (e) => { if (e.key === LIVE_PRESENCE_KEY) applyLivePresence(); });
  window.addEventListener("beforeunload", () => { if (live.realMode && state.liveMeeting) clearLivePresenceSelf(state.liveMeeting); });
}

/* ---- Demo Data / Real Users pill in the live room header ---- */
function liveDataModeInfo(real) {
  return real
    ? { icon: "bi-people-fill", label: "Real Users", badge: "OFF", tip: "Using real users and live meeting data" }
    : { icon: "bi-flask", label: "Demo Data", badge: "ON", tip: "Using simulated participants and meeting activity" };
}
function syncLiveDataModeUi() {
  const btn = $("#liveDataModeBtn");
  if (!btn) return;
  const info = liveDataModeInfo(live.realMode);
  btn.querySelector(".bi").className = `bi ${info.icon}`;
  $("#liveDataModeLabel").textContent = info.label;
  $("#liveDataModeBadge").textContent = info.badge;
  btn.title = info.tip;
  btn.classList.toggle("live-pill-real", live.realMode);
}
function setLiveDataMode(real) {
  live.realMode = !!real;
  live.peers = {};
  live.joined = [];
  if (live.realMode) {
    startLivePresenceSync();
  } else {
    stopLivePresenceSync();
    clearLivePresenceSelf(state.liveMeeting);
    livePeople().forEach((u, i) => { if (u.id !== ME.id) seedLivePeer(u, i); });
    speakerSim.id = null; speakerSim.nextAt = performance.now() + 1500;
  }
  syncLiveDataModeUi();
  renderLiveStage();
  if (live.panel === "participants") renderLivePanel();
  toast(live.realMode ? "Switched to real users." : "Switched to demo data.");
}
function liveMainId() {
  const ids = liveTileUsers().map((u) => u.id);
  if (live.pinnedId && ids.includes(live.pinnedId)) return live.pinnedId;
  return live.speakerId && ids.includes(live.speakerId) ? live.speakerId : ids[0];
}

/* ---- self camera (real webcam when available) ---- */
function liveVideoConstraints() {
  const v = fxVideoConstraints(live.camId);
  if (LIVE_QUALITY_H[live.quality]) v.height = { ideal: LIVE_QUALITY_H[live.quality] };
  return v;
}
function liveStopStream() {
  exitPip();
  videoFx.detach();
  live.display = null;
  if (live.stream) live.stream.getTracks().forEach((t) => t.stop());
  live.stream = null;
  fxNoteCamera(null);
}
async function liveStartCamera() {
  liveStopStream();
  const token = ++live.camToken;
  live.streamFailed = false;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) live.streamFailed = true;
  else {
    try {
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: liveVideoConstraints() }); }
      catch (err) {
        // the camera picked before joining may be gone (unplugged, or a different browser profile): fall back to the default camera
        if (!live.camId || !["OverconstrainedError", "NotFoundError"].includes(err.name)) throw err;
        live.camId = ""; live.devices.cam = "";
        stream = await navigator.mediaDevices.getUserMedia({ video: liveVideoConstraints() });
      }
      if (token !== live.camToken || !liveCamOn()) { stream.getTracks().forEach((t) => t.stop()); return; }
      live.stream = stream;
      videoFx.attach(stream, (out) => { live.display = out; attachLiveVideo(); }); // tiles show the effects pipeline's output
      fxNoteCamera(stream);
    } catch (err) { if (token === live.camToken) { live.streamFailed = true; toast(fxCameraProblem(err), "error"); } }
  }
  if (token === live.camToken) { renderLiveStage(); }
}
function attachLiveVideo() {
  const shown = live.display || live.stream;
  const pv = $("#livePipVideo");
  if (pv && pv.srcObject !== (shown || null)) { pv.srcObject = shown || null; if (shown) { const pp = pv.play(); if (pp) pp.catch(() => {}); } }
  if (!shown) return;
  $$("#liveStage .live-tile-video, #liveStrip .live-tile-video").forEach((v) => {
    if (v.srcObject !== shown) v.srcObject = shown;
    const p = v.play();
    if (p) p.catch(() => {});
  });
}

/* ---- tiles: html is built once per structural change, states are patched in place ---- */
const liveMicIcon = (st) => `<i class="bi ${st.muted ? "bi-mic-mute-fill" : "bi-mic-fill"}" title="${st.muted ? "Muted" : "Mic on"}"></i>`;
const liveChipInner = (u, st) => `${st.hand ? '<i class="bi bi-hand-index-thumb-fill"></i>' : ""}<span>${escapeHtml(u.name)}${u.id === ME.id ? " (You)" : ""}</span>${u.demo ? '<span class="live-ai-demo">DEMO</span>' : ""}${st.camOff ? '<i class="bi bi-camera-video-off-fill" title="Camera off"></i>' : ""}${liveMicIcon(st)}`;
const liveAudioInner = (st) => liveMicIcon(st) + (st.muted ? "" : '<span class="bars" aria-hidden="true"><i class="bar"></i><i class="bar"></i><i class="bar"></i></span>');
function liveCaptionFor(u, st, main) {
  if (!main) return "";
  if (st.camOff) return "Camera off";
  return u.id === ME.id && live.streamFailed ? "Camera unavailable" : "";
}
function liveMenuItems(u) {
  const isMe = u.id === ME.id, st = livePeerState(u), m = state.liveMeeting;
  const it = (a, icon, text, cls = "") => `<li><button class="dropdown-item ${cls}" type="button" data-live-action="${a}" data-user="${u.id}"><i class="bi ${icon} me-2"></i>${text}</button></li>`;
  const out = [];
  if (!isMe && can("participants.mute", m)) out.push(st.muted ? it("ask-unmute", "bi-mic", "Ask to unmute") : it("mute", "bi-mic-mute", "Mute"));
  if (!isMe && can("participants.stopVideo", m)) out.push(st.camOff ? it("ask-video", "bi-camera-video", "Ask to start video") : it("stop-video", "bi-camera-video-off", "Stop video"));
  if (st.hand && (isMe || can("participants.manage", m))) out.push(it("lower-hand", "bi-hand-index-thumb", isMe ? "Lower my hand" : "Lower hand"));
  if (can("participants.pin", m)) out.push(live.pinnedId === u.id ? it("unpin", "bi-pin-angle", "Unpin") : it("pin", "bi-pin-angle-fill", "Pin"));
  if (!isMe && can("participants.message", m)) out.push(it("message", "bi-chat-left-text", "Message privately"));
  if (!isMe && can("participants.view", m)) out.push(it("view-details", "bi-person-vcard", "View details"));
  const moderation = [], notHost = u.id !== live.hostId; // the host can't be made host again, and a meeting is never left without one (End for all is the way to close it)
  if (!isMe && notHost && can("participants.manage", m)) moderation.push(it("make-host", "bi-person-check", "Make host"));
  if (!isMe && notHost && can("participants.remove", m)) moderation.push(it("remove", "bi-person-x", "Remove participant", "text-danger"));
  if (moderation.length) out.push('<li><hr class="dropdown-divider" /></li>', ...moderation);
  return out.join("");
}
// what a participant's details show: an Agent gets the name and role, roles with full access also the e-mail and the mic / camera state
function showParticipantDetails(u) {
  const st = livePeerState(u), full = can("participants.viewDetails", state.liveMeeting);
  toast(`${u.name} · ${u.id === live.hostId ? "Host" : "Participant"}${full ? ` · ${u.email} · mic ${st.muted ? "off" : "on"}, camera ${st.camOff ? "off" : "on"}` : ""}`);
}
function liveTileHtml(u, mode) {
  const st = livePeerState(u), isMe = u.id === ME.id, main = mode === "main";
  const name = escapeHtml(u.name) + (isMe ? " (You)" : "");
  const cls = ["live-tile", main ? "main" : "", !main && u.id === liveMainId() ? "selected" : "", live.speaking.has(u.id) && !st.muted ? "speaking" : "",
    isMe && !st.camOff && live.stream ? "has-video" : "", isMe && live.fx.mirror ? "mirrored" : "", isMe && live.fx.touchUp ? "touchup" : "", isMe && live.fx.light ? "autolight" : ""].filter(Boolean).join(" ");
  const media = isMe ? '<div class="live-bg-layer"></div><video class="live-tile-video live-video-main" autoplay muted playsinline disablepictureinpicture></video>' : "";
  const face = `<div class="live-tile-face"><div class="live-tile-avatar">${u.initials}</div><span class="live-tile-caption">${liveCaptionFor(u, st, main)}</span></div>`;
  const attrs = `class="${cls}" style="--hue:${liveHue(u.id)}" data-tile-user="${u.id}" data-bg="${isMe ? live.bg : "none"}"`;
  if (main) {
    const pinned = !!live.pinnedId && live.pinnedId === u.id;
    return `<div ${attrs}>${media}${face}
      <div class="live-badge">
        <span class="d-flex align-items-center gap-1 flex-shrink-0">${pinned ? '<i class="bi bi-pin-angle-fill"></i>Pinned' : '<i class="bi bi-soundwave"></i>Speaking'}</span>
        <span class="live-badge-sep"></span><span class="text-truncate">${name}</span><i class="bi bi-hand-index-thumb-fill text-warning live-badge-hand" ${st.hand ? "" : "hidden"}></i>
      </div>
      <div class="live-tile-tools">
        <button class="live-solid-btn" type="button" data-live-action="tile-fullscreen" aria-label="Full screen"><i class="bi bi-arrows-fullscreen"></i></button>
        <div class="position-relative">
          <button class="live-solid-btn" type="button" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false" aria-label="Video options"><i class="bi bi-three-dots"></i></button>
          <ul class="dropdown-menu dropdown-menu-end live-tile-menu">${liveMenuItems(u)}</ul>
        </div>
      </div>
      <div class="live-audio-pill" aria-label="${st.muted ? "Microphone muted" : "Microphone on"}">${liveAudioInner(st)}</div>
    </div>`;
  }
  return `<div ${attrs} role="button" tabindex="0" aria-label="${name}">${media}${face}
    <span class="live-eq" aria-hidden="true"><i></i><i></i><i></i></span><div class="live-chip">${liveChipInner(u, st)}</div></div>`;
}
function refreshLiveTiles() {
  $$("#liveModalOverlay [data-tile-user]").forEach((tile) => {
    const u = userById(tile.getAttribute("data-tile-user"));
    if (!u) return;
    const st = livePeerState(u), isMe = u.id === ME.id, main = tile.classList.contains("main");
    tile.classList.toggle("speaking", live.speaking.has(u.id) && !st.muted);
    tile.classList.toggle("has-video", isMe && !st.camOff && !!live.stream);
    tile.classList.toggle("mirrored", isMe && live.fx.mirror);
    tile.classList.toggle("touchup", isMe && live.fx.touchUp);
    tile.classList.toggle("autolight", isMe && live.fx.light);
    tile.setAttribute("data-bg", isMe ? live.bg : "none");
    const chip = tile.querySelector(".live-chip");
    if (chip) chip.innerHTML = liveChipInner(u, st);
    const pill = tile.querySelector(".live-audio-pill");
    if (pill) { pill.innerHTML = liveAudioInner(st); pill.setAttribute("aria-label", st.muted ? "Microphone muted" : "Microphone on"); }
    tile.querySelector(".live-tile-caption").textContent = liveCaptionFor(u, st, main);
    const hand = tile.querySelector(".live-badge-hand");
    if (hand) hand.hidden = !st.hand;
    const menu = tile.querySelector(".live-tile-menu");
    if (menu && !menu.classList.contains("show")) menu.innerHTML = liveMenuItems(u);
  });
}
// Gallery: every tile is the same size, between 16:9 and 4:3 so it fills its cell. Each column count is tried and the one that gives the biggest tiles for this many people
// in this much room wins - except that the usual grid (1 -> 1, 2 -> 2 across, 3-4 -> 2x2, 5-9 -> 3 across, ...) is kept unless another one is clearly better (portrait phone, narrow window).
// Only three CSS variables change; no tile is rebuilt.
function layoutGallery() {
  const stage = $("#liveStage"), area = $("#liveMainArea");
  if (live.view !== "gallery" || !stage.classList.contains("live-gallery")) return;
  const n = stage.childElementCount, W = area.clientWidth, H = area.clientHeight;
  if (!n || !W || !H) return;                     // room not on screen yet: the resize observer calls this again once it is
  const gap = parseFloat(getComputedStyle(stage).columnGap) || 8, minW = 9 * 16 * uiScale();
  const grid = (c) => {                           // biggest tile in a c-column grid
    const rows = Math.ceil(n / c), cw = (W - (c - 1) * gap) / c, ch = (H - (rows - 1) * gap) / rows;
    const a = Math.min(16 / 9, Math.max(4 / 3, cw / ch)), w = Math.min(cw, ch * a);
    return { c, w, h: w / a, size: w * (w / a) };
  };
  let best = grid(1);
  for (let c = 2; c <= n; c++) { const g = grid(c); if (g.size > best.size) best = g; }
  const usual = grid(Math.ceil(Math.sqrt(n)));
  if (usual.size * 1.15 >= best.size) best = usual;
  let { c: cols, w, h } = best;
  w = Math.floor(w);
  let ar = (h / best.w) * 100;
  if (w < minW) { w = Math.floor(minW); ar = 56.25; cols = Math.max(1, Math.min(n, Math.floor((W - 16 + gap) / (w + gap)))); } // too many people to fit: keep the tiles readable, the stage scrolls
  stage.style.setProperty("--gal-w", w + "px");
  stage.style.setProperty("--gal-ar", ar + "%");
  stage.style.setProperty("--gal-cw", cols * w + (cols - 1) * gap + 1 + "px");
}
function renderLiveStage() {
  const users = liveTileUsers();
  const stage = $("#liveStage"), strip = $("#liveStrip");
  const stripTop = strip.scrollTop;
  const main = users.find((u) => u.id === liveMainId()) || users[0];
  if (live.view === "gallery") {
    stage.className = "live-stage live-gallery h-100";
    stage.innerHTML = users.map((u) => `<div class="ratio ratio-16x9">${liveTileHtml(u, "grid")}</div>`).join("");
    strip.innerHTML = "";
  } else {
    stage.className = "live-stage h-100";
    stage.innerHTML = liveTileHtml(main, "main");
    // speaker view lists the other people first and your own tile last
    strip.innerHTML = live.view === "focus" ? "" : [...users.filter((u) => u.id !== ME.id), ...users.filter((u) => u.id === ME.id)].map((u) => liveTileHtml(u, "thumb")).join("");
    strip.scrollTop = stripTop;
  }
  const room = $("#liveRoom");
  room.classList.toggle("sharing", live.sharing);
  $("#liveStripWrap").classList.toggle("d-none", live.view === "gallery" || live.view === "focus");
  $("#liveShowTileBtn").classList.toggle("d-none", !live.hideSelf);
  layoutGallery();
  attachLiveVideo();
  updateLiveCounts();
}
function updateLiveCounts() {
  const n = livePeople().length;
  $("#liveParticipantCount").textContent = `${n} participant${n === 1 ? "" : "s"}`;
  $("#liveParticipantBadge").textContent = n;
  $("#livePanelCount").textContent = `(${n})`;
}
function setLiveView(mode) {
  live.view = mode;
  $$("[data-live-layout]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-live-layout") === mode));
  renderLiveStage();
}
function pinLiveUser(id) {
  live.pinnedId = id;
  if (live.view === "gallery") setLiveView("speaker"); else renderLiveStage();
}
/* ---- active speaker ----
   Your own level comes from the real microphone chain (fxAudio, already noise-gated). The other participants are simulated in this prototype
   (there is no audio from them), so they "talk" in turns and make an occasional low background blip. Everyone goes through the same rules:
   a level above the threshold counts as speaking (glow + equaliser); someone becomes the MAIN speaker only after speaking steadily for a moment,
   longer and clearly louder when they would be interrupting the current main speaker; silence never changes the main speaker; a pinned person is never replaced. */
const SPEAK = { threshold: 0.2, enterMs: 350, interruptMs: 900, dominance: 1.25 };
const speakerSim = { id: null, until: 0, nextAt: 0 };
const speakerTrack = { id: null, since: 0 };
const speakingSince = {}; // last time each person was above the threshold (a short release keeps the glow from flickering)
function liveSpeakerLevels(now) {
  const levels = {};
  levels[ME.id] = liveMicOn() && fxAudio.state === "on" ? fxAudio.level : 0;
  if (live.realMode) return levels; // no fabricated "who's speaking" for real users - this prototype has no real audio signal from other tabs
  const run = aiNotes.run;
  if (run.on && run.started && !run.done) { // a running Notes & Coach demo decides who is speaking (the room's random turns wait)
    liveTileUsers().forEach((u) => { if (u.id !== ME.id) levels[u.id] = run.playing && u.id === run.speakerId ? 0.6 : 0; });
    return levels;
  }
  if (speakerSim.id && now > speakerSim.until) { speakerSim.id = null; speakerSim.nextAt = now + 1200 + Math.random() * 3500; }
  const others = liveTileUsers().filter((u) => u.id !== ME.id && !livePeerState(u).muted);
  if (!speakerSim.id && now > speakerSim.nextAt) {
    if (others.length) { speakerSim.id = others[Math.floor(Math.random() * others.length)].id; speakerSim.until = now + 2500 + Math.random() * 4000; } else speakerSim.nextAt = now + 2000;
  }
  others.forEach((u) => { levels[u.id] = u.id === speakerSim.id ? 0.45 + Math.random() * 0.35 : Math.random() < 0.03 ? 0.1 : 0; });
  return levels;
}
function liveSpeakerTick() {
  if (!state.liveMeeting) return;
  const now = performance.now(), levels = liveSpeakerLevels(now);
  Object.keys(levels).forEach((id) => { if (levels[id] >= SPEAK.threshold) speakingSince[id] = now; });
  const speaking = new Set(Object.keys(levels).filter((id) => levels[id] >= SPEAK.threshold || now - (speakingSince[id] || -1e9) < 400));
  if (speaking.size !== live.speaking.size || [...speaking].some((id) => !live.speaking.has(id))) { live.speaking = speaking; refreshLiveTiles(); aiWave(); }
  let best = null;
  speaking.forEach((id) => { if (!best || levels[id] > levels[best]) best = id; });
  if (!best || best === live.speakerId) { speakerTrack.id = null; return; }          // silence (or the current speaker again): nobody changes
  if (speakerTrack.id !== best) { speakerTrack.id = best; speakerTrack.since = now; return; }
  const interrupting = live.speakerId && speaking.has(live.speakerId);
  if (interrupting && levels[best] < levels[live.speakerId] * SPEAK.dominance) return;
  if (now - speakerTrack.since >= (interrupting ? SPEAK.interruptMs : SPEAK.enterMs)) setActiveSpeaker(best);
}
function setActiveSpeaker(id) {
  live.speakerId = id;
  speakerTrack.id = null;
  swapMainTile();
}
// only the big tile is replaced (and the strip's highlight moved); the thumbnails, the camera stream and the layout stay as they are
function swapMainTile() {
  const stage = $("#liveStage");
  if (live.view === "gallery" || $("#liveStage .dropdown-menu.show")) { refreshLiveTiles(); return; }
  const id = liveMainId(), users = liveTileUsers(), main = users.find((u) => u.id === id);
  const current = stage.firstElementChild && stage.firstElementChild.getAttribute("data-tile-user");
  if (!main || current === id) { refreshLiveTiles(); return; }
  stage.innerHTML = liveTileHtml(main, "main");
  stage.firstElementChild.classList.add("swap");
  $$("#liveStrip .live-tile").forEach((t) => t.classList.toggle("selected", t.getAttribute("data-tile-user") === id));
  attachLiveVideo();
  refreshLiveTiles();
}

/* ---- automatic Picture-in-Picture ----
   No button anywhere in the meeting room. Every time the user leaves this tab during a live meeting (camera on) the browser's own PiP window opens
   (it shows the camera picture, the only real video in this prototype) and it closes again when they come back - as often as they like.
   One hidden <video id="livePipVideo"> shares the existing camera stream, so nothing is recreated or restarted. The window is the browser's:
   the user resizes it there and the picture keeps its aspect ratio. Chrome may refuse a request that has no recent user gesture; that is ignored
   quietly and the next tab switch simply tries again. Chrome's "automatic picture-in-picture" (Media Session) is registered too, because that is
   what lets it open without a gesture.
   State: live.autoPip (the window we opened is up), live.pipOpening / live.pipClosing (a request is in flight). The native
   enterpictureinpicture / leavepictureinpicture events are the truth; every guard is reset on every cycle, so a failure can never lock PiP. */
const pipSupported = () => !!(document.pictureInPictureEnabled && HTMLVideoElement.prototype.requestPictureInPicture);
const pipEl = () => $("#livePipVideo");
let pipCycle = 0;
function autoPipEligible() {
  return !!state.liveMeeting && $("#liveModalOverlay").classList.contains("open") && liveCamOn() && !!(live.display || live.stream)
    && pipSupported() && !document.pictureInPictureElement && !live.pipOpening && !live.pipClosing;
}
async function autoPipEnter() {
  if (!autoPipEligible()) return;
  live.pipOpening = true;
  const stamp = ++pipCycle, v = pipEl();
  const watchdog = setTimeout(() => { if (pipCycle === stamp) live.pipOpening = false; }, 3000); // a request that never answers must not lock PiP for good
  try {
    // the request must be the FIRST thing that happens: the browser only allows it inside its own automatic-PiP call (or right after a user gesture),
    // so nothing may be awaited before it. The hidden video is already playing the shared stream (attachLiveVideo keeps it attached).
    attachLiveVideo();
    if (v.paused) v.play().catch(() => {}); // (not awaited)
    await v.requestPictureInPicture();
  } catch (err) { // refused (browsers want a click / key press in the page shortly before) or not possible right now: carry on, the next tab switch tries again
    if (err && err.name === "NotAllowedError") live.pipHint = true;
  }
  clearTimeout(watchdog);
  if (pipCycle === stamp) live.pipOpening = false;
  if (!document.hidden && document.pictureInPictureElement === v) autoPipExit(); // they were already back by the time it opened
}
async function autoPipExit() {
  if (live.pipClosing) return;
  const v = pipEl();
  if (document.pictureInPictureElement !== v) { live.autoPip = false; return; }
  live.pipClosing = true;
  try { await document.exitPictureInPicture(); } catch { /* already closed */ }
  live.pipClosing = false; live.autoPip = false;
  if (document.hidden) autoPipEnter();   // they left again while it was closing
}
// meeting ended / camera stopped: close whatever window is up and clear every flag
async function exitPip() {
  pipCycle++;
  live.autoPip = live.pipOpening = live.pipClosing = false;
  if (document.pictureInPictureElement === pipEl()) { try { await document.exitPictureInPicture(); } catch { /* already closed */ } }
}
function syncMediaSessionCapture() { // tells Chrome this page is a live call (camera / microphone in use), which is what its automatic PiP looks for
  if (!("mediaSession" in navigator) || !state.liveMeeting) return;
  try { if (navigator.mediaSession.setCameraActive) navigator.mediaSession.setCameraActive(liveCamOn()); } catch { /* not supported */ }
  try { if (navigator.mediaSession.setMicrophoneActive) navigator.mediaSession.setMicrophoneActive(liveMicOn()); } catch { /* not supported */ }
}
function setPipMediaSession(on) {
  if (!("mediaSession" in navigator)) return;
  try { navigator.mediaSession.setActionHandler("enterpictureinpicture", on ? () => autoPipEnter() : null); } catch { /* action not supported by this browser */ }
  try { // an active call: this is what Chrome / Edge look for before they open picture-in-picture by themselves
    navigator.mediaSession.playbackState = on ? "playing" : "none";
    navigator.mediaSession.metadata = on && state.liveMeeting ? new MediaMetadata({ title: state.liveMeeting.title, artist: "Teloz meeting" }) : null;
  } catch { /* media session not available */ }
  if (on) syncMediaSessionCapture();
}
// Chrome / Edge only let a page open Picture-in-Picture right after a click or key press in it (or through their own automatic-PiP site setting), so say so once, quietly
function pipHintOnce() {
  try { if (sessionStorage.getItem("mcm-pip-hint")) return; sessionStorage.setItem("mcm-pip-hint", "1"); } catch { /* storage unavailable */ }
  toast("Picture-in-Picture opens by itself only right after you click or press a key in the meeting. To make it fully automatic, allow \"Automatic picture-in-picture\" for this site in your browser's site settings.", "success", "pip");
}
function initLivePip() {
  const v = pipEl();
  on(v, "enterpictureinpicture", () => { live.autoPip = true; live.pipOpening = false; });
  on(v, "leavepictureinpicture", () => { live.autoPip = false; live.pipOpening = false; live.pipClosing = false; }); // closed by the user or by us: the layout was never touched
  // Switching to another APPLICATION (Alt+Tab) does not always hide the page, so losing focus counts too - but only right after a key press / click in the page:
  // that is the only time the browser lets a page open PiP by itself, and it keeps a click on the address bar from opening it by accident.
  window.addEventListener("blur", () => setTimeout(() => {
    if (state.liveMeeting && !document.hidden && !document.hasFocus() && navigator.userActivation && navigator.userActivation.isActive) autoPipEnter();
  }, 250));
  window.addEventListener("focus", () => { if (live.autoPip) autoPipExit(); });
  document.addEventListener("visibilitychange", () => { // the page-level listeners
    if (document.hidden) { if (state.liveMeeting) autoPipEnter(); return; }
    live.pipOpening = false; pipCycle++;                          // a new cycle starts clean
    if (live.pipHint) { live.pipHint = false; pipHintOnce(); }
    if (live.autoPip || document.pictureInPictureElement === v) autoPipExit();
    if (state.liveMeeting) setPipMediaSession(true);              // re-arm Chrome's automatic PiP for the next time
  });
}

/* ---- mic / camera / devices ---- */
function setLiveMic(on) {
  const btn = $("#liveMicBtn");
  btn.classList.toggle("active", on);
  btn.classList.toggle("control-off", !on);
  btn.setAttribute("aria-pressed", String(on));
  btn.querySelector(".bi").className = `bi ${on ? "bi-mic-fill" : "bi-mic-mute-fill"}`;
  $("#liveMicLabel").textContent = on ? "Mute" : "Unmute";
  if (on) fxAudio.start(fxMicDeviceId("live")); else fxAudio.stop(); // the cleaned-up microphone only runs while you are unmuted
  speechSync(); // live transcription listens only while the microphone is on
  syncMediaSessionCapture();
}
function setLiveCam(on) {
  const btn = $("#liveCamBtn");
  btn.classList.toggle("active", on);
  btn.classList.toggle("control-off", !on);
  btn.setAttribute("aria-pressed", String(on));
  btn.querySelector(".bi").className = `bi ${on ? "bi-camera-video-fill" : "bi-camera-video-off-fill"}`;
  $("#liveCamLabel").textContent = on ? "Stop Video" : "Start Video";
  if (on) liveStartCamera(); else { live.camToken++; liveStopStream(); }
  syncMediaSessionCapture();
}
function renderLiveDeviceMenu(kind) {
  const list = live.deviceList[kind].length ? live.deviceList[kind] : LIVE_STATIC_DEVICES[kind].map((label) => ({ id: "", label }));
  const current = live.devices[kind] || list[0].id || list[0].label;
  $(`#live${kind === "mic" ? "Mic" : "Cam"}Menu`).innerHTML = `<li><h6 class="dropdown-header live-menu-h">${kind === "mic" ? "Microphone" : "Camera"}</h6></li>` +
    list.map((d) => `<li><button class="dropdown-item d-flex align-items-center gap-2 ${(d.id || d.label) === current ? "active" : ""}" type="button" data-device-kind="${kind}" data-device-id="${escapeHtml(d.id)}" data-device-label="${escapeHtml(d.label)}"><i class="bi bi-check2 live-check"></i><span>${escapeHtml(d.label)}</span></button></li>`).join("");
}
async function fillLiveDevices(kind) {
  renderLiveDeviceMenu(kind);
  let list = [];
  try {
    if (kind === "mic" && !live.micAsked && navigator.mediaDevices.getUserMedia) {
      live.micAsked = true;
      try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((t) => t.stop()); } catch { /* labels stay generic */ }
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    list = devices.filter((d) => d.kind === (kind === "cam" ? "videoinput" : "audioinput") && d.label).map((d) => ({ id: d.deviceId, label: d.label }));
  } catch { /* fall back to the static list */ }
  live.deviceList[kind] = list;
  renderLiveDeviceMenu(kind);
}
function chooseLiveDevice(btn) {
  const kind = btn.getAttribute("data-device-kind"), id = btn.getAttribute("data-device-id"), label = btn.getAttribute("data-device-label");
  live.devices[kind] = id || label;
  if (kind === "cam") live.camId = id;
  renderLiveDeviceMenu(kind);
  toast(`${kind === "mic" ? "Microphone" : "Camera"}: ${label}`);
  if (kind === "cam" && id && liveCamOn()) liveStartCamera();
  if (kind === "mic" && id && liveMicOn()) fxAudio.start(id);
}

/* ---- screen sharing (browser-native picker) ---- */
function updateShareAvailability() {
  const blocked = !liveCanModerate() && live.onlyHostShare;
  const btn = $("#liveScreenBtn");
  btn.disabled = blocked && !live.sharing;
  btn.title = blocked ? "Only the host can share" : "";
}
async function startScreenShare(surface) {
  if (live.sharing) return;
  if (!authorize("share.screen", state.liveMeeting)) return;
  if (!liveCanModerate() && live.onlyHostShare) { toast("Only the host can share their screen."); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { toast("Screen sharing isn't supported in this browser."); return; }
  try {
    const video = { cursor: "always" };
    if (surface) video.displaySurface = surface;
    const stream = await navigator.mediaDevices.getDisplayMedia({ video, audio: live.shareAudio });
    if (live.sharing || !$("#liveModalOverlay").classList.contains("open")) { stream.getTracks().forEach((t) => t.stop()); return; }
    live.shareStream = stream;
    stream.getVideoTracks()[0].addEventListener("ended", () => stopScreenShare());
    const v = $("#liveShareVideo");
    v.srcObject = stream;
    if (live.spkId && v.setSinkId) v.setSinkId(live.spkId).catch(() => { /* keep the default speaker */ }); // shared-screen audio plays on the speaker picked before joining
    const p = v.play();
    if (p) p.catch(() => {});
    const label = stream.getVideoTracks()[0].label || "your screen";
    const hasAudio = stream.getAudioTracks().length > 0;
    $("#liveShareInfo").textContent = hasAudio ? "with audio" : "";
    $("#liveShareAudioHint").textContent = live.shareAudio ? (hasAudio ? "System audio is being shared" : "This source has no audio to share") : "Included when the source supports it";
    live.sharing = true;
    $("#screenShareStage").hidden = false;
    setLiveToggle("#liveScreenBtn", true, "#liveScreenLabel", "Stop Sharing", "Share Screen");
    $("#liveRoom").classList.add("sharing");
    toast(`Sharing ${label}${hasAudio ? " with audio" : ""}.`);
  } catch (err) {
    toast(err && err.name === "NotAllowedError" ? "Screen sharing cancelled." : "Couldn't start screen sharing.");
  }
}
function stopScreenShare(silent) {
  if (!live.sharing) return;
  if (live.shareStream) live.shareStream.getTracks().forEach((t) => t.stop());
  live.shareStream = null;
  live.sharing = false;
  $("#liveShareVideo").srcObject = null;
  $("#screenShareStage").hidden = true;
  $("#liveRoom").classList.remove("sharing");
  setLiveToggle("#liveScreenBtn", false, "#liveScreenLabel", "Stop Sharing", "Share Screen");
  if (!silent) toast("Screen sharing stopped.");
}

/* ---- toolbar toggle helpers ---- */
function setLiveToggle(btnSel, on, labelSel, onText, offText) {
  const btn = $(btnSel);
  btn.classList.toggle("on", on);
  btn.setAttribute("aria-pressed", String(on));
  if (labelSel) $(labelSel).textContent = on ? onText : offText;
}
function setLiveHand(on) {
  live.hand = on;
  setLiveToggle("#liveRaiseHandBtn", on, "#liveHandLabel", "Lower hand", "Raise hand");
  const hb = $("#liveRaiseHandBtn"); hb.querySelector(".bi").className = on ? "bi bi-hand-index-thumb-fill" : "bi bi-hand-index-thumb";
  hb.title = on ? "Lower hand" : "Raise hand"; hb.setAttribute("aria-label", hb.title);
  toast(on ? "You raised your hand." : "You lowered your hand.", "success", "hand");
  refreshLiveTiles();
  if (live.panel === "participants") renderLivePanel();
  publishLivePresence();
}
// another participant's hand: their tile updates in place and everyone gets one small notice when it goes UP (never for the same state twice)
function setPeerHand(uid, on) {
  const p = live.peers[uid];
  if (!p || p.hand === on) return;
  p.hand = on;
  const u = userById(uid);
  if (on && u) toast(`${u.name.split(" ")[0]} raised their hand`, "success", "hand");
  refreshLiveTiles();
  if (live.panel === "participants") renderLivePanel();
}
function liveReact(emoji) {
  if (!liveCanModerate() && !live.perms.react) { toast("Reactions are turned off by the host."); return; }
  const tile = $(`#liveStage [data-tile-user="${ME.id}"]`) || $(`#liveStrip [data-tile-user="${ME.id}"]`) || $("#liveStage .live-tile");
  if (!tile) return;
  const el = document.createElement("span");
  el.className = "live-float";
  el.textContent = emoji;
  el.style.left = 20 + Math.random() * 60 + "%";
  el.style.setProperty("--rise", -Math.round(tile.clientHeight * 0.6) + "px");
  tile.appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

/* ---- recording: a real capture via MediaRecorder, not just a timer ----
   Video = the effects pipeline's own output (live.display, i.e. background/appearance effects already baked in), or the raw camera if no
   pipeline is active. Audio = the cleaned-up microphone (fxAudio.output) while it's running, else the raw mic track. Both are live track
   references (not clones), kept in sync while recording: muting/unmuting, turning the camera off/on, or toggling an effect swaps the track on
   the SAME MediaStream object rather than restarting the recorder, since MediaRecorder keeps recording through a track being added/removed. */
const liveRec = { recorder: null, chunks: [], stream: null, mimeType: "", unsubVideo: null, unsubAudio: null };
const LIVE_REC_MIME_CANDIDATES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
const liveRecVideoTrack = () => { const s = live.display || live.stream; return s ? s.getVideoTracks()[0] || null : null; };
const liveRecAudioTrack = () => { const s = (fxAudio.state === "on" && fxAudio.output) || live.stream; return s ? s.getAudioTracks()[0] || null : null; };
function liveRecSyncTrack(kind) {
  if (!liveRec.stream) return;
  const want = kind === "video" ? liveRecVideoTrack() : liveRecAudioTrack();
  const existing = kind === "video" ? liveRec.stream.getVideoTracks()[0] : liveRec.stream.getAudioTracks()[0];
  if (existing === want) return;
  if (existing) liveRec.stream.removeTrack(existing);
  if (want) liveRec.stream.addTrack(want);
}
function startLiveRecording() {
  if (!window.MediaRecorder) { toast("Recording isn't supported in this browser.", "error"); return false; }
  const vTrack = liveRecVideoTrack(), aTrack = liveRecAudioTrack();
  if (!vTrack && !aTrack) { toast("Turn your camera or microphone on to record.", "error"); return false; }
  liveRec.stream = new MediaStream();
  if (vTrack) liveRec.stream.addTrack(vTrack);
  if (aTrack) liveRec.stream.addTrack(aTrack);
  liveRec.mimeType = LIVE_REC_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
  liveRec.chunks = [];
  try { liveRec.recorder = new MediaRecorder(liveRec.stream, liveRec.mimeType ? { mimeType: liveRec.mimeType } : undefined); }
  catch (e) { toast("Recording couldn't start in this browser.", "error"); liveRec.stream = null; return false; }
  liveRec.recorder.ondataavailable = (e) => { if (e.data && e.data.size) liveRec.chunks.push(e.data); };
  liveRec.recorder.start(1000); // 1s timeslice: a crash mid-recording still leaves most of it in state.liveMeeting
  liveRec.unsubVideo = videoFx.subscribe(() => liveRecSyncTrack("video"));
  liveRec.unsubAudio = fxAudio.subscribe(() => liveRecSyncTrack("audio"));
  return true;
}
function pauseLiveRecording(pause) {
  const rec = liveRec.recorder;
  if (!rec) return;
  if (pause && rec.state === "recording") rec.pause();
  else if (!pause && rec.state === "paused") rec.resume();
}
function stopLiveRecording() { // -> Promise<Blob|null>
  return new Promise((resolve) => {
    if (liveRec.unsubVideo) { liveRec.unsubVideo(); liveRec.unsubVideo = null; }
    if (liveRec.unsubAudio) { liveRec.unsubAudio(); liveRec.unsubAudio = null; }
    const rec = liveRec.recorder;
    if (!rec || rec.state === "inactive") { liveRec.recorder = null; liveRec.stream = null; resolve(null); return; }
    rec.onstop = () => {
      const blob = liveRec.chunks.length ? new Blob(liveRec.chunks, { type: liveRec.mimeType || "video/webm" }) : null;
      liveRec.chunks = []; liveRec.recorder = null; liveRec.stream = null;
      resolve(blob);
    };
    rec.stop();
  });
}
const LIVE_RECORDING_BLOBS = new Map(); // recording.id -> object URL, kept only in memory (never in state/localStorage, same as the camera/mic stream itself)
function saveLiveRecording(blob) {
  const meeting = state.liveMeeting;
  const rec = {
    id: uid("rec"), meetingId: meeting ? meeting.id : "", name: (meeting && meeting.title) || "Meeting recording",
    sizeMB: Math.round((blob.size / (1024 * 1024)) * 10) / 10, recordedOn: TODAY_ISO, ownerId: ME.id,
    members: meeting ? meeting.participants.length + 1 : 1, sharedWith: meeting ? meeting.participants.slice() : [],
    team: (meeting && meeting.team) || ME.teamId || "", locationId: (meeting && meeting.locationId) || ME.locationId || "mumbai",
    transcriptAvailable: false, isDemo: false, isLive: true, // isLive: a real capture from this session, not sample data
  };
  LIVE_RECORDING_BLOBS.set(rec.id, URL.createObjectURL(blob));
  state.recordings.unshift(rec);
  saveState();
  renderRecordings();
}
async function stopLiveRecordingIfActive() { // used when leaving/ending a meeting: save whatever was captured instead of discarding it
  if (live.recState === "idle") return;
  const blob = await stopLiveRecording();
  if (blob && blob.size) saveLiveRecording(blob);
}
function setRecState(next) {
  live.recState = next;
  const active = next !== "idle";
  $("#liveRecordBtn").classList.toggle("on", next === "recording");
  $("#liveRecordBtn").classList.toggle("paused", next === "paused");
  $("#liveRecordBtn").setAttribute("aria-pressed", String(active));
  $("#liveRecordLabel").textContent = next === "idle" ? "Record" : next === "paused" ? "Paused" : "Recording";
  const badge = $("#liveRecBadge");
  badge.classList.toggle("d-none", !active);
  badge.classList.toggle("paused", next === "paused");
  $("#liveRecLabel").textContent = next === "paused" ? "PAUSED" : "REC";
  // Idle: one click starts recording. Active: the button becomes a dropdown with Pause/Resume and Stop.
  const btn = $("#liveRecordBtn");
  if (active) {
    btn.setAttribute("data-bs-toggle", "dropdown");
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "Recording options");
    btn.title = "Recording options";
  } else {
    const menu = bootstrap.Dropdown.getInstance(btn);
    if (menu) menu.hide();
    ["data-bs-toggle", "aria-haspopup", "aria-expanded"].forEach((a) => btn.removeAttribute(a));
    btn.setAttribute("aria-label", "Start recording");
    btn.title = "Start recording";
  }
  $("[data-rec-pause-text]").textContent = next === "paused" ? "Resume recording" : "Pause recording";
  $("[data-rec-toggle-text]").textContent = active ? "Stop recording" : "Start recording";
  clearInterval(live.timers.rec);
  if (next === "recording") live.timers.rec = setInterval(() => { live.recSecs++; $("#liveRecTimer").textContent = formatMMSS(live.recSecs); }, 1000);
}
function runRecAction(action) {
  if (!authorize("record.control", state.liveMeeting)) return;
  if (action === "start") {
    if (!startLiveRecording()) return;
    live.recSecs = 0; $("#liveRecTimer").textContent = "00:00"; setRecState("recording");
    toast("Recording started.");
  } else if (action === "pause") {
    const pausing = live.recState === "recording";
    pauseLiveRecording(pausing);
    setRecState(pausing ? "paused" : "recording");
    toast(pausing ? "Recording paused." : "Recording resumed.");
  } else if (action === "stop") {
    liveConfirm({ title: "Stop recording?", text: "The recording will be saved to this meeting.", ok: "Stop Recording", danger: true, onOk: async () => {
      setRecState("idle");
      const blob = await stopLiveRecording();
      if (blob && blob.size) { saveLiveRecording(blob); toast("Recording saved."); }
      else toast("Recording stopped - nothing was captured.", "error");
    } });
  }
}

/* ---- captions + transcription ----
   One state object (meetingLanguageState) and one browser SpeechRecognition instance (speech.rec) drive both. Recognition listens to YOUR microphone
   while it is unmuted and while transcription or captions are on. There is no translation service, so captions are always shown in the transcription
   language; the caption language follows it until you pick a different one (then a note explains this). */
const LIVE_LOCALES = { en: "en-US", hi: "hi-IN", es: "es-ES" };
const LANG_KEY = "mcm-meeting-language-v1";
const meetingLanguageState = { transcriptionLanguage: "en-US", captionLanguage: "en-US", captionsEnabled: false, transcribing: false, transcriptionStatus: "idle", statusNote: "" };
const speech = { rec: null, wantOn: false, active: false, pending: false, switching: false, fatal: false, activeLang: "", restartTimer: 0, restarts: [], interim: "", lines: [], transcript: [], capTimer: 0 };
const aiNotes = { seq: 0, secs: 0, running: false, demoTranscript: false, demoCaptions: false, sampleIdx: 0, capIdx: 0, capText: "", capSpeaker: "" }; // AI Notes & Coach state (its section is below)
const langShort = (locale) => Object.keys(LIVE_LOCALES).find((k) => LIVE_LOCALES[k] === locale) || "en";
const langName = (locale) => LIVE_LANG[langShort(locale)];
const speechAPI = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;

(function loadMeetingLanguage() {
  try {
    const o = JSON.parse(localStorage.getItem(LANG_KEY) || "null");
    if (!o) return;
    const ok = (v) => Object.values(LIVE_LOCALES).includes(v);
    if (ok(o.transcriptionLanguage)) meetingLanguageState.transcriptionLanguage = o.transcriptionLanguage;
    if (ok(o.captionLanguage)) meetingLanguageState.captionLanguage = o.captionLanguage;
    meetingLanguageState.captionsEnabled = o.captionsEnabled === true;
    meetingLanguageState.transcribing = o.transcribing === true;
  } catch { /* first run / storage unavailable */ }
})();
function saveMeetingLanguage() {
  const s = meetingLanguageState;
  try { localStorage.setItem(LANG_KEY, JSON.stringify({ transcriptionLanguage: s.transcriptionLanguage, captionLanguage: s.captionLanguage, captionsEnabled: s.captionsEnabled, transcribing: s.transcribing })); } catch { /* ignore */ }
}

/* ---- what is on screen (only the pieces that changed are touched) ---- */
function setTranscriptionStatus(status, note = "") {
  meetingLanguageState.transcriptionStatus = status;
  meetingLanguageState.statusNote = note;
  renderLanguageUi();
}
function renderLanguageUi() {
  const s = meetingLanguageState, short = langShort(s.transcriptionLanguage), st = s.transcriptionStatus;
  $$("[data-transcribe]").forEach((b) => { const sel = b.getAttribute("data-transcribe") === short; b.classList.toggle("active", sel); b.setAttribute("aria-pressed", String(sel)); });
  $("#liveTranscribeSel").textContent = LIVE_LANG[short];
  const text = { idle: "Off", starting: "Starting…", listening: "Listening…", processing: "Processing…", stopped: s.statusNote || "Stopped", error: s.statusNote || "Transcription error" }[st];
  const el = $("#liveTranscribeStatus");
  el.textContent = `· ${text}`;
  el.classList.toggle("text-warning", st === "error");
  const running = st === "starting" || st === "listening" || st === "processing";
  $("#liveTranscribeFlag").classList.toggle("d-none", !running);
  $("#liveTranscribeText").textContent = running ? `${st === "starting" ? "Starting" : "Transcribing"} · ${LIVE_LANG[short]}` : "";
  $("#liveCaptionsSwitch").checked = s.captionsEnabled;
  $("#liveCaptionLang").value = langShort(s.captionLanguage);
  $("#liveCaptionNote").textContent = s.captionLanguage !== s.transcriptionLanguage
    ? `Translation isn't available, so captions stay in ${langName(s.transcriptionLanguage)}.`
    : "Captions show what your microphone picks up.";
  $("#liveCaptions").lang = short;
  aiRenderBar();
  renderCaption();
}
function tailWords(text, max) { // keep the newest words when a caption gets long
  if (text.length <= max) return text;
  const cut = text.slice(text.length - max), i = cut.indexOf(" ");
  return i > 0 ? cut.slice(i + 1) : cut;
}
function renderCaption() {
  // one overlay only: while Demo captions is on it shows the sample text (with a DEMO chip) instead of the live captions
  const demo = aiNotes.demoCaptions && !!aiNotes.capText;
  const show = demo || (meetingLanguageState.captionsEnabled && !!(speech.lines.length || speech.interim));
  const final = demo ? aiNotes.capText : tailWords(speech.lines.join(" "), 220);
  const interim = demo ? "" : speech.interim;
  $("#liveCaptionFinal").textContent = final;
  $("#liveCaptionInterim").textContent = interim ? (final ? " " : "") + tailWords(interim, 220) : "";
  $("#liveCaptionSpeaker").textContent = show ? `${demo ? aiNotes.capSpeaker : ME.name.split(" ")[0]}:` : "";
  $("#liveCaptionDemo").classList.toggle("d-none", !demo);
  $("#liveCaptions").classList.toggle("show", show);
}
function armCaptionTimer() { // a finished caption stays for a few seconds; it is never cleared while speech keeps arriving
  clearTimeout(speech.capTimer);
  speech.capTimer = setTimeout(() => { speech.lines = []; speech.interim = ""; renderCaption(); }, 6000);
}
/* ---- real-time multi-user transcript (Demo Data OFF / live.realMode): other browser tabs of THIS SAME machine, each a different
   real demo user in the same meeting, share their own microphone's FINAL transcript segments through one shared localStorage key -
   the same honest, same-browser-scoped mechanism already used for live presence (LIVE_PRESENCE_KEY). There is no backend here, so
   this cannot capture another tab's actual remote audio - it relays each tab's own local speech-recognition result to the others,
   which is the maximum real (non-simulated) behaviour achievable without a server. Interim text never leaves its own tab; only
   finalized segments are shared, exactly once each. */
const LIVE_TRANSCRIPT_KEY = "mcm-live-transcript-v1";
let seenTranscriptIds = new Set();
function readLiveTranscriptAll() {
  try { return JSON.parse(localStorage.getItem(LIVE_TRANSCRIPT_KEY) || "{}"); } catch (e) { return {}; }
}
function writeLiveTranscriptAll(all) {
  try { localStorage.setItem(LIVE_TRANSCRIPT_KEY, JSON.stringify(all)); } catch (e) { /* storage blocked / full */ }
}
function publishLiveTranscript(entry) {
  if (!live.realMode || !state.liveMeeting) return;
  const all = readLiveTranscriptAll(), mid = state.liveMeeting.id;
  const list = all[mid] || [];
  list.push({ id: entry.id, speakerId: ME.id, speaker: entry.speaker, text: entry.text, at: entry.at, lang: entry.lang });
  if (list.length > 500) list.shift();
  all[mid] = list;
  writeLiveTranscriptAll(all);
  seenTranscriptIds.add(entry.id); // this tab's own line - never re-added if it later reads its own write back
}
// merges any segment another tab published for the CURRENT meeting that this tab hasn't shown yet (also catches up on history from before this tab joined)
function applyLiveTranscript() {
  if (!live.realMode || !state.liveMeeting) return;
  const list = readLiveTranscriptAll()[state.liveMeeting.id] || [];
  list.forEach((seg) => {
    if (seenTranscriptIds.has(seg.id)) return;
    seenTranscriptIds.add(seg.id);
    if (seg.speakerId === ME.id) return; // this tab already added its own line locally when it was spoken
    aiAddLine({ id: seg.id, speaker: seg.speaker, speakerId: seg.speakerId, text: seg.text, at: seg.at, lang: seg.lang }, "live");
  });
}
function initLiveTranscriptSync() {
  window.addEventListener("storage", (e) => { if (e.key === LIVE_TRANSCRIPT_KEY) applyLiveTranscript(); });
}
function commitCaption(text) {
  speech.interim = "";
  speech.lines.push(text);
  if (speech.lines.length > 2) speech.lines.shift();
  const entry = { id: uid("tr"), speaker: ME.name, speakerId: ME.id, text, lang: meetingLanguageState.transcriptionLanguage, at: Date.now() }; // the real transcript: your own microphone
  speech.transcript.push(entry);
  if (speech.transcript.length > 500) speech.transcript.shift();
  aiAddLine(entry);
  publishLiveTranscript(entry); // real mode only: lets other tabs in the same meeting pick this up (see "REAL-TIME MULTI-USER TRANSCRIPT" below)
  armCaptionTimer();
  renderCaption();
}

/* ---- the recognition itself ---- */
function speechFatal(status, note, toastText) {
  speech.fatal = true; speech.wantOn = false; speech.pending = false;
  setTranscriptionStatus(status, note);
  if (toastText) toast(toastText, "error");
}
function speechCreate() {
  const SR = speechAPI(), r = new SR();
  r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
  r.onstart = () => { speech.active = true; speech.pending = false; speech.activeLang = r.lang; if (speech.wantOn) setTranscriptionStatus("listening"); };
  r.onresult = (e) => {
    let interim = "", finals = "";
    for (let i = e.resultIndex; i < e.results.length; i++) { const res = e.results[i]; if (res.isFinal) finals += res[0].transcript; else interim += res[0].transcript; }
    if (finals.trim()) commitCaption(finals.trim());
    speech.interim = interim.trim();
    if (speech.interim) { armCaptionTimer(); renderCaption(); }
    if (speech.wantOn) { const next = speech.interim ? "processing" : "listening"; if (meetingLanguageState.transcriptionStatus !== next) setTranscriptionStatus(next); }
  };
  r.onerror = (e) => {
    speech.pending = false;
    if (e.error === "not-allowed" || e.error === "service-not-allowed") speechFatal("error", "Microphone permission required", "Microphone permission is required for live transcription.");
    else if (e.error === "audio-capture") speechFatal("error", "No microphone available", "No microphone was found for live transcription.");
    else if (e.error === "network") speechFatal("error", "Speech service unreachable", "Live transcription needs an internet connection (the browser's speech service couldn't be reached).");
    else if (e.error === "language-not-supported") speechFatal("error", "Language not supported", `This browser can't transcribe ${langName(meetingLanguageState.transcriptionLanguage)}.`);
    /* "no-speech" and "aborted" are normal: onend restarts the session */
  };
  r.onend = () => {
    speech.active = false; speech.pending = false;
    if (!speech.wantOn || speech.fatal) return;
    const now = Date.now();
    speech.restarts = speech.restarts.filter((t) => now - t < 5000); speech.restarts.push(now);
    if (speech.restarts.length > 6) { speechFatal("error", "Transcription keeps stopping", "Live transcription stopped unexpectedly."); return; }
    clearTimeout(speech.restartTimer);
    speech.restartTimer = setTimeout(() => { if (speech.wantOn && !speech.active) speechStart(); }, speech.switching ? 0 : 250); // Chrome ends a session after silence; it is simply restarted
    speech.switching = false;
  };
  return r;
}
function speechStart() {
  if (!speech.rec) speech.rec = speechCreate();               // never more than one instance
  speech.wantOn = true;
  const lang = meetingLanguageState.transcriptionLanguage;
  if (speech.active) {
    if (speech.activeLang !== lang) { speech.switching = true; speech.rec.lang = lang; try { speech.rec.abort(); } catch { /* already ending */ } } // onend starts it again in the new language
    return;
  }
  if (speech.pending) return;
  speech.rec.lang = lang;
  speech.pending = true;
  if (meetingLanguageState.transcriptionStatus !== "listening") setTranscriptionStatus("starting");
  try { speech.rec.start(); } catch { speech.pending = false; }
}
function speechStop(status, note) {
  const busy = speech.active || speech.pending;
  speech.wantOn = false; speech.pending = false; speech.switching = false;
  clearTimeout(speech.restartTimer);
  if (speech.rec && busy) { try { speech.rec.abort(); } catch { /* ignore */ } }
  speech.interim = "";
  if (status) setTranscriptionStatus(status, note); else renderCaption();
}
// destroys the recognition object (meeting ended): handlers removed, timers cleared, overlay emptied
function speechDestroy() {
  speechStop(null);
  if (speech.rec) { const r = speech.rec; r.onstart = r.onresult = r.onerror = r.onend = null; try { r.abort(); } catch { /* ignore */ } speech.rec = null; }
  speech.active = false; speech.fatal = false; speech.lines = []; speech.restarts = [];
  clearTimeout(speech.capTimer);
  meetingLanguageState.transcriptionStatus = "idle"; meetingLanguageState.statusNote = "";
  if ($("#liveCaptions")) renderLanguageUi();
}
// decides whether recognition should be running right now; `userAction` lets a retry after a permission/service error
function speechSync(userAction) {
  const s = meetingLanguageState;
  if (userAction) { speech.fatal = false; speech.restarts = []; }
  if (!(s.transcribing || s.captionsEnabled) || !state.liveMeeting) { speech.fatal = false; speechStop("idle"); return; }
  if (!speechAPI()) { speechStop("error", "Not supported in this browser"); if (userAction) toast("Live transcription is not supported in this browser.", "error"); return; }
  if (!liveMicOn()) { speechStop("stopped", "Paused - your microphone is muted"); return; }
  if (speech.fatal) return;
  speechStart();
}
function chooseTranscriptionLanguage(short) {
  const s = meetingLanguageState, locale = LIVE_LOCALES[short];
  if (!locale) return;
  if (locale === s.transcriptionLanguage) {                                            // the selected language is also the on/off switch
    s.transcribing = !(s.transcribing || s.captionsEnabled);
    if (!s.transcribing) s.captionsEnabled = false;                                    // toggling off here is a full stop too, same as the Notes & Coach button
  } else {
    if (s.captionLanguage === s.transcriptionLanguage) s.captionLanguage = locale;      // captions follow until you choose otherwise
    s.transcriptionLanguage = locale; s.transcribing = true;
  }
  saveMeetingLanguage(); renderLanguageUi(); speechSync(true);
  if (meetingLanguageState.transcriptionStatus !== "error") toast(s.transcribing ? `Transcription language: ${LIVE_LANG[short]}` : "Transcription off.", "success", "transcription");
}
function setLiveCaptions(on) {
  const s = meetingLanguageState;
  if (on && !speechAPI()) { toast("Live transcription is not supported in this browser, so captions can't be shown.", "error"); on = false; }
  s.captionsEnabled = on;
  saveMeetingLanguage(); renderLanguageUi(); speechSync(true);
  toast(on ? "Live captions enabled." : "Live captions disabled.", "success", "captions");
}
function setCaptionLanguage(short) {
  meetingLanguageState.captionLanguage = LIVE_LOCALES[short] || "en-US";
  saveMeetingLanguage(); renderLanguageUi();
  toast(`Caption language: ${LIVE_LANG[short]}`, "success", "captions");
}
function setTranscribing(on) { // the Start / Stop button in AI Notes: the one master switch for the whole speech pipeline
  const s = meetingLanguageState;
  s.transcribing = on;
  if (!on) s.captionsEnabled = false; // Stop really stops everything - captions can't keep running without the engine behind them
  saveMeetingLanguage(); renderLanguageUi(); speechSync(true);
  if (s.transcriptionStatus !== "error") toast(on ? `Transcription on: ${langName(s.transcriptionLanguage)}` : "Transcription off.", "success", "transcription");
}

/* ---- Notes & Coach = Meeting Intelligence ----
   One right-hand panel (live.panel = "ai-notes"), four Bootstrap tabs built once and only shown / hidden.
   TWO SEPARATE STATES, never mixed: aiNotes.live (the real meeting: lines come from the existing speech system, commitCaption -> aiAddLine) and aiNotes.demo (a scripted
   meeting played by ONE scheduler, the demo controller below). The panel shows aiNotes.mode's state; the other one is only parked. Only the live state is ever saved.
   Every feature reads the transcript of its own state: aiAddLine tags each line by keyword rules -> aiAnalyze (debounced) derives questions, suggested actions / decisions,
   follow-ups, topics, memory, playbook hints -> aiCoachEval turns them and the room's signals into a few tips -> summary / wrap-up. Nothing is AI unless a real provider is plugged
   into MeetingIntelligenceService.ai (none exists here): the rules are labelled RULE-BASED, the scripted results DEMO / DEMO AI. Detected actions and decisions are only SUGGESTED
   until you add them. Your own data (notes, action items, decisions, playbook, answered questions, dismissed tips) is kept per meeting code in localStorage (AI_KEY). */
const AI_KEY = "mcm-notes-v1";
const AI_PLAYBOOK_DEFAULT = ["Welcome & agenda", "Product updates", "Customer feedback", "Q&A", "Action items & owners"];
const DEMO_DURATION = 15; // minutes the demo meeting is "scheduled" for
const DEMO_SPEED = { slow: { gap: [5000, 8000], cool: 20000 }, normal: { gap: [2000, 4000], cool: 9000 }, fast: { gap: [500, 1500], cool: 2500 } };
const DEMO_CAST = [["alex", "Alex Rivera", "AR"], ["elena", "Elena Rostova", "ER"], ["marcus", "Marcus Vance", "MV"], ["priya", "Priya Nair", "PN"], ["samarth", "Samarth More", "SM"]];
/* the demo meeting "Product Roadmap Review": t = simulated meeting seconds, dur = seconds spoken, tick = agenda item the (simulated) host completes afterwards */
const DEMO_SCRIPT = [
  { who: "alex", t: 5, dur: 7, text: "Thanks everyone for joining. Let's start with the roadmap update." },
  { who: "alex", t: 14, dur: 9, text: "Today we'll cover the roadmap, customer feedback, pricing and questions at the end.", tick: "p1" },
  { who: "elena", t: 30, dur: 14, text: "The roadmap is on track. We shipped the new onboarding flow last week and the mobile release is scheduled for next month." },
  { who: "marcus", t: 62, dur: 12, text: "On the product side the analytics update is in testing. We should have it ready for review by Friday." },
  { who: "elena", t: 100, dur: 16, text: "Two customers gave feedback about the reporting dashboard this week. They say exports are slow and the filters are confusing." },
  { who: "alex", t: 122, dur: 6, text: "That's useful. Which reports matter most to them?", tick: "p2" }, // (the agenda item "Customer feedback" is discussed a moment before the host ticks "Product updates": that is when the playbook hint shows)
  { who: "elena", t: 140, dur: 200, text: "Mostly the weekly usage report and the billing summary. One of them also asked whether reports can be emailed on a schedule. Honestly it is their biggest blocker right now, and both said they would consider switching if reporting does not improve soon." },
  { who: "alex", t: 350, dur: 8, text: "Thanks Elena. Marcus, can you send the revised pricing document tomorrow?" },
  { who: "marcus", t: 362, dur: 6, text: "Sure, I'll send the revised pricing document tomorrow morning." },
  { who: "priya", t: 380, dur: 8, text: "Can we confirm whether CSV export will be available in the next release?" },
  { who: "samarth", t: 400, dur: 10, text: "Yes, CSV export is planned for the next release, but scheduled email reports will come later." },
  { who: "alex", t: 430, dur: 8, text: "Great. So we agreed to continue with the dashboard improvements as our next priority.", tick: "p3" },
  { who: "priya", t: 470, dur: 10, text: "I'll draft the customer follow-up email and share it with Elena by Monday." },
  { who: "marcus", t: 520, dur: 8, text: "We also need to review the pricing tiers before the next meeting." },
  { who: "alex", t: 560, dur: 6, text: "Any other questions before we wrap up?" },
  { who: "elena", t: 585, dur: 8, text: "Just one. Who will follow up with the customers about the export timeline?" },
  { who: "alex", t: 640, dur: 16, text: "Let's revisit that in the next meeting. To wrap up: continue the dashboard improvements, Marcus sends pricing tomorrow, and Priya drafts the customer email.", tick: "p4" },
  { who: "alex", t: 700, dur: 4, text: "Thanks everyone, that's all for today.", tick: "p5" },
];
const DEMO_OVERVIEW = [ // [events played so far, what the (simulated) AI says at that point]
  [2, "The team opened the roadmap review and confirmed the agenda."],
  [7, "The team reviewed the roadmap and customer feedback about the reporting dashboard."],
  [12, "The team reviewed the roadmap and customer feedback about the reporting dashboard, agreed to continue the dashboard improvements, and confirmed CSV export is planned for the next release."],
  [18, "The team reviewed the roadmap and customer feedback about the reporting dashboard, agreed to continue the dashboard improvements, and confirmed CSV export is planned for the next release. Pricing and a customer follow-up were assigned; one question about follow-up on the export timeline stays open."],
];
const AI_STOP = new Set("that this with have from they them were your what when where which while been being into also just like then than some more very much here over only other need make made going know think want will would could should about there their said says thank thanks okay yeah right team meeting today good great sounds sure yes update updates items item".split(" "));
const AI_RX = { // rule-based tagging, English first (plus a few Spanish / Hindi cues); the order is the badge order (ACTION comes from the task rules below)
  ACTION: [/\b(?:voy a|vamos a|necesitamos|enviaré|revisaré)\b/i, /(?:करूँगा|करूंगी|भेजूँगा|भेजूंगी|देखूँगा|करना होगा)/, /\baction items?\b|\bto-?do\b|\bassigned to\b/i],
  DECISION: [/\b(?:we(?:'ve| have)? decided|we agreed|agreed (?:to|on|that)|decision|let's go with|we'll go with|we will go with|going with|we approved|settled on|the plan is|signed off)\b/i, /\b(?:decidimos|acordamos)\b/i, /(?:तय किया|फैसला|सहमत)/],
  QUESTION: [/\?\s*$/, /^(?:what|why|how|when|where|who|which)\s+(?:\w+\s+)?(?:is|are|was|were|do|does|did|can|could|would|should|will|about)\b/i, /^(?:can|could|would|should|do|does|did|is|are|will)\s+(?:you|we|i|they|it|the|this|that|there|anyone|someone|your|our)\b/i, /^(?:¿|qué |cómo |cuándo |dónde |quién |puedes |podemos )/i, /^(?:क्या|कैसे|क्यों|कब|कहाँ|कौन)(?:\s|$)/],
  "FOLLOW-UP": [/\b(?:follow[- ]?up|circle back|get back to (?:you|us|them)|touch base|revisit|come back to|reach out|check in|next meeting|next time)\b/i],
  CONCERN: [/\b(?:issues?|problems?|concerns?|worried|worry|not working|complain\w*|blocked|blockers?|delay\w*|risks?|bugs?|broken|struggl\w+|confus\w+|frustrat\w+|slow)\b/i],
};
const AI_GENERIC_Q = /\b(?:any (?:other |more )?questions|does that make sense|makes sense|anything else|sound good|okay\?|ok\?|right\?)/i; // asked to the room, not something to track
const AI_DUE = /\b(?:by|before|until|due(?: on)?|on)\s+((?:this |next |the )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tomorrow|tonight|end of (?:the )?(?:day|week|month|quarter|year)|eod|eow|next (?:week|month|quarter)|this (?:week|month))\b|\b(tomorrow|tonight|eod|eow)\b/i;
const AI_TASK = [ // [pattern, kind]: the LAST capture group is the task; asked / named: the first group must be somebody in the room
  [/^(?:hey |ok(?:ay)? |so |and |also |thanks?,? )?([A-Za-z]+)[, ]+(?:can|could|would|will) you\s+(?:also |please |just )?(.+?)[?.!]*$/i, "asked"],
  [/\b(?:i'll|i will|i can|i'm going to|i am going to)\s+(?:also |just )?(.+?)[?.!]*$/i, "self"],
  [/\b([A-Z][a-z]+) (?:will|can|should|is going to)\s+(?:also )?((?:send|share|review|prepare|follow|check|update|schedule|book|call|email|draft|finish|fix|write|create|confirm|deliver|submit)\b.+?)[?.!]*$/, "named"],
  [/\b(?:we|you|they) (?:also |still |really )?(?:need|have) to\s+(.+?)[?.!]*$/i, "none"],
  [/\b(?:need|needs) to\s+(.+?)[?.!]*$/i, "none"],
  [/\bplease\s+(.+?)[?.!]*$/i, "none"],
  [/\blet's make sure\s+(.+?)[?.!]*$/i, "none"],
  [/^(?:can|could|would|will) you\s+(?:also |please )?(.+?)[?.!]*$/i, "req"],
];
const AI_TAG_LABEL = { "FOLLOW-UP": "Follow-up", CONCERN: "Concern", DEADLINE: "Deadline mentioned" };
const AI_ASSIST = { summary: "Meeting summary", points: "Key points", actions: "Action items", decisions: "Decisions" };
const AI_RANK = { High: 3, Medium: 2, Low: 1 };

/* ---- state ---- */
const aiDataEmpty = () => ({ notes: "", actions: [], decisions: [], answered: [], kept: [], hidden: [], dismissed: [], coachOff: false, playbook: { items: AI_PLAYBOOK_DEFAULT.map((text, i) => ({ id: "p" + (i + 1), text, done: false })), current: "p1" } });
const aiDerivedEmpty = () => ({ questions: [], followups: [], actions: [], decisions: [], topics: [], topicCounts: [], people: [], facts: [], match: null });
const aiSide = (kind) => ({ kind, lines: [], derived: aiDerivedEmpty(), sig: "", summary: null, coach: [], seen: new Set(), coachAt: 0, talk: {}, streakId: "", streakSecs: 0, handSince: {}, data: aiDataEmpty(), aTimer: 0, simSecs: 0, baseMs: 0 });
function aiFresh() {
  return { mode: "live", live: aiSide("live"), demo: aiSide("demo"), seq: 0, secs: 0, ticks: 0, running: false, saved: true, saveFailed: false, editing: "", key: "", demoCaptions: false, capIdx: 0, capText: "", capSpeaker: "",
    run: { on: false, playing: false, started: false, done: false, instant: false, speed: "normal", idx: 0, timer: 0, speakerId: "", ids: {}, unmuted: [] } };
}
const S = () => aiNotes[aiNotes.mode];                                    // the state the panel is showing
const aiNow = (st) => (st.kind === "demo" ? st.baseMs + st.simSecs * 1000 : Date.now());
const aiElapsed = (st = S()) => Math.max(0, Math.floor((aiNow(st) - (st.kind === "demo" ? st.baseMs : state.liveStartTs || Date.now())) / 1000));
const aiDemoMode = () => aiNotes.mode === "demo";
const aiKey = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 60);
const aiShort = (t, n = 100) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const aiId = () => "x" + Date.now().toString(36) + ++aiNotes.seq;
const aiCap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const aiStems = (t) => [...new Set((t.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !AI_STOP.has(w)).map((w) => w.slice(0, 5)))];
const aiPeopleAll = () => { const p = livePeople(); return [...p, ...DEMO_USERS.filter((d) => !p.includes(d))]; };

/* ---- the service the UI talks to: it never knows which provider is behind it ---- */
const MeetingIntelligenceService = {
  ai: null, // set to { summarize(ctx), extractActions(ctx), extractDecisions(ctx), extractQuestions(ctx), generateCoachSuggestion(ctx) } (sync or async) once a real AI backend is configured - there is none in this prototype
  rule: { label: "RULE-BASED", summarize: (c) => aiRuleSummary(c), extractActions: (c) => c.st.derived.actions, extractDecisions: (c) => c.st.derived.decisions, extractQuestions: (c) => c.st.derived.questions, generateCoachSuggestion: (c) => aiCoachCandidates(c.st) },
  demo: { label: "DEMO AI", summarize: (c) => Object.assign(aiRuleSummary(c), { overview: DEMO_OVERVIEW.filter(([n]) => n <= aiNotes.run.idx).map((x) => x[1]).pop() || "The meeting has just started." }),
    extractActions: (c) => c.st.derived.actions, extractDecisions: (c) => c.st.derived.decisions, extractQuestions: (c) => c.st.derived.questions, generateCoachSuggestion: (c) => aiCoachCandidates(c.st) },
  forMode: (mode) => (mode === "demo" ? MeetingIntelligenceService.demo : MeetingIntelligenceService.ai),
};
const aiCtx = (st = S()) => ({ st, lines: st.lines, mode: st.kind, elapsed: aiElapsed(st) });

/* ---- reading the words: tags, tasks, owners, due dates ---- */
function aiDue(text) { const m = AI_DUE.exec(text); return m ? aiCap((m[1] || m[2] || "").trim()) : ""; }
function aiCleanTask(p) {
  const t = p.replace(AI_DUE, "").replace(/\s+(?:in the )?(?:morning|afternoon|evening)\b/i, "").replace(/\s{2,}/g, " ").replace(/^(?:also |just |please )/i, "").replace(/[\s,;:-]+$/, "").trim();
  return aiCap(t);
}
function aiTask(text, speaker) { // "Marcus, can you send the pricing document tomorrow?" -> { task: "Send the pricing document", owner: "Marcus Vance", due: "Tomorrow", conf: "High" }; nothing is guessed
  const people = aiPeopleAll();
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    for (const [re, kind] of AI_TASK) {
      const m = re.exec(sentence.trim());
      if (!m) continue;
      let owner = "";
      if (kind === "asked" || kind === "named") {
        const who = people.find((u) => u.name.split(" ")[0].toLowerCase() === m[1].toLowerCase());
        if (!who) continue;
        owner = who.name;
      } else if (kind === "self") owner = speaker;
      const phrase = m[m.length - 1], task = aiCleanTask(phrase), due = aiDue(phrase);
      if (task.split(/\s+/).length < 2) continue;
      return { task, owner, due, conf: owner && due ? "High" : owner || due ? "Medium" : "Low", request: kind === "asked" || kind === "req" };
    }
  }
  return null;
}
function aiDetect(text, speaker) {
  const plain = text.trim(), tags = [];
  if (plain.split(/\s+/).length < 3 && !/\?\s*$/.test(plain)) return { tags, due: "", owner: "", task: null };
  const task = aiTask(plain, speaker), hit = (tag) => AI_RX[tag].some((r) => r.test(plain));
  if (task || hit("ACTION")) tags.push("ACTION");
  ["DECISION", "QUESTION", "FOLLOW-UP", "CONCERN"].forEach((tag) => { if (tag === "QUESTION" && task && task.request) return; if (hit(tag)) tags.push(tag); }); // "Can you send X?" is a request, not an open question
  const due = task ? task.due : aiDue(plain);
  if (due || /\bdeadline\b/i.test(plain)) tags.push("DEADLINE");
  return { tags, due, owner: task ? task.owner : "", task };
}
function aiMatches(item, text) { // does this sentence / topic sound like this agenda item?
  const stems = (item.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !AI_STOP.has(w)).map((w) => w.slice(0, Math.max(4, w.length - 2))), low = text.toLowerCase();
  if (!stems.length) return item.toLowerCase().replace(/[^a-z]/g, "") === "qa" && /\bquestions?\b|\bq&a\b/.test(low);
  return stems.some((s) => low.includes(s));
}

/* ---- transcript (append only), rendered as a conversation: same speaker in a row groups under one header, like the Chat panel's own .live-msg/.live-bubble ---- */
function initialsOf(name) { return (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"; }
function speakerHue(e) { const s = e.speakerId || e.speaker || ""; let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 360; }
function sameSpeaker(a, b) { return !!a && !!b && (a.speakerId || b.speakerId ? a.speakerId === b.speakerId : a.speaker === b.speaker); }
function aiLineEl(e, grouped) {
  const isMe = !!(e.speakerId && e.speakerId === ME.id);
  const tagsHtml = e.tags.slice(0, 3).map((t) => `<span class="live-ai-tag" data-tag="${t}">${escapeHtml(t)}</span>`).join("");
  const demoHtml = e.demo ? `<span class="live-ai-demo">DEMO</span>` : "";
  const bubble = `<div class="live-bubble">${escapeHtml(e.text)}</div>`;
  const el = document.createElement("div");
  el.setAttribute("data-line", e.id);
  if (e.demo) el.setAttribute("data-demo", "");
  el.title = liveClock(e.at);
  if (isMe) {
    el.className = "live-ai-line live-msg own" + (grouped ? " grouped" : "");
    el.innerHTML = (grouped ? "" : `<div class="live-msg-meta">${escapeHtml(e.speaker)} (You) <time>${liveClock(e.at)}</time>${demoHtml}${tagsHtml}</div>`) + bubble;
  } else {
    el.className = "live-ai-line live-msg" + (grouped ? " grouped" : "");
    el.style.setProperty("--hue", speakerHue(e));
    el.innerHTML = (grouped ? "" : `<span class="live-msg-avatar">${escapeHtml(initialsOf(e.speaker))}</span>`) +
      `<div class="live-min-0">${grouped ? "" : `<div class="live-msg-meta"><strong class="fw-medium">${escapeHtml(e.speaker)}</strong><time>${liveClock(e.at)}</time>${demoHtml}${tagsHtml}</div>`}${bubble}</div>`;
  }
  return el;
}
function aiAddLine(e, which = "live") { // real speech arrives with the default; the demo controller passes "demo"
  const st = aiNotes[which], d = aiDetect(e.text, e.speaker);
  Object.assign(e, { tags: d.tags, due: d.due, owner: d.owner, task: d.task });
  const grouped = sameSpeaker(st.lines[st.lines.length - 1], e);
  st.lines.push(e);
  if (st.lines.length > 500) st.lines.shift();
  if (which === aiNotes.mode) {
    const list = $("#aiTrList"), atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 24, el = aiLineEl(e, grouped), q = $("#aiTrSearch").value.trim().toLowerCase();
    if (q && !e.text.toLowerCase().includes(q)) el.classList.add("d-none");
    list.append(el);
    while (list.childElementCount > 500) list.firstElementChild.remove();
    $("#aiTrEmpty").classList.add("d-none");
    if (atEnd) list.scrollTop = list.scrollHeight;
  }
  if (which === "live") { clearTimeout(st.aTimer); st.aTimer = setTimeout(() => aiAnalyze("live"), 1200); if (which === aiNotes.mode) aiRenderCoachHead(); } // batch: analyse once the talking pauses, not per line
}
function aiRebuildTranscript() { // only when the panel switches between the live and the demo state (or one of them is reset); the result box belongs to the state that produced it
  const list = $("#aiTrList"), st = S();
  $("#aiResult").classList.add("d-none"); $("#aiResult").replaceChildren();
  list.replaceChildren(...st.lines.map((e, i) => aiLineEl(e, sameSpeaker(st.lines[i - 1], e))));
  $("#aiTrEmpty").classList.toggle("d-none", st.lines.length > 0);
  const sample = '<span class="d-block mt-2"><button type="button" class="live-mini-btn" data-ai-act="sample-load"><i class="bi bi-magic"></i>Load sample data</button></span>'; // the whole sample meeting at once, marked DEMO
  $("#aiTrEmpty").innerHTML = aiDemoMode() ? `The demo hasn't started.<br>Press <strong>Start</strong> to play the sample meeting live, or load it all at once.${sample}` : `No transcript yet.<br>Start transcription to capture what your microphone hears, or see how Notes &amp; Coach looks with sample data.${sample}`;
  aiSearch(); aiOnShow();
}
function aiSearch() {
  const q = $("#aiTrSearch").value.trim().toLowerCase();
  $$("#aiTrList .live-ai-line").forEach((n) => n.classList.toggle("d-none", !!q && !n.textContent.toLowerCase().includes(q)));
}
function aiWave() { $("#aiTrWave").classList.toggle("on", !aiDemoMode() && aiNotes.running && liveMicOn() && live.speaking.has(ME.id)); }
function aiRenderBar() { // status line, language and buttons follow meetingLanguageState (live) or the demo controller (demo); only text / classes change
  const s = meetingLanguageState, st = s.transcriptionStatus, running = st === "starting" || st === "listening" || st === "processing", run = aiNotes.run;
  aiNotes.running = running;
  const status = $("#aiTrStatus"), btn = $("#aiTrToggle"), icon = btn.querySelector(".bi"), label = btn.querySelector("span");
  if (aiDemoMode()) {
    const total = DEMO_SCRIPT.length;
    status.textContent = run.done ? "Demo finished" : run.playing ? `Demo playing · ${run.idx}/${total}` : run.started ? `Demo paused · ${run.idx}/${total}` : "Demo ready";
    status.classList.remove("text-warning");
    label.textContent = run.playing ? "Pause demo" : run.started && !run.done ? "Resume demo" : run.done ? "Restart demo" : "Start demo";
    icon.className = run.playing ? "bi bi-pause-fill" : "bi bi-play-fill";
  } else {
    status.textContent = running ? (st === "starting" ? "Starting transcription…" : `Live transcribing… ${formatMMSS(aiNotes.secs)}`) : { idle: "Transcription off", stopped: s.statusNote || "Stopped", error: s.statusNote || "Transcription error" }[st];
    status.classList.toggle("text-warning", st === "error");
    $("#aiTrLang").value = langShort(s.transcriptionLanguage);
    const engineOn = s.transcribing || s.captionsEnabled; // whatever is keeping the recognition engine running, the button always reflects and can fully stop it
    label.textContent = engineOn ? "Stop transcription" : "Start transcription";
    icon.className = engineOn ? "bi bi-stop-fill" : "bi bi-play-fill";
  }
  aiWave();
  aiRenderCoachHead();
}
function aiOnShow() { const list = $("#aiTrList"); list.scrollTop = list.scrollHeight; }
function aiTab(name) { bootstrap.Tab.getOrCreateInstance($("#aiTab" + name)).show(); }
function aiJump(id) { // from a decision / question back to the transcript line it came from
  const line = id && $(`#aiTrList [data-line="${id}"]`);
  if (!line) { toast("That transcript line isn't available any more.", "error", "ai-notes"); return; }
  $("#aiTrSearch").value = ""; aiSearch(); aiTab("Transcript");
  setTimeout(() => { line.scrollIntoView({ block: "center" }); line.classList.add("flash"); setTimeout(() => line.classList.remove("flash"), 1600); }, 60);
}

/* ---- demo captions (a separate little switch: the caption overlay cycles the demo lines, marked DEMO) ---- */
function demoCaptionStep() {
  const ev = DEMO_SCRIPT[aiNotes.capIdx++ % DEMO_SCRIPT.length], u = DEMO_CAST.find((c) => c[0] === ev.who);
  aiNotes.capSpeaker = u[1].split(" ")[0]; aiNotes.capText = ev.text;
  renderCaption();
}
function setDemoCaptions(on) {
  aiNotes.demoCaptions = on; aiNotes.capIdx = 0; aiNotes.capText = "";
  clearInterval(live.timers.aiCap);
  if (on) { demoCaptionStep(); live.timers.aiCap = setInterval(demoCaptionStep, 3500); }
  $("#liveDemoCaptionsSwitch").checked = on;
  renderCaption();
  toast(on ? "Demo captions on. They are sample text, not your microphone." : "Demo captions off.", "success", "demo");
}

/* ---- saving (live state only, per meeting code) ---- */
function aiRenderSaved() { $("#aiSaved").textContent = aiDemoMode() ? "Demo notes aren't saved" : aiNotes.saveFailed ? "Couldn't save (storage unavailable)" : aiNotes.saved ? "✓ Saved on this device" : "Saving…"; }
function aiTouch() {
  if (aiDemoMode()) { aiRenderSaved(); return; } // demo data never reaches storage
  aiNotes.saved = false; aiRenderSaved(); clearTimeout(live.timers.aiS); live.timers.aiS = setTimeout(aiSave, 500);
}
function aiSave() {
  clearTimeout(live.timers.aiS); live.timers.aiS = 0;
  if (!aiNotes.key) return;
  const d = aiNotes.live.data, keep = { notes: d.notes, actions: d.actions, decisions: d.decisions, answered: d.answered, kept: d.kept, hidden: d.hidden, dismissed: d.dismissed, coachOff: d.coachOff, playbook: d.playbook, t: Date.now() };
  try {
    const all = JSON.parse(localStorage.getItem(AI_KEY) || "{}");
    all[aiNotes.key] = keep;
    Object.keys(all).sort((a, b) => all[b].t - all[a].t).slice(30).forEach((k) => delete all[k]);
    localStorage.setItem(AI_KEY, JSON.stringify(all));
    aiNotes.saved = true; aiNotes.saveFailed = false;
  } catch { aiNotes.saveFailed = true; }
  aiRenderSaved();
}
function aiNotesStart() { // a meeting begins: bring back what was saved for THIS meeting code (into the live state only)
  aiNotes.key = state.liveMeeting ? `${ME.id}|${state.liveMeeting.meetingCode || state.liveMeeting.id}` : "";
  try {
    const saved = JSON.parse(localStorage.getItem(AI_KEY) || "{}")[aiNotes.key];
    if (saved) {
      const d = Object.assign(aiDataEmpty(), saved);
      ["actions", "decisions", "answered", "kept", "hidden", "dismissed"].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
      if (!d.playbook || !Array.isArray(d.playbook.items)) d.playbook = aiDataEmpty().playbook;
      d.notes = String(d.notes || "");
      aiNotes.live.data = d;
    }
  } catch { /* nothing saved / storage unavailable */ }
  aiRenderAll();
}

/* ---- analysis (rule-based, debounced for the live state, run per line by the demo) ---- */
function aiAnalyze(which = aiNotes.mode) {
  const st = aiNotes[which], data = st.data, d = aiDerivedEmpty(), words = {}, tasks = new Map(), lines = st.lines;
  clearTimeout(st.aTimer); st.aTimer = 0;
  const confirmed = new Set([...data.actions, ...data.decisions].map((x) => x.key)), answered = new Set(data.answered), kept = new Set(data.kept), hidden = new Set(data.hidden), people = aiPeopleAll();
  lines.forEach((l, i) => {
    const t = l.tags, key = aiKey(l.text);
    if (t.includes("QUESTION") && !AI_GENERIC_Q.test(l.text) && !answered.has(key)) {
      const qs = aiStems(l.text), later = lines.slice(i + 1).find((n) => n.speaker !== l.speaker && !n.tags.includes("QUESTION") && aiStems(n.text).filter((x) => qs.includes(x)).length >= 2);
      d.questions.push({ key, text: l.text, speaker: l.speaker, at: l.at, id: l.id, maybe: later && !kept.has(key) ? { speaker: later.speaker, text: later.text, id: later.id } : null }); // "possibly answered": suggested, never removed silently
    }
    if (l.task) { const k = aiKey(l.task.task), prev = tasks.get(k); if (!prev || AI_RANK[l.task.conf] > AI_RANK[prev.conf]) tasks.set(k, { key: k, task: l.task.task, owner: l.task.owner, due: l.task.due, conf: l.task.conf, id: l.id, speaker: l.speaker }); }
    if (t.includes("DECISION") && !confirmed.has(key) && !hidden.has(key)) d.decisions.push({ key, text: aiCap(l.text.replace(/^(?:great|ok(?:ay)?|so|right|alright)[, ]+(?:so )?/i, "")), id: l.id, speaker: l.speaker });
    const tag = ["FOLLOW-UP", "CONCERN", "DEADLINE"].find((x) => t.includes(x));
    if (tag && !t.includes("ACTION") && !hidden.has(key) && !confirmed.has(key)) d.followups.push({ key, text: l.text, tag, due: l.due, id: l.id });
    if (!t.includes("QUESTION") && !t.includes("ACTION") && !t.includes("DECISION") && (/\d/.test(l.text) || l.due) && d.facts.length < 3) d.facts.push(aiShort(l.text, 90));
    (l.text.toLowerCase().match(/[a-z]{4,}/g) || []).forEach((w) => { if (!AI_STOP.has(w)) words[w] = (words[w] || 0) + 1; });
  });
  tasks.forEach((v) => { if (!confirmed.has(v.key) && !hidden.has(v.key)) d.actions.push(v); });
  d.topicCounts = lines.length >= 3 ? Object.entries(words).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6) : [];
  d.topics = d.topicCounts.map(([w]) => w);
  const mentioned = people.filter((u) => lines.some((l) => new RegExp(`\\b${u.name.split(" ")[0]}\\b`, "i").test(l.text))).map((u) => u.name);
  d.people = [...new Set([...lines.map((l) => l.speaker), ...mentioned])].slice(0, 8);
  const pb = data.playbook, recent = lines.slice(-4), hit = pb.items.find((it) => !it.done && it.id !== pb.current && recent.some((l) => aiMatches(it.text, l.text)));
  d.match = hit ? { id: hit.id, text: hit.text } : null;
  const sig = JSON.stringify([d.questions.map((q) => q.key + (q.maybe ? "?" : "")), d.actions.map((a) => a.key + a.conf + a.owner + a.due), d.decisions.map((x) => x.key), d.followups.map((f) => f.key), d.topicCounts, d.people, d.facts, d.match && d.match.id,
    data.answered.length, data.kept.length, data.hidden.length, data.actions.length, data.decisions.length, pb.current, pb.items.map((i) => i.id + i.done + i.text).join(), lines.length]);
  st.derived = d;
  const changed = sig !== st.sig; st.sig = sig;
  aiCoachEval(which);
  if (which === aiNotes.mode) { if (changed) aiRenderDerived(); aiRenderCoachHead(); }
}

/* ---- summary, key points, wrap-up (extractive, from the state's own transcript) ---- */
function aiKeyPoints(lines) {
  const W = { DECISION: 3, ACTION: 2, DEADLINE: 2, CONCERN: 2, QUESTION: 1, "FOLLOW-UP": 1 };
  return lines.map((l, i) => ({ l, i, s: l.tags.reduce((a, t) => a + (W[t] || 0), 0) })).filter((x) => x.s >= 2).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 5).sort((a, b) => a.i - b.i).map((x) => x.l);
}
function aiRuleSummary(c) { // the structured Meeting Summary object
  const st = c.st, d = st.derived, data = st.data, lines = st.lines;
  const overview = lines.length >= 2 ? `${d.topics.length ? `Discussed: ${d.topics.slice(0, 4).join(", ")}. ` : ""}${lines.length} transcript lines from ${d.people.slice(0, 4).join(", ")}${d.people.length > 4 ? " and others" : ""}.` : "Not enough transcript yet for an overview.";
  return { overview,
    keyPoints: aiKeyPoints(lines).map((l) => aiShort(l.text, 110)),
    decisions: [...data.decisions.map((x) => x.text), ...d.decisions.map((x) => x.text + " (suggested)")],
    actions: [...data.actions.map((a) => ({ task: a.text, owner: a.owner, due: a.due })), ...d.actions.map((a) => ({ task: a.task, owner: a.owner, due: a.due, suggested: true }))],
    questions: d.questions.map((q) => q.text) };
}
function aiSummaryText(sm) {
  const bul = (a) => (a.length ? a.map((x) => "• " + x) : ["• None"]);
  return ["OVERVIEW", sm.overview, "", "KEY POINTS", ...bul(sm.keyPoints), "", "DECISIONS", ...bul(sm.decisions), "", "ACTION ITEMS",
    ...bul(sm.actions.map((a) => `${a.owner || "Unassigned"} — ${a.task}${a.due ? ` (${a.due})` : ""}${a.suggested ? " (suggested)" : ""}`)), "", "OPEN QUESTIONS", ...bul(sm.questions)].join("\n");
}
function aiShowResult(title, text, label, tone, extra = "") { // an editable result: edit it, add it to your notes, copy it
  const box = $("#aiResult");
  box.classList.remove("d-none");
  box.innerHTML = `<div class="d-flex align-items-center gap-2 mb-1"><strong class="text-uppercase small">${escapeHtml(title)}</strong><span class="${tone === "demo" ? "live-ai-demo" : "live-ai-rule"}">${escapeHtml(label)}</span><button type="button" class="live-icon-btn ms-auto" data-ai-act="result-close" aria-label="Close"><i class="bi bi-x-lg"></i></button></div>
    <textarea class="form-control form-control-sm live-ai-input" rows="8" data-result-edit aria-label="${escapeHtml(title)} (editable)">${escapeHtml(text)}</textarea>
    <div class="d-flex flex-wrap gap-1 mt-2"><button type="button" class="live-mini-btn" data-ai-act="result-notes"><i class="bi bi-journal-plus"></i>Add to notes</button><button type="button" class="live-mini-btn" data-ai-act="result-copy"><i class="bi bi-clipboard"></i><span>Copy</span></button></div>
    <div class="live-desc mt-1">${extra}You can edit this. It never replaces your own notes.</div>`;
}
function aiResultMsg(html, fallbackKind) { // a plain note in the result box (nothing generated)
  const box = $("#aiResult");
  box.classList.remove("d-none");
  box.innerHTML = `<div class="d-flex align-items-start gap-2"><div class="small flex-grow-1">${html}${fallbackKind ? `<div class="mt-2"><button type="button" class="live-mini-btn" data-ai-act="ai-rule" data-kind="${fallbackKind}"><i class="bi bi-list-check"></i>Use rule-based instead</button></div>` : ""}</div><button type="button" class="live-icon-btn flex-shrink-0" data-ai-act="result-close" aria-label="Close"><i class="bi bi-x-lg"></i></button></div>`;
}
async function runAiAction(kind, forceRule) { // Summarize / Key points / Action items / Decisions
  const st = S(), ctx = aiCtx(st), provider = forceRule ? MeetingIntelligenceService.rule : MeetingIntelligenceService.forMode(st.kind), title = AI_ASSIST[kind];
  if (!st.lines.length) { aiResultMsg(aiDemoMode() ? "The demo hasn't played anything yet. Press Start demo." : "Nothing to analyse yet. Start transcription and speak, or try Demo mode in More."); return; }
  if (!provider) { aiResultMsg("AI processing is not configured.", kind); return; } // live, no AI backend: say so, never fake it
  aiAnalyze(st.kind);
  try {
    const label = provider.label, tone = provider === MeetingIntelligenceService.demo ? "demo" : "rule";
    if (kind === "summary") {
      const sm = await provider.summarize(ctx);
      st.summary = { source: label, demo: st.kind === "demo", data: sm, text: aiSummaryText(sm) };
      aiShowResult(title, st.summary.text, label, tone, st.kind === "demo" ? "Simulated result for the demo meeting. " : "Simple keyword rules over the transcript, not AI. ");
      aiRenderWrap();
    } else if (kind === "points") {
      const pts = (await provider.summarize(ctx)).keyPoints;
      aiShowResult(title, pts.length ? pts.map((x) => "• " + x).join("\n") : "• Nothing stands out yet.", label, tone, st.kind === "demo" ? "Simulated result. " : "Rule-based, not AI. ");
    } else {
      const list = await (kind === "actions" ? provider.extractActions(ctx) : provider.extractDecisions(ctx));
      aiOpenSection(kind === "actions" ? "#aiSecActions" : "#aiSecDecisions");
      aiResultMsg(list.length ? `${list.length} suggested ${title.toLowerCase()} found. They are only suggestions: review them under ${title} and add the ones you agree with.` : `No new ${title.toLowerCase()} found in the transcript so far.`);
    }
  } catch { aiResultMsg("AI analysis unavailable."); }
}

/* ---- notes ---- */
function aiWords() { const n = ($("#aiNotesText").value.match(/\S+/g) || []).length; $("#aiWords").textContent = `${n} word${n === 1 ? "" : "s"}`; }
function aiNotesInput() { S().data.notes = $("#aiNotesText").value; aiWords(); aiTouch(); }
function aiNoteAppend(text) { const ta = $("#aiNotesText"); ta.value += (ta.value && !ta.value.endsWith("\n") ? "\n" : "") + text + "\n"; aiNotesInput(); }
function aiInsertStamp() { // [mm:ss] of the meeting clock (the demo's own simulated clock in demo mode), at the cursor
  const ta = $("#aiNotesText"), s = ta.selectionStart, pre = ta.value.slice(0, s);
  ta.setRangeText((pre && !pre.endsWith("\n") ? "\n" : "") + `[${formatMMSS(aiElapsed())}] `, s, ta.selectionEnd, "end");
  ta.focus(); aiNotesInput();
}
function aiWrapData(st = S()) { // Summary / Key points / Decisions / Action items / Open questions, from the state as it is now
  const d = st.derived, data = st.data;
  return { overview: st.summary ? st.summary.data.overview : "", keyPoints: aiKeyPoints(st.lines).map((l) => aiShort(l.text, 110)),
    decisions: data.decisions.map((x) => x.text), actions: data.actions.map((a) => ({ task: a.text, owner: a.owner, due: a.due })), questions: d.questions.map((q) => q.text) };
}
function aiRecordText() { // Download / Copy: this meeting's notes, summary, lists and progress (the transcript has its own download)
  const st = S(), m = state.liveMeeting || {}, d = st.data, L = [], head = (t) => L.push("", t.toUpperCase(), "-".repeat(t.length)), w = aiWrapData(st);
  L.push(`${st.kind === "demo" ? "DEMO - simulated meeting, not real data - " : ""}${st.kind === "demo" ? "Product Roadmap Review" : m.title || "Meeting"} - notes`, `Date: ${new Date().toLocaleDateString()}    Meeting time so far: ${formatMMSS(aiElapsed(st))}`, "Written in Notes & Coach. Kept on this device.");
  head("Notes"); L.push(d.notes.trim() || "(none)");
  if (st.summary) { head(`Summary (${st.summary.source})`); L.push(st.summary.text); }
  head("Action items"); L.push(...(d.actions.length ? d.actions.map((a) => `[${a.done ? "x" : " "}] ${a.text}  (Owner: ${a.owner || "Unassigned"}; Due: ${a.due || "Not specified"}; Source: ${a.origin || "Manual"})`) : ["(none)"]));
  head("Decisions"); L.push(...(d.decisions.length ? d.decisions.map((x) => `- ${x.text}`) : ["(none)"]));
  head("Playbook"); L.push(...d.playbook.items.map((i) => `[${i.done ? "x" : " "}] ${i.text}`));
  head("Open questions"); L.push(...(w.questions.length ? w.questions.map((q) => `? ${q}`) : ["(none)"]));
  return L.join("\n") + "\n";
}
function aiTranscriptText() {
  const st = S(), m = state.liveMeeting || {};
  return [`${st.kind === "demo" ? "DEMO - simulated meeting - " : ""}${m.title || "Meeting"} - transcript`, ...(st.kind === "demo" ? ["Every line is simulated (DEMO)."] : []), "", ...st.lines.map((l) => `[${liveClock(l.at)}] ${l.speaker}${l.demo ? " [DEMO]" : ""}: ${l.text}`)].join("\n") + "\n";
}
function aiDownload(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
const aiFile = (what) => `${aiDemoMode() ? "demo-" : ""}${what}-${String((state.liveMeeting && state.liveMeeting.meetingCode) || "meeting").replace(/[^\w-]+/g, "")}.txt`;

/* ---- your lists (confirmed) and the suggestions next to them ---- */
function aiAddAction(a) { // a = { text, owner, due, key, origin, src }
  const d = S().data, key = a.key || aiKey(a.text);
  if (d.actions.some((x) => x.key === key)) return false;
  d.actions.push({ id: aiId(), text: aiShort(a.text, 160), owner: a.owner || "", due: a.due || "", done: false, key, src: a.src || "", origin: a.origin || "Manual" });
  return true;
}
function aiAddDecision(a) {
  const d = S().data, key = a.key || aiKey(a.text);
  if (d.decisions.some((x) => x.key === key)) return false;
  d.decisions.push({ id: aiId(), text: aiShort(a.text, 160), key, src: a.src || "", origin: a.origin || "Manual" });
  return true;
}
const aiCount = (sec, n) => { $(`#${sec} .live-ai-count`).textContent = n; };
function aiOpenSection(sel) { const d = $(sel); d.open = true; d.scrollIntoView({ block: "nearest" }); }
function aiRenderActions() {
  const st = S(), acts = st.data.actions, owners = ["", ...livePeople().map((u) => u.name), ...(st.kind === "demo" ? DEMO_USERS.map((u) => u.name) : [])];
  $("#aiActions").innerHTML = acts.map((a) => {
    const opts = [...new Set(owners.includes(a.owner) ? owners : [...owners, a.owner])], editing = aiNotes.editing === "act:" + a.id;
    return `<li class="live-ai-item" data-id="${a.id}"><div class="d-flex align-items-start gap-2"><input class="form-check-input mt-1 flex-shrink-0" type="checkbox" data-ck="action" aria-label="Done"${a.done ? " checked" : ""}>
      <div class="flex-grow-1 live-min-0">${editing ? `<input class="form-control form-control-sm live-ai-input" data-edit maxlength="160" value="${escapeHtml(a.text)}" aria-label="Edit action item">` : `<div class="live-ai-item-text${a.done ? " done" : ""}">${escapeHtml(a.text)}</div>`}
        <div class="d-flex flex-wrap align-items-center gap-1 mt-1"><span class="live-desc">Owner</span><select class="form-select form-select-sm live-select live-ai-mini" data-f="owner" aria-label="Owner">${opts.map((o) => `<option value="${escapeHtml(o)}"${o === a.owner ? " selected" : ""}>${o ? escapeHtml(o) : "Unassigned"}</option>`).join("")}</select>
        <span class="live-desc">Due</span><input class="form-control form-control-sm live-ai-input live-ai-mini" data-f="due" value="${escapeHtml(a.due)}" placeholder="Not specified" aria-label="Due" maxlength="30"></div>
        <div class="live-desc mt-1">Source: ${escapeHtml(a.origin || "Manual")}${a.done ? " · Done" : ""}</div></div>
      <button type="button" class="live-icon-btn flex-shrink-0" data-ai-act="edit-action" aria-label="Edit action item"><i class="bi bi-pencil"></i></button>
      <button type="button" class="live-icon-btn flex-shrink-0" data-ai-act="del-action" aria-label="Delete action item"><i class="bi bi-x-lg"></i></button></div></li>`;
  }).join("");
  aiCount("aiSecActions", acts.filter((a) => !a.done).length);
  if (aiNotes.editing.startsWith("act:")) { const i = $("#aiActions [data-edit]"); if (i) i.focus(); }
}
function aiRenderActionSuggestions() {
  const a = S().derived.actions;
  $("#aiActionsSug").innerHTML = a.map((x) => `<li class="live-ai-item live-ai-sug"><div class="d-flex align-items-start gap-2"><i class="bi bi-lightbulb text-warning mt-1 flex-shrink-0"></i>
    <div class="flex-grow-1 live-min-0"><div class="live-ai-item-text">${escapeHtml(x.task)}</div><div class="live-desc"><span class="live-ai-tag" data-tag="SUGGESTED">SUGGESTED</span> Owner: ${x.owner ? escapeHtml(x.owner) : "Unassigned"} · Due: ${x.due ? escapeHtml(x.due) : "Not specified"} · Confidence: ${x.conf} · Source: Transcript</div></div>
    <button type="button" class="live-mini-btn flex-shrink-0" data-ai-act="sug-action" data-key="${escapeHtml(x.key)}"><i class="bi bi-plus-lg"></i>Add Action</button>
    <button type="button" class="live-icon-btn flex-shrink-0" data-ai-act="sug-hide" data-key="${escapeHtml(x.key)}" aria-label="Dismiss suggestion"><i class="bi bi-x-lg"></i></button></div></li>`).join("");
  $("#aiSugActionsCount").textContent = a.length ? `Suggested (${a.length})` : "";
}
function aiRenderDecisions() {
  const decs = S().data.decisions;
  $("#aiDecisions").innerHTML = decs.map((x) => {
    const editing = aiNotes.editing === "dec:" + x.id;
    return `<li class="live-ai-item" data-id="${x.id}"><div class="d-flex align-items-start gap-2"><i class="bi bi-check2-circle text-success mt-1 flex-shrink-0"></i>
      <div class="flex-grow-1 live-min-0">${editing ? `<input class="form-control form-control-sm live-ai-input" data-edit maxlength="160" value="${escapeHtml(x.text)}" aria-label="Edit decision">` : `<div class="live-ai-item-text">${escapeHtml(x.text)}</div>`}<div class="live-desc">Source: ${escapeHtml(x.origin || "Manual")}</div></div>
      ${x.src ? `<button type="button" class="live-icon-btn flex-shrink-0" data-ai-act="jump" data-arg="${escapeHtml(x.src)}" aria-label="Show in transcript" title="Show in transcript"><i class="bi bi-chat-quote"></i></button>` : ""}
      <button type="button" class="live-icon-btn flex-shrink-0" data-ai-act="edit-decision" aria-label="Edit decision"><i class="bi bi-pencil"></i></button>
      <button type="button" class="live-icon-btn flex-shrink-0" data-ai-act="del-decision" aria-label="Delete decision"><i class="bi bi-x-lg"></i></button></div></li>`;
  }).join("");
  aiCount("aiSecDecisions", decs.length);
  if (aiNotes.editing.startsWith("dec:")) { const i = $("#aiDecisions [data-edit]"); if (i) i.focus(); }
}
function aiRenderDecisionSuggestions() {
  const d = S().derived.decisions;
  $("#aiDecisionsSug").innerHTML = d.map((x) => `<li class="live-ai-item live-ai-sug"><div class="d-flex align-items-start gap-2"><i class="bi bi-lightbulb text-warning mt-1 flex-shrink-0"></i>
    <div class="flex-grow-1 live-min-0"><div class="live-ai-item-text">${escapeHtml(x.text)}</div><div class="live-desc"><span class="live-ai-tag" data-tag="SUGGESTED">SUGGESTED</span> ${escapeHtml(x.speaker)} · Source: Transcript</div></div>
    <button type="button" class="live-mini-btn flex-shrink-0" data-ai-act="sug-decision" data-key="${escapeHtml(x.key)}"><i class="bi bi-plus-lg"></i>Add</button>
    <button type="button" class="live-icon-btn flex-shrink-0" data-ai-act="sug-hide" data-key="${escapeHtml(x.key)}" aria-label="Dismiss suggestion"><i class="bi bi-x-lg"></i></button></div></li>`).join("");
  $("#aiSugDecisionsCount").textContent = d.length ? `Suggested (${d.length})` : "";
}
function aiRenderQuestions() {
  const q = S().derived.questions;
  $("#aiQuestions").innerHTML = q.map((x) => `<li class="live-ai-item"><div class="d-flex align-items-start gap-2"><i class="bi bi-question-circle text-warning mt-1 flex-shrink-0"></i>
    <div class="flex-grow-1 live-min-0"><div class="live-ai-item-text">“${escapeHtml(aiShort(x.text, 140))}”</div><div class="live-desc">${escapeHtml(x.speaker)} · ${liveClock(x.at)} · <strong>${x.maybe ? "Possibly answered" : "Unanswered"}</strong></div>
      ${x.maybe ? `<div class="live-ai-hint mt-1"><i class="bi bi-check2-circle"></i><span class="flex-grow-1 live-min-0">Question answered? ${escapeHtml(x.maybe.speaker)}: “${escapeHtml(aiShort(x.maybe.text, 90))}”</span></div>` : ""}
      <div class="d-flex flex-wrap gap-1 mt-1"><button type="button" class="live-mini-btn" data-ai-act="answer" data-key="${escapeHtml(x.key)}">${x.maybe ? "Confirm answered" : "Mark answered"}</button>${x.maybe ? `<button type="button" class="live-mini-btn" data-ai-act="keep-open" data-key="${escapeHtml(x.key)}">Keep open</button>` : ""}<button type="button" class="live-mini-btn" data-ai-act="q-notes" data-arg="${escapeHtml(aiShort(x.text, 120))}"><i class="bi bi-journal-plus"></i>Add to Notes</button></div></div></div></li>`).join("");
  aiCount("aiSecQuestions", q.length);
  $("#aiTrQ").textContent = `${q.length} open question${q.length === 1 ? "" : "s"}`;
}
function aiRenderRadar() {
  const f = S().derived.followups, topics = S().derived.topics;
  $("#aiRadar").innerHTML = f.map((x) => {
    const topic = topics.find((w) => x.text.toLowerCase().includes(w)), lead = topic ? aiCap(topic) : AI_TAG_LABEL[x.tag];
    return `<li class="live-ai-item"><div class="d-flex align-items-start gap-2"><i class="bi bi-circle-fill text-warning mt-1 flex-shrink-0 live-ai-dot"></i>
    <div class="flex-grow-1 live-min-0"><div class="live-desc fw-semibold">${escapeHtml(lead)} · ${AI_TAG_LABEL[x.tag]}${x.due ? ` · ${escapeHtml(x.due)}` : ""}</div><div class="live-ai-item-text">“${escapeHtml(aiShort(x.text, 120))}”</div>
      <div class="d-flex flex-wrap gap-1 mt-1"><button type="button" class="live-mini-btn" data-ai-act="radar-add" data-key="${escapeHtml(x.key)}"><i class="bi bi-plus-lg"></i>Add Action</button></div></div>
    <button type="button" class="live-icon-btn flex-shrink-0" data-ai-act="radar-hide" data-key="${escapeHtml(x.key)}" aria-label="Dismiss"><i class="bi bi-x-lg"></i></button></div></li>`;
  }).join("");
  aiCount("aiSecRadar", f.length);
}
function aiRenderMemory() { // everything found so far in THIS meeting's state: topics, people, decisions, actions, questions, important facts
  const st = S(), d = st.derived, data = st.data;
  const groups = [["Topics", d.topics.map(aiCap)], ["People", d.people], ["Decisions", [...data.decisions.map((x) => x.text), ...d.decisions.map((x) => x.text + " (suggested)")]], ["Actions", [...data.actions.map((x) => x.text), ...d.actions.map((x) => x.task + " (suggested)")]],
    ["Questions", d.questions.map((x) => x.text)], ["Important facts", d.facts]].filter(([, a]) => a.length);
  $("#aiMemory").innerHTML = groups.length ? groups.map(([t, a]) => `<div class="mb-2"><div class="live-desc fw-semibold">${t}</div><ul class="mb-0 ps-3 small">${a.slice(0, 4).map((x) => `<li>${escapeHtml(aiShort(x, 80))}</li>`).join("")}${a.length > 4 ? `<li class="live-desc">+${a.length - 4} more</li>` : ""}</ul></div>`).join("")
    : '<div class="live-desc">Nothing yet. It fills in as the transcript and your lists grow, for this meeting only.</div>';
  aiCount("aiSecMemory", groups.reduce((n, [, a]) => n + a.length, 0));
}
function aiRenderWrap() {
  const st = S(), w = aiWrapData(st), sec = (t, a) => `<div class="mb-2"><div class="live-desc fw-semibold">${t}</div>${a.length ? `<ul class="mb-0 ps-3 small">${a.slice(0, 3).map((x) => `<li>${escapeHtml(aiShort(x, 90))}</li>`).join("")}${a.length > 3 ? `<li class="live-desc">+${a.length - 3} more</li>` : ""}</ul>` : '<div class="small live-muted">None</div>'}</div>`;
  $("#aiWrap").innerHTML = `${st.kind === "demo" ? '<div class="live-desc mb-1"><span class="live-ai-demo">DEMO</span> simulated meeting</div>' : ""}
    <div class="mb-2"><div class="live-desc fw-semibold">Summary</div><div class="small">${w.overview ? escapeHtml(w.overview) : '<span class="live-muted">Not generated yet. Use Summarize (or Review).</span>'}</div></div>
    ${sec("Key points", w.keyPoints)}${sec("Decisions", w.decisions)}${sec("Action items", w.actions.map((a) => `${a.owner || "Unassigned"} — ${a.task}${a.due ? ` (${a.due})` : ""}`))}${sec("Open questions", w.questions)}
    <div class="d-flex flex-wrap gap-1 mt-1"><button type="button" class="live-mini-btn" data-ai-act="wrap-review"><i class="bi bi-eye"></i>Review</button><button type="button" class="live-mini-btn" data-ai-act="notes-download"><i class="bi bi-download"></i>Download</button><button type="button" class="live-mini-btn" data-ai-act="wrap-copy"><i class="bi bi-clipboard"></i><span>Copy</span></button></div>
    <div class="live-desc mt-1">Nothing ends the meeting. You decide when to use this.</div>`;
  aiCount("aiSecWrap", st.data.actions.length + st.data.decisions.length);
}

/* ---- playbook ---- */
function aiPbSync(st = S()) { // the current step is always an unfinished one: when it is ticked off, focus moves to the next unfinished step (nothing is ticked for you)
  const pb = st.data.playbook, cur = pb.items.find((i) => i.id === pb.current);
  if (cur && !cur.done) return;
  const from = pb.items.findIndex((i) => i.id === pb.current), next = pb.items.slice(from + 1).find((i) => !i.done) || pb.items.find((i) => !i.done);
  pb.current = next ? next.id : "";
}
function aiRenderPlaybook() {
  if (aiNotes.editing.startsWith("pb:") && document.activeElement && document.activeElement.matches("#aiPlaybook [data-edit]")) return; // don't rebuild under someone typing
  const st = S();
  aiPbSync(st);
  const pb = st.data.playbook, n = pb.items.length, done = pb.items.filter((i) => i.done).length, pct = n ? Math.round((done / n) * 100) : 0, m = st.derived.match;
  $("#aiPbCount").textContent = `${done}/${n}`;
  $("#aiPbFill").style.width = pct + "%"; $("#aiPbBar").setAttribute("aria-valuenow", pct);
  $("#aiPbHint").innerHTML = m ? `<div class="live-ai-hint"><i class="bi bi-lightbulb"></i><span class="flex-grow-1">${escapeHtml(m.text)} appears to be under discussion.${st.kind === "demo" ? ' <span class="live-ai-demo">DEMO</span>' : ""}</span><button type="button" class="live-mini-btn" data-ai-act="pb-focus" data-key="${m.id}">Focus</button></div>` : "";
  $("#aiPlaybook").innerHTML = pb.items.map((it) => {
    const cur = it.id === pb.current, editing = aiNotes.editing === "pb:" + it.id;
    return `<li class="live-ai-pb${cur ? " current" : ""}" data-id="${it.id}"><input class="form-check-input flex-shrink-0 mt-0" type="checkbox" data-ck="pb" id="aiPb-${it.id}" aria-label="${escapeHtml(it.text)}"${it.done ? " checked" : ""}>
      ${editing ? `<input class="form-control form-control-sm live-ai-input" data-edit maxlength="80" value="${escapeHtml(it.text)}" aria-label="Edit agenda item">` : `<label class="flex-grow-1 live-min-0 live-ai-item-text${it.done ? " done" : ""}" for="aiPb-${it.id}">${escapeHtml(it.text)}</label>`}
      ${cur ? '<span class="live-ai-tag" data-tag="CURRENT">CURRENT</span>' : ""}
      <span class="live-ai-tools d-flex flex-shrink-0">${!cur && !it.done ? '<button type="button" class="live-icon-btn" data-ai-act="pb-focus" aria-label="Make this the current item" title="Make current"><i class="bi bi-bullseye"></i></button>' : ""}<button type="button" class="live-icon-btn" data-ai-act="pb-edit" aria-label="Edit item" title="Edit"><i class="bi bi-pencil"></i></button><button type="button" class="live-icon-btn" data-ai-act="pb-del" aria-label="Remove item" title="Remove"><i class="bi bi-x-lg"></i></button></span></li>`;
  }).join("");
  if (aiNotes.editing.startsWith("pb:")) { const i = $("#aiPlaybook [data-edit]"); if (i) i.focus(); }
  // topics found in the transcript, and which agenda item they belong to
  $("#aiTopicList").innerHTML = st.derived.topicCounts.map(([w, c]) => {
    const item = pb.items.find((it) => aiMatches(it.text, w));
    return `<li class="d-flex align-items-center gap-2 py-1 small"><i class="bi bi-circle-fill live-ai-dot live-muted"></i><span class="flex-grow-1 live-min-0 text-truncate">${escapeHtml(aiCap(w))}</span><span class="live-desc">${c} mentions</span>${item ? (item.id === pb.current ? '<span class="live-ai-tag" data-tag="CURRENT">CURRENT</span>' : !item.done ? `<button type="button" class="live-mini-btn" data-ai-act="pb-focus" data-key="${item.id}">Focus</button>` : "") : ""}</li>`;
  }).join("");
  $("#aiTopicEmpty").classList.toggle("d-none", st.derived.topicCounts.length > 0);
}

/* ---- live coach (rule-based tips from the transcript and the room's own signals; nothing here is AI) ---- */
function aiRenderCoachHead() {
  const st = S(), off = st.data.coachOff, run = aiNotes.run;
  $("#aiCoachToggle").innerHTML = off ? '<i class="bi bi-power"></i>Turn on coach' : '<i class="bi bi-power"></i>Turn off coach';
  const status = off ? "Off" : st.aTimer ? "Analyzing" : aiDemoMode() ? (run.playing ? "Listening" : "Ready") : aiNotes.running ? "Listening" : st.lines.length ? "Ready" : "Not transcribing";
  $("#aiCoachStatus").textContent = `${aiDemoMode() ? "Demo" : "Rule-based"} · ${status}`;
}
function aiRenderCoach() {
  const st = S(), off = st.data.coachOff;
  $("#aiCoachList").innerHTML = off ? "" : st.coach.map((c) => `<div class="live-ai-coach${c.warn ? " live-ai-coach-warn" : ""}"><div class="flex-grow-1 live-min-0"><div class="d-flex align-items-center gap-2"><span class="live-ai-tag" data-tag="${c.kind}">${c.kind}</span>${st.kind === "demo" ? '<span class="live-ai-demo">DEMO</span>' : ""}<button type="button" class="live-icon-btn ms-auto" data-ai-act="coach-dismiss" data-key="${escapeHtml(c.key)}" aria-label="Dismiss"><i class="bi bi-x-lg"></i></button></div>
    <div class="live-ai-item-text mt-1">${escapeHtml(c.text)}</div>${c.hint ? `<div class="live-desc mt-1">Suggested question: “${escapeHtml(c.hint)}”</div>` : ""}
    ${c.acts && c.acts.length ? `<div class="d-flex flex-wrap gap-1 mt-2">${c.acts.map(([label, act, arg]) => `<button type="button" class="live-mini-btn" data-ai-act="${act}" data-key="${escapeHtml(c.key)}" data-arg="${escapeHtml(arg || "")}">${label}</button>`).join("")}</div>` : ""}</div></div>`).join("");
  $("#aiCoachOff").classList.toggle("d-none", !off);
  $("#aiCoachEmpty").classList.toggle("d-none", off || st.coach.length > 0);
  aiRenderCoachHead();
}
function aiCoachRemove(key, st = S()) { st.coach = st.coach.filter((c) => c.key !== key); if (st === S()) aiRenderCoach(); }
function aiCoachCandidates(st) { // every tip that is worth showing right now, most useful first
  const d = st.data, dv = st.derived, demo = st.kind === "demo", m = state.liveMeeting, now = aiNow(st), min = aiElapsed(st) / 60;
  const dur = demo ? DEMO_DURATION : m && m.duration, left = dur ? dur - min : null, pb = d.playbook.items, open = pb.filter((i) => !i.done);
  const c = [], name = (id) => (userById(id) || {}).name || "Someone";
  if (left !== null && left <= 5) c.push({ key: "wrap", kind: "WRAP-UP", text: `About ${Math.max(0, Math.round(left))} min left. Review the wrap-up before you finish.`, acts: [["Open wrap-up", "open-wrap"]] });
  if (!demo && live.sharing && live.view === "gallery") c.push({ key: "share", kind: "FOCUS", text: "You're sharing your screen. Speaker or Focus view keeps the shared content in front.", acts: [["Adjust View", "adjust-view"]] });
  Object.entries(st.handSince).forEach(([id, since]) => { if (now - since >= 30000) c.push({ key: `hand:${id}:${since}`, kind: "FOCUS", warn: true, text: `${name(id)} has had a hand raised for ${Math.round((now - since) / 1000)} seconds.`, acts: [["Participants", "open-participants"]] }); });
  if (st.streakSecs >= 180 && st.streakId) c.push({ key: `spk:${st.streakId}:${Math.floor(st.streakSecs / 180)}`, kind: "FOCUS", text: `${name(st.streakId)} has been the active speaker for ${Math.round(st.streakSecs / 60)} minutes.`, acts: [["View Speaker", "view-speaker"]] });
  dv.actions.filter((a) => !a.owner).slice(0, 1).forEach((a) => c.push({ key: "act:" + a.key, kind: "ACTION", warn: true, text: `A task was mentioned but no owner was identified: “${aiShort(a.task, 90)}”`, acts: [["Add Action", "sug-action", a.key]] }));
  const shownQ = dv.questions.filter((q) => !q.maybe && now - q.at >= 60000);
  if (shownQ.length >= 2) c.push({ key: "q:many:" + shownQ.length, kind: "QUESTION", text: `${shownQ.length} questions are still unanswered.`, acts: [["Review", "review-q"]] });
  else if (shownQ.length) c.push({ key: "q:" + shownQ[0].key, kind: "QUESTION", text: `A question was raised and no response is visible in the transcript: “${aiShort(shownQ[0].text, 90)}”`, acts: [["Review", "review-q"]] });
  const skipped = min >= 5 && pb.find((it, i) => !it.done && pb.slice(i + 1).some((x) => x.done)); // (not in the first minutes: ticking items out of order is often deliberate)
  if (skipped) c.push({ key: "ag:" + skipped.id, kind: "AGENDA", text: `“${skipped.text}” hasn't been covered yet, but later agenda items are done.`, acts: [["Open Playbook", "open-playbook"]] });
  else if (!pb.some((i) => i.done) && pb.length && min >= 8) c.push({ key: "ag:none", kind: "AGENDA", text: "No agenda item has been checked off yet.", acts: [["Open Playbook", "open-playbook"]] });
  else if (left !== null && left <= 10 && open.length) c.push({ key: "ag:time", kind: "AGENDA", text: `“${open[0].text}” has not been covered yet. ${open.length} agenda item${open.length === 1 ? " is" : "s are"} still open with about ${Math.max(0, Math.round(left))} min left.`, acts: [["Open Playbook", "open-playbook"]] });
  dv.followups.filter((f) => f.tag !== "DEADLINE").slice(0, 1).forEach((f) => c.push({ key: "fu:" + f.key, kind: "FOLLOW-UP", text: `${AI_TAG_LABEL[f.tag]} mentioned: “${aiShort(f.text, 90)}”`,
    hint: f.tag === "CONCERN" ? "What would help most to resolve that for your team?" : "What's the best next step, and who should own it?", acts: [["Add to Notes", "add-notes", `Follow up: ${aiShort(f.text, 100)}`]] }));
  return c;
}
function aiCoachEval(which = aiNotes.mode) { // at most one new tip per cooldown, never one that was shown or dismissed before in this meeting; a tip whose reason is gone disappears by itself
  const st = aiNotes[which], d = st.data, run = aiNotes.run;
  if (d.coachOff || (which === "live" ? !state.liveMeeting || !aiNotes.key : !run.started)) return;
  const c = MeetingIntelligenceService.rule.generateCoachSuggestion({ st }), keys = new Set(c.map((x) => x.key)), kept = st.coach.filter((t) => keys.has(t.key)), cool = which === "demo" ? DEMO_SPEED[run.speed].cool : 20000;
  let changed = kept.length !== st.coach.length;
  st.coach = kept;
  if (!(st.coach.length && Date.now() - st.coachAt < cool)) {
    const s = c.find((x) => !st.seen.has(x.key) && !d.dismissed.includes(x.key));
    if (s) { st.seen.add(s.key); st.coach.push(s); if (st.coach.length > 4) st.coach.shift(); st.coachAt = Date.now(); changed = true; }
  }
  if (changed && which === aiNotes.mode) aiRenderCoach();
}
function aiRenderBalance() { // speaking time per person: the live room's speaking indicators, or the demo script's own timings; hidden until there is enough of it
  const st = S(), total = Object.values(st.talk).reduce((a, b) => a + b, 0), box = $("#aiBalance");
  if (total < 60) { box.classList.add("d-none"); return; }
  const rows = Object.entries(st.talk).sort((a, b) => b[1] - a[1]), top = rows.slice(0, 3), rest = rows.slice(3).reduce((a, [, s]) => a + s, 0), pct = (s) => Math.round((s / total) * 100);
  const html = [...top.map(([id, s]) => [((userById(id) || {}).name || "Someone").split(" ")[0], pct(s)]), ...(rest ? [["Others", pct(rest)]] : [])].map(([who, p]) => `<div class="d-flex align-items-center gap-2 small"><span class="live-ai-bal-name">${escapeHtml(who)}</span><div class="progress flex-grow-1 live-ai-thin" role="progressbar" aria-label="${escapeHtml(who)} speaking share"><div class="progress-bar" style="width:${p}%"></div></div><span class="live-desc live-ai-bal-pct">${p}%</span></div>`).join("");
  box.classList.remove("d-none");
  if (box.dataset.h !== html) { box.dataset.h = html; box.querySelector("[data-rows]").innerHTML = html; }
}
function aiRenderHealth() {
  const st = S(), pb = st.data.playbook.items, pct = pb.length ? Math.round((pb.filter((i) => i.done).length / pb.length) * 100) : 0, q = st.derived.questions.length, acts = st.data.actions.filter((a) => !a.done).length;
  const speakers = new Set(st.lines.map((l) => l.speaker)).size, mins = Math.floor(aiElapsed(st) / 60);
  const tiles = [["Agenda", pct + "%"], ["Questions", q ? `${q} open` : "None open"], ["Actions", `${acts} open`], ["Speakers", String(speakers)], ["Elapsed", `${mins} min`]];
  const html = tiles.map(([k, v]) => `<div class="live-ai-stat"><div class="live-desc">${k}</div><div class="fw-semibold">${escapeHtml(v)}</div></div>`).join("");
  const box = $("#aiHealth");
  if (box.dataset.h !== html) { box.dataset.h = html; box.innerHTML = html; }
}
function aiRenderTopics() { // under the transcript: the topics found so far (click one to filter) and the open questions
  const t = S().derived.topics;
  $("#aiTrTopics").innerHTML = t.length ? t.map((w) => `<button type="button" class="live-ai-chipbtn" data-ai-act="topic-filter" data-arg="${escapeHtml(w)}">${escapeHtml(aiCap(w))}</button>`).join("") : '<span class="live-desc">None yet</span>';
}
function aiRenderDerived() { aiRenderQuestions(); aiRenderActionSuggestions(); aiRenderDecisionSuggestions(); aiRenderRadar(); aiRenderMemory(); aiRenderWrap(); aiRenderPlaybook(); aiRenderTopics(); aiRenderHealth(); aiRenderBalance(); }
function aiRenderAll() {
  const st = S(), ta = $("#aiNotesText");
  ta.value = st.data.notes; aiWords();
  aiRenderActions(); aiRenderDecisions(); st.sig = ""; aiAnalyze(aiNotes.mode); aiRenderCoach(); aiRenderSaved(); aiRenderBar(); aiSyncModeUi();
}
function aiChanged() { aiPbSync(); const st = S(); st.sig = ""; aiRenderActions(); aiRenderDecisions(); aiAnalyze(st.kind); aiTouch(); } // your lists changed: refresh what depends on them and save

/* ---- mode + demo controller (the ONE scheduler for the demo) ---- */
function aiSyncModeUi() {
  const demo = aiDemoMode(), run = aiNotes.run, total = DEMO_SCRIPT.length;
  const badge = $("#aiModeBadge");
  badge.textContent = demo ? "DEMO" : "LIVE"; badge.classList.toggle("demo", demo);
  $("#aiDemoBanner").classList.toggle("d-none", !demo);
  $("#liveAiBtn").classList.toggle("demo-on", demo);
  $("#miModeLive").checked = !demo; $("#miModeDemo").checked = demo; $("#liveDemoModeSwitch").checked = demo;
  $$("[data-demo-speed]").forEach((b) => { const on = b.getAttribute("data-demo-speed") === run.speed; b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on)); });
  const finished = run.done, playing = run.playing, started = run.started && !finished;
  $("#demoStartBtn").disabled = !demo || playing || started;
  $("#demoPauseBtn").disabled = !demo || !playing;
  $("#demoResumeBtn").disabled = !demo || playing || !started;
  $("#demoResetBtn").disabled = !demo || !(run.started || aiNotes.demo.lines.length);
  $("#demoClearBtn").disabled = !(run.started || aiNotes.demo.lines.length);
  $("#liveSampleSwitch").checked = demo && run.instant;
  $$("[data-demo-speed]").forEach((b) => { b.disabled = !demo; });
  $("#demoStatus").textContent = !demo ? "Demo mode is off. Nothing simulated is running." : finished ? `Finished · ${total} events` : playing ? `Playing · ${run.idx}/${total}` : started ? `Paused · ${run.idx}/${total}` : "Ready. Press Start.";
  // the transcript tab's own controls: live = transcription + language; demo = the same demo controller
  $("#aiTrLang").classList.toggle("d-none", demo);
  $("#aiTrSample").classList.toggle("d-none", !demo);
  $("#aiTrClear").classList.toggle("d-none", !demo);
  $("#aiTrClear").title = $("#aiTrClear").ariaLabel = "Reset demo";
  const badgeAssist = $("#aiAssistBadge");
  const provider = MeetingIntelligenceService.forMode(demo ? "demo" : "live");
  badgeAssist.textContent = demo ? "DEMO AI" : provider ? "AI" : "NOT CONFIGURED";
  badgeAssist.className = demo ? "live-ai-demo" : provider ? "live-ai-rule" : "live-ai-off";
  $("#miProvider").textContent = MeetingIntelligenceService.ai ? "AI provider: connected." : "AI provider: not configured. Rule-based features work on the transcript; AI summaries are unavailable in Live mode.";
  $$("[data-src]").forEach((el) => { el.className = demo ? "live-ai-demo" : "live-ai-rule"; el.textContent = demo ? "DEMO" : "RULE-BASED"; });
}
function aiSetMode(mode) {
  if (mode === aiNotes.mode) { aiSyncModeUi(); return; }
  const run = aiNotes.run;
  aiSave(); // (live data is stored before the panel shows the other state)
  if (mode === "live") { run.on = false; run.playing = false; clearTimeout(run.timer); demoLeave(); }
  else run.on = true;
  aiNotes.mode = mode;
  aiRebuildTranscript(); aiRenderAll();
  if (aiNotes.demoCaptions && mode === "live") setDemoCaptions(false);
  toast(mode === "demo" ? "Demo mode: everything in Notes & Coach is simulated and kept apart from your real meeting." : "Live mode: Notes & Coach uses this meeting's real data.", "success", "ai-mode");
}
function demoJoin() { // the demo's people appear in the room; the ones who are already there speak as themselves
  const run = aiNotes.run, people = livePeople();
  DEMO_CAST.forEach(([key, name, initials], i) => {
    const existing = people.find((u) => u.name === name);
    if (existing) { run.ids[key] = existing.id; return; }
    let u = DEMO_USERS.find((x) => x.name === name);
    if (!u) { u = { id: "u" + (900 + i), name, initials, email: name.toLowerCase().replace(" ", ".") + "@demo.invalid", demo: true }; DEMO_USERS.push(u); }
    run.ids[key] = u.id;
    if (!live.joined.includes(u.id)) { live.joined.push(u.id); live.peers[u.id] = { muted: false, camOff: false, hand: false }; }
  });
  renderLiveStage();
  if (live.panel === "participants") renderLivePanel();
}
function demoLeave() { // the room is exactly as it was before the demo
  const run = aiNotes.run, ids = DEMO_USERS.map((u) => u.id);
  run.unmuted.forEach((id) => { if (live.peers[id]) live.peers[id].muted = true; }); run.unmuted = [];
  run.speakerId = "";
  if (!ids.some((id) => live.joined.includes(id))) { if (state.liveMeeting) refreshLiveTiles(); return; }
  live.joined = live.joined.filter((id) => !ids.includes(id)); ids.forEach((id) => delete live.peers[id]);
  if (ids.includes(live.pinnedId)) live.pinnedId = null;
  if (ids.includes(live.speakerId)) live.speakerId = null;
  renderLiveStage();
  if (live.panel === "participants") renderLivePanel();
}
function demoDelay() { const [a, b] = DEMO_SPEED[aiNotes.run.speed].gap; return a + Math.random() * (b - a); }
function demoSchedule() { const run = aiNotes.run; clearTimeout(run.timer); if (run.playing && run.idx < DEMO_SCRIPT.length) run.timer = setTimeout(demoStep, demoDelay()); }
function demoStep(instant) { // plays the next scripted event (also used by the manual "Add sample" step, even while paused); instant === true: the caller loads the whole meeting and finishes up itself
  const run = aiNotes.run, st = aiNotes.demo;
  if (!run.on || run.idx >= DEMO_SCRIPT.length) return;
  if (!run.started) { run.started = true; demoJoin(); }
  const ev = DEMO_SCRIPT[run.idx++], uid = run.ids[ev.who], u = userById(uid);
  if (!st.baseMs) st.baseMs = Date.now();
  st.simSecs = ev.t;
  const p = live.peers[uid];
  if (p && p.muted) { p.muted = false; run.unmuted.push(uid); } // a speaker in the demo is unmuted
  run.speakerId = uid;
  aiAddLine({ id: "d" + ++aiNotes.seq, speaker: u.name, text: ev.text, at: aiNow(st), demo: true }, "demo");
  st.talk[uid] = (st.talk[uid] || 0) + ev.dur;
  if (st.streakId === uid) st.streakSecs += ev.dur; else { st.streakId = uid; st.streakSecs = ev.dur; }
  if (ev.tick) { const it = st.data.playbook.items.find((x) => x.id === ev.tick); if (it) it.done = true; } // the simulated host ticks the agenda
  if (instant === true) return;
  aiAnalyze("demo");
  if (run.idx >= DEMO_SCRIPT.length) demoFinish();
  else demoSchedule();
  aiSyncModeUi(); aiRenderBar();
}
function demoFinish(quiet) { // the wrap-up is generated from the simulated meeting (DEMO AI)
  const run = aiNotes.run, st = aiNotes.demo;
  run.done = true; run.playing = false; clearTimeout(run.timer);
  const sm = MeetingIntelligenceService.demo.summarize(aiCtx(st));
  st.summary = { source: "DEMO AI", demo: true, data: sm, text: aiSummaryText(sm) };
  aiAnalyze("demo");
  if (aiNotes.mode === "demo") { aiRenderWrap(); if (!quiet) toast("Demo finished. A DEMO wrap-up was generated: see Notes → Meeting wrap-up.", "success", "demo"); }
}
function demoLoadAll() { // "Sample data": the whole demo meeting at once (no waiting), so every part of Notes & Coach can be seen straight away; real-time capture keeps running underneath
  const run = aiNotes.run;
  if (!aiDemoMode()) aiSetMode("demo");
  demoReset(true);
  while (run.idx < DEMO_SCRIPT.length) demoStep(true);
  run.instant = true;
  aiAnalyze("demo");
  const st = aiNotes.demo;
  for (let k = 0; k < 4; k++) { st.coachAt = 0; aiCoachEval("demo"); } // (the cooldown is for a live meeting: here all the tips can be seen at once)
  demoFinish(true);
  aiSyncModeUi(); aiRenderBar();
  toast("Sample data loaded (marked DEMO). Turn it off to go back to your real meeting; live transcription keeps working.", "success", "demo");
}
function demoSampleOff() { // turns the sample data off: it is cleared and the panel is your real meeting again
  demoReset(true);
  aiSetMode("live");
  aiSyncModeUi();
  toast("Sample data off. You're back in your real meeting.", "success", "demo");
}
function demoStart() {
  if (!aiDemoMode()) aiSetMode("demo");
  const run = aiNotes.run;
  if (run.started) demoReset(true);
  run.playing = true;
  demoStep();
}
function demoPause() { const run = aiNotes.run; run.playing = false; clearTimeout(run.timer); aiSyncModeUi(); aiRenderBar(); }
function demoResume() { const run = aiNotes.run; if (!run.started || run.done) return; run.playing = true; demoSchedule(); aiSyncModeUi(); aiRenderBar(); }
function demoReset(quiet) { // clears ONLY demo data; your real notes and transcript are never touched
  const run = aiNotes.run;
  clearTimeout(run.timer);
  Object.assign(run, { playing: false, started: false, done: false, instant: false, idx: 0, speakerId: "" });
  demoLeave();
  aiNotes.demo = aiSide("demo");
  if (aiDemoMode()) { aiRebuildTranscript(); aiRenderAll(); }
  aiSyncModeUi();
  if (!quiet) toast("Demo data cleared.", "success", "demo");
}
function demoToggle() { const run = aiNotes.run; if (run.playing) demoPause(); else if (run.started && !run.done) demoResume(); else demoStart(); }

function aiNotesTick() { // the meeting clock, once a second: the LIVE state counts talk time, hands and how long the current speaker has held the floor; coach + stats every 5 s
  const n = aiNotes, st = n.live;
  if (!state.liveMeeting) return;
  n.ticks++;
  if (n.running) n.secs++;
  live.speaking.forEach((id) => { st.talk[id] = (st.talk[id] || 0) + 1; });
  if (live.speakerId && live.speakerId === st.streakId) st.streakSecs++; else { st.streakId = live.speakerId || ""; st.streakSecs = 0; }
  livePeople().forEach((u) => { if (u.id !== ME.id && !u.demo && livePeerState(u).hand) st.handSince[u.id] = st.handSince[u.id] || Date.now(); else delete st.handSince[u.id]; });
  if (live.panel === "ai-notes" && !aiDemoMode() && n.running) aiRenderBar();
  if (n.ticks % 5 === 0) { aiCoachEval("live"); if (live.panel === "ai-notes" && !aiDemoMode()) { aiRenderHealth(); aiRenderBalance(); } }
}
function aiNotesReset() { // a meeting begins or has ended: both states are empty again (what you wrote was saved per meeting first); the demo is gone from the room
  if (aiNotes.key && !aiNotes.saved) aiSave();
  ["aiCap", "aiS"].forEach((k) => { clearInterval(live.timers[k]); clearTimeout(live.timers[k]); });
  clearTimeout(aiNotes.run.timer); clearTimeout(aiNotes.live.aTimer); clearTimeout(aiNotes.demo.aTimer);
  Object.assign(aiNotes, aiFresh());
  speech.transcript.length = 0;
  $("#aiTrList").replaceChildren(); $("#aiTrSearch").value = ""; $("#aiResult").classList.add("d-none");
  $("#liveDemoCaptionsSwitch").checked = false;
  aiTab("Transcript");
  aiRebuildTranscript(); aiRenderAll();
}

function aiAct(act, btn) { // every button in the panel (delegated from one listener)
  const st = S(), d = st.data, dv = st.derived, key = btn.getAttribute("data-key") || "", arg = btn.getAttribute("data-arg") || "", row = btn.closest("[data-id]"), id = row ? row.getAttribute("data-id") : "";
  const done = () => aiCoachRemove(key, st), origin = st.kind === "demo" ? "Demo transcript" : "Transcript";
  switch (act) {
    case "ai": runAiAction(btn.getAttribute("data-kind")); break;
    case "ai-rule": runAiAction(btn.getAttribute("data-kind"), true); break;
    case "result-close": $("#aiResult").classList.add("d-none"); break;
    case "result-notes": aiNoteAppend($("#aiResult [data-result-edit]").value); toast("Added to your notes.", "success", "ai-notes"); break;
    case "result-copy": liveCopy($("#aiResult [data-result-edit]").value, btn); break;
    case "stamp": aiInsertStamp(); break;
    case "notes-download": aiDownload(aiFile("meeting-notes"), aiRecordText()); break;
    case "tr-download": aiDownload(aiFile("transcript"), aiTranscriptText()); break;
    case "wrap-copy": liveCopy(aiRecordText(), btn); break;
    case "wrap-review": runAiAction("summary"); $("#aiResult").scrollIntoView({ block: "nearest" }); break;
    case "notes-clear": liveConfirm({ title: "Clear your notes?", text: "This removes the notes you typed for this meeting from this device. Your lists stay.", ok: "Clear notes", danger: true, onOk: () => { $("#aiNotesText").value = ""; aiNotesInput(); } }); break;
    case "answer": d.answered.push(key); aiChanged(); break;
    case "keep-open": d.kept.push(key); aiChanged(); break;
    case "q-notes": aiNoteAppend(`Question: ${arg}`); toast("Added to your notes.", "success", "ai-notes"); break;
    case "sug-action": { const a = dv.actions.find((x) => x.key === (btn.getAttribute("data-arg") || key)); if (a) { aiAddAction({ text: a.task, owner: a.owner, due: a.due, key: a.key, src: a.id, origin }); toast("Added to action items.", "success", "ai-notes"); aiChanged(); } if (btn.closest(".live-ai-coach")) done(); break; }
    case "sug-decision": { const x = dv.decisions.find((v) => v.key === key); if (x) { aiAddDecision({ text: x.text, key: x.key, src: x.id, origin }); aiChanged(); } break; }
    case "sug-hide": d.hidden.push(key); aiChanged(); break;
    case "radar-add": { const f = dv.followups.find((x) => x.key === key); if (f) { aiAddAction({ text: f.text, owner: "", due: f.due, key: f.key, src: f.id, origin: "Follow-up radar" }); toast("Added to action items.", "success", "ai-notes"); aiChanged(); } break; }
    case "radar-hide": d.hidden.push(key); aiChanged(); break;
    case "del-action": d.actions = d.actions.filter((x) => x.id !== id); aiChanged(); break;
    case "edit-action": aiNotes.editing = "act:" + id; aiRenderActions(); break;
    case "del-decision": d.decisions = d.decisions.filter((x) => x.id !== id); aiChanged(); break;
    case "edit-decision": aiNotes.editing = "dec:" + id; aiRenderDecisions(); break;
    case "jump": aiJump(arg); break;
    case "topic-filter": $("#aiTrSearch").value = arg; aiSearch(); break;
    case "pb-del": d.playbook.items = d.playbook.items.filter((x) => x.id !== id); aiChanged(); break;
    case "pb-edit": aiNotes.editing = "pb:" + id; aiRenderPlaybook(); break;
    case "pb-focus": d.playbook.current = id || key; aiChanged(); break;
    case "coach-dismiss": d.dismissed.push(key); aiCoachRemove(key, st); aiTouch(); break;
    case "view-speaker": case "adjust-view": setLiveView("speaker"); done(); break;
    case "open-playbook": aiTab("Playbook"); break;
    case "open-participants": openLivePanel("participants"); break;
    case "add-notes": aiNoteAppend(arg); toast("Added to your notes.", "success", "ai-notes"); done(); break;
    case "review-q": aiTab("Notes"); aiOpenSection("#aiSecQuestions"); break;
    case "open-wrap": aiTab("Notes"); aiOpenSection("#aiSecWrap"); break;
    case "sample-load": demoLoadAll(); break;
    case "sample-off": if (aiNotes.run.instant) demoSampleOff(); else aiSetMode("live"); break;
    default: break;
  }
}
function aiCommitEdit(input, cancel) { // the small inline editor of an action item / playbook item / decision
  const [kind, id] = aiNotes.editing.split(":"), text = input.value.trim(), d = S().data;
  aiNotes.editing = "";
  const item = (kind === "pb" ? d.playbook.items : kind === "act" ? d.actions : d.decisions).find((x) => x.id === id);
  if (item && text && !cancel) item.text = text; // (an item keeps its key, so the transcript line it came from isn't offered again)
  aiChanged();
}
function initAiNotes() {
  on($("#liveAiBtn"), "click", () => toggleLivePanel("ai-notes"));
  on($("#aiTrToggle"), "click", () => { if (aiDemoMode()) demoToggle(); else setTranscribing(!(meetingLanguageState.transcribing || meetingLanguageState.captionsEnabled)); });
  on($("#aiTrLang"), "change", (e) => chooseTranscriptionLanguage(e.target.value));
  on($("#aiTrSample"), "click", () => { if (aiDemoMode()) demoStep(); });                       // "Add sample": one scripted line, also while paused
  on($("#aiTrClear"), "click", () => { if (aiDemoMode()) demoReset(); });                       // in the demo this is "Reset demo"; the real transcript has no clear button
  on($("#aiTrSearch"), "input", aiSearch);
  on($("#aiTabTranscript"), "shown.bs.tab", aiOnShow);
  on($("#aiTabCoach"), "shown.bs.tab", () => { aiRenderHealth(); aiRenderBalance(); });
  on($("#aiNotesText"), "input", aiNotesInput);
  on($("#aiActionForm"), "submit", (e) => { e.preventDefault(); const i = $("#aiActionInput"); if (i.value.trim() && aiAddAction({ text: i.value.trim(), origin: "Manual" })) aiChanged(); i.value = ""; });
  on($("#aiDecisionForm"), "submit", (e) => { e.preventDefault(); const i = $("#aiDecisionInput"); if (i.value.trim() && aiAddDecision({ text: i.value.trim(), origin: "Manual" })) aiChanged(); i.value = ""; });
  on($("#aiPbForm"), "submit", (e) => {
    e.preventDefault();
    const i = $("#aiPbInput"), t = i.value.trim(), pb = S().data.playbook;
    if (t) { pb.items.push({ id: aiId(), text: t.slice(0, 80), done: false }); if (!pb.current) pb.current = pb.items[pb.items.length - 1].id; aiChanged(); }
    i.value = "";
  });
  on($("#aiCoachToggle"), "click", () => { const d = S().data; d.coachOff = !d.coachOff; aiRenderCoach(); aiTouch(); if (!d.coachOff) aiCoachEval(S().kind); toast(d.coachOff ? "Live Coach is off." : "Live Coach is on.", "success", "ai-coach"); });
  const panel = $("#liveAiPanel");
  on(panel, "click", (e) => { const b = e.target.closest("[data-ai-act]"); if (b && panel.contains(b)) aiAct(b.getAttribute("data-ai-act"), b); });
  on(panel, "change", (e) => {
    const t = e.target, row = t.closest("[data-id]"), id = row ? row.getAttribute("data-id") : "", d = S().data;
    if (t.matches('[data-ck="action"]')) { const a = d.actions.find((x) => x.id === id); if (a) { a.done = t.checked; aiChanged(); } }
    else if (t.matches('[data-ck="pb"]')) { const p = d.playbook.items.find((x) => x.id === id); if (p) { p.done = t.checked; aiChanged(); } }
    else if (t.matches("[data-f]")) { const a = d.actions.find((x) => x.id === id); if (a) { a[t.getAttribute("data-f")] = t.value.trim(); S().sig = ""; aiAnalyze(S().kind); aiTouch(); } }
  });
  on(panel, "input", (e) => { if (e.target.matches("[data-result-edit]")) { const st = S(); if (st.summary && $("#aiResult strong").textContent.toLowerCase() === "meeting summary") { st.summary.text = e.target.value; } } });
  on(panel, "keydown", (e) => { const i = e.target.closest && e.target.closest("[data-edit]"); if (i && (e.key === "Enter" || e.key === "Escape")) { e.preventDefault(); aiCommitEdit(i, e.key === "Escape"); } });
  on(panel, "focusout", (e) => { const i = e.target.closest && e.target.closest("[data-edit]"); if (i && aiNotes.editing) aiCommitEdit(i, false); });
  // More -> AI / Meeting Intelligence, Demo / Testing
  $$('input[name="miMode"]').forEach((r) => on(r, "change", (e) => aiSetMode(e.target.value)));
  on($("#liveDemoModeSwitch"), "change", (e) => aiSetMode(e.target.checked ? "demo" : "live"));
  $$("[data-demo-speed]").forEach((b) => on(b, "click", () => { aiNotes.run.speed = b.getAttribute("data-demo-speed"); aiSyncModeUi(); }));
  on($("#liveSampleSwitch"), "change", (e) => { if (e.target.checked) demoLoadAll(); else demoSampleOff(); });
  on($("#demoClearBtn"), "click", () => demoReset());
  on($("#demoStartBtn"), "click", demoStart); on($("#demoPauseBtn"), "click", demoPause); on($("#demoResumeBtn"), "click", demoResume); on($("#demoResetBtn"), "click", () => demoReset());
  on($("#liveDemoCaptionsSwitch"), "change", (e) => setDemoCaptions(e.target.checked));
  window.addEventListener("pagehide", () => { if (aiNotes.key && !aiNotes.saved) aiSave(); }); // a refresh right after typing still keeps the notes
}
Object.assign(aiNotes, aiFresh());

/* ---- security + permissions ---- */
function syncLiveSecurityUI() {
  $("#liveLockSwitch").checked = live.locked;
  $("#liveLockFlag").classList.toggle("d-none", !live.locked);
  $("#liveOnlyShareSwitch").checked = live.onlyHostShare;
  $("#liveShareLockFlag").classList.toggle("d-none", !live.onlyHostShare);
  $("#liveOnlyShareStatus").classList.toggle("d-none", !live.onlyHostShare);
  $("#livePermUnmute").checked = live.perms.unmute;
  $("#livePermChat").checked = live.perms.chat;
  $("#livePermReact").checked = live.perms.react;
  applyRbacDom($("#liveModalOverlay"), state.liveMeeting); // hides / locks the controls this role may not use in this meeting
  updateShareAvailability();
  applyLivePerms();
}
// The role (or what it may do in this meeting) changed while the room is on screen: the controls, tile menus and panel follow it
function applyRbacToLiveRoom() {
  syncLiveSecurityUI();
  renderLiveStage();
  if (live.panel) renderLivePanel();
}
function saveLiveSecurity() {
  const m = state.liveMeeting;
  if (!m) return;
  m.locked = live.locked;
  m.security = Object.assign({}, m.security, { permScreen: !live.onlyHostShare, permMic: live.perms.unmute, permChat: live.perms.chat });
  saveState();
}
function applyLivePerms() {
  const blocked = !liveCanModerate() && !live.perms.chat;
  const input = $("#liveChatInput");
  input.disabled = blocked;
  $("#liveChatSendBtn").disabled = blocked;
  $("#liveAttachBtn").disabled = blocked;
  const note = $("#liveComposerNote");
  const msg = blocked ? "The host turned chat off for participants." : liveCanModerate() && !live.perms.chat ? "Chat is off for participants. You can still send messages." : "";
  note.textContent = msg;
  note.classList.toggle("d-none", !msg);
}
function setLiveLocked(on) {
  if (!authorize("meeting.lock", state.liveMeeting)) return;
  live.locked = on;
  clearTimeout(live.timers.lock);
  syncLiveSecurityUI();
  saveLiveSecurity();
  toast(on ? "Meeting locked. New participants can't join." : "Meeting unlocked.");
  if (on) {
    live.timers.lock = setTimeout(() => {
      const u = userById("u4");
      if (!u || livePeople().includes(u)) return;
      live.blocked = [u.id];
      toast(`${u.name} tried to join, but the meeting is locked.`, "error");
    }, 3500);
  } else if (live.blocked.length) {
    live.blocked.forEach((id) => { const u = userById(id); if (u) { live.joined.push(id); seedLivePeer(u, livePeople().length - 1); toast(`${u.name} joined the meeting.`); } });
    live.blocked = [];
    renderLiveStage();
    if (live.panel) renderLivePanel();
  }
}

/* ---- in-room dialogs ---- */
function closeLiveMenus() {
  $$("#liveModalOverlay .dropdown-menu.show").forEach((m) => { const t = m.previousElementSibling; if (t) liveMenu(t).hide(); });
}
function openLiveDialog(id) {
  closeLiveMenus();
  closeLiveDialog();
  live.dialog = id;
  live.dialogReturn = document.activeElement;
  const scrim = $("#liveScrim");
  scrim.classList.toggle("show", true);
  $("#" + id).classList.add("show");
  scrim.style.opacity = id === "dlgEffects" ? ".35" : "";
  $("#" + id).focus({ preventScroll: true });
}
function closeLiveDialog() {
  if (!live.dialog) return;
  $("#" + live.dialog).classList.remove("show");
  $("#liveScrim").classList.remove("show");
  $("#liveScrim").style.opacity = "";
  live.dialog = null;
  if (live.dialogReturn && live.dialogReturn.focus) live.dialogReturn.focus({ preventScroll: true });
}
function liveConfirm({ title, text, ok, danger, onOk }) {
  $("#dlgConfirmTitle").textContent = title;
  $("#dlgConfirmText").textContent = text;
  const btn = $("#dlgConfirmOk");
  btn.textContent = ok;
  btn.className = "live-btn " + (danger ? "live-btn-danger" : "live-btn-primary");
  live.confirmOk = onOk;
  openLiveDialog("dlgConfirm");
}
function fillLiveInfo() {
  const m = state.liveMeeting;
  if (!m) return;
  const host = userById(live.hostId);
  $("#infoName").textContent = m.title;
  $("#infoId").textContent = m.meetingCode;
  $("#infoLink").textContent = m.link;
  $("#infoHost").textContent = host ? host.name : "—";
  $("#infoStarted").textContent = liveClock(state.liveStartTs);
  $("#infoDuration").textContent = formatMMSS(Math.floor((Date.now() - state.liveStartTs) / 1000));
}
function flashDone(btn, label = "Copied!") {
  const span = btn.querySelector("span") || btn;
  if (!btn.dataset.label) btn.dataset.label = span.textContent;
  span.textContent = label;
  btn.classList.add("done");
  clearTimeout(btn._doneTimer);
  btn._doneTimer = setTimeout(() => { span.textContent = btn.dataset.label; btn.classList.remove("done"); }, 1600);
}
function liveCopy(text, btn) {
  const done = () => { if (btn) flashDone(btn); else toast("Copied."); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
}

/* ---- whiteboard ---- */
const wbCanvas = () => $("#liveWbCanvas");
// the pens are chosen for the dark board; on the light board the same pens are drawn in darker shades (the stored strokes keep their colour, so switching themes redraws them correctly)
const WB_INK_LIGHT = { "#ffffff": "#0f172a", "#60a5fa": "#2563eb", "#4ade80": "#16a34a", "#fbbf24": "#d97706", "#f87171": "#dc2626" };
const wbInk = (c) => (isDarkTheme() ? c : WB_INK_LIGHT[c] || c);
function wbSegment(s, a, b) {
  const c = wbCanvas(), ctx = c.getContext("2d"), dpr = c.width / c.getBoundingClientRect().width || 1;
  ctx.save();
  ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = wbInk(s.color);
  ctx.lineWidth = (s.tool === "eraser" ? 22 : 3) * dpr;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(a[0] * c.width, a[1] * c.height);
  ctx.lineTo(b[0] * c.width, b[1] * c.height);
  ctx.stroke();
  ctx.restore();
}
function wbRedraw() {
  const c = wbCanvas();
  c.getContext("2d").clearRect(0, 0, c.width, c.height);
  live.wb.strokes.forEach((s) => { if (s.pts.length === 1) wbSegment(s, s.pts[0], s.pts[0]); for (let i = 1; i < s.pts.length; i++) wbSegment(s, s.pts[i - 1], s.pts[i]); });
}
function wbResize() {
  const c = wbCanvas(), r = c.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(r.width * dpr);
  c.height = Math.round(r.height * dpr);
  wbRedraw();
}
function setWhiteboard(open) {
  live.wb.open = open;
  $("#liveWhiteboard").hidden = !open;
  $("#liveWbTitle").textContent = open ? "Stop whiteboard" : "Start whiteboard";
  if (open) requestAnimationFrame(wbResize);
}
function initWhiteboard() {
  const c = wbCanvas();
  const point = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  on(c, "pointerdown", (e) => {
    c.setPointerCapture(e.pointerId);
    const p = point(e);
    live.wb.drawing = { tool: live.wb.tool, color: live.wb.color, pts: [p] };
    live.wb.strokes.push(live.wb.drawing);
    wbSegment(live.wb.drawing, p, p);
  });
  on(c, "pointermove", (e) => {
    const s = live.wb.drawing;
    if (!s) return;
    const p = point(e), last = s.pts[s.pts.length - 1];
    s.pts.push(p);
    wbSegment(s, last, p);
  });
  ["pointerup", "pointercancel"].forEach((ev) => on(c, ev, () => { live.wb.drawing = null; }));
  if (window.ResizeObserver) { live.wb.observer = new ResizeObserver(() => requestAnimationFrame(wbResize)); live.wb.observer.observe(c); }
  $$("[data-wb-tool]").forEach((b) => on(b, "click", () => {
    live.wb.tool = b.getAttribute("data-wb-tool");
    $$("[data-wb-tool]").forEach((x) => { const a = x === b; x.classList.toggle("active", a); x.setAttribute("aria-pressed", String(a)); });
  }));
  $$("[data-wb-color]").forEach((b) => on(b, "click", () => {
    live.wb.color = b.getAttribute("data-wb-color");
    live.wb.tool = "pen";
    $$("[data-wb-color]").forEach((x) => x.classList.toggle("active", x === b));
    $$("[data-wb-tool]").forEach((x) => { const a = x.getAttribute("data-wb-tool") === "pen"; x.classList.toggle("active", a); x.setAttribute("aria-pressed", String(a)); });
  }));
  on($("#wbUndoBtn"), "click", () => { live.wb.strokes.pop(); wbRedraw(); });
  on($("#wbClearBtn"), "click", () => { live.wb.strokes = []; wbRedraw(); });
  on($("#wbCloseBtn"), "click", () => setWhiteboard(false));
}

/* ---- side panel: Chat / Participants / Q&A / More options (inline column on desktop, Bootstrap offcanvas below md; live.panel says which one is showing) ---- */
const livePanelOpen = () => (liveMobile() ? $("#livePanel").classList.contains("show") : $("#liveRoom").classList.contains("panel-open"));
function updatePanelButtons() {
  const open = livePanelOpen();
  setLiveToggle("#liveChatBtn", open && live.panel === "chat");
  setLiveToggle("#liveParticipantsBtn", open && live.panel === "participants");
  setLiveToggle("#liveMoreBtn", open && live.panel === "more");
  setLiveToggle("#liveAiBtn", open && live.panel === "ai-notes");
  $$("[data-live-tab]").forEach((t) => {
    const active = t.getAttribute("data-live-tab") === live.panel;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", String(active));
  });
}
function openLivePanel(tab) {
  const wasShowing = livePanelOpen() && live.panel === tab;
  live.panel = tab;
  renderLivePanel();
  if (liveMobile()) bootstrap.Offcanvas.getOrCreateInstance($("#livePanel")).show();
  else $("#liveRoom").classList.add("panel-open");
  updatePanelButtons();
  if (tab === "ai-notes" && !wasShowing) aiOnShow();
}
function closeLivePanel() {
  if (liveMobile()) bootstrap.Offcanvas.getOrCreateInstance($("#livePanel")).hide();
  else $("#liveRoom").classList.remove("panel-open");
  updatePanelButtons();
}
function toggleLivePanel(tab) {
  if (livePanelOpen() && live.panel === tab) closeLivePanel(); else openLivePanel(tab);
}

function liveMessageHtml(c) {
  const isMe = c.user.id === ME.id;
  const priv = c.to ? `<span class="live-private"><i class="bi bi-lock-fill"></i> Private to ${escapeHtml((userById(c.to) || {}).name || "")}</span>` : "";
  const file = c.file ? `<div class="live-file">
      <i class="bi ${/\.pdf$/i.test(c.file.name) ? "bi-file-earmark-pdf-fill" : "bi-file-earmark-fill"}"></i>
      <div class="flex-grow-1 live-min-0"><div class="text-truncate fw-medium small">${escapeHtml(c.file.name)}</div><small>${escapeHtml(c.file.size)}</small></div>
      <a class="live-icon-btn" ${c.file.url ? `href="${c.file.url}" download="${escapeHtml(c.file.name)}"` : 'href="#" data-live-fake-download'} aria-label="Download ${escapeHtml(c.file.name)}"><i class="bi bi-download"></i></a>
    </div>` : "";
  const bubble = c.text ? `<div class="live-bubble">${escapeHtml(c.text)}</div>` : "";
  if (isMe) return `<div class="live-msg own"><div class="live-msg-meta">${escapeHtml(c.user.name)} <time>${c.time}</time>${priv}</div>${bubble}${file}</div>`;
  return `<div class="live-msg" style="--hue:${liveHue(c.user.id)}"><span class="live-msg-avatar">${c.user.initials}</span>
    <div class="live-min-0"><div class="live-msg-meta"><strong class="fw-medium">${escapeHtml(c.user.name)}</strong><time>${c.time}</time>${priv}</div>${bubble}${file}</div></div>`;
}
function liveParticipantsHtml(filter) {
  const q = (filter || "").trim().toLowerCase();
  const rows = livePeople().filter((u) => !q || u.name.toLowerCase().includes(q));
  if (!rows.length) return '<p class="live-empty">No participants match your search.</p>';
  return rows.map((u) => {
    const st = livePeerState(u), isMe = u.id === ME.id;
    // clicking your own icon mirrors the toolbar mic/cam buttons exactly (no permission needed); clicking someone else's mutes/stops them directly if you
    // may moderate them, or - if they're already off - "asks" them (simulated reply after 1.5s), same as the ⋮ menu's equivalent items ever did.
    const micTip = st.muted ? (isMe ? "Unmute microphone" : "Ask to unmute") : "Mute microphone";
    const camTip = st.camOff ? (isMe ? "Turn on camera" : "Ask to start video") : "Turn off camera";
    return `<div class="live-person" style="--hue:${liveHue(u.id)}">
      <span class="live-msg-avatar">${u.initials}</span>
      <span class="flex-grow-1 live-min-0"><span class="d-block text-truncate">${escapeHtml(u.name)}${isMe ? " (You)" : ""}${u.demo ? ' <span class="live-ai-demo">DEMO</span>' : ""}</span>
        ${u.id === live.hostId ? '<span class="badge bg-primary-subtle text-primary-emphasis">Host</span>' : ""}</span>
      <span class="live-person-state">
        ${st.hand ? '<i class="bi bi-hand-index-thumb-fill live-hand-flag" title="Hand raised"></i>' : ""}
        <button type="button" class="live-icon-btn live-toggle-btn" data-live-action="${st.muted ? "ask-unmute" : "mute"}" data-user="${u.id}" title="${micTip}" aria-label="${escapeHtml(u.name)}: ${micTip}"><i class="bi ${st.muted ? "bi-mic-mute-fill" : "bi-mic-fill"}"></i></button>
        <button type="button" class="live-icon-btn live-toggle-btn" data-live-action="${st.camOff ? "ask-video" : "stop-video"}" data-user="${u.id}" title="${camTip}" aria-label="${escapeHtml(u.name)}: ${camTip}"><i class="bi ${st.camOff ? "bi-camera-video-off-fill" : "bi-camera-video-fill"}"></i></button>
        <span class="position-relative"><button class="live-icon-btn" type="button" data-bs-toggle="dropdown" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false" aria-label="Actions for ${escapeHtml(u.name)}"><i class="bi bi-three-dots-vertical"></i></button>
          <ul class="dropdown-menu dropdown-menu-end">${liveMenuItems(u)}</ul></span>
      </span></div>`;
  }).join("");
}
function liveQaHtml() {
  const mine = (q) => q.user.id === ME.id;
  const counts = { all: live.qa.length, answered: live.qa.filter((q) => q.answered).length, mine: live.qa.filter(mine).length };
  const list = live.qa.filter((q) => live.qaFilter === "all" || (live.qaFilter === "answered" ? q.answered : mine(q)));
  const seg = `<div class="live-seg mb-3" role="group" aria-label="Filter questions">${[["all", "All"], ["answered", "Answered"], ["mine", "My questions"]].map(([k, l]) => `<button type="button" data-qa-filter="${k}" class="${live.qaFilter === k ? "active" : ""}" aria-pressed="${live.qaFilter === k}">${l} (${counts[k]})</button>`).join("")}</div>`;
  if (!list.length) return seg + '<p class="live-empty">No questions here yet.<br>Ask one below and the host will see it.</p>';
  return seg + list.map((q) => `<div class="live-q">
      <div class="live-msg-meta mb-0"><strong class="fw-medium">${escapeHtml(q.user.name)}${mine(q) ? " (You)" : ""}</strong><time>${q.time}</time></div>
      <p class="live-q-text">${escapeHtml(q.text)}</p>
      <div class="d-flex align-items-center gap-2">
        <button class="live-vote ${q.voted ? "on" : ""}" type="button" data-live-action="vote" data-q="${q.id}" aria-pressed="${q.voted}" aria-label="Upvote"><i class="bi ${q.voted ? "bi-hand-thumbs-up-fill" : "bi-hand-thumbs-up"}"></i>${q.votes}</button>
        ${q.answered ? '<span class="live-tag-done ms-auto"><i class="bi bi-check-circle-fill"></i>Answered</span>' : liveCanModerate() ? `<button class="live-mini-btn live-mini-primary ms-auto" type="button" data-live-action="answer" data-q="${q.id}">Answer</button>` : ""}
      </div>
      ${q.answered && q.answer ? `<div class="live-answer"><small><i class="bi bi-patch-check-fill text-success me-1"></i>Host answer</small>${escapeHtml(q.answer)}</div>` : ""}
      ${live.qaAnswering === q.id ? `<div class="d-flex gap-2 mt-2"><input class="live-answer-input" id="liveAnswerInput" data-q="${q.id}" placeholder="Type your answer…" autocomplete="off" /><button class="live-mini-btn live-mini-primary" type="button" data-live-action="answer-save" data-q="${q.id}">Send</button></div>` : ""}
    </div>`).join("");
}
function renderLiveToMenu() {
  const others = livePeople().filter((u) => u.id !== ME.id);
  $("#liveToMenu").innerHTML = [{ id: "all", name: "Everyone" }, ...others].map((u) => `<li><button class="dropdown-item d-flex align-items-center gap-2 ${live.chatTo === u.id ? "active" : ""}" type="button" data-to="${u.id}"><i class="bi bi-check2 live-check"></i><span>${escapeHtml(u.name)}</span></button></li>`).join("");
  const target = live.chatTo === "all" ? null : userById(live.chatTo);
  $("#liveToLabel").textContent = target ? target.name : "Everyone";
}
function renderLivePanel() {
  const tab = live.panel || "chat";
  const body = $("#liveSidePanelBody");
  const more = tab === "more", ai = tab === "ai-notes", own = more || ai, participants = tab === "participants";
  // Chat / Participants / Q&A, More options and AI Notes share one panel: only one of them is ever visible
  $("#livePanel nav").classList.toggle("d-none", own);
  $("#liveMoreTitle").classList.toggle("d-none", !more);
  $("#liveAiTitle").classList.toggle("d-none", !ai);
  body.classList.toggle("d-none", own);
  [["#liveMoreMenu", more], ["#liveAiPanel", ai]].forEach(([sel, shown]) => { const el = $(sel); el.classList.toggle("d-none", !shown); el.classList.toggle("d-flex", shown); });
  $("#liveMoreMenu").classList.toggle("show", more);
  if (own) { $("#liveSideSearchWrap").classList.add("d-none"); $("#liveInviteBar").hidden = true; $("#liveComposer").classList.add("d-none"); updateLiveCounts(); return; }
  $("#liveSideSearchWrap").classList.toggle("d-none", !participants);
  $("#liveInviteBar").hidden = !participants;
  $("#liveComposer").classList.toggle("d-none", participants);
  $("#liveToRow").classList.toggle("d-none", tab !== "chat");
  $("#liveAttachBtn").classList.toggle("d-none", tab !== "chat");
  $("#liveChatInput").placeholder = tab === "qa" ? "Ask a question…" : live.chatTo === "all" ? "Type a message…" : "Type a private message…";
  renderLiveToMenu();
  const scroll = body.scrollTop, atEnd = body.scrollTop + body.clientHeight >= body.scrollHeight - 4;
  if (participants) body.innerHTML = liveParticipantsHtml($("#liveParticipantSearch").value);
  else if (tab === "qa") body.innerHTML = liveQaHtml();
  else body.innerHTML = live.chat.map(liveMessageHtml).join("");
  body.scrollTop = tab === "chat" && (atEnd || !scroll) ? body.scrollHeight : scroll;
  updateLiveCounts();
  applyLivePerms();
}
function sendLiveMessage() {
  const input = $("#liveChatInput");
  const text = input.value.trim();
  if (!text) return;
  if (!liveCanModerate() && !live.perms.chat && live.panel !== "qa") { toast("The host turned chat off."); return; }
  if (live.panel === "qa") live.qa.push({ id: "q" + Date.now(), user: ME, text, time: liveTime(), votes: 0, voted: false, answered: false });
  else live.chat.push({ user: ME, text, time: liveTime(), to: live.chatTo === "all" ? null : live.chatTo });
  input.value = "";
  renderLivePanel();
}
function seedLiveChat() {
  const u = (id) => userById(id) || ME;
  live.chat = [
    { user: u("u2"), text: "Good morning everyone! 👋", time: liveTime(6) },
    { user: u("u5"), text: "Hi all, let's start the meeting.", time: liveTime(5) },
    { user: u("u6"), text: "Here is the presentation file.", time: liveTime(4), file: { name: "Project_Overview.pdf", size: "2.4 MB" } },
    { user: ME, text: "Thanks! I'll take a look.", time: liveTime(3) },
    { user: u("u3"), text: "Great, let's discuss the next steps.", time: liveTime(1) },
  ];
  live.qa = [
    { id: "q1", user: u("u2"), text: "Can we get the presentation after the meeting?", time: liveTime(4), votes: 4, voted: false, answered: false },
    { id: "q2", user: u("u6"), text: "Will the recording be available?", time: liveTime(3), votes: 4, voted: false, answered: true, answer: "Yes, the recording will be shared with everyone after the meeting." },
    { id: "q3", user: ME, text: "How do we submit feedback?", time: liveTime(2), votes: 1, voted: true, answered: false },
  ];
}

/* ---- actions ---- */
const LIVE_ACTION_PERM = {
  mute: "participants.mute", "ask-unmute": "participants.mute", "stop-video": "participants.stopVideo", "ask-video": "participants.stopVideo",
  remove: "participants.remove", "make-host": "participants.manage", message: "participants.message", "view-details": "participants.view", pin: "participants.pin", unpin: "participants.pin",
  "rec-toggle": "record.control", invite: "meeting.invite", "invite-members": "meeting.invite", "invite-others": "meeting.invite", "copy-link": "meeting.invite", "share-link": "meeting.invite",
  answer: "meeting.moderate", "answer-save": "meeting.moderate", whiteboard: "whiteboard", effects: "effects", "hide-tile": "tile.hide", "show-tile": "tile.hide", hand: "hand",
  "meeting-settings": "room.settings", "participants-manage": "room.participantManagement",
};
const LIVE_SELF_TOGGLE = ["mute", "ask-unmute", "stop-video", "ask-video"]; // your own mic/camera: always allowed, no participants.* permission needed (same as the toolbar buttons)
function runLiveAction(action, btn) {
  const meeting = state.liveMeeting;
  const uid = btn && btn.getAttribute("data-user");
  const peer = uid && userById(uid);
  const perm = uid === ME.id && LIVE_SELF_TOGGLE.includes(action) ? null // toggling your own row's mic/camera icon
    : action === "lower-hand" && uid !== ME.id ? "participants.manage" // lowering someone else's hand is moderation
    : LIVE_ACTION_PERM[action];
  if (perm && !authorize(perm, meeting)) return;
  const hideMore = () => { if (live.panel === "more") closeLivePanel(); };
  const patchPeer = (patch, msg) => { Object.assign(live.peers[uid], patch); if (msg) toast(msg); refreshLiveTiles(); if (live.panel === "participants") renderLivePanel(); };
  switch (action) {
    case "details": if (meeting) openDetailsDrawer(meeting, "overview"); break;
    case "info": hideMore(); fillLiveInfo(); openLiveDialog("dlgInfo"); break;
    case "copy-id": if (meeting) liveCopy(meeting.meetingCode); break;
    case "copy-link": if (meeting) liveCopy(meeting.link, btn); break;
    case "share-link": if (meeting) copyMeetingLink(meeting); break;
    case "invite-members": case "invite-others": case "invite": {
      if (!meeting) break;
      hideMore();
      openInviteModal(meeting);
      setTimeout(() => { const el = $(action === "invite-others" ? "#inviteGuestEmailInput" : "#inviteParticipantSearch"); if (el) el.focus(); }, 260);
      break;
    }
    case "effects": hideMore(); openLiveDialog("dlgEffects"); break;
    case "audio-settings": // the microphone list from the toolbar; on a phone (no toolbar caret) the effects dialog, which holds noise suppression
      if (liveMobile()) { hideMore(); openLiveDialog("dlgEffects"); } else setTimeout(() => liveMenu($("#liveMicCaret")).show(), 0); // after this click, or Bootstrap closes the menu again
      break;
    case "whiteboard": hideMore(); setWhiteboard(!live.wb.open); break;
    case "hand": setLiveHand(!live.hand); break;
    case "rec-toggle": hideMore(); runRecAction(live.recState === "idle" ? "start" : "stop"); break;
    case "hide-tile": live.hideSelf = !live.hideSelf; syncHideTileUI(); renderLiveStage(); break;
    case "show-tile": live.hideSelf = false; syncHideTileUI(); renderLiveStage(); break;
    case "pin": pinLiveUser(uid || liveMainId()); break;
    case "unpin": live.pinnedId = null; renderLiveStage(); break;
    case "mute": if (uid === ME.id) { $("#liveMicBtn").click(); break; } patchPeer({ muted: true }, `Muted ${peer.name}.`); break;
    case "stop-video": if (uid === ME.id) { $("#liveCamBtn").click(); break; } patchPeer({ camOff: true }, `Stopped ${peer.name}'s video.`); break;
    case "lower-hand": if (uid === ME.id) setLiveHand(false); else { setPeerHand(uid, false); toast(`Lowered ${peer.name}'s hand.`, "success", "hand"); } break;
    case "ask-unmute": if (uid === ME.id) { $("#liveMicBtn").click(); break; } toast(`Asked ${peer.name} to unmute.`); setTimeout(() => { if (live.peers[uid]) patchPeer({ muted: false }, `${peer.name} unmuted.`); }, 1500); break;
    case "ask-video": if (uid === ME.id) { $("#liveCamBtn").click(); break; } toast(`Asked ${peer.name} to start their video.`); setTimeout(() => { if (live.peers[uid]) patchPeer({ camOff: false }, `${peer.name} started their video.`); }, 1500); break;
    case "message": live.chatTo = uid; openLivePanel("chat"); setTimeout(() => $("#liveChatInput").focus(), 260); break;
    case "view-details": showParticipantDetails(peer); break;
    case "meeting-settings": hideMore(); if (meeting) openDetailsDrawer(meeting, "settings"); break;
    case "participants-manage": hideMore(); openLivePanel("participants"); break;
    case "make-host": liveConfirm({ title: `Make ${peer.name} the host?`, text: "They will be shown as the host. Your own controls depend on your role and stay as they are.", ok: "Make host", onOk: () => { live.hostId = uid; syncLiveSecurityUI(); refreshLivePanelAndTiles(); toast(`${peer.name} is now the host.`); } }); break;
    case "remove":
      state.pending = { type: "remove-participant", userId: uid };
      $("#removeParticipantText").textContent = `Remove ${peer ? peer.name : "this participant"} from the meeting?`;
      openModal("removeParticipantConfirmOverlay");
      break;
    case "vote": { const q = live.qa.find((x) => x.id === btn.getAttribute("data-q")); if (q) { q.voted = !q.voted; q.votes += q.voted ? 1 : -1; renderLivePanel(); } break; }
    case "answer": live.qaAnswering = btn.getAttribute("data-q"); renderLivePanel(); setTimeout(() => { const i = $("#liveAnswerInput"); if (i) i.focus(); }, 30); break;
    case "answer-save": {
      const q = live.qa.find((x) => x.id === btn.getAttribute("data-q"));
      if (q) { q.answered = true; q.answer = ($("#liveAnswerInput").value || "").trim() || "Answered live in the meeting."; live.qaAnswering = null; renderLivePanel(); toast("Question answered."); }
      break;
    }
    case "fullscreen": case "tile-fullscreen": {
      const el = action === "fullscreen" ? $("#liveRoom") : $("#liveStage .live-tile.main") || $("#liveRoom");
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast("Full screen isn't supported here."));
      break;
    }
    default: break;
  }
}
function refreshLivePanelAndTiles() { renderLiveStage(); if (live.panel) renderLivePanel(); }
function syncHideTileUI() {
  $("#liveHideTitle").textContent = live.hideSelf ? "Show my tile" : "Hide my tile";
  $("#liveHideTileBtn").textContent = live.hideSelf ? "Show" : "Hide";
  $("#liveHideTileBtn").setAttribute("aria-pressed", String(live.hideSelf));
}
function setLiveQuality(q, silent) {
  live.quality = q;
  $$("[data-quality]").forEach((b) => { const sel = b.getAttribute("data-quality") === q; b.classList.toggle("active", sel); b.setAttribute("aria-pressed", String(sel)); });
  const track = live.stream && live.stream.getVideoTracks()[0];
  if (track) track.applyConstraints(LIVE_QUALITY_H[q] ? { height: { ideal: LIVE_QUALITY_H[q] } } : {}).catch(() => {});
  if (!silent) toast(`Video quality: ${q[0].toUpperCase() + q.slice(1)}`);
}
function setLiveBackground(kind) { videoFx.set({ background: kind }); }

function resetLiveRoom() {
  stopLivePresenceSync();
  seenTranscriptIds = new Set();
  Object.values(live.timers).forEach((t) => { clearInterval(t); clearTimeout(t); });
  live.camToken++;
  liveStopStream();
  setPipMediaSession(false);
  live.speaking = new Set(); live.speakerId = null;
  if (live.sharing) stopScreenShare(true);
  closeLiveDialog();
  setWhiteboard(false);
  live.wb.strokes = [];
  Object.assign(live, { view: "speaker", pinnedId: null, speakerId: null, panel: null, hand: false, hideSelf: false, recSecs: 0, speaking: new Set(), autoPip: false, pipHint: false, pipOpening: false, pipClosing: false,
    quality: "auto", camId: "", spkId: "", devices: { mic: "", cam: "", spk: "" }, locked: false, onlyHostShare: false, perms: { unmute: true, chat: true, react: true }, blocked: [], joined: [], bg: "none",
    fx: { touchUp: false, light: true, mirror: true, noise: true }, streamFailed: false, qaFilter: "all", qaAnswering: null, chatTo: "all" });
  $("#liveRoom").classList.remove("panel-open", "sharing");
  const panel = bootstrap.Offcanvas.getInstance($("#livePanel"));
  if (panel) panel.hide();
  closeLiveMenus();
  setRecState("idle");
  setLiveToggle("#liveScreenBtn", false, "#liveScreenLabel", "Stop Sharing", "Share Screen");
  setLiveToggle("#liveRaiseHandBtn", false, "#liveHandLabel", "Lower hand", "Raise hand");
  setLiveToggle("#liveChatBtn", false);
  setLiveToggle("#liveParticipantsBtn", false);
  aiNotesReset();  // empty AI Notes panel, demo timers / switches off
  speechDestroy(); // stops recognition, clears the caption overlay; the language / caption settings themselves are kept for the next meeting
  updatePanelButtons();
  $("#liveShareAudio").checked = false;
  $("#liveShareAudioHint").textContent = "Included when the source supports it";
  fxAudio.stop();
  videoFx.reset(false);
  setLiveQuality("auto", true);
  syncHideTileUI();
  $$("[data-live-layout]").forEach((b) => b.classList.toggle("active", b.getAttribute("data-live-layout") === "speaker"));
  $("#liveParticipantSearch").value = "";
  $("#liveChatInput").value = "";
}

function startLiveMeeting(meeting, adhoc, deviceState) {
  if (!authorize("meeting.join", meeting)) return;
  if (meeting.locked && !can("meeting.moderate", meeting)) { toast("This meeting is locked. New participants can't join.", "error"); return; }
  if (!adhoc) {
    const found = findMeeting(meeting.id);
    if (found && found.listKey !== "ongoing") {
      removeMeetingFrom(found.listKey, meeting.id);
      meeting.status = "Live";
      meeting.liveStartedAt = Date.now();
      state.meetings.ongoing.push(meeting);
    } else if (!found) {
      meeting.status = "Live";
      meeting.liveStartedAt = Date.now();
      state.meetings.ongoing.push(meeting);
    }
  }
  state.liveMeeting = meeting;
  state.liveStartTs = meeting.liveStartedAt || Date.now();
  saveState();
  renderAllViews();

  resetLiveRoom();
  const ds = deviceState || {};
  const sec = meeting.security || {};
  live.realMode = !meeting.isDemo; // a meeting a real demo user actually created/joined runs on real presence; the seeded demo meetings keep the simulated roster
  live.hostId = userById(meeting.hostId) ? meeting.hostId : ME.id;
  live.pinnedId = null; // nobody is pinned at the start: speaker view follows whoever speaks until someone is pinned by hand
  live.locked = !!meeting.locked;
  live.onlyHostShare = sec.permScreen === false;
  live.perms = { unmute: sec.permMic !== false, chat: sec.permChat !== false, react: true };
  videoFx.reset(!!ds.useStored); // a meeting opened from the pre-join tab keeps the fine adjustments and the custom picture chosen there
  videoFx.set({ autoLighting: ds.light !== false, mirror: ds.mirror !== false, noiseSuppression: ds.noise !== false, background: ds.bg || "none",
    appearance: ds.touchUp ? (videoFx.st.appearance !== "off" ? videoFx.st.appearance : "low") : "off" });
  // devices picked in the pre-join popup (ids are real device ids when the browser listed them, otherwise just the label that was shown)
  live.camId = ds.camId || "";
  live.spkId = ds.spkId || "";
  live.devices = { mic: ds.micId || ds.micName || "", cam: ds.camId || ds.camName || "", spk: ds.spkId || ds.spkName || "" };
  $("#liveMeetingTitle").textContent = meeting.title;
  setLiveMic(ds.mic !== false);
  setLiveCam(ds.cam !== false);
  renderLanguageUi(); speechSync(); // captions / transcription come back the way the user last left them
  aiNotesStart(); // your notes, lists and playbook for THIS meeting code come back
  seenTranscriptIds = new Set();
  applyLiveTranscript(); // real mode: catch up on transcript segments other tabs already published before this tab joined
  live.peers = {};
  live.joined = [];
  if (!live.realMode) livePeople().forEach((u, i) => { if (u.id !== ME.id) seedLivePeer(u, i); }); // real mode: peers start with no state until their own tab reports one
  seedLiveChat();
  syncLiveSecurityUI();
  renderLiveDeviceMenu("mic");
  renderLiveDeviceMenu("cam");
  renderLiveStage();
  syncLiveDataModeUi();
  startLivePresenceSync();

  const tick = () => {
    const secs = Math.floor((Date.now() - state.liveStartTs) / 1000);
    $("#liveMeetingTimer").textContent = formatMMSS(secs);
    if (live.dialog === "dlgInfo") $("#infoDuration").textContent = formatMMSS(secs);
  };
  tick();
  live.timers.clock = setInterval(() => { tick(); aiNotesTick(); }, 1000);
  speakerSim.id = null; speakerSim.nextAt = performance.now() + 1500; speakerTrack.id = null;
  setPipMediaSession(true); // Chrome's automatic picture-in-picture, only while this meeting is live
  live.timers.speaking = setInterval(liveSpeakerTick, 200);

  openModal("liveModalOverlay");
}

function initLiveControls() {
  const room = $("#liveModalOverlay");

  on($("#liveMicBtn"), "click", () => {
    if (!liveMicOn() && !liveCanModerate() && !live.perms.unmute) { toast("The host has turned off unmuting.", "error"); return; }
    setLiveMic(!liveMicOn());
    refreshLiveTiles();
    if (live.panel === "participants") renderLivePanel();
    publishLivePresence();
  });
  on($("#liveCamBtn"), "click", () => { setLiveCam(!liveCamOn()); refreshLiveTiles(); if (live.panel === "participants") renderLivePanel(); publishLivePresence(); });
  on($("#liveChatBtn"), "click", () => toggleLivePanel("chat"));
  on($("#liveParticipantsBtn"), "click", () => toggleLivePanel("participants"));
  on($("#liveScreenBtn"), "click", () => (live.sharing ? stopScreenShare() : startScreenShare()));
  on($("#stopShareBtn"), "click", () => stopScreenShare());
  on($("#liveRaiseHandBtn"), "click", () => setLiveHand(!live.hand));
  initLivePip();
  initAiNotes();
  on($("#liveRecordBtn"), "click", (e) => {
    if (live.recState !== "idle") return;
    e.stopPropagation();
    closeLiveMenus();
    runRecAction("start");
  });
  on($("#liveShareLinkBtn"), "click", () => { if (state.liveMeeting && authorize("meeting.invite", state.liveMeeting)) copyMeetingLink(state.liveMeeting); });
  on($("#liveDataModeBtn"), "click", () => {
    const next = !live.realMode;
    liveConfirm({ title: "Switch Data Mode?", text: "Changing this setting will reload the meeting participant data.", ok: "Switch", onOk: () => setLiveDataMode(next) });
  });
  on($("#liveShowTileBtn"), "click", () => runLiveAction("show-tile"));
  on($("#liveEndBtn"), "click", openEndDialog);
  on($("#leaveMeetingBtn"), "click", leaveLiveMeeting);
  on($("#confirmEndMeetingBtn"), "click", endLiveMeeting);

  on($("#liveMicCaret"), "show.bs.dropdown", () => fillLiveDevices("mic"));
  on($("#liveCamCaret"), "show.bs.dropdown", () => fillLiveDevices("cam"));
  on($("#liveToBtn"), "show.bs.dropdown", renderLiveToMenu);
  on($("#liveShareAudio"), "change", (e) => { live.shareAudio = e.target.checked; });

  on(room, "click", (e) => {
    const t = e.target;
    let el;
    if ((el = t.closest("[data-react]"))) { liveReact(el.getAttribute("data-react")); return; }
    if ((el = t.closest("[data-live-layout]"))) { setLiveView(el.getAttribute("data-live-layout")); return; }
    if ((el = t.closest("[data-live-action]"))) { runLiveAction(el.getAttribute("data-live-action"), el); return; }
    if ((el = t.closest("[data-emoji]"))) { const i = $("#liveChatInput"); i.value += el.getAttribute("data-emoji"); i.focus(); return; }
    if ((el = t.closest("[data-live-tab]"))) { openLivePanel(el.getAttribute("data-live-tab")); return; }
    if ((el = t.closest("[data-to]"))) { live.chatTo = el.getAttribute("data-to"); renderLivePanel(); return; }
    if ((el = t.closest("[data-qa-filter]"))) { live.qaFilter = el.getAttribute("data-qa-filter"); renderLivePanel(); return; }
    if ((el = t.closest("[data-device-kind]"))) { chooseLiveDevice(el); return; }
    if ((el = t.closest("[data-share-surface]"))) { liveMenu($("#liveShareCaret")).hide(); startScreenShare(el.getAttribute("data-share-surface")); return; }
    if ((el = t.closest("[data-transcribe]"))) { chooseTranscriptionLanguage(el.getAttribute("data-transcribe")); return; }
    if ((el = t.closest("[data-quality]"))) { setLiveQuality(el.getAttribute("data-quality")); return; }
    if ((el = t.closest("[data-live-bg]"))) { setLiveBackground(el.getAttribute("data-live-bg")); return; }
    if ((el = t.closest("[data-rec]"))) { runRecAction(el.getAttribute("data-rec")); return; }
    if (t.closest("[data-live-close-dialog]")) { if (live.dialog !== "dlgMeetingEnded") closeLiveDialog(); return; }
    if (t.closest("[data-live-fake-download]")) { e.preventDefault(); toast("Downloading file…"); return; }
    if ((el = t.closest("#liveStage .live-tile:not(.main), #liveStrip .live-tile"))) pinLiveUser(el.getAttribute("data-tile-user"));
  });
  on(room, "keydown", (e) => {
    if (e.key === "Escape" && live.dialog) { e.stopPropagation(); if (live.dialog !== "dlgMeetingEnded") closeLiveDialog(); return; }
    const tile = e.target.closest && e.target.closest(".live-tile[role='button']");
    if (tile && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pinLiveUser(tile.getAttribute("data-tile-user")); }
    if (e.key === "Enter" && e.target.id === "liveAnswerInput") runLiveAction("answer-save", e.target);
  });

  on($("#dlgConfirmOk"), "click", () => { const fn = live.confirmOk; live.confirmOk = null; closeLiveDialog(); if (fn) fn(); });
  on($("#dlgConfirmCancel"), "click", () => { live.confirmOk = null; closeLiveDialog(); });
  on($("#infoCopyLink"), "click", (e) => { if (state.liveMeeting) liveCopy(state.liveMeeting.link, e.currentTarget); });
  on($("#infoCopyId"), "click", (e) => { if (state.liveMeeting) liveCopy(state.liveMeeting.meetingCode, e.currentTarget); });

  let galFrame = 0; // the gallery follows the stage size (window resize, side panel opening / closing)
  if (window.ResizeObserver) new ResizeObserver(() => { if (live.view === "gallery") { cancelAnimationFrame(galFrame); galFrame = requestAnimationFrame(layoutGallery); } }).observe($("#liveMainArea"));
  on($("#liveStripPrev"), "click", () => $("#liveStrip").scrollBy({ top: -$("#liveStrip").clientHeight * 0.8, behavior: "smooth" }));
  on($("#liveStripNext"), "click", () => $("#liveStrip").scrollBy({ top: $("#liveStrip").clientHeight * 0.8, behavior: "smooth" }));

  on($("#liveSidePanelClose"), "click", closeLivePanel);
  on($("#liveMoreBtn"), "click", () => toggleLivePanel("more"));
  on($("#livePanel"), "hidden.bs.offcanvas", updatePanelButtons);
  on($("#liveInviteBtn"), "click", () => runLiveAction("invite"));
  on($("#liveParticipantSearch"), "input", renderLivePanel);
  on($("#liveChatSendBtn"), "click", sendLiveMessage);
  on($("#liveChatInput"), "keydown", (e) => { if (e.key === "Enter") sendLiveMessage(); });
  on($("#liveAttachBtn"), "click", () => $("#liveFileInput").click());
  on($("#liveFileInput"), "change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const size = file.size > 1048576 ? (file.size / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(file.size / 1024)) + " KB";
    live.chat.push({ user: ME, text: "", time: liveTime(), file: { name: file.name, size, url: URL.createObjectURL(file) }, to: live.chatTo === "all" ? null : live.chatTo });
    e.target.value = "";
    renderLivePanel();
  });

  /* More Actions controls */
  on($("#liveCaptionsSwitch"), "change", (e) => setLiveCaptions(e.target.checked));
  on($("#liveCaptionLang"), "change", (e) => setCaptionLanguage(e.target.value));
  on($("#liveLockSwitch"), "change", (e) => {
    if (!authorize("meeting.lock", state.liveMeeting)) { e.target.checked = live.locked; return; }
    if (!e.target.checked) { setLiveLocked(false); return; }
    e.target.checked = false;
    liveConfirm({ title: "Lock this meeting?", text: "New participants will no longer be able to join.", ok: "Lock Meeting", onOk: () => setLiveLocked(true) });
  });
  on($("#liveOnlyShareSwitch"), "change", (e) => {
    if (!authorize("share.restrict", state.liveMeeting)) { e.target.checked = live.onlyHostShare; return; }
    live.onlyHostShare = e.target.checked;
    syncLiveSecurityUI();
    saveLiveSecurity();
    toast(live.onlyHostShare ? "Only the host can share their screen." : "Participants can share their screen.");
  });
  [["#livePermUnmute", "unmute"], ["#livePermChat", "chat"], ["#livePermReact", "react"]].forEach(([sel, key]) => on($(sel), "change", (e) => { if (!authorize("participants.manage", state.liveMeeting)) { e.target.checked = live.perms[key]; return; } live.perms[key] = e.target.checked; applyLivePerms(); saveLiveSecurity(); }));

  /* Background & effects dialog */

  initWhiteboard();
}

function initRemoveParticipantConfirm() {
  on($("#confirmRemoveParticipantBtn"), "click", () => {
    if (state.pending && state.pending.type === "remove-participant" && state.liveMeeting) {
      if (!authorize("participants.remove", state.liveMeeting)) { state.pending = null; closeModal("removeParticipantConfirmOverlay"); return; }
      const id = state.pending.userId;
      state.liveMeeting.participants = state.liveMeeting.participants.filter((p) => p !== id);
      live.joined = live.joined.filter((p) => p !== id);
      if (live.pinnedId === id) live.pinnedId = null;
      refreshLivePanelAndTiles();
      toast("Participant removed.");
    }
    state.pending = null;
    closeModal("removeParticipantConfirmOverlay");
  });
}

/* ---- "End for all": broadcasts through the same real, same-browser localStorage+storage-event channel already used for presence/transcript
   (there is no backend here). Every other tab currently in this meeting gets a real, synchronized 5-second countdown, then is torn down the
   same way leaveLiveMeeting() tears itself down - camera, mic, screen share, captions, transcription and timers all genuinely stop. ---- */
const LIVE_ENDED_KEY = "mcm-live-ended-v1";
function broadcastMeetingEnded(meetingId) {
  try {
    const all = JSON.parse(localStorage.getItem(LIVE_ENDED_KEY) || "{}");
    Object.keys(all).forEach((k) => { if (Date.now() - all[k] > 60000) delete all[k]; }); // keep the key small
    all[meetingId] = Date.now();
    localStorage.setItem(LIVE_ENDED_KEY, JSON.stringify(all));
  } catch (e) { /* storage blocked */ }
}
function initLiveEndedSync() {
  window.addEventListener("storage", (e) => {
    if (e.key !== LIVE_ENDED_KEY || !state.liveMeeting || live.endedClosing) return;
    let all; try { all = JSON.parse(localStorage.getItem(LIVE_ENDED_KEY) || "{}"); } catch { return; }
    if (all[state.liveMeeting.id]) startMeetingEndedCountdown();
  });
}
// a REAL countdown (setInterval ticking once a second) - not a cosmetic timer, it is what actually triggers the teardown at 0
function startMeetingEndedCountdown() {
  if (live.endedClosing) return;
  live.endedClosing = true;
  let n = 5;
  closeLiveMenus();
  openLiveDialog("dlgMeetingEnded");
  $("#dlgEndedCountdown").textContent = String(n);
  live.timers.ended = setInterval(() => {
    n--;
    if (n <= 0) { clearInterval(live.timers.ended); live.timers.ended = 0; forceCloseEndedMeeting(); return; }
    $("#dlgEndedCountdown").textContent = String(n);
  }, 1000);
}
// every OTHER participant's tab, once the host's countdown reaches 0: the same real teardown leaveLiveMeeting() does, none of it skipped
function forceCloseEndedMeeting() {
  const meeting = state.liveMeeting;
  resetLiveRoom(); // stops camera, mic audio chain, screen share, captions/transcription, every live timer
  closeModal("liveModalOverlay");
  if (meeting) clearLivePresenceSelf(meeting);
  live.chat = []; live.qa = [];
  live.endedClosing = false;
  leaveMeetingTab();
  state.liveMeeting = null;
  loadState(); // authoritative post-end state (status "Ended", moved to Past) the host already saved
  applyRbac();
  switchSidebarView("past");
  renderAllViews();
  toast("The meeting has ended.");
}
// Admin / a Manager of this meeting's team: [Leave Meeting] [End for all]. Everyone else: [Cancel] [Leave Meeting] (never "End for all").
function openEndDialog() {
  const canEnd = can("meeting.end", state.liveMeeting);
  $("#endConfirmText").textContent = canEnd ? "Are you sure you want to end this meeting?" : "Are you sure you want to leave this meeting?";
  $("#endCancelBtn").classList.toggle("rbac-hidden", canEnd);
  $("#confirmEndMeetingBtn").classList.toggle("rbac-hidden", !canEnd);
  $("#leaveMeetingBtn").classList.toggle("btn-outline", canEnd);
  $("#leaveMeetingBtn").classList.toggle("btn-danger", !canEnd);
  openModal("endMeetingConfirmOverlay");
}
// Leave: you go, the meeting carries on for everyone else and stays under Ongoing Meetings
async function leaveLiveMeeting() {
  const meeting = state.liveMeeting;
  if (!authorize("meeting.leave", meeting)) return;
  await stopLiveRecordingIfActive(); // save whatever was captured rather than throwing it away
  closeModal("endMeetingConfirmOverlay");
  closeModal("liveModalOverlay");
  resetLiveRoom();
  clearLivePresenceSelf(meeting);
  live.chat = [];
  live.qa = [];
  leaveMeetingTab();
  state.liveMeeting = null;
  saveState();
  if (meeting && findMeeting(meeting.id)) switchSidebarView("ongoing");
  renderAllViews();
  toast("You left the meeting.");
}
async function endLiveMeeting() {
  const meeting = state.liveMeeting;
  if (!authorize("meeting.end", meeting)) { closeModal("endMeetingConfirmOverlay"); return; }
  await stopLiveRecordingIfActive(); // save whatever was captured rather than throwing it away
  closeModal("endMeetingConfirmOverlay");
  closeModal("liveModalOverlay");
  resetLiveRoom();
  clearLivePresenceSelf(meeting);
  live.chat = [];
  live.qa = [];
  leaveMeetingTab(); // in a meeting tab: back to the normal Video Meetings page
  if (!meeting) return;
  removeMeetingFrom("ongoing", meeting.id);
  const found = findMeeting(meeting.id);
  if (found) removeMeetingFrom(found.listKey, meeting.id);
  meeting.status = "Ended";
  meeting.chatCount = meeting.chatCount || Math.floor(Math.random() * 10) + 2;
  meeting.hasRecording = meeting.hasRecording || state.recordings.some((r) => r.meetingId === meeting.id); // real now: only true if something was actually recorded
  state.meetings.past.unshift(meeting);
  state.liveMeeting = null;
  saveState();
  broadcastMeetingEnded(meeting.id); // every other tab currently in this meeting gets a real, synchronized countdown then closes
  switchSidebarView("past");
  renderAllViews();
  toast("Meeting ended. Moved to Past Meetings.");
}

/* ============================================================
   16. DETAILS DRAWER
   ============================================================ */
let drawerContextMeeting = null;
const recordingOf = (m) => state.recordings.find((r) => r.meetingId === m.id);
// the recording / transcript rows of a past meeting: what exists is only described to a user who may open it
function drawerRecordingRows(m) {
  const subject = recordingOf(m) || m;
  const recTxt = !m.hasRecording ? "Not recorded" : can("recording.view", subject) ? "Available" : "Restricted";
  const trTxt = !m.transcriptAvailable ? "Not available" : can("transcript.view", subject) ? 'Available <button class="btn btn-outline btn-sm ms-2" id="drawerTranscriptBtn" type="button">View</button>' : "Restricted";
  return `<div class="drawer-row"><span class="drawer-label">Recording</span><span class="drawer-value">${recTxt}</span></div>
      <div class="drawer-row"><span class="drawer-label">Transcript</span><span class="drawer-value">${trTxt}</span></div>`;
}
function openDetailsDrawer(meeting, tab) {
  if (!authorize("meeting.view", meeting)) return;
  drawerContextMeeting = meeting;
  $("#detailsDrawerTitle").textContent = meeting.title;
  setDrawerTab(tab || "overview");
  openModal("detailsDrawerOverlay");
}
function setDrawerTab(tab) {
  const m = drawerContextMeeting;
  if (!m) return;
  const settingsOk = can("meeting.settings", m);
  $(".drawer-tab[data-drawer-tab='settings']").classList.toggle("rbac-hidden", !settingsOk); // meeting settings are not for every role
  if (tab === "settings" && !settingsOk) tab = "overview";
  $$(".drawer-tab").forEach((t) => t.classList.toggle("active", t.getAttribute("data-drawer-tab") === tab));
  const host = userById(m.hostId);
  const body = $("#drawerBody");
  const footer = $("#drawerFooter");

  if (tab === "overview") {
    body.innerHTML = `
      <div class="drawer-row"><span class="drawer-label">Status</span><span class="drawer-value"><span class="status-chip ${statusClass(m.status)}">${m.status}</span></span></div>
      <div class="drawer-row"><span class="drawer-label">Date</span><span class="drawer-value">${formatFullDate(m.date)}</span></div>
      <div class="drawer-row"><span class="drawer-label">Time</span><span class="drawer-value">${formatTimeRange(m)}</span></div>
      <div class="drawer-row"><span class="drawer-label">Duration</span><span class="drawer-value">${formatDurationLabel(m.duration)}</span></div>
      <div class="drawer-row"><span class="drawer-label">Timezone</span><span class="drawer-value">${m.timezone}</span></div>
      <div class="drawer-row"><span class="drawer-label">Host</span><span class="drawer-value">${host ? host.name : "—"}</span></div>
      <div class="drawer-row"><span class="drawer-label">Members</span><span class="drawer-value">${m.participants.length + 1}</span></div>
      <div class="drawer-row"><span class="drawer-label">Guests</span><span class="drawer-value">${m.guests.length}</span></div>
      ${m.status === "Ended" ? drawerRecordingRows(m) : ""}
      <div class="drawer-row"><span class="drawer-label">Meeting ID</span><span class="drawer-value">${m.meetingCode}</span></div>
      <div class="drawer-row"><span class="drawer-label">Reminder</span><span class="drawer-value">${Number(m.reminder) > 0 ? m.reminder + " min before" : "No reminder"}</span></div>
      <div class="drawer-section-title">Meeting Link</div>
      <div class="drawer-link-row"><input type="text" readonly value="${m.link}" /><button class="btn btn-outline btn-sm" id="drawerCopyLinkBtn" type="button">Copy</button></div>
      ${m.description ? `<div class="drawer-section-title">Description</div><p style="font-size:.8125rem;color:var(--text-secondary)">${escapeHtml(m.description)}</p>` : ""}
    `;
    on($("#drawerCopyLinkBtn"), "click", () => copyMeetingLink(m));
    on($("#drawerTranscriptBtn"), "click", () => openTranscript(recordingOf(m) || m));
  } else if (tab === "participants") {
    const host2 = host, fullInfo = can("participants.viewDetails", m); // an Agent sees who is in the meeting, not the guests' e-mail addresses
    body.innerHTML = `
      <div class="drawer-section-title">Members</div>
      <div class="drawer-participant"><span class="picker-avatar">${host2 ? host2.initials : "?"}</span><span style="flex:1">${host2 ? host2.name : "—"} (Host)</span></div>
      ${m.participants.map((id) => {
        const u = userById(id);
        const inv = m.invitations && m.invitations[id];
        const badge = inv ? `<span class="status-chip ${INVITE_STATUS_CLASS[inv.status] || "status-StartingSoon"}">${INVITE_STATUS_LABEL[inv.status] || "Pending"}</span>` : "";
        return `<div class="drawer-participant"><span class="picker-avatar">${u ? u.initials : "?"}</span><span style="flex:1">${u ? u.name : id}</span>${badge}</div>`;
      }).join("")}
      <div class="drawer-section-title">Guests</div>
      ${m.guests.length ? m.guests.map((g) => `<div class="drawer-participant"><span class="picker-avatar">${fullInfo ? g.email.slice(0,2).toUpperCase() : "EG"}</span><span style="flex:1">${fullInfo ? escapeHtml(g.email) : "External guest"}</span><span class="chip guest-chip" style="padding:.125rem .5rem">Guest</span></div>`).join("") : '<p style="color:var(--text-tertiary);font-size:.78125rem">No guests invited.</p>'}
    `;
  } else {
    body.innerHTML = `
      <div class="drawer-row"><span class="drawer-label">Who can join</span><span class="drawer-value">${m.security.whoCanJoin}</span></div>
      <div class="drawer-row"><span class="drawer-label">Waiting Room</span><span class="drawer-value">${m.security.waitingRoom ? "ON" : "OFF"}</span></div>
      <div class="drawer-row"><span class="drawer-label">Meeting Password</span><span class="drawer-value">${m.security.password ? "ON" : "OFF"}</span></div>
      <div class="drawer-row"><span class="drawer-label">Join before host</span><span class="drawer-value">${m.security.allowBeforeHost ? "ON" : "OFF"}</span></div>
      <div class="drawer-row"><span class="drawer-label">Microphone</span><span class="drawer-value">${m.security.permMic ? "Allowed" : "Blocked"}</span></div>
      <div class="drawer-row"><span class="drawer-label">Camera</span><span class="drawer-value">${m.security.permCam ? "Allowed" : "Blocked"}</span></div>
      <div class="drawer-row"><span class="drawer-label">Screen Sharing</span><span class="drawer-value">${m.security.permScreen ? "Allowed" : "Blocked"}</span></div>
      <div class="drawer-row"><span class="drawer-label">Chat</span><span class="drawer-value">${m.security.permChat ? "Allowed" : "Blocked"}</span></div>
    `;
  }

  const canEdit = m.status === "Upcoming" || m.status === "Starting Soon";
  let footerBtns = `<button class="btn btn-outline btn-sm" id="drawerCopyBtn" type="button">Copy Link</button>`;
  if (m.status !== "Ended" && m.status !== "Cancelled" && can("meeting.join", m)) footerBtns = `<button class="btn btn-primary btn-sm" id="drawerJoinBtn" type="button">Join</button>` + footerBtns;
  if (canEdit && can("meeting.edit", m)) footerBtns += `<button class="btn btn-outline btn-sm" id="drawerEditBtn" type="button">Edit</button><button class="btn btn-outline btn-sm" id="drawerRescheduleBtn" type="button">Reschedule</button>`;
  if (canEdit && can("meeting.cancel", m)) footerBtns += `<button class="btn btn-danger btn-sm" id="drawerCancelBtn" type="button">Cancel</button>`;
  footer.innerHTML = footerBtns;
  on($("#drawerJoinBtn"), "click", () => { closeModal("detailsDrawerOverlay"); requestJoin(m); });
  on($("#drawerCopyBtn"), "click", () => copyMeetingLink(m));
  on($("#drawerEditBtn"), "click", () => { closeModal("detailsDrawerOverlay"); openScheduleModal("edit", m); });
  on($("#drawerRescheduleBtn"), "click", () => { closeModal("detailsDrawerOverlay"); openRescheduleModal(m); });
  on($("#drawerCancelBtn"), "click", () => { closeModal("detailsDrawerOverlay"); openCancelConfirm(m); });
}
function initDrawerTabs() {
  $$(".drawer-tab").forEach((tab) => on(tab, "click", () => setDrawerTab(tab.getAttribute("data-drawer-tab"))));
}

/* ============================================================
   17. RESCHEDULE / CANCEL
   ============================================================ */
let rescheduleContext = null;
function openRescheduleModal(meeting) {
  if (!authorize("meeting.edit", meeting)) return;
  rescheduleContext = meeting;
  $("#rescheduleCurrent").textContent = `${formatFullDate(meeting.date)}, ${to12h(meeting.startTime)}`;
  $("#rescheduleDate").value = meeting.date;
  $("#rescheduleTime").value = meeting.startTime;
  openModal("rescheduleModalOverlay");
}
function initRescheduleModal() {
  on($("#confirmRescheduleBtn"), "click", () => {
    if (!rescheduleContext || !authorize("meeting.edit", rescheduleContext)) return;
    const newDate = $("#rescheduleDate").value;
    const newTime = $("#rescheduleTime").value;
    if (!newDate || !newTime) { toast("Please provide both a new date and time.", "error"); return; }
    rescheduleContext.date = newDate;
    rescheduleContext.startTime = newTime;
    saveState();
    closeModal("rescheduleModalOverlay");
    renderAllViews();
    toast("Meeting rescheduled successfully.");
  });
}

let cancelContext = null;
function openCancelConfirm(meeting) {
  if (!authorize("meeting.cancel", meeting)) return;
  cancelContext = meeting;
  openModal("cancelMeetingConfirmOverlay");
}
function initCancelConfirm() {
  on($("#confirmCancelMeetingBtn"), "click", () => {
    if (!cancelContext || !authorize("meeting.cancel", cancelContext)) return;
    cancelContext.status = "Cancelled";
    saveState();
    closeModal("cancelMeetingConfirmOverlay");
    renderAllViews();
    toast("Meeting cancelled.");
    cancelContext = null;
  });
}

let deleteMeetingContext = null;
function openDeleteMeetingConfirm(meeting) {
  if (!authorize("meeting.delete", meeting)) return;
  deleteMeetingContext = meeting;
  $("#deleteMeetingText").textContent = `"${meeting.title}" will be permanently removed. This action cannot be undone.`;
  openModal("deleteMeetingConfirmOverlay");
}
function initDeleteMeetingConfirm() {
  on($("#confirmDeleteMeetingBtn"), "click", () => {
    const meeting = deleteMeetingContext;
    if (!meeting || !authorize("meeting.delete", meeting)) return;
    ["upcoming", "ongoing", "invited", "past"].forEach((key) => removeMeetingFrom(key, meeting.id));
    deleteMeetingContext = null;
    saveState();
    closeModal("deleteMeetingConfirmOverlay");
    renderAllViews();
    toast("Meeting deleted.");
  });
}
// Export: a CSV of the meeting's data (its own file download)
function exportMeetingData(meeting) {
  if (!authorize("data.export", meeting)) return;
  const host = userById(meeting.hostId);
  const rows = [
    ["Title", meeting.title], ["Meeting ID", meeting.meetingCode], ["Team", TEAM_LABELS[meeting.team] || meeting.team], ["Status", meeting.status],
    ["Date", meeting.date], ["Time", formatTimeRange(meeting)], ["Duration (min)", meeting.duration], ["Host", host ? host.name : ""],
    ["Members", meeting.participants.map((id) => (userById(id) || {}).name || id).join("; ")], ["Guests", meeting.guests.map((g) => g.email).join("; ")], ["Chat messages", meeting.chatCount || 0],
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${meeting.title.replace(/[^\w-]+/g, "_")}_meeting_data.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Meeting data exported.");
}

/* ============================================================
   18. INVITE PARTICIPANTS MODAL
   ============================================================ */
const INVITE_STATUS_LABEL = { pending: "Pending", accepted: "Accepted", declined: "Declined", cancelled: "Cancelled" };
const INVITE_STATUS_CLASS = { pending: "status-StartingSoon", accepted: "status-Live", declined: "status-Cancelled", cancelled: "status-Ended" };
function openInviteModal(meeting) {
  if (meeting ? !authorize("meeting.invite", meeting) : !authorize("meeting.create")) return; // no meeting = inviting to the one being created
  // pre-meeting (Start Meeting lobby, no real meeting/ID yet): reopen shows whatever was queued, instead of blanking it out
  state.inviteForm.participants = meeting ? [] : state.startInvite.participants.slice();
  state.inviteForm.guests = meeting ? [] : state.startInvite.guests.slice();
  state.inviteForm.targetMeetingId = meeting ? meeting.id : null;
  renderChips("inviteParticipantChips", state.inviteForm.participants, "participants");
  renderChips("inviteGuestChips", state.inviteForm.guests, "guests");
  renderInviteStatusList(meeting);
  openModal("inviteModalOverlay");
}
// the organizer's live view of who's pending/accepted/declined/cancelled for THIS meeting, with Resend/Cancel on pending ones
function renderInviteStatusList(meeting) {
  const box = $("#inviteStatusList");
  const rows = meeting && meeting.invitations ? Object.keys(meeting.invitations).map((id) => ({ id, ...meeting.invitations[id] })).filter((r) => userById(r.id)) : [];
  if (!rows.length) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  const canManage = can("meeting.invite", meeting);
  rows.sort((a, b) => b.invitedAt - a.invitedAt);
  box.innerHTML = `<label>Invitation Status</label><div class="invite-status-rows">${rows.map((r) => {
    const u = userById(r.id);
    const actions = canManage && r.status === "pending"
      ? `<button type="button" class="btn btn-link btn-sm p-0 ms-2" data-invite-resend="${u.id}">Resend</button><button type="button" class="btn btn-link btn-sm p-0 ms-2 text-danger" data-invite-cancel="${u.id}">Cancel</button>`
      : "";
    return `<div class="drawer-participant">
      <span class="picker-avatar">${u.initials}</span>
      <span style="flex:1">${escapeHtml(u.name)}<br><span class="text-secondary" style="font-size:.71875rem">${escapeHtml(u.label)}</span></span>
      <span class="status-chip ${INVITE_STATUS_CLASS[r.status] || "status-StartingSoon"}">${INVITE_STATUS_LABEL[r.status] || "Pending"}</span>
      ${actions}
    </div>`;
  }).join("")}</div>`;
}
// one active invitation per meeting+user: a cancelled one can be re-invited, but a pending/accepted/declined one is never duplicated
function createInvitation(meeting, userId) {
  meeting.invitations = meeting.invitations || {};
  const existing = meeting.invitations[userId];
  if (existing && existing.status !== "cancelled") return false;
  meeting.invitations[userId] = { status: "pending", invitedBy: ME.id, invitedAt: Date.now(), respondedAt: null };
  state.notifications = state.notifications.filter((n) => !(n.userId === userId && n.meetingId === meeting.id && n.type === "invite")); // no stacked dupes
  addNotification(userId, { type: "invite", icon: "invite", meetingId: meeting.id, title: `${ME.name} invited you to a meeting`, text: meeting.title });
  return true;
}
function resendInvitation(meeting, userId) {
  if (!authorize("meeting.invite", meeting)) return;
  const inv = meeting.invitations && meeting.invitations[userId];
  if (!inv || inv.status !== "pending") return;
  inv.invitedAt = Date.now();
  state.notifications = state.notifications.filter((n) => !(n.userId === userId && n.meetingId === meeting.id && n.type === "invite"));
  addNotification(userId, { type: "invite", icon: "invite", meetingId: meeting.id, title: `${ME.name} invited you to a meeting`, text: meeting.title });
  saveState();
  toast("Invitation resent.");
  renderInviteStatusList(meeting);
}
function cancelInvitation(meeting, userId) {
  if (!authorize("meeting.invite", meeting)) return;
  const inv = meeting.invitations && meeting.invitations[userId];
  if (!inv || inv.status !== "pending") return;
  inv.status = "cancelled";
  inv.respondedAt = Date.now();
  meeting.participants = meeting.participants.filter((id) => id !== userId); // the recipient can no longer see or accept it
  state.notifications = state.notifications.filter((n) => !(n.userId === userId && n.meetingId === meeting.id && n.type === "invite"));
  saveState();
  renderAllViews();
  toast("Invitation cancelled.");
  renderInviteStatusList(meeting);
}
function initInviteModal() {
  initParticipantPicker("inviteParticipantSearch", "inviteParticipantDropdown", "inviteParticipantChips", state.inviteForm);
  initGuestEntry("inviteGuestEmailInput", "inviteAddGuestBtn", "inviteGuestChips", null, state.inviteForm);
  on($("#sendInvitationsBtn"), "click", () => {
    const hasTarget = !!state.inviteForm.targetMeetingId;
    const target = hasTarget ? findMeeting(state.inviteForm.targetMeetingId) : null;
    if (target ? !authorize("meeting.invite", target.meeting) : !authorize("meeting.create")) return;
    if (!hasTarget) {
      // no real meeting/ID exists yet (Start Meeting lobby): queue only. Nothing is sent until the meeting is actually created.
      state.startInvite.participants = state.inviteForm.participants.slice();
      state.startInvite.guests = state.inviteForm.guests.slice();
      closeModal("inviteModalOverlay");
      const n = state.startInvite.participants.length + state.startInvite.guests.length;
      toast(n ? `${n} participant${n === 1 ? "" : "s"} added. Invitations will be sent when the meeting starts.` : "No participants selected.");
      return;
    }
    let sentCount = 0;
    if (target) {
      const m = target.meeting;
      state.inviteForm.participants.forEach((id) => {
        if (!m.participants.includes(id)) m.participants.push(id);
        if (createInvitation(m, id)) sentCount++;
      });
      state.inviteForm.guests.forEach((email) => { if (!m.guests.some((g) => g.email === email)) m.guests.push({ email }); });
      saveState();
      renderAllViews();
      renderInviteStatusList(m);
    }
    closeModal("inviteModalOverlay");
    toast(sentCount ? `${sentCount} invitation${sentCount === 1 ? "" : "s"} sent.` : "Invitations sent successfully.");
  });
  on($("#inviteStatusList"), "click", (e) => {
    const target = state.inviteForm.targetMeetingId ? findMeeting(state.inviteForm.targetMeetingId) : null;
    if (!target) return;
    const resendBtn = e.target.closest("[data-invite-resend]"), cancelBtn = e.target.closest("[data-invite-cancel]");
    if (resendBtn) resendInvitation(target.meeting, resendBtn.getAttribute("data-invite-resend"));
    else if (cancelBtn) cancelInvitation(target.meeting, cancelBtn.getAttribute("data-invite-cancel"));
  });
}

/* ============================================================
   19. RECORDINGS
   ============================================================ */
function getRecordingsForSubView() {
  let list = visibleRecordings();
  if (state.recordingsSubView === "rec-mine") list = list.filter((r) => r.ownerId === ME.id);
  else if (state.recordingsSubView === "rec-shared") list = list.filter((r) => r.sharedWith.includes(ME.id));
  const rf = state.recFilters;
  if (rf.owner !== "all") list = list.filter((r) => r.ownerId === rf.owner);
  if (rf.size === "small") list = list.filter((r) => r.sizeMB < 15);
  if (rf.size === "large") list = list.filter((r) => r.sizeMB >= 15);
  if (state.recSearch.trim()) {
    const q = state.recSearch.trim().toLowerCase();
    list = list.filter((r) => r.name.toLowerCase().includes(q));
  }
  list.sort((a, b) => {
    if (state.recSort === "oldest") return new Date(a.recordedOn) - new Date(b.recordedOn);
    if (state.recSort === "largest") return b.sizeMB - a.sizeMB;
    if (state.recSort === "smallest") return a.sizeMB - b.sizeMB;
    return new Date(b.recordedOn) - new Date(a.recordedOn);
  });
  return list;
}

function renderRecordings() {
  const list = getRecordingsForSubView();
  $("#recordingsCount").textContent = `${list.length} item${list.length === 1 ? "" : "s"} found`;
  const tbody = $("#recordingsTbody");
  const table = $(".table-wrap");
  if (!list.length) {
    table.hidden = true;
    $("#recordingsEmpty").hidden = false;
  } else {
    table.hidden = false;
    $("#recordingsEmpty").hidden = true;
    tbody.innerHTML = list.map((r) => {
      const owner = userById(r.ownerId);
      return `<tr data-rec-id="${r.id}">
        <td><div class="rec-name-cell"><span class="rec-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg></span>${escapeHtml(r.name)}</div></td>
        <td>${r.sizeMB.toFixed(1)} MB</td>
        <td>${formatFullDate(r.recordedOn)}</td>
        <td>${owner ? owner.name : "—"}</td>
        <td>${r.members} members</td>
        <td><div class="rec-actions">
          ${can("recording.play", r) ? `<button class="rec-action-btn" data-rec-action="play" data-id="${r.id}" title="Play"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>` : ""}
          ${r.transcriptAvailable && can("transcript.view", r) ? `<button class="rec-action-btn" data-rec-action="transcript" data-id="${r.id}" title="Transcript"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg></button>` : ""}
          ${can("recording.download", r) ? `<button class="rec-action-btn" data-rec-action="download" data-id="${r.id}" title="Download"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>` : ""}
          ${can("recording.share", r) ? `<button class="rec-action-btn" data-rec-action="share" data-id="${r.id}" title="Share"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>` : ""}
          ${can("recording.delete", r) ? `<button class="rec-action-btn danger" data-rec-action="delete" data-id="${r.id}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : ""}
        </div></td>
      </tr>`;
    }).join("");
  }
  populateRecOwnerOptions();
}
function populateRecOwnerOptions() {
  const sel = $("#recFilterOwner");
  const current = sel.value;
  const ownerIds = Array.from(new Set(visibleRecordings().map((r) => r.ownerId)));
  sel.innerHTML = '<option value="all">All Owners</option>' + ownerIds.map((id) => `<option value="${id}">${userById(id).name}</option>`).join("");
  if (ownerIds.includes(current)) sel.value = current;
}

let deleteRecordingContext = null, recordingPreviewContext = null;
const REC_PERM = { play: "recording.play", download: "recording.download", share: "recording.share", delete: "recording.delete", transcript: "transcript.view" };
function initRecordingsInteractions() {
  on($("#recordingSearchInput"), "input", (e) => { state.recSearch = e.target.value; renderRecordings(); });
  on($("#recFilterBtn"), "click", (e) => {
    e.stopPropagation();
    const wasOpen = $("#recFilterPopover").classList.contains("open");
    closeAllPopovers();
    if (wasOpen) return;
    $("#recFilterPopover").classList.add("open");
    e.currentTarget.setAttribute("aria-expanded", "true");
  });
  on($("#recSortBtn"), "click", (e) => {
    e.stopPropagation();
    const wasOpen = $("#recSortPopover").classList.contains("open");
    closeAllPopovers();
    if (wasOpen) return;
    $("#recSortPopover").classList.add("open");
    e.currentTarget.setAttribute("aria-expanded", "true");
  });
  on($("#recFilterApply"), "click", () => {
    state.recFilters.owner = $("#recFilterOwner").value;
    state.recFilters.size = $("#recFilterSize").value;
    closeAllPopovers();
    renderRecordings();
  });
  on($("#recFilterReset"), "click", () => {
    state.recFilters = { owner: "all", size: "all" };
    $("#recFilterOwner").value = "all"; $("#recFilterSize").value = "all";
    renderRecordings();
  });
  $$('.popover-option[data-rec-sort]').forEach((btn) => on(btn, "click", () => {
    state.recSort = btn.getAttribute("data-rec-sort");
    closeAllPopovers();
    renderRecordings();
  }));

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-rec-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const rec = state.recordings.find((r) => r.id === id);
    if (!rec) return;
    const action = btn.getAttribute("data-rec-action");
    if (!authorize(REC_PERM[action], rec)) return;
    if (action === "play") {
      recordingPreviewContext = rec;
      $("#recordingDownloadBtn").classList.toggle("rbac-hidden", !can("recording.download", rec));
      $("#recordingPreviewTitle").textContent = rec.name;
      const owner = userById(rec.ownerId);
      $("#recordingPreviewMeta").innerHTML = `
        <div><strong>${escapeHtml(rec.name)}</strong></div>
        <div>${rec.sizeMB.toFixed(1)} MB • Recorded ${formatFullDate(rec.recordedOn)}</div>
        <div>Owner: ${owner ? owner.name : "—"} • ${rec.members} members</div>`;
      const player = $("#recordingPlayerBox"), url = LIVE_RECORDING_BLOBS.get(rec.id);
      player.classList.toggle("has-video", !!url);
      player.innerHTML = url
        ? `<video src="${url}" controls autoplay></video>`
        : `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg><span>Recording preview unavailable in prototype</span>`;
      openModal("recordingPreviewOverlay");
    } else if (action === "transcript") {
      openTranscript(rec);
    } else if (action === "download") {
      downloadRecording(rec);
    } else if (action === "share") {
      toast("Recording shared.");
    } else if (action === "delete") {
      deleteRecordingContext = rec;
      openModal("deleteRecordingConfirmOverlay");
    }
  });
  on($("#confirmDeleteRecordingBtn"), "click", () => {
    if (deleteRecordingContext) {
      if (!authorize("recording.delete", deleteRecordingContext)) { closeModal("deleteRecordingConfirmOverlay"); return; }
      const url = LIVE_RECORDING_BLOBS.get(deleteRecordingContext.id);
      if (url) { URL.revokeObjectURL(url); LIVE_RECORDING_BLOBS.delete(deleteRecordingContext.id); }
      state.recordings = state.recordings.filter((r) => r.id !== deleteRecordingContext.id);
      saveState();
      renderRecordings();
      toast("Recording deleted.");
    }
    closeModal("deleteRecordingConfirmOverlay");
  });
  on($("#recordingDownloadBtn"), "click", () => { if (recordingPreviewContext && authorize("recording.download", recordingPreviewContext)) downloadRecording(recordingPreviewContext); });
}
// a real capture downloads for real; a demo/sample recording (no actual file behind it) still just says so
function downloadRecording(rec) {
  const url = LIVE_RECORDING_BLOBS.get(rec.id);
  if (!url) { toast(`Downloading "${rec.name}"...`); return; }
  const a = document.createElement("a");
  a.href = url; a.download = `${rec.name.replace(/[^\w -]+/g, "").trim() || "recording"}.webm`;
  document.body.appendChild(a); a.click(); a.remove();
  toast(`Downloading "${rec.name}"...`);
}

/* ============================================================
   20. DEMO DATA TOGGLE + LOADING/ERROR SIMULATION
   ============================================================ */
function applyDemoData(enabled) {
  fillDemoData(enabled);
  saveState();
  renderAllViews();
  renderRoute();
  renderNotifications();
}
function initDemoToggle() {
  const toggle = $("#demoDataToggle");
  toggle.checked = state.demoData;
  on(toggle, "change", () => applyDemoData(toggle.checked));

  on($("#simulateLoading"), "click", () => simulateState("loading"));
  on($("#simulateError"), "click", () => simulateState("error"));
}
function currentListContainer() {
  const map = { upcoming: "#upcomingList", ongoing: "#ongoingList", invited: "#invitedList", past: "#pastList" };
  if (state.sidebarView.startsWith("rec-")) return null;
  return $(map[state.sidebarView] || "#upcomingList");
}
function simulateState(kind) {
  const container = currentListContainer();
  if (!container) { toast("Simulated states are available on meeting list views.", "error"); return; }
  if (kind === "loading") {
    container.innerHTML = `<div class="state-box"><div class="spinner"></div><h4>Loading meetings...</h4></div>`;
    setTimeout(() => renderAllViews(), 1100);
  } else {
    container.innerHTML = `<div class="state-box error-box">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <h4>Unable to load meetings.</h4>
      <button class="btn btn-outline btn-sm" id="retryLoadBtn" type="button">Try again</button>
    </div>`;
    on($("#retryLoadBtn"), "click", () => renderAllViews());
  }
}

/* ============================================================
   21. NOTIFICATIONS DROPDOWN
   ============================================================ */
const NOTIF_ICONS = {
  clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  invite: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>',
  reschedule: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  recording: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
};
function renderNotifications() {
  const list = notificationsForUser();
  $("#notifList").innerHTML = list.length ? list.map((n) => `
    <div class="notif-item">
      <span class="notif-icon">${NOTIF_ICONS[n.icon] || ""}</span>
      <div class="notif-text"><strong>${escapeHtml(n.title)}</strong>${escapeHtml(n.text)}<span class="notif-time">${n.time}</span>
        ${n.meetingId ? `<div class="notif-actions"><button type="button" class="btn btn-outline btn-sm" data-notif-decline="${n.meetingId}">Decline</button><button type="button" class="btn btn-primary btn-sm" data-notif-accept="${n.meetingId}">Accept</button></div>` : ""}
      </div>
    </div>`).join("") : `<div class="notif-item"><div class="notif-text"><strong>You're all caught up</strong>No new notifications.</div></div>`;
  const badge = $("#notifBadge");
  badge.textContent = String(list.length);
  badge.classList.toggle("rbac-hidden", !list.length);
}
function initNotifications() {
  renderNotifications();
  on($("#notifBtn"), "click", (e) => { e.stopPropagation(); $("#notifDropdown").classList.toggle("open"); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".notif-wrap")) $("#notifDropdown").classList.remove("open"); });
  on($("#notifList"), "click", (e) => {
    const acceptBtn = e.target.closest("[data-notif-accept]"), declineBtn = e.target.closest("[data-notif-decline]");
    if (!acceptBtn && !declineBtn) return;
    const found = findMeeting((acceptBtn || declineBtn).getAttribute(acceptBtn ? "data-notif-accept" : "data-notif-decline"));
    if (!found) return;
    if (acceptBtn) acceptInvite(found.meeting); else declineInvite(found.meeting);
    $("#notifDropdown").classList.remove("open");
  });
}

/* ============================================================
   22. GLOBAL SEARCH / COMMAND PALETTE
   ============================================================ */
function initCommandPalette() {
  const overlay = $("#commandPaletteOverlay");
  const input = $("#cpInput");
  function open() {
    overlay.hidden = false; input.value = ""; renderResults("");
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("open")));
    setTimeout(() => input.focus(), 60);
  }
  function close() { closeModal("commandPaletteOverlay"); }
  on($("#globalSearchTrigger"), "click", open);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); overlay.hidden ? open() : close(); }
  });
  on(input, "input", () => renderResults(input.value));
  on(overlay, "click", (e) => { if (e.target === overlay) close(); });

  function renderResults(q) {
    q = q.trim().toLowerCase();
    const allMeetings = [
      ...visibleMeetings("upcoming").map((m) => ({ m, listKey: "upcoming" })),
      ...visibleMeetings("ongoing").map((m) => ({ m, listKey: "ongoing" })),
      ...visibleMeetings("invited").map((m) => ({ m, listKey: "invited" })),
      ...visibleMeetings("past").map((m) => ({ m, listKey: "past" })),
    ].filter((x) => !q || x.m.title.toLowerCase().includes(q));
    const people = visibleUsers().filter((u) => !q || u.name.toLowerCase().includes(q) || u.label.toLowerCase().includes(q));
    const recs = visibleRecordings().filter((r) => !q || r.name.toLowerCase().includes(q));

    if (!allMeetings.length && !people.length && !recs.length) {
      $("#cpResults").innerHTML = `<div class="cp-empty">No results found.</div>`;
      return;
    }
    let html = "";
    if (allMeetings.length) {
      html += `<div class="cp-group-title">Meetings</div>` + allMeetings.slice(0, 6).map(({ m, listKey }) => `
        <div class="cp-result-item" data-cp-meeting="${m.id}" data-cp-list="${listKey}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          <span>${escapeHtml(m.title)} — ${formatFullDate(m.date)}</span>
        </div>`).join("");
    }
    if (people.length) {
      html += `<div class="cp-group-title">People</div>` + people.slice(0, 6).map((u) => `
        <div class="cp-result-item"><span class="picker-avatar">${u.initials}</span><span>${escapeHtml(u.name)}</span><span class="text-secondary ms-1">${escapeHtml(u.label)}</span></div>`).join("");
    }
    if (recs.length) {
      html += `<div class="cp-group-title">Recordings</div>` + recs.slice(0, 6).map((r) => `
        <div class="cp-result-item" data-cp-recording="${r.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          <span>${escapeHtml(r.name)}</span>
        </div>`).join("");
    }
    $("#cpResults").innerHTML = html;
    $$('[data-cp-meeting]').forEach((el) => on(el, "click", () => {
      close();
      const found = findMeeting(el.getAttribute("data-cp-meeting"));
      if (found) openDetailsDrawer(found.meeting);
    }));
    $$('[data-cp-recording]').forEach((el) => on(el, "click", () => {
      close();
      const rec = state.recordings.find((r) => r.id === el.getAttribute("data-cp-recording"));
      if (rec && authorize("recording.play", rec)) $("#recordingPreviewTitle") && ($("#recordingPreviewTitle").textContent = rec.name, openModal("recordingPreviewOverlay"));
    }));
  }
}

/* ============================================================
   23. GLOBAL RENDER
   ============================================================ */
// Video Meetings hero (Upcoming view): live count / participant count / avatars, derived from the signed-in user's own visible ongoing meetings
function renderMeetingsHero() {
  const avatarsBox = $("#vmHeroAvatars");
  if (!avatarsBox) return;
  const ongoing = visibleMeetings("ongoing");
  const peopleIds = new Set();
  let participantCount = 0;
  ongoing.forEach((m) => {
    peopleIds.add(m.hostId);
    (m.participants || []).forEach((id) => peopleIds.add(id));
    participantCount += (m.participants || []).length + 1;
  });
  const people = [...peopleIds].map(userById).filter(Boolean);
  const shown = people.slice(0, 5);
  const extra = people.length - shown.length;
  avatarsBox.innerHTML = shown.map((u) => `<span class="mini-avatar" title="${escapeHtml(u.name)}">${u.initials}</span>`).join("") + (extra > 0 ? `<span class="mini-avatar">+${extra}</span>` : "");
  $("#vmHeroLive").innerHTML = `<span class="live-status-dot"></span>${ongoing.length} Live`;
  $("#vmHeroParticipants").textContent = participantCount;
  $("#vmHeroLocation").textContent = ME.locationId ? ((LOCATIONS[ME.locationId] || {}).name || "—") : "All Locations";
}
function renderAllViews() {
  renderMeetingsHero();
  renderUpcoming();
  renderOngoing();
  renderInvited();
  renderPast();
  renderRecordings();
}

/* ============================================================
   24. INIT
   ============================================================ */
function init() {
  const meetingRoute = readMeetingRoute(); // set when this tab was opened by Start Meeting
  ME = resolveCurrentUser(); // who is signed in in this tab
  loadState();
  initDarkMode();
  initClock();
  initDutyTimer();
  renderDutyPill();
  initSidebarNav();
  initMainKeyboardScroll();
  initUpcomingToolbar();
  initOngoingToolbar();
  initCardActionDelegation();
  initContextMenuGlobalClose();
  initScheduleModal();
  initJoinModal();
  initPrejoinControls();
  initStartModal();
  initVideoFxUi();
  renderLanguageUi();
  initLiveControls();
  initRemoveParticipantConfirm();
  initDrawerTabs();
  initRescheduleModal();
  initCancelConfirm();
  initInviteModal();
  initRecordingsInteractions();
  initDeleteMeetingConfirm();
  initRoleSelector();
  initRouter();
  initAnalyticsReports();
  initRbacTooltips();
  initDemoToggle();
  initNotifications();
  initCommandPalette();

  enhanceAllSelects();
  initBgThumbPreviews();
  $("#demoDataToggle").checked = state.demoData;
  switchSidebarView("upcoming");
  renderAllViews();
  applyRbac();
  initTabSync();
  initLivePresenceSync();
  initLiveTranscriptSync();
  initLiveEndedSync();
  if (meetingRoute) startMeetingTab(meetingRoute);
}

/* ============================================================
   LINK TO THE OTHER UCAAS SECTIONS
   - meetings scheduled here are reported as shared items: they become tasks (Tasks), show on the Dashboard, in the bell and the log
   - meetings scheduled elsewhere (a task, the Directory) arrive here as upcoming meetings
   - Settings > Company rules are checked when a meeting is scheduled
   ============================================================ */
const LINK_PUB = "ucaas.meetings.published", LINK_MAP = "ucaas.meetings.links";
const readJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
let linkPub = readJSON(LINK_PUB, null);   // meeting id -> what was last reported (null until the first run)
const linkMap = readJSON(LINK_MAP, {});   // item id -> { meetingId, origin }   meetings created from another section
const meetingTime = (m) => new Date(`${m.date}T${m.startTime}`).getTime();
const linkOfMeeting = (id) => { for (const k in linkMap) if (linkMap[k].meetingId === id) return { id: k, origin: linkMap[k].origin }; return null; };
const allMeetingsFlat = () => ["upcoming", "ongoing", "invited", "past"].flatMap((k) => state.meetings[k].map((m) => ({ m, k })));
function meetingItem(m, status) {
  const l = linkOfMeeting(m.id), host = userById(m.hostId) || ME;
  return { id: l ? l.id : "meetings:" + m.id, kind: "meeting", origin: l ? l.origin : "meetings", title: m.title, contact: host.name, phone: "",
    at: meetingTime(m), duration: m.duration, priority: "NORMAL", status, owner: host.name, participants: (m.participants || []).map((id) => (userById(id) || {}).name).filter(Boolean) };
}
const meetingSig = (it) => [it.title, it.at, it.status].join("|");
/* the meetings that already exist when the app opens are the starting point: only what is scheduled afterwards is reported */
function baselineMeetings(mine) {
  linkPub = {};
  (mine || allMeetingsFlat().filter(({ m }) => !m.isDemo)).forEach(({ m, k }) => { linkPub[m.id] = meetingSig(meetingItem(m, k === "past" ? "done" : "scheduled")); });
  writeJSON(LINK_PUB, linkPub);
}
window.addEventListener("load", () => { try { if (linkPub === null) baselineMeetings(); } catch (e) { /* not ready */ } });
function publishMeetings() {
  if (!window.UCAAS_emit || typeof state === "undefined" || !state.meetings) return;
  const mine = allMeetingsFlat().filter(({ m }) => !m.isDemo);
  if (linkPub === null) baselineMeetings(mine);
  const seen = {};
  mine.forEach(({ m, k }) => {
    seen[m.id] = 1;
    const it = meetingItem(m, k === "past" ? "done" : "scheduled"), sg = meetingSig(it);
    if (linkPub[m.id] === sg) return;
    const isNew = !(m.id in linkPub);
    linkPub[m.id] = sg;
    window.UCAAS_emit("item", { item: it });
    if (isNew && !linkOfMeeting(m.id) && window.UCAAS_whenWarning) { const w = window.UCAAS_whenWarning(it.at); if (w) toast(w + " Check Settings > Phone rules."); }
  });
  Object.keys(linkPub).forEach((id) => {          // a meeting that was reported and is now gone was cancelled / deleted
    if (seen[id] || /\|cancelled$/.test(linkPub[id])) return;
    const l = linkOfMeeting(id), parts = linkPub[id].split("|");
    window.UCAAS_emit("item", { item: { id: l ? l.id : "meetings:" + id, kind: "meeting", origin: l ? l.origin : "meetings", title: parts[0], at: Number(parts[1]), status: "cancelled" } });
    linkPub[id] = parts[0] + "|" + parts[1] + "|cancelled";
  });
  writeJSON(LINK_PUB, linkPub);
}
const pad2 = (n) => String(n).padStart(2, "0");
window.UCAAS_onItems = (items) => {
  if (typeof state === "undefined" || !state.meetings) return;
  let changed = false;
  items.forEach((it) => {
    if (it.kind !== "meeting" || (it.origin === "meetings" && (it.ownerId || "admin") === (window.UCAAS_user || "admin"))) return;   // my own meetings are already here
    const l = linkMap[it.id], found = l && findMeeting(l.meetingId);
    if (!l) {
      if (it.status !== "scheduled" || !it.at) return;
      const d = new Date(it.at);
      const base = { title: it.title, description: "Scheduled from " + it.origin + ".", date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`, startTime: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
        duration: it.duration || 30, hostId: ME.id, participants: ["u3", "u5"].filter((id) => id !== ME.id), assignedTo: ["u5"].filter((id) => id !== ME.id), guests: [] };
      const m = baseMeeting(Object.assign(base, { status: "Upcoming" }, ownershipForNewMeeting(ME.id)));
      state.meetings.upcoming.push(m);
      linkMap[it.id] = { meetingId: m.id, origin: it.origin }; writeJSON(LINK_MAP, linkMap);
      linkPub = linkPub || {}; linkPub[m.id] = meetingSig(meetingItem(m, "scheduled")); writeJSON(LINK_PUB, linkPub);
      changed = true;
    } else if (found) {
      const m = found.meeting;
      if ((it.status === "cancelled") && found.listKey !== "past") { state.meetings[found.listKey] = state.meetings[found.listKey].filter((x) => x.id !== m.id); changed = true; }
      else if (it.status === "done" && found.listKey === "upcoming") { state.meetings.upcoming = state.meetings.upcoming.filter((x) => x.id !== m.id); m.status = "Ended"; state.meetings.past.unshift(m); changed = true; }
      else if (it.status === "scheduled" && found.listKey === "upcoming" && it.at && it.at !== meetingTime(m)) { const d = new Date(it.at); m.title = it.title; m.date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; m.startTime = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; changed = true; }
    }
  });
  if (changed) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ meetings: state.meetings, recordings: state.recordings, demoData: state.demoData, lobbyPrefs: state.lobbyPrefs, notifications: state.notifications, rbac: RBAC_SCHEMA })); } catch (e) { /* ignore */ } renderAllViews(); }
};

/* ---- Company Rules in Meetings: holidays are marked on the calendar, a banner says when the company is closed,
   and the schedule form warns when the chosen day is a holiday or the time is outside opening hours ---- */
(function companyRulesInMeetings() {
  const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  function banner() {
    const main = document.getElementById("mainContent"); if (!main || !window.UCAAS_closedNow) return;
    const c = window.UCAAS_closedNow(); let el = document.getElementById("ucaasClosed");
    if (!c.closed) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "ucaasClosed"; el.className = "ucaas-closed"; el.setAttribute("role", "status"); main.insertBefore(el, main.firstChild); }
    const html = `<b>The company is closed now</b><span>${c.reason}. Meetings can still be scheduled.</span>`;
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  function calendar() {
    if (!window.UCAAS_day) return;
    document.querySelectorAll(".calendar-cell[data-cal-date]").forEach((cell) => {
      const info = window.UCAAS_day(new Date(cell.getAttribute("data-cal-date") + "T12:00").getTime()); if (!info) return;
      cell.classList.toggle("co-closed", info.closed); cell.classList.toggle("co-hol", !!info.holiday);
      if (info.reason) cell.title = info.reason; else cell.removeAttribute("title");
    });
  }
  function note() {
    const date = document.getElementById("fieldDate"); if (!date || !window.UCAAS_whenWarning) return;
    let el = document.getElementById("ucaasClosedNote");
    if (!el) { el = document.createElement("div"); el.id = "ucaasClosedNote"; el.className = "ucaas-closed-note"; date.parentNode.appendChild(el); }
    let msg = "";
    if (date.value) { const t = typeof getTimeSelectsAs24h === "function" ? getTimeSelectsAs24h() : "12:00"; msg = window.UCAAS_whenWarning(new Date(`${date.value}T${t || "12:00"}`).getTime()); }
    el.textContent = msg; el.hidden = !msg;
  }
  let queued = false;
  const refresh = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; banner(); calendar(); }, 60); };
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("change", (e) => { if (e.target && /^(fieldDate|fieldTimeHour|fieldTimeMinute|fieldTimeAmPm)$/.test(e.target.id)) note(); });
  document.addEventListener("input", (e) => { if (e.target && e.target.id === "fieldDate") note(); });
  document.addEventListener("click", (e) => { if (e.target && e.target.closest && e.target.closest("#btnScheduleMeeting")) setTimeout(note, 400); });
  /* Company Rules > Phone rules > Call recording: automatic = every meeting is recorded, off = nothing can be recorded, on request = the host chooses */
  function recordingRule() {
    const box = document.getElementById("fieldAutoRecord"), R = window.UCAAS_rules && window.UCAAS_rules(); if (!box || !R) return;
    const mode = R.recording.mode; let n = document.getElementById("ucaasRecNote");
    if (!n) { n = document.createElement("div"); n.id = "ucaasRecNote"; n.className = "ucaas-closed-note"; (box.closest(".form-check, .form-switch, label, div") || box.parentNode).appendChild(n); }
    if (mode === "auto") { box.checked = true; box.disabled = true; n.textContent = "Every meeting is recorded: company rule." + (R.notice.announce ? " Participants are told." : ""); }
    else if (mode === "off") { box.checked = false; box.disabled = true; n.textContent = "Recording is turned off by company rules."; }
    else { box.disabled = false; n.textContent = R.notice.announce ? "Participants are told when recording starts." : ""; }
    n.hidden = !n.textContent;
  }
  document.addEventListener("click", (e) => { if (e.target && e.target.closest && e.target.closest("#btnScheduleMeeting, [data-schedule-open], .js-duplicate")) setTimeout(recordingRule, 450); });
  const previous = window.UCAAS_onSettings;
  window.UCAAS_onSettings = (st) => { if (previous) previous(st); refresh(); note(); recordingRule(); try { renderAllViews(); } catch (e) { /* not ready */ } };
  setInterval(banner, 60000);
})();

/* inside UCAAS: the shell's user role picks one of the demo users (admin / location admin / manager / agent) */
window.UCAAS_onRole = (role) => {
  const id = { admin: "u1", location_admin: "u2", manager: "u3", agent: "u5" }[role];
  if (id && ME.id !== id) setCurrentUser(id);
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

})();

