import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
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
 * TODO(frontend): реализовать интервал поллинга (3-5 сек, пауза когда вкладка неактивна —
 * `document.visibilityState`), подгрузку истории при скролле вверх, оптимистичную отправку с
 * откатом и текстом ошибки "Не удалось отправить сообщение" (см. docs/02-ux.md, экран «Диалог чата»).
 */
export interface UseChatResult {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  loadOlder: () => Promise<void>;
}

const POLL_INTERVAL_MS = 4000;

export function useChat(chatId: string | undefined): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!chatId) return undefined;
    // TODO(frontend): первичная загрузка GET /api/chats/:chatId/messages, запуск интервала поллинга
    // на POLL_INTERVAL_MS через GET /api/chats/:chatId/poll?after=...
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [chatId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatId) return;
      // TODO(frontend): оптимистичное добавление сообщения + POST /api/chats/:chatId/messages,
      // откат при ошибке (см. docs/02-ux.md "Ветка ошибки отправки").
      await apiRequest(`/chats/${chatId}/messages`, { method: 'POST', body: { text } });
    },
    [chatId],
  );

  const loadOlder = useCallback(async () => {
    if (!chatId) return;
    // TODO(frontend): GET /api/chats/:chatId/messages?before=<created_at самого старого известного>.
  }, [chatId]);

  return { messages, isLoading, error, sendMessage, loadOlder };
}
