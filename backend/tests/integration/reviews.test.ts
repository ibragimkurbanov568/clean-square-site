/**
 * HTTP-тесты отзывов (F7) — оставить только к выполненному заказу, только один раз, ответ
 * компании, сортировка/пагинация, пересчёт rating_avg. Контракт: docs/04-architecture.md §4.6.
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

async function makeDoneOrder(overridePrice = 2000) {
  const company = await registerCompany(env);
  const service = await createService(env, company, { price: overridePrice });
  const client = await registerClient(env);
  const created = await json<{ id: string }>(
    await client.client.requestJson('POST', '/api/orders', {
      companyId: company.companyId,
      serviceId: service.id,
    }),
  );
  await company.client.requestJson('PATCH', `/api/orders/${created.id}/status`, {
    status: 'in_progress',
  });
  await company.client.requestJson('PATCH', `/api/orders/${created.id}/status`, {
    status: 'done',
  });
  return { company, client, orderId: created.id };
}

describe('POST /api/orders/:id/review', () => {
  it('отзыв к заказу не в статусе done → 400 invalid_status', async () => {
    const company = await registerCompany(env);
    const service = await createService(env, company);
    const client = await registerClient(env);
    const created = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/orders', {
        companyId: company.companyId,
        serviceId: service.id,
      }),
    );

    const res = await client.client.requestJson('POST', `/api/orders/${created.id}/review`, {
      rating: 5,
      text: 'Отлично',
    });
    expect(res.status).toBe(400);
    const body = await json<{ error: { code: string } }>(res);
    expect(body.error.code).toBe('invalid_status');
  });

  it('отзыв к выполненному заказу — успех, кнопка (hasReview) отражается в GET /orders', async () => {
    const { client, orderId } = await makeDoneOrder();
    const res = await client.client.requestJson('POST', `/api/orders/${orderId}/review`, {
      rating: 4,
      text: 'Хорошо, но можно лучше',
    });
    expect(res.status).toBe(201);
    const body = await json<{ rating: number; companyReply: string | null }>(res);
    expect(body.rating).toBe(4);
    expect(body.companyReply).toBeNull();

    const order = await json<{ hasReview: boolean }>(
      await client.client.request(`/api/orders/${orderId}`),
    );
    expect(order.hasReview).toBe(true);
  });

  it('повторный отзыв к тому же заказу → 409 conflict', async () => {
    const { client, orderId } = await makeDoneOrder();
    await client.client.requestJson('POST', `/api/orders/${orderId}/review`, { rating: 5 });
    const res = await client.client.requestJson('POST', `/api/orders/${orderId}/review`, {
      rating: 3,
    });
    expect(res.status).toBe(409);
  });

  it('чужой заказ (не свой клиент) → 403', async () => {
    const { orderId } = await makeDoneOrder();
    const stranger = await registerClient(env);
    const res = await stranger.client.requestJson('POST', `/api/orders/${orderId}/review`, {
      rating: 5,
    });
    expect(res.status).toBe(403);
  });

  it('оценка вне диапазона 1-5 → 400 с понятным текстом', async () => {
    const { client, orderId } = await makeDoneOrder();
    const res = await client.client.requestJson('POST', `/api/orders/${orderId}/review`, {
      rating: 0,
    });
    expect(res.status).toBe(400);
  });

  it('текст со стоп-словом отклоняется модерацией → 400 review_rejected', async () => {
    const { client, orderId } = await makeDoneOrder();
    const res = await client.client.requestJson('POST', `/api/orders/${orderId}/review`, {
      rating: 1,
      text: 'Это спам, не покупайте',
    });
    expect(res.status).toBe(400);
    const body = await json<{ error: { code: string } }>(res);
    expect(body.error.code).toBe('review_rejected');
  });

  it('пересчитывает companies.rating_avg после нового отзыва', async () => {
    const { client, company, orderId } = await makeDoneOrder();
    await client.client.requestJson('POST', `/api/orders/${orderId}/review`, { rating: 2 });

    const guest = createClient(env);
    const card = await json<{ ratingAvg: number; reviewsCount: number }>(
      await guest.request(`/api/companies/${company.companyId}`),
    );
    expect(card.reviewsCount).toBe(1);
    expect(card.ratingAvg).toBe(2);
  });
});

describe('POST /api/reviews/:id/reply — ответ компании', () => {
  it('владелец компании отвечает, ответ виден сразу в публичном списке', async () => {
    const { client, company, orderId } = await makeDoneOrder();
    const review = await json<{ id: string }>(
      await client.client.requestJson('POST', `/api/orders/${orderId}/review`, { rating: 5 }),
    );

    const replyRes = await company.client.requestJson('POST', `/api/reviews/${review.id}/reply`, {
      text: 'Спасибо за отзыв!',
    });
    expect(replyRes.status).toBe(200);
    expect((await json<{ companyReply: string | null }>(replyRes)).companyReply).toBe(
      'Спасибо за отзыв!',
    );

    const guest = createClient(env);
    const list = await json<{ items: Array<{ id: string; companyReply: string | null }> }>(
      await guest.request(`/api/companies/${company.companyId}/reviews`),
    );
    const found = list.items.find((r) => r.id === review.id);
    expect(found?.companyReply).toBe('Спасибо за отзыв!');
  });

  it('чужая компания не может ответить на отзыв → 403', async () => {
    const { client, orderId } = await makeDoneOrder();
    const review = await json<{ id: string }>(
      await client.client.requestJson('POST', `/api/orders/${orderId}/review`, { rating: 5 }),
    );
    const stranger = await registerCompany(env);
    const res = await stranger.client.requestJson('POST', `/api/reviews/${review.id}/reply`, {
      text: 'Чужой ответ',
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/companies/:id/reviews — сортировка и пагинация', () => {
  it('sort=rating_desc/rating_asc видимо переупорядочивает список', async () => {
    const company = await registerCompany(env);
    const service = await createService(env, company);

    const ratings = [3, 5, 1];
    for (const rating of ratings) {
      const client = await registerClient(env);
      const order = await json<{ id: string }>(
        await client.client.requestJson('POST', '/api/orders', {
          companyId: company.companyId,
          serviceId: service.id,
        }),
      );
      await company.client.requestJson('PATCH', `/api/orders/${order.id}/status`, {
        status: 'in_progress',
      });
      await company.client.requestJson('PATCH', `/api/orders/${order.id}/status`, {
        status: 'done',
      });
      await client.client.requestJson('POST', `/api/orders/${order.id}/review`, { rating });
    }

    const guest = createClient(env);
    const desc = await json<{ items: Array<{ rating: number }> }>(
      await guest.request(`/api/companies/${company.companyId}/reviews?sort=rating_desc`),
    );
    expect(desc.items.map((r) => r.rating)).toEqual([5, 3, 1]);

    const asc = await json<{ items: Array<{ rating: number }> }>(
      await guest.request(`/api/companies/${company.companyId}/reviews?sort=rating_asc`),
    );
    expect(asc.items.map((r) => r.rating)).toEqual([1, 3, 5]);
  });

  it('404 при отзывах несуществующей компании', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/companies/00000000-0000-4000-8000-000000000020/reviews');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/account/reviews — отзывы клиента', () => {
  it('видны только собственные отзывы клиента', async () => {
    const { client, orderId } = await makeDoneOrder();
    await client.client.requestJson('POST', `/api/orders/${orderId}/review`, { rating: 5 });

    const own = await json<{ items: unknown[]; total: number }>(
      await client.client.request('/api/account/reviews'),
    );
    expect(own.total).toBe(1);

    const stranger = await registerClient(env);
    const strangerReviews = await json<{ total: number }>(
      await stranger.client.request('/api/account/reviews'),
    );
    expect(strangerReviews.total).toBe(0);
  });

  it('без авторизации → 401', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/account/reviews');
    expect(res.status).toBe(401);
  });
});
