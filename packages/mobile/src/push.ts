import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Ask permission, obtain the Expo push token and store it for the current user. */
export async function registerPushToken(userId: string, app: 'client' | 'partner') {
  try {
    if (!Device.isDevice || Platform.OS === 'web') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Заказы',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return; // available after `eas init`
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: Platform.OS as 'ios' | 'android', app },
      { onConflict: 'token' },
    );
  } catch (e) {
    console.warn('push registration failed', e);
  }
}

/** Call `onOpen` with the notification's data when the user taps a push. */
export function onNotificationOpened(onOpen: (data: Record<string, unknown>) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    onOpen((response.notification.request.content.data ?? {}) as Record<string, unknown>);
  });
  return () => sub.remove();
}
