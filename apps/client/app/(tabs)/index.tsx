import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStores } from '../../src/lib/api';
import { useI18n } from '@marketplace/mobile';
import { useSelectedAddress } from '../../src/lib/hooks';
import { useAuth } from '@marketplace/mobile';
import { StoreCard } from '../../src/components/StoreCard';
import { EmptyState, Loading } from '@marketplace/mobile';
import { colors, font, spacing } from '@marketplace/mobile';

export default function Home() {
  const { t } = useI18n();
  const { userId } = useAuth();
  const { data: stores, isLoading, refetch, isRefetching } = useStores();
  const { address } = useSelectedAddress();

  return (
    <FlatList
      data={stores ?? []}
      keyExtractor={(s) => s.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.lg }}>
          <Pressable
            style={styles.address}
            onPress={() => router.push(userId ? '/addresses' : '/login')}
          >
            <Text style={styles.addressLabel}>{t('home.deliverTo')}</Text>
            <Text style={styles.addressValue} numberOfLines={1}>
              {address?.address_line ?? t('home.chooseAddress')} ›
            </Text>
          </Pressable>
          <Text style={styles.title}>{t('home.stores')}</Text>
        </View>
      }
      ListEmptyComponent={isLoading ? <Loading /> : <EmptyState title={t('common.empty')} />}
      renderItem={({ item }) => <StoreCard store={item} onPress={() => router.push(`/store/${item.id}`)} />}
    />
  );
}

const styles = StyleSheet.create({
  address: { gap: 2 },
  addressLabel: { fontSize: font.sm, color: colors.textMuted },
  addressValue: { fontSize: font.lg, fontWeight: '600', color: colors.text },
  title: { fontSize: font.xxl, fontWeight: '800', color: colors.text },
});
