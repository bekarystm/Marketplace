import type { Locale } from './i18n.ts';

// Maps exception codes raised by database functions to user-facing messages.
const MESSAGES: Record<string, { ru: string; kk: string }> = {
  not_authenticated: { ru: 'Войдите в аккаунт', kk: 'Аккаунтқа кіріңіз' },
  user_blocked: { ru: 'Аккаунт заблокирован', kk: 'Аккаунт бұғатталған' },
  phone_required: { ru: 'Укажите номер телефона', kk: 'Телефон нөмірін көрсетіңіз' },
  store_unavailable: { ru: 'Магазин сейчас недоступен', kk: 'Дүкен қазір қолжетімсіз' },
  address_not_found: { ru: 'Адрес не найден', kk: 'Мекенжай табылмады' },
  address_out_of_delivery_zone: { ru: 'Магазин не доставляет по этому адресу', kk: 'Дүкен бұл мекенжайға жеткізбейді' },
  items_unavailable: { ru: 'Некоторых товаров нет в наличии', kk: 'Кейбір тауарлар қолда жоқ' },
  cart_empty: { ru: 'Корзина пуста', kk: 'Себет бос' },
  min_order_amount_not_reached: { ru: 'Сумма меньше минимального заказа', kk: 'Сома ең аз тапсырыстан кем' },
  slot_unavailable: { ru: 'Это время уже занято', kk: 'Бұл уақыт бос емес' },
  promo_invalid: { ru: 'Промокод не найден', kk: 'Промокод табылмады' },
  promo_expired: { ru: 'Срок действия промокода истёк', kk: 'Промокодтың мерзімі өтті' },
  promo_wrong_store: { ru: 'Промокод не действует в этом магазине', kk: 'Промокод бұл дүкенде жарамсыз' },
  promo_min_order_amount: { ru: 'Сумма заказа слишком мала для промокода', kk: 'Промокод үшін тапсырыс сомасы аз' },
  promo_exhausted: { ru: 'Промокод больше не действует', kk: 'Промокод енді жарамсыз' },
  promo_already_used: { ru: 'Вы уже использовали этот промокод', kk: 'Сіз бұл промокодты қолдандыңыз' },
  promo_first_order_only: { ru: 'Промокод только для первого заказа', kk: 'Промокод тек алғашқы тапсырысқа' },
  order_not_found: { ru: 'Заказ не найден', kk: 'Тапсырыс табылмады' },
  order_finalized: { ru: 'Заказ уже завершён', kk: 'Тапсырыс аяқталды' },
  transition_not_allowed: { ru: 'Это действие сейчас недоступно', kk: 'Бұл әрекет қазір қолжетімсіз' },
  items_not_processed: { ru: 'Не все товары обработаны', kk: 'Барлық тауар өңделмеген' },
  courier_not_assigned: { ru: 'Курьер ещё не назначен', kk: 'Курьер әлі тағайындалмаған' },
  courier_not_approved: { ru: 'Анкета курьера ещё не одобрена', kk: 'Курьер сауалнамасы әлі мақұлданбаған' },
  courier_not_online: { ru: 'Сначала выйдите на линию', kk: 'Алдымен желіге шығыңыз' },
  courier_busy: { ru: 'Сначала завершите текущий заказ', kk: 'Алдымен ағымдағы тапсырысты аяқтаңыз' },
  order_already_taken: { ru: 'Заказ уже взял другой курьер', kk: 'Тапсырысты басқа курьер алды' },
  substitution_not_allowed: { ru: 'Клиент запретил замены', kk: 'Клиент ауыстыруға рұқсат бермеді' },
  replacement_unavailable: { ru: 'Товар для замены недоступен', kk: 'Ауыстыру тауары қолжетімсіз' },
  forbidden: { ru: 'Недостаточно прав', kk: 'Құқық жеткіліксіз' },
};

/** Convert a Supabase/Postgres error into a localized message. */
export function errorMessage(error: unknown, locale: Locale = 'ru'): string {
  const raw = typeof error === 'object' && error && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error ?? '');
  const code = raw.split(':')[0].trim();
  const known = MESSAGES[code];
  if (known) return known[locale];
  return locale === 'kk' ? 'Бір нәрсе дұрыс болмады' : 'Что-то пошло не так';
}
