'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatMoney, type OrderStatus } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { STATUS_RU, PAYMENT_RU, fmtDate } from '@/lib/labels';
import { Badge, Empty, Input, PageHeader, Select, Table, Td, statusTone } from '@/components/ui';

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const { data, loading, reload } = useData(async () => {
    let q = supabase
      .from('orders')
      .select('id, number, status, total, payment_method, payment_status, created_at, contact_phone, address_line, store:stores(name)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (status) q = q.eq('status', status);
    const n = Number(search);
    if (search && Number.isInteger(n)) q = q.eq('number', n);
    else if (search) q = q.ilike('contact_phone', `%${search.replace(/\D/g, '')}%`);
    return unwrap(await q);
  }, [status, search]);

  // live refresh when any visible order changes
  useEffect(() => {
    const ch = supabase.channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [reload]);

  return (
    <>
      <PageHeader title="Заказы" />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
          <option value="">Все статусы</option>
          {Object.entries(STATUS_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Input placeholder="№ заказа или телефон" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Table head={['№', 'Магазин', 'Статус', 'Сумма', 'Оплата', 'Адрес', 'Создан']}>
        {(data ?? []).map((o) => (
          <tr key={o.id} className="hover:bg-stone-50">
            <Td><Link href={`/orders/${o.id}`} className="font-semibold text-green-700">{o.number}</Link></Td>
            <Td>{o.store?.name}</Td>
            <Td><Badge tone={statusTone(o.status)}>{STATUS_RU[o.status]}</Badge></Td>
            <Td className="font-medium">{formatMoney(o.total)}</Td>
            <Td>{PAYMENT_RU[o.payment_method]}{o.payment_status === 'paid' ? ' ✓' : ''}</Td>
            <Td className="max-w-56 truncate">{o.address_line}</Td>
            <Td className="whitespace-nowrap text-stone-500">{fmtDate(o.created_at)}</Td>
          </tr>
        ))}
      </Table>
      {!loading && (data ?? []).length === 0 ? <Empty /> : null}
    </>
  );
}
