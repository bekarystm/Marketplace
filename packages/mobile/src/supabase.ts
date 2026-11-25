import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createSupabase } from '@marketplace/shared';

export const supabase = createSupabase({
  storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
});

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
