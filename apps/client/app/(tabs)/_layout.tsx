import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useI18n } from '../../src/lib/i18n';
import { useCart } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

const icon = (emoji: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

export default function TabsLayout() {
  const { t } = useI18n();
  const { data: cart } = useCart();
  const count = cart?.length ?? 0;
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerTitleStyle: { fontWeight: '700' } }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: icon('🏪') }} />
      <Tabs.Screen name="search" options={{ title: t('tabs.search'), tabBarIcon: icon('🔍') }} />
      <Tabs.Screen
        name="cart"
        options={{ title: t('tabs.cart'), tabBarIcon: icon('🛒'), tabBarBadge: count > 0 ? count : undefined }}
      />
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders'), tabBarIcon: icon('📦') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
