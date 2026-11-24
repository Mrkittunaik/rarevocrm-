/* Demo mode: used only when the page is opened without the Node server (for example the hosted preview).
   Data lives in this browser's localStorage; WhatsApp and Meta syncs return sample data. */
(function () {
  'use strict';
  const KEY = 'rarevo-crm-demo-v5';
  const DAY = 864e5, HR = 36e5;
  let x = 7; const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647; const pick = a => a[Math.floor(rnd() * a.length)];
  const FIRST = ['Aarav', 'Ananya', 'Vikram', 'Meera', 'Karthik', 'Divya', 'Rohan', 'Sana', 'Imran', 'Lakshmi', 'Nikhil', 'Pooja', 'Farhan', 'Keerthi', 'Suresh', 'Neha', 'Aditya', 'Harini', 'Manoj', 'Swathi', 'Rahul', 'Bhavana', 'Zoya', 'Teja', 'Varun', 'Ishita', 'Gautam', 'Ritu', 'Ajay', 'Kavya'];
  const LAST = ['Reddy', 'Sharma', 'Rao', 'Khan', 'Iyer', 'Patel', 'Naidu', 'Gupta', 'Verma', 'Menon'];
  const phone = () => '+91 9' + String(Math.floor(rnd() * 1e9)).padStart(9, '0');
  const q15 = t => Math.round(t / 9e5) * 9e5;
  const ymd = t => new Date(t).toISOString().slice(0, 10);

  function seed() {
    x = 7; const t0 = Date.now();
    const users = [
      { id: 'u_admin', name: 'RAREVO Admin', username: 'admin', email: 'admin@rarevo.local', role: 'super', businessId: '', createdAt: t0 },
      { id: 'u_own', name: 'Kittu Owner', username: 'kittu.admin', email: 'owner@kittu.in', role: 'owner', businessId: 'b1', createdAt: t0 },
      { id: 'u1', name: 'Ravi Kumar', username: 'kittu.ravi', email: 'ravi@kittu.in', role: 'staff', businessId: 'b1', createdAt: t0 },
      { id: 'u2', name: 'Priya Sharma', username: 'kittu.priya', email: 'priya@kittu.in', role: 'staff', businessId: 'b1', createdAt: t0 },
      { id: 'u3', name: 'Arjun Reddy', username: 'rarevo.arjun', email: 'arjun@rarevo.local', role: 'staff', businessId: 'b2', createdAt: t0 }];
    const labels = { red: 'Hot', orange: 'Urgent', yellow: 'Waiting', green: 'Ready to close', blue: 'Info sent', purple: 'VIP' };
    const mkB = (id, name, industry, color, extra) => Object.assign({ id, name, industry, status: 'active', color, currency: 'INR', meetEmails: 'admin@rarevo.local', colorLabels: { ...labels }, assign: { mode: 'round', pool: id === 'b1' ? ['u1', 'u2'] : id === 'b2' ? ['u3'] : [], idx: 0 }, rarevo: null, meta: null, createdAt: t0 - 40 * DAY }, extra);
    const businesses = [
      mkB('b1', 'kittu', 'Bags & accessories', '#4d7c0f', { phone: '+91 9177731239', rarevo: { url: 'http://localhost/api/crm/v1', key: 'demo-key-6NZ', password: 'demo', connectedAt: t0 - 3 * DAY, status: 'ok', error: '', lastSync: t0 - 2 * HR }, meta: { adAccountId: 'act_1029384756', token: 'demo-token-a9Qz', pageId: '1122334455', version: 'v23.0', accountName: 'kittu ads', connectedAt: t0 - 3 * DAY, status: 'ok', error: '', lastSync: t0 - HR } }),
      mkB('b2', 'rarevo', 'Digital agency', '#7c3aed', { phone: '+1 5558339618', rarevo: { url: 'http://localhost/api/crm/v1', key: 'demo-key-Q2x', password: 'demo', connectedAt: t0 - 5 * DAY, status: 'error', error: 'Rarevo rejected the API key or password (HTTP 401)', lastSync: t0 - 4 * DAY } }),
      mkB('b3', 'Hyderabad MeatHub', 'Food delivery', '#dc2626', { status: 'onboarding' })];
    const sheets = [
      { id: 's1', businessId: 'b1', name: 'Bag leads', category: 'Bags', columns: [{ id: 'cBag', name: 'Bag type', type: 'select', options: ['Tote', 'Backpack', 'Sling', 'Laptop bag', 'Custom print'] }, { id: 'cQty', name: 'Quantity', type: 'number' }], source: 'manual', labels: { phone: 'WhatsApp number' }, hidden: [], createdAt: t0 - 30 * DAY, updated: t0 },
      { id: 's2', businessId: 'b1', name: 'Corporate gifting', category: 'Bulk orders', access: { view: [], edit: ['u1'] }, columns: [{ id: 'cCo', name: 'Company', type: 'text' }, { id: 'cQty2', name: 'Quantity', type: 'number' }], source: 'upload', createdAt: t0 - 12 * DAY, updated: t0 },
      { id: 's3', businessId: 'b1', name: 'Website enquiries', category: 'Website', columns: [{ id: 'cCity', name: 'City', type: 'text' }], source: 'manual', createdAt: t0 - 20 * DAY, updated: t0 },
      { id: 's4', businessId: 'b2', name: 'Client leads', category: 'Leads', columns: [{ id: 'cSvc', name: 'Service', type: 'select', options: ['Website', 'E-commerce', 'Meta ads', 'Google ads', 'SEO'] }, { id: 'cBud', name: 'Budget', type: 'number' }], source: 'manual', createdAt: t0 - 30 * DAY, updated: t0 },
      { id: 's5', businessId: 'b3', name: 'Sheet 1', category: 'General', columns: [], source: 'manual', createdAt: t0 - 3 * DAY, updated: t0 }];
    const STAT = ['New', 'Contacted', 'Interested', 'Meeting set', 'Negotiation', 'Won', 'Lost'];
    const rows = []; let i = 0;
    const mkR = (sh, src, fill) => {
      const fn = FIRST[i++ % FIRST.length], ln = pick(LAST), added = t0 - Math.floor(rnd() * 45 * DAY) - Math.floor(rnd() * 10) * HR, status = pick(STAT);
      const r = { id: 'r' + i, sheetId: sh.id, businessId: sh.businessId, name: fn + ' ' + ln, phone: phone(), email: fn.toLowerCase() + '.' + ln.toLowerCase() + '@gmail.com', source: src || pick(['Meta Ads', 'Meta Ads', 'WhatsApp', 'Website', 'Manual']), status, priority: pick(['High', 'Medium', 'Low']), color: rnd() < .45 ? pick(['red', 'orange', 'yellow', 'green', 'blue', 'purple']) : '', owner: rnd() < .12 ? '' : sh.businessId === 'b1' ? pick(['u1', 'u2']) : 'u3', added, followUp: null, closed: null, price: null, notes: pick(['Asked for price list', 'Wants a call after 6 PM', 'Interested in bulk order', 'Comparing with a competitor', 'Requested catalogue', '', '']), data: {}, ref: '', log: [{ t: added, by: 'System', text: 'Added to ' + sh.name }], updated: added };
      if (status === 'Won') { r.closed = Math.min(t0 - 2 * HR, added + Math.floor(rnd() * 15 * DAY)); r.price = Math.round(5 + rnd() * 80) * 500; }
      else if (status === 'Lost') r.closed = Math.min(t0 - 2 * HR, added + Math.floor(rnd() * 10 * DAY));
      else { const k = rnd(); r.followUp = q15(k < .2 ? t0 - Math.floor(1 + rnd() * 30) * HR : k < .45 ? t0 + Math.floor(2 + rnd() * 8) * HR : t0 + Math.floor(1 + rnd() * 6) * DAY); }
      fill && fill(r); rows.push(r); return r;
    };
    for (let k = 0; k < 22; k++) mkR(sheets[0], null, r => { r.data = { cBag: pick(['Tote', 'Backpack', 'Sling', 'Laptop bag', 'Custom print']), cQty: pick([1, 5, 10, 25, 50, 100]) }; });
    for (let k = 0; k < 9; k++) mkR(sheets[1], 'Import', r => { r.data = { cCo: pick(['Infosys', 'Deloitte', 'Cyient', 'Novartis', 'ICICI', 'Tech Mahindra']), cQty2: pick([50, 100, 250, 500]) }; });
    for (let k = 0; k < 8; k++) mkR(sheets[2], 'Website', r => { r.data = { cCity: pick(['Hyderabad', 'Secunderabad', 'Gachibowli', 'Kukatpally']) }; });
    for (let k = 0; k < 14; k++) mkR(sheets[3], null, r => { r.data = { cSvc: pick(['Website', 'E-commerce', 'Meta ads', 'Google ads', 'SEO']), cBud: Math.round(20 + rnd() * 150) * 1000 }; if (r.price) r.price *= 4; });
    const hot = rows.find(r => r.sheetId === 's1' && !['Won', 'Lost'].includes(r.status));
    Object.assign(hot, { owner: 'u1', followUp: q15(t0 + 25 * 6e4), status: 'Interested', priority: 'High', color: 'red' });
    const spend = [];
    const camps = ['Diwali Offer – Lead Form', 'Hyderabad Lookalike 2%', 'Retarget – 30 day visitors'];
    for (let d = 29; d >= 0; d--) camps.forEach((c, j) => { const s = Math.round((600 + rnd() * 900) * (j === 0 ? 1.5 : 1)); const clicks = Math.round(s / (4 + rnd() * 4)); spend.push({ id: 'sp' + d + j, businessId: 'b1', date: ymd(t0 - d * DAY), campaign: c, spend: s, impressions: clicks * Math.round(40 + rnd() * 30), clicks, leads: Math.round(clicks * (0.004 + rnd() * 0.006)), source: 'meta', updated: t0 }); });
    const emails = [];
    ['Diwali sale – bags', 'New arrivals newsletter', 'Corporate gifting offer', 'Abandoned enquiry follow-up', 'Winter collection', 'Bulk order reminder'].forEach((c, j) => { const sent = Math.round(800 + rnd() * 2200), del = Math.round(sent * (.95 + rnd() * .04)), op = Math.round(del * (.18 + rnd() * .2)), cl = Math.round(op * (.08 + rnd() * .15)); emails.push({ id: 'em' + j, businessId: 'b1', date: ymd(t0 - (j * 5 + 1) * DAY), campaign: c, subject: c, sent, delivered: del, opened: op, clicked: cl, replies: Math.round(cl * .2), leads: Math.round(cl * .3), unsubscribed: Math.round(sent * .003), cost: Math.round(sent * .25), source: 'manual', updated: t0 }); });
    const contacts = { b1: demoContacts(14) };
    const summaries = { b1: { contacts: 14, messages_today: 0, messages_7d: 48, automations_active: 1, open_deals: 0 } };
    const forms = [{ id: 'fm_demo', businessId: 'b1', name: 'Bulk bag enquiry', title: 'Get a quote for custom bags', intro: 'Tell us what you need and our team will call you within a day.', thanks: 'Thank you! Our team will call you shortly.', button: 'Get my quote', color: '#4d7c0f', active: true, sheetId: 's1', submissions: 12, createdAt: t0 - 9 * DAY, fields: [{ id: 'q1', label: 'Name', type: 'text', required: true, options: [] }, { id: 'q2', label: 'Phone', type: 'phone', required: true, options: [] }, { id: 'q3', label: 'Email', type: 'email', required: false, options: [] }, { id: 'q4', label: 'Bag type', type: 'select', required: false, options: ['Tote', 'Backpack', 'Sling', 'Laptop bag', 'Custom print'] }, { id: 'q5', label: 'Quantity', type: 'number', required: false, options: [] }, { id: 'q6', label: 'Message', type: 'textarea', required: false, options: [] }] }];
    const requests = [{ id: 'rq1', businessId: 'b1', sheetId: 's3', userId: 'u2', level: 'edit', note: 'I handle website enquiries this month', status: 'pending', at: t0 - 2 * HR }];
    return { users, businesses, sheets, rows, spend, emails, contacts, summaries, requests, forms };
  }
  function demoContacts(n) {
    const t0 = Date.now(), out = [];
    const msgs = ['Hi, I saw your ad. What is the price?', 'Do you have tote bags for bulk orders?', 'Where is your shop?', 'Can someone call me?', 'Send me the catalogue please', 'Is cash on delivery available?', 'Thanks, I will confirm tomorrow'];
    for (let k = 0; k < n; k++) { const fn = FIRST[(k * 5 + 3) % FIRST.length], ln = pick(LAST); out.push({ number: '+91' + String(9000000000 + Math.floor(rnd() * 999999999)), name: fn + ' ' + ln, lastMessage: pick(msgs), lastAt: t0 - Math.floor(rnd() * 7 * DAY), firstAt: t0 - Math.floor((7 + rnd() * 20) * DAY), status: pick(['', 'new', 'replied', 'interested']), tags: rnd() < .4 ? [pick(['bulk', 'retail', 'hot'])] : [], messages: Math.round(2 + rnd() * 20) }); }
    return out;
  }
  // simulated connectors
  const sim = {
    rarevo: {
      async summary() { return { contacts: 0, messages_today: Math.round(rnd() * 20), messages_7d: Math.round(40 + rnd() * 60), automations_active: 2 }; },
      async contacts(conf) { if (/fail/.test(conf.url)) throw new Error('Rarevo rejected the API key or password (HTTP 401)'); return demoContacts(12 + Math.floor(rnd() * 8)); },
      async messages(conf, number) {
        const t = Date.now() - 3 * HR;
        return [{ dir: 'in', text: 'Hi, I saw your ad. What is the price?', t }, { dir: 'out', text: 'Hi! 👋 Thanks for reaching out. Prices depend on quantity — could you tell us what you need?', t: t + 4000, by: 'Auto-reply' }, { dir: 'in', text: 'Around 50 backpacks with our logo', t: t + 20 * 6e4 }, { dir: 'out', text: 'Great! For 50 backpacks with your logo it is about ₹32,000. Shall I share designs?', t: t + 35 * 6e4, by: 'Priya Sharma' }];
      }
    },
    meta: {
      async account() { return { name: 'Demo ad account', currency: 'INR' }; },
      async insights(conf, since, until) {
        const out = [], a = new Date(since + 'T00:00'), b = new Date(until + 'T00:00');
        for (let d = a; d <= b; d = new Date(d.getTime() + DAY)) ['Diwali Offer – Lead Form', 'Hyderabad Lookalike 2%'].forEach(c => { const s = Math.round(500 + rnd() * 1200), cl = Math.round(s / 6); out.push({ date: ymd(d), campaign: c, spend: s, impressions: cl * 55, clicks: cl, leads: Math.round(cl * .008) }); });
        return out;
      },
      async forms() { return [{ id: 'f1', name: 'Diwali Offer – Lead Form', status: 'ACTIVE', count: 6 }, { id: 'f2', name: 'Bulk order enquiry', status: 'ACTIVE', count: 4 }]; },
      async leads(conf, formId) {
        const out = []; const n = formId === 'f1' ? 6 : 4;
        for (let k = 0; k < n; k++) { const fn = pick(FIRST), ln = pick(LAST); out.push({ id: formId + '_' + Date.now() + k, created: Date.now() - Math.floor(rnd() * 3 * DAY), name: fn + ' ' + ln, phone: phone(), email: fn.toLowerCase() + '@gmail.com', campaign: 'Diwali Offer – Lead Form', ad: 'Carousel – Totes', fields: { city: pick(['Hyderabad', 'Warangal', 'Vijayawada']), 'what_are_you_looking_for?': pick(['Tote bags', 'Backpacks', 'Corporate gifts']) } }); }
        return out;
      }
    }
  };
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.businesses ? s : null; } catch (e) { return null; } }
  let db = load() || seed();
  let core = null;
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  function make() { core = RCore.createCore(db, { save: persist, integrations: sim }); persist(); }
  make();
  let meId = 'u_admin';
  try { meId = localStorage.getItem(KEY + '-me') || 'u_admin'; } catch (e) {}
  window.RDemo = {
    user: () => db.users.find(u => u.id === meId) || db.users[0],
    allUsers: () => db.users.map(u => ({ id: u.id, name: u.name, role: u.role, username: u.username })),
    setUser(id) { meId = id; try { localStorage.setItem(KEY + '-me', id); } catch (e) {} },
    async handle(method, path, body) {
      if (path === '/me/password') return { status: 200, body: { ok: true } };
      return core.handle(method, path, body, this.user());
    },
    publicForm(id) { return core.publicForm(id); },
    publicSubmit(id, values, meta) { return core.publicSubmit(id, values, meta); },
    collect(key, payload) { return core.collect(key, payload); },
    backId: (() => { try { return localStorage.getItem(KEY + '-back') || ''; } catch (e) { return ''; } })(),
    viewAs(id) { this.backId = meId; try { localStorage.setItem(KEY + '-back', meId); } catch (e) {} this.setUser(id); },
    back() { const b = this.backId; this.backId = ''; try { localStorage.removeItem(KEY + '-back'); } catch (e) {} if (b) this.setUser(b); },
    reset() { db = seed(); make(); }
  };
})();
