import { useState } from 'react';
import { NewOrderBadge, OrderStatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ConfirmModal from '../../components/common/ConfirmModal';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import FilterPills from '../../components/common/FilterPills';
import ScrollReveal from '../../components/common/ScrollReveal';
import ShowMoreButton from '../../components/common/ShowMoreButton';
import Skeleton from '../../components/common/Skeleton';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { useOrders } from '../../hooks/useOrders';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatPrice } from '../../lib/utils';
import type { Order, OrderStatus } from '../../lib/types';

const FILTERS: Array<{ id: OrderStatus | 'all'; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'created', label: 'Создан' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'done', label: 'Выполнен' },
  { id: 'cancelled', label: 'Отменён' },
];

/** `/company/orders` (только company_verified) — приём заказов и смена статуса (F5). */
export default function OrdersPage() {
  useDocumentMeta({ title: 'Заказы — CleanLink' });
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const { orders, isLoading, error, hasMore, reload, loadMore, isLoadingMore, updateStatus } = useOrders({
    role: 'company',
    status,
  });
  const { showToast } = useToast();
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const changeStatus = async (order: Order, next: Exclude<OrderStatus, 'created'>) => {
    setBusyOrderId(order.id);
    setStatusError(null);
    try {
      await updateStatus(order.id, next);
    } catch {
      setStatusError('Недопустимый переход статуса. Обновите страницу и попробуйте снова');
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelling) return;
    const target = cancelling;
    await changeStatus(target, 'cancelled');
    setCancelling(null);
    if (!statusError) showToast('Заказ отменён', 'info');
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-text-primary">Заказы</h1>
      <FilterPills options={FILTERS} value={status} onChange={setStatus} />
      {statusError ? (
        <p role="alert" className="text-sm text-error">
          {statusError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Не удалось загрузить заказы" onRetry={reload} />
      ) : orders.length === 0 ? (
        <EmptyState title="Заказов пока нет" description="Новые заказы клиентов появятся здесь" />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {orders.map((order, index) => (
              <ScrollReveal key={order.id} as="li" index={index}>
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-text-primary">{order.serviceName}</p>
                    <p className="text-xs text-text-secondary">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold tabular-nums text-text-primary">{formatPrice(order.totalPrice)}</span>
                    {order.status === 'created' ? <NewOrderBadge /> : <OrderStatusBadge status={order.status} />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'created' ? (
                      <>
                        <Button size="sm" isLoading={busyOrderId === order.id} onClick={() => changeStatus(order, 'in_progress')}>
                          Взять в работу
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setCancelling(order)}>
                          Отменить
                        </Button>
                      </>
                    ) : order.status === 'in_progress' ? (
                      <>
                        <Button size="sm" isLoading={busyOrderId === order.id} onClick={() => changeStatus(order, 'done')}>
                          Отметить выполненным
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setCancelling(order)}>
                          Отменить
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </ul>
          {hasMore ? <ShowMoreButton onClick={loadMore} isLoading={isLoadingMore} /> : null}
        </>
      )}

      <ConfirmModal
        isOpen={Boolean(cancelling)}
        title="Отменить заказ?"
        description="Клиент увидит статус «Отменён»"
        confirmLabel="Отменить заказ"
        cancelLabel="Не отменять"
        onConfirm={() => void handleCancelConfirm()}
        onCancel={() => setCancelling(null)}
        isLoading={busyOrderId === cancelling?.id}
      />
    </div>
  );
}
