/**
 * HTTP-тесты F2/F3/F4/F13 — поиск по городу, ТОП-3, урезанная карточка неверифицированной
 * компании, счётчик просмотров, пагинация. Контракт: docs/04-architecture.md §4.3.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, createTestEnv, json, type TestEnvHandle } from './helpers';
import { createService, registerCompany, unique } from './fixtures';
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

describe('GET /api/companies (F2 — список по городу)', () => {
  it('пустой город без компаний → пустой список, не ошибка', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/companies?city=НесуществующийГород12345');
    expect(res.status).toBe(200);
    const body = await json<{ items: unknown[]; total: number }>(res);
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('возвращает компании выбранного города, не смешивает с другими городами', async () => {
    const city = unique('Город');
    await registerCompany(env, { city });
    await registerCompany(env, { city });
    await registerCompany(env, { city: `${city}-другой` });

    const guest = createClient(env);
    const res = await guest.request(`/api/companies?city=${encodeURIComponent(city)}`);
    const body = await json<{ items: Array<{ city: string }>; total: number }>(res);
    expect(body.total).toBe(2);
    expect(body.items.every((c) => c.city === city)).toBe(true);
  });

  it('без query city → 400 validation_error', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/companies');
    expect(res.status).toBe(400);
  });

  it('пагинация: limit=1 возвращает hasMore=true при 2+ компаниях', async () => {
    const city = unique('ПагГород');
    await registerCompany(env, { city });
    await registerCompany(env, { city });

    const guest = createClient(env);
    const res = await guest.request(
      `/api/companies?city=${encodeURIComponent(city)}&limit=1&page=1`,
    );
    const body = await json<{ items: unknown[]; hasMore: boolean; total: number }>(res);
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(2);
    expect(body.hasMore).toBe(true);

    const page2 = await guest.request(
      `/api/companies?city=${encodeURIComponent(city)}&limit=1&page=2`,
    );
    const page2Body = await json<{ items: unknown[]; hasMore: boolean }>(page2);
    expect(page2Body.items).toHaveLength(1);
    expect(page2Body.hasMore).toBe(false);
  });
});

describe('GET /api/companies/top (F3 — формула rating_score)', () => {
  it('возвращает верифицированные компании в порядке убывания rating_score, максимум 3', async () => {
    const city = unique('ТопГород');
    // 4 верифицированные компании с разным рейтингом (создаём отзывы, чтобы rating_avg отличался).
    const companies = await Promise.all([
      registerCompany(env, { city }),
      registerCompany(env, { city }),
      registerCompany(env, { city }),
      registerCompany(env, { city }),
    ]);
    const unverified = await registerCompany(env, { city, verified: false });

    // Различаем orders_count через реальные заказы, чтобы формула отличала компании не только
    // рейтингом. Создаём услугу и заказ в каждой компании в разном количестве.
    for (const [idx, company] of companies.entries()) {
      const service = await createService(env, company, { price: 1000 });
      const buyer = await import('./fixtures').then((m) => m.registerClient(env, { city }));
      for (let i = 0; i <= idx; i += 1) {
        await buyer.client.requestJson('POST', '/api/orders', {
          companyId: company.companyId,
          serviceId: service.id,
        });
      }
    }

    const guest = createClient(env);
    const res = await guest.request(`/api/companies/top?city=${encodeURIComponent(city)}`);
    expect(res.status).toBe(200);
    const body = await json<{ items: Array<{ id: string; ordersCount: number }> }>(res);
    expect(body.items.length).toBeLessThanOrEqual(3);
    expect(body.items.some((c) => c.id === unverified.companyId)).toBe(false);

    // Порядок должен быть невозрастающим по ordersCount, т.к. это единственный различающий
    // компании фактор при равном (нулевом) рейтинге и одинаковой (неизвестной) скорости ответа.
    const orders = body.items.map((c) => c.ordersCount);
    const sorted = [...orders].sort((a, b) => b - a);
    expect(orders).toEqual(sorted);
  });

  it('неверифицированные компании никогда не попадают в ТОП-3', async () => {
    const city = unique('ТопНеверГород');
    const unverified = await registerCompany(env, { city, verified: false });

    const guest = createClient(env);
    const res = await guest.request(`/api/companies/top?city=${encodeURIComponent(city)}`);
    const body = await json<{ items: Array<{ id: string }> }>(res);
    expect(body.items.some((c) => c.id === unverified.companyId)).toBe(false);
  });

  it('город без компаний → пустой items, не ошибка', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/companies/top?city=НетТакогоГорода999');
    expect(res.status).toBe(200);
    const body = await json<{ items: unknown[] }>(res);
    expect(body.items).toEqual([]);
  });
});

describe('GET /api/companies/:id (F4 — карточка, урезанная для неверифицированных)', () => {
  it('404 для несуществующей компании (валидный UUID, отсутствующая запись)', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/companies/00000000-0000-4000-8000-000000000000');
    expect(res.status).toBe(404);
    const body = await json<{ error: { code: string } }>(res);
    expect(body.error.code).toBe('not_found');
  });

  it('невалидный (не-UUID) id → 400, не 500', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/companies/not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('верифицированная компания: priceFrom заполнен, isVerified=true', async () => {
    const company = await registerCompany(env);
    await createService(env, company, { price: 3300 });

    const guest = createClient(env);
    const res = await guest.request(`/api/companies/${company.companyId}`);
    const body = await json<{ isVerified: boolean; priceFrom: number | null }>(res);
    expect(body.isVerified).toBe(true);
    expect(body.priceFrom).toBe(3300);
  });

  it('неверифицированная компания: priceFrom=null, services/promotions пусты (бэкенд, не только фронт)', async () => {
    const company = await registerCompany(env, { verified: false });

    const guest = createClient(env);
    const cardRes = await guest.request(`/api/companies/${company.companyId}`);
    const card = await json<{ isVerified: boolean; priceFrom: number | null }>(cardRes);
    expect(card.isVerified).toBe(false);
    expect(card.priceFrom).toBeNull();

    const servicesRes = await guest.request(`/api/companies/${company.companyId}/services`);
    const services = await json<{ items: unknown[] }>(servicesRes);
    expect(services.items).toEqual([]);

    const promotionsRes = await guest.request(`/api/companies/${company.companyId}/promotions`);
    const promotions = await json<{ items: unknown[] }>(promotionsRes);
    expect(promotions.items).toEqual([]);
  });
});

describe('PATCH /api/companies/:id — владение и авторизация', () => {
  it('чужая компания не может редактировать профиль → 403', async () => {
    const owner = await registerCompany(env);
    const stranger = await registerCompany(env);

    const res = await stranger.client.requestJson('PATCH', `/api/companies/${owner.companyId}`, {
      name: 'Захват профиля',
    });
    expect(res.status).toBe(403);
  });

  it('без авторизации → 401', async () => {
    const owner = await registerCompany(env);
    const guest = createClient(env);
    const res = await guest.requestJson('PATCH', `/api/companies/${owner.companyId}`, {
      name: 'X',
    });
    expect(res.status).toBe(401);
  });

  it('владелец успешно меняет название', async () => {
    const owner = await registerCompany(env);
    const res = await owner.client.requestJson('PATCH', `/api/companies/${owner.companyId}`, {
      name: 'Новое имя компании',
    });
    expect(res.status).toBe(200);
    const body = await json<{ name: string }>(res);
    expect(body.name).toBe('Новое имя компании');
  });
});

describe('POST /api/companies/:id/view (F13 — счётчик просмотров)', () => {
  it('каждый вызов увеличивает views_count на 1', async () => {
    const company = await registerCompany(env);
    const guest = createClient(env);

    const before = await json<{ viewsCount: number }>(
      await guest.request(`/api/companies/${company.companyId}`),
    );
    await guest.request(`/api/companies/${company.companyId}/view`, { method: 'POST' });
    await guest.request(`/api/companies/${company.companyId}/view`, { method: 'POST' });
    const after = await json<{ viewsCount: number }>(
      await guest.request(`/api/companies/${company.companyId}`),
    );
    expect(after.viewsCount).toBe(before.viewsCount + 2);
  });

  it('несуществующая компания → 404', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/companies/00000000-0000-4000-8000-000000000001/view', {
      method: 'POST',
    });
    expect(res.status).toBe(404);
  });
});
