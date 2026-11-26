-- Format order totals in staff notifications as "2 400 ₸" instead of "2400.00 ₸".
create or replace function public._fmt_tenge(p numeric)
returns text language sql immutable set search_path = '' as $$
  select replace(to_char(round(p), 'FM999,999,999,990'), ',', ' ') || ' ₸';
$$;

create or replace function public.orders_notify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_locale public.app_locale;
  v_text text;
  v_data jsonb := jsonb_build_object('order_id', new.id, 'status', new.status);
  v_staff record;
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    select locale into v_locale from public.profiles where id = new.client_id;
    v_text := public._status_text(new.status, coalesce(v_locale, 'ru'));
    if v_text is not null then
      perform public._notify(new.client_id,
        case when coalesce(v_locale, 'ru') = 'kk' then '№' || new.number || ' тапсырыс' else 'Заказ №' || new.number end,
        v_text, v_data);
    end if;
  end if;

  if new.status = 'placed' and (tg_op = 'INSERT' or old.status is distinct from 'placed') then
    for v_staff in select user_id from public.store_staff where store_id = new.store_id loop
      perform public._notify(v_staff.user_id, 'Новый заказ №' || new.number,
        'Сумма ' || public._fmt_tenge(new.total), v_data || jsonb_build_object('app', 'partner'));
    end loop;
  end if;

  if tg_op = 'UPDATE' and new.status = 'ready' and old.status <> 'ready' and new.courier_id is not null then
    perform public._notify(new.courier_id, 'Заказ №' || new.number || ' собран',
      'Можно забирать в магазине', v_data || jsonb_build_object('app', 'partner'));
  end if;

  if tg_op = 'UPDATE' and new.status = 'cancelled' and old.status <> 'cancelled' and new.courier_id is not null then
    perform public._notify(new.courier_id, 'Заказ №' || new.number || ' отменён',
      coalesce(new.cancel_reason, ''), v_data || jsonb_build_object('app', 'partner'));
  end if;
  return new;
end;
$$;

revoke execute on function public.orders_notify() from public, anon, authenticated;
