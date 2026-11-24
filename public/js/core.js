/* RAREVO CRM — shared data core.
   Runs on the Node server (data/db.json) and in the browser demo (localStorage).
   Roles:  super = System admin (RAREVO, sees everything)
           owner = Business admin (client, manages one business + its staff)
           staff = sees only records assigned to them
   handle(method, path, body, user) -> Promise<{status, body}> */
(function (root) {
  'use strict';
  const STATUSES = ['New', 'Contacted', 'Interested', 'Meeting set', 'Negotiation', 'Won', 'Lost'];
  const PRIOS = ['High', 'Medium', 'Low'];
  const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
  const ROLES = ['super', 'owner', 'staff'];
  const BUILTIN = ['name', 'phone', 'email', 'source', 'status', 'priority', 'owner', 'added', 'followUp', 'closed', 'price', 'notes'];
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const digits = p => String(p || '').replace(/\D/g, '').slice(-10);
  const slugify = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'biz';
  const clone = o => JSON.parse(JSON.stringify(o));
  const DAY = 864e5;
  const ymd = t => new Date(t).toISOString().slice(0, 10);

  function createCore(db, opt) {
    opt = opt || {};
    const save = opt.save || (() => {});
    const integ = opt.integrations || {};
    const hash = opt.hash || null;
    const now = () => Date.now();
    ['users', 'businesses', 'sheets', 'rows', 'spend', 'emails'].forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
    ['contacts', 'summaries'].forEach(k => { if (!db[k] || typeof db[k] !== 'object') db[k] = {}; });
    // migrate old roles
    db.users.forEach(u => { if (u.role === 'admin') u.role = 'super'; if (u.role === 'poc') u.role = 'staff'; if (!ROLES.includes(u.role)) u.role = 'staff'; if (u.role === 'super') u.businessId = ''; });
    db.sheets.forEach(s => { s.labels = s.labels || {}; s.hidden = s.hidden || []; s.widths = s.widths || {}; s.access = s.access || { view: [], edit: [] }; });
    if (!Array.isArray(db.requests)) db.requests = [];
    if (!Array.isArray(db.forms)) db.forms = [];
    const uniqueSlug = (name, selfId) => { const base = slugify(name); let x = base, i = 2; while (db.businesses.some(b => b.slug === x && b.id !== selfId)) x = base + '-' + i++; return x; };
    const newKey = () => 'wk_' + uid() + uid();
    db.businesses.forEach(b => { if (!b.slug) b.slug = uniqueSlug(b.name, b.id); b.masterAccess = b.masterAccess || { view: [] }; b.web = b.web || { key: newKey(), sheetId: '', enabled: true, count: 0, lastAt: null }; });
    const uniqueUser = base => { base = base.replace(/[^a-z0-9._-]/g, '').replace(/^\.+|\.+$/g, '') || 'user'; let x = base, i = 2; while (db.users.some(u => u.username === x)) x = base + i++; return x; };
    db.users.forEach(u => { if (!u.username) { const b = db.businesses.find(x => x.id === u.businessId); u.username = uniqueUser(u.role === 'super' ? String(u.email || 'admin').split('@')[0] : (b ? b.slug + '.' : '') + (u.role === 'owner' ? 'admin' : slugify(String(u.name).split(' ')[0]))); } });

    const E = (status, error) => { const e = new Error(error); e.status = status; return e; };
    const need = (c, s, m) => { if (!c) throw E(s, m); };
    const biz = id => db.businesses.find(b => b.id === id);
    const sheet = id => db.sheets.find(s => s.id === id);
    const row = id => db.rows.find(r => r.id === id);
    const userById = id => db.users.find(u => u.id === id);
    const uname = id => (userById(id) || {}).name || 'Unassigned';

    const isSuper = u => !!u && u.role === 'super';
    const canManage = (u, bid) => isSuper(u) || (u.role === 'owner' && u.businessId === bid);
    const canSeeBiz = (u, bid) => isSuper(u) || u.businessId === bid || (!u.businessId && db.rows.some(r => r.businessId === bid && r.owner === u.id));
    const sheetPerm = (u, sh) => { if (!sh) return 'none'; if (canManage(u, sh.businessId)) return 'edit'; const a = sh.access || {}; if ((a.edit || []).includes(u.id)) return 'edit'; if ((a.view || []).includes(u.id)) return 'view'; return 'none'; };
    const canSeeRow = (u, r) => canManage(u, r.businessId) || r.owner === u.id || sheetPerm(u, sheet(r.sheetId)) !== 'none';
    const canRow = (u, r) => canManage(u, r.businessId) || r.owner === u.id || sheetPerm(u, sheet(r.sheetId)) === 'edit';
    const canAssignTo = (bid, uidv) => !uidv || (() => { const t = userById(uidv); return !!t && (t.role === 'super' || !t.businessId || t.businessId === bid); })();

    const pubUser = u => ({ id: u.id, name: u.name, username: u.username || '', email: u.email || '', role: u.role, businessId: u.businessId || '', createdAt: u.createdAt, lastLogin: u.lastLogin || null });
    const hint = s => s ? '••••' + String(s).slice(-4) : '';
    const pubBiz = b => {
      const o = clone(b);
      if (o.rarevo) { o.rarevo.keyHint = hint(o.rarevo.key); delete o.rarevo.key; delete o.rarevo.password; }
      if (o.meta) { o.meta.tokenHint = hint(o.meta.token); delete o.meta.token; }
      o.contactCount = (db.contacts[b.id] || []).length;
      o.summary = db.summaries[b.id] || null;
      return o;
    };
    function log(r, u, text) { r.log = r.log || []; r.log.unshift({ t: now(), by: u ? u.name : 'System', text }); r.log = r.log.slice(0, 60); }

    function autoOwner(b) {
      const a = b.assign || {};
      if (a.mode !== 'round') return '';
      const pool = (a.pool || []).filter(id => canAssignTo(b.id, id) && userById(id));
      if (!pool.length) return '';
      const id = pool[(a.idx || 0) % pool.length];
      a.idx = (a.idx || 0) + 1; b.assign = a;
      return id;
    }
    function parseTime(v) {
      if (v == null || v === '') return null;
      if (typeof v === 'number') return v > 1e11 ? v : v * 1000;
      const s = String(v).trim();
      const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?:\s*([ap]m))?)?/i);
      if (m) {
        let y = +m[3]; if (y < 100) y += 2000;
        let h = +(m[4] || 0); if (m[6] && /pm/i.test(m[6]) && h < 12) h += 12; if (m[6] && /am/i.test(m[6]) && h === 12) h = 0;
        const d = new Date(y, +m[2] - 1, +m[1], h, +(m[5] || 0));
        return isNaN(d) ? null : d.getTime();
      }
      const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00' : s);
      return isNaN(t) ? null : t;
    }
    const normStatus = v => STATUSES.find(s => s.toLowerCase() === String(v || '').trim().toLowerCase()) || null;
    const normPrio = v => PRIOS.find(s => s.toLowerCase() === String(v || '').trim().toLowerCase()) || null;
    function ownerFrom(v, bid) {
      if (!v) return '';
      const s = String(v).trim().toLowerCase();
      const u = db.users.find(x => x.id === v || String(x.email).toLowerCase() === s || String(x.name).toLowerCase() === s);
      return u && canAssignTo(bid, u.id) ? u.id : '';
    }
    const num = v => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? null : n; };

    function makeRow(sh, d, u) {
      const b = biz(sh.businessId);
      const r = {
        id: uid(), sheetId: sh.id, businessId: sh.businessId,
        name: String(d.name || '').trim(), phone: String(d.phone || '').trim(), email: String(d.email || '').trim(),
        source: d.source || 'Manual', status: normStatus(d.status) || 'New', priority: normPrio(d.priority) || 'Medium',
        color: COLORS.includes(d.color) ? d.color : '', owner: '',
        added: parseTime(d.added) || now(), followUp: parseTime(d.followUp), closed: parseTime(d.closed),
        price: num(d.price), notes: String(d.notes || ''), data: {}, ref: d.ref || '', log: [], updated: now()
      };
      if (canManage(u, sh.businessId)) r.owner = ownerFrom(d.owner, sh.businessId) || (d.owner === undefined || d.owner === '' ? autoOwner(b) : '');
      else r.owner = u.id;
      if (d.data && typeof d.data === 'object') for (const k in d.data) if (sh.columns.some(c => c.id === k)) r.data[k] = d.data[k];
      if (!['Won', 'Lost'].includes(r.status)) r.closed = null; else if (!r.closed) r.closed = now();
      log(r, u, `Added to ${sh.name} (${r.source})` + (r.owner ? ' → ' + uname(r.owner) : ''));
      return r;
    }

    function patchRow(r, p, u) {
      const sh = sheet(r.sheetId);
      for (const k of Object.keys(p)) {
        const v = p[k];
        if (k === 'data') { for (const c in v) if (sh && sh.columns.some(x => x.id === c)) r.data[c] = v[c]; continue; }
        if (k === 'owner') { if (!canManage(u, r.businessId)) continue; if (!canAssignTo(r.businessId, v)) throw E(400, 'That person is not part of this business'); if (r.owner !== v) { r.owner = v || ''; log(r, u, 'Assigned to ' + uname(r.owner)); } continue; }
        if (k === 'status') { const s = normStatus(v); if (!s || s === r.status) continue; log(r, u, `Status: ${r.status} → ${s}`); r.status = s; if (['Won', 'Lost'].includes(s)) { if (!r.closed) r.closed = now(); r.followUp = null; } else r.closed = null; continue; }
        if (k === 'followUp') { r.followUp = parseTime(v); log(r, u, r.followUp ? 'Follow-up set: ' + new Date(r.followUp).toLocaleString('en-IN') : 'Follow-up cleared'); continue; }
        if (k === 'closed' || k === 'added') { r[k] = parseTime(v); continue; }
        if (k === 'price') { r.price = num(v); if (r.price != null) log(r, u, 'Sale price: ' + r.price); continue; }
        if (k === 'priority') { r.priority = normPrio(v) || r.priority; continue; }
        if (k === 'color') { r.color = COLORS.includes(v) ? v : ''; continue; }
        if (k === 'sheetId') { const t = sheet(v); if (t && t.businessId === r.businessId && t.id !== r.sheetId) { log(r, u, `Moved from ${sh ? sh.name : '?'} to ${t.name}`); r.sheetId = t.id; } continue; }
        if (k === 'note') { log(r, u, String(v)); continue; }
        if (k === 'fmt' && v && typeof v === 'object') { r.fmt = r.fmt || {}; for (const ck in v) { const f = v[ck] || {}; const o = { b: !!f.b, i: !!f.i, c: COLORS.includes(f.c) ? f.c : '' }; if (!o.b && !o.i && !o.c) delete r.fmt[ck]; else r.fmt[ck] = o; } continue; }
        if (['name', 'phone', 'email', 'source', 'notes'].includes(k)) r[k] = String(v ?? '');
      }
      r.updated = now();
      return r;
    }

    function addColumns(sh, names) {
      const map = {};
      for (const n of names) {
        const name = String(n).trim(); if (!name) continue;
        let c = sh.columns.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!c) { c = { id: 'c' + uid(), name, type: 'text' }; sh.columns.push(c); }
        map[name] = c.id;
      }
      return map;
    }

    function bulkInsert(sh, list, u, dedupe) {
      const seen = new Set(db.rows.filter(r => r.sheetId === sh.id).flatMap(r => [digits(r.phone), r.ref].filter(Boolean)));
      const out = []; let skipped = 0;
      for (const d of list) {
        const key = digits(d.phone);
        if (dedupe && ((key && seen.has(key)) || (d.ref && seen.has(d.ref)))) { skipped++; continue; }
        if (!d.name && !d.phone && !d.email && !(d.data && Object.values(d.data).some(Boolean))) { skipped++; continue; }
        const r = makeRow(sh, d, u); db.rows.push(r); out.push(r);
        if (key) seen.add(key); if (d.ref) seen.add(d.ref);
      }
      sh.updated = now();
      return { rows: out, skipped };
    }

    function upsert(list, businessId, items, source, fields) {
      let n = 0;
      for (const s of items) {
        const date = String(s.date || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const campaign = String(s.campaign || 'Manual entry').trim() || 'Manual entry';
        let e = list.find(x => x.businessId === businessId && x.date === date && x.campaign === campaign);
        if (!e) { e = { id: uid(), businessId, date, campaign }; list.push(e); }
        for (const f of fields) e[f] = num(s[f]) || 0;
        if (s.subject !== undefined) e.subject = String(s.subject || '');
        e.source = source || s.source || 'manual'; e.updated = now();
        n++;
      }
      return n;
    }
    const SPEND_F = ['spend', 'impressions', 'clicks', 'leads'];
    const EMAIL_F = ['sent', 'delivered', 'opened', 'clicked', 'replies', 'leads', 'unsubscribed', 'cost'];

    const metaConf = b => { need(b.meta && b.meta.token, 400, 'Meta is not connected for this business'); return b.meta; };
    const rvConf = b => { need(b.rarevo && b.rarevo.key, 400, 'Rarevo WhatsApp is not connected for this business'); return b.rarevo; };
    async function guard(b, key, fn) {
      try { const r = await fn(); b[key].status = 'ok'; b[key].error = ''; b[key].lastSync = now(); return r; }
      catch (e) { if (e.status) throw e; b[key].status = 'error'; b[key].error = e.message; save(); throw E(502, e.message); }
    }

    /* ---------------- routes ---------------- */
    const R = [];
    const on = (m, p, f) => R.push([m, new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), f]);
    const superOnly = u => need(isSuper(u), 403, 'Only the system admin can do this');
    const manage = (u, bid) => { need(biz(bid), 404, 'Business not found'); need(canManage(u, bid), 403, 'Only the business admin can do this'); return biz(bid); };
    const see = (u, bid) => { need(biz(bid), 404, 'Business not found'); need(canSeeBiz(u, bid), 403, 'You do not have access to this business'); return biz(bid); };

    on('GET', '/bootstrap', u => {
      const bizs = db.businesses.filter(b => canSeeBiz(u, b.id)), ids = new Set(bizs.map(b => b.id));
      const users = isSuper(u) ? db.users : db.users.filter(x => x.id === u.id || (u.businessId && x.businessId === u.businessId) || (!x.businessId && x.role === 'staff' && db.rows.some(r => ids.has(r.businessId) && r.owner === x.id)));
      return {
        me: pubUser(u), users: users.map(pubUser),
        businesses: bizs.map(b => { const o = pubBiz(b); if (!canManage(u, b.id)) delete o.web; return o; }), forms: db.forms.filter(f => canManage(u, f.businessId)), sheets: db.sheets.filter(s => ids.has(s.businessId)), rows: db.rows.filter(r => ids.has(r.businessId) && canSeeRow(u, r)),
        requests: db.requests.filter(q => ids.has(q.businessId) && (canManage(u, q.businessId) || q.userId === u.id)),
        spend: db.spend.filter(s => canManage(u, s.businessId)), emails: db.emails.filter(s => canManage(u, s.businessId)),
        statuses: STATUSES, priorities: PRIOS, colors: COLORS
      };
    });

    // team
    on('POST', '/users', async (u, p, b) => {
      need(isSuper(u) || u.role === 'owner', 403, 'Only admins can add people');
      need(String(b.name || '').trim(), 400, 'Name is required');
      let role = ROLES.includes(b.role) ? b.role : 'staff', businessId = String(b.businessId || '');
      if (!isSuper(u)) { if (role === 'super') role = 'owner'; businessId = u.businessId; }
      if (role === 'super') businessId = '';
      if (role === 'owner') need(biz(businessId), 400, 'Choose the business for this business admin');
      if (businessId) need(biz(businessId), 400, 'Business not found');
      const email = String(b.email || '').trim().toLowerCase();
      if (email) need(!db.users.some(x => String(x.email || '').toLowerCase() === email || x.username === email), 400, 'That email is already used');
      let username = String(b.username || '').trim().toLowerCase();
      if (username) need(!db.users.some(x => x.username === username || String(x.email || '').toLowerCase() === username), 400, 'That username is already used');
      else { const bb = biz(businessId); username = uniqueUser(role === 'super' ? slugify(b.name).replace(/-/g, '.') : (bb ? bb.slug + '.' : '') + (role === 'owner' ? 'admin' : slugify(String(b.name).split(' ')[0]))); }
      if (hash) need(String(b.password || '').length >= 6, 400, 'Password must be at least 6 characters');
      const x = { id: 'u' + uid(), name: String(b.name).trim(), username, email, phone: String(b.phone || ''), role, businessId, createdAt: now() };
      if (hash) x.password = await hash(b.password);
      db.users.push(x);
      if (role === 'staff' && businessId) { const bb = biz(businessId); bb.assign = bb.assign || { mode: 'round', pool: [], idx: 0 }; bb.assign.pool = [...new Set([...(bb.assign.pool || []), x.id])]; }
      return pubUser(x);
    });
    const canEditUser = (u, t) => isSuper(u) || (u.role === 'owner' && t.businessId === u.businessId && t.role !== 'super');
    on('PUT', '/users/:id', async (u, p, b) => {
      const t = userById(p.id); need(t, 404, 'User not found'); need(canEditUser(u, t), 403, 'You cannot change this person');
      if (b.name) t.name = String(b.name).trim();
      if (b.email !== undefined) { const l = String(b.email).trim().toLowerCase(); if (l) need(!db.users.some(x => x.id !== t.id && (String(x.email || '').toLowerCase() === l || x.username === l)), 400, 'That email is already used'); t.email = l; }
      if (b.username) { const l = String(b.username).trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''); need(l && !db.users.some(x => x.id !== t.id && (x.username === l || String(x.email || '').toLowerCase() === l)), 400, 'That username is already used'); t.username = l; }
      if (b.phone !== undefined) t.phone = String(b.phone || '');
      if (b.role && t.id !== u.id && ROLES.includes(b.role)) { if (b.role === 'super') { superOnly(u); t.businessId = ''; } t.role = b.role; }
      if (isSuper(u) && b.businessId !== undefined && t.role !== 'super') { need(!b.businessId || biz(b.businessId), 400, 'Business not found'); t.businessId = b.businessId || ''; }
      if (t.role === 'owner') need(t.businessId, 400, 'A business admin needs a business');
      if (b.password) { need(String(b.password).length >= 6, 400, 'Password must be at least 6 characters'); if (hash) t.password = await hash(b.password); }
      return pubUser(t);
    });
    on('DELETE', '/users/:id', (u, p) => {
      const t = userById(p.id); need(t, 404, 'User not found'); need(canEditUser(u, t), 403, 'You cannot remove this person'); need(t.id !== u.id, 400, 'You cannot remove yourself');
      need(!(t.role === 'super' && db.users.filter(x => x.role === 'super').length < 2), 400, 'Keep at least one system admin');
      db.users = db.users.filter(x => x.id !== t.id);
      db.rows.forEach(r => { if (r.owner === t.id) r.owner = ''; });
      db.businesses.forEach(b => { if (b.assign) b.assign.pool = (b.assign.pool || []).filter(x => x !== t.id); if (b.masterAccess) b.masterAccess.view = (b.masterAccess.view || []).filter(x => x !== t.id); });
      db.sheets.forEach(s => { s.access.view = s.access.view.filter(x => x !== t.id); s.access.edit = s.access.edit.filter(x => x !== t.id); });
      db.requests = db.requests.filter(q => q.userId !== t.id);
      return { ok: true };
    });

    // businesses
    on('POST', '/businesses', (u, p, b) => {
      superOnly(u); need(b && String(b.name || '').trim(), 400, 'Business name is required');
      const x = { id: uid(), slug: '', masterAccess: { view: [] }, name: String(b.name).trim(), industry: b.industry || '', phone: b.phone || '', status: b.status || 'active', color: b.color || '#dc2626', currency: b.currency || 'INR',
        meetEmails: b.meetEmails || '', colorLabels: { red: 'Hot', orange: 'Urgent', yellow: 'Waiting', green: 'Ready to close', blue: 'Info sent', purple: 'VIP' },
        assign: { mode: 'round', pool: [], idx: 0 }, rarevo: null, meta: null, web: { key: newKey(), sheetId: '', enabled: true, count: 0, lastAt: null }, createdAt: now() };
      x.slug = uniqueSlug(b.slug || x.name, x.id);
      db.businesses.push(x);
      const sh = { id: uid(), businessId: x.id, name: 'Sheet 1', category: 'General', columns: [], labels: {}, hidden: [], widths: {}, access: { view: [], edit: [] }, source: 'manual', createdAt: now(), updated: now() };
      db.sheets.push(sh);
      return { business: pubBiz(x), sheet: sh };
    });
    on('PUT', '/businesses/:id', (u, p, b) => {
      const x = manage(u, p.id);
      for (const k of ['name', 'industry', 'color', 'currency', 'meetEmails', 'colorLabels', 'assign', 'phone']) if (b[k] !== undefined) x[k] = b[k];
      if (b.status !== undefined && isSuper(u)) x.status = b.status;
      if (b.slug !== undefined && isSuper(u) && String(b.slug).trim()) x.slug = uniqueSlug(b.slug, x.id);
      return pubBiz(x);
    });
    on('DELETE', '/businesses/:id', (u, p) => {
      superOnly(u); need(biz(p.id), 404, 'Business not found');
      db.businesses = db.businesses.filter(x => x.id !== p.id); db.sheets = db.sheets.filter(x => x.businessId !== p.id);
      db.rows = db.rows.filter(x => x.businessId !== p.id); db.spend = db.spend.filter(x => x.businessId !== p.id); db.emails = db.emails.filter(x => x.businessId !== p.id); db.forms = db.forms.filter(x => x.businessId !== p.id);
      db.users.forEach(x => { if (x.businessId === p.id) { x.businessId = ''; if (x.role === 'owner') x.role = 'staff'; } });
      delete db.contacts[p.id]; delete db.summaries[p.id]; return { ok: true };
    });

    // connections
    on('PUT', '/businesses/:id/rarevo', async (u, p, b) => {
      const x = manage(u, p.id);
      need(b.url && b.key && b.password, 400, 'API URL, API key and API password are all required');
      x.rarevo = { url: String(b.url).trim().replace(/\/+$/, ''), key: String(b.key).trim(), password: String(b.password).trim(), connectedAt: now(), status: 'pending', error: '', lastSync: null };
      try { if (integ.rarevo) { db.summaries[x.id] = await integ.rarevo.summary(x.rarevo); x.rarevo.status = 'ok'; } }
      catch (e) { x.rarevo.status = 'error'; x.rarevo.error = e.message; }
      return pubBiz(x);
    });
    on('DELETE', '/businesses/:id/rarevo', (u, p) => { const x = manage(u, p.id); x.rarevo = null; delete db.contacts[x.id]; delete db.summaries[x.id]; return pubBiz(x); });
    on('PUT', '/businesses/:id/meta', async (u, p, b) => {
      const x = manage(u, p.id);
      need(b.adAccountId && b.token, 400, 'Ad account ID and access token are required');
      x.meta = { adAccountId: String(b.adAccountId).trim(), token: String(b.token).trim(), pageId: String(b.pageId || '').trim(), version: String(b.version || 'v23.0').trim(), connectedAt: now(), status: 'pending', error: '', lastSync: null };
      try { if (integ.meta) { const a = await integ.meta.account(x.meta); x.meta.accountName = a.name || ''; if (a.currency) x.currency = a.currency; x.meta.status = 'ok'; } }
      catch (e) { x.meta.status = 'error'; x.meta.error = e.message; }
      return pubBiz(x);
    });
    on('DELETE', '/businesses/:id/meta', (u, p) => { const x = manage(u, p.id); x.meta = null; return pubBiz(x); });

    // Rarevo WhatsApp (read-only)
    on('POST', '/businesses/:id/rarevo/sync', async (u, p) => {
      const x = see(u, p.id); const c = rvConf(x);
      return guard(x, 'rarevo', async () => {
        const [list, sum] = await Promise.all([integ.rarevo.contacts(c), integ.rarevo.summary(c).catch(() => db.summaries[x.id] || null)]);
        db.contacts[x.id] = list; db.summaries[x.id] = sum;
        return { count: list.length };
      }).then(r => { r.business = pubBiz(x); return r; });
    });
    on('GET', '/businesses/:id/contacts', (u, p) => { const x = see(u, p.id); return { contacts: db.contacts[x.id] || [], summary: db.summaries[x.id] || null }; });
    on('GET', '/businesses/:id/contacts/:number/messages', async (u, p) => {
      const x = see(u, p.id); const c = rvConf(x);
      return guard(x, 'rarevo', async () => ({ messages: await integ.rarevo.messages(c, decodeURIComponent(p.number)) }));
    });
    on('POST', '/businesses/:id/contacts/import', (u, p, b) => {
      const x = see(u, p.id); const sh = sheet(b.sheetId); need(sh && sh.businessId === x.id, 400, 'Choose a sheet');
      const nums = new Set((b.numbers || []).map(String));
      const list = (db.contacts[x.id] || []).filter(c => nums.has(String(c.number))).map(c => ({ name: c.name || c.number, phone: c.number, source: 'WhatsApp', notes: c.lastMessage ? 'Last WhatsApp: ' + c.lastMessage : '', added: c.firstAt || c.lastAt || null, ref: 'wa:' + digits(c.number) }));
      return bulkInsert(sh, list, u, true);
    });

    // Meta (spend + lead forms)
    on('POST', '/businesses/:id/meta/sync-spend', async (u, p, b) => {
      const x = manage(u, p.id); const c = metaConf(x);
      const until = b.until || ymd(now()), since = b.since || ymd(now() - 29 * DAY);
      return guard(x, 'meta', async () => {
        const list = await integ.meta.insights(c, since, until);
        db.spend = db.spend.filter(s => !(s.businessId === x.id && s.source === 'meta' && s.date >= since && s.date <= until));
        const n = upsert(db.spend, x.id, list, 'meta', SPEND_F);
        return { count: n, spend: db.spend.filter(s => s.businessId === x.id) };
      }).then(r => { r.business = pubBiz(x); return r; });
    });
    on('GET', '/businesses/:id/meta/forms', async (u, p) => {
      const x = manage(u, p.id); const c = metaConf(x); need(c.pageId, 400, 'Add the Facebook Page ID in the Meta connection to read lead forms');
      return guard(x, 'meta', async () => ({ forms: await integ.meta.forms(c) }));
    });
    on('POST', '/businesses/:id/meta/import-leads', async (u, p, b) => {
      const x = manage(u, p.id); const c = metaConf(x);
      const sh = sheet(b.sheetId); need(sh && sh.businessId === x.id, 400, 'Choose a sheet');
      const forms = b.formIds && b.formIds.length ? b.formIds : [];
      need(forms.length, 400, 'Choose at least one lead form');
      return guard(x, 'meta', async () => {
        let all = [];
        for (const f of forms) all = all.concat(await integ.meta.leads(c, f, b.since ? parseTime(b.since) : null));
        const extra = new Set(); all.forEach(l => Object.keys(l.fields || {}).forEach(k => extra.add(k)));
        const map = addColumns(sh, [...extra]);
        const list = all.map(l => { const data = {}; for (const k in l.fields || {}) data[map[k]] = l.fields[k]; return { name: l.name, phone: l.phone, email: l.email, source: 'Meta Ads', notes: [l.campaign, l.ad].filter(Boolean).join(' · '), added: l.created, ref: 'meta:' + l.id, data }; });
        return bulkInsert(sh, list, u, true);
      }).then(r => ({ ...r, sheet: sh }));
    });
    on('POST', '/spend/bulk', (u, p, b) => { manage(u, b.businessId); const n = upsert(db.spend, b.businessId, b.rows || [], 'manual', SPEND_F); return { count: n, spend: db.spend.filter(s => s.businessId === b.businessId) }; });
    on('DELETE', '/spend/:id', (u, p) => { const s = db.spend.find(x => x.id === p.id); need(s, 404, 'Not found'); manage(u, s.businessId); db.spend = db.spend.filter(x => x.id !== p.id); return { ok: true }; });

    // Email marketing results
    on('POST', '/emails/bulk', (u, p, b) => { manage(u, b.businessId); const n = upsert(db.emails, b.businessId, b.rows || [], b.source || 'manual', EMAIL_F); return { count: n, emails: db.emails.filter(s => s.businessId === b.businessId) }; });
    on('DELETE', '/emails/:id', (u, p) => { const s = db.emails.find(x => x.id === p.id); need(s, 404, 'Not found'); manage(u, s.businessId); db.emails = db.emails.filter(x => x.id !== p.id); return { ok: true }; });

    // sheets
    const cleanCols = cols => cols.map(c => ({ id: c.id || 'c' + uid(), name: String(c.name || '').trim() || 'Column', type: ['text', 'number', 'date', 'select', 'check'].includes(c.type) ? c.type : 'text', options: Array.isArray(c.options) ? c.options.map(String) : [] }));
    on('POST', '/sheets', (u, p, b) => {
      manage(u, b.businessId);
      const sh = { id: uid(), businessId: b.businessId, name: String(b.name || 'Untitled sheet').trim(), category: String(b.category || 'General').trim() || 'General', columns: cleanCols(b.columns || []), labels: {}, hidden: [], widths: {}, access: { view: [], edit: [] }, source: b.source || 'manual', createdAt: now(), updated: now() };
      db.sheets.push(sh); return sh;
    });
    on('PUT', '/sheets/:id', (u, p, b) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      if (b.name !== undefined) sh.name = String(b.name).trim() || sh.name;
      if (b.category !== undefined) sh.category = String(b.category).trim() || 'General';
      if (Array.isArray(b.columns)) sh.columns = cleanCols(b.columns);
      if (b.labels && typeof b.labels === 'object') { sh.labels = {}; for (const k of BUILTIN) if (b.labels[k] && String(b.labels[k]).trim()) sh.labels[k] = String(b.labels[k]).trim(); }
      if (Array.isArray(b.hidden)) sh.hidden = b.hidden.filter(k => BUILTIN.includes(k) && k !== 'name');
      if (b.widths && typeof b.widths === 'object') { sh.widths = sh.widths || {}; for (const k in b.widths) { const w = Math.round(+b.widths[k]); if (w >= 40 && w <= 900) sh.widths[k] = w; } }
      sh.updated = now(); return sh;
    });
    on('DELETE', '/sheets/:id', (u, p) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      need(db.sheets.filter(s => s.businessId === sh.businessId).length > 1, 400, 'A business needs at least one sheet');
      db.sheets = db.sheets.filter(s => s.id !== sh.id); db.rows = db.rows.filter(r => r.sheetId !== sh.id); return { ok: true };
    });

    // access: per-sheet view/edit + master sheet view
    const bizMember = (bid, id) => { const t = userById(id); return !!t && t.businessId === bid && t.role !== 'super'; };
    on('PUT', '/sheets/:id/access', (u, p, b) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      const edit = [...new Set((b.edit || []).filter(id => bizMember(sh.businessId, id)))];
      const view = [...new Set((b.view || []).filter(id => bizMember(sh.businessId, id) && !edit.includes(id)))];
      sh.access = { view, edit }; return sh;
    });
    on('PUT', '/businesses/:id/master-access', (u, p, b) => {
      const x = manage(u, p.id); x.masterAccess = { view: [...new Set((b.view || []).filter(id => bizMember(x.id, id)))] }; return pubBiz(x);
    });
    on('POST', '/requests', (u, p, b) => {
      const x = see(u, b.businessId); const target = b.sheetId === 'master' ? 'master' : (sheet(b.sheetId) && sheet(b.sheetId).businessId === x.id ? b.sheetId : null);
      need(target, 400, 'Sheet not found');
      const level = b.level === 'edit' && target !== 'master' ? 'edit' : 'view';
      let q = db.requests.find(r => r.userId === u.id && r.sheetId === target && r.status === 'pending');
      if (!q) { q = { id: uid(), businessId: x.id, sheetId: target, userId: u.id, at: now() }; db.requests.push(q); }
      Object.assign(q, { level, note: String(b.note || '').slice(0, 300), status: 'pending', at: now() });
      return q;
    });
    on('PUT', '/requests/:id', (u, p, b) => {
      const q = db.requests.find(r => r.id === p.id); need(q, 404, 'Request not found'); manage(u, q.businessId);
      q.status = b.status === 'approved' ? 'approved' : 'denied'; q.decidedBy = u.name; q.decidedAt = now();
      const level = b.level === 'edit' ? 'edit' : b.level === 'view' ? 'view' : q.level;
      if (q.status === 'approved') {
        if (q.sheetId === 'master') { const x = biz(q.businessId); x.masterAccess.view = [...new Set([...(x.masterAccess.view || []), q.userId])]; }
        else { const sh = sheet(q.sheetId); if (sh) { sh.access.view = sh.access.view.filter(i => i !== q.userId); sh.access.edit = sh.access.edit.filter(i => i !== q.userId); sh.access[level === 'edit' ? 'edit' : 'view'].push(q.userId); } }
      }
      return { request: q, sheet: q.sheetId !== 'master' ? sheet(q.sheetId) : null, business: pubBiz(biz(q.businessId)) };
    });

    // website collector settings
    on('PUT', '/businesses/:id/web', (u, p, b) => {
      const x = manage(u, p.id); x.web = x.web || {};
      if (b.sheetId !== undefined) { need(!b.sheetId || (sheet(b.sheetId) && sheet(b.sheetId).businessId === x.id), 400, 'Choose a sheet of this business'); x.web.sheetId = b.sheetId; }
      if (b.enabled !== undefined) x.web.enabled = !!b.enabled;
      if (b.newKey) x.web.key = newKey();
      return pubBiz(x);
    });
    // forms
    const FTYPES = ['text', 'email', 'phone', 'textarea', 'select', 'date', 'number', 'check'];
    const cleanForm = (f, b) => {
      if (b.name !== undefined) f.name = String(b.name).trim() || 'Untitled form';
      for (const k of ['title', 'intro', 'thanks', 'color', 'button']) if (b[k] !== undefined) f[k] = String(b[k]);
      if (b.active !== undefined) f.active = !!b.active;
      if (b.sheetId !== undefined) { need(sheet(b.sheetId) && sheet(b.sheetId).businessId === f.businessId, 400, 'Choose a sheet of this business'); f.sheetId = b.sheetId; }
      if (Array.isArray(b.fields)) f.fields = b.fields.slice(0, 40).map(x => ({ id: x.id || 'f' + uid(), label: String(x.label || 'Question').trim().slice(0, 120), type: FTYPES.includes(x.type) ? x.type : 'text', required: !!x.required, options: Array.isArray(x.options) ? x.options.map(String).filter(Boolean).slice(0, 50) : [] }));
      return f;
    };
    on('POST', '/forms', (u, p, b) => {
      const x = manage(u, b.businessId);
      const f = { id: 'fm' + uid(), businessId: x.id, name: 'Enquiry form', title: 'Get in touch', intro: 'Leave your details and we will contact you shortly.', thanks: 'Thank you! We will get back to you soon.', button: 'Submit', color: x.color || '#dc2626', active: true, sheetId: (db.sheets.find(s => s.businessId === x.id) || {}).id, submissions: 0, createdAt: now(),
        fields: [{ id: 'f' + uid(), label: 'Name', type: 'text', required: true, options: [] }, { id: 'f' + uid(), label: 'Phone', type: 'phone', required: true, options: [] }, { id: 'f' + uid(), label: 'Email', type: 'email', required: false, options: [] }, { id: 'f' + uid(), label: 'Message', type: 'textarea', required: false, options: [] }] };
      cleanForm(f, b); db.forms.push(f); return f;
    });
    on('PUT', '/forms/:id', (u, p, b) => { const f = db.forms.find(x => x.id === p.id); need(f, 404, 'Form not found'); manage(u, f.businessId); return cleanForm(f, b); });
    on('DELETE', '/forms/:id', (u, p) => { const f = db.forms.find(x => x.id === p.id); need(f, 404, 'Form not found'); manage(u, f.businessId); db.forms = db.forms.filter(x => x.id !== p.id); return { ok: true }; });

    // rows
    on('POST', '/rows', (u, p, b) => { const sh = sheet(b.sheetId); need(sh, 404, 'Sheet not found'); see(u, sh.businessId); need(sheetPerm(u, sh) === 'edit' || u.role === 'staff', 403, 'You can only view this sheet'); const r = makeRow(sh, b, u); db.rows.push(r); sh.updated = now(); return r; });
    on('POST', '/rows/bulk', (u, p, b) => { const sh = sheet(b.sheetId); need(sh, 404, 'Sheet not found'); see(u, sh.businessId); need(Array.isArray(b.rows), 400, 'rows must be a list'); return bulkInsert(sh, b.rows.slice(0, 50000), u, b.dedupe !== false); });
    on('PUT', '/rows/:id', (u, p, b) => { const r = row(p.id); need(r, 404, 'Record not found'); need(canRow(u, r), 403, 'This record is assigned to someone else'); return patchRow(r, b || {}, u); });
    on('DELETE', '/rows/:id', (u, p) => { const r = row(p.id); need(r, 404, 'Record not found'); manage(u, r.businessId); db.rows = db.rows.filter(x => x.id !== p.id); return { ok: true }; });
    on('POST', '/rows/batch', (u, p, b) => {
      const ids = new Set(b.ids || []); const list = db.rows.filter(r => ids.has(r.id) && canRow(u, r));
      if (b.action === 'delete' || b.action === 'assign') list.forEach(r => need(canManage(u, r.businessId), 403, 'Only the business admin can do this'));
      if (b.action === 'delete') { const del = new Set(list.map(r => r.id)); db.rows = db.rows.filter(r => !del.has(r.id)); return { ok: true, deleted: list.length }; }
      list.forEach(r => patchRow(r, b.patch || {}, u)); return { rows: list };
    });

    /* ---------- public intake: website collector + forms (no login) ---------- */
    const WEB_USER = { id: 'system', name: 'Website', role: 'super', businessId: '' };
    function mapIncoming(sh, fields) {
      const o = { data: {} }, extra = {};
      for (const [k0, val] of Object.entries(fields || {})) {
        const k = String(k0).trim().slice(0, 80), v = (Array.isArray(val) ? val.join(', ') : String(val ?? '')).trim().slice(0, 5000);
        if (!k || !v) continue;
        const kl = k.toLowerCase().replace(/[_\-\[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (/pass(word)?|token|nonce|captcha|honeypot|^_|card ?num|cvv|g recaptcha/.test(kl)) continue;
        if (!o.name && /^(name|full ?name|your name|your full name|contact name|customer name|client name|first name|fname|billing first name)$/.test(kl)) { o.name = v; continue; }
        if (/^(last name|surname|lname|billing last name)$/.test(kl)) { o.last = v; continue; }
        if (!o.email && /e ?mail/.test(kl)) { o.email = v; continue; }
        if (!o.phone && /phone|mobile|whats ?app|contact (no|number)|^tel|cell/.test(kl)) { o.phone = v; continue; }
        if (/^(message|your message|comments?|enquiry|inquiry|requirement|requirements|notes?|query|details)$/.test(kl)) { o.notes = (o.notes ? o.notes + ' · ' : '') + v; continue; }
        extra[k] = v;
      }
      if (o.last) { o.name = ((o.name || '') + ' ' + o.last).trim(); delete o.last; }
      const map = addColumns(sh, Object.keys(extra).slice(0, 30));
      for (const k in extra) if (map[k]) o.data[map[k]] = extra[k];
      return o;
    }
    function intake(b, sh, item, label) {
      const o = mapIncoming(sh, item.fields);
      o.source = item.source || 'Website'; o.ref = item.ref ? String(item.ref).slice(0, 80) : '';
      const where = [item.form, item.page].filter(Boolean).join(' · ');
      if (where) o.notes = (o.notes ? o.notes + '\n' : '') + label + ': ' + where;
      if (!o.name && !o.phone && !o.email && !Object.keys(o.data).length) return 'skipped';
      const d = digits(o.phone), em = String(o.email || '').toLowerCase();
      const ex = db.rows.find(r => r.businessId === b.id && ((o.ref && r.ref === o.ref) || (em && String(r.email || '').toLowerCase() === em) || (d && digits(r.phone) === d)));
      if (ex) {
        for (const k of ['name', 'phone', 'email']) if (o[k] && !ex[k]) ex[k] = o[k];
        if (!ex.ref && o.ref) ex.ref = o.ref;
        const s2 = sheet(ex.sheetId); if (s2 && s2.id === sh.id) Object.assign(ex.data, o.data);
        if (o.notes) log(ex, WEB_USER, 'New ' + label.toLowerCase() + (where ? ' (' + where + ')' : '') + (o.notes ? ': ' + o.notes.split('\n')[0].slice(0, 200) : ''));
        ex.updated = now(); return 'updated';
      }
      if (item.added) o.added = item.added;
      db.rows.push(makeRow(sh, o, WEB_USER)); return 'created';
    }
    function collect(key, payload) {
      const b = db.businesses.find(x => x.web && x.web.key === key);
      if (!b) throw E(404, 'Unknown website key');
      if (!b.web.enabled) throw E(403, 'Website collection is switched off for this business');
      const sh = sheet(b.web.sheetId) || db.sheets.find(s => s.businessId === b.id); need(sh, 400, 'No sheet to save into');
      const items = Array.isArray(payload.items) ? payload.items.slice(0, 2000) : [payload];
      const res = { created: 0, updated: 0, skipped: 0 };
      for (const it of items) res[intake(b, sh, it || {}, it && it.kind === 'user' ? 'Website sign-up' : 'Website form')]++;
      b.web.count = (b.web.count || 0) + res.created + res.updated; b.web.lastAt = now(); sh.updated = now(); save();
      return { ok: true, ...res };
    }
    function publicForm(id) {
      const f = db.forms.find(x => x.id === id); if (!f) throw E(404, 'Form not found');
      const b = biz(f.businessId) || {};
      return { id: f.id, title: f.title, intro: f.intro, thanks: f.thanks, button: f.button || 'Submit', color: f.color, active: f.active, fields: f.fields, business: { name: b.name, color: b.color } };
    }
    function publicSubmit(id, values, meta) {
      const f = db.forms.find(x => x.id === id); if (!f) throw E(404, 'Form not found'); need(f.active, 403, 'This form is closed');
      const b = biz(f.businessId), sh = sheet(f.sheetId) || db.sheets.find(s => s.businessId === b.id);
      const fields = {};
      for (const q of f.fields) {
        const val = values ? values[q.id] : '';
        const sv = q.type === 'check' ? (val ? 'Yes' : '') : String(val ?? '').trim();
        need(!q.required || sv, 400, '“' + q.label + '” is required');
        if (sv && q.type === 'email') need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sv), 400, 'Please enter a valid email');
        if (sv && q.type === 'phone') need(String(sv).replace(/\D/g, '').length >= 7, 400, 'Please enter a valid phone number');
        if (sv) fields[q.label] = sv;
      }
      const r = intake(b, sh, { fields, form: f.name, page: meta && meta.page, source: 'Website' }, 'Form');
      f.submissions = (f.submissions || 0) + 1; f.lastAt = now(); save();
      return { ok: true, result: r, thanks: f.thanks };
    }

    async function handle(method, path, body, u) {
      try {
        need(u, 401, 'Please sign in');
        const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
        for (const [m, re, f] of R) {
          if (m !== method) continue; const mt = clean.match(re); if (!mt) continue;
          const out = await f(u, mt.groups || {}, body || {});
          if (method !== 'GET' || /meta|contacts/.test(clean)) save();
          return { status: 200, body: clone(out) };
        }
        return { status: 404, body: { error: 'Not found: ' + method + ' ' + clean } };
      } catch (e) {
        return { status: e.status || 500, body: { error: e.message || 'Server error' } };
      }
    }
    return { handle, db, collect, publicForm, publicSubmit };
  }

  const api = { slugify, createCore, STATUSES, PRIOS, COLORS, ROLES, BUILTIN, uid, digits };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
