import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import OrdersPage from '../src/routes/account/OrdersPage';
import { installFetchMock, paginated, type MockRoute } from './mockApi';
import type { Order } from '../src/lib/types';

// F12: «Мои заказы» — фильтр по статусу скрывает заказы других статусов (docs/01-spec.md,
// docs/02-ux.md «Кабинет клиента — Мои заказы»).

const ME_CLIENT: MockRoute = {
  method: 'GET',
  matcher: /\/auth\/me$/,
  handler: () => ({
    status: 200,
    body: {
      id: 'client-1',
      email: 'client@example.com',
      role: 'client',
      username: 'client_one',
      city: 'Москва',
      avatarUrl: null,
      totpEnabled: false,
    },
  }),
};

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: overrides.id ?? 'order-1',
    clientId: 'client-1',
    companyId: 'company-1',
    companyName: 'CleanPro',
    serviceId: 'service-1',
    serviceName: 'Уборка квартиры',
    status: overrides.status ?? 'created',
    totalPrice: 2000,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    hasReview: false,
    ...overrides,
  };
}

const ALL_ORDERS: Order[] = [
  makeOrder({ id: 'order-created', status: 'created', serviceName: 'Заказ Создан' }),
  makeOrder({ id: 'order-progress', status: 'in_progress', serviceName: 'Заказ В работе' }),
  makeOrder({ id: 'order-done', status: 'done', serviceName: 'Заказ Выполнен' }),
];

function ordersRoute(): MockRoute {
  return {
    method: 'GET',
    matcher: /\/orders$/,
    handler: (url) => {
      const status = url.searchParams.get('status');
      const items = status ? ALL_ORDERS.filter((o) => o.status === status) : ALL_ORDERS;
      return { status: 200, body: paginated(items) };
    },
  };
}

describe('OrdersPage — фильтр по статусу (F12)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/account/orders']}>
        <AuthProvider>
          <ToastProvider>
            <OrdersPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('по умолчанию («Все») показывает заказы всех статусов', async () => {
    installFetchMock([ME_CLIENT, ordersRoute()]);
    renderPage();

    expect(await screen.findByText('Заказ Создан')).toBeInTheDocument();
    expect(screen.getByText('Заказ В работе')).toBeInTheDocument();
    expect(screen.getByText('Заказ Выполнен')).toBeInTheDocument();
  });

  it('фильтр «Выполнен» скрывает заказы других статусов', async () => {
    installFetchMock([ME_CLIENT, ordersRoute()]);
    renderPage();
    await screen.findByText('Заказ Создан');

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Выполнен' }));

    await waitFor(() => {
      expect(screen.queryByText('Заказ Создан')).not.toBeInTheDocument();
      expect(screen.queryByText('Заказ В работе')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Заказ Выполнен')).toBeInTheDocument();
  });

  it('фильтр «Создан» показывает только созданные заказы', async () => {
    installFetchMock([ME_CLIENT, ordersRoute()]);
    renderPage();
    await screen.findByText('Заказ Создан');

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Создан' }));

    await waitFor(() => {
      expect(screen.queryByText('Заказ Выполнен')).not.toBeInTheDocument();
      expect(screen.queryByText('Заказ В работе')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Заказ Создан')).toBeInTheDocument();
  });

  it('пустое состояние: нет заказов → «У вас пока нет заказов» с кнопкой «Найти компанию»', async () => {
    installFetchMock([
      ME_CLIENT,
      { method: 'GET', matcher: /\/orders$/, handler: () => ({ status: 200, body: paginated([]) }) },
    ]);
    renderPage();

    expect(await screen.findByText('У вас пока нет заказов')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Найти компанию' })).toBeInTheDocument();
  });

  it('состояние ошибки: недоступный API → баннер с кнопкой «Повторить загрузку»', async () => {
    installFetchMock([
      ME_CLIENT,
      {
        method: 'GET',
        matcher: /\/orders$/,
        handler: () => ({ status: 500, body: { error: { code: 'internal_error', message: 'Сбой' } } }),
      },
    ]);
    renderPage();

    expect(await screen.findByText('Не удалось загрузить заказы')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить загрузку' })).toBeInTheDocument();
  });
});
