/**
 * CleanLink API — точка входа Hono-приложения на Cloudflare Workers.
 * Полный контракт эндпоинтов — docs/04-architecture.md §4.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, OrderNotificationMessage } from './types/env';
import { errorHandler } from './middleware/errorHandler';
import { handleOrderNotification } from './lib/queue';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import citiesRouter from './routes/cities';
import companiesRouter from './routes/companies';
import servicesRouter from './routes/services';
import ordersRouter from './routes/orders';
import reviewsRouter from './routes/reviews';
import favoritesRouter from './routes/favorites';
import promotionsRouter from './routes/promotions';
import statsRouter from './routes/stats';
import chatsRouter from './routes/chats';
import uploadsRouter from './routes/uploads';
import adminRouter from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: (_origin, c) => c.env.CORS_ORIGIN,
    credentials: true,
    allowHeaders: ['Content-Type', 'X-Admin-Secret'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.onError(errorHandler);

app.route('/api/health', healthRouter);
app.route('/api/auth', authRouter);
app.route('/api/cities', citiesRouter);
app.route('/api/companies', companiesRouter);
// servicesRouter/reviewsRouter/promotionsRouter объявляют собственные вложенные пути
// (/companies/:id/services и т.д.) — монтируются в корень /api, а не под /api/companies,
// чтобы не дублировать префикс (см. сами файлы роутеров).
app.route('/api', servicesRouter);
app.route('/api', reviewsRouter);
app.route('/api', promotionsRouter);
app.route('/api/orders', ordersRouter);
app.route('/api/favorites', favoritesRouter);
app.route('/api/company/stats', statsRouter);
app.route('/api/chats', chatsRouter);
// uploadsRouter объявляет полные пути (/uploads/*, /media/:key) — см. сам файл роутера,
// поэтому монтируется в корень /api, а не под /api/uploads.
app.route('/api', uploadsRouter);
app.route('/api/admin', adminRouter);

app.notFound((c) =>
  c.json({ error: { code: 'not_found', message: 'Эндпоинт не найден' } }, 404),
);

/** Резерв на будущий апгрейд реалтайм-чата — см. backend/src/durable-objects/chat-room.ts. */
export { ChatRoom } from './durable-objects/chat-room';

export default {
  fetch: app.fetch,

  /**
   * Consumer очереди `cleanlink-order-notifications` (допущение 14). Если Queues недоступны в
   * окружении сборки, тот же `handleOrderNotification` вызывается синхронно из routes/orders.ts
   * через lib/queue.ts — результат для пользователя идентичен.
   */
  async queue(
    batch: MessageBatch<OrderNotificationMessage>,
    env: Env,
  ): Promise<void> {
    for (const message of batch.messages) {
      await handleOrderNotification(message.body, env);
      message.ack();
    }
  },
};
