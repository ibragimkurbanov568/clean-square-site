import { useState } from 'react';
import Avatar from '../common/Avatar';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import ScrollReveal from '../common/ScrollReveal';
import ShowMoreButton from '../common/ShowMoreButton';
import Skeleton from '../common/Skeleton';
import StarRating from '../common/StarRating';
import { useCompanyReviews, type ReviewSort } from '../../hooks/useReviews';
import { formatDate } from '../../lib/utils';

const SORT_OPTIONS: Array<{ id: ReviewSort; label: string }> = [
  { id: 'newest', label: 'Сначала новые' },
  { id: 'oldest', label: 'Сначала старые' },
  { id: 'rating_desc', label: 'Сначала высокая оценка' },
  { id: 'rating_asc', label: 'Сначала низкая оценка' },
];

export function ReviewsTab({ companyId }: { companyId: string }) {
  const [sort, setSort] = useState<ReviewSort>('newest');
  const { items, isLoading, isLoadingMore, error, hasMore, reload, loadMore } = useCompanyReviews(companyId, sort);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <label htmlFor="review-sort" className="text-sm text-text-secondary">
          Сортировка
        </label>
        <select
          id="review-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as ReviewSort)}
          className="focus-ring h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-text-primary"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState title="Пока нет отзывов — станьте первым, кто оставит отзыв после заказа" />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {items.map((review, index) => (
              <ScrollReveal key={review.id} as="li" index={index}>
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={review.clientUsername} size={32} />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{review.clientUsername}</p>
                      <p className="text-xs text-text-secondary">{formatDate(review.createdAt)}</p>
                    </div>
                    <StarRating rating={review.rating} showValue={false} className="ml-auto" />
                  </div>
                  {review.text ? <p className="mt-3 text-sm text-text-primary">{review.text}</p> : null}
                  {review.companyReply ? (
                    <div className="mt-3 rounded-md bg-surface-hover p-3">
                      <p className="text-xs font-semibold text-text-secondary">Ответ компании</p>
                      <p className="mt-1 text-sm text-text-primary">{review.companyReply}</p>
                    </div>
                  ) : null}
                </div>
              </ScrollReveal>
            ))}
          </ul>
          {hasMore ? <ShowMoreButton onClick={loadMore} isLoading={isLoadingMore} label="Показать ещё отзывы" /> : null}
        </>
      )}
    </div>
  );
}

export default ReviewsTab;
