import { NavLink, useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import Skeleton from '../common/Skeleton';
import { useChatsList } from '../../hooks/useChatsList';
import { cn, formatTime } from '../../lib/utils';

export interface ChatsListViewProps {
  basePath: '/account/chats' | '/company/chats';
  emptyTitle: string;
  emptyAction?: 'find-company';
}

/** Список чатов (F6) — переиспользуется в /account/chats и /company/chats (docs/02-ux.md). */
export function ChatsListView({ basePath, emptyTitle, emptyAction }: ChatsListViewProps) {
  const { items, isLoading, error, reload } = useChatsList();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message="Не удалось загрузить чаты" onRetry={reload} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        action={
          emptyAction === 'find-company' ? (
            <Button variant="primary" onClick={() => navigate('/')}>
              Найти компанию
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
      {items.map((chat) => (
        <li key={chat.id}>
          <NavLink
            to={`${basePath}/${chat.id}`}
            className={({ isActive }) =>
              cn('flex items-center gap-3 px-4 py-3 hover:bg-surface-hover', isActive ? 'bg-surface-hover' : 'bg-surface')
            }
          >
            <Avatar src={chat.peerAvatarUrl} name={chat.peerName} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-text-primary">{chat.peerName}</p>
                {chat.lastMessageAt ? (
                  <span className="shrink-0 text-xs text-text-secondary">{formatTime(chat.lastMessageAt)}</span>
                ) : null}
              </div>
              <p className="truncate text-sm text-text-secondary">{chat.lastMessagePreview ?? 'Нет сообщений'}</p>
            </div>
            {chat.unreadCount > 0 ? (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-label={`${chat.unreadCount} непрочитанных`} />
            ) : null}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export default ChatsListView;
