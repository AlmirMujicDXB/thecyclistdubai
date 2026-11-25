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

  var EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
  var section = document.createElement('section');
  section.className = 'rsvp';
  section.id = 'rsvp';
  section.setAttribute('data-ride-ref', rideRef);
  var presetDate = (mount.getAttribute('data-ride-date') || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(presetDate)) section.setAttribute('data-ride-date', presetDate);

  section.innerHTML =
    '<div class="rsvp-who">' +
      '<div class="rsvp-who-top">' +
        '<h3>Who\'s coming</h3>' +
        '<p class="rsvp-count"><b></b> <span></span></p>' +
        '<div class="rsvp-pills">' +
          '<span class="rsvp-pill live" hidden><i aria-hidden="true"></i><span>Updating live</span></span>' +
        '</div>' +
      '</div>' +
      '<div class="rsvp-empty" hidden><b></b><span></span></div>' +
      '<ul class="rsvp-grid"></ul>' +
      '<p class="rsvp-priv">First name and last initial only. Email addresses stay with the organizer.</p>' +
    '</div>' +
    '<p class="rsvp-lead">Sign up with your email and confirm you\'re coming. The list above updates as soon as you\'re saved.</p>' +
    '<form class="rsvp-form" novalidate>' +
      '<label class="rsvp-field"><span class="rsvp-lab">Email address <i class="req">*</i></span>' +
        '<input type="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="200" required placeholder="you@example.com" aria-required="true"></label>' +
      '<label class="rsvp-field"><span class="rsvp-lab">Name <i class="opt">optional</i></span>' +
        '<input type="text" name="name" autocomplete="name" maxlength="80" placeholder="e.g. Alex Mercer"></label>' +
      '<button class="rsvp-go" type="submit">Confirm I\'m coming</button>' +
      '<p class="rsvp-msg" hidden></p>' +
    '</form>' +
    '<div class="rsvp-ok" hidden role="status" tabindex="-1"><i aria-hidden="true">✓</i><div><b>You\'re confirmed.</b><span></span></div></div>' +
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
  var countWrap = section.querySelector('.rsvp-count');
  var countEl = countWrap.querySelector('b');
  var countLabel = countWrap.querySelector('span');
  var emptyEl = section.querySelector('.rsvp-empty');
  var emptyTitle = emptyEl.querySelector('b');
  var emptyText = emptyEl.querySelector('span');
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
  var waits = 0;

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
    if (!d) d = document.body.getAttribute('data-ride-date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) section.setAttribute('data-ride-date', d);
  }

  function watchDate() {
    syncDate();
    var chips = document.getElementById('dChips');
    if (chips) new MutationObserver(syncDate).observe(chips, { subtree: true, attributes: true, childList: true });
    else new MutationObserver(syncDate).observe(document.body, { attributes: true, attributeFilter: ['data-ride-date'] });
  }

  function personHtml(name, status) {
    var extra = status === 'maybe' ? '<span class="rsvp-lvl maybe">Maybe</span>' : '';
    return '<li class="rsvp-person"><span class="rsvp-av" aria-hidden="true">' + esc(initials(name)) +
      '</span><span class="rsvp-id"><strong>' + esc(name) + '</strong>' + extra + '</span></li>';
  }

  function paintList() {
    var people = (liveRows || []).filter(function (row) { return row.status !== 'declined'; });
    var count = people.length;
    var showPeople = fetched && liveOk && count > 0;
    countWrap.hidden = !showPeople;
    countEl.textContent = showPeople ? String(count) : '';
    countLabel.textContent = showPeople ? (count === 1 ? 'rider going' : 'riders going') : '';
    livePill.hidden = !showPeople;
    liveText.textContent = 'Updating live';
    emptyEl.hidden = !(fetched && !showPeople);
    if (fetched && !liveOk) {
      emptyTitle.textContent = "Who's coming couldn't be loaded";
      emptyText.textContent = 'It will try again in a moment.';
    } else if (fetched && count === 0) {
      emptyTitle.textContent = 'Be the first to join';
      emptyText.textContent = 'No one has confirmed yet. Add your name and it will show here.';
    }
    grid.innerHTML = showPeople ? people.map(function (row) {
      return personHtml(row.display_name || 'Guest', row.status);
    }).join('') : '';
    sr.textContent = !fetched ? "Loading who's coming."
      : !liveOk ? "Who's coming could not be loaded."
      : count ? count + (count === 1 ? ' rider is' : ' riders are') + ' coming.'
      : 'Be the first to join. No one has confirmed yet.';
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
      // The library loads on its own. Keep the section on screen and try again
      // instead of giving up while that download is still in flight.
      if (waits++ < 40) { setTimeout(refresh, 200); return; }
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
