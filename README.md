# CleanLink

Веб-агрегатор клининговых компаний по городам («Aviasales для клининга»). Полное ТЗ —
`docs/01-spec.md`, UX-потоки — `docs/02-ux.md`, архитектура и контракт API —
`docs/04-architecture.md`, отчёт сквозной интеграции — `docs/07-integration.md`.

Монорепозиторий (npm workspaces):
- `backend/` — Hono.js на Cloudflare Workers (D1 + KV + R2 + Queues + Workers AI).
- `frontend/` — React 18 + Vite + TypeScript + Tailwind + Framer Motion.
- `migrations/` — SQL-миграции D1 и сид демо-данных.

## Установка

```bash
npm install
```

Скопируйте примеры переменных окружения и при необходимости отредактируйте:

```bash
cp backend/.dev.vars.example backend/.dev.vars
cp frontend/.env.example frontend/.env.local   # если файл существует в frontend/
```

Полный справочник переменных — корневой `.env.example`.

## Локальная база (D1)

Применить миграции и (опционально) демо-данные к локальной D1 (эмулируется Miniflare,
файл хранится в `backend/.wrangler/state`):

```bash
npm run db:migrate:local --workspace=backend
npm run db:seed:local --workspace=backend   # 2 клиента, 5 компаний, пароль всех — password123
```

Пустая база (без сид-данных) — тоже рабочий сценарий: приложение стартует с пустыми списками
и приглашением зарегистрироваться/добавить город, без ошибок.

## Запуск

Один запуск поднимает backend (`wrangler dev`, порт 8787) и frontend (`vite dev`, порт 5173,
`/api` проксируется на backend) одновременно:

```bash
npm run dev
```

Открыть `http://localhost:5173`. Раздельные команды: `npm run dev:backend`,
`npm run dev:frontend`.

## Проверки перед коммитом/сдачей

```bash
npm run typecheck
npm run build
npm test
```

## Деплой

```bash
npm run build --workspace=backend
npm run deploy --workspace=backend   # wrangler deploy, требует настроенных ресурсов Cloudflare
npm run build --workspace=frontend   # деплой статики — на Cloudflare Pages/аналог по выбору
```

Перед реальным деплоем замените плейсхолдер-идентификаторы (`database_id`, KV/R2 id) в
`backend/wrangler.toml` на реальные, выданные `wrangler d1 create` / `wrangler kv namespace create`
/ `wrangler r2 bucket create`, и задайте секреты через `wrangler secret put <ИМЯ>` (см.
`.env.example`).
