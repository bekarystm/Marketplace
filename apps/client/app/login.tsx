import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatPhone, normalizeKzPhone } from '@marketplace/shared';
import { supabase } from '../src/lib/supabase';
import { useI18n } from '../src/lib/i18n';
import { Button, TextField } from '../src/components/ui';
import { colors, font, spacing } from '../src/lib/theme';

export default function Login() {
  const { t } = useI18n();
  const [step, setStep] = useState<'phone' | 'code' | 'name'>('phone');
  const [phoneInput, setPhoneInput] = useState('+7 ');
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendCode = async () => {
    const normalized = normalizeKzPhone(phoneInput);
    if (!normalized) return setError(t('auth.invalidPhone'));
    setError(null);
    setLoading(true);
    const { error: e } = await supabase.auth.signInWithOtp({ phone: normalized, options: { channel: 'whatsapp' } });
    setLoading(false);
    if (e) return setError(e.message);
    setPhone(normalized);
    setStep('code');
    setCooldown(60);
  };

  const verify = async () => {
    if (!phone) return;
    setLoading(true);
    const { data, error: e } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' });
    setLoading(false);
    if (e || !data.user) return setError(t('auth.invalidCode'));
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.user.id).single();
    if (!profile?.full_name) setStep('name');
    else router.back();
  };

  const saveName = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user && name.trim()) {
      await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', data.user.id);
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      {step === 'phone' && (
        <View style={styles.form}>
          <Text style={styles.title}>{t('auth.phoneLabel')}</Text>
          <Text style={styles.hint}>{t('auth.phoneHint')}</Text>
          <TextField
            value={phoneInput}
            onChangeText={setPhoneInput}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="+7 701 123 45 67"
            error={error}
            autoFocus
          />
          <Button title={t('auth.getCode')} onPress={sendCode} loading={loading} />
        </View>
      )}
      {step === 'code' && (
        <View style={styles.form}>
          <Text style={styles.title}>{t('auth.codeLabel')}</Text>
          <Text style={styles.hint}>{t('auth.codeSentTo', { phone: formatPhone(phone) })}</Text>
          <TextField
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            placeholder="000000"
            error={error}
            autoFocus
          />
          <Button title={t('auth.verify')} onPress={verify} loading={loading} disabled={code.length < 6} />
          <Button
            variant="ghost"
            title={cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
            disabled={cooldown > 0}
            onPress={sendCode}
          />
        </View>
      )}
      {step === 'name' && (
        <View style={styles.form}>
          <Text style={styles.title}>{t('auth.nameLabel')}</Text>
          <TextField value={name} onChangeText={setName} autoComplete="name" autoFocus />
          <Button title={t('common.save')} onPress={saveName} disabled={!name.trim()} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  form: { gap: spacing.lg, marginTop: spacing.xl },
  title: { fontSize: font.xxl, fontWeight: '700', color: colors.text },
  hint: { fontSize: font.md, color: colors.textMuted },
});
