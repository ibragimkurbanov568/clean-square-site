import { describe, expect, it } from 'vitest';
import { resolvePostLoginTarget } from '../src/lib/authRedirect';
import type { CurrentUser } from '../src/lib/types';

const clientUser: CurrentUser = {
  id: 'u1',
  email: 'client@example.com',
  role: 'client',
  username: 'client1',
  city: 'Москва',
  avatarUrl: null,
  totpEnabled: false,
};

// Регрессия: `react-router-dom` 6.x, используемый в проекте, подвержен известной open-redirect
// уязвимости через обратный слэш в пути (GHSA-wrjc-x8rr-h8h6, см. `npm audit`, docs/09-audit.md).
// `returnTo` приходит из query-строки `/login`, которую атакующий может подсунуть пользователю
// в виде готовой ссылки — до фикса значение передавалось в `navigate()` без проверки.
describe('resolvePostLoginTarget — компенсирующий контроль против open redirect', () => {
  it('легитимный внутренний returnTo используется как есть', () => {
    expect(resolvePostLoginTarget('?returnTo=%2Fcompanies%2Fabc', clientUser)).toBe(
      '/companies/abc',
    );
  });

  it('returnTo с обратным слэшем (потенциальный обход react-router на protocol-relative URL) отклоняется — используется дефолт роли', () => {
    const search = `?returnTo=${encodeURIComponent('/\\evil.example.com')}`;
    expect(resolvePostLoginTarget(search, clientUser)).toBe('/account/orders');
  });

  it('returnTo, начинающийся с "//" (protocol-relative URL), отклоняется', () => {
    const search = `?returnTo=${encodeURIComponent('//evil.example.com')}`;
    expect(resolvePostLoginTarget(search, clientUser)).toBe('/account/orders');
  });

  it('returnTo без ведущего "/" (например абсолютный URL с протоколом) отклоняется', () => {
    const search = `?returnTo=${encodeURIComponent('https://evil.example.com')}`;
    expect(resolvePostLoginTarget(search, clientUser)).toBe('/account/orders');
  });

  it('без returnTo — редирект в кабинет по умолчанию для роли', () => {
    expect(resolvePostLoginTarget('', clientUser)).toBe('/account/orders');
  });
});
