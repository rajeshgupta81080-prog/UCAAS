
/* =====================================================================
   WORKSPACES (call softphone + meeting room)
   ===================================================================== */
const PAD = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];
const padHTML = () => `<div class="pad">${PAD.map(([d, l]) => `<button data-act="digit" data-v="${d}" aria-label="Digit ${d}">${d}${l ? `<small>${l}</small>` : '<small>&nbsp;</small>'}</button>`).join('')}</div>`;
const SP = { idle: ['#eceff5', '#5b6578', 'Idle'], dialing: ['#fef3c7', '#b45309', 'Dialing'], ringing: ['#fef3c7', '#b45309', 'Ringing'], connected: ['#dcfce7', '#15803d', 'Connected'], hold: ['#ffedd5', '#c2410c', 'On Hold'], consult: ['#ffedd5', '#c2410c', 'Consulting'], wrapup: ['#dbeafe', '#1d4ed8', 'Wrap-up'], lobby: ['#eceff5', '#5b6578', 'Scheduled'], joining: ['#fef3c7', '#b45309', 'Joining'], in_meeting: ['#dcfce7', '#15803d', 'In meeting'], left: ['#ffedd5', '#c2410c', 'Left meeting'] };
const spill = k => `<span class="statepill" style="background:${SP[k][0]};color:${SP[k][1]}"><i class="pdot" style="background:${SP[k][1]}"></i>${SP[k][2]}</span>`;
const ctl = (act, icn, label, o = {}) => `<button class="ctl ${o.on ? 'on' : ''} ${o.end ? 'end' : ''}" data-act="${act}" ${o.dis ? 'disabled' : ''} aria-label="${label}" ${o.on !== undefined ? `aria-pressed="${!!o.on}"` : ''}>${ic(icn, 20)}<span>${label}</span></button>`;

function viewWorkspace(id) {
  const t = task(id);
  if (!t) return `<div class="card empty" style="padding:50px"><b>Task not found</b><br><button class="btn" style="margin-top:12px" data-act="nav" data-v="tasks">Back to tasks</button></div>`;
  const cu = customer(t.customerId) || {}, m = menuItems(t).filter(i => i !== '-' && ['accept', 'decline', 'claim', 'release', 'assign', 'resched', 'cancel'].includes(i.act));
  const tab = U.wsTab || 'activity';
  const hist = AppState.tasks.filter(x => x.customerId === t.customerId && x.id !== t.id).sort((a, b) => b.scheduledAt - a.scheduledAt).slice(0, 6);
  const tabBody = tab === 'activity' ? `<div class="tlv">${taskEvents(t.id).slice(0, 40).map(tlEntry).join('') || '<div class="empty">No events</div>'}</div>`
    : tab === 'notes' ? `<textarea class="notes" id="notes" placeholder="Type notes – autosaved with the task…" aria-label="Notes">${esc(t.notes)}</textarea><small style="color:var(--muted)">Autosaved · ${t.notes.length} characters</small>`
    : `<div class="ulist">${(cu.history || []).map(h => `<div class="urow" style="cursor:default"><div class="cbox" style="background:${TYPE[h.type].bg};color:${TYPE[h.type].c}">${ic(TYPE[h.type].ic, 16)}</div><div><b>${esc(h.summary)}</b><small>${h.daysAgo} days ago · ${esc(h.outcome)}</small></div></div>`).join('')}${hist.map(h => `<div class="urow" data-act="drawer" data-id="${h.id}">${tBox(h, 32)}<div><b>${esc(h.title)}</b><small>${fmtDT(h.scheduledAt)} · ${esc(h.outcome || STATUS_LABEL[h.status])}</small></div></div>`).join('')}</div>`;
  return `<div class="ws-h"><button class="btn sm" data-act="back">${ic('cl', 14)} Back</button>${tBox(t, 40)}<div><h2>${esc(t.title)}</h2><div style="color:var(--muted)">${esc(t.id)} · ${esc(t.customer)} · ${esc(t.company)}</div></div><span class="sp"></span>${stPill(t)} ${priPill(t.priority)}<button class="btn sm" data-act="drawer" data-id="${t.id}">Details</button></div>
  <div class="ws">
   <aside class="col"><section class="card"><div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">${avatar(t.contact, 44)}<div><b>${esc(t.contact)}</b><div style="color:var(--muted);font-size:12px">${esc(t.company)}</div></div></div>
     <div class="kv"><span>Phone</span><div>${esc(t.phone)}</div><span>Email</span><div style="word-break:break-all">${esc(cu.email || '—')}</div><span>Tier</span><div>${esc(cu.tier || '—')}</div><span>Customer since</span><div>${cu.since || '—'}</div></div></section>
    <section class="card"><h3>Work item</h3><div class="kv"><span>Scheduled</span><div>${fmtDT(t.scheduledAt)}</div><span>Planned</span><div>${t.plannedDuration} min</div><span>Owner</span><div>${t.assignedAgent ? esc(agentName(t.assignedAgent)) : 'Unassigned'}</div><span>Queue</span><div>${esc(queueName(t.queue))}</div><span>Direction</span><div>${esc(t.direction)}</div>${t.outcome ? `<span>Outcome</span><div>${esc(t.outcome)}</div>` : ''}</div>
     ${m.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">${m.map(i => `<button class="btn sm ${i.danger ? 'danger' : ''}" data-act="${i.act}" data-id="${t.id}">${i.l}</button>`).join('')}</div>` : ''}</section></aside>
   <section class="card center" style="padding:0;overflow:visible">${t.type === 'CALL' ? callPanel(t) : meetingPanel(t)}</section>
   <aside><section class="card"><div class="tabs2">${[['activity', 'Activity'], ['notes', 'Notes'], ['history', 'History']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="wstab" data-v="${k}">${l}</button>`).join('')}</div>${tabBody}</section></aside></div>`;
}

function callPanel(t) {
  const s = AppState.calls[t.id], st = s ? s.state : 'idle';
  if (isTerminal(t) && !s) return `<div class="phone"><div style="margin:14px 0">${stPill(t)}</div><h3>Call ${STATUS_LABEL[t.status].toLowerCase()}</h3><div class="kv" style="max-width:320px;margin:10px auto;text-align:left"><span>Outcome</span><div>${esc(t.outcome) || '—'}</div><span>Disposition</span><div>${esc(t.disposition) || '—'}</div><span>Talk time</span><div>${dur(t.duration)}</div></div><p style="color:var(--muted)">This work item is closed. Review the activity timeline and notes on the right.</p></div>`;
  if (st === 'idle') {
    const dial = s ? s.dial : t.phone;
    return `<div class="phone">${spill('idle')}<h3 style="margin:14px 0 0">Ready to dial</h3><div style="color:var(--muted)">${esc(t.contact)} · ${esc(t.company)}</div>
      <div class="dialin"><input id="dialNum" value="${esc(dial)}" aria-label="Phone number" placeholder="Enter number" inputmode="tel" autocomplete="off"><button class="iconbtn" data-act="bs" aria-label="Backspace">${ic('x', 16)}</button></div>
      ${padHTML()}<div class="ctrls"><button class="btn green" style="height:44px;padding:0 28px" data-act="dial">${ic('phone', 16)} Dial</button><button class="btn" style="height:44px" data-act="clearnum">New Call (clear)</button></div>
      ${t.assignedAgent && !isMine(t) ? `<div class="formerr show">Assigned to ${esc(agentName(t.assignedAgent))} – reassign to yourself to place the call.</div>` : !t.assignedAgent ? '<div class="formerr show">Claim or assign this call before dialing.</div>' : ''}</div>`;
  }
  if (st === 'dialing' || st === 'ringing') return `<div class="phone">${spill(st)}<div style="margin:22px 0"><span class="spin"></span></div><h3 style="margin:0">${st === 'dialing' ? 'Dialing' : 'Ringing'} ${esc(s.number)}…</h3><div style="color:var(--muted)">${esc(t.contact)} · ${esc(t.company)}</div><div class="ctrls">${ctl('endcall', 'phoneoff', 'End Call', { end: 1 })}</div></div>`;
  if (st === 'wrapup') return wrapCall(t, s);
  const hold = st === 'hold' || st === 'consult';
  return `<div class="phone">${spill(st)}<div class="timer" data-live="talk" data-id="${t.id}">00:00</div><div style="color:var(--muted)">Talk time · ${esc(s.number)}</div>
    ${hold ? `<div style="margin-top:6px;color:#c2410c;font-weight:600">On hold <span data-live="hold" data-id="${t.id}">00:00</span></div>` : ''}
    <div style="margin-top:8px">${s.muted ? '<span class="chipx">Microphone muted</span>' : ''}${s.speaker ? '<span class="chipx" style="background:#eef4ff;color:#1d4ed8">Speaker on</span>' : ''}</div>
    <div class="ctrls">${ctl('mute', s.muted ? 'micoff' : 'mic', s.muted ? 'Unmute' : 'Mute', { on: s.muted })}${ctl(st === 'hold' ? 'resume' : 'hold', st === 'hold' ? 'play' : 'pause', st === 'hold' ? 'Resume' : 'Hold', { on: st === 'hold', dis: st === 'consult' })}${ctl('speaker', 'vol', 'Speaker', { on: s.speaker })}${ctl('padtoggle', 'pad', 'Dial Pad', { on: s.padOpen })}${ctl('xfer', 'xfer', 'Transfer')}${ctl('addpart', 'users', 'Add Participant')}${ctl('newcall', 'plus', 'New Call')}${ctl('endcall', 'phoneoff', 'End Call', { end: 1 })}</div>
    ${s.padOpen ? `<div><div class="dialin"><input readonly value="${esc(s.dtmf)}" placeholder="DTMF digits" aria-label="DTMF digits"><button class="iconbtn" data-act="bs" aria-label="Backspace">${ic('x', 16)}</button></div>${padHTML()}</div>` : ''}
    ${s.consult ? `<div class="consult"><b>Warm transfer · ${esc(agentName(s.consult.agentId))}</b><div style="color:#92400e;margin:4px 0 10px">${s.consult.state === 'ringing' ? 'Consultation leg ringing… customer on hold' : 'Agent answered – complete the transfer or cancel and return to the customer.'}</div><button class="btn primary sm" data-act="xcomplete" ${s.consult.state !== 'connected' ? 'disabled' : ''}>Complete transfer</button> <button class="btn sm" data-act="xcancel">Cancel consult</button></div>` : ''}
    ${s.participants.length ? `<div class="plist"><div class="sec-h"><b>Conference (${s.participants.length})</b><button class="btn sm danger" data-act="endconf">End conference</button></div>${s.participants.map(p => `<div class="prow">${avatar(p.name, 30)}<div><b>${esc(p.name)}</b><small>${esc(p.phone)} · ${p.status === 'dialing' ? 'Dialing…' : p.muted ? 'Muted' : 'Connected'}</small></div><span class="sp"><button class="btn sm" data-act="pmute" data-id="${p.id}">${p.muted ? 'Unmute' : 'Mute'}</button><button class="btn sm danger" data-act="premove" data-id="${p.id}">Remove</button></span></div>`).join('')}</div>` : ''}</div>`;
}
function wrapCall(t, s) {
  const w = s.wrap;
  return `<div class="phone"><div style="margin-bottom:10px">${spill('wrapup')}</div><div class="wrapf"><h3 style="margin:8px 0">Call wrap-up</h3>
   <div class="stats"><div><small>Talk time</small><b>${dur(s.talkMs / 1000)}</b></div><div><small>Hold time</small><b>${dur(s.heldMs / 1000)}</b></div></div>
   <label for="w-outcome">Outcome *</label><select class="sel" style="width:100%" id="w-outcome"><option value="">Select an outcome…</option>${opts(CALL_OUTCOMES, w.outcome)}</select>
   <label for="w-disp">Disposition</label><select class="sel" style="width:100%" id="w-disp"><option value="">—</option>${opts(CALL_DISPOSITIONS, w.disposition)}</select>
   <label for="w-notes">Notes</label><textarea class="fi" id="w-notes" placeholder="Summary of the conversation…">${esc(w.notes)}</textarea>
   <label class="inl" style="display:flex;gap:8px;align-items:center;font-weight:500;color:var(--text)"><input type="checkbox" id="w-fu" ${w.followup ? 'checked' : ''}> Create follow-up call task</label>
   ${w.followup ? `<div class="fg" style="margin-top:8px"><div><label>Date</label><input class="fi" type="date" id="w-fud" value="${esc(w.fuDate)}"></div><div><label>Time</label><input class="fi" type="time" id="w-fut" value="${esc(w.fuTime)}"></div></div>` : ''}
   <button class="btn primary" style="margin-top:18px;width:100%;justify-content:center" data-act="wrapcall">Complete wrap-up</button></div></div>`;
}

const tileHTML = (name, o) => `<div class="tile ${o.speaking ? 'sp' : ''} ${o.state === 'disconnected' ? 'dis' : ''}" aria-label="${esc(name)}">${o.cam && o.state !== 'disconnected' ? `<div style="position:absolute;inset:0;background:linear-gradient(135deg,hsl(${hue(name)} 45% 28%),hsl(${hue(name) + 40} 45% 20%))"></div>` : ''}<span style="position:relative">${avatar(name, 54)}</span><div class="st">${o.state === 'disconnected' ? '<span>Disconnected</span>' : `${o.speaking ? '<span style="background:#16a34a">Speaking</span>' : ''}${!o.mic ? '<span>Muted</span>' : ''}<span>${o.cam ? 'Camera On' : 'Camera Off'}</span>`}</div><div class="nm">${esc(name)}</div></div>`;
function meetingPanel(t) {
  const s = AppState.meetings[t.id], st = s ? s.state : 'lobby';
  if (isTerminal(t) && !s) return `<div class="phone"><div style="margin:14px 0">${stPill(t)}</div><h3>Meeting ${STATUS_LABEL[t.status].toLowerCase()}</h3><div class="kv" style="max-width:320px;margin:10px auto;text-align:left"><span>Outcome</span><div>${esc(t.outcome) || '—'}</div><span>Duration</span><div>${dur(t.duration)}</div></div></div>`;
  if (st === 'lobby') return `<div class="phone">${spill('lobby')}<h3 style="margin:14px 0 4px">${esc(t.title)}</h3><div style="color:var(--muted)">${fmtDT(t.scheduledAt)} · ${t.plannedDuration} min · Host: ${esc(agentName(t.assignedAgent))}</div>
     <div class="plist" style="max-width:420px;margin:18px auto"><b>Invitees (${t.participants.length})</b>${t.participants.map(p => `<div class="prow" style="margin-top:6px">${avatar(p, 28)}<div><b>${esc(p)}</b></div></div>`).join('') || '<div class="empty">No invitees</div>'}</div>
     <button class="btn green" style="height:44px;padding:0 30px" data-act="join">${ic('video', 16)} ${t.status === 'IN_PROGRESS' ? 'Rejoin' : 'Join meeting'}</button>${t.assignedAgent && !isMine(t) ? `<div class="formerr show">Hosted by ${esc(agentName(t.assignedAgent))} – reassign to yourself to join.</div>` : !t.assignedAgent ? '<div class="formerr show">Claim or assign this meeting before joining.</div>' : ''}</div>`;
  if (st === 'joining') return `<div class="phone">${spill('joining')}<div style="margin:30px 0"><span class="spin"></span></div><h3>Joining ${esc(t.title)}…</h3></div>`;
  if (st === 'wrapup') return wrapMeeting(t, s);
  if (st === 'left') return `<div class="phone">${spill('left')}<h3 style="margin:16px 0 4px">You left the meeting</h3><div style="color:var(--muted)">The meeting is still open for other participants.</div><div class="ctrls"><button class="btn green" data-act="join">${ic('video', 15)} Rejoin</button><button class="btn red" data-act="mend">End meeting</button></div></div>`;
  const host = agentName(t.assignedAgent);
  return `<div style="padding:14px">${s.sharing ? `<div class="sharebar">${ic('share', 18)} Screen sharing active (simulated)<span class="sp"></span><button class="btn sm" data-act="mshare">Stop sharing</button></div>` : ''}
   <div style="display:flex;align-items:center;gap:10px">${spill('in_meeting')}<b class="timer" style="font-size:20px;margin:0" data-live="mtg" data-id="${t.id}">00:00</b><span style="color:var(--muted)">${s.parts.filter(p => p.state === 'connected').length + 1} in meeting</span></div>
   <div class="stage">${tileHTML(host + ' (You)', { cam: s.cam, mic: s.mic, state: 'connected' })}${s.parts.map(p => tileHTML(p.name, p)).join('')}</div>
   <div class="ctrls">${ctl('mmute', s.mic ? 'mic' : 'micoff', s.mic ? 'Mute' : 'Unmute', { on: !s.mic })}${ctl('mcam', s.cam ? 'video' : 'videooff', s.cam ? 'Camera' : 'Camera off', { on: !s.cam })}${ctl('mspk', 'vol', 'Speaker', { on: !s.speaker })}${ctl('mshare', 'share', 'Share', { on: s.sharing })}${ctl('mpanel-p', 'users', 'Participants', { on: s.panel === 'p' })}${ctl('mpanel-c', 'chat', 'Chat', { on: s.panel === 'c' })}${ctl('mleave', 'out', 'Leave')}${ctl('mend', 'phoneoff', 'End', { end: 1 })}</div>
   ${s.panel === 'p' ? `<div class="plist"><b>Participants</b>${[{ name: host + ' (You)', state: 'connected', mic: s.mic, cam: s.cam }, ...s.parts].map(p => `<div class="prow">${avatar(p.name, 28)}<div><b>${esc(p.name)}</b><small>${p.state === 'disconnected' ? 'Disconnected' : [p.speaking ? 'Speaking' : '', p.mic ? '' : 'Muted', p.cam ? 'Camera on' : 'Camera off'].filter(Boolean).join(' · ')}</small></div></div>`).join('')}</div>` : ''}
   ${s.panel === 'c' ? `<div class="plist"><b>Meeting chat</b><div class="chatbox" id="chatbox">${s.chat.map(m => `<div class="msg ${m.from === 'You' ? 'me' : ''}"><small>${esc(m.from)} · ${fmtTime(m.ts)}</small>${esc(m.text)}</div>`).join('') || '<div class="empty">No messages yet</div>'}</div><div style="display:flex;gap:8px;margin-top:8px"><input class="fi" id="chatIn" value="${esc(s.chatDraft)}" placeholder="Type a message…" aria-label="Chat message"><button class="btn primary" data-act="chatsend">${ic('send', 14)}</button></div></div>` : ''}</div>`;
}
function wrapMeeting(t, s) {
  const w = s.wrap;
  return `<div class="phone"><div style="margin-bottom:10px">${spill('wrapup')}</div><div class="wrapf"><h3 style="margin:8px 0">Meeting wrap-up</h3>
   <div class="stats"><div><small>Meeting duration</small><b>${dur(meetingElapsedMs(s) / 1000)}</b></div><div><small>Attendees</small><b>${Object.values(w.attended).filter(Boolean).length}/${Object.keys(w.attended).length}</b></div></div>
   <label for="w-outcome">Outcome *</label><select class="sel" style="width:100%" id="w-outcome"><option value="">Select an outcome…</option>${opts(MTG_OUTCOMES, w.outcome)}</select>
   <label>Attendance</label><div class="chk-list">${Object.keys(w.attended).map((n, i) => `<label class="inl" style="display:flex;gap:6px;align-items:center;font-weight:500;color:var(--text);margin:0"><input type="checkbox" data-att="${esc(n)}" ${w.attended[n] ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div>
   <label for="w-notes">Notes</label><textarea class="fi" id="w-notes" placeholder="Decisions, action items…">${esc(w.notes)}</textarea>
   <label class="inl" style="display:flex;gap:8px;align-items:center;font-weight:500;color:var(--text)"><input type="checkbox" id="w-fu" ${w.followup ? 'checked' : ''}> Create follow-up call task</label>
   ${w.followup ? `<div class="fg" style="margin-top:8px"><div><label>Date</label><input class="fi" type="date" id="w-fud" value="${esc(w.fuDate)}"></div><div><label>Time</label><input class="fi" type="time" id="w-fut" value="${esc(w.fuTime)}"></div></div>` : ''}
   <button class="btn primary" style="margin-top:18px;width:100%;justify-content:center" data-act="wrapmtg">Complete wrap-up</button></div></div>`;
}

/* =====================================================================
   MODALS
   ===================================================================== */
function openModal(html, wide) { const m = $('#modal'); m.innerHTML = `<div class="mbox" style="${wide ? 'width:min(720px,100%)' : ''}">${html}</div>`; m.classList.add('open'); const f = $('input,select,textarea', m); if (f && f.type !== 'hidden') setTimeout(() => f.focus(), 30); }
function closeModal() { $('#modal').classList.remove('open'); $('#modal').innerHTML = ''; }
const mHead = t => `<div class="mh"><h2>${t}</h2><button class="iconbtn" data-act="closem" aria-label="Close dialog">${ic('x', 18)}</button></div>`;
function formErr(msg) { const e = $('#formErr'); if (e) { e.textContent = msg; e.classList.add('show'); e.scrollIntoView({ block: 'nearest' }); } else toast(msg, 'error'); }
function modalRun(fn, okMsg) {
  try { const r = fn(); closeModal(); save(); render(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'success'); return r; }
  catch (e) { if (e instanceof UserError) { formErr(e.message); } else { console.error(e); formErr('Unexpected error: ' + e.message); } }
}
function confirmBox(title, msg, okLabel, fn, danger = true) {
  openModal(`${mHead(title)}<div class="mb"><p style="margin:0;line-height:1.5">${msg}</p></div><div class="mf"><button class="btn" data-act="closem">Keep</button><button class="btn ${danger ? 'red' : 'primary'}" id="confirmOk">${okLabel}</button></div>`);
  $('#confirmOk').onclick = () => { closeModal(); fn(); };
}

/* ----- assignment block ----- */
function readAssign(f) {
  const g = n => f.elements[n] ? f.elements[n].value : '';
  const m = f.querySelector('input[name=amode]:checked');
  return { mode: m ? m.value : 'direct', team: g('ateam'), queue: g('aqueue'), agentId: g('aagent') };
}
function assignBlockHTML(type, as, draft, allowNone) {
  const modes = [['direct', 'Direct (agent)'], ['team', 'Team pool'], ['queue', 'Queue pool'], ['auto', 'Auto assign'], ...(allowNone ? [['none', 'Leave unassigned']] : [])];
  const qs = QUEUES.filter(q => q.type === type);
  let h = `<div class="radios" role="radiogroup" aria-label="Assignment mode">${modes.map(([k, l]) => `<label><input type="radio" name="amode" value="${k}" ${as.mode === k ? 'checked' : ''}> ${l}</label>`).join('')}</div><div class="fg" style="margin-top:10px">`;
  if (as.mode === 'direct') h += `<div class="full"><label>${type === 'MEETING' ? 'Host agent' : 'Agent'}</label><select class="sel" style="width:100%" name="aagent"><option value="">Select an agent…</option>${AppState.agents.map(a => `<option value="${a.id}" ${as.agentId === a.id ? 'selected' : ''}>${esc(a.name)} — ${a.status} (${workload(a.id).total} active)</option>`).join('')}</select></div>`;
  if (as.mode === 'team' || as.mode === 'auto') h += `<div class="${as.mode === 'auto' ? '' : 'full'}"><label>Team${as.mode === 'auto' ? ' (optional filter)' : ''}</label><select class="sel" style="width:100%" name="ateam"><option value="">${as.mode === 'auto' ? 'Any team' : 'Select a team…'}</option>${opts(TEAMS.map(t => [t.id, t.name]), as.team)}</select></div>`;
  if (as.mode === 'queue' || as.mode === 'auto') h += `<div class="${as.mode === 'auto' ? '' : 'full'}"><label>Queue${as.mode === 'auto' ? ' (optional filter)' : ''}</label><select class="sel" style="width:100%" name="aqueue"><option value="">${as.mode === 'auto' ? 'Any queue' : 'Select a queue…'}</option>${opts(qs.map(q => [q.id, q.name + ' (' + teamName(q.team) + ')']), as.queue)}</select></div>`;
  h += '</div>';
  if (as.mode === 'auto') {
    const sc = scoreAgents(draft, { team: as.team || undefined, queue: as.queue || undefined }); const win = sc.find(r => r.eligible);
    h += `<table class="score"><tr><th>Agent</th><th title="30">Avail.</th><th title="30">Skill</th><th title="20">Load</th><th title="10">Prio</th><th title="10">Sched</th><th>Total</th></tr>${sc.map(r => `<tr class="${r.eligible ? '' : 'inel'} ${win && r === win ? 'win' : ''}"><td>${esc(r.agent.name)}${r.eligible ? '' : `<br><small style="color:var(--muted)">${esc(r.reasons.join(', '))}</small>`}</td><td>${r.parts.availability}</td><td>${r.parts.skill}</td><td>${r.parts.workload}</td><td>${r.parts.priority}</td><td>${r.parts.schedule}</td><td><b>${r.total}</b></td></tr>`).join('')}</table>${win ? `<div style="margin-top:8px;color:#15803d;font-weight:600">Will be assigned to ${esc(win.agent.name)} (score ${win.total}/100)</div>` : '<div class="formerr show">No eligible agent available for auto-assignment</div>'}`;
  }
  return h;
}
function mapAssign(as) {
  if (as.mode === 'none') return { assignment: undefined, team: null, queue: null };
  if (as.mode === 'team') return { assignment: { mode: 'team', team: as.team }, team: as.team || null, queue: null };
  if (as.mode === 'queue') return { assignment: { mode: 'queue', queue: as.queue }, team: as.queue ? queueObj(as.queue).team : null, queue: as.queue || null };
  if (as.mode === 'auto') return { assignment: { mode: 'auto', team: as.team || undefined, queue: as.queue || undefined }, team: as.team || null, queue: as.queue || null };
  return { assignment: { mode: 'direct', agentId: as.agentId }, team: null, queue: null };
}
function draftFromForm(f, type) {
  const at = parseDT(f.elements.date && f.elements.date.value, f.elements.time && f.elements.time.value);
  return { id: 'draft', type, priority: f.elements.priority ? f.elements.priority.value : 'NORMAL', scheduledAt: isNaN(at) ? now() : at, plannedDuration: f.elements.duration ? +f.elements.duration.value || 20 : 20, queue: null, assignedTeam: null };
}
function refreshAssign(f) {
  const box = $('#assignBox'); if (!box) return;
  const type = f.dataset.type || task(f.dataset.id).type; const as = readAssign(f);
  box.innerHTML = assignBlockHTML(type, as, f.dataset.id ? task(f.dataset.id) : draftFromForm(f, type), f.dataset.none === '1');
}

/* ----- create call / meeting ----- */
function openCreate(type, pre = {}) {
  const at = pre.at || nextSlot(), isC = type === 'CALL', c0 = AppState.customers[0];
  const contact = pre.customerId ? customer(pre.customerId) : c0;
  const people = [...new Set([contact.name, ...KNOWN_PEOPLE, ...AppState.agents.map(a => a.name)])];
  openModal(`${mHead(isC ? 'Create call task' : 'Schedule meeting')}<form id="cf" data-type="${type}" data-none="1" novalidate><div class="mb"><div class="fg">
   <div><label>Customer *</label><select class="sel" style="width:100%" name="cust">${AppState.customers.map(c => `<option value="${c.id}" ${c.id === contact.id ? 'selected' : ''}>${esc(c.name)} — ${esc(c.company)}</option>`).join('')}</select></div>
   ${isC ? `<div><label>Phone number *</label><input class="fi" name="phone" value="${esc(contact.phone)}" inputmode="tel"></div>
   <div class="full"><label>Call purpose *</label><input class="fi" name="title" placeholder="e.g. Renewal discussion"></div>` :
    `<div><label>Contact</label><input class="fi" name="contact" value="${esc(contact.name)}"></div><div class="full"><label>Meeting title *</label><input class="fi" name="title" placeholder="e.g. Product demo"></div><div class="full"><label>Description</label><textarea class="fi" name="desc" style="height:56px"></textarea></div>`}
   <div><label>Priority</label><select class="sel" style="width:100%" name="priority">${opts(PRIORITIES, pre.priority || 'NORMAL', p => PRI_LABEL[p])}</select></div>
   <div><label>Date *</label><input class="fi" type="date" name="date" value="${toDateInput(at)}"></div>
   <div><label>${isC ? 'Time *' : 'Start time *'}</label><input class="fi" type="time" name="time" value="${toTimeInput(at)}"></div>
   <div><label>Duration (min)</label><input class="fi" type="number" name="duration" min="5" step="5" value="${isC ? 20 : 30}"></div>
   ${isC ? '' : `<div><label>End time</label><input class="fi" type="time" name="end" value="${toTimeInput(at + 30 * MIN)}"></div><div class="full"><label>Participants</label><div class="chk-list">${people.map(p => `<label class="inl"><input type="checkbox" name="part" value="${esc(p)}" ${p === contact.name ? 'checked' : ''}> ${esc(p)}</label>`).join('')}</div></div>`}
   <div class="full"><label>Notes</label><textarea class="fi" name="notes" style="height:56px"></textarea></div>
   <div class="full"><label>Assignment</label><div id="assignBox"></div></div></div>
   <div class="formerr" id="formErr"></div></div><div class="mf"><button type="button" class="btn" data-act="closem">Cancel</button><button type="submit" class="btn primary">${isC ? 'Create call' : 'Schedule meeting'}</button></div></form>`, true);
  const f = $('#cf'); $('#assignBox').innerHTML = assignBlockHTML(type, { mode: 'direct', agentId: me().id }, draftFromForm(f, type), true);
}
function submitCreate(f) {
  const type = f.dataset.type, v = n => f.elements[n] ? f.elements[n].value : '';
  const at = parseDT(v('date'), v('time')), as = mapAssign(readAssign(f)), isC = type === 'CALL';
  const d = { type, title: v('title'), customerId: v('cust'), phone: v('phone'), contact: v('contact') || undefined, description: v('desc'), priority: v('priority'), scheduledAt: at, plannedDuration: +v('duration') || (isC ? 20 : 30), notes: v('notes'), team: as.team, queue: as.queue };
  if (!isC) {
    d.participants = [...f.querySelectorAll('input[name=part]:checked')].map(x => x.value);
    if (v('end')) { d.endAt = parseDT(v('date'), v('end')); if (d.endAt > at) d.plannedDuration = Math.round((d.endAt - at) / MIN); }
  }
  if (isC && !d.title.trim()) { /* engine validates */ }
  const r = modalRun(() => createTask(d, as.assignment), x => `${x.task.id} created${x.task.assignedAgent ? ' · assigned to ' + agentName(x.task.assignedAgent) : x.task.queue ? ' · routed to ' + queueName(x.task.queue) : x.task.assignedTeam ? ' · routed to ' + teamName(x.task.assignedTeam) : ' · unassigned'}`);
  if (r) { V.drawer = r.task.id; const dd = new Date(r.task.scheduledAt); V.miniM = { y: dd.getFullYear(), m: dd.getMonth() }; U.calDate = r.task.scheduledAt; render(); }
}
function openAssign(id) {
  const t = task(id), re = !!t.assignedAgent;
  openModal(`${mHead((re ? 'Reassign ' : 'Assign ') + esc(t.id))}<form id="af" data-id="${t.id}" novalidate><div class="mb"><div style="margin-bottom:12px;color:var(--muted)">${esc(t.title)} · ${esc(t.customer)}${re ? ` · currently ${esc(agentName(t.assignedAgent))}` : ''}</div><div id="assignBox"></div><div class="formerr" id="formErr"></div></div><div class="mf"><button type="button" class="btn" data-act="closem">Cancel</button><button type="submit" class="btn primary">${re ? 'Reassign' : 'Assign'}</button></div></form>`, true);
  $('#assignBox').innerHTML = assignBlockHTML(t.type, { mode: 'direct', agentId: '' }, t, false);
}
function openResched(id) {
  const t = task(id), at = Math.max(t.scheduledAt, nextSlot());
  openModal(`${mHead('Reschedule ' + esc(t.id))}<form id="rf" data-id="${t.id}" novalidate><div class="mb"><div class="fg"><div><label>Date *</label><input class="fi" type="date" name="date" value="${toDateInput(at)}"></div><div><label>Time *</label><input class="fi" type="time" name="time" value="${toTimeInput(at)}"></div>${t.type === 'MEETING' ? `<div><label>Duration (min)</label><input class="fi" type="number" name="duration" min="5" step="5" value="${t.plannedDuration}"></div>` : ''}<div class="full"><label>Reason</label><input class="fi" name="reason" placeholder="Optional"></div></div><div class="formerr" id="formErr"></div></div><div class="mf"><button type="button" class="btn" data-act="closem">Cancel</button><button type="submit" class="btn primary">Reschedule</button></div></form>`);
}
function openTransfer(id) {
  const s = AppState.calls[id]; if (!s || !['connected', 'hold', 'consult'].includes(s.state)) { toast('No active call to transfer', 'error'); return; }
  if (s.state === 'hold') { toast('Cannot transfer while call is on hold – resume the call first', 'error'); return; }
  openModal(`${mHead('Transfer call')}<form id="xf" data-id="${id}" novalidate><div class="mb"><div class="radios"><label><input type="radio" name="xtype" value="warm" checked> Warm (consult first)</label><label><input type="radio" name="xtype" value="cold"> Cold (blind transfer)</label></div>
   <div style="margin:12px 0"><input class="fi" id="xq" placeholder="Search agents, teams…" aria-label="Search agents"></div><div id="xlist">${xferList('')}</div><div class="formerr" id="formErr"></div></div><div class="mf"><button type="button" class="btn" data-act="closem">Cancel</button><button type="submit" class="btn primary">Transfer</button></div></form>`);
}
function xferList(q) {
  q = q.toLowerCase(); const L = AppState.agents.filter(a => a.id !== AppState.currentUserId && (a.name + ' ' + teamName(a.team) + ' ' + a.status).toLowerCase().includes(q));
  return `<table class="qtbl"><tr><th></th><th>Agent</th><th>Status</th><th>Team</th><th>Workload</th></tr>${L.map(a => `<tr><td><input type="radio" name="xagent" value="${a.id}" id="xa-${a.id}"></td><td><label for="xa-${a.id}">${avatar(a.name, 22)} ${esc(a.name)}</label></td><td>${pdot(a.status)} ${a.status}</td><td>${esc(teamName(a.team))}</td><td>${workload(a.id).total} active</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No agents match</td></tr>'}</table>`;
}
function openAddPart(id, newCall) {
  const s = AppState.calls[id]; if (!s || !['connected', 'hold'].includes(s.state)) { toast('No active call', 'error'); return; }
  const t = task(id);
  openModal(`${mHead(newCall ? 'New call (second party)' : 'Add participant')}<form id="pf" data-id="${id}" data-new="${newCall ? 1 : 0}" novalidate><div class="mb"><div class="fg"><div class="full"><label>Choose a contact</label><select class="sel" style="width:100%" name="who"><option value="">— or enter a number below —</option>${AppState.customers.map(c => `<option value="${esc(c.name)}|${esc(c.phone)}">${esc(c.name)} — ${esc(c.company)}</option>`).join('')}${AppState.agents.filter(a => a.id !== AppState.currentUserId).map((a, i) => `<option value="${esc(a.name)}|ext ${100 + i}">${esc(a.name)} (agent, ext ${100 + i})</option>`).join('')}</select></div><div class="full"><label>Phone number or extension</label><input class="fi" name="phone" placeholder="+1 415 555 0100"></div></div><p style="color:var(--muted);margin:10px 0 0">${newCall ? 'The customer is placed on hold while the new party is dialed.' : 'Up to 4 participants can be added to a conference.'}</p><div class="formerr" id="formErr"></div></div><div class="mf"><button type="button" class="btn" data-act="closem">Cancel</button><button type="submit" class="btn primary">Dial participant</button></div></form>`);
}

/* =====================================================================
   MENUS, ACTIONS, EVENTS
   ===================================================================== */
function showMenu(anchor, items) {
  const m = $('#menu');
  m.innerHTML = items.map(i => i === '-' ? '<hr>' : `<button class="${i.danger ? 'danger' : ''}" data-act="${i.act}" data-id="${esc(i.id || '')}" data-v="${esc(i.v || '')}">${i.ic ? ic(i.ic, 14) : ''}${i.l}</button>`).join('');
  m.classList.add('open');
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth * Z, h = m.offsetHeight * Z;
  let x = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)), y = r.bottom + 4; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 4);
  m.style.left = x / Z + 'px'; m.style.top = y / Z + 'px';
}
const hideMenu = () => $('#menu').classList.remove('open');

function doAct(a, id, el) {
  const t = id && task(id);
  switch (a) {
    case 'ws': V.drawer = null; navigate('#/task/' + id); break;
    case 'drawer': V.drawer = id; render(); break;
    case 'accept': run(() => acceptTask(id), 'Task accepted'); break;
    case 'decline': run(() => declineTask(id), 'Task declined and returned to the pool'); break;
    case 'claim': run(() => claimTask(id), 'Task claimed – it is now yours'); break;
    case 'release': run(() => releaseTask(id), 'Task released back to the pool'); break;
    case 'assign': openAssign(id); break;
    case 'resched': openResched(id); break;
    case 'cancel': confirmBox('Cancel task?', `<b>${esc(t.id)}</b> – ${esc(t.title)} will be marked as cancelled.`, 'Cancel task', () => run(() => cancelTask(id, 'cancelled by ' + me().name), 'Task cancelled')); break;
    case 'delete': confirmBox('Delete task?', `<b>${esc(t.id)}</b> and its activity history will be permanently removed.`, 'Delete', () => { if (V.drawer === id) V.drawer = null; const was = R.p === 'task'; run(() => deleteTask(id), 'Task deleted'); if (was) navigate('#/tasks'); }); break;
    /* call */
    case 'dial': { const n = $('#dialNum'); run(() => startCall(R.id, n ? n.value : ''), null); break; }
    case 'digit': run(() => dialDigit(R.id, el.dataset.v)); break;
    case 'bs': run(() => dialBack(R.id)); break;
    case 'clearnum': run(() => { const s = ensureCall(R.id); s.dial = ''; }); break;
    case 'endcall': confirmBox('End the call?', 'The call will end and wrap-up will start.', 'End call', () => run(() => endCall(R.id), 'Call ended – complete the wrap-up')); break;
    case 'mute': run(() => muteCall(R.id)); break;
    case 'hold': run(() => holdCall(R.id)); break;
    case 'resume': run(() => resumeCall(R.id)); break;
    case 'speaker': run(() => speakerCall(R.id)); break;
    case 'padtoggle': run(() => { const s = ensureCall(R.id); s.padOpen = !s.padOpen; }); break;
    case 'xfer': openTransfer(R.id); break;
    case 'xcomplete': run(() => completeTransfer(R.id), x => `Call transferred to ${x.name}`); break;
    case 'xcancel': run(() => cancelConsult(R.id), 'Consultation cancelled'); break;
    case 'addpart': openAddPart(R.id, false); break;
    case 'newcall': { const s = AppState.calls[R.id]; if (!s || s.state === 'idle') run(() => { ensureCall(R.id).dial = ''; }); else if (s.state === 'connected') { run(() => holdCall(R.id)); openAddPart(R.id, true); } else openAddPart(R.id, true); break; }
    case 'pmute': run(() => muteParticipant(R.id, id)); break;
    case 'premove': run(() => removeParticipant(R.id, id), 'Participant removed'); break;
    case 'endconf': confirmBox('End conference?', 'All added participants will be removed. The customer stays connected.', 'End conference', () => run(() => endConference(R.id), 'Conference ended')); break;
    case 'wrapcall': { const r = run(() => wrapUpCall(R.id), x => `Call wrapped up${x.followUp ? ' · follow-up ' + x.followUp.id + ' created' : ''}`); break; }
    /* meeting */
    case 'join': run(() => joinMeeting(R.id)); break;
    case 'mmute': run(() => muteMeeting(R.id)); break;
    case 'mcam': run(() => cameraMeeting(R.id)); break;
    case 'mspk': run(() => speakerMeeting(R.id)); break;
    case 'mshare': run(() => shareScreen(R.id)); break;
    case 'mpanel-p': run(() => panelMeeting(R.id, 'p')); break;
    case 'mpanel-c': run(() => panelMeeting(R.id, 'c')); break;
    case 'chatsend': { const i = $('#chatIn'); run(() => sendChat(R.id, i ? i.value : '')); const c = $('#chatIn'); if (c) c.focus(); break; }
    case 'mleave': run(() => leaveMeeting(R.id), 'You left the meeting'); break;
    case 'mend': confirmBox('End the meeting?', 'The meeting ends for everyone and wrap-up starts.', 'End meeting', () => run(() => endMeeting(R.id), 'Meeting ended – complete the wrap-up')); break;
    case 'wrapmtg': run(() => wrapUpMeeting(R.id), x => `Meeting wrapped up${x.followUp ? ' · follow-up ' + x.followUp.id + ' created' : ''}${x.resched ? ' · reschedule it from the task menu' : ''}`); break;
    case 'wstab': U.wsTab = el.dataset.v; render(); break;
    case 'back': if (location.hash && history.length > 1) history.back(); else navigate('#/tasks'); break;
  }
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'), a = el && el.dataset.act;
  if (!e.target.closest('#menu') && !(el && ['rowmenu', 'createmenu', 'presmenu', 'avatar'].includes(a))) hideMenu();
  if (!e.target.closest('#notifPop') && !(el && a === 'notif')) $('#notifPop').classList.remove('open');
  if (!e.target.closest('.searchwrap')) $('#sres').classList.remove('open');
  if (V.moreOpen && !e.target.closest('#morePop,#fmore')) { V.moreOpen = false; const p = $('#morePop'); if (p) p.classList.remove('open'); }
  if (e.target.id === 'modal') { closeModal(); return; }
  if (!el) return;
  const id = el.dataset.id, v = el.dataset.v;
  if (['rowmenu', 'createmenu', 'presmenu', 'avatar', 'notif'].includes(a) || el.tagName === 'INPUT') { /* handled below */ }
  switch (a) {
    case 'nav': V.drawer = null; if (v === 'tasks' || v === 'calls' || v === 'meetings' || v === 'unassigned') go(v, v === 'calls' ? { type: 'CALL' } : v === 'meetings' ? { type: 'MEETING' } : {}); else { V.drawer = null; navigate('#/' + v); } break;
    case 'tview': if (v === 'day') { V.tview = 'calendar'; U.calMode = 'day'; } else if (v === 'calendar') { V.tview = 'calendar'; if (U.calMode === 'day') U.calMode = 'week'; } else V.tview = v; save(); render(); break;
    case 'tab': F().tab = v; V.pg.main = 1; render(); break;
    case 'sort': { const f = F(); f.sortDir = (f.sortBy || 'scheduled') === v && f.sortDir !== 'desc' ? 'desc' : 'asc'; f.sortBy = v; render(); break; }
    case 'pg': V.pg[el.dataset.k] = +v; render(); break;
    case 'more': V.moreOpen = !V.moreOpen; { const p = $('#morePop'); if (p) p.classList.toggle('open', V.moreOpen); } break;
    case 'clearf': { const f = F(), keep = fkey(); delete AppState.filters[keep]; const nf = filtersFor(keep); if (keep === 'calls') nf.type = 'CALL'; if (keep === 'meetings') nf.type = 'MEETING'; V.teamAgent = ''; render(); break; }
    case 'rowmenu': V.moreOpen = false; showMenu(el, menuItems(task(id))); e.stopPropagation(); break;
    case 'createmenu': showMenu(el, [{ l: 'New call task', ic: 'phone', act: 'newcall-m' }, { l: 'Schedule meeting', ic: 'video', act: 'newmtg-m' }]); e.stopPropagation(); break;
    case 'newcall-m': hideMenu(); openCreate('CALL'); break;
    case 'newmtg-m': hideMenu(); openCreate('MEETING'); break;
    case 'presmenu': showMenu(el, PRESENCE.map(p => ({ l: `<i class="pdot" style="background:${p.color}"></i>&nbsp;${p.id}`, act: 'setpres', v: p.id }))); e.stopPropagation(); break;
    case 'setpres': hideMenu(); run(() => setPresence(me().id, v), `Presence set to ${v}`); break;
    case 'avatar': showMenu(el, [{ l: `${me().name} (${isSup() ? 'Supervisor' : 'Agent'})`, act: 'noop' }, '-', { l: isSup() ? 'Switch to Agent role' : 'Switch to Supervisor role', ic: 'users', act: 'role', v: isSup() ? 'agent' : 'supervisor' }, { l: 'Settings & demo controls', ic: 'gear', act: 'nav', v: 'settings' }, '-', { l: 'Reset demo data', ic: 'refresh', act: 'reset' }]); e.stopPropagation(); break;
    case 'role': hideMenu(); AppState.role = v; if (v === 'agent' && R.p === 'team') navigate('#/dashboard'); save(); render(); toast(`Role: ${v === 'agent' ? 'Agent' : 'Supervisor'}`, 'info'); break;
    case 'reset': hideMenu(); confirmBox('Reset demo data?', 'All tasks, activity and settings return to the seeded sample data.', 'Reset', () => { resetDemo(); V.drawer = null; V.pg = {}; navigate('#/tasks'); toast('Demo data restored', 'success'); }); break;
    case 'notif': $('#notifPop').classList.toggle('open'); break;
    case 'readall': AppState.notifications.forEach(n => { if (n.to === AppState.currentUserId) n.read = true; }); save(); renderTop(); break;
    case 'clearnotes': AppState.notifications = AppState.notifications.filter(n => n.to !== AppState.currentUserId); save(); renderTop(); break;
    case 'note': { const n = AppState.notifications.find(x => x.id === id); if (n) { n.read = true; if (n.taskId && task(n.taskId)) V.drawer = n.taskId; } $('#notifPop').classList.remove('open'); save(); render(); break; }
    case 'drawerclose': V.drawer = null; render(); break;
    case 'answer': acceptIncoming(); break;
    case 'decline-in': run(() => declineIncoming()); break;
    case 'pick': U.calDate = +v; { const d = new Date(+v); V.miniM = { y: d.getFullYear(), m: d.getMonth() }; } save(); render(); break;
    case 'gotoday': U.calDate = now(); { const d = new Date(); V.miniM = { y: d.getFullYear(), m: d.getMonth() }; } save(); render(); break;
    case 'mm': { let m = V.miniM.m + +v, y = V.miniM.y; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; V.miniM = { y, m }; render(); break; }
    case 'quick': if (v === 'call') openCreate('CALL'); else if (v === 'meeting') openCreate('MEETING'); else if (v === 'my') { V.tview = 'list'; F().tab = 'my'; render(); } else { V.tview = 'calendar'; render(); } break;
    case 'calmode': U.calMode = v; save(); render(); break;
    case 'calscope': U.calScope = v; save(); render(); break;
    case 'calnav': { const m = U.calMode === 'month' ? 'month' : U.calMode === 'day' ? 'day' : 'week', d = new Date(U.calDate); if (m === 'month') d.setMonth(d.getMonth() + +v); else d.setDate(d.getDate() + +v * (m === 'week' ? 7 : 1)); U.calDate = d.getTime(); { V.miniM = { y: d.getFullYear(), m: d.getMonth() }; } save(); render(); break; }
    case 'dayfrom': U.calDate = +v; U.calMode = 'day'; save(); render(); e.stopPropagation(); break;
    case 'mcell': U.calDate = +v; { const d = new Date(+v); V.miniM = { y: d.getFullYear(), m: d.getMonth() }; } save(); render(); break;
    case 'slot': { const r = el.getBoundingClientRect(), y = (e.clientY - r.top) / Z, mins = Math.max(0, Math.floor(y / CAL_H * 4) * 15); openCreate('CALL', { at: Math.max(+v + CAL_START * HOUR + mins * MIN, nextSlot()) }); break; }
    case 'dscope': U.dashScope = v; save(); render(); break;
    case 'kpi': go('tasks', JSON.parse(el.dataset.p)); break;
    case 'queuego': { const f = F(); f.queue = v; V.pg = {}; if (R.p === 'dashboard') go('unassigned', { queue: v }); else render(); break; }
    case 'teamagent': V.teamAgent = V.teamAgent === v ? '' : v; V.pg = {}; render(); break;
    case 'autonext': { const t = AppState.tasks.filter(x => x.status === 'UNASSIGNED').sort((a, b) => PRI_RANK[a.priority] - PRI_RANK[b.priority] || a.scheduledAt - b.scheduledAt)[0]; if (!t) toast('Nothing is waiting for assignment', 'info'); else run(() => autoAssignTask(t.id), x => `${t.id} auto-assigned to ${x.agent.name} (score ${x.auto.total}/100)`); break; }
    case 'closem': closeModal(); break;
    /* demo */
    case 'd-incoming': run(() => simulateIncomingCall(), 'Incoming call simulated'); break;
    case 'd-connect': { const t = AppState.tasks.find(x => x.type === 'CALL' && AppState.calls[x.id] && ['dialing', 'ringing'].includes(AppState.calls[x.id].state)); if (!t) toast('No call is dialing or ringing', 'warn'); else run(() => connectCall(t.id)); break; }
    case 'd-endcall': { const t = AppState.tasks.find(x => x.type === 'CALL' && AppState.calls[x.id] && ['dialing', 'ringing', 'connected', 'hold', 'consult'].includes(AppState.calls[x.id].state)); if (!t) toast('No live call', 'warn'); else run(() => customerEnds(t.id, AppState.calls[t.id].connectedAt ? 'Successful' : 'No Answer')); break; }
    case 'd-mtgstart': { const t = AppState.tasks.filter(x => x.type === 'MEETING' && isMine(x) && ['ASSIGNED', 'ACCEPTED', 'RESCHEDULED'].includes(x.status)).sort((a, b) => a.scheduledAt - b.scheduledAt)[0]; if (!t) toast('No meeting of yours is ready to start', 'warn'); else if (run(() => joinMeeting(t.id)) !== undefined) navigate('#/task/' + t.id); break; }
    case 'd-mtgend': { const t = AppState.tasks.find(x => x.type === 'MEETING' && AppState.meetings[x.id] && ['in_meeting', 'left', 'joining'].includes(AppState.meetings[x.id].state)); if (!t) toast('No live meeting', 'warn'); else { run(() => endMeeting(t.id)); navigate('#/task/' + t.id); } break; }
    case 'd-auto': { const t = AppState.tasks.find(x => x.status === 'UNASSIGNED'); if (!t) toast('No unassigned tasks', 'warn'); else run(() => autoAssignTask(t.id), x => `${t.id} auto-assigned to ${x.agent.name}`); break; }
    case 'd-reassign': { const t = AppState.tasks.find(x => x.assignedAgent && !isTerminal(x) && !isLive(x) && x.assignedAgent !== me().id) || AppState.tasks.find(x => x.assignedAgent && !isTerminal(x) && !isLive(x)); if (!t) { toast('No task to reassign', 'warn'); break; } const to = AppState.agents.find(a => a.id !== t.assignedAgent && isAvail(a)); run(() => assignTask(t.id, { mode: 'direct', agentId: to.id }, { reassign: true }), `${t.id} reassigned to ${to.name}`); break; }
    case 'd-xfer': { const t = AppState.tasks.find(x => x.assignedAgent && x.assignedAgent !== me().id && !isTerminal(x) && !isLive(x)); if (!t) { toast('No suitable task', 'warn'); break; } const from = agentName(t.assignedAgent); t.assignedAgent = me().id; t.status = 'ASSIGNED'; t.sub = t.type === 'MEETING' ? 'SCHEDULED' : null; logEvent(t.id, 'transferred', `Transfer request from ${from} to ${me().name}`, t.assignedAgent); notify(me().id, 'transfer', `Transfer request: ${t.id} ${t.customer} transferred from ${from}`, t.id); save(); render(); break; }
    case 'd-note': notify(me().id, 'system', 'Demo notification: system maintenance window tonight at 22:00', null); save(); render(); break;
    case 'd-setpres': run(() => setPresence($('#d-agent').value, $('#d-pres').value), 'Presence updated'); break;
    case 'srch-task': $('#sres').classList.remove('open'); $('#gsearch').value = ''; V.drawer = id; render(); break;
    case 'srch-cust': $('#sres').classList.remove('open'); $('#gsearch').value = ''; go('tasks', { q: v }); break;
    case 'srch-agent': $('#sres').classList.remove('open'); $('#gsearch').value = ''; go('tasks', { agent: v }); break;
    default: doAct(a, id, el);
  }
});

/* ----- inputs ----- */
document.addEventListener('input', e => {
  const t = e.target, id = t.id;
  if (id === 'gsearch') globalSearch(t.value);
  else if (id === 'fq') { F().q = t.value; V.pg = {}; render(); }
  else if (id === 'actq') { V.actQ = t.value; render(); }
  else if (id === 'dialNum') { t.value = t.value.replace(/[^0-9+*#() \-]/g, ''); ensureCall(R.id).dial = t.value; save(); }
  else if (id === 'notes') { const k = task(R.id); if (k) { k.notes = t.value.slice(0, 20000); save(); } }
  else if (id === 'chatIn') { const s = AppState.meetings[R.id]; if (s) s.chatDraft = t.value; }
  else if (id === 'w-notes') { const s = AppState.calls[R.id] || AppState.meetings[R.id]; if (s && s.wrap) s.wrap.notes = t.value; save(); }
  else if (id === 'w-fud' || id === 'w-fut') { const s = AppState.calls[R.id] || AppState.meetings[R.id]; if (s && s.wrap) s.wrap[id === 'w-fud' ? 'fuDate' : 'fuTime'] = t.value; save(); }
  else if (id === 'xq') $('#xlist').innerHTML = xferList(t.value);
  else if (t.closest('#cf')) linkCreate(t);
});
function linkCreate(t) {
  const f = $('#cf'); if (!f || !f.elements.end) { if (f) refreshAssign(f); return; }
  const at = parseDT(f.elements.date.value, f.elements.time.value);
  if (['date', 'time', 'duration'].includes(t.name) && !isNaN(at)) f.elements.end.value = toTimeInput(at + (+f.elements.duration.value || 30) * MIN);
  if (t.name === 'end' && !isNaN(at)) { const en = parseDT(f.elements.date.value, t.value); if (en > at) f.elements.duration.value = Math.round((en - at) / MIN); }
}
document.addEventListener('change', e => {
  const t = e.target, id = t.id, f = t.closest('form');
  const fmap = { fprio: 'priority', fstat: 'status', ftype: 'type', fassign: 'assignment', fdate: 'date', ffrom: 'from', fto: 'to', fqueue: 'queue' };
  if (fmap[id]) { F()[fmap[id]] = t.value; V.pg = {}; V.moreOpen = true; if (id === 'fprio' || id === 'fstat') V.moreOpen = false; render(); }
  else if (id === 'fagent') { F().agent = t.value; if (R.p === 'team') V.teamAgent = t.value; V.pg = {}; V.moreOpen = true; render(); }
  else if (id === 'actf') { U.actFilter = t.value; render(); }
  else if (id === 'setcall') { AppState.prefs.callBehavior = t.value; save(); toast('Far-end behaviour updated', 'success'); }
  else if (id === 'setpres') run(() => setPresence(me().id, t.value), 'Presence updated');
  else if (id === 'w-outcome') { const s = AppState.calls[R.id] || AppState.meetings[R.id]; if (s && s.wrap) { s.wrap.outcome = t.value; if (t.value === 'Follow-up Required') s.wrap.followup = true; save(); render(); } }
  else if (id === 'w-disp') { const s = AppState.calls[R.id]; if (s) s.wrap.disposition = t.value; save(); }
  else if (id === 'w-fu') { const s = AppState.calls[R.id] || AppState.meetings[R.id]; if (s && s.wrap) { s.wrap.followup = t.checked; save(); render(); } }
  else if (t.dataset.att !== undefined) { const s = AppState.meetings[R.id]; if (s) { s.wrap.attended[t.dataset.att] = t.checked; save(); render(); } }
  else if (f && f.id === 'cf') {
    if (t.name === 'cust') { const c = customer(t.value); if (f.elements.phone) f.elements.phone.value = c.phone; if (f.elements.contact) f.elements.contact.value = c.name; const part = [...f.querySelectorAll('input[name=part]')]; const old = part.find(x => x.checked && AppState.customers.some(cc => cc.name === x.value)); if (old) old.checked = false; const nw = part.find(x => x.value === c.name); if (nw) nw.checked = true; }
    linkCreate(t); refreshAssign(f);
  } else if (f && f.id === 'af') refreshAssign(f);
});
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target;
  if (f.id === 'cf') submitCreate(f);
  else if (f.id === 'af') { const id = f.dataset.id, t = task(id), as = mapAssign(readAssign(f)); modalRun(() => assignTask(id, { ...as.assignment, reassign: !!t.assignedAgent }), r => r.mode === 'auto' ? `${id} auto-assigned to ${r.agent.name} (score ${r.auto.total}/100)` : r.agent ? `${id} assigned to ${r.agent.name}` : `${id} routed to pool`); }
  else if (f.id === 'rf') { const id = f.dataset.id, v = n => f.elements[n] ? f.elements[n].value : ''; modalRun(() => rescheduleTask(id, { scheduledAt: parseDT(v('date'), v('time')), plannedDuration: +v('duration') || 0, reason: v('reason') }), `${id} rescheduled`); }
  else if (f.id === 'xf') { const id = f.dataset.id, ag = f.querySelector('input[name=xagent]:checked'), ty = f.querySelector('input[name=xtype]:checked').value; modalRun(() => transferCall(id, ag ? ag.value : '', ty === 'cold' ? 'cold' : 'warm'), () => ty === 'cold' ? 'Call transferred (cold)' : 'Consulting – customer on hold'); }
  else if (f.id === 'pf') { const id = f.dataset.id, v = n => f.elements[n].value; let name = '', phone = v('phone'); if (v('who')) { [name, phone] = v('who').split('|'); if (v('phone')) phone = v('phone'); } modalRun(() => addParticipant(id, { name, phone, newCall: f.dataset.new === '1' }), 'Dialing participant…'); }
});
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName);
  if (e.key === 'Escape') { if ($('#modal').classList.contains('open')) closeModal(); else if (V.drawer) { V.drawer = null; render(); } hideMenu(); $('#sres').classList.remove('open'); $('#notifPop').classList.remove('open'); if (document.activeElement === $('#gsearch')) $('#gsearch').blur(); return; }
  if (e.key === 'Enter' && e.target.id === 'dialNum') { e.preventDefault(); doAct('dial', R.id); return; }
  if (e.key === 'Enter' && e.target.id === 'chatIn') { e.preventDefault(); doAct('chatsend', R.id); return; }
  if (e.key === 'Enter' && (e.target.classList.contains('trow') || e.target.classList.contains('kcard') || e.target.classList.contains('ev') || e.target.classList.contains('d'))) { e.target.click(); return; }
  if (e.key === '/' && !typing) { e.preventDefault(); $('#gsearch').focus(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#gsearch').focus(); return; }
  if (e.altKey && e.key.toLowerCase() === 'c') { e.preventDefault(); openCreate('CALL'); }
  if (e.altKey && e.key.toLowerCase() === 'm') { e.preventDefault(); openCreate('MEETING'); }
  if (e.key === 'Tab' && $('#modal').classList.contains('open')) { const els = $$('#modal button,#modal input,#modal select,#modal textarea').filter(x => !x.disabled); if (els.length) { const i = els.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); els[els.length - 1].focus(); } else if (!e.shiftKey && i === els.length - 1) { e.preventDefault(); els[0].focus(); } } }
});
function globalSearch(v) {
  const box = $('#sres'); v = v.trim().toLowerCase(); if (!v) { box.classList.remove('open'); return; }
  const ts = AppState.tasks.filter(t => `${t.id} ${t.title} ${t.customer} ${t.company} ${t.phone} ${agentName(t.assignedAgent)}`.toLowerCase().includes(v)).slice(0, 6);
  const cs = AppState.customers.filter(c => `${c.name} ${c.company} ${c.phone}`.toLowerCase().includes(v)).slice(0, 3);
  const as = AppState.agents.filter(a => a.name.toLowerCase().includes(v)).slice(0, 3);
  box.innerHTML = (ts.length ? '<small style="padding:6px 8px;color:var(--muted);display:block">Tasks</small>' + ts.map(t => `<div class="sr" data-act="srch-task" data-id="${t.id}" tabindex="0">${tBox(t, 30)}<div><b>${esc(t.title)}</b><small>${esc(t.id)} · ${esc(t.customer)} · ${fmtDT(t.scheduledAt)}</small></div><span style="margin-left:auto">${stPill(t)}</span></div>`).join('') : '') +
    (cs.length ? '<small style="padding:6px 8px;color:var(--muted);display:block">Customers</small>' + cs.map(c => `<div class="sr" data-act="srch-cust" data-v="${esc(c.name)}" tabindex="0">${avatar(c.name, 30)}<div><b>${esc(c.name)}</b><small>${esc(c.company)} · ${esc(c.phone)}</small></div></div>`).join('') : '') +
    (as.length ? '<small style="padding:6px 8px;color:var(--muted);display:block">Agents</small>' + as.map(a => `<div class="sr" data-act="srch-agent" data-v="${a.id}" tabindex="0">${avatar(a.name, 30)}<div><b>${esc(a.name)}</b><small>${pdot(a.status)} ${a.status} · ${esc(teamName(a.team))}</small></div></div>`).join('') : '') || '<div class="empty">No matches found</div>';
  box.classList.add('open');
}

/* ----- kanban drag & drop ----- */
let dragId = null;
document.addEventListener('dragstart', e => { const c = e.target.closest('.kcard'); if (!c) return; dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
document.addEventListener('dragend', () => { $$('.kcard.dragging').forEach(c => c.classList.remove('dragging')); $$('.kcol.over').forEach(c => c.classList.remove('over')); dragId = null; });
document.addEventListener('dragover', e => { const c = e.target.closest('.kcol'); if (c && dragId) { e.preventDefault(); $$('.kcol.over').forEach(x => x !== c && x.classList.remove('over')); c.classList.add('over'); } });
document.addEventListener('drop', e => {
  const c = e.target.closest('.kcol'); if (!c || !dragId) return; e.preventDefault();
  const t = task(dragId), col = c.dataset.col; dragId = null;
  if (col === 'accepted') { if (t.status === 'UNASSIGNED') run(() => claimTask(t.id), 'Task claimed'); else if (['ASSIGNED', 'RESCHEDULED'].includes(t.status)) run(() => acceptTask(t.id), 'Task accepted'); else toast('Nothing to do – use the workspace to progress this task', 'info'); }
  else if (col === 'unassigned') { if (['ASSIGNED', 'ACCEPTED', 'RESCHEDULED'].includes(t.status)) run(() => releaseTask(t.id), 'Released to pool'); else toast('Only unstarted tasks can be released', 'info'); }
  else if (col === 'progress') toast('Open the workspace and Dial / Join to start this task', 'info');
  else toast('Tasks are completed from the workspace wrap-up', 'info');
  render();
});

/* ----- boot ----- */
$('#ic-search').innerHTML = ic('search', 16); $('#ic-bell').innerHTML = ic('bell', 20); $('#ic-clock').innerHTML = ic('clock', 20); $('#ic-plus').innerHTML = ic('plus', 14, 2.6); $('#ic-cd').innerHTML = ic('cd', 13);
loadState(); resumeSims(); parseRoute();
window.addEventListener('hashchange', () => { V.moreOpen = false; render(); $('#main').scrollTop = 0; });
render(); tickClock(); setInterval(tickClock, 1000); setTimeout(systemTick, 2500); setInterval(systemTick, 20000);
window.addEventListener('beforeunload', saveNow);
