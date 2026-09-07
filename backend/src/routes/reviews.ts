/** Модуль reviews — отзывы и ответы компании (F7). Контракт: docs/04-architecture.md §4.6. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { apiError, paginate } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';
import { execute, newId, nowIso, queryAll, queryOne } from '../db/client';
import type { OrderRow } from '../db/schema';
import { mapReview, type ReviewRowExtra } from '../lib/mappers';
import { checkReviewEligibility } from '../lib/reviewEligibility';
import { moderateReviewText } from '../lib/ai';
import { getCompanyBasicById, getCompanyBasicByUserId } from '../lib/queries';

export const reviewsRouter = new Hono<{ Bindings: Env }>();

const REVIEW_SELECT = `
  SELECT rv.*, u.username AS client_username
  FROM reviews rv JOIN users u ON u.id = rv.client_id
`;

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

const SORT_SQL: Record<z.infer<typeof listReviewsQuerySchema>['sort'], string> = {
  newest: 'rv.created_at DESC',
  oldest: 'rv.created_at ASC',
  rating_desc: 'rv.rating DESC, rv.created_at DESC',
  rating_asc: 'rv.rating ASC, rv.created_at DESC',
};

reviewsRouter.post(
  '/orders/:id/review',
  requireAuth('client'),
  rateLimit({ key: 'review-create' }),
  async (c) => {
    const { id } = idParamSchema.parse(c.req.param());
    const input = createReviewSchema.parse(await c.req.json());
    const db = c.env.DB;

    const order = await queryOne<OrderRow>(db, 'SELECT * FROM orders WHERE id = ?', [id]);
    const existingReview = await queryOne<{ id: string }>(
      db,
      'SELECT id FROM reviews WHERE order_id = ?',
      [id],
    );

    const eligibility = checkReviewEligibility({
      order: order ? { clientId: order.client_id, status: order.status } : null,
      requestingClientId: c.get('userId'),
      hasExistingReview: existingReview !== null,
    });

    if (!eligibility.ok) {
      if (eligibility.error === 'not_found_or_forbidden') {
        return apiError(c, 403, 'forbidden', 'Заказ не найден или вам не принадлежит');
      }
      if (eligibility.error === 'invalid_status') {
        return apiError(c, 400, 'invalid_status', 'Отзыв можно оставить только после выполнения заказа');
      }
      return apiError(c, 409, 'conflict', 'Вы уже оставили отзыв к этому заказу');
    }

    const moderation = await moderateReviewText(input.text, c.env);
    if (!moderation.approved) {
      return apiError(c, 400, 'review_rejected', moderation.reason ?? 'Текст отзыва отклонён модерацией');
    }

    const reviewId = newId();
    // order гарантированно не null здесь — проверено checkReviewEligibility выше.
    const companyId = (order as OrderRow).company_id;
    await execute(
      db,
      `INSERT INTO reviews (id, order_id, client_id, company_id, rating, text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reviewId, id, c.get('userId'), companyId, input.rating, input.text, nowIso()],
    );
    await execute(
      db,
      `UPDATE companies SET rating_avg = (SELECT AVG(rating) FROM reviews WHERE company_id = ?) WHERE id = ?`,
      [companyId, companyId],
    );

    const created = await queryOne<ReviewRowExtra>(db, `${REVIEW_SELECT} WHERE rv.id = ?`, [
      reviewId,
    ]);
    if (!created) return apiError(c, 500, 'internal_error', 'Не удалось сохранить отзыв');
    return c.json(mapReview(created), 201);
  },
);

reviewsRouter.get('/companies/:id/reviews', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const query = listReviewsQuerySchema.parse(c.req.query());
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, id);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');

  const offset = (query.page - 1) * query.limit;
  const total = await queryOne<{ count: number }>(
    db,
    'SELECT COUNT(*) AS count FROM reviews WHERE company_id = ?',
    [id],
  );
  const rows = await queryAll<ReviewRowExtra>(
    db,
    `${REVIEW_SELECT} WHERE rv.company_id = ? ORDER BY ${SORT_SQL[query.sort]} LIMIT ? OFFSET ?`,
    [id, query.limit, offset],
  );

  return c.json(paginate(rows.map(mapReview), query.page, query.limit, total?.count ?? 0));
});

reviewsRouter.get('/account/reviews', requireAuth('client'), async (c) => {
  const query = paginationQuerySchema.parse(c.req.query());
  const db = c.env.DB;
  const offset = (query.page - 1) * query.limit;

  const total = await queryOne<{ count: number }>(
    db,
    'SELECT COUNT(*) AS count FROM reviews WHERE client_id = ?',
    [c.get('userId')],
  );
  const rows = await queryAll<ReviewRowExtra>(
    db,
    `${REVIEW_SELECT} WHERE rv.client_id = ? ORDER BY rv.created_at DESC LIMIT ? OFFSET ?`,
    [c.get('userId'), query.limit, offset],
  );

  return c.json(paginate(rows.map(mapReview), query.page, query.limit, total?.count ?? 0));
});

reviewsRouter.post('/reviews/:id/reply', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = replySchema.parse(await c.req.json());
  const db = c.env.DB;

  const review = await queryOne<ReviewRowExtra>(db, `${REVIEW_SELECT} WHERE rv.id = ?`, [id]);
  if (!review) return apiError(c, 404, 'not_found', 'Отзыв не найден');

  const company = await getCompanyBasicByUserId(db, c.get('userId'));
  if (!company || company.id !== review.company_id) {
    return apiError(c, 403, 'forbidden', 'Вы не можете отвечать на отзывы чужой компании');
  }

  await execute(db, 'UPDATE reviews SET company_reply = ? WHERE id = ?', [input.text, id]);

  const updated = await queryOne<ReviewRowExtra>(db, `${REVIEW_SELECT} WHERE rv.id = ?`, [id]);
  if (!updated) return apiError(c, 500, 'internal_error', 'Не удалось сохранить ответ');
  return c.json(mapReview(updated));
});

export default reviewsRouter;
