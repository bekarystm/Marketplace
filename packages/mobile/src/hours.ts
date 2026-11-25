const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * opening_hours format: {"mon": [["08:00","23:00"]], ...}. Empty object = always open.
 * Uses Kazakhstan time (UTC+5).
 */
export function isStoreOpen(hours: unknown, now: Date = new Date()): boolean {
  if (!hours || typeof hours !== 'object' || Object.keys(hours as object).length === 0) return true;
  const local = new Date(now.getTime() + (5 * 60 + now.getTimezoneOffset()) * 60000);
  const day = DAYS[local.getDay()];
  const ranges = (hours as Record<string, [string, string][]>)[day];
  if (!Array.isArray(ranges)) return false;
  const minutes = local.getHours() * 60 + local.getMinutes();
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  return ranges.some(([from, to]) => {
    const f = toMin(from);
    const t = toMin(to);
    return t > f ? minutes >= f && minutes < t : minutes >= f || minutes < t; // overnight
  });
}
