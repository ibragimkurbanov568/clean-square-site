/** Модуль promotions — акции компании (F9). Контракт: docs/04-architecture.md §4.8. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { idParamSchema } from '../schemas/common';

export const promotionsRouter = new Hono<{ Bindings: Env }>();

const promotionInputSchema = z.object({
  title: z.string().min(1, 'Заполните это поле'),
  discountPercent: z.number().int().min(1).max(100),
  validUntil: z.string().date(),
});

promotionsRouter.get('/companies/:id/promotions', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  // TODO(backend): только активные (valid_until >= сегодня) для публичного вызова без auth;
  // владелец-компания в своей панели видит и истёкшие (см. /company/promotions).
  return notImplemented(c, `GET /api/companies/${id}/promotions`);
});

promotionsRouter.post('/companies/:id/promotions', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = promotionInputSchema.parse(await c.req.json());
  return notImplemented(c, `POST /api/companies/${id}/promotions (${input.title})`);
});

promotionsRouter.patch('/promotions/:id', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = promotionInputSchema.partial().parse(await c.req.json());
  return notImplemented(c, `PATCH /api/promotions/${id} (${JSON.stringify(input)})`);
});

promotionsRouter.delete('/promotions/:id', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  return notImplemented(c, `DELETE /api/promotions/${id}`);
});

export default promotionsRouter;
