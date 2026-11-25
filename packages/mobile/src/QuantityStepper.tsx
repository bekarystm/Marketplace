import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatQuantity, roundToStep, type Product } from '@marketplace/shared';
import { colors, font, radius } from './theme';
import { useI18n } from './i18n';
import { Icon } from './ui';

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
  const atMax = quantity >= max;
  const inc = () => onChange(Math.min(roundToStep(quantity + step, step), max));
  const dec = () => onChange(Math.max(roundToStep(quantity - step, step), 0));
  return (
    <View style={[styles.wrap, compact && { height: 36 }]}>
      <Pressable onPress={dec} hitSlop={8} style={styles.btn} accessibilityLabel="-">
        <Icon name={quantity - step <= 0 ? 'trash-outline' : 'remove'} size={18} color={colors.white} />
      </Pressable>
      <Text style={styles.qty} numberOfLines={1}>{formatQuantity(quantity, product.unit, locale)}</Text>
      <Pressable onPress={inc} hitSlop={8} style={[styles.btn, atMax && { opacity: 0.3 }]} disabled={atMax} accessibilityLabel="+">
        <Icon name="add" size={20} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, borderRadius: radius.pill, height: 42, paddingHorizontal: 4,
  },
  btn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qty: { color: colors.white, fontSize: font.sm, fontWeight: '700', flexShrink: 1 },
});
