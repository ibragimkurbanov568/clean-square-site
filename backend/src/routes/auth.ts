/**
 * Модуль auth — контракты см. docs/04-architecture.md §4.1.
 * Регистрация/логин/refresh/logout/восстановление пароля/2FA (F1, допущения 2 и 3).
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { rateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
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

authRouter.post('/register/client', rateLimit({ key: 'register' }), async (c) => {
  const input = registerClientSchema.parse(await c.req.json());
  // TODO(backend): создать users(role='client'), проверить уникальность email/username (409),
  // выставить HttpOnly access+refresh cookies, вернуть публичный профиль (см. §4.1).
  return notImplemented(c, `POST /api/auth/register/client для ${input.email}`);
});

authRouter.post('/register/company', rateLimit({ key: 'register' }), async (c) => {
  const input = registerCompanySchema.parse(await c.req.json());
  // TODO(backend): создать users(role='company') + companies (inn_ogrn зашифрован), is_verified=0.
  return notImplemented(c, `POST /api/auth/register/company для ${input.email}`);
});

authRouter.post('/login', rateLimit({ key: 'login' }), async (c) => {
  const input = loginSchema.parse(await c.req.json());
  // TODO(backend): сверить пароль, если totp_enabled=1 — вернуть { requiresTwoFactor, challengeId }
  // вместо cookies, иначе сразу выставить cookies.
  return notImplemented(c, `POST /api/auth/login для ${input.email}`);
});

authRouter.post('/login/2fa', rateLimit({ key: 'login' }), async (c) => {
  const input = login2faSchema.parse(await c.req.json());
  // TODO(backend): проверить challengeId в KV SESSIONS + verifyTotpCode, выставить cookies.
  return notImplemented(c, `POST /api/auth/login/2fa для challenge ${input.challengeId}`);
});

authRouter.post('/refresh', async (c) => {
  // TODO(backend): прочитать refresh cookie, сверить sid в KV SESSIONS, выдать новый access.
  return notImplemented(c, 'POST /api/auth/refresh');
});

authRouter.post('/logout', async (c) => {
  // TODO(backend): удалить sid из KV SESSIONS, очистить cookies.
  return notImplemented(c, 'POST /api/auth/logout');
});

authRouter.get('/me', requireAuth(), async (c) => {
  // TODO(backend): вернуть профиль текущего пользователя (+ companies-профиль, если role=company).
  return notImplemented(c, 'GET /api/auth/me');
});

authRouter.post('/forgot-password', rateLimit({ key: 'forgot-password' }), async (c) => {
  const input = forgotPasswordSchema.parse(await c.req.json());
  // TODO(backend): сгенерировать токен, сохранить password_reset_token/expires, отправить письмо
  // через Resend при наличии RESEND_API_KEY, иначе вернуть demo-ссылку (допущение 3).
  return notImplemented(c, `POST /api/auth/forgot-password для ${input.email}`);
});

authRouter.post('/reset-password', rateLimit({ key: 'reset-password' }), async (c) => {
  const input = resetPasswordSchema.parse(await c.req.json());
  // TODO(backend): проверить токен/срок действия, обновить password_hash.
  return notImplemented(c, `POST /api/auth/reset-password с токеном ${input.token}`);
});

authRouter.post('/2fa/setup', requireAuth(), async (c) => {
  // TODO(backend): сгенерировать секрет (generateTotpSecret), сохранить зашифрованным (не enabled),
  // вернуть { secret, otpAuthUri } для рендера QR на фронтенде.
  return notImplemented(c, 'POST /api/auth/2fa/setup');
});

authRouter.post('/2fa/enable', requireAuth(), async (c) => {
  const input = totpVerifySchema.parse(await c.req.json());
  // TODO(backend): verifyTotpCode, если верно — totp_enabled=1.
  return notImplemented(c, `POST /api/auth/2fa/enable с кодом ${input.code}`);
});

authRouter.post('/2fa/disable', requireAuth(), async (c) => {
  // TODO(backend): totp_enabled=0, очистить totp_secret.
  return notImplemented(c, 'POST /api/auth/2fa/disable');
});

export default authRouter;
