/**
 * Normalize Kazakhstan mobile numbers to E.164 (+77XXXXXXXXX).
 * Accepts "8 701 123 45 67", "+7 (701) 123-45-67", "7011234567".
 * Returns null when the number is not a valid KZ mobile.
 */
export function normalizeKzPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) return null;
  // KZ mobile operators use 70X, 74X, 75X, 76X, 77X ranges
  if (!/^7[0-8]\d{8}$/.test(digits)) return null;
  return `+7${digits}`;
}

/** +77011234567 -> "+7 701 123 45 67" */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const d = e164.replace(/\D/g, '');
  if (d.length !== 11) return e164;
  return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}
