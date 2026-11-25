'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeKzPhone, formatPhone } from '@marketplace/shared';
import { supabase } from '@/lib/supabase';
import { Button, Card, ErrorText, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+7 ');
  const [normalized, setNormalized] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const p = normalizeKzPhone(phone);
    if (!p) return setError('Введите номер в формате +7 7XX XXX XX XX');
    setLoading(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ phone: p, options: { channel: 'whatsapp' } });
    setLoading(false);
    if (e) return setError(e.message);
    setNormalized(p);
  };

  const verify = async () => {
    if (!normalized) return;
    setLoading(true);
    const { error: e } = await supabase.auth.verifyOtp({ phone: normalized, token: code.trim(), type: 'sms' });
    setLoading(false);
    if (e) return setError('Неверный код');
    router.replace('/');
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Вход в админку</h1>
        {!normalized ? (
          <>
            <Field label="Номер телефона" hint="Код придёт в WhatsApp">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoFocus />
            </Field>
            <ErrorText>{error}</ErrorText>
            <Button className="w-full" onClick={send} loading={loading}>Получить код</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-stone-500">Код отправлен на {formatPhone(normalized)}</p>
            <Field label="Код">
              <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} autoFocus />
            </Field>
            <ErrorText>{error}</ErrorText>
            <Button className="w-full" onClick={verify} loading={loading} disabled={code.length < 6}>Войти</Button>
            <Button variant="ghost" className="w-full" onClick={() => setNormalized(null)}>Изменить номер</Button>
          </>
        )}
      </Card>
    </main>
  );
}
