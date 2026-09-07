import { useId } from 'react';
import { cn } from '../../lib/utils';
import { pluralizeRu } from '../../lib/utils';

export interface StarRatingProps {
  rating: number;
  reviewsCount?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}

/** Звёздный рейтинг (не интерактивный) — docs/03-design-system.md §7.6, с дробной заливкой через SVG-градиент. */
export function StarRating({ rating, reviewsCount, size = 16, showValue = true, className }: StarRatingProps) {
  const gradientId = useId();
  const clampedRating = Math.max(0, Math.min(5, rating));
  const label =
    reviewsCount !== undefined
      ? `Рейтинг ${clampedRating.toFixed(1)} из 5, ${reviewsCount} ${pluralizeRu(reviewsCount, 'отзыв', 'отзыва', 'отзывов')}`
      : `Рейтинг ${clampedRating.toFixed(1)} из 5`;

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)} role="img" aria-label={label}>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => {
          const fillFraction = Math.max(0, Math.min(1, clampedRating - index));
          const id = `${gradientId}-${index}`;
          return (
            <svg key={index} width={size} height={size} viewBox="0 0 24 24">
              <defs>
                <linearGradient id={id}>
                  <stop offset={`${fillFraction * 100}%`} stopColor="var(--color-star-filled)" />
                  <stop offset={`${fillFraction * 100}%`} stopColor="var(--color-star-empty)" />
                </linearGradient>
              </defs>
              <path
                d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.7z"
                fill={`url(#${id})`}
              />
            </svg>
          );
        })}
      </div>
      {showValue ? (
        <span className="text-sm text-text-secondary">
          {clampedRating.toFixed(1)}
          {reviewsCount !== undefined ? ` · ${reviewsCount} ${pluralizeRu(reviewsCount, 'отзыв', 'отзыва', 'отзывов')}` : ''}
        </span>
      ) : null}
    </div>
  );
}

export interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

/** Интерактивный выбор оценки (форма отзыва) — hover подсвечивает звёзды до наведённой. */
export function StarRatingInput({ value, onChange, size = 24 }: StarRatingInputProps) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Оценка от 1 до 5 звёзд">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= value;
        return (
          <button
            key={starValue}
            type="button"
            role="radio"
            aria-checked={value === starValue}
            aria-label={`${starValue} из 5`}
            onClick={() => onChange(starValue)}
            className="focus-ring interactive-scale flex h-11 w-11 items-center justify-center"
          >
            <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.7z"
                fill={isFilled ? 'var(--color-star-filled)' : 'var(--color-star-empty)'}
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
