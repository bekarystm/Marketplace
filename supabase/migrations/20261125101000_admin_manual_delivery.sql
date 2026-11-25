-- =====================================================================
-- Admins can move a ready order to delivering/delivered without a courier
-- (manual handling, store's own delivery, testing). Everyone else still
-- needs an assigned courier.
-- =====================================================================
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

  -- admins may move an order without a courier (manual handling / store's own delivery)
  if p_status = 'delivering' and v_order.courier_id is null and not v_is_admin then
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

revoke execute on function public.update_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
