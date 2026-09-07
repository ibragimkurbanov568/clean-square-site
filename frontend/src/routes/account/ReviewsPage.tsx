import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import ScrollReveal from '../../components/common/ScrollReveal';
import ShowMoreButton from '../../components/common/ShowMoreButton';
import Skeleton from '../../components/common/Skeleton';
import StarRating from '../../components/common/StarRating';
import { useAccountReviews } from '../../hooks/useReviews';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { formatDate } from '../../lib/utils';

/** `/account/reviews` — отзывы, оставленные клиентом (F7). */
export default function ReviewsPage() {
  useDocumentMeta({ title: 'Мои отзывы — CleanLink' });
  const { items, isLoading, isLoadingMore, error, hasMore, reload, loadMore } = useAccountReviews();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-text-primary">Мои отзывы</h1>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Не удалось загрузить отзывы" onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Вы ещё не оставили ни одного отзыва"
          action={
            <Button variant="primary" onClick={() => navigate('/account/orders')}>
              Перейти к заказам
            </Button>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {items.map((review, index) => (
              <ScrollReveal key={review.id} as="li" index={index}>
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={review.clientUsername} size={32} />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{formatDate(review.createdAt)}</p>
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
          {hasMore ? <ShowMoreButton onClick={loadMore} isLoading={isLoadingMore} /> : null}
        </>
      )}
    </div>
  );
}
