/**
 * HTTP-тесты избранного (F8) — идемпотентность, доступ только клиенту, список.
 * Контракт: docs/04-architecture.md §4.7.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, createTestEnv, json, type TestEnvHandle } from './helpers';
import { registerClient, registerCompany } from './fixtures';
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

describe('POST/DELETE /api/favorites/:companyId', () => {
  it('добавление идемпотентно (повторный POST — тоже 200 ok)', async () => {
    const company = await registerCompany(env);
    const client = await registerClient(env);

    const first = await client.client.requestJson('POST', `/api/favorites/${company.companyId}`);
    expect(first.status).toBe(200);
    const second = await client.client.requestJson('POST', `/api/favorites/${company.companyId}`);
    expect(second.status).toBe(200);

    const list = await json<{ items: Array<{ companyId: string }> }>(
      await client.client.request('/api/favorites'),
    );
    expect(list.items.filter((i) => i.companyId === company.companyId)).toHaveLength(1);
  });

  it('удаление идемпотентно (повторный DELETE — тоже 200 ok, не 404)', async () => {
    const company = await registerCompany(env);
    const client = await registerClient(env);
    await client.client.requestJson('POST', `/api/favorites/${company.companyId}`);

    const first = await client.client.requestJson('DELETE', `/api/favorites/${company.companyId}`);
    expect(first.status).toBe(200);
    const second = await client.client.requestJson('DELETE', `/api/favorites/${company.companyId}`);
    expect(second.status).toBe(200);
  });

  it('добавление несуществующей компании → 404', async () => {
    const client = await registerClient(env);
    const res = await client.client.requestJson(
      'POST',
      '/api/favorites/00000000-0000-4000-8000-000000000030',
    );
    expect(res.status).toBe(404);
  });

  it('компания (не клиент) не может пользоваться избранным → 403', async () => {
    const target = await registerCompany(env);
    const actingCompany = await registerCompany(env);
    const res = await actingCompany.client.requestJson('POST', `/api/favorites/${target.companyId}`);
    expect(res.status).toBe(403);
  });

  it('без авторизации → 401', async () => {
    const company = await registerCompany(env);
    const guest = createClient(env);
    const res = await guest.requestJson('POST', `/api/favorites/${company.companyId}`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/favorites — список соответствует помеченным компаниям', () => {
  it('после удаления компания пропадает из списка', async () => {
    const companyA = await registerCompany(env);
    const companyB = await registerCompany(env);
    const client = await registerClient(env);

    await client.client.requestJson('POST', `/api/favorites/${companyA.companyId}`);
    await client.client.requestJson('POST', `/api/favorites/${companyB.companyId}`);

    let list = await json<{ items: Array<{ companyId: string }> }>(
      await client.client.request('/api/favorites'),
    );
    expect(list.items.map((i) => i.companyId).sort()).toEqual(
      [companyA.companyId, companyB.companyId].sort(),
    );

    await client.client.requestJson('DELETE', `/api/favorites/${companyA.companyId}`);
    list = await json<{ items: Array<{ companyId: string }> }>(
      await client.client.request('/api/favorites'),
    );
    expect(list.items.map((i) => i.companyId)).toEqual([companyB.companyId]);
  });
});
