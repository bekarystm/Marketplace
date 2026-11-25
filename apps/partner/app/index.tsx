import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { formatPhone, LOCALES } from '@marketplace/shared';
import { Button, Chip, Loading, colors, font, radius, spacing, useAuth, useI18n } from '@marketplace/mobile';
import { useMyCourier, useStaffStores } from '../src/lib/api';

export default function RoleHome() {
  const { t, locale, setLocale } = useI18n();
  const { profile, signOut } = useAuth();
  const staff = useStaffStores();
  const courier = useMyCourier();

  if (staff.isLoading || courier.isLoading) return <Loading />;

  const isStaff = (staff.data?.length ?? 0) > 0;
  const isCourier = !!courier.data;
  // single role -> go straight there
  if (isStaff && !isCourier) return <Redirect href="/picker" />;
  if (isCourier && !isStaff) return <Redirect href="/courier" />;

  const Option = ({ title, hint, onPress }: { title: string; hint: string; onPress: () => void }) => (
    <Pressable style={styles.option} onPress={onPress}>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionHint}>{hint}</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
      <Text style={styles.title}>{t('partner.chooseRole')}</Text>
      {isStaff || isCourier ? (
        <>
          {isCourier ? <Option title={t('partner.roleCourier')} hint={t('partner.roleCourierHint')} onPress={() => router.push('/courier')} /> : null}
          {isStaff ? <Option title={t('partner.rolePicker')} hint={t('partner.rolePickerHint')} onPress={() => router.push('/picker')} /> : null}
        </>
      ) : (
        <>
          <Option title={t('partner.roleCourier')} hint={t('partner.roleCourierHint')} onPress={() => router.push('/courier/apply')} />
          <View style={styles.option}>
            <Text style={styles.optionTitle}>{t('partner.rolePicker')}</Text>
            <Text style={styles.optionHint}>{t('partner.pickerNoStore', { phone: formatPhone(profile?.phone) })}</Text>
          </View>
        </>
      )}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        {LOCALES.map((l) => (
          <Chip key={l} label={l === 'ru' ? 'Русский' : 'Қазақша'} active={locale === l} onPress={() => setLocale(l)} />
        ))}
      </View>
      <Button variant="secondary" title={t('common.logout')} onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  option: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  optionTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  optionHint: { fontSize: font.md, color: colors.textMuted },
});
