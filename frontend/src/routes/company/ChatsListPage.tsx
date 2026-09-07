import ChatsListView from '../../components/chats/ChatsListView';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';

/** `/company/chats` (только company_verified) — список диалогов с клиентами (F6). */
export default function ChatsListPage() {
  useDocumentMeta({ title: 'Чаты — CleanLink' });
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-text-primary">Чаты</h1>
      <ChatsListView basePath="/company/chats" emptyTitle="Здесь появятся диалоги с клиентами" />
    </div>
  );
}
