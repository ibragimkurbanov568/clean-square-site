/** Модуль orders — создание заказа и смена статуса (F5, F12). Контракт: docs/04-architecture.md §4.5. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { apiError, paginate } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';
import { execute, newId, nowIso, queryAll, queryOne } from '../db/client';
import type { ServiceRow } from '../db/schema';
import { mapOrder, type OrderRowExtra } from '../lib/mappers';
import { canTransitionOrderStatus } from '../lib/orderStatus';
import { getCompanyBasicByUserId } from '../lib/queries';
import { notifyNewOrder } from '../lib/queue';

export const ordersRouter = new Hono<{ Bindings: Env }>();

const ORDER_SELECT = `
  SELECT o.*, c.name AS company_name, s.name AS service_name,
    CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS has_review
  FROM orders o
  JOIN companies c ON c.id = o.company_id
  JOIN services s ON s.id = o.service_id
  LEFT JOIN reviews r ON r.order_id = o.id
`;

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
  const db = c.env.DB;

  const service = await queryOne<ServiceRow & { is_verified: 0 | 1 }>(
    db,
    `SELECT s.*, c.is_verified AS is_verified
     FROM services s JOIN companies c ON c.id = s.company_id
     WHERE s.id = ? AND s.company_id = ?`,
    [input.serviceId, input.companyId],
  );
  if (!service) {
    return apiError(c, 400, 'invalid_reference', 'Указанная услуга или компания не найдена');
  }
  if (service.is_verified !== 1) {
    return apiError(c, 400, 'invalid_reference', 'Компания ещё не верифицирована — заказ недоступен');
  }

  const orderId = newId();
  const clientId = c.get('userId');
  await execute(
    db,
    `INSERT INTO orders (id, client_id, company_id, service_id, status, total_price, created_at)
     VALUES (?, ?, ?, ?, 'created', ?, ?)`,
    [orderId, clientId, input.companyId, input.serviceId, service.price, nowIso()],
  );
  await execute(db, 'UPDATE companies SET orders_count = orders_count + 1 WHERE id = ?', [
    input.companyId,
  ]);

  await notifyNewOrder(
    { orderId, companyId: input.companyId, clientId, serviceId: input.serviceId },
    c.env,
  );

  const created = await queryOne<OrderRowExtra>(db, `${ORDER_SELECT} WHERE o.id = ?`, [orderId]);
  if (!created) return apiError(c, 500, 'internal_error', 'Не удалось создать заказ');
  return c.json(mapOrder(created), 201);
});

ordersRouter.get('/', requireAuth(), async (c) => {
  const input = listOrdersQuerySchema.parse(c.req.query());
  const db = c.env.DB;
  const auth = c.get('auth');
  const offset = (input.page - 1) * input.limit;

  let scopeColumn: 'client_id' | 'company_id';
  let scopeValue: string;
  if (auth.role === 'client') {
    scopeColumn = 'client_id';
    scopeValue = c.get('userId');
  } else {
    const company = await getCompanyBasicByUserId(db, c.get('userId'));
    if (!company) return c.json(paginate([], input.page, input.limit, 0));
    scopeColumn = 'company_id';
    scopeValue = company.id;
  }

  const whereClauses = [`o.${scopeColumn} = ?`];
  const params: Array<string | number> = [scopeValue];
  if (input.status) {
    whereClauses.push('o.status = ?');
    params.push(input.status);
  }
  const where = `WHERE ${whereClauses.join(' AND ')}`;

  const total = await queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM orders o ${where}`,
    params,
  );
  const rows = await queryAll<OrderRowExtra>(
    db,
    `${ORDER_SELECT} ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, input.limit, offset],
  );

  return c.json(paginate(rows.map(mapOrder), input.page, input.limit, total?.count ?? 0));
});

ordersRouter.get('/:id', requireAuth(), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const db = c.env.DB;
  const auth = c.get('auth');

  const row = await queryOne<OrderRowExtra>(db, `${ORDER_SELECT} WHERE o.id = ?`, [id]);
  if (!row) return apiError(c, 404, 'not_found', 'Заказ не найден');

  if (auth.role === 'client') {
    if (row.client_id !== c.get('userId')) {
      return apiError(c, 403, 'forbidden', 'Это не ваш заказ');
    }
  } else {
    const company = await getCompanyBasicByUserId(db, c.get('userId'));
    if (!company || row.company_id !== company.id) {
      return apiError(c, 403, 'forbidden', 'Это не заказ вашей компании');
    }
  }

  return c.json(mapOrder(row));
});

ordersRouter.patch('/:id/status', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = updateStatusSchema.parse(await c.req.json());
  const db = c.env.DB;

  const row = await queryOne<OrderRowExtra>(db, `${ORDER_SELECT} WHERE o.id = ?`, [id]);
  if (!row) return apiError(c, 404, 'not_found', 'Заказ не найден');

  const company = await getCompanyBasicByUserId(db, c.get('userId'));
  if (!company || row.company_id !== company.id) {
    return apiError(c, 403, 'forbidden', 'Это не заказ вашей компании');
  }

  if (!canTransitionOrderStatus(row.status, input.status)) {
    return apiError(
      c,
      400,
      'invalid_transition',
      `Недопустимый переход статуса: ${row.status} → ${input.status}`,
    );
  }

  if (input.status === 'done') {
    await execute(db, 'UPDATE orders SET status = ?, completed_at = ? WHERE id = ?', [
      input.status,
      nowIso(),
      id,
    ]);
  } else {
    await execute(db, 'UPDATE orders SET status = ? WHERE id = ?', [input.status, id]);
  }

  const updated = await queryOne<OrderRowExtra>(db, `${ORDER_SELECT} WHERE o.id = ?`, [id]);
  if (!updated) return apiError(c, 500, 'internal_error', 'Не удалось обновить заказ');
  return c.json(mapOrder(updated));
});

export default ordersRouter;
