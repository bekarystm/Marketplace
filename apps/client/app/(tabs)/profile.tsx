import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatMoney, formatPhone, LOCALES } from '@marketplace/shared';
import { useAuth } from '@marketplace/mobile';
import { useI18n } from '@marketplace/mobile';
import { Button, Chip } from '@marketplace/mobile';
import { colors, font, radius, spacing } from '@marketplace/mobile';

export default function Profile() {
  const { t, locale, setLocale } = useI18n();
  const { userId, profile, signOut } = useAuth();

  const Item = ({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) => (
    <Pressable style={styles.item} onPress={onPress}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemValue}>{value ?? ''} ›</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      {userId ? (
        <View style={{ gap: 4 }}>
          <Text style={styles.name}>{profile?.full_name || '—'}</Text>
          <Text style={styles.phone}>{formatPhone(profile?.phone)}</Text>
        </View>
      ) : (
        <Button title={t('auth.title')} onPress={() => router.push('/login')} />
      )}

      <View style={styles.group}>
        {userId ? (
          <>
            <Item label={t('profile.addresses')} onPress={() => router.push('/addresses')} />
            <Item label={t('profile.bonuses')} value={formatMoney(profile?.bonus_balance)} onPress={() => router.push('/bonuses')} />
            <Item label={t('profile.support')} onPress={() => router.push('/chat/support')} />
          </>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.itemLabel}>{t('common.language')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {LOCALES.map((l) => (
            <Chip key={l} label={l === 'ru' ? 'Русский' : 'Қазақша'} active={locale === l} onPress={() => setLocale(l)} />
          ))}
        </View>
      </View>

      {userId ? <Button variant="secondary" title={t('common.logout')} onPress={signOut} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  phone: { fontSize: font.md, color: colors.textMuted },
  group: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  itemLabel: { fontSize: font.md, color: colors.text },
  itemValue: { fontSize: font.md, color: colors.textMuted },
});
