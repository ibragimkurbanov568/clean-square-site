import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ThemeSwitcher from './ThemeSwitcher';

/**
 * Глобальная шапка (docs/02-ux.md §5) — присутствует на каждом экране для всех ролей.
 * TODO(frontend): поле города по центру, колокольчик уведомлений, аватар с меню кабинета —
 * см. полную анатомию в docs/02-ux.md §5 и docs/03-design-system.md.
 */
export function Header() {
  const { user, status } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <Link to="/" className="text-lg font-semibold text-text-primary">
        CleanLink
      </Link>
      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        {status === 'authenticated' && user ? (
          <span className="text-sm text-text-secondary">Здравствуйте, {user.username}</span>
        ) : (
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-text-primary">
              Войти
            </Link>
            <Link
              to="/register/client"
              className="rounded-md bg-accent-600 px-3 py-1.5 text-accent-contrast"
            >
              Регистрация
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
