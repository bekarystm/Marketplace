import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { formatMoney, localized, unitLabel, type Product } from '@marketplace/shared';
import { Badge, Icon, QuantityStepper, colors, font, radius, shadow, spacing, useI18n } from '@marketplace/mobile';

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
  const discount =
    product.old_price && Number(product.old_price) > Number(product.price)
      ? Math.round((1 - Number(product.price) / Number(product.old_price)) * 100)
      : 0;

  return (
    <View style={styles.outer}>
      <View style={[styles.card, !available && { opacity: 0.55 }]}>
        <View style={styles.imageWrap}>
          {product.image_urls[0] ? (
            <Image source={{ uri: product.image_urls[0] }} style={styles.image} contentFit="contain" transition={150} />
          ) : (
            <Icon name="basket-outline" size={40} color={colors.textMuted} />
          )}
          {discount > 0 ? <Badge label={`−${discount}%`} style={styles.discount} /> : null}
        </View>

        <Text style={styles.name} numberOfLines={2}>{localized(product, 'name', locale)}</Text>

        <View style={styles.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.price, discount > 0 && { color: colors.accent }]}>
              {formatMoney(product.price)}
              {product.is_weighted ? <Text style={styles.unit}> /{unitLabel(product.unit, locale)}</Text> : null}
            </Text>
            {discount > 0 ? <Text style={styles.oldPrice}>{formatMoney(product.old_price)}</Text> : null}
          </View>
          {available && quantity === 0 ? (
            <Pressable style={styles.add} onPress={() => onChangeQuantity(step)} accessibilityLabel={t('product.add')} hitSlop={6}>
              <Icon name="add" size={22} color={colors.white} />
            </Pressable>
          ) : null}
        </View>

        {!available ? (
          <Text style={styles.muted}>{t('product.outOfStock')}</Text>
        ) : quantity > 0 ? (
          <QuantityStepper product={product} quantity={quantity} onChange={onChangeQuantity} compact />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, padding: spacing.xs + 2 },
  card: {
    flex: 1, gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg,
    backgroundColor: colors.card, ...shadow,
  },
  imageWrap: {
    aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  image: { width: '88%', height: '88%' },
  discount: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  name: { fontSize: font.sm, color: colors.text, fontWeight: '600', minHeight: 34 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  price: { fontSize: font.lg, fontWeight: '800', color: colors.text },
  unit: { fontSize: font.xs, fontWeight: '500', color: colors.textMuted },
  oldPrice: { fontSize: font.xs, color: colors.textMuted, textDecorationLine: 'line-through' },
  muted: { fontSize: font.sm, color: colors.textMuted },
  add: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
});
