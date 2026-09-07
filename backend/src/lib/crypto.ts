/**
 * Криптографические примитивы на Web Crypto (`crypto.subtle`), нативно доступной в Cloudflare
 * Workers без дополнительных зависимостей — см. docs/01-spec.md "Правила и валидация" и
 * допущение 9 в разделе "Принятые допущения".
 *
 *  - Пароли: PBKDF2-SHA256 (Web-Crypto-нативная замена bcrypt/scrypt, которых в Workers нет).
 *  - Чувствительные поля at rest (companies.inn_ogrn, messages.text): AES-256-GCM.
 *
 * Оба набора функций уже рабочие (не заглушки) — бэкенд-инженер использует их напрямую в
 * модулях auth/companies/chats, не переизобретая примитивы.
 */

import type { Env } from '../types/env';

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = 'SHA-256';
const SALT_BYTES = 16;
const AES_IV_BYTES = 12; // рекомендованный размер IV для AES-GCM

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Хэширует пароль. Формат хранения: `pbkdf2$<iterations>$<saltBase64>$<hashBase64>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial,
    256,
  );
  const hash = toBase64(new Uint8Array(derivedBits));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${hash}`;
}

/** Сверяет пароль с хэшем, полученным из `hashPassword`. Timing-safe сравнение байт хэша. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = fromBase64(parts[2] ?? '');
  const expectedHash = fromBase64(parts[3] ?? '');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: PBKDF2_HASH },
    keyMaterial,
    256,
  );
  const actualHash = new Uint8Array(derivedBits);
  if (actualHash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHash.length; i += 1) {
    diff |= (actualHash[i] ?? 0) ^ (expectedHash[i] ?? 0);
  }
  return diff === 0;
}

async function importAesKey(env: Pick<Env, 'ENCRYPTION_KEY'>): Promise<CryptoKey> {
  const rawKey = fromBase64(env.ENCRYPTION_KEY);
  if (rawKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY должен декодироваться в ровно 32 байта (AES-256)');
  }
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/**
 * Шифрует значение поля (ИНН/ОГРН компании, текст сообщения чата) для хранения at rest.
 * Формат: `<ivBase64>:<ciphertextBase64>`.
 */
export async function encryptField(
  plaintext: string,
  env: Pick<Env, 'ENCRYPTION_KEY'>,
): Promise<string> {
  const key = await importAesKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`;
}

/** Расшифровывает значение, зашифрованное `encryptField`. */
export async function decryptField(
  stored: string,
  env: Pick<Env, 'ENCRYPTION_KEY'>,
): Promise<string> {
  const [ivB64, cipherB64] = stored.split(':');
  if (!ivB64 || !cipherB64) throw new Error('Некорректный формат зашифрованного значения');
  const key = await importAesKey(env);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivB64) },
    key,
    fromBase64(cipherB64),
  );
  return new TextDecoder().decode(plaintext);
}
