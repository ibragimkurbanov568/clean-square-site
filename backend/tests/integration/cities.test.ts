/**
 * HTTP-тесты автодополнения городов (F2). Контракт: docs/04-architecture.md §4.2.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, createTestEnv, json, type TestEnvHandle } from './helpers';
import { registerClient } from './fixtures';
import type { Env } from '../../src/types/env';

let handle: TestEnvHandle;
let env: Env;

beforeAll(async () => {
  handle = await createTestEnv();
  env = handle.env;
}, 30000);

afterAll(async () => {
  await handle.dispose();
});

describe('GET /api/cities/suggest', () => {
  it('возвращает подсказки по префиксу (регистронезависимо, кириллица)', async () => {
    await registerClient(env, { city: 'Владивосток' });
    const guest = createClient(env);
    const res = await guest.request('/api/cities/suggest?q=влад');
    expect(res.status).toBe(200);
    const body = await json<{ items: string[] }>(res);
    expect(body.items).toContain('Владивосток');
  });

  it('без совпадений — пустой список, не ошибка', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/cities/suggest?q=zzzzzzНетТакогоГорода');
    const body = await json<{ items: string[] }>(res);
    expect(body.items).toEqual([]);
  });

  it('без query q → 400 validation_error', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/cities/suggest');
    expect(res.status).toBe(400);
  });

  it('не более 5 подсказок', async () => {
    for (let i = 0; i < 7; i += 1) {
      await registerClient(env, { city: `СуффиксГород${i}` });
    }
    const guest = createClient(env);
    const res = await guest.request('/api/cities/suggest?q=суффиксгород');
    const body = await json<{ items: string[] }>(res);
    expect(body.items.length).toBeLessThanOrEqual(5);
  });
});
