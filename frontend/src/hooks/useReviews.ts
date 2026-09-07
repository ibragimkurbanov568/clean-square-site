import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import type { Paginated, Review } from '../lib/types';

export type ReviewSort = 'newest' | 'oldest' | 'rating_desc' | 'rating_asc';

export interface UseCompanyReviewsResult {
  items: Review[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
  applyReply: (reviewId: string, reply: Review) => void;
}

const PAGE_SIZE = 10;

/** Отзывы компании во вкладке «Отзывы» карточки компании (F4) и в /company/reviews (F7). */
export function useCompanyReviews(companyId: string | undefined, sort: ReviewSort): UseCompanyReviewsResult {
  const [items, setItems] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Paginated<Review>>(`/companies/${companyId}/reviews`, {
        query: { sort, page: 1, limit: PAGE_SIZE },
      });
      setItems(result.items);
      setHasMore(result.hasMore);
      setTotal(result.total);
      setPage(1);
    } catch {
      setError('Не удалось загрузить отзывы');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, sort]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!companyId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await apiRequest<Paginated<Review>>(`/companies/${companyId}/reviews`, {
        query: { sort, page: nextPage, limit: PAGE_SIZE },
      });
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch {
      setError('Не удалось загрузить отзывы');
    } finally {
      setIsLoadingMore(false);
    }
  }, [companyId, sort, page, hasMore, isLoadingMore]);

  const applyReply = useCallback((reviewId: string, reply: Review) => {
    setItems((prev) => prev.map((review) => (review.id === reviewId ? reply : review)));
  }, []);

  return { items, isLoading, isLoadingMore, error, hasMore, total, reload, loadMore, applyReply };
}

export interface UseAccountReviewsResult {
  items: Review[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/** Мои отзывы клиента (/account/reviews). */
export function useAccountReviews(): UseAccountReviewsResult {
  const [items, setItems] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Paginated<Review>>('/account/reviews', { query: { page: 1, limit: PAGE_SIZE } });
      setItems(result.items);
      setHasMore(result.hasMore);
      setPage(1);
    } catch {
      setError('Не удалось загрузить отзывы');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await apiRequest<Paginated<Review>>('/account/reviews', {
        query: { page: nextPage, limit: PAGE_SIZE },
      });
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch {
      setError('Не удалось загрузить отзывы');
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, hasMore, isLoadingMore]);

  return { items, isLoading, isLoadingMore, error, hasMore, reload, loadMore };
}
