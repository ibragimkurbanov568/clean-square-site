/**
 * Модуль companies — поиск/карточка/ТОП-3/редактирование профиля/просмотры (F2-F4, F13).
 * Контракт: docs/04-architecture.md §4.3.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { apiError, paginate } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';
import { execute, newId, nowIso, queryAll, queryOne } from '../db/client';
import { mapCompany, type CompanyRowExtra } from '../lib/mappers';
import { selectTopCompanies } from '../lib/rating';
import { getCompanyBasicById, getCompanyRowById } from '../lib/queries';

export const companiesRouter = new Hono<{ Bindings: Env }>();

const COMPANY_SELECT = `
  SELECT c.*, u.avatar_url AS avatar_url,
    (SELECT COUNT(*) FROM reviews r WHERE r.company_id = c.id) AS reviews_count,
    (SELECT MIN(price) FROM services s WHERE s.company_id = c.id) AS price_from
  FROM companies c
  JOIN users u ON u.id = c.user_id
`;

const listQuerySchema = paginationQuerySchema.extend({
  city: z.string().min(1),
  sort: z.enum(['rating', 'price_asc', 'reviews']).default('rating'),
});

const ORDER_BY: Record<string, string> = {
  rating: 'c.rating_avg DESC, c.orders_count DESC',
  price_asc: '(price_from IS NULL), price_from ASC',
  reviews: 'reviews_count DESC, c.rating_avg DESC',
};

companiesRouter.get('/', async (c) => {
  const input = listQuerySchema.parse(c.req.query());
  const db = c.env.DB;
  const offset = (input.page - 1) * input.limit;

  const total = await queryOne<{ count: number }>(
    db,
    'SELECT COUNT(*) AS count FROM companies WHERE city = ?',
    [input.city],
  );
  const rows = await queryAll<CompanyRowExtra>(
    db,
    `${COMPANY_SELECT} WHERE c.city = ? ORDER BY ${ORDER_BY[input.sort]} LIMIT ? OFFSET ?`,
    [input.city, input.limit, offset],
  );

  return c.json(paginate(rows.map(mapCompany), input.page, input.limit, total?.count ?? 0));
});

companiesRouter.get('/top', async (c) => {
  const input = z.object({ city: z.string().min(1) }).parse(c.req.query());
  const db = c.env.DB;

  // ТОП-3 составляется только из верифицированных компаний — неверифицированные не принимают
  // заказы (F1: "заглушка на модерации"), продвигать их в блоке ТОП-3 не имеет смысла для F3.
  const rows = await queryAll<CompanyRowExtra>(
    db,
    `${COMPANY_SELECT} WHERE c.city = ? AND c.is_verified = 1`,
    [input.city],
  );

  const top = selectTopCompanies(
    rows.map((r) => ({
      id: r.id,
      ratingAvg: r.rating_avg,
      ordersCount: r.orders_count,
      responseSpeedSec: r.response_speed_sec,
    })),
    3,
  );
  const topIds = new Set(top.map((t) => t.id));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = top
    .map((t) => byId.get(t.id))
    .filter((r): r is CompanyRowExtra => r !== undefined && topIds.has(r.id));

  return c.json({ items: ordered.map(mapCompany) });
});

companiesRouter.get('/:id', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const row = await getCompanyRowById(c.env.DB, id);
  if (!row) return apiError(c, 404, 'not_found', 'Компания не найдена');
  return c.json(mapCompany(row));
});

const companyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().max(4000).optional(),
  city: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  website: z.string().url().optional().or(z.literal('')),
  workHours: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  coverUrl: z.string().optional(),
});

const UPDATE_COLUMN_MAP: Record<keyof z.infer<typeof companyUpdateSchema>, string> = {
  name: 'name',
  description: 'description',
  city: 'city',
  address: 'address',
  phone: 'phone',
  website: 'website',
  workHours: 'work_hours',
  videoUrl: 'video_url',
  coverUrl: 'cover_url',
};

companiesRouter.patch('/:id', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = companyUpdateSchema.parse(await c.req.json());
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, id);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');
  if (company.user_id !== c.get('userId')) {
    return apiError(c, 403, 'forbidden', 'Вы не можете редактировать чужую компанию');
  }

  const setClauses: string[] = [];
  const params: Array<string | number | null> = [];
  for (const [key, column] of Object.entries(UPDATE_COLUMN_MAP) as Array<
    [keyof typeof UPDATE_COLUMN_MAP, string]
  >) {
    if (input[key] === undefined) continue;
    setClauses.push(`${column} = ?`);
    params.push(input[key] === '' ? null : (input[key] as string));
  }

  if (setClauses.length > 0) {
    params.push(id);
    await execute(db, `UPDATE companies SET ${setClauses.join(', ')} WHERE id = ?`, params);
  }

  // city денормализован также на users (docs/04-architecture.md §5.1, отклонение №1) — держим
  // источники синхронными при смене города компании.
  if (input.city !== undefined) {
    await execute(db, 'UPDATE users SET city = ? WHERE id = ?', [input.city, company.user_id]);
  }

  const updated = await getCompanyRowById(db, id);
  if (!updated) return apiError(c, 500, 'internal_error', 'Не удалось обновить компанию');
  return c.json(mapCompany(updated));
});

companiesRouter.post('/:id/view', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, id);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');

  await execute(db, 'UPDATE companies SET views_count = views_count + 1 WHERE id = ?', [id]);
  await execute(db, 'INSERT INTO company_views (id, company_id, viewed_at) VALUES (?, ?, ?)', [
    newId(),
    id,
    nowIso(),
  ]);

  return c.json({ ok: true });
});

export default companiesRouter;
