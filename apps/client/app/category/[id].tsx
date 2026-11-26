import { FlatList, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { localized } from '@marketplace/shared';
import { EmptyState, colors, spacing, useI18n } from '@marketplace/mobile';
import { ProductGridSkeleton } from '../../src/components/ProductGridSkeleton';
import { useCategories, useProducts } from '../../src/lib/api';
import { useCartControls } from '../../src/lib/hooks';
import { ProductCard } from '../../src/components/ProductCard';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { data: categories } = useCategories();
  const category = categories?.find((c) => c.id === id);
  const { data, isLoading } = useProducts({ categoryId: id });
  const { quantityOf, change } = useCartControls();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: category ? localized(category, 'name', locale) : '' }} />
      {isLoading ? (
        <ProductGridSkeleton />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={{ padding: spacing.sm, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="basket-outline" title={t('common.empty')} />}
          renderItem={({ item, index }) => (
            <ProductCard product={item} index={index} quantity={quantityOf(item.id)} onChangeQuantity={(q) => change(item, q)} />
          )}
        />
      )}
    </View>
  );
}
