/**
 * HTTP-тесты загрузок в R2 (допущения 12/13, docs/04-architecture.md §4.11) — multipart-form,
 * ограничение типа/размера, доступ по роли, отдача через /api/media/:key.
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

function pngFile(name = 'avatar.png'): File {
  // Минимальный валидный PNG-заголовок (8 байт сигнатуры) — этого достаточно, бэкенд не
  // парсит содержимое, только MIME/размер.
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
  return new File([bytes], name, { type: 'image/png' });
}

describe('POST /api/uploads/avatar', () => {
  it('авторизованный пользователь загружает аватар, файл реально сохранён в R2 под возвращённым ключом', async () => {
    const client = await registerClient(env);
    const form = new FormData();
    form.set('file', pngFile());

    const res = await client.client.request('/api/uploads/avatar', { method: 'POST', body: form });
    expect(res.status).toBe(200);
    const body = await json<{ url: string }>(res);
    expect(body.url).toMatch(/^\/api\/media\//);

    // Проверяем факт сохранения напрямую через R2-биндинг, а не через GET /api/media/:key.
    // Причина: маршрут `/api/media/:key` вызывает `object.writeHttpMetadata(headers)` — этот
    // паттерн штатно работает в реальном Workers-рантайме (подтверждено вручную: `wrangler dev`
    // + curl round-trip дал побайтово идентичный файл и верный Content-Type), но ломается именно
    // в этой тестовой обвязке: `getPlatformProxy()` отдаёт R2-биндинг как RPC-прокси между
    // Node-процессом Vitest и процессом workerd, а `writeHttpMetadata` мутирует переданный
    // объект `Headers` по ссылке — это несериализуемо через RPC-границу (`devalue`-ошибка
    // "Cannot stringify arbitrary non-POJOs"). Это ограничение тестовой инфраструктуры, не баг
    // приложения — задокументировано в docs/08-qa.md.
    const key = body.url.replace('/api/media/', '');
    const stored = await env.MEDIA.get(key);
    expect(stored).not.toBeNull();
    expect(stored?.httpMetadata?.contentType).toBe('image/png');
    const storedBytes = new Uint8Array(await stored!.arrayBuffer());
    expect(storedBytes.length).toBeGreaterThan(0);
  });

  it('без авторизации → 401', async () => {
    const guest = createClient(env);
    const form = new FormData();
    form.set('file', pngFile());
    const res = await guest.request('/api/uploads/avatar', { method: 'POST', body: form });
    expect(res.status).toBe(401);
  });

  it('не-изображение отклоняется → 400', async () => {
    const client = await registerClient(env);
    const form = new FormData();
    form.set('file', new File(['plain text content'], 'note.txt', { type: 'text/plain' }));
    const res = await client.client.request('/api/uploads/avatar', { method: 'POST', body: form });
    expect(res.status).toBe(400);
  });

  it('без поля file → 400', async () => {
    const client = await registerClient(env);
    const form = new FormData();
    const res = await client.client.request('/api/uploads/avatar', { method: 'POST', body: form });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/uploads/cover — только компания', () => {
  it('клиент не может загрузить обложку компании → 403', async () => {
    const client = await registerClient(env);
    const form = new FormData();
    form.set('file', pngFile());
    const res = await client.client.request('/api/uploads/cover', { method: 'POST', body: form });
    expect(res.status).toBe(403);
  });

  it('компания загружает обложку успешно', async () => {
    const company = await registerCompany(env);
    const form = new FormData();
    form.set('file', pngFile('cover.png'));
    const res = await company.client.request('/api/uploads/cover', { method: 'POST', body: form });
    expect(res.status).toBe(200);
    const body = await json<{ url: string }>(res);
    expect(body.url).toMatch(/^\/api\/media\//);
  });
});

describe('GET /api/uploads/wallpapers', () => {
  it('отдаёт непустой список пресетов без авторизации', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/uploads/wallpapers');
    expect(res.status).toBe(200);
    const body = await json<{ presets: string[] }>(res);
    expect(body.presets.length).toBeGreaterThan(0);
  });
});

describe('GET /api/media/:key', () => {
  it('несуществующий ключ → 404', async () => {
    const guest = createClient(env);
    const res = await guest.request('/api/media/avatar/does-not-exist.png');
    expect(res.status).toBe(404);
  });
});
