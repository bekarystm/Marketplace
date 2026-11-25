'use client';
import Link from 'next/link';
import { formatMoney, type Order } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { useSession } from '@/lib/session';
import { STATUS_RU } from '@/lib/labels';
import { Badge, Card, PageHeader, statusTone } from '@/components/ui';


function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <Card>
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function Dashboard() {
  const { isAdmin } = useSession();
  const { data } = useData(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const orders = unwrap(
      await supabase.from('orders').select('id, number, status, total, created_at, store:stores(name)')
        .gte('created_at', start.toISOString()).order('created_at', { ascending: false }),
    ) as (Pick<Order, 'id' | 'number' | 'status' | 'total' | 'created_at'> & { store: { name: string } | null })[];
    let onlineCouriers = 0;
    let pendingCouriers = 0;
    if (isAdmin) {
      const on = await supabase.from('couriers').select('user_id', { count: 'exact', head: true }).eq('is_online', true);
      const pend = await supabase.from('couriers').select('user_id', { count: 'exact', head: true }).eq('status', 'pending');
      onlineCouriers = on.count ?? 0;
      pendingCouriers = pend.count ?? 0;
    }
    return { orders, onlineCouriers, pendingCouriers };
  }, [isAdmin]);

  const orders = data?.orders ?? [];
  const delivered = orders.filter((o) => o.status === 'delivered');
  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const revenue = delivered.reduce((s, o) => s + Number(o.total), 0);

  return (
    <>
      <PageHeader title="Обзор за сегодня" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Заказов" value={orders.length} href="/orders" />
        <Stat label="Активных" value={active.length} href="/orders" />
        <Stat label="Выручка (доставлено)" value={formatMoney(revenue)} />
        {isAdmin ? <Stat label="Курьеров на линии" value={`${data?.onlineCouriers ?? 0}`} href="/couriers" /> : null}
      </div>
      {isAdmin && (data?.pendingCouriers ?? 0) > 0 ? (
        <Link href="/couriers" className="mt-4 block rounded-xl bg-amber-50 p-4 text-amber-900">
          Анкет курьеров на проверке: <b>{data?.pendingCouriers}</b> →
        </Link>
      ) : null}
      <h2 className="mb-3 mt-8 text-lg font-bold">Активные заказы</h2>
      <div className="space-y-2">
        {active.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 hover:border-green-600">
            <span className="font-semibold">№{o.number} · {o.store?.name}</span>
            <span className="flex items-center gap-3">
              <Badge tone={statusTone(o.status)}>{STATUS_RU[o.status]}</Badge>
              <span className="font-semibold">{formatMoney(o.total)}</span>
            </span>
          </Link>
        ))}
        {active.length === 0 ? <p className="text-stone-400">Нет активных заказов</p> : null}
      </div>
    </>
  );
}
