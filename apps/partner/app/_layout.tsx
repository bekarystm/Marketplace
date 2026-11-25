import '../src/lib/location'; // registers the background location task
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  AuthProvider,
  I18nProvider,
  Loading,
  LoginScreen,
  colors,
  onNotificationOpened,
  registerPushToken,
  useAuth,
  useI18n,
} from '@marketplace/mobile';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } });

function Gate() {
  const { userId, loading } = useAuth();
  const { t } = useI18n();
  useEffect(() => {
    if (userId) registerPushToken(userId, 'partner');
  }, [userId]);
  useEffect(
    () =>
      onNotificationOpened((data) => {
        if (typeof data.order_id !== 'string') return;
        // couriers get "ready"/"cancelled" pushes, staff get "new order"
        router.push(data.status === 'placed' ? `/picker/order/${data.order_id}` : `/courier/order/${data.order_id}`);
      }),
    [],
  );

  if (loading) return <Loading />;
  if (!userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <LoginScreen onDone={() => queryClient.invalidateQueries()} />
      </SafeAreaView>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerBackTitle: t('common.back'),
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'TDKFOOD Партнёр' }} />
      <Stack.Screen name="courier/apply" options={{ title: t('courier.apply') }} />
      <Stack.Screen name="courier/index" options={{ title: t('partner.roleCourier') }} />
      <Stack.Screen name="courier/order/[id]" options={{ title: '' }} />
      <Stack.Screen name="picker/index" options={{ title: t('picker.orders') }} />
      <Stack.Screen name="picker/order/[id]" options={{ title: '' }} />
      <Stack.Screen name="chat/[id]" options={{ title: t('orders.chat') }} />
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
            <Gate />
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
