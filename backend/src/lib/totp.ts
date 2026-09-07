/**
 * TOTP 2FA через `otplib` (см. допущение 2 в docs/01-spec.md, требование пользователя —
 * "TOTP 2FA (otplib)"). `compatibility_flags = ["nodejs_compat"]` в wrangler.toml включает
 * поддержку `node:crypto` в Workers, поэтому используется стандартный (Node) crypto-плагин
 * otplib без дополнительной WebCrypto-обвязки.
 *
 * QR-код рендерится на фронтенде (см. frontend/src/hooks — библиотека `qrcode.react`) из
 * `otpauth://`-URI, который возвращает `buildOtpAuthUri` — бэкенд не генерирует изображение.
 */
import { authenticator } from 'otplib';

const ISSUER = 'CleanLink';

/** Генерирует новый TOTP-секрет (base32) для сохранения (в зашифрованном виде) в users.totp_secret. */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/** Строит otpauth://-URI для QR-кода приложения-аутентификатора. */
export function buildOtpAuthUri(accountLabel: string, secret: string): string {
  return authenticator.keyuri(accountLabel, ISSUER, secret);
}

/** Проверяет 6-значный код, введённый пользователем, против секрета. */
export function verifyTotpCode(code: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}
