/** Модуль cities — автодополнение городов (F2). Контракт: docs/04-architecture.md §4.2. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';

export const citiesRouter = new Hono<{ Bindings: Env }>();

const suggestQuerySchema = z.object({ q: z.string().min(1) });

citiesRouter.get('/suggest', async (c) => {
  const input = suggestQuerySchema.parse({ q: c.req.query('q') });
  // TODO(backend): SELECT DISTINCT city FROM users WHERE city LIKE ?||'%' с кэшем в KV CACHE
  // (ключ `cities:suggest:${q.toLowerCase()}`, TTL несколько минут), лимит 5.
  return notImplemented(c, `GET /api/cities/suggest?q=${input.q}`);
});

export default citiesRouter;
