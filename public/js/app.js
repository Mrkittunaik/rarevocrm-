/* RAREVO CRM — front end (vanilla JS, no build step) */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MIN = 6e4, HR = 36e5, DAY = 864e5;
const { STATUSES, PRIOS, COLORS, digits } = window.RCore;
const SOURCES = ['Meta Ads', 'WhatsApp', 'Website', 'Email', 'Manual', 'Import'];
const SC = { 'Meta Ads': 'meta', WhatsApp: 'wa', Website: 'web', Email: 'em', Manual: 'man', Import: 'imp' };
const ROLE_N = { super: 'System admin', owner: 'Business admin', staff: 'Staff' };
const BLABEL = { name: 'Name', phone: 'Phone', email: 'Email', source: 'Source', status: 'Status', priority: 'Priority', owner: 'POC', added: 'Date added', followUp: 'Next follow-up', closed: 'Closure date', price: 'Sale price', notes: 'Notes' };
const LABELS = { red: 'Hot', orange: 'Urgent', yellow: 'Waiting', green: 'Ready to close', blue: 'Info sent', purple: 'VIP' };
const pad = n => String(n).padStart(2, '0');
const fD = t => t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fDs = t => t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
const fT = t => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const fDT = t => t ? fD(t) + ', ' + fT(t) : '';
const inDT = t => { if (!t) return ''; const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const inD = t => t ? inDT(t).slice(0, 10) : '';
const ymd = t => inD(t);
const pDT = v => v ? new Date(v).getTime() : null;
const pD = v => v ? new Date(v + 'T00:00').getTime() : null;
const sod = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const rel = t => { const d = t - Date.now(), a = Math.abs(d); const s = a < HR ? Math.max(1, Math.round(a / MIN)) + ' min' : a < DAY ? Math.round(a / HR) + ' h' : Math.round(a / DAY) + ' d'; return d < 0 ? s + ' ago' : 'in ' + s; };
const q15 = t => Math.round(t / 9e5) * 9e5;
const num = n => Math.round(+n || 0).toLocaleString('en-IN');
function money(n, cur) { try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur || 'INR', maximumFractionDigits: 0 }).format(+n || 0); } catch (e) { return '₹' + num(n); } }
const ICON = {
  master: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18"/><circle cx="18" cy="18" r="3" fill="currentColor"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', sheet: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 4v16"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>', team: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4a3.5 3.5 0 0 1 0 7M22 20c0-3-2-5-5-5.5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>', plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  down: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>', wa: '<path d="M4 20l1.4-4A8 8 0 1 1 8 19z"/>', meta: '<path d="M3 15c2-8 5-9 9 0s7 8 9 0"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', chev: '<path d="M9 6l6 6-6 6"/>', biz: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', form: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/>', bold: '<path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z"/>', italic: '<path d="M10 4h8M6 20h8M14 4l-4 16"/>', txtc: '<path d="M6 16L12 4l6 12M8.5 11h7"/>', fill: '<path d="M5 11l7-7 7 7-7 7z"/><path d="M19 15s2 2.5 2 4a2 2 0 0 1-4 0c0-1.5 2-4 2-4"/>', clear: '<path d="M4 20h16M7 16l10-10M17 16L7 6"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', wrap: '<path d="M4 6h16M4 12h13a3 3 0 0 1 0 6h-4M15 16l-2 2 2 2M4 18h5"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12l2-1-2-4-2 1-2-1V5h-4v2L9 8 7 7 5 11l2 1v0l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4z"/>', sync: '<path d="M20 11a8 8 0 0 0-14-5l-2 2M4 13a8 8 0 0 0 14 5l2-2M4 4v4h4M20 20v-4h-4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24">${ICON[n] || ''}</svg>`;

/* ---------------- state + api ---------------- */
let MODE = 'server', S = null, DL = null;
const UI = { fs: false, wrap: true, cur: null, editing: null, popEl: null, uOpen: {}, fs2: false, noside: false, last: {}, em: { range: '30', from: '', to: '' }, grid: {}, scopes: {}, sel: new Set(), menu: null, home: { q: '', f: 'all' }, cat: {}, wa: {}, waSel: new Set(), waQ: '', meta: { range: '30', from: '', to: '' }, rep: { range: 'month', from: '', to: '', ow: '' }, fu: { biz: '', ow: '' }, imp: null };
async function api(m, p, b) {
  if (MODE === 'demo') { const r = await window.RDemo.handle(m, p, b || {}); if (r.status >= 400) throw new Error(r.body.error || 'Error'); return r.body; }
  const res = await fetch('/api' + p, { method: m, headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined, credentials: 'same-origin' });
  let j = {}; try { j = await res.json(); } catch (e) {}
  if (res.status === 401 && p !== '/login') { S = null; renderLogin(); throw new Error('Please sign in'); }
  if (!res.ok) throw new Error(j.error || 'Request failed (' + res.status + ')');
  return j;
}
const loadScript = src => new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('Could not load ' + src)); document.head.append(s); });
async function boot() {
  try { const r = await fetch('/api/health', { cache: 'no-store' }); const j = await r.json(); MODE = j && j.mode === 'server' ? 'server' : 'demo'; } catch (e) { MODE = 'demo'; }
  if (MODE === 'demo') await loadScript('js/demo.js');
  const fm = (location.hash || '').match(/^#\/f\/([\w-]+)/); if (fm) return renderPublicForm(fm[1]);
  await refresh();
  setInterval(tick, 30000); setTimeout(tick, 1500);
}
async function refresh() { try { S = await api('GET', '/bootstrap'); render(); mustChangeCheck(); } catch (e) { if (MODE === 'server' && !S) renderLogin(); else toast(e.message, '', 1); } }
async function run(fn, okMsg) { try { const r = await fn(); if (okMsg) toast(okMsg); return r; } catch (e) { toast(e.message, '', 1); render(); return null; } }

const B = id => S.businesses.find(b => b.id === id), SH = id => S.sheets.find(s => s.id === id), U = id => S.users.find(u => u.id === id);
const uname = id => (U(id) || {}).name || 'Unassigned';
const isSuper = () => S.me.role === 'super';
const isAdmin = () => isSuper();
const canManage = bid => isSuper() || (S.me.role === 'owner' && !!bid && S.me.businessId === bid);
const sheetPerm = sh => { if (!sh) return 'none'; if (canManage(sh.businessId)) return 'edit'; const a = sh.access || {}; if ((a.edit || []).includes(S.me.id)) return 'edit'; if ((a.view || []).includes(S.me.id)) return 'view'; return 'none'; };
const canEdit = r => canManage(r.businessId) || r.owner === S.me.id || sheetPerm(SH(r.sheetId)) === 'edit';
const canMaster = bid => canManage(bid) || (((B(bid) || {}).masterAccess || {}).view || []).includes(S.me.id);
const gateLink = b => appLink() + '#/login/' + (b ? b.slug : '');
const myReq = sid => (S.requests || []).find(q => q.userId === S.me.id && q.sheetId === sid && q.status === 'pending');
const pendingReqs = bid => (S.requests || []).filter(q => q.status === 'pending' && (!bid || q.businessId === bid) && canManage(q.businessId));
const homeBiz = () => (!isSuper() && S.me.businessId && B(S.me.businessId)) ? S.me.businessId : '';
const assignable = bid => S.users.filter(u => u.role === 'super' || !u.businessId || u.businessId === bid);
const bizUsers = bid => S.users.filter(u => u.businessId === bid);
function genPw() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#'; const r = new Uint32Array(12); (window.crypto || window.msCrypto).getRandomValues(r); return [...r].map(x => a[x % a.length]).join(''); }
const appLink = () => location.origin + location.pathname;
const viewingAs = () => MODE === 'demo' ? !!(window.RDemo && window.RDemo.backId) : !!(S && S.viewingAs);
const sheetsOf = bid => S.sheets.filter(s => s.businessId === bid);
const rowsOf = bid => S.rows.filter(r => !bid || r.businessId === bid);
const open_ = r => !['Won', 'Lost'].includes(r.status);
const putRow = r => { const i = S.rows.findIndex(x => x.id === r.id); if (i < 0) S.rows.push(r); else S.rows[i] = r; };
const putBiz = b => { const i = S.businesses.findIndex(x => x.id === b.id); if (i < 0) S.businesses.push(b); else S.businesses[i] = b; };
const putSheet = s => { const i = S.sheets.findIndex(x => x.id === s.id); if (i < 0) S.sheets.push(s); else S.sheets[i] = s; };
const labelsOf = bid => (B(bid) || {}).colorLabels || LABELS;
const srcCls = s => 's-' + (SC[s] || 'man');
function emailsOf(bid, from, to) { return (S.emails || []).filter(s => (!bid || s.businessId === bid) && (!from || s.date >= from) && (!to || s.date <= to)); }
function spendOf(bid, from, to) { return S.spend.filter(s => (!bid || s.businessId === bid) && (!from || s.date >= from) && (!to || s.date <= to)); }
const sum = (a, f) => a.reduce((x, y) => x + (+f(y) || 0), 0);

/* ---------------- toast, modal ---------------- */
function toast(t, sub, err) { const d = document.createElement('div'); d.className = 'toast' + (err ? ' err' : ''); d.innerHTML = `<b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`; $('#toasts').append(d); setTimeout(() => d.remove(), err ? 7000 : 4200); }
function modal(title, body, foot, opt) {
  opt = opt || {};
  $('#box').className = 'box' + (opt.wide ? ' wide' : '');
  $('#box').innerHTML = `<header><div class="t"><h2>${esc(title)}</h2>${opt.sub ? `<p>${esc(opt.sub)}</p>` : ''}</div><button class="btn icon ghost" data-act="close" aria-label="Close">${ic('x')}</button></header><div class="bd">${body}</div>${foot ? `<footer>${foot}</footer>` : ''}`;
  $('#modal').hidden = false;
  setTimeout(() => { const f = $('#box .bd input:not([type=checkbox]):not([readonly]),#box .bd select,#box .bd textarea'); if (f && !opt.nofocus) f.focus(); }, 30);
}
const closeModal = () => { if ($('#modal').dataset.lock) return; $('#modal').hidden = true; $('#box').innerHTML = ''; UI.imp = null; };
const v = id => { const e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : ''; };
function confirmBox(title, msg, act, data) { modal(title, `<p style="margin:0">${esc(msg)}</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="${act}" ${Object.entries(data || {}).map(([k, x]) => `data-${k}="${esc(x)}"`).join(' ')}>Confirm</button>`); }

/* ---------------- router ---------------- */
function parse() {
  const p = (location.hash || '#/').slice(1).split('/').filter(Boolean);
  if (p[0] === 'b' && p[1]) return { page: 'biz', bid: p[1], tab: p[2] || 'overview', sub: p[3] || '' };
  if (['master', 'follow-ups', 'team'].includes(p[0])) return { page: p[0] };
  return { page: 'home' };
}
let R = parse();
function go(path) { if (location.hash === '#' + path) { R = parse(); render(); } else location.hash = path; }
window.addEventListener('hashchange', () => { const fm = (location.hash || '').match(/^#\/f\/([\w-]+)/); if (fm) return renderPublicForm(fm[1]); if (!S) { if (MODE === 'server') renderLogin(); return; } R = parse(); UI.sel.clear(); UI.menu = null; render(); window.scrollTo(0, 0); });

/* ---------------- shell ---------------- */
function dueRows() { const e = sod(Date.now()) + DAY, hb = homeBiz(); return S.rows.filter(r => r.followUp && r.followUp < e && canEdit(r) && (!hb || r.businessId === hb)).sort((a, b) => a.followUp - b.followUp); }
function top() {
  const due = dueRows(), cur = R.page === 'biz' ? R.bid : '', hb = homeBiz();
  let nav = [];
  if (isSuper()) { nav = [['/', 'home', 'Businesses', R.page === 'home' || R.page === 'biz'], ['/team', 'team', 'Users', R.page === 'team']]; }
  else if (!hb) nav = [['/', 'home', 'Businesses', true]];
  const hbb = hb && B(hb);
  return `<header class="top">
   <button class="logo" data-go="${hb ? '/b/' + hb : '/'}"><span class="mk">R</span><span class="lt">RAREVO</span> <span class="tag">CRM</span></button>
   ${hbb ? `<span class="bizsel" style="cursor:default"><span class="avatar sm" style="--c:${esc(hbb.color)}">${esc(ini(hbb.name).slice(0, 1))}</span><b class="nowrap" style="overflow:hidden;text-overflow:ellipsis">${esc(hbb.name)}</b></span>`
    : `<label class="bizsel">${ic('biz')}<select data-act="bizsel" aria-label="Business"><option value="">All businesses</option>${S.businesses.map(b => `<option value="${esc(b.id)}" ${b.id === cur ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>`}
   ${nav.length ? `<nav class="nav">${nav.map(([p, i, l, on]) => `<button data-go="${p}" class="${on ? 'on' : ''}">${ic(i)}${l}</button>`).join('')}</nav>` : ''}
   <span class="sp"></span>
   <button class="btn icon" data-act="menu" data-v="bell" aria-label="Follow-ups due" style="position:relative">${ic('bell')}${due.length + pendingReqs(hb).length ? `<span class="badge" style="position:absolute;top:-6px;right:-6px">${due.length + pendingReqs(hb).length}</span>` : ''}</button>
   <button class="avatar" style="--c:#111827;border:0" data-act="menu" data-v="user" aria-label="Account">${esc(ini(S.me.name))}</button>
   ${UI.menu === 'bell' ? `<div class="menu">${pendingReqs(hb).length ? `<div class="mh"><b>Access requests</b></div>${pendingReqs(hb).map(q => `<button class="mi" data-act="reqs" data-id="${q.businessId}"><span class="dot warn"></span><span style="flex:1"><b>${esc(uname(q.userId))}</b> wants to ${q.level === 'edit' ? 'edit' : 'view'} ${esc(q.sheetId === 'master' ? 'Master sheet' : (SH(q.sheetId) || {}).name || 'a sheet')}<br><small class="muted">${esc((B(q.businessId) || {}).name || '')} · ${esc(rel(q.at))}</small></span></button>`).join('')}` : ''}<div class="mh row"><b>Follow-ups due today</b><span class="sp"></span><button class="btn xs" data-go="${hb ? '/b/' + hb + '/follow-ups' : '/follow-ups'}">All</button></div>${due.slice(0, 12).map(r => `<button class="mi" data-act="open" data-id="${r.id}"><span class="dot ${r.followUp < Date.now() ? 'err' : 'warn'}"></span><span style="flex:1"><b>${esc(r.name || '(no name)')}</b><br><small class="muted">${esc(fT(r.followUp))} · ${esc(rel(r.followUp))}${hb ? '' : ' · ' + esc((B(r.businessId) || {}).name || '')}</small></span></button>`).join('') || '<div class="empty">Nothing due today</div>'}</div>` : ''}
   ${UI.menu === 'user' ? `<div class="menu"><div class="mh"><b>${esc(S.me.name)}</b><br><small class="muted">${esc(S.me.username || S.me.email)} · ${ROLE_N[S.me.role] || ''}${hbb ? ' · ' + esc(hbb.name) : ''}</small></div>
     ${MODE === 'demo' ? `<div class="mh small muted">Switch login (demo)</div>${(window.RDemo.allUsers ? window.RDemo.allUsers() : S.users).map(u => `<button class="mi" data-act="asuser" data-id="${u.id}">${u.id === S.me.id ? '✓ ' : ''}${esc(u.name)} <span class="muted small">${ROLE_N[u.role] || ''}</span></button>`).join('')}<button class="mi" data-act="resetdemo">Reset demo data</button>`
      : `${isSuper() ? '<button class="mi" data-act="gates">Business login pages</button>' : ''}<button class="mi" data-act="pw">Change password</button><button class="mi" data-act="logout">Sign out</button>`}${MODE === 'demo' && isSuper() ? '<button class="mi" data-act="gates">Business login pages</button>' : ''}</div>` : ''}
  </header>${viewingAs() ? `<div class="vas">${ic('eye')}<span>You are viewing the CRM as <b>${esc(S.me.name)}</b> (${esc(ROLE_N[S.me.role])}${S.me.businessId && B(S.me.businessId) ? ' · ' + esc(B(S.me.businessId).name) : ''}) — exactly what they see.</span><button class="btn sm" data-act="backadmin">Back to RAREVO admin</button></div>` : ''}${MODE === 'demo' ? `<div class="demo"><b>Demo preview</b> Data is saved in this browser only; WhatsApp/Meta syncs return sample data. Use the avatar menu to switch between System admin, Business admin and Staff logins.</div>` : ''}`;
}
const ini = n => String(n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
function render() {
  if (!S) return;
  R = parse(); try { applyColors(); } catch (e) {}
  const hb = homeBiz();
  if (hb && (R.page !== 'biz' || R.bid !== hb)) { R = { page: 'biz', bid: hb, tab: R.page === 'biz' ? R.tab : 'overview', sub: '' }; try { history.replaceState(null, '', '#/b/' + hb + (R.tab !== 'overview' ? '/' + R.tab : '')); } catch (e) {} }
  if (['master', 'follow-ups'].includes(R.page) || (!isSuper() && R.page === 'team')) R = { page: 'home' };
  closePop(); UI.editing = null;
  let body;
  try { body = view(); } catch (e) { console.error(e); body = `<div class="alert">Something went wrong showing this page: ${esc(e.message)}</div>`; }
  $('#app').innerHTML = top() + `<main class="wrap">${body}</main>`;
  for (const c of $$('table.stk td')) { let i = 0, p = c; while ((p = p.previousElementSibling)) i++; const h = c.closest('table').querySelector('thead tr'); c.dataset.l = h && h.cells[i] ? h.cells[i].textContent : ''; }
  document.body.style.overflow = UI.fs && R.page === 'biz' && ['sheets', 'master'].includes(R.tab) ? 'hidden' : '';
  if (UI.cur && $('.gs')) { const ri = (UI.vrows || []).indexOf(UI.cur.rid), ci = (UI.dcols || []).findIndex(c => c.k === UI.cur.k); if (ri >= 0 && ci >= 0) { const keep = UI.rng; UI.anchor = { ri, ci }; UI.focus = UI.focus && keep ? UI.focus : UI.anchor; UI.rng = keep && keep.r2 < UI.vrows.length && keep.c2 < UI.dcols.length ? keep : normR(UI.anchor, UI.anchor); paint(); } else { UI.cur = null; UI.anchor = null; } } else if (!$('.gs')) { UI.anchor = null; }
  after();
}
function view() {
  if (R.page === 'home') return vHome();
  if (R.page === 'team') return vUsers();
  const b = B(R.bid);
  if (!b) return `<div class="empty">Business not found. ${isSuper() ? '<button class="btn sm" data-go="/">Back to businesses</button>' : ''}</div>`;
  const tabs = bizTabs(b);
  if (!tabs.some(t => t[0] === R.tab)) R.tab = 'overview';
  const f = { overview: vOver, sheets: x => vSheets(x, 'sheets'), master: x => vSheets(x, 'master'), 'follow-ups': x => vFollow(x.id), web: vWeb, whatsapp: vWA, meta: vMeta, email: vEmail, reports: vRep, team: x => vTeam(x.id), settings: vSet }[R.tab] || vOver;
  const reqN = pendingReqs(b.id).length;
  const on = k => R.tab === k;
  return `<div class="bwrap"><nav class="rail" aria-label="Business menu"><span class="avatar" style="--c:${esc(b.color)}" title="${esc(b.name)}">${esc(ini(b.name).slice(0, 1))}</span>
   ${tabs.map(([k, l, i]) => `<button class="ri ${on(k) ? 'on' : ''}" data-go="/b/${b.id}/${k}" data-tip="${esc(l)}" aria-label="${esc(l)}">${ic(i)}${k === 'team' && reqN ? `<span class="rb">${reqN}</span>` : ''}</button>`).join('')}</nav>
   <div class="bmain">${bizHead(b)}${f(b)}</div></div>`;
}
function bizTabs(b) {
  const m = canManage(b.id);
  return [['overview', 'Overview', 'home'], ['master', 'Master sheet (everything)', 'master'], ['sheets', 'Sheets', 'sheet'], ['follow-ups', 'Follow-ups', 'cal'], ['whatsapp', 'WhatsApp', 'wa'], ...(m ? [['web', 'Website & forms', 'globe'], ['meta', 'Meta ads', 'meta'], ['email', 'Email marketing', 'mail']] : []), ['reports', 'Reports', 'chart'], ...(m ? [['team', 'Team & access', 'team'], ['settings', 'Settings', 'gear']] : [])];
}
function after() {
  if (R.page === 'biz' && R.tab === 'whatsapp') { const b = B(R.bid); if (b && b.rarevo && !UI.wa[b.id]) loadContacts(b.id); }
}

/* ---------------- home ---------------- */
function health(c) { if (!c) return ['off', 'Not connected']; if (c.status === 'error') return ['err', 'Needs attention']; if (c.status === 'ok') return ['ok', 'Healthy']; return ['warn', 'Pending']; }
function vHome() {
  const list = S.businesses, q = UI.home.q.toLowerCase(), f = UI.home.f, now = Date.now();
  const shown = list.filter(b => (f === 'all' || b.status === f) && (!q || (b.name + ' ' + b.industry + ' ' + (b.phone || '')).toLowerCase().includes(q)));
  const cnt = s => list.filter(b => b.status === s).length;
  const supers = S.users.filter(u => u.role === 'super'), owners = S.users.filter(u => u.role === 'owner'), staff = S.users.filter(u => u.role === 'staff');
  const wk = S.rows.filter(r => r.added > now - 7 * DAY), bad = list.filter(b => (b.rarevo && b.rarevo.status === 'error') || (b.meta && b.meta.status === 'error'));
  const waN = list.filter(b => b.rarevo).length, metaN = list.filter(b => b.meta).length, webN = list.filter(b => b.web && b.web.enabled).length;
  const spend = sum(spendOf('', ymd(now - 29 * DAY)), s => s.spend);
  const st = (n, l, sub, cls, go) => `<div class="kpi ${cls || ''}" ${go ? `data-go="${go}" style="cursor:pointer"` : ''}><small>${l}</small><b>${n}</b><span>${sub}</span></div>`;
  const sup = isSuper();
  const top5 = [...list].map(b => [b, rowsOf(b.id).filter(r => r.added > now - 7 * DAY).length]).sort((x, y) => y[1] - x[1]).slice(0, 5);
  return `<div class="ph"><div class="t"><h1 class="row">${ic('biz')} ${sup ? 'RAREVO CRM — all businesses' : 'Businesses'}</h1><p>${sup ? 'Totals across every client. Open a business to work in its sheets, master sheet and follow-ups.' : 'Your businesses.'}</p></div>
   <div class="row">${sup ? `<button class="btn" data-go="/team">${ic('team')}All users</button><button class="btn pri" data-act="addbiz">${ic('plus')}Add business</button>` : ''}</div></div>
  <div class="kpis">
   ${st(list.length, 'Businesses', `${cnt('active')} active · ${cnt('onboarding')} onboarding · ${cnt('paused')} paused`)}
   ${sup ? st(supers.length, 'RAREVO team', 'system admins', '', '/team') + st(owners.length, 'Client admins', `${list.filter(b => owners.some(u => u.businessId === b.id)).length} of ${list.length} businesses have a login`, '', '/team') + st(staff.length, 'Client staff', 'users added by businesses', '', '/team') : ''}
   ${st(num(S.rows.length), 'Total leads', `${S.rows.filter(open_).length} open · ${S.sheets.length} sheets`)}
   ${st(bad.length ? bad.length : '✓', 'Connections', `${waN} WhatsApp · ${metaN} Meta · ${webN} websites${bad.length ? ' — ' + bad.length + ' need attention' : ''}`, bad.length ? 'warn' : '')}
  </div>
  <div class="row" style="margin-bottom:12px"><input class="inp search" type="search" placeholder="Search name, industry, number…" data-act="homeq" value="${esc(UI.home.q)}">
   <div class="chips">${[['all', 'All', list.length], ['active', 'Active', cnt('active')], ['onboarding', 'Onboarding', cnt('onboarding')], ['paused', 'Paused', cnt('paused')]].map(([k, l, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="homef" data-v="${k}">${l} <span class="n">${n}</span></button>`).join('')}</div></div>
  <div class="bgrid">${shown.map(bcard).join('')}${sup ? `<div class="addcard" data-act="addbiz" role="button" tabindex="0"><span class="plus">+</span><b>Add business</b><span class="small">Details · WhatsApp · Meta · Sheets</span></div>` : ''}</div>
  ${!shown.length && !sup ? '<div class="empty">No businesses yet</div>' : ''}
  <div style="margin-top:12px">${bad.map(b => `<div class="alert"><b>Needs attention:</b> ${esc(b.name)} — ${esc((b.rarevo && b.rarevo.status === 'error' ? 'WhatsApp: ' + b.rarevo.error : '') || (b.meta ? 'Meta: ' + b.meta.error : ''))} ${sup ? `<button data-act="connect" data-id="${b.id}" data-v="${b.rarevo && b.rarevo.status === 'error' ? 'wa' : 'meta'}">See errors &amp; how to fix →</button>` : ''}</div>`).join('')}</div>`;
}
function bcard(b) {
  const rows = rowsOf(b.id), last = rows.reduce((m, r) => Math.max(m, r.updated || r.added || 0), 0);
  const [wh, wt] = health(b.rarevo), [mh, mt] = health(b.meta);
  const sp = sum(spendOf(b.id, ymd(Date.now() - 29 * DAY)), s => s.spend);
  const pill = { active: 'ok', onboarding: 'info', paused: 'warn' }[b.status] || '';
  return `<div class="bcard">
   <div class="hd"><span class="avatar lg" style="--c:${esc(b.color)}">${esc(ini(b.name).slice(0, 1))}</span><div style="flex:1"><b>${esc(b.name)}</b><span class="pill ${pill}">${esc(cap(b.status))}</span> <span class="small muted">${esc(b.industry)}</span></div>${isSuper() ? `<button class="btn icon ghost sm" data-go="/b/${b.id}/settings" aria-label="Settings">${ic('gear')}</button>` : ''}</div>
   <div class="conn"><div>${ic('wa')}<b>${esc(b.phone || (b.rarevo ? 'WhatsApp' : 'WhatsApp'))}</b><span class="sp"></span><span class="dot ${wh}"></span><span class="small muted">${wt}</span></div>
    <div>${ic('meta')}<span>${esc(b.meta ? (b.meta.accountName || b.meta.adAccountId) : 'Meta ads')}</span><span class="sp"></span><span class="dot ${mh}"></span><span class="small muted">${mt}</span></div></div>
   <div class="st"><div><button class="lnk2" data-go="/b/${b.id}/master"><b>${num(rows.length)}</b><small>Leads</small></button></div><div><button class="lnk2" data-go="/b/${b.id}/sheets"><b>${sheetsOf(b.id).length}</b><small>Sheets</small></button></div><div><button class="lnk2" data-go="/b/${b.id}/follow-ups"><b>${rows.filter(r => r.followUp && r.followUp < sod(Date.now()) + DAY).length}</b><small>Follow-ups due</small></button></div><div><button class="lnk2" data-act="gousers" data-id="${b.id}"><b>${S.users.filter(u => u.businessId === b.id && u.role === 'owner').length} · ${S.users.filter(u => u.businessId === b.id && u.role === 'staff').length}</b><small>Admins · staff</small></button></div></div>
   <div class="ft"><span class="small muted">${last ? 'Last activity ' + rel(last) : 'No activity yet'}<br>${S.users.some(u => u.role === 'owner' && u.businessId === b.id) ? '<span style="color:var(--green)">● Client login active</span>' : (isSuper() ? `<button class="lnk" data-act="clientlogin" data-id="${b.id}">+ Create client login</button>` : '')}</span><span class="sp"></span>${isSuper() ? `<button class="btn sm icon" data-act="sharelogin" data-id="${b.id}" title="Share secure login link" aria-label="Share login">${ic('link')}</button>` : ''}${isSuper() && S.users.some(u => u.role === 'owner' && u.businessId === b.id) ? `<button class="btn sm" data-act="viewas" data-id="${S.users.find(u => u.role === 'owner' && u.businessId === b.id).id}" title="See the CRM exactly as the client sees it — no password">${ic('eye')}Client view</button>` : ''}<button class="btn sm pri" data-go="/b/${b.id}">Open ${ic('chev')}</button></div></div>`;
}
const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

/* ---------------- business shell ---------------- */
function bizHead(b) {
  const [wh, wt] = health(b.rarevo), [mh, mt] = health(b.meta), m = canManage(b.id);
  const tl = (bizTabs(b).find(t => t[0] === R.tab) || ['', 'Sheets'])[1];
  return `<div class="bh"><div class="t"><b>${esc(b.name)} <span class="pill ${b.status === 'active' ? 'ok' : b.status === 'paused' ? 'warn' : 'info'}">${esc(cap(b.status))}</span><span class="crumb">/ ${esc(tl)}</span></b><span class="small muted">${esc(b.industry || 'Business')} · ${sheetsOf(b.id).length} sheets · ${num(rowsOf(b.id).length)} records${!isSuper() ? ' · signed in as ' + esc(ROLE_N[S.me.role]) : ''}</span></div>
   <div class="conns"><button data-go="/b/${b.id}/whatsapp"><span class="dot ${wh}"></span>WhatsApp · ${wt}</button>${m ? `<button data-go="/b/${b.id}/meta"><span class="dot ${mh}"></span>Meta · ${mt}</button><button data-act="connect" data-id="${b.id}">${ic('link')}Connect</button>` : ''}</div></div>`;
}
function vOver(b) {
  const rows = rowsOf(b.id), now = Date.now(), m1 = new Date(); m1.setDate(1); m1.setHours(0, 0, 0, 0);
  const due = rows.filter(r => r.followUp && r.followUp < sod(now) + DAY).sort((a, c) => a.followUp - c.followUp);
  const won = rows.filter(r => r.status === 'Won' && r.closed >= m1.getTime());
  const t30 = ymd(now - 29 * DAY), sp = spendOf(b.id, t30), spend = sum(sp, s => s.spend);
  const metaLeads = rows.filter(r => r.source === 'Meta Ads' && r.added >= now - 30 * DAY).length;
  const days = [...Array(14)].map((_, i) => ymd(now - (13 - i) * DAY)), dv = days.map(d => sum(sp.filter(s => s.date === d), s => s.spend)), mx = Math.max(1, ...dv);
  return `<div class="kpis">
   <div class="kpi"><small>Records</small><b>${num(rows.length)}</b><span>${rows.filter(open_).length} open · ${rows.filter(r => !r.owner).length} unassigned</span></div>
   <div class="kpi"><small>New this week</small><b>${rows.filter(r => r.added > now - 7 * DAY).length}</b><span>last 7 days</span></div>
   <div class="kpi ${due.some(r => r.followUp < now) ? 'warn' : ''}"><small>Follow-ups due today</small><b>${due.length}</b><span>${due.filter(r => r.followUp < now).length} overdue</span></div>
   <div class="kpi"><small>Won this month</small><b>${money(sum(won, r => r.price), b.currency)}</b><span>${won.length} deals</span></div>
   ${canManage(b.id) ? `<div class="kpi"><small>Meta spend · 30d</small><b>${money(spend, b.currency)}</b><span>${metaLeads} Meta leads in CRM</span></div>
   <div class="kpi"><small>Cost per lead · 30d</small><b>${metaLeads ? money(spend / metaLeads, b.currency) : '—'}</b><span>spend ÷ Meta leads</span></div>` : ''}
   ${canManage(b.id) ? `<div class="kpi"><small>Email marketing · 30d</small><b>${num(sum(emailsOf(b.id, t30), e => e.sent))}</b><span>emails sent · ${num(sum(emailsOf(b.id, t30), e => e.leads))} leads</span></div>` : ''}</div>
  <div class="g31"><div class="stack">
   <div class="card p0"><div class="ch" style="padding:12px 14px 0"><h2>Sheets</h2><span class="sp"></span>${canManage(b.id) ? `<button class="btn sm" data-act="import" data-id="${b.id}">${ic('up')}Upload sheet</button><button class="btn sm" data-act="newsheet" data-id="${b.id}">${ic('plus')}New sheet</button>` : ''}</div>
    <div class="scroll"><table class="t stk"><thead><tr><th>Sheet</th><th>Category</th><th class="num">Records</th><th class="num">Open</th><th class="num">Won</th><th>Updated</th></tr></thead><tbody>
    <tr style="cursor:pointer" data-go="/b/${b.id}/master"><td><b style="color:var(--red)">Master sheet</b> <span class="muted small">all sheets together</span></td><td>All</td><td class="num">${rows.length}</td><td class="num">${rows.filter(open_).length}</td><td class="num">${rows.filter(r => r.status === 'Won').length}</td><td></td></tr>
    ${sheetsOf(b.id).map(s => { const rs = rows.filter(r => r.sheetId === s.id); return `<tr style="cursor:pointer" data-go="/b/${b.id}/sheets/${s.id}"><td><b>${esc(s.name)}</b></td><td><span class="pill">${esc(s.category)}</span></td><td class="num">${rs.length}</td><td class="num">${rs.filter(open_).length}</td><td class="num">${rs.filter(r => r.status === 'Won').length}</td><td class="small muted">${esc(rel(s.updated || s.createdAt))}</td></tr>`; }).join('')}
    </tbody></table></div></div>
   ${canManage(b.id) ? `<div class="card"><div class="ch"><h2>Meta spend · last 14 days</h2><span class="sp"></span><button class="btn sm" data-go="/b/${b.id}/meta">Details</button></div>
    ${spend ? `<div class="bars">${dv.map((x, i) => `<div class="bc" title="${esc(fDs(pD(days[i])))}: ${esc(money(x, b.currency))}"><i style="height:${x / mx * 100}%;--c:var(--meta)"></i></div>`).join('')}</div><div class="axis"><span>${esc(fDs(pD(days[0])))}</span><span>${esc(fDs(pD(days[13])))}</span></div>` : `<div class="empty">No spend recorded yet — connect Meta or add spend manually.</div>`}` : ''}</div>
  </div><div class="stack">
   <div class="card"><div class="ch"><h2>Due today</h2><span class="sp"></span><button class="btn sm" data-go="/b/${b.id}/follow-ups">All</button></div><div class="list">${due.slice(0, 8).map(r => `<div class="li"><span class="dot ${r.followUp < now ? 'err' : 'warn'}"></span><div class="tx"><b>${esc(r.name || '(no name)')}</b><small>${esc(fT(r.followUp))} · ${esc(rel(r.followUp))} · ${esc(uname(r.owner))}</small></div><button class="btn xs" data-act="open" data-id="${r.id}">Open</button></div>`).join('') || '<div class="empty">Nothing due today</div>'}</div></div>
   <div class="card"><h2 style="margin-bottom:8px">Connections</h2>${connLine(b, 'wa')}${canManage(b.id) ? connLine(b, 'meta') : ''}</div>
  </div></div>`;
}
function connLine(b, k) {
  const c = k === 'wa' ? b.rarevo : b.meta, [h, t] = health(c);
  return `<div class="li row" style="padding:8px 0;border-bottom:1px solid var(--line)">${ic(k === 'wa' ? 'wa' : 'meta')}<div style="flex:1"><b class="small">${k === 'wa' ? 'Rarevo WhatsApp' : 'Meta ads'}</b><br><small class="muted">${c ? esc(k === 'wa' ? c.url : (c.accountName || c.adAccountId)) + (c.lastSync ? ' · synced ' + esc(rel(c.lastSync)) : '') : 'Not connected'}</small>${c && c.error ? `<br><small style="color:var(--red)">${esc(c.error)}</small>` : ''}</div><span class="dot ${h}"></span><span class="small muted">${t}</span></div>`;
}

/* ---------------- sheets ---------------- */
function vSheets(b, mode) {
  const all = sheetsOf(b.id), cats = [...new Set(all.map(s => s.category))].sort(), m = canManage(b.id);
  let cat = UI.cat[b.id] || ''; if (cat && !cats.includes(cat)) cat = UI.cat[b.id] = '';
  const shs = all.filter(s => !cat || s.category === cat);
  let sub;
  if (mode === 'master') sub = 'master';
  else { const want = [R.sub, UI.last[b.id]].find(id => id && SH(id) && SH(id).businessId === b.id && (!cat || SH(id).category === cat)); sub = want || (shs[0] || all[0] || {}).id; }
  if (!sub) return `<div class="empty">No sheets yet.</div>`;
  if (sub !== 'master') UI.last[b.id] = sub;
  const sh = sub === 'master' ? null : SH(sub);
  const sc = { bid: b.id, sid: sub, cat: sub === 'master' ? cat : '' };
  const perm = sh ? sheetPerm(sh) : (canMaster(b.id) ? (m ? 'edit' : 'view') : 'none');
  const own = scopeRows(sc).length;
  const locked = sh ? (perm === 'none' && !own) : perm === 'none';
  const count = id => S.rows.filter(r => r.sheetId === id).length;
  const tabs = `<div class="xltabs">${m ? `<button class="tb ic" data-act="newsheet" data-id="${b.id}" title="Add sheet" aria-label="Add sheet">${ic('plus')}</button>` : ''}<button class="tb ic" data-act="allsheets" data-id="${b.id}" title="All sheets" aria-label="All sheets">${ic('menu')}</button>
   <div class="tbs"><button class="tb master ${sub === 'master' ? 'on' : ''}" data-go="/b/${b.id}/master">${canMaster(b.id) ? ic('sheet') : ic('lock')}Master sheet${m ? `<span class="tm" data-act="tabmenu" data-id="master" data-b="${b.id}">▾</span>` : ''}</button>
   ${shs.map(s => { const p = sheetPerm(s); return `<button class="tb ${sub === s.id ? 'on' : ''}" data-go="/b/${b.id}/sheets/${s.id}">${p === 'none' ? ic('lock') : ''}${esc(s.name)}${m ? `<span class="tm" data-act="tabmenu" data-id="${s.id}">▾</span>` : `<span class="tn">${count(s.id)}</span>`}</button>`; }).join('')}</div>
   <span class="sp"></span><span class="small muted nowrap" id="cnt-${esc(sk(sc))}">${locked ? '' : rowsInfo(sc)}</span></div>`;
  const gm = sub === 'master' ? gs(sk(sc)) : null, mr = sub === 'master' ? scopeRows(sc) : [];
  const catChips = cats.length > 1 ? `<div class="chips">${['', ...cats].map(c => `<button class="chip ${cat === c ? 'on' : ''}" data-act="cat" data-id="${b.id}" data-v="${esc(c)}">${c ? esc(c) : 'All categories'} <span class="n">${c ? all.filter(s => s.category === c).length : all.length}</span>${c && m ? `<span class="tm" data-act="catmenu" data-id="${b.id}" data-v="${esc(c)}">▾</span>` : ''}</button>`).join('')}</div>` : (m && cats.length === 1 ? `<span class="small muted">Category: <b>${esc(cats[0])}</b> <button class="lnk" data-act="catmenu" data-id="${b.id}" data-v="${esc(cats[0])}">rename</button></span>` : '');
  const srcChips = gm ? `<div class="chips">${SRCG.map(([k, l]) => `<button class="chip ${(gm.sg || '') === k ? 'on' : ''}" data-act="srcg" data-g="${esc(sk(sc))}" data-v="${k}">${l} <span class="n">${k ? mr.filter(r => srcGroup(r) === k).length : mr.length}</span></button>`).join('')}<label class="small row" style="gap:4px;margin-left:8px"><input type="checkbox" data-act="mergedup" data-g="${esc(sk(sc))}" ${gm.merge ? 'checked' : ''}>One row per person</label></div>` : '';
  const cats2 = `<div class="xlcats">${sub === 'master' ? srcChips : catChips}<span class="sp"></span>
   ${m ? `<button class="btn sm" data-act="import" data-id="${b.id}" ${sh ? `data-v="${sh.id}"` : ''}>${ic('up')}Upload sheet</button>` : ''}${m ? `<button class="btn sm" data-act="${sh ? 'access' : 'maccess'}" data-id="${sh ? sh.id : b.id}">${ic('lock')}Access</button>` : ''}</div>`;
  let body;
  if (locked) {
    const q = myReq(sub);
    body = `<div class="lockbox">${ic('lock')}<h2>You don't have access to ${sub === 'master' ? 'the master sheet' : '“' + esc(sh.name) + '”'}</h2><p class="muted">Ask the business admin for access. They will see your request straight away.</p>${q ? `<div class="pill warn">Request sent ${esc(rel(q.at))} — waiting for approval</div>` : `<div class="row" style="justify-content:center"><button class="btn" data-act="reqaccess" data-id="${b.id}" data-v="${esc(sub)}" data-l="view">Request view access</button>${sub !== 'master' ? `<button class="btn pri" data-act="reqaccess" data-id="${b.id}" data-v="${esc(sub)}" data-l="edit">Request edit access</button>` : ''}</div>`}</div>`;
  } else {
    let note = '';
    if (sh && perm === 'none') note = `<div class="xlnote">You only see the ${own} records assigned to you. ${myReq(sub) ? '<b>Access requested — waiting for approval.</b>' : `<button class="lnk" data-act="reqaccess" data-id="${b.id}" data-v="${sh.id}" data-l="view">Request access to the whole sheet</button>`}</div>`;
    else if (sh && perm === 'view') note = `<div class="xlnote">${ic('eye')} View only — you can edit only the records assigned to you. ${myReq(sub) ? '<b>Edit access requested.</b>' : `<button class="lnk" data-act="reqaccess" data-id="${b.id}" data-v="${sh.id}" data-l="edit">Request edit access</button>`}</div>`;
    body = note + grid(sc);
  }
  return `<div class="xl ${UI.fs ? 'fs' : ''}">${UI.fs ? '' : cats2}${body}${tabs}</div>`;
}
function rowsInfo(sc) { const k = sk(sc), g = gs(k), n = gfilter(sc).length, t = scopeRows(sc).length, sh = Math.min(n, g.limit); return `${n < t ? '⛃ ' : ''}${sh < n ? `${sh} of ` : ''}${n}${n < t ? ' of ' + t : ''} rows${sh < n ? ` · <button class="lnk" data-act="showall" data-g="${esc(k)}">Show all</button>` : ''}`; }
function vMasterAll() {
  const sc = { bid: '', sid: 'master', cat: '' };
  return `<div class="ph"><div class="t"><h1 class="row">${ic('sheet')} Master sheet</h1><p>Every record from every business and sheet. Filter, edit, assign and export from one place.</p></div></div>${grid(sc)}`;
}

/* grid */
const sk = sc => (sc.bid || 'all') + ':' + sc.sid + ':' + (sc.cat || '') + (sc.fu ? ':fu' : '');
const gs = k => UI.grid[k] || (UI.grid[k] = /:fu$/.test(k) ? { q: '', st: '', pr: '', ow: '', col: '', src: '', sort: 'followUp', dir: 1, limit: 300, allCols: true, merge: false, fw: 'all' } : { q: '', st: '', pr: '', ow: '', col: '', src: '', sort: /:master:/.test(k) ? 'added' : 'pos', dir: /:master:/.test(k) ? -1 : 1, limit: 300, allCols: true, merge: false });
function scopeSheets(sc) { return sc.sid === 'master' ? S.sheets.filter(s => (!sc.bid || s.businessId === sc.bid) && (!sc.cat || s.category === sc.cat)) : [SH(sc.sid)].filter(Boolean); }
function scopeRows(sc) { const ids = new Set(scopeSheets(sc).map(s => s.id)); return S.rows.filter(r => ids.has(r.sheetId) && (!sc.fu || (r.followUp && canEdit(r)))); }
const FUW = [['all', 'All'], ['over', 'Overdue'], ['today', 'Today'], ['tom', 'Tomorrow'], ['week', 'This week']];
function fuMatch(r, w) { const now = Date.now(), t = sod(now); return w === 'over' ? r.followUp < now : w === 'today' ? r.followUp < t + DAY : w === 'tom' ? r.followUp >= t + DAY && r.followUp < t + 2 * DAY : w === 'week' ? r.followUp < t + 7 * DAY : true; }
function gcols(sc) {
  const shs = scopeSheets(sc), one = sc.sid !== 'master' ? shs[0] : null;
  let lw = {}; try { lw = JSON.parse(localStorage.getItem('rarevo-colw-' + sk(sc)) || '{}'); } catch (e) {}
  const W = (k, d) => (one && one.widths && one.widths[k]) || lw[k] || d;
  const lb = k => (one && one.labels && one.labels[k]) || BLABEL[k];
  const hid = new Set(one ? one.hidden || [] : []);
  const base = [['name', 170], ['phone', 130], ['email', 180], ['source', 115], ['status', 125], ['priority', 95], ['owner', 130], ['added', 165], ['followUp', 160], ['closed', 110], ['price', 100]];
  let c = [{ k: 'color', w: 30, l: '' }, ...base.filter(([k]) => !hid.has(k)).map(([k, w]) => ({ k, l: lb(k), w: W(k, w), built: true }))];
  if (sc.sid === 'master') { if (!sc.bid) c.push({ k: 'business', l: 'Business', w: W('business', 125) }); c.push({ k: 'sheet', l: 'Sheet', w: W('sheet', 140) }, { k: 'category', l: 'Category', w: W('category', 115) }); }
  if (one) one.columns.forEach(x => c.push({ k: 'd:' + x.id, l: x.name, w: W('d:' + x.id, x.type === 'check' ? 90 : 150), def: x }));
  else if (gs(sk(sc)).allCols) { const m = new Map(); shs.forEach(s => s.columns.forEach(x => { const n = x.name.trim().toLowerCase(); if (!m.has(n)) m.set(n, { k: 'x:' + n, l: x.name, w: W('x:' + n, 150), def: x }); })); c.push(...m.values()); }
  if (!hid.has('notes')) c.push({ k: 'notes', l: lb('notes'), w: W('notes', 260), built: true });
  if (sc.sid === 'master' || (one && one.source === 'whatsapp')) c.push({ k: 'wa', l: 'Last WhatsApp', w: W('wa', 220) }, { k: 'waAt', l: 'Last chat', w: W('waAt', 140) });
  if (one && one.order && one.order.length) { const idx = k => { const i = one.order.indexOf(k); return i < 0 ? 999 : i; }; const fixed = c.filter(x => x.k === 'color'), rest = c.filter(x => x.k !== 'color'); rest.sort((a, b) => idx(a.k) - idx(b.k)); c.length = 0; c.push(...fixed, ...rest); }
  c.push({ k: 'act', l: '', w: 104 });
  { const hc = (UI.grid[sk(sc)] || {}).hc; if (hc && hc.length) c = c.filter(x => !hc.includes(x.k)); }
  let n = 0; c.forEach(x => { if (x.k !== 'color' && x.k !== 'act') x.letter = colLetter(n++); });
  return c;
}
const colLetter = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
function colDef(r, col) { if (col.k.startsWith('d:')) return col.def; const n = col.k.slice(2); return ((SH(r.sheetId) || {}).columns || []).find(x => x.name.trim().toLowerCase() === n); }
function sval(r, k, col) {
  if (k === 'wa') return r.wa ? r.wa.msg : ''; if (k === 'waAt') return r.wa ? r.wa.at : null;
  if (k === 'owner') return uname(r.owner); if (k === 'sheet') return (SH(r.sheetId) || {}).name; if (k === 'category') return (SH(r.sheetId) || {}).category; if (k === 'business') return (B(r.businessId) || {}).name;
  if (k.startsWith('d:') || k.startsWith('x:')) { const d = col && colDef(r, col); return d ? (r.data || {})[d.id] : ''; }
  return r[k];
}
const SRCG = [['', 'All'], ['wa', 'WhatsApp'], ['sheet', 'Excel / sheets'], ['web', 'Website & forms'], ['meta', 'Meta'], ['manual', 'Added by hand']];
function srcGroup(r) { const s = String(r.source || '').toLowerCase(); if (s.includes('whatsapp')) return 'wa'; if (/meta|facebook|instagram|\bfb\b|\big\b/.test(s)) return 'meta'; if (/website|form|web|landing/.test(s)) return 'web'; if (!s || s === 'manual') return 'manual'; return 'sheet'; }
function gfilter(sc) {
  const g = gs(sk(sc)), q = g.q.trim().toLowerCase();
  let rows = scopeRows(sc).filter(r => (!g.st || r.status === g.st) && (!g.pr || r.priority === g.pr) && (!g.col || r.color === g.col) && (!g.src || r.source === g.src) && (!g.sg || srcGroup(r) === g.sg) && (!g.shf || r.sheetId === g.shf) && (!sc.fu || fuMatch(r, g.fw || 'all')) && (g.ow === '' || (g.ow === '-' ? !r.owner : r.owner === g.ow)));
  if (q) rows = rows.filter(r => [r.name, r.phone, r.email, r.notes, r.source, r.status, uname(r.owner), ...Object.values(r.data || {})].join(' ').toLowerCase().includes(q));
  const cols = gcols(sc), col = cols.find(c => c.k === g.sort);
  rows.sort((a, b) => { const x = sval(a, g.sort, col) ?? (g.sort === 'pos' ? a.added : null), y = sval(b, g.sort, col) ?? (g.sort === 'pos' ? b.added : null); if (x == null || x === '') return 1; if (y == null || y === '') return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * g.dir; });
  const cfs = Object.keys(g).filter(x => x.startsWith('cf:') && g[x]);
  if (cfs.length) rows = rows.filter(r => cfs.every(x => { const c = cols.find(y => y.k === x.slice(3)); if (!c) return true; const val = rawVal(r, c), w = g[x]; const d = colDef(r, c); if (d && d.type === 'check') return w === '1' ? !!val : !val; const sv = String(val ?? '').trim(); return w === '-' ? !sv : (d && d.type === 'multi' ? sv.split(',').map(x => x.trim()).includes(w) : sv === w); }));
  UI.dups = {};
  if (sc.sid === 'master' && g.merge) {
    const seen = new Map(), out = [];
    for (const r of rows) { const keyP = digits(r.phone), keyE = String(r.email || '').toLowerCase(); const k1 = keyP ? 'p' + keyP : keyE ? 'e' + keyE : ''; if (k1 && seen.has(k1)) { const f = seen.get(k1); (UI.dups[f.id] = UI.dups[f.id] || []).push(r); continue; } if (k1) seen.set(k1, r); out.push(r); }
    rows = out;
  }
  return rows;
}
function rngRowIds() { const R = UI.rng; if (!R) return []; return UI.vrows.slice(R.r1, R.r2 + 1); }
function cvKey(r, c) { if (c.k.startsWith('d:') || c.k.startsWith('x:')) { const d = colDef(r, c); return d ? r.id + '|d:' + d.id : null; } return r.id + '|' + c.k; }
function cvOf(r, c) { const sh = SH(r.sheetId), k = cvKey(r, c); return sh && sh.cellv && k ? sh.cellv[k] || null : null; }
function cvOpts(v) { return v.type === 'yesno' ? ['Yes', 'No'] : (v.options || []); }
function cfFilters(sc, cols, sel) {
  const rows = scopeRows(sc);
  return cols.filter(c => (c.k.startsWith('d:') || c.k.startsWith('x:')) && cellType(c) !== 'ro').map(c => {
    const d = rows.map(r => colDef(r, c)).find(Boolean); if (!d || !['select', 'multi', 'yesno', 'check'].includes(d.type)) return '';
    if (d.type === 'check') return sel('cf:' + c.k, [['1', c.l + ': ticked'], ['0', c.l + ': not ticked']], c.l);
    const base = d.type === 'yesno' ? ['Yes', 'No'] : (d.options || []);
    const vals = [...new Set([...base, ...rows.flatMap(r => d.type === 'multi' ? String(rawVal(r, c) ?? '').split(',') : [String(rawVal(r, c) ?? '')]).map(x => x.trim()).filter(Boolean)])];
    return sel('cf:' + c.k, [...vals.map(x => [x, c.l + ': ' + x]), ['-', c.l + ': (empty)']], c.l);
  }).join('');
}
function grid(sc) {
  const k = sk(sc); UI.scopes[k] = sc; const g = gs(k), cols = gcols(sc), rows = gfilter(sc);
  UI.cols = {}; cols.forEach(c => { UI.cols[c.k] = c; }); UI.curScope = k; UI.dcols = cols.filter(c => c.letter); UI.domIdx = UI.dcols.map(c => 1 + cols.indexOf(c));
  const lab = sc.bid ? labelsOf(sc.bid) : LABELS, single = sc.sid !== 'master', m = sc.bid ? canManage(sc.bid) : isSuper();
  const sel = (f, list, ph) => `<select class="sel sm" data-act="gf" data-g="${esc(k)}" data-v="${f}" aria-label="${ph}"><option value="">${ph}</option>${list.map(([x, l]) => `<option value="${esc(x)}" ${g[f] === x ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const allSel = rows.length && rows.slice(0, g.limit).every(r => UI.sel.has(r.id));
  const canAdd = single && (sheetPerm(SH(sc.sid)) === 'edit' || S.me.role === 'staff');
  const tw = 46 + cols.reduce((a, c) => a + c.w, 0) + (single && m ? 44 : 0);
  return `<div class="xltool"><input class="inp sm search" type="search" placeholder="Search…" data-act="gq" data-g="${esc(k)}" value="${esc(g.q)}">
   ${sel('st', STATUSES.map(s => [s, s]), 'Status')}${sel('pr', PRIOS.map(s => [s, s]), 'Priority')}${sel('src', SOURCES.map(s => [s, s]), 'Source')}${m ? sel('ow', [['-', 'Unassigned'], ...(sc.bid ? assignable(sc.bid) : S.users).map(u => [u.id, u.name])], 'POC') : ''}${!single && sc.bid ? sel('shf', sheetsOf(sc.bid).map(x => [x.id, 'Sheet: ' + x.name]), 'All sheets') : ''}${cfFilters(sc, cols, sel)}
   <div class="colors">${COLORS.map(c => `<button class="${g.col === c ? 'on' : ''}" data-act="gcol" data-g="${esc(k)}" data-v="${c}" title="${esc(lab[c] || c)}"><i class="cd" style="--c:var(--c-${c})"></i><span>${esc(lab[c] || c)}</span></button>`).join('')}${sc.bid && m ? `<button data-act="editcolors" data-id="${esc(sc.bid)}" title="Rename or recolour these labels">✎</button>` : ''}</div>
   <span class="sp"></span>${!single ? `<label class="sw small"><input type="checkbox" data-act="allcols" data-g="${esc(k)}" ${g.allCols ? 'checked' : ''}>All columns</label>` : ''}
   <button class="btn sm icon ${UI.wrap ? 'dark' : ''}" data-act="wrap" title="Wrap text" aria-label="Wrap text">${ic('wrap')}</button>
   <button class="btn sm" data-act="export" data-g="${esc(k)}">${ic('down')}Export</button>${canAdd ? `<button class="btn sm pri" data-act="addrow" data-id="${sc.sid}">${ic('plus')}Row</button>` : ''}
   <button class="btn sm ${UI.fs ? 'dark' : ''}" data-act="fs" title="Full screen (Esc to exit)">${ic('full')}${UI.fs ? 'Exit' : 'Full screen'}</button>${(single ? (m || canAdd) : sc.bid && (m || S.me.role === 'staff')) ? `<button class="btn sm" data-act="insmenu" title="Insert rows, columns, dropdowns">${ic('plus')}Insert ▾</button>` : ''}</div>
  <div class="fbar"><div class="fmt">${[['fmtb', 'bold', 'Bold (Ctrl+B)'], ['fmti', 'italic', 'Italic (Ctrl+I)'], ['fmtc', 'txtc', 'Text colour'], ['fmtfill', 'fill', 'Row fill colour'], ['fmtclear', 'clear', 'Clear formatting']].map(([a, i2, t2]) => `<button class="fb" data-act="${a}" title="${t2}" aria-label="${t2}">${ic(i2)}</button>`).join('')}</div><input class="namebox" id="nameBox" readonly value="" aria-label="Cell"><span class="fx">fx</span><input class="fxin" id="fx" placeholder="Select a cell — double-click or start typing to edit" aria-label="Cell value"></div>
  <div class="sheetwrap ${UI.wrap ? 'wrapon' : ''}"><table class="gs" style="width:${tw}px"><colgroup><col style="width:46px">${cols.map(c => `<col data-k="${esc(c.k)}" style="width:${c.w}px">`).join('')}${single && m ? '<col style="width:44px">' : ''}</colgroup>
   <thead><tr class="lt"><th class="corner" data-act="selallcells" title="Select all"></th>${cols.map(c => `<th class="${c.letter ? 'lc' : 'nol'}" ${c.letter ? `data-ci="${UI.dcols.indexOf(c)}" title="Click to select column · drag to move · right-click for options"` : ''}>${c.letter || ''}${c.k !== 'act' && c.k !== 'color' ? `<span class="rz" data-rk="${esc(c.k)}"></span>` : ''}</th>`).join('')}${single && m ? '<th></th>' : ''}</tr>
   <tr class="hd"><th class="rnh"><input type="checkbox" class="cb" data-act="selall" data-g="${esc(k)}" ${allSel ? 'checked' : ''} aria-label="Select all rows"></th>${cols.map(c => {
     if (c.k === 'act' || c.k === 'color') return '<th></th>';
     const ren = single && m && (c.built || c.def);
     return `<th class="hn" ${ren ? `data-ren="${esc(c.k)}" data-sid="${esc(sc.sid)}" title="Double-click to rename"` : ''}><span class="hl">${esc(c.l)}</span>${g.sort === c.k ? `<span class="ar">${g.dir > 0 ? '↑' : '↓'}</span>` : ''}<button class="hm" data-act="colmenu" data-g="${esc(k)}" data-v="${esc(c.k)}" aria-label="Column menu">▾</button></th>`;
   }).join('')}${single && m ? `<th class="addc"><button class="hm" data-act="quickcol" data-id="${sc.sid}" title="Add column" aria-label="Add column">+</button></th>` : ''}</tr></thead>
   <tbody id="tb-${esc(k)}">${gbody(sc, rows, cols)}</tbody></table></div>

  ${UI.sel.size ? bulkBar(sc) : ''}`;
}
function gbody(sc, rows, cols) {
  const g = gs(sk(sc)), extra = UI.extra = sc.sid !== 'master' && (sc.bid ? canManage(sc.bid) : isSuper()) ? 1 : 0;
  if (!rows.length) { UI.vrows = []; } if (!rows.length) return `<tr><td colspan="${cols.length + 1 + extra}"><div class="empty">${scopeRows(sc).length ? 'No rows match these filters' : 'No records yet — add a row or upload a sheet'}</div></td></tr>`;
  const shown = rows.slice(0, g.limit); UI.vrows = shown.map(r => r.id);
  return shown.map((r, i) => rowHtml(r, i, cols, extra)).join('');
}
function rowHtml(r, i, cols, extra) {
  return `<tr data-rid="${r.id}" class="${UI.sel.has(r.id) ? 'chk' : ''}" style="${r.color ? `--rb:var(--t-${r.color});` : ''}${r.h ? `height:${r.h}px` : ''}"><td class="rn"><input type="checkbox" class="cb" data-act="selrow" data-id="${r.id}" ${UI.sel.has(r.id) ? 'checked' : ''} aria-label="Tick row"><span class="rnum2" title="Click to select row · drag to move">${i + 1}</span><span class="rzr" title="Drag to change row height · double-click to reset"></span></td>${cols.map(c => cellHtml(r, c)).join('')}${extra ? '<td class="c" data-ro="1"></td>' : ''}</tr>`;
}
function cellType(c) {
  if (['status', 'priority', 'owner', 'source', 'sheet'].includes(c.k)) return 'select';
  if (c.k === 'followUp') return 'datetime'; if (c.k === 'closed') return 'date'; if (c.k === 'price') return 'number';
  if (['added', 'business', 'category', 'act', 'color', 'wa', 'waAt'].includes(c.k)) return 'ro';
  if (c.k === 'notes') return 'long';
  if (c.def && c.def.type === 'multi') return 'multi';
  if (c.def) return ['select', 'yesno'].includes(c.def.type) ? 'select' : c.def.type === 'check' ? 'check' : c.def.type === 'number' ? 'number' : c.def.type === 'date' ? 'date' : 'long';
  return 'text';
}
function rawVal(r, c) {
  if (c.k === 'wa') return r.wa ? r.wa.msg : ''; if (c.k === 'waAt') return r.wa ? r.wa.at : '';
  if (c.k.startsWith('d:') || c.k.startsWith('x:')) { const d = colDef(r, c); return d ? (r.data || {})[d.id] ?? '' : ''; }
  if (c.k === 'owner') return r.owner; if (c.k === 'sheet') return r.sheetId;
  return r[c.k] ?? '';
}
function shownVal(r, c) {
  const v = rawVal(r, c);
  if (c.k === 'wa') return r.wa ? r.wa.msg : ''; if (c.k === 'waAt') return r.wa && r.wa.at ? fDT(r.wa.at) : '';
  if (c.k === 'owner') return uname(v); if (c.k === 'sheet') { const n = (SH(r.sheetId) || {}).name || ''; const d = (UI.dups || {})[r.id]; return d ? n + '  +' + d.map(x => (SH(x.sheetId) || {}).name).join(', ') : n; }
  if (c.k === 'category') return (SH(r.sheetId) || {}).category || ''; if (c.k === 'business') return (B(r.businessId) || {}).name || '';
  if (c.k === 'added' || c.k === 'followUp') return v ? fDT(v) : ''; if (c.k === 'closed') return v ? fD(v) : '';
  if (c.k === 'price') return v === '' || v == null ? '' : money(v, (B(r.businessId) || {}).currency);
  if (cellType(c) === 'date' && v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return fD(pD(v));
  if (cellType(c) === 'check') return v ? 'Yes' : 'No';
  return String(v ?? '');
}
function cellHtml(r, c) {
  const t = cellType(c), ed = canEdit(r) && t !== 'ro';
  const fm = (r.fmt || {})[c.k] || {};
  const base = `class="c t-${t}${c.k === 'name' || fm.b ? ' bold' : ''}${fm.i ? ' ital' : ''}${fm.c ? ' tc-' + fm.c : ''}${c.k === 'followUp' && r.followUp && r.followUp < Date.now() ? ' over' : ''}" data-k="${esc(c.k)}" data-c="${c.letter || ''}"${ed ? '' : ' data-ro="1"'}`;
  if (c.k === 'color') return `<td class="c cc" data-k="color" data-ro="1"><button class="cbtn" data-act="color" data-id="${r.id}" ${canEdit(r) ? '' : 'disabled'} title="${esc(labelsOf(r.businessId)[r.color] || 'No colour')} — click to change"><i class="cd" ${r.color ? `style="--c:var(--c-${r.color})"` : ''}></i></button></td>`;
  if (c.k === 'act') return `<td class="c ca" data-k="act" data-ro="1"><div class="acts">${r.phone ? `<button class="btn xs ghost" data-act="chat" data-id="${r.id}" title="WhatsApp" aria-label="WhatsApp">${ic('wa')}</button>` : ''}<button class="btn xs ghost" data-act="meet" data-id="${r.id}" title="Google Calendar meeting" aria-label="Meeting">${ic('cal')}</button><button class="btn xs ghost" data-act="open" data-id="${r.id}">Open</button></div></td>`;
  if ((c.k.startsWith('d:') || c.k.startsWith('x:')) && !colDef(r, c)) return `<td class="c" data-k="${esc(c.k)}" data-c="${c.letter || ''}" data-ro="1"><span class="muted">—</span></td>`;
  const v = shownVal(r, c), cvv = !['select', 'check', 'ro'].includes(t) && cvOf(r, c);
  if (cvv) { const ops = cvOpts(cvv), vs = cvv.type === 'multi' ? String(v || '').split(',').map(x => x.trim()).filter(Boolean) : (v ? [String(v)] : []);
    return `<td ${base.replace('class="c ', 'class="c cv ')}>${vs.map(x => `<span class="chip2 ${cvv.type === 'yesno' ? (x === 'Yes' ? 'yn-y' : x === 'No' ? 'yn-n' : '') : 'op' + (Math.max(0, ops.indexOf(x)) % 8)}">${esc(x)}${cvv.type !== 'multi' && ed ? '<i>▾</i>' : ''}</span>`).join(' ') || (ed ? '<span class="chip2 cvph">Choose ▾</span>' : '')}</td>`; }
  if (t === 'select') {
    if (!v && !ed) return `<td ${base}></td>`;
    const cd = (c.k.startsWith('d:') || c.k.startsWith('x:')) ? colDef(r, c) : null, dt = cd && cd.type, oi = dt === 'select' ? (cd.options || []).indexOf(v) : -1;
    const cls = dt === 'yesno' ? (v === 'Yes' ? 'yn-y' : v === 'No' ? 'yn-n' : '') : oi >= 0 ? 'op' + (oi % 8) : c.k === 'status' ? 'st-' + esc(String(v).split(' ')[0]) : c.k === 'priority' ? 'pr-' + esc(v) : c.k === 'source' ? 'src ' + srcCls(v) : '';
    return `<td ${base}><span class="chip2 ${cls}">${esc(v || '—')}${ed ? '<i>▾</i>' : ''}</span></td>`;
  }
  if (t === 'multi') { const ops = (colDef(r, c) || {}).options || [], vs = String(v || '').split(',').map(x => x.trim()).filter(Boolean); return `<td ${base}>${vs.map(x => `<span class="chip2 op${Math.max(0, ops.indexOf(x)) % 8}">${esc(x)}</span>`).join(' ')}${ed ? '<span class="chip2 madd">＋</span>' : ''}</td>`; }
  if (t === 'check') return `<td ${base}><input type="checkbox" class="cb" data-act="chk" data-id="${r.id}" data-k="${esc(c.k)}" ${rawVal(r, c) ? 'checked' : ''} ${ed ? '' : 'disabled'} aria-label="${esc(c.l)}"></td>`;
  return `<td ${base}>${esc(v)}</td>`;
}
function bulkBar(sc) {
  const n = UI.sel.size, bids = new Set(S.rows.filter(r => UI.sel.has(r.id)).map(r => r.businessId));
  const oneBiz = bids.size === 1 ? [...bids][0] : '', m = oneBiz ? canManage(oneBiz) : isSuper();
  return `<div class="bulk"><b>${n} selected</b>
   ${m ? `<select class="sel" id="bkOw"><option value="">Assign to…</option><option value="-">Unassigned</option>${(oneBiz ? assignable(oneBiz) : S.users).map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</select><button class="btn" data-act="bulk" data-v="assign">Assign</button>` : ''}
   <select class="sel" id="bkSt"><option value="">Set status…</option>${STATUSES.map(s => `<option>${s}</option>`).join('')}</select><button class="btn" data-act="bulk" data-v="status">Apply</button>
   <span class="bkfu">Follow-up <input class="inp" type="datetime-local" id="bkFu" style="height:30px;width:190px"><button class="btn" data-act="bulk" data-v="fu">Set</button><button class="btn" data-act="bulkfu" data-v="1">Tomorrow 10am</button><button class="btn" data-act="bulkfu" data-v="0">Remove</button></span>
   ${m && oneBiz ? `<select class="sel" id="bkSh"><option value="">Move to sheet…</option>${sheetsOf(oneBiz).map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select><button class="btn" data-act="bulk" data-v="move">Move</button>` : ''}
   <span class="sp"></span><button class="btn" data-act="bulk" data-v="export">Export</button>${m ? `<button class="btn danger" data-act="bulk" data-v="delete">Delete</button>` : ''}<button class="btn" data-act="bulk" data-v="clear">Clear</button></div>`;
}
function refreshBody(k) {
  const sc = UI.scopes[k]; if (!sc) return; const rows = gfilter(sc), tb = document.getElementById('tb-' + k), cn = document.getElementById('cnt-' + k);
  if (tb) tb.innerHTML = gbody(sc, rows, gcols(sc)); if (cn) cn.innerHTML = rowsInfo(sc); UI.cur = null; UI.anchor = null; setFx(null);
}
/* ---------- spreadsheet interaction: select, edit, keyboard, resize ---------- */
function setFx(td) {
  const nb = $('#nameBox'), fx = $('#fx'); if (!nb || !fx) return;
  if (!td) { nb.value = ''; fx.value = ''; fx.readOnly = true; return; }
  const r = S.rows.find(x => x.id === td.parentElement.dataset.rid), c = UI.cols[td.dataset.k];
  const rn = td.parentElement.querySelector('.rn span');
  nb.value = (td.dataset.c || '') + (rn ? rn.textContent : '');
  const t = c ? cellType(c) : 'ro';
  fx.value = r && c ? (['text', 'long', 'number'].includes(t) ? String(rawVal(r, c) ?? '') : shownVal(r, c)) : '';
  fx.readOnly = !!td.dataset.ro || !['text', 'long', 'number'].includes(t);
}
function cellPos(td) { return { ri: UI.vrows.indexOf(td.parentElement.dataset.rid), ci: UI.dcols.findIndex(c => c.k === td.dataset.k) }; }
function tdAt(ri, ci) { const id = UI.vrows[ri], c = UI.dcols[ci]; if (!id || !c) return null; const tr = document.querySelector(`.gs tr[data-rid="${CSS.escape(id)}"]`); return tr ? tr.children[UI.domIdx[ci]] : null; }
function normR(a, b) { return { r1: Math.min(a.ri, b.ri), r2: Math.max(a.ri, b.ri), c1: Math.min(a.ci, b.ci), c2: Math.max(a.ci, b.ci) }; }
function paint() {
  $$('.gs .insel,.gs .cur,.gs .lsel,.gs .rsel').forEach(x => x.classList.remove('insel', 'cur', 'lsel', 'rsel'));
  $$('.gs .fh').forEach(x => x.remove());
  if (!UI.anchor) return;
  const R = UI.rng || normR(UI.anchor, UI.anchor), many = R.r1 !== R.r2 || R.c1 !== R.c2;
  if (many) for (let ri = R.r1; ri <= R.r2; ri++) { const tr = document.querySelector(`.gs tr[data-rid="${CSS.escape(UI.vrows[ri] || '')}"]`); if (!tr) continue; tr.querySelector('.rn').classList.add('rsel'); for (let ci = R.c1; ci <= R.c2; ci++) { const td = tr.children[UI.domIdx[ci]]; if (td) td.classList.add('insel'); } }
  for (let ci = R.c1; ci <= R.c2; ci++) { const th = document.querySelector(`.gs tr.lt th[data-ci="${ci}"]`); if (th) th.classList.add('lsel'); }
  const td = tdAt(UI.anchor.ri, UI.anchor.ci);
  if (td) { td.classList.add('cur'); if (!td.dataset.ro) td.insertAdjacentHTML('beforeend', '<span class="fh" title="Drag down to fill"></span>'); UI.cur = { rid: UI.vrows[UI.anchor.ri], k: UI.dcols[UI.anchor.ci].k }; setFx(td); }
  const nb = $('#nameBox'); if (nb && many) nb.value = UI.dcols[R.c1].letter + (R.r1 + 1) + ':' + UI.dcols[R.c2].letter + (R.r2 + 1);
}
function selCell(td, quiet, extend) {
  if (!td || !td.dataset.k || td.dataset.k === 'act' || td.dataset.k === 'color') return;
  const p = cellPos(td); if (p.ri < 0 || p.ci < 0) return;
  if (extend && UI.anchor) { UI.focus = p; UI.rng = normR(UI.anchor, p); }
  else { UI.anchor = p; UI.focus = p; UI.rng = normR(p, p); }
  paint(); if (!quiet) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function selRange(r1, c1, r2, c2) { UI.anchor = { ri: r1, ci: c1 }; UI.focus = { ri: r2, ci: c2 }; UI.rng = normR(UI.anchor, UI.focus); paint(); }
function curTd() { return UI.anchor ? tdAt(UI.anchor.ri, UI.anchor.ci) : null; }
function moveSel(dr, dc, extend) {
  if (!UI.anchor) return;
  const base = extend ? UI.focus : UI.anchor, n = { ri: Math.max(0, Math.min(UI.vrows.length - 1, base.ri + dr)), ci: Math.max(0, Math.min(UI.dcols.length - 1, base.ci + dc)) };
  if (extend) { UI.focus = n; UI.rng = normR(UI.anchor, n); paint(); } else { UI.anchor = n; UI.focus = n; UI.rng = normR(n, n); paint(); }
  const td = tdAt(n.ri, n.ci); if (td) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function editorOpts(r, c) {
  if (c.k === 'status') return STATUSES.map(x => [x, x]); if (c.k === 'priority') return PRIOS.map(x => [x, x]);
  if (c.k === 'source') return [...new Set([...SOURCES, r.source])].map(x => [x, x]);
  if (c.k === 'owner') return [['', 'Unassigned'], ...assignable(r.businessId).map(u => [u.id, u.name])];
  if (c.k === 'sheet') return sheetsOf(r.businessId).map(x => [x.id, x.name]);
  const d = colDef(r, c); const v = String(rawVal(r, c) || ''); const base = d.type === 'yesno' ? ['Yes', 'No'] : (d.options || []);
  return [['', ''], ...[...new Set([...base, ...(v ? [v] : [])])].map(x => [x, x]), ...(d.type === 'select' && canManage(r.businessId) ? [['__new', '+ Add new option…']] : [])];
}
function startEdit(td, init) {
  if (!td || td.dataset.ro || UI.editing) return;
  if (td.dataset.k === 'owner' && !canManage((S.rows.find(x => x.id === td.parentElement.dataset.rid) || {}).businessId)) return toast('Only the business admin can assign records');
  const r = S.rows.find(x => x.id === td.parentElement.dataset.rid), c = UI.cols[td.dataset.k]; if (!r || !c) return;
  const t = cellType(c), raw = rawVal(r, c);
  if (t === 'multi') return multiPick(td, r, c);
  const cvv = !['select', 'check', 'ro'].includes(t) && cvOf(r, c);
  if (cvv && cvv.type === 'multi') return multiPick(td, r, c, cvv);
  if (cvv) { selCell(td, true); td.classList.add('editing'); UI.editing = { td, rid: r.id, k: c.k, html: td.innerHTML }; td.innerHTML = `<select class="ed">${[['', ''], ...[...new Set([...cvOpts(cvv), ...(raw ? [String(raw)] : [])])].map(x => [x, x]), ...(cvv.type !== 'yesno' && canManage(r.businessId) ? [['__cvnew', '+ Add new option…'], ['__cvedit', '✎ Edit / rename options…']] : [])].map(([x, l]) => `<option value="${esc(x)}" ${String(x) === String(raw ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`; const el = td.querySelector('.ed'); el.focus(); try { el.showPicker && el.showPicker(); } catch (e) {} return; }
  selCell(td, true); td.classList.add('editing');
  UI.editing = { td, rid: r.id, k: c.k, html: td.innerHTML };
  let h;
  if (t === 'select') h = `<select class="ed">${editorOpts(r, c).map(([x, l]) => `<option value="${esc(x)}" ${String(x) === String(raw ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  else if (t === 'datetime') h = `<input class="ed" type="datetime-local" value="${inDT(raw)}">`;
  else if (t === 'date') h = `<input class="ed" type="date" value="${esc(c.k === 'closed' ? inD(raw) : raw)}">`;
  else if (t === 'number') h = `<input class="ed num" type="text" inputmode="decimal" value="${esc(init != null ? init : raw ?? '')}">`;
  else h = `<textarea class="ed" rows="1">${esc(init != null ? init : raw ?? '')}</textarea>`;
  td.innerHTML = h;
  const el = td.querySelector('.ed'); el.focus();
  if (el.tagName === 'TEXTAREA') { const fit = () => { el.style.height = 'auto'; el.style.height = Math.max(td.clientHeight - 2, el.scrollHeight) + 'px'; }; fit(); el.addEventListener('input', fit); const n = el.value.length; el.setSelectionRange(n, n); }
  if (el.tagName === 'SELECT') { try { el.showPicker && el.showPicker(); } catch (e) {} }
}
function newOptModal(r, c) {
  UI.newOpt = { rid: r.id, cid: colDef(r, c).id };
  modal('Add option to “' + c.l + '”', `<label class="f">New option<input class="inp" id="noN" placeholder="e.g. Interested"></label><p class="hint">It is added to the dropdown for every row in this sheet. To rename or remove options: right-click the column letter → Change type / options.</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savenewopt">Add &amp; use</button>`);
}
function optDraw() { const L = $('#optList'); if (L) L.innerHTML = UI.opts.map((o, i) => `<span class="chip2 op${i % 8}">${esc(o)} <button class="x" data-act="optdel" data-v="${i}" aria-label="Remove">×</button></span>`).join('') || '<span class="muted small">No options yet</span>'; const h = $('#qcO'); if (h) h.value = UI.opts.join(','); }
function cvEdit(r, c) {
  const v = cvOf(r, c); if (!v) return; UI.cvE = { rid: r.id, k: cvKey(r, c), ck: c.k, list: cvOpts(v).map(o => ({ o, n: o })) };
  modal('Edit dropdown options', `<div id="cveList" class="stack"></div><div class="row" style="gap:6px;margin-top:8px"><input class="inp" id="cveNew" placeholder="New option" style="flex:1"><button class="btn" data-act="cveadd">+ Add</button></div><p class="hint">Change a name and it is renamed in the cell too.</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="cvesave">Save</button>`);
  cveDraw();
}
function cveDraw() { const L = $('#cveList'); if (!L) return; L.innerHTML = UI.cvE.list.map((x, i) => `<div class="row" style="gap:6px"><span class="chip2 op${i % 8}" style="min-width:14px">&nbsp;</span><input class="inp" data-cve="${i}" value="${esc(x.n)}" style="flex:1"><button class="btn sm" data-act="cvemv" data-v="${i}" data-d="-1" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-act="cvemv" data-v="${i}" data-d="1" ${i < UI.cvE.list.length - 1 ? '' : 'disabled'}>↓</button><button class="btn sm danger" data-act="cvedel" data-v="${i}">×</button></div>`).join('') || '<span class="muted small">No options</span>'; }
function cveKeep() { $$('[data-cve]').forEach(i => { UI.cvE.list[+i.dataset.cve].n = i.value.trim(); }); }
function multiPick(td, r, c, cvv) {
  const d = cvv ? { options: cvv.options, id: null } : (colDef(r, c) || {}), cur = String(rawVal(r, c) || '').split(',').map(x => x.trim()).filter(Boolean), ops = [...new Set([...(d.options || []), ...cur])];
  UI.mp = { rid: r.id, cid: d.id, k: c.k, cv: cvv ? cvKey(r, c) : null };
  popMenu(td, `<div class="mh small muted">${esc(c.l)} — pick any</div><div class="mplist">${ops.map(o => `<label class="mi"><input type="checkbox" class="mpc" value="${esc(o)}" ${cur.includes(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div>${canManage(r.businessId) ? `<div class="row" style="padding:4px 8px;gap:4px"><input class="inp" id="mpNew" placeholder="+ New option" style="height:28px;flex:1"></div>` : ''}<div class="row" style="padding:6px 8px;justify-content:space-between">${cvv && canManage(r.businessId) ? '<button class="btn sm" data-act="cvedit">✎ Edit options</button>' : '<span></span>'}<button class="btn sm pri" data-act="mpsave">Done</button></div>`);
  setTimeout(() => { const n = $('#mpNew'); if (n) n.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); A.mpsave(); } }); }, 0);
}
function cancelEdit() { const E = UI.editing; if (!E) return; UI.editing = null; E.td.classList.remove('editing'); E.td.innerHTML = E.html; }
async function commitEdit(move) {
  const E = UI.editing; if (!E) return; const el = E.td.querySelector('.ed'); if (!el) { UI.editing = null; return; }
  const r = S.rows.find(x => x.id === E.rid), c = UI.cols[E.k]; let val = el.value;
  UI.editing = null; E.td.classList.remove('editing');
  if (val === '__new') { E.td.innerHTML = E.html; return newOptModal(r, c); }
  if (val === '__cvedit') { E.td.innerHTML = E.html; return cvEdit(r, c); }
  if (val === '__cvnew') { E.td.innerHTML = E.html; UI.cvNew = { rid: r.id, k: cvKey(r, c), ck: c.k }; return modal('Add option', `<label class="f">New option<input class="inp" id="noN"></label>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savecvopt">Add &amp; use</button>`); }
  const t = cellType(c), old = rawVal(r, c);
  if (t === 'number') val = val.replace(/[^\d.-]/g, '');
  const same = t === 'datetime' ? inDT(old) === val : t === 'date' && c.k === 'closed' ? inD(old) === val : String(old ?? '') === String(val);
  if (same) { E.td.innerHTML = E.html; } else await saveCell(r, c, val);
  if (move) moveSel(move[0], move[1]);
}
function patchFor(r, c, val) {
  if (c.k.startsWith('d:') || c.k.startsWith('x:')) { const d = colDef(r, c); if (!d) return null; return { data: { [d.id]: val } }; }
  if (c.k === 'sheet') return { sheetId: val };
  if (['wa', 'waAt', 'added', 'business', 'category', 'act', 'color'].includes(c.k)) return null;
  return { [c.k]: val === '' && ['followUp', 'closed', 'price'].includes(c.k) ? null : val };
}
function mergeP(a, b) { if (!b) return a; const o = { ...a, ...b }; if (a.data || b.data) o.data = { ...(a.data || {}), ...(b.data || {}) }; return o; }
async function applyChanges(changes, label, noUndo) {
  const after = {}, before = {};
  for (const { r, c, val } of changes) {
    if (!r || !c || !canEdit(r)) continue;
    if (c.k === 'owner' && !canManage(r.businessId)) continue;
    const p = patchFor(r, c, val), o = patchFor(r, c, rawVal(r, c) ?? ''); if (!p) continue;
    after[r.id] = mergeP(after[r.id] || {}, p); before[r.id] = mergeP(before[r.id] || {}, o);
  }
  const ids = Object.keys(after); if (!ids.length) return 0;
  try {
    const res = await api('POST', '/rows/cells', { changes: ids.map(id => ({ id, patch: after[id] })) });
    res.rows.forEach(putRow); res.rows.forEach(x => redrawRow(x.id));
    if (!noUndo) { UI.undo = (UI.undo || []).concat([{ label, before: ids.map(id => ({ id, patch: before[id] })), after: ids.map(id => ({ id, patch: after[id] })) }]).slice(-60); UI.redo = []; }
    paint(); return ids.length;
  } catch (e) { toast(e.message, '', 1); ids.forEach(redrawRow); return 0; }
}
async function undoRedo(redo) {
  const st = redo ? UI.redo : UI.undo; if (!st || !st.length) return toast(redo ? 'Nothing to redo' : 'Nothing to undo');
  const e = st.pop();
  try { const res = await api('POST', '/rows/cells', { changes: redo ? e.after : e.before }); res.rows.forEach(putRow); res.rows.forEach(x => redrawRow(x.id)); (redo ? (UI.undo = UI.undo || []) : (UI.redo = UI.redo || [])).push(e); paint(); toast((redo ? 'Redone: ' : 'Undone: ') + e.label); }
  catch (err) { toast(err.message, '', 1); }
}
async function saveCell(r, c, val) { return applyChanges([{ r, c, val }], 'edit ' + (c.l || c.k)); }
function rangeCells() { const R = UI.rng; if (!R) return []; const out = []; for (let ri = R.r1; ri <= R.r2; ri++) for (let ci = R.c1; ci <= R.c2; ci++) { const r = S.rows.find(x => x.id === UI.vrows[ri]), c = UI.dcols[ci]; if (r && c) out.push({ r, c, ri, ci }); } return out; }
function clearRange() {
  const ch = rangeCells().filter(({ r, c }) => { const t = cellType(c); return t !== 'ro' && !['status', 'priority', 'source', 'sheet'].includes(c.k); }).map(({ r, c }) => ({ r, c, val: cellType(c) === 'check' ? false : '' }));
  if (!ch.length) return toast('Nothing here can be cleared');
  applyChanges(ch, 'clear ' + ch.length + ' cells').then(n => n && toast(`Cleared ${n} row${n > 1 ? 's' : ''}`, 'Ctrl+Z to undo'));
}
function copyRange() {
  const R = UI.rng; if (!R) return; const lines = [];
  for (let ri = R.r1; ri <= R.r2; ri++) { const r = S.rows.find(x => x.id === UI.vrows[ri]); const cells = []; for (let ci = R.c1; ci <= R.c2; ci++) { const c = UI.dcols[ci], t = cellType(c); cells.push(String(['text', 'long', 'number'].includes(t) ? rawVal(r, c) ?? '' : shownVal(r, c)).replace(/\t/g, ' ').replace(/\r?\n/g, ' ')); } lines.push(cells.join('\t')); }
  copyText(lines.join('\n'), `Copied ${(R.r2 - R.r1 + 1) * (R.c2 - R.c1 + 1)} cells`);
}
function convertIn(c, v, r) {
  v = String(v ?? '').trim(); const t = cellType(c);
  if (c.k === 'status') return STATUSES.find(x => x.toLowerCase() === v.toLowerCase()) ?? null;
  if (c.k === 'priority') return PRIOS.find(x => x.toLowerCase() === v.toLowerCase()) ?? null;
  if (c.k === 'owner') { if (!v) return ''; const u = assignable(r.businessId).find(x => x.name.toLowerCase() === v.toLowerCase() || x.username === v.toLowerCase()); return u ? u.id : null; }
  if (c.k === 'sheet') return null;
  if (t === 'check') return /^(yes|y|true|1|✓|x)$/i.test(v);
  if (t === 'number') return v.replace(/[^\d.-]/g, '');
  return v;
}
async function pasteText(txt) {
  if (!UI.anchor) return;
  const lines = txt.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t'));
  const ch = [], extra = [];
  lines.forEach((cells, i) => {
    const ri = UI.anchor.ri + i, rid = UI.vrows[ri], r = rid && S.rows.find(x => x.id === rid);
    if (!r) { extra.push(cells); return; }
    cells.forEach((v, j) => { const c = UI.dcols[UI.anchor.ci + j]; if (!c) return; const tdv = convertIn(c, v, r); if (tdv === null || cellType(c) === 'ro') return; ch.push({ r, c, val: tdv }); });
  });
  const n = ch.length ? await applyChanges(ch, 'paste') : 0;
  const sc = UI.scopes[UI.curScope];
  if (extra.length && sc && sc.sid !== 'master') {
    const list = extra.map(cells => { const o = { data: {}, source: 'Manual' }; cells.forEach((v, j) => { const c = UI.dcols[UI.anchor.ci + j]; if (!c) return; v = String(v ?? '').trim(); if (!v) return; if (c.k.startsWith('d:')) o.data[c.k.slice(2)] = v; else if (['name', 'phone', 'email', 'notes', 'source', 'status', 'priority', 'price', 'followUp', 'closed'].includes(c.k)) o[c.k] = v; }); return o; });
    try { const res = await api('POST', '/rows/bulk', { sheetId: sc.sid, rows: list, dedupe: false }); res.rows.forEach(putRow); softRender(); toast(`Pasted into ${n} rows and added ${res.rows.length} new rows`); return; } catch (e) { toast(e.message, '', 1); }
  }
  if (n) toast(`Pasted into ${n} row${n > 1 ? 's' : ''}`, 'Ctrl+Z to undo');
}
async function fillDown(toRi) {
  const R = UI.rng; if (!R || toRi <= R.r2) return;
  const ch = [];
  for (let ci = R.c1; ci <= R.c2; ci++) { const c = UI.dcols[ci], src = S.rows.find(x => x.id === UI.vrows[R.r1]); const val = rawVal(src, c); for (let ri = R.r2 + 1; ri <= toRi; ri++) { const r = S.rows.find(x => x.id === UI.vrows[ri]); if (r) ch.push({ r, c, val: val ?? '' }); } }
  const n = await applyChanges(ch, 'fill down'); if (n) { selRange(R.r1, R.c1, toRi, R.c2); toast(`Filled ${n} rows`, 'Ctrl+Z to undo'); }
}
async function moveColumn(from, to) {
  const sc = UI.scopes[UI.curScope]; if (!sc || sc.sid === 'master') return toast('Move columns inside a sheet');
  const sh = SH(sc.sid); if (!canManage(sh.businessId)) return toast('Only the business admin can move columns');
  if (from === to) return;
  const keys = UI.dcols.map(c => c.k); const [k] = keys.splice(from, 1); keys.splice(to, 0, k);
  const rest = (sh.order || []).filter(x => !keys.includes(x));
  try { putSheet(await api('PUT', '/sheets/' + sh.id, { order: keys.concat(rest) })); UI.cur = { rid: UI.vrows[UI.anchor ? UI.anchor.ri : 0], k }; UI.rng = null; softRender(); } catch (e) { toast(e.message, '', 1); }
}
async function moveRow(from, to) {
  const sc = UI.scopes[UI.curScope], g = gs(UI.curScope);
  if (!sc || sc.sid === 'master') return toast('Move rows inside a sheet');
  if (g.sort !== 'pos') { g.sort = 'pos'; g.dir = 1; softRender(); return toast('Switched to sheet order — drag the row again'); }
  const ids = UI.vrows.slice(); const [id] = ids.splice(from, 1); ids.splice(to, 0, id);
  const pos = i => (S.rows.find(x => x.id === ids[i]) || {}).pos;
  const before = to > 0 ? pos(to - 1) : null, after = to < ids.length - 1 ? pos(to + 1) : null;
  const np = before == null ? (after ?? 1) - 1 : after == null ? before + 1 : (before + after) / 2;
  const r = S.rows.find(x => x.id === id); if (!canEdit(r)) return toast('You can only view this record');
  try { const res = await api('POST', '/rows/cells', { changes: [{ id, patch: { pos: np } }] }); res.rows.forEach(putRow); softRender(); } catch (e) { toast(e.message, '', 1); }
}
function redrawRow(id) {
  const tr = document.querySelector(`.gs tr[data-rid="${CSS.escape(id)}"]`), r = S.rows.find(x => x.id === id); if (!tr || !r) return;
  const i = +(tr.querySelector('.rn span') || {}).textContent - 1 || 0, cols = Object.values(UI.cols), extra = UI.extra || 0;
  const wasCur = UI.cur && UI.cur.rid === id ? UI.cur.k : null;
  tr.outerHTML = rowHtml(r, i, cols, extra);
  if (wasCur) { const td = document.querySelector(`.gs tr[data-rid="${CSS.escape(id)}"] td[data-k="${CSS.escape(wasCur)}"]`); if (td) selCell(td, true); }
  const k = UI.curScope, cn = k && document.getElementById('cnt-' + k); if (cn && UI.scopes[k]) cn.innerHTML = rowsInfo(UI.scopes[k]);
}
function popMenu(anchor, html) {
  closePop(); const d = document.createElement('div'); d.className = 'pop'; d.innerHTML = html; document.body.append(d);
  const a = anchor.getBoundingClientRect(), w = d.offsetWidth, h = d.offsetHeight;
  let x = Math.min(a.left, innerWidth - w - 8), y = a.bottom + 4; if (y + h > innerHeight - 8) y = Math.max(8, a.top - h - 4);
  d.style.left = Math.max(8, x) + 'px'; d.style.top = y + 'px'; UI.popEl = d;
}
function closePop() { if (UI.popEl) { UI.popEl.remove(); UI.popEl = null; } }
const pi = (act, label, data, cls) => `<button class="mi ${cls || ''}" data-act="${act}" ${Object.entries(data || {}).map(([k, x]) => `data-${k}="${esc(x)}"`).join(' ')}>${label}</button>`;
function softRender() { const w = $('.sheetwrap'), x = w && w.scrollLeft, y = w && w.scrollTop; render(); const n = $('.sheetwrap'); if (n) { n.scrollLeft = x || 0; n.scrollTop = y || 0; } }

/* ---------------- csv / export ---------------- */
const csvq = x => { const s = String(x ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const toCsv = (h, rows) => [h, ...rows].map(r => r.map(csvq).join(',')).join('\r\n');
function rowsCsv(list) {
  const names = []; const seen = new Set();
  list.forEach(r => ((SH(r.sheetId) || {}).columns || []).forEach(c => { const n = c.name.trim(); if (!seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); names.push(n); } }));
  const cv = (r, n) => { const c = ((SH(r.sheetId) || {}).columns || []).find(x => x.name.trim().toLowerCase() === n.toLowerCase()); return c ? (r.data || {})[c.id] ?? '' : ''; };
  return toCsv(['Business', 'Sheet', 'Category', 'Name', 'Phone', 'Email', 'Source', 'Status', 'Priority', 'Colour', 'POC', 'Date added', 'Next follow-up', 'Closure date', 'Sale price', ...names, 'Notes'],
    list.map(r => [(B(r.businessId) || {}).name, (SH(r.sheetId) || {}).name, (SH(r.sheetId) || {}).category, r.name, r.phone, r.email, r.source, r.status, r.priority, labelsOf(r.businessId)[r.color] || '', uname(r.owner), fDT(r.added), fDT(r.followUp), fD(r.closed), r.price ?? '', ...names.map(n => cv(r, n)), r.notes]));
}
async function download(name, text) {
  const data = '﻿' + text;
  if (window.claude && window.claude.use) {
    try { if (!DL) DL = await window.claude.use('downloads'); if (DL) { await DL.save({ filename: name, data }); toast('Saved', name); return; } } catch (e) { if (e && e.code === 'declined') return; }
    return copyText(text, 'Copied — paste into Excel or Google Sheets');
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: name.endsWith('.json') ? 'application/json' : 'text/csv' })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
async function copyText(t, msg) { try { await navigator.clipboard.writeText(t); toast(msg || 'Copied'); } catch (e) { modal('Copy this', `<textarea class="inp" style="min-height:260px" readonly>${esc(t)}</textarea>`); } }

/* ---------------- import (CSV / Excel) ---------------- */
function parseCsv(text) {
  const first = text.split(/\r?\n/)[0] || '';
  const d = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const out = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true; else if (ch === d) { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  return out.filter(r => r.some(x => String(x).trim()));
}
const JUNK_RE = /^(total|grand total|sub ?total|auto-?calculated|summary|numbers reached|note[:\s]|remarks?:)/i;
const HEAD_RE = /name|phone|mobile|whats|email|e-mail|status|source|date|city|contact|number|lead|customer|client|remark|follow|price|amount|stage|poc|owner/i;
function detectHead(raw) {
  let best = 0, bs = -1;
  raw.slice(0, 15).forEach((r, i) => { const cells = r.map(x => String(x ?? '').trim()).filter(Boolean); if (!cells.length) return; const txt = cells.filter(x => !/^[\d\s.,:/+-]+$/.test(x)).length, kw = cells.filter(x => HEAD_RE.test(x) && x.length < 40).length; const sc = kw * 3 + txt - (cells.length === 1 ? 5 : 0); if (sc > bs) { bs = sc; best = i; } });
  return best;
}
function rowIsJunk(r, headers) {
  const cells = r.map(x => String(x ?? '').trim()), first = cells.find(Boolean) || '';
  if (cells.some(x => x.replace(/\D/g, '').length >= 7 && x.replace(/\D/g, '').length <= 15 && /^[\d\s+()-]+$/.test(x)) || cells.some(x => /@.+\./.test(x))) return false;
  if (JUNK_RE.test(first)) return true;
  if (headers && cells.filter(Boolean).length && cells.every((x, i) => !x || x.toLowerCase() === String(headers[i] || '').toLowerCase())) return true;
  return cells.filter(Boolean).length === 1 && first.length > 25;
}
function setHead(bk, h) {
  bk.hrow = h; const hr = bk.raw[h] || [], w = Math.max(hr.length, ...bk.raw.slice(h + 1, h + 50).map(r => r.length));
  bk.headers = [...Array(w)].map((_, i) => String(hr[i] ?? '').trim() || 'Column ' + (i + 1));
  const body = bk.raw.slice(h + 1); bk.rows = body.filter(r => !rowIsJunk(r, bk.headers)); bk.junk = body.length - bk.rows.length;
  const keep = bk.headers.map((_, i) => bk.rows.some(r => String(r[i] ?? '').trim()) || !/^Column \d+$/.test(bk.headers[i]));
  bk.headers = bk.headers.filter((_, i) => keep[i]); bk.rows = bk.rows.map(r => r.filter((_, i) => keep[i]));
  guess(bk);
}
function toBook(name, arr) {
  const raw = arr.filter(r => r.some(x => String(x ?? '').trim()));
  const bk = { name, raw, include: true }; setHead(bk, detectHead(raw)); return bk;
}
const TARGETS = [['skip', 'Skip'], ['column', 'Keep as column'], ['name', 'Name'], ['name2', 'Name (add to name)'], ['phone', 'Phone / WhatsApp'], ['email', 'Email'], ['source', 'Source'], ['status', 'Status'], ['priority', 'Priority'], ['owner', 'POC (name or email)'], ['added', 'Date added'], ['followUp', 'Next follow-up'], ['closed', 'Closure date'], ['price', 'Sale price'], ['notes', 'Notes']];
function guess(book) {
  const used = new Set();
  const rules = [['name', /first.?name/i], ['name2', /last.?name|surname/i], ['name', /^(name|full.?name|customer|client|lead.?name|contact.?name|customer.?name|client.?name)$/i], ['phone', /phone|mobile|whats|contact.?(no|num)|^number$|cell/i], ['email', /e-?mail/i], ['source', /source|platform|channel/i], ['status', /status|stage/i], ['priority', /priority/i], ['owner', /assign|poc|owner|agent|executive|sales.?person/i], ['followUp', /follow/i], ['closed', /clos/i], ['added', /^date$|created|added|enquiry.?date|lead.?date|timestamp|submitted/i], ['price', /price|amount|value|deal|revenue|sale/i], ['notes', /note|remark|comment|message|requirement/i], ['name', /name/i]];
  book.target = book.headers.map(h => { for (const [t, re] of rules) if (re.test(h) && !used.has(t)) { used.add(t); return t; } return 'column'; });
}
async function readFile(file) {
  const ext = file.name.split('.').pop().toLowerCase(), base = file.name.replace(/\.[^.]+$/, '');
  if (['xlsx', 'xls', 'xlsm', 'ods'].includes(ext)) {
    if (!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js').catch(() => { throw new Error('Excel reader could not load (needs internet). Save the file as CSV and upload that instead.'); });
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    return wb.SheetNames.map(n => toBook(wb.SheetNames.length > 1 ? n : base, window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }))).filter(b => b.headers.length);
  }
  return [toBook(base, parseCsv(await file.text()))];
}
function openImport(bid, sheetId) {
  UI.imp = { bid, into: sheetId || '', books: [] };
  impModal();
}
function impModal() {
  const I = UI.imp, b = B(I.bid), cats = [...new Set(sheetsOf(I.bid).map(s => s.category))], into = I.into ? SH(I.into) : null;
  const inc = I.books.filter(x => x.include), n = into ? (inc[0] ? inc[0].rows.length : 0) : sum(inc, x => x.rows.length);
  const body = `<div class="form"><label class="f full">Excel or CSV file<input class="inp" type="file" id="impFile" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods" style="padding-top:5px"></label>
   <label class="f">Put rows into<select class="sel" id="impInto" data-act="impinto"><option value="">New sheet for each tab in the file</option>${sheetsOf(I.bid).map(s => `<option value="${esc(s.id)}" ${I.into === s.id ? 'selected' : ''}>Existing: ${esc(s.name)}</option>`).join('')}</select></label>
   ${into ? `<label class="f">How to update “${esc(into.name)}”<select class="sel" id="impMode" data-act="impmode">${[['update', 'Update matching rows + add new ones (safe)'], ['replace', 'Replace — make it exactly like the file'], ['add', 'Only add new people']].map(([k, l]) => `<option value="${k}" ${(I.mode || 'update') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`
   : `<label class="f">Category (for new sheets)<input class="inp" id="impCat" list="catlist" value="${esc(I.cat || (cats[0] || 'General'))}"><datalist id="catlist">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>`}
   <label class="f">Source for new records<select class="sel" id="impSrc">${SOURCES.map(s => `<option ${s === (I.src || 'Import') ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div>
   ${I.found && into && into.name === I.found ? `<div class="alert ok" style="margin:8px 0 0">Found the matching sheet <b>“${esc(I.found)}”</b> — this upload will update it instead of making a copy. Pick “New sheet” above if you want a separate one.</div>` : ''}
   ${into ? `<p class="hint" style="margin:8px 0 0">${{ replace: 'The sheet will match the file: same columns in the same order, people not in the file are removed. Status, POC, follow-ups and colours are kept for people who are still there.', update: 'People already in the sheet (same phone, email or name) get their details updated. New people are added. Nobody is removed.', add: 'Only people not already in the sheet are added. Existing rows are not touched.' }[I.mode || 'update']} You can undo it afterwards.${I.books.length > 1 ? ' Only the first ticked tab goes into this sheet.' : ''}</p>` : ''}
   <div id="impBooks" style="margin-top:12px">${I.books.map((bk, i) => `<div class="wsec"><div class="row" style="margin-bottom:8px;flex-wrap:wrap"><label class="sw"><input type="checkbox" data-act="impinc" data-v="${i}" ${bk.include ? 'checked' : ''}><b>${esc(bk.name)}</b></label><span class="muted small">${bk.rows.length} rows · ${bk.headers.length} columns${bk.junk ? ` · <b style="color:var(--red)">${bk.junk} title/total rows skipped</b>` : ''}</span><span class="sp"></span>
     <label class="small row" style="gap:4px">Headings are in row <select class="sel" style="height:28px;max-width:260px" data-act="imphead" data-v="${i}">${bk.raw.slice(0, 15).map((r, k) => `<option value="${k}" ${bk.hrow === k ? 'selected' : ''}>${k + 1}: ${esc(r.map(x => String(x ?? '').trim()).filter(Boolean).join(' | ').slice(0, 50))}</option>`).join('')}</select></label>
     ${I.into ? '' : `<input class="inp" style="height:28px;width:180px" data-act="impname" data-v="${i}" value="${esc(bk.name)}" aria-label="Sheet name">`}</div>
     <div class="map">${bk.headers.map((h, j) => `<div class="h">${esc(h)}<span class="ex">${esc(bk.rows.slice(0, 3).map(r => r[j]).filter(Boolean).join(' · ').slice(0, 60))}</span></div><span class="muted">→</span><select class="sel" style="height:28px" data-act="impmap" data-v="${i}:${j}">${TARGETS.map(([t, l]) => `<option value="${t}" ${bk.target[j] === t ? 'selected' : ''}>${l}</option>`).join('')}</select>`).join('')}</div></div>`).join('') || `<p class="hint">Choose a file. Each tab in an Excel file becomes its own sheet. The heading row is found automatically (you can change it), and title or “Total…” rows are skipped.</p>`}</div>`;
  modal('Upload sheet — ' + b.name, body, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="impgo" ${n ? '' : 'disabled'}>${into ? 'Check changes' : 'Import ' + n + ' rows'}</button>`, { wide: true, nofocus: true });
}
function impDetect() {
  const I = UI.imp; I.found = ''; if (I.into || I.books.length !== 1) return;
  const bk = I.books[0], base = String(I.file || '').replace(/\.[^.]+$/, '').toLowerCase().trim(), heads = new Set(bk.headers.map(h => h.toLowerCase().trim()));
  let best = null, bs = 0;
  sheetsOf(I.bid).forEach(sh => {
    const names = new Set([...sh.columns.map(c => c.name.toLowerCase()), ...Object.values(sh.labels || {}).map(x => String(x).toLowerCase())]);
    const hit = [...heads].filter(h => names.has(h)).length, score = (sh.name.toLowerCase() === base || sh.name.toLowerCase() === bk.name.toLowerCase() ? 5 : 0) + (heads.size ? hit / heads.size * 4 : 0);
    const people = S.rows.filter(r => r.sheetId === sh.id), ph = new Set(people.map(r => digits(r.phone)).filter(Boolean));
    const pi = bk.target.indexOf('phone'), same = pi < 0 ? 0 : bk.rows.slice(0, 200).filter(r => ph.has(digits(r[pi]))).length / Math.min(200, bk.rows.length || 1);
    const sc = score + same * 6; if (sc > bs) { bs = sc; best = sh; }
  });
  if (best && bs >= 4) { I.into = best.id; I.mode = 'update'; I.found = best.name; }
}
function impKeep() { const I = UI.imp; if (!I) return; if ($('#impCat')) I.cat = v('impCat'); I.src = v('impSrc'); I.into = v('impInto'); if ($('#impMode')) I.mode = v('impMode'); }
function impPayload(bk, src) {
  const heads = bk.headers.map((h, j) => ({ name: h, target: bk.target[j] }));
  const rows = bk.rows.map(r => {
    const o = { source: src || 'Import', cols: {} };
    bk.headers.forEach((h, j) => { const t = bk.target[j], x = r[j] == null ? '' : String(r[j]).trim(); if (t === 'skip' || x === '') return; if (t === 'column') o.cols[h] = x; else if (t === 'name2') o.name = ((o.name || '') + ' ' + x).trim(); else if (t === 'notes') o.notes = o.notes ? o.notes + ' · ' + x : x; else o[t] = x; });
    return o;
  }).filter(o => o.name || o.phone || o.email || Object.keys(o.cols).length);
  return { heads, rows };
}
async function impGo() {
  impKeep(); const I = UI.imp, books = I.books.filter(b => b.include);
  if (!books.length) return toast('Choose at least one tab to import', '', 1);
  if (I.into) {
    const bk = books[0], p = impPayload(bk, I.src), mode = I.mode || 'update';
    return run(async () => {
      const r = await api('POST', `/sheets/${I.into}/sync`, { mode, ...p, preview: true }), x = r.summary; UI.impP = { mode, p, file: bk.name };
      modal('Confirm upload', `<div class="stats"><div class="stat"><b>${x.add}</b><span>new people added</span></div><div class="stat"><b>${x.update}</b><span>rows updated</span></div><div class="stat ${x.remove ? 'warn' : ''}"><b>${x.remove}</b><span>rows removed (not in file)</span></div>${x.skip ? `<div class="stat"><b>${x.skip}</b><span>already there, left as is</span></div>` : ''}</div>
       <p class="hint">${mode === 'replace' ? 'Columns will be set to the file’s columns in the same order. Removed columns go to “Deleted columns” so you can bring them back.' : ''} Changed your mind later? Sheet ▾ menu → <b>Undo last upload</b>.</p>`, `<button class="btn" data-act="impback">Back</button><button class="btn pri" data-act="impconfirm">Apply changes</button>`);
    });
  }
  const btn = $('[data-act="impgo"]'); if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }
  let added = 0, firstSheet = null;
  try {
    for (const bk of books) {
      const sh = await api('POST', '/sheets', { businessId: I.bid, name: bk.name, category: I.cat || 'General', source: 'upload', columns: [] }); putSheet(sh);
      const r = await api('POST', `/sheets/${sh.id}/sync`, { mode: 'replace', ...impPayload(bk, I.src), file: bk.name });
      putSheet(r.sheet); S.rows = S.rows.filter(x => x.sheetId !== sh.id).concat(r.rows); added += r.summary.added; firstSheet = firstSheet || sh;
    }
    closeModal(); toast(`Imported ${added} records`, `${books.length} sheet${books.length > 1 ? 's' : ''} created`);
    if (firstSheet) go(`/b/${firstSheet.businessId}/sheets/${firstSheet.id}`); else render();
  } catch (e) { toast(e.message, '', 1); if (btn) { btn.disabled = false; btn.textContent = 'Try again'; } }
}
async function impConfirm() {
  const I = UI.imp, P = UI.impP; if (!I || !P) return;
  await run(async () => { const r = await api('POST', `/sheets/${I.into}/sync`, { mode: P.mode, ...P.p, file: P.file }); putSheet(r.sheet); S.rows = S.rows.filter(x => x.sheetId !== r.sheet.id).concat(r.rows); closeModal(); UI.rng = null; go(`/b/${r.sheet.businessId}/sheets/${r.sheet.id}`); toast(`Done: ${r.summary.added} added · ${r.summary.updated} updated · ${r.summary.remove} removed`, 'Sheet ▾ → Undo last upload'); });
}

/* ---------------- WhatsApp (Rarevo, view-only) ---------------- */
async function loadContacts(bid, force) {
  if (UI.wa[bid] && UI.wa[bid].loading) return;
  UI.wa[bid] = { loading: true, contacts: (UI.wa[bid] || {}).contacts || [] };
  try {
    if (force) { const r = await api('POST', `/businesses/${bid}/rarevo/sync`); putBiz(r.business); toast(`Synced ${r.count} WhatsApp contacts`, (r.added || r.updated) ? `${r.added || 0} new · ${r.updated || 0} updated in the WhatsApp sheet` : ''); try { const nb = await api('GET', '/bootstrap'); S = nb; } catch (e) {} }
    const r = await api('GET', `/businesses/${bid}/contacts`); UI.wa[bid] = { contacts: r.contacts, summary: r.summary };
  } catch (e) { UI.wa[bid] = { contacts: [], error: e.message }; if (force) { toast(e.message, '', 1); await refresh(); return; } }
  if (R.page === 'biz' && R.bid === bid) render();
}
function catMove(bid, from, to) { run(async () => { const r = await api('POST', `/businesses/${bid}/categories`, { from, to }); r.sheets.forEach(putSheet); if (UI.cat[bid] === from) UI.cat[bid] = to; render(); }, 'Category updated'); }
function vWA(b) {
  if (!b.rarevo) return connectCard(b, 'wa');
  const W = UI.wa[b.id] || { loading: true, contacts: [] }, [h, t] = health(b.rarevo);
  const inCrm = new Map(); rowsOf(b.id).forEach(r => { const d = digits(r.phone); if (d) inCrm.set(d, r); });
  const q = UI.waQ.toLowerCase();
  const list = (W.contacts || []).filter(c => !q || (c.name + ' ' + c.number + ' ' + c.lastMessage).toLowerCase().includes(q)).sort((a, c) => (c.lastAt || 0) - (a.lastAt || 0));
  const sumObj = W.summary || b.summary || {}, nums = Object.entries(sumObj).filter(([, x]) => typeof x === 'number').slice(0, 6);
  const notIn = list.filter(c => !inCrm.has(digits(c.number)));
  return `<div class="card" style="margin-bottom:12px"><div class="row"><span class="dot ${h}"></span><b>Rarevo WhatsApp · ${t}</b><span class="small muted">${esc(b.rarevo.url)} · key ${esc(b.rarevo.keyHint || '')}${b.rarevo.lastSync ? ' · synced ' + esc(rel(b.rarevo.lastSync)) : ''}</span><span class="sp"></span>${canManage(b.id) ? `<label class="sw small" title="Every WhatsApp chat is added to the master sheet; people already in a sheet get their last message updated"><input type="checkbox" data-act="waauto" data-id="${b.id}" ${b.waAuto !== false ? 'checked' : ''}>Auto-add chats to CRM</label>` : ''}<button class="btn sm" data-act="wasync" data-id="${b.id}">${ic('sync')}Sync now</button>${canManage(b.id) ? `<button class="btn sm" data-act="connect" data-id="${b.id}" data-v="wa">Connection</button>` : ''}</div>
   ${b.rarevo.error ? `<div class="alert" style="margin:10px 0 0">${esc(b.rarevo.error)}</div>` : ''}
   <p class="hint" style="margin-top:6px">View-only: the CRM reads contacts and chats from your Rarevo platform — replies and automations stay in Rarevo.</p></div>
  ${nums.length ? `<div class="kpis">${nums.map(([k, x]) => `<div class="kpi"><small>${esc(cap(k.replace(/[_-]/g, ' ')))}</small><b>${num(x)}</b></div>`).join('')}</div>` : ''}
  ${waSheetView(b) || `<div class="card p0"><div class="toolbar" style="padding:10px 12px"><h2>WhatsApp contacts</h2><span class="muted small">${(W.contacts || []).length} total · ${notIn.length} not in CRM yet</span><span class="sp"></span><input class="inp search" type="search" placeholder="Search contacts…" data-act="waq" value="${esc(UI.waQ)}">
   <select class="sel" id="waSheet" aria-label="Sheet">${sheetsOf(b.id).map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>
   <button class="btn sm pri" data-act="waadd" data-id="${b.id}" ${UI.waSel.size ? '' : 'disabled'}>Add ${UI.waSel.size || ''} to sheet</button><button class="btn sm" data-act="waaddall" data-id="${b.id}" ${notIn.length ? '' : 'disabled'}>Add all new (${notIn.length})</button></div>
   ${W.loading ? '<div class="empty">Loading contacts…</div>' : W.error ? `<div class="alert" style="margin:0 12px 12px">${esc(W.error)}</div>` : `<div class="scroll"><table class="t stk"><thead><tr><th style="width:30px"></th><th>Name</th><th>Number</th><th>Last message</th><th>Last active</th><th>In CRM</th><th></th></tr></thead><tbody>
   ${list.slice(0, 500).map(c => { const r = inCrm.get(digits(c.number)); return `<tr><td><input type="checkbox" class="cb" data-act="wasel" data-v="${esc(c.number)}" ${UI.waSel.has(c.number) ? 'checked' : ''} ${r ? 'disabled' : ''} aria-label="Select"></td><td><b>${esc(c.name || '—')}</b>${(c.tags || []).map(tg => ` <span class="pill">${esc(tg)}</span>`).join('')}</td><td class="nowrap">${esc(c.number)}</td><td class="muted" style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.lastMessage)}</td><td class="nowrap small">${c.lastAt ? esc(rel(c.lastAt)) : ''}</td><td>${r ? `<button class="btn xs" data-act="open" data-id="${r.id}">${esc((SH(r.sheetId) || {}).name || 'Open')}</button>` : '<span class="pill warn">Not added</span>'}</td><td><button class="btn xs" data-act="wachat" data-id="${b.id}" data-v="${esc(c.number)}" data-n="${esc(c.name)}">View chat</button></td></tr>`; }).join('') || '<tr><td colspan="7"><div class="empty">No contacts yet — press Sync now</div></td></tr>'}
   </tbody></table></div>`}</div>`}`;
}
function waSheetView(b) {
  if (b.waAuto === false) return '';
  const sh = S.sheets.find(x => x.businessId === b.id && x.source === 'whatsapp');
  if (!sh) return `<div class="card"><div class="empty">The WhatsApp sheet is created on the first sync. <button class="btn sm pri" data-act="wasync" data-id="${b.id}">${ic('sync')}Sync now</button></div></div>`;
  const sc = { bid: b.id, sid: sh.id, cat: '' }, k = sk(sc), g = gs(k); if (!g.waInit) { g.waInit = 1; g.sort = 'waAt'; g.dir = -1; }
  const n = gfilter(sc).length;
  return `<div class="xl ${UI.fs ? 'fs' : ''}"><div class="xlcats"><b>WhatsApp sheet</b><span class="small muted">${n} people · newest chat first · tick rows (or click row numbers, Shift-click for a range), then use the black bar to <b>Move to sheet</b>, assign or set follow-ups</span><span class="sp"></span><button class="btn sm" data-act="waselall" data-g="${esc(k)}">Select all ${n}</button><button class="btn sm" data-go="/b/${b.id}/sheets/${sh.id}">Open as sheet</button></div>${grid(sc)}</div>`;
}
async function waChat(bid, number, name) {
  modal('WhatsApp · ' + (name || number), '<div class="empty">Loading chat…</div>', `<a class="btn" href="https://wa.me/${esc(digits(number).length === 10 ? '91' + digits(number) : String(number).replace(/\D/g, ''))}" target="_blank" rel="noopener">Open in WhatsApp</a><button class="btn" data-act="close">Close</button>`, { sub: number + ' · view only, from Rarevo', nofocus: true });
  try {
    const r = await api('GET', `/businesses/${bid}/contacts/${encodeURIComponent(number)}/messages`);
    const bd = $('#box .bd'); if (!bd) return;
    bd.innerHTML = `<div class="msgs">${r.messages.map(m => `<div class="m ${m.dir === 'out' ? 'out' : ''}">${esc(m.text)}<small>${m.by ? esc(m.by) + ' · ' : ''}${m.t ? esc(fDT(m.t)) : ''}</small></div>`).join('') || '<div class="empty">No messages</div>'}</div>`;
    const ms = $('.msgs'); if (ms) ms.scrollTop = ms.scrollHeight;
  } catch (e) { const bd = $('#box .bd'); if (bd) bd.innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
}

/* ---------------- Meta ---------------- */
function mRange() {
  const m = UI.meta, n = Date.now(), d = new Date();
  if (m.range === '7') return [ymd(n - 6 * DAY), ymd(n), 'Last 7 days'];
  if (m.range === '30') return [ymd(n - 29 * DAY), ymd(n), 'Last 30 days'];
  if (m.range === 'month') return [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), ymd(n), 'This month'];
  if (m.range === 'last') return [ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), ymd(new Date(d.getFullYear(), d.getMonth(), 0)), 'Last month'];
  return [m.from || ymd(n - 29 * DAY), m.to || ymd(n), 'Custom'];
}
function vMeta(b) {
  const [from, to, label] = mRange(), sp = spendOf(b.id, from, to), cur = b.currency;
  const spend = sum(sp, s => s.spend), clicks = sum(sp, s => s.clicks), imp = sum(sp, s => s.impressions), mleads = sum(sp, s => s.leads);
  const f0 = pD(from), t1 = pD(to) + DAY;
  const crm = rowsOf(b.id).filter(r => r.source === 'Meta Ads' && r.added >= f0 && r.added < t1);
  const won = rowsOf(b.id).filter(r => r.source === 'Meta Ads' && r.status === 'Won' && r.closed >= f0 && r.closed < t1), rev = sum(won, r => r.price);
  const days = []; for (let t = f0; t < t1 && days.length < 120; t += DAY) days.push(ymd(t));
  const dv = days.map(d => sum(sp.filter(s => s.date === d), s => s.spend)), mx = Math.max(1, ...dv);
  const camps = {}; sp.forEach(s => { const c = camps[s.campaign] || (camps[s.campaign] = { spend: 0, clicks: 0, imp: 0, leads: 0 }); c.spend += s.spend; c.clicks += s.clicks; c.imp += s.impressions; c.leads += s.leads; });
  const [h, t] = health(b.meta);
  return `${b.meta ? `<div class="card" style="margin-bottom:12px"><div class="row"><span class="dot ${h}"></span><b>Meta ads · ${t}</b><span class="small muted">${esc(b.meta.accountName || '')} ${esc(b.meta.adAccountId)}${b.meta.pageId ? ' · page ' + esc(b.meta.pageId) : ''}${b.meta.lastSync ? ' · synced ' + esc(rel(b.meta.lastSync)) : ''}</span><span class="sp"></span><button class="btn sm" data-act="metasync" data-id="${b.id}">${ic('sync')}Sync spend</button><button class="btn sm" data-act="metaleads" data-id="${b.id}">${ic('down')}Import lead-form leads</button>${canManage(b.id) ? `<button class="btn sm" data-act="connect" data-id="${b.id}" data-v="meta">Connection</button>` : ''}</div>${b.meta.error ? `<div class="alert" style="margin:10px 0 0">${esc(b.meta.error)}</div>` : ''}</div>` : connectCard(b, 'meta')}
  <div class="row" style="margin-bottom:12px"><div class="chips">${[['7', '7 days'], ['30', '30 days'], ['month', 'This month'], ['last', 'Last month'], ['custom', 'Custom']].map(([k, l]) => `<button class="chip ${UI.meta.range === k ? 'on' : ''}" data-act="mrange" data-v="${k}">${l}</button>`).join('')}</div>
   ${UI.meta.range === 'custom' ? `<input class="inp" type="date" data-act="mfrom" value="${esc(from)}"><input class="inp" type="date" data-act="mto" value="${esc(to)}">` : ''}<span class="sp"></span>${canManage(b.id) ? `<button class="btn sm" data-act="addspend" data-id="${b.id}">${ic('plus')}Add spend</button><button class="btn sm" data-act="spendcsv" data-id="${b.id}">${ic('up')}Import spend CSV</button>` : ''}</div>
  <div class="kpis"><div class="kpi"><small>Spend · ${esc(label)}</small><b>${money(spend, cur)}</b><span>${sp.length} day × campaign rows</span></div><div class="kpi"><small>Impressions</small><b>${num(imp)}</b><span>${num(clicks)} clicks · CTR ${imp ? (clicks / imp * 100).toFixed(2) : 0}%</span></div>
   <div class="kpi"><small>Leads reported by Meta</small><b>${num(mleads)}</b><span>${mleads ? money(spend / mleads, cur) + ' per lead' : '—'}</span></div><div class="kpi"><small>Meta leads in CRM</small><b>${crm.length}</b><span>${crm.length ? money(spend / crm.length, cur) + ' cost per lead' : 'none in range'}</span></div>
   <div class="kpi"><small>Won from Meta</small><b>${money(rev, cur)}</b><span>${won.length} deals · ROAS ${spend ? (rev / spend).toFixed(2) + '×' : '—'}</span></div></div>
  <div class="g2"><div class="card"><h2 style="margin-bottom:8px">Daily spend</h2>${spend ? `<div class="bars">${dv.map((x, i) => `<div class="bc" title="${esc(fDs(pD(days[i])))}: ${esc(money(x, cur))}"><i style="height:${x / mx * 100}%;--c:var(--meta)"></i></div>`).join('')}</div><div class="axis"><span>${esc(fDs(f0))}</span><span>${esc(fDs(pD(to)))}</span></div>` : '<div class="empty">No spend in this range</div>'}</div>
   <div class="card p0"><h2 style="padding:12px 14px 4px">By campaign</h2><div class="scroll"><table class="t stk"><thead><tr><th>Campaign</th><th class="num">Spend</th><th class="num">Clicks</th><th class="num">CTR</th><th class="num">Leads</th><th class="num">CPL</th></tr></thead><tbody>${Object.entries(camps).sort((a, c) => c[1].spend - a[1].spend).map(([n, c]) => `<tr><td>${esc(n)}</td><td class="num">${money(c.spend, cur)}</td><td class="num">${num(c.clicks)}</td><td class="num">${c.imp ? (c.clicks / c.imp * 100).toFixed(2) + '%' : '—'}</td><td class="num">${num(c.leads)}</td><td class="num">${c.leads ? money(c.spend / c.leads, cur) : '—'}</td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">No campaigns</div></td></tr>'}</tbody></table></div></div></div>
  <div class="card p0" style="margin-top:12px"><div class="ch" style="padding:12px 14px 0"><h2>Spend records</h2><span class="muted small">every day and campaign stored in the CRM</span><span class="sp"></span><button class="btn sm" data-act="spendexport" data-id="${b.id}">${ic('down')}Export</button></div>
   <div class="scroll" style="max-height:360px;overflow:auto"><table class="t stk"><thead><tr><th>Date</th><th>Campaign</th><th class="num">Spend</th><th class="num">Impressions</th><th class="num">Clicks</th><th class="num">Leads</th><th>From</th><th></th></tr></thead><tbody>${[...sp].sort((a, c) => c.date.localeCompare(a.date)).slice(0, 300).map(s => `<tr><td class="nowrap">${esc(fD(pD(s.date)))}</td><td>${esc(s.campaign)}</td><td class="num">${money(s.spend, cur)}</td><td class="num">${num(s.impressions)}</td><td class="num">${num(s.clicks)}</td><td class="num">${num(s.leads)}</td><td><span class="pill ${s.source === 'meta' ? 'info' : ''}">${s.source === 'meta' ? 'Meta sync' : 'Manual'}</span></td><td>${canManage(b.id) ? `<button class="btn xs ghost danger" data-act="delspend" data-id="${s.id}" aria-label="Delete">${ic('x')}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8"><div class="empty">No spend records</div></td></tr>'}</tbody></table></div></div>`;
}
async function metaLeads(bid) {
  modal('Import leads from Meta lead forms', '<div class="empty">Loading lead forms…</div>', `<button class="btn" data-act="close">Cancel</button>`, { nofocus: true });
  try {
    const r = await api('GET', `/businesses/${bid}/meta/forms`);
    $('#box .bd').innerHTML = `<div class="stack"><div>${r.forms.map(f => `<label class="sw" style="display:flex;padding:6px 0"><input type="checkbox" class="mform" value="${esc(f.id)}" checked><span><b>${esc(f.name)}</b> <span class="muted small">${esc(f.status || '')}${f.count != null ? ' · ' + f.count + ' leads' : ''}</span></span></label>`).join('') || '<div class="empty">No lead forms on this page</div>'}</div>
      <div class="form"><label class="f">Add leads to sheet<select class="sel" id="mlSheet">${sheetsOf(bid).map(s => `<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.category)}</option>`).join('')}</select></label><label class="f">Only leads since<input class="inp" type="date" id="mlSince" value="${ymd(Date.now() - 30 * DAY)}"></label></div>
      <p class="hint">Leads already in the sheet are skipped. Extra form questions become columns. New leads are assigned using the business's assignment rule.</p></div>`;
    $('#box footer').innerHTML = `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="mlgo" data-id="${bid}">Import leads</button>`;
  } catch (e) { $('#box .bd').innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
}

/* ---------------- reports ---------------- */
function rRange() {
  const u = UI.rep, n = Date.now(), d = new Date(), w = sod(n) - ((d.getDay() + 6) % 7) * DAY;
  if (u.range === 'week') return [w, n, 'This week']; if (u.range === 'lastweek') return [w - 7 * DAY, w - 1, 'Last week'];
  if (u.range === 'month') return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), n, 'This month'];
  if (u.range === 'lastmonth') return [new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), new Date(d.getFullYear(), d.getMonth(), 1).getTime() - 1, 'Last month'];
  if (u.range === 'all') return [0, n, 'All time'];
  return [pD(u.from) || 0, (pD(u.to) || sod(n)) + DAY - 1, 'Custom'];
}
function report(b) {
  const [from, to, label] = rRange(), u = UI.rep, inR = t => t && t >= from && t <= to;
  const rows = rowsOf(b.id).filter(r => !u.ow || (u.ow === '-' ? !r.owner : r.owner === u.ow));
  const added = rows.filter(r => inR(r.added)), won = rows.filter(r => r.status === 'Won' && inR(r.closed)), lost = rows.filter(r => r.status === 'Lost' && inR(r.closed));
  const act = rows.filter(r => inR(r.added) || inR(r.closed) || inR(r.followUp)).sort((a, c) => c.added - a.added);
  const spend = sum(spendOf(b.id, from ? ymd(from) : '', ymd(to)), s => s.spend), ecost = sum(emailsOf(b.id, from ? ymd(from) : '', ymd(to)), s => s.cost), rev = sum(won, r => r.price);
  const grp = (keys, key) => keys.map(k => { const f = r => key(r) === k.id, w = won.filter(f), l = lost.filter(f).length; return { name: k.name, a: added.filter(f).length, w: w.length, l, rev: sum(w, r => r.price), rate: w.length + l ? Math.round(w.length / (w.length + l) * 100) + '%' : '—' }; });
  return { from, to, label, added, won, lost, act, spend, ecost, rev, emailAdded: added.filter(r => r.source === 'Email').length, metaAdded: added.filter(r => r.source === 'Meta Ads').length,
    byP: grp(canManage(b.id) ? [...assignable(b.id), { id: '', name: 'Unassigned' }] : [S.me], r => r.owner || ''), byS: grp(sheetsOf(b.id).map(s => ({ id: s.id, name: s.name + ' · ' + s.category })), r => r.sheetId), bySrc: grp(SOURCES.map(s => ({ id: s, name: s })), r => r.source) };
}
function vRep(b) {
  const Rp = report(b), u = UI.rep, cur = b.currency;
  const sel = (f, list) => `<select class="sel" data-act="rf" data-v="${f}">${list.map(([x, l]) => `<option value="${esc(x)}" ${u[f] === x ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const tbl = (rows, h) => `<table class="t stk"><thead><tr><th>${h}</th><th class="num">Added</th><th class="num">Won</th><th class="num">Lost</th><th class="num">Win rate</th><th class="num">Revenue</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.name)}</td><td class="num">${x.a}</td><td class="num">${x.w}</td><td class="num">${x.l}</td><td class="num">${x.rate}</td><td class="num">${money(x.rev, cur)}</td></tr>`).join('')}</tbody></table>`;
  return `<div class="toolbar" style="padding-top:0">${sel('range', [['week', 'This week'], ['lastweek', 'Last week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['all', 'All time'], ['custom', 'Custom dates']])}
   ${u.range === 'custom' ? `<input class="inp" type="date" data-act="rf" data-v="from" value="${esc(u.from)}"><input class="inp" type="date" data-act="rf" data-v="to" value="${esc(u.to)}">` : ''}${canManage(b.id) ? sel('ow', [['', 'All POCs'], ['-', 'Unassigned'], ...assignable(b.id).map(x => [x.id, x.name])]) : ''}
   <span class="sp"></span><button class="btn sm" data-act="repcopy" data-id="${b.id}">Copy</button><button class="btn sm pri" data-act="repcsv" data-id="${b.id}">${ic('down')}Download report</button></div>
  <div class="kpis"><div class="kpi"><small>${esc(Rp.label)} · records added</small><b>${Rp.added.length}</b><span>${esc(fDs(Rp.from) || 'start')} – ${esc(fDs(Rp.to))}</span></div><div class="kpi"><small>Won</small><b>${Rp.won.length}</b><span>${Rp.lost.length} lost</span></div><div class="kpi"><small>Revenue</small><b>${money(Rp.rev, cur)}</b><span>sale price of won deals</span></div>
   <div class="kpi"><small>Meta spend</small><b>${money(Rp.spend, cur)}</b><span>${Rp.metaAdded ? money(Rp.spend / Rp.metaAdded, cur) + ' per Meta lead' : 'no Meta leads'}</span></div><div class="kpi"><small>Email marketing cost</small><b>${money(Rp.ecost, cur)}</b><span>${Rp.emailAdded} email leads in CRM</span></div><div class="kpi"><small>Return on marketing</small><b>${Rp.spend + Rp.ecost ? (Rp.rev / (Rp.spend + Rp.ecost)).toFixed(2) + '×' : '—'}</b><span>revenue ÷ (Meta + email cost)</span></div></div>
  <div class="g2"><div class="card p0"><h2 style="padding:12px 14px 4px">By POC</h2><div class="scroll">${tbl(Rp.byP, 'POC')}</div></div><div class="card p0"><h2 style="padding:12px 14px 4px">By sheet</h2><div class="scroll">${tbl(Rp.byS, 'Sheet')}</div></div></div>
  <div class="g2" style="margin-top:12px"><div class="card p0"><h2 style="padding:12px 14px 4px">By source</h2><div class="scroll">${tbl(Rp.bySrc, 'Source')}</div></div>
   <div class="card p0"><h2 style="padding:12px 14px 4px">Records in this period <span class="muted">${Rp.act.length}</span></h2><div class="scroll" style="max-height:330px;overflow:auto"><table class="t stk"><thead><tr><th>Name</th><th>Status</th><th>POC</th><th>Added</th><th>Closed</th><th class="num">Price</th></tr></thead><tbody>${Rp.act.slice(0, 200).map(r => `<tr style="cursor:pointer" data-act="open" data-id="${r.id}"><td><b>${esc(r.name)}</b></td><td class="st-${esc(r.status.split(' ')[0])} b">${esc(r.status)}</td><td>${esc(uname(r.owner))}</td><td class="nowrap">${esc(fD(r.added))}</td><td class="nowrap">${esc(fD(r.closed))}</td><td class="num">${r.price != null ? money(r.price, cur) : ''}</td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">No activity</div></td></tr>'}</tbody></table></div></div></div>`;
}
function repCsv(b) { const Rp = report(b); return `Report,${csvq(b.name)},${csvq(Rp.label)},${csvq(fD(Rp.from))},${csvq(fD(Rp.to))}\r\nRecords added,${Rp.added.length}\r\nWon,${Rp.won.length}\r\nLost,${Rp.lost.length}\r\nRevenue,${Rp.rev}\r\nMeta spend,${Rp.spend}\r\nEmail cost,${Rp.ecost}\r\n\r\n` + toCsv(['POC', 'Added', 'Won', 'Lost', 'Win rate', 'Revenue'], Rp.byP.map(x => [x.name, x.a, x.w, x.l, x.rate, x.rev])) + '\r\n\r\n' + toCsv(['Sheet', 'Added', 'Won', 'Lost', 'Win rate', 'Revenue'], Rp.byS.map(x => [x.name, x.a, x.w, x.l, x.rate, x.rev])) + '\r\n\r\n' + rowsCsv(Rp.act); }

/* ---------------- settings ---------------- */
function vSet(b) {
  if (!canManage(b.id)) return '<div class="empty">Only the business admin can change settings.</div>';
  const a = b.assign || { mode: 'manual', pool: [] }, owners = bizUsers(b.id).filter(u => u.role === 'owner');
  return `<div class="g2"><div class="stack"><div class="card stack"><h2>Business details</h2><div class="form">
   <label class="f">Name<input class="inp" id="bsName" value="${esc(b.name)}"></label><label class="f">Industry<input class="inp" id="bsInd" value="${esc(b.industry)}"></label>
   ${isSuper() ? `<label class="f">Status<select class="sel" id="bsSt">${['active', 'onboarding', 'paused'].map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${cap(s)}</option>`).join('')}</select></label>` : ''}<label class="f">Colour<input class="inp" type="color" id="bsCol" value="${esc(b.color)}" style="padding:2px"></label>
   <label class="f">WhatsApp number (shown on the card)<input class="inp" id="bsPh" value="${esc(b.phone || '')}"></label><label class="f">Currency<input class="inp" id="bsCur" value="${esc(b.currency || 'INR')}" maxlength="3"></label>
   <label class="f full">Default emails on every Google Calendar meeting<textarea class="inp" id="bsMeet" style="min-height:52px">${esc(b.meetEmails || '')}</textarea></label></div>
   <div><b class="small">Colour labels</b><div class="form" style="margin-top:6px">${COLORS.map(c => `<label class="row" style="gap:6px"><i class="cd" style="--c:var(--c-${c})"></i><input class="inp" style="flex:1" id="bsL-${c}" value="${esc((b.colorLabels || LABELS)[c])}"></label>`).join('')}</div></div>
   <div class="row"><span class="sp"></span><button class="btn pri" data-act="savebiz" data-id="${b.id}">Save details</button></div></div>
   <div class="card stack"><h2>Lead assignment</h2><label class="f">New leads from Meta, WhatsApp and uploads<select class="sel" id="asMode"><option value="round" ${a.mode === 'round' ? 'selected' : ''}>Share out round-robin between these people</option><option value="manual" ${a.mode !== 'round' ? 'selected' : ''}>Leave unassigned — business admin assigns</option></select></label>
    <div class="row">${assignable(b.id).filter(u => u.role !== 'super').map(u => `<label class="sw"><input type="checkbox" class="aspool" value="${esc(u.id)}" ${(a.pool || []).includes(u.id) ? 'checked' : ''}>${esc(u.name)}</label>`).join('') || '<span class="muted small">Add staff in the Team tab first</span>'}</div>
    <div class="row"><span class="sp"></span><button class="btn" data-act="saveassign" data-id="${b.id}">Save assignment</button></div></div></div>
  <div class="stack"><div class="card"><div class="ch"><h2>Client login</h2><span class="sp"></span><button class="btn sm pri" data-act="clientlogin" data-id="${b.id}">${ic('plus')}Create client login</button></div>
    <label class="f" style="margin-bottom:8px">Login page for ${esc(b.name)}<span class="row"><input class="inp" style="flex:1" readonly value="${esc(gateLink(b))}"><button class="btn" data-act="copyv" data-v="${esc(gateLink(b))}">Copy</button></span></label>${isSuper() ? `<label class="f" style="margin-bottom:8px">Link name<span class="row"><input class="inp" style="flex:1" id="bsSlug" value="${esc(b.slug)}"><button class="btn" data-act="saveslug" data-id="${b.id}">Save</button></span></label>` : ''}<p class="hint" style="margin-bottom:8px">The business admin signs in and sees only ${esc(b.name)} — its sheets, master sheet, follow-ups, WhatsApp, Meta, email marketing, reports and team. Nothing from other businesses.</p>
    <div class="list">${owners.map(u => `<div class="li"><span class="avatar sm" style="--c:#374151">${esc(ini(u.name))}</span><div class="tx"><b>${esc(u.name)}</b><small>Login ID <code>${esc(u.username)}</code> · ${u.lastLogin ? 'last sign-in ' + esc(rel(u.lastLogin)) : 'not signed in yet'}</small></div>${isSuper() ? `<button class="btn xs" data-act="viewas" data-id="${u.id}">${ic('eye')}Open as</button>` : ''}<button class="btn xs" data-act="resetpw" data-id="${u.id}">New password</button></div>`).join('') || '<div class="empty">No client login yet</div>'}</div></div>
   <div class="card"><h2 style="margin-bottom:6px">Connections</h2>${connLine(b, 'wa')}${connLine(b, 'meta')}<div class="row" style="margin-top:10px"><button class="btn sm" data-act="connect" data-id="${b.id}" data-v="wa">WhatsApp connection</button><button class="btn sm" data-act="connect" data-id="${b.id}" data-v="meta">Meta connection</button></div></div>
   ${isSuper() ? `<div class="card"><h2 style="margin-bottom:6px;color:var(--red)">Delete business</h2><p class="hint">Removes the business with all its sheets, records, spend and email results from the CRM. Nothing is deleted in Rarevo or Meta.</p><button class="btn danger sm" style="margin-top:8px" data-act="delbiz" data-id="${b.id}">Delete ${esc(b.name)}</button></div>` : ''}</div></div>`;
}
function connectCard(b, k) {
  if (!canManage(b.id)) return `<div class="card empty">${k === 'wa' ? 'WhatsApp' : 'Meta'} is not connected for this business yet. Ask the business admin to connect it.</div>`;
  return `<div class="card" style="margin-bottom:12px"><div class="row"><span class="dot off"></span><b>${k === 'wa' ? 'Rarevo WhatsApp is not connected' : 'Meta ads are not connected'}</b><span class="sp"></span><button class="btn pri sm" data-act="connect" data-id="${b.id}" data-v="${k}">${ic('link')}Connect ${k === 'wa' ? 'WhatsApp' : 'Meta'}</button></div><p class="hint" style="margin-top:6px">${k === 'wa' ? 'In Rarevo open Businesses → this business → CRM, copy the API URL, API key and API password, and paste them here. The CRM can only read, never change, Rarevo data.' : 'Connect the ad account to store daily spend, clicks and leads per campaign, and to import leads from Facebook/Instagram lead forms. You can also add spend manually below.'}</p></div>`;
}
function connectModal(bid, which) {
  const b = B(bid); which = which || 'wa';
  const c = which === 'wa' ? b.rarevo : b.meta;
  const st = c ? (c.status === 'error' ? `<div class="alert">Connected ${esc(fD(c.connectedAt))}, but the last check failed: ${esc(c.error)}<br><span class="small">${which === 'wa' ? 'Fix: in Rarevo, open this business → CRM and copy a fresh key and password (an expired WhatsApp token in Rarevo also stops data). If the CRM runs in Docker, use http://host.docker.internal instead of localhost.' : 'Fix: create a new System User access token in Meta Business Settings with ads_read and leads_retrieval, then paste it again.'}</span></div>` : `<div class="alert ok">Connected ${esc(fD(c.connectedAt))}${c.lastSync ? ' · last sync ' + esc(rel(c.lastSync)) : ' · not synced yet'}. Credentials stay saved until you disconnect.</div>`) : '';
  const tabs = `<div class="tabs" style="margin:-4px 0 12px">${[['wa', 'Rarevo WhatsApp'], ['meta', 'Meta ads']].map(([k, l]) => `<button class="${which === k ? 'on' : ''}" data-act="connect" data-id="${bid}" data-v="${k}">${l}</button>`).join('')}</div>`;
  const body = which === 'wa' ? `${tabs}${st}<div class="form"><label class="f full">API URL<input class="inp" id="cnUrl" value="${esc(c ? c.url : '')}" placeholder="http://localhost/api/crm/v1"></label>
     <label class="f">API key<input class="inp" id="cnKey" type="password" placeholder="${esc(c ? 'Saved ' + (c.keyHint || '') + ' — paste to replace' : 'rvk_live_…')}"></label><label class="f">API password<input class="inp" id="cnPw" type="password" placeholder="${c ? 'Saved — paste to replace' : ''}"></label></div>
     <div class="code" style="margin-top:12px">Where to find these: Rarevo → Businesses → ${esc(b.name)} → CRM → “Connect to CRM”.\nThe CRM sends on every GET request:\nAuthorization: Bearer &lt;API key&gt; · X-Api-Password: &lt;API password&gt;\nGET /summary · /contacts (paged) · /contacts/:number/messages</div>`
    : `${tabs}${st}<div class="form"><label class="f">Ad account ID<input class="inp" id="cnAct" value="${esc(c ? c.adAccountId : '')}" placeholder="act_1234567890"></label><label class="f">Facebook Page ID (for lead forms)<input class="inp" id="cnPage" value="${esc(c ? c.pageId : '')}"></label>
     <label class="f full">Access token<input class="inp" id="cnTok" type="password" placeholder="${esc(c ? 'Saved ' + (c.tokenHint || '') + ' — paste to replace' : 'System user token')}"></label><label class="f">Graph API version<input class="inp" id="cnVer" value="${esc(c ? c.version : 'v23.0')}"></label></div>
     <div class="code" style="margin-top:12px">Meta Business Settings → System users → Generate token.\nPermissions: ads_read, leads_retrieval, pages_show_list, pages_read_engagement, pages_manage_ads.\nThe token stays on your server and is never shown again.</div>`;
  modal('Connect · ' + b.name, body, `${c ? `<button class="btn danger" data-act="disconnect" data-id="${bid}" data-v="${which}">Disconnect</button>` : ''}<span class="sp"></span><button class="btn" data-act="close">Close</button><button class="btn pri" data-act="saveconn" data-id="${bid}" data-v="${which}">${c ? 'Save & re-check' : 'Connect'}</button>`, { sub: which === 'wa' ? 'View-only link — the CRM reads this business’s WhatsApp contacts and chats from Rarevo' : 'Store ad spend and import lead-form leads', nofocus: !!c });
}

/* ---------------- follow-ups ---------------- */
function vFollow(bid) {
  if (!bid) return vFollowAll();
  const sc = { bid, sid: 'master', cat: '', fu: true }, g = gs(sk(sc)), all = scopeRows(sc);
  return `<div class="xl ${UI.fs ? 'fs' : ''}"><div class="xlcats"><div class="chips">${FUW.map(([k, l]) => `<button class="chip ${g.fw === k ? 'on' : ''}" data-act="fuw" data-g="${esc(sk(sc))}" data-v="${k}">${l} <span class="n">${all.filter(r => fuMatch(r, k)).length}</span></button>`).join('')}</div><span class="sp"></span><span class="small muted">Reminder 30 min before · set the date in “Next follow-up”</span></div>${grid(sc)}</div>`;
}
function vFollowAll() {
  const now = Date.now(), t = sod(now), f = UI.fu, biz = bid || f.biz;
  const items = S.rows.filter(r => r.followUp && (!biz || r.businessId === biz) && (!f.ow || r.owner === f.ow) && canEdit(r)).sort((a, b) => a.followUp - b.followUp);
  const G = [['Overdue', r => r.followUp < now], ['Next 30 minutes', r => r.followUp < now + 30 * MIN], ['Later today', r => r.followUp < t + DAY], ['Tomorrow', r => r.followUp < t + 2 * DAY], ['This week', r => r.followUp < t + 7 * DAY], ['Later', () => true]];
  const used = new Set(), groups = G.map(([l, fn]) => { const g = items.filter(r => !used.has(r.id) && fn(r)); g.forEach(r => used.add(r.id)); return [l, g]; }).filter(([, g]) => g.length);
  const people = bid ? assignable(bid) : S.users, m = bid ? canManage(bid) : isSuper();
  return `<div class="ph"><div class="t">${bid ? '<h2>Follow-ups</h2>' : `<h1 class="row">${ic('cal')} All follow-ups</h1>`}<p>The assigned person and the business admin get a reminder 30 minutes before each follow-up while the CRM is open.</p></div>
   <div class="row">${bid ? '' : `<select class="sel" data-act="fuf" data-v="biz"><option value="">All businesses</option>${S.businesses.map(b => `<option value="${esc(b.id)}" ${f.biz === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select>`}${m ? `<select class="sel" data-act="fuf" data-v="ow"><option value="">Everyone</option>${people.map(u => `<option value="${esc(u.id)}" ${f.ow === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>` : ''}</div></div>
  <div class="card">${groups.map(([l, g]) => `<div class="fgrp">${l} <span class="pill">${g.length}</span></div>${g.map(r => `<div class="fu ${r.followUp < now ? 'over' : ''}"><div class="tm">${esc(fT(r.followUp))}<small>${esc(fDs(r.followUp))} · ${esc(rel(r.followUp))}</small></div><div><b>${esc(r.name || '(no name)')}</b> ${bid ? '' : `<span class="pill">${esc((B(r.businessId) || {}).name || '')}</span>`}<br><span class="small muted">${esc((SH(r.sheetId) || {}).name || '')} · ${esc(r.status)} · ${esc(uname(r.owner))}${r.phone ? ' · ' + esc(r.phone) : ''}${r.notes ? ' · ' + esc(r.notes.slice(0, 80)) : ''}</span></div>
   <div class="acts"><button class="btn xs" data-act="done" data-id="${r.id}">Done</button><button class="btn xs" data-act="snooze" data-id="${r.id}" data-v="30">+30m</button><button class="btn xs" data-act="snooze" data-id="${r.id}" data-v="1440">+1d</button><button class="btn xs" data-act="meet" data-id="${r.id}">Meet</button><button class="btn xs" data-act="open" data-id="${r.id}">Open</button></div></div>`).join('')}`).join('') || '<div class="empty">No follow-ups scheduled</div>'}</div>`;
}
/* ---------------- website & forms ---------------- */
const crmBase = () => location.origin + location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
const formLink = f => appLink() + '#/f/' + f.id;
function vWeb(b) {
  if (!canManage(b.id)) return '<div class="empty">Only the business admin can manage the website connection.</div>';
  const w = b.web || {}, snippet = `<script src="${crmBase()}/embed.js" data-key="${w.key}" async></script>`;
  const forms = (S.forms || []).filter(f => f.businessId === b.id), local = /localhost|127\.0\.0\.1/.test(location.hostname);
  return `<div class="g2"><div class="stack">
   <div class="card stack"><div class="row"><h2 style="flex:1">${ic('globe')} Website plugin</h2><label class="sw"><input type="checkbox" data-act="webon" data-id="${b.id}" ${w.enabled ? 'checked' : ''}>Collecting</label></div>
    <p class="hint">Every form filled on the website (contact, enquiry, sign-up, checkout) is added to a sheet automatically. The same person is updated, never duplicated.</p>
    <div class="kpis" style="margin:0"><div class="kpi"><small>Received from website</small><b>${num(w.count || 0)}</b><span>${w.lastAt ? 'last ' + esc(rel(w.lastAt)) : 'nothing yet'}</span></div><div class="kpi"><small>Website records in CRM</small><b>${num(rowsOf(b.id).filter(r => r.source === 'Website').length)}</b><span>source “Website”</span></div></div>
    <label class="f">Save new website leads into<select class="sel" data-act="websheet" data-id="${b.id}">${sheetsOf(b.id).map(x => `<option value="${esc(x.id)}" ${(w.sheetId || sheetsOf(b.id)[0].id) === x.id ? 'selected' : ''}>${esc(x.name)} · ${esc(x.category)}</option>`).join('')}</select></label>
    <label class="f">Website key<span class="row"><input class="inp" style="flex:1" readonly value="${esc(w.key)}"><button class="btn" data-act="copyv" data-v="${esc(w.key)}">Copy</button><button class="btn" data-act="newkey" data-id="${b.id}" title="Old key stops working">New key</button></span></label>
    ${local ? `<div class="alert info" style="margin:0">The CRM is running on <b>localhost</b>. A live website can only send leads when the CRM has a public address (for example <code>https://crm.rarevo.in</code>). You can still test from this computer.</div>` : ''}
    <div class="row"><button class="btn" data-act="webtest" data-id="${b.id}">Send a test lead</button><span class="hint">Adds “Website test” to the sheet so you can see it working.</span></div></div>
   <div class="card stack"><h2>1 · Any website (HTML, Shopify, Wix, Webflow, custom)</h2><p class="hint">Paste this just before <code>&lt;/body&gt;</code> on every page. All forms are captured; the forms keep working as before.</p><div class="code">${esc(snippet)}</div><div><button class="btn sm" data-act="copyv" data-v="${esc(snippet)}">Copy code</button></div>
    <p class="hint">Only some forms? add <code>data-forms=".contact-form"</code>. Skip a form: add <code>data-crm-ignore</code> to it.</p></div>
   <div class="card stack"><h2>2 · WordPress / WooCommerce plugin</h2><ol class="steps"><li>Download the plugin and upload it in WordPress → Plugins → Add New → Upload Plugin, then Activate.</li><li>Open Settings → RAREVO CRM and paste the CRM address <code>${esc(crmBase())}</code> and the website key.</li><li>Press <b>Send a test lead</b>, then <b>Sync existing users now</b> — every user and WooCommerce customer already on the site comes into the sheet.</li></ol>
    <p class="hint">Works with Contact Form 7, WPForms, Elementor forms, Gravity Forms, Fluent Forms, new user sign-ups and WooCommerce orders.</p><div><a class="btn sm pri" href="downloads/rarevo-crm-connector.zip" download>${ic('down')}Download WordPress plugin</a></div></div>
  </div>
  <div class="stack"><div class="card"><div class="ch"><h2>${ic('form')} Forms</h2><span class="sp"></span><button class="btn sm pri" data-act="newform" data-id="${b.id}">${ic('plus')}Create form</button></div>
   <p class="hint" style="margin-bottom:8px">Build a form, share its link on WhatsApp, Instagram or ads, or embed it on any website. Every answer becomes a row in the sheet you choose.</p>
   <div class="list">${forms.map(f => `<div class="li" style="align-items:flex-start"><span class="ni" style="background:${esc(f.color)}22;color:${esc(f.color)}">${ic('form')}</span><div class="tx"><b>${esc(f.name)} ${f.active ? '<span class="pill ok">Live</span>' : '<span class="pill">Closed</span>'}</b><small>${f.fields.length} questions · into “${esc((SH(f.sheetId) || {}).name || '?')}” · ${num(f.submissions || 0)} responses${f.lastAt ? ' · last ' + esc(rel(f.lastAt)) : ''}</small>
     <div class="row" style="margin-top:6px"><button class="btn xs" data-act="editform" data-id="${f.id}">Edit</button><button class="btn xs" data-act="copyv" data-v="${esc(formLink(f))}">${ic('link')}Copy link</button><a class="btn xs" href="${esc(formLink(f))}" target="_blank" rel="noopener">Open</a><button class="btn xs" data-act="copyv" data-v="${esc(`<iframe src="${formLink(f)}" style="width:100%;height:720px;border:0" title="${f.title}"></iframe>`)}">Embed code</button><a class="btn xs" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(f.title + ' ' + formLink(f))}">${ic('wa')}Share</a><button class="btn xs danger" data-act="delform" data-id="${f.id}">Delete</button></div></div></div>`).join('') || '<div class="empty">No forms yet</div>'}</div></div></div></div>`;
}
const FT = { text: 'Short text', textarea: 'Long text', phone: 'Phone', email: 'Email', number: 'Number', date: 'Date', select: 'Dropdown', check: 'Checkbox' };
function formModal(id, bid) {
  const f = id ? (S.forms || []).find(x => x.id === id) : null; if (!f) return;
  UI.ff = JSON.parse(JSON.stringify(f.fields));
  const sheets = sheetsOf(f.businessId);
  modal('Form builder — ' + f.name, `<div class="fbuild"><div class="stack">
   <div class="form"><label class="f">Form name (for you)<input class="inp" id="fmN" value="${esc(f.name)}"></label><label class="f">Save answers into<select class="sel" id="fmS">${sheets.map(x => `<option value="${esc(x.id)}" ${x.id === f.sheetId ? 'selected' : ''}>${esc(x.name)} · ${esc(x.category)}</option>`).join('')}</select></label>
   <label class="f full">Title shown on the form<input class="inp" id="fmT" value="${esc(f.title)}"></label><label class="f full">Short intro<textarea class="inp" id="fmI" style="min-height:52px">${esc(f.intro)}</textarea></label>
   <label class="f">Button text<input class="inp" id="fmB" value="${esc(f.button || 'Submit')}"></label><label class="f">Colour<input class="inp" type="color" id="fmC" value="${esc(f.color || '#dc2626')}" style="padding:2px"></label>
   <label class="f full">Thank-you message<input class="inp" id="fmY" value="${esc(f.thanks)}"></label><label class="sw full"><input type="checkbox" id="fmA" ${f.active ? 'checked' : ''}>Form is live (accepting answers)</label></div>
   <div><div class="row" style="margin-bottom:6px"><h3 style="flex:1">Questions</h3><button class="btn sm" data-act="ffadd">${ic('plus')}Add question</button></div><div id="ffList">${ffList()}</div>
   <p class="hint" style="margin-top:6px">Questions called Name, Phone, Email and Message go into those CRM fields. Every other question becomes a column in the sheet.</p></div></div></div>`,
    `<a class="btn" href="${esc(formLink(f))}" target="_blank" rel="noopener">Preview</a><span class="sp"></span><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveform" data-id="${f.id}">Save form</button>`, { wide: true, nofocus: true });
}
function ffList() {
  return UI.ff.map((q, i) => `<div class="ffrow"><input class="inp" data-ff="${i}" data-p="label" value="${esc(q.label)}" aria-label="Question"><select class="sel" data-ff="${i}" data-p="type">${Object.entries(FT).map(([k, l]) => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
   <label class="sw small"><input type="checkbox" data-ff="${i}" data-p="required" ${q.required ? 'checked' : ''}>Required</label>
   <span class="row" style="gap:2px"><button class="btn xs" data-act="ffmove" data-v="${i}" data-d="-1" ${i ? '' : 'disabled'} aria-label="Move up">↑</button><button class="btn xs" data-act="ffmove" data-v="${i}" data-d="1" ${i < UI.ff.length - 1 ? '' : 'disabled'} aria-label="Move down">↓</button><button class="btn xs danger" data-act="ffdel" data-v="${i}" aria-label="Remove">${ic('x')}</button></span>
   ${q.type === 'select' ? `<input class="inp full2" data-ff="${i}" data-p="options" value="${esc((q.options || []).join(', '))}" placeholder="Options, comma separated">` : ''}</div>`).join('');
}
async function renderPublicForm(id) {
  let f;
  try { f = MODE === 'demo' ? window.RDemo.publicForm(id) : await fetch('/api/forms/' + encodeURIComponent(id) + '/public').then(r => r.ok ? r.json() : r.json().then(j => { throw new Error(j.error); })); }
  catch (e) { $('#app').innerHTML = `<div class="login"><div class="card"><h1>Form not found</h1><p class="hint">${esc(e.message)}</p></div></div>`; return; }
  const inp = q => { const a = `name="${esc(q.id)}" ${q.required ? 'required' : ''}`; if (q.type === 'textarea') return `<textarea class="inp" ${a} rows="4"></textarea>`; if (q.type === 'select') return `<select class="sel" ${a}><option value="">Choose…</option>${q.options.map(o => `<option>${esc(o)}</option>`).join('')}</select>`; if (q.type === 'check') return `<label class="sw"><input type="checkbox" ${a} value="1">${esc(q.label)}</label>`; return `<input class="inp" type="${q.type === 'phone' ? 'tel' : q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : q.type === 'email' ? 'email' : 'text'}" ${a}>`; };
  document.title = f.title;
  $('#app').innerHTML = `<div class="pform" style="--fc:${esc(f.color || '#dc2626')}"><form class="card stack" id="pubForm" data-id="${esc(f.id)}"><div class="pfh"><span class="avatar" style="--c:${esc(f.business.color || f.color)}">${esc(ini(f.business.name || 'R').slice(0, 1))}</span><span class="small muted">${esc(f.business.name || '')}</span></div><h1>${esc(f.title)}</h1>${f.intro ? `<p class="muted" style="margin:0">${esc(f.intro)}</p>` : ''}
   ${f.active ? f.fields.map(q => q.type === 'check' ? `<div>${inp(q)}</div>` : `<label class="f"><span>${esc(q.label)}${q.required ? ' <span style="color:var(--red)">*</span>' : ''}</span>${inp(q)}</label>`).join('') + `<input name="_hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true"><div id="pfErr"></div><button class="btn pri" type="submit" style="height:40px">${esc(f.button || 'Submit')}</button>` : '<div class="alert">This form is closed.</div>'}
   <p class="hint" style="text-align:center">Powered by RAREVO CRM</p></form></div>`;
}
/* ---------------- users (system admin) ---------------- */
function userRow(u, opts) {
  const rs = S.rows.filter(r => r.owner === u.id);
  return `<tr class="${opts && opts.sub ? 'subrow' : ''}"><td><div class="row" style="flex-wrap:nowrap">${opts && opts.sub ? '<span class="muted">└</span>' : ''}<span class="avatar sm" style="--c:${u.role === 'owner' ? 'var(--blue)' : u.role === 'super' ? 'var(--red)' : '#6b7280'}">${esc(ini(u.name))}</span><div><b>${esc(u.name)}</b>${u.id === S.me.id ? ' <span class="pill">you</span>' : ''}<br><small class="muted">${esc(u.email || u.phone || '')}</small></div></div></td><td><code>${esc(u.username)}</code></td><td><span class="pill ${u.role === 'super' ? 'err' : u.role === 'owner' ? 'info' : ''}">${ROLE_N[u.role]}</span></td><td class="num">${rs.length}</td><td class="num">${rs.filter(open_).length}</td><td class="small muted nowrap">${u.lastLogin ? esc(rel(u.lastLogin)) : 'never'}</td>
   <td class="nowrap">${opts && opts.toggle ? `<button class="btn xs" data-act="utoggle" data-id="${esc(opts.toggle)}">${UI.uOpen[opts.toggle] ? 'Hide' : 'Show'} employees (${opts.n})</button>` : ''}${u.role !== 'super' && isSuper() ? `<button class="btn xs" data-act="viewas" data-id="${u.id}" title="Open the CRM as this person, no password needed">${ic('eye')}Open as</button>` : ''}<button class="btn xs" data-act="user" data-id="${u.id}" data-b="${esc(u.businessId || '')}">Edit</button>${u.id !== S.me.id ? `<button class="btn xs" data-act="resetpw" data-id="${u.id}">New password</button><button class="btn xs danger" data-act="deluser" data-id="${u.id}">Remove</button>` : ''}</td></tr>`;
}
function vUsers() {
  if (!isSuper()) return '<div class="empty">Only the system admin can see this page.</div>';
  const head = '<thead><tr><th>Name</th><th>Login ID</th><th>Role</th><th class="num">Records</th><th class="num">Open</th><th>Last sign-in</th><th></th></tr></thead>';
  const supers = S.users.filter(u => u.role === 'super');
  return `<div class="ph"><div class="t"><h1 class="row">${ic('team')} Users</h1><p>Every business has its own login page. Click “Show employees” on a business admin to see their team.</p></div><button class="btn pri" data-act="user" data-b="">${ic('plus')}Add user</button></div>
  <div class="card p0" style="margin-bottom:12px"><div class="ch" style="padding:12px 14px 0"><h2>System admins</h2><span class="muted small">sign in at ${esc(appLink())}#/admin</span></div><div class="scroll"><table class="t stk">${head}<tbody>${supers.map(u => userRow(u)).join('')}</tbody></table></div></div>
  ${S.businesses.map(b => { const us = bizUsers(b.id), owners = us.filter(u => u.role === 'owner'), staff = us.filter(u => u.role !== 'owner'); const open = UI.uOpen[b.id] || UI.uOpen.all;
    return `<div class="card p0" style="margin-bottom:12px" id="u-${esc(b.id)}"><div class="ch" style="padding:12px 14px 0"><span class="avatar sm" style="--c:${esc(b.color)}">${esc(ini(b.name).slice(0, 1))}</span><h2>${esc(b.name)}</h2><span class="pill">${us.length} users</span><span class="small muted">${owners.length} admin · ${staff.length} employees</span><span class="sp"></span><button class="btn xs" data-act="copyv" data-v="${esc(gateLink(b))}">${ic('link')}Copy login page link</button><button class="btn xs" data-act="clientlogin" data-id="${b.id}">+ Business admin</button><button class="btn xs" data-act="user" data-b="${b.id}">+ Employee</button><button class="btn xs" data-go="/b/${b.id}">Open</button></div>
     <div class="scroll"><table class="t stk">${head}<tbody>${owners.map(u => userRow(u, { toggle: b.id, n: staff.length })).join('') || `<tr><td colspan="7" class="small muted">No business admin yet</td></tr>`}${(open || !owners.length) ? staff.map(u => userRow(u, { sub: 1 })).join('') : ''}</tbody></table></div></div>`; }).join('')}`;
}
/* ---------------- team ---------------- */
function vTeam(bid) {
  if (!canManage(bid)) return '<div class="empty">Only the business admin can manage the team.</div>';
  const b = B(bid), list = bizUsers(bid), reqs = pendingReqs(bid);
  const sheetsN = u => sheetsOf(bid).filter(s => sheetPermOf(u, s) !== 'none').length;
  return `<div class="ph"><div class="t"><h2>Team &amp; access</h2><p>Business admins see and manage everything. Employees see the records assigned to them, plus the sheets you share with them.</p></div><button class="btn" data-act="sharelogin" data-id="${esc(bid)}">${ic('link')}Share login link</button><button class="btn pri" data-act="user" data-b="${esc(bid)}">${ic('plus')}Add employee</button></div>
  ${reqs.length ? `<div class="card" style="margin-bottom:12px;border-color:#fde68a"><h2 style="margin-bottom:6px">Access requests <span class="pill warn">${reqs.length}</span></h2><div class="list">${reqs.map(q => `<div class="li"><span class="avatar sm" style="--c:#6b7280">${esc(ini(uname(q.userId)))}</span><div class="tx"><b>${esc(uname(q.userId))} wants to ${q.level === 'edit' ? 'edit' : 'view'} ${esc(q.sheetId === 'master' ? 'the Master sheet' : '“' + ((SH(q.sheetId) || {}).name || 'sheet') + '”')}</b><small>${esc(rel(q.at))}${q.note ? ' · “' + esc(q.note) + '”' : ''}</small></div>${q.sheetId !== 'master' ? `<button class="btn xs" data-act="reqok" data-id="${q.id}" data-l="view">Allow view</button><button class="btn xs pri" data-act="reqok" data-id="${q.id}" data-l="edit">Allow edit</button>` : `<button class="btn xs pri" data-act="reqok" data-id="${q.id}" data-l="view">Allow</button>`}<button class="btn xs danger" data-act="reqno" data-id="${q.id}">Deny</button></div>`).join('')}</div></div>` : ''}
  <div class="card p0"><div class="scroll"><table class="t stk"><thead><tr><th>Name</th><th>Login ID</th><th>Role</th><th>Sheet access</th><th class="num">Records</th><th class="num">Open</th><th>Last sign-in</th><th></th></tr></thead><tbody>${list.map(u => { const rs = S.rows.filter(r => r.owner === u.id); return `<tr><td><div class="row" style="flex-wrap:nowrap"><span class="avatar sm" style="--c:${u.role === 'owner' ? 'var(--blue)' : '#6b7280'}">${esc(ini(u.name))}</span><div><b>${esc(u.name)}</b>${u.id === S.me.id ? ' <span class="pill">you</span>' : ''}<br><small class="muted">${esc(u.email || u.phone || '')}</small></div></div></td><td><code>${esc(u.username)}</code></td><td><span class="pill ${u.role === 'owner' ? 'info' : ''}">${ROLE_N[u.role]}</span></td><td class="small">${u.role === 'owner' ? 'Everything' : `${sheetsN(u)} of ${sheetsOf(bid).length} sheets${((b.masterAccess || {}).view || []).includes(u.id) ? ' + master' : ''}`}</td><td class="num">${rs.length}</td><td class="num">${rs.filter(open_).length}</td><td class="small muted">${u.lastLogin ? esc(rel(u.lastLogin)) : 'never'}</td><td class="nowrap">${u.role !== 'owner' ? `<button class="btn xs" data-act="uaccess" data-id="${u.id}">Access</button>` : ''}<button class="btn xs" data-act="user" data-id="${u.id}" data-b="${esc(bid)}">Edit</button>${u.id !== S.me.id ? `<button class="btn xs" data-act="resetpw" data-id="${u.id}">New password</button><button class="btn xs danger" data-act="deluser" data-id="${u.id}">Remove</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="8"><div class="empty">No people yet</div></td></tr>'}</tbody></table></div></div>`;
}
function sheetPermOf(u, sh) { if (u.role === 'super' || (u.role === 'owner' && u.businessId === sh.businessId)) return 'edit'; const a = sh.access || {}; return (a.edit || []).includes(u.id) ? 'edit' : (a.view || []).includes(u.id) ? 'view' : 'none'; }
function accessModal(sid) {
  const sh = SH(sid), people = bizUsers(sh.businessId).filter(u => u.role === 'staff');
  const reqs = pendingReqs(sh.businessId).filter(q => q.sheetId === sid);
  modal('Access — ' + sh.name, `<p class="hint">Business admins always have full access. Choose what each employee can do with this sheet. People with “No access” still see records assigned to them.</p>
   ${reqs.length ? `<div class="alert info" style="margin:10px 0">${reqs.length} pending request${reqs.length > 1 ? 's' : ''} — approve them in Team &amp; access, or set the access below.</div>` : ''}
   <table class="t" style="margin-top:8px"><thead><tr><th>Employee</th><th>Access</th></tr></thead><tbody>${people.map(u => `<tr><td><b>${esc(u.name)}</b> <small class="muted">${esc(u.username)}</small></td><td><select class="sel sm acc" data-u="${esc(u.id)}">${[['none', 'No access'], ['view', 'Can view'], ['edit', 'Can edit']].map(([x, l]) => `<option value="${x}" ${sheetPermOf(u, sh) === x ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="2"><div class="empty">Add employees in Team &amp; access first</div></td></tr>'}</tbody></table>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveaccess" data-id="${sid}">Save access</button>`, { nofocus: true });
}
function maccessModal(bid) {
  const b = B(bid), people = bizUsers(bid).filter(u => u.role === 'staff'), v = (b.masterAccess || {}).view || [];
  modal('Access — Master sheet', `<p class="hint">The master sheet shows every sheet of ${esc(b.name)} together. Choose which employees can open it (they see the rows of the sheets they have access to).</p><div class="stack" style="margin-top:10px">${people.map(u => `<label class="sw"><input type="checkbox" class="macc" value="${esc(u.id)}" ${v.includes(u.id) ? 'checked' : ''}>${esc(u.name)} <span class="muted small">${esc(u.username)}</span></label>`).join('') || '<div class="empty">No employees yet</div>'}</div>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savemaccess" data-id="${bid}">Save</button>`, { nofocus: true });
}
function uaccessModal(uid) {
  const u = U(uid), b = B(u.businessId), shs = sheetsOf(u.businessId);
  modal('Sheet access — ' + u.name, `<table class="t"><thead><tr><th>Sheet</th><th>Category</th><th>Access</th></tr></thead><tbody>
   <tr><td><b>Master sheet</b></td><td>All</td><td><select class="sel sm" id="ua-master"><option value="none">No access</option><option value="view" ${((b.masterAccess || {}).view || []).includes(uid) ? 'selected' : ''}>Can view</option></select></td></tr>
   ${shs.map(sh => `<tr><td><b>${esc(sh.name)}</b></td><td>${esc(sh.category)}</td><td><select class="sel sm ua" data-s="${esc(sh.id)}">${[['none', 'No access'], ['view', 'Can view'], ['edit', 'Can edit']].map(([x, l]) => `<option value="${x}" ${sheetPermOf(u, sh) === x ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table><p class="hint" style="margin-top:8px">With “No access”, ${esc(u.name)} still sees the records assigned to them.</p>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveuaccess" data-id="${uid}">Save access</button>`, { nofocus: true });
}
function userModal(id, bid, role) {
  const u = id ? U(id) : { name: '', email: '', phone: '', username: '', role: role || (bid ? 'staff' : 'owner'), businessId: bid || '' };
  const roles = isSuper() ? ['owner', 'staff', 'super'] : ['staff', 'owner'];
  modal(id ? 'Edit ' + u.name : (u.role === 'owner' ? 'Create business admin login' : 'Add employee'), `<div class="form"><label class="f">Full name<input class="inp" id="usName" value="${esc(u.name)}"></label>
   <label class="f">Login ID<input class="inp" id="usUser" value="${esc(u.username || '')}" placeholder="${id ? '' : 'Created automatically from the name'}"></label>
   <label class="f">Role<select class="sel" id="usRole" ${id === S.me.id ? 'disabled' : ''}>${roles.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${ROLE_N[r]}${r === 'owner' ? ' — manages the business' : r === 'staff' ? ' — employee / POC' : ' — sees everything'}</option>`).join('')}</select></label>
   ${isSuper() ? `<label class="f">Business<select class="sel" id="usBiz"><option value="">— none (system admin) —</option>${S.businesses.map(b => `<option value="${esc(b.id)}" ${u.businessId === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>` : ''}
   <label class="f">Email (optional, for meeting invites)<input class="inp" id="usEmail" type="email" value="${esc(u.email || '')}"></label><label class="f">Phone (optional)<input class="inp" id="usPhone" value="${esc(u.phone || '')}"></label>
   ${id ? '' : `<label class="f full">Password<span class="row"><input class="inp" id="usPw" style="flex:1" value="${esc(genPw())}"><button class="btn" type="button" data-act="regen">Generate</button></span><span class="hint">Generated by the system. You will see a ready message to share after saving.</span></label>`}</div>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveuser" data-id="${esc(id || '')}">${id ? 'Save' : 'Create login'}</button>`);
}
const HEXD = { red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e', blue: '#3b82f6', purple: '#a855f7' };
function applyColors() { const b = R && R.bid ? B(R.bid) : null, x = (b && b.colorHex) || {}, st = document.documentElement.style; COLORS.forEach(c => { if (x[c]) { st.setProperty('--c-' + c, x[c]); st.setProperty('--t-' + c, x[c] + '2e'); } else { st.removeProperty('--c-' + c); st.removeProperty('--t-' + c); } }); }
function colorModal(bid) {
  const b = B(bid), lab = labelsOf(bid), hx = b.colorHex || {};
  modal('Colour labels — ' + b.name, `<p class="hint" style="margin-top:0">Change the name and colour of each label. Rows already marked keep their label and get the new colour.</p><div class="stack">${COLORS.map(c => `<div class="row" style="gap:8px"><input type="color" id="ch-${c}" value="${esc(hx[c] || HEXD[c])}" style="width:42px;height:32px;padding:0;border:1px solid var(--line);border-radius:3px;background:none"><input class="inp" id="cl-${c}" value="${esc(lab[c] || LABELS[c])}" style="flex:1" maxlength="30"><button class="btn sm" data-act="colreset" data-v="${c}" title="Default colour">↺</button></div>`).join('')}</div>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savecolors" data-id="${bid}">Save</button>`);
}
function shareModal(bid) {
  const b = B(bid), link = gateLink(b), us = S.users.filter(u => u.businessId === bid && (isSuper() ? true : u.role === 'staff')).sort((a, c) => (a.role === 'owner' ? -1 : 1) - (c.role === 'owner' ? -1 : 1));
  const invite = u => `Hi ${u ? u.name : ''},\n\nHere is your secure login page for ${b.name} CRM:\n${link}\n\n${u ? 'Login ID: ' + u.username + '\n' : ''}Your password will be sent separately. Please don't share it with anyone.\n\n— RAREVO MEDIA`;
  modal('Share login — ' + b.name, `<label class="f">Secure login page for ${esc(b.name)}<span class="row"><input class="inp" style="flex:1" readonly value="${esc(link)}"><button class="btn" data-act="copyv" data-v="${esc(link)}">Copy link</button><a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Open</a></span></label>
   <p class="hint">Only people of ${esc(b.name)} can sign in on this page. Logins from other businesses are refused, 5 wrong passwords lock it for 15 minutes, and new users must set their own password on first sign-in.</p>
   <table class="t" style="margin-top:8px"><thead><tr><th>Person</th><th>Login ID</th><th>Last sign-in</th><th></th></tr></thead><tbody>${us.map(u => `<tr><td><b>${esc(u.name)}</b><br><span class="small muted">${esc(ROLE_N[u.role])}${u.disabled ? ' · <b style="color:var(--red)">blocked</b>' : u.mustChange ? ' · first sign-in pending' : ''}</span></td><td><code>${esc(u.username)}</code></td><td class="small muted">${u.lastLogin ? esc(rel(u.lastLogin)) : 'never'}</td>
     <td class="nowrap"><a class="btn xs" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(invite(u))}">${ic('wa')}Link</a><button class="btn xs" data-act="copyv" data-v="${esc(invite(u))}">Copy invite</button><button class="btn xs pri" data-act="shresend" data-id="${u.id}" title="Makes a new password and shows the full message to send">New password &amp; send</button><button class="btn xs ${u.disabled ? '' : 'danger'}" data-act="shblock" data-id="${u.id}">${u.disabled ? 'Unblock' : 'Block'}</button></td></tr>`).join('') || `<tr><td colspan="4" class="muted">No logins yet for ${esc(b.name)}.</td></tr>`}</tbody></table>`,
    `${isSuper() && !S.users.some(u => u.role === 'owner' && u.businessId === bid) ? `<button class="btn pri" data-act="clientlogin" data-id="${bid}">+ Create client login</button>` : ''}<span class="sp"></span><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(invite(null))}">${ic('wa')}Send link on WhatsApp</a><button class="btn pri" data-act="close">Done</button>`, { wide: true, nofocus: true });
}
function credModal(u, pw) {
  const b = B(u.businessId), link = b ? gateLink(b) : appLink() + '#/admin';
  const msg = `Hi ${u.name},\n\nYour ${b ? b.name + ' ' : ''}CRM login is ready.\n\nLogin page: ${link}\nLogin ID: ${u.username}\nPassword: ${pw}\n\nYou will be asked to set your own password the first time you sign in.\n\n— RAREVO MEDIA`;
  UI.cred = msg;
  const line = (l, x) => `<label class="f">${l}<span class="row"><input class="inp" style="flex:1" readonly value="${esc(x)}"><button class="btn" data-act="copyv" data-v="${esc(x)}">Copy</button></span></label>`;
  modal('Login ready — share with ' + u.name, `<div class="alert ok" style="margin-bottom:12px">${esc(ROLE_N[u.role])}${b ? ' for ' + esc(b.name) : ''}. Copy the details now — the password is not shown again (you can always create a new one).</div>
   <div class="stack">${line(b ? b.name + ' login page' : 'Admin login page', link)}${line('Login ID', u.username)}${line('Password', pw)}</div>
   <label class="f" style="margin-top:12px">Message to send<textarea class="inp" readonly style="min-height:170px">${esc(msg)}</textarea></label>${MODE === 'demo' ? '<p class="hint">Demo preview: passwords are not checked here. They work in the real project.</p>' : ''}`,
    `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">${ic('wa')}Send on WhatsApp</a><a class="btn" target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&su=${encodeURIComponent('Your CRM login')}&body=${encodeURIComponent(msg)}">Send with Gmail</a><span class="sp"></span><button class="btn" data-act="copycred">Copy message</button><button class="btn pri" data-act="close">Done</button>`, { nofocus: true });
}
function colsModal(id) {
  const s = SH(id), lab = s.labels || {}, hid = new Set(s.hidden || []);
  modal('Columns & headers — ' + s.name, `<p class="hint">Rename any header (for example “Phone” → “WhatsApp number”), hide built-in columns you don't need, and add or edit your own columns. Tip: double-click a header in the sheet to rename it quickly.</p>
   <h3 style="margin:12px 0 6px">Built-in columns</h3><div class="colgrid">${Object.keys(BLABEL).map(k => `<span class="muted small">${BLABEL[k]}</span><input class="inp" id="bl-${k}" value="${esc(lab[k] || '')}" placeholder="${esc(BLABEL[k])}"><label class="sw"><input type="checkbox" id="bs-${k}" ${hid.has(k) ? '' : 'checked'} ${k === 'name' ? 'disabled' : ''}>Show</label>`).join('')}</div>
   <h3 style="margin:16px 0 6px">Your columns</h3><div class="stack">${s.columns.map((c, i) => `<div class="row"><input class="inp" style="flex:1 1 150px" id="ec-${i}" value="${esc(c.name)}" aria-label="Column name"><select class="sel" id="et-${i}">${['text', 'number', 'date', 'select', 'multi', 'yesno', 'check'].map(t => `<option value="${t}" ${c.type === t ? 'selected' : ''}>${{ text: 'Text', number: 'Number', date: 'Date', select: 'Dropdown', multi: 'Multi-select', yesno: 'Yes / No', check: 'Checkbox' }[t]}</option>`).join('')}</select><input class="inp" style="flex:1 1 150px" id="eo-${i}" value="${esc((c.options || []).join(', '))}" placeholder="Dropdown options, comma separated"><label class="sw"><input type="checkbox" id="ed-${i}">Delete</label></div>`).join('') || '<div class="small muted">None yet</div>'}
    <div class="row" style="border-top:1px dashed var(--line);padding-top:10px"><input class="inp" style="flex:1 1 150px" id="nc-n" placeholder="New column name"><select class="sel" id="nc-t"><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Dropdown (your options)</option><option value="multi">Multi-select (pick many)</option><option value="yesno">Yes / No</option><option value="check">Checkbox</option></select><input class="inp" style="flex:1 1 150px" id="nc-o" placeholder="Dropdown options (optional)"></div></div>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savecols" data-id="${s.id}">Save columns</button>`, { wide: true, nofocus: true });
}
function eRange() { const keep = UI.meta; UI.meta = UI.em; const r = mRange(); UI.meta = keep; return r; }
function vEmail(b) {
  const [from, to, label] = eRange(), cur = b.currency, list = emailsOf(b.id, from, to).sort((a, c) => c.date.localeCompare(a.date));
  const t = k => sum(list, e => e[k]), sent = t('sent'), del = t('delivered') || sent, op = t('opened'), cl = t('clicked'), leads = t('leads'), cost = t('cost');
  const f0 = pD(from), t1 = pD(to) + DAY, crm = rowsOf(b.id).filter(r => r.source === 'Email' && r.added >= f0 && r.added < t1);
  const pct = (a, c) => c ? (a / c * 100).toFixed(1) + '%' : '—';
  const m = canManage(b.id);
  return `<div class="card" style="margin-bottom:12px"><div class="row"><b>Email marketing results</b><span class="small muted">Track campaigns sent from Gmail, Mailchimp, Brevo or any tool — add them by hand or import the CSV report.</span><span class="sp"></span>${m ? `<button class="btn sm" data-act="emimport" data-id="${b.id}">${ic('up')}Import CSV</button><button class="btn sm pri" data-act="emadd" data-id="${b.id}">${ic('plus')}Add campaign</button>` : ''}</div></div>
  <div class="row" style="margin-bottom:12px"><div class="chips">${[['7', '7 days'], ['30', '30 days'], ['month', 'This month'], ['last', 'Last month'], ['custom', 'Custom']].map(([k, l]) => `<button class="chip ${UI.em.range === k ? 'on' : ''}" data-act="erange" data-v="${k}">${l}</button>`).join('')}</div>
   ${UI.em.range === 'custom' ? `<input class="inp" type="date" data-act="efrom" value="${esc(from)}"><input class="inp" type="date" data-act="eto" value="${esc(to)}">` : ''}<span class="sp"></span><button class="btn sm" data-act="emexport" data-id="${b.id}">${ic('down')}Export</button></div>
  <div class="kpis"><div class="kpi"><small>Campaigns · ${esc(label)}</small><b>${list.length}</b><span>${num(sent)} emails sent</span></div><div class="kpi"><small>Delivered</small><b>${pct(del, sent)}</b><span>${num(del)} delivered</span></div>
   <div class="kpi"><small>Open rate</small><b>${pct(op, del)}</b><span>${num(op)} opened</span></div><div class="kpi"><small>Click rate</small><b>${pct(cl, del)}</b><span>${num(cl)} clicked · ${num(t('replies'))} replies</span></div>
   <div class="kpi"><small>Leads</small><b>${num(leads)}</b><span>${crm.length} with source “Email” in CRM</span></div><div class="kpi"><small>Cost</small><b>${money(cost, cur)}</b><span>${leads ? money(cost / leads, cur) + ' per lead' : '—'}</span></div></div>
  <div class="card p0"><div class="scroll"><table class="t stk"><thead><tr><th>Date</th><th>Campaign</th><th class="num">Sent</th><th class="num">Delivered</th><th class="num">Opened</th><th class="num">Clicked</th><th class="num">Replies</th><th class="num">Leads</th><th class="num">Unsub.</th><th class="num">Cost</th><th class="num">CPL</th><th></th></tr></thead><tbody>
  ${list.map(e => `<tr><td class="nowrap">${esc(fD(pD(e.date)))}</td><td><b>${esc(e.campaign)}</b>${e.subject && e.subject !== e.campaign ? `<br><small class="muted">${esc(e.subject)}</small>` : ''}</td><td class="num">${num(e.sent)}</td><td class="num">${num(e.delivered)}</td><td class="num">${num(e.opened)} <small class="muted">${pct(e.opened, e.delivered || e.sent)}</small></td><td class="num">${num(e.clicked)} <small class="muted">${pct(e.clicked, e.delivered || e.sent)}</small></td><td class="num">${num(e.replies)}</td><td class="num">${num(e.leads)}</td><td class="num">${num(e.unsubscribed)}</td><td class="num">${money(e.cost, cur)}</td><td class="num">${e.leads ? money(e.cost / e.leads, cur) : '—'}</td><td class="nowrap">${m ? `<button class="btn xs" data-act="emadd" data-id="${b.id}" data-v="${esc(e.id)}">Edit</button><button class="btn xs ghost danger" data-act="emdel" data-id="${esc(e.id)}" aria-label="Delete">${ic('x')}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="12"><div class="empty">No email campaigns in this range yet</div></td></tr>'}
  </tbody></table></div></div>`;
}
/* ---------------- record modals ---------------- */
function detail(id) {
  const r = S.rows.find(x => x.id === id); if (!r) return toast('Record not found', '', 1);
  const b = B(r.businessId), sh = SH(r.sheetId), lab = labelsOf(r.businessId);
  modal(r.name || '(no name)', `<div class="row" style="margin-bottom:10px"><span class="pill"><span class="src ${srcCls(r.source)}">${esc(r.source)}</span></span><span class="pill st-${esc(r.status.split(' ')[0])}">${esc(r.status)}</span><span class="pill pr-${esc(r.priority)}">${esc(r.priority)}</span>${r.color ? `<span class="pill"><i class="cd" style="--c:var(--c-${r.color})"></i>${esc(lab[r.color])}</span>` : ''}</div>
   <dl class="kv"><dt>Business</dt><dd>${esc(b ? b.name : '')}</dd><dt>Sheet</dt><dd>${esc(sh ? sh.name + ' · ' + sh.category : '')}</dd><dt>Phone</dt><dd>${esc(r.phone) || '—'}</dd><dt>Email</dt><dd>${esc(r.email) || '—'}</dd><dt>POC</dt><dd>${esc(uname(r.owner))}</dd><dt>Date added</dt><dd>${esc(fDT(r.added))}</dd><dt>Next follow-up</dt><dd>${r.followUp ? esc(fDT(r.followUp) + ' (' + rel(r.followUp) + ')') : '—'}</dd><dt>Closure date</dt><dd>${esc(fD(r.closed)) || '—'}</dd><dt>Sale price</dt><dd>${r.price != null ? money(r.price, b && b.currency) : '—'}</dd>
   ${(sh ? sh.columns : []).map(c => `<dt>${esc(c.name)}</dt><dd>${esc((r.data || {})[c.id] ?? '') || '—'}</dd>`).join('')}</dl>
   <label class="f" style="margin-top:12px">Notes<textarea class="inp" data-id="${r.id}" data-f="notes" ${canEdit(r) ? '' : 'disabled'}>${esc(r.notes)}</textarea></label>
   <h3 style="margin:14px 0 6px">Activity</h3><div class="log">${(r.log || []).map(l => `<div>${esc(l.text)}<br><small class="muted">${esc(fDT(l.t))} · ${esc(l.by || '')}</small></div>`).join('') || '<span class="muted">No activity</span>'}</div>`,
    `${r.phone ? `<button class="btn" data-act="chat" data-id="${r.id}">${ic('wa')}WhatsApp</button>` : ''}${r.followUp && canEdit(r) ? `<button class="btn" data-act="done" data-id="${r.id}">Follow-up done</button>` : ''}<span class="sp"></span><button class="btn" data-go="/b/${r.businessId}/sheets/${r.sheetId}">Open sheet</button><button class="btn pri" data-act="meet" data-id="${r.id}">Schedule meeting</button>`, { nofocus: true });
}
const gfmt = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function gUrl() { const st = pDT(v('mS')) || Date.now(), en = st + Number(v('mDur')) * MIN; return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(v('mTi')) + '&dates=' + gfmt(st) + '/' + gfmt(en) + '&details=' + encodeURIComponent(v('mDe')) + '&add=' + encodeURIComponent(v('mG').split(/[\s,;]+/).filter(Boolean).join(',')); }
function meet(id) {
  const r = S.rows.find(x => x.id === id); if (!r) return; const b = B(r.businessId) || {};
  const st = r.followUp && r.followUp > Date.now() ? r.followUp : sod(Date.now()) + DAY + 11 * HR;
  const g = [...String(b.meetEmails || '').split(/[\s,;]+/), (U(r.owner) || {}).email, r.email].filter(Boolean);
  modal('Schedule Google Calendar meeting', `<div class="form"><label class="f full">Title<input class="inp" id="mTi" value="${esc('Meeting – ' + (r.name || 'Lead') + ' (' + (b.name || '') + ')')}"></label>
   <label class="f">Start<input class="inp" type="datetime-local" id="mS" value="${inDT(st)}"></label><label class="f">Duration<select class="sel" id="mDur"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">1 hour</option></select></label>
   <label class="f full">Guests — default emails + POC + lead<textarea class="inp" id="mG" style="min-height:52px">${esc([...new Set(g)].join(', '))}</textarea></label>
   <label class="f full">Description<textarea class="inp" id="mDe">${esc(`Lead: ${r.name}\nPhone: ${r.phone}\nSource: ${r.source}\nPOC: ${uname(r.owner)}\nNotes: ${r.notes}`)}</textarea></label></div>
   <p class="hint" style="margin-top:8px">Opens Google Calendar with everything filled in — press Save there to send the invites. The follow-up here moves to the meeting time so reminders go out 30 minutes before.</p>`,
    `<button class="btn" data-act="close">Cancel</button><a class="btn pri" id="gLink" target="_blank" rel="noopener" href="#" data-act="gsave" data-id="${r.id}">Create in Google Calendar</a>`);
  $('#gLink').href = gUrl();
}
function doneModal(id) {
  const r = S.rows.find(x => x.id === id); if (!r) return;
  modal('Follow-up done — ' + (r.name || ''), `<div class="form"><label class="f">Status now<select class="sel" id="dS">${STATUSES.map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label class="f">Next follow-up<input class="inp" type="datetime-local" id="dF" value="${inDT(q15(Date.now() + DAY))}"></label>
   <label class="f">Sale price (if won)<input class="inp" type="number" id="dP" value="${r.price ?? ''}"></label><label class="f full">What happened?<textarea class="inp" id="dN" placeholder="Spoke to client, sending quote…"></textarea></label></div>`,
    `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savedone" data-id="${r.id}">Save</button>`);
}
function chat(id) {
  const r = S.rows.find(x => x.id === id); if (!r) return; const b = B(r.businessId);
  if (b && b.rarevo && b.rarevo.status !== 'error') return waChat(b.id, r.phone, r.name);
  window.open('https://wa.me/' + (digits(r.phone).length === 10 ? '91' + digits(r.phone) : String(r.phone).replace(/\D/g, '')), '_blank', 'noopener');
}

/* ---------------- reminders ---------------- */
const remKey = 'rarevo-crm-reminded';
function tick() {
  if (!S) return; let seen = {}; try { seen = JSON.parse(localStorage.getItem(remKey) || '{}'); } catch (e) {}
  const now = Date.now();
  S.rows.forEach(r => {
    if (!r.followUp || seen[r.id] === r.followUp || r.followUp < now - 5 * MIN || r.followUp - now > 30 * MIN) return;
    if (!canEdit(r)) return;
    seen[r.id] = r.followUp;
    const t = `Follow-up ${r.followUp > now ? rel(r.followUp) : 'now'}: ${r.name}`, sub = `${fT(r.followUp)} · ${(B(r.businessId) || {}).name || ''} · ${uname(r.owner)}`;
    toast(t, sub);
    try { if (window.Notification && Notification.permission === 'granted') new Notification(t, { body: sub }); } catch (e) {}
  });
  try { localStorage.setItem(remKey, JSON.stringify(seen)); } catch (e) {}
  if (!document.activeElement || !document.activeElement.closest || !document.activeElement.closest('.sheetwrap,#box')) { const b = $('.top .badge'); const n = dueRows().length; if (b) b.textContent = n; }
}

/* ---------------- login ---------------- */
function renderLogin() {
  const h = (location.hash || '').slice(1), m = h.match(/^\/login\/([^/]+)/), admin = /^\/admin/.test(h);
  let gate = m ? decodeURIComponent(m[1]) : ''; if (!gate && !admin) { try { gate = localStorage.getItem('rarevo-gate') || ''; } catch (e) {} }
  const draw = g => {
    if (S) return;
    $('#app').innerHTML = `<div class="login"><form class="card stack" id="loginForm" data-gate="${esc(g ? g.slug : '')}">${g ? `<div class="row"><span class="avatar lg" style="--c:${esc(g.color)}">${esc(ini(g.name).slice(0, 1))}</span><div><h1>${esc(g.name)}</h1><span class="small muted">${esc(g.industry || 'CRM')} · secure login</span></div></div>` : `<div class="logo"><span class="mk">R</span>RAREVO <span class="tag">CRM</span></div><div><h1>${admin ? 'System admin sign in' : 'Sign in'}</h1></div>`}
     <p class="hint">Use the login ID and password you were given.</p>
     <label class="f">Login ID<input class="inp" id="lgE" autocomplete="username" required placeholder="e.g. ${esc(g ? g.slug : 'business')}.admin"></label><label class="f">Password<span class="pwwrap"><input class="inp" id="lgP" type="password" autocomplete="current-password" required><button type="button" class="pweye" data-act="pweye" aria-label="Show password">${ic('eye')}</button></span></label><div id="lgCaps" class="small" style="color:var(--red)" hidden>Caps Lock is on</div><div id="lgErr"></div><button class="btn pri" type="submit">${ic('lock')}Sign in securely</button>
     <p class="hint" style="text-align:center;margin:0">🔒 Encrypted connection · 5 wrong tries locks the login for 15 minutes</p>
     <p class="hint" style="text-align:center">Powered by RAREVO MEDIA${g ? ` · <a href="#/admin" data-act="toadmin">Admin</a>` : ''}</p></form></div>`;
    const e = $('#lgE'); if (e) e.focus();
    const pw = $('#lgP'); if (pw) pw.addEventListener('keyup', ev => { const c = $('#lgCaps'); if (c && ev.getModifierState) c.hidden = !ev.getModifierState('CapsLock'); });
  };
  if (gate) fetch('/api/gate/' + encodeURIComponent(gate)).then(r => r.ok ? r.json() : null).then(g => draw(g)).catch(() => draw(null)); else draw(null);
}
function mustChangeCheck() {
  if (!S || !S.me || !S.me.mustChange || MODE === 'demo' || S.viewingAs || UI.mcShown) return; UI.mcShown = true;
  modal('Set your own password', `<p class="hint" style="margin-top:0">For security, please replace the password you were given with your own before you continue.</p><div class="form"><label class="f full">Password you were given<input class="inp" type="password" id="pwC" autocomplete="current-password"></label><label class="f full">New password (min 8 characters)<input class="inp" type="password" id="pwN" autocomplete="new-password"></label><label class="f full">Type it again<input class="inp" type="password" id="pwN2" autocomplete="new-password"></label></div>`, `<button class="btn pri" data-act="savepw2">Save password</button>`, { nofocus: false });
  const x = $('#box .x, #box [data-act="close"]'); if (x) x.remove(); $('#modal').dataset.lock = '1';
}
/* ---------------- actions ---------------- */
async function updateRow(id, patch, hard) {
  try { const r = await api('PUT', '/rows/' + id, patch); putRow(r); if (hard) softRender(); }
  catch (e) { toast(e.message, '', 1); softRender(); }
}
const A = {
  close: closeModal,
  menu: el => { UI.menu = UI.menu === el.dataset.v ? null : el.dataset.v; if (UI.menu === 'bell') { try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {} } render(); },
  asuser: el => { window.RDemo.setUser(el.dataset.id); UI.menu = null; UI.sel.clear(); refresh(); },
  resetdemo: () => confirmBox('Reset demo data?', 'All demo businesses, sheets and records go back to the sample data.', 'doreset'),
  doreset: () => { window.RDemo.reset(); closeModal(); UI.menu = null; refresh(); },
  logout: async () => { await api('POST', '/logout').catch(() => {}); S = null; renderLogin(); },
  pw: () => { UI.menu = null; render(); modal('Change password', `<div class="form"><label class="f full">Current password<input class="inp" type="password" id="pwC"></label><label class="f full">New password<input class="inp" type="password" id="pwN"></label></div>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savepw">Save</button>`); },
  savepw2: () => { if (v('pwN').length < 8) return toast('Use at least 8 characters', '', 1); if (v('pwN') !== v('pwN2')) return toast('The two new passwords do not match', '', 1);
    run(async () => { await api('PUT', '/me/password', { current: v('pwC'), password: v('pwN') }); S.me.mustChange = false; delete $('#modal').dataset.lock; closeModal(); }, 'Password saved — you are all set'); },
  pweye: el => { const i = el.parentElement.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; i.focus(); },
  sharelogin: el => shareModal(el.dataset.id),
  shresend: el => { const u = S.users.find(x => x.id === el.dataset.id), pw = genPw(); run(async () => { await api('PUT', '/users/' + u.id, { password: pw }); credModal(u, pw); }); },
  shblock: el => { const u = S.users.find(x => x.id === el.dataset.id), on = !u.disabled; run(async () => { const r = await api('PUT', '/users/' + u.id, { disabled: on }); Object.assign(u, r); shareModal(u.businessId); }, on ? u.name + ' can no longer sign in' : u.name + ' can sign in again'); },
  shnew: el => { closeModal(); A.clientlogin ? A.clientlogin(el) : userModal('', el.dataset.id, 'owner'); },
  savepw: () => run(async () => { await api('PUT', '/me/password', { current: v('pwC'), password: v('pwN') }); closeModal(); }, 'Password changed'),
  homef: el => { UI.home.f = el.dataset.v; render(); },
  addbiz: () => modal('Add business', `<div class="form"><label class="f full">Business name<input class="inp" id="nbN" placeholder="e.g. kittu"></label><label class="f">Industry<input class="inp" id="nbI" placeholder="Bags, real estate, clinic…"></label><label class="f">Status<select class="sel" id="nbS"><option value="active">Active</option><option value="onboarding">Onboarding</option><option value="paused">Paused</option></select></label><label class="f">WhatsApp number<input class="inp" id="nbP" placeholder="+91…"></label><label class="f">Colour<input class="inp" type="color" id="nbC" value="#dc2626" style="padding:2px"></label></div>
    <div class="wsec" style="margin-top:12px"><label class="sw"><input type="checkbox" id="nbL" checked><b>Create a client login (business admin)</b></label><div class="form" style="margin-top:8px"><label class="f">Owner name<input class="inp" id="nbON" placeholder="Client's name"></label><label class="f">Email (optional)<input class="inp" id="nbOE" type="email" placeholder="client@company.com"></label></div><p class="hint" style="margin-top:6px">The login ID (for example <code>businessname.admin</code>) and a password are generated, and shown once so you can send them to your client.</p></div>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savenewbiz">Create business</button>`),
  savenewbiz: () => run(async () => {
    if (!v('nbN').trim()) throw new Error('Business name is required');
    const mk = v('nbL'), on = v('nbON').trim(), oe = v('nbOE').trim();
    if (mk && !on) throw new Error('Enter the owner name, or untick “Create a client login”');
    const r = await api('POST', '/businesses', { name: v('nbN'), industry: v('nbI'), status: v('nbS'), phone: v('nbP'), color: v('nbC') }); putBiz(r.business); putSheet(r.sheet);
    if (mk) { const pw = genPw(); const u = await api('POST', '/users', { name: on, email: oe, role: 'owner', businessId: r.business.id, password: pw }); S.users.push(u); render(); credModal(u, pw); }
    else { closeModal(); render(); }
    toast('Business created', r.business.name);
  }),
  connect: el => connectModal(el.dataset.id, el.dataset.v),
  saveconn: el => run(async () => {
    const id = el.dataset.id, w = el.dataset.v, b = B(id); el.disabled = true; el.textContent = 'Checking…';
    let r;
    if (w === 'wa') { const key = v('cnKey') || '', pw = v('cnPw') || ''; if (b.rarevo && (!key || !pw)) throw new Error('Paste the API key and password again to save changes'); r = await api('PUT', `/businesses/${id}/rarevo`, { url: v('cnUrl'), key, password: pw }); }
    else { const tok = v('cnTok'); if (b.meta && !tok) throw new Error('Paste the access token again to save changes'); r = await api('PUT', `/businesses/${id}/meta`, { adAccountId: v('cnAct'), pageId: v('cnPage'), token: tok, version: v('cnVer') }); }
    putBiz(r); delete UI.wa[id]; render(); connectModal(id, w);
    const c = w === 'wa' ? r.rarevo : r.meta; if (c.status === 'error') toast('Saved, but the check failed', c.error, 1); else toast('Connected', w === 'wa' ? 'Press Sync now on the WhatsApp tab to load contacts' : 'Press Sync spend on the Meta tab');
  }),
  disconnect: el => confirmBox('Disconnect?', 'The saved credentials are removed from the CRM. Records already in sheets stay.', 'dodisconnect', { id: el.dataset.id, v: el.dataset.v }),
  dodisconnect: el => run(async () => { const r = await api('DELETE', `/businesses/${el.dataset.id}/${el.dataset.v === 'wa' ? 'rarevo' : 'meta'}`); putBiz(r); delete UI.wa[el.dataset.id]; closeModal(); render(); }, 'Disconnected'),
  cat: el => { const bid = el.dataset.id; UI.cat[bid] = el.dataset.v; UI.sel.clear(); if (R.tab === 'master') return render(); const f = sheetsOf(bid).find(s => !el.dataset.v || s.category === el.dataset.v); go(f ? `/b/${bid}/sheets/${f.id}` : `/b/${bid}/master`); },
  fs: () => { UI.fs = !UI.fs; render(); },
  side: () => { UI.noside = !UI.noside; render(); },
  newsheet: el => { const cats = [...new Set(sheetsOf(el.dataset.id).map(s => s.category))]; modal('New sheet', `<div class="form"><label class="f">Sheet name<input class="inp" id="nsN" value="Sheet ${sheetsOf(el.dataset.id).length + 1}"></label><label class="f">Category<input class="inp" id="nsC" list="nscats" value="${esc(UI.cat[el.dataset.id] || 'General')}"><datalist id="nscats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label><label class="f full">Extra columns (comma separated, optional)<input class="inp" id="nsCols" placeholder="City, Budget, Product"></label></div>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savesheet" data-id="${el.dataset.id}">Create sheet</button>`); },
  savesheet: el => run(async () => { const s = await api('POST', '/sheets', { businessId: el.dataset.id, name: v('nsN'), category: v('nsC'), columns: v('nsCols').split(',').map(x => x.trim()).filter(Boolean).map(n => ({ name: n })) }); putSheet(s); closeModal(); go(`/b/${s.businessId}/sheets/${s.id}`); }, 'Sheet created'),
  editsheet: el => { const s = SH(el.dataset.id); modal('Sheet details', `<div class="form"><label class="f">Name<input class="inp" id="esN" value="${esc(s.name)}"></label><label class="f">Category<input class="inp" id="esC" value="${esc(s.category)}"></label></div>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveeditsheet" data-id="${s.id}">Save</button>`); },
  saveeditsheet: el => run(async () => { putSheet(await api('PUT', '/sheets/' + el.dataset.id, { name: v('esN'), category: v('esC') })); closeModal(); render(); }, 'Sheet saved'),
  delsheet: el => { const s = SH(el.dataset.id); confirmBox('Delete sheet?', `“${s.name}” and its ${S.rows.filter(r => r.sheetId === s.id).length} records will be deleted for everyone.`, 'dodelsheet', { id: s.id }); },
  dodelsheet: el => run(async () => { const s = SH(el.dataset.id); await api('DELETE', '/sheets/' + s.id); S.sheets = S.sheets.filter(x => x.id !== s.id); S.rows = S.rows.filter(r => r.sheetId !== s.id); closeModal(); go(`/b/${s.businessId}/sheets/master`); }, 'Sheet deleted'),
  addcol: el => modal('Add column', `<div class="form"><label class="f">Column name<input class="inp" id="acN" placeholder="e.g. Budget"></label><label class="f">Type<select class="sel" id="acT"><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Dropdown (your options)</option><option value="multi">Multi-select (pick many)</option><option value="yesno">Yes / No</option><option value="check">Checkbox</option></select></label><label class="f full">Dropdown options (comma separated)<input class="inp" id="acO"></label></div>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveaddcol" data-id="${el.dataset.id}">Add column</button>`),
  saveaddcol: el => run(async () => { const s = SH(el.dataset.id); if (!v('acN').trim()) throw new Error('Column name is required'); putSheet(await api('PUT', '/sheets/' + s.id, { columns: [...s.columns, { name: v('acN'), type: v('acT'), options: v('acO').split(',').map(x => x.trim()).filter(Boolean) }] })); closeModal(); render(); }, 'Column added'),
  cols: el => colsModal(el.dataset.id),
  savecols: el => run(async () => {
    const s = SH(el.dataset.id), labels = {}, hidden = [];
    Object.keys(BLABEL).forEach(k => { const x = v('bl-' + k).trim(); if (x && x !== BLABEL[k]) labels[k] = x; if (k !== 'name' && !v('bs-' + k)) hidden.push(k); });
    const cols = s.columns.map((c, i) => ({ id: c.id, name: v('ec-' + i) || c.name, type: v('et-' + i) || c.type, options: String(v('eo-' + i)).split(',').map(x => x.trim()).filter(Boolean), del: v('ed-' + i) })).filter(c => !c.del);
    if (v('nc-n').trim()) cols.push({ name: v('nc-n').trim(), type: v('nc-t'), options: String(v('nc-o')).split(',').map(x => x.trim()).filter(Boolean) });
    putSheet(await api('PUT', '/sheets/' + s.id, { columns: cols, labels, hidden })); closeModal(); render();
  }, 'Columns saved'),
  saverename: el => run(async () => {
    const s = SH(el.dataset.id), k = el.dataset.v, name = v('rnN').trim();
    if (k.startsWith('d:')) { const cols = s.columns.map(c => c.id === k.slice(2) ? { ...c, name: name || c.name } : c); putSheet(await api('PUT', '/sheets/' + s.id, { columns: cols })); }
    else { const labels = { ...(s.labels || {}) }; if (name && name !== BLABEL[k]) labels[k] = name; else delete labels[k]; putSheet(await api('PUT', '/sheets/' + s.id, { labels })); }
    closeModal(); softRender();
  }, 'Header renamed'),
  import: el => openImport(el.dataset.id, el.dataset.v),
  impgo: impGo, impconfirm: impConfirm, impback: () => impModal(),
  addrow: el => run(async () => { const r = await api('POST', '/rows', { sheetId: el.dataset.id, source: 'Manual' }); putRow(r); const k = Object.keys(UI.scopes).find(x => UI.scopes[x].sid === el.dataset.id); if (k) { gs(k).sort = 'added'; gs(k).dir = -1; gs(k).q = ''; } render(); setTimeout(() => { const i = $(`[data-id="${r.id}"][data-f="name"]`); if (i) i.focus(); }, 40); }),
  sort: el => { const go2 = () => { const g = gs(el.dataset.g); g.dir = g.sort === el.dataset.v ? -g.dir : 1; g.sort = el.dataset.v; softRender(); }; clearTimeout(UI.sortT); if (el.dataset.ren) UI.sortT = setTimeout(go2, 260); else go2(); },
  gcol: el => { const g = gs(el.dataset.g); g.col = g.col === el.dataset.v ? '' : el.dataset.v; softRender(); },
  more: el => { gs(el.dataset.g).limit += 500; softRender(); },
  color: el => { const r = S.rows.find(x => x.id === el.dataset.id), i = COLORS.indexOf(r.color); updateRow(r.id, { color: i === COLORS.length - 1 ? '' : COLORS[i + 1] }, true); },
  selrow: el => { el.checked ? UI.sel.add(el.dataset.id) : UI.sel.delete(el.dataset.id); softRender(); },
  selall: el => { const sc = UI.scopes[el.dataset.g], g = gs(el.dataset.g), ids = gfilter(sc).slice(0, g.limit).map(r => r.id); if (el.checked) ids.forEach(i => UI.sel.add(i)); else ids.forEach(i => UI.sel.delete(i)); softRender(); },
  bulk: el => {
    const ids = [...UI.sel], w = el.dataset.v;
    if (w === 'clear') { UI.sel.clear(); return softRender(); }
    if (w === 'export') return download(`records-${ymd(Date.now())}.csv`, rowsCsv(S.rows.filter(r => UI.sel.has(r.id))));
    if (w === 'delete') return confirmBox('Delete records?', `${ids.length} records will be deleted for everyone.`, 'dobulkdel');
    let patch = null, action = 'update';
    if (w === 'assign') { const o = v('bkOw'); if (!o) return toast('Choose who to assign to', '', 1); patch = { owner: o === '-' ? '' : o }; action = 'assign'; }
    if (w === 'status') { if (!v('bkSt')) return toast('Choose a status', '', 1); patch = { status: v('bkSt') }; }
    if (w === 'fu') { const t = pDT(v('bkFu')); if (!t) return toast('Pick a date and time', '', 1); patch = { followUp: t }; }
    if (w === 'move') { if (!v('bkSh')) return toast('Choose a sheet', '', 1); patch = { sheetId: v('bkSh') }; }
    run(async () => { const r = await api('POST', '/rows/batch', { ids, action, patch }); r.rows.forEach(putRow); UI.sel.clear(); softRender(); }, `Updated ${ids.length} records`);
  },
  bulkfu: el => { const ids = UI.sel.size ? [...UI.sel] : rngRowIds(); if (!ids.length) return toast('Tick rows first'); closePop(); const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(10, 0, 0, 0); const fu = el.dataset.v === '1' ? t.getTime() : el.dataset.v === '0' ? null : +el.dataset.v;
    run(async () => { const r = await api('POST', '/rows/batch', { ids, action: 'update', patch: { followUp: fu } }); r.rows.forEach(putRow); softRender(); }, fu ? `${ids.length} added to follow-ups · ${fT(fu)}` : 'Follow-up removed'); },
  ctxfu: () => { const ids = UI.sel.size ? [...UI.sel] : rngRowIds(); const n = ids.length, now = new Date(), at = (d, h) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x.getTime(); };
    popMenu(UI.popAnchor || $('.gs'), `<div class="mh small muted">Follow-up for ${n} record${n > 1 ? 's' : ''}</div>` + pi('bulkfu', 'In 1 hour', { v: Date.now() + HR }) + pi('bulkfu', 'Today 6 pm', { v: at(0, 18) }) + pi('bulkfu', 'Tomorrow 10 am', { v: 1 }) + pi('bulkfu', 'In 3 days', { v: at(3, 10) }) + pi('bulkfu', 'Next week', { v: at(7, 10) }) + pi('ctxfupick', 'Pick date & time…') + '<hr>' + pi('bulkfu', 'Remove follow-up', { v: 0 })); },
  ctxfupick: () => { closePop(); modal('Set follow-up', `<label class="f">Date & time<input class="inp" type="datetime-local" id="cfu"></label>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="docfu">Save</button>`); },
  docfu: () => { const t = pDT(v('cfu')); if (!t) return toast('Pick a date and time', '', 1); closeModal(); A.bulkfu({ dataset: { v: t } }); },
  ctxtick: () => { closePop(); rngRowIds().forEach(id => UI.sel.add(id)); softRender(); },
  ctxmove: el => { const ids = UI.sel.size ? [...UI.sel] : rngRowIds(), r0 = S.rows.find(r => r.id === ids[0]); if (!r0) return; popMenu(UI.popAnchor || el, `<div class="mh small muted">Move ${ids.length} to sheet…</div>` + sheetsOf(r0.businessId).map(x => pi('domove', esc(x.name), { id: x.id })).join('')); },
  domove: el => { const ids = UI.sel.size ? [...UI.sel] : rngRowIds(); closePop(); run(async () => { const r = await api('POST', '/rows/batch', { ids, action: 'update', patch: { sheetId: el.dataset.id } }); r.rows.forEach(putRow); softRender(); }, `Moved to ${SH(el.dataset.id).name}`); },
  dobulkdel: () => run(async () => { const ids = [...UI.sel]; await api('POST', '/rows/batch', { ids, action: 'delete' }); S.rows = S.rows.filter(r => !UI.sel.has(r.id)); UI.sel.clear(); closeModal(); softRender(); }, 'Deleted'),
  export: el => { const sc = UI.scopes[el.dataset.g]; download(`${sc.bid ? ((B(sc.bid) || {}).name || 'crm') : 'all-businesses'}-${sc.sid === 'master' ? 'master' : ((SH(sc.sid) || {}).name || 'sheet')}-${ymd(Date.now())}.csv`.replace(/[^\w.-]+/g, '-'), rowsCsv(gfilter(sc))); },
  open: el => { UI.menu = null; detail(el.dataset.id); },
  meet: el => meet(el.dataset.id),
  gsave: el => { const r = S.rows.find(x => x.id === el.dataset.id), st = pDT(v('mS')); el.href = gUrl(); if (r && st) { const p = { followUp: inDT(st), note: 'Meeting scheduled for ' + fDT(st) + ' with ' + v('mG') }; if (STATUSES.indexOf(r.status) < 3) p.status = 'Meeting set'; updateRow(r.id, p, true); } setTimeout(closeModal, 60); },
  done: el => doneModal(el.dataset.id),
  savedone: el => { const p = { note: 'Follow-up done' + (v('dN') ? ': ' + v('dN') : ''), status: v('dS') }; if (v('dN')) p.notes = v('dN'); if (v('dP') !== '') p.price = v('dP'); if (!['Won', 'Lost'].includes(v('dS'))) p.followUp = v('dF'); closeModal(); updateRow(el.dataset.id, p, true); toast('Follow-up saved'); },
  snooze: el => { const r = S.rows.find(x => x.id === el.dataset.id); updateRow(r.id, { followUp: inDT(q15(Math.max(Date.now(), r.followUp) + Number(el.dataset.v) * MIN)) }, true); },
  chat: el => chat(el.dataset.id),
  wasync: el => loadContacts(el.dataset.id, true),
  wasel: el => { el.checked ? UI.waSel.add(el.dataset.v) : UI.waSel.delete(el.dataset.v); render(); },
  wachat: el => waChat(el.dataset.id, el.dataset.v, el.dataset.n),
  waadd: el => waImport(el.dataset.id, [...UI.waSel]),
  waaddall: el => { const inCrm = new Set(rowsOf(el.dataset.id).map(r => digits(r.phone))); waImport(el.dataset.id, ((UI.wa[el.dataset.id] || {}).contacts || []).filter(c => !inCrm.has(digits(c.number))).map(c => c.number)); },
  metasync: el => { const [from, to] = mRange(); run(async () => { el.disabled = true; const r = await api('POST', `/businesses/${el.dataset.id}/meta/sync-spend`, { since: from, until: to }); S.spend = S.spend.filter(s => s.businessId !== el.dataset.id).concat(r.spend); putBiz(r.business); render(); return r; }).then(r => r && toast(`Synced ${r.count} spend rows from Meta`)).finally(() => render()); },
  metaleads: el => metaLeads(el.dataset.id),
  mlgo: el => run(async () => { const forms = $$('.mform').filter(x => x.checked).map(x => x.value); el.disabled = true; el.textContent = 'Importing…'; const r = await api('POST', `/businesses/${el.dataset.id}/meta/import-leads`, { formIds: forms, sheetId: v('mlSheet'), since: v('mlSince') }); r.rows.forEach(putRow); if (r.sheet) putSheet(r.sheet); closeModal(); render(); toast(`Imported ${r.rows.length} Meta leads`, r.skipped ? r.skipped + ' already in the sheet' : ''); }),
  mrange: el => { UI.meta.range = el.dataset.v; render(); },
  addspend: el => modal('Add spend', `<div class="form"><label class="f">Date<input class="inp" type="date" id="spD" value="${ymd(Date.now())}"></label><label class="f">Campaign<input class="inp" id="spC" placeholder="Campaign name"></label><label class="f">Spend<input class="inp" type="number" id="spS"></label><label class="f">Clicks<input class="inp" type="number" id="spK"></label><label class="f">Impressions<input class="inp" type="number" id="spI"></label><label class="f">Leads<input class="inp" type="number" id="spL"></label></div>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savespend" data-id="${el.dataset.id}">Save</button>`),
  savespend: el => run(async () => { if (!v('spS')) throw new Error('Enter the amount spent'); const r = await api('POST', '/spend/bulk', { businessId: el.dataset.id, rows: [{ date: v('spD'), campaign: v('spC') || 'Manual entry', spend: v('spS'), clicks: v('spK'), impressions: v('spI'), leads: v('spL') }] }); S.spend = S.spend.filter(s => s.businessId !== el.dataset.id).concat(r.spend); closeModal(); render(); }, 'Spend saved'),
  spendcsv: el => modal('Import spend CSV', `<p class="hint">Columns: date, campaign, spend, impressions, clicks, leads (the export from Meta Ads Manager works — use “Day” breakdown).</p><input class="inp" type="file" id="spF" accept=".csv,.txt" style="margin-top:10px;padding-top:5px;width:100%">`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="dospendcsv" data-id="${el.dataset.id}">Import</button>`),
  dospendcsv: el => run(async () => {
    const f = $('#spF').files[0]; if (!f) throw new Error('Choose a CSV file'); const arr = parseCsv(await f.text()); const h = arr.shift().map(x => x.toLowerCase());
    const ix = re => h.findIndex(x => re.test(x)), di = ix(/date|day|reporting starts/), ci = ix(/campaign/), si = ix(/spen|amount/), ii = ix(/impression/), ki = ix(/click/), li = ix(/lead|result/);
    if (di < 0 || si < 0) throw new Error('Need at least a date column and a spend column');
    const rows = arr.map(r => { const t = new Date(String(r[di]).trim() + (String(r[di]).length === 10 ? 'T00:00' : '')); return { date: isNaN(t) ? '' : ymd(t.getTime()), campaign: ci >= 0 ? r[ci] : 'Imported', spend: parseFloat(String(r[si]).replace(/[^\d.]/g, '')) || 0, impressions: ii >= 0 ? +String(r[ii]).replace(/\D/g, '') : 0, clicks: ki >= 0 ? +String(r[ki]).replace(/\D/g, '') : 0, leads: li >= 0 ? +String(r[li]).replace(/\D/g, '') : 0 }; }).filter(r => r.date);
    const r = await api('POST', '/spend/bulk', { businessId: el.dataset.id, rows }); S.spend = S.spend.filter(s => s.businessId !== el.dataset.id).concat(r.spend); closeModal(); render(); toast(`Imported ${r.count} spend rows`);
  }),
  delspend: el => run(async () => { await api('DELETE', '/spend/' + el.dataset.id); S.spend = S.spend.filter(s => s.id !== el.dataset.id); render(); }),
  spendexport: el => { const b = B(el.dataset.id), [f, t] = mRange(); download(`meta-spend-${ymd(Date.now())}.csv`, toCsv(['Date', 'Campaign', 'Spend', 'Impressions', 'Clicks', 'Leads', 'From'], spendOf(b.id, f, t).sort((a, c) => a.date.localeCompare(c.date)).map(s => [s.date, s.campaign, s.spend, s.impressions, s.clicks, s.leads, s.source]))); },
  repcsv: el => { const b = B(el.dataset.id); download(`${b.name}-report-${ymd(Date.now())}.csv`.replace(/[^\w.-]+/g, '-'), repCsv(b)); },
  repcopy: el => copyText(repCsv(B(el.dataset.id)).replace(/,/g, '\t'), 'Report copied'),
  savebiz: el => run(async () => { const labels = {}; COLORS.forEach(c => { labels[c] = v('bsL-' + c) || LABELS[c]; }); putBiz(await api('PUT', '/businesses/' + el.dataset.id, { name: v('bsName'), industry: v('bsInd'), status: v('bsSt'), color: v('bsCol'), phone: v('bsPh'), currency: (v('bsCur') || 'INR').toUpperCase(), meetEmails: v('bsMeet'), colorLabels: labels })); render(); }, 'Saved'),
  saveassign: el => run(async () => { const b = B(el.dataset.id); putBiz(await api('PUT', '/businesses/' + b.id, { assign: { mode: v('asMode'), pool: $$('.aspool').filter(x => x.checked).map(x => x.value), idx: (b.assign || {}).idx || 0 } })); render(); }, 'Assignment saved'),
  delbiz: el => confirmBox('Delete business?', `${B(el.dataset.id).name} and all its sheets, records and spend will be removed from the CRM.`, 'dodelbiz', { id: el.dataset.id }),
  dodelbiz: el => run(async () => { await api('DELETE', '/businesses/' + el.dataset.id); closeModal(); await refresh(); go('/'); }, 'Business deleted'),
  user: el => userModal(el.dataset.id, el.dataset.b || (R.page === 'biz' ? R.bid : '')),
  clientlogin: el => userModal('', el.dataset.id, 'owner'),
  regen: () => { const i = $('#usPw'); if (i) i.value = genPw(); },
  copyv: el => copyText(el.dataset.v, 'Copied'),
  copycred: () => copyText(UI.cred || '', 'Message copied — paste it in WhatsApp or email'),
  resetpw: el => { const u = U(el.dataset.id); confirmBox('Create a new password?', `${u.name}'s old password stops working. You'll see the new one to share.`, 'doresetpw', { id: u.id }); },
  doresetpw: el => run(async () => { const pw = genPw(); const u = await api('PUT', '/users/' + el.dataset.id, { password: pw }); credModal(u, pw); }),
  saveuser: el => run(async () => {
    const id = el.dataset.id, body = { name: v('usName').trim(), email: v('usEmail').trim(), phone: v('usPhone').trim(), role: v('usRole') };
    if (v('usUser').trim()) body.username = v('usUser').trim().toLowerCase();
    if (!body.name) throw new Error('Name is required');
    if ($('#usBiz')) body.businessId = body.role === 'super' ? '' : v('usBiz');
    else if (!id) body.businessId = S.me.businessId;
    if ((body.role === 'owner') && $('#usBiz') && !body.businessId) throw new Error('Choose the business for this business admin');
    if (!id) { body.password = v('usPw') || genPw(); if (body.password.length < 6) throw new Error('Password must be at least 6 characters'); }
    const u = await api(id ? 'PUT' : 'POST', '/users' + (id ? '/' + id : ''), body);
    const i = S.users.findIndex(x => x.id === u.id); if (i < 0) S.users.push(u); else S.users[i] = u;
    if (id) { closeModal(); render(); toast('Saved'); } else { render(); credModal(u, body.password); }
  }),
  emadd: el => { const e = (S.emails || []).find(x => x.id === el.dataset.v) || { date: ymd(Date.now()), campaign: '', subject: '' };
    const f = (id, l, val, t) => `<label class="f">${l}<input class="inp" id="${id}" type="${t || 'number'}" value="${esc(val ?? '')}"></label>`;
    modal(el.dataset.v ? 'Edit email campaign' : 'Add email campaign', `<div class="form">${f('emD', 'Date sent', e.date, 'date')}${f('emC', 'Campaign name', e.campaign, 'text')}<label class="f full">Subject line<input class="inp" id="emS" value="${esc(e.subject || '')}"></label>${f('emSe', 'Sent', e.sent)}${f('emDe', 'Delivered', e.delivered)}${f('emO', 'Opened', e.opened)}${f('emK', 'Clicked', e.clicked)}${f('emR', 'Replies', e.replies)}${f('emL', 'Leads', e.leads)}${f('emU', 'Unsubscribed', e.unsubscribed)}${f('emCo', 'Cost', e.cost)}</div>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="saveem" data-id="${el.dataset.id}" data-v="${esc(el.dataset.v || '')}">Save</button>`); },
  saveem: el => run(async () => {
    if (!v('emC').trim()) throw new Error('Campaign name is required');
    const old = (S.emails || []).find(x => x.id === el.dataset.v);
    if (old && (old.date !== v('emD') || old.campaign !== v('emC').trim())) await api('DELETE', '/emails/' + old.id);
    const r = await api('POST', '/emails/bulk', { businessId: el.dataset.id, rows: [{ date: v('emD'), campaign: v('emC').trim(), subject: v('emS'), sent: v('emSe'), delivered: v('emDe'), opened: v('emO'), clicked: v('emK'), replies: v('emR'), leads: v('emL'), unsubscribed: v('emU'), cost: v('emCo') }] });
    S.emails = (S.emails || []).filter(s => s.businessId !== el.dataset.id).concat(r.emails); closeModal(); render();
  }, 'Campaign saved'),
  emdel: el => run(async () => { await api('DELETE', '/emails/' + el.dataset.id); S.emails = S.emails.filter(s => s.id !== el.dataset.id); render(); }),
  erange: el => { UI.em.range = el.dataset.v; render(); },
  emimport: el => modal('Import email campaign results', `<p class="hint">CSV with columns like: date, campaign, subject, sent, delivered, opened, clicked, replies, leads, unsubscribed, cost. Exports from Mailchimp, Brevo, Zoho or a Google Sheet work — column names are matched automatically.</p><input class="inp" type="file" id="emF" accept=".csv,.txt" style="margin-top:10px;padding-top:5px;width:100%">`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="doemimport" data-id="${el.dataset.id}">Import</button>`),
  doemimport: el => run(async () => {
    const f = $('#emF').files[0]; if (!f) throw new Error('Choose a CSV file'); const arr = parseCsv(await f.text()); const h = (arr.shift() || []).map(x => x.toLowerCase().trim());
    const ix = re => h.findIndex(x => re.test(x)), I = { date: ix(/date|sent on|send time|day/), campaign: ix(/campaign|name|title/), subject: ix(/subject/), sent: ix(/^sent|emails sent|recipients|total sent/), delivered: ix(/deliver/), opened: ix(/open/), clicked: ix(/click/), replies: ix(/repl/), leads: ix(/lead|conversion/), unsubscribed: ix(/unsub/), cost: ix(/cost|spend|amount/) };
    if (I.date < 0 || I.campaign < 0) throw new Error('Need at least a date column and a campaign column');
    const n = x => +String(x || '').replace(/[^\d.]/g, '') || 0;
    const rows = arr.map(r => { const t = new Date(String(r[I.date]).trim().length === 10 && /^\d{4}/.test(String(r[I.date]).trim()) ? r[I.date] + 'T00:00' : r[I.date]); const o = { date: isNaN(t) ? '' : ymd(t.getTime()), campaign: r[I.campaign], subject: I.subject >= 0 ? r[I.subject] : '' }; ['sent', 'delivered', 'opened', 'clicked', 'replies', 'leads', 'unsubscribed', 'cost'].forEach(k => { o[k] = I[k] >= 0 ? n(r[I[k]]) : 0; }); return o; }).filter(r => r.date && r.campaign);
    const r = await api('POST', '/emails/bulk', { businessId: el.dataset.id, rows, source: 'import' }); S.emails = (S.emails || []).filter(s => s.businessId !== el.dataset.id).concat(r.emails); closeModal(); render(); toast(`Imported ${r.count} campaigns`);
  }),
  emexport: el => { const [f, t] = eRange(); download(`email-marketing-${ymd(Date.now())}.csv`, toCsv(['Date', 'Campaign', 'Subject', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Replies', 'Leads', 'Unsubscribed', 'Cost'], emailsOf(el.dataset.id, f, t).sort((a, c) => a.date.localeCompare(c.date)).map(e => [e.date, e.campaign, e.subject, e.sent, e.delivered, e.opened, e.clicked, e.replies, e.leads, e.unsubscribed, e.cost]))); },
  deluser: el => confirmBox('Remove team member?', 'Their records become unassigned so an admin can reassign them.', 'dodeluser', { id: el.dataset.id }),
  dodeluser: el => run(async () => { await api('DELETE', '/users/' + el.dataset.id); closeModal(); await refresh(); }, 'Removed')
  ,ctxcopy: () => { closePop(); copyRange(); },
  ctxpaste: async () => { closePop(); try { const t = await navigator.clipboard.readText(); if (t) pasteText(t); } catch (e) { toast('Press Ctrl+V to paste'); } },
  ctxclear: () => { closePop(); clearRange(); },
  ctxundo: () => { closePop(); undoRedo(false); },
  selallcells: () => { if (UI.vrows && UI.vrows.length) selRange(0, 0, UI.vrows.length - 1, UI.dcols.length - 1); },
  colsel: el => { closePop(); const ci = UI.dcols.findIndex(c => c.k === el.dataset.v); selRange(0, ci, Math.max(0, UI.vrows.length - 1), ci); },
  colclear: el => { closePop(); const sh = SH(el.dataset.id); run(async () => { const r = await api('POST', `/sheets/${sh.id}/column`, { action: 'clear', key: el.dataset.v }); putSheet(r.sheet); r.rows.forEach(putRow); softRender(); toast('Column emptied', 'Restore it from the sheet ▾ menu → Deleted columns'); }); },
  coldel: el => { closePop(); const sh = SH(el.dataset.id), c = UI.cols[el.dataset.v]; confirmBox('Delete column “' + (c ? c.l : '') + '”?', 'The column and its values move to “Deleted columns” in this sheet’s ▾ menu, where you can restore them.', 'docoldel', { id: sh.id, v: el.dataset.v }); },
  docoldel: el => run(async () => { const r = await api('POST', `/sheets/${el.dataset.id}/column`, { action: 'delete', key: el.dataset.v }); putSheet(r.sheet); r.rows.forEach(putRow); closeModal(); UI.rng = null; softRender(); }, 'Column deleted — restore from Deleted columns'),
  colmove: el => { closePop(); const ci = UI.dcols.findIndex(c => c.k === el.dataset.v); moveColumn(ci, ci + +el.dataset.d); },
  colswap: el => { const ci = UI.dcols.findIndex(c => c.k === el.dataset.v); popMenu(el, `<div class="mh small muted">Swap “${esc(UI.dcols[ci].l)}” with…</div>` + UI.dcols.map((c, i) => i === ci ? '' : pi('doswap', `<b>${c.letter}</b>&nbsp; ${esc(c.l)}`, { a: ci, b: i })).join('')); },
  doswap: el => { closePop(); const a = +el.dataset.a, b = +el.dataset.b, sc = UI.scopes[UI.curScope], sh = SH(sc.sid); if (!sh || !canManage(sh.businessId)) return toast('Only the business admin can move columns'); const keys = UI.dcols.map(c => c.k); [keys[a], keys[b]] = [keys[b], keys[a]]; run(async () => { putSheet(await api('PUT', '/sheets/' + sh.id, { order: keys.concat((sh.order || []).filter(x => !keys.includes(x))) })); softRender(); }, 'Columns swapped'); },
  sortpos: el => { closePop(); const g = gs(el.dataset.g); g.sort = 'pos'; g.dir = 1; softRender(); },
  bin: el => { closePop(); const sh = SH(el.dataset.id); modal('Deleted columns — ' + sh.name, (sh.bin || []).length ? `<table class="t"><thead><tr><th>Column</th><th>What happened</th><th class="num">Values</th><th>When</th><th></th></tr></thead><tbody>${sh.bin.map(b => `<tr><td><b>${esc(b.label)}</b></td><td>${b.type === 'clear' ? 'Emptied' : b.type === 'hide' ? 'Removed (built-in)' : 'Deleted'}</td><td class="num">${b.count || 0}</td><td class="small muted">${esc(rel(b.at))} · ${esc(b.by || '')}</td><td><button class="btn xs pri" data-act="restorecol" data-id="${sh.id}" data-v="${esc(b.id)}">Restore</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nothing deleted yet</div>', `<button class="btn pri" data-act="close">Done</button>`, { nofocus: true }); },
  restorecol: el => run(async () => { const r = await api('POST', `/sheets/${el.dataset.id}/column`, { action: 'restore', binId: el.dataset.v }); putSheet(r.sheet); r.rows.forEach(putRow); closeModal(); softRender(); }, 'Restored'),
  undoimport: el => { closePop(); const sh = SH(el.dataset.id); confirmBox('Undo the last upload?', `“${sh.name}” goes back to how it was before: ${sh.undo ? sh.undo.label + ', ' + rel(sh.undo.at) : ''}.`, 'doundoimport', { id: sh.id }); },
  doundoimport: el => run(async () => { const r = await api('POST', `/sheets/${el.dataset.id}/undo-import`); putSheet(r.sheet); S.rows = S.rows.filter(x => x.sheetId !== r.sheet.id).concat(r.rows); closeModal(); softRender(); }, 'Upload undone'),
  junk: el => { closePop(); run(async () => { const r = await api('POST', `/sheets/${el.dataset.id}/junk`, { preview: true }); if (!r.count) return toast('No junk rows found', 'Rows need a name plus a phone or email'); modal('Remove junk rows?', `<p style="margin:0 0 8px">Found <b>${r.count}</b> rows that look like titles or totals, not leads:</p><ul class="small">${r.sample.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="hint">You can undo this from the sheet ▾ menu → Undo last upload.</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="dojunk" data-id="${el.dataset.id}">Remove ${r.count} rows</button>`); }); },
  dojunk: el => run(async () => { const r = await api('POST', `/sheets/${el.dataset.id}/junk`, {}); putSheet(r.sheet); await refresh(); closeModal(); toast(`Removed ${r.removed} junk rows`); }),
  srcg: el => { gs(el.dataset.g).sg = el.dataset.v; UI.rng = null; softRender(); },
  mergedup: el => { gs(el.dataset.g).merge = el.checked; softRender(); },
  waauto: el => run(async () => { putBiz(await api('PUT', `/businesses/${el.dataset.id}/wa-auto`, { on: el.checked })); render(); }, el.checked ? 'New WhatsApp chats will be added to the CRM' : 'Auto-add turned off'),
  catmenu: el => { const bid = el.dataset.id, c = el.dataset.v, others = [...new Set(sheetsOf(bid).map(s => s.category))].filter(x => x !== c); popMenu(el, pi('catren', 'Rename category', { id: bid, v: c }) + (others.length ? pi('catmove', 'Move its sheets to…', { id: bid, v: c }) : '') + pi('catdel', 'Remove category (sheets go to General)', { id: bid, v: c }, 'danger')); },
  catren: el => { closePop(); UI.catFrom = el.dataset.v; modal('Rename category', `<label class="f">New name<input class="inp" id="catN" value="${esc(el.dataset.v)}"></label>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="docat" data-id="${el.dataset.id}">Save</button>`); },
  catmove: el => { const bid = el.dataset.id, c = el.dataset.v; popMenu(el, [...new Set(sheetsOf(bid).map(s => s.category))].filter(x => x !== c).map(x => pi('docatto', esc(x), { id: bid, v: c, to: x })).join('')); },
  catdel: el => { closePop(); catMove(el.dataset.id, el.dataset.v, el.dataset.v === 'General' ? 'Other' : 'General'); },
  docatto: el => { closePop(); catMove(el.dataset.id, el.dataset.v, el.dataset.to); },
  docat: el => { const to = v('catN').trim(); if (!to) return toast('Type a name', '', 1); closeModal(); catMove(el.dataset.id, UI.catFrom, to); },
  fuw: el => { gs(el.dataset.g).fw = el.dataset.v; UI.rng = null; softRender(); },
  savenewopt: () => { const n = v('noN').trim(); if (!n) return toast('Type the option', '', 1); const N = UI.newOpt, r = S.rows.find(x => x.id === N.rid), sh = SH(r.sheetId), cid = N.cid;
    run(async () => { putSheet(await api('PUT', '/sheets/' + sh.id, { columns: sh.columns.map(c => c.id === cid ? { ...c, options: [...new Set([...(c.options || []), n])] } : c) })); putRow(await api('PUT', '/rows/' + r.id, { data: { [cid]: n } })); closeModal(); softRender(); }, 'Option added'); },
  settype: el => { closePop(); const sh = SH(el.dataset.id), k = el.dataset.v, t = el.dataset.t;
    const vals = [...new Set(S.rows.filter(r => r.sheetId === sh.id).map(r => k.startsWith('d:') ? (r.data || {})[k.slice(2)] : r[k]).map(x => String(x ?? '').trim()).filter(Boolean))];
    UI.st = { id: sh.id, k, t };
    if (t === 'select' || t === 'multi') return modal('Make “' + (UI.cols[k] || {}).l + '” a dropdown', `<label class="f">Options (comma separated)<input class="inp" id="stO" value="${esc(vals.slice(0, 30).join(', '))}" placeholder="e.g. Called, Visited, Booked"></label><p class="hint">Filled with the values already in this column. Existing values are kept.</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="dosettype">Make dropdown</button>`);
    A.dosettype();
  },
  dosettype: () => run(async () => {
    const { id, k, t } = UI.st, sh = SH(id), opts = (t === 'select' || t === 'multi') && $('#stO') ? v('stO').split(',').map(x => x.trim()).filter(Boolean) : [];
    if (k.startsWith('d:')) { const cid = k.slice(2); putSheet(await api('PUT', '/sheets/' + id, { columns: sh.columns.map(c => c.id === cid ? { ...c, type: t, options: opts } : c) }));
      if (t === 'yesno') { const ch = S.rows.filter(r => r.sheetId === id && (r.data || {})[cid] != null && (r.data || {})[cid] !== '').map(r => { const x = String(r.data[cid]).trim(); const y = /^(y|yes|true|1|ha|haan)$/i.test(x) ? 'Yes' : /^(n|no|false|0)$/i.test(x) ? 'No' : x; return y !== r.data[cid] ? { id: r.id, patch: { data: { [cid]: y } } } : null; }).filter(Boolean); if (ch.length) (await api('POST', '/rows/cells', { changes: ch })).rows.forEach(putRow); } }
    else {
      const label = (UI.cols[k] || {}).l || k; let ns = await api('PUT', '/sheets/' + id, { columns: [...sh.columns, { name: label, type: t, options: opts }] }); const nc = ns.columns[ns.columns.length - 1];
      const rows = S.rows.filter(r => r.sheetId === id && r[k] != null && String(r[k]).trim() !== '');
      const yn = x => /^(y|yes|true|1|ha|haan)$/i.test(String(x).trim()) ? 'Yes' : /^(n|no|false|0)$/i.test(String(x).trim()) ? 'No' : String(x);
      if (rows.length) { const r = await api('POST', '/rows/cells', { changes: rows.map(r => ({ id: r.id, patch: { data: { [nc.id]: t === 'yesno' ? yn(r[k]) : t === 'check' ? !!r[k] : r[k] } } })) }); r.rows.forEach(putRow); }
      const keys = UI.dcols.map(c => c.k), at = keys.indexOf(k); keys.splice(at, 1, 'd:' + nc.id);
      ns = await api('PUT', '/sheets/' + id, { order: keys.concat((ns.order || []).filter(x => !keys.includes(x) && x !== k)), hidden: [...new Set([...(ns.hidden || []), k])] }); putSheet(ns);
    }
    closeModal(); softRender();
  }, 'Column type changed'),
  insmenu: el => {
    const sc = UI.scopes[UI.curScope]; if (!sc) return; const ms = sc.sid === 'master';
    const a = UI.anchor, ar = a && S.rows.find(r => r.id === UI.vrows[a.ri]);
    const sh = ms ? (ar ? SH(ar.sheetId) : sheetsOf(sc.bid)[0]) : SH(sc.sid); if (!sh) return toast('Add a sheet first');
    const m = canManage(sh.businessId), col = a && UI.dcols[a.ci], k = ms ? '' : col && col.k; UI.insSheet = sh.id;
    const fixed = ['name', 'status', 'priority', 'owner', 'source', 'added', 'followUp', 'closed', 'color', 'act'];
    let h = (ms ? `<div class="mh small muted">Adds to sheet: <b>${esc(sh.name)}</b></div>` : '') + `<div class="mh small muted">${a ? 'Selected: ' + esc(col ? col.letter + (a.ri + 1) + ' · ' + col.l : '') : 'Click a cell first to insert next to it'}</div>`;
    if (a && m) { const n = UI.rng ? (UI.rng.r2 - UI.rng.r1 + 1) * (UI.rng.c2 - UI.rng.c1 + 1) : 1, any = rangeCells().some(({ r, c }) => cvOf(r, c));
      h += `<div class="mh small muted">In ${n === 1 ? 'this cell only' : 'these ' + n + ' cells only'}</div>` + pi('cvmake', '▾ Dropdown here…', { t: 'select' }) + pi('cvmake', '✓ Yes / No here', { t: 'yesno' }) + pi('cvmake', '☰ Multi-select here…', { t: 'multi' }) + (any ? pi('cvedit', '✎ Edit / rename options…') + pi('cvclear', 'Remove dropdown from cell', {}, 'danger') : '') + '<hr>'; }
    h += pi('insrow', 'Row above', { d: 0 }) + pi('insrow', 'Row below', { d: 1 });
    if (m) {
      h += '<hr>' + (k ? pi('quickcol', 'Column left', { id: sh.id, at: k, side: 0 }) + pi('quickcol', 'Column right', { id: sh.id, at: k, side: 1 }) : pi('quickcol', 'New column', { id: sh.id }));
      h += '<hr><div class="mh small muted">+ New column with…</div>' + [['select', 'Dropdown (your options)'], ['multi', 'Multi-select (pick many)'], ['yesno', 'Yes / No'], ['check', 'Checkbox'], ['date', 'Date'], ['number', 'Number']].map(([t, l]) => pi('insnewcol', '+ ' + l, { id: sh.id, at: k || '', t })).join('');
      if (ms) h += pi('golsheet', 'Open “' + esc(sh.name) + '” to change a column…', { id: sh.id });
      if (k && !fixed.includes(k)) h += `<hr><div class="mh small muted">Make column “${esc(col.l)}”…</div>` + [['select', 'Dropdown…'], ['multi', 'Multi-select…'], ['yesno', 'Yes / No'], ['check', 'Checkbox'], ['date', 'Date'], ['number', 'Number'], ['text', 'Text']].map(([t, l]) => pi('settype', l, { id: sh.id, v: k, t })).join('');
      if (k && k.startsWith('d:') && (colDef(S.rows.find(r => r.id === UI.vrows[a.ri]) || {}, col) || {}).type === 'select') h += pi('cols', 'Edit dropdown options…', { id: sh.id });
    }
    popMenu(el, h);
  },
  insnewcol: el => { A.quickcol({ dataset: { id: el.dataset.id, at: el.dataset.at || '', side: 1 } }); if (!el.dataset.at) UI.qcAt = null; setTimeout(() => { const t = $('#qcT'); if (t) t.value = el.dataset.t; const n = $('#qcN'); if (n) n.focus(); }, 0); },
  golsheet: el => { closePop(); go(`/b/${SH(el.dataset.id).businessId}/sheets/${el.dataset.id}`); },
  insrow: el => { closePop(); const sc = UI.scopes[UI.curScope], g = gs(UI.curScope), d = +el.dataset.d; if (!sc) return;
    if (sc.sid === 'master') return run(async () => { const r = await api('POST', '/rows', { sheetId: UI.insSheet, source: 'Manual' }); putRow(r); g.sort = 'added'; g.dir = -1; g.sg = ''; softRender(); const ni = UI.vrows.indexOf(r.id); if (ni >= 0) selRange(ni, 0, ni, 0); }, 'Row added to ' + SH(UI.insSheet).name);
    run(async () => {
      if (g.sort !== 'pos') { g.sort = 'pos'; g.dir = 1; softRender(); }
      const ri = UI.anchor ? UI.anchor.ri : (d ? UI.vrows.length - 1 : 0), ids = UI.vrows, P = i => (S.rows.find(x => x.id === ids[i]) || {}).pos;
      const lo = d ? P(ri) : (ri > 0 ? P(ri - 1) : null), hi = d ? (ri + 1 < ids.length ? P(ri + 1) : null) : P(ri);
      const pos = lo == null && hi == null ? 1 : lo == null ? hi - 1 : hi == null ? lo + 1 : (lo + hi) / 2;
      let r = await api('POST', '/rows', { sheetId: sc.sid, source: 'Manual' }); r = (await api('POST', '/rows/cells', { changes: [{ id: r.id, patch: { pos } }] })).rows[0] || r; putRow(r);
      softRender(); const ni = UI.vrows.indexOf(r.id); if (ni >= 0) selRange(ni, 0, ni, 0);
    }, 'Row inserted');
  },
  mpsave: () => { const M = UI.mp; if (!M) return; const r = S.rows.find(x => x.id === M.rid), sh = SH(r.sheetId); const vals = $$('.pop .mpc').filter(x => x.checked).map(x => x.value), nw = ($('#mpNew') || {}).value ? $('#mpNew').value.split(',').map(x => x.trim()).filter(Boolean) : []; closePop();
    if (M.cv) return run(async () => { if (nw.length) { const x = sh.cellv[M.cv]; putSheet(await api('PUT', '/sheets/' + sh.id, { cellv: { [M.cv]: { ...x, options: [...new Set([...x.options, ...nw])] } } })); } await saveCell(r, UI.cols[M.k], [...new Set([...vals, ...nw])].join(', ')); redrawRow(r.id); paint(); });
    run(async () => { if (nw.length) putSheet(await api('PUT', '/sheets/' + sh.id, { columns: sh.columns.map(c => c.id === M.cid ? { ...c, options: [...new Set([...(c.options || []), ...nw])] } : c) })); const all = [...new Set([...vals, ...nw])].join(', '); putRow(await api('PUT', '/rows/' + r.id, { data: { [M.cid]: all } })); redrawRow(r.id); paint(); }); },
  optadd: () => { const i = $('#optIn'); if (!i) return; i.value.split(',').map(x => x.trim()).filter(Boolean).forEach(x => { if (!UI.opts.includes(x)) UI.opts.push(x); }); i.value = ''; optDraw(); i.focus(); },
  optdel: el => { UI.opts.splice(+el.dataset.v, 1); optDraw(); },
  savecvopt: () => { const n = v('noN').trim(); if (!n) return toast('Type the option', '', 1); const N = UI.cvNew, r = S.rows.find(x => x.id === N.rid), sh = SH(r.sheetId), x = sh.cellv[N.k];
    run(async () => { putSheet(await api('PUT', '/sheets/' + sh.id, { cellv: { [N.k]: { ...x, options: [...new Set([...x.options, n])] } } })); closeModal(); await saveCell(r, UI.cols[N.ck], n); redrawRow(r.id); paint(); }); },
  cvmake: el => { closePop(); const t = el.dataset.t, cells = rangeCells().filter(({ c }) => !['select', 'check', 'ro'].includes(cellType(c)) && c.k !== 'name'); if (!cells.length) return toast('Pick a normal cell (text, email, phone, notes…)', '', 1);
    UI.cvT = { t, cells: cells.map(({ r, c }) => ({ rid: r.id, k: c.k })) };
    if (t === 'yesno') return A.docv();
    UI.opts = []; const cur = cells.map(({ r, c }) => String(rawVal(r, c) ?? '').trim()).filter(Boolean); if (cells.length > 1) cur.forEach(x => { if (!UI.opts.includes(x)) UI.opts.push(x); });
    modal((t === 'multi' ? 'Multi-select' : 'Dropdown') + ' in ' + (cells.length === 1 ? 'this cell only' : cells.length + ' selected cells'), `<div class="f full"><span>Options</span><div id="optList" class="optlist"></div><div class="row" style="gap:6px"><input class="inp" id="optIn" placeholder="Type an option and press Enter" style="flex:1"><button class="btn" data-act="optadd">+ Add</button></div><input type="hidden" id="qcO"></div><p class="hint">Only ${cells.length === 1 ? 'this cell gets' : 'these cells get'} the dropdown — no new row or column.</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="docv">Save</button>`);
    setTimeout(() => { optDraw(); const i = $('#optIn'); if (i) { i.focus(); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); A.optadd(); } }); } }, 0); },
  docv: () => { if ($('#optIn') && $('#optIn').value.trim()) A.optadd(); const T = UI.cvT; if (T.t !== 'yesno' && !UI.opts.length) return toast('Add at least one option', '', 1);
    const by = {}; T.cells.forEach(({ rid, k }) => { const r = S.rows.find(x => x.id === rid), key = cvKey(r, UI.cols[k]); if (key) (by[r.sheetId] = by[r.sheetId] || {})[key] = { type: T.t, options: T.t === 'yesno' ? [] : UI.opts.slice() }; });
    run(async () => { for (const sid in by) putSheet(await api('PUT', '/sheets/' + sid, { cellv: by[sid] })); closeModal(); softRender(); }, 'Dropdown added to ' + T.cells.length + ' cell' + (T.cells.length > 1 ? 's' : '')); },
  cvclear: () => { closePop(); const by = {}; rangeCells().forEach(({ r, c }) => { const k = cvKey(r, c); if (k && cvOf(r, c)) (by[r.sheetId] = by[r.sheetId] || {})[k] = null; }); if (!Object.keys(by).length) return toast('No cell dropdowns here');
    run(async () => { for (const sid in by) putSheet(await api('PUT', '/sheets/' + sid, { cellv: by[sid] })); softRender(); }, 'Cell dropdown removed'); },
  cveadd: () => { cveKeep(); const n = v('cveNew').trim(); if (n) UI.cvE.list.push({ o: null, n }); $('#cveNew').value = ''; cveDraw(); $('#cveNew').focus(); },
  cvedel: el => { cveKeep(); UI.cvE.list.splice(+el.dataset.v, 1); cveDraw(); },
  cvemv: el => { cveKeep(); const L = UI.cvE.list, i = +el.dataset.v, j = i + +el.dataset.d; [L[i], L[j]] = [L[j], L[i]]; cveDraw(); },
  cvesave: () => { cveKeep(); if ($('#cveNew').value.trim()) A.cveadd(); const E = UI.cvE, r = S.rows.find(x => x.id === E.rid), sh = SH(r.sheetId), x = sh.cellv[E.k], c = UI.cols[E.ck];
    const list = E.list.filter(y => y.n), opts = [...new Set(list.map(y => y.n))];
    run(async () => { putSheet(await api('PUT', '/sheets/' + sh.id, { cellv: { [E.k]: { ...x, options: opts } } }));
      const cur = String(rawVal(r, c) ?? ''), ren = {}; E.list.forEach(y => { if (y.o && y.o !== y.n) ren[y.o] = y.n; });
      const nv = x.type === 'multi' ? cur.split(',').map(z => z.trim()).filter(Boolean).map(z => ren[z] ?? z).filter(z => opts.includes(z)).join(', ') : (ren[cur] ?? cur);
      if (nv !== cur) await saveCell(r, c, nv); closeModal(); redrawRow(r.id); paint(); }, 'Options saved'); },
  cvedit: () => { closePop(); const a = curTd(); if (!a) return; const r = S.rows.find(x => x.id === a.parentElement.dataset.rid); cvEdit(r, UI.cols[a.dataset.k]); },
  editcolors: el => colorModal(el.dataset.id),
  colreset: el => { $('#ch-' + el.dataset.v).value = HEXD[el.dataset.v]; },
  savecolors: el => { const labels = {}, hex = {}; COLORS.forEach(c => { labels[c] = v('cl-' + c).trim() || LABELS[c]; const h = v('ch-' + c); if (h && h.toLowerCase() !== HEXD[c]) hex[c] = h; });
    run(async () => { putBiz(await api('PUT', '/businesses/' + el.dataset.id, { colorLabels: labels, colorHex: hex })); closeModal(); render(); }, 'Colour labels saved'); },
  waselall: el => { const sc = UI.scopes[el.dataset.g]; gfilter(sc).forEach(r => UI.sel.add(r.id)); softRender(); },
  mhide: el => { closePop(); const g = gs(el.dataset.g); g.hc = [...new Set([...(g.hc || []), el.dataset.v])]; UI.rng = null; softRender(); toast('Column hidden', 'Right-click any column letter → Show hidden columns'); },
  mshow: el => { closePop(); gs(el.dataset.g).hc = []; softRender(); },
  showall: el => { gs(el.dataset.g).limit = 1e9; softRender(); },
  webon: el => run(async () => { putBiz(await api('PUT', `/businesses/${el.dataset.id}/web`, { enabled: el.checked })); render(); }, 'Saved'),
  newkey: el => confirmBox('Create a new website key?', 'The old key stops working. Update the code on the website / the WordPress plugin with the new key.', 'donewkey', { id: el.dataset.id }),
  donewkey: el => run(async () => { putBiz(await api('PUT', `/businesses/${el.dataset.id}/web`, { newKey: true })); closeModal(); render(); }, 'New key created'),
  webtest: el => run(async () => { const b = B(el.dataset.id), payload = { fields: { Name: 'Website test', Email: 'test+' + Date.now() + '@example.com', Phone: '+91 90000 ' + String(Date.now()).slice(-5), Message: 'Test lead from the website plugin' }, form: 'Test from CRM', page: crmBase() };
    const r = MODE === 'demo' ? window.RDemo.collect(b.web.key, payload) : await fetch('/api/collect/' + encodeURIComponent(b.web.key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(x => x.json().then(j => { if (!x.ok) throw new Error(j.error); return j; }));
    await refresh(); toast('Test lead received', `${r.created} added · ${r.updated} updated — open the sheet to see it`); }),
  newform: el => run(async () => { const f = await api('POST', '/forms', { businessId: el.dataset.id }); S.forms = (S.forms || []).concat([f]); render(); formModal(f.id); }),
  editform: el => formModal(el.dataset.id),
  ffadd: () => { UI.ff.push({ label: 'New question', type: 'text', required: false, options: [] }); $('#ffList').innerHTML = ffList(); const ins = $$('#ffList input[data-p=label]'); ins[ins.length - 1].focus(); ins[ins.length - 1].select(); },
  ffdel: el => { UI.ff.splice(+el.dataset.v, 1); $('#ffList').innerHTML = ffList(); },
  ffmove: el => { const i = +el.dataset.v, j = i + +el.dataset.d; [UI.ff[i], UI.ff[j]] = [UI.ff[j], UI.ff[i]]; $('#ffList').innerHTML = ffList(); },
  saveform: el => run(async () => { if (!UI.ff.length) throw new Error('Add at least one question'); const f = await api('PUT', '/forms/' + el.dataset.id, { name: v('fmN'), sheetId: v('fmS'), title: v('fmT'), intro: v('fmI'), button: v('fmB'), color: v('fmC'), thanks: v('fmY'), active: v('fmA'), fields: UI.ff }); S.forms = S.forms.map(x => x.id === f.id ? f : x); closeModal(); render(); }, 'Form saved'),
  delform: el => confirmBox('Delete form?', 'The link stops working. Answers already in the sheet stay.', 'dodelform', { id: el.dataset.id }),
  dodelform: el => run(async () => { await api('DELETE', '/forms/' + el.dataset.id); S.forms = S.forms.filter(f => f.id !== el.dataset.id); closeModal(); render(); }, 'Form deleted'),
  fmtb: () => fmtCell('b'), fmti: () => fmtCell('i'),
  fmtc: el => popMenu(el, `<div class="mh small muted">Text colour</div><div class="pal">${['', ...COLORS].map(c => `<button class="sw2" data-act="setfc" data-v="${c}" title="${c || 'Default'}" style="--c:${c ? `var(--c-${c})` : '#111827'}"></button>`).join('')}</div>`),
  fmtfill: el => popMenu(el, `<div class="mh small muted">Row fill colour${UI.sel.size ? ` · ${UI.sel.size} selected rows` : ''}</div><div class="pal">${['', ...COLORS].map(c => `<button class="sw2 fillsw" data-act="setfill" data-v="${c}" title="${c ? esc(labelsOf(R.bid)[c] || c) : 'No fill'}" style="--c:${c ? `var(--t-${c})` : '#fff'};--b:${c ? `var(--c-${c})` : '#d1d5db'}"></button>`).join('')}</div>`),
  setfc: el => { closePop(); fmtCell('c', el.dataset.v); },
  setfill: el => { closePop(); const ids = UI.sel.size ? [...UI.sel] : (UI.cur ? [UI.cur.rid] : []); if (!ids.length) return toast('Select a cell or tick rows first'); run(async () => { const r = await api('POST', '/rows/batch', { ids, action: 'update', patch: { color: el.dataset.v } }); r.rows.forEach(putRow); softRender(); }); },
  fmtclear: () => { const td = curTd(); if (!td) return toast('Select a cell first'); const r = S.rows.find(x => x.id === td.parentElement.dataset.rid); saveFmt(r, td.dataset.k, {}); },
  viewas: el => run(async () => { UI.menu = null; if (MODE === 'demo') window.RDemo.viewAs(el.dataset.id); else await api('POST', '/impersonate', { userId: el.dataset.id }); closeModal(); location.hash = '/'; UI.sel.clear(); await refresh(); toast('Now viewing as ' + (S.me.name), 'Use “Back to RAREVO admin” to return'); }),
  backadmin: () => run(async () => { if (MODE === 'demo') window.RDemo.back(); else await api('POST', '/impersonate/back'); location.hash = '/'; await refresh(); }),
  gates: () => { UI.menu = null; render(); modal('Business login pages', `<p class="hint">Send each client their own login page. Use “Open as admin” to enter any business without a password.</p><table class="t" style="margin-top:10px"><thead><tr><th>Business</th><th>Login page</th><th>Business admin</th><th></th></tr></thead><tbody>${S.businesses.map(b => { const o = S.users.find(u => u.role === 'owner' && u.businessId === b.id); return `<tr><td><b>${esc(b.name)}</b></td><td><code>#/login/${esc(b.slug)}</code></td><td>${o ? `<code>${esc(o.username)}</code>` : '<span class="muted small">none yet</span>'}</td><td class="nowrap"><button class="btn xs" data-act="copyv" data-v="${esc(gateLink(b))}">Copy link</button><a class="btn xs" href="${esc(gateLink(b))}" target="_blank" rel="noopener">Open</a>${o ? `<button class="btn xs pri" data-act="viewas" data-id="${o.id}">Open as admin</button>` : `<button class="btn xs" data-act="clientlogin" data-id="${b.id}">Create login</button>`}</td></tr>`; }).join('')}</tbody></table>`, `<button class="btn pri" data-act="close">Done</button>`, { wide: true, nofocus: true }); }
  ,toadmin: () => { location.hash = '/admin'; renderLogin(); },
  gousers: el => { UI.uOpen[el.dataset.id] = true; go('/team'); setTimeout(() => { const n = document.getElementById('u-' + el.dataset.id); if (n) n.scrollIntoView({ block: 'start' }); }, 60); },
  utoggle: el => { UI.uOpen[el.dataset.id] = !UI.uOpen[el.dataset.id]; render(); },
  reqs: el => { UI.menu = null; go(`/b/${el.dataset.id}/team`); },
  wrap: () => { UI.wrap = !UI.wrap; softRender(); },
  tabmenu: el => { const id = el.dataset.id;
    if (id === 'master') return popMenu(el, pi('maccess', 'Who can open the master sheet…', { id: el.dataset.b }));
    popMenu(el, pi('editsheet', 'Rename / change category', { id }) + pi('cols', 'Columns &amp; headers…', { id }) + pi('access', 'Access — who can view / edit…', { id }) + pi('import', 'Upload Excel / CSV into this sheet', { id: SH(id).businessId, v: id }) + (SH(id).undo ? pi('undoimport', 'Undo last upload <span class="kb">' + esc(rel(SH(id).undo.at)) + '</span>', { id }) : '') + pi('junk', 'Remove junk rows (titles, totals)', { id }) + pi('bin', 'Deleted columns' + ((SH(id).bin || []).length ? ' (' + SH(id).bin.length + ')' : ''), { id }) + '<hr>' + pi('delsheet', 'Delete sheet', { id }, 'danger')); },
  allsheets: el => { const bid = el.dataset.id; popMenu(el, `<div class="mh small muted">All sheets</div>` + pi('gosheet', '▦ Master sheet', { v: `/b/${bid}/master` }) + sheetsOf(bid).map(x => pi('gosheet', `${sheetPerm(x) === 'none' ? '🔒 ' : ''}${esc(x.name)} <span class="muted small">· ${esc(x.category)}</span>`, { v: `/b/${bid}/sheets/${x.id}`, c: x.category })).join('')); },
  gosheet: el => { closePop(); const bid = R.bid; if (el.dataset.c !== undefined) UI.cat[bid] = ''; go(el.dataset.v); },
  colmenu: el => { const k = el.dataset.v, sc = UI.scopes[el.dataset.g], c = UI.cols[k] || {}, single = sc.sid !== 'master', m = sc.bid ? canManage(sc.bid) : isSuper(), g = el.dataset.g;
    let h = pi('colsel', 'Select whole column', { v: k }) + pi('sortc', 'Sort A → Z', { g, v: k, d: 1 }) + pi('sortc', 'Sort Z → A', { g, v: k, d: -1 }) + (single ? pi('sortpos', 'Sheet order (as uploaded)', { g }) : '');
    if (single && m) {
      const ci = UI.dcols.findIndex(x => x.k === k);
      h += '<hr>' + pi('rencol', 'Rename column', { id: sc.sid, v: k }) + pi('quickcol', 'Insert column left', { id: sc.sid, at: k, side: 0 }) + pi('quickcol', 'Insert column right', { id: sc.sid, at: k, side: 1 }) + (ci > 0 ? pi('colmove', 'Move left  <span class="kb">Alt+←</span>', { v: k, d: -1 }) : '') + (ci < UI.dcols.length - 1 ? pi('colmove', 'Move right  <span class="kb">Alt+→</span>', { v: k, d: 1 }) : '') + pi('colswap', 'Swap with…', { v: k });
      if (!['name', 'status', 'priority', 'owner', 'source', 'added', 'followUp', 'closed', 'color', 'act'].includes(k)) h += '<hr><div class="mh small muted">Make this column</div>' + pi('settype', 'Dropdown…', { id: sc.sid, v: k, t: 'select' }) + pi('settype', 'Multi-select…', { id: sc.sid, v: k, t: 'multi' }) + pi('settype', 'Yes / No', { id: sc.sid, v: k, t: 'yesno' }) + pi('settype', 'Checkbox', { id: sc.sid, v: k, t: 'check' }) + pi('settype', 'Number', { id: sc.sid, v: k, t: 'number' }) + pi('settype', 'Text', { id: sc.sid, v: k, t: 'text' });
      h += '<hr>' + ((c.def || ['name', 'phone', 'email', 'notes', 'price', 'followUp', 'closed'].includes(k)) ? pi('colclear', 'Clear column (keep it empty)', { id: sc.sid, v: k }) : '') + (k !== 'name' && (c.def || c.built) ? pi('coldel', 'Delete column', { id: sc.sid, v: k }, 'danger') : '') + pi('bin', 'Deleted columns…', { id: sc.sid });
    }
    if (!single) { const shs = scopeSheets(sc); h += '<hr>' + pi('mhide', 'Hide column (this view only)', { g, v: k }) + ((gs(g).hc || []).length ? pi('mshow', 'Show hidden columns (' + gs(g).hc.length + ')', { g }) : '') + '<hr><div class="mh small muted">To delete or empty a column, open its sheet:</div>' + shs.slice(0, 8).map(x => pi('golsheet', 'Open “' + esc(x.name) + '”', { id: x.id })).join(''); }
    popMenu(el, h); },
  sortc: el => { const g = gs(el.dataset.g); g.sort = el.dataset.v; g.dir = +el.dataset.d; closePop(); softRender(); },
  rencol: el => { closePop(); const th = document.querySelector(`th[data-ren="${CSS.escape(el.dataset.v)}"]`); if (th) th.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); },
  hidecol: el => run(async () => { const sh = SH(el.dataset.id); closePop(); putSheet(await api('PUT', '/sheets/' + sh.id, { hidden: [...new Set([...(sh.hidden || []), el.dataset.v])] })); softRender(); }, 'Column removed — built-in columns can be brought back from Columns & headers'),
  delcol2: el => { closePop(); const sh = SH(el.dataset.id), c = sh.columns.find(x => 'd:' + x.id === el.dataset.v); confirmBox('Delete column?', `“${c.name}” and its values will be removed from every row of ${sh.name}.`, 'dodelcol', { id: sh.id, v: c.id }); },
  dodelcol: el => run(async () => { const sh = SH(el.dataset.id); putSheet(await api('PUT', '/sheets/' + sh.id, { columns: sh.columns.filter(c => c.id !== el.dataset.v) })); closeModal(); softRender(); }, 'Column deleted'),
  quickcol: el => { closePop(); UI.opts = []; setTimeout(() => { optDraw(); const i = $('#optIn'); if (i) i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); A.optadd(); } }); }, 0); UI.qcAt = el.dataset.at ? { k: el.dataset.at, side: +el.dataset.side } : null; modal('New column', `<div class="form"><label class="f">Column name<input class="inp" id="qcN" placeholder="e.g. Budget"></label><label class="f">Type<select class="sel" id="qcT"><option value="text">Text</option><option value="number">Number</option><option value="date">Date</option><option value="select">Dropdown (your options)</option><option value="multi">Multi-select (pick many)</option><option value="yesno">Yes / No</option><option value="check">Checkbox</option></select></label><div class="f full"><span>Options <span class="muted small">(for Dropdown / Multi-select)</span></span><div id="optList" class="optlist"></div><div class="row" style="gap:6px"><input class="inp" id="optIn" placeholder="Type an option and press Enter (or paste: A, B, C)" style="flex:1"><button class="btn" data-act="optadd">+ Add</button></div><input type="hidden" id="qcO"></div></div>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="savequickcol" data-id="${el.dataset.id}">Add column</button>`); },
  savequickcol: el => run(async () => { if ($('#optIn') && $('#optIn').value.trim()) A.optadd(); const sh = SH(el.dataset.id); if (!v('qcN').trim()) throw new Error('Column name is required'); let ns = await api('PUT', '/sheets/' + sh.id, { columns: [...sh.columns, { name: v('qcN').trim(), type: v('qcT'), options: v('qcO').split(',').map(x => x.trim()).filter(Boolean) }] });
    if (UI.qcAt) { const nc = ns.columns[ns.columns.length - 1], keys = UI.dcols.map(c => c.k), at = keys.indexOf(UI.qcAt.k); keys.splice(at < 0 ? keys.length : at + UI.qcAt.side, 0, 'd:' + nc.id); ns = await api('PUT', '/sheets/' + sh.id, { order: keys.concat((ns.order || []).filter(x => !keys.includes(x))) }); }
    putSheet(ns); closeModal(); softRender(); }, 'Column added'),
  access: el => { closePop(); accessModal(el.dataset.id); },
  maccess: el => { closePop(); maccessModal(el.dataset.id); },
  saveaccess: el => run(async () => { const view = [], edit = []; $$('.acc').forEach(x => { if (x.value === 'view') view.push(x.dataset.u); if (x.value === 'edit') edit.push(x.dataset.u); }); putSheet(await api('PUT', `/sheets/${el.dataset.id}/access`, { view, edit })); closeModal(); render(); }, 'Access saved'),
  savemaccess: el => run(async () => { putBiz(await api('PUT', `/businesses/${el.dataset.id}/master-access`, { view: $$('.macc').filter(x => x.checked).map(x => x.value) })); closeModal(); render(); }, 'Master sheet access saved'),
  uaccess: el => uaccessModal(el.dataset.id),
  saveuaccess: el => run(async () => { const uid = el.dataset.id, u = U(uid);
    for (const x of $$('.ua')) { const sh = SH(x.dataset.s), cur = sheetPermOf(u, sh); if (cur === x.value) continue; const a = { view: (sh.access.view || []).filter(i => i !== uid), edit: (sh.access.edit || []).filter(i => i !== uid) }; if (x.value !== 'none') a[x.value].push(uid); putSheet(await api('PUT', `/sheets/${sh.id}/access`, a)); }
    const b = B(u.businessId), mv = ((b.masterAccess || {}).view || []).filter(i => i !== uid); if (v('ua-master') === 'view') mv.push(uid); putBiz(await api('PUT', `/businesses/${b.id}/master-access`, { view: mv }));
    closeModal(); render(); }, 'Access saved'),
  reqaccess: el => modal('Request access', `<p style="margin:0 0 10px">Ask for <b>${el.dataset.l === 'edit' ? 'edit' : 'view'}</b> access to ${el.dataset.v === 'master' ? 'the master sheet' : '“' + esc((SH(el.dataset.v) || {}).name) + '”'}.</p><label class="f">Message to your admin (optional)<textarea class="inp" id="rqN" placeholder="Why you need it"></textarea></label>`, `<button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="sendreq" data-id="${el.dataset.id}" data-v="${esc(el.dataset.v)}" data-l="${el.dataset.l}">Send request</button>`),
  sendreq: el => run(async () => { const q = await api('POST', '/requests', { businessId: el.dataset.id, sheetId: el.dataset.v, level: el.dataset.l, note: v('rqN') }); S.requests = (S.requests || []).filter(x => x.id !== q.id).concat([q]); closeModal(); render(); }, 'Request sent to your admin'),
  reqok: el => run(async () => { const r = await api('PUT', '/requests/' + el.dataset.id, { status: 'approved', level: el.dataset.l }); S.requests = S.requests.map(q => q.id === r.request.id ? r.request : q); if (r.sheet) putSheet(r.sheet); putBiz(r.business); UI.menu = null; render(); }, 'Access granted'),
  reqno: el => run(async () => { const r = await api('PUT', '/requests/' + el.dataset.id, { status: 'denied' }); S.requests = S.requests.map(q => q.id === r.request.id ? r.request : q); render(); }, 'Request denied'),
  saveslug: el => run(async () => { putBiz(await api('PUT', '/businesses/' + el.dataset.id, { slug: v('bsSlug') })); render(); }, 'Login link updated'),
  chk: el => { const r = S.rows.find(x => x.id === el.dataset.id), c = UI.cols[el.dataset.k]; if (r && c) saveCell(r, c, el.checked); }
};
async function waImport(bid, numbers) {
  if (!numbers.length) return toast('Choose contacts first', '', 1);
  const sheetId = v('waSheet');
  await run(async () => { const r = await api('POST', `/businesses/${bid}/contacts/import`, { numbers, sheetId }); r.rows.forEach(putRow); UI.waSel.clear(); render(); toast(`Added ${r.rows.length} contacts to ${(SH(sheetId) || {}).name}`, r.skipped ? r.skipped + ' already in that sheet' : ''); });
}

/* ---------------- events ---------------- */
document.addEventListener('click', e => {
  const goEl = e.target.closest('[data-go]');
  const el = e.target.closest('[data-act]');
  if (el && el.tagName === 'SELECT') return;
  if (UI.popEl && !e.target.closest('.pop') && !(el && ['colmenu', 'tabmenu', 'allsheets', 'insmenu', 'ctxfu', 'ctxmove', 'catmenu', 'colswap', 'catmove'].includes(el.dataset.act))) closePop();
  const ctd = e.target.closest('.gs td.c');
  if (ctd && !e.target.closest('button,input:not(.ed),a,select,textarea')) {
    if (ctd.classList.contains('editing')) return;
    if ((e.target.closest('.chip2') || ctd.classList.contains('t-multi') || ctd.classList.contains('cv')) && !ctd.dataset.ro && !e.shiftKey) startEdit(ctd);
    return;
  }
  if (el && el.tagName === 'INPUT' && !['selrow', 'selall', 'wasel', 'chk', 'webon', 'mergedup', 'waauto'].includes(el.dataset.act)) return;
  if (UI.menu && !e.target.closest('.menu') && !(el && el.dataset.act === 'menu')) { UI.menu = null; if (!el && !goEl) return render(); }
  if (e.target === $('#modal')) return closeModal();
  if (el && el.tagName === 'INPUT') { if (['selrow', 'selall', 'wasel', 'chk', 'webon'].includes(el.dataset.act)) A[el.dataset.act](el); return; }
  if (el && el.closest('.pop') && el.dataset.act !== 'mpsave') { closePop(); }
  if (el && A[el.dataset.act]) { if (el.tagName === 'A' && el.dataset.act !== 'gsave') e.preventDefault(); if (el.classList.contains('tm')) { e.preventDefault(); e.stopPropagation(); } A[el.dataset.act](el); return; }
  if (goEl) { e.preventDefault(); if (!$('#modal').hidden) closeModal(); UI.menu = null; go(goEl.dataset.go); }
});
document.addEventListener('change', e => {
  const el = e.target, d = el.dataset;
  if (el.classList.contains('ed')) { if (el.tagName === 'SELECT') commitEdit(); return; }
  if (d.ff !== undefined) { const q = UI.ff[+d.ff]; if (d.p === 'required') q.required = el.checked; else if (d.p === 'options') q.options = el.value.split(',').map(x => x.trim()).filter(Boolean); else q[d.p] = el.value; if (d.p === 'type') $('#ffList').innerHTML = ffList(); return; }
  if (d.act === 'websheet') { run(async () => { putBiz(await api('PUT', `/businesses/${d.id}/web`, { sheetId: el.value })); }, 'Website leads will go into ' + ((SH(el.value) || {}).name || 'that sheet')); return; }
  if (d.act === 'bizsel') return go(el.value ? '/b/' + el.value : '/');
  if (d.act === 'gf') { gs(d.g)[d.v] = el.value; return softRender(); }
  if (d.act === 'allcols') { gs(d.g).allCols = el.checked; return softRender(); }
  if (d.act === 'rf') { UI.rep[d.v] = el.value; return render(); }
  if (d.act === 'fuf') { UI.fu[d.v] = el.value; return render(); }
  if (d.act === 'mfrom' || d.act === 'mto') { UI.meta[d.act === 'mfrom' ? 'from' : 'to'] = el.value; return render(); }
  if (d.act === 'efrom' || d.act === 'eto') { UI.em[d.act === 'efrom' ? 'from' : 'to'] = el.value; return render(); }
  if (d.act === 'impmap') { const [i, j] = d.v.split(':').map(Number), bk = UI.imp.books[i]; bk.target[j] = el.value; if (!['skip', 'column', 'notes', 'name2'].includes(el.value)) bk.target.forEach((t, k) => { if (k !== j && t === el.value) bk.target[k] = 'column'; }); impKeep(); return impModal(); }
  if (d.act === 'imphead') { impKeep(); setHead(UI.imp.books[+d.v], +el.value); return impModal(); }
  if (d.act === 'impmode') { impKeep(); return impModal(); }
  if (d.act === 'impinc') { impKeep(); UI.imp.books[+d.v].include = el.checked; return impModal(); }
  if (d.act === 'impname') { UI.imp.books[+d.v].name = el.value; return; }
  if (d.act === 'impinto') { impKeep(); UI.imp.found = ''; return impModal(); }
  if (el.id === 'impFile' && el.files[0]) {
    impKeep();
    readFile(el.files[0]).then(books => { UI.imp.books = books; UI.imp.file = el.files[0].name; if (!books.length) toast('No rows found in that file', '', 1); else impDetect(); impModal(); }).catch(err => toast(err.message, '', 1));
    return;
  }
  if (d.id && d.f) {
    const f = d.f, val = el.type === 'checkbox' ? el.checked : el.value;
    let patch;
    if (f.startsWith('d:')) patch = { data: { [f.slice(2)]: val } };
    else if (f === 'followUp') patch = { followUp: val || null };
    else patch = { [f]: val };
    updateRow(d.id, patch, ['status', 'owner', 'followUp', 'closed', 'priority', 'sheetId', 'source'].includes(f));
  }
});
document.addEventListener('input', e => {
  const el = e.target, d = el.dataset;
  if (d.act === 'gq') { gs(d.g).q = el.value; refreshBody(d.g); }
  if (d.act === 'homeq') { UI.home.q = el.value; const pos = el.selectionStart; render(); const n = $('[data-act="homeq"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  if (d.act === 'waq') { UI.waQ = el.value; const pos = el.selectionStart; render(); const n = $('[data-act="waq"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
  if (['mS', 'mDur', 'mG', 'mTi', 'mDe'].includes(el.id) && $('#gLink')) $('#gLink').href = gUrl();
});
document.addEventListener('dblclick', e => {
  const ctd = e.target.closest('.gs td.c'); if (ctd && !ctd.classList.contains('editing') && !e.target.closest('button,input,a')) { startEdit(ctd); return; }
  const th = e.target.closest('th[data-ren]'); if (!th) return; clearTimeout(UI.sortT);
  const sh = SH(th.dataset.sid), k = th.dataset.ren; if (!sh || th.querySelector('.hin')) return;
  const cur = k.startsWith('d:') ? (sh.columns.find(c => c.id === k.slice(2)) || {}).name : ((sh.labels || {})[k] || BLABEL[k]);
  const hl = th.querySelector('.hl'); hl.innerHTML = `<input class="hin" value="${esc(cur)}" aria-label="Column name">`;
  const inp = hl.querySelector('input'); inp.focus(); inp.select();
  let done = false;
  const fin = save => { if (done) return; done = true; const name = inp.value.trim(); if (save && name && name !== cur) saveHeader(sh.id, k, name); else softRender(); };
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); fin(true); } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fin(false); } });
  inp.addEventListener('blur', () => fin(true));
});
function fmtCell(prop, val) {
  const td = curTd(); if (!td) return toast('Select a cell first');
  const cells = (typeof rangeCells === 'function' && UI.rng) ? rangeCells() : [td];
  const r0 = S.rows.find(x => x.id === td.parentElement.dataset.rid), k0 = td.dataset.k, f0 = ((r0 && r0.fmt) || {})[k0] || {};
  const on = prop === 'c' ? val : !f0[prop], by = {};
  cells.forEach(c => { const rid = c.parentElement ? c.parentElement.dataset.rid : c.r.id, k = c.dataset ? c.dataset.k : c.c.k; if (!rid || !k || k === 'act' || k === 'color') return; const r = S.rows.find(x => x.id === rid); if (!r || !canEdit(r)) return; (by[rid] = by[rid] || {})[k] = { ...((r.fmt || {})[k] || {}), [prop]: on }; });
  const changes = Object.entries(by).map(([id, fmt]) => ({ id, patch: { fmt } }));
  if (!changes.length) return toast('You can only view this record');
  api('POST', '/rows/cells', { changes }).then(r => { r.rows.forEach(x => { putRow(x); redrawRow(x.id); }); paint(); }).catch(e => toast(e.message, '', 1));
}
async function saveFmt(r, k, f) {
  if (!canEdit(r)) return toast('You can only view this record');
  try { const nr = await api('PUT', '/rows/' + r.id, { fmt: { [k]: f } }); putRow(nr); redrawRow(nr.id); } catch (e) { toast(e.message, '', 1); }
}
async function saveHeader(sid, k, name) {
  const sh = SH(sid);
  try {
    if (k.startsWith('d:')) putSheet(await api('PUT', '/sheets/' + sh.id, { columns: sh.columns.map(c => c.id === k.slice(2) ? { ...c, name } : c) }));
    else { const labels = { ...(sh.labels || {}) }; if (name !== BLABEL[k]) labels[k] = name; else delete labels[k]; putSheet(await api('PUT', '/sheets/' + sh.id, { labels })); }
    toast('Column renamed', name);
  } catch (e) { toast(e.message, '', 1); }
  softRender();
}
document.addEventListener('contextmenu', e => {
  const lth = e.target.closest('.gs tr.lt th.lc');
  if (lth) { e.preventDefault(); const ci = +lth.dataset.ci; if (!UI.rng || ci < UI.rng.c1 || ci > UI.rng.c2) selRange(0, ci, Math.max(0, UI.vrows.length - 1), ci); A.colmenu({ dataset: { g: UI.curScope, v: UI.dcols[ci].k }, getBoundingClientRect: () => lth.getBoundingClientRect() }); return; }
  const ctd = e.target.closest('.gs td.c');
  if (ctd && !ctd.classList.contains('editing')) { e.preventDefault(); const p = cellPos(ctd); if (!UI.rng || p.ri < UI.rng.r1 || p.ri > UI.rng.r2 || p.ci < UI.rng.c1 || p.ci > UI.rng.c2) selCell(ctd, true); UI.popAnchor = { getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }) }; popMenu({ getBoundingClientRect: () => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }) }, pi('ctxcopy', 'Copy  <span class="kb">Ctrl+C</span>') + pi('ctxpaste', 'Paste  <span class="kb">Ctrl+V</span>') + pi('ctxclear', 'Clear cells  <span class="kb">Delete</span>') + '<hr>' + (canManage((S.rows.find(r => r.id === ctd.parentElement.dataset.rid) || {}).businessId) ? pi('cvmake', 'Dropdown in this cell…', { t: 'select' }) + pi('cvmake', 'Yes / No in this cell', { t: 'yesno' }) : '') + pi('ctxfu', 'Add to follow-up…') + pi('ctxmove', 'Move to sheet…') + pi('ctxtick', 'Tick these rows (bulk edit)') + '<hr>' + pi('fmtb', 'Bold  <span class="kb">Ctrl+B</span>') + pi('ctxundo', 'Undo  <span class="kb">Ctrl+Z</span>') + pi('open', 'Open record', { id: ctd.parentElement.dataset.rid })); return; }
  const th = e.target.closest('.gs th.hn'); if (!th) return; const b = th.querySelector('.hm'); if (!b) return; e.preventDefault(); A.colmenu(b);
});
document.addEventListener('submit', async e => {
  if (e.target.id === 'pubForm') {
    e.preventDefault(); const form = e.target, id = form.dataset.id, values = {};
    for (const el of form.elements) { if (!el.name || el.name === '_hp') continue; values[el.name] = el.type === 'checkbox' ? el.checked : el.value; }
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    try {
      let r;
      if (MODE === 'demo') r = window.RDemo.publicSubmit(id, values, { page: location.href });
      else { const res = await fetch('/api/forms/' + encodeURIComponent(id) + '/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values, page: location.href, _hp: form.elements._hp ? form.elements._hp.value : '' }) }); r = await res.json(); if (!res.ok) throw new Error(r.error); }
      form.innerHTML = `<div class="pfdone">${ic('form')}<h1>${esc(r.thanks || 'Thank you!')}</h1><p class="muted">Your details have been received.</p></div>`;
    } catch (err) { btn.disabled = false; btn.textContent = 'Try again'; $('#pfErr').innerHTML = `<div class="alert" style="margin:0">${esc(err.message)}</div>`; }
    return;
  }
  if (e.target.id !== 'loginForm') return; e.preventDefault();
  const gate = e.target.dataset.gate || '';
  try { await api('POST', '/login', { login: v('lgE'), password: v('lgP'), gate }); try { if (gate) localStorage.setItem('rarevo-gate', gate); else localStorage.removeItem('rarevo-gate'); } catch (x) {} location.hash = gate ? '' : '/'; await refresh(); }
  catch (err) { $('#lgErr').innerHTML = `<div class="alert" style="margin:0">${esc(err.message)}</div>`; }
});
document.addEventListener('keydown', e => {
  const t = e.target, inField = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
  if (UI.editing && t.classList && t.classList.contains('ed')) {
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) { e.preventDefault(); commitEdit([1, 0]); return; }
    if (e.key === 'Tab') { e.preventDefault(); commitEdit([0, e.shiftKey ? -1 : 1]); return; }
    return;
  }
  if (t && t.id === 'fx' && e.key === 'Enter') { e.preventDefault(); const td = curTd(); if (td && !t.readOnly) { const r = S.rows.find(x => x.id === td.parentElement.dataset.rid), c = UI.cols[td.dataset.k]; saveCell(r, c, t.value).then(() => moveSel(1, 0)); } return; }
  if (e.key === 'Escape') { if (UI.popEl) return closePop(); if (!$('#modal').hidden) return closeModal(); if (UI.menu) { UI.menu = null; return render(); } if (UI.fs) { UI.fs = false; return render(); } }
  if (UI.anchor && !inField && $('#modal').hidden && curTd()) {
    const td = curTd(), mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key], ctrl = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
    if (mv && e.altKey && mv[1]) { e.preventDefault(); const ci = UI.anchor.ci, to = ci + mv[1]; if (to >= 0 && to < UI.dcols.length) moveColumn(ci, to); return; }
    if (mv) { e.preventDefault(); return moveSel(mv[0], mv[1], e.shiftKey); }
    if (e.key === 'Tab') { e.preventDefault(); return moveSel(0, e.shiftKey ? -1 : 1); }
    if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); return startEdit(td); }
    if (ctrl && key === 'a') { e.preventDefault(); return selRange(0, 0, UI.vrows.length - 1, UI.dcols.length - 1); }
    if (ctrl && (key === 'z' && !e.shiftKey)) { e.preventDefault(); return undoRedo(false); }
    if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); return undoRedo(true); }
    if (ctrl && ['b', 'i'].includes(key)) { e.preventDefault(); return fmtCell(key); }
    if (ctrl && key === 'c') { e.preventDefault(); return copyRange(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); return clearRange(); }
    const c = UI.cols[td.dataset.k], ty = c ? cellType(c) : 'ro';
    if (e.key.length === 1 && !ctrl && !e.altKey && !td.dataset.ro) { if (['text', 'long', 'number'].includes(ty)) { e.preventDefault(); return startEdit(td, e.key); } if (ty === 'select') { e.preventDefault(); return startEdit(td); } }
  }
  if (e.key === 'Enter' && t.classList && t.classList.contains('cell') && t.tagName === 'INPUT') t.blur();
  if ((e.key === 'Enter' || e.key === ' ') && t.classList && t.classList.contains('addcard')) { e.preventDefault(); A.addbiz(); }
});
document.addEventListener('focusout', e => { if (UI.editing && e.target.classList && e.target.classList.contains('ed') && e.target.tagName !== 'SELECT') setTimeout(() => { if (UI.editing && UI.editing.td.contains(e.target)) commitEdit(); }, 0); });
document.addEventListener('paste', e => {
  if (!UI.anchor || UI.editing || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '') || !$('#modal').hidden) return;
  const txt = (e.clipboardData || window.clipboardData).getData('text'); if (!txt) return;
  e.preventDefault(); pasteText(txt);
});
let DR = null;
document.addEventListener('scroll', e => { const w = e.target; if (!w.classList || !w.classList.contains('sheetwrap') || UI.moreBusy) return; if (w.scrollTop + w.clientHeight < w.scrollHeight - 200) return; const k = UI.curScope, sc = k && UI.scopes[k]; if (!sc) return; const g = gs(k); if (gfilter(sc).length <= g.limit) return; UI.moreBusy = 1; g.limit += 300; softRender(); setTimeout(() => { UI.moreBusy = 0; }, 150); }, true);
document.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const t = e.target;
  if (t.closest('.rz')) return;
  if (t.classList.contains('fh')) { e.preventDefault(); DR = { type: 'fill', to: UI.rng ? UI.rng.r2 : 0 }; return; }
  if (t.classList.contains('rzr')) { e.preventDefault(); const tr = t.closest('tr'); DR = { type: 'rh', tr, y: e.clientY, h: tr.offsetHeight }; document.body.classList.add('rowsizing'); return; }
  const th = t.closest('.gs tr.lt th.lc');
  if (th) { e.preventDefault(); if (UI.editing) commitEdit(); DR = { type: 'col', ci: +th.dataset.ci, x: e.clientX, shift: e.shiftKey, moved: false }; return; }
  const rn = t.closest('.gs .rnum2');
  if (rn) { e.preventDefault(); if (UI.editing) commitEdit(); const ri = UI.vrows.indexOf(rn.closest('tr').dataset.rid); DR = { type: 'row', ri, y: e.clientY, shift: e.shiftKey, moved: false }; return; }
  const td = t.closest('.gs td.c');
  if (td && !td.classList.contains('editing') && !t.closest('button,input,a,select,textarea')) {
    if (UI.editing) commitEdit();
    if (!td.dataset.k || td.dataset.k === 'act' || td.dataset.k === 'color') return;
    e.preventDefault(); selCell(td, true, e.shiftKey); DR = { type: 'sel' };
  }
});
document.addEventListener('mouseover', e => {
  if (!DR) return;
  if (DR.type === 'sel') { const td = e.target.closest('.gs td.c'); if (td && td.dataset.k && td.dataset.k !== 'act' && td.dataset.k !== 'color') selCell(td, true, true); }
  if (DR.type === 'fill') { const tr = e.target.closest('.gs tr[data-rid]'); if (!tr) return; const ri = UI.vrows.indexOf(tr.dataset.rid); DR.to = Math.max(ri, UI.rng.r2); $$('.gs .fillp').forEach(x => x.classList.remove('fillp')); for (let r = UI.rng.r2 + 1; r <= DR.to; r++) for (let c = UI.rng.c1; c <= UI.rng.c2; c++) { const x = tdAt(r, c); if (x) x.classList.add('fillp'); } }
});
document.addEventListener('mousemove', e => {
  if (!DR) return;
  if (DR.type === 'rh') { const h = Math.max(24, Math.min(400, DR.h + e.clientY - DR.y)); DR.tr.style.height = h + 'px'; DR.nh = h; }
  if (DR.type === 'col' || DR.type === 'row') {
    if (!DR.moved && Math.abs(DR.type === 'col' ? e.clientX - DR.x : e.clientY - DR.y) > 6) { DR.moved = true; document.body.classList.add('dragging'); }
    if (DR.moved) { $$('.gs .drop').forEach(x => x.classList.remove('drop')); const el = document.elementFromPoint(e.clientX, e.clientY); const tgt = el && (DR.type === 'col' ? el.closest('.gs tr.lt th.lc') : el.closest('.gs tr[data-rid]')); if (tgt) { tgt.classList.add('drop'); DR.target = DR.type === 'col' ? +tgt.dataset.ci : UI.vrows.indexOf(tgt.dataset.rid); } }
  }
});
document.addEventListener('mouseup', e => {
  if (!DR) return; const d = DR; DR = null; document.body.classList.remove('dragging', 'rowsizing'); $$('.gs .drop,.gs .fillp').forEach(x => x.classList.remove('drop', 'fillp'));
  if (d.type === 'fill') return fillDown(d.to);
  if (d.type === 'rh') { if (d.nh) { const id = d.tr.dataset.rid; api('POST', '/rows/cells', { changes: [{ id, patch: { h: d.nh } }] }).then(r => r.rows.forEach(putRow)).catch(err => toast(err.message, '', 1)); } return; }
  if (d.type === 'col') { if (d.moved && d.target != null) return moveColumn(d.ci, d.target); const last = UI.vrows.length - 1; if (last < 0) return; if (d.shift && UI.anchor) return selRange(0, UI.anchor.ci, last, d.ci); return selRange(0, d.ci, last, d.ci); }
  if (d.type === 'row') { if (d.moved && d.target != null && d.target >= 0) return moveRow(d.ri, d.target); const lastc = UI.dcols.length - 1; if (d.shift && UI.anchor) selRange(UI.anchor.ri, 0, d.ri, lastc); else selRange(d.ri, 0, d.ri, lastc); if (!(e.ctrlKey || e.metaKey)) UI.sel.clear(); rngRowIds().forEach(id => UI.sel.add(id)); const k = UI.curScope, R0 = UI.rng; softRender(); UI.rng = R0; paint(); return; }
});
document.addEventListener('dblclick', e => {
  if (e.target.classList && e.target.classList.contains('rzr')) { const id = e.target.closest('tr').dataset.rid; api('POST', '/rows/cells', { changes: [{ id, patch: { h: null } }] }).then(r => { r.rows.forEach(putRow); redrawRow(id); }).catch(() => {}); }
}, true);
let RZ = null;
document.addEventListener('mousedown', e => {
  const h = e.target.closest('.rz'); if (!h) return; e.preventDefault();
  const col = document.querySelector(`.gs col[data-k="${CSS.escape(h.dataset.rk)}"]`), table = h.closest('table'); if (!col) return;
  RZ = { k: h.dataset.rk, x: e.clientX, w: parseInt(col.style.width) || col.offsetWidth, col, table, tw: parseInt(table.style.width) || table.offsetWidth };
  document.body.classList.add('resizing');
});
document.addEventListener('mousemove', e => { if (!RZ) return; const w = Math.max(50, Math.min(900, RZ.w + e.clientX - RZ.x)); RZ.col.style.width = w + 'px'; RZ.table.style.width = (RZ.tw + w - RZ.w) + 'px'; RZ.nw = w; });
document.addEventListener('mouseup', async () => {
  if (!RZ) return; const z = RZ; RZ = null; document.body.classList.remove('resizing'); if (!z.nw) return;
  const k = UI.curScope, sc = UI.scopes[k]; const sh = sc && sc.sid !== 'master' ? SH(sc.sid) : null;
  if (sh && canManage(sh.businessId)) { try { putSheet(await api('PUT', '/sheets/' + sh.id, { widths: { ...(sh.widths || {}), [z.k]: z.nw } })); } catch (err) { toast(err.message, '', 1); } }
  else { try { const key = 'rarevo-colw-' + k, o = JSON.parse(localStorage.getItem(key) || '{}'); o[z.k] = z.nw; localStorage.setItem(key, JSON.stringify(o)); } catch (err) {} }
});

window.__crm = { get S() { return S; }, get UI() { return UI; } };
boot();
})();
