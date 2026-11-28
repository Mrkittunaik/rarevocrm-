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
  const okColor = v => COLORS.includes(v) || /^k\d{1,2}$/.test(String(v || ''));
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
    db.sheets.forEach(s => { s.labels = s.labels || {}; s.hidden = s.hidden || []; s.widths = s.widths || {}; s.access = s.access || { view: [], edit: [] }; s.bin = s.bin || []; s.order = s.order || []; });
    { const bySheet = {}; db.rows.forEach(r => { (bySheet[r.sheetId] = bySheet[r.sheetId] || []).push(r); }); for (const k in bySheet) { const list = bySheet[k]; if (list.some(r => r.pos == null)) { list.sort((a, b) => (a.pos ?? 1e15) - (b.pos ?? 1e15) || (a.added || 0) - (b.added || 0)); list.forEach((r, i) => { r.pos = i + 1; }); } } }
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
    const isFull = u => isSuper(u) && !u.limited;
    const SPERMS = ['businesses', 'users', 'audit', 'backup'];
    const sp = (u, perm) => isFull(u) || (isSuper(u) && (u.perms || []).includes(perm));
    const superIn = (u, bid) => isSuper(u) && (!u.limited || !(u.bizIds || []).length || u.bizIds.includes(bid));
    const PPERMS = { add: true, delete: false, upload: false, export: true, reports: true };
    const pp = (u, k) => { const x = (u.perms && typeof u.perms === 'object' && !Array.isArray(u.perms)) ? u.perms : {}; return k in x ? !!x[k] : PPERMS[k]; };
    const canManage = (u, bid) => superIn(u, bid) || (u.role === 'owner' && u.businessId === bid);
    const canSeeBiz = (u, bid) => superIn(u, bid) || u.businessId === bid || (!u.businessId && db.rows.some(r => r.businessId === bid && r.owner === u.id));
    const sheetPerm = (u, sh) => { if (!sh) return 'none'; if (canManage(u, sh.businessId)) return 'edit'; const a = sh.access || {}; if ((a.edit || []).includes(u.id)) return 'edit'; if ((a.view || []).includes(u.id)) return 'view'; return 'none'; };
    const canSeeRow = (u, r) => canManage(u, r.businessId) || r.owner === u.id || sheetPerm(u, sheet(r.sheetId)) !== 'none';
    const canRow = (u, r) => canManage(u, r.businessId) || r.owner === u.id || sheetPerm(u, sheet(r.sheetId)) === 'edit';
    const canAssignTo = (bid, uidv) => !uidv || (() => { const t = userById(uidv); return !!t && (t.role === 'super' || !t.businessId || t.businessId === bid); })();

    const pubUser = u => ({ id: u.id, name: u.name, username: u.username || '', email: u.email || '', role: u.role, businessId: u.businessId || '', createdAt: u.createdAt, lastLogin: u.lastLogin || null, mustChange: !!u.mustChange, disabled: !!u.disabled, limited: !!u.limited, bizIds: u.bizIds || [], perms: u.perms || (u.role === 'staff' ? { ...PPERMS } : []) });
    function setPerms(u, t, b) {
      if (t.role === 'super') {
        if (b.limited !== undefined || b.perms !== undefined || b.bizIds !== undefined) need(isFull(u), 403, 'Only the main system admin can change admin permissions');
        if (b.limited !== undefined) { need(!(b.limited && t.id === u.id), 400, 'You cannot limit yourself'); t.limited = !!b.limited; }
        if (Array.isArray(b.perms)) t.perms = b.perms.filter(x => SPERMS.includes(x));
        if (Array.isArray(b.bizIds)) t.bizIds = b.bizIds.filter(id => biz(id));
        if (!t.limited) { delete t.perms; delete t.bizIds; }
        need(db.users.some(x => x.role === 'super' && !x.limited && !x.disabled), 400, 'Keep at least one full system admin');
      } else if (t.role === 'staff' && b.perms && typeof b.perms === 'object' && !Array.isArray(b.perms)) { t.perms = {}; for (const k in PPERMS) t.perms[k] = b.perms[k] === undefined ? PPERMS[k] : !!b.perms[k]; }
      else if (t.role !== 'staff') delete t.perms;
    }
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
        color: okColor(d.color) ? d.color : '', owner: '',
        added: parseTime(d.added) || now(), followUp: parseTime(d.followUp), closed: parseTime(d.closed),
        price: num(d.price), notes: String(d.notes || ''), data: {}, ref: d.ref || '', log: [], updated: now(),
        pos: db.rows.reduce((m, x) => x.sheetId === sh.id && x.pos > m ? x.pos : m, 0) + 1
      };
      if (d.wa && typeof d.wa === 'object') r.wa = { msg: String(d.wa.msg || ''), at: d.wa.at || null, auto: String(d.wa.auto || '') };
      if (d.fmt && typeof d.fmt === 'object') { r.fmt = {}; for (const ck in d.fmt) { const o = cleanFmt(d.fmt[ck]); if (o) r.fmt[ck] = o; } }
      if (canManage(u, sh.businessId)) r.owner = ownerFrom(d.owner, sh.businessId) || (d.owner === undefined || d.owner === '' ? autoOwner(b) : '');
      else r.owner = u.id;
      if (d.data && typeof d.data === 'object') for (const k in d.data) if (sh.columns.some(c => c.id === k)) r.data[k] = d.data[k];
      if (!['Won', 'Lost'].includes(r.status)) r.closed = null; else if (!r.closed) r.closed = now();
      log(r, u, `Added to ${sh.name} (${r.source})` + (r.owner ? ' → ' + uname(r.owner) : ''));
      try { applyRules(r, 'new'); } catch (e) {}
      return r;
    }

    const HEX = /^#[0-9a-f]{6}$/i;
    function cleanFmt(f) {
      f = f || {}; const o = { b: !!f.b, i: !!f.i, c: COLORS.includes(f.c) ? f.c : '' };
      if (f.u) o.u = true; if (['l', 'c', 'r'].includes(f.a)) o.a = f.a;
      if (HEX.test(f.bg || '') && !/^#ffffff$/i.test(f.bg)) o.bg = f.bg.toLowerCase();
      if (HEX.test(f.fg || '') && !/^#000000$/i.test(f.fg)) o.fg = f.fg.toLowerCase();
      return (o.b || o.i || o.c || o.bg || o.fg || o.u || o.a) ? o : null;
    }
    // ---------- automation rules ----------
    const SRC_OF = r => { const s = String(r.source || '').toLowerCase(); if (s.includes('whatsapp')) return 'whatsapp'; if (/meta|facebook|instagram|\bfb\b|\big\b/.test(s)) return 'meta'; if (/website|form|web|landing/.test(s)) return 'web'; if (!s || s === 'manual') return 'manual'; return 'sheet'; };
    function cleanRules(x, list) {
      return list.slice(0, 50).map(q => ({
        id: String(q.id || uid()), on: q.on !== false, name: String(q.name || 'Rule').slice(0, 80),
        trigger: ['new', 'status'].includes(q.trigger) ? q.trigger : 'new', src: ['any', 'whatsapp', 'web', 'meta', 'sheet', 'manual'].includes(q.src) ? q.src : 'any',
        statusIs: normStatus(q.statusIs) || '', field: String(q.field || '').slice(0, 60), contains: String(q.contains || '').slice(0, 120), inSheet: sheet(q.inSheet) && sheet(q.inSheet).businessId === x.id ? q.inSheet : '',
        act: { sheet: sheet((q.act || {}).sheet) && sheet(q.act.sheet).businessId === x.id ? q.act.sheet : '', owner: canAssignTo(x.id, (q.act || {}).owner) && (q.act || {}).owner ? q.act.owner : ((q.act || {}).owner === 'round' ? 'round' : ''), status: normStatus((q.act || {}).status) || '', priority: normPrio((q.act || {}).priority) || '', color: okColor((q.act || {}).color) ? q.act.color : '', fuHours: Math.max(0, Math.min(24 * 60, +(q.act || {}).fuHours || 0)), note: String((q.act || {}).note || '').slice(0, 200) }
      }));
    }
    function fieldVal(r, f) {
      const k = String(f || '').toLowerCase(); if (!k) return [r.name, r.phone, r.email, r.notes, r.source, r.wa && r.wa.msg, r.wa && r.wa.auto, ...Object.values(r.data || {})].join(' ');
      if (k === 'message' || k === 'whatsapp') return r.wa ? r.wa.msg || '' : ''; if (k === 'automation') return r.wa ? r.wa.auto || '' : '';
      if (['name', 'phone', 'email', 'notes', 'source', 'status', 'priority'].includes(k)) return r[k] || '';
      const sh = sheet(r.sheetId), c = sh && sh.columns.find(x => x.name.toLowerCase() === k); return c ? (r.data || {})[c.id] || '' : '';
    }
    function applyRules(r, trig) {
      const b = biz(r.businessId); if (!b || !Array.isArray(b.rules) || !b.rules.length) return;
      r.auto = r.auto || [];
      for (const q of b.rules) {
        if (!q.on || q.trigger !== trig) continue;
        const key = q.id + ':' + trig + (trig === 'status' ? ':' + r.status : '');
        if (r.auto.includes(key)) continue;   // never run the same rule twice on the same record
        if (q.src !== 'any' && SRC_OF(r) !== q.src) continue;
        if (q.inSheet && r.sheetId !== q.inSheet) continue;
        if (trig === 'status' && q.statusIs && r.status !== q.statusIs) continue;
        if (q.contains && !String(fieldVal(r, q.field)).toLowerCase().includes(q.contains.toLowerCase())) continue;
        const a = q.act, done = [];
        if (a.sheet && a.sheet !== r.sheetId) { r.sheetId = a.sheet; done.push('moved to ' + (sheet(a.sheet) || {}).name); }
        if (a.owner) { const o = a.owner === 'round' ? autoOwner(b) : a.owner; if (o && o !== r.owner) { r.owner = o; done.push('assigned to ' + uname(o)); } }
        if (a.status && a.status !== r.status) { r.status = a.status; done.push('status ' + a.status); }
        if (a.priority) { r.priority = a.priority; done.push('priority ' + a.priority); }
        if (a.color) { r.color = a.color; done.push('colour'); }
        if (a.fuHours) { r.followUp = now() + a.fuHours * 36e5; done.push('follow-up in ' + a.fuHours + 'h'); }
        if (a.note) { r.notes = r.notes ? r.notes + ' · ' + a.note : a.note; }
        r.auto.push(key); r.auto = r.auto.slice(-40);
        log(r, { name: 'Automation' }, `Rule “${q.name}”: ${done.join(', ') || 'ran'}`);
        b.autoLog = b.autoLog || []; b.autoLog.unshift({ at: now(), rule: q.name, rid: r.id, who: r.name || r.phone || '', did: done.join(', ') }); b.autoLog = b.autoLog.slice(0, 300);
      }
    }
    function patchRow(r, p, u) {
      const sh = sheet(r.sheetId);
      for (const k of Object.keys(p)) {
        const v = p[k];
        if (k === 'data') { for (const c in v) if (sh && sh.columns.some(x => x.id === c)) r.data[c] = v[c]; continue; }
        if (k === 'owner') { if (!canManage(u, r.businessId)) continue; if (!canAssignTo(r.businessId, v)) throw E(400, 'That person is not part of this business'); if (r.owner !== v) { r.owner = v || ''; log(r, u, 'Assigned to ' + uname(r.owner)); } continue; }
        if (k === 'status') { const s = normStatus(v); if (!s || s === r.status) continue; log(r, u, `Status: ${r.status} → ${s}`); r.status = s; if (['Won', 'Lost'].includes(s)) { if (!r.closed) r.closed = now(); r.followUp = null; } else r.closed = null; try { applyRules(r, 'status'); } catch (e) {} continue; }
        if (k === 'followUp') { r.followUp = parseTime(v); log(r, u, r.followUp ? 'Follow-up set: ' + new Date(r.followUp).toLocaleString('en-IN') : 'Follow-up cleared'); continue; }
        if (k === 'closed' || k === 'added') { r[k] = parseTime(v); continue; }
        if (k === 'price') { r.price = num(v); if (r.price != null) log(r, u, 'Sale price: ' + r.price); continue; }
        if (k === 'priority') { r.priority = normPrio(v) || r.priority; continue; }
        if (k === 'color') { r.color = okColor(v) ? v : ''; continue; }
        if (k === 'sheetId') { const t = sheet(v); if (t && t.businessId === r.businessId && t.id !== r.sheetId) { log(r, u, `Moved from ${sh ? sh.name : '?'} to ${t.name}`); r.sheetId = t.id; } continue; }
        if (k === 'note') { log(r, u, String(v)); continue; }
        if (k === 'fuDone') { if (v) { r.fuDone = now(); r.fuDoneBy = u.name; } continue; }
        if (k === 'pos') { const n = Number(v); if (isFinite(n)) r.pos = n; continue; }
        if (k === 'h') { const n = Number(v); r.h = v == null || v === '' || !isFinite(n) ? null : Math.max(24, Math.min(400, Math.round(n))); continue; }
        if (k === 'fmt' && v && typeof v === 'object') { r.fmt = r.fmt || {}; for (const ck in v) { const o = cleanFmt(v[ck]); if (!o) delete r.fmt[ck]; else r.fmt[ck] = o; } continue; }
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
    function syncLog(b, kind, ok, msg, extra) { b.syncs = b.syncs || []; b.syncs.unshift({ at: now(), kind, ok: !!ok, msg: String(msg || '').slice(0, 300), ...(extra || {}) }); b.syncs = b.syncs.slice(0, 150); }
    async function guard(b, key, fn) {
      const kind = key === 'rarevo' ? 'WhatsApp' : key === 'meta' ? 'Meta' : key;
      try { const r = await fn(); b[key].status = 'ok'; b[key].error = ''; b[key].lastSync = now(); syncLog(b, kind, true, r && r.count != null ? `${r.count} contacts · ${r.added || 0} new · ${r.updated || 0} updated${r.failed ? ' · ' + r.failed + ' failed' : ''}` : (r && r.imported != null ? `${r.imported} leads imported` : 'OK'), { added: (r && r.added) || 0, failed: (r && r.failed) || 0 }); return r; }
      catch (e) { if (e.status) throw e; b[key].status = 'error'; b[key].error = e.message; syncLog(b, kind, false, e.message); save(); throw E(502, e.message); }
    }

    /* ---------------- routes ---------------- */
    const R = [];
    const on = (m, p, f) => R.push([m, new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), f]);
    const superOnly = u => need(isFull(u), 403, 'Only the main system admin can do this');
    const superPerm = (u, perm) => need(sp(u, perm), 403, 'You do not have permission for this — ask the main system admin');
    const manage = (u, bid) => { need(biz(bid), 404, 'Business not found'); need(canManage(u, bid), 403, 'Only the business admin can do this'); return biz(bid); };
    const see = (u, bid) => { need(biz(bid), 404, 'Business not found'); need(canSeeBiz(u, bid), 403, 'You do not have access to this business'); return biz(bid); };

    on('GET', '/bootstrap', u => {
      const bizs = db.businesses.filter(b => canSeeBiz(u, b.id)), ids = new Set(bizs.map(b => b.id));
      const users = isFull(u) ? db.users : isSuper(u) ? db.users.filter(x => x.role === 'super' || ids.has(x.businessId) || x.id === u.id) : db.users.filter(x => x.id === u.id || (u.businessId && x.businessId === u.businessId) || (!x.businessId && x.role === 'staff' && db.rows.some(r => ids.has(r.businessId) && r.owner === x.id)));
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
      need(isSuper(u) || u.role === 'owner', 403, 'Only admins can add people'); if (isSuper(u)) superPerm(u, 'users');
      need(String(b.name || '').trim(), 400, 'Name is required');
      let role = ROLES.includes(b.role) ? b.role : 'staff', businessId = String(b.businessId || '');
      if (!isSuper(u)) { if (role === 'super') role = 'owner'; businessId = u.businessId; }
      if (role === 'super') { need(isFull(u), 403, 'Only the main system admin can add RAREVO team logins'); businessId = ''; }
      if (isSuper(u) && businessId) need(superIn(u, businessId), 403, 'You do not have access to that business');
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
      x.mustChange = true;
      db.users.push(x); setPerms(u, x, b);
      if (role === 'staff' && businessId) { const bb = biz(businessId); bb.assign = bb.assign || { mode: 'round', pool: [], idx: 0 }; bb.assign.pool = [...new Set([...(bb.assign.pool || []), x.id])]; }
      return pubUser(x);
    });
    const canEditUser = (u, t) => isFull(u) || t.id === u.id || (isSuper(u) && sp(u, 'users') && t.role !== 'super' && (!t.businessId || superIn(u, t.businessId))) || (u.role === 'owner' && t.businessId === u.businessId && t.role !== 'super');
    on('PUT', '/users/:id', async (u, p, b) => {
      const t = userById(p.id); need(t, 404, 'User not found'); need(canEditUser(u, t), 403, 'You cannot change this person');
      if (b.name) t.name = String(b.name).trim();
      if (b.email !== undefined) { const l = String(b.email).trim().toLowerCase(); if (l) need(!db.users.some(x => x.id !== t.id && (String(x.email || '').toLowerCase() === l || x.username === l)), 400, 'That email is already used'); t.email = l; }
      if (b.username) { const l = String(b.username).trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''); need(l && !db.users.some(x => x.id !== t.id && (x.username === l || String(x.email || '').toLowerCase() === l)), 400, 'That username is already used'); t.username = l; }
      if (b.phone !== undefined) t.phone = String(b.phone || '');
      if (b.role && t.id !== u.id && ROLES.includes(b.role)) { if (b.role === 'super') { superOnly(u); t.businessId = ''; } t.role = b.role; }
      if (isSuper(u) && b.businessId !== undefined && t.role !== 'super') { need(!b.businessId || biz(b.businessId), 400, 'Business not found'); t.businessId = b.businessId || ''; }
      if (t.role === 'owner') need(t.businessId, 400, 'A business admin needs a business');
      if (b.password) { need(String(b.password).length >= 6, 400, 'Password must be at least 6 characters'); if (hash) t.password = await hash(b.password); t.mustChange = t.id !== u.id; }
      if (b.disabled !== undefined) { need(t.id !== u.id, 400, 'You cannot block yourself'); t.disabled = !!b.disabled; }
      setPerms(u, t, b);
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
      superPerm(u, 'businesses'); need(b && String(b.name || '').trim(), 400, 'Business name is required');
      const x = { id: uid(), slug: '', masterAccess: { view: [] }, name: String(b.name).trim(), industry: b.industry || '', phone: b.phone || '', status: b.status || 'active', color: b.color || '#dc2626', currency: b.currency || 'INR',
        meetEmails: b.meetEmails || '', colorLabels: { red: 'Hot', orange: 'Urgent', yellow: 'Waiting', green: 'Ready to close', blue: 'Info sent', purple: 'VIP' },
        assign: { mode: 'round', pool: [], idx: 0 }, rarevo: null, meta: null, web: { key: newKey(), sheetId: '', enabled: true, count: 0, lastAt: null }, createdAt: now() };
      x.slug = uniqueSlug(b.slug || x.name, x.id);
      db.businesses.push(x); if (u.limited && (u.bizIds || []).length) u.bizIds.push(x.id);
      const sh = { id: uid(), businessId: x.id, name: 'Sheet 1', category: 'General', columns: [], labels: {}, hidden: [], widths: {}, order: [], bin: [], access: { view: [], edit: [] }, source: 'manual', createdAt: now(), updated: now() };
      db.sheets.push(sh);
      return { business: pubBiz(x), sheet: sh };
    });
    on('PUT', '/businesses/:id', (u, p, b) => {
      const x = manage(u, p.id);
      for (const k of ['name', 'industry', 'color', 'currency', 'meetEmails', 'colorLabels', 'colorHex', 'assign', 'phone']) if (b[k] !== undefined) x[k] = b[k];
      if (b.status !== undefined && sp(u, 'businesses')) x.status = b.status;
      if (Array.isArray(b.rules) && canManage(u, x.id)) x.rules = cleanRules(x, b.rules);
      if (b.slug !== undefined && sp(u, 'businesses') && String(b.slug).trim()) x.slug = uniqueSlug(b.slug, x.id);
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
        const auto = x.waAuto !== false ? waAuto(x, list) : { added: 0, updated: 0 };
        return { count: list.length, ...auto };
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
    const cleanCols = cols => cols.map(c => ({ id: c.id || 'c' + uid(), name: String(c.name || '').trim() || 'Column', type: ['text', 'number', 'date', 'select', 'multi', 'yesno', 'check'].includes(c.type) ? c.type : 'text', options: Array.isArray(c.options) ? c.options.map(String) : [] }));
    on('POST', '/sheets', (u, p, b) => {
      manage(u, b.businessId);
      const sh = { id: uid(), businessId: b.businessId, name: String(b.name || 'Untitled sheet').trim(), category: String(b.category || 'General').trim() || 'General', columns: cleanCols(b.columns || []), labels: {}, hidden: [], widths: {}, order: [], bin: [], access: { view: [], edit: [] }, source: b.source || 'manual', createdAt: now(), updated: now() };
      db.sheets.push(sh); return sh;
    });
    on('PUT', '/sheets/:id', (u, p, b) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      if (b.name !== undefined) sh.name = String(b.name).trim() || sh.name;
      if (b.category !== undefined) sh.category = String(b.category).trim() || 'General';
      if (Array.isArray(b.columns)) sh.columns = cleanCols(b.columns);
      if (b.labels && typeof b.labels === 'object') { sh.labels = {}; for (const k of BUILTIN) if (b.labels[k] && String(b.labels[k]).trim()) sh.labels[k] = String(b.labels[k]).trim(); }
      if (Array.isArray(b.hidden)) sh.hidden = b.hidden.filter(k => BUILTIN.includes(k) && k !== 'name');
      if (Array.isArray(b.order)) sh.order = b.order.map(String).slice(0, 300);
      if (b.cellv && typeof b.cellv === 'object') { sh.cellv = sh.cellv || {}; for (const k in b.cellv) { const x = b.cellv[k]; if (!x) { delete sh.cellv[k]; continue; } if (!['select', 'yesno', 'multi'].includes(x.type)) continue; sh.cellv[String(k).slice(0, 80)] = { type: x.type, options: Array.isArray(x.options) ? x.options.map(String).slice(0, 100) : [] }; } }
      if (b.widths && typeof b.widths === 'object') { sh.widths = sh.widths || {}; for (const k in b.widths) { const w = Math.round(+b.widths[k]); if (w >= 40 && w <= 900) sh.widths[k] = w; } }
      sh.updated = now(); return sh;
    });
    on('DELETE', '/sheets/:id', (u, p) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      need(db.sheets.filter(s => s.businessId === sh.businessId).length > 1, 400, 'A business needs at least one sheet');
      db.sheets = db.sheets.filter(s => s.id !== sh.id); db.rows = db.rows.filter(r => r.sheetId !== sh.id); if (db.snaps) delete db.snaps[sh.id]; return { ok: true };
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

    // WhatsApp contacts -> master sheet (a "WhatsApp" sheet), matched by phone
    function waAuto(b, list) {
      let sh = db.sheets.find(s => s.businessId === b.id && s.source === 'whatsapp');
      if (!sh) { sh = { id: uid(), businessId: b.id, name: 'WhatsApp', category: 'WhatsApp', columns: [], labels: {}, hidden: [], widths: {}, order: [], bin: [], access: { view: [], edit: [] }, source: 'whatsapp', createdAt: now(), updated: now() }; db.sheets.push(sh); }
      const byPhone = new Map(); db.rows.forEach(r => { if (r.sheetId === sh.id || (r.businessId === b.id && String(r.ref || '').startsWith('wa:'))) { const d = digits(r.phone); if (d && !byPhone.has(d)) byPhone.set(d, r); } });
      let added = 0, updated = 0; const failed = [];
      const dm = dupeConf(b);
      for (const c of list) {
        try {
          const d = digits(c.number); if (!d) { failed.push({ c, err: 'No phone number' }); continue; }
          let ex = byPhone.get(d);
          if (!ex && dm.match.includes('phone')) ex = db.rows.find(r => r.businessId === b.id && digits(r.phone) === d) || null;
          const wa = { msg: c.lastMessage || '', at: c.lastAt || null, auto: c.automation || c.flow || c.automationName || '' };
          if (ex && dm.mode !== 'new') {
            if (!ex.wa || ex.wa.at !== wa.at || ex.wa.msg !== wa.msg || (!ex.name && c.name)) {
              if (ex.wa && ex.wa.msg && ex.wa.at !== wa.at) log(ex, WEB_SYS, 'Earlier WhatsApp message: ' + String(ex.wa.msg).slice(0, 200));
              ex.wa = wa; if ((!ex.name || ex.name === ex.phone) && c.name) ex.name = c.name; ex.updated = now(); updated++;
            }
            continue;
          }
          const r = makeRow(sh, { name: c.name || '', phone: c.number, source: 'WhatsApp', added: c.firstAt || c.lastAt || null, ref: 'wa:' + d, wa }, WEB_SYS);
          db.rows.push(r); byPhone.set(d, r); added++;
        } catch (e) { failed.push({ c, err: e.message }); }
      }
      b.waFailed = failed.slice(0, 500).map(f => ({ number: f.c.number || '', name: f.c.name || '', lastMessage: f.c.lastMessage || '', lastAt: f.c.lastAt || null, err: f.err, at: now() }));
      sh.updated = now();
      return { added, updated, failed: failed.length };
    }
    const WEB_SYS = { id: 'system', name: 'WhatsApp sync', role: 'super', businessId: '' };
    on('POST', '/businesses/:id/rarevo/retry', (u, p) => {
      const x = manage(u, p.id); const list = (x.waFailed || []).map(f => ({ number: f.number, name: f.name, lastMessage: f.lastMessage, lastAt: f.lastAt }));
      need(list.length, 400, 'No failed records to retry');
      const r = waAuto(x, list); syncLog(x, 'WhatsApp retry', !r.failed, `${r.added} added · ${r.updated} updated · ${r.failed} still failing`);
      return { ...r, business: pubBiz(x) };
    });
    on('PUT', '/businesses/:id/wa-auto', (u, p, b) => { const x = manage(u, p.id); x.waAuto = !!b.on; return pubBiz(x); });

    // categories
    on('POST', '/businesses/:id/sheet-order', (u, p, b) => {
      const x = manage(u, p.id); const ids = Array.isArray(b.ids) ? b.ids.map(String) : [];
      db.sheets.filter(s => s.businessId === x.id).forEach(s => { const i = ids.indexOf(s.id); s.tab = i < 0 ? 9999 : i; });
      return { sheets: db.sheets.filter(s => s.businessId === x.id) };
    });
    on('POST', '/businesses/:id/categories', (u, p, b) => {
      const x = manage(u, p.id); const from = String(b.from || '').trim(), to = String(b.to || '').trim() || 'General';
      need(from, 400, 'Choose a category');
      const list = db.sheets.filter(s => s.businessId === x.id && s.category === from);
      list.forEach(s => { s.category = to; s.updated = now(); });
      return { sheets: db.sheets.filter(s => s.businessId === x.id), moved: list.length };
    });

    // column tools: clear / delete (to bin) / restore
    const CLEARABLE = ['name', 'phone', 'email', 'notes', 'price', 'followUp', 'closed'];
    on('POST', '/sheets/:id/column', (u, p, b) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      const rows = db.rows.filter(r => r.sheetId === sh.id), key = String(b.key || '');
      const custom = key.startsWith('d:') ? sh.columns.find(c => c.id === key.slice(2)) : null;
      const label = custom ? custom.name : ((sh.labels || {})[key] || key);
      sh.bin = sh.bin || [];
      if (b.action === 'clear') {
        need(custom || CLEARABLE.includes(key), 400, 'This column cannot be cleared');
        const values = {};
        rows.forEach(r => { const v = custom ? r.data[custom.id] : r[key]; if (v != null && v !== '') { values[r.id] = v; if (custom) delete r.data[custom.id]; else r[key] = key === 'name' || key === 'phone' || key === 'email' || key === 'notes' ? '' : null; r.updated = now(); } });
        sh.bin.unshift({ id: uid(), type: 'clear', key, label, at: now(), by: u.name, values, count: Object.keys(values).length });
      } else if (b.action === 'delete') {
        if (custom) {
          const values = {}; rows.forEach(r => { if (r.data[custom.id] != null && r.data[custom.id] !== '') values[r.id] = r.data[custom.id]; delete r.data[custom.id]; });
          sh.columns = sh.columns.filter(c => c.id !== custom.id); sh.order = (sh.order || []).filter(k => k !== key);
          sh.bin.unshift({ id: uid(), type: 'column', key, label, col: custom, at: now(), by: u.name, values, count: Object.keys(values).length });
        } else {
          need(key !== 'name' && BUILTIN.includes(key), 400, 'This column cannot be deleted');
          sh.hidden = [...new Set([...(sh.hidden || []), key])];
          sh.bin.unshift({ id: uid(), type: 'hide', key, label, at: now(), by: u.name, count: 0 });
        }
      } else if (b.action === 'restore') {
        const e = sh.bin.find(x => x.id === b.binId); need(e, 404, 'Nothing to restore');
        if (e.type === 'column') { if (!sh.columns.some(c => c.id === e.col.id)) sh.columns.push(e.col); }
        if (e.type === 'hide') sh.hidden = (sh.hidden || []).filter(k => k !== e.key);
        if (e.type === 'clear' || e.type === 'column') {
          const cid = e.type === 'column' ? e.col.id : (e.key.startsWith('d:') ? e.key.slice(2) : null);
          for (const id in e.values || {}) { const r = db.rows.find(x => x.id === id); if (!r) continue; if (cid) r.data[cid] = e.values[id]; else r[e.key] = e.values[id]; }
        }
        sh.bin = sh.bin.filter(x => x.id !== e.id);
      } else throw E(400, 'Unknown action');
      sh.bin = sh.bin.slice(0, 30); sh.updated = now();
      return { sheet: sh, rows };
    });

    // many cell edits at once (paste, fill down, clear range, undo/redo)
    on('POST', '/rows/cells', (u, p, b) => {
      const out = [];
      for (const ch of (b.changes || []).slice(0, 20000)) { const r = row(ch.id); if (!r || !canRow(u, r)) continue; patchRow(r, ch.patch || {}, u); out.push(r); }
      return { rows: out };
    });


    // ---------- live sheets: Google Sheets / any CSV link (pull) + Apps Script / Excel script (push) ----------
    const HEAD_RE = /name|phone|mobile|whats|email|e-mail|status|source|date|city|contact|number|lead|customer|client|remark|follow|price|amount|stage|poc|owner/i;
    const JUNK_RE2 = /^(total|grand total|sub ?total|auto-?calculated|summary|numbers reached|note[:\s]|remarks?:)/i;
    const GUESS = [['name', /first.?name/i], ['name2', /last.?name|surname/i], ['name', /^(name|full.?name|customer|client|lead.?name|contact.?name|customer.?name|client.?name)$/i], ['phone', /phone|mobile|whats|contact.?(no|num)|^number$|cell/i], ['email', /e-?mail/i], ['source', /source|platform|channel/i], ['status', /status|stage/i], ['priority', /priority/i], ['owner', /assign|poc|owner|agent|executive|sales.?person/i], ['followUp', /follow/i], ['closed', /clos/i], ['added', /^date$|created|added|enquiry.?date|lead.?date|timestamp|submitted/i], ['price', /price|amount|value|deal|revenue|sale/i], ['notes', /note|remark|comment|message|requirement/i], ['name', /name/i]];
    function parseCsvText(text) {
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
      return out;
    }
    function liveUrl(url) {
      url = String(url || '').trim(); need(/^https:\/\//i.test(url), 400, 'Paste a link that starts with https://');
      let m;
      if ((m = url.match(/docs\.google\.com\/spreadsheets\/d\/e\/([\w-]+)/))) { const g = (url.match(/[#&?]gid=(\d+)/) || [])[1]; return `https://docs.google.com/spreadsheets/d/e/${m[1]}/pub?output=csv${g ? '&gid=' + g : ''}`; }
      if ((m = url.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/))) { const g = (url.match(/[#&?]gid=(\d+)/) || [])[1]; return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${g ? '&gid=' + g : ''}`; }
      return url;
    }
    // matrix = rows of cell text (first rows may be titles); bg = same-shaped matrix of '#rrggbb' (optional)
    function liveIngest(u, sh, matrix, bg, guardFn) {
      const keepIdx = []; matrix.forEach((r, i) => { if (Array.isArray(r) && r.some(x => String(x ?? '').trim())) keepIdx.push(i); });
      const raw = keepIdx.map(i => matrix[i].map(x => String(x ?? ''))), bgs = keepIdx.map(i => (Array.isArray(bg) && Array.isArray(bg[i])) ? bg[i] : []);
      need(raw.length >= 2, 400, 'The sheet is empty or has only a heading row');
      let hrow = 0, bs = -1;
      raw.slice(0, 15).forEach((r, i) => { const cells = r.map(x => x.trim()).filter(Boolean); if (!cells.length) return; const txt = cells.filter(x => !/^[\d\s.,:/+-]+$/.test(x)).length, kw = cells.filter(x => HEAD_RE.test(x) && x.length < 40).length; const sc = kw * 3 + txt - (cells.length === 1 ? 5 : 0); if (sc > bs) { bs = sc; hrow = i; } });
      const w = Math.max(...raw.slice(hrow, hrow + 50).map(r => r.length));
      const headers = [...Array(w)].map((_, i) => String(raw[hrow][i] ?? '').trim() || 'Column ' + (i + 1));
      const body = [], bodyBg = [];
      raw.slice(hrow + 1).forEach((r, i) => {
        const cells = r.map(x => x.trim()), first = cells.find(Boolean) || '';
        const contact = cells.some(x => { const n = x.replace(/\D/g, '').length; return n >= 7 && n <= 15 && /^[\d\s+()-]+$/.test(x); }) || cells.some(x => /@.+\./.test(x));
        if (!contact && (JUNK_RE2.test(first) || cells.every((x, j) => !x || x.toLowerCase() === String(headers[j] || '').toLowerCase()) || (cells.filter(Boolean).length === 1 && first.length > 25))) return;
        body.push(cells); bodyBg.push(bgs[hrow + 1 + i] || []);
      });
      const keep = headers.map((h, i) => body.some(r => r[i]) || !/^Column \d+$/.test(h));
      const map = (sh.live && sh.live.map) || {}, used = new Set();
      const target = headers.map(h => { if (map[h]) return map[h]; for (const [t, re] of GUESS) if (re.test(h) && !used.has(t)) { used.add(t); return t; } return 'column'; });
      const heads = headers.map((h, j) => ({ name: h, target: keep[j] ? target[j] : 'skip' }));
      const rows = body.map((r, i) => {
        const o = { source: 'Live sheet', cols: {}, fmt: {} };
        headers.forEach((h, j) => { const t = heads[j].target, x = r[j] || ''; if (t === 'skip') return; const key = t === 'column' ? 'col:' + h : t === 'name2' ? 'name' : t; const c = String(bodyBg[i][j] || ''); if (/^#[0-9a-f]{6}$/i.test(c) && !/^#ffffff$/i.test(c)) o.fmt[key] = { bg: c }; if (x === '') return; if (t === 'column') o.cols[h] = x; else if (t === 'name2') o.name = ((o.name || '') + ' ' + x).trim(); else if (t === 'notes') o.notes = o.notes ? o.notes + ' · ' + x : x; else o[t] = x; });
        return o;
      }).filter(o => o.name || o.phone || o.email || Object.keys(o.cols).length);
      if (guardFn) rows.forEach(guardFn);
      const sig = JSON.stringify([heads, rows]); let hsh = 0; for (let i = 0; i < sig.length; i++) hsh = (hsh * 31 + sig.charCodeAt(i)) | 0;
      sh.live = sh.live || {};
      if (sh.live.hash === hsh && db.rows.some(r => r.sheetId === sh.id)) { sh.live.lastAt = now(); sh.live.status = 'ok'; sh.live.msg = 'No changes'; return { unchanged: true, sheet: sh }; }
      const out = syncSheet(u, sh, { mode: sh.live.mode || 'replace', heads, rows, file: 'Live sheet' });
      sh.live.hash = hsh; sh.live.lastAt = now(); sh.live.status = 'ok'; sh.live.msg = `${out.summary.added} added · ${out.summary.updated} updated · ${out.summary.remove} removed`;
      { const bb = biz(sh.businessId); if (bb) syncLog(bb, 'Live sheet · ' + sh.name, true, sh.live.msg, { added: out.summary.added }); }
      return out;
    }
    async function livePull(u, sh) {
      need(sh.live && sh.live.url, 400, 'No live sheet link saved yet');
      try {
        const res = await fetch(liveUrl(sh.live.url), { redirect: 'follow', headers: { 'User-Agent': 'RAREVO-CRM' } });
        if (!res.ok) throw E(400, res.status === 401 || res.status === 403 || res.status === 404 ? 'Could not open the sheet. In Google Sheets: Share → General access → "Anyone with the link" → Viewer.' : 'The sheet link answered ' + res.status);
        const buf = await res.arrayBuffer(), u8 = new Uint8Array(buf);
        if (u8[0] === 0x50 && u8[1] === 0x4b) throw E(400, 'This link downloads an Excel file. For Excel, use the "Excel (Office Script)" push option below, or open the file in Google Sheets and use that link.');
        const text = new TextDecoder('utf-8').decode(buf);
        if (/^\s*<(!doctype|html)/i.test(text)) throw E(400, 'The link opened a web page, not the sheet data. Make the sheet viewable by "Anyone with the link".');
        return liveIngest(u, sh, parseCsvText(text));
      } catch (e) { if (!e.status) e = E(400, 'Could not reach the sheet link (' + e.message + '). Check the link and that it is shared as "Anyone with the link".'); sh.live.status = 'error'; sh.live.msg = e.message; sh.live.lastAt = now(); { const bb = biz(sh.businessId); if (bb) syncLog(bb, 'Live sheet · ' + sh.name, false, e.message); } throw e; }
    }
    on('PUT', '/sheets/:id/live', (u, p, b) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      sh.live = sh.live || {};
      if (b.url !== undefined) { const url = String(b.url || '').trim(); if (url) liveUrl(url); sh.live.url = url; sh.live.hash = 0; }
      if (b.mode !== undefined) sh.live.mode = ['replace', 'update', 'add'].includes(b.mode) ? b.mode : 'replace';
      if (b.on !== undefined) sh.live.on = !!b.on;
      if (b.map && typeof b.map === 'object') { sh.live.map = {}; for (const k in b.map) sh.live.map[String(k)] = String(b.map[k]); }
      if (!sh.live.token || b.newToken) sh.live.token = uid() + uid() + uid();
      if (!sh.live.mode) sh.live.mode = 'replace';
      return sh;
    });
    on('POST', '/sheets/:id/live/sync', async (u, p) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      const out = await livePull(u, sh); return { ...out, sheet: sh, rows: db.rows.filter(r => r.sheetId === sh.id) };
    });
    const LIVE_USER = { id: 'system', name: 'Live sheet', role: 'super', businessId: '' };
    async function liveHook(token, body) {
      const sh = db.sheets.find(s => s.live && s.live.token && s.live.token === token); need(sh, 404, 'Unknown live sheet link');
      let out;
      if (body && Array.isArray(body.rows)) {
        need(body.rows.length <= 50001, 400, 'Too many rows');
        try { out = liveIngest(LIVE_USER, sh, body.rows, body.bg); } catch (e) { sh.live.status = 'error'; sh.live.msg = e.message; sh.live.lastAt = now(); save(); throw e; }
      } else out = await livePull(LIVE_USER, sh);
      sh.live.pushAt = now(); save();
      return { ok: true, unchanged: !!out.unchanged, summary: out.summary || null };
    }

    // ---------- Microsoft Excel (OneDrive / SharePoint) two-way sync via Microsoft Graph ----------
    const MS = opt.ms || {}, GRAPH = 'https://graph.microsoft.com/v1.0';
    const CRM_COLS = [['status', 'Status'], ['priority', 'Priority'], ['owner', 'POC'], ['followUp', 'Next follow-up'], ['notes', 'Notes']];
    const msReady = () => !!(MS.id && MS.secret);
    async function msToken(sh) {
      const m = sh.ms; need(m && m.refresh, 400, 'Connect your Microsoft account first');
      if (m.access && m.exp > now() + 60000) return m.access;
      const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: MS.id, client_secret: MS.secret, grant_type: 'refresh_token', refresh_token: m.refresh, scope: 'offline_access Files.ReadWrite.All User.Read' }) });
      const j = await r.json(); if (!r.ok) { m.status = 'error'; m.msg = 'Microsoft login expired — connect again'; throw E(400, m.msg + ' (' + (j.error_description || j.error || r.status) + ')'); }
      m.access = j.access_token; m.exp = now() + (j.expires_in || 3600) * 1000; if (j.refresh_token) m.refresh = j.refresh_token; return m.access;
    }
    async function graph(sh, path, init) {
      const t = await msToken(sh), r = await fetch(path.startsWith('http') ? path : GRAPH + path, { ...(init || {}), headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json', ...((init || {}).headers || {}) } });
      const txt = await r.text(); let j = {}; try { j = txt ? JSON.parse(txt) : {}; } catch (e) {}
      if (!r.ok) throw E(400, 'Excel: ' + ((j.error && j.error.message) || r.status));
      return j;
    }
    const b64u = s2 => { const bytes = new TextEncoder().encode(s2); let bin = ''; bytes.forEach(x => { bin += String.fromCharCode(x); }); return btoa(bin).replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-'); };
    const colName = n => { let s2 = ''; n++; while (n > 0) { const m = (n - 1) % 26; s2 = String.fromCharCode(65 + m) + s2; n = Math.floor((n - 1) / 26); } return s2; };
    const colNum = a => [...a].reduce((x, ch) => x * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    const fmtVal = (k, r) => k === 'owner' ? (r.owner ? uname(r.owner) : '') : k === 'followUp' ? (r.followUp ? new Date(r.followUp + 5.5 * 36e5).toISOString().slice(0, 16).replace('T', ' ') : '') : String(r[k] ?? '');
    const keyOf = o => digits(o.phone) || String(o.email || '').toLowerCase() || String(o.name || '').trim().toLowerCase();
    on('GET', '/sheets/:id/ms/start', (u, p, b, q) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      need(msReady(), 400, 'Microsoft sign-in is not set up yet. Add MS_CLIENT_ID and MS_CLIENT_SECRET to the worker (see README → Excel sync).');
      const origin = String((q && q.get('origin')) || '').replace(/\/$/, ''); need(/^https?:\/\//.test(origin), 400, 'Missing origin');
      const state = uid() + uid() + uid(); db.msStates = (db.msStates || []).filter(x => x.exp > now()); db.msStates.push({ state, sheetId: sh.id, uid: u.id, origin, exp: now() + 15 * 60000 });
      const url = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' + new URLSearchParams({ client_id: MS.id, response_type: 'code', redirect_uri: origin + '/api/ms/callback', response_mode: 'query', scope: 'offline_access Files.ReadWrite.All User.Read', state, prompt: 'select_account' });
      return { url };
    });
    async function msCallback(code, state) {
      const st = (db.msStates || []).find(x => x.state === state && x.exp > now()); need(st, 400, 'This sign-in link expired. Try again.');
      db.msStates = db.msStates.filter(x => x !== st); const sh = sheet(st.sheetId); need(sh, 404, 'Sheet not found');
      const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: MS.id, client_secret: MS.secret, grant_type: 'authorization_code', code, redirect_uri: st.origin + '/api/ms/callback', scope: 'offline_access Files.ReadWrite.All User.Read' }) });
      const j = await r.json(); need(r.ok, 400, 'Microsoft sign-in failed: ' + (j.error_description || j.error || r.status));
      sh.ms = { ...(sh.ms || {}), refresh: j.refresh_token, access: j.access_token, exp: now() + (j.expires_in || 3600) * 1000, status: 'connected', msg: 'Microsoft account connected — now paste the workbook link' };
      try { const me = await graph(sh, '/me'); sh.ms.account = me.userPrincipalName || me.mail || me.displayName || ''; } catch (e) {}
      save(); return { redirect: st.origin + '/#/b/' + sh.businessId + '/live' };
    }
    on('PUT', '/sheets/:id/ms', async (u, p, b) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId); need(sh.ms && sh.ms.refresh, 400, 'Connect your Microsoft account first');
      if (b.disconnect) { delete sh.ms; return sh; }
      if (b.link) {
        const item = await graph(sh, '/shares/u!' + b64u(String(b.link).trim()) + '/driveItem');
        need(/\.xlsx$/i.test(item.name || ''), 400, 'That link is not an .xlsx workbook');
        sh.ms.drive = item.parentReference && item.parentReference.driveId; sh.ms.item = item.id; sh.ms.file = item.name; sh.ms.link = String(b.link).trim();
        const ws = await graph(sh, `/drives/${sh.ms.drive}/items/${sh.ms.item}/workbook/worksheets?$select=name`);
        sh.ms.sheets = (ws.value || []).map(x => x.name); sh.ms.ws = sh.ms.ws && sh.ms.sheets.includes(sh.ms.ws) ? sh.ms.ws : sh.ms.sheets[0] || '';
      }
      if (b.ws !== undefined) { need(!sh.ms.sheets || sh.ms.sheets.includes(b.ws), 400, 'Worksheet not found'); sh.ms.ws = b.ws; sh.ms.pushed = {}; }
      if (b.push !== undefined) sh.ms.pushBack = !!b.push;
      if (b.auto !== undefined) sh.ms.auto = !!b.auto;
      if (b.mode !== undefined) { sh.live = sh.live || {}; sh.live.mode = ['replace', 'update', 'add'].includes(b.mode) ? b.mode : 'update'; }
      return sh;
    });
    async function msSync(u, sh) {
      const m = sh.ms; need(m && m.item && m.ws, 400, 'Choose the workbook and worksheet first');
      const bb = biz(sh.businessId);
      try {
        const base = `/drives/${m.drive}/items/${m.item}/workbook/worksheets/${encodeURIComponent(m.ws)}`;
        const ur = await graph(sh, base + '/usedRange(valuesOnly=true)?$select=address,text');
        const text = ur.text || [], addr = String(ur.address || '').split('!').pop(), start = addr.match(/^([A-Z]+)(\d+)/) || ['', 'A', '1'];
        const c0 = colNum(start[1]), r0 = +start[2];
        // 1) Excel → CRM. A CRM column is only taken from Excel if someone changed it in Excel since we last wrote it (no loops, CRM edits win otherwise)
        m.pushed = m.pushed || {};
        const guard = o => { const k = keyOf(o), last = m.pushed[k]; if (!last) return; for (const [f] of CRM_COLS) { const xv = f === 'owner' ? o.owner : f === 'followUp' ? o.followUp : o[f]; if (xv !== undefined && String(xv) === String(last[f] ?? '')) delete o[f]; } };
        let out = { summary: { added: 0, updated: 0, remove: 0 } };
        sh.live = sh.live || {}; if (!sh.live.mode) sh.live.mode = 'update';
        if (text.length >= 2) out = liveIngest(u, sh, text, null, guard);
        // 2) CRM → Excel: write Status / Priority / POC / Follow-up / Notes back next to the sheet's own columns
        let wrote = 0;
        if (m.pushBack !== false && text.length) {
          let hrow = 0, bs = -1;
          text.slice(0, 15).forEach((r, i) => { const cells = r.map(x => String(x).trim()).filter(Boolean); const sc = cells.filter(x => HEAD_RE.test(x)).length * 3 + cells.length; if (sc > bs) { bs = sc; hrow = i; } });
          const heads = text[hrow].map(x => String(x).trim()), lower = heads.map(h => h.toLowerCase());
          const cols = CRM_COLS.map(([f, label]) => { let i = lower.indexOf(label.toLowerCase()); if (f === 'owner' && i < 0) i = lower.findIndex(h => /^(poc|owner|assigned( to)?)$/.test(h)); return [f, label, i]; });
          let next = heads.length; cols.forEach(c => { if (c[2] < 0) { c[2] = next++; } });
          const pi = lower.findIndex(h => /phone|mobile|whats|contact.?(no|num)|^number$/.test(h)), ei = lower.findIndex(h => /e-?mail/.test(h)), ni = lower.findIndex(h => /name/.test(h));
          const mine = db.rows.filter(r => r.sheetId === sh.id), byK = new Map(); mine.forEach(r => { const k = keyOf(r); if (k && !byK.has(k)) byK.set(k, r); });
          const lastRow = text.length - 1, firstCol = Math.min(...cols.map(c => c[2])), lastCol = Math.max(...cols.map(c => c[2]));
          const block = []; const pushed = {};
          for (let i = hrow; i <= lastRow; i++) {
            const line = [];
            for (let ci = firstCol; ci <= lastCol; ci++) {
              const c = cols.find(x => x[2] === ci);
              if (i === hrow) { line.push(c ? c[1] : (heads[ci] ?? '')); continue; }
              const src = text[i], k = keyOf({ phone: pi >= 0 ? src[pi] : '', email: ei >= 0 ? src[ei] : '', name: ni >= 0 ? src[ni] : '' }), r = k && byK.get(k);
              if (!c) { line.push(null); continue; }
              const val = r ? fmtVal(c[0], r) : (src[ci] ?? '');
              line.push(val); if (r) (pushed[k] = pushed[k] || {})[c[0]] = val;
            }
            block.push(line);
          }
          const values = block.map(l => l.map(x => x == null ? null : x));
          // skip the PATCH when nothing changed (no endless re-writes)
          const sig = JSON.stringify(values); let h2 = 0; for (let i = 0; i < sig.length; i++) h2 = (h2 * 31 + sig.charCodeAt(i)) | 0;
          if (m.pushHash !== h2) {
            const vals = values.map(l => l.map(x => x == null ? '' : x));
            // null cells must not overwrite other columns: write only CRM columns, one column at a time
            for (const c of cols) { const a = colName(c0 + c[2]) + (r0 + hrow) + ':' + colName(c0 + c[2]) + (r0 + lastRow); await graph(sh, base + `/range(address='${a}')`, { method: 'PATCH', body: JSON.stringify({ values: vals.map(l => [l[c[2] - firstCol]]) }) }); wrote++; }
            m.pushHash = h2;
          }
          Object.assign(m.pushed, pushed);
        }
        m.lastAt = now(); m.status = 'ok'; m.msg = `${out.summary.added || 0} added · ${out.summary.updated || 0} updated from Excel${wrote ? ' · CRM columns written back' : ''}`;
        if (bb) syncLog(bb, 'Excel · ' + (m.file || sh.name), true, m.msg);
        return { ...out, sheet: sh, rows: db.rows.filter(r => r.sheetId === sh.id) };
      } catch (e) { m.status = 'error'; m.msg = e.message; m.lastAt = now(); if (bb) syncLog(bb, 'Excel · ' + (m.file || sh.name), false, e.message); throw e; }
    }
    on('POST', '/sheets/:id/ms/sync', async (u, p) => { const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId); return msSync(u, sh); });

    // Excel sync: add / update / replace, with preview and one-step undo
    const JUNK = /^(total|grand total|sub ?total|auto-?calculated|summary|numbers reached|note[:\s])/i;
    const isJunk = r => !(digits(r.phone).length >= 7) && !/@/.test(r.email || '') && (JUNK.test(String(r.name || '').trim()) || (!!r.name && r.name === r.phone));
    function snapshot(sh, label) { db.snaps = db.snaps || {}; db.snaps[sh.id] = { at: now(), label, sheet: clone(sh), rows: clone(db.rows.filter(r => r.sheetId === sh.id)) }; sh.undo = { at: now(), label }; }
    on('POST', '/sheets/:id/sync', (u, p, b) => { const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); if (!(u.role === 'staff' && pp(u, 'upload') && sheetPerm(u, sh) === 'edit')) manage(u, sh.businessId); return syncSheet(u, sh, b); });
    function syncSheet(u, sh, b) {
      const mode = ['add', 'update', 'replace'].includes(b.mode) ? b.mode : 'add';
      const heads = Array.isArray(b.heads) ? b.heads : [];   // [{name, target}] in Excel order
      const items = Array.isArray(b.rows) ? b.rows.slice(0, 50000) : [];
      const existing = db.rows.filter(r => r.sheetId === sh.id);
      const byP = new Map(), byE = new Map(), byN = new Map();
      existing.forEach(r => { const d = digits(r.phone); if (d && !byP.has(d)) byP.set(d, r); const e = String(r.email || '').toLowerCase(); if (e && !byE.has(e)) byE.set(e, r); const n = String(r.name || '').trim().toLowerCase(); if (n && !byN.has(n)) byN.set(n, r); });
      const used = new Set(); const plan = [];
      for (const it of items) {
        const d = digits(it.phone), e = String(it.email || '').toLowerCase(), n = String(it.name || '').trim().toLowerCase();
        let m = (d && byP.get(d)) || (e && byE.get(e)) || (!d && !e && n && byN.get(n)) || null;
        if (m && used.has(m.id)) m = null;
        if (m) used.add(m.id);
        plan.push([it, m]);
      }
      const toAdd = plan.filter(([, m]) => !m).length, toUpd = mode === 'add' ? 0 : plan.filter(([, m]) => m).length;
      const toRemove = mode === 'replace' ? existing.filter(r => !used.has(r.id)) : [];
      const summary = { add: toAdd, update: toUpd, remove: toRemove.length, skip: mode === 'add' ? plan.length - toAdd : 0, total: items.length };
      if (b.preview) return { summary };
      snapshot(sh, (b.file ? b.file + ' · ' : '') + mode);
      // columns in Excel order
      const colNames = heads.filter(h => h.target === 'column').map(h => h.name);
      const map = addColumns(sh, colNames);
      if (mode === 'replace') {
        const keep = new Set(Object.values(map));
        const gone = sh.columns.filter(c => !keep.has(c.id));
        gone.forEach(c => { const values = {}; existing.forEach(r => { if (r.data[c.id] != null && r.data[c.id] !== '') values[r.id] = r.data[c.id]; }); sh.bin.unshift({ id: uid(), type: 'column', key: 'd:' + c.id, label: c.name, col: c, at: now(), by: u.name, values, count: Object.keys(values).length }); });
        sh.columns = sh.columns.filter(c => keep.has(c.id));
        const mapped = new Set(heads.map(h => h.target).filter(t => BUILTIN.includes(t)));
        const crm = ['status', 'priority', 'owner', 'followUp', 'added'];
        sh.hidden = BUILTIN.filter(k => k !== 'name' && !mapped.has(k) && !crm.includes(k));
        const ord = []; heads.forEach(h => { const k = h.target === 'column' ? 'd:' + map[h.name] : h.target; if (k && k !== 'skip' && k !== 'name2' && !ord.includes(k)) ord.push(k); });
        crm.forEach(k => { if (!ord.includes(k)) ord.push(k); });
        sh.order = ord;
        heads.forEach(h => { if (BUILTIN.includes(h.target) && h.target !== 'owner') sh.labels[h.target] = String(h.name).trim(); });
      }
      const toData = it => { const o = {}; for (const k in it.cols || {}) if (map[k]) o[map[k]] = it.cols[k]; return o; };
      const toFmt = it => { if (!it.fmt || typeof it.fmt !== 'object') return null; const o = {}; for (const k in it.fmt) { const key = k.startsWith('col:') ? (map[k.slice(4)] ? 'd:' + map[k.slice(4)] : '') : (BUILTIN.includes(k) ? k : ''); if (key) o[key] = it.fmt[k]; } return o; };
      let pos = 0, added = 0, updated = 0;
      for (const [it, m] of plan) {
        pos++;
        if (m) {
          if (mode === 'add') continue;
          const patch = {}; ['name', 'phone', 'email', 'source', 'status', 'priority', 'followUp', 'closed', 'price', 'notes', 'added'].forEach(k => { if (it[k] != null && String(it[k]).trim() !== '') patch[k] = it[k]; });
          if (it.owner && canManage(u, sh.businessId)) { const o = ownerFrom(it.owner, sh.businessId); if (o) patch.owner = o; }
          patch.data = toData(it); if (mode === 'replace') patch.pos = pos;
          { const f = toFmt(it); if (f) { m.fmt = {}; patch.fmt = f; } }
          if (patch.added) { m.added = parseTime(patch.added) || m.added; delete patch.added; }
          patchRow(m, patch, u); updated++;
        } else {
          const r = makeRow(sh, { ...it, data: toData(it), fmt: toFmt(it) }, u); if (mode === 'replace') r.pos = pos; db.rows.push(r); added++;
        }
      }
      if (toRemove.length) { const rm = new Set(toRemove.map(r => r.id)); db.rows = db.rows.filter(r => !rm.has(r.id)); }
      sh.updated = now(); sh.lastImport = { at: now(), mode, added, updated, removed: toRemove.length, file: b.file || '' };
      return { summary: { ...summary, added, updated }, sheet: sh, rows: db.rows.filter(r => r.sheetId === sh.id) };
    }
    on('POST', '/sheets/:id/undo-import', (u, p) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId); const snap = (db.snaps || {})[sh.id]; need(snap, 400, 'Nothing to undo');
      db.rows = db.rows.filter(r => r.sheetId !== sh.id).concat(snap.rows);
      Object.assign(sh, snap.sheet); delete sh.undo; delete db.snaps[sh.id]; sh.updated = now();
      return { sheet: sh, rows: db.rows.filter(r => r.sheetId === sh.id) };
    });
    on('POST', '/sheets/:id/junk', (u, p, b) => {
      const sh = sheet(p.id); need(sh, 404, 'Sheet not found'); manage(u, sh.businessId);
      const junk = db.rows.filter(r => r.sheetId === sh.id && isJunk(r));
      if (b.preview) return { count: junk.length, sample: junk.slice(0, 8).map(r => r.name) };
      if (junk.length) { snapshot(sh, 'remove junk rows'); const rm = new Set(junk.map(r => r.id)); db.rows = db.rows.filter(r => !rm.has(r.id)); }
      return { removed: junk.length, sheet: sh };
    });

    // rows
    on('POST', '/rows', (u, p, b) => { const sh = sheet(b.sheetId); need(sh, 404, 'Sheet not found'); see(u, sh.businessId); need(sheetPerm(u, sh) === 'edit' || u.role === 'staff', 403, 'You can only view this sheet'); need(u.role !== 'staff' || pp(u, 'add'), 403, 'You do not have permission to add rows'); const r = makeRow(sh, b, u); db.rows.push(r); sh.updated = now(); return r; });
    on('POST', '/rows/bulk', (u, p, b) => { const sh = sheet(b.sheetId); need(sh, 404, 'Sheet not found'); see(u, sh.businessId); need(Array.isArray(b.rows), 400, 'rows must be a list'); return bulkInsert(sh, b.rows.slice(0, 50000), u, b.dedupe !== false); });
    on('PUT', '/rows/:id', (u, p, b) => { const r = row(p.id); need(r, 404, 'Record not found'); need(canRow(u, r), 403, 'This record is assigned to someone else'); return patchRow(r, b || {}, u); });
    function trashRows(list, u) {
      db.trash = db.trash || []; const at = now(), del = new Set(list.map(r => r.id));
      list.forEach(r => db.trash.unshift({ id: uid(), businessId: r.businessId, sheetId: r.sheetId, row: clone(r), at, by: u.name }));
      db.rows = db.rows.filter(r => !del.has(r.id));
      const cut = at - 30 * DAY; db.trash = db.trash.filter(t => t.at > cut).slice(0, 20000);
    }
    const canDel = (u, r) => canManage(u, r.businessId) || (u.role === 'staff' && pp(u, 'delete') && canRow(u, r));
    on('DELETE', '/rows/:id', (u, p) => { const r = row(p.id); need(r, 404, 'Record not found'); need(canDel(u, r), 403, 'You do not have permission to delete rows'); trashRows([r], u); return { ok: true }; });
    on('POST', '/rows/:id/duplicate', (u, p) => {
      const r = row(p.id); need(r, 404, 'Record not found'); const sh = sheet(r.sheetId); need(sh && (sheetPerm(u, sh) === 'edit' || canRow(u, r)), 403, 'You can only view this sheet');
      const c = clone(r); c.id = uid(); c.log = []; c.updated = now(); c.added = now(); c.pos = (r.pos || 0) + 0.5; c.ref = '';
      db.rows.push(c); return c;
    });
    on('GET', '/businesses/:id/trash', (u, p) => { manage(u, p.id); return { items: (db.trash || []).filter(t => t.businessId === p.id).slice(0, 2000).map(t => ({ id: t.id, at: t.at, by: t.by, sheetId: t.sheetId, name: t.row.name, phone: t.row.phone, email: t.row.email, status: t.row.status })) }; });
    on('POST', '/trash/restore', (u, p, b) => {
      const ids = new Set(b.ids || []), list = (db.trash || []).filter(t => ids.has(t.id)); list.forEach(t => manage(u, t.businessId));
      const out = [];
      for (const t of list) { const r = t.row; if (!sheet(r.sheetId)) { const first = db.sheets.find(s => s.businessId === r.businessId); if (!first) continue; r.sheetId = first.id; } if (!row(r.id)) { log(r, u, 'Restored from deleted rows'); db.rows.push(r); out.push(r); } }
      db.trash = db.trash.filter(t => !ids.has(t.id)); return { rows: out };
    });
    on('POST', '/trash/purge', (u, p, b) => { const ids = new Set(b.ids || []); (db.trash || []).filter(t => ids.has(t.id)).forEach(t => manage(u, t.businessId)); db.trash = (db.trash || []).filter(t => !ids.has(t.id)); return { ok: true }; });

    // activity log + backup
    on('GET', '/audit', (u, p, b, q) => {
      const bid = (q && q.get('bid')) || ''; if (bid) manage(u, bid); else superPerm(u, 'audit');
      return { items: (db.audit || []).filter(a => !bid || a.bid === bid).slice(0, 1500) };
    });
    on('GET', '/backup', u => { superPerm(u, 'backup'); const o = clone(db); delete o.sessions; delete o.snaps; o.backupAt = now(); return o; });
    on('POST', '/restore', (u, p, b) => {
      superOnly(u); const d = b.data; need(d && Array.isArray(d.users) && Array.isArray(d.businesses) && Array.isArray(d.rows), 400, 'This is not a RAREVO CRM backup file');
      need(d.users.some(x => x.role === 'super'), 400, 'The backup has no system admin login');
      const keepSessions = db.sessions; for (const k of Object.keys(db)) if (k !== 'sessions') delete db[k];
      Object.assign(db, clone(d)); db.sessions = keepSessions; delete db.backupAt;
      ['users', 'businesses', 'sheets', 'rows', 'spend', 'emails'].forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
      return { ok: true, businesses: db.businesses.length, rows: db.rows.length };
    });
    on('POST', '/rows/batch', (u, p, b) => {
      const ids = new Set(b.ids || []); const list = db.rows.filter(r => ids.has(r.id) && canRow(u, r));
      if (b.action === 'assign') list.forEach(r => need(canManage(u, r.businessId), 403, 'Only the business admin can do this'));
      if (b.action === 'delete') list.forEach(r => need(canDel(u, r), 403, 'You do not have permission to delete rows'));
      if (b.action === 'delete') { trashRows(list, u); return { ok: true, deleted: list.length }; }
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
    function dupeConf(b) { const d = b.dupe || {}; return { match: Array.isArray(d.match) && d.match.length ? d.match : ['phone', 'email', 'ref'], mode: ['update', 'new', 'skip'].includes(d.mode) ? d.mode : 'update', scope: d.scope === 'sheet' ? 'sheet' : 'business' }; }
    function findDupe(b, sh, o) {
      const dm = dupeConf(b), d = digits(o.phone), em = String(o.email || '').toLowerCase().trim();
      return db.rows.find(r => r.businessId === b.id && (dm.scope !== 'sheet' || r.sheetId === sh.id) && ((dm.match.includes('ref') && o.ref && r.ref === o.ref) || (dm.match.includes('email') && em && String(r.email || '').toLowerCase().trim() === em) || (dm.match.includes('phone') && d && digits(r.phone) === d)));
    }
    on('PUT', '/businesses/:id/dupe', (u, p, b) => { const x = manage(u, p.id); x.dupe = { match: (b.match || []).filter(k => ['phone', 'email', 'ref'].includes(k)), mode: b.mode, scope: b.scope }; x.dupe = dupeConf(x); return pubBiz(x); });
    on('GET', '/businesses/:id/duplicates', (u, p) => {
      const x = manage(u, p.id), groups = new Map();
      db.rows.filter(r => r.businessId === x.id).forEach(r => { const keys = [digits(r.phone) && 'p' + digits(r.phone), r.email && 'e' + String(r.email).toLowerCase().trim()].filter(Boolean); for (const k of keys) { if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r.id); } });
      const seen = new Set(), out = [];
      for (const [k, ids] of groups) { if (ids.length < 2) continue; const key = [...ids].sort().join(','); if (seen.has(key)) continue; seen.add(key); out.push({ key: k.slice(1), by: k[0] === 'p' ? 'phone' : 'email', ids }); }
      return { groups: out.slice(0, 500) };
    });
    on('POST', '/businesses/:id/merge', (u, p, b) => {
      const x = manage(u, p.id), keep = row(b.keep); need(keep && keep.businessId === x.id, 404, 'Record not found');
      const others = (b.ids || []).map(row).filter(r => r && r.id !== keep.id && r.businessId === x.id);
      for (const o of others) {
        for (const k of ['name', 'phone', 'email', 'owner']) if (!keep[k] && o[k]) keep[k] = o[k];
        if (o.notes && !String(keep.notes || '').includes(o.notes)) keep.notes = keep.notes ? keep.notes + ' · ' + o.notes : o.notes;
        for (const c in o.data || {}) if (keep.data[c] == null || keep.data[c] === '') keep.data[c] = o.data[c];
        if (o.followUp && (!keep.followUp || o.followUp < keep.followUp)) keep.followUp = o.followUp;
        keep.added = Math.min(keep.added || now(), o.added || now());
        keep.log = [...(keep.log || []), ...(o.log || []).map(l => ({ ...l, text: '[merged from ' + ((sheet(o.sheetId) || {}).name || 'sheet') + '] ' + l.text }))].sort((a, c) => c.t - a.t).slice(0, 120);
      }
      log(keep, u, `Merged ${others.length} duplicate record${others.length === 1 ? '' : 's'}`);
      trashRows(others, u); keep.updated = now();
      return { row: keep, removed: others.map(r => r.id) };
    });
    function intake(b, sh, item, label) {
      const o = mapIncoming(sh, item.fields);
      o.source = item.source || 'Website'; o.ref = item.ref ? String(item.ref).slice(0, 80) : '';
      const where = [item.form, item.page].filter(Boolean).join(' · ');
      if (where) o.notes = (o.notes ? o.notes + '\n' : '') + label + ': ' + where;
      if (!o.name && !o.phone && !o.email && !Object.keys(o.data).length) return 'skipped';
      const dm = dupeConf(b), ex = dm.mode === 'new' ? null : findDupe(b, sh, o);
      if (ex && dm.mode === 'skip') return 'skipped';
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

    function auditBiz(path, b) {
      let m;
      if ((m = path.match(/^\/businesses\/([^/]+)/))) return m[1];
      if ((m = path.match(/^\/sheets\/([^/]+)/))) return (sheet(m[1]) || {}).businessId || '';
      if ((m = path.match(/^\/rows\/([^/]+)/)) && m[1] !== 'batch' && m[1] !== 'cells' && m[1] !== 'bulk') return (row(m[1]) || {}).businessId || '';
      if ((m = path.match(/^\/users\/([^/]+)/))) return (userById(m[1]) || {}).businessId || '';
      if (b.businessId) return b.businessId;
      if (b.sheetId) return (sheet(b.sheetId) || {}).businessId || '';
      if (Array.isArray(b.ids) && b.ids[0]) return (row(b.ids[0]) || (db.trash || []).find(t => t.id === b.ids[0]) || {}).businessId || '';
      if (Array.isArray(b.changes) && b.changes[0]) return (row(b.changes[0].id) || {}).businessId || '';
      return '';
    }
    const ACT = [[/^POST \/rows$/, 'Added a row'], [/^PUT \/rows\//, 'Edited a record'], [/^DELETE \/rows\//, 'Deleted a row'], [/^POST \/rows\/batch/, b => b.action === 'delete' ? `Deleted ${(b.ids || []).length} rows` : b.action === 'assign' ? `Assigned ${(b.ids || []).length} rows` : `Updated ${(b.ids || []).length} rows`], [/^POST \/rows\/cells/, b => `Edited ${(b.changes || []).length} cells`], [/^POST \/rows\/bulk/, 'Added rows'], [/duplicate$/, 'Duplicated a row'],
      [/^POST \/sheets$/, b => 'Created sheet “' + (b.name || '') + '”'], [/^PUT \/sheets\/[^/]+$/, 'Changed sheet settings'], [/^DELETE \/sheets\//, 'Deleted a sheet'], [/\/sync$/, b => 'Uploaded a sheet (' + (b.mode || '') + ')'], [/\/live/, 'Live sheet sync'], [/\/access$/, 'Changed sheet access'], [/\/column$/, 'Changed a column'], [/undo-import/, 'Undid an upload'],
      [/^POST \/users$/, b => 'Added user ' + (b.name || '')], [/^PUT \/users\//, 'Changed a user'], [/^DELETE \/users\//, 'Removed a user'], [/^POST \/businesses$/, b => 'Created business ' + (b.name || '')], [/^PUT \/businesses\/[^/]+$/, 'Changed business settings'],
      [/trash\/restore/, b => `Restored ${(b.ids || []).length} deleted rows`], [/trash\/purge/, 'Permanently removed deleted rows'], [/^POST \/restore$/, 'Restored a full backup'], [/rarevo|meta|wa-/, 'Changed WhatsApp / Meta connection'], [/\/web$|\/forms/, 'Changed website / forms']];
    function audit(u, method, path, b, bid) {
      if (!u || u.id === 'system' || /^\/(requests|me)/.test(path) && method === 'GET') return;
      const key = method + ' ' + path; let what = '';
      for (const [re, t] of ACT) if (re.test(key)) { what = typeof t === 'function' ? t(b) : t; break; }
      if (!what) what = key;
      db.audit = db.audit || []; db.audit.unshift({ at: now(), uid: u.id, name: u.name, role: u.role, bid: bid || '', what, path: key.slice(0, 120) });
      if (db.audit.length > 20000) db.audit.length = 20000;
    }
    // never send Microsoft tokens to the browser
    function scrub(o, d) { if (!o || typeof o !== 'object' || (d || 0) > 6) return o; if (Array.isArray(o)) { o.forEach(x => scrub(x, (d || 0) + 1)); return o; } if (o.ms && typeof o.ms === 'object') { o.ms.connected = !!o.ms.refresh; delete o.ms.refresh; delete o.ms.access; delete o.ms.pushed; } for (const k in o) if (o[k] && typeof o[k] === 'object') scrub(o[k], (d || 0) + 1); return o; }
    async function handle(method, path, body, u) {
      try {
        need(u, 401, 'Please sign in');
        const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
        for (const [m, re, f] of R) {
          if (m !== method) continue; const mt = clean.match(re); if (!mt) continue;
          const bid = method !== 'GET' ? auditBiz(clean, body || {}) : '';
          const out = await f(u, mt.groups || {}, body || {}, new URLSearchParams(path.split('?')[1] || ''));
          if (method !== 'GET') audit(u, method, clean, body || {}, bid || auditBiz(clean, body || {}));
          if (method !== 'GET' || /meta|contacts/.test(clean)) save();
          return { status: 200, body: scrub(clone(out)) };
        }
        return { status: 404, body: { error: 'Not found: ' + method + ' ' + clean } };
      } catch (e) {
        return { status: e.status || 500, body: { error: e.message || 'Server error' } };
      }
    }
    return { handle, db, collect, publicForm, publicSubmit, liveHook, msCallback };
  }

  const api = { slugify, createCore, STATUSES, PRIOS, COLORS, ROLES, BUILTIN, uid, digits };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
