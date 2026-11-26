-- Contact form messages from contact.html.
-- Visitors can add a row through submit_contact_message. They cannot read the table.
-- Email is sent by the insert trigger only when vault secret web3forms_access_key
-- is a real Web3Forms access key. The placeholder below does not send anything.
--
-- Owner, once, in the Supabase SQL editor (do not commit the key):
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'web3forms_access_key'),
--     'PASTE_THE_ACCESS_KEY_FROM_WEB3FORMS'
--   );
-- Get the key at https://web3forms.com with the inbox that should receive messages.
-- Until that secret is replaced, rows are kept here and email_status stays not_configured.

create extension if not exists pg_net with schema extensions;

create schema if not exists tcd_private;
revoke all on schema tcd_private from public, anon, authenticated;

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  message text not null,
  email_status text not null default 'pending',
  email_request_id bigint,
  constraint contact_messages_email_status_check
    check (email_status in ('pending', 'queued', 'not_configured', 'error')),
  constraint contact_messages_name_len check (char_length(name) between 2 and 80),
  constraint contact_messages_email_len check (char_length(email) between 3 and 200),
  constraint contact_messages_phone_len check (char_length(phone) between 8 and 40),
  constraint contact_messages_message_len check (char_length(message) between 10 and 2000)
);

comment on table public.contact_messages is
  'Contact form messages. Visitors cannot read this table. email_status not_configured means the Web3Forms vault secret is still the placeholder, so the row was saved and not emailed.';

comment on column public.contact_messages.email_status is
  'pending while the trigger runs, queued when Web3Forms was called, not_configured when the vault key is still the placeholder, error when the send could not be started.';

create index contact_messages_email_created_idx
  on public.contact_messages (email, created_at desc);

create index contact_messages_created_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

revoke all on table public.contact_messages from public, anon, authenticated;

-- Default deny, written out so a later grant cannot expose the messages.
-- submit_contact_message is security definer and bypasses this. It is the only write path.
create policy contact_messages_no_api
  on public.contact_messages
  for all
  to anon, authenticated
  using (false)
  with check (false);

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'web3forms_access_key') then
    perform vault.create_secret(
      'REPLACE_WITH_WEB3FORMS_ACCESS_KEY',
      'web3forms_access_key',
      'Web3Forms access key for the contact form. Replace the placeholder with the key emailed by https://web3forms.com. That key decides which inbox receives messages.'
    );
  end if;
end $$;

create or replace function tcd_private.contact_message_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_req bigint;
begin
  begin
    select s.decrypted_secret into v_key
    from vault.decrypted_secrets s
    where s.name = 'web3forms_access_key'
    limit 1;
  exception when others then
    v_key := null;
  end;

  if v_key is null
     or char_length(v_key) < 20
     or v_key like 'REPLACE%' then
    new.email_status := 'not_configured';
    new.email_request_id := null;
    return new;
  end if;

  v_req := net.http_post(
    url := 'https://api.web3forms.com/submit',
    body := jsonb_build_object(
      'access_key', v_key,
      'subject', 'New message · The Cyclist Dubai',
      'from_name', 'The Cyclist Dubai website',
      'replyto', new.email,
      'name', new.name,
      'email', new.email,
      'phone', new.phone,
      'message', new.message,
      'botcheck', ''
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept', 'application/json'
    ),
    timeout_milliseconds := 8000
  );

  new.email_status := 'queued';
  new.email_request_id := v_req;
  return new;
exception when others then
  new.email_status := 'error';
  new.email_request_id := null;
  return new;
end;
$$;

revoke all on function tcd_private.contact_message_notify() from public, anon, authenticated;

create trigger contact_message_notify
  before insert on public.contact_messages
  for each row
  execute function tcd_private.contact_message_notify();

-- Public form endpoint. Returns only ok / a short error code, never the stored row.
-- Security definer is required: anon must not have select on this table (the rate
-- limit and the duplicate check read recent rows), and there is no insert policy.
create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_company text default '',
  p_wait_ms integer default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_email text;
  v_phone_raw text;
  v_phone text;
  v_message text;
begin
  -- Hidden field. A filled value is a bot. Pretend it worked.
  if coalesce(btrim(p_company), '') <> '' then
    return jsonb_build_object('ok', true);
  end if;

  -- Instant submits are almost never a person. Same quiet response.
  if p_wait_ms is not null and p_wait_ms >= 0 and p_wait_ms < 400 then
    return jsonb_build_object('ok', true);
  end if;

  if p_name is null or p_email is null or p_phone is null or p_message is null
     or char_length(p_name) > 200
     or char_length(p_email) > 300
     or char_length(p_phone) > 60
     or char_length(p_message) > 4000 then
    return jsonb_build_object('ok', false, 'error', 'message');
  end if;

  v_name := btrim(regexp_replace(p_name, '\s+', ' ', 'g'));
  v_email := lower(btrim(p_email));
  v_phone_raw := btrim(p_phone);
  v_phone := regexp_replace(v_phone_raw, '[^0-9+]', '', 'g');
  v_message := btrim(p_message);

  if char_length(v_name) < 2 or char_length(v_name) > 80
     or v_name ~ '[<>]'
     or v_name ~* 'https?://'
     or v_name ~* 'www\.' then
    return jsonb_build_object('ok', false, 'error', 'name');
  end if;

  if v_email !~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
     or char_length(v_email) > 200 then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;

  if v_phone !~ '^\+?[0-9]{8,15}$' or char_length(v_phone_raw) > 40 then
    return jsonb_build_object('ok', false, 'error', 'phone');
  end if;

  if char_length(v_message) < 10 or char_length(v_message) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'message');
  end if;

  if (select count(*) from public.contact_messages
      where created_at > pg_catalog.now() - interval '10 minutes') >= 20
     or (select count(*) from public.contact_messages
         where email = v_email
           and created_at > pg_catalog.now() - interval '1 hour') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'rate');
  end if;

  -- A double click of the same message should not send twice.
  if exists (
    select 1 from public.contact_messages
    where email = v_email
      and message = v_message
      and created_at > pg_catalog.now() - interval '2 minutes'
  ) then
    return jsonb_build_object('ok', true);
  end if;

  insert into public.contact_messages (name, email, phone, message)
  values (v_name, v_email, v_phone_raw, v_message);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text, integer)
  to anon, authenticated;

comment on function public.submit_contact_message(text, text, text, text, text, integer) is
  'Validates a contact form submission, rate-limits it, and stores it. Does not return the message.';
