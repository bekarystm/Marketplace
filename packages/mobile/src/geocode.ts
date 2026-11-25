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
