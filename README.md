# CleanLink

Веб-агрегатор клининговых компаний по городам («Aviasales для клининга»): гость ищет
компанию по своему городу, сравнивает рейтинг и цены; клиент оформляет заказ и переписывается
с исполнителем в чате; компания ведёт профиль, принимает заказы, публикует акции и следит за
статистикой. Главный сценарий — «3 клика до заказа»: выбор города → карточка компании из
блока «ТОП-3» → «Заказать» рядом с услугой.

Три темы оформления (тёмная / светлая-градиент / классика), избранное, отзывы с ответом
компании, урезанный вид карточки для неверифицированных компаний, статистика с графиком —
всё это реализовано и покрыто автотестами (см. «Известные ограничения» ниже — что именно и
насколько проверено).

Полная документация конвейера: техзадание — `docs/01-spec.md`, UX-потоки — `docs/02-ux.md`,
дизайн-система — `docs/03-design-system.md`, архитектура и контракт API — `docs/04-architecture.md`,
отчёт интеграции — `docs/07-integration.md`, отчёт QA — `docs/08-qa.md`, аудит безопасности —
`docs/09-audit.md`, протокол финальной приёмки — `docs/10-release.md`.

## Возможности (реализовано и проверено автотестами/вручную)

- Регистрация и логин отдельными формами для клиента и компании, JWT access+refresh в
  HttpOnly cookies, опциональная 2FA (TOTP), восстановление пароля по email (с demo-fallback
  без ключа Resend).
- Поиск компаний по городу с автодополнением и блоком «ТОП-3» по формуле рейтинга.
- Карточка компании с тремя вкладками (Услуги, Отзывы, О нас), урезанный вид для
  неверифицированных компаний.
- Заказ услуги с полным циклом статусов (`created → in_progress → done/cancelled`).
- Чат клиент-компания (REST-поллинг 3-5 сек, шифрование текста at rest AES-256-GCM).
- Отзывы (только к выполненному заказу, один раз, с модерацией текста и ответом компании).
- Избранное, акции/скидки, статистика компании (просмотры, заказы, средний чек, конверсия).
- Три темы оформления с сохранением в localStorage.
- Загрузка аватара/обложки в R2 с обрезкой через Cropper.js.

Полный перечень критериев приёмки по каждой функции (F1–F13) и их фактический статус —
`docs/01-spec.md` (критерии) и `docs/08-qa.md` §2 (вердикт по каждому).

## Стек

| Слой | Технологии |
|---|---|
| Frontend | React 18 + TypeScript (strict) + Vite + Tailwind CSS 3 + Framer Motion + React Router v6 |
| Backend | Hono.js на Cloudflare Workers + TypeScript (strict) + Zod |
| Данные | Cloudflare D1 (SQLite), KV (сессии + кэш), R2 (медиа), Queues (уведомления о заказах), Workers AI (модерация/генерация текста, с rule-based fallback) |
| Тесты | Vitest (backend + frontend), Testing Library |
| Код-стиль | ESLint + Prettier + Husky (pre-commit: lint + typecheck) |

Подробное обоснование каждого выбора — `docs/04-architecture.md` §1.

## Требования к окружению

- **Node.js ≥ 20** (см. `engines` в корневом `package.json`; проверено на Node 22).
- **npm ≥ 10** (workspaces).
- Аккаунт **Cloudflare** — не нужен для локальной разработки (`npm run dev` эмулирует
  D1/KV/R2/Queues локально через Miniflare); нужен только для реального деплоя (раздел
  «Деплой» ниже).
- Git.

## Быстрый старт

```bash
git clone <URL репозитория>
cd clean-square-site
npm install
npm run dev
```

Открыть `http://localhost:5173`. Готово — приложение работает на пустой локальной БД
(без миграций и сида это тоже рабочий сценарий: списки пустые, есть приглашение
зарегистрироваться). Чтобы увидеть демо-данные (компании, заказы, отзывы) и войти под
готовыми учётками — выполните шаги ниже по порядку.

## Полная последовательность локального запуска

### 1. Установка зависимостей

```bash
npm install
```

Ставит зависимости обоих workspace (`frontend/`, `backend/`) одной командой и устанавливает
Husky pre-commit хук (см. «Код-стиль и pre-commit хук» ниже; в окружении без `.git` этот шаг
безопасно ничего не делает и не прерывает установку).

### 2. Переменные окружения

```bash
cp backend/.dev.vars.example backend/.dev.vars
cp frontend/.env.example frontend/.env.local
```

Для локальной разработки значения по умолчанию в `.dev.vars.example` менять не нужно —
демо-данные из сида (шаг 4) зашифрованы (`ENCRYPTION_KEY`) именно под эти значения; если
поменять `ENCRYPTION_KEY` после того, как сид уже применён, расшифровка полей `inn_ogrn`
сломается и потребуется пересоздать локальную БД. Полный справочник переменных, где какая
используется и что будет при значении по умолчанию — раздел «Переменные окружения» ниже.

### 3. Миграции D1 (локально)

```bash
npm run db:migrate:local
```

Применяет `migrations/0001_init.sql` (9 таблиц) и `migrations/0002_company_views.sql` к
локальной D1 (эмулируется Miniflare, файлы состояния — `backend/.wrangler/state`, в `.gitignore`).

### 4. Демо-данные (сид, опционально, но рекомендуется)

```bash
npm run db:seed:local
```

Добавляет 2 клиентов, 5 компаний (4 верифицированные, 1 — нет) в двух городах (Москва,
Санкт-Петербург), с заказами, отзывами, услугами, акциями. **Пароль у всех демо-пользователей
— `password123`.**

| Email | Роль | Город | Верифицирована |
|---|---|---|---|
| `ivan.client@example.com` | клиент | Москва | — |
| `maria.client@example.com` | клиент | Санкт-Петербург | — |
| `cleanpro@example.com` | компания | Москва | да |
| `chistodom@example.com` | компания | Москва | да |
| `blesk@example.com` | компания | Москва | да |
| `newcleaners@example.com` | компания | Москва | **нет** (для проверки урезанного вида) |
| `spbclean@example.com` | компания | Санкт-Петербург | да |

Пустая база без сида — тоже полностью рабочий сценарий (см. «Быстрый старт» выше).

### 5. Запуск

```bash
npm run dev
```

Одна команда параллельно поднимает:
- **backend** — `wrangler dev` на `http://localhost:8787` (эндпоинты `/api/*`, проверка
  живости — `GET http://localhost:8787/api/health`);
- **frontend** — `vite dev` на `http://localhost:5173`, `/api/*` проксируется на backend
  (`frontend/vite.config.ts`).

Открыть `http://localhost:5173` и войти любой демо-учёткой (пароль `password123`), либо
зарегистрироваться заново. Раздельный запуск: `npm run dev:backend`, `npm run dev:frontend`.

### 6. Проверки перед коммитом/сдачей

```bash
npm run typecheck   # tsc --noEmit в обоих workspace
npm run lint         # eslint в обоих workspace
npm test              # vitest run в обоих workspace (backend 144 теста, frontend 36 тестов)
npm run build           # backend: tsc + `wrangler deploy --dry-run` (без реального деплоя);
                         # frontend: tsc + vite build -> frontend/dist
```

Все четыре команды воспроизводимо зелёные с чистого клона — см. `docs/10-release.md`.

## Код-стиль и pre-commit хук

ESLint + Prettier настроены в обоих workspace (`backend/eslint.config.js`,
`frontend/eslint.config.js`; форматирование — `prettier` как devDependency, без отдельного
конфига — используются дефолты). Husky pre-commit хук (`.husky/pre-commit`) перед каждым
коммитом гоняет `npm run lint && npm run typecheck` — коммит с ошибкой линта/типов
блокируется до исправления. Хук ставится автоматически при `npm install` (`"prepare": "husky"`
в корневом `package.json`) и **не ломает установку в окружениях без `.git`** (CI-контейнер без
истории, установка как зависимости и т.п.) — команда `husky` в этом случае молча завершается
без ошибки.

## Переменные окружения

Единая точка документации — корневой `.env.example` (сам файл не читается ни Vite, ни
Wrangler напрямую — значения реально берутся из `frontend/.env.local` и `backend/.dev.vars`,
см. шаг 2 выше). Список сверен построчным поиском по `env.` в `backend/src`.

| Переменная | Где | Обязательна | Значение по умолчанию (dev) | Назначение / что будет, если не задать |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | frontend | нет | `/api` | Базовый путь API; в dev проксируется Vite на `:8787`. Без значения используется тот же дефолт. |
| `JWT_ACCESS_SECRET` | backend (секрет) | да | dev-заглушка в `.dev.vars.example` | Подпись access-токена (15 мин). Без него `wrangler dev` использует dev-заглушку из `.dev.vars.example` — для прод-деплоя обязательно заменить через `wrangler secret put`. |
| `JWT_REFRESH_SECRET` | backend (секрет) | да | dev-заглушка | Подпись refresh-токена (30 дней / 1 день). Аналогично — заменить в проде. |
| `ENCRYPTION_KEY` | backend (секрет) | да | dev-заглушка (32 байта base64) | AES-256-GCM для `companies.inn_ogrn`, `messages.text`, `users.totp_secret`. Ключ должен декодироваться ровно в 32 байта — иначе приложение бросает исключение при первом обращении к шифрованию (небезопасного дефолта-заглушки в коде нет). |
| `RESEND_API_KEY` | backend (секрет) | нет | пусто | Отправка email (восстановление пароля, уведомление о заказе) через Resend API. **Без ключа** — рабочий demo-fallback: ссылка восстановления возвращается прямо в ответе API (`demoResetUrl`) и пишется в аудит-лог (R2), письмо о заказе логируется вместо отправки. |
| `ADMIN_SECRET` | backend (секрет) | да | dev-заглушка | Значение заголовка `X-Admin-Secret` для `POST /api/admin/companies/:id/verify` (ручная верификация компании — единственный способ снять флаг `is_verified=0` без прямого доступа к БД). |
| `AI_FORCE_FALLBACK` | backend (var/секрет) | нет | `false` | `true` форсирует rule-based fallback (стоп-слова для модерации отзывов, шаблон для описания компании) вместо реального вызова Workers AI, даже если биндинг `AI` доступен. Полезно для детерминированных тестов. Без биндинга `AI` в окружении fallback включается автоматически независимо от этого флага. |
| `RATE_LIMIT_MAX_REQUESTS` | backend (`[vars]`) | нет | `100` | Лимит запросов за окно на пользователя/IP (KV-счётчик). |
| `RATE_LIMIT_WINDOW_SECONDS` | backend (`[vars]`) | нет | `60` | Длина окна rate-limit в секундах. |
| `CORS_ORIGIN` | backend (`[vars]`) | нет | `http://localhost:5173` | Единственный разрешённый origin для `hono/cors`. В проде — заменить на реальный домен фронтенда. |
| `ENVIRONMENT` | backend (`[vars]`) | нет | `development` | Флаг окружения, попадает в `GET /api/health`; также включает `secure`-флаг cookies при значении `production`. |

## Структура репозитория

```
clean-square-site/
├── docs/                          — спецификация, архитектура, отчёты интеграции/QA/аудита/релиза
│   ├── 01-spec.md … 09-audit.md
│   ├── 10-release.md              — протокол финальной приёмки (этот шаг)
│   └── tokens/                    — дизайн-токены (design-tokens.css, tailwind.tokens.js, colors.json)
├── migrations/
│   ├── 0001_init.sql              — 9 таблиц D1 + индексы + FK
│   ├── 0002_company_views.sql
│   └── 0003_seed_demo_data.sql    — демо-данные, пароль всех пользователей password123
├── backend/                       — Hono.js на Cloudflare Workers
│   ├── wrangler.toml              — все биндинги: D1, KV×2, R2, Queues, AI, Durable Objects (резерв)
│   ├── .dev.vars.example          — локальные секреты для `wrangler dev`
│   ├── src/
│   │   ├── index.ts               — точка входа: Hono-роутер + cors + errorHandler + queue()-consumer
│   │   ├── types/env.ts           — тип Env (все биндинги/переменные/секреты)
│   │   ├── routes/                — auth, cities, companies, services, orders, reviews, favorites,
│   │   │                            promotions, stats, chats, uploads, admin, health
│   │   ├── middleware/             — auth (JWT), rateLimit (KV), errorHandler
│   │   ├── db/                     — client.ts (D1-обёртка), schema.ts
│   │   ├── lib/                    — crypto (PBKDF2+AES-GCM), jwt, session, totp, ai, queue, r2, http
│   │   ├── schemas/                — Zod-схемы
│   │   └── durable-objects/        — chat-room.ts (резерв на будущий апгрейд чата)
│   └── tests/                      — Vitest (unit + tests/integration/* через getPlatformProxy)
├── frontend/                       — Vite + React 18 + TS + Tailwind + Framer Motion
│   ├── vite.config.ts              — плагин React + proxy /api -> localhost:8787 в dev
│   ├── public/_redirects           — SPA fallback для Cloudflare Pages
│   ├── src/
│   │   ├── main.tsx / App.tsx / router.tsx  — точка входа, провайдеры, все маршруты (React.lazy)
│   │   ├── routes/                 — по компоненту на экран (account/, company/)
│   │   ├── components/             — layout/ (Header, ThemeSwitcher), common/, ui/
│   │   ├── context/                — Theme/Auth/Favorites/Toast
│   │   ├── hooks/                  — useAuth, useTheme, useChat, useOrders, useServices, ...
│   │   └── lib/                    — apiClient.ts, types.ts, authRedirect.ts, utils.ts
│   └── tests/                      — Vitest + Testing Library
├── package.json                     — workspaces [frontend, backend], скрипты dev/build/test/lint/deploy
├── .husky/pre-commit                 — lint + typecheck перед каждым коммитом
├── .github/workflows/ci.yml           — install → lint → typecheck → test → build
├── .env.example                       — сводный справочник переменных (см. таблицу выше)
└── .gitignore
```

## Доступные npm-скрипты

### Корень (`package.json`)

| Скрипт | Что делает |
|---|---|
| `npm run dev` | Backend (`wrangler dev` :8787) + frontend (`vite dev` :5173) параллельно (`concurrently`) |
| `npm run dev:backend` / `npm run dev:frontend` | Только один из двух сервисов |
| `npm run build` | Сборка backend (`tsc` + `wrangler deploy --dry-run`) и frontend (`tsc` + `vite build`) |
| `npm test` | Vitest в обоих workspace |
| `npm run lint` | ESLint в обоих workspace |
| `npm run typecheck` | `tsc --noEmit` в обоих workspace |
| `npm run db:migrate:local` / `db:migrate:remote` | Применить миграции к локальной / реальной облачной D1 |
| `npm run db:seed:local` / `db:seed:remote` | Применить демо-сид к локальной / реальной облачной D1 |
| `npm run deploy` | `wrangler deploy` для backend (требует настроенных Cloudflare-ресурсов и секретов — см. «Деплой») |

### `backend/package.json`

| Скрипт | Что делает |
|---|---|
| `dev` / `preview` | `wrangler dev` — локальный Workers-рантайм на :8787 |
| `build` | `tsc --noEmit && wrangler deploy --dry-run --outdir=dist` — проверяет типы и валидность конфига без реального деплоя |
| `deploy` | `wrangler deploy` — реальный деплой в Cloudflare |
| `test` / `test:watch` | Vitest (единожды / watch-режим) |
| `lint` | `eslint src --ext .ts` |
| `typecheck` | `tsc --noEmit` |
| `db:migrate:local` / `db:migrate:remote` | Применить `migrations/0001_init.sql` + `0002_company_views.sql` к локальной / реальной D1 |
| `db:seed:local` / `db:seed:remote` | Применить `migrations/0003_seed_demo_data.sql` к локальной / реальной D1 |

### `frontend/package.json`

| Скрипт | Что делает |
|---|---|
| `dev` | `vite` — dev-сервер на :5173 |
| `build` | `tsc --noEmit && vite build` → `frontend/dist` |
| `preview` | `vite preview` — локальный просмотр уже собранного `dist/` |
| `test` / `test:watch` | Vitest (единожды / watch-режим) |
| `lint` | `eslint src --ext .ts,.tsx` |
| `typecheck` | `tsc --noEmit` |

## Непрерывная интеграция

`.github/workflows/ci.yml` — при каждом push в `main` и в каждом pull request: `npm ci` →
`npm run lint` → `npm run typecheck` → `npm test` → `npm run build`, плюс собранный
`frontend/dist` сохраняется как артефакт. Ни один из шагов не требует секретов/аккаунта
Cloudflare (build использует `wrangler deploy --dry-run`, тесты не читают `.dev.vars` —
см. `docs/10-release.md`).

## Деплой

Приложение — full-serverless на Cloudflare: backend как Worker, frontend как статика на
Cloudflare Pages. Локальный `npm run dev`/`npm run build` не требует аккаунта Cloudflare;
шаги ниже нужны только для реального облачного деплоя.

### 1. Создать ресурсы Cloudflare (один раз)

```bash
cd backend
npx wrangler login                                    # авторизация в аккаунте Cloudflare
npx wrangler d1 create cleanlink-db
npx wrangler kv namespace create SESSIONS
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create cleanlink-media
npx wrangler queues create cleanlink-order-notifications
```

Каждая команда выводит идентификатор (`database_id` / `id` / `preview_id`) — подставить их в
`backend/wrangler.toml` вместо плейсхолдеров-нулей (место отмечено комментариями в файле).
Workers AI (`[ai]`) и Durable Objects (`CHAT_ROOM`, резерв) не требуют отдельного создания —
включаются автоматически при первом деплое воркера с этими биндингами.

### 2. Задать секреты

```bash
cd backend
npx wrangler secret put JWT_ACCESS_SECRET
npx wrangler secret put JWT_REFRESH_SECRET
npx wrangler secret put ENCRYPTION_KEY        # ровно 32 байта в base64: openssl rand -base64 32
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put RESEND_API_KEY        # опционально — без него работает demo-fallback
```

`RATE_LIMIT_*`, `CORS_ORIGIN`, `ENVIRONMENT` — не секреты, задаются в `[vars]`
`backend/wrangler.toml` (заменить `CORS_ORIGIN` на реальный домен Pages-деплоя,
`ENVIRONMENT = "production"`).

### 3. Применить миграции к реальной D1

```bash
npm run db:migrate:remote
npm run db:seed:remote   # опционально — демо-данные в проде обычно не нужны
```

### 4. Деплой backend (Worker)

```bash
npm run deploy   # из корня — эквивалент `wrangler deploy` в backend/
```

Проверка живости после деплоя: `GET https://<worker-домен>/api/health` →
`{"status":"ok","service":"cleanlink-api",...}`.

### 5. Деплой frontend (Cloudflare Pages)

```bash
cd frontend
npm run build                                # -> frontend/dist
npx wrangler pages deploy dist --project-name=cleanlink
```

Либо через Cloudflare Dashboard: подключить репозиторий, build command `npm run build
--workspace=frontend`, output directory `frontend/dist`, переменная окружения
`VITE_API_BASE_URL` = полный URL задеплоенного Worker (например `https://cleanlink-api.<аккаунт>.workers.dev/api`),
если фронтенд и API на разных доменах. `frontend/public/_redirects` (SPA fallback для
клиентского роутинга) копируется в `dist/` автоматически при сборке.

**Важно:** реальный облачный деплой на Cloudflare (не локальная эмуляция Miniflare) не
проверялся в рамках этого конвейера — ни один из агентов не имел доступа к настоящему
Cloudflare-аккаунту. Шаги выше основаны на официальной документации Wrangler и структуре
`wrangler.toml`, но не подтверждены живым прогоном. Подробнее — `docs/10-release.md` и раздел
ниже.

## Известные ограничения и осознанно упрощённое

Перенесено честно из `docs/01-spec.md` (допущения/вне объёма), `docs/07-integration.md`,
`docs/08-qa.md` §5 и `docs/09-audit.md` — без утаивания.

**Архитектурные упрощения (все — рабочий код, не заглушки; описаны с fallback-режимом):**
- **Реалтайм-чат** — REST-поллинг 3-5 сек, а не WebSocket/Durable Objects (наблюдаемый
  результат для пользователя одинаковый; код для апгрейда на DO уже есть в
  `backend/src/durable-objects/chat-room.ts`, не подключён к роутингу).
- **Workers AI** (модерация отзывов, генерация описаний) — при недоступности биндинга `AI`
  или ошибке вызова автоматически переключается на rule-based fallback (стоп-слова/шаблон).
  **Реальный вызов модели Workers AI ни разу не был вживую пронаблюдан ни на одном шаге
  конвейера** — везде срабатывал fallback (либо биндинг недоступен в песочнице сборки, либо
  вызов завершался ошибкой) — это ожидаемое поведение по допущению 6 ТЗ, но не подтверждает,
  что реальный вызов модели работает в задеплоенном окружении.
- **Cloudflare Queues** — если недоступны, уведомление о заказе выполняется синхронно в
  рамках запроса создания заказа (тот же результат для пользователя).
- **Верификация компаний** — ручной флаг `is_verified` через `POST
  /api/admin/companies/:id/verify` с секретом, без внешнего KYC/ФНС-интеграции.
- **2FA и восстановление пароля** — рабочие опциональные функции, не обязательны для
  основного сценария регистрации/входа.

**Осознанно принятые риски безопасности (`docs/09-audit.md`, решение — за владельцем продукта
перед реальным продакшен-релизом):**
- **`react-router-dom` 6.30.6 содержит известную умеренную CVE** (open-redirect через `\` в
  пути, `GHSA-wrjc-x8rr-h8h6`, подтверждено `npm audit`). Конкретный вектор в приложении
  (`returnTo` на `/login`) закрыт валидацией на уровне кода (`isSafeInternalPath` в
  `frontend/src/lib/authRedirect.ts`), но сама библиотека не обновлена до v7 — это
  мажорное ломающее обновление роутинга всех 24 маршрутов, осознанно вынесенное за рамки
  точечного аудита.
- **`password_reset_token` хранится в таблице `users` открытым текстом**, а не хэшем (в
  отличие от `password_hash`). Токен одноразовый, живёт 1 час, 122 бита энтропии;
  эксплуатация требует уже имеющегося доступа на чтение БД (при котором атакующий и так видит
  `password_hash`/зашифрованные поля). Стандартная практика — хэшировать токен перед
  сохранением — не реализована, зафиксирована как принятый риск для рассмотрения при переходе
  к проду.
- `npm audit` в devDependencies (`wrangler`/`miniflare`, транзитивно `esbuild`/`undici`/`ws`/
  `sharp`, плюс `shell-quote` через `concurrently`) показывает дополнительные предупреждения —
  это инструменты сборки/dev-сервера, не код, исполняющийся в проде; не устранялись в рамках
  этого шага, т.к. апгрейд `wrangler` до мажорной версии 4 не проверялся конвейером.

**Что не проверено вживую (честно, не выдаётся за протестированное):**
- **Реальный облачный деплой на Cloudflare** (D1/KV/R2/Queues/Workers AI не в локальной
  эмуляции Miniflare, а в настоящем аккаунте) — не проверялся ни на одном шаге конвейера,
  включая этот.
- Экран диалога чата (`ChatDialogPage.tsx`) и панель компании (`/company/*`) не открывались
  вручную в браузере на шаге QA — backend-контракт и переиспользуемая логика (`useChat`)
  проверены глубоко, вёрстка конкретно этих экранов — нет.
- Полный обход клавиатурой всех модалок/вкладок/чата (`Esc`, `Cmd/Ctrl+Enter` в чате) — не
  проверялся.
- Численный контраст WCAG AA (4.5:1) во всех трёх темах — проверен визуально на скриншотах,
  не измерялся инструментально (axe-core не подключался).
- Push-уведомления/Service Worker — реализованы, но не входили в проверенный на шагах QA/аудита
  путь (вне критического пути F1–F13 по ТЗ).
- Взаимодействие с Cropper.js (drag/resize обрезки аватара) на фронтенде — backend-контракт
  загрузки готовых файлов проверен, само canvas-взаимодействие — нет.

**Осознанно вне объёма MVP** (полный список — `docs/01-spec.md` «Осознанно вне объёма»):
полноценная KYC-проверка ИНН/ОГРН через ФНС, Web Push с VAPID, многоязычность, назначение
конкретного сотрудника на заказ, онлайн-оплата (эквайринг), AI-модерация фото/видео,
продвинутая аналитика (когорты/воронки/экспорт), полноценный SSR.

Итоговый статус приёмки, что именно проверено с чистого клона и что осталось нерешённым —
`docs/10-release.md`.
