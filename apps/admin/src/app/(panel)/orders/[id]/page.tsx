'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { errorMessage, formatMoney, formatPhone, formatQuantity, slotLabel, staffNextStatus, channelName } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { useSession } from '@/lib/session';
import { STATUS_RU, PAYMENT_RU, PAYMENT_STATUS_RU, fmtDate } from '@/lib/labels';
import { Badge, Button, Card, ErrorText, Input, PageHeader, statusTone } from '@/components/ui';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const { data, reload } = useData(async () => {
    const order = unwrap(await supabase.from('orders').select('*, store:stores(name, phone), slot:delivery_slots(starts_at, ends_at)').eq('id', id).single());
    const [items, history, client, courier] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', id).order('created_at'),
      supabase.from('order_status_history').select('*').eq('order_id', id).order('created_at'),
      supabase.from('profiles').select('full_name, phone').eq('id', order.client_id).maybeSingle(),
      order.courier_id ? supabase.from('profiles').select('full_name, phone').eq('id', order.courier_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return { order, items: items.data ?? [], history: history.data ?? [], client: client.data, courier: courier.data };
  }, [id]);

  // live updates: client approvals of substitutions, courier progress, etc.
  useEffect(() => {
    const ch = supabase
      .channel(channelName(`admin-order-${id}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${id}` }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, reload]);

  if (!data) return <p className="text-stone-400">Загрузка…</p>;
  const { order, items, history, client, courier } = data;
  const next = staffNextStatus(order.status);
  const picking = order.status === 'picking';
  const pending = items.filter((i) => i.status === 'pending');

  const pick = async (itemId: string, status: 'picked' | 'missing' | 'pending', quantity?: number) => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc('picker_update_item', {
      p_item_id: itemId,
      p_status: status,
      p_picked_quantity: quantity,
    });
    setBusy(false);
    if (e) setError(errorMessage(e));
    else reload();
  };

  const pickWeighted = (item: (typeof items)[number]) => {
    const raw = window.prompt(`Фактический вес «${item.name}», кг`, String(item.quantity));
    if (raw === null) return;
    const q = Number(raw.replace(',', '.'));
    if (!(q > 0)) return setError('Введите вес больше нуля');
    pick(item.id, 'picked', q);
  };

  const pickAllRemaining = async () => {
    setBusy(true);
    setError(null);
    for (const item of pending) {
      const { error: e } = await supabase.rpc('picker_update_item', { p_item_id: item.id, p_status: 'picked' });
      if (e) {
        setError(errorMessage(e));
        break;
      }
    }
    setBusy(false);
    reload();
  };

  const setStatus = async (status: typeof order.status, note?: string) => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc('update_order_status', { p_order_id: order.id, p_status: status, p_note: note ?? undefined });
    setBusy(false);
    if (e) setError(errorMessage(e));
    else reload();
  };

  return (
    <>
      <PageHeader
        title={`Заказ №${order.number}`}
        actions={<Badge tone={statusTone(order.status)}>{STATUS_RU[order.status]}</Badge>}
      />
      <ErrorText>{error}</ErrorText>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-1 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Товары</h2>
            {picking && pending.length > 0 ? (
              <Button variant="secondary" loading={busy} onClick={pickAllRemaining}>
                Отметить всё оставшееся собранным ({pending.length})
              </Button>
            ) : null}
          </div>
          {picking && pending.length > 0 ? (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Отметьте каждый товар: собран, нет в наличии или замена (замены предлагаются из приложения «Партнёр»).
              Весовые товары — с фактическим весом. После этого заказ можно перевести в «Собран».
            </p>
          ) : null}
          {items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3 border-b border-stone-100 py-2 text-sm">
              <div>
                <div className={i.status === 'missing' ? 'text-stone-400 line-through' : ''}>
                  {i.status === 'picked' ? '✅ ' : i.status === 'missing' ? '❌ ' : i.status === 'replaced' ? '🔁 ' : picking ? '⏳ ' : ''}
                  {i.name}
                </div>
                {i.status === 'replaced' ? (
                  <div className="text-xs text-sky-700">
                    Замена: {i.replacement_name} ({formatMoney(i.replacement_price)}) —{' '}
                    {i.replacement_approved == null ? 'ждём клиента' : i.replacement_approved ? 'согласовано' : 'отказ'}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div>{formatQuantity(i.picked_quantity ?? i.quantity, i.unit)} × {formatMoney(i.price)}</div>
                {picking ? (
                  <div className="mt-1 flex justify-end gap-2 text-xs">
                    {i.status === 'pending' ? (
                      <>
                        <button className="text-green-700 hover:underline" disabled={busy}
                          onClick={() => (i.unit === 'kg' || i.unit === 'g' ? pickWeighted(i) : pick(i.id, 'picked'))}>
                          Собрано
                        </button>
                        <button className="text-red-600 hover:underline" disabled={busy} onClick={() => pick(i.id, 'missing')}>
                          Нет в наличии
                        </button>
                      </>
                    ) : (
                      <button className="text-stone-500 hover:underline" disabled={busy} onClick={() => pick(i.id, 'pending')}>
                        Отменить отметку
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div className="space-y-1 pt-3 text-sm">
            <div className="flex justify-between"><span>Товары</span><span>{formatMoney(order.items_total)}</span></div>
            <div className="flex justify-between"><span>Доставка</span><span>{formatMoney(order.delivery_fee)}</span></div>
            {Number(order.discount_amount) > 0 ? <div className="flex justify-between"><span>Скидка</span><span>−{formatMoney(order.discount_amount)}</span></div> : null}
            {Number(order.bonus_spent) > 0 ? <div className="flex justify-between"><span>Бонусы</span><span>−{formatMoney(order.bonus_spent)}</span></div> : null}
            <div className="flex justify-between text-base font-bold"><span>Итого</span><span>{formatMoney(order.total)}</span></div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="space-y-1 text-sm">
            <h2 className="mb-2 font-bold">Клиент</h2>
            <div>{client?.full_name ?? '—'}</div>
            <div>{formatPhone(order.contact_phone)}</div>
            <div className="text-stone-600">
              {order.address_line}{order.apartment ? `, кв. ${order.apartment}` : ''}{order.entrance ? `, подъезд ${order.entrance}` : ''}
              {order.floor ? `, этаж ${order.floor}` : ''}
            </div>
            {order.comment ? <div className="text-stone-500">💬 {order.comment}</div> : null}
          </Card>
          <Card className="space-y-1 text-sm">
            <h2 className="mb-2 font-bold">Оплата и доставка</h2>
            <div>{PAYMENT_RU[order.payment_method]} · {PAYMENT_STATUS_RU[order.payment_status]}</div>
            <div>Магазин: {order.store?.name}</div>
            <div>Время: {order.slot ? slotLabel(order.slot, { today: 'Сегодня', tomorrow: 'Завтра' }) : 'как можно скорее'}</div>
            <div>Курьер: {courier ? `${courier.full_name ?? ''} ${formatPhone(courier.phone)}` : 'не назначен'}</div>
          </Card>
          <Card className="space-y-2">
            {next ? <Button className="w-full" loading={busy} onClick={() => setStatus(next)}>→ {STATUS_RU[next]}</Button> : null}
            {isAdmin && order.status === 'ready' ? <Button className="w-full" variant="secondary" loading={busy} onClick={() => setStatus('delivering')}>→ В пути</Button> : null}
            {isAdmin && order.status === 'delivering' ? <Button className="w-full" variant="secondary" loading={busy} onClick={() => setStatus('delivered')}>→ Доставлен</Button> : null}
            {!['delivered', 'cancelled'].includes(order.status) ? (
              <div className="space-y-2 border-t border-stone-100 pt-2">
                <Input placeholder="Причина отмены" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full" />
                <Button className="w-full" variant="danger" loading={busy} onClick={() => setStatus('cancelled', reason || undefined)}>Отменить заказ</Button>
              </div>
            ) : null}
          </Card>
          <Card className="text-sm">
            <h2 className="mb-2 font-bold">История</h2>
            {history.map((h) => (
              <div key={h.id} className="flex justify-between py-1">
                <span>{STATUS_RU[h.status]}{h.note ? ` · ${h.note}` : ''}</span>
                <span className="text-stone-400">{fmtDate(h.created_at)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
