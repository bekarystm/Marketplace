import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { formatMoney, localized, unitLabel, type Product } from '@marketplace/shared';
import { colors, font, radius, spacing } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { QuantityStepper } from './QuantityStepper';

export function ProductCard({
  product,
  quantity,
  onChangeQuantity,
}: {
  product: Product;
  quantity: number;
  onChangeQuantity: (q: number) => void;
}) {
  const { t, locale } = useI18n();
  const available = product.is_available && (product.stock_qty == null || Number(product.stock_qty) > 0);
  const step = Number(product.qty_step) || 1;
  return (
    <View style={[styles.card, !available && { opacity: 0.5 }]}>
      <View style={styles.imageWrap}>
        {product.image_urls[0] ? (
          <Image source={{ uri: product.image_urls[0] }} style={styles.image} contentFit="contain" transition={150} />
        ) : (
          <Text style={{ fontSize: 36 }}>🛒</Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flexWrap: 'wrap' }}>
        <Text style={styles.price}>{formatMoney(product.price)}</Text>
        {product.is_weighted ? <Text style={styles.muted}>/{unitLabel(product.unit, locale)}</Text> : null}
        {product.old_price ? <Text style={styles.oldPrice}>{formatMoney(product.old_price)}</Text> : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>{localized(product, 'name', locale)}</Text>
      <View style={{ flex: 1 }} />
      {!available ? (
        <Text style={styles.muted}>{t('product.outOfStock')}</Text>
      ) : quantity > 0 ? (
        <QuantityStepper product={product} quantity={quantity} onChange={onChangeQuantity} compact />
      ) : (
        <Pressable style={styles.add} onPress={() => onChangeQuantity(step)}>
          <Text style={styles.addText}>+ {t('product.add')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: spacing.xs, padding: spacing.sm, minHeight: 250 },
  imageWrap: {
    aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  price: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  oldPrice: { fontSize: font.sm, color: colors.textMuted, textDecorationLine: 'line-through' },
  name: { fontSize: font.sm, color: colors.text },
  muted: { fontSize: font.sm, color: colors.textMuted },
  add: { height: 34, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: font.sm, fontWeight: '600', color: colors.text },
});
