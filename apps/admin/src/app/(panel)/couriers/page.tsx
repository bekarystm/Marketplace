'use client';
import { useState } from 'react';
import { formatPhone, type Database } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { COURIER_STATUS_RU, VEHICLE_RU, fmtDate } from '@/lib/labels';
import { Badge, Button, Input, Modal, PageHeader, Select, Table, Td } from '@/components/ui';

type Status = Database['public']['Enums']['courier_application_status'];

export default function CouriersPage() {
  const [filter, setFilter] = useState<Status | ''>('pending');
  const [docs, setDocs] = useState<{ name: string; urls: string[] } | null>(null);
  const [reason, setReason] = useState('');
  const { data, reload } = useData(async () => {
    let q = supabase.from('couriers').select('*, profile:profiles(full_name, phone)').order('created_at', { ascending: false });
    if (filter) q = q.eq('status', filter);
    return unwrap(await q);
  }, [filter]);

  const review = async (userId: string, status: Status) => {
    const { error } = await supabase.rpc('admin_review_courier', { p_user_id: userId, p_status: status, p_reason: reason || undefined });
    if (error) alert(error.message);
    setReason('');
    reload();
  };

  const showDocs = async (name: string, paths: (string | null)[]) => {
    const urls: string[] = [];
    for (const p of paths.filter(Boolean) as string[]) {
      const { data: s } = await supabase.storage.from('courier-docs').createSignedUrl(p, 300);
      if (s?.signedUrl) urls.push(s.signedUrl);
    }
    setDocs({ name, urls });
  };

  return (
    <>
      <PageHeader title="Курьеры" />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={filter} onChange={(e) => setFilter(e.target.value as Status | '')}>
          <option value="">Все</option>
          {Object.entries(COURIER_STATUS_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Input placeholder="Причина отказа/блокировки" value={reason} onChange={(e) => setReason(e.target.value)} className="w-72" />
      </div>
      <Table head={['Курьер', 'Транспорт', 'ИИН', 'Статус', 'Доставок / рейтинг', 'Подана', 'Действия']}>
        {(data ?? []).map((c) => (
          <tr key={c.user_id}>
            <Td>
              <div className="font-medium">{c.profile?.full_name ?? '—'}</div>
              <div className="text-xs text-stone-500">{formatPhone(c.profile?.phone)}</div>
            </Td>
            <Td>{VEHICLE_RU[c.vehicle]}</Td>
            <Td>{c.iin ?? '—'}</Td>
            <Td>
              <Badge tone={c.status === 'approved' ? 'green' : c.status === 'pending' ? 'yellow' : 'red'}>{COURIER_STATUS_RU[c.status]}</Badge>
              {c.is_online ? <span className="ml-1 text-xs text-green-700">● на линии</span> : null}
            </Td>
            <Td>{c.deliveries_count} / {c.rating ?? '—'}</Td>
            <Td className="text-stone-500">{fmtDate(c.created_at)}</Td>
            <Td className="space-x-2 whitespace-nowrap">
              <button className="text-sky-700" onClick={() => showDocs(c.profile?.full_name ?? '', [c.document_photo_url, c.selfie_url])}>Документы</button>
              {c.status !== 'approved' ? <button className="text-green-700" onClick={() => review(c.user_id, 'approved')}>Одобрить</button> : null}
              {c.status === 'pending' ? <button className="text-red-600" onClick={() => review(c.user_id, 'rejected')}>Отклонить</button> : null}
              {c.status === 'approved' ? <button className="text-red-600" onClick={() => review(c.user_id, 'blocked')}>Заблокировать</button> : null}
            </Td>
          </tr>
        ))}
      </Table>
      <Modal open={!!docs} onClose={() => setDocs(null)} title={`Документы: ${docs?.name ?? ''}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {docs?.urls.map((u) => <img key={u} src={u} alt="" className="w-full rounded-lg border" />)}
          {docs && docs.urls.length === 0 ? <p className="text-stone-400">Нет загруженных документов</p> : null}
        </div>
        <Button className="mt-4" variant="secondary" onClick={() => setDocs(null)}>Закрыть</Button>
      </Modal>
    </>
  );
}
