import { useState } from 'react';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import ScrollReveal from '../../components/common/ScrollReveal';
import ShowMoreButton from '../../components/common/ShowMoreButton';
import Skeleton from '../../components/common/Skeleton';
import StarRating from '../../components/common/StarRating';
import Textarea from '../../components/common/Textarea';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useCompanyReviews } from '../../hooks/useReviews';
import { apiRequest, ApiError } from '../../lib/apiClient';
import { formatDate } from '../../lib/utils';
import type { Review } from '../../lib/types';

function ReplyForm({ review, onReplied }: { review: Review; onReplied: (review: Review) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await apiRequest<Review>(`/reviews/${review.id}/reply`, { method: 'POST', body: { text } });
      onReplied(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить ответ. Попробуйте ещё раз');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <Textarea label="Ответить на отзыв" placeholder="Напишите ответ клиенту…" value={text} onChange={(e) => setText(e.target.value)} rows={2} />
      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
      <Button size="sm" className="w-fit" onClick={handleSubmit} isLoading={isSubmitting} loadingText="Отправляем…" disabled={!text.trim()}>
        Ответить
      </Button>
    </div>
  );
}

/** `/company/reviews` (только company_verified) — отзывы и ответы (F7). */
export default function ReviewsPage() {
  useDocumentMeta({ title: 'Отзывы — CleanLink' });
  const { user } = useAuth();
  const companyId = user?.company?.id;
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const { items, isLoading, isLoadingMore, error, hasMore, reload, loadMore, applyReply } = useCompanyReviews(companyId, 'newest');

  const filtered = ratingFilter === 'all' ? items : items.filter((review) => review.rating === ratingFilter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-primary">Отзывы</h1>
        {items.length > 0 ? (
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="focus-ring h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-text-primary"
            aria-label="Фильтр по оценке"
          >
            <option value="all">Все оценки</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} звёзд
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Не удалось загрузить отзывы" onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState title="Отзывов пока нет" description="Отзывы появятся после первых выполненных заказов" />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {filtered.map((review, index) => (
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
                  ) : (
                    <ReplyForm review={review} onReplied={(updated) => applyReply(review.id, updated)} />
                  )}
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
