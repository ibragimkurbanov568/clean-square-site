# Архитектура: CleanLink

Источники: `docs/01-spec.md` (функции F1-F13, модель данных, допущения), `docs/02-ux.md` (карта
экранов, маршруты, тексты), `docs/03-design-system.md` + `docs/tokens/*` (токены дизайн-системы).

Этот документ — контракт между бэкенд-инженером (шаг 5) и фронтенд-инженером (шаг 6). Оба
работают параллельно, не общаясь друг с другом; расхождение со схемами ниже — баг архитектуры,
а не бэкенда/фронтенда.

---

## 1. Стек

| Слой | Выбор | Почему |
|---|---|---|
| Фронтенд | Vite + React 18 + TypeScript (strict) | Прямое требование пользователя. Vite даёт быстрый dev-сервер и предсказуемую сборку без конфигурационного ада. |
| Стили | Tailwind CSS 3 + готовые CSS-токены (`docs/tokens/design-tokens.css`) | Прямое требование пользователя; дизайн-система уже поставляет `tailwind.tokens.js`/`design-tokens.css` — переизобретать палитру не нужно (правило «скучный стек побеждает»). Взята Tailwind **v3** (не v4): дизайн-токены документа рассчитаны на классический `theme.extend`/`tailwind.config`, v3 — наименее рискованный путь получить идентичный результат без миграции на CSS-first конфиг v4. |
| Анимации | Framer Motion | Прямое требование пользователя (hover/active-scale, переходы страниц, scroll-reveal — уже специфицированы в `docs/03-design-system.md` §6). |
| Роутинг | React Router v6 (`react-router-dom`) | Самый скучный и предсказуемый выбор для SPA с 24 экранами и вложенными layout’ами (`/account/*`, `/company/*`). v6, а не v7 — v6 много лет самый документированный вариант, минимизирует риск для параллельного фронтенд-инженера. |
| Обрезка изображений | Cropper.js v1 | Прямое требование пользователя (допущение 13). Взята v1 (не v2-переписанная на web-компоненты) — v1 остаётся наиболее документированным и предсказуемым API (`new Cropper(img, options)`). |
| QR-код 2FA | `qrcode.react` | Небольшая, широко используемая обёртка над `qrcode` для рендера `otpauth://`-URI в SVG на клиенте — бэкенд отдаёт только строку URI, не генерирует изображение (см. §4.1). |
| Бэкенд | Hono.js на Cloudflare Workers, TypeScript (strict) | Прямое требование пользователя. Hono — не «модный», а именно скучный/маленький роутер: строит на нативных Web API (`Request`/`Response`), поставляет `hono/jwt` и `hono/cors` без сторонних зависимостей. |
| Валидация | Zod | Прямое требование ТЗ («все входные данные валидируются схемами Zod»). Используется напрямую в хендлерах (`schema.parse(...)`), без дополнительного связующего пакета `@hono/zod-validator`, чтобы не плодить зависимости. |
| БД | Cloudflare D1 (SQLite) | Прямое требование ТЗ. 9 таблиц из `docs/01-spec.md`, миграция — `migrations/0001_init.sql`. |
| Кэш/сессии | Cloudflare KV (`SESSIONS`, `CACHE`) | Прямое требование ТЗ: сессии/refresh-состояние и rate-limit счётчики (`SESSIONS`), кэш автодополнения городов (`CACHE`). |
| Файлы | Cloudflare R2 (`MEDIA`) | Прямое требование ТЗ: аватары, обложки, видео-ссылки, обои (допущения 12, 13), аудит-лог (допущение 11). |
| Очередь заказов | Cloudflare Queues (`ORDER_QUEUE`) | Прямое требование ТЗ, с синхронным fallback (допущение 14) — см. §2.3. |
| AI | Workers AI (`AI`) с rule-based fallback | Прямое требование ТЗ + допущение 6 — см. §2.5. |
| Реалтайм-чат | REST-поллинг 3-5 сек (не Durable Objects/WebSocket) | Решение архитектора, см. §2.4 — обязательное обоснование ниже. |
| Пароли | PBKDF2-SHA256 через Web Crypto (`crypto.subtle`) | Workers не имеют нативного bcrypt/scrypt; ТЗ явно допускает «bcrypt/scrypt через Web Crypto» — PBKDF2 единственный password-hashing примитив, реально доступный в `crypto.subtle` без сторонней библиотеки. Обоснование и код — `backend/src/lib/crypto.ts`. |
| Шифрование at rest | AES-256-GCM через Web Crypto | Прямое требование ТЗ (ИНН/ОГРН компании, текст сообщений чата). Нативно в `crypto.subtle`, без зависимостей. |
| 2FA | `otplib` (TOTP) | Прямое требование пользователя. `nodejs_compat` в `wrangler.toml` даёт `node:crypto` в Workers, поэтому используется штатный (Node) crypto-плагин `otplib` без дополнительной WebCrypto-обвязки. |
| Тесты | Vitest (frontend + backend) | Прямое требование по умолчанию. E2E (Playwright) не подключены на этом шаге — не входит в MVP-критерии готовности (`01-spec.md`: Vitest покрывает только критические функции); можно добавить позже без изменения контрактов. |
| Монорепо | npm workspaces (`frontend/`, `backend/`) | Прямое требование ТЗ: единая команда `npm install`/`npm run dev` на корне, минимум инструментов (без Turborepo/Nx, не нужны на 2 пакета). |

### 1.1. Обоснование зависимостей (по одной строке на пакет)

**backend** (`hono`, `zod`, `otplib`; dev: `wrangler`, `typescript`, `vitest`, `@cloudflare/workers-types`, `eslint`+`typescript-eslint`, `prettier`):
- `hono` — роутер + `hono/jwt` + `hono/cors`, всё остальное (crypto, rate-limit) — нативный Web Crypto/KV, без доп. пакетов.
- `zod` — обязательная валидация по ТЗ.
- `otplib` — прямое требование пользователя (TOTP 2FA).
- `wrangler` — единственный способ собирать/запускать/деплоить Workers.
- остальное — стандартный tooling (типы, тесты, линт), без которого нельзя проверить «строится без ошибок».

**frontend** (`react`, `react-dom`, `react-router-dom`, `framer-motion`, `cropperjs`, `qrcode.react`; dev: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `jsdom`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`+плагины, `prettier`):
- `react`/`react-dom` — прямое требование (React 18).
- `react-router-dom` — 24 маршрута с вложенными layout’ами, без роутера пришлось бы писать самодельный — больше кода и риска, чем одна библиотека.
- `framer-motion` — прямое требование, использует токены анимации из дизайн-системы.
- `cropperjs` — прямое требование (допущение 13).
- `qrcode.react` — единственный способ показать QR 2FA пользователю без серверной генерации картинки.
- `tailwindcss`+`postcss`+`autoprefixer` — стандартная тройка для Tailwind v3, без неё дизайн-токены не собираются в CSS.
- остальное — tooling для типов/тестов/линта.

**root**: `concurrently` — единственная не-tooling зависимость корня; нужна, чтобы `npm run dev` поднимал Workers dev-сервер и Vite dev-сервер параллельно одной командой (без неё пришлось бы открывать два терминала).

---

## 2. Ключевые архитектурные решения

### 2.1. Формат ошибок API

Единый для всех эндпоинтов (см. `backend/src/lib/http.ts`):

```ts
interface ApiErrorBody {
  error: {
    code: string;        // машиночитаемый код, напр. "validation_error", "rate_limited"
    message: string;     // готовый для показа пользователю текст (см. тексты в docs/02-ux.md)
    fields?: Record<string, string>; // для validation_error — поле -> сообщение
  };
}
```

Коды статусов: `400` (Zod validation_error), `401` (unauthorized — нет/просрочен access-токен),
`403` (forbidden — роль/владелец не совпадает), `404` (not_found), `409` (conflict — занятый
email/username, повторный отзыв, и т.д.), `429` (rate_limited), `500` (internal_error).

### 2.2. Аутентификация (F1)

JWT access (15 мин) + refresh (30 дней, либо 1 день без «Запомнить меня») в HttpOnly cookies
(`cleanlink_access`, `cleanlink_refresh`; имена и TTL — `backend/src/lib/jwt.ts`). Подпись —
`hono/jwt` (HS256, секреты `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`). Refresh-сессии (sid)
хранятся в KV `SESSIONS` — позволяет отозвать сессию (logout/смена пароля) без ожидания
истечения JWT. Пароли — PBKDF2-SHA256 (100 000 итераций), см. `backend/src/lib/crypto.ts`.

2FA (TOTP, допущение 2) — опциональна, включается в `/account/settings` или
`/company/settings`. При включённой 2FA `POST /api/auth/login` возвращает
`{ requiresTwoFactor: true, challengeId }` вместо cookies; фронтенд переходит на `/login/2fa`
(маршрут уже есть в `frontend/src/router.tsx`) и вызывает `POST /api/auth/login/2fa`.

### 2.3. Очередь заказов (допущение 14)

`notifyNewOrder()` (`backend/src/lib/queue.ts`) пытается `env.ORDER_QUEUE.send(message)`; при
недоступности биндинга (или ошибке `.send()`) синхронно вызывает тот же
`handleOrderNotification()`, который иначе исполняется в consumer-хендлере `queue()` в
`backend/src/index.ts`. Результат для пользователя идентичен в обоих режимах — единая функция,
единый аудит-лог (`logAuditEvent`, допущение 11), единая точка интеграции с Resend (допущение 8).

### 2.4. Реалтайм-чат (F6, допущение 4) — РЕШЕНИЕ: REST-поллинг, не Durable Objects/WebSocket

**Выбор:** чат (F6) реализован через REST-эндпоинты с поллингом 3-5 сек на фронтенде
(`GET /api/chats/:chatId/poll?after=...`), а не через Durable Objects + WebSocket.

**Почему:**
1. **Риск сборки/тестирования.** DO + WebSocket требуют устойчивого локального провижининга
   Durable Object namespace, обработки апгрейда протокола внутри Workers и WebSocket
   Hibernation API — это самая нестабильная для первого прохода часть Workers-платформы, а шаг
   архитектора обязан «завестись с первого раза» (правило конвейера). Поллинг — обычный
   `fetch()` каждые несколько секунд, ничего специфичного к рантайму не требует.
2. **Идентичный наблюдаемый результат.** По критерию приёмки F6 сообщения должны появляться у
   обеих сторон «в течение 5 секунд» — поллинг с интервалом 3-5 сек формально попадает в это же
   окно, пользователь не отличит поллинг от WebSocket на глаз (допущение 4 явно разрешает оба
   варианта как эквивалентные).
3. **Меньше площадь для бага у двух параллельных инженеров.** Бэкенд- и фронтенд-инженер работают
   без общения; контракт «GET с курсором + POST» на порядки проще зафиксировать однозначно, чем
   протокол сообщений поверх WebSocket (форматы событий, реконнект, heartbeats).
4. **Путь апгрейда не закрыт.** `backend/src/durable-objects/chat-room.ts` — уже валидный,
   компилируемый класс `ChatRoom`, зарегистрированный в `wrangler.toml` (биндинг `CHAT_ROOM` +
   `migrations`). Если позже понадобится настоящий реалтайм, апгрейд — это реализовать `fetch()`
   в этом файле и добавить один роут `GET /api/chats/:chatId/ws`, без изменений инфраструктуры.

Фронтенд: `useChat(chatId)` (`frontend/src/hooks/useChat.ts`) инкапсулирует интервал поллинга —
экраны чата не знают, что под капотом не WebSocket.

### 2.5. Workers AI с fallback (допущение 6)

`backend/src/lib/ai.ts` экспортирует `moderateReviewText()` и `generateCompanyDescription()`.
Обе функции:
- при `env.AI` доступном и `AI_FORCE_FALLBACK !== 'true'` — реальный вызов
  `env.AI.run('@cf/meta/llama-3.1-8b-instruct', ...)`;
- иначе (биндинг недоступен, вызов упал, либо форс-флаг) — rule-based fallback (стоп-слова для
  модерации, шаблон для описания).

Оба пути — рабочий код, не заглушки; вызывающая сторона (`routes/reviews.ts`,
`routes/companies.ts`) не должна знать, какой из путей сработал.

### 2.6. Верификация компаний (допущение 1)

`POST /api/admin/companies/:id/verify`, защищён заголовком `X-Admin-Secret` (сверяется с
секретом `ADMIN_SECRET`). Ручной флаг `companies.is_verified` — без внешнего KYC-сервиса,
согласно ТЗ.

---

## 3. Структура репозитория

```
clean-square-site/
├── docs/                          — спецификации и этот документ
│   ├── 01-spec.md
│   ├── 02-ux.md
│   ├── 03-design-system.md
│   ├── 04-architecture.md         — этот файл
│   └── tokens/                    — источник истины дизайн-токенов (design-tokens.css, tailwind.tokens.js, colors.json)
├── migrations/
│   └── 0001_init.sql              — все 9 таблиц D1 + индексы + FK
├── backend/                       — Hono.js на Cloudflare Workers
│   ├── wrangler.toml              — все биндинги: D1, KV×2, R2, Queues, AI, Durable Objects (резерв)
│   ├── .dev.vars.example          — локальные секреты для `wrangler dev`
│   ├── package.json
│   ├── tsconfig.json              — strict
│   ├── vitest.config.ts
│   ├── eslint.config.js
│   ├── src/
│   │   ├── index.ts               — точка входа: Hono-роутер + cors + errorHandler + queue()-consumer
│   │   ├── types/env.ts           — тип Env (все биндинги/переменные/секреты)
│   │   ├── routes/                — по одному файлу на модуль (auth, cities, companies, services,
│   │   │                            orders, reviews, favorites, promotions, stats, chats, uploads, admin, health)
│   │   ├── middleware/             — auth (JWT), rateLimit (KV), errorHandler
│   │   ├── db/                     — client.ts (D1-обёртка), schema.ts (TS-зеркало таблиц)
│   │   ├── lib/                    — crypto (PBKDF2+AES-GCM), jwt, totp, ai, queue, r2, http
│   │   ├── schemas/                — Zod-схемы (auth.schema.ts — эталон, common.ts — пагинация)
│   │   └── durable-objects/        — chat-room.ts (резерв на будущий апгрейд чата, см. §2.4)
│   └── tests/                      — Vitest (health.test.ts — смок crypto-примитивов)
├── frontend/                       — Vite + React 18 + TS + Tailwind + Framer Motion
│   ├── vite.config.ts              — плагин React + proxy /api -> localhost:8787 в dev
│   ├── tailwind.config.ts          — theme.extend из src/styles/tailwind-tokens.ts
│   ├── postcss.config.js
│   ├── index.html                  — инлайн-скрипт применения темы до первой отрисовки (F11)
│   ├── package.json
│   ├── tsconfig.json               — strict
│   ├── vitest.config.ts
│   ├── eslint.config.js
│   ├── .env.example
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── main.tsx                — точка входа React
│   │   ├── App.tsx                 — провайдеры (Theme/Auth) + Router + Header + PageTransition
│   │   ├── router.tsx              — все 24 маршрута из docs/02-ux.md §1
│   │   ├── vite-env.d.ts
│   │   ├── routes/                 — по одному компоненту-заглушке на экран (account/, company/)
│   │   ├── components/
│   │   │   ├── layout/              — Header, ThemeSwitcher, PageTransition
│   │   │   └── common/              — PageStub (временный каркас страницы)
│   │   ├── context/                 — ThemeContext (полностью реализован), AuthContext (контракт+TODO)
│   │   ├── hooks/                   — useAuth, useTheme, useChat, useOrders
│   │   ├── lib/                     — apiClient.ts (fetch-обёртка), types.ts (зеркало контракта §4)
│   │   └── styles/                  — tokens.css (копия design-tokens.css), tailwind-tokens.ts, globals.css
│   └── tests/                       — Vitest + jsdom (App.test.tsx — смок монтирования)
├── package.json                     — workspaces [frontend, backend], скрипты dev/build/test/lint
├── .env.example                     — сводный список переменных (комментарии — где реально используются)
└── .gitignore
```

---

## 4. Контракты API

Базовый путь — `/api`. Все запросы/ответы — `application/json`, кроме `POST /api/uploads/*`
(`multipart/form-data`, поле `file`). Cookies (`credentials: 'include'`) обязательны для всех
запросов, требующих авторизации. Пагинация — единый формат:

```ts
interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
```

Общие типы ответов (camelCase) зафиксированы в `frontend/src/lib/types.ts` — бэкенд обязан
отдавать JSON именно в этой форме (маппинг из snake_case колонок D1 — на стороне
`backend/src/routes/*`, а не "как получится").

### 4.1. `auth` — `backend/src/routes/auth.ts`

| Метод | Путь | Роль | Тело запроса | Тело ответа (200/201) | Коды ошибок |
|---|---|---|---|---|---|
| POST | `/api/auth/register/client` | guest | `{ email, password, username, city }` | `CurrentUser` (+ cookies) | 400, 409 (email/username занят) |
| POST | `/api/auth/register/company` | guest | `{ email, password, companyUsername, innOgrn, city, address, phone, website?, workHours? }` | `CurrentUser` с `company` (+ cookies) | 400, 409 |
| POST | `/api/auth/login` | guest | `{ email, password, rememberMe? }` | `{ requiresTwoFactor: false, user: CurrentUser }` (+cookies) \| `{ requiresTwoFactor: true, challengeId }` | 400, 401 (неверный email/пароль), 429 |
| POST | `/api/auth/login/2fa` | guest (с challengeId) | `{ challengeId, code }` | `CurrentUser` (+ cookies) | 400, 401 (неверный код) |
| POST | `/api/auth/refresh` | любой (с refresh cookie) | — | `{ ok: true }` (новый access cookie) | 401 |
| POST | `/api/auth/logout` | любой | — | `{ ok: true }` | — |
| GET | `/api/auth/me` | authenticated | — | `CurrentUser` | 401 |
| POST | `/api/auth/forgot-password` | guest | `{ email }` | `{ ok: true, demoResetUrl?: string }` (demoResetUrl — только без `RESEND_API_KEY`, допущение 3) | 400, 429 |
| POST | `/api/auth/reset-password` | guest | `{ token, password, confirmPassword }` | `{ ok: true }` | 400 (пароли не совпадают/токен невалиден) |
| POST | `/api/auth/2fa/setup` | authenticated | — | `{ secret: string, otpAuthUri: string }` | 401 |
| POST | `/api/auth/2fa/enable` | authenticated | `{ code }` | `{ ok: true }` | 400 (неверный код) |
| POST | `/api/auth/2fa/disable` | authenticated | — | `{ ok: true }` | 401 |

```ts
interface CurrentUser {
  id: string; email: string; role: 'client' | 'company'; username: string; city: string;
  avatarUrl: string | null; totpEnabled: boolean;
  company?: { id: string; name: string; isVerified: boolean }; // только role='company'
}
```

### 4.2. `cities` — `backend/src/routes/cities.ts`

| Метод | Путь | Роль | Query | Тело ответа | Ошибки |
|---|---|---|---|---|---|
| GET | `/api/cities/suggest` | любой | `q: string` (мин. 1 символ) | `{ items: string[] }` (до 5, из KV `CACHE`, источник — `SELECT DISTINCT city FROM users`) | 400 |

### 4.3. `companies` — `backend/src/routes/companies.ts`

| Метод | Путь | Роль | Query/Тело | Тело ответа | Ошибки |
|---|---|---|---|---|---|
| GET | `/api/companies` | любой | `city, sort('rating'\|'price_asc'\|'reviews'), page, limit` | `Paginated<Company>` | 400 |
| GET | `/api/companies/top` | любой | `city` | `{ items: Company[] }` (ровно до 3, формула F3) | 400 |
| GET | `/api/companies/:id` | любой | — | `Company` (для `isVerified=false` — без `services`/`promotions`, см. §4.4/§4.8) | 404 |
| PATCH | `/api/companies/:id` | company (владелец) | частично: `{ name?, description?, city?, address?, phone?, website?, workHours?, videoUrl?, coverUrl? }` | `Company` | 400, 401, 403 |
| POST | `/api/companies/:id/view` | любой | — | `{ ok: true }` (F13, `views_count += 1`) | 404 |

```ts
interface Company {
  id: string; name: string; description: string; city: string; address: string; phone: string;
  website: string | null; workHours: string | null; videoUrl: string | null; coverUrl: string | null;
  avatarUrl: string | null; ratingAvg: number; reviewsCount: number; ordersCount: number;
  viewsCount: number; isVerified: boolean; priceFrom: number | null; createdAt: string;
}
```

### 4.4. `services` — `backend/src/routes/services.ts`

| Метод | Путь | Роль | Тело | Ответ | Ошибки |
|---|---|---|---|---|---|
| GET | `/api/companies/:id/services` | любой | — | `{ items: Service[] }` (пусто, если `isVerified=false`) | 404 |
| POST | `/api/companies/:id/services` | company (владелец, verified) | `{ name, price, durationMin?, description? }` | `Service` | 400, 401, 403 |
| PATCH | `/api/services/:serviceId` | company (владелец) | частично то же | `Service` | 400, 401, 403, 404 |
| DELETE | `/api/services/:serviceId` | company (владелец) | — | `{ ok: true }` | 401, 403, 404 |

```ts
interface Service {
  id: string; companyId: string; name: string; price: number;
  durationMin: number | null; description: string;
}
```

### 4.5. `orders` — `backend/src/routes/orders.ts`

| Метод | Путь | Роль | Тело/Query | Ответ | Ошибки |
|---|---|---|---|---|---|
| POST | `/api/orders` | client | `{ companyId, serviceId }` | `Order` (`status: 'created'`) | 400, 401, 429 |
| GET | `/api/orders` | client \| company | `status?, page, limit` (client → свои заказы; company → заказы своей компании) | `Paginated<Order>` | 401 |
| GET | `/api/orders/:id` | владелец (client/company) | — | `Order` | 401, 403, 404 |
| PATCH | `/api/orders/:id/status` | company (владелец заказа) | `{ status: 'in_progress'\|'done'\|'cancelled' }` | `Order` | 400 (недопустимый переход), 401, 403, 404 |

```ts
type OrderStatus = 'created' | 'in_progress' | 'done' | 'cancelled';
interface Order {
  id: string; clientId: string; companyId: string; companyName: string; serviceId: string;
  serviceName: string; status: OrderStatus; totalPrice: number; createdAt: string;
  completedAt: string | null; hasReview: boolean;
}
```

Допустимые переходы статуса: `created → in_progress`, `created → cancelled`,
`in_progress → done`, `in_progress → cancelled`. Любой другой переход → `400`.

### 4.6. `reviews` — `backend/src/routes/reviews.ts`

| Метод | Путь | Роль | Тело/Query | Ответ | Ошибки |
|---|---|---|---|---|---|
| POST | `/api/orders/:id/review` | client (владелец заказа, `status='done'`) | `{ rating: 1-5, text? }` | `Review` | 400, 401, 403, 409 (уже есть отзыв) |
| GET | `/api/companies/:id/reviews` | любой | `sort('newest'\|'oldest'\|'rating_desc'\|'rating_asc'), page, limit` | `Paginated<Review>` | 404 |
| GET | `/api/account/reviews` | client | `page, limit` | `Paginated<Review>` | 401 |
| POST | `/api/reviews/:id/reply` | company (владелец отзыва) | `{ text }` | `Review` | 400, 401, 403, 404 |

```ts
interface Review {
  id: string; orderId: string; clientId: string; clientUsername: string; companyId: string;
  rating: number; text: string; companyReply: string | null; createdAt: string;
}
```

Перед сохранением `text` вызывается `moderateReviewText()` (§2.5); при `approved: false` —
`400` с `code: 'review_rejected'` и `message` из `reason`.

### 4.7. `favorites` — `backend/src/routes/favorites.ts`

| Метод | Путь | Роль | Тело/Query | Ответ | Ошибки |
|---|---|---|---|---|---|
| GET | `/api/favorites` | client | `page, limit` | `Paginated<Favorite>` | 401 |
| POST | `/api/favorites/:companyId` | client | — | `{ ok: true }` (идемпотентно) | 401, 404 |
| DELETE | `/api/favorites/:companyId` | client | — | `{ ok: true }` | 401, 404 |

```ts
interface Favorite { companyId: string; company: Company; }
```

### 4.8. `promotions` — `backend/src/routes/promotions.ts`

| Метод | Путь | Роль | Тело | Ответ | Ошибки |
|---|---|---|---|---|---|
| GET | `/api/companies/:id/promotions` | любой | — | `{ items: Promotion[] }` (публично — только `validUntil >= сегодня`; для владельца-компании в своей панели — все, включая истёкшие) | 404 |
| POST | `/api/companies/:id/promotions` | company (владелец, verified) | `{ title, discountPercent: 1-100, validUntil: 'YYYY-MM-DD' }` | `Promotion` | 400, 401, 403 |
| PATCH | `/api/promotions/:id` | company (владелец) | частично то же | `Promotion` | 400, 401, 403, 404 |
| DELETE | `/api/promotions/:id` | company (владелец) | — | `{ ok: true }` | 401, 403, 404 |

```ts
interface Promotion {
  id: string; companyId: string; title: string; discountPercent: number;
  validUntil: string; isExpired: boolean;
}
```

### 4.9. `stats` — `backend/src/routes/stats.ts`

| Метод | Путь | Роль | Query | Ответ | Ошибки |
|---|---|---|---|---|---|
| GET | `/api/company/stats` | company (verified) | `period: '7'\|'30'\|'90'` | `CompanyStats` | 401, 403 |

```ts
interface CompanyStats {
  period: 7 | 30 | 90;
  viewsCount: number;
  ordersTotal: number;
  ordersByStatus: Record<OrderStatus, number>;
  averageCheck: number;
  conversionRate: number; // ordersTotal / viewsCount
  series: Array<{ date: string; views: number; orders: number }>; // по дням, для period=90 — по неделям
}
```

### 4.10. `chats` / `messages` — `backend/src/routes/chats.ts`

Реализация — REST-поллинг (см. §2.4), не WebSocket.

| Метод | Путь | Роль | Тело/Query | Ответ | Ошибки |
|---|---|---|---|---|---|
| GET | `/api/chats` | client \| company | `page, limit` | `Paginated<Chat>` (сортировка по `lastMessageAt` убыв.) | 401 |
| POST | `/api/chats` | client | `{ companyId }` | `Chat` (существующий либо новый, `UNIQUE(client_id, company_id)`) | 400, 401, 404 |
| GET | `/api/chats/:chatId/messages` | участник чата | `before?: ISO-datetime, limit=30` | `{ items: Message[] }` (история, для подгрузки скроллом вверх) | 401, 403, 404 |
| GET | `/api/chats/:chatId/poll` | участник чата | `after?: ISO-datetime` | `{ items: Message[] }` (только новые с момента `after`; фронтенд вызывает каждые 3-5 сек) | 401, 403, 404 |
| POST | `/api/chats/:chatId/messages` | участник чата | `{ text }` | `Message` | 400, 401, 403, 404, 429 |

```ts
interface Chat {
  id: string; clientId: string; companyId: string; peerName: string; peerAvatarUrl: string | null;
  lastMessageAt: string | null; lastMessagePreview: string | null; unreadCount: number;
}
interface Message {
  id: string; chatId: string; senderId: string; text: string; createdAt: string; isRead: boolean;
}
```

Текст сообщения шифруется (`encryptField`, AES-256-GCM) перед записью в `messages.text` и
расшифровывается при чтении — прозрачно для фронтенда (API всегда отдаёт открытый текст).

### 4.11. `uploads` — `backend/src/routes/uploads.ts`

| Метод | Путь | Роль | Тело | Ответ | Ошибки |
|---|---|---|---|---|---|
| POST | `/api/uploads/avatar` | authenticated | `multipart/form-data { file }` | `{ url: string }` | 400, 401 |
| POST | `/api/uploads/cover` | company | `multipart/form-data { file }` | `{ url: string }` | 400, 401, 403 |
| GET | `/api/uploads/wallpapers` | любой | — | `{ presets: string[] }` (4-6 статических путей, допущение 12) — **уже реализован** | — |
| POST | `/api/uploads/wallpaper` | authenticated | `multipart/form-data { file }` | `{ url: string }` | 400, 401 |
| GET | `/api/media/:key*` | любой | — | бинарные данные из R2 (`Content-Type` из `httpMetadata`) | 404 |

### 4.12. `admin` — `backend/src/routes/admin.ts`

| Метод | Путь | Роль | Заголовок | Ответ | Ошибки |
|---|---|---|---|---|---|
| POST | `/api/admin/companies/:id/verify` | секрет | `X-Admin-Secret: <ADMIN_SECRET>` | `{ ok: true }` | 403, 404 |

### 4.13. `health`

| Метод | Путь | Ответ |
|---|---|---|
| GET | `/api/health` | `{ status: 'ok', service: 'cleanlink-api', environment: string, timestamp: string }` — **уже реализован, единственный полностью рабочий эндпоинт на этом шаге.** |

---

## 5. Схема данных (D1)

Полная миграция — `migrations/0001_init.sql`. 9 таблиц из `docs/01-spec.md`: `users`,
`companies`, `services`, `orders`, `reviews`, `chats`, `messages`, `favorites`, `promotions`.

### 5.1. Отклонения от буквального текста `01-spec.md` (обоснование)

1. **`companies.city` (денормализация).** В `01-spec.md` город есть только на `users.city`.
   Поиск «компании в городе X» (F2/F3) — самый горячий путь приложения, требующий отдельного
   индекса на `companies`, а не JOIN с `users` на каждый запрос списка/ТОП-3. Источник истины —
   `users.city`; бэкенд обязан писать оба поля синхронно при регистрации компании и при смене
   города в `/company/profile`. Индекс `idx_companies_city` и составной `idx_companies_city_verified`.
2. **Поля 2FA/сброса пароля на `users`** (`totp_secret`, `totp_enabled`, `password_reset_token`,
   `password_reset_expires`) — необходимы для F1 и допущений 2/3, добавлены на существующую
   таблицу `users`, а не в отдельные таблицы, чтобы не увеличивать число таблиц сверх 9.
   `totp_secret` хранится в зашифрованном виде (тем же ключом `ENCRYPTION_KEY`).
3. **`users.wallpaper_url`** — фон кабинета (допущение 12, «Аватар и обложка» в
   `/company/settings`, «Аватар» в `/account/settings`) — тот же принцип, поле на существующей
   таблице вместо новой.
4. **`services.created_at`, `favorites.created_at`** — не указаны в `01-spec.md`, добавлены для
   стабильной сортировки списков (иначе SQLite не гарантирует порядок вставки).

Никакая из таблиц `01-spec.md` не удалена и не переименована; типы и связи (FK, UNIQUE, CHECK)
соответствуют оригиналу буквально, кроме перечисленного выше.

### 5.2. Таблицы и ключевые индексы (сводно, детали — `migrations/0001_init.sql`)

| Таблица | PK | Внешние ключи | Индексы |
|---|---|---|---|
| `users` | `id` | — | `UNIQUE(email)`, `UNIQUE(username)`, `(city)`, `(password_reset_token)` |
| `companies` | `id` | `user_id → users.id` | `UNIQUE(user_id)`, `(city)`, `(is_verified)`, `(city, is_verified)` |
| `services` | `id` | `company_id → companies.id` | `(company_id)` |
| `orders` | `id` | `client_id → users.id`, `company_id → companies.id`, `service_id → services.id` | `(client_id)`, `(company_id)`, `(service_id)`, `(status)`, `(company_id, status)`, `(client_id, status)` |
| `reviews` | `id` | `order_id → orders.id` (UNIQUE), `client_id → users.id`, `company_id → companies.id` | `UNIQUE(order_id)`, `(company_id)`, `(client_id)` |
| `chats` | `id` | `client_id → users.id`, `company_id → companies.id` | `UNIQUE(client_id, company_id)`, `(client_id)`, `(company_id)`, `(last_message_at)` |
| `messages` | `id` | `chat_id → chats.id`, `sender_id → users.id` | `(chat_id)`, `(chat_id, created_at)` |
| `favorites` | `id` | `client_id → users.id`, `company_id → companies.id` | `UNIQUE(client_id, company_id)`, `(client_id)` |
| `promotions` | `id` | `company_id → companies.id` | `(company_id)`, `(valid_until)` |

Все FK — `ON DELETE CASCADE`, кроме `orders.*` (`ON DELETE RESTRICT` — история заказов не должна
исчезать при удалении пользователя/компании в проде; для MVP это ограничение не блокирует
разработку, каскад можно ослабить позже).

---

## 6. Переменные окружения

См. `.env.example` (корень), `backend/.dev.vars.example`, `frontend/.env.example` — три файла с
одинаковыми именами переменных, разложенные по месту использования.

| Переменная | Где используется | Значение по умолчанию (dev) | Назначение |
|---|---|---|---|
| `VITE_API_BASE_URL` | frontend | `/api` | Базовый путь API; в dev проксируется Vite на `:8787` |
| `JWT_ACCESS_SECRET` | backend (секрет) | dev-заглушка в `.dev.vars.example` | Подпись access-токена |
| `JWT_REFRESH_SECRET` | backend (секрет) | dev-заглушка | Подпись refresh-токена |
| `ENCRYPTION_KEY` | backend (секрет) | dev-заглушка (32 байта base64) | AES-256-GCM для `companies.inn_ogrn`, `messages.text`, `users.totp_secret` |
| `RESEND_API_KEY` | backend (секрет) | пусто → demo-fallback | Email (допущения 3, 8) |
| `ADMIN_SECRET` | backend (секрет) | dev-заглушка | Заголовок `X-Admin-Secret` для `/api/admin/*` |
| `AI_FORCE_FALLBACK` | backend (секрет/var) | `false` | Форсирует rule-based fallback вместо Workers AI |
| `RATE_LIMIT_MAX_REQUESTS` | backend (`[vars]`) | `100` | Лимит запросов за окно (допущение 10) |
| `RATE_LIMIT_WINDOW_SECONDS` | backend (`[vars]`) | `60` | Окно rate-limit |
| `CORS_ORIGIN` | backend (`[vars]`) | `http://localhost:5173` | Разрешённый origin для `hono/cors` |
| `ENVIRONMENT` | backend (`[vars]`) | `development` | Флаг окружения, попадает в `/api/health` |

---

## 7. Запуск, сборка, тесты

```bash
# из корня репозитория
npm install                 # ставит зависимости обоих workspaces (frontend/, backend/)
cp .env.example frontend/.env.local        # при необходимости переопределить VITE_API_BASE_URL
cp backend/.dev.vars.example backend/.dev.vars   # локальные секреты backend (см. §6)

npm run dev                 # поднимает backend (wrangler dev, :8787) и frontend (vite, :5173)
                             # параллельно; Vite проксирует /api -> :8787 (frontend/vite.config.ts)

npm run build                # backend: tsc --noEmit + `wrangler deploy --dry-run` (валидация конфига,
                              #   без реального деплоя); frontend: tsc --noEmit + vite build -> frontend/dist
npm run test                  # vitest run в обоих workspaces
npm run lint                   # eslint в обоих workspaces
npm run typecheck               # tsc --noEmit в обоих workspaces

# миграции D1 (после `wrangler d1 create cleanlink-db` и подстановки database_id в wrangler.toml)
npm run db:migrate:local         # применяет migrations/0001_init.sql к локальной D1 (Miniflare)
npm run db:migrate:remote         # применяет к реальной D1 в Cloudflare

# деплой (не на этом шаге — когда контракты реализованы)
cd backend && npx wrangler deploy
```

`npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run typecheck` — все пять
проверены вручную на этом шаге и проходят без ошибок на пустом скелете (см. отчёт шага 4).

---

## 8. Состояние приёмки биндингов `wrangler.toml`

`backend/wrangler.toml` содержит: `[[d1_databases]]` (`DB`), `[[kv_namespaces]]` (`SESSIONS`,
`CACHE`), `[[r2_buckets]]` (`MEDIA`), `[[queues.producers]]`+`[[queues.consumers]]`
(`ORDER_QUEUE`), `[ai]` (`AI`), `[[durable_objects.bindings]]` (`CHAT_ROOM`, резерв — см. §2.4).
`database_id`/KV `id`/`preview_id` — плейсхолдеры (нули), не мешают `wrangler dev` (локальная
эмуляция через Miniflare); для деплоя в реальный Cloudflare-аккаунт нужно создать ресурсы
(`wrangler d1 create`, `wrangler kv namespace create`, `wrangler r2 bucket create`,
`wrangler queues create`) и подставить выданные id — команды перечислены прямо в комментарии
`wrangler.toml`.

---

## 9. Что дальше (шаги 5 и 6)

- **Бэкенд-инженер** (шаг 5) реализует бизнес-логику внутри `backend/src/routes/*.ts` (каждый
  TODO помечен комментарием со ссылкой на соответствующий раздел §4 этого документа), пишет
  Vitest-тесты на критические функции (формула рейтинга F3, переходы статусов заказа, уникальность
  username/отзыва, rate-limit) согласно критериям готовности `01-spec.md`.
- **Фронтенд-инженер** (шаг 6) заменяет `PageStub` в каждом файле `frontend/src/routes/**/*.tsx`
  на реальную вёрстку по `docs/02-ux.md` (тексты, состояния) и `docs/03-design-system.md`
  (компоненты, токены), дописывает логику `useAuth`/`useChat`/`useOrders` (TODO уже расставлены),
  реализует intent-редиректы гостя (`?intent=order|chat|favorite&companyId=&returnTo=`).
- Оба инженера используют **общий контракт §4** этого документа как единственный источник правды
  — при расхождении с фактическим кодом чинится код, а не документ (документ обновляется только
  осознанно, синхронно на обеих сторонах).
