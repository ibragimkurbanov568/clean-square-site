import type { CurrentUser } from './types';

/**
 * Гостевые intent-редиректы (docs/02-ux.md §3, ветки гостя F5/F6/F8): при попытке «Заказать» /
 * «Написать в чат» / «В избранное» гость направляется на /login с сохранённым намерением и
 * возвращается к тому же действию сразу после входа.
 */
export type GuestIntent = 'order' | 'chat' | 'favorite';

export interface BuildGuestLoginUrlInput {
  intent: GuestIntent;
  companyId: string;
  serviceId?: string;
  returnTo: string;
}

const INTENT_BANNERS: Record<GuestIntent, string> = {
  order: 'Чтобы оформить заказ, войдите или зарегистрируйтесь',
  chat: 'Чтобы написать компании, войдите или зарегистрируйтесь',
  favorite: 'Чтобы сохранить компанию в избранное, войдите или зарегистрируйтесь',
};

export function guestIntentBanner(intent: GuestIntent): string {
  return INTENT_BANNERS[intent];
}

export function buildGuestLoginUrl({ intent, companyId, serviceId, returnTo }: BuildGuestLoginUrlInput): string {
  const params = new URLSearchParams({ intent, companyId, returnTo });
  if (serviceId) params.set('serviceId', serviceId);
  return `/login?${params.toString()}`;
}

/** Куда вести пользователя (кабинет по умолчанию) после логина/регистрации без intent/returnTo. */
export function resolveDefaultHome(user: CurrentUser): string {
  return user.role === 'client' ? '/account/orders' : '/company';
}

/**
 * `returnTo` приходит из query-строки `/login`, которую пользователь может открыть по чужой
 * ссылке (например `/login?returnTo=%5Cevil.com`) — значение не проверялось перед передачей в
 * `navigate()`. `react-router-dom` 6.x подвержен известной open-redirect уязвимости через
 * обратный слэш в пути (`GHSA-wrjc-x8rr-h8h6`, см. `npm audit`, docs/09-audit.md — обновление
 * до 7.x — большая ломающая замена, вынесено отдельным решением владельца проекта). Эта
 * проверка — компенсирующий контроль на уровне приложения: принимаем только относительные пути
 * внутри SPA (начинаются ровно с одного `/`, не начинаются с `//`/`/\`, не содержат `\`, не
 * являются протоколом типа `javascript:`).
 */
function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.includes('\\')) return false;
  return true;
}

/**
 * Куда редиректить сразу после успешного логина/регистрации/2FA: либо назад на returnTo с
 * перенесённым intent (чтобы CompanyPage сразу продолжил действие), либо на returnTo без intent,
 * либо в кабинет по умолчанию для роли пользователя.
 */
export function resolvePostLoginTarget(search: string, user: CurrentUser): string {
  const params = new URLSearchParams(search);
  const rawReturnTo = params.get('returnTo');
  const returnTo = rawReturnTo && isSafeInternalPath(rawReturnTo) ? rawReturnTo : null;
  const intent = params.get('intent');
  const companyId = params.get('companyId');
  const serviceId = params.get('serviceId');

  if (returnTo && intent && companyId) {
    const target = new URLSearchParams({ intent, companyId });
    if (serviceId) target.set('serviceId', serviceId);
    return `${returnTo}?${target.toString()}`;
  }
  if (returnTo) return returnTo;
  return resolveDefaultHome(user);
}
