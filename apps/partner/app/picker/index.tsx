import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatMoney } from '@marketplace/shared';
import { Chip, EmptyState, Loading, colors, font, radius, shadow, spacing, useI18n } from '@marketplace/mobile';
import { useStaffStores, useStoreOrders } from '../../src/lib/api';

export default function PickerHome() {
  const { t } = useI18n();
  const { data: staff, isLoading } = useStaffStores();
  const [storeIdx, setStoreIdx] = useState(0);
  const [tab, setTab] = useState<'new' | 'work'>('new');
  const store = staff?.[storeIdx]?.store;
  const orders = useStoreOrders(store?.id);

  if (isLoading) return <Loading />;
  if (!store) return <EmptyState title={t('common.empty')} />;

  const list = (orders.data ?? []).filter((o) => (tab === 'new' ? o.status === 'placed' : o.status !== 'placed'));
  const newCount = (orders.data ?? []).filter((o) => o.status === 'placed').length;

  return (
    <View style={{ flex: 1 }}>
      {staff && staff.length > 1 ? (
        <ScrollView horizontal contentContainerStyle={{ gap: spacing.sm, padding: spacing.lg, paddingBottom: 0 }} showsHorizontalScrollIndicator={false}>
          {staff.map((s, i) => <Chip key={s.store?.id ?? i} label={s.store?.name ?? ''} active={i === storeIdx} onPress={() => setStoreIdx(i)} />)}
        </ScrollView>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.lg }}>
        <Chip label={`${t('picker.new')}${newCount ? ` (${newCount})` : ''}`} active={tab === 'new'} onPress={() => setTab('new')} />
        <Chip label={t('picker.inWork')} active={tab === 'work'} onPress={() => setTab('work')} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => { orders.refetch(); }} />}
        ListEmptyComponent={orders.isLoading ? <Loading /> : <EmptyState title={t('common.empty')} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/picker/order/${item.id}`)}>
            <View style={styles.row}>
              <Text style={styles.title}>{t('orders.number', { number: item.number })}</Text>
              <Text style={styles.title}>{formatMoney(item.total)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.status}>{t(`status.${item.status}` as const)}</Text>
              <Text style={styles.muted}>
                {new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                {item.courier_id ? ' · 🛵' : ''}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs, ...shadow },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  status: { fontSize: font.md, color: colors.primary, fontWeight: '600' },
  muted: { fontSize: font.sm, color: colors.textMuted },
});
