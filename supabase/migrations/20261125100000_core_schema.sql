-- =====================================================================
-- Core schema: users, stores, catalog, orders, couriers, chat, promo
-- =====================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------- Enums ----------
create type public.user_role as enum ('client', 'courier', 'picker', 'store_manager', 'admin');
create type public.store_staff_role as enum ('manager', 'picker');
create type public.courier_application_status as enum ('pending', 'approved', 'rejected', 'blocked');
create type public.vehicle_type as enum ('foot', 'bicycle', 'scooter', 'car');
create type public.order_status as enum (
  'awaiting_payment', -- card order, waiting for payment confirmation
  'placed',           -- paid / cash order, waiting for store
  'accepted',         -- store accepted
  'picking',          -- picker is collecting items
  'ready',            -- packed, waiting for courier
  'delivering',       -- courier picked up
  'delivered',
  'cancelled'
);
create type public.payment_method as enum ('card', 'cash');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.substitution_policy as enum ('replace_similar', 'contact_me', 'remove');
create type public.order_item_status as enum ('pending', 'picked', 'replaced', 'missing');
create type public.product_unit as enum ('pcs', 'kg', 'g', 'l', 'ml', 'pack');
create type public.discount_type as enum ('percent', 'fixed');
create type public.chat_type as enum ('order', 'support');
create type public.app_locale as enum ('ru', 'kk');

-- ---------- Helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Settings ----------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('bonus_earn_percent', '2'),
  ('bonus_max_spend_percent', '50'),
  ('city', '"Талдыкорган"'),
  ('support_phone', 'null');

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'client',
  locale public.app_locale not null default 'ru',
  bonus_balance numeric(12, 2) not null default 0 check (bonus_balance >= 0),
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (new.id, new.phone, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Addresses ----------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  address_line text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  entrance text,
  floor text,
  apartment text,
  intercom text,
  comment text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ---------- Stores ----------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description_ru text,
  description_kk text,
  logo_url text,
  cover_url text,
  phone text,
  address_line text not null,
  lat double precision not null,
  lng double precision not null,
  delivery_radius_m integer not null default 7000 check (delivery_radius_m > 0),
  min_order_amount numeric(12, 2) not null default 0,
  delivery_fee numeric(12, 2) not null default 0,
  free_delivery_from numeric(12, 2),
  commission_percent numeric(5, 2) not null default 0,
  -- {"mon": [["08:00","23:00"]], "tue": [...], ...}
  opening_hours jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();

create table public.store_staff (
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.store_staff_role not null default 'picker',
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index store_staff_user_idx on public.store_staff (user_id);

-- ---------- Catalog ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete cascade,
  slug text not null unique,
  name_ru text not null,
  name_kk text not null,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);
create index categories_parent_idx on public.categories (parent_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  sku text,
  barcode text,
  name_ru text not null,
  name_kk text,
  description_ru text,
  description_kk text,
  brand text,
  image_urls text[] not null default '{}',
  unit public.product_unit not null default 'pcs',
  unit_size numeric(10, 3),
  is_weighted boolean not null default false,
  qty_step numeric(10, 3) not null default 1 check (qty_step > 0),
  price numeric(12, 2) not null check (price >= 0),
  old_price numeric(12, 2),
  stock_qty numeric(12, 3), -- null = stock not tracked
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, sku)
);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create index products_store_category_idx on public.products (store_id, category_id);
create index products_barcode_idx on public.products (store_id, barcode);
create index products_name_ru_trgm on public.products using gin (name_ru extensions.gin_trgm_ops);
create index products_name_kk_trgm on public.products using gin (name_kk extensions.gin_trgm_ops);

-- ---------- Delivery slots ----------
create table public.delivery_slots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 10 check (capacity >= 0),
  booked integer not null default 0 check (booked >= 0),
  check (ends_at > starts_at),
  check (booked <= capacity),
  unique (store_id, starts_at)
);

-- ---------- Cart ----------
create table public.cart_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity numeric(10, 3) not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- Promo codes ----------
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  discount_type public.discount_type not null,
  discount_value numeric(12, 2) not null check (discount_value > 0),
  max_discount numeric(12, 2),
  min_order_amount numeric(12, 2) not null default 0,
  store_id uuid references public.stores (id) on delete cascade,
  first_order_only boolean not null default false,
  usage_limit integer,
  usage_count integer not null default 0,
  per_user_limit integer not null default 1,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index promo_codes_code_uq on public.promo_codes (upper(code));

-- ---------- Couriers ----------
create table public.couriers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status public.courier_application_status not null default 'pending',
  vehicle public.vehicle_type not null default 'foot',
  iin text check (iin is null or iin ~ '^\d{12}$'),
  document_photo_url text,
  selfie_url text,
  is_online boolean not null default false,
  rating numeric(3, 2),
  deliveries_count integer not null default 0,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger couriers_updated_at before update on public.couriers
  for each row execute function public.set_updated_at();

create table public.courier_locations (
  courier_id uuid primary key references public.couriers (user_id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading real,
  speed real,
  updated_at timestamptz not null default now()
);

-- ---------- Orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1000) unique,
  client_id uuid not null references public.profiles (id) on delete restrict,
  store_id uuid not null references public.stores (id) on delete restrict,
  picker_id uuid references public.profiles (id) on delete set null,
  courier_id uuid references public.profiles (id) on delete set null,
  status public.order_status not null default 'placed',
  -- delivery address snapshot
  address_line text not null,
  lat double precision not null,
  lng double precision not null,
  entrance text,
  floor text,
  apartment text,
  intercom text,
  address_comment text,
  contact_phone text not null,
  slot_id uuid references public.delivery_slots (id) on delete set null,
  substitution_policy public.substitution_policy not null default 'contact_me',
  comment text,
  -- money
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  items_total numeric(12, 2) not null default 0,
  delivery_fee numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  bonus_spent numeric(12, 2) not null default 0,
  bonus_earned numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  -- lifecycle
  cancel_reason text,
  cancelled_by uuid references public.profiles (id) on delete set null,
  placed_at timestamptz not null default now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  courier_assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create index orders_client_idx on public.orders (client_id, created_at desc);
create index orders_store_status_idx on public.orders (store_id, status);
create index orders_courier_idx on public.orders (courier_id, status);
create index orders_open_idx on public.orders (status) where courier_id is null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  image_url text,
  unit public.product_unit not null,
  price numeric(12, 2) not null,
  quantity numeric(10, 3) not null check (quantity > 0),
  picked_quantity numeric(10, 3),
  status public.order_item_status not null default 'pending',
  replacement_product_id uuid references public.products (id) on delete set null,
  replacement_name text,
  replacement_price numeric(12, 2),
  replacement_quantity numeric(10, 3),
  replacement_approved boolean, -- null = waiting for client decision
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  actor_id uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id);

-- ---------- Payments & bonuses ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  amount numeric(12, 2) not null,
  status public.payment_status not null default 'pending',
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create index payments_order_idx on public.payments (order_id);

create table public.bonus_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  amount numeric(12, 2) not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index bonus_transactions_user_idx on public.bonus_transactions (user_id, created_at desc);

-- ---------- Reviews ----------
create table public.reviews (
  order_id uuid primary key references public.orders (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  store_rating smallint check (store_rating between 1 and 5),
  courier_rating smallint check (courier_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ---------- Chat ----------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  type public.chat_type not null,
  order_id uuid references public.orders (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  check ((type = 'order') = (order_id is not null))
);
create unique index chats_order_uq on public.chats (order_id) where order_id is not null;
create index chats_client_idx on public.chats (client_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  image_url text,
  created_at timestamptz not null default now(),
  check (body is not null or image_url is not null)
);
create index chat_messages_chat_idx on public.chat_messages (chat_id, created_at);

-- ---------- Notifications ----------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  app text not null check (app in ('client', 'partner', 'admin')),
  created_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
