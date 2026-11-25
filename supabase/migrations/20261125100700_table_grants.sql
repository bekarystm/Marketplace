-- =====================================================================
-- Explicit table privileges for the Data API roles.
-- The project does not auto-grant new tables to anon/authenticated, so each
-- role gets only what it needs; Row Level Security still filters every row.
-- =====================================================================

-- service role (edge functions, admin scripts)
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- guests: browse the public catalog
grant select on public.app_settings, public.stores, public.categories, public.products, public.delivery_slots to anon;

-- signed-in users
grant select on all tables in schema public to authenticated;

grant insert, update, delete on public.addresses to authenticated;
grant insert, update, delete on public.cart_items to authenticated;
grant insert, update, delete on public.push_tokens to authenticated;

-- admin / store managers (RLS restricts to admins or own store)
grant insert, update, delete on public.app_settings to authenticated;
grant insert, update, delete on public.stores to authenticated;
grant insert, update, delete on public.store_staff to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.delivery_slots to authenticated;
grant insert, update, delete on public.promo_codes to authenticated;

-- couriers (status/rating columns stay protected by column-level grants)
grant insert on public.couriers to authenticated;
grant update (vehicle, iin, document_photo_url, selfie_url, is_online) on public.couriers to authenticated;
grant insert, update on public.courier_locations to authenticated;

-- profile & notifications: only harmless columns
grant update (full_name, avatar_url, locale) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- reviews & chat
grant insert on public.reviews to authenticated;
grant insert on public.chats to authenticated;
grant insert on public.chat_messages to authenticated;

-- orders, order_items, history, payments, bonus_transactions: read-only for users,
-- all writes go through security-definer functions.
