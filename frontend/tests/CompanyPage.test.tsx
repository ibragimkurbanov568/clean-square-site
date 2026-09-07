import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import { FavoritesProvider } from '../src/context/FavoritesContext';
import { ToastProvider } from '../src/context/ToastContext';
import CompanyPage from '../src/routes/CompanyPage';
import { installFetchMock, paginated, type MockRoute } from './mockApi';
import type { Company, Review, Service } from '../src/lib/types';

// F4 (вкладки без перезагрузки, сортировка отзывов, урезанный вид неверифицированной компании)
// + F5 гостевой intent-restore для «Заказать» (не проверялся живым тестом ранее — только чтением
// кода, см. docs/07-integration.md «Остаточные известные ограничения» п.5).

const GUEST: MockRoute = {
  method: 'GET',
  matcher: /\/auth\/me$/,
  handler: () => ({ status: 401, body: { error: { code: 'unauthorized', message: 'x' } } }),
};

const AUTH_CLIENT: MockRoute = {
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

const verifiedCompany: Company = {
  id: 'company-1',
  name: 'CleanPro',
  description: 'Профессиональная уборка',
  city: 'Москва',
  address: 'ул. Ленина, 1',
  phone: '+79990000000',
  website: null,
  workHours: 'Пн–Пт 9:00–20:00',
  videoUrl: null,
  coverUrl: null,
  avatarUrl: null,
  ratingAvg: 4.5,
  reviewsCount: 2,
  ordersCount: 10,
  viewsCount: 100,
  isVerified: true,
  priceFrom: 1500,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const unverifiedCompany: Company = { ...verifiedCompany, id: 'company-2', isVerified: false, priceFrom: null };

const services: Service[] = [
  { id: 'service-1', companyId: 'company-1', name: 'Уборка квартиры', price: 1500, durationMin: 60, description: '' },
];

const reviewsNewest: Review[] = [
  { id: 'r-new', orderId: 'o1', clientId: 'c1', clientUsername: 'user_a', companyId: 'company-1', rating: 5, text: 'Свежий отзыв', companyReply: null, createdAt: '2026-02-01T00:00:00.000Z' },
  { id: 'r-old', orderId: 'o2', clientId: 'c2', clientUsername: 'user_b', companyId: 'company-1', rating: 3, text: 'Старый отзыв', companyReply: null, createdAt: '2026-01-01T00:00:00.000Z' },
];
const reviewsOldest = [...reviewsNewest].reverse();

function companyRoutes(company: Company, extra: MockRoute[] = []): MockRoute[] {
  return [
    { method: 'GET', matcher: new RegExp(`/companies/${company.id}$`), handler: () => ({ status: 200, body: company }) },
    { method: 'POST', matcher: new RegExp(`/companies/${company.id}/view$`), handler: () => ({ status: 200, body: { ok: true } }) },
    { method: 'GET', matcher: new RegExp(`/companies/${company.id}/services$`), handler: () => ({ status: 200, body: { items: company.isVerified ? services : [] } }) },
    { method: 'GET', matcher: new RegExp(`/companies/${company.id}/promotions$`), handler: () => ({ status: 200, body: { items: [] } }) },
    {
      method: 'GET',
      matcher: new RegExp(`/companies/${company.id}/reviews$`),
      handler: (url) => {
        const sort = url.searchParams.get('sort');
        const items = sort === 'oldest' ? reviewsOldest : reviewsNewest;
        return { status: 200, body: paginated(items) };
      },
    },
    { method: 'GET', matcher: /\/favorites$/, handler: () => ({ status: 200, body: paginated([]) }) },
    ...extra,
  ];
}

function renderCompanyPage(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <ToastProvider>
          <FavoritesProvider>
            <Routes>
              <Route path="/companies/:id" element={<CompanyPage />} />
            </Routes>
          </FavoritesProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('CompanyPage — вкладки (F4)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('переключает вкладки «Услуги» / «Отзывы» / «О нас» без перезагрузки страницы', async () => {
    installFetchMock([GUEST, ...companyRoutes(verifiedCompany)]);
    renderCompanyPage('/companies/company-1');

    expect(await screen.findByText('Уборка квартиры')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Отзывы' }));
    expect(await screen.findByText('Свежий отзыв')).toBeInTheDocument();
    expect(screen.queryByText('Уборка квартиры')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'О нас' }));
    expect(await screen.findByText('ул. Ленина, 1')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Услуги и цены' }));
    expect(await screen.findByText('Уборка квартиры')).toBeInTheDocument();
  });

  it('во вкладке «Отзывы» смена сортировки видимо переупорядочивает список', async () => {
    installFetchMock([GUEST, ...companyRoutes(verifiedCompany)]);
    renderCompanyPage('/companies/company-1');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: 'Отзывы' }));

    const items = await screen.findAllByRole('listitem');
    expect(within(items[0]!).getByText('Свежий отзыв')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Сортировка'), 'oldest');

    await waitFor(async () => {
      const reordered = await screen.findAllByRole('listitem');
      expect(within(reordered[0]!).getByText('Старый отзыв')).toBeInTheDocument();
    });
  });

  it('неверифицированная компания: показана только вкладка «О нас», без цен и без кнопки «Заказать»', async () => {
    installFetchMock([GUEST, ...companyRoutes(unverifiedCompany)]);
    renderCompanyPage('/companies/company-2');

    expect(await screen.findByText('Профиль в процессе проверки, часть информации пока скрыта')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Услуги и цены' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Отзывы' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Заказать' })).not.toBeInTheDocument();
    expect(screen.getByText('Профиль не подтверждён')).toBeInTheDocument();
  });
});

describe('CompanyPage — гостевой intent-restore для «Заказать» (F5)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('после входа с intent=order модал подтверждения заказа открывается автоматически', async () => {
    // AUTH_CLIENT имитирует состояние "только что вошёл" — на этом экране AuthProvider уже
    // считает пользователя авторизованным (redirect произошёл на предыдущем экране логина,
    // см. resolvePostLoginTarget в src/lib/authRedirect.ts), а intent/companyId/serviceId
    // перенесены в query карточки компании — именно это и обрабатывает CompanyPage.
    installFetchMock([AUTH_CLIENT, ...companyRoutes(verifiedCompany)]);
    renderCompanyPage('/companies/company-1?intent=order&companyId=company-1&serviceId=service-1');

    expect(await screen.findByText('Подтвердите заказ')).toBeInTheDocument();
    expect(screen.getByText(/Услуга: Уборка квартиры/)).toBeInTheDocument();
  });

  it('без intent в URL модал заказа не открывается сам по себе', async () => {
    installFetchMock([AUTH_CLIENT, ...companyRoutes(verifiedCompany)]);
    renderCompanyPage('/companies/company-1');

    await screen.findByText('Уборка квартиры');
    expect(screen.queryByText('Подтвердите заказ')).not.toBeInTheDocument();
  });
});
