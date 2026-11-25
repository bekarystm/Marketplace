import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, Icon, Loading, Logo, colors, font, radius, shadow, spacing, useAuth, useI18n, type IconName } from '@marketplace/mobile';
import { useStores } from '../../src/lib/api';
import { useSelectedAddress } from '../../src/lib/hooks';
import { StoreCard } from '../../src/components/StoreCard';

function Feature({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}><Icon name={icon} size={20} color={colors.primary} /></View>
      <Text style={styles.featureText} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export default function Home() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { data: stores, isLoading, refetch, isRefetching } = useStores();
  const { address } = useSelectedAddress();

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={stores ?? []}
      keyExtractor={(s) => s.id}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.sm, gap: spacing.lg, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.lg }}>
          <View style={styles.topBar}>
            <Logo size={24} />
            <Pressable style={styles.iconBtn} onPress={() => router.navigate('/cart')}>
              <Icon name="bag-handle-outline" size={22} color={colors.text} />
            </Pressable>
          </View>

          <Pressable style={styles.address} onPress={() => router.push(userId ? '/addresses' : '/login')}>
            <Icon name="location" size={18} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>{t('home.deliverTo')}</Text>
              <Text style={styles.addressValue} numberOfLines={1}>{address?.address_line ?? t('home.chooseAddress')}</Text>
            </View>
            <Icon name="chevron-down" size={18} color={colors.textMuted} />
          </Pressable>

          <View style={styles.hero}>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
              <Text style={styles.heroSubtitle}>{t('home.heroSubtitle')}</Text>
            </View>
            <View style={styles.heroArt}>
              <Icon name="basket" size={54} color={colors.accent} />
            </View>
          </View>

          <View style={styles.features}>
            <Feature icon="flash-outline" label={t('home.featureFast')} />
            <Feature icon="leaf-outline" label={t('home.featureFresh')} />
            <Feature icon="pricetag-outline" label={t('home.featureDeals')} />
          </View>

          <Text style={styles.title}>{t('home.stores')}</Text>
        </View>
      }
      ListEmptyComponent={isLoading ? <Loading /> : <EmptyState icon="storefront-outline" title={t('common.empty')} />}
      renderItem={({ item }) => <StoreCard store={item} onPress={() => router.push(`/store/${item.id}`)} />}
    />
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', ...shadow,
  },
  address: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card,
    borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  addressLabel: { fontSize: font.xs, color: colors.textMuted },
  addressValue: { fontSize: font.md, fontWeight: '700', color: colors.text },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary,
    borderRadius: radius.xl, padding: spacing.xl, minHeight: 150,
  },
  heroTitle: { color: colors.white, fontSize: font.xxl, fontWeight: '900', lineHeight: 32 },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: font.sm },
  heroArt: {
    width: 86, height: 86, borderRadius: 43, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  features: { flexDirection: 'row', gap: spacing.sm },
  feature: {
    flex: 1, alignItems: 'center', gap: spacing.xs, backgroundColor: colors.card, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  featureIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { fontSize: font.xs, fontWeight: '600', color: colors.text, textAlign: 'center' },
  title: { fontSize: font.xl, fontWeight: '800', color: colors.text },
});
