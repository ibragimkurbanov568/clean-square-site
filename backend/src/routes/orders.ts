/** Модуль orders — создание заказа и смена статуса (F5, F12). Контракт: docs/04-architecture.md §4.5. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';

export const ordersRouter = new Hono<{ Bindings: Env }>();

const createOrderSchema = z.object({
  companyId: z.string().uuid(),
  serviceId: z.string().uuid(),
});

const listOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['created', 'in_progress', 'done', 'cancelled']).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['in_progress', 'done', 'cancelled']),
});

ordersRouter.post('/', requireAuth('client'), rateLimit({ key: 'order-create' }), async (c) => {
  const input = createOrderSchema.parse(await c.req.json());
  // TODO(backend): создать заказ (status='created', total_price = копия services.price),
  // поставить уведомление в очередь (notifyNewOrder), см. F5.
  return notImplemented(c, `POST /api/orders (company=${input.companyId}, service=${input.serviceId})`);
});

ordersRouter.get('/', requireAuth(), async (c) => {
  const input = listOrdersQuerySchema.parse(c.req.query());
  // TODO(backend): для role=client — свои заказы (client_id=auth.sub); для role=company —
  // заказы своей компании (company_id по companies.user_id=auth.sub). Пагинация по 20 (F12).
  return notImplemented(c, `GET /api/orders?status=${input.status ?? 'all'}`);
});

ordersRouter.get('/:id', requireAuth(), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  return notImplemented(c, `GET /api/orders/${id}`);
});

ordersRouter.patch('/:id/status', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = updateStatusSchema.parse(await c.req.json());
  // TODO(backend): проверить допустимый переход created->in_progress->done|cancelled (400 иначе),
  // проставить completed_at при done, инкремент companies.orders_count при первом done.
  return notImplemented(c, `PATCH /api/orders/${id}/status -> ${input.status}`);
});

export default ordersRouter;
