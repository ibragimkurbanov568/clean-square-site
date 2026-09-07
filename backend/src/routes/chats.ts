/**
 * Модуль chats/messages — чат клиент-компания (F6). Реализация — REST-поллинг 3-5 сек
 * (решение зафиксировано в docs/04-architecture.md §2.4). Контракт: §4.10.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { apiError, paginate } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { paginationQuerySchema, idParamSchema } from '../schemas/common';
import { execute, newId, nowIso, queryAll, queryOne } from '../db/client';
import type { ChatRow, MessageRow } from '../db/schema';
import { mapMessage, toIsoDateTime, type ChatDto } from '../lib/mappers';
import { encryptField, decryptField } from '../lib/crypto';
import { getCompanyBasicById, getCompanyBasicByUserId } from '../lib/queries';

export const chatsRouter = new Hono<{ Bindings: Env }>();

const createChatSchema = z.object({ companyId: z.string().uuid() });

const messagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

const sendMessageSchema = z.object({
  text: z.string().min(1, 'Заполните это поле').max(4000),
});

interface ChatListRow {
  id: string;
  client_id: string;
  company_id: string;
  last_message_at: string | null;
  company_name: string;
  company_avatar_url: string | null;
  client_username: string;
  client_avatar_url: string | null;
  last_message_text: string | null;
  unread_count: number;
}

async function mapChatRow(row: ChatListRow, viewerRole: 'client' | 'company', env: Env): Promise<ChatDto> {
  let preview: string | null = null;
  if (row.last_message_text) {
    try {
      preview = await decryptField(row.last_message_text, env);
    } catch {
      preview = null;
    }
  }
  return {
    id: row.id,
    clientId: row.client_id,
    companyId: row.company_id,
    peerName: viewerRole === 'client' ? row.company_name : row.client_username,
    peerAvatarUrl: viewerRole === 'client' ? row.company_avatar_url : row.client_avatar_url,
    lastMessageAt: toIsoDateTime(row.last_message_at),
    lastMessagePreview: preview,
    unreadCount: row.unread_count,
  };
}

const CHAT_LIST_SELECT = `
  SELECT ch.id, ch.client_id, ch.company_id, ch.last_message_at,
    co.name AS company_name, companyUser.avatar_url AS company_avatar_url,
    clientUser.username AS client_username, clientUser.avatar_url AS client_avatar_url,
    (SELECT text FROM messages m WHERE m.chat_id = ch.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_text,
    (SELECT COUNT(*) FROM messages m WHERE m.chat_id = ch.id AND m.sender_id != ? AND m.is_read = 0) AS unread_count
  FROM chats ch
  JOIN companies co ON co.id = ch.company_id
  JOIN users companyUser ON companyUser.id = co.user_id
  JOIN users clientUser ON clientUser.id = ch.client_id
`;

/** Список чатов текущего пользователя (клиент или компания), сортировка по last_message_at. */
chatsRouter.get('/', requireAuth(), async (c) => {
  const query = paginationQuerySchema.parse(c.req.query());
  const db = c.env.DB;
  const auth = c.get('auth');
  const offset = (query.page - 1) * query.limit;

  let scopeColumn: 'ch.client_id' | 'ch.company_id';
  let scopeValue: string;
  if (auth.role === 'client') {
    scopeColumn = 'ch.client_id';
    scopeValue = c.get('userId');
  } else {
    const company = await getCompanyBasicByUserId(db, c.get('userId'));
    if (!company) return c.json(paginate([], query.page, query.limit, 0));
    scopeColumn = 'ch.company_id';
    scopeValue = company.id;
  }

  const total = await queryOne<{ count: number }>(
    db,
    `SELECT COUNT(*) AS count FROM chats ch WHERE ${scopeColumn} = ?`,
    [scopeValue],
  );
  const rows = await queryAll<ChatListRow>(
    db,
    `${CHAT_LIST_SELECT} WHERE ${scopeColumn} = ?
     ORDER BY (ch.last_message_at IS NULL) ASC, ch.last_message_at DESC
     LIMIT ? OFFSET ?`,
    [c.get('userId'), scopeValue, query.limit, offset],
  );

  const items = await Promise.all(rows.map((row) => mapChatRow(row, auth.role, c.env)));
  return c.json(paginate(items, query.page, query.limit, total?.count ?? 0));
});

/** Создать чат с компанией либо вернуть существующий (UNIQUE(client_id, company_id)). */
chatsRouter.post('/', requireAuth('client'), async (c) => {
  const input = createChatSchema.parse(await c.req.json());
  const db = c.env.DB;
  const clientId = c.get('userId');

  const company = await getCompanyBasicById(db, input.companyId);
  if (!company) return apiError(c, 404, 'not_found', 'Компания не найдена');

  const existing = await queryOne<{ id: string }>(
    db,
    'SELECT id FROM chats WHERE client_id = ? AND company_id = ?',
    [clientId, input.companyId],
  );

  let chatId: string;
  let status: 200 | 201;
  if (existing) {
    chatId = existing.id;
    status = 200;
  } else {
    chatId = newId();
    status = 201;
    await execute(db, 'INSERT INTO chats (id, client_id, company_id) VALUES (?, ?, ?)', [
      chatId,
      clientId,
      input.companyId,
    ]);
  }

  const row = await queryOne<ChatListRow>(db, `${CHAT_LIST_SELECT} WHERE ch.id = ?`, [
    clientId,
    chatId,
  ]);
  if (!row) return apiError(c, 500, 'internal_error', 'Не удалось создать чат');
  return c.json(await mapChatRow(row, 'client', c.env), status);
});

interface ChatParticipant {
  chat: ChatRow;
  isParticipant: boolean;
}

async function loadChatParticipant(
  db: D1Database,
  chatId: string,
  userId: string,
  role: 'client' | 'company',
): Promise<ChatParticipant | null> {
  const chat = await queryOne<ChatRow>(db, 'SELECT * FROM chats WHERE id = ?', [chatId]);
  if (!chat) return null;
  if (role === 'client') {
    return { chat, isParticipant: chat.client_id === userId };
  }
  const company = await getCompanyBasicByUserId(db, userId);
  return { chat, isParticipant: company !== null && company.id === chat.company_id };
}

async function decryptMessages(rows: MessageRow[], env: Env) {
  return Promise.all(
    rows.map(async (row) => {
      try {
        return mapMessage(row, await decryptField(row.text, env));
      } catch {
        return mapMessage(row, '');
      }
    }),
  );
}

/** История сообщений чата, пагинация по 30 (курсор `before` = created_at последнего известного). */
chatsRouter.get('/:chatId/messages', requireAuth(), async (c) => {
  const { id: chatId } = idParamSchema.parse({ id: c.req.param('chatId') });
  const query = messagesQuerySchema.parse(c.req.query());
  const db = c.env.DB;
  const auth = c.get('auth');
  const userId = c.get('userId');

  const participant = await loadChatParticipant(db, chatId, userId, auth.role);
  if (!participant) return apiError(c, 404, 'not_found', 'Чат не найден');
  if (!participant.isParticipant) return apiError(c, 403, 'forbidden', 'Вы не участник этого чата');

  const rows = query.before
    ? await queryAll<MessageRow>(
        db,
        'SELECT * FROM messages WHERE chat_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?',
        [chatId, query.before, query.limit],
      )
    : await queryAll<MessageRow>(
        db,
        'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT ?',
        [chatId, query.limit],
      );
  rows.reverse(); // хронологический порядок (старые сверху) для рендера истории

  await execute(
    db,
    'UPDATE messages SET is_read = 1 WHERE chat_id = ? AND sender_id != ? AND is_read = 0',
    [chatId, userId],
  );

  return c.json({ items: await decryptMessages(rows, c.env) });
});

/**
 * Поллинг новых сообщений после метки времени (используется фронтендом каждые 3-5 сек вместо
 * WebSocket — см. решение в docs/04-architecture.md §2.4).
 */
chatsRouter.get('/:chatId/poll', requireAuth(), async (c) => {
  const { id: chatId } = idParamSchema.parse({ id: c.req.param('chatId') });
  const query = z.object({ after: z.string().datetime().optional() }).parse(c.req.query());
  const db = c.env.DB;
  const auth = c.get('auth');
  const userId = c.get('userId');

  const participant = await loadChatParticipant(db, chatId, userId, auth.role);
  if (!participant) return apiError(c, 404, 'not_found', 'Чат не найден');
  if (!participant.isParticipant) return apiError(c, 403, 'forbidden', 'Вы не участник этого чата');

  const rows = query.after
    ? await queryAll<MessageRow>(
        db,
        'SELECT * FROM messages WHERE chat_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 100',
        [chatId, query.after],
      )
    : await queryAll<MessageRow>(
        db,
        'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT 100',
        [chatId],
      );

  if (rows.length > 0) {
    await execute(
      db,
      'UPDATE messages SET is_read = 1 WHERE chat_id = ? AND sender_id != ? AND is_read = 0',
      [chatId, userId],
    );
  }

  return c.json({ items: await decryptMessages(rows, c.env) });
});

chatsRouter.post(
  '/:chatId/messages',
  requireAuth(),
  rateLimit({ key: 'chat-message' }),
  async (c) => {
    const { id: chatId } = idParamSchema.parse({ id: c.req.param('chatId') });
    const input = sendMessageSchema.parse(await c.req.json());
    const db = c.env.DB;
    const auth = c.get('auth');
    const userId = c.get('userId');

    const participant = await loadChatParticipant(db, chatId, userId, auth.role);
    if (!participant) return apiError(c, 404, 'not_found', 'Чат не найден');
    if (!participant.isParticipant) {
      return apiError(c, 403, 'forbidden', 'Вы не участник этого чата');
    }

    const messageId = newId();
    const createdAt = nowIso();
    const encryptedText = await encryptField(input.text, c.env);
    await execute(
      db,
      'INSERT INTO messages (id, chat_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)',
      [messageId, chatId, userId, encryptedText, createdAt],
    );
    await execute(db, 'UPDATE chats SET last_message_at = ? WHERE id = ?', [createdAt, chatId]);

    const created = await queryOne<MessageRow>(db, 'SELECT * FROM messages WHERE id = ?', [
      messageId,
    ]);
    if (!created) return apiError(c, 500, 'internal_error', 'Не удалось отправить сообщение');
    return c.json(mapMessage(created, input.text), 201);
  },
);

export default chatsRouter;
