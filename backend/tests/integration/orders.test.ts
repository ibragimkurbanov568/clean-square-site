/**
 * HTTP-тесты заказов (F5, F12) — создание, переходы статуса, доступ к чужим заказам,
 * фильтр по статусу, пагинация. Контракт: docs/04-architecture.md §4.5.
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

describe('POST /api/orders', () => {
  it('клиент создаёт заказ у верифицированной компании → статус created', async () => {
    const company = await registerCompany(env);
    const service = await createService(env, company, { price: 2000 });
    const client = await registerClient(env);

    const res = await client.client.requestJson('POST', '/api/orders', {
      companyId: company.companyId,
      serviceId: service.id,
    });
    expect(res.status).toBe(201);
    const body = await json<{ status: string; totalPrice: number; hasReview: boolean }>(res);
    expect(body.status).toBe('created');
    expect(body.totalPrice).toBe(2000);
    expect(body.hasReview).toBe(false);
  });

  it('заказ услуги неверифицированной компании отклоняется → 400', async () => {
    const company = await registerCompany(env, { verified: false });
    // Услугу неверифицированная компания создать не может — вставляем напрямую в БД для теста
    // сценария "заказ ссылается на услугу неверифицированной компании" в обход API-запрета.
    const serviceId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO services (id, company_id, name, price, description, created_at)
       VALUES (?, ?, 'Услуга', 500, '', ?)`,
    )
      .bind(serviceId, company.companyId, new Date().toISOString())
      .run();

    const client = await registerClient(env);
    const res = await client.client.requestJson('POST', '/api/orders', {
      companyId: company.companyId,
      serviceId,
    });
    expect(res.status).toBe(400);
  });

  it('несуществующая услуга/компания → 400 invalid_reference', async () => {
    const client = await registerClient(env);
    const res = await client.client.requestJson('POST', '/api/orders', {
      companyId: '00000000-0000-4000-8000-000000000010',
      serviceId: '00000000-0000-4000-8000-000000000011',
    });
    expect(res.status).toBe(400);
  });

  it('компания не может создавать заказ (не та роль) → 403', async () => {
    const company = await registerCompany(env);
    const service = await createService(env, company);
    const res = await company.client.requestJson('POST', '/api/orders', {
      companyId: company.companyId,
      serviceId: service.id,
    });
    expect(res.status).toBe(403);
  });

  it('без авторизации → 401', async () => {
    const company = await registerCompany(env);
    const service = await createService(env, company);
    const guest = createClient(env);
    const res = await guest.requestJson('POST', '/api/orders', {
      companyId: company.companyId,
      serviceId: service.id,
    });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/orders/:id/status — переходы статуса', () => {
  async function setupOrder() {
    const company = await registerCompany(env);
    const service = await createService(env, company);
    const client = await registerClient(env);
    const created = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/orders', {
        companyId: company.companyId,
        serviceId: service.id,
      }),
    );
    return { company, client, orderId: created.id };
  }

  it('created → in_progress → done — полный допустимый цикл', async () => {
    const { company, orderId } = await setupOrder();

    const toInProgress = await company.client.requestJson('PATCH', `/api/orders/${orderId}/status`, {
      status: 'in_progress',
    });
    expect(toInProgress.status).toBe(200);
    expect((await json<{ status: string }>(toInProgress)).status).toBe('in_progress');

    const toDone = await company.client.requestJson('PATCH', `/api/orders/${orderId}/status`, {
      status: 'done',
    });
    expect(toDone.status).toBe(200);
    const doneBody = await json<{ status: string; completedAt: string | null }>(toDone);
    expect(doneBody.status).toBe('done');
    expect(doneBody.completedAt).toBeTruthy();
  });

  it('created → done напрямую (пропуск in_progress) запрещено → 400', async () => {
    const { company, orderId } = await setupOrder();
    const res = await company.client.requestJson('PATCH', `/api/orders/${orderId}/status`, {
      status: 'done',
    });
    expect(res.status).toBe(400);
    const body = await json<{ error: { code: string } }>(res);
    expect(body.error.code).toBe('invalid_transition');
  });

  it('created → cancelled разрешено', async () => {
    const { company, orderId } = await setupOrder();
    const res = await company.client.requestJson('PATCH', `/api/orders/${orderId}/status`, {
      status: 'cancelled',
    });
    expect(res.status).toBe(200);
  });

  it('переход из терминального cancelled запрещён', async () => {
    const { company, orderId } = await setupOrder();
    await company.client.requestJson('PATCH', `/api/orders/${orderId}/status`, {
      status: 'cancelled',
    });
    const res = await company.client.requestJson('PATCH', `/api/orders/${orderId}/status`, {
      status: 'in_progress',
    });
    expect(res.status).toBe(400);
  });

  it('чужая компания не может менять статус заказа → 403', async () => {
    const { orderId } = await setupOrder();
    const stranger = await registerCompany(env);
    const res = await stranger.client.requestJson('PATCH', `/api/orders/${orderId}/status`, {
      status: 'in_progress',
    });
    expect(res.status).toBe(403);
  });

  it('клиент не может менять статус заказа (не та роль) → 403', async () => {
    const { client, orderId } = await setupOrder();
    const res = await client.client.requestJson('PATCH', `/api/orders/${orderId}/status`, {
      status: 'in_progress',
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/orders/:id — доступ к чужому заказу', () => {
  it('другой клиент не видит чужой заказ → 403', async () => {
    const company = await registerCompany(env);
    const service = await createService(env, company);
    const owner = await registerClient(env);
    const created = await json<{ id: string }>(
      await owner.client.requestJson('POST', '/api/orders', {
        companyId: company.companyId,
        serviceId: service.id,
      }),
    );

    const stranger = await registerClient(env);
    const res = await stranger.client.request(`/api/orders/${created.id}`);
    expect(res.status).toBe(403);
  });

  it('владелец видит свой заказ', async () => {
    const company = await registerCompany(env);
    const service = await createService(env, company);
    const owner = await registerClient(env);
    const created = await json<{ id: string }>(
      await owner.client.requestJson('POST', '/api/orders', {
        companyId: company.companyId,
        serviceId: service.id,
      }),
    );

    const res = await owner.client.request(`/api/orders/${created.id}`);
    expect(res.status).toBe(200);
  });

  it('несуществующий заказ → 404', async () => {
    const client = await registerClient(env);
    const res = await client.client.request('/api/orders/00000000-0000-4000-8000-000000000099');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/orders — фильтр по статусу и пагинация (F12)', () => {
  it('фильтр по статусу скрывает заказы других статусов', async () => {
    const company = await registerCompany(env);
    const service = await createService(env, company);
    const client = await registerClient(env);

    const orderA = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/orders', {
        companyId: company.companyId,
        serviceId: service.id,
      }),
    );
    await client.client.requestJson('POST', '/api/orders', {
      companyId: company.companyId,
      serviceId: service.id,
    });
    await company.client.requestJson('PATCH', `/api/orders/${orderA.id}/status`, {
      status: 'in_progress',
    });

    const allRes = await json<{ items: Array<{ status: string }>; total: number }>(
      await client.client.request('/api/orders'),
    );
    expect(allRes.total).toBe(2);

    const createdOnly = await json<{ items: Array<{ status: string }> }>(
      await client.client.request('/api/orders?status=created'),
    );
    expect(createdOnly.items).toHaveLength(1);
    expect(createdOnly.items[0]?.status).toBe('created');

    const inProgressOnly = await json<{ items: Array<{ status: string }> }>(
      await client.client.request('/api/orders?status=in_progress'),
    );
    expect(inProgressOnly.items).toHaveLength(1);
    expect(inProgressOnly.items[0]?.status).toBe('in_progress');
  });

  it('компания видит только заказы своей компании (не чужие)', async () => {
    const companyA = await registerCompany(env);
    const serviceA = await createService(env, companyA);
    const companyB = await registerCompany(env);
    const client = await registerClient(env);

    await client.client.requestJson('POST', '/api/orders', {
      companyId: companyA.companyId,
      serviceId: serviceA.id,
    });

    const bOrders = await json<{ items: unknown[]; total: number }>(
      await companyB.client.request('/api/orders'),
    );
    expect(bOrders.total).toBe(0);

    const aOrders = await json<{ items: unknown[]; total: number }>(
      await companyA.client.request('/api/orders'),
    );
    expect(aOrders.total).toBeGreaterThanOrEqual(1);
  });
});
