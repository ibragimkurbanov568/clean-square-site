/**
 * РЕЗЕРВ на будущий апгрейд чата до Durable Objects + WebSocket.
 *
 * Решение архитектора (docs/04-architecture.md §2.4, допущение 4 ТЗ): в MVP чат реализован
 * через REST-поллинг 3-5 сек (см. backend/src/routes/chats.ts) — это существенно снижает риск
 * сборки/тестирования на этом шаге конвейера при идентичном наблюдаемом UX для пользователя.
 *
 * Класс ниже — валидный, компилируемый и зарегистрированный в wrangler.toml Durable Object,
 * но НЕ подключён ни к одному роуту. Он существует, чтобы:
 *   1) wrangler.toml с биндингом `CHAT_ROOM` был синтаксически и семантически валиден уже сейчас;
 *   2) апгрейд на реальный реалтайм в будущем не требовал менять инфраструктурную конфигурацию —
 *      достаточно реализовать `fetch()` ниже (WebSocket-хаб для пары client_id/company_id) и
 *      добавить `GET /api/chats/:chatId/ws`, который делает `env.CHAT_ROOM.get(id).fetch(request)`.
 */
export class ChatRoom implements DurableObject {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: unknown,
  ) {}

  async fetch(_request: Request): Promise<Response> {
    return new Response(
      JSON.stringify({
        error: {
          code: 'not_implemented',
          message:
            'Durable Object чата зарезервирован на будущее. Активный механизм — REST-поллинг, см. /api/chats.',
        },
      }),
      { status: 501, headers: { 'content-type': 'application/json' } },
    );
  }
}
