'use client';
import { useState } from 'react';
import Papa from 'papaparse';
import { formatMoney, type Product, type TablesInsert } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { UNIT_RU } from '@/lib/labels';
import { Badge, Button, Empty, ErrorText, Field, Input, Modal, Select, Table, Td, Textarea } from '@/components/ui';

type Draft = Partial<Product> & { store_id: string };
const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'pack'] as const;

export const CSV_TEMPLATE =
  'sku,name_ru,name_kk,category,price,old_price,unit,is_weighted,qty_step,stock_qty,barcode,brand,image_url,description_ru\n' +
  'milk-25,Молоко 2.5% 1 л,Сүт 2.5% 1 л,dairy,650,,pcs,false,1,100,4870001234567,Food Master,,\n' +
  'cheese-ru,Сыр Российский,Ресей ірімшігі,dairy,4800,5200,kg,true,0.1,20,,,,\n';

export function StoreProducts({ storeId }: { storeId: string }) {
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: categories } = useData(async () => unwrap(await supabase.from('categories').select('*').order('sort_order')), []);
  const { data: products, reload, loading } = useData(async () => {
    let q = supabase.from('products').select('*').eq('store_id', storeId).order('name_ru').limit(500);
    if (search.trim()) q = q.or(`name_ru.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%,barcode.eq.${search.trim()}`);
    return unwrap(await q);
  }, [storeId, search]);

  const catName = (id: string | null) => categories?.find((c) => c.id === id)?.name_ru ?? '—';

  const save = async () => {
    if (!draft) return;
    setError(null);
    const row = {
      store_id: storeId,
      category_id: draft.category_id || null,
      sku: draft.sku || null,
      barcode: draft.barcode || null,
      name_ru: draft.name_ru ?? '',
      name_kk: draft.name_kk || null,
      description_ru: draft.description_ru || null,
      description_kk: draft.description_kk || null,
      brand: draft.brand || null,
      image_urls: draft.image_urls ?? [],
      unit: draft.unit ?? 'pcs',
      is_weighted: !!draft.is_weighted,
      qty_step: Number(draft.qty_step ?? 1) || 1,
      price: Number(draft.price ?? 0),
      old_price: draft.old_price ? Number(draft.old_price) : null,
      stock_qty: draft.stock_qty === null || draft.stock_qty === undefined || String(draft.stock_qty) === '' ? null : Number(draft.stock_qty),
      is_available: draft.is_available ?? true,
    };
    const res = draft.id
      ? await supabase.from('products').update(row).eq('id', draft.id)
      : await supabase.from('products').insert(row);
    if (res.error) return setError(res.error.message);
    setDraft(null);
    reload();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Удалить «${p.name_ru}»?`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    reload();
  };

  const toggleAvailable = async (p: Product) => {
    await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id);
    reload();
  };

  const uploadImage = async (file: File) => {
    if (!draft) return;
    const path = `${storeId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: e } = await supabase.storage.from('product-images').upload(path, file);
    if (e) return setError(e.message);
    const url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    setDraft({ ...draft, image_urls: [...(draft.image_urls ?? []), url] });
  };

  const importCsv = (file: File) => {
    setImportMsg(null);
    setBusy(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data, errors }) => {
        const bySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));
        const rows: TablesInsert<'products'>[] = [];
        const bad: number[] = [];
        data.forEach((r, i) => {
          const price = Number(String(r.price ?? '').replace(',', '.'));
          if (!r.name_ru || !Number.isFinite(price)) return bad.push(i + 2);
          const unit = (UNITS as readonly string[]).includes(r.unit) ? (r.unit as Product['unit']) : 'pcs';
          rows.push({
            store_id: storeId,
            sku: r.sku || null,
            name_ru: r.name_ru.trim(),
            name_kk: r.name_kk || null,
            category_id: bySlug.get(r.category?.trim()) ?? null,
            price,
            old_price: r.old_price ? Number(r.old_price.replace(',', '.')) : null,
            unit,
            is_weighted: ['true', '1', 'да', 'yes'].includes((r.is_weighted ?? '').toLowerCase()),
            qty_step: Number((r.qty_step || '1').replace(',', '.')) || 1,
            stock_qty: r.stock_qty ? Number(r.stock_qty.replace(',', '.')) : null,
            barcode: r.barcode || null,
            brand: r.brand || null,
            image_urls: r.image_url ? [r.image_url] : [],
            description_ru: r.description_ru || null,
          });
        });
        const withSku = rows.filter((r) => r.sku);
        const noSku = rows.filter((r) => !r.sku);
        let failed: string | null = null;
        for (let i = 0; i < withSku.length; i += 500) {
          const { error: e } = await supabase.from('products').upsert(withSku.slice(i, i + 500), { onConflict: 'store_id,sku' });
          if (e) { failed = e.message; break; }
        }
        if (!failed && noSku.length) {
          const { error: e } = await supabase.from('products').insert(noSku);
          if (e) failed = e.message;
        }
        setBusy(false);
        setImportMsg(
          failed
            ? `Ошибка импорта: ${failed}`
            : `Импортировано: ${rows.length}.${bad.length ? ` Пропущены строки: ${bad.slice(0, 20).join(', ')}` : ''}${errors.length ? ` Ошибок разбора: ${errors.length}` : ''}`,
        );
        reload();
      },
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'products-template.csv';
    a.click();
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="Поиск по названию, артикулу, штрихкоду" value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
        <Button onClick={() => setDraft({ store_id: storeId, unit: 'pcs', qty_step: 1, is_available: true, image_urls: [] })}>+ Товар</Button>
        <label className="cursor-pointer rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium hover:bg-stone-200">
          {busy ? 'Импорт…' : 'Импорт CSV'}
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy}
            onChange={(e) => { if (e.target.files?.[0]) importCsv(e.target.files[0]); e.target.value = ''; }} />
        </label>
        <Button variant="ghost" onClick={downloadTemplate}>Шаблон CSV</Button>
      </div>
      {importMsg ? <p className="mb-4 rounded-lg bg-stone-100 px-3 py-2 text-sm">{importMsg}</p> : null}
      <Table head={['', 'Название', 'Категория', 'Цена', 'Остаток', 'Наличие', '']}>
        {(products ?? []).map((p) => (
          <tr key={p.id} className="hover:bg-stone-50">
            <Td>{p.image_urls[0] ? <img src={p.image_urls[0]} alt="" className="h-10 w-10 rounded object-contain" /> : null}</Td>
            <Td>
              <button className="text-left font-medium text-green-700" onClick={() => setDraft({ ...p })}>{p.name_ru}</button>
              <div className="text-xs text-stone-400">{p.sku ?? ''} {p.barcode ?? ''}</div>
            </Td>
            <Td>{catName(p.category_id)}</Td>
            <Td>{formatMoney(p.price)}{p.is_weighted ? `/${UNIT_RU[p.unit]}` : ''}</Td>
            <Td>{p.stock_qty ?? '∞'}</Td>
            <Td>
              <button onClick={() => toggleAvailable(p)}>
                {p.is_available ? <Badge tone="green">Есть</Badge> : <Badge tone="red">Нет</Badge>}
              </button>
            </Td>
            <Td><button className="text-red-600" onClick={() => remove(p)}>Удалить</button></Td>
          </tr>
        ))}
      </Table>
      {!loading && (products ?? []).length === 0 ? <Empty>Товаров пока нет — добавьте вручную или импортируйте CSV</Empty> : null}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Редактировать товар' : 'Новый товар'}>
        {draft ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Название (рус)"><Input value={draft.name_ru ?? ''} onChange={(e) => setDraft({ ...draft, name_ru: e.target.value })} /></Field>
            <Field label="Название (қаз)"><Input value={draft.name_kk ?? ''} onChange={(e) => setDraft({ ...draft, name_kk: e.target.value })} /></Field>
            <Field label="Категория">
              <Select value={draft.category_id ?? ''} onChange={(e) => setDraft({ ...draft, category_id: e.target.value || null })}>
                <option value="">—</option>
                {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name_ru}</option>)}
              </Select>
            </Field>
            <Field label="Бренд"><Input value={draft.brand ?? ''} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} /></Field>
            <Field label="Цена, ₸"><Input type="number" value={draft.price ?? ''} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field>
            <Field label="Старая цена, ₸"><Input type="number" value={draft.old_price ?? ''} onChange={(e) => setDraft({ ...draft, old_price: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Единица">
              <Select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as Product['unit'] })}>
                {UNITS.map((u) => <option key={u} value={u}>{UNIT_RU[u]}</option>)}
              </Select>
            </Field>
            <Field label="Шаг количества" hint="1 для штучных, 0.1 для весовых"><Input type="number" step="0.001" value={draft.qty_step ?? 1} onChange={(e) => setDraft({ ...draft, qty_step: Number(e.target.value) })} /></Field>
            <Field label="Остаток" hint="пусто — не учитывать"><Input type="number" value={draft.stock_qty ?? ''} onChange={(e) => setDraft({ ...draft, stock_qty: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
            <Field label="Артикул (SKU)"><Input value={draft.sku ?? ''} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></Field>
            <Field label="Штрихкод"><Input value={draft.barcode ?? ''} onChange={(e) => setDraft({ ...draft, barcode: e.target.value })} /></Field>
            <div className="flex flex-col gap-2 pt-5 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.is_weighted} onChange={(e) => setDraft({ ...draft, is_weighted: e.target.checked })} /> Весовой товар</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={draft.is_available ?? true} onChange={(e) => setDraft({ ...draft, is_available: e.target.checked })} /> В наличии</label>
            </div>
            <div className="md:col-span-2"><Field label="Описание"><Textarea value={draft.description_ru ?? ''} onChange={(e) => setDraft({ ...draft, description_ru: e.target.value })} /></Field></div>
            <div className="md:col-span-2">
              <div className="mb-1 text-sm text-stone-500">Фото</div>
              <div className="flex flex-wrap items-center gap-2">
                {(draft.image_urls ?? []).map((u) => (
                  <div key={u} className="relative">
                    <img src={u} alt="" className="h-16 w-16 rounded border object-contain" />
                    <button className="absolute -right-2 -top-2 rounded-full bg-white px-1 text-red-600 shadow"
                      onClick={() => setDraft({ ...draft, image_urls: draft.image_urls?.filter((x) => x !== u) })}>×</button>
                  </div>
                ))}
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </div>
            </div>
            <div className="md:col-span-2"><ErrorText>{error}</ErrorText></div>
            <div className="md:col-span-2"><Button onClick={save} disabled={!draft.name_ru || draft.price === undefined}>Сохранить</Button></div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
