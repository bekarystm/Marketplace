import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { localized } from '@marketplace/shared';
import { EmptyState, FadeIn, Icon, Logo, PressableScale, Skeleton, colors, font, radius, shadow, spacing, useAuth, useI18n, type IconName } from '@marketplace/mobile';
import { useCategories, useNotifications, useStores, useUsedCategoryIds } from '../../src/lib/api';
import { categoryStyle } from '../../src/lib/categoryStyle';
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
  const { data: categories } = useCategories();
  const { data: usedIds } = useUsedCategoryIds();
  const shownCategories = (categories ?? []).filter((c) => !c.parent_id && usedIds?.has(c.id)).slice(0, 8);
  const { locale } = useI18n();
  const { data: notes } = useNotifications();
  const unread = (notes ?? []).filter((n) => !n.read_at).length;

  const openCategory = (categoryId: string) => {
    // with a single store go straight into its catalog, otherwise show the category across stores
    if (stores && stores.length === 1) router.push({ pathname: '/store/[id]', params: { id: stores[0].id, category: categoryId } });
    else router.push(`/category/${categoryId}`);
  };

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
            <PressableScale style={styles.iconBtn} scaleTo={0.9} onPress={() => router.push(userId ? '/notifications' : '/login')}>
              <Icon name="notifications-outline" size={22} color={colors.text} />
              {unread > 0 ? (
                <View style={styles.badge}><Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text></View>
              ) : null}
            </PressableScale>
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

          <FadeIn index={1} style={styles.features}>
            <Feature icon="flash-outline" label={t('home.featureFast')} />
            <Feature icon="leaf-outline" label={t('home.featureFresh')} />
            <Feature icon="pricetag-outline" label={t('home.featureDeals')} />
          </FadeIn>

          {shownCategories.length > 0 ? (
            <FadeIn index={2} style={{ gap: spacing.md }}>
              <Text style={styles.title}>{t('store.categories')}</Text>
              <View style={styles.catGrid}>
                {shownCategories.map((c) => {
                  const st = categoryStyle(c.slug);
                  return (
                    <View key={c.id} style={styles.catCell}>
                      <PressableScale style={styles.catInner} scaleTo={0.94} onPress={() => openCategory(c.id)}>
                        <View style={[styles.catTile, { backgroundColor: st.bg }]}>
                          <Icon name={st.icon} size={28} color={st.fg} />
                        </View>
                        <Text style={styles.catLabel} numberOfLines={2}>{localized(c, 'name', locale)}</Text>
                      </PressableScale>
                    </View>
                  );
                })}
              </View>
            </FadeIn>
          ) : null}

          <Text style={styles.title}>{t('home.stores')}</Text>
        </View>
      }
      ListEmptyComponent={
        isLoading ? <Skeleton style={{ height: 190, borderRadius: radius.lg }} /> : <EmptyState icon="storefront-outline" title={t('common.empty')} />
      }
      renderItem={({ item, index }) => (
        <FadeIn index={index + 3}>
          <StoreCard store={item} onPress={() => router.push(`/store/${item.id}`)} />
        </FadeIn>
      )}
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
  badge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  catCell: { width: '25%', paddingHorizontal: spacing.xs, marginBottom: spacing.md },
  catInner: { width: '100%', alignItems: 'center', gap: spacing.xs },
  catTile: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: font.xs, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
