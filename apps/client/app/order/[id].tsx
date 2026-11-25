import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  clientCanCancel,
  errorMessage,
  formatMoney,
  formatQuantity,
  type OrderItem,
} from '@marketplace/shared';
import {
  useCancelOrder,
  useCourierLocation,
  useOrder,
  useRespondReplacement,
  useReview,
  useSubmitReview,
} from '../../src/lib/api';
import { supabase } from '@marketplace/mobile';
import { useI18n } from '@marketplace/mobile';
import { OsmMap, type MapMarker } from '@marketplace/mobile';
import { StatusSteps } from '@marketplace/mobile';
import { Button, Card, Loading, Row, SectionTitle } from '@marketplace/mobile';
import { colors, font, spacing } from '@marketplace/mobile';

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Text style={{ fontSize: 30, opacity: n <= value ? 1 : 0.25 }}>⭐</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { data, isLoading } = useOrder(id);
  const cancel = useCancelOrder();
  const respond = useRespondReplacement(id!);
  const { data: review } = useReview(data?.order.status === 'delivered' ? id : undefined);
  const submitReview = useSubmitReview();
  const [storeRating, setStoreRating] = useState(0);
  const [courierRating, setCourierRating] = useState(0);
  const order = data?.order;
  const tracking = !!order && (order.status === 'ready' || order.status === 'delivering');
  const { data: courierLoc } = useCourierLocation(order?.courier_id, tracking);

  if (isLoading || !order) return <Loading />;

  const markers: MapMarker[] = [{ id: 'home', kind: 'home', lat: order.lat, lng: order.lng }];
  if (courierLoc) markers.push({ id: 'courier', kind: 'courier', lat: courierLoc.lat, lng: courierLoc.lng });

  const onCancel = () =>
    Alert.alert(t('orders.cancelConfirm'), undefined, [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () =>
          cancel.mutate({ orderId: order.id }, { onError: (e) => Alert.alert(t('common.error'), errorMessage(e, locale)) }),
      },
    ]);

  const pay = async () => {
    const { data: res, error } = await supabase.functions.invoke('create-payment', { body: { order_id: order.id } });
    if (error || !res?.url) return Alert.alert(t('common.error'), errorMessage(error, locale));
    await WebBrowser.openBrowserAsync(res.url);
  };

  const itemLine = (item: OrderItem) => {
    const qty = item.picked_quantity != null && item.status === 'picked' ? item.picked_quantity : item.quantity;
    return (
      <View key={item.id} style={styles.item}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, item.status === 'missing' && styles.strike]}>{item.name}</Text>
          <Text style={styles.muted}>
            {formatQuantity(qty, item.unit, locale)} × {formatMoney(item.price)}
            {item.status === 'missing' ? ` · ${t('product.outOfStock')}` : ''}
          </Text>
          {item.status === 'replaced' ? (
            <View style={styles.replacement}>
              <Text style={{ fontWeight: '600' }}>{t('orders.replacementProposed')}:</Text>
              <Text>
                {item.replacement_name} · {formatMoney(item.replacement_price)}
              </Text>
              {item.replacement_approved == null && order.status === 'picking' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                  <Button style={{ flex: 1, minHeight: 38 }} title={t('orders.approve')}
                    onPress={() => respond.mutate({ itemId: item.id, approve: true })} />
                  <Button style={{ flex: 1, minHeight: 38 }} variant="secondary" title={t('orders.reject')}
                    onPress={() => respond.mutate({ itemId: item.id, approve: false })} />
                </View>
              ) : (
                <Text style={styles.muted}>{item.replacement_approved ? '✓' : '✕'}</Text>
              )}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: t('orders.number', { number: order.number }) }} />
      <Text style={styles.store}>{order.store?.name}</Text>

      {order.status === 'awaiting_payment' ? (
        <Button variant="accent" icon="card" style={{ marginTop: spacing.md }} title={`${t('orders.payNow')} ${formatMoney(order.total)}`} onPress={pay} />
      ) : null}

      <Card style={{ marginTop: spacing.lg }}>
        <StatusSteps status={order.status} />
      </Card>

      {tracking && courierLoc ? (
        <>
          <SectionTitle>{t('orders.courierOnTheWay')}</SectionTitle>
          <OsmMap center={{ lat: order.lat, lng: order.lng }} zoom={14} markers={markers} style={{ height: 220, borderRadius: 16 }} />
        </>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
        <Button style={{ flex: 1 }} variant="secondary" icon="chatbubbles-outline" title={t('orders.chat')} onPress={() => router.push(`/chat/${order.id}`)} />
        {order.store?.phone ? (
          <Button style={{ flex: 1 }} variant="secondary" icon="call-outline" title={order.store!.phone!} onPress={() => Linking.openURL(`tel:${order.store!.phone}`)} />
        ) : null}
      </View>

      <SectionTitle>{t('cart.items')}</SectionTitle>
      <Card style={{ gap: spacing.md }}>{data.items.map(itemLine)}</Card>

      <Card style={{ marginTop: spacing.lg }}>
        <Row label={t('cart.items')} value={formatMoney(order.items_total)} />
        <Row label={t('cart.delivery')} value={formatMoney(order.delivery_fee)} />
        {Number(order.discount_amount) > 0 ? <Row label={t('cart.discount')} value={`−${formatMoney(order.discount_amount)}`} /> : null}
        {Number(order.bonus_spent) > 0 ? <Row label={t('cart.bonus')} value={`−${formatMoney(order.bonus_spent)}`} /> : null}
        <Row label={t('cart.total')} value={formatMoney(order.total)} bold />
        <Text style={[styles.muted, { marginTop: spacing.xs }]}>
          {t(`payment.${order.payment_method}` as const)} · {order.address_line}
          {order.apartment ? `, кв. ${order.apartment}` : ''}
        </Text>
      </Card>

      {order.status === 'delivered' && !review ? (
        <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Text style={{ fontSize: font.lg, fontWeight: '700' }}>{t('orders.rate')}</Text>
          <Text style={styles.muted}>{order.store?.name}</Text>
          <Stars value={storeRating} onChange={setStoreRating} />
          {order.courier_id ? (
            <>
              <Text style={styles.muted}>{t('partner.roleCourier')}</Text>
              <Stars value={courierRating} onChange={setCourierRating} />
            </>
          ) : null}
          <Button
            title={t('common.save')}
            disabled={!storeRating}
            loading={submitReview.isPending}
            onPress={() => submitReview.mutate({ orderId: order.id, storeRating, courierRating: courierRating || undefined })}
          />
        </Card>
      ) : null}

      {clientCanCancel(order.status) ? (
        <Button style={{ marginTop: spacing.xl }} variant="ghost" title={t('orders.cancel')} onPress={onCancel} loading={cancel.isPending} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  store: { fontSize: font.lg, color: colors.textMuted },
  item: { flexDirection: 'row', gap: spacing.md },
  itemName: { fontSize: font.md, color: colors.text },
  strike: { textDecorationLine: 'line-through', color: colors.textMuted },
  muted: { fontSize: font.sm, color: colors.textMuted },
  replacement: { marginTop: spacing.xs, padding: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: 8, gap: 2 },
});
