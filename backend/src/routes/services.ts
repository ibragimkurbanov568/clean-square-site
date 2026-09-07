/** Модуль services — прайс-лист компании. Контракт: docs/04-architecture.md §4.4. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { apiError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { idParamSchema } from '../schemas/common';
import { execute, newId, nowIso, queryAll, queryOne } from '../db/client';
import type { ServiceRow } from '../db/schema';
import { mapService } from '../lib/mappers';
import { getCompanyBasicById } from '../lib/queries';

export const servicesRouter = new Hono<{ Bindings: Env }>();

const serviceInputSchema = z.object({
  name: z.string().min(1, 'Заполните это поле'),
  price: z.number().int().min(1),
  durationMin: z.number().int().min(1).optional(),
  description: z.string().optional(),
});

servicesRouter.get('/companies/:id/services', async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, id);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');
  if (company.is_verified !== 1) return c.json({ items: [] });

  const rows = await queryAll<ServiceRow>(
    db,
    'SELECT * FROM services WHERE company_id = ? ORDER BY created_at ASC',
    [id],
  );
  return c.json({ items: rows.map(mapService) });
});

servicesRouter.post('/companies/:id/services', requireAuth('company'), async (c) => {
  const { id } = idParamSchema.parse(c.req.param());
  const input = serviceInputSchema.parse(await c.req.json());
  const db = c.env.DB;

  const company = await getCompanyBasicById(db, id);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');
  if (company.user_id !== c.get('userId')) {
    return apiError(c, 403, 'forbidden', 'Вы не можете редактировать услуги чужой компании');
  }
  if (company.is_verified !== 1) {
    return apiError(c, 403, 'forbidden', 'Профиль компании ещё не верифицирован');
  }

  const serviceId = newId();
  await execute(
    db,
    `INSERT INTO services (id, company_id, name, price, duration_min, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      serviceId,
      id,
      input.name,
      input.price,
      input.durationMin ?? null,
      input.description ?? '',
      nowIso(),
    ],
  );

  const created = await queryOne<ServiceRow>(db, 'SELECT * FROM services WHERE id = ?', [
    serviceId,
  ]);
  if (!created) return apiError(c, 500, 'internal_error', 'Не удалось создать услугу');
  return c.json(mapService(created), 201);
});

async function getServiceWithOwner(db: D1Database, serviceId: string) {
  return queryOne<ServiceRow & { owner_user_id: string }>(
    db,
    `SELECT sv.*, c.user_id AS owner_user_id
     FROM services sv JOIN companies c ON c.id = sv.company_id
     WHERE sv.id = ?`,
    [serviceId],
  );
}

const serviceUpdateSchema = serviceInputSchema.partial();
const UPDATE_COLUMN_MAP: Record<keyof z.infer<typeof serviceUpdateSchema>, string> = {
  name: 'name',
  price: 'price',
  durationMin: 'duration_min',
  description: 'description',
};

servicesRouter.patch('/services/:serviceId', requireAuth('company'), async (c) => {
  const { serviceId } = z.object({ serviceId: z.string().uuid() }).parse(c.req.param());
  const input = serviceUpdateSchema.parse(await c.req.json());
  const db = c.env.DB;

  const service = await getServiceWithOwner(db, serviceId);
  if (!service) return apiError(c, 404, 'not_found', 'Услуга не найдена');
  if (service.owner_user_id !== c.get('userId')) {
    return apiError(c, 403, 'forbidden', 'Вы не можете редактировать услуги чужой компании');
  }

  const setClauses: string[] = [];
  const params: Array<string | number | null> = [];
  for (const [key, column] of Object.entries(UPDATE_COLUMN_MAP) as Array<
    [keyof typeof UPDATE_COLUMN_MAP, string]
  >) {
    if (input[key] === undefined) continue;
    setClauses.push(`${column} = ?`);
    params.push(input[key] as string | number);
  }

  if (setClauses.length > 0) {
    params.push(serviceId);
    await execute(db, `UPDATE services SET ${setClauses.join(', ')} WHERE id = ?`, params);
  }

  const updated = await queryOne<ServiceRow>(db, 'SELECT * FROM services WHERE id = ?', [
    serviceId,
  ]);
  if (!updated) return apiError(c, 500, 'internal_error', 'Не удалось обновить услугу');
  return c.json(mapService(updated));
});

servicesRouter.delete('/services/:serviceId', requireAuth('company'), async (c) => {
  const { serviceId } = z.object({ serviceId: z.string().uuid() }).parse(c.req.param());
  const db = c.env.DB;

  const service = await getServiceWithOwner(db, serviceId);
  if (!service) return apiError(c, 404, 'not_found', 'Услуга не найдена');
  if (service.owner_user_id !== c.get('userId')) {
    return apiError(c, 403, 'forbidden', 'Вы не можете удалять услуги чужой компании');
  }

  await execute(db, 'DELETE FROM services WHERE id = ?', [serviceId]);
  return c.json({ ok: true });
});

export default servicesRouter;
