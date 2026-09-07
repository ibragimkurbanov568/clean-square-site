/**
 * Служебный админ-модуль — ручная верификация компаний (допущение 1 в docs/01-spec.md).
 * Защита — простой заголовок `X-Admin-Secret`, сверяемый с секретом ADMIN_SECRET
 * (упрощённая реализация, достаточная для MVP без полноценной админ-роли/панели).
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { apiError } from '../lib/http';
import { idParamSchema } from '../schemas/common';
import { execute } from '../db/client';
import { getCompanyBasicById } from '../lib/queries';

export const adminRouter = new Hono<{ Bindings: Env }>();

/**
 * Сравнение секрета за постоянное время (аудит безопасности, docs/09-audit.md — незначительная
 * находка): обычный `!==` на строках выходит из цикла на первом несовпадающем байте, давая
 * теоретический timing-side-channel. Секрет короткий и фиксированной здесь длины сверяется байт
 * в байт, длина при этом не скрывается — этого достаточно для устранения посимвольной утечки.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

adminRouter.use('*', async (c, next) => {
  const secret = c.req.header('x-admin-secret');
  if (!secret || !timingSafeEqual(secret, c.env.ADMIN_SECRET)) {
    return apiError(c, 403, 'forbidden', 'Недействительный административный секрет');
  }
  await next();
});

adminRouter.post('/companies/:id/verify', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, id);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');

  await execute(db, 'UPDATE companies SET is_verified = 1 WHERE id = ?', [id]);
  return c.json({ ok: true });
});

export default adminRouter;
