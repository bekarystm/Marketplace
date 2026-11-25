import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatMoney } from '@marketplace/shared';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/lib/auth';
import { useI18n } from '../src/lib/i18n';
import { EmptyState } from '../src/components/ui';
import { colors, font, spacing } from '../src/lib/theme';

const REASONS: Record<string, { ru: string; kk: string }> = {
  order_earn: { ru: 'Начислено за заказ', kk: 'Тапсырыс үшін есептелді' },
  order_spend: { ru: 'Списано в заказе', kk: 'Тапсырыста жұмсалды' },
  order_cancel_refund: { ru: 'Возврат за отменённый заказ', kk: 'Болдырылмаған тапсырыс үшін қайтарым' },
};

export default function Bonuses() {
  const { t, locale } = useI18n();
  const { userId, profile } = useAuth();
  const { data } = useQuery({
    queryKey: ['bonus_transactions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('bonus_transactions').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return rows;
    },
  });
  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      ListHeaderComponent={<Text style={styles.balance}>{formatMoney(profile?.bonus_balance)}</Text>}
      ListEmptyComponent={<EmptyState title={t('common.empty')} />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={{ flex: 1, color: colors.text }}>{REASONS[item.reason]?.[locale] ?? item.reason}</Text>
          <Text style={{ fontWeight: '700', color: Number(item.amount) > 0 ? colors.primary : colors.text }}>
            {Number(item.amount) > 0 ? '+' : ''}{formatMoney(item.amount)}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  balance: { fontSize: 40, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  row: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
