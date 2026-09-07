import type { Context } from 'hono';

/**
 * Единый формат ошибки API — см. docs/04-architecture.md §4 "Контракты API" (раздел
 * "Общий формат ошибок"). Каждый route-хендлер должен возвращать ошибки только через эти
 * хелперы, чтобы фронтенд мог полагаться на одну форму ответа для любого эндпоинта.
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export function apiError(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 501,
  code: string,
  message: string,
  fields?: Record<string, string>,
) {
  const body: ApiErrorBody = { error: { code, message, ...(fields ? { fields } : {}) } };
  return c.json(body, status);
}

/**
 * Заглушка для ещё не реализованного бизнес-логикой эндпоинта. Контракт (путь/метод/тела)
 * уже зафиксирован в роутере и в docs/04-architecture.md — бэкенд-инженеру остаётся заменить
 * тело функции на реальную реализацию, не меняя сигнатуру ответа.
 */
export function notImplemented(c: Context, hint: string) {
  return apiError(c, 501, 'not_implemented', `Ещё не реализовано: ${hint}`);
}
