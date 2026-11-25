import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '@marketplace/mobile';

export const LOCATION_TASK = 'courier-location';

async function pushLocation(loc: Location.LocationObject) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  await supabase.from('courier_locations').upsert({
    courier_id: uid,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    heading: loc.coords.heading ?? null,
    speed: loc.coords.speed ?? null,
    updated_at: new Date(loc.timestamp).toISOString(),
  });
}

// Must be defined at module scope so it exists when the OS wakes the app in background.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  await pushLocation(data.locations[data.locations.length - 1]);
});

/** Start sharing location while the courier is online. Returns false if permission denied. */
export async function startLocationSharing(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;

  // send one fix immediately so the courier appears in dispatch right away
  try {
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await pushLocation(current);
  } catch {
    /* ignore */
  }

  const bg = await Location.requestBackgroundPermissionsAsync().catch(() => ({ status: 'denied' as const }));
  const options: Location.LocationTaskOptions = {
    accuracy: Location.Accuracy.High,
    timeInterval: 10_000,
    distanceInterval: 25,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Вы на линии',
      notificationBody: 'Передаём ваше местоположение для доставки заказов',
    },
  };
  if (bg.status === 'granted') {
    const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (!running) await Location.startLocationUpdatesAsync(LOCATION_TASK, options);
  }
  return true;
}

export async function stopLocationSharing() {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}

/** Foreground fallback when background permission is not granted. */
export function watchForeground(onError?: (e: unknown) => void) {
  let sub: Location.LocationSubscription | null = null;
  Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 10_000, distanceInterval: 25 },
    (loc) => {
      pushLocation(loc).catch(onError);
    },
  )
    .then((s) => (sub = s))
    .catch(onError);
  return () => sub?.remove();
}
