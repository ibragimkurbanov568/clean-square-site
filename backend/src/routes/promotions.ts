/** Модуль promotions — акции компании (F9). Контракт: docs/04-architecture.md §4.8. */
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { getCookie } from 'hono/cookie';
import type { Env } from '../types/env';
import { apiError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { idParamSchema } from '../schemas/common';
import { execute, newId, nowIso, queryAll, queryOne } from '../db/client';
import type { PromotionRow } from '../db/schema';
import { mapPromotion, todayIsoDate } from '../lib/mappers';
import { getCompanyBasicById, getCompanyBasicByUserId } from '../lib/queries';
import { ACCESS_COOKIE_NAME, verifyAccessToken } from '../lib/jwt';

export const promotionsRouter = new Hono<{ Bindings: Env }>();

const promotionInputSchema = z.object({
  title: z.string().min(1, 'Заполните это поле'),
  discountPercent: z.number().int().min(1).max(100),
  validUntil: z.string().date(),
});

/** Мягкая аутентификация: не бросает 401, просто возвращает payload, если cookie валидна. */
async function trySoftAuth(c: Context<{ Bindings: Env }>) {
  const token = getCookie(c, ACCESS_COOKIE_NAME);
  if (!token) return null;
  try {
    return await verifyAccessToken(token, c.env);
  } catch {
    return null;
  }
}

promotionsRouter.get('/companies/:id/promotions', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, id);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');

  // Акции скрыты целиком для неверифицированных компаний — как и услуги (F4/правило "Услуги,
  // акции ... скрыты для компаний с is_verified=0").
  if (company.is_verified !== 1) return c.json({ items: [] });

  const auth = await trySoftAuth(c);
  const isOwner = auth?.role === 'company' && (await getCompanyBasicByUserId(db, auth.sub))?.id === id;

  const rows = isOwner
    ? await queryAll<PromotionRow>(
        db,
        'SELECT * FROM promotions WHERE company_id = ? ORDER BY valid_until DESC',
        [id],
      )
    : await queryAll<PromotionRow>(
        db,
        'SELECT * FROM promotions WHERE company_id = ? AND valid_until >= ? ORDER BY valid_until ASC',
        [id, todayIsoDate()],
      );

  return c.json({ items: rows.map(mapPromotion) });
});

promotionsRouter.post('/companies/:id/promotions', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = promotionInputSchema.parse(await c.req.json());
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, id);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');
  if (company.user_id !== c.get('userId')) {
    return apiError(c, 403, 'forbidden', 'Вы не можете создавать акции для чужой компании');
  }
  if (company.is_verified !== 1) {
    return apiError(c, 403, 'forbidden', 'Профиль компании ещё не верифицирован');
  }

  const promotionId = newId();
  await execute(
    db,
    `INSERT INTO promotions (id, company_id, title, discount_percent, valid_until, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [promotionId, id, input.title, input.discountPercent, input.validUntil, nowIso()],
  );

  const created = await queryOne<PromotionRow>(db, 'SELECT * FROM promotions WHERE id = ?', [
    promotionId,
  ]);
  if (!created) return apiError(c, 500, 'internal_error', 'Не удалось создать акцию');
  return c.json(mapPromotion(created), 201);
});

async function getPromotionWithOwner(db: D1Database, promotionId: string) {
  return queryOne<PromotionRow & { owner_user_id: string }>(
    db,
    `SELECT p.*, c.user_id AS owner_user_id
     FROM promotions p JOIN companies c ON c.id = p.company_id
     WHERE p.id = ?`,
    [promotionId],
  );
}

const promotionUpdateSchema = promotionInputSchema.partial();
const UPDATE_COLUMN_MAP: Record<keyof z.infer<typeof promotionUpdateSchema>, string> = {
  title: 'title',
  discountPercent: 'discount_percent',
  validUntil: 'valid_until',
};

promotionsRouter.patch('/promotions/:id', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = promotionUpdateSchema.parse(await c.req.json());
  const db = c.env.DB;

  const promotion = await getPromotionWithOwner(db, id);
  if (!promotion) return apiError(c, 404, 'not_found', 'Акция не найдена');
  if (promotion.owner_user_id !== c.get('userId')) {
    return apiError(c, 403, 'forbidden', 'Вы не можете редактировать акции чужой компании');
  }

  const setClauses: string[] = [];
  const params: Array<string | number> = [];
  for (const [key, column] of Object.entries(UPDATE_COLUMN_MAP) as Array<
    [keyof typeof UPDATE_COLUMN_MAP, string]
  >) {
    if (input[key] === undefined) continue;
    setClauses.push(`${column} = ?`);
    params.push(input[key] as string | number);
  }

  if (setClauses.length > 0) {
    params.push(id);
    await execute(db, `UPDATE promotions SET ${setClauses.join(', ')} WHERE id = ?`, params);
  }

  const updated = await queryOne<PromotionRow>(db, 'SELECT * FROM promotions WHERE id = ?', [id]);
  if (!updated) return apiError(c, 500, 'internal_error', 'Не удалось обновить акцию');
  return c.json(mapPromotion(updated));
});

promotionsRouter.delete('/promotions/:id', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const db = c.env.DB;

  const promotion = await getPromotionWithOwner(db, id);
  if (!promotion) return apiError(c, 404, 'not_found', 'Акция не найдена');
  if (promotion.owner_user_id !== c.get('userId')) {
    return apiError(c, 403, 'forbidden', 'Вы не можете удалять акции чужой компании');
  }

  await execute(db, 'DELETE FROM promotions WHERE id = ?', [id]);
  return c.json({ ok: true });
});

export default promotionsRouter;
