/**
 * Проверка JWT access-токена из HttpOnly cookie. Кладёт payload в контекст (`c.set('auth', ...)`
 * и `c.set('userId', ...)` для использования rateLimit/роутами) — см. docs/04-architecture.md §6.
 */
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env } from '../types/env';
import { apiError } from '../lib/http';
import { ACCESS_COOKIE_NAME, verifyAccessToken, type AccessTokenPayload, type UserRole } from '../lib/jwt';

declare module 'hono' {
  interface ContextVariableMap {
    auth: AccessTokenPayload;
    userId: string;
  }
}

/** Требует валидный access-токен; опционально ограничивает по роли. */
export function requireAuth(...roles: UserRole[]): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const token = getCookie(c, ACCESS_COOKIE_NAME);
    if (!token) {
      return apiError(c, 401, 'unauthorized', 'Требуется авторизация');
    }

    try {
      const payload = await verifyAccessToken(token, c.env);
      if (roles.length > 0 && !roles.includes(payload.role)) {
        return apiError(c, 403, 'forbidden', 'Недостаточно прав для этого действия');
      }
      c.set('auth', payload);
      c.set('userId', payload.sub);
      await next();
    } catch {
      return apiError(c, 401, 'unauthorized', 'Сессия истекла, войдите снова');
    }
  };
}
