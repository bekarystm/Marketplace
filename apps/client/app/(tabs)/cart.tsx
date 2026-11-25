import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { calcCartTotals, formatMoney, localized } from '@marketplace/shared';
import { useClearStoreCart, useStores, type CartRow } from '../../src/lib/api';
import { useI18n } from '@marketplace/mobile';
import { useAuth } from '@marketplace/mobile';
import { useCartControls } from '../../src/lib/hooks';
import { QuantityStepper } from '@marketplace/mobile';
import { Button, Card, EmptyState, Row } from '@marketplace/mobile';
import { colors, font, radius, spacing } from '@marketplace/mobile';

export default function Cart() {
  const { t, locale } = useI18n();
  const { userId } = useAuth();
  const { cart, change } = useCartControls();
  const { data: stores } = useStores();
  const clear = useClearStoreCart();

  const groups = useMemo(() => {
    const map = new Map<string, CartRow[]>();
    for (const row of cart) {
      const list = map.get(row.product.store_id) ?? [];
      list.push(row);
      map.set(row.product.store_id, list);
    }
    return [...map.entries()];
  }, [cart]);

  if (!userId) {
    return <EmptyState title={t('cart.empty')} action={<Button title={t('auth.title')} onPress={() => router.push('/login')} />} />;
  }
  if (groups.length === 0) {
    return (
      <EmptyState
        title={t('cart.empty')}
        icon="cart-outline"
        action={<Button title={t('cart.goShopping')} onPress={() => router.navigate('/')} />}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      {groups.map(([storeId, rows]) => {
        const store = stores?.find((s) => s.id === storeId);
        const totals = store
          ? calcCartTotals({ lines: rows.map((r) => ({ product: r.product, quantity: Number(r.quantity) })), store })
          : null;
        return (
          <Card key={storeId} style={{ gap: spacing.md }}>
            <View style={styles.header}>
              <Text style={styles.storeName}>{store?.name ?? '…'}</Text>
              <Text style={styles.clear} onPress={() => clear.mutate(rows.map((r) => r.product_id))}>
                {t('cart.clear')}
              </Text>
            </View>
            {rows.map((row) => (
              <View key={row.product_id} style={styles.line}>
                <View style={styles.thumb}>
                  {row.product.image_urls[0] ? (
                    <Image source={{ uri: row.product.image_urls[0] }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                  ) : <Text>🛒</Text>}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} numberOfLines={2}>{localized(row.product, 'name', locale)}</Text>
                  <Text style={styles.price}>{formatMoney(Number(row.product.price) * Number(row.quantity))}</Text>
                </View>
                <View style={{ width: 120 }}>
                  <QuantityStepper product={row.product} quantity={Number(row.quantity)} onChange={(q) => change(row.product, q)} compact />
                </View>
              </View>
            ))}
            {totals ? (
              <View>
                <Row label={t('cart.items')} value={formatMoney(totals.itemsTotal)} />
                <Row label={t('cart.delivery')} value={formatMoney(totals.deliveryFee)} />
                <Row label={t('cart.total')} value={formatMoney(totals.total)} bold />
                {totals.minOrderLeft > 0 ? (
                  <Text style={styles.warn}>{t('cart.minOrderLeft', { amount: formatMoney(totals.minOrderLeft) })}</Text>
                ) : null}
              </View>
            ) : null}
            <Button
              variant="accent"
              icon="arrow-forward"
              title={t('cart.checkout')}
              disabled={!totals?.canCheckout}
              onPress={() => router.push({ pathname: '/checkout', params: { storeId } })}
            />
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  clear: { color: colors.danger, fontSize: font.sm },
  line: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  thumb: {
    width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  name: { fontSize: font.sm, color: colors.text },
  price: { fontSize: font.md, fontWeight: '600', color: colors.text },
  warn: { color: colors.warning, fontSize: font.sm, marginTop: spacing.xs },
});
