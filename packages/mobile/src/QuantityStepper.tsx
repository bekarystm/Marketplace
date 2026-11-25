import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatQuantity, roundToStep, type Product } from '@marketplace/shared';
import { colors, font, radius, spacing } from './theme';
import { useI18n } from './i18n';

export function QuantityStepper({
  product,
  quantity,
  onChange,
  compact,
}: {
  product: Pick<Product, 'qty_step' | 'unit' | 'stock_qty'>;
  quantity: number;
  onChange: (q: number) => void;
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const step = Number(product.qty_step) || 1;
  const max = product.stock_qty == null ? Infinity : Number(product.stock_qty);
  const inc = () => onChange(Math.min(roundToStep(quantity + step, step), max));
  const dec = () => onChange(Math.max(roundToStep(quantity - step, step), 0));
  return (
    <View style={[styles.wrap, compact && { height: 34 }]}>
      <Pressable onPress={dec} hitSlop={8} style={styles.btn} accessibilityLabel="-">
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <Text style={styles.qty} numberOfLines={1}>{formatQuantity(quantity, product.unit, locale)}</Text>
      <Pressable onPress={inc} hitSlop={8} style={styles.btn} disabled={quantity >= max} accessibilityLabel="+">
        <Text style={[styles.btnText, quantity >= max && { opacity: 0.3 }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, borderRadius: radius.md, height: 40, paddingHorizontal: spacing.xs,
  },
  btn: { width: 32, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.white, fontSize: font.xl, fontWeight: '600' },
  qty: { color: colors.white, fontSize: font.sm, fontWeight: '600', flexShrink: 1 },
});
