/**
 * Тонкая обёртка над D1Database. Обязательное правило (docs/01-spec.md): только
 * parameterized-запросы через `.bind()`, конкатенация SQL-строк запрещена во всём бэкенде.
 */
import type { Env } from '../types/env';

export function getDb(env: Pick<Env, 'DB'>): D1Database {
  return env.DB;
}

export async function queryOne<T>(
  db: D1Database,
  sql: string,
  params: ReadonlyArray<string | number | null> = [],
): Promise<T | null> {
  const row = await db
    .prepare(sql)
    .bind(...params)
    .first<T>();
  return row ?? null;
}

export async function queryAll<T>(
  db: D1Database,
  sql: string,
  params: ReadonlyArray<string | number | null> = [],
): Promise<T[]> {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return result.results ?? [];
}

export async function execute(
  db: D1Database,
  sql: string,
  params: ReadonlyArray<string | number | null> = [],
): Promise<D1Result> {
  return db
    .prepare(sql)
    .bind(...params)
    .run();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
