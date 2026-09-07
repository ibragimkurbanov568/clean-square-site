import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import type { Chat, Paginated } from '../lib/types';

export interface UseChatsListResult {
  items: Chat[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const PAGE_SIZE = 20;

/** Список чатов (клиента или компании), отсортирован по last_message_at убыв. (F6). */
export function useChatsList(): UseChatsListResult {
  const [items, setItems] = useState<Chat[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Paginated<Chat>>('/chats', { query: { page: 1, limit: PAGE_SIZE } });
      setItems(result.items);
      setHasMore(result.hasMore);
      setPage(1);
    } catch {
      setError('Не удалось загрузить чаты');
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
      const result = await apiRequest<Paginated<Chat>>('/chats', { query: { page: nextPage, limit: PAGE_SIZE } });
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch {
      setError('Не удалось загрузить чаты');
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, hasMore, isLoadingMore]);

  return { items, isLoading, isLoadingMore, error, hasMore, reload, loadMore };
}
