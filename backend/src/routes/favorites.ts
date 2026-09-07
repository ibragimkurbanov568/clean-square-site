/** Модуль favorites — избранное клиента (F8). Контракт: docs/04-architecture.md §4.7. */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { apiError, paginate } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';
import { execute, newId, nowIso, queryAll, queryOne } from '../db/client';
import { mapCompany, type CompanyRowExtra } from '../lib/mappers';
import { getCompanyBasicById } from '../lib/queries';

export const favoritesRouter = new Hono<{ Bindings: Env }>();

const FAVORITES_SELECT = `
  SELECT f.company_id AS company_id, c.*, u.avatar_url AS avatar_url,
    (SELECT COUNT(*) FROM reviews r WHERE r.company_id = c.id) AS reviews_count,
    (SELECT MIN(price) FROM services s WHERE s.company_id = c.id) AS price_from
  FROM favorites f
  JOIN companies c ON c.id = f.company_id
  JOIN users u ON u.id = c.user_id
`;

favoritesRouter.get('/', requireAuth('client'), async (c) => {
  const query = paginationQuerySchema.parse(c.req.query());
  const db = c.env.DB;
  const offset = (query.page - 1) * query.limit;

  const total = await queryOne<{ count: number }>(
    db,
    'SELECT COUNT(*) AS count FROM favorites WHERE client_id = ?',
    [c.get('userId')],
  );
  const rows = await queryAll<CompanyRowExtra>(
    db,
    `${FAVORITES_SELECT} WHERE f.client_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
    [c.get('userId'), query.limit, offset],
  );

  const items = rows.map((row) => ({ companyId: row.id, company: mapCompany(row) }));
  return c.json(paginate(items, query.page, query.limit, total?.count ?? 0));
});

favoritesRouter.post('/:companyId', requireAuth('client'), async (c) => {
  const { id: companyId } = idParamSchema.parse({ id: c.req.param('companyId') });
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, companyId);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');

  await execute(
    db,
    'INSERT OR IGNORE INTO favorites (id, client_id, company_id, created_at) VALUES (?, ?, ?, ?)',
    [newId(), c.get('userId'), companyId, nowIso()],
  );
  return c.json({ ok: true });
});

favoritesRouter.delete('/:companyId', requireAuth('client'), async (c) => {
  const { id: companyId } = idParamSchema.parse({ id: c.req.param('companyId') });
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, companyId);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');

  await execute(db, 'DELETE FROM favorites WHERE client_id = ? AND company_id = ?', [
    c.get('userId'),
    companyId,
  ]);
  return c.json({ ok: true });
});

export default favoritesRouter;
