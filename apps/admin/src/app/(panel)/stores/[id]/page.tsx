'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { PageHeader } from '@/components/ui';
import { StoreSettings } from '@/components/store/StoreSettings';
import { StoreProducts } from '@/components/store/StoreProducts';
import { StoreStaff } from '@/components/store/StoreStaff';
import { StoreSlots } from '@/components/store/StoreSlots';

const TABS = [
  { key: 'products', label: 'Товары' },
  { key: 'settings', label: 'Настройки' },
  { key: 'staff', label: 'Сотрудники' },
  { key: 'slots', label: 'Слоты доставки' },
] as const;

export default function StorePage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('products');
  const { data: store, reload } = useData(async () => unwrap(await supabase.from('stores').select('*').eq('id', id).single()), [id]);
  if (!store) return <p className="text-stone-400">Загрузка…</p>;
  return (
    <>
      <PageHeader title={store.name} />
      <div className="mb-6 flex gap-2 border-b border-stone-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t.key ? 'border-green-600 font-semibold text-green-800' : 'border-transparent text-stone-500'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'settings' && <StoreSettings store={store} onSaved={reload} />}
      {tab === 'products' && <StoreProducts storeId={store.id} />}
      {tab === 'staff' && <StoreStaff storeId={store.id} />}
      {tab === 'slots' && <StoreSlots storeId={store.id} />}
    </>
  );
}
