import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import FullPageLoader from '../common/FullPageLoader';
import { useAuth } from '../../hooks/useAuth';

export interface RequireAuthProps {
  role?: 'client' | 'company';
  children: ReactNode;
}

/**
 * Защита маршрутов `/account/*` и `/company/*` (docs/02-ux.md §5 «Навигационная схема по ролям»):
 * гость перенаправляется на /login?returnTo=..., пользователь другой роли — на свой кабинет.
 */
export function RequireAuth({ role, children }: RequireAuthProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <FullPageLoader />;
  }

  if (status !== 'authenticated' || !user) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'client' ? '/account/orders' : '/company'} replace />;
  }

  return <>{children}</>;
}

export default RequireAuth;
