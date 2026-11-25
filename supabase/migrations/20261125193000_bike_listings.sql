-- Bikes for sale. Anyone can read a listing. A signed-in rider inserts their own.
-- The owner account can delete any listing. Photos live in the public bike-photos bucket,
-- and a rider can upload only into a folder named with their user id.
-- Does not alter public.rsvps, public.event_going, public.messages, or public.profiles.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bike-photos',
  'bike-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.bike_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  seller_name text not null,
  title text not null,
  brand_model text not null,
  year integer not null,
  frame_size text not null,
  condition text not null,
  price_aed integer not null,
  location text not null,
  description text not null,
  contact_kind text not null,
  whatsapp text,
  photo_paths text[] not null,
  sold boolean not null default false,
  created_at timestamptz not null default now(),
  constraint bike_listings_title_check check (char_length(title) between 3 and 80),
  constraint bike_listings_brand_check check (char_length(brand_model) between 2 and 60),
  constraint bike_listings_year_check check (year between 1990 and 2035),
  constraint bike_listings_size_check check (char_length(frame_size) between 1 and 20),
  constraint bike_listings_condition_check check (condition in ('New', 'Like new', 'Good', 'Fair')),
  constraint bike_listings_price_check check (price_aed between 1 and 500000),
  constraint bike_listings_location_check check (char_length(location) between 2 and 60),
  constraint bike_listings_description_check check (char_length(description) between 10 and 1500),
  constraint bike_listings_contact_check check (
    (contact_kind = 'whatsapp' and whatsapp ~ '^\+?[0-9]{8,15}$')
    or (contact_kind = 'chat' and whatsapp is null)
  ),
  constraint bike_listings_photos_check check (
    cardinality(photo_paths) between 1 and 4
  )
);

comment on table public.bike_listings is
  'Bikes offered by signed-in riders. seller_name is copied from profiles.';

create index bike_listings_created_idx on public.bike_listings (created_at desc);

alter table public.bike_listings enable row level security;

-- Same owner account as the chat admin. Reads auth.users, not editable user metadata.
create or replace function public.is_tcd_admin()
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

revoke all on function public.is_tcd_admin() from public, anon, authenticated;
grant execute on function public.is_tcd_admin() to authenticated;

create or replace function public.prepare_bike_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  name text;
  p text;
  prefix text;
  owner_id uuid;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception 'Sign in to sell a bike' using errcode = '42501';
    end if;
    select display_name into name from public.profiles where id = auth.uid();
    if name is null then
      raise exception 'Choose a display name first' using errcode = 'P0001';
    end if;
    if new.id is null then
      new.id := gen_random_uuid();
    end if;
    new.user_id := auth.uid();
    new.seller_name := name;
    new.sold := false;
    new.created_at := pg_catalog.now();
    owner_id := new.user_id;
  else
    new.id := old.id;
    new.user_id := old.user_id;
    new.seller_name := old.seller_name;
    new.created_at := old.created_at;
    owner_id := old.user_id;
  end if;

  new.title := btrim(new.title);
  new.brand_model := btrim(new.brand_model);
  new.frame_size := btrim(new.frame_size);
  new.location := btrim(new.location);
  new.description := btrim(new.description);
  if new.contact_kind = 'chat' then
    new.whatsapp := null;
  else
    new.contact_kind := 'whatsapp';
    new.whatsapp := regexp_replace(coalesce(new.whatsapp, ''), '[^0-9+]', '', 'g');
  end if;

  prefix := owner_id::text || '/' || new.id::text || '/';
  if new.photo_paths is null
     or cardinality(new.photo_paths) < 1
     or cardinality(new.photo_paths) > 4 then
    raise exception 'Add 1 to 4 photos' using errcode = '22023';
  end if;
  foreach p in array new.photo_paths loop
    if p !~ ('^' || prefix || '[0-3][.]jpg$') then
      raise exception 'Invalid photo' using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.prepare_bike_listing() from public, anon, authenticated;

create trigger prepare_bike_listing
  before insert or update on public.bike_listings
  for each row
  execute function public.prepare_bike_listing();

create or replace function public.delete_bike_photos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects
  where bucket_id = 'bike-photos'
    and name like old.user_id::text || '/' || old.id::text || '/%';
  return old;
end;
$$;

revoke all on function public.delete_bike_photos() from public, anon, authenticated;

create trigger delete_bike_photos
  after delete on public.bike_listings
  for each row
  execute function public.delete_bike_photos();

create policy bike_listings_select
  on public.bike_listings
  for select
  to anon, authenticated
  using (true);

create policy bike_listings_insert
  on public.bike_listings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy bike_listings_update
  on public.bike_listings
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_tcd_admin())
  )
  with check (
    user_id = (select auth.uid())
    or (select public.is_tcd_admin())
  );

create policy bike_listings_delete
  on public.bike_listings
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_tcd_admin())
  );

revoke all on table public.bike_listings from anon, authenticated;
grant select on table public.bike_listings to anon, authenticated;
grant insert, update, delete on table public.bike_listings to authenticated;

create policy bike_photos_select
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'bike-photos');

create policy bike_photos_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'bike-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy bike_photos_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'bike-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_tcd_admin())
    )
  )
  with check (
    bucket_id = 'bike-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_tcd_admin())
    )
  );

create policy bike_photos_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'bike-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_tcd_admin())
    )
  );
