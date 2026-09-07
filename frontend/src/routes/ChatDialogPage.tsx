import { useParams } from 'react-router-dom';
import PageStub from '../components/common/PageStub';

/**
 * `/account/chats/:chatId` и `/company/chats/:chatId` — один и тот же экран диалога,
 * переиспользуемый для обеих ролей (см. docs/02-ux.md §1 "диалог чата считается одним экраном").
 * Использует useChat(chatId) — REST-поллинг 3-5 сек (см. docs/04-architecture.md §2.4).
 */
export default function ChatDialogPage() {
  const { chatId } = useParams<{ chatId: string }>();
  return (
    <PageStub
      title="Диалог"
      description={`TODO(frontend): useChat(${chatId ?? ':chatId'}) — GET .../messages, поллинг .../poll, POST .../messages.`}
    />
  );
}
