import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { IconChat, IconHeart, IconOrders, IconSearch, IconStar, IconUser } from './NavIcons';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const SIDEBAR_ITEMS: NavItem[] = [
  { to: '/account/orders', label: 'Мои заказы', icon: <IconOrders /> },
  { to: '/account/favorites', label: 'Избранное', icon: <IconHeart /> },
  { to: '/account/reviews', label: 'Мои отзывы', icon: <IconStar /> },
  { to: '/account/chats', label: 'Чаты', icon: <IconChat /> },
  { to: '/account/settings', label: 'Настройки', icon: <IconUser /> },
];

const TAB_BAR_ITEMS: NavItem[] = [
  { to: '/', label: 'Поиск', icon: <IconSearch /> },
  { to: '/account/orders', label: 'Заказы', icon: <IconOrders /> },
  { to: '/account/favorites', label: 'Избранное', icon: <IconHeart /> },
  { to: '/account/chats', label: 'Чаты', icon: <IconChat /> },
  { to: '/account/settings', label: 'Профиль', icon: <IconUser /> },
];

/** Навигация кабинета клиента (docs/02-ux.md §5) — сайдбар на десктопе, таб-бар на мобильном. */
export function AccountNav() {
  return (
    <>
      <nav aria-label="Меню кабинета клиента" className="hidden w-60 shrink-0 border-r border-border px-3 py-6 md:block">
        <ul className="flex flex-col gap-1">
          {SIDEBAR_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'focus-ring flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-accent-subtle text-accent' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <nav
        aria-label="Меню кабинета клиента"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface-elevated md:hidden"
      >
        {TAB_BAR_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'focus-ring flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs',
                isActive ? 'text-accent' : 'text-text-secondary',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default AccountNav;
