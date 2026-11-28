-- Weekly ride sign-ups were one list per ride.
-- public.rsvps stored ride_date, but the unique key was (ride_ref, lower(email))
-- and ride_attendees(ride_ref) returned every row for that ride. After a Tuesday
-- or Thursday passed, those people still appeared on the next occurrence, and
-- the same email could not confirm again.
--
-- This migration is additive. No rows are deleted.
-- ride_date and ride_time are the scheduled occurrence in Asia/Dubai
-- (wall clock, no daylight saving). ride_time stays nullable so a page that
-- still inserts without it keeps working.

alter table public.rsvps
  add column if not exists ride_time time;

comment on column public.rsvps.ride_time is
  'Scheduled start of this occurrence, Asia/Dubai wall clock (no DST). Null only when a client saved the row without a time.';

-- Both live rides were 06:45 Asia/Dubai when these rows were saved (site-data.js, no per-date time change).
update public.rsvps
set ride_time = time '06:45'
where ride_time is null
  and ride_ref in ('tcd-ride', 'purple-ride')
  and ride_date is not null;

-- One email per occurrence, not one email for the life of the ride.
-- NULLS NOT DISTINCT keeps a single undated/untimed row per email as well.
drop index if exists public.rsvps_ride_ref_lower_email_idx;

create unique index if not exists rsvps_occurrence_email_idx
  on public.rsvps (ride_ref, ride_date, ride_time, lower(email))
  nulls not distinct;

comment on index public.rsvps_occurrence_email_idx is
  'One confirmation per ride occurrence (ride, Dubai date, Dubai start time) and email.';

-- Pages that still call ride_attendees(ride_ref) stop showing an occurrence
-- once its scheduled start has passed in Asia/Dubai. Rows stay in the table.
create or replace function public.ride_attendees(ride_ref text)
returns table (display_name text, status text, attendee_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when r.name is null or btrim(r.name) = '' then 'Guest'
      when position(' ' in btrim(r.name)) = 0 then btrim(r.name)
      else
        split_part(btrim(r.name), ' ', 1)
        || ' '
        || upper(left(regexp_replace(btrim(r.name), '^.*[[:space:]]+', ''), 1))
        || '.'
    end as display_name,
    r.status,
    count(*) over () as attendee_count
  from public.rsvps as r
  where r.ride_ref = ride_attendees.ride_ref
    and (r.ride_date + coalesce(r.ride_time, time '00:00'))
        > pg_catalog.timezone('Asia/Dubai', pg_catalog.now())
  order by r.created_at asc, r.id asc;
$$;

revoke all on function public.ride_attendees(text) from public;
grant execute on function public.ride_attendees(text) to anon, authenticated;

-- The ride page calls this with the occurrence it is showing.
-- A null ride_time on that same date still counts (client that did not send a time).
-- A different date, including last week, does not.
create or replace function public.ride_occurrence_attendees(
  ride_ref text,
  ride_date date,
  ride_time time
)
returns table (display_name text, status text, attendee_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when r.name is null or btrim(r.name) = '' then 'Guest'
      when position(' ' in btrim(r.name)) = 0 then btrim(r.name)
      else
        split_part(btrim(r.name), ' ', 1)
        || ' '
        || upper(left(regexp_replace(btrim(r.name), '^.*[[:space:]]+', ''), 1))
        || '.'
    end as display_name,
    r.status,
    count(*) over () as attendee_count
  from public.rsvps as r
  where ride_occurrence_attendees.ride_ref is not null
    and ride_occurrence_attendees.ride_date is not null
    and ride_occurrence_attendees.ride_time is not null
    and r.ride_ref = ride_occurrence_attendees.ride_ref
    and r.ride_date = ride_occurrence_attendees.ride_date
    and (
      r.ride_time = ride_occurrence_attendees.ride_time
      or r.ride_time is null
    )
  order by r.created_at asc, r.id asc;
$$;

revoke all on function public.ride_occurrence_attendees(text, date, time) from public, anon, authenticated;
grant execute on function public.ride_occurrence_attendees(text, date, time) to anon, authenticated;

comment on function public.ride_occurrence_attendees(text, date, time) is
  'Public first name and last initial for one ride occurrence. Date and time are Asia/Dubai wall clock. Does not return emails.';

notify pgrst, 'reload schema';
