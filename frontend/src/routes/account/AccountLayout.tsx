import { Outlet } from 'react-router-dom';
import AccountNav from '../../components/layout/AccountNav';

/** Layout кабинета клиента (`/account/*`) — боковое/нижнее меню (docs/02-ux.md §5). */
export default function AccountLayout() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-6xl flex-col md:flex-row">
      <AccountNav />
      <main className="flex-1 px-4 pb-20 pt-6 md:px-6 md:pb-6">
        <Outlet />
      </main>
    </div>
  );
}
