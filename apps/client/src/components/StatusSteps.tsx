import { StyleSheet, Text, View } from 'react-native';
import { ORDER_PROGRESS, progressIndex, type OrderStatus } from '@marketplace/shared';
import { colors, font, spacing } from '../lib/theme';
import { useI18n } from '../lib/i18n';

export function StatusSteps({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  if (status === 'cancelled') {
    return <Text style={[styles.label, { color: colors.danger, fontWeight: '700' }]}>{t('status.cancelled')}</Text>;
  }
  const current = progressIndex(status);
  return (
    <View style={{ gap: spacing.sm }}>
      {ORDER_PROGRESS.map((s, i) => {
        const done = i <= current;
        return (
          <View key={s} style={styles.row}>
            <View style={[styles.dot, done && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
            <Text style={[styles.label, done ? { color: colors.text, fontWeight: i === current ? '700' : '400' } : null]}>
              {t(`status.${s}` as const)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.border },
  label: { fontSize: font.md, color: colors.textMuted },
});
