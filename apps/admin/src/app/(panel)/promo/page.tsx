'use client';
import { useState } from 'react';
import { formatMoney, type Database } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { Badge, Button, ErrorText, Field, Input, Modal, PageHeader, Select, Table, Td } from '@/components/ui';

type Promo = Database['public']['Tables']['promo_codes']['Row'];

export default function PromoPage() {
  const [draft, setDraft] = useState<Partial<Promo> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, reload } = useData(async () => unwrap(await supabase.from('promo_codes').select('*').order('created_at', { ascending: false })), []);
  const { data: stores } = useData(async () => unwrap(await supabase.from('stores').select('id, name')), []);

  const save = async () => {
    if (!draft) return;
    setError(null);
    const row = {
      code: (draft.code ?? '').trim().toUpperCase(),
      description: draft.description ?? null,
      discount_type: draft.discount_type ?? 'percent',
      discount_value: Number(draft.discount_value ?? 0),
      max_discount: draft.max_discount ? Number(draft.max_discount) : null,
      min_order_amount: Number(draft.min_order_amount ?? 0),
      store_id: draft.store_id || null,
      first_order_only: !!draft.first_order_only,
      usage_limit: draft.usage_limit ? Number(draft.usage_limit) : null,
      per_user_limit: Number(draft.per_user_limit ?? 1),
      starts_at: draft.starts_at || null,
      ends_at: draft.ends_at || null,
      is_active: draft.is_active ?? true,
    };
    const res = draft.id ? await supabase.from('promo_codes').update(row).eq('id', draft.id) : await supabase.from('promo_codes').insert(row);
    if (res.error) return setError(res.error.message);
    setDraft(null);
    reload();
  };

  const d = draft;
  return (
    <>
      <PageHeader title="Промокоды" actions={<Button onClick={() => setDraft({ discount_type: 'percent', per_user_limit: 1, is_active: true })}>+ Промокод</Button>} />
      <Table head={['Код', 'Скидка', 'Мин. заказ', 'Использован', 'Магазин', 'Статус']}>
        {(data ?? []).map((p) => (
          <tr key={p.id} className="cursor-pointer hover:bg-stone-50" onClick={() => setDraft({ ...p })}>
            <Td className="font-mono font-semibold">{p.code}</Td>
            <Td>{p.discount_type === 'percent' ? `${p.discount_value}%${p.max_discount ? ` (до ${formatMoney(p.max_discount)})` : ''}` : formatMoney(p.discount_value)}</Td>
            <Td>{formatMoney(p.min_order_amount)}</Td>
            <Td>{p.usage_count}{p.usage_limit ? ` / ${p.usage_limit}` : ''}</Td>
            <Td>{stores?.find((s) => s.id === p.store_id)?.name ?? 'Все'}</Td>
            <Td>{p.is_active ? <Badge tone="green">Активен</Badge> : <Badge>Выключен</Badge>}</Td>
          </tr>
        ))}
      </Table>
      <Modal open={!!d} onClose={() => setDraft(null)} title={d?.id ? 'Промокод' : 'Новый промокод'}>
        {d ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Код"><Input value={d.code ?? ''} onChange={(e) => setDraft({ ...d, code: e.target.value.toUpperCase() })} /></Field>
            <Field label="Описание"><Input value={d.description ?? ''} onChange={(e) => setDraft({ ...d, description: e.target.value })} /></Field>
            <Field label="Тип скидки">
              <Select value={d.discount_type} onChange={(e) => setDraft({ ...d, discount_type: e.target.value as Promo['discount_type'] })}>
                <option value="percent">Процент</option><option value="fixed">Фиксированная, ₸</option>
              </Select>
            </Field>
            <Field label="Размер скидки"><Input type="number" value={d.discount_value ?? ''} onChange={(e) => setDraft({ ...d, discount_value: Number(e.target.value) })} /></Field>
            <Field label="Макс. скидка, ₸"><Input type="number" value={d.max_discount ?? ''} onChange={(e) => setDraft({ ...d, max_discount: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Мин. сумма заказа, ₸"><Input type="number" value={d.min_order_amount ?? 0} onChange={(e) => setDraft({ ...d, min_order_amount: Number(e.target.value) })} /></Field>
            <Field label="Всего использований" hint="пусто — без лимита"><Input type="number" value={d.usage_limit ?? ''} onChange={(e) => setDraft({ ...d, usage_limit: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="На одного клиента"><Input type="number" value={d.per_user_limit ?? 1} onChange={(e) => setDraft({ ...d, per_user_limit: Number(e.target.value) })} /></Field>
            <Field label="Начало"><Input type="datetime-local" value={d.starts_at?.slice(0, 16) ?? ''} onChange={(e) => setDraft({ ...d, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
            <Field label="Окончание"><Input type="datetime-local" value={d.ends_at?.slice(0, 16) ?? ''} onChange={(e) => setDraft({ ...d, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></Field>
            <Field label="Магазин">
              <Select value={d.store_id ?? ''} onChange={(e) => setDraft({ ...d, store_id: e.target.value || null })}>
                <option value="">Все магазины</option>
                {(stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <div className="flex flex-col gap-2 pt-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!d.first_order_only} onChange={(e) => setDraft({ ...d, first_order_only: e.target.checked })} /> Только первый заказ</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={d.is_active ?? true} onChange={(e) => setDraft({ ...d, is_active: e.target.checked })} /> Активен</label>
            </div>
            <div className="md:col-span-2"><ErrorText>{error}</ErrorText></div>
            <div className="md:col-span-2"><Button onClick={save} disabled={!d.code || !d.discount_value}>Сохранить</Button></div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
