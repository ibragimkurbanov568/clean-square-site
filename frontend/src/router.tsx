import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import FullPageLoader from './components/common/FullPageLoader';

// Ленивая загрузка по маршруту (аудит производительности, docs/09-audit.md): изначально все 24
// экрана попадали в один входной чанк (~735 KB до gzip), включая тяжёлые библиотеки, нужные
// только на конкретных экранах (chart.js — только `/company/stats`, cropperjs — только модалка
// обрезки аватара/обложки, которые сами по себе тоже разбиты см. `ImageCropModal.tsx`).
// `React.lazy` + `Suspense` разбивают сборку по маршруту без изменения UX (уже есть
// `FullPageLoader`, используемый как fallback — тот же компонент, что и `RequireAuth` показывает
// во время проверки сессии).
const HomePage = lazy(() => import('./routes/HomePage'));
const CityPage = lazy(() => import('./routes/CityPage'));
const CompanyPage = lazy(() => import('./routes/CompanyPage'));
const LoginPage = lazy(() => import('./routes/LoginPage'));
const Login2FAPage = lazy(() => import('./routes/Login2FAPage'));
const RegisterClientPage = lazy(() => import('./routes/RegisterClientPage'));
const RegisterCompanyPage = lazy(() => import('./routes/RegisterCompanyPage'));
const ForgotPasswordPage = lazy(() => import('./routes/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./routes/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('./routes/NotFoundPage'));
const ChatDialogPage = lazy(() => import('./routes/ChatDialogPage'));

const AccountLayout = lazy(() => import('./routes/account/AccountLayout'));
const AccountOrdersPage = lazy(() => import('./routes/account/OrdersPage'));
const AccountFavoritesPage = lazy(() => import('./routes/account/FavoritesPage'));
const AccountReviewsPage = lazy(() => import('./routes/account/ReviewsPage'));
const AccountChatsListPage = lazy(() => import('./routes/account/ChatsListPage'));
const AccountSettingsPage = lazy(() => import('./routes/account/SettingsPage'));

const CompanyLayout = lazy(() => import('./routes/company/CompanyLayout'));
const ModerationPage = lazy(() => import('./routes/company/ModerationPage'));
const CompanyProfilePage = lazy(() => import('./routes/company/ProfilePage'));
const CompanyServicesPage = lazy(() => import('./routes/company/ServicesPage'));
const CompanyPromotionsPage = lazy(() => import('./routes/company/PromotionsPage'));
const CompanyOrdersPage = lazy(() => import('./routes/company/OrdersPage'));
const CompanyStatsPage = lazy(() => import('./routes/company/StatsPage'));
const CompanyReviewsPage = lazy(() => import('./routes/company/ReviewsPage'));
const CompanyChatsListPage = lazy(() => import('./routes/company/ChatsListPage'));
const CompanySettingsPage = lazy(() => import('./routes/company/SettingsPage'));

import RequireAuth from './components/layout/RequireAuth';
import RequireVerifiedCompany from './components/layout/RequireVerifiedCompany';

/**
 * Карта маршрутов — 1:1 с docs/02-ux.md §1 "Карта экранов". `/account/*` требует роль `client`,
 * `/company/*` требует роль `company`; разделы, доступные только `company_verified`, обёрнуты в
 * RequireVerifiedCompany (показывает заглушку вместо 404 для company_unverified).
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/city/:citySlug" element={<CityPage />} />
        <Route path="/companies/:id" element={<CompanyPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/2fa" element={<Login2FAPage />} />
        <Route path="/register/client" element={<RegisterClientPage />} />
        <Route path="/register/company" element={<RegisterCompanyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        <Route
          path="/account"
          element={
            <RequireAuth role="client">
              <AccountLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AccountOrdersPage />} />
          <Route path="orders" element={<AccountOrdersPage />} />
          <Route path="favorites" element={<AccountFavoritesPage />} />
          <Route path="reviews" element={<AccountReviewsPage />} />
          <Route path="chats" element={<AccountChatsListPage />} />
          <Route path="chats/:chatId" element={<ChatDialogPage />} />
          <Route path="settings" element={<AccountSettingsPage />} />
        </Route>

        <Route
          path="/company"
          element={
            <RequireAuth role="company">
              <CompanyLayout />
            </RequireAuth>
          }
        >
          <Route index element={<ModerationPage />} />
          <Route path="profile" element={<CompanyProfilePage />} />
          <Route
            path="services"
            element={
              <RequireVerifiedCompany>
                <CompanyServicesPage />
              </RequireVerifiedCompany>
            }
          />
          <Route
            path="promotions"
            element={
              <RequireVerifiedCompany>
                <CompanyPromotionsPage />
              </RequireVerifiedCompany>
            }
          />
          <Route
            path="orders"
            element={
              <RequireVerifiedCompany>
                <CompanyOrdersPage />
              </RequireVerifiedCompany>
            }
          />
          <Route
            path="stats"
            element={
              <RequireVerifiedCompany>
                <CompanyStatsPage />
              </RequireVerifiedCompany>
            }
          />
          <Route
            path="reviews"
            element={
              <RequireVerifiedCompany>
                <CompanyReviewsPage />
              </RequireVerifiedCompany>
            }
          />
          <Route
            path="chats"
            element={
              <RequireVerifiedCompany>
                <CompanyChatsListPage />
              </RequireVerifiedCompany>
            }
          />
          <Route
            path="chats/:chatId"
            element={
              <RequireVerifiedCompany>
                <ChatDialogPage />
              </RequireVerifiedCompany>
            }
          />
          <Route path="settings" element={<CompanySettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
