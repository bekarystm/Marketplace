import type { Locale } from './i18n.ts';
import type { Database } from './database.types.ts';

type Unit = Database['public']['Enums']['product_unit'];

/** 12500 -> "12 500 ₸" (narrow no-break spaces, no decimals unless needed) */
export function formatMoney(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  const hasFraction = Math.round(value * 100) % 100 !== 0;
  const formatted = value.toLocaleString('ru-RU', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${formatted.replace(/\s/g, ' ')} ₸`;
}

const UNIT_LABELS: Record<Locale, Record<Unit, string>> = {
  ru: { pcs: 'шт', kg: 'кг', g: 'г', l: 'л', ml: 'мл', pack: 'уп' },
  kk: { pcs: 'дана', kg: 'кг', g: 'г', l: 'л', ml: 'мл', pack: 'қап' },
};

export function unitLabel(unit: Unit, locale: Locale = 'ru'): string {
  return UNIT_LABELS[locale][unit];
}

/** 0.5 kg -> "0,5 кг"; 2 pcs -> "2 шт" */
export function formatQuantity(qty: number | string, unit: Unit, locale: Locale = 'ru'): string {
  const value = Number(qty);
  const text = value.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
  return `${text} ${unitLabel(unit, locale)}`;
}

/** 850 -> "850 м", 2400 -> "2,4 км" */
export function formatDistance(meters: number | null | undefined, locale: Locale = 'ru'): string {
  if (meters == null) return '—';
  if (meters < 1000) return `${Math.round(meters)} ${locale === 'kk' ? 'м' : 'м'}`;
  const km = (meters / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
  return `${km} км`;
}

/** Round a quantity to the product's step (e.g. 0.1 kg) avoiding float noise. */
export function roundToStep(qty: number, step: number): number {
  const steps = Math.round(qty / step);
  return Number((steps * step).toFixed(3));
}

/**
 * Unique realtime channel name. Supabase reuses a channel with the same name, so two
 * screens subscribing to "order-123" at once would collide; a random suffix avoids it.
 */
export function channelName(base: string): string {
  return `${base}:${Math.random().toString(36).slice(2, 10)}`;
}
