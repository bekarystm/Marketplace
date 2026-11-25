'use client';
import { useState } from 'react';
import { formatPhone, normalizeKzPhone } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { useSession } from '@/lib/session';
import { Button, ErrorText, Input, Select, Table, Td } from '@/components/ui';

export function StoreStaff({ storeId }: { storeId: string }) {
  const { isAdmin } = useSession();
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'picker' | 'manager'>('picker');
  const [error, setError] = useState<string | null>(null);
  const { data, reload } = useData(async () => {
    const staff = unwrap(await supabase.from('store_staff').select('user_id, role, created_at').eq('store_id', storeId));
    const { data: people } = await supabase.rpc('staff_profiles', { p_store_id: storeId });
    return staff.map((s) => ({ ...s, profile: (people ?? []).find((p: { id: string }) => p.id === s.user_id) }));
  }, [storeId]);

  const add = async () => {
    setError(null);
    const p = normalizeKzPhone(phone);
    if (!p) return setError('Неверный номер');
    const { data: found, error: e } = await supabase.rpc('find_profile_by_phone', { p_phone: p });
    if (e) return setError(e.message);
    const user = found?.[0];
    if (!user) return setError('Пользователь с таким номером не найден. Пусть сначала войдёт в приложение «Партнёр».');
    const { error: e2 } = await supabase.from('store_staff').insert({ store_id: storeId, user_id: user.id, role });
    if (e2) return setError(e2.message);
    setPhone('');
    reload();
  };

  const remove = async (userId: string) => {
    await supabase.from('store_staff').delete().eq('store_id', storeId).eq('user_id', userId);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="+7 701 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Select value={role} onChange={(e) => setRole(e.target.value as 'picker' | 'manager')}>
          <option value="picker">Сборщик</option>
          {isAdmin ? <option value="manager">Менеджер</option> : null}
        </Select>
        <Button onClick={add}>Добавить</Button>
      </div>
      <ErrorText>{error}</ErrorText>
      <Table head={['Имя', 'Телефон', 'Роль', '']}>
        {(data ?? []).map((s) => (
          <tr key={s.user_id}>
            <Td>{s.profile?.full_name ?? '—'}</Td>
            <Td>{formatPhone(s.profile?.phone)}</Td>
            <Td>{s.role === 'manager' ? 'Менеджер' : 'Сборщик'}</Td>
            <Td>{isAdmin || s.role === 'picker' ? <button className="text-red-600" onClick={() => remove(s.user_id)}>Убрать</button> : null}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
