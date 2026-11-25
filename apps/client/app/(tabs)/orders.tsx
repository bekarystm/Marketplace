import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatMoney, isActive } from '@marketplace/shared';
import { useOrders } from '../../src/lib/api';
import { useI18n } from '@marketplace/mobile';
import { useAuth } from '@marketplace/mobile';
import { Button, EmptyState, Loading, shadow } from '@marketplace/mobile';
import { colors, font, radius, spacing } from '@marketplace/mobile';

export default function Orders() {
  const { t, locale } = useI18n();
  const { userId } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useOrders();

  if (!userId) {
    return <EmptyState title={t('orders.empty')} action={<Button title={t('auth.title')} onPress={() => router.push('/login')} />} />;
  }

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} />}
      ListEmptyComponent={isLoading ? <Loading /> : <EmptyState icon="receipt-outline" title={t('orders.empty')} />}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/order/${item.id}`)}>
          <View style={styles.row}>
            <Text style={styles.title}>{t('orders.number', { number: item.number })}</Text>
            <Text style={styles.total}>{formatMoney(item.total)}</Text>
          </View>
          <Text style={styles.store}>{item.store?.name}</Text>
          <View style={styles.row}>
            <Text style={[styles.status, isActive(item.status) && { color: colors.primary }, item.status === 'cancelled' && { color: colors.danger }]}>
              {t(`status.${item.status}` as const)}
            </Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString(locale === 'kk' ? 'kk-KZ' : 'ru-RU', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs, ...shadow },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  total: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  store: { fontSize: font.md, color: colors.textMuted },
  status: { fontSize: font.md, fontWeight: '600', color: colors.textMuted },
  date: { fontSize: font.sm, color: colors.textMuted },
});
