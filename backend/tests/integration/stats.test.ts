/**
 * HTTP-тесты статистики компании (F10) — доступ только верифицированной компании-владельцу,
 * агрегаты совпадают с фактическими записями БД. Контракт: docs/04-architecture.md §4.9.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, createTestEnv, json, type TestEnvHandle } from './helpers';
import { createService, registerClient, registerCompany } from './fixtures';
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

describe('GET /api/company/stats', () => {
  it('неверифицированная компания → 403', async () => {
    const company = await registerCompany(env, { verified: false });
    const res = await company.client.request('/api/company/stats?period=30');
    expect(res.status).toBe(403);
  });

  it('клиент (не компания) → 403', async () => {
    const client = await registerClient(env);
    const res = await client.client.request('/api/company/stats?period=30');
    expect(res.status).toBe(403);
  });

  it('без авторизации → 401', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/company/stats?period=30');
    expect(res.status).toBe(401);
  });

  it('отражает реальное количество просмотров и заказов по статусам', async () => {
    const company = await registerCompany(env);
    const service = await createService(env, company, { price: 4000 });
    const client = await registerClient(env);

    const guest = createClient(env);
    await guest.request(`/api/companies/${company.companyId}/view`, { method: 'POST' });
    await guest.request(`/api/companies/${company.companyId}/view`, { method: 'POST' });
    await guest.request(`/api/companies/${company.companyId}/view`, { method: 'POST' });

    const order1 = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/orders', {
        companyId: company.companyId,
        serviceId: service.id,
      }),
    );
    await client.client.requestJson('POST', '/api/orders', {
      companyId: company.companyId,
      serviceId: service.id,
    });
    await company.client.requestJson('PATCH', `/api/orders/${order1.id}/status`, {
      status: 'in_progress',
    });
    await company.client.requestJson('PATCH', `/api/orders/${order1.id}/status`, {
      status: 'done',
    });

    const res = await company.client.request('/api/company/stats?period=30');
    expect(res.status).toBe(200);
    const body = await json<{
      viewsCount: number;
      ordersTotal: number;
      ordersByStatus: Record<string, number>;
      averageCheck: number;
      conversionRate: number;
    }>(res);
    expect(body.viewsCount).toBe(3);
    expect(body.ordersTotal).toBe(2);
    expect(body.ordersByStatus.done).toBe(1);
    expect(body.ordersByStatus.created).toBe(1);
    expect(body.averageCheck).toBe(4000); // только 'done' заказы участвуют в среднем чеке
    expect(body.conversionRate).toBeCloseTo(2 / 3, 5);
  });

  it('period=7/30/90 принимаются, иное значение отклоняется валидацией', async () => {
    const company = await registerCompany(env);
    for (const period of ['7', '30', '90']) {
      const res = await company.client.request(`/api/company/stats?period=${period}`);
      expect(res.status).toBe(200);
    }
    const bad = await company.client.request('/api/company/stats?period=15');
    expect(bad.status).toBe(400);
  });
});
