import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, as, createUser, rejects } from './harness.mjs';

// Taldykorgan center ≈ 45.0156, 78.3739
const STORE_POS = { lat: 45.0156, lng: 78.3739 };
const NEAR = { lat: 45.0300, lng: 78.3900 }; // ~2 km
const ALMATY = { lat: 43.2389, lng: 76.8897 }; // out of zone

let db;
const u = {};
const ids = {};

const num = (v) => Number(v);

before(async () => {
  db = await createDb();
  u.admin = await createUser(db, { role: 'admin', fullName: 'Admin' });
  u.client = await createUser(db, { fullName: 'Айгерим' });
  u.client2 = await createUser(db, { fullName: 'Other client' });
  u.manager = await createUser(db, { fullName: 'Manager' });
  u.picker = await createUser(db, { fullName: 'Picker' });
  u.courier = await createUser(db, { fullName: 'Courier' });
  u.courier2 = await createUser(db, { fullName: 'Courier 2' });

  // admin creates a store via RLS (not superuser)
  const [store] = await as(db, u.admin, `
    insert into public.stores (name, slug, address_line, lat, lng, delivery_fee, free_delivery_from,
                               min_order_amount, delivery_radius_m, is_active)
    values ('Magnum Талдыкорган', 'magnum-tdk', 'ул. Тауелсиздик, 1', $1, $2, 500, 10000, 1000, 7000, true)
    returning id`, [STORE_POS.lat, STORE_POS.lng]);
  ids.store = store.id;

  const [inactive] = await as(db, u.admin, `
    insert into public.stores (name, slug, address_line, lat, lng) values ('Hidden', 'hidden', '-', 45, 78) returning id`);
  ids.inactiveStore = inactive.id;

  await as(db, u.admin, `insert into public.store_staff (store_id, user_id, role) values ($1, $2, 'manager')`,
    [ids.store, u.manager]);
  // manager adds a picker (allowed only for role picker)
  await as(db, u.manager, `insert into public.store_staff (store_id, user_id, role) values ($1, $2, 'picker')`,
    [ids.store, u.picker]);

  const [cat] = await as(db, null, `select id from public.categories where slug = 'dairy'`);
  ids.category = cat.id;

  // manager creates products
  const products = await as(db, u.manager, `
    insert into public.products (store_id, category_id, sku, name_ru, name_kk, unit, price, stock_qty, is_weighted, qty_step)
    values
      ($1, $2, 'milk', 'Молоко 2.5% 1л', 'Сүт 2.5% 1л', 'pcs', 650, 100, false, 1),
      ($1, $2, 'cheese', 'Сыр Российский', 'Ресей ірімшігі', 'kg', 4800, 20, true, 0.1),
      ($1, $2, 'kefir', 'Кефир 1л', 'Кефир 1л', 'pcs', 700, 50, false, 1),
      ($1, $2, 'kefir2', 'Кефир 3.2% 1л', 'Кефир 3.2% 1л', 'pcs', 750, 50, false, 1)
    returning id, sku`, [ids.store, ids.category]);
  for (const p of products) ids[p.sku] = p.id;

  await db.query(`insert into public.promo_codes (code, discount_type, discount_value, max_discount, min_order_amount)
                  values ('WELCOME10', 'percent', 10, 500, 2000)`);
});

test('anon can browse active stores and products, but not inactive stores', async () => {
  const stores = await as(db, null, `select id from public.stores`);
  assert.deepEqual(stores.map((s) => s.id), [ids.store]);
  const products = await as(db, null, `select count(*)::int as n from public.products`);
  assert.equal(products[0].n, 4);
  await rejects(as(db, null, `select * from public.promo_codes`), 'permission denied');
  const promos = await as(db, u.client, `select * from public.promo_codes`);
  assert.equal(promos.length, 0, 'promo codes must not be listable by clients');
});

test('profile is auto-created and user cannot escalate own role or bonuses', async () => {
  const [me] = await as(db, u.client, `select full_name, role from public.profiles where id = $1`, [u.client]);
  assert.equal(me.full_name, 'Айгерим');
  assert.equal(me.role, 'client');
  await as(db, u.client, `update public.profiles set full_name = 'Айгерим К.' where id = $1`, [u.client]);
  await rejects(as(db, u.client, `update public.profiles set role = 'admin' where id = $1`, [u.client]), 'permission denied');
  await rejects(as(db, u.client, `update public.profiles set bonus_balance = 99999 where id = $1`, [u.client]), 'permission denied');
  const others = await as(db, u.client, `select id from public.profiles where id <> $1`, [u.client]);
  assert.equal(others.length, 0);
});

test('manager cannot change commission or activate store; can edit description', async () => {
  await as(db, u.manager, `update public.stores set description_ru = 'Лучший магазин' where id = $1`, [ids.store]);
  await rejects(as(db, u.manager, `update public.stores set commission_percent = 1 where id = $1`, [ids.store]),
    'only_admin_can_change_field');
  await rejects(as(db, u.manager, `update public.stores set is_active = false where id = $1`, [ids.store]),
    'only_admin_can_change_field');
  await rejects(as(db, u.manager, `insert into public.store_staff (store_id, user_id, role) values ($1, $2, 'manager')`,
    [ids.store, u.client2]), 'row-level security');
});

test('client places a cash order from cart with promo code', async () => {
  const [addr] = await as(db, u.client, `
    insert into public.addresses (user_id, address_line, lat, lng, apartment)
    values ($1, 'мкр Жастар, 12', $2, $3, '45') returning id`, [u.client, NEAR.lat, NEAR.lng]);
  ids.address = addr.id;
  const [far] = await as(db, u.client, `
    insert into public.addresses (user_id, address_line, lat, lng) values ($1, 'Алматы', $2, $3) returning id`,
    [u.client, ALMATY.lat, ALMATY.lng]);
  ids.farAddress = far.id;

  await as(db, u.client, `insert into public.cart_items (user_id, product_id, quantity) values
    ($1, $2, 2), ($1, $3, 0.5), ($1, $4, 1)`, [u.client, ids.milk, ids.cheese, ids.kefir]);

  // 2*650 + 0.5*4800 + 700 = 4400 → promo 10% = 440, delivery 500 (free from 10000)
  const [preview] = await as(db, u.client, `select public.check_promo('welcome10', $1, 4400) as d`, [ids.store]);
  assert.equal(num(preview.d), 440);

  await rejects(as(db, u.client, `select * from public.place_order($1, $2, 'cash')`, [ids.store, ids.farAddress]),
    'address_out_of_delivery_zone');

  const [order] = await as(db, u.client, `
    select * from public.place_order($1, $2, 'cash', 'contact_me', null, 'WELCOME10', false, 'Позвонить в домофон')`,
    [ids.store, ids.address]);
  ids.order = order.id;
  assert.equal(order.status, 'placed');
  assert.equal(num(order.items_total), 4400);
  assert.equal(num(order.discount_amount), 440);
  assert.equal(num(order.delivery_fee), 500);
  assert.equal(num(order.total), 4460);
  assert.ok(Number(order.number) >= 1000);

  const cart = await as(db, u.client, `select * from public.cart_items`);
  assert.equal(cart.length, 0, 'cart cleared');
  const [stock] = await db.query(`select stock_qty from public.products where id = $1`, [ids.cheese]).then((r) => r.rows);
  assert.equal(num(stock.stock_qty), 19.5);
  const chats = await as(db, u.client, `select * from public.chats where order_id = $1`, [ids.order]);
  assert.equal(chats.length, 1);
});

test('promo code cannot be reused and empty cart is rejected', async () => {
  await as(db, u.client, `insert into public.cart_items (user_id, product_id, quantity) values ($1, $2, 5)`,
    [u.client, ids.milk]);
  await rejects(as(db, u.client, `select * from public.place_order($1, $2, 'cash', 'contact_me', null, 'WELCOME10')`,
    [ids.store, ids.address]), 'promo_already_used');
  await as(db, u.client, `delete from public.cart_items where user_id = $1`, [u.client]);
  await rejects(as(db, u.client, `select * from public.place_order($1, $2, 'cash')`, [ids.store, ids.address]),
    'cart_empty');
});

test('other users cannot see the order; store staff can', async () => {
  assert.equal((await as(db, u.client2, `select * from public.orders`)).length, 0);
  assert.equal((await as(db, u.client2, `select * from public.order_items`)).length, 0);
  assert.equal((await as(db, u.courier, `select * from public.orders`)).length, 0);
  assert.equal((await as(db, u.picker, `select * from public.orders`)).length, 1);
  // staff sees client name for the order
  const [p] = await as(db, u.picker, `select full_name from public.profiles where id = $1`, [u.client]);
  assert.equal(p.full_name, 'Айгерим К.');
});

test('client cannot accept own order; direct order updates are blocked', async () => {
  await rejects(as(db, u.client, `select * from public.update_order_status($1, 'accepted')`, [ids.order]),
    'transition_not_allowed');
  await rejects(as(db, u.client, `update public.orders set total = 1 where id = $1`, [ids.order]), 'permission denied');
  await rejects(as(db, u.client, `insert into public.order_items (order_id, name, unit, price, quantity) values ($1, 'x', 'pcs', 1, 1)`, [ids.order]), 'permission denied');
});

test('courier registration: pending courier cannot go online until admin approves', async () => {
  await as(db, u.courier, `insert into public.couriers (user_id, vehicle, iin) values ($1, 'bicycle', '990101300123')`,
    [u.courier]);
  await rejects(as(db, u.courier, `update public.couriers set is_online = true where user_id = $1`, [u.courier]),
    'courier_not_approved');
  await rejects(as(db, u.courier, `update public.couriers set status = 'approved' where user_id = $1`, [u.courier]),
    'permission denied');
  await rejects(as(db, u.courier, `select public.admin_review_courier($1, 'approved')`, [u.courier]), 'forbidden');

  await as(db, u.admin, `select public.admin_review_courier($1, 'approved')`, [u.courier]);
  await as(db, u.courier, `update public.couriers set is_online = true where user_id = $1`, [u.courier]);
  await as(db, u.courier, `insert into public.courier_locations (courier_id, lat, lng) values ($1, 45.02, 78.38)`,
    [u.courier]);
  const [prof] = await db.query(`select role from public.profiles where id = $1`, [u.courier]).then((r) => r.rows);
  assert.equal(prof.role, 'courier');

  await as(db, u.courier2, `insert into public.couriers (user_id) values ($1)`, [u.courier2]);
  await as(db, u.admin, `select public.admin_review_courier($1, 'approved')`, [u.courier2]);
  await as(db, u.courier2, `update public.couriers set is_online = true where user_id = $1`, [u.courier2]);
});

test('store accepts, courier takes the order, second courier cannot', async () => {
  await rejects(as(db, u.courier, `select * from public.courier_accept_order($1)`, [ids.order]), 'order_already_taken');

  const [acc] = await as(db, u.manager, `select * from public.update_order_status($1, 'accepted')`, [ids.order]);
  assert.equal(acc.status, 'accepted');

  const avail = await as(db, u.courier, `select * from public.courier_available_orders()`);
  assert.equal(avail.length, 1);
  assert.equal(avail[0].store_name, 'Magnum Талдыкорган');
  assert.ok(avail[0].distance_to_store_m > 0 && avail[0].distance_to_store_m < 3000);
  await rejects(as(db, u.client, `select * from public.courier_available_orders()`), 'courier_not_approved');

  const [taken] = await as(db, u.courier, `select * from public.courier_accept_order($1)`, [ids.order]);
  assert.equal(taken.courier_id, u.courier);
  await rejects(as(db, u.courier2, `select * from public.courier_accept_order($1)`, [ids.order]), 'order_already_taken');
  assert.equal((await as(db, u.courier, `select * from public.orders`)).length, 1);
});

test('picking with weighted item and substitution requiring client approval', async () => {
  await as(db, u.picker, `select * from public.update_order_status($1, 'picking')`, [ids.order]);
  const items = await as(db, u.picker, `select id, product_id from public.order_items where order_id = $1`, [ids.order]);
  const item = (pid) => items.find((i) => i.product_id === pid).id;

  await as(db, u.picker, `select * from public.picker_update_item($1, 'picked')`, [item(ids.milk)]);
  // weighted: ordered 0.5 kg, actually 0.62 kg
  await as(db, u.picker, `select * from public.picker_update_item($1, 'picked', 0.62)`, [item(ids.cheese)]);
  // kefir replaced by kefir2 (policy contact_me -> needs client approval)
  const [repl] = await as(db, u.picker, `select * from public.picker_update_item($1, 'replaced', null, $2)`,
    [item(ids.kefir), ids.kefir2]);
  assert.equal(repl.replacement_approved, null);

  await rejects(as(db, u.picker, `select * from public.update_order_status($1, 'ready')`, [ids.order]),
    'items_not_processed');
  await rejects(as(db, u.client2, `select * from public.client_respond_replacement($1, true)`, [item(ids.kefir)]),
    'item_not_found');
  await as(db, u.client, `select * from public.client_respond_replacement($1, true)`, [item(ids.kefir)]);

  const [ready] = await as(db, u.picker, `select * from public.update_order_status($1, 'ready')`, [ids.order]);
  // 1300 + 0.62*4800=2976 + 750 = 5026; discount 440 kept; delivery 500
  assert.equal(num(ready.items_total), 5026);
  assert.equal(num(ready.total), 5086);
});

test('client sees courier location while order is active', async () => {
  const locs = await as(db, u.client, `select lat, lng from public.courier_locations`);
  assert.equal(locs.length, 1);
  assert.equal((await as(db, u.client2, `select * from public.courier_locations`)).length, 0);
});

test('order chat: participants can write, outsiders cannot', async () => {
  const [chat] = await as(db, u.client, `select id from public.chats where order_id = $1`, [ids.order]);
  await as(db, u.client, `insert into public.chat_messages (chat_id, sender_id, body) values ($1, $2, 'Здравствуйте!')`,
    [chat.id, u.client]);
  await as(db, u.courier, `insert into public.chat_messages (chat_id, sender_id, body) values ($1, $2, 'Еду')`,
    [chat.id, u.courier]);
  await rejects(as(db, u.client2, `insert into public.chat_messages (chat_id, sender_id, body) values ($1, $2, 'spam')`,
    [chat.id, u.client2]), 'row-level security');
  assert.equal((await as(db, u.picker, `select * from public.chat_messages`)).length, 2);
  assert.equal((await as(db, u.client2, `select * from public.chat_messages`)).length, 0);
});

test('courier delivers: cash marked paid, bonuses earned, review updates rating', async () => {
  await rejects(as(db, u.courier2, `select * from public.update_order_status($1, 'delivering')`, [ids.order]),
    'transition_not_allowed');
  await as(db, u.courier, `select * from public.update_order_status($1, 'delivering')`, [ids.order]);
  const [done] = await as(db, u.courier, `select * from public.update_order_status($1, 'delivered')`, [ids.order]);
  assert.equal(done.status, 'delivered');
  assert.equal(done.payment_status, 'paid');
  // 2% of (5026 - 440) = 91.72 → floor 91
  assert.equal(num(done.bonus_earned), 91);

  const [me] = await as(db, u.client, `select bonus_balance from public.profiles where id = $1`, [u.client]);
  assert.equal(num(me.bonus_balance), 91);
  await rejects(as(db, u.courier, `select * from public.update_order_status($1, 'cancelled')`, [ids.order]),
    'order_finalized');

  await as(db, u.client, `insert into public.reviews (order_id, client_id, store_rating, courier_rating) values ($1, $2, 5, 4)`,
    [ids.order, u.client]);
  const [c] = await db.query(`select rating, deliveries_count from public.couriers where user_id = $1`, [u.courier]).then((r) => r.rows);
  assert.equal(num(c.rating), 4);
  assert.equal(c.deliveries_count, 1);
});

test('cancel by client refunds bonuses and restores stock', async () => {
  await as(db, u.client, `insert into public.cart_items (user_id, product_id, quantity) values ($1, $2, 3)`,
    [u.client, ids.milk]);
  const [before] = await db.query(`select stock_qty from public.products where id = $1`, [ids.milk]).then((r) => r.rows);
  // 1950 + 500 delivery; bonus up to 50% of 1950 = 975, balance 91 → spend 91
  const [o] = await as(db, u.client, `select * from public.place_order($1, $2, 'cash', 'remove', null, null, true)`,
    [ids.store, ids.address]);
  assert.equal(num(o.bonus_spent), 91);
  assert.equal(num(o.total), 1950 + 500 - 91);

  const [cancelled] = await as(db, u.client, `select * from public.update_order_status($1, 'cancelled', 'Передумал')`, [o.id]);
  assert.equal(cancelled.status, 'cancelled');
  const [me] = await as(db, u.client, `select bonus_balance from public.profiles where id = $1`, [u.client]);
  assert.equal(num(me.bonus_balance), 91);
  const [after] = await db.query(`select stock_qty from public.products where id = $1`, [ids.milk]).then((r) => r.rows);
  assert.equal(num(after.stock_qty), num(before.stock_qty));
});

test('card order waits for payment confirmation', async () => {
  await as(db, u.client2, `insert into public.addresses (user_id, address_line, lat, lng) values ($1, 'ул. Абая 5', $2, $3)`,
    [u.client2, NEAR.lat, NEAR.lng]);
  const [addr] = await as(db, u.client2, `select id from public.addresses`);
  await as(db, u.client2, `insert into public.cart_items (user_id, product_id, quantity) values ($1, $2, 20)`,
    [u.client2, ids.milk]);
  const [o] = await as(db, u.client2, `select * from public.place_order($1, $2, 'card')`, [ids.store, addr.id]);
  assert.equal(o.status, 'awaiting_payment');
  assert.equal(num(o.delivery_fee), 0, 'free delivery from 10000');

  await rejects(as(db, u.client2, `select * from public.confirm_card_payment($1, 'test', 'x', 13000)`, [o.id]),
    'permission denied');
  await rejects(as(db, u.manager, `select * from public.update_order_status($1, 'accepted')`, [o.id]),
    'transition_not_allowed');

  const [paid] = await db.query(`select * from public.confirm_card_payment($1, 'test', 'pay_1', 13000)`, [o.id]).then((r) => r.rows);
  assert.equal(paid.status, 'placed');
  assert.equal(paid.payment_status, 'paid');
  const pays = await as(db, u.client2, `select * from public.payments`);
  assert.equal(pays.length, 1);
});

test('stock check: cannot order more than available', async () => {
  await as(db, u.client, `insert into public.cart_items (user_id, product_id, quantity) values ($1, $2, 1000)`,
    [u.client, ids.kefir]);
  await rejects(as(db, u.client, `select * from public.place_order($1, $2, 'cash')`, [ids.store, ids.address]),
    'items_unavailable');
});

test('admin helpers: find user by phone and staff profiles are restricted', async () => {
  const [clientProfile] = await db.query(`select phone from public.profiles where id = $1`, [u.client]).then((r) => r.rows);
  const asAdmin = await as(db, u.admin, `select * from public.find_profile_by_phone($1)`, [clientProfile.phone]);
  assert.equal(asAdmin.length, 1);
  const asManager = await as(db, u.manager, `select * from public.find_profile_by_phone($1)`, [clientProfile.phone]);
  assert.equal(asManager.length, 1);
  const asClient = await as(db, u.client2, `select * from public.find_profile_by_phone($1)`, [clientProfile.phone]);
  assert.equal(asClient.length, 0, 'regular users cannot look up phones');
  await rejects(as(db, null, `select * from public.find_profile_by_phone($1)`, [clientProfile.phone]), 'permission denied');

  const staff = await as(db, u.manager, `select * from public.staff_profiles($1)`, [ids.store]);
  assert.equal(staff.length, 2);
  assert.equal((await as(db, u.picker, `select * from public.staff_profiles($1)`, [ids.store])).length, 0);
});

test('starter categories are seeded', async () => {
  const rows = await as(db, null, `select slug from public.categories where slug in ('dairy', 'fruits-vegetables', 'pets')`);
  assert.ok(rows.length >= 2);
});

test('notifications are generated for order events', async () => {
  const clientNotes = await as(db, u.client, `select title, body, data from public.notifications order by created_at`);
  const bodies = clientNotes.map((n) => n.body);
  assert.ok(bodies.includes('Магазин принял заказ'), 'client notified on accept');
  assert.ok(bodies.includes('Заказ доставлен. Приятного аппетита!'), 'client notified on delivery');
  assert.ok(bodies.some((b) => b.includes('→ Кефир 3.2% 1л')), 'client notified about replacement');

  const staffNotes = await as(db, u.picker, `select title from public.notifications`);
  assert.ok(staffNotes.some((n) => n.title.startsWith('Новый заказ')), 'staff notified about new order');
  const courierNotes = await as(db, u.courier, `select title from public.notifications`);
  assert.ok(courierNotes.some((n) => n.title.endsWith('собран')), 'courier notified when ready');

  // users only see their own notifications and can only mark them read
  assert.equal((await as(db, u.client2, `select * from public.notifications where user_id = $1`, [u.client])).length, 0);
  await rejects(as(db, u.client, `update public.notifications set title = 'x'`), 'permission denied');
  await as(db, u.client, `update public.notifications set read_at = now()`);
});

test('push webhook: notifications are forwarded to send-push only when the secret is configured', async () => {
  const before = (await db.query(`select count(*)::int n from net.calls`)).rows[0].n;
  await db.query(`select public._notify($1, 'no secret yet', null, '{}')`, [u.client]);
  assert.equal((await db.query(`select count(*)::int n from net.calls`)).rows[0].n, before, 'skipped without secret');

  await db.query(`insert into vault.decrypted_secrets values ('push_webhook_secret', 'shh')`);
  await db.query(`select public._notify($1, 'Заказ', 'Курьер в пути', '{"order_id":"x"}')`, [u.client]);
  const { rows } = await db.query(`select url, headers, body from net.calls order by id desc limit 1`);
  assert.match(rows[0].url, /\/functions\/v1\/send-push$/);
  assert.equal(rows[0].headers['x-webhook-secret'], 'shh');
  assert.equal(rows[0].body.type, 'INSERT');
  assert.equal(rows[0].body.record.body, 'Курьер в пути');
});

test('profile phone is normalized to E.164 even when auth stores it without "+"', async () => {
  const id = await createUser(db, { phone: '77017778899' });
  const [p] = (await db.query(`select phone from public.profiles where id = $1`, [id])).rows;
  assert.equal(p.phone, '+77017778899');
  const found = await as(db, u.admin, `select id from public.find_profile_by_phone('+77017778899')`);
  assert.equal(found.length, 1);
});

test('admin can deliver an order without a courier; store staff cannot', async () => {
  await as(db, u.client, `delete from public.cart_items where user_id = $1`, [u.client]);
  await as(db, u.client, `insert into public.cart_items (user_id, product_id, quantity) values ($1, $2, 3)`, [u.client, ids.milk]);
  const [o] = await as(db, u.client, `select * from public.place_order($1, $2, 'cash')`, [ids.store, ids.address]);
  await as(db, u.manager, `select public.update_order_status($1, 'accepted')`, [o.id]);
  await as(db, u.manager, `select public.update_order_status($1, 'picking')`, [o.id]);
  const items = await as(db, u.manager, `select id from public.order_items where order_id = $1`, [o.id]);
  for (const i of items) await as(db, u.manager, `select public.picker_update_item($1, 'picked')`, [i.id]);
  await as(db, u.manager, `select public.update_order_status($1, 'ready')`, [o.id]);

  await rejects(as(db, u.manager, `select public.update_order_status($1, 'delivering')`, [o.id]), 'transition_not_allowed');
  const [d1] = await as(db, u.admin, `select * from public.update_order_status($1, 'delivering')`, [o.id]);
  assert.equal(d1.status, 'delivering');
  const [d2] = await as(db, u.admin, `select * from public.update_order_status($1, 'delivered')`, [o.id]);
  assert.equal(d2.status, 'delivered');
  assert.equal(d2.payment_status, 'paid');
  assert.equal(d2.courier_id, null);
});

test('staff notification shows a formatted total', async () => {
  const rows = (await db.query(`select body from public.notifications where title like 'Новый заказ%' order by created_at desc limit 1`)).rows;
  assert.match(rows[0].body, /^Сумма [\d ]+ ₸$/);
  assert.equal((await db.query(`select public._fmt_tenge(12500.5) as v`)).rows[0].v, '12 501 ₸');
});
