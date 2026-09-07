/** Модуль favorites — избранное клиента (F8). Контракт: docs/04-architecture.md §4.7. */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';

export const favoritesRouter = new Hono<{ Bindings: Env }>();

favoritesRouter.get('/', requireAuth('client'), async (c) => {
  const query = paginationQuerySchema.parse(c.req.query());
  return notImplemented(c, `GET /api/favorites?page=${query.page}`);
});

favoritesRouter.post('/:companyId', requireAuth('client'), async (c) => {
  const { id: companyId } = idParamSchema.parse({ id: c.req.param('companyId') });
  // TODO(backend): INSERT OR IGNORE, UNIQUE(client_id, company_id) уже гарантирует идемпотентность.
  return notImplemented(c, `POST /api/favorites/${companyId}`);
});

favoritesRouter.delete('/:companyId', requireAuth('client'), async (c) => {
  const { id: companyId } = idParamSchema.parse({ id: c.req.param('companyId') });
  return notImplemented(c, `DELETE /api/favorites/${companyId}`);
});

export default favoritesRouter;
