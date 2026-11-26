import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { courierNextStatus, errorMessage, formatDistance, formatMoney, formatPhone, formatQuantity } from '@marketplace/shared';
import { Button, Card, FadeIn, Icon, Loading, OsmMap, Row, SectionTitle, colors, font, formatEta, radius, spacing, useI18n, useRoute, type RouteProfile } from '@marketplace/mobile';
import { useMyCourier, useMyLocation, useOrderDetail, useReleaseDelivery, useUpdateStatus } from '../../../src/lib/api';

function openNavigator(lat: number, lng: number) {
  const url = Platform.select({
    ios: `maps://?daddr=${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}`,
    default: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
  })!;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`),
  );
}

export default function CourierOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { data, isLoading } = useOrderDetail(id);
  const update = useUpdateStatus();
  const release = useReleaseDelivery();
  const { data: me } = useMyLocation();
  const { data: courier } = useMyCourier();
  const profile: RouteProfile = courier?.vehicle === 'car' ? 'car' : courier?.vehicle === 'foot' ? 'foot' : 'bike';
  const order0 = data?.order;
  const headingToStore0 = order0 ? order0.status !== 'delivering' : true;
  const routeTarget = order0
    ? headingToStore0 && order0.store
      ? { lat: order0.store.lat, lng: order0.store.lng }
      : { lat: order0.lat, lng: order0.lng }
    : null;
  const { data: route } = useRoute(me ? { lat: me.lat, lng: me.lng } : null, routeTarget, profile);

  if (isLoading || !data) return <Loading />;
  const { order, items, client } = data;
  const store = order.store;
  const next = courierNextStatus(order.status);
  const headingToStore = order.status !== 'delivering';

  const advance = () => {
    if (!next) return;
    const go = () =>
      update.mutate(
        { orderId: order.id, status: next },
        {
          onSuccess: () => { if (next === 'delivered') router.replace('/courier'); },
          onError: (e) => Alert.alert(t('common.error'), errorMessage(e, locale)),
        },
      );
    if (next === 'delivered' && order.payment_method === 'cash') {
      Alert.alert(t('courier.collectCash', { amount: formatMoney(order.total) }), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: go },
      ]);
    } else go();
  };

  const target = headingToStore && store ? { lat: store.lat, lng: store.lng } : { lat: order.lat, lng: order.lng };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: spacing.md }}>
      <Stack.Screen options={{ title: t('orders.number', { number: order.number }) }} />
      <OsmMap
        center={target}
        zoom={14}
        markers={[
          ...(store ? [{ id: 'store', kind: 'store' as const, lat: store.lat, lng: store.lng }] : []),
          { id: 'home', kind: 'home' as const, lat: order.lat, lng: order.lng },
          ...(me ? [{ id: 'me', kind: 'courier' as const, lat: me.lat, lng: me.lng }] : []),
        ]}
        route={route?.points}
        style={{ height: 260, borderRadius: 16 }}
      />
      {route ? (
        <FadeIn style={styles.routeChip}>
          <Icon name={headingToStore ? 'storefront' : 'home'} size={18} color={colors.primary} />
          <Text style={styles.routeText}>
            {t(headingToStore ? 'courier.routeToStore' : 'courier.routeToClient', {
              distance: formatDistance(route.distanceM, locale),
              eta: formatEta(route.durationS, locale),
            })}
          </Text>
        </FadeIn>
      ) : null}
      <Text style={styles.status}>{t(`status.${order.status}` as const)}</Text>

      <Card style={{ gap: spacing.xs }}>
        <Text style={styles.label}>🏪 {store?.name}</Text>
        <Text>{store?.address_line}</Text>
        {store?.phone ? <Text style={styles.link} onPress={() => Linking.openURL(`tel:${store.phone}`)}>{store.phone}</Text> : null}
      </Card>
      <Card style={{ gap: spacing.xs }}>
        <Text style={styles.label}>🏠 {client?.full_name ?? ''}</Text>
        <Text>
          {order.address_line}
          {order.apartment ? `, кв. ${order.apartment}` : ''}
          {order.entrance ? `, подъезд ${order.entrance}` : ''}
          {order.floor ? `, этаж ${order.floor}` : ''}
        </Text>
        {order.intercom ? <Text style={styles.muted}>Домофон: {order.intercom}</Text> : null}
        {order.address_comment ? <Text style={styles.muted}>{order.address_comment}</Text> : null}
        {order.comment ? <Text style={styles.muted}>💬 {order.comment}</Text> : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button style={{ flex: 1 }} variant="secondary" icon="navigate-outline" title={t('courier.navigateShort')} onPress={() => openNavigator(target.lat, target.lng)} />
        <Button style={{ flex: 1 }} variant="secondary" icon="call-outline" title={formatPhone(order.contact_phone)} onPress={() => Linking.openURL(`tel:${order.contact_phone}`)} />
      </View>
      <Button variant="secondary" icon="chatbubbles-outline" title={t('orders.chat')} onPress={() => router.push(`/chat/${order.id}`)} />

      <SectionTitle>{t('cart.items')}</SectionTitle>
      <Card style={{ gap: spacing.xs }}>
        {items.filter((i) => i.status !== 'missing').map((i) => (
          <Text key={i.id}>
            {i.status === 'replaced' && i.replacement_approved ? i.replacement_name : i.name} ·{' '}
            {formatQuantity(i.picked_quantity && i.status === 'picked' ? i.picked_quantity : i.quantity, i.unit, locale)}
          </Text>
        ))}
      </Card>
      <Card>
        <Row label={t('cart.total')} value={formatMoney(order.total)} bold />
        <Text style={styles.muted}>{t(`payment.${order.payment_method}` as const)} · {order.payment_status === 'paid' ? '✓' : ''}</Text>
      </Card>

      {next ? (
        <Button
          title={next === 'delivering' ? t('courier.pickedUp') : t('courier.delivered')}
          onPress={advance}
          loading={update.isPending}
          disabled={order.status !== 'ready' && order.status !== 'delivering'}
        />
      ) : (
        <Text style={[styles.muted, { textAlign: 'center' }]}>{t(`status.${order.status}` as const)}</Text>
      )}
      {order.status !== 'delivering' ? (
        <Button
          variant="ghost"
          title={t('courier.release')}
          onPress={() => release.mutate(order.id, { onSuccess: () => router.replace('/courier') })}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  routeChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primarySoft,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md,
  },
  routeText: { fontSize: font.md, fontWeight: '700', color: colors.primary, flex: 1 },
  status: { fontSize: font.xl, fontWeight: '800', color: colors.primary },
  label: { fontSize: font.md, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.sm, color: colors.textMuted },
  link: { color: colors.primary },
});
