import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OrderStatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import FilterPills from '../../components/common/FilterPills';
import ScrollReveal from '../../components/common/ScrollReveal';
import ShowMoreButton from '../../components/common/ShowMoreButton';
import Skeleton from '../../components/common/Skeleton';
import ReviewFormModal from '../../components/account/ReviewFormModal';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useOrders } from '../../hooks/useOrders';
import { useStartChat } from '../../hooks/useStartChat';
import { formatDate, formatPrice } from '../../lib/utils';
import type { Order, OrderStatus } from '../../lib/types';

const FILTERS: Array<{ id: OrderStatus | 'all'; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'created', label: 'Создан' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'done', label: 'Выполнен' },
  { id: 'cancelled', label: 'Отменён' },
];

/** `/account/orders` — заказы клиента с фильтром по статусу (F12). */
export default function OrdersPage() {
  useDocumentMeta({ title: 'Мои заказы — CleanLink' });
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const { orders, isLoading, error, hasMore, reload, loadMore, isLoadingMore, markReviewed } = useOrders({ role: 'client', status });
  const { startChat, isStarting } = useStartChat('/account/chats');
  const navigate = useNavigate();
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-text-primary">Мои заказы</h1>
      <FilterPills options={FILTERS} value={status} onChange={setStatus} />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Не удалось загрузить заказы" onRetry={reload} retryLabel="Повторить загрузку" />
      ) : orders.length === 0 ? (
        <EmptyState
          title="У вас пока нет заказов"
          action={
            <Button onClick={() => navigate('/')} variant="primary">
              Найти компанию
            </Button>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {orders.map((order, index) => (
              <ScrollReveal key={order.id} as="li" index={index}>
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <Link to={`/companies/${order.companyId}`} className="font-semibold text-text-primary hover:underline">
                      {order.companyName}
                    </Link>
                    <p className="text-sm text-text-secondary">{order.serviceName}</p>
                    <p className="text-xs text-text-secondary">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold tabular-nums text-text-primary">{formatPrice(order.totalPrice)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" isLoading={isStarting} onClick={() => startChat(order.companyId)}>
                      Написать в чат
                    </Button>
                    {order.status === 'done' ? (
                      <Button
                        variant={order.hasReview ? 'secondary' : 'primary'}
                        size="sm"
                        disabled={order.hasReview}
                        onClick={() => setReviewOrder(order)}
                      >
                        {order.hasReview ? 'Отзыв оставлен' : 'Оставить отзыв'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </ul>
          {hasMore ? <ShowMoreButton onClick={loadMore} isLoading={isLoadingMore} /> : null}
        </>
      )}

      <ReviewFormModal
        order={reviewOrder}
        onClose={() => setReviewOrder(null)}
        onSubmitted={(orderId) => markReviewed(orderId)}
      />
    </div>
  );
}
