-- Anonymous "I'm going" counts for homepage event cards.
-- No name and no email. A device id from the browser is the only identity.
-- Does not alter public.rsvps or ride_attendees.

create table public.event_going (
  id uuid primary key default gen_random_uuid(),
  event_ref text not null,
  device_id uuid not null,
  created_at timestamptz not null default now(),
  constraint event_going_event_ref_check check (event_ref ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  constraint event_going_event_ref_device_id_key unique (event_ref, device_id)
);

comment on table public.event_going is
  'Anonymous event RSVPs. One row per event and browser device. No personal data.';

alter table public.event_going enable row level security;

-- The RPC sets this for the current transaction. Direct API calls leave it empty,
-- so insert and delete policies reject them.
create or replace function public.event_going_device()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(pg_catalog.current_setting('tcd.event_device', true), '')::uuid;
$$;

revoke all on function public.event_going_device() from public;
grant execute on function public.event_going_device() to anon, authenticated;

create policy event_going_insert
  on public.event_going
  for insert
  to anon, authenticated
  with check (
    device_id = (select public.event_going_device())
    and event_ref ~ '^[a-z0-9][a-z0-9-]{0,63}$'
  );

create policy event_going_delete
  on public.event_going
  for delete
  to anon, authenticated
  using (device_id = (select public.event_going_device()));

revoke all on table public.event_going from anon, authenticated;
grant insert, delete on table public.event_going to anon, authenticated;

-- Insert or remove this device's row. RLS only allows the device id this function sets.
create or replace function public.event_going_set(p_event_ref text, p_device_id uuid, p_going boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_device_id is null
     or p_going is null
     or p_event_ref is null
     or p_event_ref !~ '^[a-z0-9][a-z0-9-]{0,63}$' then
    raise exception 'invalid event rsvp' using errcode = '22023';
  end if;
  perform pg_catalog.set_config('tcd.event_device', p_device_id::text, true);
  if p_going then
    insert into public.event_going (event_ref, device_id)
    values (p_event_ref, p_device_id)
    on conflict (event_ref, device_id) do nothing;
  else
    delete from public.event_going
    where event_ref = p_event_ref
      and device_id = p_device_id;
  end if;
end;
$$;

-- Counts only. Does not return device ids.
create or replace function public.event_going_counts()
returns table (event_ref text, going_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select g.event_ref, count(*)::bigint
  from public.event_going as g
  group by g.event_ref;
$$;

revoke all on function public.event_going_set(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.event_going_counts() from public, anon, authenticated;
grant execute on function public.event_going_set(text, uuid, boolean) to anon, authenticated;
grant execute on function public.event_going_counts() to anon, authenticated;
