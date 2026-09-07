/**
 * Модуль uploads — аватар/обложка/обои в R2 (допущения 12, 13). Контракт: docs/04-architecture.md §4.11.
 * Обрезка выполняется на фронтенде через Cropper.js до отправки — сюда приходит уже готовый файл.
 *
 * ВАЖНО: этот роутер монтируется в index.ts на `/api` (не `/api/uploads`) — пути ниже уже
 * содержат префикс `/uploads` или `/media`, чтобы отдача файлов жила на чистом `/api/media/:key`,
 * а не `/api/uploads/media/:key` (см. docs/04-architecture.md §4.11).
 */
import { Hono, type Context } from 'hono';
import type { Env } from '../types/env';
import { apiError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { execute } from '../db/client';
import { buildMediaKey, publicMediaUrl, putMediaObject, PRESET_WALLPAPERS, type MediaKind } from '../lib/r2';
import { getCompanyBasicByUserId } from '../lib/queries';

export const uploadsRouter = new Hono<{ Bindings: Env }>();

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_PREFIXES = ['image/'];

async function extractUploadedFile(
  c: Context<{ Bindings: Env }>,
): Promise<{ file: File } | { error: string }> {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return { error: 'Ожидался multipart/form-data с полем "file"' };
  }
  const file = body.file;
  if (!(file instanceof File)) {
    return { error: 'Поле "file" обязательно и должно быть файлом' };
  }
  if (file.size === 0) {
    return { error: 'Файл пустой' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: 'Файл слишком большой (максимум 5 МБ)' };
  }
  if (!ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
    return { error: 'Допустимы только изображения' };
  }
  return { file };
}

function extensionFromMime(mime: string): string {
  const parts = mime.split('/');
  return parts[1]?.split('+')[0] || 'bin';
}

async function storeUploadedFile(
  c: Context<{ Bindings: Env }>,
  kind: MediaKind,
  ownerId: string,
): Promise<{ url: string } | { errorResponse: Response }> {
  const result = await extractUploadedFile(c);
  if ('error' in result) return { errorResponse: apiError(c, 400, 'validation_error', result.error) };

  const key = buildMediaKey(kind, ownerId, extensionFromMime(result.file.type));
  await putMediaObject(key, await result.file.arrayBuffer(), result.file.type, c.env);
  return { url: publicMediaUrl(key) };
}

uploadsRouter.post('/uploads/avatar', requireAuth(), async (c) => {
  const userId = c.get('userId');
  const result = await storeUploadedFile(c, 'avatar', userId);
  if ('errorResponse' in result) return result.errorResponse;
  await execute(c.env.DB, 'UPDATE users SET avatar_url = ? WHERE id = ?', [result.url, userId]);
  return c.json({ url: result.url });
});

uploadsRouter.post('/uploads/cover', requireAuth('company'), async (c) => {
  const company = await getCompanyBasicByUserId(c.env.DB, c.get('userId'));
  if (!company) return apiError(c, 403, 'forbidden', 'У вас нет профиля компании');
  const result = await storeUploadedFile(c, 'cover', company.id);
  if ('errorResponse' in result) return result.errorResponse;
  await execute(c.env.DB, 'UPDATE companies SET cover_url = ? WHERE id = ?', [
    result.url,
    company.id,
  ]);
  return c.json({ url: result.url });
});

uploadsRouter.get('/uploads/wallpapers', async (c) => {
  // Единственный реально рабочий эндпоинт модуля на этом шаге — статический список пресетов.
  return c.json({ presets: PRESET_WALLPAPERS });
});

uploadsRouter.post('/uploads/wallpaper', requireAuth(), async (c) => {
  const userId = c.get('userId');
  const result = await storeUploadedFile(c, 'wallpaper', userId);
  if ('errorResponse' in result) return result.errorResponse;
  await execute(c.env.DB, 'UPDATE users SET wallpaper_url = ? WHERE id = ?', [result.url, userId]);
  return c.json({ url: result.url });
});

/** Отдача объекта из R2 по ключу (публичные аватары/обложки без подписанных URL в MVP). */
uploadsRouter.get('/media/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.MEDIA.get(key);
  if (!object) return apiError(c, 404, 'not_found', 'Файл не найден');

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  return new Response(object.body, { headers });
});

export default uploadsRouter;
