import { useEffect } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { errorMessage, formatDistance, formatMoney } from '@marketplace/shared';
import { Button, Card, EmptyState, Loading, colors, font, radius, spacing, useI18n } from '@marketplace/mobile';
import { useAcceptDelivery, useAvailableOrders, useMyActiveDelivery, useMyCourier, useSetOnline } from '../../src/lib/api';
import { startLocationSharing, stopLocationSharing, watchForeground } from '../../src/lib/location';

export default function CourierHome() {
  const { t, locale } = useI18n();
  const { data: courier, isLoading, refetch } = useMyCourier();
  const setOnline = useSetOnline();
  const online = !!courier?.is_online;
  const approved = courier?.status === 'approved';
  const { data: active } = useMyActiveDelivery();
  const available = useAvailableOrders(approved && online && !active);
  const accept = useAcceptDelivery();

  // share location while online
  useEffect(() => {
    if (!approved || !online) return;
    let stopFg: (() => void) | undefined;
    startLocationSharing().then((ok) => {
      if (ok) stopFg = watchForeground();
    });
    return () => stopFg?.();
  }, [approved, online]);

  if (isLoading) return <Loading />;
  if (!courier) {
    return <EmptyState title={t('courier.apply')} action={<Button title={t('courier.apply')} onPress={() => router.push('/courier/apply')} />} />;
  }
  if (courier.status === 'pending') {
    return <EmptyState title={t('courier.pending')} action={<Button variant="secondary" title={t('common.retry')} onPress={() => refetch()} />} />;
  }
  if (courier.status === 'rejected') {
    return (
      <EmptyState
        title={t('courier.rejected', { reason: courier.rejection_reason ?? '—' })}
        action={<Button title={t('courier.apply')} onPress={() => router.push('/courier/apply')} />}
      />
    );
  }
  if (courier.status === 'blocked') return <EmptyState title={t('courier.blocked')} />;

  const toggle = async (value: boolean) => {
    if (!value && active) return;
    if (!value) await stopLocationSharing();
    setOnline.mutate(value, { onError: (e) => Alert.alert(t('common.error'), errorMessage(e, locale)) });
  };

  const onAccept = (orderId: string) =>
    accept.mutate(orderId, {
      onSuccess: () => router.push(`/courier/order/${orderId}`),
      onError: (e) => Alert.alert(t('common.error'), errorMessage(e, locale)),
    });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.status}>{online ? t('courier.online') : t('courier.offline')}</Text>
          <Text style={styles.muted}>
            {t('courier.stats', { count: courier.deliveries_count, rating: courier.rating ?? '—' })}
          </Text>
        </View>
        <Switch value={online} onValueChange={toggle} disabled={setOnline.isPending} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} />
      </View>

      {active ? (
        <Pressable style={{ padding: spacing.lg }} onPress={() => router.push(`/courier/order/${active.id}`)}>
          <Card style={{ borderColor: colors.primary, gap: spacing.xs }}>
            <Text style={styles.cardTitle}>{t('orders.number', { number: active.number })} · {t(`status.${active.status}` as const)}</Text>
            <Text>{active.store?.name} → {active.address_line}</Text>
            <Text style={styles.muted}>{formatMoney(active.total)} · {t(`payment.${active.payment_method}` as const)}</Text>
          </Card>
        </Pressable>
      ) : online ? (
        <FlatList
          data={available.data ?? []}
          keyExtractor={(o) => o.order_id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={available.isRefetching} onRefresh={() => { available.refetch(); }} />}
          ListHeaderComponent={<Text style={styles.section}>{t('courier.available')}</Text>}
          ListEmptyComponent={available.isLoading ? <Loading /> : <EmptyState title={t('courier.noOrders')} />}
          renderItem={({ item }) => (
            <Card style={{ gap: spacing.xs }}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{item.store_name}</Text>
                <Text style={styles.cardTitle}>{formatMoney(item.delivery_fee)}</Text>
              </View>
              <Text style={styles.muted}>{item.store_address}</Text>
              <Text>→ {item.delivery_address}</Text>
              <Text style={styles.muted}>
                {t('courier.toStore', { distance: formatDistance(item.distance_to_store_m, locale) })} ·{' '}
                {t('courier.route', { distance: formatDistance(item.delivery_distance_m, locale) })}
              </Text>
              <Text style={styles.muted}>
                {t(`status.${item.status}` as const)} · {formatMoney(item.total)} · {t(`payment.${item.payment_method}` as const)}
              </Text>
              <Button title={t('courier.accept')} onPress={() => onAccept(item.order_id)} loading={accept.isPending} style={{ marginTop: spacing.sm }} />
            </Card>
          )}
        />
      ) : (
        <EmptyState title={t('courier.goOnline')} action={<Button title={t('courier.goOnline')} onPress={() => toggle(true)} />} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  status: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  muted: { fontSize: font.sm, color: colors.textMuted },
  section: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  pill: { borderRadius: radius.pill },
});
