import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';
import type { Chat } from '../lib/types';
import { useToast } from './useToast';

/** Открывает/создаёт чат с компанией и переходит в диалог (F6) — используется в нескольких экранах. */
export function useStartChat(basePath: '/account/chats' | '/company/chats' = '/account/chats') {
  const [isStarting, setIsStarting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const startChat = useCallback(
    async (companyId: string) => {
      setIsStarting(true);
      try {
        const chat = await apiRequest<Chat>('/chats', { method: 'POST', body: { companyId } });
        navigate(`${basePath}/${chat.id}`);
        return chat.id;
      } catch {
        showToast('Не удалось открыть чат. Попробуйте снова', 'error');
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [basePath, navigate, showToast],
  );

  return { startChat, isStarting };
}
