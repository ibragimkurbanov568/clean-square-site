import { describe, expect, it } from 'vitest';
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
