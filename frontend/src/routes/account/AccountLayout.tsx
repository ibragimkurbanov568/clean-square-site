import { Outlet } from 'react-router-dom';

/**
 * Layout кабинета клиента (`/account/*`) — боковое/нижнее меню (docs/02-ux.md §5).
 * TODO(frontend): требует роли `client` (см. useAuth) — иначе редирект на /login?returnTo=...
 */
export default function AccountLayout() {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav aria-label="Меню кабинета клиента" className="md:w-60 md:shrink-0">
        {/* TODO(frontend): пункты меню — Заказы/Избранное/Отзывы/Чаты/Настройки, см. docs/02-ux.md §5 */}
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
