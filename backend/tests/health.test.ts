import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, encryptField, decryptField } from '../src/lib/crypto';

// Смок-тест на криптопримитивы, которыми будет пользоваться модуль auth (F1, допущение 9).
// Полноценные интеграционные тесты по эндпоинтам добавляет бэкенд-инженер на следующем шаге.

describe('lib/crypto', () => {
  it('хэширует и проверяет пароль', async () => {
    const hash = await hashPassword('super-secret-password');
    expect(await verifyPassword('super-secret-password', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('шифрует и расшифровывает чувствительное поле (AES-256-GCM)', async () => {
    const env = { ENCRYPTION_KEY: 'Q2xlYW5MaW5rRGV2S2V5IUNsZWFuTGlua0RldktleSE=' };
    const ciphertext = await encryptField('7707083893', env);
    expect(ciphertext).not.toBe('7707083893');
    expect(await decryptField(ciphertext, env)).toBe('7707083893');
  });
});
