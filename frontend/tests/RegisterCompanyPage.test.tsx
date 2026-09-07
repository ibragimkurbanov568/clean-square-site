import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import RegisterCompanyPage from '../src/routes/RegisterCompanyPage';
import { installFetchMock, type MockRoute } from './mockApi';

// F1: форма регистрации компании — валидация ИНН/ОГРН и обязательных полей (docs/01-spec.md,
// docs/02-ux.md «Регистрация компании»).
// Метки обязательных полей рендерятся как "Label *" (span с астериском внутри <label>), поэтому
// используем регэксп с якорем ^ вместо точной строки — тот же приём, что и в LoginPage.test.tsx.

const ME_UNAUTH: MockRoute = {
  method: 'GET',
  matcher: /\/auth\/me$/,
  handler: () => ({ status: 401, body: { error: { code: 'unauthorized', message: 'x' } } }),
};
const CITIES_EMPTY: MockRoute = {
  method: 'GET',
  matcher: /\/cities\/suggest$/,
  handler: () => ({ status: 200, body: { items: [] } }),
};

describe('RegisterCompanyPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/register/company']}>
        <AuthProvider>
          <ToastProvider>
            <RegisterCompanyPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  /** Печатает город и коммитит его через Enter — CitySearchInput вызывает onSelectCity только по commit(), не на каждый keystroke. */
  async function fillCity(user: ReturnType<typeof userEvent.setup>, city: string) {
    const cityInput = screen.getByPlaceholderText('Начните вводить город');
    await user.type(cityInput, city);
    await user.keyboard('{Enter}');
  }

  async function fillRequiredExceptAddress(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^Email/), 'company@example.com');
    await user.type(screen.getByLabelText(/^Пароль/), 'password123');
    await user.type(screen.getByLabelText(/^Имя компании/), 'cleanpro');
    await user.type(screen.getByLabelText(/^ИНН\/ОГРН/), '7712345678');
    await user.type(screen.getByLabelText(/^Телефон/), '+79990000000');
    await fillCity(user, 'Москва');
  }

  it('кнопка отправки неактивна, пока не заполнены обязательные поля', async () => {
    installFetchMock([ME_UNAUTH, CITIES_EMPTY]);
    renderPage();

    const submit = screen.getByRole('button', { name: 'Создать аккаунт компании' });
    expect(submit).toBeDisabled();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Email/), 'company@example.com');
    // Пароль/username/ИНН/город/адрес/телефон ещё не заполнены — кнопка всё ещё неактивна.
    expect(submit).toBeDisabled();
  });

  it('невалидный ИНН/ОГРН (недостаточно цифр) блокирует отправку и показывает понятную ошибку', async () => {
    installFetchMock([ME_UNAUTH, CITIES_EMPTY]);
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^Email/), 'company@example.com');
    await user.type(screen.getByLabelText(/^Пароль/), 'password123');
    await user.type(screen.getByLabelText(/^Имя компании/), 'cleanpro');
    await user.type(screen.getByLabelText(/^ИНН\/ОГРН/), '123'); // только 3 цифры — меньше требуемых 10
    await user.type(screen.getByLabelText(/^Адрес/), 'ул. Ленина, 1');
    await user.type(screen.getByLabelText(/^Телефон/), '+79990000000');
    await fillCity(user, 'Москва');

    const submit = screen.getByRole('button', { name: 'Создать аккаунт компании' });
    // Форма непустая по всем обязательным полям — кнопка активна, но клиентская Zod-валидация
    // отклонит короткий ИНН при сабмите (не дожидаясь ответа сервера).
    expect(submit).not.toBeDisabled();
    await user.click(submit);

    expect(await screen.findByText(/Проверьте формат ИНН\/ОГРН/)).toBeInTheDocument();
  });

  it('ввод в поле ИНН/ОГРН отфильтровывает нецифровые символы на лету', async () => {
    installFetchMock([ME_UNAUTH, CITIES_EMPTY]);
    renderPage();
    const user = userEvent.setup();

    const innInput = screen.getByLabelText(/^ИНН\/ОГРН/) as HTMLInputElement;
    await user.type(innInput, 'abc123def456');
    expect(innInput.value).toBe('123456');
  });

  it('пустое обязательное поле (адрес) после заполнения остальных — кнопка остаётся неактивной', async () => {
    installFetchMock([ME_UNAUTH, CITIES_EMPTY]);
    renderPage();
    const user = userEvent.setup();

    await fillRequiredExceptAddress(user);
    // Адрес намеренно не заполнен.

    expect(screen.getByRole('button', { name: 'Создать аккаунт компании' })).toBeDisabled();
  });

  it('успешная отправка вызывает регистрацию компании (POST /auth/register/company)', async () => {
    const { calls } = installFetchMock([
      ME_UNAUTH,
      CITIES_EMPTY,
      {
        method: 'POST',
        matcher: /\/auth\/register\/company$/,
        handler: () => ({
          status: 201,
          body: {
            id: 'user-1',
            email: 'company@example.com',
            role: 'company',
            username: 'cleanpro',
            city: 'Москва',
            avatarUrl: null,
            totpEnabled: false,
            company: { id: 'company-1', name: 'cleanpro', isVerified: false },
          },
        }),
      },
    ]);
    renderPage();
    const user = userEvent.setup();

    await fillRequiredExceptAddress(user);
    await user.type(screen.getByLabelText(/^Адрес/), 'ул. Ленина, 1');

    await user.click(screen.getByRole('button', { name: 'Создать аккаунт компании' }));

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'POST' && c.url.includes('/auth/register/company'))).toBe(true);
    });
  });
});
