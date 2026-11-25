/* Ride RSVP widget. Reused by every ride page that includes it.
   The page declares which ride this is with data-ride-ref on #rsvp-mount
   (tcd-ride, purple-ride, …). If the page is showing a date — the selected
   day on the ride page — that date is copied onto data-ride-date and stored
   with the sign-up. The public list is everyone for that ride_ref.
   Inserts do not ask the database to return the new row (anon cannot read the table). */
(function () {
  var mount = document.getElementById('rsvp-mount');
  if (!mount) return;
  var rideRef = (mount.getAttribute('data-ride-ref') || '').trim();
  if (!rideRef) return;

  /* EXAMPLE DATA — not real riders.
     Shown only when the live list is empty or the list cannot be loaded.
     Names and levels match the approved RSVP mockup (first name + last initial). */
  var EXAMPLE = [
    ['Sara K.', 'intermediate'],
    ['Omar R.', 'advanced'],
    ['Maya T.', 'beginner'],
    ['Daniel P.', 'intermediate'],
    ['Leila H.', 'advanced'],
    ['Yusuf A.', 'beginner'],
    ['Priya N.', 'intermediate'],
    ['Hassan M.', 'advanced'],
    ['Nina V.', 'intermediate'],
    ['Tom B.', 'beginner'],
    ['Fatima S.', 'intermediate'],
  ];

  var EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
  var section = document.createElement('section');
  section.className = 'rsvp';
  section.id = 'rsvp';
  section.setAttribute('data-ride-ref', rideRef);
  var presetDate = (mount.getAttribute('data-ride-date') || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(presetDate)) section.setAttribute('data-ride-date', presetDate);

  section.innerHTML =
    '<div class="rsvp-h"><h2><svg class="rsvp-bike" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6.2" cy="16.2" r="3.1"/><circle cx="17.8" cy="16.2" r="3.1"/><path d="M6.2 16.2 L10 9.2h3.6l2.2 4.2H18M10 9.2l2.3 7M13.6 9.2l-2.6 3.4"/></svg> RSVP · Are you coming?</h2></div>' +
    '<p class="rsvp-lead">Sign up with your email and confirm you\'re coming. The organizer sees your details privately; the public list below shows first name and last initial only, and updates live.</p>' +
    '<form class="rsvp-form" novalidate>' +
      '<label class="rsvp-field"><span class="rsvp-lab">Email address <i class="req">*</i></span>' +
        '<input type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="200" required placeholder="you@example.com" aria-required="true"></label>' +
      '<label class="rsvp-field"><span class="rsvp-lab">Name <i class="opt">optional</i></span>' +
        '<input type="text" name="name" autocomplete="name" maxlength="80" placeholder="e.g. Alex Mercer"></label>' +
      '<button class="rsvp-go" type="submit">Confirm I\'m coming</button>' +
      '<p class="rsvp-msg" hidden></p>' +
    '</form>' +
    '<div class="rsvp-ok" hidden role="status" tabindex="-1"><i aria-hidden="true">✓</i><div><b>You\'re confirmed.</b><span></span></div></div>' +
    '<div class="rsvp-who">' +
      '<div class="rsvp-who-top">' +
        '<h3>Who\'s coming</h3>' +
        '<p class="rsvp-count"><b>0</b> <span>riders going</span></p>' +
        '<div class="rsvp-pills">' +
          '<span class="rsvp-pill ex">EXAMPLE DATA</span>' +
          '<span class="rsvp-pill live" hidden><i aria-hidden="true"></i><span>Updating live</span></span>' +
        '</div>' +
      '</div>' +
      '<p class="rsvp-priv">Email addresses and mobile numbers are not shown on this public list.</p>' +
      '<ul class="rsvp-grid"></ul>' +
    '</div>' +
    '<p class="rsvp-foot">Your email stays with the organizer. It is not shown on this list.</p>' +
    '<p class="rsvp-sr" aria-live="polite"></p>';

  var hero = document.querySelector('#app .hero');
  if (hero) hero.insertAdjacentElement('afterend', section);
  else (document.getElementById('app') || document.body).appendChild(section);
  mount.remove();

  var form = section.querySelector('.rsvp-form');
  var emailInput = form.querySelector('input[name="email"]');
  var nameInput = form.querySelector('input[name="name"]');
  var goBtn = form.querySelector('.rsvp-go');
  var msgEl = form.querySelector('.rsvp-msg');
  var okEl = section.querySelector('.rsvp-ok');
  var okText = okEl.querySelector('span');
  var countEl = section.querySelector('.rsvp-count b');
  var countLabel = section.querySelector('.rsvp-count span');
  var exPill = section.querySelector('.rsvp-pill.ex');
  var livePill = section.querySelector('.rsvp-pill.live');
  var liveText = livePill.querySelector('span');
  var grid = section.querySelector('.rsvp-grid');
  var sr = section.querySelector('.rsvp-sr');

  var db = null;
  var busy = false;
  var liveRows = null;
  var liveOk = false;
  var fetched = false;
  var pollTimer = 0;

  function client() {
    if (db) return db;
    var cfg = window.TCD_SUPABASE;
    if (!cfg || !cfg.url || !cfg.key || !window.supabase || !window.supabase.createClient) return null;
    db = window.supabase.createClient(cfg.url, cfg.key);
    return db;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function initials(display) {
    var parts = String(display || '').replace(/\./g, '').split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  /* Same short name the database shows: first name, then the last word's initial. */
  function publicName(name) {
    var n = String(name || '').replace(/\s+/g, ' ').trim();
    if (!n) return 'Guest';
    var firstSpace = n.indexOf(' ');
    if (firstSpace < 0) return n;
    var lastWord = n.replace(/^.*\s+/, '');
    return n.slice(0, firstSpace) + ' ' + lastWord.charAt(0).toUpperCase() + '.';
  }

  function syncDate() {
    var chip = document.querySelector('#dChips .chip.on');
    var d = chip && chip.getAttribute('data-d');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) section.setAttribute('data-ride-date', d);
  }

  function watchDate() {
    var chips = document.getElementById('dChips');
    if (!chips) { setTimeout(watchDate, 400); return; }
    syncDate();
    new MutationObserver(syncDate).observe(chips, { subtree: true, attributes: true, childList: true });
  }

  function personHtml(name, levelClass, levelText) {
    return '<li class="rsvp-person"><span class="rsvp-av" aria-hidden="true">' + esc(initials(name)) +
      '</span><span class="rsvp-id"><strong>' + esc(name) + '</strong><span class="rsvp-lvl ' + esc(levelClass) + '">' +
      esc(levelText) + '</span></span></li>';
  }

  function paintList() {
    var usingExample = !liveRows || !liveRows.length;
    var html, count;
    if (usingExample) {
      count = EXAMPLE.length;
      html = EXAMPLE.map(function (row) { return personHtml(row[0], row[1], row[1]); }).join('');
    } else {
      count = Number(liveRows[0].attendee_count);
      if (!count) count = liveRows.length;
      html = liveRows.map(function (row) {
        var badge = row.status === 'maybe' ? 'maybe' : row.status === 'declined' ? 'declined' : 'going';
        var label = row.status === 'maybe' ? 'Maybe' : row.status === 'declined' ? 'Declined' : 'Going';
        return personHtml(row.display_name || 'Guest', badge, label);
      }).join('');
    }
    countEl.textContent = String(count);
    countLabel.textContent = count === 1 ? 'rider going' : 'riders going';
    exPill.hidden = !usingExample;
    livePill.hidden = !fetched;
    livePill.classList.toggle('off', fetched && !liveOk);
    liveText.textContent = liveOk ? 'Updating live' : 'List offline';
    grid.innerHTML = html;
    sr.textContent = usingExample
      ? 'Example names. ' + count + ' riders shown until the live list has someone, or if it cannot be loaded.'
      : count + (count === 1 ? ' rider is' : ' riders are') + ' on the list.';
  }

  function showMsg(text) {
    msgEl.hidden = !text;
    msgEl.textContent = text || '';
    if (text) {
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
    }
  }

  function friendly(error) {
    var code = String(error && error.code || '');
    var message = String(error && error.message || '');
    if (code === '23505' || /duplicate key/i.test(message)) return 'This email is already on the list for this ride.';
    if (code === '23514' || /email_check/i.test(message)) return "That email doesn't look right. Check it and try again.";
    if (/failed to fetch|network|timeout|load failed/i.test(message)) return "We couldn't reach the sign-up list. Check your connection and try again.";
    return "We couldn't save your RSVP. Please try again in a moment.";
  }

  function currentRef() {
    return (section.getAttribute('data-ride-ref') || rideRef).trim();
  }

  async function refresh() {
    var c = client();
    if (!c) {
      fetched = true;
      liveOk = false;
      liveRows = null;
      paintList();
      return;
    }
    try {
      var res = await c.rpc('ride_attendees', { ride_ref: currentRef() });
      if (res.error) throw res.error;
      liveRows = Array.isArray(res.data) ? res.data : [];
      liveOk = true;
    } catch (e) {
      liveOk = false;
      liveRows = null;
    }
    fetched = true;
    paintList();
  }

  function schedule() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(function () { refresh().then(schedule); }, 20000);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    syncDate();
    showMsg('');
    var email = emailInput.value.trim();
    var name = nameInput.value.replace(/\s+/g, ' ').trim();
    if (!email) { showMsg("Add your email address to confirm you're coming."); emailInput.focus(); return; }
    if (!EMAIL_RE.test(email)) { showMsg("That email doesn't look right. Check it and try again."); emailInput.focus(); return; }
    var c = client();
    if (!c) { showMsg("We couldn't reach the sign-up list. Check your connection and try again."); return; }
    var rideDate = section.getAttribute('data-ride-date') || '';
    var row = {
      ride_ref: currentRef(),
      email: email.toLowerCase(),
      name: name ? name.slice(0, 80) : null,
      status: 'confirmed',
      confirmed: true,
    };
    if (/^\d{4}-\d{2}-\d{2}$/.test(rideDate)) row.ride_date = rideDate;
    busy = true;
    goBtn.disabled = true;
    goBtn.textContent = 'Saving…';
    c.from('rsvps').insert(row).then(function (res) {
      busy = false;
      goBtn.disabled = false;
      goBtn.textContent = "Confirm I'm coming";
      if (res.error) { showMsg(friendly(res.error)); return; }
      form.hidden = true;
      var shown = publicName(name);
      okText.textContent = name
        ? "We saved your place. On the public list you'll show as " + shown
        : "We saved your place. On the public list you'll show as Guest, because no name was added.";
      okEl.hidden = false;
      okEl.focus();
      refresh();
    }).catch(function () {
      busy = false;
      goBtn.disabled = false;
      goBtn.textContent = "Confirm I'm coming";
      showMsg("We couldn't reach the sign-up list. Check your connection and try again.");
    });
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh();
  });

  paintList();
  watchDate();
  refresh().then(schedule);
})();
