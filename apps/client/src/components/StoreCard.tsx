import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { formatMoney, type Store } from '@marketplace/shared';
import { colors, font, radius, spacing } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { isStoreOpen } from '../lib/hours';

export function StoreCard({ store, onPress }: { store: Store; onPress: () => void }) {
  const { t } = useI18n();
  const open = isStoreOpen(store.opening_hours);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.cover}>
        {store.cover_url ? (
          <Image source={{ uri: store.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}
        {!open ? (
          <View style={styles.closed}><Text style={styles.closedText}>{t('store.closed')}</Text></View>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.logo}>
          {store.logo_url ? (
            <Image source={{ uri: store.logo_url }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          ) : (
            <Text style={{ fontSize: 22 }}>🏪</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{store.name}</Text>
          <Text style={styles.meta}>
            {Number(store.delivery_fee) > 0 ? t('store.deliveryFee', { amount: formatMoney(store.delivery_fee) }) : ''}
            {store.free_delivery_from ? ` · ${t('store.freeDeliveryFrom', { amount: formatMoney(store.free_delivery_from) })}` : ''}
          </Text>
          {Number(store.min_order_amount) > 0 ? (
            <Text style={styles.meta}>{t('store.minOrder', { amount: formatMoney(store.min_order_amount) })}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, backgroundColor: colors.bg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cover: { height: 120, backgroundColor: colors.primarySoft },
  closed: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  closedText: { color: colors.white, fontWeight: '700', fontSize: font.lg },
  body: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, alignItems: 'center' },
  logo: {
    width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  name: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.sm, color: colors.textMuted },
});
