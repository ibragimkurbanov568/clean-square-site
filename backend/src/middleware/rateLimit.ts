/**
 * Rate limiting через KV-счётчики (допущение 10 в docs/01-spec.md): не более
 * RATE_LIMIT_MAX_REQUESTS запросов за RATE_LIMIT_WINDOW_SECONDS на ключ `ip:user_id`.
 * Подключается точечно к write-эндпоинтам (регистрация, заказ, отзыв, сообщение чата) —
 * не глобально на всё приложение, см. docs/04-architecture.md §6.
 */
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types/env';
import { apiError } from '../lib/http';

interface RateLimitOptions {
  /** Логическое имя ограничиваемого действия, участвует в KV-ключе (например "register"). */
  key: string;
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const max = Number(c.env.RATE_LIMIT_MAX_REQUESTS || '100');
    const windowSeconds = Number(c.env.RATE_LIMIT_WINDOW_SECONDS || '60');

    const ip = c.req.header('cf-connecting-ip') ?? 'unknown-ip';
    // user_id недоступен до аутентификации на некоторых маршрутах — используем IP как базовый
    // идентификатор; requireAuth-протектед роуты могут переопределить это через c.set('userId').
    const identity = c.get('userId') ?? ip;
    const kvKey = `ratelimit:${options.key}:${identity}`;

    const current = await c.env.CACHE.get(kvKey);
    const count = current ? Number(current) : 0;

    if (count >= max) {
      return apiError(c, 429, 'rate_limited', 'Слишком много запросов. Попробуйте через минуту');
    }

    await c.env.CACHE.put(kvKey, String(count + 1), { expirationTtl: windowSeconds });
    await next();
  };
}
