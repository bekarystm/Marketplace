'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CITY, formatMoney } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { useSession } from '@/lib/session';
import { Badge, Button, ErrorText, Field, Input, Modal, PageHeader, Table, Td } from '@/components/ui';

export default function StoresPage() {
  const { isAdmin, managedStores } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data, reload } = useData(async () => unwrap(await supabase.from('stores').select('*').order('sort_order')), []);

  // managers with one store go straight to it
  useEffect(() => {
    if (!isAdmin && managedStores.length === 1) router.replace(`/stores/${managedStores[0].id}`);
  }, [isAdmin, managedStores, router]);

  const create = async () => {
    setError(null);
    const { data: s, error: e } = await supabase.from('stores').insert({
      name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), address_line: address,
      lat: CITY.center.lat, lng: CITY.center.lng,
    }).select().single();
    if (e) return setError(e.message);
    setOpen(false);
    reload();
    router.push(`/stores/${s.id}`);
  };

  return (
    <>
      <PageHeader title="Магазины" actions={isAdmin ? <Button onClick={() => setOpen(true)}>+ Магазин</Button> : null} />
      <Table head={['Название', 'Адрес', 'Доставка', 'Мин. заказ', 'Комиссия', 'Статус']}>
        {(data ?? []).map((s) => (
          <tr key={s.id} className="hover:bg-stone-50">
            <Td><Link className="font-semibold text-green-700" href={`/stores/${s.id}`}>{s.name}</Link></Td>
            <Td>{s.address_line}</Td>
            <Td>{formatMoney(s.delivery_fee)}</Td>
            <Td>{formatMoney(s.min_order_amount)}</Td>
            <Td>{s.commission_percent}%</Td>
            <Td>{s.is_active ? <Badge tone="green">Активен</Badge> : <Badge>Скрыт</Badge>}</Td>
          </tr>
        ))}
      </Table>
      <Modal open={open} onClose={() => setOpen(false)} title="Новый магазин">
        <div className="space-y-3">
          <Field label="Название"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Короткое имя (латиницей)" hint="например magnum-center"><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></Field>
          <Field label="Адрес"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <ErrorText>{error}</ErrorText>
          <Button onClick={create} disabled={!name || !address}>Создать</Button>
        </div>
      </Modal>
    </>
  );
}
