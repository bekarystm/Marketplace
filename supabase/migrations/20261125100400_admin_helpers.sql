-- =====================================================================
-- Admin helpers + starter category tree
-- =====================================================================

-- Find a registered user by exact phone (to add store staff). Admins and store managers only.
create or replace function public.find_profile_by_phone(p_phone text)
returns table (id uuid, full_name text, phone text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.phone
    from public.profiles p
   where p.phone = p_phone
     and (
       public.is_admin()
       or exists (select 1 from public.store_staff s where s.user_id = (select auth.uid()) and s.role = 'manager')
     );
$$;

-- Names/phones of a store's staff, visible to admins and that store's managers.
create or replace function public.staff_profiles(p_store_id uuid)
returns table (id uuid, full_name text, phone text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.phone
    from public.store_staff s
    join public.profiles p on p.id = s.user_id
   where s.store_id = p_store_id
     and (public.is_admin() or public.is_store_manager(p_store_id));
$$;

-- Starter categories (can be edited in the admin panel)
insert into public.categories (slug, name_ru, name_kk, sort_order) values
  ('fruits-vegetables', 'Овощи и фрукты',            'Көкөністер мен жемістер', 10),
  ('dairy',             'Молочные продукты и яйца',  'Сүт өнімдері мен жұмыртқа', 20),
  ('meat-poultry',      'Мясо и птица',              'Ет және құс еті', 30),
  ('fish-seafood',      'Рыба и морепродукты',       'Балық және теңіз өнімдері', 40),
  ('bakery',            'Хлеб и выпечка',            'Нан және тоқаш өнімдері', 50),
  ('grocery',           'Бакалея',                   'Бакалея', 60),
  ('sausages-deli',     'Колбасы и деликатесы',      'Шұжықтар мен деликатестер', 70),
  ('frozen',            'Замороженные продукты',     'Мұздатылған өнімдер', 80),
  ('sweets',            'Сладости и снеки',          'Тәттілер мен снектер', 90),
  ('drinks',            'Напитки',                   'Сусындар', 100),
  ('tea-coffee',        'Чай и кофе',                'Шай және кофе', 110),
  ('baby',              'Детские товары',            'Балалар тауарлары', 120),
  ('household',         'Бытовая химия',             'Тұрмыстық химия', 130),
  ('hygiene',           'Гигиена и уход',            'Гигиена және күтім', 140),
  ('pets',              'Товары для животных',       'Жануарларға арналған тауарлар', 150)
on conflict (slug) do nothing;

revoke execute on function public.find_profile_by_phone(text) from public, anon;
revoke execute on function public.staff_profiles(uuid) from public, anon;
