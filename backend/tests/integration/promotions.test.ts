/**
 * HTTP-тесты акций (F9) — публичная выдача скрывает истёкшие, владение, верификация.
 * Контракт: docs/04-architecture.md §4.8.
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

function futureDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pastDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

describe('POST /api/companies/:id/promotions', () => {
  it('верифицированная компания создаёт акцию, сразу видна публично', async () => {
    const company = await registerCompany(env);
    const res = await company.client.requestJson('POST', `/api/companies/${company.companyId}/promotions`, {
      title: 'Скидка на первую уборку',
      discountPercent: 20,
      validUntil: futureDate(30),
    });
    expect(res.status).toBe(201);

    const guest = createClient(env);
    const list = await json<{ items: Array<{ title: string; isExpired: boolean }> }>(
      await guest.request(`/api/companies/${company.companyId}/promotions`),
    );
    expect(list.items.some((p) => p.title === 'Скидка на первую уборку' && !p.isExpired)).toBe(
      true,
    );
  });

  it('неверифицированная компания не может создать акцию → 403', async () => {
    const company = await registerCompany(env, { verified: false });
    const res = await company.client.requestJson('POST', `/api/companies/${company.companyId}/promotions`, {
      title: 'Акция',
      discountPercent: 10,
      validUntil: futureDate(10),
    });
    expect(res.status).toBe(403);
  });

  it('чужая компания не может создать акцию → 403', async () => {
    const owner = await registerCompany(env);
    const stranger = await registerCompany(env);
    const res = await stranger.client.requestJson('POST', `/api/companies/${owner.companyId}/promotions`, {
      title: 'Захват',
      discountPercent: 10,
      validUntil: futureDate(10),
    });
    expect(res.status).toBe(403);
  });

  it('процент скидки вне диапазона 1-100 → 400', async () => {
    const company = await registerCompany(env);
    const res = await company.client.requestJson('POST', `/api/companies/${company.companyId}/promotions`, {
      title: 'Слишком много',
      discountPercent: 150,
      validUntil: futureDate(10),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/companies/:id/promotions — скрытие истёкших', () => {
  it('публично истёкшая акция не показывается, но видна на дату наперёд (не истекла сегодня)', async () => {
    const company = await registerCompany(env);
    // Истёкшая: valid_until вчера.
    await company.client.requestJson('POST', `/api/companies/${company.companyId}/promotions`, {
      title: 'Уже неактуально',
      discountPercent: 15,
      validUntil: pastDate(1),
    });
    // Активная: valid_until через неделю.
    await company.client.requestJson('POST', `/api/companies/${company.companyId}/promotions`, {
      title: 'Ещё действует',
      discountPercent: 15,
      validUntil: futureDate(7),
    });

    const guest = createClient(env);
    const publicList = await json<{ items: Array<{ title: string }> }>(
      await guest.request(`/api/companies/${company.companyId}/promotions`),
    );
    expect(publicList.items.map((p) => p.title)).toEqual(['Ещё действует']);

    // Владелец в своей панели видит обе (включая истёкшую) — авторизован как company-владелец.
    const ownerList = await json<{ items: Array<{ title: string }> }>(
      await company.client.request(`/api/companies/${company.companyId}/promotions`),
    );
    expect(ownerList.items.map((p) => p.title).sort()).toEqual(
      ['Ещё действует', 'Уже неактуально'].sort(),
    );
  });

  it('неверифицированная компания — акции всегда пусты публично', async () => {
    const company = await registerCompany(env, { verified: false });
    const guest = createClient(env);
    const res = await guest.request(`/api/companies/${company.companyId}/promotions`);
    const body = await json<{ items: unknown[] }>(res);
    expect(body.items).toEqual([]);
  });
});

describe('PATCH/DELETE /api/promotions/:id', () => {
  it('владелец редактирует и удаляет; чужая компания получает 403', async () => {
    const owner = await registerCompany(env);
    const created = await json<{ id: string }>(
      await owner.client.requestJson('POST', `/api/companies/${owner.companyId}/promotions`, {
        title: 'Тест',
        discountPercent: 5,
        validUntil: futureDate(5),
      }),
    );

    const stranger = await registerCompany(env);
    const forbidden = await stranger.client.requestJson('PATCH', `/api/promotions/${created.id}`, {
      discountPercent: 99,
    });
    expect(forbidden.status).toBe(403);

    const patched = await owner.client.requestJson('PATCH', `/api/promotions/${created.id}`, {
      discountPercent: 30,
    });
    expect(patched.status).toBe(200);
    expect((await json<{ discountPercent: number }>(patched)).discountPercent).toBe(30);

    const forbiddenDelete = await stranger.client.requestJson('DELETE', `/api/promotions/${created.id}`);
    expect(forbiddenDelete.status).toBe(403);

    const deleted = await owner.client.requestJson('DELETE', `/api/promotions/${created.id}`);
    expect(deleted.status).toBe(200);
  });
});
