/**
 * HTTP-тесты прайс-листа компании (F4/services). Контракт: docs/04-architecture.md §4.4.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, createTestEnv, json, type TestEnvHandle } from './helpers';
import { createService, registerCompany } from './fixtures';
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

describe('POST /api/companies/:id/services', () => {
  it('владелец верифицированной компании создаёт услугу', async () => {
    const company = await registerCompany(env);
    const res = await company.client.requestJson('POST', `/api/companies/${company.companyId}/services`, {
      name: 'Химчистка ковров',
      price: 1500,
      durationMin: 60,
    });
    expect(res.status).toBe(201);
    const body = await json<{ name: string; price: number }>(res);
    expect(body.name).toBe('Химчистка ковров');
    expect(body.price).toBe(1500);
  });

  it('неверифицированная компания не может создать услугу → 403', async () => {
    const company = await registerCompany(env, { verified: false });
    const res = await company.client.requestJson('POST', `/api/companies/${company.companyId}/services`, {
      name: 'Уборка',
      price: 1000,
    });
    expect(res.status).toBe(403);
  });

  it('чужая компания не может создать услугу другой компании → 403', async () => {
    const owner = await registerCompany(env);
    const stranger = await registerCompany(env);
    const res = await stranger.client.requestJson('POST', `/api/companies/${owner.companyId}/services`, {
      name: 'Захват',
      price: 1,
    });
    expect(res.status).toBe(403);
  });

  it('клиент не может создать услугу → 403 (не той роли)', async () => {
    const company = await registerCompany(env);
    const client = await import('./fixtures').then((m) => m.registerClient(env));
    const res = await client.client.requestJson('POST', `/api/companies/${company.companyId}/services`, {
      name: 'X',
      price: 1,
    });
    expect(res.status).toBe(403);
  });

  it('цена <= 0 отклоняется валидацией → 400', async () => {
    const company = await registerCompany(env);
    const res = await company.client.requestJson('POST', `/api/companies/${company.companyId}/services`, {
      name: 'Бесплатно?',
      price: 0,
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH/DELETE /api/services/:id', () => {
  it('владелец редактирует, чужая компания получает 403', async () => {
    const owner = await registerCompany(env);
    const service = await createService(env, owner, { price: 1000 });
    const stranger = await registerCompany(env);

    const forbiddenPatch = await stranger.client.requestJson('PATCH', `/api/services/${service.id}`, {
      price: 1,
    });
    expect(forbiddenPatch.status).toBe(403);

    const okPatch = await owner.client.requestJson('PATCH', `/api/services/${service.id}`, {
      price: 4200,
    });
    expect(okPatch.status).toBe(200);
    const body = await json<{ price: number }>(okPatch);
    expect(body.price).toBe(4200);
  });

  it('несуществующая услуга → 404 на PATCH и DELETE', async () => {
    const owner = await registerCompany(env);
    const missingId = '00000000-0000-4000-8000-000000000002';
    const patchRes = await owner.client.requestJson('PATCH', `/api/services/${missingId}`, {
      price: 1,
    });
    expect(patchRes.status).toBe(404);

    const deleteRes = await owner.client.requestJson('DELETE', `/api/services/${missingId}`);
    expect(deleteRes.status).toBe(404);
  });

  it('владелец удаляет услугу, повторный DELETE → 404', async () => {
    const owner = await registerCompany(env);
    const service = await createService(env, owner);

    const first = await owner.client.requestJson('DELETE', `/api/services/${service.id}`);
    expect(first.status).toBe(200);

    const second = await owner.client.requestJson('DELETE', `/api/services/${service.id}`);
    expect(second.status).toBe(404);
  });
});

describe('GET /api/companies/:id/services', () => {
  it('публично доступно без авторизации', async () => {
    const company = await registerCompany(env);
    await createService(env, company);
    const guest = createClient(env);
    const res = await guest.request(`/api/companies/${company.companyId}/services`);
    expect(res.status).toBe(200);
    const body = await json<{ items: unknown[] }>(res);
    expect(body.items.length).toBeGreaterThan(0);
  });
});
