-- =====================================================================
-- Row Level Security, column privileges, storage buckets, realtime
-- =====================================================================

-- ---------- Role helper functions (security definer, no RLS recursion) ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_store_staff(p_store_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.store_staff
    where store_id = p_store_id and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_store_manager(p_store_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.store_staff
    where store_id = p_store_id and user_id = (select auth.uid()) and role = 'manager'
  );
$$;

create or replace function public.is_approved_courier()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.couriers
    where user_id = (select auth.uid()) and status = 'approved'
  );
$$;

create or replace function public.can_access_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (
        o.client_id = (select auth.uid())
        or o.courier_id = (select auth.uid())
        or public.is_store_staff(o.store_id)
        or public.is_admin()
      )
  );
$$;

-- ---------- Enable RLS everywhere ----------
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.stores enable row level security;
alter table public.store_staff enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.delivery_slots enable row level security;
alter table public.cart_items enable row level security;
alter table public.promo_codes enable row level security;
alter table public.couriers enable row level security;
alter table public.courier_locations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.bonus_transactions enable row level security;
alter table public.reviews enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;

-- ---------- app_settings ----------
create policy app_settings_read on public.app_settings for select using (true);
create policy app_settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- profiles ----------
create policy profiles_select_self on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- staff/courier see the client of orders they handle; client sees their courier/picker
create policy profiles_select_related on public.profiles for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where (o.client_id = profiles.id
             and (o.courier_id = (select auth.uid()) or public.is_store_staff(o.store_id)))
         or ((o.courier_id = profiles.id or o.picker_id = profiles.id)
             and o.client_id = (select auth.uid()))
    )
  );

create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- users may only change harmless columns of their own profile
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, locale) on public.profiles to authenticated;

-- ---------- addresses ----------
create policy addresses_own on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- stores ----------
create policy stores_read on public.stores for select
  using (is_active or public.is_store_staff(id) or public.is_admin());
create policy stores_admin_insert on public.stores for insert to authenticated
  with check (public.is_admin());
create policy stores_admin_delete on public.stores for delete to authenticated
  using (public.is_admin());
create policy stores_update on public.stores for update to authenticated
  using (public.is_admin() or public.is_store_manager(id))
  with check (public.is_admin() or public.is_store_manager(id));

-- managers cannot change commercial / activation fields
create or replace function public.stores_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.is_admin() and (
       new.commission_percent is distinct from old.commission_percent
    or new.is_active is distinct from old.is_active
    or new.slug is distinct from old.slug
  ) then
    raise exception 'only_admin_can_change_field';
  end if;
  return new;
end;
$$;
create trigger stores_guard before update on public.stores
  for each row execute function public.stores_guard();

-- ---------- store_staff ----------
create policy store_staff_read on public.store_staff for select to authenticated
  using (user_id = (select auth.uid()) or public.is_store_manager(store_id) or public.is_admin());
create policy store_staff_admin on public.store_staff for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy store_staff_manager_insert on public.store_staff for insert to authenticated
  with check (public.is_store_manager(store_id) and role = 'picker');
create policy store_staff_manager_delete on public.store_staff for delete to authenticated
  using (public.is_store_manager(store_id) and role = 'picker');

-- ---------- categories ----------
create policy categories_read on public.categories for select using (true);
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- products ----------
create policy products_read on public.products for select
  using (
    exists (select 1 from public.stores s where s.id = store_id and s.is_active)
    or public.is_store_staff(store_id)
    or public.is_admin()
  );
create policy products_write on public.products for all to authenticated
  using (public.is_store_staff(store_id) or public.is_admin())
  with check (public.is_store_staff(store_id) or public.is_admin());

-- ---------- delivery_slots ----------
create policy delivery_slots_read on public.delivery_slots for select using (true);
create policy delivery_slots_write on public.delivery_slots for all to authenticated
  using (public.is_store_manager(store_id) or public.is_admin())
  with check (public.is_store_manager(store_id) or public.is_admin());

-- ---------- cart ----------
create policy cart_items_own on public.cart_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- promo codes (validated through RPC, not publicly listable) ----------
create policy promo_codes_admin on public.promo_codes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy promo_codes_manager_read on public.promo_codes for select to authenticated
  using (store_id is not null and public.is_store_manager(store_id));

-- ---------- couriers ----------
create policy couriers_select on public.couriers for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy couriers_insert_self on public.couriers for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and not is_online);
create policy couriers_update_self on public.couriers for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke update on public.couriers from anon, authenticated;
grant update (vehicle, iin, document_photo_url, selfie_url, is_online) on public.couriers to authenticated;

create or replace function public.couriers_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_online and new.status <> 'approved' then
    raise exception 'courier_not_approved';
  end if;
  -- documents are locked after approval (admin changes go through service role)
  if old.status = 'approved' and current_user = 'authenticated' and (
       new.iin is distinct from old.iin
    or new.document_photo_url is distinct from old.document_photo_url
    or new.selfie_url is distinct from old.selfie_url
  ) then
    raise exception 'documents_locked';
  end if;
  return new;
end;
$$;
create trigger couriers_guard before update on public.couriers
  for each row execute function public.couriers_guard();

-- ---------- courier_locations ----------
create policy courier_locations_select on public.courier_locations for select to authenticated
  using (
    courier_id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.courier_id = courier_locations.courier_id
        and o.status in ('ready', 'delivering')
        and (o.client_id = (select auth.uid()) or public.is_store_staff(o.store_id))
    )
  );
create policy courier_locations_insert on public.courier_locations for insert to authenticated
  with check (courier_id = (select auth.uid()) and public.is_approved_courier());
create policy courier_locations_update on public.courier_locations for update to authenticated
  using (courier_id = (select auth.uid()))
  with check (courier_id = (select auth.uid()) and public.is_approved_courier());

-- ---------- orders (writes only via RPC functions) ----------
create policy orders_select on public.orders for select to authenticated
  using (
    client_id = (select auth.uid())
    or courier_id = (select auth.uid())
    or public.is_store_staff(store_id)
    or public.is_admin()
  );

create policy order_items_select on public.order_items for select to authenticated
  using (public.can_access_order(order_id));

create policy order_status_history_select on public.order_status_history for select to authenticated
  using (public.can_access_order(order_id));

-- ---------- payments ----------
create policy payments_select on public.payments for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.client_id = (select auth.uid()))
  );

-- ---------- bonuses ----------
create policy bonus_transactions_own on public.bonus_transactions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ---------- reviews ----------
create policy reviews_select on public.reviews for select to authenticated
  using (public.can_access_order(order_id));
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.client_id = (select auth.uid()) and o.status = 'delivered'
    )
  );

-- ---------- chats ----------
create policy chats_select on public.chats for select to authenticated
  using (
    client_id = (select auth.uid())
    or public.is_admin()
    or (type = 'order' and public.can_access_order(order_id))
  );
create policy chats_insert_support on public.chats for insert to authenticated
  with check (type = 'support' and client_id = (select auth.uid()));

create policy chat_messages_select on public.chat_messages for select to authenticated
  using (exists (select 1 from public.chats c where c.id = chat_id));
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.chats c where c.id = chat_id and not c.is_closed)
  );

-- ---------- push & notifications ----------
create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('store-assets', 'store-assets', true),
  ('product-images', 'product-images', true),
  ('courier-docs', 'courier-docs', false),
  ('chat-images', 'chat-images', false)
on conflict (id) do nothing;

-- avatars/<user_id>/...
create policy avatars_write on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- store-assets/<store_id>/... and product-images/<store_id>/...
create policy store_files_write on storage.objects for all to authenticated
  using (
    bucket_id in ('store-assets', 'product-images')
    and (
      public.is_admin()
      or exists (
        select 1 from public.store_staff ss
        where ss.user_id = (select auth.uid())
          and ss.store_id::text = (storage.foldername(name))[1]
      )
    )
  )
  with check (
    bucket_id in ('store-assets', 'product-images')
    and (
      public.is_admin()
      or exists (
        select 1 from public.store_staff ss
        where ss.user_id = (select auth.uid())
          and ss.store_id::text = (storage.foldername(name))[1]
      )
    )
  );

-- courier-docs/<user_id>/...
create policy courier_docs_own on storage.objects for all to authenticated
  using (
    bucket_id = 'courier-docs'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  )
  with check (
    bucket_id = 'courier-docs' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- chat-images/<chat_id>/...
create policy chat_images_rw on storage.objects for all to authenticated
  using (
    bucket_id = 'chat-images'
    and exists (select 1 from public.chats c where c.id::text = (storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'chat-images'
    and exists (select 1 from public.chats c where c.id::text = (storage.foldername(name))[1])
  );

-- ---------- Realtime ----------
alter publication supabase_realtime add table
  public.orders,
  public.order_items,
  public.chat_messages,
  public.courier_locations,
  public.notifications;
