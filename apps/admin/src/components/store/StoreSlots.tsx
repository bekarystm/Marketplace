'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { Button, ErrorText, Field, Input, Table, Td } from '@/components/ui';

const fmt = (s: string) => new Date(s).toLocaleString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Generates 2-hour delivery windows for the next N days (Kazakhstan time, UTC+5). */
function buildSlots(storeId: string, days: number, from: number, to: number, capacity: number) {
  const rows = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    for (let h = from; h + 2 <= to; h += 2) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d, h - 5));
      if (day <= now) continue;
      rows.push({ store_id: storeId, starts_at: day.toISOString(), ends_at: new Date(day.getTime() + 2 * 3600e3).toISOString(), capacity });
    }
  }
  return rows;
}

export function StoreSlots({ storeId }: { storeId: string }) {
  const [days, setDays] = useState(3);
  const [from, setFrom] = useState(10);
  const [to, setTo] = useState(22);
  const [capacity, setCapacity] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const { data, reload } = useData(async () =>
    unwrap(await supabase.from('delivery_slots').select('*').eq('store_id', storeId).gte('starts_at', new Date().toISOString()).order('starts_at')), [storeId]);

  const generate = async () => {
    setError(null);
    const { error: e } = await supabase.from('delivery_slots').upsert(buildSlots(storeId, days, from, to, capacity), { onConflict: 'store_id,starts_at', ignoreDuplicates: true });
    if (e) setError(e.message);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Дней вперёд"><Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24" /></Field>
        <Field label="С (час)"><Input type="number" value={from} onChange={(e) => setFrom(Number(e.target.value))} className="w-24" /></Field>
        <Field label="До (час)"><Input type="number" value={to} onChange={(e) => setTo(Number(e.target.value))} className="w-24" /></Field>
        <Field label="Заказов в слот"><Input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-24" /></Field>
        <Button onClick={generate}>Создать слоты</Button>
      </div>
      <ErrorText>{error}</ErrorText>
      <Table head={['Начало', 'Конец', 'Занято', '']}>
        {(data ?? []).map((s) => (
          <tr key={s.id}>
            <Td>{fmt(s.starts_at)}</Td>
            <Td>{fmt(s.ends_at)}</Td>
            <Td>{s.booked} / {s.capacity}</Td>
            <Td>{s.booked === 0 ? <button className="text-red-600" onClick={async () => { await supabase.from('delivery_slots').delete().eq('id', s.id); reload(); }}>Удалить</button> : null}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
