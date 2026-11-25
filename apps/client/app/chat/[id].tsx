import { Stack, useLocalSearchParams } from 'expo-router';
import { ChatScreen, useI18n } from '@marketplace/mobile';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const support = id === 'support';
  return (
    <>
      <Stack.Screen options={{ title: support ? t('profile.support') : t('orders.chat') }} />
      <ChatScreen support={support} orderId={support ? undefined : id} />
    </>
  );
}
