/**
 * Модуль auth — контракты см. docs/04-architecture.md §4.1.
 * Регистрация/логин/refresh/logout/восстановление пароля/2FA (F1, допущения 2 и 3).
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { apiError } from '../lib/http';
import { rateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { execute, newId, nowIso, queryOne } from '../db/client';
import type { UserRow } from '../db/schema';
import { hashPassword, verifyPassword, encryptField, decryptField } from '../lib/crypto';
import { generateTotpSecret, buildOtpAuthUri, verifyTotpCode } from '../lib/totp';
import { mapCurrentUser } from '../lib/mappers';
import { getCompanyBasicByUserId, getUserByEmail, getUserById } from '../lib/queries';
import { logAuditEvent } from '../lib/queue';
import {
  issueSession,
  reissueAccessCookie,
  readValidRefreshSession,
  revokeCurrentSession,
  clearSessionCookies,
  createTwoFaChallenge,
  peekTwoFaChallenge,
  deleteTwoFaChallenge,
} from '../lib/session';
import {
  registerClientSchema,
  registerCompanySchema,
  loginSchema,
  login2faSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  totpVerifySchema,
} from '../schemas/auth.schema';

export const authRouter = new Hono<{ Bindings: Env }>();

const GENERIC_LOGIN_ERROR = 'Неверный email или пароль';

authRouter.post('/register/client', rateLimit({ key: 'register' }), async (c) => {
  const input = registerClientSchema.parse(await c.req.json());
  const db = c.env.DB;

  const existing = await queryOne<{ email: string; username: string }>(
    db,
    'SELECT email, username FROM users WHERE email = ? OR username = ?',
    [input.email, input.username],
  );
  if (existing) {
    const fields: Record<string, string> = {};
    if (existing.email === input.email) fields.email = 'Этот email уже зарегистрирован';
    if (existing.username === input.username) fields.username = 'Это имя пользователя уже занято';
    return apiError(c, 409, 'conflict', 'Email или имя пользователя уже используются', fields);
  }

  const id = newId();
  const passwordHash = await hashPassword(input.password);
  const createdAt = nowIso();
  await execute(
    db,
    `INSERT INTO users (id, email, password_hash, role, username, city, created_at)
     VALUES (?, ?, ?, 'client', ?, ?, ?)`,
    [id, input.email, passwordHash, input.username, input.city, createdAt],
  );

  await issueSession(c, id, 'client', false);
  const user = await getUserById(db, id);
  if (!user) return apiError(c, 500, 'internal_error', 'Не удалось создать пользователя');
  return c.json(mapCurrentUser(user), 201);
});

authRouter.post('/register/company', rateLimit({ key: 'register' }), async (c) => {
  const input = registerCompanySchema.parse(await c.req.json());
  const db = c.env.DB;

  const existing = await queryOne<{ email: string; username: string }>(
    db,
    'SELECT email, username FROM users WHERE email = ? OR username = ?',
    [input.email, input.companyUsername],
  );
  if (existing) {
    const fields: Record<string, string> = {};
    if (existing.email === input.email) fields.email = 'Этот email уже зарегистрирован';
    if (existing.username === input.companyUsername) {
      fields.companyUsername = 'Это имя пользователя уже занято';
    }
    return apiError(c, 409, 'conflict', 'Email или имя пользователя уже используются', fields);
  }

  const userId = newId();
  const companyId = newId();
  const passwordHash = await hashPassword(input.password);
  const encryptedInnOgrn = await encryptField(input.innOgrn, c.env);
  const createdAt = nowIso();

  await execute(
    db,
    `INSERT INTO users (id, email, password_hash, role, username, city, created_at)
     VALUES (?, ?, ?, 'company', ?, ?, ?)`,
    [userId, input.email, passwordHash, input.companyUsername, input.city, createdAt],
  );
  await execute(
    db,
    `INSERT INTO companies
       (id, user_id, name, description, inn_ogrn, phone, website, address, work_hours, city, created_at)
     VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      userId,
      input.companyUsername,
      encryptedInnOgrn,
      input.phone,
      input.website || null,
      input.address,
      input.workHours || null,
      input.city,
      createdAt,
    ],
  );

  await issueSession(c, userId, 'company', false);
  const user = await getUserById(db, userId);
  if (!user) return apiError(c, 500, 'internal_error', 'Не удалось создать пользователя');
  return c.json(
    mapCurrentUser(user, { id: companyId, name: input.companyUsername, is_verified: 0 }),
    201,
  );
});

authRouter.post('/login', rateLimit({ key: 'login' }), async (c) => {
  const input = loginSchema.parse(await c.req.json());
  const db = c.env.DB;

  const user = await getUserByEmail(db, input.email);
  if (!user || !(await verifyPassword(input.password, user.password_hash))) {
    return apiError(c, 401, 'unauthorized', GENERIC_LOGIN_ERROR);
  }

  if (user.totp_enabled === 1) {
    const challengeId = await createTwoFaChallenge(c, user.id, user.role, input.rememberMe);
    return c.json({ requiresTwoFactor: true, challengeId });
  }

  await issueSession(c, user.id, user.role, input.rememberMe);
  const company =
    user.role === 'company' ? await getCompanyBasicByUserId(db, user.id) : null;
  return c.json({
    requiresTwoFactor: false,
    user: mapCurrentUser(user, company),
  });
});

authRouter.post('/login/2fa', rateLimit({ key: 'login' }), async (c) => {
  const input = login2faSchema.parse(await c.req.json());
  const db = c.env.DB;

  const challenge = await peekTwoFaChallenge(c, input.challengeId);
  if (!challenge) {
    return apiError(c, 401, 'unauthorized', 'Код подтверждения истёк, попробуйте войти снова');
  }

  const user = await getUserById(db, challenge.userId);
  if (!user || user.totp_enabled !== 1 || !user.totp_secret) {
    return apiError(c, 401, 'unauthorized', 'Неверный код подтверждения');
  }

  const secret = await decryptField(user.totp_secret, c.env);
  if (!verifyTotpCode(input.code, secret)) {
    // Челлендж НЕ удаляется при неверном коде — пользователь может ввести код повторно
    // (соответствует тексту UX «Неверный код... попробуйте снова», docs/02-ux.md).
    return apiError(c, 401, 'unauthorized', 'Неверный код подтверждения');
  }

  // Код верный — челлендж одноразовый, удаляем сейчас, чтобы его нельзя было переиспользовать.
  await deleteTwoFaChallenge(c, input.challengeId);
  await issueSession(c, user.id, user.role, challenge.rememberMe);
  const company =
    user.role === 'company' ? await getCompanyBasicByUserId(db, user.id) : null;
  return c.json(mapCurrentUser(user, company));
});

authRouter.post('/refresh', async (c) => {
  const session = await readValidRefreshSession(c);
  if (!session) {
    clearSessionCookies(c);
    return apiError(c, 401, 'unauthorized', 'Сессия истекла, войдите снова');
  }
  await reissueAccessCookie(c, session.userId, session.role);
  return c.json({ ok: true });
});

authRouter.post('/logout', async (c) => {
  await revokeCurrentSession(c);
  clearSessionCookies(c);
  return c.json({ ok: true });
});

authRouter.get('/me', requireAuth(), async (c) => {
  const db = c.env.DB;
  const user = await getUserById(db, c.get('userId'));
  if (!user) return apiError(c, 401, 'unauthorized', 'Пользователь не найден');
  const company = user.role === 'company' ? await getCompanyBasicByUserId(db, user.id) : null;
  return c.json(mapCurrentUser(user, company));
});

authRouter.post('/forgot-password', rateLimit({ key: 'forgot-password' }), async (c) => {
  const input = forgotPasswordSchema.parse(await c.req.json());
  const db = c.env.DB;

  const user = await getUserByEmail(db, input.email);
  if (!user) {
    // Не раскрываем существование email — тот же ответ, что и при успехе.
    return c.json({ ok: true });
  }

  const token = newId();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await execute(
    db,
    'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
    [token, expires, user.id],
  );

  const resetUrl = `${c.env.CORS_ORIGIN}/reset-password?token=${token}`;

  if (c.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CleanLink <no-reply@cleanlink.example.com>',
          to: user.email,
          subject: 'Восстановление пароля CleanLink',
          html: `<p>Для сброса пароля перейдите по ссылке: <a href="${resetUrl}">${resetUrl}</a></p><p>Ссылка действительна 1 час.</p>`,
        }),
      });
    } catch {
      // Письмо не отправилось — не роняем запрос, пользователь может использовать demo-fallback
      // в следующий раз/через поддержку; для наблюдаемости пишем аудит-событие ниже.
    }
    await logAuditEvent('auth.password_reset.email_attempted', { userId: user.id }, c.env);
    return c.json({ ok: true });
  }

  await logAuditEvent('auth.password_reset.demo', { userId: user.id, resetUrl }, c.env);
  return c.json({ ok: true, demoResetUrl: resetUrl });
});

authRouter.post('/reset-password', rateLimit({ key: 'reset-password' }), async (c) => {
  const input = resetPasswordSchema.parse(await c.req.json());
  const db = c.env.DB;

  const user = await queryOne<UserRow>(
    db,
    'SELECT * FROM users WHERE password_reset_token = ?',
    [input.token],
  );
  if (
    !user ||
    !user.password_reset_expires ||
    new Date(user.password_reset_expires).getTime() < Date.now()
  ) {
    return apiError(c, 400, 'invalid_token', 'Ссылка для восстановления недействительна или устарела');
  }

  const passwordHash = await hashPassword(input.password);
  await execute(
    db,
    'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
    [passwordHash, user.id],
  );

  return c.json({ ok: true });
});

authRouter.post('/2fa/setup', requireAuth(), async (c) => {
  const db = c.env.DB;
  const user = await getUserById(db, c.get('userId'));
  if (!user) return apiError(c, 401, 'unauthorized', 'Пользователь не найден');

  const secret = generateTotpSecret();
  const encryptedSecret = await encryptField(secret, c.env);
  await execute(db, 'UPDATE users SET totp_secret = ? WHERE id = ?', [encryptedSecret, user.id]);

  const otpAuthUri = buildOtpAuthUri(user.email, secret);
  return c.json({ secret, otpAuthUri });
});

authRouter.post('/2fa/enable', requireAuth(), async (c) => {
  const input = totpVerifySchema.parse(await c.req.json());
  const db = c.env.DB;
  const user = await getUserById(db, c.get('userId'));
  if (!user || !user.totp_secret) {
    return apiError(c, 400, 'invalid_code', 'Сначала сгенерируйте секрет через /2fa/setup');
  }

  const secret = await decryptField(user.totp_secret, c.env);
  if (!verifyTotpCode(input.code, secret)) {
    return apiError(c, 400, 'invalid_code', 'Неверный код подтверждения');
  }

  await execute(db, 'UPDATE users SET totp_enabled = 1 WHERE id = ?', [user.id]);
  return c.json({ ok: true });
});

authRouter.post('/2fa/disable', requireAuth(), async (c) => {
  const db = c.env.DB;
  await execute(db, 'UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?', [
    c.get('userId'),
  ]);
  return c.json({ ok: true });
});

export default authRouter;
