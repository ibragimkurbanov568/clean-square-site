import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import {
  IconChat,
  IconMenu,
  IconOrders,
  IconPromotion,
  IconServices,
  IconSettings,
  IconStar,
  IconStats,
  IconUser,
} from './NavIcons';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const VERIFIED_ITEMS: NavItem[] = [
  { to: '/company/profile', label: 'Профиль', icon: <IconUser /> },
  { to: '/company/services', label: 'Услуги и цены', icon: <IconServices /> },
  { to: '/company/promotions', label: 'Акции', icon: <IconPromotion /> },
  { to: '/company/orders', label: 'Заказы', icon: <IconOrders /> },
  { to: '/company/stats', label: 'Статистика', icon: <IconStats /> },
  { to: '/company/reviews', label: 'Отзывы', icon: <IconStar /> },
  { to: '/company/chats', label: 'Чаты', icon: <IconChat /> },
  { to: '/company/settings', label: 'Настройки', icon: <IconSettings /> },
];

const UNVERIFIED_ITEMS: NavItem[] = [
  { to: '/company/profile', label: 'Профиль', icon: <IconUser /> },
  { to: '/company/settings', label: 'Настройки', icon: <IconSettings /> },
];

const TAB_BAR_ITEMS: NavItem[] = [
  { to: '/company/orders', label: 'Заказы', icon: <IconOrders /> },
  { to: '/company/chats', label: 'Чаты', icon: <IconChat /> },
  { to: '/company/profile', label: 'Профиль', icon: <IconUser /> },
];

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            onClick={onNavigate}
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
  );
}

/** Навигация кабинета компании (docs/02-ux.md §5) — зависит от `is_verified`. */
export function CompanyNav() {
  const { user } = useAuth();
  const isVerified = Boolean(user?.company?.isVerified);
  const items = isVerified ? VERIFIED_ITEMS : UNVERIFIED_ITEMS;
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <nav aria-label="Меню кабинета компании" className="hidden w-60 shrink-0 border-r border-border px-3 py-6 md:block">
        <NavList items={items} />
      </nav>

      <div className="flex items-center justify-between border-b border-border px-4 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          aria-label="Открыть меню кабинета"
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-md text-text-primary hover:bg-surface-hover"
        >
          <IconMenu />
        </button>
        <span className="text-sm font-medium text-text-secondary">Кабинет компании</span>
      </div>

      <AnimatePresence>
        {isPanelOpen ? (
          <motion.div
            className="fixed inset-0 z-40 bg-overlay md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsPanelOpen(false)}
          >
            <motion.nav
              aria-label="Меню кабинета компании"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="h-full w-64 bg-surface-elevated p-4"
            >
              <NavList items={items} onNavigate={() => setIsPanelOpen(false)} />
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isVerified ? (
        <nav
          aria-label="Быстрые разделы"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface-elevated md:hidden"
        >
          {TAB_BAR_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
      ) : null}
    </>
  );
}

export default CompanyNav;
