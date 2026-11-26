import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  AuthProvider,
  I18nProvider,
  colors,
  onNotificationOpened,
  registerPushToken,
  setupQueryFocus,
  useAuth,
  useI18n,
} from '@marketplace/mobile';

setupQueryFocus();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AppStack() {
  const { userId } = useAuth();
  const { t } = useI18n();
  useEffect(() => {
    if (userId) registerPushToken(userId, 'client');
  }, [userId]);
  useEffect(
    () =>
      onNotificationOpened((data) => {
        if (typeof data.order_id === 'string') router.push(`/order/${data.order_id}`);
      }),
    [],
  );

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerBackTitle: t('common.back'),
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ presentation: 'modal', title: t('auth.title') }} />
      <Stack.Screen name="store/[id]" options={{ title: '' }} />
      <Stack.Screen name="product/[id]" options={{ title: '' }} />
      <Stack.Screen name="category/[id]" options={{ title: '' }} />
      <Stack.Screen name="checkout" options={{ title: t('checkout.title') }} />
      <Stack.Screen name="address/new" options={{ title: t('address.title') }} />
      <Stack.Screen name="addresses" options={{ title: t('profile.addresses') }} />
      <Stack.Screen name="order/[id]" options={{ title: '' }} />
      <Stack.Screen name="chat/[id]" options={{ title: t('orders.chat') }} />
      <Stack.Screen name="bonuses" options={{ title: t('profile.bonuses') }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <AppStack />
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
