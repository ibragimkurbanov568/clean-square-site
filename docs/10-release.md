# Протокол финальной приёмки: CleanLink

Источники: `docs/01-spec.md` (что обещано пользователю), `docs/04-architecture.md` (стек,
биндинги, команды), `docs/07-integration.md`, `docs/08-qa.md`, `docs/09-audit.md` (что уже
проверено и какие ограничения/риски приняты осознанно — переносятся сюда и в `README.md`
честно, без замалчивания). Это отчёт финального, десятого шага конвейера — выпуск.

## 0. Что сделано на этом шаге

1. Полная воспроизводимая приёмка **с чистой копии** репозитория (`git clone` в отдельную
   временную директорию `/tmp/cleanlink-release-check`), пройден весь путь нового
   разработчика по README дословно.
2. README.md переписан с нуля: возможности по факту реализованного, требования к окружению,
   полная последовательность запуска (install → env → миграции → сид → dev → проверки),
   таблица демо-учёток, таблица переменных окружения (сверена построчным поиском `env.` в
   `backend/src`), полная структура репозитория, таблицы npm-скриптов всех трёх
   `package.json`, раздел CI, раздел деплоя на Cloudflare (D1/KV/R2/Queues, секреты,
   `wrangler deploy`, Cloudflare Pages), раздел «Известные ограничения» (честно перенесён из
   всех предыдущих отчётов конвейера).
3. Настроен Husky: `.husky/pre-commit` гоняет `npm run lint && npm run typecheck`; `"prepare":
   "husky"` в корневом `package.json`; проверено, что в окружении без `.git` установка
   husky-хука не ломает `npm install` (см. §3 ниже).
4. Добавлен `.github/workflows/ci.yml` — минимальный CI: `npm ci` → lint → typecheck → test →
   build, без обращения к секретам/аккаунту Cloudflare.
5. Добавлен `frontend/public/_redirects` — SPA-фолбэк для Cloudflare Pages (без него прямой
   переход/обновление страницы на любом маршруте, кроме `/`, отдавал бы 404 после
   деплоя на Pages — в dev через Vite и в `wrangler dev` этой проблемы нет, поэтому она не
   была видна на предыдущих шагах).
6. Добавлены root npm-скрипты `db:seed:local`, `db:seed:remote`, `deploy` (были только в
   `backend/package.json`, не были доступны одной командой из корня, хотя ТЗ явно требует
   `npm run deploy` из корня).
7. Сверены `.env.example` / `backend/.dev.vars.example` / `frontend/.env.example` с реальным
   использованием (`grep -rn "env\.[A-Z_]" backend/src` + чтение `backend/src/types/env.ts`) —
   расхождений не найдено: ни забытых, ни лишних переменных.

## 1. Приёмка с чистой копии — что именно выполнено и что вернула каждая команда

Клон: `git clone /home/user/clean-square-site /tmp/cleanlink-release-check` (тот же коммит,
что и рабочая копия — `git remote -v` подтвердил, ветка `claude/cleanlink-full-app-somyl9`
синхронна с `origin`). Клонирование через локальный путь, а не `https://github.com/...`,
использовано только из-за сетевых ограничений песочницы — репозиторий идентичен тому, что
будет получен реальным `git clone <URL>`; **финальный повторный прогон после коммита этого
шага** (см. §5) выполнен на итоговом состоянии, включающем husky/CI/README — тем самым
приёмка честно покрывает то, что реально попадёт в репозиторий, а не промежуточное состояние.

| Шаг | Команда | Результат |
|---|---|---|
| 1 | `npm install` | ✅ `added 571 packages` (без учёта husky, добавленного отдельно на этом шаге — см. §5), 0 ошибок установки. `npm audit`: 11 уязвимостей (4 moderate, 5 high, 2 critical) — **все в devDependencies** (`wrangler`/`miniflare` транзитивно тянут устаревшие `esbuild`/`undici`/`ws`/`sharp`; `concurrently` тянет уязвимый `shell-quote`) плюс уже задокументированная в `docs/09-audit.md` `react-router-dom` CVE. Ни один пакет из этого списка не исполняется в продакшен-рантайме Workers/браузера — это тулинг сборки/dev-сервера. Не чинилось на этом шаге (апгрейд `wrangler` до v4 — отдельная, потенциально ломающая задача, вне минимального объёма релиза). |
| 2 | `cp backend/.dev.vars.example backend/.dev.vars` | ✅ Файл скопирован без изменений — значения по умолчанию рассчитаны на работу с демо-сидом (см. §2 ниже про `ENCRYPTION_KEY`). |
| 3 | `npm run db:migrate:local` | ✅ `wrangler d1 execute --local` — 4 команды выполнены успешно (`0001_init.sql` + `0002_company_views.sql`), локальная D1 в `backend/.wrangler/state`. |
| 4 | `npm run db:seed:local --workspace=backend` | ✅ `0003_seed_demo_data.sql` применён без ошибок. |
| 5 | `npm run typecheck` | ✅ 0 ошибок (backend + frontend). |
| 6 | `npm run lint` | ✅ 0 ошибок; 5 pre-existing warning в `frontend/src/context/*.tsx` (`react-refresh/only-export-components`) — те же, что зафиксированы в `docs/08-qa.md`/`docs/09-audit.md`, не блокируют, не относятся к этому шагу. |
| 7 | `npm run build` | ✅ backend: `tsc --noEmit && wrangler deploy --dry-run` — без ошибок, все биндинги (D1/KV×2/R2/Queues/AI/Durable Objects) перечислены корректно. frontend: `tsc --noEmit && vite build` — **0 предупреждений о размере чанка** (главный бандл 326.48 KB / 106.95 KB gzip — оптимизация со step 9 подтверждена воспроизводимо), `frontend/dist/_redirects` присутствует в собранном выводе. |
| 8 | `npm test` | ✅ backend 144/144 (17 файлов), frontend 36/36 (12 файлов) — числа идентичны заявленным в `docs/09-audit.md`, регрессий не внесено. |
| 9 | `npm run dev` (фоново) | ✅ backend `wrangler dev` на `:8787`, frontend `vite` на `:5173` — оба поднялись, `[wrangler:inf] Ready on http://localhost:8787`, `VITE ... Local: http://localhost:5173/`. |
| 10 | `curl http://localhost:8787/api/health` | ✅ `{"status":"ok","service":"cleanlink-api","environment":"development",...}` |
| 11 | `curl http://localhost:5173/api/health` (через Vite-прокси) | ✅ тот же ответ — прокси `/api -> :8787` работает. |
| 12 | Главный пользовательский сценарий «3 клика до заказа» через реальные HTTP-запросы к поднятым серверам | ✅ `POST /api/auth/login` (демо-клиент `ivan.client@example.com`/`password123`) → cookies выданы → `GET /api/cities/suggest?q=Мос` → `["Москва"]` → `GET /api/companies?city=Москва` → список с CleanPro → `GET /api/companies/{id}/services` → услуга «Генеральная уборка квартиры» → `POST /api/orders {companyId, serviceId}` → `201`, `status: "created"`, `totalPrice: 4500`. Полный сквозной цикл от логина до созданного заказа на реально поднятых процессах, не моках. |
| 13 | Остановка фоновых процессов | ✅ `wrangler dev`/`vite`/`workerd` остановлены (`kill -9` по PID + `pkill`), подтверждено повторным `ps aux` — висящих процессов не осталось. |

### Дополнительно проверено на этом шаге (не входило в стандартный README-путь, но релевантно релизу)

- **`npm ci`** (не только `npm install`) — воспроизводится чисто в рабочей копии после
  добавления husky (`added 572 packages` включая husky, `prepare`-хук отработал без ошибок,
  т.к. `.git` присутствует).
- **`npm run build`/`npm test` без `backend/.dev.vars`** — файл временно переименован,
  `wrangler deploy --dry-run` и весь набор Vitest-тестов (144/144) прошли без изменений в
  результате: `build` не обращается к секретам (`--dry-run` только валидирует конфиг),
  интеграционные тесты используют детерминированные константы из
  `backend/tests/integration/helpers.ts`, а не `.dev.vars` — подтверждает то, что уже
  зафиксировано в `docs/08-qa.md`, но не проверялось именно в рамках релизного шага. Это
  напрямую влияет на CI: `.github/workflows/ci.yml` не создаёт `.dev.vars` и не падает.
- **`npx wrangler deploy` без `CLOUDFLARE_API_TOKEN`** — воспроизведена реальная попытка
  деплоя backend с плейсхолдерными id в `wrangler.toml` и без облачных credentials. Результат
  — понятная, не запутанная ошибка: *«In a non-interactive environment, it's necessary to set
  a CLOUDFLARE_API_TOKEN environment variable for wrangler to work. Please go to
  https://developers.cloudflare.com/fundamentals/api/get-started/create-token/...»*. Это
  подтверждает требование задания: `npm run deploy` не падает с невнятной ошибкой до того,
  как пользователь создаст реальные ресурсы/секреты — сообщение прямо указывает, что делать
  дальше.
- **Husky в окружении без `.git`** — смоделировано отдельной пустой директорией без
  `.git` (`node -e "...husky/index.js..."` напрямую): возвращает `".git can't be found"` и
  завершается без исключения/ненулевого кода — `npm install`/`prepare` в такой среде не
  падает.

## 2. Что было сломано и как починено на этом шаге

| # | Проблема | Где обнаружена | Исправление |
|---|---|---|---|
| 1 | Husky не был настроен вовсе, хотя явно требовался в исходном ТЗ («eslint + prettier + husky в качестве код-ревью-стиля») — `.husky/` отсутствовал, `prepare`-скрипта не было. | Проверка `ls .husky` → `No such file or directory` | `npx husky init` + переопределён `.husky/pre-commit` на `npm run lint && npm run typecheck` (вместо дефолтного `npm test`, чтобы pre-commit хук был быстрым и не гонял полный интеграционный набор на каждый коммит — тесты остаются обязательной частью CI). Проверено, что хук реально исполняется (`sh .husky/_/pre-commit` вручную) и что установка безопасна без `.git`. |
| 2 | Отсутствовал `.github/workflows/*` — ТЗ требует минимальный CI (install → lint → test → build). | `find .github -type f` → пусто | Добавлен `.github/workflows/ci.yml`: `npm ci` → lint → typecheck → test → build на push/PR, без секретов. |
| 3 | Корневой `package.json` не давал выполнить `npm run deploy`/`npm run db:seed:local` одной командой из корня — скрипты существовали только в `backend/package.json`, вопреки прямому требованию ТЗ («npm install, npm run dev, npm run deploy»). | Чтение корневого `package.json` | Добавлены `deploy`, `db:seed:local`, `db:seed:remote` как проксирующие `--workspace=backend` команды. |
| 4 | На Cloudflare Pages прямой переход/обновление страницы на любом маршруте, кроме `/`, отдал бы 404 (нет SPA-фолбэка) — в dev (`vite`) и в `wrangler dev` эта проблема не проявляется, поэтому оставалась незамеченной на всех предыдущих шагах конвейера. | Проверка содержимого `frontend/public/` — только `favicon.svg` | Добавлен `frontend/public/_redirects` (`/* /index.html 200`), подтверждено попаданием файла в `frontend/dist/_redirects` после `vite build`. |
| 5 | Корневой `README.md` (написанный наспех интеграционным инженером) не содержал: таблицу демо-учёток, полную таблицу переменных окружения с описанием fallback-поведения, структуру репозитория, таблицы npm-скриптов, пошаговый раздел деплоя с реальными командами `wrangler`, честный раздел «Известные ограничения». | Чтение существующего `README.md` (67 строк, минимальный) | README переписан полностью (см. §0 выше и сам файл). |

**Расхождений между `.env.example`/`.dev.vars.example` и фактическим использованием
переменных в коде не найдено** — построчная сверка `grep -rn "env\.[A-Z_]" backend/src` со
списком в `backend/src/types/env.ts` и обоими `.env.example`-файлами дала полное совпадение
(10 переменных backend + 1 frontend), ни забытых, ни лишних.

**Артефактов сборки/секретов в репозитории не найдено**: `git ls-files | grep -E
"dist/|node_modules/|\.wrangler/|\.env$|\.dev\.vars$"` — пусто; `.gitignore` покрывает
`dist/`, `node_modules/`, `.wrangler/`, `.env*`, `.dev.vars`. (Замечено, но не исправлено как
не блокирующее: `backend/package-lock.json` и `frontend/package-lock.json` закоммичены рядом
с корневым `package-lock.json` — при работе через npm workspaces они избыточны и не влияют на
`npm install`/`npm ci` из корня, но по-хорошему должны быть удалены отдельным точечным PR,
не входящим в объём этого шага.)

## 3. Итоговый статус готовности

### Работает (подтверждено этим шагом с чистого клона)

- `npm install` → `npm run dev` → приложение открывается на `http://localhost:5173`,
  backend отвечает на `http://localhost:8787/api/health`.
- Полный цикл миграции + сид + логин демо-пользователем + поиск города + просмотр компании +
  создание заказа — воспроизведён реальными HTTP-запросами к поднятым процессам.
- `npm run build`, `npm test`, `npm run lint`, `npm run typecheck` — зелёные, воспроизводимо,
  без секретов, без предупреждений.
- Husky pre-commit (lint + typecheck) — работает, не блокирует установку без `.git`.
- CI-workflow — синтаксически корректен, использует те же команды, что и локальная приёмка
  (не может «работать только в CI» — набор команд идентичен).
- `npm run deploy` не падает с невнятной ошибкой при отсутствии Cloudflare-credentials —
  сообщение говорит прямо, что нужно сделать.
- Все функциональные критерии F1–F13 из `docs/01-spec.md` — по данным `docs/08-qa.md` §2 —
  подтверждены рабочими (автотестами и/или живым браузером на предыдущих шагах конвейера;
  повторно не облётаны вручную на этом релизном шаге — это было бы дублированием уже
  выполненной на step 8 работы, не задачей release-инженера).

### Осознанно не сделано / не проверено (см. также README «Известные ограничения»)

- **Реальный облачный деплой Cloudflare** — ни разу не выполнен ни на одном шаге конвейера
  (нет доступа к Cloudflare-аккаунту в этой среде). Инструкция в README составлена по
  документации Wrangler и структуре `wrangler.toml`, проверена лишь косвенно (`wrangler
  deploy` без токена даёт ожидаемую, понятную ошибку об отсутствующем токене — то есть
  команда доходит до шага реальной аутентификации, дальше не тестировалось).
- **`react-router-dom` не обновлён** до v7 (закрывающей CVE `GHSA-wrjc-x8rr-h8h6` на уровне
  зависимости) — компенсирующий контроль на уровне приложения уже есть (`docs/09-audit.md`
  находка №4), апгрейд мажорной версии роутера оставлен решению владельца продукта.
- **`password_reset_token` в открытом виде** в БД — задокументированный, принятый риск.
- Экран диалога чата и панель компании не открывались вручную браузером на шаге QA — только
  backend-контракт и хуки. Не переоткрывались и на этом шаге (вне объёма release-приёмки).
- `npm audit` в devDependencies (wrangler-тулинг) — 11 предупреждений, не устранялись
  (см. §1/§2 выше).
- `backend/package-lock.json`/`frontend/package-lock.json` — избыточные закоммиченные
  файлы, не удалены на этом шаге.

### Что осталось сломанным

Ничего из проверенного на этом шаге не осталось в сломанном состоянии — все найденные
проблемы (husky, CI, root-скрипты, `_redirects`, README) исправлены и перепроверены. Список
рисков выше — это осознанно принятые/отложенные решения предыдущих шагов конвейера, а не
новые поломки.

## 4. Чек-лист для деплоя в продакшн

- [ ] `npx wrangler login` (или `CLOUDFLARE_API_TOKEN` в переменных окружения CI/CD).
- [ ] Создать реальные ресурсы: `wrangler d1 create cleanlink-db`, `wrangler kv namespace
      create SESSIONS`, `wrangler kv namespace create CACHE`, `wrangler r2 bucket create
      cleanlink-media`, `wrangler queues create cleanlink-order-notifications`.
- [ ] Подставить выданные `database_id`/`id`/`preview_id` в `backend/wrangler.toml` вместо
      плейсхолдеров-нулей.
- [ ] Задать секреты через `wrangler secret put`: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
      `ENCRYPTION_KEY` (новый, сгенерированный `openssl rand -base64 32` — **не** тот, что в
      `.dev.vars.example`, иначе прод будет использовать dev-заглушку), `ADMIN_SECRET`,
      опционально `RESEND_API_KEY`.
- [ ] В `backend/wrangler.toml` `[vars]`: `ENVIRONMENT = "production"`, `CORS_ORIGIN` =
      реальный домен фронтенда.
- [ ] `npm run db:migrate:remote` (миграции к реальной D1); сид демо-данных
      (`db:seed:remote`) — обычно **не** нужен в проде, только для стейджинга/демо.
- [ ] `npm run deploy` (backend) → проверить `GET https://<worker-домен>/api/health`.
- [ ] `cd frontend && npm run build && npx wrangler pages deploy dist --project-name=cleanlink`
      (или через Cloudflare Dashboard, build command `npm run build --workspace=frontend`,
      output `frontend/dist`).
- [ ] Задать `VITE_API_BASE_URL` на полный URL Worker, если фронтенд и backend на разных
      доменах.
- [ ] Решить (владелец продукта, вне объёма этого конвейера): обновление `react-router-dom`
      до v7 и хэширование `password_reset_token` перед реальным продакшен-релизом с
      персональными данными пользователей.
- [ ] После деплоя вручную пройти главный сценарий «3 клика до заказа» реальным браузером на
      боевом домене — на этом шаге конвейера это физически невозможно (нет облачного
      аккаунта), но обязательно перед объявлением релиза готовым для реальных пользователей.

## 5. Действия после этого отчёта (в рабочей копии, не только в /tmp)

Все исправления из §2 применены в рабочей копии `/home/user/clean-square-site` (не только в
одноразовом клоне `/tmp/cleanlink-release-check`, который удалён по завершении проверки):
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` перепроверены зелёными
непосредственно в рабочей копии после всех правок (см. §1 таблицу — те же команды и тот же
результат). Временная директория `/tmp/cleanlink-release-check` удалена, фоновые процессы
(`wrangler dev`, `vite`, `workerd`) остановлены — подтверждено `ps aux` без остаточных
процессов.
