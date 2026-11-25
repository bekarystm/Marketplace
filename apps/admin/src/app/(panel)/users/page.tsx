'use client';
import { useState } from 'react';
import { formatMoney, formatPhone, type Database } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { ROLE_RU, fmtDate } from '@/lib/labels';
import { Badge, Input, PageHeader, Select, Table, Td } from '@/components/ui';

type Role = Database['public']['Enums']['user_role'];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const { data, reload } = useData(async () => {
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
    const digits = search.replace(/\D/g, '');
    if (digits) q = q.ilike('phone', `%${digits}%`);
    else if (search.trim()) q = q.ilike('full_name', `%${search.trim()}%`);
    return unwrap(await q);
  }, [search]);

  const setRole = async (id: string, role: Role) => {
    if (role === 'admin' && !confirm('Выдать права администратора?')) return;
    const { error } = await supabase.rpc('admin_set_user_role', { p_user_id: id, p_role: role });
    if (error) alert(error.message);
    reload();
  };
  const setBlocked = async (id: string, blocked: boolean) => {
    const { error } = await supabase.rpc('admin_set_user_blocked', { p_user_id: id, p_blocked: blocked });
    if (error) alert(error.message);
    reload();
  };

  return (
    <>
      <PageHeader title="Пользователи" />
      <Input className="mb-4 w-72" placeholder="Телефон или имя" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Table head={['Имя', 'Телефон', 'Роль', 'Бонусы', 'Регистрация', '']}>
        {(data ?? []).map((u) => (
          <tr key={u.id}>
            <Td>{u.full_name ?? '—'} {u.is_blocked ? <Badge tone="red">Заблокирован</Badge> : null}</Td>
            <Td>{formatPhone(u.phone)}</Td>
            <Td>
              <Select value={u.role} onChange={(e) => setRole(u.id, e.target.value as Role)}>
                {Object.entries(ROLE_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Td>
            <Td>{formatMoney(u.bonus_balance)}</Td>
            <Td className="text-stone-500">{fmtDate(u.created_at)}</Td>
            <Td>
              <button className={u.is_blocked ? 'text-green-700' : 'text-red-600'} onClick={() => setBlocked(u.id, !u.is_blocked)}>
                {u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
              </button>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
