/* Campaigns - outbound campaign overview, performance comparison, lead lists (with CSV import) and compliance. */
(function () {
  var UI = window.UI, f = UI.f, T = MCM.T, esc = UI.esc, CEIL = 3, WIN = [8, 21];
  var C = MCM.campaigns, STAT = { Running: 'ok', Paused: 'warn', Scheduled: 'info', Completed: '' };
  var HOURS = []; for (var hh = WIN[0]; hh < WIN[1]; hh++) HOURS.push(hh);
  var HW = { 8: .6, 9: 1, 10: 1.1, 11: 1.1, 12: .8, 13: .7, 14: 1, 15: 1.1, 16: 1.1, 17: 1.2, 18: 1, 19: .7, 20: .4 };
  var HF = { 8: .8, 9: .9, 10: 1, 11: 1.05, 12: .95, 13: .9, 14: 1, 15: 1.05, 16: 1.1, 17: 1.2, 18: 1.25, 19: 1.2, 20: 1 };

  /* persisted overrides (status changes, imported leads) - applied once at load */
  var st0 = MCM.store.get('cpState', {});
  C.forEach(function (c) { var s = st0[c.id]; c.imp = { added: 0, dnc: 0 }; if (s) { if (s.status) c.status = s.status; if (s.imp) { c.imp = s.imp; c.leads += s.imp.added; c.dnc += s.imp.dnc; } } });
  function cpSave() { var o = {}; C.forEach(function (c) { o[c.id] = { status: c.status, imp: c.imp }; }); MCM.store.set('cpState', o); }
  function flags() { var d = MCM.store.get('cpFlags', {}); C.forEach(function (c) { if (!d[c.id]) d[c.id] = { consent: c.id !== 'cp5', disclosure: true, scrub: true }; }); return d; }

  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  /* abandon rate: abandoned / (connected + abandoned). Preview dialling never abandons. */
  function abRate(c) { var d = c.connected + c.abandoned; return c.type === 'Preview' || !d ? 0 : c.abandoned / d * 100; }
  function dialled(c) { return c.type !== 'Preview' && c.attempts > 0; }
  function ownerName(c) { var a = MCM.aById[c.owner]; return a ? a.name : '-'; }
  function breakdown(c) {
    var avail = c.leads - c.dnc, conn = Math.min(c.connected, avail), inval = Math.round(c.noAnswer * 0.06), att = Math.min(avail, Math.max(conn + inval, Math.round(c.attempts / 1.5)));
    var rest = Math.max(0, att - conn - inval), exh = c.status === 'Completed' ? rest : Math.round(rest * 0.3), onlyAtt = rest - exh;
    return { fresh: Math.max(0, avail - att), attempted: onlyAtt, connected: conn, dnc: c.dnc, invalid: inval, exhausted: exh, remaining: Math.max(0, avail - att) + onlyAtt, touched: att };
  }
  function hourly(c) {
    var r = MCM.rng(hash(c.id)), w = HOURS.map(function (h) { return HW[h] * (0.92 + r() * 0.16); }), ws = w.reduce(function (s, x) { return s + x; }, 0), att = w.map(function (x) { return Math.floor(c.attempts * x / ws); });
    att[HOURS.indexOf(17)] += c.attempts - att.reduce(function (s, x) { return s + x; }, 0);
    var raw = att.map(function (a, i) { return a * HF[HOURS[i]] * (0.95 + r() * 0.1); }), rs = raw.reduce(function (s, x) { return s + x; }, 0) || 1, con = raw.map(function (x, i) { return Math.min(att[i], Math.round(x * c.connected / rs)); });
    return { att: att, con: con, rate: att.map(function (a, i) { return a ? con[i] / a * 100 : null; }) };
  }
  function agentHours(c) { return (c.connected * (c.talk + 40) + c.noAnswer * 18 + c.machine * 20) / 3600; }
  function winOpen() { var h = T.hourOf(Date.now()); return h >= WIN[0] && h < WIN[1]; }
  function pct(a, b) { return b ? a / b * 100 : 0; }

  function setStatus(ctx, c, to) {
    if (!MCM.can('supervise')) return MCM.deny('start, pause or resume campaigns');
    var go = function () { var from = c.status; c.status = to; cpSave(); MCM.audit('Campaign ' + (to === 'Paused' ? 'paused' : from === 'Paused' ? 'resumed' : 'started'), c.name + ' (' + from + ' -> ' + to + ')'); UI.toast(esc(c.name) + ' is now ' + to.toLowerCase(), { kind: 'ok' }); UI.closeDrawer(true); ctx.refresh(); };
    if (to === 'Running' && !winOpen()) UI.confirm('It is outside the permitted calling window (' + WIN[0] + ':00-' + WIN[1] + ':00, ' + esc(MCM.settings.tz) + '). Starting "' + esc(c.name) + '" now could breach calling-hours rules. Start anyway?', 'Start anyway').then(function (ok) { if (ok) go(); });
    else go();
  }
  function ctl(c) {
    if (c.status === 'Running') return '<button class="btn xs" data-cp-act="Paused" data-id="' + c.id + '">Pause</button>';
    if (c.status === 'Paused') return '<button class="btn xs pri" data-cp-act="Running" data-id="' + c.id + '">Resume</button>';
    if (c.status === 'Scheduled') return '<button class="btn xs pri" data-cp-act="Running" data-id="' + c.id + '">Start</button>';
    return '<span class="faint">-</span>';
  }
  function byId(id) { return C.filter(function (c) { return c.id === id; })[0]; }

  function drawer(ctx, c) {
    var b = breakdown(c), hr = hourly(c), g = c.attempts, team = (MCM.aById[c.owner] || {}).team, ags = MCM.agents.filter(function (a) { return a.role === 'Agent' && a.team === team; }).slice(0, 8), ab = abRate(c);
    var body = UI.drawer(esc(c.name), '<div class="grid g3">' + [UI.kpi({ label: 'Connect rate', value: f.pct(pct(c.connected, g)), sub: f.n(c.connected) + ' of ' + f.n(g) + ' attempts' }), UI.kpi({ label: 'Abandon rate', value: c.type === 'Preview' ? 'n/a' : f.pct(ab, 2), status: ab > CEIL ? 'bad' : ab > CEIL * .8 ? 'warn' : 'ok', sub: 'ceiling ' + CEIL + '%' }), UI.kpi({ label: 'Answering machine', value: f.pct(pct(c.machine, g)), sub: f.n(c.machine) + ' calls' })].join('') + '</div>' +
      '<div class="mt">' + UI.card('Disposition mix', '<div id="dpD"></div>') + '</div><div class="mt">' + UI.card('Attempts by hour', '<div id="dpH"></div>', { sub: 'Derived from the campaign totals and a typical dialling profile.' }) + '</div>' +
      '<div class="mt">' + UI.card('Agents on this campaign', ags.length ? '<ul class="plain">' + ags.map(function (a) { var s = MCM.live.agents[a.id] ? MCM.live.agents[a.id].status : 'offline'; return '<li style="display:flex;justify-content:space-between;align-items:center"><span>' + esc(a.name) + ' <span class="muted">' + a.ext + '</span></span>' + UI.status(s) + '</li>'; }).join('') + '</ul>' : UI.empty('No agents'), { sub: 'Owner ' + esc(ownerName(c)) + ' - ' + esc(team || '-') + ' team (live status).' }) + '</div>' +
      '<div class="mt"><div class="muted" style="margin-bottom:.6rem">Lead list: ' + f.n(c.leads) + ' leads - ' + f.n(b.remaining) + ' still dialable, ' + f.n(b.dnc) + ' on DNC.</div>' + (c.status === 'Completed' ? '' : ctl(c).replace('btn xs', 'btn')) + '</div>', { sub: UI.tag(c.type, 'brand').replace(/'/g, "'") + ' ' + UI.tag(c.status, STAT[c.status]) });
    var node = function (id) { return body.querySelector('#' + id); };
    UI.donut(node('dpD'), { items: [{ name: 'Connected (live person)', value: c.connected, color: 'var(--c3)' }, { name: 'Answering machine', value: c.machine, color: 'var(--c4)' }, { name: 'No answer / busy', value: c.noAnswer, color: 'var(--c6)' }, { name: 'Abandoned', value: c.abandoned, color: 'var(--c5)' }], center: { v: f.n(g), l: 'attempts' } });
    UI.chart(node('dpH'), { type: 'bar', labels: HOURS.map(function (h) { return h + ':00'; }), height: 18, series: [{ name: 'Attempts', data: hr.att, color: 'var(--c2)' }, { name: 'Connect %', axis: 'r', type: 'line', color: 'var(--c3)', data: hr.rate.map(function (v) { return v == null ? null : +v.toFixed(1); }), fmt: function (v) { return f.pct(v); } }], fmt2: function (v) { return v.toFixed(0) + '%'; } });
    body.onclick = function (e) { var el = e.target.closest('[data-cp-act]'); if (el) setStatus(ctx, byId(el.dataset.id), el.dataset.cpAct); };
  }

  /* ---------- CSV parsing for lead import ---------- */
  function parseLeads(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean), res = { rows: 0, valid: 0, dup: 0, invalid: 0, dnc: 0, header: false };
    if (!lines.length) return res;
    var split = function (l) { return l.split(',').map(function (x) { return x.trim().replace(/^"|"$/g, ''); }); }, first = split(lines[0]).map(function (x) { return x.toLowerCase(); }), pi = 0, di = -1, ci = -1;
    if (first.some(function (x) { return /^(phone|number|mobile|msisdn|tel)/.test(x); })) { res.header = true; first.forEach(function (x, i) { if (/^(phone|number|mobile|msisdn|tel)/.test(x)) pi = i; if (x === 'dnc') di = i; if (/consent/.test(x)) ci = i; }); lines.shift(); }
    var seen = {}; res.rows = lines.length;
    lines.forEach(function (l) { var p = split(l), d = String(p[pi] || '').replace(/\D/g, ''); if (d.length < 7 || d.length > 15) { res.invalid++; return; } if (seen[d]) { res.dup++; return; } seen[d] = 1; res.valid++; var dn = di >= 0 && /^(1|y|yes|true)$/i.test(p[di] || ''), nc = ci >= 0 && /^(0|n|no|false)$/i.test(p[ci] || ''); if (dn || nc) res.dnc++; });
    return res;
  }
  function importModal(ctx, preId) {
    UI.modal({ title: 'Import leads', body: '<div class="note">' + UI.icon('info') + '<span>' + UI.preview() + ' There is no dialler backend: pasted leads are validated and counted into the campaign totals, but the individual numbers are not stored.</span></div>' +
      '<div class="fg mt"><label>Campaign<select class="inp" data-imp="cp">' + UI.opts(C.filter(function (c) { return c.status !== 'Completed'; }).map(function (c) { return [c.id, c.name]; }), preId) + '</select></label>' +
      '<label>Paste CSV<textarea class="inp" data-imp="csv" rows="7" placeholder="phone,name,consent,dnc&#10;+91 9876543210,Asha Rao,yes,no&#10;+91 9123456780,Vikram Nair,yes,yes"></textarea></label></div>' +
      '<div class="muted mt" style="font-size:1.15rem">Format: one lead per line. Optional header row. Columns: <b>phone</b> (7-15 digits, required), name, consent (yes/no), dnc (yes/no). Duplicates in the paste and invalid numbers are skipped. Leads flagged dnc or without consent are added to the DNC count and never dialled.</div><div id="impSum" class="mt"></div>',
      foot: [{ label: 'Cancel' }, { label: 'Import leads', pri: true, fn: function (m) {
        var c = byId(m.querySelector('[data-imp="cp"]').value), r = parseLeads(m.querySelector('[data-imp="csv"]').value);
        if (!c) return false; if (!r.valid) { UI.toast('No valid leads found in the pasted CSV', { kind: 'bad' }); return false; }
        c.leads += r.valid; c.dnc += r.dnc; c.imp.added += r.valid; c.imp.dnc += r.dnc; cpSave(); MCM.audit('Leads imported', c.name + ': ' + r.valid + ' added, ' + r.dnc + ' DNC, ' + r.dup + ' duplicates, ' + r.invalid + ' invalid'); UI.toast(f.n(r.valid) + ' leads added to ' + esc(c.name), { kind: 'ok' }); ctx.refresh();
      } }],
      onOpen: function (m) { var ta = m.querySelector('[data-imp="csv"]'), sum = m.querySelector('#impSum'); ta.oninput = function () { var r = parseLeads(ta.value); sum.innerHTML = r.rows ? '<div class="grid g4">' + [['Rows read', r.rows], ['Valid', r.valid], ['Duplicates', r.dup], ['Invalid', r.invalid]].map(function (x) { return UI.kpi({ label: x[0], value: x[1], sub: x[0] === 'Valid' ? f.n(r.dnc) + ' flagged DNC / no consent' : '' }); }).join('') + '</div>' : ''; }; } });
  }

  MCM.page({
    id: 'campaigns', title: 'Campaigns', icon: 'campaigns', filters: [], live: true,
    tabs: [['overview', 'Overview'], ['performance', 'Performance'], ['leads', 'Leads'], ['compliance', 'Compliance']],
    render: function (ctx) {
      var tab = ctx.tab, can = MCM.can('supervise');
      ctx.on('[data-cp-act]', function (e, el) { setStatus(ctx, byId(el.dataset.id), el.dataset.cpAct); });
      ctx.on('[data-import]', function (e, el) { if (!can) return MCM.deny('import leads'); importModal(ctx, el.dataset.import || null); });
      ctx.on('[data-open]', function (e, el) { var c = byId(el.dataset.open); if (c) drawer(ctx, c); });
      var dl = C.filter(dialled), tot = function (k, l) { return (l || C).reduce(function (s, c) { return s + c[k]; }, 0); };
      var dAb = tot('abandoned', C.filter(function (c) { return c.type !== 'Preview'; })), dCon = tot('connected', C.filter(function (c) { return c.type !== 'Preview'; })), abAll = pct(dAb, dAb + dCon);

      if (tab === 'overview') {
        var act = C.filter(function (c) { return c.status === 'Running'; }), att = tot('attempts'), con = tot('connected'), remain = C.filter(function (c) { return c.status !== 'Completed'; }).reduce(function (s, c) { return s + breakdown(c).remaining; }, 0), tk = con ? C.reduce(function (s, c) { return s + c.talk * c.connected; }, 0) / con : 0;
        var over = C.filter(function (c) { return abRate(c) > CEIL; });
        ctx.el.innerHTML = '<div class="card" style="border:2px solid ' + (abAll > CEIL ? 'var(--bad)' : abAll > CEIL * .8 ? '#f59e0b' : 'var(--ok-dot)') + '"><div style="display:flex;gap:2rem;align-items:center;flex-wrap:wrap"><div style="min-width:18rem"><div class="muted" style="font-weight:600">Abandon rate vs regulatory ceiling <button class="info" data-def="abandonRate" title="Definition" style="border:0;background:none">' + UI.icon('info') + '</button></div><div style="font-size:4rem;font-weight:800;line-height:1.1" class="' + (abAll > CEIL ? 'bad-t' : abAll > CEIL * .8 ? 'warn-t' : 'ok-t') + '">' + f.pct(abAll, 2) + ' <small style="font-size:1.6rem;color:var(--muted)">of ' + CEIL + '% ceiling</small></div></div><div style="flex:1;min-width:24rem"><div style="position:relative">' + UI.bar(abAll, CEIL * 2, abAll > CEIL ? 'bad' : '') + '<div style="position:absolute;left:50%;top:-.4rem;bottom:-.4rem;border-left:2px dashed var(--bad)"></div></div><div class="muted" style="margin-top:.8rem;font-size:1.15rem">Calculated as abandoned / (connected + abandoned) across predictive and progressive campaigns; preview dialling cannot abandon. Marker = ' + CEIL + '% ceiling. ' + (over.length ? '<b class="bad-t">' + over.length + ' campaign' + (over.length > 1 ? 's' : '') + ' above the ceiling: ' + over.map(function (c) { return esc(c.name); }).join(', ') + '.</b>' : 'All campaigns are within the ceiling.') + '</div></div></div></div>' +
          '<div class="grid g5 mt">' + [UI.kpi({ label: 'Active campaigns', value: act.length, sub: C.length + ' total' }), UI.kpi({ label: 'Attempts', value: f.n(att) }), UI.kpi({ label: 'Connect rate', value: f.pct(pct(con, att)), sub: f.n(con) + ' connected' }), UI.kpi({ label: 'Avg talk time', value: f.dur(tk) }), UI.kpi({ label: 'Leads remaining', value: f.n(remain), sub: 'new + retry, excl. DNC' })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Campaigns ' + UI.preview(), '<div id="cpt"></div>', { flush: true, sub: 'Start, pause and resume change the campaign status only; the dialler engine is demo. Click a row for detail.' }) + '</div>' + (can ? '' : '<div class="note warn mt">Your role (' + MCM.user.role + ') can view campaigns but not start or pause them.</div>');
        UI.table(document.getElementById('cpt'), { id: 'cptbl', noun: 'campaigns', csv: MCM.can('export') ? 'campaigns' : undefined, rows: C, pageSize: 10, onRow: function (c) { drawer(ctx, c); },
          cols: [
            { k: 'name', label: 'Campaign', html: function (c) { return '<b>' + esc(c.name) + '</b>'; }, val: function (c) { return c.name; } },
            { k: 'type', label: 'Type', html: function (c) { return UI.tag(c.type); }, val: function (c) { return c.type; } },
            { k: 'status', label: 'Status', html: function (c) { return UI.tag(c.status, STAT[c.status]); }, val: function (c) { return c.status; } },
            { k: 'owner', label: 'Owner', html: function (c) { return esc(ownerName(c)); }, val: function (c) { return ownerName(c); } },
            { k: 'prog', label: 'Progress', html: function (c) { var p = pct(breakdown(c).touched, c.leads - c.dnc); return '<div style="min-width:10rem">' + UI.bar(p, 100) + '<span class="muted" style="font-size:1.05rem">' + f.pct(p, 0) + ' of leads touched</span></div>'; }, val: function (c) { return pct(breakdown(c).touched, c.leads - c.dnc); } },
            { k: 'leads', label: 'Leads', r: 1, html: function (c) { return f.n(c.leads); }, val: function (c) { return c.leads; } },
            { k: 'att', label: 'Attempts', r: 1, html: function (c) { return f.n(c.attempts); }, val: function (c) { return c.attempts; } },
            { k: 'conn', label: 'Connect %', r: 1, html: function (c) { return c.attempts ? f.pct(pct(c.connected, c.attempts)) : '-'; }, val: function (c) { return c.attempts ? pct(c.connected, c.attempts) : null; } },
            { k: 'ab', label: 'Abandon %', r: 1, html: function (c) { return c.type === 'Preview' ? '<span class="faint">n/a</span>' : '<span class="' + (abRate(c) > CEIL ? 'bad-t' : abRate(c) > CEIL * .8 ? 'warn-t' : '') + '"><b>' + f.pct(abRate(c), 2) + '</b></span>'; }, val: function (c) { return abRate(c); } },
            { k: 'mach', label: 'Machine %', r: 1, html: function (c) { return c.attempts ? f.pct(pct(c.machine, c.attempts)) : '-'; }, val: function (c) { return c.attempts ? pct(c.machine, c.attempts) : null; } },
            { k: 'talk', label: 'Avg talk', r: 1, html: function (c) { return c.talk ? f.dur(c.talk) : '-'; }, val: function (c) { return c.talk; } },
            { k: 'ctl', label: 'Controls', noSort: 1, noCsv: 1, html: function (c) { return can ? ctl(c) : '<span class="faint">read only</span>'; } }
          ] });
      }

      else if (tab === 'performance') {
        var rows = dl.map(function (c) { var hr = hourly(c); return { c: c, name: c.name, type: c.type, att: c.attempts, conn: pct(c.connected, c.attempts), talk: c.talk, ab: abRate(c), cph: agentHours(c) ? c.connected / agentHours(c) : 0, mach: pct(c.machine, c.attempts), hr: hr }; });
        var best = rows.slice().sort(function (a, b) { return b.conn - a.conn; })[0];
        ctx.el.innerHTML = '<div class="grid g4">' + [UI.kpi({ label: 'Campaigns compared', value: rows.length, sub: 'with at least one attempt' }), UI.kpi({ label: 'Best connect rate', value: best ? f.pct(best.conn) : '-', sub: best ? esc(best.name) : '' }), UI.kpi({ label: 'Avg contacts / agent hour', value: f.dec(rows.length ? rows.reduce(function (s, r) { return s + r.cph; }, 0) / rows.length : 0, 1), sub: 'estimate: talk + 40 s wrap + ring time' }), UI.kpi({ label: 'Highest abandon', value: rows.length ? f.pct(Math.max.apply(null, rows.map(function (r) { return r.ab; })), 2) : '-', sub: 'ceiling ' + CEIL + '%' })].join('') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Connect and abandon rate', '<div id="pf1"></div>') + UI.card('Contacts per agent hour and talk time', '<div id="pf2"></div>') + '</div>' +
          '<div class="mt">' + UI.card('Best hours to dial (connect rate)', '<div id="pf3"></div>', { sub: 'Derived deterministically from each campaign\'s totals and a typical hourly answer pattern. Darker = higher connect rate.' }) + '</div>' +
          '<div class="mt">' + UI.card('Campaign comparison', '<div id="pf4"></div>', { flush: true }) + '</div>';
        var lb = rows.map(function (r) { return r.name.length > 16 ? r.name.slice(0, 15) + '.' : r.name; });
        if (rows.length) {
          UI.chart(document.getElementById('pf1'), { type: 'bar', labels: lb, tipLabels: rows.map(function (r) { return r.name; }), height: 20, fmt: function (v) { return v.toFixed(0) + '%'; }, series: [{ name: 'Connect %', data: rows.map(function (r) { return +r.conn.toFixed(1); }), color: 'var(--c3)' }, { name: 'Abandon %', data: rows.map(function (r) { return +r.ab.toFixed(2); }), color: 'var(--c5)' }] });
          UI.chart(document.getElementById('pf2'), { type: 'bar', labels: lb, tipLabels: rows.map(function (r) { return r.name; }), height: 20, fmt: function (v) { return v.toFixed(0); }, series: [{ name: 'Contacts / hour', data: rows.map(function (r) { return +r.cph.toFixed(1); }), color: 'var(--c2)' }, { name: 'Avg talk (s)', axis: 'r', type: 'line', color: 'var(--c4)', data: rows.map(function (r) { return r.talk; }), fmt: function (v) { return f.dur(v); } }], fmt2: function (v) { return f.dur(v); } });
          UI.heat(document.getElementById('pf3'), { rowLabels: rows.map(function (r) { return r.name.slice(0, 14); }), colLabels: HOURS.map(function (h) { return h; }), m: rows.map(function (r) { return r.hr.rate; }), fmt: function (v) { return v == null ? '-' : f.pct(v, 0) + ' connect'; }, rgb: '22,163,74' });
        } else ['pf1', 'pf2', 'pf3'].forEach(function (id) { document.getElementById(id).innerHTML = UI.empty('No dialled campaigns yet'); });
        UI.table(document.getElementById('pf4'), { id: 'cpperf', noun: 'campaigns', csv: MCM.can('export') ? 'campaign-performance' : undefined, rows: rows, pageSize: 10, search: false, onRow: function (r) { drawer(ctx, r.c); },
          cols: [{ k: 'name', label: 'Campaign', val: function (r) { return r.name; }, html: function (r) { return '<b>' + esc(r.name) + '</b>'; } }, { k: 'type', label: 'Type', val: function (r) { return r.type; }, html: function (r) { return UI.tag(r.type); } }, { k: 'att', label: 'Attempts', r: 1, val: function (r) { return r.att; }, html: function (r) { return f.n(r.att); } }, { k: 'conn', label: 'Connect %', r: 1, val: function (r) { return r.conn; }, html: function (r) { return f.pct(r.conn); } }, { k: 'talk', label: 'Avg talk', r: 1, val: function (r) { return r.talk; }, html: function (r) { return f.dur(r.talk); } }, { k: 'cph', label: 'Contacts / agent hr (est.)', r: 1, val: function (r) { return r.cph; }, html: function (r) { return f.dec(r.cph, 1); } }, { k: 'mach', label: 'Machine %', r: 1, val: function (r) { return r.mach; }, html: function (r) { return f.pct(r.mach); } }, { k: 'ab', label: 'Abandon %', r: 1, val: function (r) { return r.ab; }, html: function (r) { return '<span class="' + (r.ab > CEIL ? 'bad-t' : '') + '">' + (r.type === 'Preview' ? 'n/a' : f.pct(r.ab, 2)) + '</span>'; } }] });
      }

      else if (tab === 'leads') {
        var bs = C.map(function (c) { return { c: c, b: breakdown(c) }; }), sum = function (k) { return bs.reduce(function (s, x) { return s + x.b[k]; }, 0); };
        ctx.el.innerHTML = '<div class="note" style="margin-bottom:1.5rem">' + UI.icon('info') + '<span>' + UI.preview() + ' Lead status is derived from each campaign\'s attempt, connect, DNC and no-answer counts. There is no dialler backend, so imported leads are counted but individual numbers are not stored.</span></div>' +
          '<div class="grid g5">' + [UI.kpi({ label: 'Total leads', value: f.n(C.reduce(function (s, c) { return s + c.leads; }, 0)) }), UI.kpi({ label: 'New (untouched)', value: f.n(sum('fresh')) }), UI.kpi({ label: 'Connected', value: f.n(sum('connected')) }), UI.kpi({ label: 'DNC', value: f.n(sum('dnc')) }), UI.kpi({ label: 'Exhausted / invalid', value: f.n(sum('exhausted') + sum('invalid')) })].join('') + '</div>' +
          '<div class="grid g21 mt">' + UI.card('Lead status by campaign', '<div id="ld1"></div>') + UI.card('Import leads', '<p class="muted">Paste a CSV of phone numbers into an active campaign. Duplicates and invalid numbers are skipped; DNC-flagged rows are never dialled.</p><button class="btn pri" data-import="">' + UI.icon('plus') + 'Import leads</button>' + (can ? '' : '<p class="muted mt">Requires supervisor permission.</p>'), {}) + '</div>' +
          '<div class="mt">' + UI.card('Lead lists', '<div id="ld2"></div>', { flush: true }) + '</div>';
        UI.chart(document.getElementById('ld1'), { type: 'stack', height: 20, labels: bs.map(function (x) { return x.c.name.slice(0, 14); }), tipLabels: bs.map(function (x) { return x.c.name; }), series: [['New', 'fresh', 'var(--c2)'], ['Attempted', 'attempted', 'var(--c4)'], ['Connected', 'connected', 'var(--c3)'], ['Exhausted', 'exhausted', 'var(--c8)'], ['Invalid', 'invalid', 'var(--c6)'], ['DNC', 'dnc', 'var(--c5)']].map(function (s) { return { name: s[0], color: s[2], data: bs.map(function (x) { return x.b[s[1]]; }) }; }) });
        var lc = function (k, l, r) { return { k: k, label: l, r: 1, val: function (x) { return x.b[k]; }, html: function (x) { return f.n(x.b[k]); } }; };
        UI.table(document.getElementById('ld2'), { id: 'cpleads', noun: 'lead lists', csv: MCM.can('export') ? 'lead-lists' : undefined, rows: bs, pageSize: 10, search: false,
          cols: [{ k: 'name', label: 'Campaign', val: function (x) { return x.c.name; }, html: function (x) { return '<b>' + esc(x.c.name) + '</b>'; } }, { k: 'tot', label: 'Total', r: 1, val: function (x) { return x.c.leads; }, html: function (x) { return f.n(x.c.leads); } }, lc('fresh', 'New'), lc('attempted', 'Attempted'), lc('connected', 'Connected'), lc('dnc', 'DNC'), lc('invalid', 'Invalid'), lc('exhausted', 'Exhausted'), { k: 'rem', label: 'Dialable', r: 1, val: function (x) { return x.b.remaining; }, html: function (x) { return '<b>' + f.n(x.b.remaining) + '</b>'; } }, { k: 'imp', label: 'Imported', r: 1, val: function (x) { return x.c.imp.added; }, html: function (x) { return f.n(x.c.imp.added); } }, { k: 'act', label: '', noSort: 1, noCsv: 1, html: function (x) { return x.c.status === 'Completed' || !can ? '' : '<button class="btn xs" data-import="' + x.c.id + '">Import</button>'; } }] });
      }

      else if (tab === 'compliance') {
        var fl = flags(), dncTot = tot('dnc'), leadsTot = tot('leads'), open = winOpen(), nowT = T.time(Date.now());
        var warns = [];
        C.forEach(function (c) {
          var f1 = fl[c.id], run = c.status === 'Running';
          if (abRate(c) > CEIL) warns.push(['bad', c.name, 'Abandon rate ' + f.pct(abRate(c), 2) + ' is above the ' + CEIL + '% ceiling. Lower the dial-ahead ratio (currently ' + c.dialAhead + ') or pause.', c.id]);
          else if (abRate(c) > CEIL * .8) warns.push(['warn', c.name, 'Abandon rate ' + f.pct(abRate(c), 2) + ' is within 20% of the ' + CEIL + '% ceiling.', c.id]);
          if (!f1.consent && (run || c.status === 'Scheduled')) warns.push(['bad', c.name, 'Consent basis is not verified but the campaign is ' + c.status.toLowerCase() + '.', c.id]);
          if (!f1.scrub && c.status !== 'Completed') warns.push(['bad', c.name, 'DNC scrub is switched off for this campaign.', c.id]);
          if (!f1.disclosure && c.status !== 'Completed') warns.push(['warn', c.name, 'Recording / identity disclosure is not enabled.', c.id]);
          if (run && !open) warns.push(['bad', c.name, 'Campaign is running outside the ' + WIN[0] + ':00-' + WIN[1] + ':00 calling window (' + nowT + ' ' + MCM.settings.tz + ').', c.id]);
          if (c.attempts && pct(c.machine, c.attempts) > 15) warns.push(['warn', c.name, 'Answering-machine rate ' + f.pct(pct(c.machine, c.attempts)) + ' is high; review list quality or call times.', c.id]);
        });
        ctx.el.innerHTML = '<div class="grid g4">' + [UI.kpi({ label: 'DNC list size', value: f.n(dncTot), sub: f.pct(pct(dncTot, leadsTot)) + ' of all leads' }), UI.kpi({ label: 'Abandon rate', value: f.pct(abAll, 2), status: abAll > CEIL ? 'bad' : abAll > CEIL * .8 ? 'warn' : 'ok', def: 'abandonRate', sub: 'ceiling ' + CEIL + '%' }), UI.kpi({ label: 'Calling window', value: open ? 'Open' : 'Closed', status: open ? 'ok' : 'warn', sub: WIN[0] + ':00-' + WIN[1] + ':00 at ' + nowT + ' ' + esc(MCM.settings.tz) }), UI.kpi({ label: 'Open warnings', value: warns.length, status: warns.some(function (w) { return w[0] === 'bad'; }) ? 'bad' : warns.length ? 'warn' : 'ok' })].join('') + '</div>' +
          '<div class="mt">' + UI.card('Warnings', warns.length ? '<ul class="plain">' + warns.map(function (w) { return '<li style="display:flex;gap:1rem;align-items:center">' + UI.tag(w[0] === 'bad' ? 'Breach risk' : 'Watch', w[0]) + '<span style="flex:1"><b>' + esc(w[1]) + '</b> - ' + esc(w[2]) + '</span><button class="btn xs" data-open="' + w[3] + '">View</button></li>'; }).join('') + '</ul>' : '<div class="note">No compliance warnings.</div>') + '</div>' +
          '<div class="grid g2 mt">' + UI.card('Abandon rate vs ceiling', '<div id="cm1"></div>', { sub: 'Predictive and progressive campaigns. Preview dialling excluded.' }) + UI.card('Calling-hours window', '<div id="cm2"></div>', { sub: 'Uses the account timezone (' + esc(MCM.settings.tz) + '). Per-recipient local-time checks need lead timezone data.' }) + '</div>' +
          '<div class="mt">' + UI.card('Campaign compliance register', '<div id="cm3"></div>', { flush: true, sub: 'Consent, disclosure and DNC scrub flags are editable by supervisors and written to the audit log.' }) + '</div>';
        var dd = C.filter(function (c) { return c.type !== 'Preview'; });
        UI.chart(document.getElementById('cm1'), { type: 'bar', height: 18, labels: dd.map(function (c) { return c.name.slice(0, 14); }), tipLabels: dd.map(function (c) { return c.name; }), goal: CEIL, min: 0, legend: false, fmt: function (v) { return v.toFixed(1) + '%'; }, series: [{ name: 'Abandon %', color: 'var(--c5)', data: dd.map(function (c) { return +abRate(c).toFixed(2); }) }] });
        document.getElementById('cm2').innerHTML = '<div style="display:grid;gap:1rem">' + C.map(function (c) { var hr = hourly(c), outside = 0, run = c.status === 'Running'; return '<div style="display:flex;justify-content:space-between;align-items:center"><span>' + esc(c.name) + '</span><span>' + (run && !open ? UI.tag('Running outside window', 'bad') : UI.tag(c.attempts ? 'No attempts outside window (' + hr.att.length + ' dialling hours)' : 'No attempts yet', 'ok')) + '</span></div>'; }).join('') + '</div>';
        var sw = function (c, k) { return UI.sw(fl[c.id][k], 'data-flag="' + c.id + ':' + k + '"' + (can ? '' : ' disabled')); };
        UI.table(document.getElementById('cm3'), { id: 'cpcomp', noun: 'campaigns', csv: MCM.can('export') ? 'campaign-compliance' : undefined, rows: C, pageSize: 10, search: false, onRow: function (c) { drawer(ctx, c); },
          cols: [{ k: 'name', label: 'Campaign', val: function (c) { return c.name; }, html: function (c) { return '<b>' + esc(c.name) + '</b>'; } }, { k: 'status', label: 'Status', val: function (c) { return c.status; }, html: function (c) { return UI.tag(c.status, STAT[c.status]); } },
            { k: 'dnc', label: 'DNC entries', r: 1, val: function (c) { return c.dnc; }, html: function (c) { return f.n(c.dnc) + ' <span class="muted">(' + f.pct(pct(c.dnc, c.leads)) + ')</span>'; } },
            { k: 'ab', label: 'Abandon %', r: 1, val: function (c) { return abRate(c); }, html: function (c) { return c.type === 'Preview' ? '<span class="faint">n/a</span>' : '<span class="' + (abRate(c) > CEIL ? 'bad-t' : 'ok-t') + '">' + f.pct(abRate(c), 2) + '</span>'; } },
            { k: 'head', label: 'Headroom to ceiling', r: 1, val: function (c) { return c.type === 'Preview' ? null : CEIL - abRate(c); }, html: function (c) { return c.type === 'Preview' ? '-' : f.dec(CEIL - abRate(c), 2) + ' pts'; } },
            { k: 'consent', label: 'Consent verified', noSort: 1, noCsv: 1, html: function (c) { return sw(c, 'consent'); } }, { k: 'disclosure', label: 'Disclosure on', noSort: 1, noCsv: 1, html: function (c) { return sw(c, 'disclosure'); } }, { k: 'scrub', label: 'DNC scrub', noSort: 1, noCsv: 1, html: function (c) { return sw(c, 'scrub'); } }] });
        ctx.on('[data-flag]', function (e, el) {
          if (!can) return MCM.deny('change compliance flags'); var p = el.dataset.flag.split(':'), d = flags(); d[p[0]][p[1]] = !d[p[0]][p[1]]; MCM.store.set('cpFlags', d);
          MCM.audit('Campaign compliance flag', byId(p[0]).name + ': ' + p[1] + ' = ' + (d[p[0]][p[1]] ? 'on' : 'off')); ctx.refresh();
        });
      }
    }
  });
})();
