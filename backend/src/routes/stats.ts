/** Модуль stats — статистика компании (F10). Контракт: docs/04-architecture.md §4.9. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { requireAuth } from '../middleware/auth';

export const statsRouter = new Hono<{ Bindings: Env }>();

const statsQuerySchema = z.object({
  period: z.enum(['7', '30', '90']).default('30'),
});

statsRouter.get('/', requireAuth('company'), async (c) => {
  const input = statsQuerySchema.parse(c.req.query());
  // TODO(backend): агрегировать views_count/orders по статусам/средний чек/конверсию за период
  // (для 90 дней — по неделям, см. docs/02-ux.md "Много данных").
  return notImplemented(c, `GET /api/company/stats?period=${input.period}`);
});

export default statsRouter;
