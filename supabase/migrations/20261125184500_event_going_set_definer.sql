-- event_going_set must ignore a second tap for the same device.
-- INSERT ... ON CONFLICT needs to see that row, and anon has no SELECT.
-- The function stays limited to the device id it is given. RLS still blocks
-- direct inserts that do not come through this RPC.

create or replace function public.event_going_set(p_event_ref text, p_device_id uuid, p_going boolean)
returns void
language plpgsql
security definer
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

revoke all on function public.event_going_set(text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.event_going_set(text, uuid, boolean) to anon, authenticated;
