/**
 * Интеграционные HTTP-тесты F1 (регистрация/логин/2FA/восстановление пароля) —
 * docs/01-spec.md критерии F1, docs/04-architecture.md §4.1.
 * Ранее (docs/07-integration.md, "Остаточные известные ограничения" п.4) 2FA и восстановление
 * пароля не были проверены ни разу за весь конвейер — этот файл впервые закрывает их реальными
 * HTTP-сценариями (не чтением кода).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authenticator } from 'otplib';
import { createClient, createTestEnv, json, type TestEnvHandle } from './helpers';
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

describe('POST /api/auth/register/client', () => {
  it('регистрирует клиента и сразу логинит (cookies + 201 + CurrentUser)', async () => {
    const client = createClient(env);
    const res = await client.requestJson('POST', '/api/auth/register/client', {
      email: 'anna@example.com',
      password: 'password123',
      username: 'anna_client',
      city: 'Москва',
    });
    expect(res.status).toBe(201);
    const body = await json<{ id: string; role: string; username: string }>(res);
    expect(body.role).toBe('client');
    expect(body.username).toBe('anna_client');
    expect(res.headers.get('set-cookie')).toBeTruthy();

    // сразу залогинен — /api/auth/me отвечает без повторного логина, используя ту же cookie-jar
    const me = await client.request('/api/auth/me');
    expect(me.status).toBe(200);
    const meBody = await json<{ email: string }>(me);
    expect(meBody.email).toBe('anna@example.com');
  });

  it('отклоняет короткий пароль → 400 validation_error с полем', async () => {
    const client = createClient(env);
    const res = await client.requestJson('POST', '/api/auth/register/client', {
      email: 'short@example.com',
      password: '123',
      username: 'shortpass',
      city: 'Москва',
    });
    expect(res.status).toBe(400);
    const body = await json<{ error: { code: string; fields?: Record<string, string> } }>(res);
    expect(body.error.code).toBe('validation_error');
    expect(body.error.fields?.password).toMatch(/минимум 8/);
  });

  it('занятый email → 409 conflict с полем email', async () => {
    const first = createClient(env);
    await first.requestJson('POST', '/api/auth/register/client', {
      email: 'dup@example.com',
      password: 'password123',
      username: 'dup_user_one',
      city: 'Казань',
    });

    const second = createClient(env);
    const res = await second.requestJson('POST', '/api/auth/register/client', {
      email: 'dup@example.com',
      password: 'password123',
      username: 'dup_user_two',
      city: 'Казань',
    });
    expect(res.status).toBe(409);
    const body = await json<{ error: { code: string; fields?: Record<string, string> } }>(res);
    expect(body.error.code).toBe('conflict');
    expect(body.error.fields?.email).toBeTruthy();
  });

  it('занятый username (в общем пространстве имён с company_username) → 409 с полем username', async () => {
    const first = createClient(env);
    await first.requestJson('POST', '/api/auth/register/client', {
      email: 'nameowner@example.com',
      password: 'password123',
      username: 'shared_name',
      city: 'Казань',
    });

    const second = createClient(env);
    const res = await second.requestJson('POST', '/api/auth/register/client', {
      email: 'another@example.com',
      password: 'password123',
      username: 'shared_name',
      city: 'Казань',
    });
    expect(res.status).toBe(409);
    const body = await json<{ error: { fields?: Record<string, string> } }>(res);
    expect(body.error.fields?.username).toBeTruthy();
  });
});

describe('POST /api/auth/register/company', () => {
  it('регистрирует компанию, is_verified=false, редиректный кабинет виден через /me', async () => {
    const client = createClient(env);
    const res = await client.requestJson('POST', '/api/auth/register/company', {
      email: 'company1@example.com',
      password: 'password123',
      companyUsername: 'cleanpro_test',
      innOgrn: '7712345678',
      city: 'Москва',
      address: 'ул. Тестовая, 1',
      phone: '+79990000000',
    });
    expect(res.status).toBe(201);
    const body = await json<{ role: string; company?: { isVerified: boolean } }>(res);
    expect(body.role).toBe('company');
    expect(body.company?.isVerified).toBe(false);
  });

  it('невалидный ИНН/ОГРН → 400 с понятным сообщением по полю', async () => {
    const client = createClient(env);
    const res = await client.requestJson('POST', '/api/auth/register/company', {
      email: 'badinn@example.com',
      password: 'password123',
      companyUsername: 'badinn_co',
      innOgrn: 'not-a-number',
      city: 'Москва',
      address: 'ул. Тестовая, 2',
      phone: '+79990000001',
    });
    expect(res.status).toBe(400);
    const body = await json<{ error: { fields?: Record<string, string> } }>(res);
    expect(body.error.fields?.innOgrn).toMatch(/ИНН\/ОГРН/);
  });

  it('email, занятый клиентом, конфликтует и при регистрации компании (общее пространство email)', async () => {
    const clientUser = createClient(env);
    await clientUser.requestJson('POST', '/api/auth/register/client', {
      email: 'crossconflict@example.com',
      password: 'password123',
      username: 'cross_client',
      city: 'Уфа',
    });

    const companyUser = createClient(env);
    const res = await companyUser.requestJson('POST', '/api/auth/register/company', {
      email: 'crossconflict@example.com',
      password: 'password123',
      companyUsername: 'cross_company',
      innOgrn: '1234567890',
      city: 'Уфа',
      address: 'ул. Пример, 3',
      phone: '+79990000002',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('логинит с правильным паролем, отклоняет с неправильным → 401 с понятным сообщением', async () => {
    const registerClient = createClient(env);
    await registerClient.requestJson('POST', '/api/auth/register/client', {
      email: 'loginflow@example.com',
      password: 'correct-password',
      username: 'loginflow_user',
      city: 'Тверь',
    });

    const wrongPassClient = createClient(env);
    const badRes = await wrongPassClient.requestJson('POST', '/api/auth/login', {
      email: 'loginflow@example.com',
      password: 'wrong-password',
    });
    expect(badRes.status).toBe(401);
    const badBody = await json<{ error: { message: string } }>(badRes);
    expect(badBody.error.message).toBe('Неверный email или пароль');

    const goodClient = createClient(env);
    const okRes = await goodClient.requestJson('POST', '/api/auth/login', {
      email: 'loginflow@example.com',
      password: 'correct-password',
    });
    expect(okRes.status).toBe(200);
    const okBody = await json<{ requiresTwoFactor: boolean; user: { username: string } }>(okRes);
    expect(okBody.requiresTwoFactor).toBe(false);
    expect(okBody.user.username).toBe('loginflow_user');
  });

  it('неизвестный email → 401 (тот же общий текст, не раскрывает существование аккаунта)', async () => {
    const client = createClient(env);
    const res = await client.requestJson('POST', '/api/auth/login', {
      email: 'never-registered@example.com',
      password: 'whatever123',
    });
    expect(res.status).toBe(401);
  });
});

describe('2FA (TOTP) — F1, допущение 2', () => {
  it('полный цикл: setup → enable → login требует код → верный код пускает, неверный отклоняется', async () => {
    const client = createClient(env);
    await client.requestJson('POST', '/api/auth/register/client', {
      email: 'twofa@example.com',
      password: 'password123',
      username: 'twofa_user',
      city: 'Сочи',
    });

    // setup — получаем секрет
    const setupRes = await client.requestJson('POST', '/api/auth/2fa/setup');
    expect(setupRes.status).toBe(200);
    const { secret } = await json<{ secret: string; otpAuthUri: string }>(setupRes);
    expect(secret).toBeTruthy();

    // enable с неверным кодом отклоняется
    const badEnable = await client.requestJson('POST', '/api/auth/2fa/enable', { code: '000000' });
    expect(badEnable.status).toBe(400);

    // enable с верным кодом (сгенерированным той же библиотекой otplib) — включается
    const validCode = authenticator.generate(secret);
    const enableRes = await client.requestJson('POST', '/api/auth/2fa/enable', { code: validCode });
    expect(enableRes.status).toBe(200);

    // логин теперь требует второй фактор вместо прямой выдачи cookies
    const loginClient = createClient(env);
    const loginRes = await loginClient.requestJson('POST', '/api/auth/login', {
      email: 'twofa@example.com',
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);
    const loginBody = await json<{ requiresTwoFactor: boolean; challengeId?: string }>(loginRes);
    expect(loginBody.requiresTwoFactor).toBe(true);
    expect(loginBody.challengeId).toBeTruthy();
    // логин без прохождения 2FA не должен выдавать сессионные cookies
    expect(loginRes.headers.get('set-cookie')).toBeFalsy();

    // неверный код на втором шаге отклоняется
    const badChallenge = await loginClient.requestJson('POST', '/api/auth/login/2fa', {
      challengeId: loginBody.challengeId,
      code: '111111',
    });
    expect(badChallenge.status).toBe(401);

    // верный код второго шага пускает и выдаёт cookies
    const secondCode = authenticator.generate(secret);
    const goodChallenge = await loginClient.requestJson('POST', '/api/auth/login/2fa', {
      challengeId: loginBody.challengeId,
      code: secondCode,
    });
    expect(goodChallenge.status).toBe(200);
    expect(goodChallenge.headers.get('set-cookie')).toBeTruthy();

    const me = await loginClient.request('/api/auth/me');
    expect(me.status).toBe(200);
    const meBody = await json<{ username: string }>(me);
    expect(meBody.username).toBe('twofa_user');
  });

  it('disable выключает 2FA — следующий логин снова не требует кода', async () => {
    const client = createClient(env);
    await client.requestJson('POST', '/api/auth/register/client', {
      email: 'twofa-disable@example.com',
      password: 'password123',
      username: 'twofa_disable_user',
      city: 'Омск',
    });
    const { secret } = await json<{ secret: string }>(
      await client.requestJson('POST', '/api/auth/2fa/setup'),
    );
    await client.requestJson('POST', '/api/auth/2fa/enable', { code: authenticator.generate(secret) });

    await client.requestJson('POST', '/api/auth/2fa/disable');

    const loginClient = createClient(env);
    const loginRes = await loginClient.requestJson('POST', '/api/auth/login', {
      email: 'twofa-disable@example.com',
      password: 'password123',
    });
    const body = await json<{ requiresTwoFactor: boolean }>(loginRes);
    expect(body.requiresTwoFactor).toBe(false);
  });
});

describe('Восстановление пароля — F1, допущение 3 (demo-режим без RESEND_API_KEY)', () => {
  it('forgot-password → demoResetUrl → reset-password → логин старым паролем отклонён, новым — пускает', async () => {
    const registerClient = createClient(env);
    await registerClient.requestJson('POST', '/api/auth/register/client', {
      email: 'forgot@example.com',
      password: 'old-password1',
      username: 'forgot_user',
      city: 'Пермь',
    });

    const forgotClient = createClient(env);
    const forgotRes = await forgotClient.requestJson('POST', '/api/auth/forgot-password', {
      email: 'forgot@example.com',
    });
    expect(forgotRes.status).toBe(200);
    const forgotBody = await json<{ ok: boolean; demoResetUrl?: string }>(forgotRes);
    expect(forgotBody.ok).toBe(true);
    expect(forgotBody.demoResetUrl).toBeTruthy();

    const token = new URL(forgotBody.demoResetUrl!).searchParams.get('token');
    expect(token).toBeTruthy();

    const resetRes = await forgotClient.requestJson('POST', '/api/auth/reset-password', {
      token,
      password: 'new-password1',
      confirmPassword: 'new-password1',
    });
    expect(resetRes.status).toBe(200);

    // старый пароль больше не работает
    const oldLoginClient = createClient(env);
    const oldLoginRes = await oldLoginClient.requestJson('POST', '/api/auth/login', {
      email: 'forgot@example.com',
      password: 'old-password1',
    });
    expect(oldLoginRes.status).toBe(401);

    // новый пароль работает
    const newLoginClient = createClient(env);
    const newLoginRes = await newLoginClient.requestJson('POST', '/api/auth/login', {
      email: 'forgot@example.com',
      password: 'new-password1',
    });
    expect(newLoginRes.status).toBe(200);
  });

  it('несовпадающие пароли при сбросе → 400 (валидируется до обращения к токену)', async () => {
    const client = createClient(env);
    const res = await client.requestJson('POST', '/api/auth/reset-password', {
      token: 'irrelevant-token',
      password: 'aaaaaaaa',
      confirmPassword: 'bbbbbbbb',
    });
    expect(res.status).toBe(400);
  });

  it('несуществующий/просроченный токен → 400 invalid_token', async () => {
    const client = createClient(env);
    const res = await client.requestJson('POST', '/api/auth/reset-password', {
      token: 'this-token-does-not-exist',
      password: 'aaaaaaaa',
      confirmPassword: 'aaaaaaaa',
    });
    expect(res.status).toBe(400);
    const body = await json<{ error: { code: string } }>(res);
    expect(body.error.code).toBe('invalid_token');
  });

  it('forgot-password для несуществующего email — тот же ответ 200 без demoResetUrl-раскрытия', async () => {
    const client = createClient(env);
    const res = await client.requestJson('POST', '/api/auth/forgot-password', {
      email: 'nobody-here@example.com',
    });
    expect(res.status).toBe(200);
    const body = await json<{ ok: boolean; demoResetUrl?: string }>(res);
    expect(body.ok).toBe(true);
    expect(body.demoResetUrl).toBeUndefined();
  });
});

describe('GET /api/auth/me без сессии', () => {
  it('401 unauthorized без cookies', async () => {
    const client = createClient(env);
    const res = await client.request('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout + refresh', () => {
  it('logout отзывает сессию — refresh после logout больше не работает', async () => {
    const client = createClient(env);
    await client.requestJson('POST', '/api/auth/register/client', {
      email: 'logoutflow@example.com',
      password: 'password123',
      username: 'logoutflow_user',
      city: 'Сургут',
    });

    const logoutRes = await client.requestJson('POST', '/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    const refreshRes = await client.requestJson('POST', '/api/auth/refresh');
    expect(refreshRes.status).toBe(401);
  });
});
