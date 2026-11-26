import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKzPhone, formatPhone } from './phone.ts';
import { formatMoney, formatQuantity, roundToStep, formatDistance } from './format.ts';
import { calcCartTotals, staffNextStatus, courierNextStatus, clientCanCancel, progressIndex } from './orders.ts';
import { errorMessage } from './errors.ts';
import { translate, localized } from './i18n.ts';

test('normalizeKzPhone', () => {
  assert.equal(normalizeKzPhone('8 701 123 45 67'), '+77011234567');
  assert.equal(normalizeKzPhone('+7 (747) 123-45-67'), '+77471234567');
  assert.equal(normalizeKzPhone('7771234567'), '+77771234567');
  assert.equal(normalizeKzPhone('12345'), null);
  assert.equal(normalizeKzPhone('+7 495 123 45 67'), null, 'Moscow landline is rejected');
  assert.equal(formatPhone('+77011234567'), '+7 701 123 45 67');
});

test('formatMoney / quantity / distance', () => {
  assert.equal(formatMoney(12500), '12 500 ₸');
  assert.equal(formatMoney('650.50'), '650,50 ₸');
  assert.equal(formatQuantity(0.5, 'kg'), '0,5 кг');
  assert.equal(formatQuantity(2, 'pcs', 'kk'), '2 дана');
  assert.equal(roundToStep(0.30000000000000004, 0.1), 0.3);
  assert.equal(formatDistance(850), '850 м');
  assert.equal(formatDistance(2400), '2,4 км');
});

test('calcCartTotals mirrors place_order', () => {
  const store = { delivery_fee: 500, free_delivery_from: 10000, min_order_amount: 1000 };
  const lines = [
    { product: { id: 'a', price: 650, store_id: 's' }, quantity: 2 },
    { product: { id: 'b', price: 4800, store_id: 's' }, quantity: 0.5 },
    { product: { id: 'c', price: 700, store_id: 's' }, quantity: 1 },
  ];
  const t = calcCartTotals({ lines, store, discount: 440 });
  assert.equal(t.itemsTotal, 4400);
  assert.equal(t.deliveryFee, 500);
  assert.equal(t.total, 4460);
  assert.equal(t.canCheckout, true);

  const withBonus = calcCartTotals({ lines: [lines[0]], store, bonusBalance: 5000, useBonus: true });
  assert.equal(withBonus.bonus, 650); // 50% of 1300
  const small = calcCartTotals({ lines: [{ ...lines[0], quantity: 1 }], store });
  assert.equal(small.minOrderLeft, 350);
  assert.equal(small.canCheckout, false);
  const free = calcCartTotals({ lines: [{ ...lines[1], quantity: 3 }], store });
  assert.equal(free.deliveryFee, 0);
});

test('status helpers', () => {
  assert.equal(staffNextStatus('placed'), 'accepted');
  assert.equal(staffNextStatus('ready'), null);
  assert.equal(courierNextStatus('ready'), 'delivering');
  assert.equal(clientCanCancel('picking'), false);
  assert.equal(progressIndex('delivered'), 5);
});

test('errorMessage maps db exceptions', () => {
  assert.equal(errorMessage({ message: 'items_unavailable: Молоко' }), 'Некоторых товаров нет в наличии');
  assert.equal(errorMessage({ message: 'promo_already_used' }, 'kk'), 'Сіз бұл промокодты қолдандыңыз');
  assert.equal(errorMessage(new Error('boom')), 'Что-то пошло не так');
});

test('i18n', () => {
  assert.equal(translate('ru', 'orders.number', { number: 1001 }), 'Заказ №1001');
  assert.equal(translate('kk', 'orders.number', { number: 1001 }), '№1001 тапсырыс');
  assert.equal(localized({ name_ru: 'Молоко', name_kk: 'Сүт' }, 'name', 'kk'), 'Сүт');
  assert.equal(localized({ name_ru: 'Молоко', name_kk: null }, 'name', 'kk'), 'Молоко');
});

test('distanceMeters', async () => {
  const { distanceMeters } = await import('./geo.ts');
  const store = { lat: 45.0156, lng: 78.3739 };
  const near = distanceMeters(store, { lat: 45.0126309, lng: 78.3698848 });
  assert.ok(near > 400 && near < 700, `expected ~600 m, got ${near}`);
  const far = distanceMeters(store, { lat: 46.1617456, lng: 80.9414322 });
  assert.ok(Math.abs(far - 237406) < 500, `expected ~237 km (PostGIS value), got ${far}`);
});

test('delivery slots are shown in Kazakhstan time (UTC+5)', async () => {
  const { slotRange, groupSlotsByDay } = await import('./slots.ts');
  // 07:00–09:00 UTC = 12:00–14:00 in Kazakhstan
  assert.equal(slotRange({ starts_at: '2026-11-27T07:00:00Z', ends_at: '2026-11-27T09:00:00Z' }), '12:00–14:00');
  const far = new Date(Date.now() + 5 * 86400000).toISOString();
  const groups = groupSlotsByDay([{ id: '1', starts_at: far, ends_at: far, capacity: 1, booked: 0 }], { today: 'T', tomorrow: 'M' });
  assert.match(groups[0].label, /^\d{2}\.\d{2}$/);
});
