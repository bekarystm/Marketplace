import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatPhone, LOCALES } from '@marketplace/shared';
import { Button, Chip, colors, font, radius, shadow, spacing, useAuth, useI18n } from '@marketplace/mobile';
import { useMyCourier, useStaffStores } from '../src/lib/api';

export default function Settings() {
  const { t, locale, setLocale } = useI18n();
  const { profile, signOut } = useAuth();
  const { data: staff } = useStaffStores();
  const { data: courier } = useMyCourier();
  const isStaff = (staff?.length ?? 0) > 0;

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={styles.card}>
        <Text style={styles.name}>{profile?.full_name || '—'}</Text>
        <Text style={styles.muted}>{formatPhone(profile?.phone)}</Text>
        {isStaff ? <Text style={styles.muted}>{t('partner.rolePicker')}: {staff?.map((s) => s.store?.name).join(', ')}</Text> : null}
        {courier ? <Text style={styles.muted}>{t('partner.roleCourier')}</Text> : null}
      </View>

      {isStaff ? <Button variant="secondary" icon="storefront-outline" title={t('picker.orders')} onPress={() => router.replace('/picker')} /> : null}
      {courier ? (
        <Button variant="secondary" icon="bicycle-outline" title={t('partner.roleCourier')} onPress={() => router.replace('/courier')} />
      ) : (
        <Button variant="secondary" icon="bicycle-outline" title={t('courier.apply')} onPress={() => router.push('/courier/apply')} />
      )}

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.label}>{t('common.language')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {LOCALES.map((l) => (
            <Chip key={l} label={l === 'ru' ? 'Русский' : 'Қазақша'} active={locale === l} onPress={() => setLocale(l)} />
          ))}
        </View>
      </View>

      <Button variant="secondary" icon="log-out-outline" title={t('common.logout')} onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: 4, ...shadow },
  name: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  muted: { fontSize: font.sm, color: colors.textMuted },
  label: { fontSize: font.sm, color: colors.textMuted, fontWeight: '600' },
});
