import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * React Native has no window focus events: tell react-query when the app returns
 * to the foreground so stale screens (order status, courier position) refetch.
 */
export function setupQueryFocus() {
  if (Platform.OS === 'web') return () => {};
  const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
  return () => sub.remove();
}
