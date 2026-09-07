/**
 * HTTP-тесты чата (F6) — уникальность (client_id, company_id), отправка/поллинг сообщений,
 * доступ только участникам, шифрование at rest. Контракт: docs/04-architecture.md §4.10.
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

describe('POST /api/chats — создание/переиспользование', () => {
  it('повторный вызов с тем же companyId не создаёт дублей (UNIQUE client_id+company_id)', async () => {
    const company = await registerCompany(env);
    const client = await registerClient(env);

    const first = await client.client.requestJson('POST', '/api/chats', {
      companyId: company.companyId,
    });
    expect(first.status).toBe(201);
    const firstBody = await json<{ id: string }>(first);

    const second = await client.client.requestJson('POST', '/api/chats', {
      companyId: company.companyId,
    });
    expect(second.status).toBe(200); // существующий — не 201
    const secondBody = await json<{ id: string }>(second);
    expect(secondBody.id).toBe(firstBody.id);
  });

  it('несуществующая компания → 404', async () => {
    const client = await registerClient(env);
    const res = await client.client.requestJson('POST', '/api/chats', {
      companyId: '00000000-0000-4000-8000-000000000040',
    });
    expect(res.status).toBe(404);
  });
});

describe('Сообщения — отправка, шифрование at rest, поллинг', () => {
  it('сообщение шифруется в БД, но расшифровано в ответе API', async () => {
    const company = await registerCompany(env);
    const client = await registerClient(env);
    const chat = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/chats', { companyId: company.companyId }),
    );

    const sendRes = await client.client.requestJson('POST', `/api/chats/${chat.id}/messages`, {
      text: 'Здравствуйте, уточните пожалуйста время визита',
    });
    expect(sendRes.status).toBe(201);
    const sent = await json<{ text: string }>(sendRes);
    expect(sent.text).toBe('Здравствуйте, уточните пожалуйста время визита');

    const rawRow = await env.DB.prepare('SELECT text FROM messages WHERE chat_id = ?')
      .bind(chat.id)
      .first<{ text: string }>();
    expect(rawRow?.text).not.toBe('Здравствуйте, уточните пожалуйста время визита');
    expect(rawRow?.text).toContain(':'); // формат `<iv>:<ciphertext>`

    const historyRes = await company.client.request(`/api/chats/${chat.id}/messages`);
    const history = await json<{ items: Array<{ text: string }> }>(historyRes);
    expect(history.items.map((m) => m.text)).toContain(
      'Здравствуйте, уточните пожалуйста время визита',
    );
  });

  it('чужой пользователь (не участник чата) не может читать/писать → 403', async () => {
    const company = await registerCompany(env);
    const client = await registerClient(env);
    const chat = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/chats', { companyId: company.companyId }),
    );

    const stranger = await registerClient(env);
    const readRes = await stranger.client.request(`/api/chats/${chat.id}/messages`);
    expect(readRes.status).toBe(403);

    const writeRes = await stranger.client.requestJson('POST', `/api/chats/${chat.id}/messages`, {
      text: 'Подглядываю',
    });
    expect(writeRes.status).toBe(403);
  });

  it('поллинг с after= возвращает только новые сообщения', async () => {
    const company = await registerCompany(env);
    const client = await registerClient(env);
    const chat = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/chats', { companyId: company.companyId }),
    );

    await client.client.requestJson('POST', `/api/chats/${chat.id}/messages`, { text: 'Первое' });
    const cursor = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 5));
    await client.client.requestJson('POST', `/api/chats/${chat.id}/messages`, { text: 'Второе' });

    const pollRes = await company.client.request(
      `/api/chats/${chat.id}/poll?after=${encodeURIComponent(cursor)}`,
    );
    const pollBody = await json<{ items: Array<{ text: string }> }>(pollRes);
    expect(pollBody.items.map((m) => m.text)).toEqual(['Второе']);
  });

  it('пустое сообщение отклоняется валидацией → 400', async () => {
    const company = await registerCompany(env);
    const client = await registerClient(env);
    const chat = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/chats', { companyId: company.companyId }),
    );
    const res = await client.client.requestJson('POST', `/api/chats/${chat.id}/messages`, {
      text: '',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/chats — список отсортирован по last_message_at', () => {
  it('чат с более новым сообщением идёт первым', async () => {
    const client = await registerClient(env);
    const companyA = await registerCompany(env);
    const companyB = await registerCompany(env);

    const chatA = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/chats', { companyId: companyA.companyId }),
    );
    const chatB = await json<{ id: string }>(
      await client.client.requestJson('POST', '/api/chats', { companyId: companyB.companyId }),
    );

    await client.client.requestJson('POST', `/api/chats/${chatA.id}/messages`, { text: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    await client.client.requestJson('POST', `/api/chats/${chatB.id}/messages`, { text: 'B' });

    const list = await json<{ items: Array<{ id: string }> }>(
      await client.client.request('/api/chats'),
    );
    const ids = list.items.map((c) => c.id);
    expect(ids.indexOf(chatB.id)).toBeLessThan(ids.indexOf(chatA.id));
  });
});
