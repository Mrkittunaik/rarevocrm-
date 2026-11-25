/* RAREVO CRM website collector.
   Add to any website, just before </body>:
   <script src="https://YOUR-CRM-DOMAIN/embed.js" data-key="YOUR_WEBSITE_KEY" async></script>
   Every form submitted on the site is copied into the CRM sheet (the form still works as normal).
   Options:  data-forms=".contact-form"  -> only these forms
             add data-crm-ignore to a <form> to skip it
   For custom code: window.RarevoCRM.send({ name: 'Ravi', phone: '98...', email: '...' }) */
(function () {
  'use strict';
  var s = document.currentScript || document.querySelector('script[data-key][src*="embed.js"]');
  if (!s) return;
  var key = s.getAttribute('data-key'), only = s.getAttribute('data-forms');
  if (!key) { console.warn('RAREVO CRM: data-key is missing on the embed script'); return; }
  var base = s.src.replace(/\/embed\.js.*$/, ''), url = base + '/api/collect/' + encodeURIComponent(key);
  var last = { t: 0, sig: '' };

  function post(payload) {
    var body = JSON.stringify(payload);
    try { if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return; } catch (e) {}
    try { fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: body }); } catch (e) {}
  }
  function utm() {
    var o = {}, q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(function (k) {
      var v = q.get(k) || sessionStorageGet(k); if (v) { o[k.replace('utm_', 'UTM ').replace('gclid', 'Google click ID').replace('fbclid', 'Facebook click ID')] = v; sessionStorageSet(k, v); }
    });
    return o;
  }
  function sessionStorageGet(k) { try { return sessionStorage.getItem('rcrm_' + k); } catch (e) { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem('rcrm_' + k, v); } catch (e) {} }
  utm();
  function labelFor(el) {
    var t = '';
    if (el.id) { var l = document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id) + '"]'); if (l) t = l.textContent; }
    if (!t && el.closest) { var w = el.closest('label'); if (w) t = w.textContent; }
    t = (t || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || el.id || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    return t.slice(0, 80);
  }
  function fromForm(form) {
    var fields = {}, els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var el = els[i], type = (el.type || '').toLowerCase();
      if (!el.name && !el.id) continue;
      if (/password|hidden|file|submit|button|reset|image/.test(type) || el.disabled) continue;
      if ((type === 'checkbox' || type === 'radio') && !el.checked) continue;
      var v = el.tagName === 'SELECT' && el.multiple ? Array.prototype.filter.call(el.options, function (o) { return o.selected; }).map(function (o) { return o.value; }).join(', ') : el.value;
      if (v == null || String(v).trim() === '') continue;
      var k = labelFor(el); if (!k) continue;
      fields[k] = fields[k] ? fields[k] + ', ' + v : String(v);
    }
    return fields;
  }
  function send(fields, formName) {
    var f = {}, k; for (k in fields) f[k] = fields[k];
    var u = utm(); for (k in u) f[k] = u[k];
    var sig = JSON.stringify(f); if (sig === last.sig && Date.now() - last.t < 4000) return; last = { t: Date.now(), sig: sig };
    post({ fields: f, form: formName || document.title, page: location.href, source: 'Website' });
  }
  document.addEventListener('submit', function (e) {
    var form = e.target; if (!form || form.tagName !== 'FORM') return;
    if (form.hasAttribute('data-crm-ignore')) return;
    if (only && !form.matches(only)) return;
    if (/search/i.test(form.getAttribute('role') || '') || form.querySelector('input[type=search]')) return;
    var fields = fromForm(form); if (!Object.keys(fields).length) return;
    send(fields, form.getAttribute('data-crm-name') || form.getAttribute('name') || form.id || document.title);
  }, true);
  window.RarevoCRM = { send: function (fields, formName) { send(fields || {}, formName); } };
})();
