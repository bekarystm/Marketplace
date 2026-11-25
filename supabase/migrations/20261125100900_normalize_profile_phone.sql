-- =====================================================================
-- Supabase Auth stores phones without "+" (e.g. 77011234567); the apps and
-- find_profile_by_phone use E.164 (+77011234567). Normalize on insert and
-- fix existing rows.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (
    new.id,
    case when new.phone is null or new.phone = '' then null
         when left(new.phone, 1) = '+' then new.phone
         else '+' || new.phone end,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.profiles
   set phone = '+' || phone
 where phone is not null and left(phone, 1) <> '+';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
