import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, ApiError } from '../lib/apiClient';
import type { Message } from '../lib/types';

/**
 * useChat(chatId) — переписка клиент-компания (F6).
 *
 * Реализация — REST-поллинг 3-5 сек (решение архитектора, docs/04-architecture.md §2.4,
 * допущение 4 ТЗ), а не WebSocket. Эндпоинты:
 *   - GET  /api/chats/:chatId/messages?limit=30&before=<cursor>  — начальная история/подгрузка вверх
 *   - GET  /api/chats/:chatId/poll?after=<ISO-дата последнего известного сообщения>  — новые сообщения
 *   - POST /api/chats/:chatId/messages { text }  — отправка
 *
 * Поллинг ставится на паузу, когда вкладка неактивна (`document.visibilityState`), и полностью
 * останавливается при размонтировании (уход со страницы чата).
 */
export interface UseChatResult {
  messages: Message[];
  isLoading: boolean;
  isLoadingOlder: boolean;
  hasMoreOlder: boolean;
  error: string | null;
  sendError: string | null;
  sendMessage: (text: string) => Promise<boolean>;
  loadOlder: () => Promise<void>;
}

const POLL_INTERVAL_MS = 4000;
const HISTORY_PAGE_SIZE = 30;

export function useChat(chatId: string | undefined, currentUserId: string | undefined): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  const mergeIncoming = useCallback((incoming: Message[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  const poll = useCallback(async () => {
    if (!chatId) return;
    const last = messagesRef.current[messagesRef.current.length - 1];
    try {
      const result = await apiRequest<{ items: Message[] }>(`/chats/${chatId}/poll`, {
        query: last ? { after: last.createdAt } : undefined,
      });
      mergeIncoming(result.items);
    } catch {
      // Тихий сбой поллинга — не блокирует UI, попробуем на следующем тике; сетевой статус
      // отображает отдельная глобальная плашка (useOnlineStatus).
    }
  }, [chatId, mergeIncoming]);

  useEffect(() => {
    if (!chatId) return undefined;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setMessages([]);
    setHasMoreOlder(true);

    apiRequest<{ items: Message[] }>(`/chats/${chatId}/messages`, { query: { limit: HISTORY_PAGE_SIZE } })
      .then((result) => {
        if (cancelled) return;
        const sorted = [...result.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setMessages(sorted);
        setHasMoreOlder(result.items.length >= HISTORY_PAGE_SIZE);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить сообщения');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const startPolling = () => {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(() => {
        if (document.visibilityState === 'visible') void poll();
      }, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void poll();
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [chatId, poll]);

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      if (!chatId || !text.trim()) return false;
      setSendError(null);
      // Оптимистичная отправка: временное сообщение появляется сразу, заменяется настоящим при успехе.
      const tempId = `temp-${Date.now()}`;
      const optimistic: Message = {
        id: tempId,
        chatId,
        senderId: currentUserId ?? 'me',
        text,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const sent = await apiRequest<Message>(`/chats/${chatId}/messages`, { method: 'POST', body: { text } });
        setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
        return true;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setSendError(err instanceof ApiError ? err.message : 'Не удалось отправить сообщение');
        return false;
      }
    },
    [chatId, currentUserId],
  );

  const loadOlder = useCallback(async () => {
    if (!chatId || isLoadingOlder || !hasMoreOlder) return;
    const oldest = messagesRef.current[0];
    if (!oldest) return;
    setIsLoadingOlder(true);
    try {
      const result = await apiRequest<{ items: Message[] }>(`/chats/${chatId}/messages`, {
        query: { before: oldest.createdAt, limit: HISTORY_PAGE_SIZE },
      });
      if (result.items.length === 0) {
        setHasMoreOlder(false);
      } else {
        const sorted = [...result.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setMessages((prev) => [...sorted, ...prev]);
        setHasMoreOlder(result.items.length >= HISTORY_PAGE_SIZE);
      }
    } catch {
      // Ошибка подгрузки истории не блокирует текущую ленту.
    } finally {
      setIsLoadingOlder(false);
    }
  }, [chatId, isLoadingOlder, hasMoreOlder]);

  return { messages, isLoading, isLoadingOlder, hasMoreOlder, error, sendError, sendMessage, loadOlder };
}
