import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFavorites } from '../../hooks/useFavorites';
import { useToast } from '../../hooks/useToast';
import { buildGuestLoginUrl } from '../../lib/authRedirect';
import { cn } from '../../lib/utils';

export interface FavoriteHeartButtonProps {
  companyId: string;
  returnTo: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** Иконка «сердце» — переключает избранное (F8), гостя ведёт на /login с сохранённым intent. */
export function FavoriteHeartButton({ companyId, returnTo, className, size = 'md' }: FavoriteHeartButtonProps) {
  const { status, user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  if (status === 'authenticated' && user?.role === 'company') return null;

  const favored = status === 'authenticated' && isFavorite(companyId);

  const handleClick = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (status !== 'authenticated') {
      navigate(buildGuestLoginUrl({ intent: 'favorite', companyId, returnTo }));
      return;
    }
    const result = await toggleFavorite(companyId);
    if (!result.ok) {
      showToast('Не удалось обновить избранное. Попробуйте снова', 'error');
    } else if (!result.nowFavorite) {
      showToast('Компания удалена из избранного', 'success');
    }
  };

  const dimension = size === 'sm' ? 32 : 40;

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-label={favored ? 'Убрать из избранного' : 'Добавить в избранное'}
      aria-pressed={favored}
      whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
      whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15 }}
      className={cn(
        'focus-ring flex items-center justify-center rounded-full bg-surface-elevated/80 text-error shadow-sm backdrop-blur-sm',
        className,
      )}
      style={{ width: dimension, height: dimension }}
    >
      <svg width={size === 'sm' ? 16 : 20} height={size === 'sm' ? 16 : 20} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 21s-7.5-4.6-10-9.1C.4 8.6 2 5 5.6 5c2 0 3.4 1 4.4 2.4C11 6 12.4 5 14.4 5 18 5 19.6 8.6 22 11.9 19.5 16.4 12 21 12 21z"
          fill={favored ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  );
}

export default FavoriteHeartButton;
