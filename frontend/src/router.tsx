import { Route, Routes } from 'react-router-dom';

import HomePage from './routes/HomePage';
import CityPage from './routes/CityPage';
import CompanyPage from './routes/CompanyPage';
import LoginPage from './routes/LoginPage';
import Login2FAPage from './routes/Login2FAPage';
import RegisterClientPage from './routes/RegisterClientPage';
import RegisterCompanyPage from './routes/RegisterCompanyPage';
import ForgotPasswordPage from './routes/ForgotPasswordPage';
import ResetPasswordPage from './routes/ResetPasswordPage';
import NotFoundPage from './routes/NotFoundPage';
import ChatDialogPage from './routes/ChatDialogPage';

import AccountLayout from './routes/account/AccountLayout';
import AccountOrdersPage from './routes/account/OrdersPage';
import AccountFavoritesPage from './routes/account/FavoritesPage';
import AccountReviewsPage from './routes/account/ReviewsPage';
import AccountChatsListPage from './routes/account/ChatsListPage';
import AccountSettingsPage from './routes/account/SettingsPage';

import CompanyLayout from './routes/company/CompanyLayout';
import ModerationPage from './routes/company/ModerationPage';
import CompanyProfilePage from './routes/company/ProfilePage';
import CompanyServicesPage from './routes/company/ServicesPage';
import CompanyPromotionsPage from './routes/company/PromotionsPage';
import CompanyOrdersPage from './routes/company/OrdersPage';
import CompanyStatsPage from './routes/company/StatsPage';
import CompanyReviewsPage from './routes/company/ReviewsPage';
import CompanyChatsListPage from './routes/company/ChatsListPage';
import CompanySettingsPage from './routes/company/SettingsPage';

import RequireAuth from './components/layout/RequireAuth';
import RequireVerifiedCompany from './components/layout/RequireVerifiedCompany';

/**
 * Карта маршрутов — 1:1 с docs/02-ux.md §1 "Карта экранов". `/account/*` требует роль `client`,
 * `/company/*` требует роль `company`; разделы, доступные только `company_verified`, обёрнуты в
 * RequireVerifiedCompany (показывает заглушку вместо 404 для company_unverified).
 */
export function AppRoutes() {
  return (
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
  );
}

export default AppRoutes;
