import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { formatMoney, type Store } from '@marketplace/shared';
import { Badge, Icon, PressableScale, colors, font, isStoreOpen, radius, shadow, spacing, useI18n } from '@marketplace/mobile';

export function StoreCard({ store, onPress }: { store: Store; onPress: () => void }) {
  const { t } = useI18n();
  const open = isStoreOpen(store.opening_hours);
  const freeFrom = store.free_delivery_from ? Number(store.free_delivery_from) : null;
  return (
    <PressableScale onPress={onPress} style={styles.card} scaleTo={0.98}>
      <View style={styles.cover}>
        {store.cover_url ? (
          <Image source={{ uri: store.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={styles.coverArt}>
            <Icon name="leaf" size={64} color="rgba(255,255,255,0.15)" />
          </View>
        )}
        {!open ? (
          <View style={styles.closed}><Text style={styles.closedText}>{t('store.closed')}</Text></View>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.logo}>
          {store.logo_url ? (
            <Image source={{ uri: store.logo_url }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
          ) : (
            <Icon name="storefront" size={24} color={colors.primary} />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{store.name}</Text>
          <View style={styles.metaRow}>
            <Icon name="bicycle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.meta}>
              {Number(store.delivery_fee) > 0 ? formatMoney(store.delivery_fee) : '0 ₸'}
            </Text>
            {Number(store.min_order_amount) > 0 ? (
              <Text style={styles.meta}>· {t('store.minOrder', { amount: formatMoney(store.min_order_amount) })}</Text>
            ) : null}
          </View>
        </View>
      </View>
      {freeFrom ? (
        <Badge
          label={t('store.freeDeliveryFrom', { amount: formatMoney(freeFrom) })}
          tone="accent"
          style={styles.freeBadge}
        />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, backgroundColor: colors.card, overflow: 'hidden', ...shadow },
  cover: { height: 110, backgroundColor: colors.primary },
  coverArt: { flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingRight: spacing.xl },
  closed: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(30,42,32,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  closedText: { color: colors.white, fontWeight: '800', fontSize: font.lg },
  body: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, alignItems: 'center' },
  logo: {
    width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.surface, marginTop: -34,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: colors.card,
  },
  name: { fontSize: font.lg, fontWeight: '800', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  meta: { fontSize: font.sm, color: colors.textMuted },
  freeBadge: { position: 'absolute', top: spacing.md, right: spacing.md },
});
