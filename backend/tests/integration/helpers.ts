/**
 * Инфраструктура для HTTP-уровневых интеграционных тестов (docs/07-integration.md отметил
 * это как "не входит в MVP-критерии" в §Осознанно вне объёма, но шаг QA обязан закрыть
 * критические маршруты реальными HTTP-запросами, а не только unit-тестами чистых функций).
 *
 * Подход: `wrangler`'s `getPlatformProxy()` поднимает реальный локальный Miniflare/workerd
 * рантайм и отдаёт настоящие D1/KV/R2 биндинги (не самодельные моки), а сам Hono-app.fetch
 * вызывается напрямую в Node-процессе Vitest — без поднятия отдельного HTTP-сервера
 * (`wrangler dev`/`unstable_dev`), что быстрее и не требует сети/порта.
 *
 * Секреты/переменные окружения передаются явно (TEST_VARS), а не читаются из `backend/.dev.vars`
 * (файл в .gitignore) — тесты должны быть воспроизводимы на любой машине без локальных секретов.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import worker from '../../src/index';
import type { Env } from '../../src/types/env';

const BASE_URL = 'http://localhost';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.resolve(BACKEND_ROOT, '../migrations');

/** Детерминированные тестовые секреты — НЕ читаются из .dev.vars, чтобы тесты не зависели от
 * локальной незакоммиченной конфигурации. AI_FORCE_FALLBACK=true — детерминированная
 * rule-based модерация без сетевых вызовов Workers AI. */
const TEST_VARS = {
  ENVIRONMENT: 'development',
  CORS_ORIGIN: 'http://localhost:5173',
  RATE_LIMIT_MAX_REQUESTS: '100',
  RATE_LIMIT_WINDOW_SECONDS: '60',
  JWT_ACCESS_SECRET: 'qa-test-access-secret-32-chars-minimum',
  JWT_REFRESH_SECRET: 'qa-test-refresh-secret-32-chars-minimum',
  ENCRYPTION_KEY: 'Q2xlYW5MaW5rRGV2S2V5IUNsZWFuTGlua0RldktleSE=',
  RESEND_API_KEY: '',
  ADMIN_SECRET: 'qa-test-admin-secret',
  AI_FORCE_FALLBACK: 'true',
} as const;

export interface TestEnvHandle {
  env: Env;
  dispose: () => Promise<void>;
}

/** Поднимает свежую (пустую, только со схемой) БД + настоящие KV/R2 биндинги для одного файла тестов. */
export async function createTestEnv(): Promise<TestEnvHandle> {
  const proxy = await getPlatformProxy<Env>({
    configPath: path.join(BACKEND_ROOT, 'wrangler.toml'),
    persist: false, // ничего не пишем на диск — каждый набор тестов стартует с чистого состояния
  });

  const env = { ...proxy.env, ...TEST_VARS } as Env;
  const db = env.DB;

  for (const file of ['0001_init.sql', '0002_company_views.sql']) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const statements = unstable_splitSqlQuery(sql).filter((s) => s.trim().length > 0);
    await db.batch(statements.map((s) => db.prepare(s)));
  }

  return {
    env,
    dispose: () => proxy.dispose(),
  };
}

/** Простой cookie-jar: разбирает Set-Cookie из ответа, подставляет Cookie в следующий запрос. */
class CookieJar {
  private cookies = new Map<string, string>();

  applySetCookie(headers: Headers): void {
    const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const raw = typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [];
    for (const entry of raw) {
      const pair = entry.split(';', 1)[0] ?? '';
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      this.cookies.set(name, value);
    }
  }

  header(): string | undefined {
    if (this.cookies.size === 0) return undefined;
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  clear(): void {
    this.cookies.clear();
  }
}

export interface TestClient {
  /** Выполняет запрос к Hono-приложению, автоматически неся cookies этого клиента. */
  request(path: string, init?: RequestInit): Promise<Response>;
  requestJson(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<Response>;
  jar: { clear(): void };
}

let ipCounter = 1;

/** Отдельный "клиент" (отдельный IP + собственный cookie-jar) — изолирует rate-limit и сессии между тестовыми пользователями. */
export function createClient(env: Env, ip?: string): TestClient {
  const jar = new CookieJar();
  const clientIp = ip ?? `10.0.0.${(ipCounter += 1) % 254}`;

  async function request(reqPath: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const cookieHeader = jar.header();
    if (cookieHeader) headers.set('cookie', cookieHeader);
    if (!headers.has('cf-connecting-ip')) headers.set('cf-connecting-ip', clientIp);
    const request = new Request(new URL(reqPath, BASE_URL), { ...init, headers });
    const res = await worker.fetch(request, env);
    jar.applySetCookie(res.headers);
    return res;
  }

  async function requestJson(
    method: string,
    reqPath: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<Response> {
    return request(reqPath, {
      method,
      headers: { 'content-type': 'application/json', ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  return { request, requestJson, jar };
}

/** Утилита: тело JSON-ответа с известной формой (тесты сами приводят тип по месту использования). */
export async function json<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
