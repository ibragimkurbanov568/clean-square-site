/** Модуль reviews — отзывы и ответы компании (F7). Контракт: docs/04-architecture.md §4.6. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';

export const reviewsRouter = new Hono<{ Bindings: Env }>();

const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Поставьте оценку от 1 до 5 звёзд').max(5),
  text: z.string().max(2000).optional().default(''),
});

const replySchema = z.object({
  text: z.string().min(1, 'Заполните это поле').max(2000),
});

const listReviewsQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['newest', 'oldest', 'rating_desc', 'rating_asc']).default('newest'),
});

reviewsRouter.post('/orders/:id/review', requireAuth('client'), rateLimit({ key: 'review-create' }), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = createReviewSchema.parse(await c.req.json());
  // TODO(backend): только для заказа status='done', принадлежащего auth.sub, один раз (409 иначе).
  // Перед сохранением текста — moderateReviewText (Workers AI / fallback).
  return notImplemented(c, `POST /api/orders/${id}/review (rating=${input.rating})`);
});

reviewsRouter.get('/companies/:id/reviews', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const query = listReviewsQuerySchema.parse(c.req.query());
  return notImplemented(c, `GET /api/companies/${id}/reviews?sort=${query.sort}`);
});

reviewsRouter.get('/account/reviews', requireAuth('client'), async (c) => {
  const query = paginationQuerySchema.parse(c.req.query());
  return notImplemented(c, `GET /api/account/reviews?page=${query.page}`);
});

reviewsRouter.post('/reviews/:id/reply', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = replySchema.parse(await c.req.json());
  // TODO(backend): только компания-владелец отзыва (reviews.company_id).
  return notImplemented(c, `POST /api/reviews/${id}/reply (${input.text.slice(0, 20)}...)`);
});

export default reviewsRouter;
