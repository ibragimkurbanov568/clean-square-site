import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import type { Order, OrderStatus, Paginated } from '../lib/types';

/**
 * useOrders(role) — заказы клиента (F12, /account/orders) или компании (F5, /company/orders).
 * Эндпоинты: GET /api/orders?status=&page=, POST /api/orders (клиент), PATCH /api/orders/:id/status
 * (компания) — см. docs/04-architecture.md §4.5.
 *
 * TODO(frontend): реализовать загрузку по фильтру статуса (F12), пагинацию по 20 (docs/02-ux.md),
 * для роли company — контекстные кнопки смены статуса с модалом подтверждения отмены.
 */
export interface UseOrdersOptions {
  role: 'client' | 'company';
  status?: OrderStatus | 'all';
}

export interface UseOrdersResult {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateStatus: (orderId: string, status: Exclude<OrderStatus, 'created'>) => Promise<void>;
}

export function useOrders(options: UseOrdersOptions): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO(frontend): GET /api/orders?status=&page=1, сброс состояния списка.
      const result = await apiRequest<Paginated<Order>>('/orders', {
        query: { status: options.status === 'all' ? undefined : options.status, page: 1 },
      });
      setOrders(result.items);
      setHasMore(result.hasMore);
      setPage(1);
    } catch {
      setError('Не удалось загрузить заказы');
    } finally {
      setIsLoading(false);
    }
  }, [options.status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    // TODO(frontend): GET /api/orders?page=page+1, конкатенация с текущим списком.
    void page;
  }, [page]);

  const updateStatus = useCallback(
    async (orderId: string, status: Exclude<OrderStatus, 'created'>) => {
      // TODO(frontend, только role='company'): PATCH /api/orders/:id/status, обновить локально.
      await apiRequest(`/orders/${orderId}/status`, { method: 'PATCH', body: { status } });
    },
    [],
  );

  return { orders, isLoading, error, hasMore, reload, loadMore, updateStatus };
}
