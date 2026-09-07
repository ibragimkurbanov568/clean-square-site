/** Модуль services — прайс-лист компании. Контракт: docs/04-architecture.md §4.4. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { idParamSchema } from '../schemas/common';

export const servicesRouter = new Hono<{ Bindings: Env }>();

const serviceInputSchema = z.object({
  name: z.string().min(1, 'Заполните это поле'),
  price: z.number().int().min(1),
  durationMin: z.number().int().min(1).optional(),
  description: z.string().optional(),
});

servicesRouter.get('/companies/:id/services', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  // TODO(backend): список услуг компании; пустой массив, если is_verified=0.
  return notImplemented(c, `GET /api/companies/${id}/services`);
});

servicesRouter.post('/companies/:id/services', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = serviceInputSchema.parse(await c.req.json());
  // TODO(backend): создать услугу (только владелец-компания, только is_verified=1).
  return notImplemented(c, `POST /api/companies/${id}/services (${input.name})`);
});

servicesRouter.patch('/services/:serviceId', requireAuth('company'), async (c) => {
  const { serviceId } = z.object({ serviceId: z.string().uuid() }).parse(c.req.param());
  const input = serviceInputSchema.partial().parse(await c.req.json());
  return notImplemented(c, `PATCH /api/services/${serviceId} (${JSON.stringify(input)})`);
});

servicesRouter.delete('/services/:serviceId', requireAuth('company'), async (c) => {
  const { serviceId } = z.object({ serviceId: z.string().uuid() }).parse(c.req.param());
  return notImplemented(c, `DELETE /api/services/${serviceId}`);
});

export default servicesRouter;
