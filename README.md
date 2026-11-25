# Marketplace

Маркетплейс доставки продуктов из супермаркетов Талдыкоргана (по модели Choco / Wolt).
Рабочее название, бренд и дизайн будут заменены после выбора стиля.

## Состав

| Путь | Что это |
|---|---|
| `apps/client` | Приложение клиента (Expo, iOS/Android): магазины, каталог, корзина, оформление, отслеживание, чат, бонусы |
| `apps/partner` | Приложение «Партнёр» для курьеров и сборщиков: анкета курьера, выход на линию, взятие заказов, доставка; очередь заказов магазина и сборка с заменами |
| `apps/admin` | Веб-админка (Next.js): заказы, магазины, товары и импорт CSV, сотрудники, слоты, курьеры, категории, промокоды, поддержка, пользователи, настройки |
| `packages/shared` | Общие типы БД, переводы ru/kk, форматирование (₸, телефоны KZ), расчёт корзины, тексты ошибок |
| `packages/mobile` | Общий код мобильных приложений: тема, UI, карта OSM, вход по WhatsApp, чат, пуши |
| `supabase/migrations` | Схема БД, RLS, бизнес-логика заказов (SQL-функции), уведомления |
| `supabase/functions` | Edge Functions: `send-push`, `whatsapp-otp`, `create-payment`, `payment-webhook` |
| `supabase/tests` | Тесты БД: настоящие миграции на PGlite (Postgres в Node) |
| `supabase/seed/demo.sql` | Демо-магазин с товарами для проверки |

## Стек

Expo SDK 58 (React Native, TypeScript, expo-router) · Next.js 16 · Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) · OpenStreetMap (Leaflet + Nominatim) · Expo Push · EAS Build · pnpm workspaces.

## Как устроено

- **Безопасность.** Права проверяет база через Row Level Security. Клиент видит только свои заказы, курьер только свои доставки, сборщик только заказы своего магазина. Цены, статусы, бонусы и промокоды меняются только через SQL-функции (`place_order`, `update_order_status`, `picker_update_item`, `courier_accept_order` и др.), поэтому подделать сумму из приложения нельзя.
- **Статусы заказа:** `awaiting_payment` (карта) → `placed` → `accepted` (магазин) → `picking` → `ready` → `delivering` (курьер) → `delivered`, или `cancelled` на любом шаге до доставки.
- **Замены.** Клиент выбирает поведение при отсутствии товара: заменить на похожий, связаться со мной или убрать. Сборщик предлагает замену, клиент подтверждает её в приложении. Итог пересчитывается, когда заказ собран (весовые товары считаются по фактическому весу).
- **Бонусы:** 2% начисляется за доставленный заказ, до 50% заказа можно оплатить бонусами. Оба значения настраиваются в админке.
- **Realtime.** Статус заказа, ход сборки, чат и позиция курьера обновляются мгновенно.

## Запуск

```bash
pnpm install
pnpm test              # unit-тесты + тесты БД (20 сценариев)
pnpm typecheck         # проверка типов всех пакетов

pnpm client            # Expo: клиентское приложение (Expo Go / эмулятор)
pnpm partner           # Expo: приложение партнёра
pnpm admin             # админка на http://localhost:3000
```

Фоновая геолокация курьера и пуши не работают в Expo Go. Для них нужна сборка через EAS:
```bash
cd apps/client   # или apps/partner
npx eas-cli login
npx eas-cli init           # создаст projectId для пушей
npx eas-cli build --profile development --platform android
```

## Что нужно настроить в Supabase

1. **Миграции.** Применить все файлы из `supabase/migrations` по порядку (через MCP или SQL Editor).
2. **Вход по WhatsApp.** Auth → Providers → Phone: включить. Auth → Hooks → *Send SMS hook*: указать HTTPS-функцию `whatsapp-otp` и сохранить секрет. Затем задать секреты функции:
   `SEND_SMS_HOOK_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE`, `WHATSAPP_TEMPLATE_LANG`.
   Для этого нужен WhatsApp Business (Meta) с одобренным шаблоном authentication.
3. **Пуши.** Database → Webhooks: на `INSERT` в `public.notifications` вызывать функцию `send-push` с заголовком `x-webhook-secret`. Секреты функции: `PUSH_WEBHOOK_SECRET` (и по желанию `EXPO_ACCESS_TOKEN`).
4. **Оплата картой.** Пока работает тестовый режим (`PAYMENT_PROVIDER=test`, `PAYMENT_TEST_SECRET`). Боевой эквайринг (ioka / Freedom Pay / CloudPayments) подключается в `create-payment` и `payment-webhook`, когда будет договор (нужен ИП или ТОО).
5. **Первый администратор.** Войти в админку по своему номеру, затем один раз выполнить в SQL Editor:
   `update public.profiles set role = 'admin' where phone = '+77XXXXXXXXX';`
6. **Демо-данные (по желанию):** выполнить `supabase/seed/demo.sql`.

## Импорт товаров (CSV)

Админка → Магазины → магазин → Товары → «Импорт CSV». Там же можно скачать шаблон. Колонки:
`sku,name_ru,name_kk,category,price,old_price,unit,is_weighted,qty_step,stock_qty,barcode,brand,image_url,description_ru`.
`category` — это код категории (например `dairy`). Товары с тем же `sku` обновляются, а не дублируются.

## Ограничения и что дальше

- **Карты.** Тайлы `tile.openstreetmap.org` и геокодер Nominatim годятся для разработки и небольшой нагрузки. Для продакшена нужен свой тайл-сервер или OSM-провайдер (MapTiler, Stadia и т.п.).
- **Персональные данные.** По закону РК данные граждан хранятся в Казахстане. Сейчас Supabase во Франкфурте. Перед публичным запуском нужно проконсультироваться с юристом или перенести данные на казахстанский хостинг.
- **Возвраты** при отмене оплаченного картой заказа обрабатываются вручную, пока не подключён эквайринг.
- **Дизайн временный.** Цвета и шрифты задаются в одном месте (`packages/mobile/src/theme.ts`), так что стиль легко заменить.
