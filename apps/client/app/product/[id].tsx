import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatQuantity, localized, unitLabel, type Product } from '@marketplace/shared';
import {
  Badge,
  Button,
  Icon,
  Loading,
  QuantityStepper,
  colors,
  font,
  radius,
  shadow,
  spacing,
  supabase,
  useI18n,
} from '@marketplace/mobile';
import { useStore } from '../../src/lib/api';
import { useCartControls } from '../../src/lib/hooks';
import { ProductCard } from '../../src/components/ProductCard';

function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Product;
    },
  });
}

function useSimilar(product: Product | undefined) {
  return useQuery({
    queryKey: ['similar', product?.id],
    enabled: !!product?.category_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', product!.store_id)
        .eq('category_id', product!.category_id!)
        .neq('id', product!.id)
        .eq('is_available', true)
        .limit(10);
      if (error) throw error;
      return data as Product[];
    },
  });
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { data: product, isLoading } = useProduct(id);
  const { data: store } = useStore(product?.store_id);
  const { data: similar } = useSimilar(product);
  const { quantityOf, change } = useCartControls();

  if (isLoading || !product) return <Loading />;

  const quantity = quantityOf(product.id);
  const available = product.is_available && (product.stock_qty == null || Number(product.stock_qty) > 0);
  const discount =
    product.old_price && Number(product.old_price) > Number(product.price)
      ? Math.round((1 - Number(product.price) / Number(product.old_price)) * 100)
      : 0;
  const description = localized(product, 'description', locale);
  const step = Number(product.qty_step) || 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.hero}>
          {product.image_urls[0] ? (
            <Image source={{ uri: product.image_urls[0] }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <Icon name="basket-outline" size={96} color={colors.textMuted} />
          )}
          {discount > 0 ? <Badge label={`−${discount}%`} style={styles.discount} /> : null}
        </View>

        <View style={styles.body}>
          {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
          <Text style={styles.name}>{localized(product, 'name', locale)}</Text>
          {product.unit_size ? (
            <Text style={styles.muted}>{formatQuantity(product.unit_size, product.unit, locale)}</Text>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={[styles.price, discount > 0 && { color: colors.accent }]}>
              {formatMoney(product.price)}
              {product.is_weighted ? <Text style={styles.unit}> / {unitLabel(product.unit, locale)}</Text> : null}
            </Text>
            {discount > 0 ? <Text style={styles.oldPrice}>{formatMoney(product.old_price)}</Text> : null}
          </View>

          {product.is_weighted ? (
            <View style={styles.note}>
              <Icon name="scale-outline" size={18} color={colors.primary} />
              <Text style={styles.noteText}>{t('product.weightedNote')}</Text>
            </View>
          ) : null}

          {store ? (
            <View style={styles.storeRow}>
              <Icon name="storefront-outline" size={18} color={colors.textMuted} />
              <Text style={styles.muted} onPress={() => router.push(`/store/${store.id}`)}>
                {store.name}
              </Text>
            </View>
          ) : null}

          {description ? (
            <>
              <Text style={styles.section}>{t('product.description')}</Text>
              <Text style={styles.description}>{description}</Text>
            </>
          ) : null}
        </View>

        {similar && similar.length > 0 ? (
          <View>
            <Text style={[styles.section, { paddingHorizontal: spacing.lg }]}>{t('product.similar')}</Text>
            <FlatList
              horizontal
              data={similar}
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.sm }}
              renderItem={({ item }) => (
                <View style={{ width: 170 }}>
                  <ProductCard product={item} quantity={quantityOf(item.id)} onChangeQuantity={(q) => change(item, q)} />
                </View>
              )}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {!available ? (
          <Button variant="secondary" title={t('product.outOfStock')} disabled />
        ) : quantity > 0 ? (
          <QuantityStepper product={product} quantity={quantity} onChange={(q) => change(product, q)} />
        ) : (
          <Button
            variant="accent"
            icon="cart"
            title={`${t('product.add')} · ${formatMoney(Number(product.price) * step)}`}
            onPress={() => change(product, step)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 320, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden',
  },
  image: { width: "100%", height: "100%" },
  discount: { position: 'absolute', top: spacing.lg, left: spacing.lg },
  body: { padding: spacing.lg, gap: spacing.sm },
  brand: { fontSize: font.sm, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  name: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  muted: { fontSize: font.md, color: colors.textMuted },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md, marginTop: spacing.xs },
  price: { fontSize: font.hero, fontWeight: '900', color: colors.text },
  unit: { fontSize: font.md, fontWeight: '500', color: colors.textMuted },
  oldPrice: { fontSize: font.lg, color: colors.textMuted, textDecorationLine: 'line-through' },
  note: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.primarySoft,
    padding: spacing.md, borderRadius: radius.md,
  },
  noteText: { flex: 1, fontSize: font.sm, color: colors.primary },
  storeRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  section: { fontSize: font.lg, fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs },
  description: { fontSize: font.md, color: colors.text, lineHeight: 22 },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: spacing.xl,
    backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, ...shadow,
  },
});
