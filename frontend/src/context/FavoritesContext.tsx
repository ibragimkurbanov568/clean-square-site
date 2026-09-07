import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/apiClient';
import type { Favorite, Paginated } from '../lib/types';
import { useAuth } from '../hooks/useAuth';

export interface FavoritesContextValue {
  items: Favorite[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
  isFavorite: (companyId: string) => boolean;
  /** Переключает избранное оптимистично, откатывает при ошибке (docs/02-ux.md §6). */
  toggleFavorite: (companyId: string) => Promise<{ ok: boolean; nowFavorite: boolean }>;
}

export const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const PAGE_SIZE = 12;

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const isClient = status === 'authenticated' && user?.role === 'client';

  const [items, setItems] = useState<Favorite[]>([]);
  const [favoriteIdsState, setFavoriteIdsState] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isClient) {
      setItems([]);
      setFavoriteIdsState(new Set());
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Paginated<Favorite>>('/favorites', { query: { page: 1, limit: PAGE_SIZE } });
      setItems(result.items);
      setFavoriteIdsState(new Set(result.items.map((item) => item.companyId)));
      setHasMore(result.hasMore);
      setPage(1);
    } catch {
      setError('Не удалось загрузить избранное');
    } finally {
      setIsLoading(false);
    }
  }, [isClient]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!isClient || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await apiRequest<Paginated<Favorite>>('/favorites', {
        query: { page: nextPage, limit: PAGE_SIZE },
      });
      setItems((prev) => [...prev, ...result.items]);
      setFavoriteIdsState((prev) => {
        const next = new Set(prev);
        for (const item of result.items) next.add(item.companyId);
        return next;
      });
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch {
      setError('Не удалось загрузить избранное');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isClient, page, hasMore, isLoadingMore]);

  const isFavorite = useCallback((companyId: string) => favoriteIdsState.has(companyId), [favoriteIdsState]);

  const toggleFavorite = useCallback(
    async (companyId: string) => {
      const wasFavorite = favoriteIdsState.has(companyId);
      // Оптимистичное переключение "сердца" — мгновенно, без ожидания сервера (F8, docs/02-ux.md §6).
      setFavoriteIdsState((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(companyId);
        else next.add(companyId);
        return next;
      });
      try {
        if (wasFavorite) {
          await apiRequest(`/favorites/${companyId}`, { method: 'DELETE' });
        } else {
          await apiRequest(`/favorites/${companyId}`, { method: 'POST' });
        }
        void reload();
        return { ok: true, nowFavorite: !wasFavorite };
      } catch {
        // Откат при ошибке сети/сервера.
        setFavoriteIdsState((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(companyId);
          else next.delete(companyId);
          return next;
        });
        return { ok: false, nowFavorite: wasFavorite };
      }
    },
    [favoriteIdsState, reload],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ items, isLoading, isLoadingMore, error, hasMore, reload, loadMore, isFavorite, toggleFavorite }),
    [items, isLoading, isLoadingMore, error, hasMore, reload, loadMore, isFavorite, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
