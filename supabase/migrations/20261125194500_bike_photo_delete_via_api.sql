-- Supabase blocks DELETE on storage.objects from SQL.
-- Photos are removed through the Storage API by the seller or the admin.

drop trigger if exists delete_bike_photos on public.bike_listings;
drop function if exists public.delete_bike_photos();
