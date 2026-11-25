(function () {
  const cfg = window.TCD_SUPABASE || {};
  const sb = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { detectSessionInUrl: true, persistSession: true },
  });
  const ADMIN = 'almir.mujic2022@gmail.com';
  const $ = (id) => document.getElementById(id);
  let me = null;
  let profile = null;
  let listings = [];
  let contactKind = 'whatsapp';
  let chosen = [];

  function money(n) {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(n);
  }
  function photoUrl(path) {
    return cfg.url + '/storage/v1/object/public/bike-photos/' + path.split('/').map(encodeURIComponent).join('/');
  }
  function mine(row) { return me && row.user_id === me.id; }
  function admin() { return me && (me.email || '').toLowerCase() === ADMIN; }

  async function load() {
    const { data, error } = await sb.from('bike_listings').select('*').order('created_at', { ascending: false });
    const grid = $('grid');
    grid.replaceChildren();
    if (error) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'Could not load the bikes.';
      grid.appendChild(p);
      return;
    }
    listings = data || [];
    if (!listings.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'No bikes listed yet.';
      grid.appendChild(p);
      return;
    }
    listings.forEach((row) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      const img = document.createElement('img');
      img.alt = '';
      img.src = photoUrl(row.photo_paths[0]);
      const body = document.createElement('div');
      body.className = 'body';
      const h = document.createElement('h2');
      h.textContent = row.title;
      if (row.sold) {
        const s = document.createElement('span');
        s.className = 'sold';
        s.textContent = 'SOLD';
        h.appendChild(s);
      }
      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = money(row.price_aed);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = row.frame_size + ' · ' + row.location;
      body.append(h, price, meta);
      btn.append(img, body);
      btn.addEventListener('click', () => openDetail(row));
      grid.appendChild(btn);
    });
  }

  function openDetail(row) {
    const sheet = $('sheet');
    sheet.replaceChildren();
    const close = document.createElement('button');
    close.className = 'x';
    close.type = 'button';
    close.textContent = '✕';
    close.addEventListener('click', closeDetail);
    const hero = document.createElement('img');
    hero.className = 'hero';
    hero.alt = row.title;
    hero.src = photoUrl(row.photo_paths[0]);
    sheet.append(close, hero);
    if (row.photo_paths.length > 1) {
      const thumbs = document.createElement('div');
      thumbs.className = 'thumbs';
      row.photo_paths.forEach((path, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        if (i === 0) b.className = 'on';
        const im = document.createElement('img');
        im.src = photoUrl(path);
        im.alt = '';
        b.appendChild(im);
        b.addEventListener('click', () => {
          hero.src = photoUrl(path);
          thumbs.querySelectorAll('button').forEach((el) => el.classList.remove('on'));
          b.classList.add('on');
        });
        thumbs.appendChild(b);
      });
      sheet.appendChild(thumbs);
    }
    const h = document.createElement('h2');
    h.textContent = row.title;
    if (row.sold) {
      const s = document.createElement('span');
      s.className = 'sold';
      s.textContent = 'SOLD';
      h.appendChild(s);
    }
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = money(row.price_aed);
    const facts = document.createElement('div');
    facts.className = 'facts';
    [['Brand', row.brand_model], ['Year', String(row.year)], ['Size', row.frame_size], ['Condition', row.condition], ['Location', row.location], ['Seller', row.seller_name]].forEach(([k, v]) => {
      const d = document.createElement('div');
      const sm = document.createElement('small');
      sm.textContent = k;
      const b = document.createElement('b');
      b.textContent = v;
      d.append(sm, b);
      facts.appendChild(d);
    });
    const desc = document.createElement('p');
    desc.textContent = row.description;
    sheet.append(h, price, facts, desc);
    if (row.contact_kind === 'whatsapp' && row.whatsapp) {
      const a = document.createElement('a');
      a.className = 'btn';
      a.href = 'https://wa.me/' + row.whatsapp.replace(/^\+/, '');
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'WhatsApp the seller';
      sheet.appendChild(a);
    } else {
      const a = document.createElement('a');
      a.className = 'btn';
      a.href = 'chat.html';
      a.textContent = 'Message in chat';
      sheet.appendChild(a);
    }
    if (mine(row) || admin()) {
      const actions = document.createElement('div');
      actions.className = 'actions';
      if (mine(row) && !row.sold) {
        const sold = document.createElement('button');
        sold.className = 'btn ghost';
        sold.type = 'button';
        sold.textContent = 'Mark sold';
        sold.addEventListener('click', () => markSold(row));
        actions.appendChild(sold);
      }
      const del = document.createElement('button');
      del.className = 'btn';
      del.type = 'button';
      del.textContent = 'Delete';
      del.addEventListener('click', () => removeListing(row));
      actions.appendChild(del);
      sheet.appendChild(actions);
    }
    $('shade').classList.add('open');
  }
  function closeDetail() { $('shade').classList.remove('open'); }

  async function markSold(row) {
    const { error } = await sb.from('bike_listings').update({ sold: true }).eq('id', row.id);
    if (error) return;
    row.sold = true;
    closeDetail();
    load();
  }
  async function removeListing(row) {
    const gone = await sb.storage.from('bike-photos').remove(row.photo_paths || []);
    if (gone.error) return;
    const { error } = await sb.from('bike_listings').delete().eq('id', row.id);
    if (error) return;
    closeDetail();
    load();
  }

  function showSell() {
    $('viewSignin').hidden = true;
    $('viewName').hidden = true;
    $('viewForm').hidden = false;
    $('formErr').textContent = '';
  }
  $('sellBtn').addEventListener('click', () => {
    if (!me) {
      $('authErr').textContent = '';
      $('viewForm').hidden = true;
      $('viewName').hidden = true;
      $('viewSignin').hidden = false;
      return;
    }
    if (!profile) {
      $('viewForm').hidden = true;
      $('viewSignin').hidden = true;
      $('viewName').hidden = false;
      return;
    }
    showSell();
  });
  $('closeAuth').addEventListener('click', () => { $('viewSignin').hidden = true; });
  $('cancelSell').addEventListener('click', () => { $('viewForm').hidden = true; });

  $('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('authErr').textContent = '';
    $('sendLink').disabled = true;
    const email = $('email').value.trim();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + '/bikes.html' },
    });
    $('sendLink').disabled = false;
    if (error) { $('authErr').textContent = error.message || 'Could not send the email.'; return; }
    $('codeForm').hidden = false;
    $('sentNote').textContent = 'Check ' + email + ' for the sign-in link.';
  });
  $('codeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.verifyOtp({
      email: $('email').value.trim(),
      token: $('code').value.trim(),
      type: 'email',
    });
    if (error) $('authErr').textContent = error.message || 'That code did not work.';
  });
  $('nameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const display_name = $('dname').value.trim();
    if (display_name.length < 2 || /[<>@]/.test(display_name)) {
      $('nameErr').textContent = 'Use 2–24 characters, with no @ or < >.';
      return;
    }
    const { error } = await sb.from('profiles').insert({ id: me.id, display_name });
    if (error) { $('nameErr').textContent = 'Could not save that name.'; return; }
    profile = { display_name };
    $('sub').textContent = 'Signed in as ' + display_name;
    showSell();
  });

  $('contactChoice').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    contactKind = b.dataset.k;
    $('contactChoice').querySelectorAll('button').forEach((el) => el.classList.toggle('on', el === b));
    $('waWrap').hidden = contactKind !== 'whatsapp';
  });

  $('photos').addEventListener('change', () => {
    chosen = [...$('photos').files].slice(0, 4);
    const box = $('previews');
    box.replaceChildren();
    chosen.forEach((file) => {
      const img = document.createElement('img');
      img.alt = '';
      img.src = URL.createObjectURL(file);
      box.appendChild(img);
    });
  });

  async function resizePhoto(file) {
    const ok = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ok.includes(file.type)) throw new Error('Use JPG, PNG or WebP photos.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Each photo must be 5 MB or smaller.');
    const bmp = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Could not prepare a photo.');
    return blob;
  }

  $('sellForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('formErr').textContent = '';
    if (chosen.length < 1 || chosen.length > 4) {
      $('formErr').textContent = 'Add 1 to 4 photos.';
      return;
    }
    const year = Number($('year').value);
    const price = Number($('price').value);
    const whatsapp = $('whatsapp').value.replace(/[^0-9+]/g, '');
    if (!Number.isInteger(year) || year < 1990 || year > 2035) {
      $('formErr').textContent = 'Enter a year from 1990 to 2035.';
      return;
    }
    if (!Number.isInteger(price) || price < 1 || price > 500000) {
      $('formErr').textContent = 'Enter a price in AED.';
      return;
    }
    if (contactKind === 'whatsapp' && !/^\+?[0-9]{8,15}$/.test(whatsapp)) {
      $('formErr').textContent = 'Enter a WhatsApp number with country code.';
      return;
    }
    $('publish').disabled = true;
    const id = crypto.randomUUID();
    const paths = [];
    try {
      for (let i = 0; i < chosen.length; i++) {
        const blob = await resizePhoto(chosen[i]);
        const path = me.id + '/' + id + '/' + i + '.jpg';
        const up = await sb.storage.from('bike-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if (up.error) throw new Error(up.error.message || 'Photo upload failed.');
        paths.push(path);
      }
      const { error } = await sb.from('bike_listings').insert({
        id,
        title: $('title').value.trim(),
        brand_model: $('brand').value.trim(),
        year,
        frame_size: $('size').value.trim(),
        condition: $('condition').value,
        price_aed: price,
        location: $('location').value.trim(),
        description: $('description').value.trim(),
        contact_kind: contactKind,
        whatsapp: contactKind === 'whatsapp' ? whatsapp : null,
        photo_paths: paths,
      });
      if (error) throw new Error(error.message || 'Could not publish.');
      $('sellForm').reset();
      chosen = [];
      $('previews').replaceChildren();
      $('viewForm').hidden = true;
      await load();
    } catch (err) {
      if (paths.length) await sb.storage.from('bike-photos').remove(paths);
      $('formErr').textContent = err.message || 'Could not publish.';
    }
    $('publish').disabled = false;
  });

  $('shade').addEventListener('click', (e) => { if (e.target === $('shade')) closeDetail(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

  sb.auth.onAuthStateChange(async (_evt, session) => {
    me = session && session.user;
    profile = null;
    if (!me) {
      $('sub').textContent = 'Bikes from riders in the group.';
      $('sellBtn').textContent = 'Sell your bike';
      return;
    }
    const { data } = await sb.from('profiles').select('display_name').eq('id', me.id).maybeSingle();
    profile = data;
    $('sub').textContent = profile ? 'Signed in as ' + profile.display_name : 'Signed in';
    if (profile && !$('viewSignin').hidden) showSell();
  });

  load();
})();
