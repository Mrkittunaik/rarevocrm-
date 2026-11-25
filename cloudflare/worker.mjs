/* RAREVO CRM on Cloudflare Workers (free plan).
   - Static files (public/) are served by Workers Static Assets.
   - /api/* goes to one Durable Object ("main") that holds the whole CRM database and saves it to its SQLite storage.
   - Same data rules as the Node server (public/js/core.js), same API, same front end. */
import RC from '../public/js/core.js';
import integrations from '../server/integrations.js';

const { createCore } = RC;
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const rand = n => hex(crypto.getRandomValues(new Uint8Array(n)));

/* ---------- password hashing (PBKDF2-SHA256, Web Crypto) ---------- */
const ITER = 100000;
async function pbkdf2(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(String(pw)), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITER }, key, 256));
}
async function hash(pw) { const salt = rand(16); return `pbkdf2$${salt}$${await pbkdf2(pw, salt)}`; }
async function check(pw, stored) {
  if (!stored || !String(stored).startsWith('pbkdf2$')) return false;
  const [, salt, h] = stored.split('$'), x = await pbkdf2(pw, salt);
  if (x.length !== h.length) return false;
  let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ h.charCodeAt(i);
  return d === 0;
}

/* ---------- helpers ---------- */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
function send(status, body, headers) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {}) });
}
const cookies = req => Object.fromEntries((req.headers.get('Cookie') || '').split(';').map(s => s.trim().split('=')).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
async function readBody(req) {
  const t = await req.text(); if (!t) return {};
  if (t.length > 40 * 1024 * 1024) throw new Error('Upload too large (max 40 MB)');
  try { return JSON.parse(t); } catch {}
  if (t.includes('=')) { const o = {}; for (const [k, v] of new URLSearchParams(t)) o[k] = k in o ? [].concat(o[k], v) : v; return o; }
  throw new Error('Invalid request body');
}

/* ---------- login protection: 5 wrong tries = 15 min lock ---------- */
const FAILS = new Map();
function lockedFor(key) { const f = FAILS.get(key); return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 60000) : 0; }
function failed(key) { const f = FAILS.get(key) || { n: 0, until: 0 }; f.n++; if (f.n >= 5) { f.until = Date.now() + 15 * 60000; f.n = 0; } FAILS.set(key, f); if (FAILS.size > 5000) FAILS.clear(); }

const pubUser = u => ({ id: u.id, name: u.name, username: u.username || '', email: u.email || '', role: u.role, businessId: u.businessId || '', createdAt: u.createdAt, mustChange: !!u.mustChange, disabled: !!u.disabled });
const CHUNK = 400000; // characters per stored piece (stays under the 2 MB value limit)

/* ---------- the database lives in this Durable Object ---------- */
export class CrmStore {
  constructor(state, env) { this.state = state; this.env = env; this.db = null; this.core = null; this.dirty = false; this.hits = new Map(); }

  async load() {
    if (this.db) return;
    const st = this.state.storage, n = (await st.get('db:n')) || 0;
    let txt = '';
    if (n) { const keys = Array.from({ length: n }, (_, i) => 'db:' + i); const m = await st.get(keys); txt = keys.map(k => m.get(k) || '').join(''); }
    this.db = txt ? JSON.parse(txt) : {};
    this.core = createCore(this.db, { save: () => { this.dirty = true; }, integrations, hash });
    this.db.sessions = this.db.sessions || {};
    if (!this.db.users.length) {
      const email = String(this.env.ADMIN_EMAIL || 'admin@rarevo.local').toLowerCase();
      this.db.users.push({ id: 'u_admin', name: this.env.ADMIN_NAME || 'Admin', username: String(this.env.ADMIN_USERNAME || 'admin').toLowerCase(), email, role: 'super', businessId: '', password: await hash(this.env.ADMIN_PASSWORD || 'admin123'), createdAt: Date.now() });
      this.dirty = true;
    }
  }
  async persist() {
    if (!this.dirty) return; this.dirty = false;
    const st = this.state.storage, txt = JSON.stringify(this.db), old = (await st.get('db:n')) || 0;
    const parts = []; for (let i = 0; i < txt.length; i += CHUNK) parts.push(txt.slice(i, i + CHUNK));
    if (parts.length > 120) throw new Error('Database too large for one save');
    const obj = { 'db:n': parts.length }; parts.forEach((p, i) => { obj['db:' + i] = p; });
    await st.put(obj);
    if (old > parts.length) await st.delete(Array.from({ length: old - parts.length }, (_, i) => 'db:' + (parts.length + i)));
  }
  limit(req) {
    const ip = req.headers.get('CF-Connecting-IP') || 'x', k = ip + ':' + Math.floor(Date.now() / 60000), n = (this.hits.get(k) || 0) + 1;
    this.hits.set(k, n); if (this.hits.size > 5000) this.hits.clear(); return n <= 120;
  }
  userOf(req) {
    const s = this.db.sessions[cookies(req).sid];
    if (!s || s.exp < Date.now()) return null;
    const u = this.db.users.find(u => u.id === s.uid); return u && !u.disabled ? u : null;
  }

  async fetch(req) {
    await this.load();
    let res;
    try { res = await this.api(req); }
    catch (e) { res = send(e.status || 400, { error: e.message || 'Error' }); }
    try { await this.persist(); } catch (e) { return send(500, { error: 'Could not save: ' + e.message }); }
    return res;
  }

  async api(req) {
    const url = new URL(req.url), method = req.method, p = url.pathname.replace(/^\/api/, '') || '/';
    const secure = url.protocol === 'https:' ? '; Secure' : '';
    const db = this.db, core = this.core;
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (p === '/health') return send(200, { ok: true, mode: 'server', app: 'rarevo-crm', host: 'cloudflare', version: '2026-11-25b' });
    if (p === '/__cron') return this.autosync();
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(req) : {};

    // public intake (website plugin, embed.js, forms)
    let m;
    if ((m = p.match(/^\/collect\/([\w-]+)(?:\/bulk)?$/)) || (m = p.match(/^\/forms\/([\w-]+)\/(public|submit)$/))) {
      if (!this.limit(req)) return send(429, { error: 'Too many requests, try again in a minute' }, CORS);
      try {
        if (p.startsWith('/collect/')) {
          if (body._hp) return send(200, { ok: true }, CORS);
          const ref = req.headers.get('Referer') || '';
          let payload = body;
          if (!body.items && !body.fields) { const f = { ...body }; delete f._page; delete f._form; delete f._title; payload = { fields: f, page: body._page || ref, form: body._form || '' }; }
          if (Array.isArray(payload.items)) payload.items.forEach(it => { if (!it.page) it.page = ref; }); else if (!payload.page) payload.page = ref;
          return send(200, core.collect(m[1], payload), CORS);
        }
        if (m[2] === 'public' && method === 'GET') return send(200, core.publicForm(m[1]), CORS);
        if (m[2] === 'submit' && method === 'POST') { if (body._hp) return send(200, { ok: true }, CORS); return send(200, core.publicSubmit(m[1], body.values || {}, { page: body.page || req.headers.get('Referer') || '' }), CORS); }
      } catch (e) { return send(e.status || 400, { error: e.message }, CORS); }
    }
    if (p.startsWith('/gate/') && method === 'GET') {
      const b = db.businesses.find(x => x.slug === decodeURIComponent(p.slice(6)));
      return b ? send(200, { name: b.name, color: b.color, industry: b.industry, slug: b.slug }) : send(404, { error: 'Unknown business link' });
    }
    if (p === '/login' && method === 'POST') {
      const login = String(body.login || body.email || '').trim().toLowerCase();
      const u = db.users.find(x => (x.username && x.username === login) || (x.email && x.email.toLowerCase() === login));
    const lk = login + '|' + String((req.headers.get('CF-Connecting-IP') || '')).split(',')[0].trim(), lm = lockedFor(lk) || lockedFor(login);
    if (lm) return send(429, { error: `Too many wrong tries. Try again in ${lm} min.` });
      if (u && body.gate) { const g = db.businesses.find(b => b.slug === body.gate); if (g && u.role !== 'super' && u.businessId !== g.id) return send(401, { error: 'This login does not belong to ' + g.name }); }
      if (!u || !(await check(body.password || '', u.password))) { failed(lk); failed(login + '|*'); if ((FAILS.get(login + '|*') || {}).until > Date.now()) FAILS.set(login, FAILS.get(login + '|*')); return send(401, { error: 'Wrong login or password' }); }
      if (u.disabled) return send(403, { error: 'This login is blocked. Contact RAREVO MEDIA.' });
      FAILS.delete(lk);
      const sid = rand(24);
      db.sessions[sid] = { uid: u.id, exp: Date.now() + 30 * 864e5 }; u.lastLogin = Date.now();
      for (const k in db.sessions) if (db.sessions[k].exp < Date.now()) delete db.sessions[k];
      this.dirty = true;
      return send(200, { me: pubUser(u) }, { 'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}${secure}` });
    }
    const me = this.userOf(req);
    if (!me) return send(401, { error: 'Please sign in' });
    const sidNow = cookies(req).sid;
    if (p === '/logout' && method === 'POST') { delete db.sessions[sidNow]; this.dirty = true; return send(200, { ok: true }, { 'Set-Cookie': `sid=; Path=/; Max-Age=0${secure}` }); }
    if (p === '/me' && method === 'GET') return send(200, { me: pubUser(me) });
    if (p === '/me/password' && method === 'PUT') {
      if (!(await check(body.current || '', me.password))) return send(400, { error: 'Current password is wrong' });
      if (String(body.password || '').length < 6) return send(400, { error: 'Use at least 6 characters' });
      me.password = await hash(body.password); me.mustChange = false; this.dirty = true; return send(200, { ok: true });
    }
    if (p === '/impersonate' && method === 'POST') {
      if (me.role !== 'super') return send(403, { error: 'Only the system admin can do this' });
      const t = db.users.find(u => u.id === body.userId); if (!t) return send(404, { error: 'User not found' });
      const sid = rand(24);
      db.sessions[sid] = { uid: t.id, exp: Date.now() + 864e5, back: sidNow, by: me.name };
      const cur = db.sessions[sidNow]; if (cur) cur.exp = Math.max(cur.exp, Date.now() + 864e5);
      this.dirty = true;
      return send(200, { ok: true }, { 'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${secure}` });
    }
    if (p === '/impersonate/back' && method === 'POST') {
      const cur = db.sessions[sidNow];
      if (!cur || !cur.back || !db.sessions[cur.back]) return send(400, { error: 'Not viewing as someone else' });
      const back = cur.back; delete db.sessions[sidNow]; this.dirty = true;
      return send(200, { ok: true }, { 'Set-Cookie': `sid=${back}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}${secure}` });
    }
    const out = await core.handle(method, p + url.search, body, me);
    if (p === '/bootstrap' && out.status === 200) { const cur = db.sessions[sidNow]; if (cur && cur.back) out.body.viewingAs = { by: cur.by || 'System admin' }; }
    if (method !== 'GET') this.dirty = true;
    return send(out.status, out.body);
  }

  async autosync() {
    const system = { id: 'system', name: 'Auto-sync', role: 'super', businessId: '' }, d = t => new Date(t).toISOString().slice(0, 10);
    let n = 0;
    for (const b of this.db.businesses) {
      if (b.status === 'paused') continue;
      if (b.rarevo && b.rarevo.key) { await this.core.handle('POST', `/businesses/${b.id}/rarevo/sync`, {}, system).catch(() => {}); n++; }
      if (b.meta && b.meta.token) { await this.core.handle('POST', `/businesses/${b.id}/meta/sync-spend`, { since: d(Date.now() - 6 * 864e5), until: d(Date.now()) }, system).catch(() => {}); n++; }
    }
    this.dirty = true;
    return send(200, { ok: true, synced: n });
  }
}

/* ---------- entry: static files or API ---------- */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/__cron') return send(404, { error: 'Not found' });
      return env.CRM.get(env.CRM.idFromName('main')).fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(env.CRM.get(env.CRM.idFromName('main')).fetch('https://internal/api/__cron', { method: 'POST' }));
  }
};
