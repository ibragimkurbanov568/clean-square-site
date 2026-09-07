import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import LoginPage from '../src/routes/LoginPage';
import { installFetchMock, type MockRoute } from './mockApi';

// Ручной чек-лист QA: «двойное нажатие на кнопку отправки» — не должно приводить к двум
// запросам/двум попыткам логина. Кнопка переходит в isLoading/disabled сразу после первого клика.

const ME_UNAUTH: MockRoute = {
  method: 'GET',
  matcher: /\/auth\/me$/,
  handler: () => ({ status: 401, body: { error: { code: 'unauthorized', message: 'x' } } }),
};

describe('LoginPage — двойной клик на кнопку отправки', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('второй быстрый клик по «Войти» не отправляет повторный запрос логина', async () => {
    let loginCallCount = 0;
    const { calls } = installFetchMock([
      ME_UNAUTH,
      {
        method: 'POST',
        matcher: /\/auth\/login$/,
        handler: async () => {
          loginCallCount += 1;
          // Небольшая задержка имитирует реальную сеть — окно, в которое может попасть второй клик.
          await new Promise((resolve) => setTimeout(resolve, 30));
          return {
            status: 200,
            body: {
              requiresTwoFactor: false,
              user: {
                id: 'client-1',
                email: 'client@example.com',
                role: 'client',
                username: 'client_one',
                city: 'Москва',
                avatarUrl: null,
                totpEnabled: false,
              },
            },
          };
        },
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Email/), 'client@example.com');
    await user.type(screen.getByLabelText(/^Пароль/), 'password123');

    const submit = screen.getByRole('button', { name: 'Войти' });
    await user.click(submit);
    // Кнопка должна немедленно стать disabled (isSubmitting) — второй клик по факту не сработает
    // на реальной disabled-кнопке, как и в браузере.
    await user.click(submit);

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'POST' && c.url.includes('/auth/login'))).toBe(true);
    });
    // Ждём завершения запроса (задержка 30мс в моке) внутри act(), чтобы React успел применить
    // все состояния, вызванные разрешением промиса логина.
    await waitFor(() => expect(loginCallCount).toBeGreaterThan(0));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(loginCallCount).toBe(1);
  });
});
