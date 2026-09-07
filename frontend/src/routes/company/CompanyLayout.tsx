import { Outlet } from 'react-router-dom';
import CompanyNav from '../../components/layout/CompanyNav';
import { useAuth } from '../../hooks/useAuth';

/**
 * Layout кабинета компании (`/company/*`) — боковое/нижнее меню (docs/02-ux.md §5). Для
 * `company_unverified` меню показывает только «Профиль»/«Настройки» (см. CompanyNav).
 */
export default function CompanyLayout() {
  const { user } = useAuth();
  const isVerified = Boolean(user?.company?.isVerified);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-6xl flex-col md:flex-row">
      <CompanyNav />
      <main className={`flex-1 px-4 pt-6 md:px-6 ${isVerified ? 'pb-20 md:pb-6' : 'pb-6'}`}>
        <Outlet />
      </main>
    </div>
  );
}
