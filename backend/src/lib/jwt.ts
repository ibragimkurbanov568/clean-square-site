/**
 * JWT access + refresh поверх `hono/jwt` (Web-Crypto-based, без внешней зависимости).
 * Токены живут в HttpOnly cookies — см. docs/04-architecture.md §2.2 и §6.
 */
import { sign, verify } from 'hono/jwt';
import type { Env } from '../types/env';

export const ACCESS_COOKIE_NAME = 'cleanlink_access';
export const REFRESH_COOKIE_NAME = 'cleanlink_refresh';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 минут
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 дней ("Запомнить меня")
export const REFRESH_TOKEN_TTL_SESSION_SECONDS = 24 * 60 * 60; // 1 день без "Запомнить меня"

export type UserRole = 'client' | 'company';

export interface AccessTokenPayload {
  sub: string; // users.id
  role: UserRole;
  exp: number;
  [key: string]: unknown;
}

export interface RefreshTokenPayload {
  sub: string; // users.id
  sid: string; // session id, для сверки/отзыва через KV SESSIONS
  exp: number;
  [key: string]: unknown;
}

export async function signAccessToken(
  payload: Pick<AccessTokenPayload, 'sub' | 'role'>,
  env: Pick<Env, 'JWT_ACCESS_SECRET'>,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS;
  return sign({ ...payload, exp }, env.JWT_ACCESS_SECRET);
}

export async function signRefreshToken(
  payload: Pick<RefreshTokenPayload, 'sub' | 'sid'>,
  env: Pick<Env, 'JWT_REFRESH_SECRET'>,
  ttlSeconds: number = REFRESH_TOKEN_TTL_SECONDS,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return sign({ ...payload, exp }, env.JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(
  token: string,
  env: Pick<Env, 'JWT_ACCESS_SECRET'>,
): Promise<AccessTokenPayload> {
  const payload = await verify(token, env.JWT_ACCESS_SECRET, 'HS256');
  return payload as unknown as AccessTokenPayload;
}

export async function verifyRefreshToken(
  token: string,
  env: Pick<Env, 'JWT_REFRESH_SECRET'>,
): Promise<RefreshTokenPayload> {
  const payload = await verify(token, env.JWT_REFRESH_SECRET, 'HS256');
  return payload as unknown as RefreshTokenPayload;
}
