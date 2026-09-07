import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import type { Company, Paginated } from '../lib/types';

export type CompanySort = 'rating' | 'price_asc' | 'reviews';

export interface UseCompaniesResult {
  items: Company[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const PAGE_SIZE = 12;

/** Список компаний города с сортировкой и пагинацией по 12 (F2, docs/02-ux.md «Экран города»). */
export function useCompanies(city: string | null, sort: CompanySort): UseCompaniesResult {
  const [items, setItems] = useState<Company[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!city) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Paginated<Company>>('/companies', {
        query: { city, sort, page: 1, limit: PAGE_SIZE },
      });
      setItems(result.items);
      setHasMore(result.hasMore);
      setTotal(result.total);
      setPage(1);
    } catch {
      setError('Не удалось загрузить компании');
    } finally {
      setIsLoading(false);
    }
  }, [city, sort]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!city || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await apiRequest<Paginated<Company>>('/companies', {
        query: { city, sort, page: nextPage, limit: PAGE_SIZE },
      });
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch {
      setError('Не удалось загрузить компании');
    } finally {
      setIsLoadingMore(false);
    }
  }, [city, sort, page, hasMore, isLoadingMore]);

  return { items, isLoading, isLoadingMore, error, hasMore, total, reload, loadMore };
}

export interface UseTopCompaniesResult {
  items: Company[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** ТОП-3 компании города (F3). */
export function useTopCompanies(city: string | null): UseTopCompaniesResult {
  const [items, setItems] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!city) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ items: Company[] }>('/companies/top', { query: { city } });
      setItems(result.items);
    } catch {
      setError('Не удалось загрузить компании');
    } finally {
      setIsLoading(false);
    }
  }, [city]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, isLoading, error, reload };
}
