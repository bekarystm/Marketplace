import type { Database } from './database.types.ts';

export type OrderStatus = Database['public']['Enums']['order_status'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Store = Database['public']['Tables']['stores']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Address = Database['public']['Tables']['addresses']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Courier = Database['public']['Tables']['couriers']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];
export type SubstitutionPolicy = Database['public']['Enums']['substitution_policy'];
export type AvailableOrder = Database['public']['Functions']['courier_available_orders']['Returns'][number];

/** Progress steps shown on the client's order tracking screen. */
export const ORDER_PROGRESS: OrderStatus[] = ['placed', 'accepted', 'picking', 'ready', 'delivering', 'delivered'];

export const ACTIVE_STATUSES: OrderStatus[] = [
  'awaiting_payment', 'placed', 'accepted', 'picking', 'ready', 'delivering',
];

export function isActive(status: OrderStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function progressIndex(status: OrderStatus): number {
  if (status === 'awaiting_payment') return 0;
  return ORDER_PROGRESS.indexOf(status);
}

export function clientCanCancel(status: OrderStatus): boolean {
  return status === 'awaiting_payment' || status === 'placed';
}

/** Next action available to store staff for a given status. */
export function staffNextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'placed': return 'accepted';
    case 'accepted': return 'picking';
    case 'picking': return 'ready';
    default: return null;
  }
}

/** Next action available to the assigned courier. */
export function courierNextStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'ready': return 'delivering';
    case 'delivering': return 'delivered';
    default: return null;
  }
}

export interface CartLine {
  product: Pick<Product, 'id' | 'price' | 'store_id'>;
  quantity: number;
}

export interface CartTotalsInput {
  lines: CartLine[];
  store: Pick<Store, 'delivery_fee' | 'free_delivery_from' | 'min_order_amount'>;
  discount?: number;
  bonusBalance?: number;
  useBonus?: boolean;
  bonusMaxSpendPercent?: number;
}

/** Client-side preview of totals. Mirrors public.place_order (server is the source of truth). */
export function calcCartTotals(input: CartTotalsInput) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const itemsTotal = round2(input.lines.reduce((s, l) => s + round2(Number(l.product.price) * l.quantity), 0));
  const freeFrom = input.store.free_delivery_from;
  const deliveryFee = freeFrom != null && itemsTotal >= Number(freeFrom) ? 0 : Number(input.store.delivery_fee);
  const discount = Math.min(input.discount ?? 0, itemsTotal);
  const maxPct = input.bonusMaxSpendPercent ?? 50;
  const bonus = input.useBonus
    ? Math.min(input.bonusBalance ?? 0, Math.floor(((itemsTotal - discount) * maxPct) / 100))
    : 0;
  const total = Math.max(itemsTotal + deliveryFee - discount - bonus, 0);
  const minOrderLeft = Math.max(Number(input.store.min_order_amount) - itemsTotal, 0);
  return { itemsTotal, deliveryFee, discount, bonus, total, minOrderLeft, canCheckout: itemsTotal > 0 && minOrderLeft === 0 };
}
