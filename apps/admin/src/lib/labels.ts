export const STATUS_RU: Record<string, string> = {
  awaiting_payment: 'Ждёт оплаты',
  placed: 'Новый',
  accepted: 'Принят',
  picking: 'Сборка',
  ready: 'Собран',
  delivering: 'В пути',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};
export const PAYMENT_RU: Record<string, string> = { card: 'Карта', cash: 'Наличные' };
export const PAYMENT_STATUS_RU: Record<string, string> = {
  pending: 'Не оплачен', paid: 'Оплачен', failed: 'Ошибка', refunded: 'Возврат',
};
export const COURIER_STATUS_RU: Record<string, string> = {
  pending: 'На проверке', approved: 'Одобрен', rejected: 'Отклонён', blocked: 'Заблокирован',
};
export const VEHICLE_RU: Record<string, string> = { foot: 'Пешком', bicycle: 'Велосипед', scooter: 'Самокат', car: 'Авто' };
export const ROLE_RU: Record<string, string> = {
  client: 'Клиент', courier: 'Курьер', picker: 'Сборщик', store_manager: 'Менеджер', admin: 'Администратор',
};
export const UNIT_RU: Record<string, string> = { pcs: 'шт', kg: 'кг', g: 'г', l: 'л', ml: 'мл', pack: 'уп' };
export const fmtDate = (s: string) =>
  new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
