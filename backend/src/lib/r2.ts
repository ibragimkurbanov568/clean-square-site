/**
 * Загрузка медиа (аватары, обложки, видео-ссылки, обои) в R2 — см. допущения 12/13.
 * Реализация обрезки — Cropper.js на фронтенде перед отправкой файла (уже обрезанный blob).
 */
import type { Env } from '../types/env';

export type MediaKind = 'avatar' | 'cover' | 'wallpaper';

export function buildMediaKey(kind: MediaKind, ownerId: string, extension: string): string {
  return `${kind}/${ownerId}/${crypto.randomUUID()}.${extension}`;
}

/** Публичный путь отдачи объекта — проксируется через `GET /api/uploads/:key*` (см. routes/uploads.ts). */
export function publicMediaUrl(key: string): string {
  return `/api/media/${key}`;
}

export async function putMediaObject(
  key: string,
  data: ArrayBuffer | ReadableStream,
  contentType: string,
  env: Pick<Env, 'MEDIA'>,
): Promise<void> {
  await env.MEDIA.put(key, data, { httpMetadata: { contentType } });
}

/** Предустановленная галерея фонов кабинета компании (допущение 12) — статические ассеты. */
export const PRESET_WALLPAPERS = [
  '/wallpapers/preset-1.jpg',
  '/wallpapers/preset-2.jpg',
  '/wallpapers/preset-3.jpg',
  '/wallpapers/preset-4.jpg',
  '/wallpapers/preset-5.jpg',
  '/wallpapers/preset-6.jpg',
] as const;
