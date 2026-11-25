'use client';
import { useState } from 'react';
import type { Category } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { Button, ErrorText, Field, Input, Modal, PageHeader, Table, Td } from '@/components/ui';

export default function CategoriesPage() {
  const [draft, setDraft] = useState<Partial<Category> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, reload } = useData(async () => unwrap(await supabase.from('categories').select('*').order('sort_order')), []);

  const save = async () => {
    if (!draft) return;
    setError(null);
    const row = { slug: draft.slug ?? '', name_ru: draft.name_ru ?? '', name_kk: draft.name_kk ?? '', sort_order: Number(draft.sort_order ?? 0), is_active: draft.is_active ?? true, image_url: draft.image_url ?? null };
    const res = draft.id ? await supabase.from('categories').update(row).eq('id', draft.id) : await supabase.from('categories').insert(row);
    if (res.error) return setError(res.error.message);
    setDraft(null);
    reload();
  };

  return (
    <>
      <PageHeader title="Категории" actions={<Button onClick={() => setDraft({ is_active: true, sort_order: (data?.length ?? 0) * 10 })}>+ Категория</Button>} />
      <Table head={['Порядок', 'Название', 'Атауы', 'Код (для CSV)', 'Активна']}>
        {(data ?? []).map((c) => (
          <tr key={c.id} className="cursor-pointer hover:bg-stone-50" onClick={() => setDraft({ ...c })}>
            <Td>{c.sort_order}</Td><Td className="font-medium">{c.name_ru}</Td><Td>{c.name_kk}</Td>
            <Td className="font-mono text-xs">{c.slug}</Td><Td>{c.is_active ? '✓' : '—'}</Td>
          </tr>
        ))}
      </Table>
      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Категория' : 'Новая категория'}>
        {draft ? (
          <div className="space-y-3">
            <Field label="Название (рус)"><Input value={draft.name_ru ?? ''} onChange={(e) => setDraft({ ...draft, name_ru: e.target.value })} /></Field>
            <Field label="Атауы (қаз)"><Input value={draft.name_kk ?? ''} onChange={(e) => setDraft({ ...draft, name_kk: e.target.value })} /></Field>
            <Field label="Код (латиницей)"><Input value={draft.slug ?? ''} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
            <Field label="Порядок"><Input type="number" value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_active ?? true} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Активна</label>
            <ErrorText>{error}</ErrorText>
            <div className="flex gap-2">
              <Button onClick={save} disabled={!draft.name_ru || !draft.name_kk || !draft.slug}>Сохранить</Button>
              {draft.id ? <Button variant="danger" onClick={async () => { if (confirm('Удалить категорию?')) { await supabase.from('categories').delete().eq('id', draft.id!); setDraft(null); reload(); } }}>Удалить</Button> : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
