import { Outlet } from 'react-router-dom';

/**
 * Layout кабинета компании (`/company/*`) — боковое/нижнее меню (docs/02-ux.md §5).
 * TODO(frontend): требует роли `company`; для `company_unverified` меню показывает только
 * «Профиль»/«Настройки», прямой переход на закрытые разделы — тот же экран заглушки (не 404).
 */
export default function CompanyLayout() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav aria-label="Меню кабинета компании" className="md:w-60 md:shrink-0">
        {/* TODO(frontend): пункты меню зависят от is_verified, см. docs/02-ux.md §5 */}
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
