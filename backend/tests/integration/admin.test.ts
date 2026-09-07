/**
 * HTTP-тесты служебного админ-эндпоинта верификации компаний (допущение 1, docs/04-architecture.md §2.6/§4.12).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, createTestEnv, json, type TestEnvHandle } from './helpers';
import { registerCompany } from './fixtures';
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

describe('POST /api/admin/companies/:id/verify', () => {
  it('без заголовка X-Admin-Secret → 403', async () => {
    const company = await registerCompany(env, { verified: false });
    const client = createClient(env);
    const res = await client.request(`/api/admin/companies/${company.companyId}/verify`, {
      method: 'POST',
    });
    expect(res.status).toBe(403);
  });

  it('с неверным секретом → 403', async () => {
    const company = await registerCompany(env, { verified: false });
    const client = createClient(env);
    const res = await client.request(`/api/admin/companies/${company.companyId}/verify`, {
      method: 'POST',
      headers: { 'x-admin-secret': 'wrong-secret' },
    });
    expect(res.status).toBe(403);
  });

  it('с верным секретом переключает is_verified — карточка публично видна как верифицированная', async () => {
    const company = await registerCompany(env, { verified: false });
    const client = createClient(env);
    const res = await client.request(`/api/admin/companies/${company.companyId}/verify`, {
      method: 'POST',
      headers: { 'x-admin-secret': 'qa-test-admin-secret' },
    });
    expect(res.status).toBe(200);

    const guest = createClient(env);
    const card = await json<{ isVerified: boolean }>(
      await guest.request(`/api/companies/${company.companyId}`),
    );
    expect(card.isVerified).toBe(true);
  });

  it('несуществующая компания → 404 даже с верным секретом', async () => {
    const client = createClient(env);
    const res = await client.request(
      '/api/admin/companies/00000000-0000-4000-8000-000000000050/verify',
      { method: 'POST', headers: { 'x-admin-secret': 'qa-test-admin-secret' } },
    );
    expect(res.status).toBe(404);
  });
});
