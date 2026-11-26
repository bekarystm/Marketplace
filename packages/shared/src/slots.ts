export type Slot = { id: string; starts_at: string; ends_at: string; capacity: number; booked: number };

// Kazakhstan uses a single time zone, UTC+5.
const KZ_OFFSET_MIN = 5 * 60;
const toKz = (iso: string) => new Date(new Date(iso).getTime() + KZ_OFFSET_MIN * 60000);
const hhmm = (d: Date) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
const dayKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;

export function slotRange(slot: Pick<Slot, 'starts_at' | 'ends_at'>) {
  return `${hhmm(toKz(slot.starts_at))}–${hhmm(toKz(slot.ends_at))}`;
}

/** Groups slots by local day with a label like "Сегодня", "Завтра" or "28.11". */
export function groupSlotsByDay(slots: Slot[], labels: { today: string; tomorrow: string }) {
  const now = toKz(new Date().toISOString());
  const tomorrow = new Date(now.getTime() + 86400000);
  const groups = new Map<string, { label: string; slots: Slot[] }>();
  for (const s of slots) {
    const d = toKz(s.starts_at);
    const key = dayKey(d);
    const label =
      key === dayKey(now) ? labels.today
      : key === dayKey(tomorrow) ? labels.tomorrow
      : `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, { label, slots: [] });
    groups.get(key)!.slots.push(s);
  }
  return [...groups.values()];
}

export function slotLabel(slot: Pick<Slot, 'starts_at' | 'ends_at'>, labels: { today: string; tomorrow: string }) {
  const [g] = groupSlotsByDay([{ ...slot, id: '', capacity: 1, booked: 0 } as Slot], labels);
  return `${g.label}, ${slotRange(slot)}`;
}
