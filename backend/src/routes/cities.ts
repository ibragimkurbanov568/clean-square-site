/** Модуль cities — автодополнение городов (F2). Контракт: docs/04-architecture.md §4.2. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { queryAll } from '../db/client';

export const citiesRouter = new Hono<{ Bindings: Env }>();

const suggestQuerySchema = z.object({ q: z.string().min(1) });

const CACHE_TTL_SECONDS = 300;
const SUGGESTIONS_LIMIT = 5;
/** Ключ полного списка городов в KV — короткий TTL, чтобы новые города появлялись быстро. */
const ALL_CITIES_CACHE_KEY = 'cities:all';
const ALL_CITIES_CACHE_TTL_SECONDS = 60;

/**
 * SQLite (и D1) без сборки с ICU лишь ASCII-версия `LOWER()`/`LIKE COLLATE NOCASE` — кириллица
 * не приводится к нижнему регистру на уровне SQL (`LOWER('Москва')` вернёт `'Москва'` без
 * изменений). Единственный язык интерфейса — русский (допущение 16), поэтому регистронезависимое
 * сравнение выполняется в JS (`toLowerCase()` корректно работает с Unicode), а не в SQL.
 * Список городов для MVP заведомо небольшой (только уже зарегистрированные пользователи) —
 * загрузка всех различных городов и фильтрация в памяти безопасна по производительности.
 */
async function loadAllCities(env: { DB: D1Database; CACHE: KVNamespace }): Promise<string[]> {
  const cached = await env.CACHE.get(ALL_CITIES_CACHE_KEY);
  if (cached) return JSON.parse(cached) as string[];

  const rows = await queryAll<{ city: string }>(
    env.DB,
    'SELECT DISTINCT city FROM users ORDER BY city LIMIT 1000',
  );
  const cities = rows.map((r) => r.city);
  await env.CACHE.put(ALL_CITIES_CACHE_KEY, JSON.stringify(cities), {
    expirationTtl: ALL_CITIES_CACHE_TTL_SECONDS,
  });
  return cities;
}

citiesRouter.get('/suggest', async (c) => {
  const input = suggestQuerySchema.parse({ q: c.req.query('q') });
  const qLower = input.q.trim().toLowerCase();
  if (qLower.length === 0) return c.json({ items: [] });

  const cacheKey = `cities:suggest:${qLower}`;
  const cached = await c.env.CACHE.get(cacheKey);
  if (cached) {
    return c.json({ items: JSON.parse(cached) as string[] });
  }

  const allCities = await loadAllCities(c.env);
  const items = allCities
    .filter((city) => city.toLowerCase().startsWith(qLower))
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .slice(0, SUGGESTIONS_LIMIT);

  await c.env.CACHE.put(cacheKey, JSON.stringify(items), { expirationTtl: CACHE_TTL_SECONDS });
  return c.json({ items });
});

export default citiesRouter;
