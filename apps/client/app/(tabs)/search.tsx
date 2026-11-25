import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useProducts } from '../../src/lib/api';
import { useI18n } from '@marketplace/mobile';
import { useCartControls } from '../../src/lib/hooks';
import { ProductCard } from '../../src/components/ProductCard';
import { EmptyState, Loading, SearchField, colors } from '@marketplace/mobile';
import { spacing } from '@marketplace/mobile';

export default function Search() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(id);
  }, [query]);
  const { data, isFetching } = useProducts({ search: debounced });
  const { quantityOf, change } = useCartControls();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <SearchField value={query} onChangeText={setQuery} placeholder={t('common.search')} autoFocus clearButtonMode="while-editing" />
      </View>
      <FlatList
        data={debounced.trim().length >= 2 ? data ?? [] : []}
        keyExtractor={(p) => p.id}
        numColumns={2}
        contentContainerStyle={{ padding: spacing.sm, flexGrow: 1 }}
        ListEmptyComponent={isFetching ? <Loading /> : debounced.length >= 2 ? <EmptyState title={t('common.empty')} /> : undefined}
        renderItem={({ item }) => (
          <ProductCard product={item} quantity={quantityOf(item.id)} onChangeQuantity={(q) => change(item, q)} />
        )}
      />
    </View>
  );
}
