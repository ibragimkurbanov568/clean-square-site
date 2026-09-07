import ChatsListView from '../../components/chats/ChatsListView';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

/** `/account/chats` — список чатов клиента, сортировка по last_message_at (F6). */
export default function ChatsListPage() {
  useDocumentMeta({ title: 'Чаты — CleanLink' });
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-text-primary">Чаты</h1>
      <ChatsListView basePath="/account/chats" emptyTitle="Нет активных чатов" emptyAction="find-company" />
    </div>
  );
}
