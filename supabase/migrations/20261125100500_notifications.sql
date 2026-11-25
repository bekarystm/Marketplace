-- =====================================================================
-- In-app notifications generated from order events.
-- A Database Webhook on public.notifications (INSERT) calls the
-- `send-push` edge function, which delivers them via Expo Push.
-- =====================================================================

create or replace function public._notify(
  p_user_id uuid, p_title text, p_body text, p_data jsonb
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, title, body, data)
  values (p_user_id, p_title, p_body, coalesce(p_data, '{}'::jsonb));
$$;

create or replace function public._status_text(p_status public.order_status, p_locale public.app_locale)
returns text language sql immutable set search_path = '' as $$
  select case p_locale
    when 'kk' then case p_status
      when 'placed' then 'Тапсырыс рәсімделді'
      when 'accepted' then 'Дүкен тапсырысты қабылдады'
      when 'picking' then 'Тапсырыс жиналуда'
      when 'ready' then 'Тапсырыс жиналды, курьерді күтуде'
      when 'delivering' then 'Курьер жолда'
      when 'delivered' then 'Тапсырыс жеткізілді. Ас болсын!'
      when 'cancelled' then 'Тапсырыс болдырылмады'
      else null end
    else case p_status
      when 'placed' then 'Заказ оформлен'
      when 'accepted' then 'Магазин принял заказ'
      when 'picking' then 'Заказ собирается'
      when 'ready' then 'Заказ собран и ждёт курьера'
      when 'delivering' then 'Курьер в пути'
      when 'delivered' then 'Заказ доставлен. Приятного аппетита!'
      when 'cancelled' then 'Заказ отменён'
      else null end
  end;
$$;

create or replace function public.orders_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_locale public.app_locale;
  v_text text;
  v_data jsonb := jsonb_build_object('order_id', new.id, 'status', new.status);
  v_staff record;
begin
  -- client: every status change (except the initial awaiting_payment)
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    select locale into v_locale from public.profiles where id = new.client_id;
    v_text := public._status_text(new.status, coalesce(v_locale, 'ru'));
    if v_text is not null then
      perform public._notify(new.client_id,
        case when coalesce(v_locale, 'ru') = 'kk' then '№' || new.number || ' тапсырыс' else 'Заказ №' || new.number end,
        v_text, v_data);
    end if;
  end if;

  -- store staff: a new order to process
  if new.status = 'placed' and (tg_op = 'INSERT' or old.status is distinct from 'placed') then
    for v_staff in select user_id from public.store_staff where store_id = new.store_id loop
      perform public._notify(v_staff.user_id, 'Новый заказ №' || new.number,
        'Сумма ' || new.total || ' ₸', v_data || jsonb_build_object('app', 'partner'));
    end loop;
  end if;

  -- courier: order packed and ready for pickup
  if tg_op = 'UPDATE' and new.status = 'ready' and old.status <> 'ready' and new.courier_id is not null then
    perform public._notify(new.courier_id, 'Заказ №' || new.number || ' собран',
      'Можно забирать в магазине', v_data || jsonb_build_object('app', 'partner'));
  end if;

  -- courier: order cancelled while assigned
  if tg_op = 'UPDATE' and new.status = 'cancelled' and old.status <> 'cancelled' and new.courier_id is not null then
    perform public._notify(new.courier_id, 'Заказ №' || new.number || ' отменён',
      coalesce(new.cancel_reason, ''), v_data || jsonb_build_object('app', 'partner'));
  end if;
  return new;
end;
$$;

create trigger orders_notify
  after insert or update of status on public.orders
  for each row execute function public.orders_notify();

-- client: replacement proposed and waiting for a decision
create or replace function public.order_items_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  if new.status = 'replaced' and new.replacement_approved is null
     and (old.status is distinct from 'replaced' or old.replacement_product_id is distinct from new.replacement_product_id) then
    select * into v_order from public.orders where id = new.order_id;
    perform public._notify(v_order.client_id, 'Заказ №' || v_order.number || ': нужна замена',
      new.name || ' → ' || new.replacement_name,
      jsonb_build_object('order_id', v_order.id, 'item_id', new.id));
  end if;
  return new;
end;
$$;

create trigger order_items_notify
  after update on public.order_items
  for each row execute function public.order_items_notify();

revoke execute on function public._notify(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.orders_notify() from public, anon, authenticated;
revoke execute on function public.order_items_notify() from public, anon, authenticated;
