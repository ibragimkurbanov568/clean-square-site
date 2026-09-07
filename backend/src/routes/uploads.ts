/**
 * Модуль uploads — аватар/обложка/обои в R2 (допущения 12, 13). Контракт: docs/04-architecture.md §4.11.
 * Обрезка выполняется на фронтенде через Cropper.js до отправки — сюда приходит уже готовый файл.
 *
 * ВАЖНО: этот роутер монтируется в index.ts на `/api` (не `/api/uploads`) — пути ниже уже
 * содержат префикс `/uploads` или `/media`, чтобы отдача файлов жила на чистом `/api/media/:key`,
 * а не `/api/uploads/media/:key` (см. docs/04-architecture.md §4.11).
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { PRESET_WALLPAPERS } from '../lib/r2';

export const uploadsRouter = new Hono<{ Bindings: Env }>();

uploadsRouter.post('/uploads/avatar', requireAuth(), async (c) => {
  return notImplemented(c, 'POST /api/uploads/avatar (multipart/form-data, поле "file")');
});

uploadsRouter.post('/uploads/cover', requireAuth('company'), async (c) => {
  return notImplemented(c, 'POST /api/uploads/cover (multipart/form-data, поле "file")');
});

uploadsRouter.get('/uploads/wallpapers', async (c) => {
  // Единственный реально рабочий эндпоинт модуля на этом шаге — статический список пресетов.
  return c.json({ presets: PRESET_WALLPAPERS });
});

uploadsRouter.post('/uploads/wallpaper', requireAuth(), async (c) => {
  return notImplemented(c, 'POST /api/uploads/wallpaper (multipart/form-data, поле "file")');
});

/** Отдача объекта из R2 по ключу (публичные аватары/обложки без подписанных URL в MVP). */
uploadsRouter.get('/media/:key{.+}', async (c) => {
  const key = c.req.param('key');
  return notImplemented(c, `GET /api/media/${key}`);
});

export default uploadsRouter;
