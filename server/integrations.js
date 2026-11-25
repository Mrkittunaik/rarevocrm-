/* Read-only connectors: Rarevo WhatsApp Automation Platform (CRM API) and Meta Marketing/Graph API.
   If your Rarevo API returns different field names, adjust normContact / normMessage below. */
'use strict';
const TIMEOUT = 20000;
const list = j => Array.isArray(j) ? j : (j && (j.data || j.contacts || j.items || j.results || j.messages || j.rows)) || [];
const pick = (o, ...k) => { for (const x of k) { const v = x.split('.').reduce((a, p) => a == null ? a : a[p], o); if (v != null && v !== '') return v; } return ''; };
const time = v => { if (!v) return null; if (typeof v === 'number') return v > 1e11 ? v : v * 1000; const t = Date.parse(v); return isNaN(t) ? null : t; };

/* ---------- Rarevo WhatsApp ---------- */
async function rq(conf, path, query) {
  const qs = query ? '?' + new URLSearchParams(query) : '';
  let res;
  try {
    res = await fetch(conf.url + path + qs, { headers: { Authorization: 'Bearer ' + conf.key, 'X-Api-Password': conf.password, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT) });
  } catch (e) {
    throw new Error(`Cannot reach Rarevo at ${conf.url} (${e.cause && e.cause.code || e.message}). If the CRM runs in Docker, use http://host.docker.internal instead of localhost.`);
  }
  const text = await res.text();
  let j; try { j = JSON.parse(text); } catch { throw new Error(`Rarevo returned a non-JSON reply (HTTP ${res.status}). Check the API URL.`); }
  if (res.status === 401 || res.status === 403) throw new Error('Rarevo rejected the API key or password (HTTP ' + res.status + ')');
  if (!res.ok) throw new Error((j && (j.error || j.message)) || 'Rarevo HTTP ' + res.status);
  return j;
}
const normContact = c => ({
  number: String(pick(c, 'number', 'phone', 'wa_id', 'waId', 'phone_number', 'phoneNumber', 'contact.number')),
  name: String(pick(c, 'name', 'profile_name', 'profileName', 'display_name', 'displayName', 'contact.name')),
  lastMessage: String(pick(c, 'last_message.text', 'last_message.body', 'lastMessage.text', 'lastMessage.body', 'last_message', 'lastMessage', 'last_text') || '').slice(0, 300),
  lastAt: time(pick(c, 'last_message_at', 'lastMessageAt', 'last_message.timestamp', 'updated_at', 'updatedAt')),
  firstAt: time(pick(c, 'created_at', 'createdAt', 'first_seen', 'firstSeen')),
  status: String(pick(c, 'status', 'stage', 'lead_status') || ''),
  tags: Array.isArray(c.tags) ? c.tags.map(t => typeof t === 'string' ? t : t.name).filter(Boolean) : [],
  messages: +pick(c, 'message_count', 'messageCount', 'messages_count') || null
});
const normMessage = m => {
  const dir = pick(m, 'direction', 'dir');
  const out = /out|sent|outbound/i.test(dir) || m.from_me === true || m.fromMe === true || m.outgoing === true;
  return { dir: out ? 'out' : 'in', text: String(pick(m, 'text', 'body', 'message', 'content.text', 'text.body', 'caption') || '[' + (m.type || 'media') + ']'), t: time(pick(m, 'timestamp', 'created_at', 'createdAt', 'sent_at', 'time')), by: String(pick(m, 'sender', 'agent', 'by') || '') };
};
const rarevo = {
  async summary(conf) { return await rq(conf, '/summary'); },
  async contacts(conf) {
    const seen = new Map();
    for (let page = 1; page <= 100; page++) {
      const j = await rq(conf, '/contacts', { page, limit: 200, per_page: 200 });
      const a = list(j).map(normContact).filter(c => c.number);
      let added = 0; for (const c of a) if (!seen.has(c.number)) { seen.set(c.number, c); added++; }
      const p = j.pagination || j.meta || j;
      const more = j.next_page || j.nextPage || j.has_more || j.hasMore || (p && p.next) || (p && p.page && (p.pages || p.total_pages || p.totalPages) && p.page < (p.pages || p.total_pages || p.totalPages));
      if (!a.length || !added || !more) break;
    }
    return [...seen.values()];
  },
  async messages(conf, number) {
    const j = await rq(conf, '/contacts/' + encodeURIComponent(number) + '/messages', { limit: 200 });
    return list(j).map(normMessage).sort((a, b) => (a.t || 0) - (b.t || 0));
  }
};

/* ---------- Meta Graph API ---------- */
const act = id => String(id).startsWith('act_') ? id : 'act_' + id;
async function g(conf, path, params) {
  const u = new URL(`https://graph.facebook.com/${conf.version || 'v23.0'}${path}`);
  for (const k in params || {}) if (params[k] != null) u.searchParams.set(k, params[k]);
  u.searchParams.set('access_token', conf.token);
  return gget(u.toString());
}
async function gget(url) {
  let res; try { res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) }); } catch (e) { throw new Error('Cannot reach Meta Graph API: ' + e.message); }
  const j = await res.json().catch(() => ({}));
  if (j.error) throw new Error('Meta: ' + (j.error.error_user_msg || j.error.message));
  if (!res.ok) throw new Error('Meta HTTP ' + res.status);
  return j;
}
async function all(conf, path, params, max = 30) {
  let j = await g(conf, path, params), out = [...(j.data || [])], n = 0;
  while (j.paging && j.paging.next && n++ < max) { j = await gget(j.paging.next); out = out.concat(j.data || []); }
  return out;
}
const LEAD_TYPES = ['lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped', 'offsite_conversion.fb_pixel_lead'];
const meta = {
  async account(conf) { return g(conf, '/' + act(conf.adAccountId), { fields: 'name,currency,account_status,amount_spent' }); },
  async insights(conf, since, until) {
    const rows = await all(conf, '/' + act(conf.adAccountId) + '/insights', { level: 'campaign', fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions', time_increment: 1, time_range: JSON.stringify({ since, until }), limit: 500 });
    return rows.map(r => {
      const acts = r.actions || []; let leads = 0;
      for (const t of LEAD_TYPES) { const a = acts.find(x => x.action_type === t); if (a) { leads = +a.value; break; } }
      return { date: r.date_start, campaign: r.campaign_name || r.campaign_id, spend: +r.spend || 0, impressions: +r.impressions || 0, clicks: +r.clicks || 0, leads };
    });
  },
  async forms(conf) { return (await all(conf, '/' + conf.pageId + '/leadgen_forms', { fields: 'id,name,status,leads_count', limit: 100 })).map(f => ({ id: f.id, name: f.name, status: f.status, count: f.leads_count })); },
  async leads(conf, formId, since) {
    const params = { fields: 'id,created_time,field_data,ad_name,campaign_name', limit: 100 };
    if (since) params.filtering = JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: Math.floor(since / 1000) }]);
    const rows = await all(conf, '/' + formId + '/leads', params, 100);
    return rows.map(l => {
      const f = {}; for (const d of l.field_data || []) f[d.name] = (d.values || []).join(', ');
      const take = (...k) => { for (const x of k) if (f[x]) { const v = f[x]; delete f[x]; return v; } return ''; };
      let name = take('full_name', 'name');
      const fn = take('first_name'), ln = take('last_name'); if (!name) name = [fn, ln].filter(Boolean).join(' ');
      return { id: l.id, created: time(l.created_time), name, phone: take('phone_number', 'phone', 'mobile_number', 'whatsapp_number'), email: take('email'), campaign: l.campaign_name || '', ad: l.ad_name || '', fields: f };
    });
  }
};

module.exports = { rarevo, meta };
