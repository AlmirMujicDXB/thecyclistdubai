(function () {
  const cfg = window.TCD_SUPABASE || {};
  const sb = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { detectSessionInUrl: true, persistSession: true },
  });
  const ADMIN = 'almir.mujic2022@gmail.com';
  const $ = (id) => document.getElementById(id);
  const views = {
    welcome: $('viewWelcome'),
    signin: $('viewSignin'),
    name: $('viewName'),
    chat: $('viewChat'),
  };
  let me = null;
  let profile = null;
  let channel = null;
  const rows = new Map();

  function show(name) {
    Object.entries(views).forEach(([key, el]) => {
      const on = key === name;
      el.hidden = !on;
      el.classList.toggle('on', on && key === 'chat');
    });
    $('views').hidden = name === 'chat';
  }

  function dubai(iso) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dubai',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  }

  function paint() {
    const log = $('log');
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 90;
    log.replaceChildren();
    const list = [...rows.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No messages yet. Say hello.';
      log.appendChild(empty);
      return;
    }
    const admin = (me.email || '').toLowerCase() === ADMIN;
    list.forEach((m) => {
      const mine = m.user_id === me.id;
      const box = document.createElement('article');
      box.className = 'msg' + (mine ? ' mine' : '');
      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = m.author_name || 'Rider';
      const p = document.createElement('p');
      p.textContent = m.body;
      const ft = document.createElement('div');
      ft.className = 'ft';
      const time = document.createElement('time');
      time.dateTime = m.created_at;
      time.textContent = dubai(m.created_at);
      ft.appendChild(time);
      if (mine || admin) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'del';
        del.textContent = 'Delete';
        del.addEventListener('click', () => remove(m.id));
        ft.appendChild(del);
      }
      box.append(nm, p, ft);
      log.appendChild(box);
    });
    if (nearBottom) log.scrollTop = log.scrollHeight;
  }

  function add(row) {
    if (!row || !row.id) return;
    rows.set(row.id, row);
    paint();
  }

  async function remove(id) {
    $('chatErr').textContent = '';
    const { error } = await sb.from('messages').delete().eq('id', id);
    if (error) {
      $('chatErr').textContent = 'Could not delete that message.';
      return;
    }
    rows.delete(id);
    paint();
  }

  async function loadMessages() {
    const { data, error } = await sb.from('messages')
      .select('id, user_id, author_name, body, created_at')
      .eq('room', 'general')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      $('chatErr').textContent = 'Could not load messages.';
      return;
    }
    rows.clear();
    (data || []).forEach((row) => rows.set(row.id, row));
    paint();
    $('log').scrollTop = $('log').scrollHeight;
  }

  function listen() {
    if (channel) sb.removeChannel(channel);
    channel = sb.channel('chat-general')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') add(payload.new);
        if (payload.eventType === 'DELETE' && payload.old) {
          rows.delete(payload.old.id);
          paint();
        }
      })
      .subscribe();
  }

  async function enter() {
    const { data } = await sb.from('profiles').select('display_name').eq('id', me.id).maybeSingle();
    profile = data;
    if (!profile) {
      show('name');
      return;
    }
    $('meLine').textContent = profile.display_name;
    show('chat');
    await loadMessages();
    listen();
  }

  $('goSign').addEventListener('click', () => {
    $('authErr').textContent = '';
    show('signin');
    $('email').focus();
  });
  $('backWelcome').addEventListener('click', () => show('welcome'));

  $('emailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('authErr').textContent = '';
    $('sendLink').disabled = true;
    const email = $('email').value.trim();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + '/chat.html' },
    });
    $('sendLink').disabled = false;
    if (error) {
      $('authErr').textContent = error.message || 'Could not send the email.';
      return;
    }
    $('codeForm').hidden = false;
    $('sentNote').textContent = 'Check ' + email + ' for the sign-in link.';
  });

  $('codeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('authErr').textContent = '';
    const { error } = await sb.auth.verifyOtp({
      email: $('email').value.trim(),
      token: $('code').value.trim(),
      type: 'email',
    });
    if (error) $('authErr').textContent = error.message || 'That code did not work.';
  });

  $('nameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('nameErr').textContent = '';
    const display_name = $('dname').value.trim();
    if (display_name.length < 2 || display_name.length > 24 || /[<>@]/.test(display_name)) {
      $('nameErr').textContent = 'Use 2–24 characters, with no @ or < >.';
      return;
    }
    $('saveName').disabled = true;
    const { error } = await sb.from('profiles').insert({ id: me.id, display_name });
    $('saveName').disabled = false;
    if (error) {
      $('nameErr').textContent = 'Could not save that name.';
      return;
    }
    profile = { display_name };
    $('meLine').textContent = display_name;
    show('chat');
    await loadMessages();
    listen();
  });

  $('body').addEventListener('input', () => {
    $('count').textContent = $('body').value.length + '/500';
  });

  $('sendForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('chatErr').textContent = '';
    const body = $('body').value.trim();
    if (!body) return;
    $('sendBtn').disabled = true;
    const { error } = await sb.from('messages').insert({ body });
    $('sendBtn').disabled = false;
    if (error) {
      $('chatErr').textContent = /wait a few seconds/i.test(error.message)
        ? 'Please wait a few seconds before sending again.'
        : (error.message || 'Could not send.');
      return;
    }
    $('body').value = '';
    $('count').textContent = '0/500';
  });

  $('signOut').addEventListener('click', async () => {
    if (channel) sb.removeChannel(channel);
    channel = null;
    rows.clear();
    profile = null;
    await sb.auth.signOut();
    show('welcome');
  });

  sb.auth.onAuthStateChange((_event, session) => {
    me = session && session.user;
    if (!me) {
      if (!views.signin.hidden || !views.welcome.hidden) return;
      show('welcome');
      return;
    }
    if (views.chat.classList.contains('on') || !views.name.hidden) return;
    enter();
  });
})();
