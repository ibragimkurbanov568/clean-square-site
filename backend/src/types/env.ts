/**
 * Типы окружения Cloudflare Workers (биндинги + переменные + секреты).
 * Источник состава биндингов — backend/wrangler.toml.
 * Бэкенд-инженер использует этот тип как generic-параметр Hono: `new Hono<{ Bindings: Env }>()`.
 */
export interface Env {
  // --- Биндинги инфраструктуры (см. wrangler.toml) ---
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  MEDIA: R2Bucket;
  ORDER_QUEUE: Queue<OrderNotificationMessage>;
  AI: Ai;
  /** Резерв на будущий апгрейд чата до Durable Objects + WebSocket, см. wrangler.toml. */
  CHAT_ROOM: DurableObjectNamespace;

  // --- Переменные (vars) ---
  ENVIRONMENT: 'development' | 'production';
  CORS_ORIGIN: string;
  RATE_LIMIT_MAX_REQUESTS: string;
  RATE_LIMIT_WINDOW_SECONDS: string;

  // --- Секреты (.dev.vars локально / `wrangler secret put` в проде) ---
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ENCRYPTION_KEY: string;
  RESEND_API_KEY: string;
  ADMIN_SECRET: string;
  AI_FORCE_FALLBACK: string;
}

/** Полезная нагрузка сообщения очереди «новый заказ → уведомление компании» (допущение 14). */
export interface OrderNotificationMessage {
  orderId: string;
  companyId: string;
  clientId: string;
  serviceId: string;
}
