/** Мелкие переиспользуемые утилиты форматирования и классов. */

/** Склеивает classNames, игнорируя falsy-значения (без внешней зависимости clsx). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Цена в рублях без копеек (допущение 15 ТЗ). */
export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormatter.format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateTimeFormatter.format(date);
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return timeFormatter.format(date);
}

/** Русское склонение существительного по числу: pluralizeRu(1, 'отзыв', 'отзыва', 'отзывов'). */
export function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1).toUpperCase();
}

/**
 * URL-параметр `/city/:citySlug` — намеренно НЕ приводит регистр к нижнему (баг, найденный QA:
 * `toLowerCase()` здесь ломал основной сценарий "3 клика до заказа" целиком — клик по подсказке
 * города/чипсу «Москва» вёл на `/city/москва`, `unslugifyCity` не восстанавливает исходный
 * регистр, а бэкенд сравнивает `companies.city` точным `=` без `COLLATE NOCASE` — кириллица не
 * приводится SQLite к нижнему регистру без ICU-расширения (см. комментарий в
 * `backend/src/routes/cities.ts`), поэтому `GET /api/companies?city=москва` не находил ни одной
 * компании, хотя они существуют под `city='Москва'`). Города приходят из
 * `/api/cities/suggest`/пользовательского ввода уже с корректным регистром — просто кодируем их
 * как есть, без искажения.
 */
export function slugifyCity(city: string): string {
  return encodeURIComponent(city.trim());
}

export function unslugifyCity(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  created: 'Создан',
  in_progress: 'В работе',
  done: 'Выполнен',
  cancelled: 'Отменён',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}
