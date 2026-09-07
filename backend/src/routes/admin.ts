/**
 * Служебный админ-модуль — ручная верификация компаний (допущение 1 в docs/01-spec.md).
 * Защита — простой заголовок `X-Admin-Secret`, сверяемый с секретом ADMIN_SECRET
 * (упрощённая реализация, достаточная для MVP без полноценной админ-роли/панели).
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { apiError, notImplemented } from '../lib/http';
import { idParamSchema } from '../schemas/common';

export const adminRouter = new Hono<{ Bindings: Env }>();

adminRouter.use('*', async (c, next) => {
  const secret = c.req.header('x-admin-secret');
  if (!secret || secret !== c.env.ADMIN_SECRET) {
    return apiError(c, 403, 'forbidden', 'Недействительный административный секрет');
  }
  await next();
});

adminRouter.post('/companies/:id/verify', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  // TODO(backend): UPDATE companies SET is_verified = 1 WHERE id = ?.
  return notImplemented(c, `POST /api/admin/companies/${id}/verify`);
});

export default adminRouter;
