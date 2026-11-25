-- Cyclist chat: one general room. Signed-in riders only.
-- Does not alter public.rsvps or public.event_going.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_check check (
    char_length(display_name) between 2 and 24
    and display_name = btrim(display_name)
    and display_name !~ '[<>@]'
  )
);

comment on table public.profiles is
  'Display names for the cyclist chat. No email is stored here.';

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'general',
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_room_check check (room = 'general'),
  constraint messages_body_check check (char_length(body) between 1 and 500)
);

comment on table public.messages is
  'General-room chat messages. author_name is copied from profiles by a trigger.';

create index messages_room_created_idx on public.messages (room, created_at desc);
create index messages_user_created_idx on public.messages (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.messages enable row level security;

-- True only for the signed-in owner's verified auth email. Not user metadata.
create or replace function public.is_chat_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and lower(email) = 'almir.mujic2022@gmail.com'
  );
$$;

revoke all on function public.is_chat_admin() from public, anon, authenticated;
grant execute on function public.is_chat_admin() to authenticated;

-- Forces the sender, copies the display name, and blocks a second message within 3 seconds.
create or replace function public.prepare_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to chat' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(auth.uid()::text));
  if exists (
    select 1
    from public.messages
    where user_id = auth.uid()
      and created_at > pg_catalog.now() - interval '3 seconds'
  ) then
    raise exception 'Please wait a few seconds before sending again' using errcode = 'P0001';
  end if;
  select p.display_name into name
  from public.profiles as p
  where p.id = auth.uid();
  if name is null then
    raise exception 'Choose a display name first' using errcode = 'P0001';
  end if;
  new.user_id := auth.uid();
  new.room := 'general';
  new.author_name := name;
  new.body := btrim(coalesce(new.body, ''));
  new.created_at := pg_catalog.now();
  if pg_catalog.char_length(new.body) < 1 or pg_catalog.char_length(new.body) > 500 then
    raise exception 'Message must be 1 to 500 characters' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.prepare_chat_message() from public, anon, authenticated;

create trigger prepare_chat_message
  before insert on public.messages
  for each row
  execute function public.prepare_chat_message();

create policy profiles_select
  on public.profiles
  for select
  to authenticated
  using (true);

create policy profiles_insert
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy messages_select
  on public.messages
  for select
  to authenticated
  using (room = 'general');

create policy messages_insert
  on public.messages
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) and room = 'general');

create policy messages_delete
  on public.messages
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_chat_admin())
  );

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, delete on table public.messages to authenticated;

alter publication supabase_realtime add table public.messages;
