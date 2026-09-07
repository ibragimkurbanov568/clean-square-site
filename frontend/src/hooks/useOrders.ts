import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import type { Order, OrderStatus, Paginated } from '../lib/types';

/**
 * useOrders(role) — заказы клиента (F12, /account/orders) или компании (F5, /company/orders).
 * Эндпоинты: GET /api/orders?status=&page=, POST /api/orders (клиент), PATCH /api/orders/:id/status
 * (компания) — см. docs/04-architecture.md §4.5.
 */
export interface UseOrdersOptions {
  role: 'client' | 'company';
  status?: OrderStatus | 'all';
}

export interface UseOrdersResult {
  orders: Order[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateStatus: (orderId: string, status: Exclude<OrderStatus, 'created'>) => Promise<void>;
  markReviewed: (orderId: string) => void;
}

const PAGE_SIZE = 20;

export function useOrders(options: UseOrdersOptions): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const statusQuery = options.status && options.status !== 'all' ? options.status : undefined;

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Paginated<Order>>('/orders', {
        query: { status: statusQuery, page: 1, limit: PAGE_SIZE },
      });
      setOrders(result.items);
      setHasMore(result.hasMore);
      setPage(1);
    } catch {
      setError('Не удалось загрузить заказы');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusQuery]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await apiRequest<Paginated<Order>>('/orders', {
        query: { status: statusQuery, page: nextPage, limit: PAGE_SIZE },
      });
      setOrders((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch {
      setError('Не удалось загрузить заказы');
    } finally {
      setIsLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusQuery, page, hasMore, isLoadingMore]);

  const updateStatus = useCallback(async (orderId: string, status: Exclude<OrderStatus, 'created'>) => {
    const updated = await apiRequest<Order>(`/orders/${orderId}/status`, { method: 'PATCH', body: { status } });
    setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)));
  }, []);

  const markReviewed = useCallback((orderId: string) => {
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, hasReview: true } : order)));
  }, []);

  return { orders, isLoading, isLoadingMore, error, hasMore, reload, loadMore, updateStatus, markReviewed };
}

/** Создание заказа (F5) — используется в модалке подтверждения на карточке компании. */
export async function createOrder(companyId: string, serviceId: string): Promise<Order> {
  return apiRequest<Order>('/orders', { method: 'POST', body: { companyId, serviceId } });
}
