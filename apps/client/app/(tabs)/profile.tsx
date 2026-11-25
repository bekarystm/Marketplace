import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatMoney, formatPhone, LOCALES } from '@marketplace/shared';
import {
  Button,
  Chip,
  Icon,
  colors,
  font,
  radius,
  shadow,
  spacing,
  useAuth,
  useI18n,
  type IconName,
} from '@marketplace/mobile';

function Item({ icon, label, value, onPress }: { icon: IconName; label: string; value?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.itemIcon}><Icon name={icon} size={20} color={colors.primary} /></View>
      <Text style={styles.itemLabel}>{label}</Text>
      {value ? <Text style={styles.itemValue}>{value}</Text> : null}
      <Icon name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function Profile() {
  const { t, locale, setLocale } = useI18n();
  const { userId, profile, signOut } = useAuth();
  const initials = (profile?.full_name ?? '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      {userId ? (
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>{profile?.full_name || '—'}</Text>
            <Text style={styles.phone}>{formatPhone(profile?.phone)}</Text>
          </View>
        </View>
      ) : (
        <Button title={t('auth.title')} icon="log-in-outline" onPress={() => router.push('/login')} />
      )}

      {userId ? (
        <View style={styles.bonusCard}>
          <View>
            <Text style={styles.bonusLabel}>{t('profile.bonuses')}</Text>
            <Text style={styles.bonusValue}>{formatMoney(profile?.bonus_balance)}</Text>
          </View>
          <Icon name="gift" size={36} color={colors.accent} />
        </View>
      ) : null}

      {userId ? (
        <View style={styles.group}>
          <Item icon="location-outline" label={t('profile.addresses')} onPress={() => router.push('/addresses')} />
          <Item icon="gift-outline" label={t('profile.bonuses')} onPress={() => router.push('/bonuses')} />
          <Item icon="chatbubble-ellipses-outline" label={t('profile.support')} onPress={() => router.push('/chat/support')} />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionLabel}>{t('common.language')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {LOCALES.map((l) => (
            <Chip key={l} label={l === 'ru' ? 'Русский' : 'Қазақша'} active={locale === l} onPress={() => setLocale(l)} />
          ))}
        </View>
      </View>

      {userId ? <Button variant="secondary" icon="log-out-outline" title={t('common.logout')} onPress={signOut} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: font.xl, fontWeight: '800' },
  name: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  phone: { fontSize: font.md, color: colors.textMuted },
  bonusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: spacing.lg,
  },
  bonusLabel: { fontSize: font.sm, color: colors.accentDark, fontWeight: '600' },
  bonusValue: { fontSize: font.xxl, fontWeight: '900', color: colors.text },
  group: { borderRadius: radius.lg, backgroundColor: colors.card, overflow: 'hidden', ...shadow },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  itemIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  itemLabel: { flex: 1, fontSize: font.md, color: colors.text, fontWeight: '600' },
  itemValue: { fontSize: font.md, color: colors.textMuted },
  sectionLabel: { fontSize: font.sm, color: colors.textMuted, fontWeight: '600' },
});
