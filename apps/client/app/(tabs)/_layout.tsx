import { Tabs } from 'expo-router';
import { Icon, colors, font, useI18n, type IconName } from '@marketplace/mobile';
import { useCart } from '../../src/lib/api';

const icon =
  (name: IconName, active: IconName) =>
  ({ focused, color }: { focused: boolean; color: unknown }) => (
    <Icon name={focused ? active : name} size={24} color={typeof color === 'string' ? color : colors.textMuted} />
  );

export default function TabsLayout() {
  const { t } = useI18n();
  const { data: cart } = useCart();
  const count = cart?.length ?? 0;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', fontSize: font.lg, color: colors.text },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), headerShown: false, tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="search" options={{ title: t('tabs.search'), tabBarIcon: icon('search-outline', 'search') }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('tabs.cart'),
          tabBarIcon: icon('cart-outline', 'cart'),
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.white, fontSize: 11 },
        }}
      />
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders'), tabBarIcon: icon('receipt-outline', 'receipt') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
