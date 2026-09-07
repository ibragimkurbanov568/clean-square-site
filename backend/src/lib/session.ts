/**
 * Управление сессиями логина (F1, docs/04-architecture.md §2.2): refresh-сессии (sid) хранятся в
 * KV `SESSIONS`, что позволяет отозвать сессию (logout) без ожидания истечения JWT. Тот же
 * namespace используется для короткоживущих 2FA login-челленджей.
 */
import type { Context } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import type { Env } from '../types/env';
import { newId } from '../db/client';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SESSION_SECONDS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type UserRole,
} from './jwt';

type AppContext = Context<{ Bindings: Env }>;

function cookieOptions(env: Pick<Env, 'ENVIRONMENT'>, maxAge: number) {
  return {
    httpOnly: true,
    secure: env.ENVIRONMENT === 'production',
    sameSite: 'Lax' as const,
    path: '/',
    maxAge,
  };
}

/** Создаёт refresh-сессию в KV и выставляет access+refresh HttpOnly cookies. */
export async function issueSession(
  c: AppContext,
  userId: string,
  role: UserRole,
  rememberMe = false,
): Promise<void> {
  const sid = newId();
  const refreshTtl = rememberMe ? REFRESH_TOKEN_TTL_SECONDS : REFRESH_TOKEN_TTL_SESSION_SECONDS;

  const [access, refresh] = await Promise.all([
    signAccessToken({ sub: userId, role }, c.env),
    signRefreshToken({ sub: userId, sid }, c.env, refreshTtl),
  ]);

  await c.env.SESSIONS.put(
    `session:${sid}`,
    JSON.stringify({ userId, role }),
    { expirationTtl: refreshTtl },
  );

  setCookie(c, ACCESS_COOKIE_NAME, access, cookieOptions(c.env, ACCESS_TOKEN_TTL_SECONDS));
  setCookie(c, REFRESH_COOKIE_NAME, refresh, cookieOptions(c.env, refreshTtl));
}

/** Перевыпускает только access cookie (используется в POST /api/auth/refresh). */
export async function reissueAccessCookie(
  c: AppContext,
  userId: string,
  role: UserRole,
): Promise<void> {
  const access = await signAccessToken({ sub: userId, role }, c.env);
  setCookie(c, ACCESS_COOKIE_NAME, access, cookieOptions(c.env, ACCESS_TOKEN_TTL_SECONDS));
}

/** Читает refresh cookie, сверяет sid в KV SESSIONS. Возвращает payload либо `null`, если сессия недействительна/отозвана. */
export async function readValidRefreshSession(
  c: AppContext,
): Promise<{ userId: string; role: UserRole; sid: string } | null> {
  const token = getCookie(c, REFRESH_COOKIE_NAME);
  if (!token) return null;

  try {
    const payload = await verifyRefreshToken(token, c.env);
    const stored = await c.env.SESSIONS.get(`session:${payload.sid}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { userId: string; role: UserRole };
    if (parsed.userId !== payload.sub) return null;
    return { userId: parsed.userId, role: parsed.role, sid: payload.sid };
  } catch {
    return null;
  }
}

/** Отзывает refresh-сессию (удаляет sid из KV), не бросает исключений при уже невалидном токене. */
export async function revokeCurrentSession(c: AppContext): Promise<void> {
  const token = getCookie(c, REFRESH_COOKIE_NAME);
  if (!token) return;
  try {
    const payload = await verifyRefreshToken(token, c.env);
    await c.env.SESSIONS.delete(`session:${payload.sid}`);
  } catch {
    // Токен уже невалиден/просрочен — отзывать нечего.
  }
}

export function clearSessionCookies(c: AppContext): void {
  deleteCookie(c, ACCESS_COOKIE_NAME, { path: '/' });
  deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/' });
}

// --- 2FA login challenge (F1, допущение 2) ------------------------------------------------------

const TWO_FA_CHALLENGE_TTL_SECONDS = 5 * 60;

interface TwoFaChallenge {
  userId: string;
  role: UserRole;
  rememberMe: boolean;
}

export async function createTwoFaChallenge(
  c: AppContext,
  userId: string,
  role: UserRole,
  rememberMe: boolean,
): Promise<string> {
  const challengeId = newId();
  const payload: TwoFaChallenge = { userId, role, rememberMe };
  await c.env.SESSIONS.put(`2fa-challenge:${challengeId}`, JSON.stringify(payload), {
    expirationTtl: TWO_FA_CHALLENGE_TTL_SECONDS,
  });
  return challengeId;
}

/**
 * Читает 2FA-челлендж, НЕ удаляя его — ошибочный код не должен сжигать возможность повторной
 * попытки (баг, найденный QA: `consumeTwoFaChallenge` ранее удалял челлендж до проверки кода,
 * из-за чего один неверный ввод необратимо ломал вход и требовал заново вводить email/пароль,
 * хотя UX-текст «Неверный код... попробуйте снова» обещает именно повторную попытку).
 */
export async function peekTwoFaChallenge(
  c: AppContext,
  challengeId: string,
): Promise<TwoFaChallenge | null> {
  const stored = await c.env.SESSIONS.get(`2fa-challenge:${challengeId}`);
  if (!stored) return null;
  return JSON.parse(stored) as TwoFaChallenge;
}

/** Удаляет челлендж — вызывается только после успешной проверки кода (одноразовое использование). */
export async function deleteTwoFaChallenge(c: AppContext, challengeId: string): Promise<void> {
  await c.env.SESSIONS.delete(`2fa-challenge:${challengeId}`);
}
