/* RAREVO CRM server — Node 18+, no npm packages needed.  Start:  node server/server.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createCore } = require('../public/js/core.js');
const integrations = require('./integrations.js');

const ROOT = path.join(__dirname, '..');
// tiny .env loader
try { for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}

const PORT = +process.env.PORT || 4000;
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SYNC_MIN = +process.env.SYNC_MINUTES || 30;
const PUBLIC = path.join(ROOT, 'public');
fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------- storage ---------- */
let db = {};
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { db = {}; }
let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 150);
}

/* ---------- auth ---------- */
const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(String(pw), salt, 64).toString('hex');
const check = (pw, stored) => { if (!stored) return false; const [salt, h] = stored.split(':'); const x = crypto.scryptSync(String(pw), salt, 64); return crypto.timingSafeEqual(x, Buffer.from(h, 'hex')); };
const core = createCore(db, { save, integrations, hash });
db.sessions = db.sessions || {};
if (!db.users.length) {
  const email = (process.env.ADMIN_EMAIL || 'admin@rarevo.local').toLowerCase();
  db.users.push({ id: 'u_admin', name: process.env.ADMIN_NAME || 'Admin', username: (process.env.ADMIN_USERNAME || 'admin').toLowerCase(), email, role: 'super', businessId: '', password: hash(process.env.ADMIN_PASSWORD || 'admin123'), createdAt: Date.now() });
  save();
  console.log(`Created first system admin: login ID "${process.env.ADMIN_USERNAME || 'admin'}" or ${email} (password from ADMIN_PASSWORD, default admin123 — change it after signing in)`);
}
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(p => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
function userOf(req) {
  const s = db.sessions[cookies(req).sid];
  if (!s || s.exp < Date.now()) return null;
  return db.users.find(u => u.id === s.uid) || null;
}

/* ---------- simple rate limit for public endpoints ---------- */
const hits = new Map();
function limit(req) { const ip = req.socket.remoteAddress || 'x', t = Math.floor(Date.now() / 60000), k = ip + ':' + t; const n = (hits.get(k) || 0) + 1; hits.set(k, n); if (hits.size > 5000) hits.clear(); return n <= 120; }
/* ---------- http helpers ---------- */
const MIME = { '.zip': 'application/zip', '.php': 'text/plain; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {}));
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((ok, bad) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 40 * 1024 * 1024) { bad(new Error('Upload too large (max 40 MB)')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString('utf8'); if (!s) return ok({});
      try { return ok(JSON.parse(s)); } catch {}
      if (/application\/x-www-form-urlencoded/.test(req.headers['content-type'] || '') || s.includes('=')) { const o = {}; for (const [k, v] of new URLSearchParams(s)) o[k] = k in o ? [].concat(o[k], v) : v; return ok(o); }
      bad(new Error('Invalid request body'));
    });
    req.on('error', bad);
  });
}
function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, buf) => {
    if (err) return fs.readFile(path.join(PUBLIC, 'index.html'), (e2, b2) => e2 ? send(res, 404, 'Not found') : send(res, 200, b2, { 'Content-Type': MIME['.html'] }));
    send(res, 200, buf, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  });
}
const pubUser = u => ({ id: u.id, name: u.name, username: u.username || '', email: u.email || '', role: u.role, businessId: u.businessId || '', createdAt: u.createdAt });

/* ---------- routes ---------- */
async function api(req, res, p) {
  const method = req.method;
  if (p === '/health') return send(res, 200, { ok: true, mode: 'server', app: 'rarevo-crm' });
  const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(req) : {};
  if (method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  // ---- public intake (no login): website plugin, embed.js, public forms ----
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  let m;
  if ((m = p.match(/^\/collect\/([\w-]+)(?:\/bulk)?$/)) || (m = p.match(/^\/forms\/([\w-]+)\/(public|submit)$/))) {
    if (method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
    if (!limit(req)) return send(res, 429, { error: 'Too many requests, try again in a minute' }, CORS);
    try {
      if (p.startsWith('/collect/')) {
        if (body._hp) return send(res, 200, { ok: true }, CORS);
        let payload = body;
        if (!body.items && !body.fields) { const f = { ...body }; delete f._page; delete f._form; delete f._title; payload = { fields: f, page: body._page || req.headers.referer || '', form: body._form || '' }; }
        if (Array.isArray(payload.items)) payload.items.forEach(it => { if (!it.page) it.page = req.headers.referer || ''; });
        else if (!payload.page) payload.page = req.headers.referer || '';
        return send(res, 200, core.collect(m[1], payload), CORS);
      }
      if (m[2] === 'public' && method === 'GET') return send(res, 200, core.publicForm(m[1]), CORS);
      if (m[2] === 'submit' && method === 'POST') { if (body._hp) return send(res, 200, { ok: true }, CORS); return send(res, 200, core.publicSubmit(m[1], body.values || {}, { page: body.page || req.headers.referer || '' }), CORS); }
    } catch (e) { return send(res, e.status || 400, { error: e.message }, CORS); }
  }
  if (p.startsWith('/gate/') && method === 'GET') {
    const b = db.businesses.find(x => x.slug === decodeURIComponent(p.slice(6)));
    return b ? send(res, 200, { name: b.name, color: b.color, industry: b.industry, slug: b.slug }) : send(res, 404, { error: 'Unknown business link' });
  }

  if (p === '/login' && method === 'POST') {
    const login = String(body.login || body.email || '').trim().toLowerCase();
    const u = db.users.find(x => (x.username && x.username === login) || (x.email && x.email.toLowerCase() === login));
    if (u && body.gate) { const g = db.businesses.find(b => b.slug === body.gate); if (g && u.role !== 'super' && u.businessId !== g.id) return send(res, 401, { error: 'This login does not belong to ' + g.name }); }
    if (!u || !check(body.password || '', u.password)) return send(res, 401, { error: 'Wrong login or password' });
    const sid = crypto.randomBytes(24).toString('hex');
    db.sessions[sid] = { uid: u.id, exp: Date.now() + 30 * 864e5 };
    u.lastLogin = Date.now();
    for (const k in db.sessions) if (db.sessions[k].exp < Date.now()) delete db.sessions[k];
    save();
    return send(res, 200, { me: pubUser(u) }, { 'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}` });
  }
  const me = userOf(req);
  if (!me) return send(res, 401, { error: 'Please sign in' });
  if (p === '/logout' && method === 'POST') { delete db.sessions[cookies(req).sid]; save(); return send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' }); }
  if (p === '/me' && method === 'GET') return send(res, 200, { me: pubUser(me) });
  // system admin: open a business as its admin without a password, and come back
  if (p === '/impersonate' && method === 'POST') {
    const cur = db.sessions[cookies(req).sid];
    if (me.role !== 'super') return send(res, 403, { error: 'Only the system admin can do this' });
    const t = db.users.find(u => u.id === body.userId); if (!t) return send(res, 404, { error: 'User not found' });
    const sid = crypto.randomBytes(24).toString('hex');
    db.sessions[sid] = { uid: t.id, exp: Date.now() + 864e5, back: cookies(req).sid, by: me.name };
    if (cur) cur.exp = Math.max(cur.exp, Date.now() + 864e5); save();
    return send(res, 200, { ok: true }, { 'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400` });
  }
  if (p === '/impersonate/back' && method === 'POST') {
    const curSid = cookies(req).sid, cur = db.sessions[curSid];
    if (!cur || !cur.back || !db.sessions[cur.back]) return send(res, 400, { error: 'Not viewing as someone else' });
    const back = cur.back; delete db.sessions[curSid]; save();
    return send(res, 200, { ok: true }, { 'Set-Cookie': `sid=${back}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 86400}` });
  }
  if (p === '/me/password' && method === 'PUT') {
    if (!check(body.current || '', me.password)) return send(res, 400, { error: 'Current password is wrong' });
    if (String(body.password || '').length < 6) return send(res, 400, { error: 'Use at least 6 characters' });
    me.password = hash(body.password); save(); return send(res, 200, { ok: true });
  }
  const out = await core.handle(method, p + (new URL(req.url, 'http://x').search || ''), body, me);
  if (p === '/bootstrap' && out.status === 200) { const cur = db.sessions[cookies(req).sid]; if (cur && cur.back) out.body.viewingAs = { by: cur.by || 'System admin' }; }
  send(res, out.status, out.body);
}

http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  try {
    if (p.startsWith('/api/')) return await api(req, res, p.slice(4));
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
    serveStatic(req, res);
  } catch (e) {
    send(res, 400, { error: e.message });
  }
}).listen(PORT, () => console.log(`RAREVO CRM running on http://localhost:${PORT}`));

/* ---------- background sync (WhatsApp contacts + last 7 days of Meta spend) ---------- */
const system = { id: 'system', name: 'Auto-sync', role: 'super', businessId: '' };
async function autosync() {
  for (const b of db.businesses) {
    if (b.status === 'paused') continue;
    if (b.rarevo && b.rarevo.key) await core.handle('POST', `/businesses/${b.id}/rarevo/sync`, {}, system).catch(() => {});
    if (b.meta && b.meta.token) {
      const d = t => new Date(t).toISOString().slice(0, 10);
      await core.handle('POST', `/businesses/${b.id}/meta/sync-spend`, { since: d(Date.now() - 6 * 864e5), until: d(Date.now()) }, system).catch(() => {});
    }
  }
}
if (SYNC_MIN > 0) setInterval(autosync, SYNC_MIN * 60000);
process.on('SIGINT', () => { clearTimeout(timer); fs.writeFileSync(DB_FILE, JSON.stringify(db)); process.exit(0); });
process.on('SIGTERM', () => { clearTimeout(timer); fs.writeFileSync(DB_FILE, JSON.stringify(db)); process.exit(0); });
