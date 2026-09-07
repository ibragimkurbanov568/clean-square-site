import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../common/EmptyState';

/**
 * Разделы «Услуги», «Акции», «Заказы», «Статистика», «Отзывы», «Чаты» скрыты для
 * `company_unverified` — прямой переход по URL показывает тот же экран заглушки, а не 404
 * (docs/02-ux.md §5 «Навигационная схема по ролям»).
 */
export function RequireVerifiedCompany({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isVerified = Boolean(user?.company?.isVerified);

  if (!isVerified) {
    return (
      <EmptyState
        title="Этот раздел станет доступен после подтверждения профиля"
        description="Пока профиль на модерации, доступны только «Профиль» и «Настройки»."
      />
    );
  }

  return <>{children}</>;
}

export default RequireVerifiedCompany;
