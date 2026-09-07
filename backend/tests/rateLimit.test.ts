import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { rateLimit } from '../src/middleware/rateLimit';
import type { Env } from '../src/types/env';

// Rate limiting через KV-счётчики (допущение 10, docs/01-spec.md "Правила и валидация":
// не более N запросов/окно на ключ ip:user_id, превышение -> 429).

/** Минимальная in-memory реализация KVNamespace.get/put, достаточная для rateLimit middleware. */
class FakeKv {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

function buildApp(max: number, windowSeconds = 60) {
  const app = new Hono<{ Bindings: Env }>();
  app.get('/test', rateLimit({ key: 'test' }), (c) => c.json({ ok: true }));
  const env = {
    CACHE: new FakeKv(),
    RATE_LIMIT_MAX_REQUESTS: String(max),
    RATE_LIMIT_WINDOW_SECONDS: String(windowSeconds),
  } as unknown as Env;
  return { app, env };
}

describe('middleware/rateLimit', () => {
  it('пропускает запросы, пока счётчик не превышен', async () => {
    const { app, env } = buildApp(3);
    const headers = { 'cf-connecting-ip': '1.2.3.4' };

    const r1 = await app.request('/test', { headers }, env);
    const r2 = await app.request('/test', { headers }, env);
    const r3 = await app.request('/test', { headers }, env);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
  });

  it('возвращает 429 после превышения лимита', async () => {
    const { app, env } = buildApp(2);
    const headers = { 'cf-connecting-ip': '5.6.7.8' };

    await app.request('/test', { headers }, env);
    await app.request('/test', { headers }, env);
    const blocked = await app.request('/test', { headers }, env);

    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { error: { code: string } };
    expect(body.error.code).toBe('rate_limited');
  });

  it('считает лимит раздельно для разных IP (идентификаторов)', async () => {
    const { app, env } = buildApp(1);

    const a1 = await app.request('/test', { headers: { 'cf-connecting-ip': 'aaa' } }, env);
    const b1 = await app.request('/test', { headers: { 'cf-connecting-ip': 'bbb' } }, env);
    const a2 = await app.request('/test', { headers: { 'cf-connecting-ip': 'aaa' } }, env);

    expect(a1.status).toBe(200);
    expect(b1.status).toBe(200);
    expect(a2.status).toBe(429);
  });
});

// docs/07-integration.md, "Остаточные известные ограничения" §9: восстановление после TTL было
// проверено только чтением кода (`expirationTtl`), "ждать полные 60 секунд ради формальной
// проверки было признано неоправданной тратой времени". Здесь закрываем этот пробел детерминированным
// тестом: KV-фейк честно моделирует истечение `expirationTtl` по показаниям часов, а
// `vi.useFakeTimers()` перематывает время вперёд без реального ожидания.
class TtlAwareFakeKv {
  private store = new Map<string, { value: string; expiresAtMs: number | null }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAtMs !== null && entry.expiresAtMs <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    const expiresAtMs = opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null;
    this.store.set(key, { value, expiresAtMs });
  }
}

describe('middleware/rateLimit — восстановление после истечения окна (TTL)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('после истечения RATE_LIMIT_WINDOW_SECONDS счётчик сбрасывается — 429 снова становится 2xx', async () => {
    vi.useFakeTimers();

    const app = new Hono<{ Bindings: Env }>();
    app.get('/test', rateLimit({ key: 'ttl-test' }), (c) => c.json({ ok: true }));
    const env = {
      CACHE: new TtlAwareFakeKv(),
      RATE_LIMIT_MAX_REQUESTS: '2',
      RATE_LIMIT_WINDOW_SECONDS: '60',
    } as unknown as Env;
    const headers = { 'cf-connecting-ip': 'ttl-client' };

    const r1 = await app.request('/test', { headers }, env);
    const r2 = await app.request('/test', { headers }, env);
    const r3 = await app.request('/test', { headers }, env);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);

    // Ещё 59 секунд — окно не истекло, лимит всё ещё действует.
    vi.advanceTimersByTime(59_000);
    const stillBlocked = await app.request('/test', { headers }, env);
    expect(stillBlocked.status).toBe(429);

    // Проходит 61-я секунда с момента первой записи — TTL (60с) истёк, счётчик сброшен.
    vi.advanceTimersByTime(2_000);
    const recovered = await app.request('/test', { headers }, env);
    expect(recovered.status).toBe(200);
  });
});
