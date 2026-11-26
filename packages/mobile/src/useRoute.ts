import { useQuery } from '@tanstack/react-query';
import { getRoute, type RouteProfile } from './geocode';

type P = { lat: number; lng: number } | null | undefined;
const r4 = (n: number) => Math.round(n * 1e4) / 1e4; // ~10 m — avoid refetching on tiny GPS jitter

/** Road route between two points, cached and refreshed only when a point moves ~10 m. */
export function useRoute(from: P, to: P, profile: RouteProfile = 'car') {
  return useQuery({
    queryKey: ['route', profile, from && r4(from.lat), from && r4(from.lng), to && r4(to.lat), to && r4(to.lng)],
    enabled: !!from && !!to,
    staleTime: 60_000,
    queryFn: () => getRoute(from!, to!, profile),
  });
}

export function formatEta(seconds: number, locale: 'ru' | 'kk' = 'ru') {
  const min = Math.max(1, Math.round(seconds / 60));
  return locale === 'kk' ? `${min} мин` : `${min} мин`;
}
