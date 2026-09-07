import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import EmptyState from '../components/common/EmptyState';
import Skeleton from '../components/common/Skeleton';
import Spinner from '../components/common/Spinner';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useChatsList } from '../hooks/useChatsList';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { cn, formatTime } from '../lib/utils';

/**
 * `/account/chats/:chatId` и `/company/chats/:chatId` — один и тот же экран диалога,
 * переиспользуемый для обеих ролей (docs/02-ux.md §1). Использует useChat(chatId) — REST-поллинг
 * 3-5 сек (docs/04-architecture.md §2.4).
 */
export default function ChatDialogPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const { messages, isLoading, isLoadingOlder, hasMoreOlder, sendError, sendMessage, loadOlder } = useChat(chatId, user?.id);
  const { items: chats } = useChatsList();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/company') ? '/company/chats' : '/account/chats';

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find((chat) => chat.id === chatId);
  useDocumentMeta({ title: currentChat ? `Чат с ${currentChat.peerName} — CleanLink` : 'Диалог — CleanLink' });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const handleScroll = () => {
    const el = listRef.current;
    if (el && el.scrollTop < 40 && hasMoreOlder && !isLoadingOlder) {
      void loadOlder();
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || isSending) return;
    setIsSending(true);
    const ok = await sendMessage(text);
    setIsSending(false);
    if (ok) setDraft('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSend();
    }
  };

  if (!chatId) {
    return <EmptyState title="Выберите чат слева, чтобы начать переписку" />;
  }

  return (
    <div className="flex h-[calc(100vh-57px-64px)] flex-col md:h-[calc(100vh-57px)]">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(basePath)}
          aria-label="Назад"
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-text-primary hover:bg-surface-hover md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {currentChat ? (
          <>
            <Avatar src={currentChat.peerAvatarUrl} name={currentChat.peerName} size={32} />
            <p className="font-semibold text-text-primary">{currentChat.peerName}</p>
          </>
        ) : (
          <p className="font-semibold text-text-primary">Диалог</p>
        )}
      </div>

      {!isOnline ? (
        <div className="bg-warning-bg px-4 py-2 text-center text-xs text-warning">
          Нет соединения. Сообщения будут отправлены при восстановлении связи
        </div>
      ) : null}

      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
        {isLoadingOlder ? (
          <div className="flex justify-center pb-2">
            <Spinner size={16} />
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-3/5" />
            <Skeleton className="ml-auto h-10 w-2/5" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState title="Нет сообщений — начните диалог" />
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message) => {
              const isMine = message.senderId === user?.id;
              return (
                <div
                  key={message.id}
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                    isMine ? 'ml-auto bg-accent-600 text-accent-contrast' : 'bg-surface-hover text-text-primary',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <p className={cn('mt-1 text-[11px]', isMine ? 'text-accent-contrast/70' : 'text-text-secondary')}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        {sendError ? <p className="mb-2 text-xs text-error">{sendError}</p> : null}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение…"
            rows={1}
            aria-label="Напишите сообщение…"
            className="focus-ring max-h-32 flex-1 resize-none rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            className="focus-ring interactive-scale flex h-11 shrink-0 items-center justify-center rounded-md bg-accent-600 px-4 text-sm font-semibold text-accent-contrast disabled:opacity-50"
          >
            {isSending ? <Spinner size={16} /> : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}
