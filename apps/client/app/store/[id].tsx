import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { calcCartTotals, formatMoney, localized } from '@marketplace/shared';
import { useCategories, useProducts, useStore } from '../../src/lib/api';
import { useI18n } from '@marketplace/mobile';
import { useCartControls } from '../../src/lib/hooks';
import { ProductCard } from '../../src/components/ProductCard';
import { Button, Chip, EmptyState, Loading, SearchField } from '@marketplace/mobile';
import { colors, font, spacing } from '@marketplace/mobile';

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { data: store } = useStore(id);
  const { data: categories } = useCategories();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const h = setTimeout(() => setSearch(query), 300);
    return () => clearTimeout(h);
  }, [query]);

  const { data: products, isLoading } = useProducts({ storeId: id, categoryId, search });
  const { data: allProducts } = useProducts({ storeId: id });
  const { quantityOf, change, cart } = useCartControls();

  // only show categories that have products in this store
  const usedCategories = useMemo(() => {
    const ids = new Set((allProducts ?? []).map((p) => p.category_id));
    return (categories ?? []).filter((c) => ids.has(c.id));
  }, [categories, allProducts]);

  const storeLines = cart.filter((c) => c.product.store_id === id);
  const totals = store && storeLines.length
    ? calcCartTotals({ lines: storeLines.map((r) => ({ product: r.product, quantity: Number(r.quantity) })), store })
    : null;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: store?.name ?? '' }} />
      <FlatList
        data={products ?? []}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerStyle={{ padding: spacing.sm, paddingBottom: 120, flexGrow: 1 }}
        style={{ backgroundColor: colors.bg }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, padding: spacing.sm }}>
            {store?.description_ru ? (
              <Text style={styles.desc}>{localized(store, 'description', locale)}</Text>
            ) : null}
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('store.searchIn', { store: store?.name ?? '' })}
              clearButtonMode="while-editing"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              <Chip label={t('store.allProducts')} active={!categoryId} onPress={() => setCategoryId(null)} />
              {usedCategories.map((c) => (
                <Chip
                  key={c.id}
                  label={localized(c, 'name', locale)}
                  active={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={isLoading ? <Loading /> : <EmptyState icon="search-outline" title={t('common.empty')} />}
        renderItem={({ item }) => (
          <ProductCard product={item} quantity={quantityOf(item.id)} onChangeQuantity={(q) => change(item, q)} />
        )}
      />
      {totals ? (
        <View style={styles.footer}>
          <Button
            variant="accent"
            icon="cart"
            title={`${t('tabs.cart')} · ${formatMoney(totals.itemsTotal)}`}
            onPress={() => router.navigate('/cart')}
          />
          {totals.minOrderLeft > 0 ? (
            <Text style={styles.warn}>{t('cart.minOrderLeft', { amount: formatMoney(totals.minOrderLeft) })}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  desc: { fontSize: font.md, color: colors.textMuted },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: spacing.xl,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.xs,
  },
  warn: { color: colors.warning, fontSize: font.sm, textAlign: 'center' },
});
