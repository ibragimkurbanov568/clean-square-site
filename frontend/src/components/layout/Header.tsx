import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDismissableMenu } from '../../hooks/useDismissableMenu';
import { useToast } from '../../hooks/useToast';
import { slugifyCity } from '../../lib/utils';
import Avatar from '../common/Avatar';
import CitySearchInput from '../common/CitySearchInput';
import ThemeSwitcher from './ThemeSwitcher';

interface MenuLink {
  label: string;
  to: string;
}

const CLIENT_MENU: MenuLink[] = [
  { label: 'Мои заказы', to: '/account/orders' },
  { label: 'Избранное', to: '/account/favorites' },
  { label: 'Мои отзывы', to: '/account/reviews' },
  { label: 'Чаты', to: '/account/chats' },
  { label: 'Настройки', to: '/account/settings' },
];

const COMPANY_MENU: MenuLink[] = [
  { label: 'Профиль', to: '/company/profile' },
  { label: 'Услуги и цены', to: '/company/services' },
  { label: 'Акции', to: '/company/promotions' },
  { label: 'Заказы', to: '/company/orders' },
  { label: 'Статистика', to: '/company/stats' },
  { label: 'Отзывы', to: '/company/reviews' },
  { label: 'Чаты', to: '/company/chats' },
  { label: 'Настройки', to: '/company/settings' },
];

/** Глобальная шапка — docs/02-ux.md §5. Присутствует на каждом экране, для всех ролей. */
export function Header() {
  const { user, status, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, toggle, close, ref } = useDismissableMenu<HTMLDivElement>();

  const isSearchScreen = location.pathname === '/' || location.pathname.startsWith('/city/');
  const isCompanyVerified = user?.role === 'company' && user.company?.isVerified;
  const menuItems = user?.role === 'client' ? CLIENT_MENU : user?.role === 'company' && isCompanyVerified ? COMPANY_MENU : [];

  const handleLogout = async () => {
    close();
    await logout();
    showToast('Вы вышли из аккаунта', 'info');
    navigate('/');
  };

  const homeHref = user ? (user.role === 'client' ? '/account/orders' : '/company') : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to={homeHref} className="focus-ring interactive-scale shrink-0 text-lg font-bold text-text-primary">
          CleanLink
        </Link>

        {isSearchScreen ? (
          <div className="hidden max-w-xs flex-1 md:block">
            <CitySearchInput
              size="compact"
              placeholder="Изменить город"
              onSelectCity={(city) => navigate(`/city/${slugifyCity(city)}`)}
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-2">
          <ThemeSwitcher />

          {status === 'authenticated' && user ? (
            <>
              <button
                type="button"
                aria-label="Уведомления"
                onClick={() => showToast('Уведомления появятся здесь', 'info')}
                className="focus-ring interactive-scale hidden h-10 w-10 items-center justify-center rounded-full text-text-primary hover:bg-surface-hover sm:flex"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path d="M10 18a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>

              <div ref={ref} className="relative">
                <button
                  type="button"
                  onClick={toggle}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  className="focus-ring interactive-scale flex items-center gap-2 rounded-full"
                >
                  <Avatar src={user.avatarUrl} name={user.username} size={32} />
                  <span className="hidden text-sm text-text-secondary lg:inline">Здравствуйте, {user.username}</span>
                </button>
                <AnimatePresence>
                  {isOpen ? (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface-elevated py-2 shadow-lg"
                    >
                      {user.role === 'company' && !isCompanyVerified ? (
                        <Link
                          to="/company"
                          role="menuitem"
                          onClick={close}
                          className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-hover"
                        >
                          Профиль на модерации
                        </Link>
                      ) : (
                        menuItems.map((item) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            role="menuitem"
                            onClick={close}
                            className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-hover"
                          >
                            {item.label}
                          </Link>
                        ))
                      )}
                      <div className="my-1 border-t border-border" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="block w-full px-4 py-2 text-left text-sm text-error hover:bg-surface-hover"
                      >
                        Выйти
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/login" className="focus-ring interactive-scale rounded-md px-3 py-2 text-text-primary">
                Войти
              </Link>
              <Link
                to="/register/client"
                className="focus-ring interactive-scale rounded-md bg-accent-600 px-3 py-2 font-semibold text-accent-contrast hover:bg-accent-700"
              >
                Регистрация
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
