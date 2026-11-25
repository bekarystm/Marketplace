'use client';
import { useState } from 'react';
import type { Store } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { Button, Card, ErrorText, Field, Input, Textarea } from '@/components/ui';

const DAYS = [
  ['mon', 'Пн'], ['tue', 'Вт'], ['wed', 'Ср'], ['thu', 'Чт'], ['fri', 'Пт'], ['sat', 'Сб'], ['sun', 'Вс'],
] as const;

export function StoreSettings({ store, onSaved }: { store: Store; onSaved: () => void }) {
  const { isAdmin } = useSession();
  const [form, setForm] = useState({ ...store });
  const hours0 = (store.opening_hours ?? {}) as Record<string, [string, string][]>;
  const [hours, setHours] = useState<Record<string, string>>(
    Object.fromEntries(DAYS.map(([d]) => [d, hours0[d]?.[0] ? `${hours0[d][0][0]}-${hours0[d][0][1]}` : '08:00-23:00'])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof Store>(k: K, v: Store[K]) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const upload = async (file: File, kind: 'logo' | 'cover') => {
    setUploading(true);
    const path = `${store.id}/${kind}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: e } = await supabase.storage.from('store-assets').upload(path, file, { upsert: true });
    setUploading(false);
    if (e) return setError(e.message);
    const url = supabase.storage.from('store-assets').getPublicUrl(path).data.publicUrl;
    set(kind === 'logo' ? 'logo_url' : 'cover_url', url);
  };

  const save = async () => {
    setError(null);
    setSaved(false);
    const opening_hours = Object.fromEntries(
      Object.entries(hours)
        .filter(([, v]) => v.trim())
        .map(([d, v]) => [d, [v.split('-').map((s) => s.trim()) as [string, string]]]),
    );
    const patch: Partial<Store> = {
      name: form.name, description_ru: form.description_ru, description_kk: form.description_kk,
      phone: form.phone, address_line: form.address_line, lat: Number(form.lat), lng: Number(form.lng),
      delivery_radius_m: Number(form.delivery_radius_m), min_order_amount: Number(form.min_order_amount),
      delivery_fee: Number(form.delivery_fee), free_delivery_from: form.free_delivery_from ? Number(form.free_delivery_from) : null,
      logo_url: form.logo_url, cover_url: form.cover_url, opening_hours,
    };
    if (isAdmin) Object.assign(patch, { is_active: form.is_active, commission_percent: Number(form.commission_percent), sort_order: Number(form.sort_order) });
    const { error: e } = await supabase.from('stores').update(patch).eq('id', store.id);
    if (e) return setError(e.message);
    setSaved(true);
    onSaved();
  };

  return (
    <Card className="grid gap-4 md:grid-cols-2">
      <Field label="Название"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Телефон"><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
      <Field label="Адрес"><Input value={form.address_line} onChange={(e) => set('address_line', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Широта"><Input value={form.lat} onChange={(e) => set('lat', num(e.target.value))} /></Field>
        <Field label="Долгота"><Input value={form.lng} onChange={(e) => set('lng', num(e.target.value))} /></Field>
      </div>
      <Field label="Описание (рус)"><Textarea value={form.description_ru ?? ''} onChange={(e) => set('description_ru', e.target.value)} /></Field>
      <Field label="Описание (қаз)"><Textarea value={form.description_kk ?? ''} onChange={(e) => set('description_kk', e.target.value)} /></Field>
      <Field label="Стоимость доставки, ₸"><Input type="number" value={form.delivery_fee} onChange={(e) => set('delivery_fee', num(e.target.value))} /></Field>
      <Field label="Бесплатная доставка от, ₸"><Input type="number" value={form.free_delivery_from ?? ''} onChange={(e) => set('free_delivery_from', e.target.value ? num(e.target.value) : null)} /></Field>
      <Field label="Минимальный заказ, ₸"><Input type="number" value={form.min_order_amount} onChange={(e) => set('min_order_amount', num(e.target.value))} /></Field>
      <Field label="Радиус доставки, м"><Input type="number" value={form.delivery_radius_m} onChange={(e) => set('delivery_radius_m', num(e.target.value))} /></Field>
      <Field label="Логотип">
        <div className="flex items-center gap-3">
          {form.logo_url ? <img src={form.logo_url} alt="" className="h-12 w-12 rounded object-contain" /> : null}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'logo')} />
        </div>
      </Field>
      <Field label="Обложка">
        <div className="flex items-center gap-3">
          {form.cover_url ? <img src={form.cover_url} alt="" className="h-12 w-20 rounded object-cover" /> : null}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'cover')} />
        </div>
      </Field>
      <div className="md:col-span-2">
        <div className="mb-1 text-sm text-stone-500">Часы работы (пусто — выходной)</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {DAYS.map(([d, label]) => (
            <Field key={d} label={label}>
              <Input value={hours[d]} onChange={(e) => setHours((h) => ({ ...h, [d]: e.target.value }))} placeholder="08:00-23:00" />
            </Field>
          ))}
        </div>
      </div>
      {isAdmin ? (
        <>
          <Field label="Комиссия, %"><Input type="number" value={form.commission_percent} onChange={(e) => set('commission_percent', num(e.target.value))} /></Field>
          <Field label="Порядок в списке"><Input type="number" value={form.sort_order} onChange={(e) => set('sort_order', num(e.target.value))} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            Магазин виден клиентам
          </label>
        </>
      ) : null}
      <div className="flex items-center gap-3 md:col-span-2">
        <Button onClick={save} disabled={uploading}>Сохранить</Button>
        {saved ? <span className="text-sm text-green-700">Сохранено</span> : null}
      </div>
      <div className="md:col-span-2"><ErrorText>{error}</ErrorText></div>
    </Card>
  );
}
