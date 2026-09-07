-- CleanLink — доп. миграция: журнал просмотров карточки компании.
-- Применение: wrangler d1 execute cleanlink-db --local --file=./migrations/0002_company_views.sql
--             wrangler d1 execute cleanlink-db --remote --file=./migrations/0002_company_views.sql
--
-- Зачем: docs/01-spec.md F10 требует статистику просмотров ЗА ВЫБРАННЫЙ ПЕРИОД (7/30/90 дней)
-- и график `series: [{ date, views, orders }]` по дням/неделям. Единственное поле
-- `companies.views_count` (см. migrations/0001_init.sql) — это счётчик за всё время без меток
-- времени, из него невозможно построить реальный график/период без дополнительных данных.
-- Эта таблица хранит по одной строке на каждый просмотр (F13, `POST /api/companies/:id/view`),
-- используется ТОЛЬКО бэкендом для агрегации в `GET /api/company/stats` — контракт API
-- (docs/04-architecture.md §4.9) не меняется, поле `companies.views_count` по-прежнему
-- инкрементируется как раньше и остаётся источником общего счётчика на карточке компании.
-- Это единственное отклонение backend-инженера сверх 9 таблиц из docs/01-spec.md — сделано
-- осознанно, чтобы статистика была честной агрегацией по БД, а не приближением/моком.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS company_views (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  viewed_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_company_views_company_id ON company_views (company_id);
CREATE INDEX IF NOT EXISTS idx_company_views_company_viewed ON company_views (company_id, viewed_at);
