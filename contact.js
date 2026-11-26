/* Contact form on contact.html.
   Saves through Supabase submit_contact_message (anon cannot read the table).
   The database emails the owner when vault secret web3forms_access_key is a real
   Web3Forms key. That key is not in this file. */
(function () {
  var EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
  var started = Date.now();
  var form = document.getElementById('contact-form');
  if (!form) return;

  var fields = {
    name: form.querySelector('[name="name"]'),
    email: form.querySelector('[name="email"]'),
    phone: form.querySelector('[name="phone"]'),
    message: form.querySelector('[name="message"]'),
    company: form.querySelector('[name="tcd_hp"]'),
  };
  var hints = {
    name: document.getElementById('hint-name'),
    email: document.getElementById('hint-email'),
    phone: document.getElementById('hint-phone'),
    message: document.getElementById('hint-message'),
  };
  var phoneHelp = 'UAE numbers and international numbers are both fine.';
  var go = document.getElementById('contact-go');
  var status = document.getElementById('contact-status');
  var ok = document.getElementById('contact-ok');
  var busy = false;
  var db = null;

  function client() {
    if (db) return db;
    var cfg = window.TCD_SUPABASE;
    if (!cfg || !cfg.url || !cfg.key || !window.supabase || !window.supabase.createClient) return null;
    db = window.supabase.createClient(cfg.url, cfg.key);
    return db;
  }

  function cleanPhone(value) {
    return String(value || '').replace(/[^0-9+]/g, '');
  }

  function problems(values) {
    var out = {};
    var name = values.name.replace(/\s+/g, ' ').trim();
    var email = values.email.trim();
    var phone = values.phone.trim();
    var message = values.message.trim();
    if (name.length < 2 || name.length > 80 || /[<>]|https?:\/\/|www\./i.test(name)) {
      out.name = 'Add your name. Two letters or more is enough.';
    }
    if (!EMAIL_RE.test(email) || email.length > 200) {
      out.email = "That email doesn't look right. Check it and try again.";
    }
    if (!/^\+?[0-9]{8,15}$/.test(cleanPhone(phone)) || phone.length > 40) {
      out.phone = 'Add a mobile number, like 050 123 4567 or +971 50 123 4567.';
    }
    if (message.length < 10 || message.length > 2000) {
      out.message = 'Write a message of at least a short sentence.';
    }
    return out;
  }

  function setHint(key, text, bad) {
    var el = hints[key];
    if (!el) return;
    el.textContent = text || (key === 'phone' ? phoneHelp : '');
    el.classList.toggle('bad', !!bad);
    fields[key].setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (bad) fields[key].setAttribute('aria-describedby', el.id);
  }

  function showStatus(text) {
    status.hidden = !text;
    status.textContent = text || '';
  }

  function paint(errors) {
    ['name', 'email', 'phone', 'message'].forEach(function (key) {
      setHint(key, errors[key] || '', !!errors[key]);
    });
  }

  ['name', 'email', 'phone', 'message'].forEach(function (key) {
    fields[key].addEventListener('input', function () {
      if (fields[key].getAttribute('aria-invalid') === 'true') {
        var again = problems({
          name: fields.name.value,
          email: fields.email.value,
          phone: fields.phone.value,
          message: fields.message.value,
        });
        setHint(key, again[key] || '', !!again[key]);
      }
    });
  });

  function serverText(code) {
    if (code === 'name') return 'Add your name. Two letters or more is enough.';
    if (code === 'email') return "That email doesn't look right. Check it and try again.";
    if (code === 'phone') return 'Add a mobile number, like 050 123 4567 or +971 50 123 4567.';
    if (code === 'message') return 'Write a message of at least a short sentence.';
    if (code === 'rate') return "That's a few messages in a row. Please wait a little while and try again.";
    return "We couldn't send that just now. Please try again in a moment.";
  }

  function fail(text) {
    busy = false;
    go.disabled = false;
    go.textContent = 'Send message';
    showStatus(text);
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
  }

  function succeed() {
    busy = false;
    form.hidden = true;
    ok.hidden = false;
    showStatus('');
    ok.focus();
  }

  function syncLinks() {
    var links = window.SITE && window.SITE.links;
    if (!links) return;
    document.querySelectorAll('[data-ct]').forEach(function (a) {
      var key = a.getAttribute('data-ct');
      if (links[key]) a.href = links[key];
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    showStatus('');
    var values = {
      name: fields.name.value,
      email: fields.email.value,
      phone: fields.phone.value,
      message: fields.message.value,
    };
    var errors = problems(values);
    paint(errors);
    var first = ['name', 'email', 'phone', 'message'].filter(function (key) { return errors[key]; })[0];
    if (first) {
      fields[first].focus();
      fail('Please correct the highlighted fields and try again.');
      return;
    }

    var c = client();
    if (!c) {
      fail("We couldn't reach the contact form. Check your connection and try again.");
      return;
    }

    busy = true;
    go.disabled = true;
    go.textContent = 'Sending…';
    c.rpc('submit_contact_message', {
      p_name: values.name.replace(/\s+/g, ' ').trim(),
      p_email: values.email.trim(),
      p_phone: values.phone.trim(),
      p_message: values.message.trim(),
      p_company: fields.company ? fields.company.value : '',
      p_wait_ms: Date.now() - started,
    }).then(function (res) {
      if (res.error) { fail(serverText('')); return; }
      var data = res.data || {};
      if (data.ok) { succeed(); return; }
      var code = data.error || '';
      if (hints[code]) {
        setHint(code, serverText(code), true);
        fields[code].focus();
      }
      fail(serverText(code));
    }).catch(function () {
      fail("We couldn't reach the contact form. Check your connection and try again.");
    });
  });

  syncLinks();
  if (hints.phone && !hints.phone.textContent) hints.phone.textContent = phoneHelp;
})();
