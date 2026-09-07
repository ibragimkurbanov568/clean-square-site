/**
 * Общие фикстуры для интеграционных тестов: регистрация клиента/компании, верификация через
 * админ-эндпоинт, создание услуги. Уменьшает дублирование между файлами tests/integration/*.
 */
import { createClient, json, type TestClient } from './helpers';
import type { Env } from '../../src/types/env';

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

export interface RegisteredClient {
  client: TestClient;
  userId: string;
  email: string;
  username: string;
}

export async function registerClient(
  env: Env,
  overrides: Partial<{ email: string; username: string; city: string; password: string }> = {},
): Promise<RegisteredClient> {
  const client = createClient(env);
  const email = overrides.email ?? `${unique('client')}@example.com`;
  const username = overrides.username ?? unique('client_user_');
  const res = await client.requestJson('POST', '/api/auth/register/client', {
    email,
    password: overrides.password ?? 'password123',
    username,
    city: overrides.city ?? 'Москва',
  });
  if (res.status !== 201) {
    throw new Error(`registerClient failed: ${res.status} ${JSON.stringify(await res.json())}`);
  }
  const body = await json<{ id: string }>(res);
  return { client, userId: body.id, email, username };
}

export interface RegisteredCompany {
  client: TestClient;
  userId: string;
  companyId: string;
  email: string;
  companyUsername: string;
  city: string;
}

export async function registerCompany(
  env: Env,
  overrides: Partial<{
    email: string;
    companyUsername: string;
    city: string;
    verified: boolean;
  }> = {},
): Promise<RegisteredCompany> {
  const client = createClient(env);
  const email = overrides.email ?? `${unique('company')}@example.com`;
  const companyUsername = overrides.companyUsername ?? unique('company_');
  const city = overrides.city ?? 'Москва';
  const res = await client.requestJson('POST', '/api/auth/register/company', {
    email,
    password: 'password123',
    companyUsername,
    innOgrn: '7712345678',
    city,
    address: 'ул. Тестовая, 1',
    phone: '+79990000000',
  });
  if (res.status !== 201) {
    throw new Error(`registerCompany failed: ${res.status} ${JSON.stringify(await res.json())}`);
  }
  const body = await json<{ id: string; company: { id: string } }>(res);

  if (overrides.verified !== false) {
    await verifyCompany(env, body.company.id);
  }

  return { client, userId: body.id, companyId: body.company.id, email, companyUsername, city };
}

export async function verifyCompany(env: Env, companyId: string): Promise<void> {
  const admin = createClient(env);
  const res = await admin.request(`/api/admin/companies/${companyId}/verify`, {
    method: 'POST',
    headers: { 'x-admin-secret': 'qa-test-admin-secret' },
  });
  if (res.status !== 200) {
    throw new Error(`verifyCompany failed: ${res.status}`);
  }
}

export interface CreatedService {
  id: string;
  name: string;
  price: number;
}

export async function createService(
  env: Env,
  company: RegisteredCompany,
  overrides: Partial<{ name: string; price: number }> = {},
): Promise<CreatedService> {
  const res = await company.client.requestJson(
    'POST',
    `/api/companies/${company.companyId}/services`,
    {
      name: overrides.name ?? 'Уборка квартиры',
      price: overrides.price ?? 2500,
    },
  );
  if (res.status !== 201) {
    throw new Error(`createService failed: ${res.status} ${JSON.stringify(await res.json())}`);
  }
  return json<CreatedService>(res);
}

export { unique };
