-- =====================================================================
-- Business logic: promo, placing orders, status machine, picking,
-- substitutions, courier dispatch, cancellations, admin actions
-- =====================================================================

-- ---------- Promo ----------
create or replace function public._promo_discount(
  p_promo public.promo_codes,
  p_user_id uuid,
  p_store_id uuid,
  p_items_total numeric
) returns numeric
language plpgsql stable security definer set search_path = '' as $$
declare
  v_discount numeric(12, 2);
  v_used integer;
begin
  if p_promo.id is null or not p_promo.is_active then
    raise exception 'promo_invalid';
  end if;
  if (p_promo.starts_at is not null and p_promo.starts_at > now())
     or (p_promo.ends_at is not null and p_promo.ends_at < now()) then
    raise exception 'promo_expired';
  end if;
  if p_promo.store_id is not null and p_promo.store_id <> p_store_id then
    raise exception 'promo_wrong_store';
  end if;
  if p_items_total < p_promo.min_order_amount then
    raise exception 'promo_min_order_amount';
  end if;
  if p_promo.usage_limit is not null and p_promo.usage_count >= p_promo.usage_limit then
    raise exception 'promo_exhausted';
  end if;
  select count(*) into v_used from public.orders
   where client_id = p_user_id and promo_code_id = p_promo.id and status <> 'cancelled';
  if v_used >= p_promo.per_user_limit then
    raise exception 'promo_already_used';
  end if;
  if p_promo.first_order_only and exists (
    select 1 from public.orders where client_id = p_user_id and status <> 'cancelled'
  ) then
    raise exception 'promo_first_order_only';
  end if;

  if p_promo.discount_type = 'percent' then
    v_discount := round(p_items_total * p_promo.discount_value / 100, 2);
    if p_promo.max_discount is not null then
      v_discount := least(v_discount, p_promo.max_discount);
    end if;
  else
    v_discount := p_promo.discount_value;
  end if;
  return least(v_discount, p_items_total);
end;
$$;

-- preview for the checkout screen
create or replace function public.check_promo(p_code text, p_store_id uuid, p_items_total numeric)
returns numeric
language plpgsql stable security definer set search_path = '' as $$
declare
  v_promo public.promo_codes;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_promo from public.promo_codes where upper(code) = upper(trim(p_code));
  return public._promo_discount(v_promo, auth.uid(), p_store_id, p_items_total);
end;
$$;

-- ---------- Totals ----------
create or replace function public._recalc_order_totals(p_order_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_items numeric(12, 2);
begin
  select coalesce(sum(
    case
      when status = 'missing' then 0
      when status = 'replaced' then
        case when replacement_approved then round(replacement_price * coalesce(replacement_quantity, quantity), 2) else 0 end
      else round(price * coalesce(picked_quantity, quantity), 2)
    end), 0)
  into v_items
  from public.order_items where order_id = p_order_id;

  update public.orders
     set items_total = v_items,
         discount_amount = least(discount_amount, v_items),
         total = greatest(v_items + delivery_fee - least(discount_amount, v_items) - bonus_spent, 0)
   where id = p_order_id;
end;
$$;

-- ---------- Place order from cart ----------
create or replace function public.place_order(
  p_store_id uuid,
  p_address_id uuid,
  p_payment_method public.payment_method,
  p_substitution_policy public.substitution_policy default 'contact_me',
  p_slot_id uuid default null,
  p_promo_code text default null,
  p_use_bonus boolean default false,
  p_comment text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_store public.stores;
  v_addr public.addresses;
  v_promo public.promo_codes;
  v_order public.orders;
  v_items_total numeric(12, 2);
  v_delivery_fee numeric(12, 2);
  v_discount numeric(12, 2) := 0;
  v_bonus numeric(12, 2) := 0;
  v_bad text;
  v_max_bonus_pct numeric := coalesce(
    (select (value #>> '{}')::numeric from public.app_settings where key = 'bonus_max_spend_percent'), 50);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if v_profile.is_blocked then raise exception 'user_blocked'; end if;
  if v_profile.phone is null then raise exception 'phone_required'; end if;

  select * into v_store from public.stores where id = p_store_id and is_active;
  if not found then raise exception 'store_unavailable'; end if;

  select * into v_addr from public.addresses where id = p_address_id and user_id = v_uid;
  if not found then raise exception 'address_not_found'; end if;

  if not extensions.st_dwithin(
       extensions.st_setsrid(extensions.st_makepoint(v_store.lng, v_store.lat), 4326)::extensions.geography,
       extensions.st_setsrid(extensions.st_makepoint(v_addr.lng, v_addr.lat), 4326)::extensions.geography,
       v_store.delivery_radius_m) then
    raise exception 'address_out_of_delivery_zone';
  end if;

  -- lock products of this cart to avoid overselling
  perform 1 from public.products p
    join public.cart_items c on c.product_id = p.id
   where c.user_id = v_uid and p.store_id = p_store_id
   for update of p;

  select string_agg(p.name_ru, ', ') into v_bad
    from public.cart_items c join public.products p on p.id = c.product_id
   where c.user_id = v_uid and p.store_id = p_store_id
     and (not p.is_available or (p.stock_qty is not null and p.stock_qty < c.quantity));
  if v_bad is not null then raise exception 'items_unavailable: %', v_bad; end if;

  select coalesce(sum(round(p.price * c.quantity, 2)), 0) into v_items_total
    from public.cart_items c join public.products p on p.id = c.product_id
   where c.user_id = v_uid and p.store_id = p_store_id;
  if v_items_total = 0 then raise exception 'cart_empty'; end if;
  if v_items_total < v_store.min_order_amount then raise exception 'min_order_amount_not_reached'; end if;

  v_delivery_fee := case
    when v_store.free_delivery_from is not null and v_items_total >= v_store.free_delivery_from then 0
    else v_store.delivery_fee end;

  if p_slot_id is not null then
    update public.delivery_slots set booked = booked + 1
     where id = p_slot_id and store_id = p_store_id and booked < capacity and starts_at > now();
    if not found then raise exception 'slot_unavailable'; end if;
  end if;

  if nullif(trim(p_promo_code), '') is not null then
    select * into v_promo from public.promo_codes
     where upper(code) = upper(trim(p_promo_code)) for update;
    v_discount := public._promo_discount(v_promo, v_uid, p_store_id, v_items_total);
    update public.promo_codes set usage_count = usage_count + 1 where id = v_promo.id;
  end if;

  if p_use_bonus and v_profile.bonus_balance > 0 then
    v_bonus := least(v_profile.bonus_balance, floor((v_items_total - v_discount) * v_max_bonus_pct / 100));
    if v_bonus > 0 then
      update public.profiles set bonus_balance = bonus_balance - v_bonus where id = v_uid;
    end if;
  end if;

  insert into public.orders (
    client_id, store_id, status,
    address_line, lat, lng, entrance, floor, apartment, intercom, address_comment,
    contact_phone, slot_id, substitution_policy, comment,
    payment_method, items_total, delivery_fee, discount_amount, bonus_spent, total, promo_code_id
  ) values (
    v_uid, p_store_id,
    case when p_payment_method = 'card' then 'awaiting_payment'::public.order_status else 'placed'::public.order_status end,
    v_addr.address_line, v_addr.lat, v_addr.lng, v_addr.entrance, v_addr.floor, v_addr.apartment,
    v_addr.intercom, v_addr.comment,
    v_profile.phone, p_slot_id, p_substitution_policy, p_comment,
    p_payment_method, v_items_total, v_delivery_fee, v_discount, v_bonus,
    greatest(v_items_total + v_delivery_fee - v_discount - v_bonus, 0), v_promo.id
  ) returning * into v_order;

  insert into public.order_items (order_id, product_id, name, image_url, unit, price, quantity)
  select v_order.id, p.id, p.name_ru, p.image_urls[1], p.unit, p.price, c.quantity
    from public.cart_items c join public.products p on p.id = c.product_id
   where c.user_id = v_uid and p.store_id = p_store_id;

  update public.products p set stock_qty = p.stock_qty - oi.quantity
    from public.order_items oi
   where oi.order_id = v_order.id and oi.product_id = p.id and p.stock_qty is not null;

  delete from public.cart_items c using public.products p
   where p.id = c.product_id and c.user_id = v_uid and p.store_id = p_store_id;

  if v_bonus > 0 then
    insert into public.bonus_transactions (user_id, order_id, amount, reason)
    values (v_uid, v_order.id, -v_bonus, 'order_spend');
  end if;

  insert into public.order_status_history (order_id, status, actor_id)
  values (v_order.id, v_order.status, v_uid);

  insert into public.chats (type, order_id, client_id) values ('order', v_order.id, v_uid);

  return v_order;
end;
$$;

-- ---------- Status machine ----------
create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
  v_is_admin boolean;
  v_is_staff boolean;
  v_is_courier boolean;
  v_is_client boolean;
  v_allowed boolean;
  v_earn numeric(12, 2);
  v_earn_pct numeric := coalesce(
    (select (value #>> '{}')::numeric from public.app_settings where key = 'bonus_earn_percent'), 0);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status in ('delivered', 'cancelled') then raise exception 'order_finalized'; end if;
  if v_order.status = p_status then raise exception 'status_unchanged'; end if;

  v_is_admin := public.is_admin();
  v_is_staff := public.is_store_staff(v_order.store_id);
  v_is_courier := coalesce(v_order.courier_id = v_uid, false);
  v_is_client := v_order.client_id = v_uid;

  v_allowed := case
    when v_order.status = 'placed'     and p_status = 'accepted'   then v_is_staff or v_is_admin
    when v_order.status = 'accepted'   and p_status = 'picking'    then v_is_staff or v_is_admin
    when v_order.status = 'picking'    and p_status = 'ready'      then v_is_staff or v_is_admin
    when v_order.status = 'ready'      and p_status = 'delivering' then v_is_courier or v_is_admin
    when v_order.status = 'delivering' and p_status = 'delivered'  then v_is_courier or v_is_admin
    when p_status = 'cancelled' and v_order.status in ('awaiting_payment', 'placed')
      then v_is_client or v_is_staff or v_is_admin
    when p_status = 'cancelled' and v_order.status in ('accepted', 'picking', 'ready')
      then v_is_staff or v_is_admin
    when p_status = 'cancelled' then v_is_admin
    else false
  end;
  if not v_allowed then raise exception 'transition_not_allowed'; end if;

  if p_status = 'ready' and exists (
    select 1 from public.order_items
     where order_id = p_order_id
       and (status = 'pending' or (status = 'replaced' and replacement_approved is null))
  ) then
    raise exception 'items_not_processed';
  end if;

  if p_status = 'delivering' and v_order.courier_id is null then
    raise exception 'courier_not_assigned';
  end if;

  update public.orders set
    status = p_status,
    picker_id = case when p_status = 'picking' and v_is_staff then coalesce(picker_id, v_uid) else picker_id end,
    accepted_at = case when p_status = 'accepted' then now() else accepted_at end,
    ready_at = case when p_status = 'ready' then now() else ready_at end,
    picked_up_at = case when p_status = 'delivering' then now() else picked_up_at end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
    cancel_reason = case when p_status = 'cancelled' then p_note else cancel_reason end,
    cancelled_by = case when p_status = 'cancelled' then v_uid else cancelled_by end,
    payment_status = case
      when p_status = 'delivered' and payment_method = 'cash' then 'paid'::public.payment_status
      else payment_status end
  where id = p_order_id;

  if p_status = 'ready' then
    perform public._recalc_order_totals(p_order_id);
  end if;

  select * into v_order from public.orders where id = p_order_id;

  if p_status = 'delivered' then
    v_earn := floor(greatest(v_order.items_total - v_order.discount_amount - v_order.bonus_spent, 0) * v_earn_pct / 100);
    if v_earn > 0 then
      update public.profiles set bonus_balance = bonus_balance + v_earn where id = v_order.client_id;
      insert into public.bonus_transactions (user_id, order_id, amount, reason)
      values (v_order.client_id, p_order_id, v_earn, 'order_earn');
      update public.orders set bonus_earned = v_earn where id = p_order_id;
    end if;
    update public.couriers set deliveries_count = deliveries_count + 1 where user_id = v_order.courier_id;
    update public.chats set is_closed = true where order_id = p_order_id;
  end if;

  if p_status = 'cancelled' then
    if v_order.bonus_spent > 0 then
      update public.profiles set bonus_balance = bonus_balance + v_order.bonus_spent where id = v_order.client_id;
      insert into public.bonus_transactions (user_id, order_id, amount, reason)
      values (v_order.client_id, p_order_id, v_order.bonus_spent, 'order_cancel_refund');
    end if;
    if v_order.slot_id is not null then
      update public.delivery_slots set booked = greatest(booked - 1, 0) where id = v_order.slot_id;
    end if;
    if v_order.promo_code_id is not null then
      update public.promo_codes set usage_count = greatest(usage_count - 1, 0) where id = v_order.promo_code_id;
    end if;
    update public.products p set stock_qty = p.stock_qty + oi.quantity
      from public.order_items oi
     where oi.order_id = p_order_id and oi.product_id = p.id and p.stock_qty is not null;
    update public.chats set is_closed = true where order_id = p_order_id;
    -- card refunds are processed by the payments edge function (payment_status stays 'paid' until refunded)
  end if;

  insert into public.order_status_history (order_id, status, actor_id, note)
  values (p_order_id, p_status, v_uid, p_note);

  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end;
$$;

-- ---------- Picking ----------
create or replace function public.picker_update_item(
  p_item_id uuid,
  p_status public.order_item_status,
  p_picked_quantity numeric default null,
  p_replacement_product_id uuid default null,
  p_replacement_quantity numeric default null
) returns public.order_items
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.order_items;
  v_order public.orders;
  v_repl public.products;
begin
  select * into v_item from public.order_items where id = p_item_id for update;
  if not found then raise exception 'item_not_found'; end if;
  select * into v_order from public.orders where id = v_item.order_id;

  if not (public.is_store_staff(v_order.store_id) or public.is_admin()) then
    raise exception 'forbidden';
  end if;
  if v_order.status <> 'picking' then raise exception 'order_not_in_picking'; end if;

  if p_status = 'picked' then
    if p_picked_quantity is not null and p_picked_quantity <= 0 then raise exception 'invalid_quantity'; end if;
    update public.order_items set
      status = 'picked', picked_quantity = coalesce(p_picked_quantity, quantity),
      replacement_product_id = null, replacement_name = null, replacement_price = null,
      replacement_quantity = null, replacement_approved = null
    where id = p_item_id returning * into v_item;

  elsif p_status = 'missing' then
    update public.order_items set
      status = 'missing', picked_quantity = 0,
      replacement_product_id = null, replacement_name = null, replacement_price = null,
      replacement_quantity = null, replacement_approved = null
    where id = p_item_id returning * into v_item;

  elsif p_status = 'replaced' then
    if v_order.substitution_policy = 'remove' then raise exception 'substitution_not_allowed'; end if;
    select * into v_repl from public.products
     where id = p_replacement_product_id and store_id = v_order.store_id and is_available;
    if not found then raise exception 'replacement_unavailable'; end if;
    update public.order_items set
      status = 'replaced', picked_quantity = 0,
      replacement_product_id = v_repl.id, replacement_name = v_repl.name_ru,
      replacement_price = v_repl.price,
      replacement_quantity = coalesce(p_replacement_quantity, quantity),
      replacement_approved = case when v_order.substitution_policy = 'replace_similar' then true else null end
    where id = p_item_id returning * into v_item;

  else
    update public.order_items set status = 'pending', picked_quantity = null,
      replacement_product_id = null, replacement_name = null, replacement_price = null,
      replacement_quantity = null, replacement_approved = null
    where id = p_item_id returning * into v_item;
  end if;

  return v_item;
end;
$$;

create or replace function public.client_respond_replacement(p_item_id uuid, p_approve boolean)
returns public.order_items
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.order_items;
begin
  select oi.* into v_item from public.order_items oi
    join public.orders o on o.id = oi.order_id
   where oi.id = p_item_id and o.client_id = auth.uid() and o.status = 'picking'
   for update of oi;
  if not found then raise exception 'item_not_found'; end if;
  if v_item.status <> 'replaced' then raise exception 'no_replacement_proposed'; end if;

  update public.order_items set replacement_approved = p_approve
   where id = p_item_id returning * into v_item;
  return v_item;
end;
$$;

-- ---------- Courier dispatch ----------
create or replace function public.courier_available_orders()
returns table (
  order_id uuid,
  number bigint,
  status public.order_status,
  store_id uuid,
  store_name text,
  store_address text,
  store_lat double precision,
  store_lng double precision,
  delivery_address text,
  delivery_lat double precision,
  delivery_lng double precision,
  distance_to_store_m double precision,
  delivery_distance_m double precision,
  total numeric,
  delivery_fee numeric,
  payment_method public.payment_method,
  placed_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_loc public.courier_locations;
begin
  if not public.is_approved_courier() then raise exception 'courier_not_approved'; end if;
  select * into v_loc from public.courier_locations where courier_id = auth.uid();

  return query
  select o.id, o.number, o.status, s.id, s.name, s.address_line, s.lat, s.lng,
         o.address_line, o.lat, o.lng,
         case when v_loc.courier_id is null then null else
           extensions.st_distance(
             extensions.st_setsrid(extensions.st_makepoint(v_loc.lng, v_loc.lat), 4326)::extensions.geography,
             extensions.st_setsrid(extensions.st_makepoint(s.lng, s.lat), 4326)::extensions.geography)
         end,
         extensions.st_distance(
           extensions.st_setsrid(extensions.st_makepoint(s.lng, s.lat), 4326)::extensions.geography,
           extensions.st_setsrid(extensions.st_makepoint(o.lng, o.lat), 4326)::extensions.geography),
         o.total, o.delivery_fee, o.payment_method, o.placed_at
    from public.orders o
    join public.stores s on s.id = o.store_id
   where o.courier_id is null
     and o.status in ('accepted', 'picking', 'ready')
   order by o.placed_at;
end;
$$;

create or replace function public.courier_accept_order(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
begin
  if not exists (
    select 1 from public.couriers where user_id = v_uid and status = 'approved' and is_online
  ) then
    raise exception 'courier_not_online';
  end if;
  if exists (
    select 1 from public.orders
     where courier_id = v_uid and status in ('accepted', 'picking', 'ready', 'delivering')
  ) then
    raise exception 'courier_busy';
  end if;

  update public.orders
     set courier_id = v_uid, courier_assigned_at = now()
   where id = p_order_id and courier_id is null and status in ('accepted', 'picking', 'ready')
  returning * into v_order;
  if not found then raise exception 'order_already_taken'; end if;

  insert into public.order_status_history (order_id, status, actor_id, note)
  values (p_order_id, v_order.status, v_uid, 'courier_assigned');
  return v_order;
end;
$$;

create or replace function public.courier_release_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  update public.orders
     set courier_id = null, courier_assigned_at = null
   where id = p_order_id and courier_id = auth.uid() and status in ('accepted', 'picking', 'ready')
  returning * into v_order;
  if not found then raise exception 'cannot_release_order'; end if;

  insert into public.order_status_history (order_id, status, actor_id, note)
  values (p_order_id, v_order.status, auth.uid(), coalesce('courier_released: ' || p_reason, 'courier_released'));
  return v_order;
end;
$$;

-- ---------- Courier rating from reviews ----------
create or replace function public.reviews_update_courier_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_courier uuid;
begin
  select courier_id into v_courier from public.orders where id = new.order_id;
  if v_courier is not null and new.courier_rating is not null then
    update public.couriers c set rating = (
      select round(avg(r.courier_rating)::numeric, 2)
        from public.reviews r join public.orders o on o.id = r.order_id
       where o.courier_id = v_courier and r.courier_rating is not null
    ) where c.user_id = v_courier;
  end if;
  return new;
end;
$$;
create trigger reviews_courier_rating after insert on public.reviews
  for each row execute function public.reviews_update_courier_rating();

-- ---------- Admin actions ----------
create or replace function public.admin_review_courier(
  p_user_id uuid,
  p_status public.courier_application_status,
  p_reason text default null
) returns public.couriers
language plpgsql security definer set search_path = '' as $$
declare
  v_courier public.couriers;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.couriers set
    status = p_status,
    rejection_reason = case when p_status in ('rejected', 'blocked') then p_reason else null end,
    is_online = case when p_status = 'approved' then is_online else false end
  where user_id = p_user_id returning * into v_courier;
  if not found then raise exception 'courier_not_found'; end if;

  if p_status = 'approved' then
    update public.profiles set role = 'courier' where id = p_user_id and role = 'client';
  end if;
  return v_courier;
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set role = p_role where id = p_user_id returning * into v_profile;
  if not found then raise exception 'user_not_found'; end if;
  return v_profile;
end;
$$;

create or replace function public.admin_set_user_blocked(p_user_id uuid, p_blocked boolean)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set is_blocked = p_blocked where id = p_user_id returning * into v_profile;
  if not found then raise exception 'user_not_found'; end if;
  return v_profile;
end;
$$;

-- ---------- Payment confirmation (called by payment webhook with service role) ----------
create or replace function public.confirm_card_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_amount numeric,
  p_payload jsonb default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  insert into public.payments (order_id, provider, provider_payment_id, amount, status, payload)
  values (p_order_id, p_provider, p_provider_payment_id, p_amount, 'paid', p_payload);

  update public.orders set
    payment_status = 'paid',
    status = case when status = 'awaiting_payment' then 'placed'::public.order_status else status end
  where id = p_order_id returning * into v_order;

  insert into public.order_status_history (order_id, status, note)
  values (p_order_id, v_order.status, 'payment_confirmed');
  return v_order;
end;
$$;

