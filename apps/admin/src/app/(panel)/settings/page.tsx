'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useData, unwrap } from '@/lib/useData';
import { Button, Card, ErrorText, Field, Input, PageHeader } from '@/components/ui';

const LABELS: Record<string, string> = {
  bonus_earn_percent: 'Начисление бонусов, % от суммы товаров',
  bonus_max_spend_percent: 'Максимум оплаты бонусами, % от заказа',
  city: 'Город',
  support_phone: 'Телефон поддержки',
};

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useData(async () => {
    const rows = unwrap(await supabase.from('app_settings').select('*'));
    setValues(Object.fromEntries(rows.map((r) => [r.key, r.value === null ? '' : String(r.value)])));
    return rows;
  }, []);

  const save = async () => {
    setError(null);
    setSaved(false);
    for (const [key, raw] of Object.entries(values)) {
      const numeric = key.endsWith('_percent');
      const value = raw === '' ? null : numeric ? Number(raw) : raw;
      const { error: e } = await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
      if (e) return setError(e.message);
    }
    setSaved(true);
  };

  return (
    <>
      <PageHeader title="Настройки" />
      <Card className="max-w-lg space-y-4">
        {Object.keys(values).map((k) => (
          <Field key={k} label={LABELS[k] ?? k}>
            <Input value={values[k]} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} />
          </Field>
        ))}
        <ErrorText>{error}</ErrorText>
        <div className="flex items-center gap-3">
          <Button onClick={save}>Сохранить</Button>
          {saved ? <span className="text-sm text-green-700">Сохранено</span> : null}
        </div>
      </Card>
    </>
  );
}
