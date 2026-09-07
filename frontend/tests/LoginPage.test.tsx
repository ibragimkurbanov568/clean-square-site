import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import LoginPage from '../src/routes/LoginPage';

// Критический сценарий F1: форма логина показывает ошибку клиентской Zod-валидации,
// не дожидаясь ответа сервера.
describe('LoginPage', () => {
  afterEach(() => cleanup());

  it('показывает ошибку валидации при некорректном email', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/^Email/), 'not-an-email');
    await user.type(screen.getByLabelText(/^Пароль/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText(/Введите корректный email/)).toBeInTheDocument();
  });
});
