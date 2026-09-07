/**
 * Модуль companies — поиск/карточка/ТОП-3/редактирование профиля/просмотры (F2-F4, F13).
 * Контракт: docs/04-architecture.md §4.3.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';

export const companiesRouter = new Hono<{ Bindings: Env }>();

const listQuerySchema = paginationQuerySchema.extend({
  city: z.string().min(1),
  sort: z.enum(['rating', 'price_asc', 'reviews']).default('rating'),
});

companiesRouter.get('/', async (c) => {
  const input = listQuerySchema.parse(c.req.query());
  // TODO(backend): список компаний города (без ТОП-3), пагинация по 12 (F2).
  return notImplemented(c, `GET /api/companies?city=${input.city}`);
});

companiesRouter.get('/top', async (c) => {
  const input = z.object({ city: z.string().min(1) }).parse(c.req.query());
  // TODO(backend): ТОП-3 по формуле rating_score = avg_rating*0.6 + normalized_orders*0.3 +
  // normalized_response_speed*0.1, min-max нормализация в пределах города (F3, допущение 17).
  return notImplemented(c, `GET /api/companies/top?city=${input.city}`);
});

companiesRouter.get('/:id', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  // TODO(backend): карточка компании; для is_verified=0 — ограниченный набор полей (без
  // services/promotions), см. F4 и правило "скрыто и на бэкенде, и на фронтенде".
  return notImplemented(c, `GET /api/companies/${id}`);
});

companiesRouter.patch('/:id', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  // TODO(backend): обновление профиля компании (только владелец, companies.user_id = auth.sub).
  return notImplemented(c, `PATCH /api/companies/${id}`);
});

companiesRouter.post('/:id/view', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  // TODO(backend): UPDATE companies SET views_count = views_count + 1 (F13).
  return notImplemented(c, `POST /api/companies/${id}/view`);
});

export default companiesRouter;
