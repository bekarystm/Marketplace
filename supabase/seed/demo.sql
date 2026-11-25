-- Demo data for trying the apps: one store in Taldykorgan with a small catalog.
-- Run once in the SQL editor (or via MCP). Safe to re-run (idempotent).
insert into public.stores (name, slug, description_ru, description_kk, address_line, lat, lng,
                           delivery_fee, free_delivery_from, min_order_amount, delivery_radius_m, is_active, phone)
values ('Демо Маркет', 'demo-market', 'Тестовый магазин для проверки приложения', 'Қолданбаны тексеруге арналған дүкен',
        'ул. Тауелсиздик, 1, Талдыкорган', 45.0156, 78.3739, 500, 10000, 1500, 8000, true, '+77282000000')
on conflict (slug) do nothing;

with s as (select id from public.stores where slug = 'demo-market'),
     c as (select id, slug from public.categories)
insert into public.products (store_id, category_id, sku, name_ru, name_kk, unit, is_weighted, qty_step, price, old_price, stock_qty)
select s.id, c.id, v.sku, v.name_ru, v.name_kk, v.unit::public.product_unit, v.weighted, v.step, v.price, v.old_price, v.stock
from s, (values
  ('demo-milk',    'dairy',             'Молоко 2.5% 1 л',          'Сүт 2.5% 1 л',            'pcs', false, 1,   650,  null, 100),
  ('demo-kefir',   'dairy',             'Кефир 3.2% 1 л',           'Кефир 3.2% 1 л',          'pcs', false, 1,   720,  790,  80),
  ('demo-eggs',    'dairy',             'Яйца С1, 10 шт',           'Жұмыртқа С1, 10 дана',    'pack', false, 1,  890,  null, 60),
  ('demo-cheese',  'dairy',             'Сыр Российский',           'Ресей ірімшігі',          'kg',  true,  0.1, 4800, 5200, 15),
  ('demo-apple',   'fruits-vegetables', 'Яблоки Апорт',             'Апорт алмасы',            'kg',  true,  0.5, 950,  null, 50),
  ('demo-banana',  'fruits-vegetables', 'Бананы',                   'Банан',                   'kg',  true,  0.5, 1100, null, 40),
  ('demo-potato',  'fruits-vegetables', 'Картофель',                'Картоп',                  'kg',  true,  1,   290,  null, 200),
  ('demo-tomato',  'fruits-vegetables', 'Помидоры',                 'Қызанақ',                 'kg',  true,  0.5, 1400, 1600, 30),
  ('demo-bread',   'bakery',            'Хлеб пшеничный',           'Бидай наны',              'pcs', false, 1,   250,  null, 50),
  ('demo-baursak', 'bakery',            'Баурсаки, 500 г',          'Бауырсақ, 500 г',         'pack', false, 1,  900,  null, 20),
  ('demo-chicken', 'meat-poultry',      'Курица охлаждённая',       'Салқындатылған тауық',    'kg',  true,  0.5, 1900, null, 25),
  ('demo-beef',    'meat-poultry',      'Говядина мякоть',          'Сиыр еті',                'kg',  true,  0.5, 4200, null, 20),
  ('demo-rice',    'grocery',           'Рис Кызылорда, 1 кг',      'Қызылорда күріші, 1 кг',  'pcs', false, 1,   780,  null, 70),
  ('demo-buckwh',  'grocery',           'Гречка, 900 г',            'Қарақұмық, 900 г',        'pcs', false, 1,   690,  null, 70),
  ('demo-tea',     'tea-coffee',        'Чай чёрный, 100 пак.',     'Қара шай, 100 пак.',      'pcs', false, 1,   1650, 1890, 40),
  ('demo-water',   'drinks',            'Вода негазированная 1.5 л','Газсыз су 1.5 л',         'pcs', false, 1,   240,  null, 120),
  ('demo-juice',   'drinks',            'Сок яблочный 1 л',         'Алма шырыны 1 л',         'pcs', false, 1,   650,  null, 50),
  ('demo-choco',   'sweets',            'Шоколад Казахстан, 100 г', 'Қазақстан шоколады, 100 г','pcs', false, 1,  590,  null, 60)
) as v(sku, cat, name_ru, name_kk, unit, weighted, step, price, old_price, stock)
join c on c.slug = v.cat
on conflict (store_id, sku) do nothing;

insert into public.promo_codes (code, description, discount_type, discount_value, max_discount, min_order_amount, first_order_only)
values ('START10', 'Скидка 10% на первый заказ', 'percent', 10, 1000, 3000, true)
on conflict do nothing;
