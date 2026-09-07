/**
 * Модуль chats/messages — чат клиент-компания (F6). Реализация — REST-поллинг 3-5 сек
 * (решение зафиксировано в docs/04-architecture.md §2.4). Контракт: §4.10.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { notImplemented } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';

export const chatsRouter = new Hono<{ Bindings: Env }>();

const createChatSchema = z.object({ companyId: z.string().uuid() });

const messagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

const sendMessageSchema = z.object({
  text: z.string().min(1, 'Заполните это поле').max(4000),
});

/** Список чатов текущего пользователя (клиент или компания), сортировка по last_message_at. */
chatsRouter.get('/', requireAuth(), async (c) => {
  const query = paginationQuerySchema.parse(c.req.query());
  return notImplemented(c, `GET /api/chats?page=${query.page}`);
});

/** Создать чат с компанией либо вернуть существующий (UNIQUE(client_id, company_id)). */
chatsRouter.post('/', requireAuth('client'), async (c) => {
  const input = createChatSchema.parse(await c.req.json());
  return notImplemented(c, `POST /api/chats (company=${input.companyId})`);
});

/** История сообщений чата, пагинация по 30 (курсор `before` = created_at последнего известного). */
chatsRouter.get('/:chatId/messages', requireAuth(), async (c) => {
  const { id: chatId } = idParamSchema.parse({ id: c.req.param('chatId') });
  const query = messagesQuerySchema.parse(c.req.query());
  return notImplemented(c, `GET /api/chats/${chatId}/messages?limit=${query.limit}`);
});

/**
 * Поллинг новых сообщений после метки времени (используется фронтендом каждые 3-5 сек вместо
 * WebSocket — см. решение в docs/04-architecture.md §2.4).
 */
chatsRouter.get('/:chatId/poll', requireAuth(), async (c) => {
  const { id: chatId } = idParamSchema.parse({ id: c.req.param('chatId') });
  const query = z.object({ after: z.string().datetime().optional() }).parse(c.req.query());
  return notImplemented(c, `GET /api/chats/${chatId}/poll?after=${query.after ?? ''}`);
});

chatsRouter.post('/:chatId/messages', requireAuth(), rateLimit({ key: 'chat-message' }), async (c) => {
  const { id: chatId } = idParamSchema.parse({ id: c.req.param('chatId') });
  const input = sendMessageSchema.parse(await c.req.json());
  // TODO(backend): проверить, что auth.sub — участник чата; зашифровать text (encryptField)
  // перед записью; обновить chats.last_message_at.
  return notImplemented(c, `POST /api/chats/${chatId}/messages (${input.text.slice(0, 20)}...)`);
});

export default chatsRouter;
