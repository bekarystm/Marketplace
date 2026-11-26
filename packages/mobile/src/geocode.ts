// Reverse/forward geocoding via OpenStreetMap Nominatim.
// Usage policy: max 1 request/second, identify the app. For production traffic,
// switch to a self-hosted Nominatim/Photon or a commercial OSM-based provider.
const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'TDKFOOD/1.0', 'Accept-Language': 'ru' };

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address ?? {};
    const street = a.road ?? a.pedestrian ?? a.neighbourhood ?? a.suburb;
    const parts = [street, a.house_number].filter(Boolean);
    return parts.length ? parts.join(', ') : (data.display_name?.split(',').slice(0, 2).join(',') ?? null);
  } catch {
    return null;
  }
}

export async function searchAddress(query: string, near: { lat: number; lng: number }) {
  const d = 0.15; // ~15 km box around the city
  const viewbox = [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(',');
  const res = await fetch(
    `${BASE}/search?format=jsonv2&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=8`,
    { headers: HEADERS },
  );
  if (!res.ok) return [];
  const data: { display_name: string; lat: string; lon: string }[] = await res.json();
  return data.map((r) => ({ label: r.display_name.split(',').slice(0, 3).join(','), lat: Number(r.lat), lng: Number(r.lon) }));
}

export type RouteProfile = 'foot' | 'bike' | 'car';
export interface RouteResult {
  points: { lat: number; lng: number }[];
  distanceM: number;
  durationS: number;
}

/**
 * Route between two points over OpenStreetMap roads (OSRM on the FOSSGIS servers,
 * fair-use policy; switch to a self-hosted OSRM/Valhalla for production traffic).
 */
export async function getRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  profile: RouteProfile = 'car',
): Promise<RouteResult | null> {
  const host = { foot: 'routed-foot', bike: 'routed-bike', car: 'routed-car' }[profile];
  const url =
    `https://routing.openstreetmap.de/${host}/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'TDKFOOD/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const r = data.routes?.[0];
    if (!r) return null;
    return {
      points: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => ({ lat, lng })),
      distanceM: r.distance,
      durationS: r.duration,
    };
  } catch {
    return null;
  }
}
