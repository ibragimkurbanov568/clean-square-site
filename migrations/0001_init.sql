-- CleanLink — D1 (SQLite) initial schema
-- Применение: wrangler d1 execute cleanlink-db --local --file=./migrations/0001_init.sql
--             wrangler d1 execute cleanlink-db --remote --file=./migrations/0001_init.sql
--
-- Источник модели данных: docs/01-spec.md, раздел "Модель данных" (9 таблиц).
-- Отклонения/расширения сверх буквального текста ТЗ — см. docs/04-architecture.md,
-- раздел 5 "Схема данных" (денормализация companies.city, поля 2FA/сброса пароля на users,
-- поле wallpaper_url на companies) — каждое отклонение обосновано там же.
--
-- Конвенции:
--   * Все PK — TEXT (UUID v4), генерируются в коде бэкенда (crypto.randomUUID()).
--   * Даты — TEXT в формате ISO-8601 (UTC), пишутся кодом бэкенда как new Date().toISOString().
--   * Булевы значения — INTEGER (0/1), SQLite не имеет отдельного типа BOOLEAN.
--   * Деньги — INTEGER, целые рубли без копеек (см. допущение 15 в docs/01-spec.md).
--   * Шифруемые at rest поля (AES-256-GCM, см. допущение 9): companies.inn_ogrn, messages.text —
--     хранят base64-строку шифротекста, тип столбца остаётся TEXT.

PRAGMA foreign_keys = ON;

-- ============================================================================================
-- users — клиенты и компании в одном пространстве имён username/email (role различает роль)
-- ============================================================================================
CREATE TABLE IF NOT EXISTS users (
  id                     TEXT PRIMARY KEY,
  email                  TEXT NOT NULL UNIQUE,
  password_hash          TEXT NOT NULL,
  role                   TEXT NOT NULL CHECK (role IN ('client', 'company')),
  username               TEXT NOT NULL UNIQUE,
  city                   TEXT NOT NULL,
  avatar_url             TEXT,
  -- Расширения сверх базовой таблицы из 01-spec.md — необходимы для F1/допущений 2 и 3,
  -- добавлены на users, а не в отдельные таблицы, чтобы не увеличивать число таблиц сверх 9.
  totp_secret            TEXT,               -- зашифрован тем же AES-256-GCM ключом, что и inn_ogrn/messages
  totp_enabled           INTEGER NOT NULL DEFAULT 0,
  password_reset_token   TEXT,
  password_reset_expires TEXT,
  wallpaper_url          TEXT,               -- фон кабинета (допущение 12), актуален для обеих ролей
  created_at             TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_city ON users (city);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users (password_reset_token);

-- ============================================================================================
-- companies — профиль компании, 1:1 с users (role='company')
-- ============================================================================================
CREATE TABLE IF NOT EXISTS companies (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  inn_ogrn            TEXT NOT NULL,     -- шифротекст AES-256-GCM (допущение 9)
  phone               TEXT NOT NULL,
  website             TEXT,
  address             TEXT NOT NULL,
  work_hours          TEXT,
  video_url           TEXT,
  cover_url           TEXT,
  -- Денормализация city с users.city ради быстрого списка/фильтра "компании в городе X"
  -- (F2/F3 — самый горячий путь запроса в приложении). Источник истины при регистрации —
  -- users.city; бэкенд обязан писать оба поля синхронно при создании/смене города компании.
  city                TEXT NOT NULL,
  rating_avg          REAL NOT NULL DEFAULT 0,
  orders_count        INTEGER NOT NULL DEFAULT 0,
  response_speed_sec  INTEGER,
  views_count         INTEGER NOT NULL DEFAULT 0,
  is_verified         INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_user_id ON companies (user_id);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies (city);
CREATE INDEX IF NOT EXISTS idx_companies_is_verified ON companies (is_verified);
CREATE INDEX IF NOT EXISTS idx_companies_city_verified ON companies (city, is_verified);

-- ============================================================================================
-- services — прайс-лист компании
-- ============================================================================================
CREATE TABLE IF NOT EXISTS services (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price         INTEGER NOT NULL,
  duration_min  INTEGER,
  description   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_services_company_id ON services (company_id);

-- ============================================================================================
-- orders — заказы клиентов
-- ============================================================================================
CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  company_id    TEXT NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  service_id    TEXT NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
  status        TEXT NOT NULL CHECK (status IN ('created', 'in_progress', 'done', 'cancelled')) DEFAULT 'created',
  total_price   INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  completed_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders (client_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders (company_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_id ON orders (service_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON orders (company_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders (client_id, status);

-- ============================================================================================
-- reviews — один отзыв на заказ
-- ============================================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  client_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  company_id     TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  rating         INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text           TEXT NOT NULL DEFAULT '',
  company_reply  TEXT,
  created_at     TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews (order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_company_id ON reviews (company_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews (client_id);

-- ============================================================================================
-- chats — единственный чат на пару (client_id, company_id)
-- ============================================================================================
CREATE TABLE IF NOT EXISTS chats (
  id                TEXT PRIMARY KEY,
  client_id         TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  company_id        TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  last_message_at   TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_client_company ON chats (client_id, company_id);
CREATE INDEX IF NOT EXISTS idx_chats_client_id ON chats (client_id);
CREATE INDEX IF NOT EXISTS idx_chats_company_id ON chats (company_id);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats (last_message_at);

-- ============================================================================================
-- messages — сообщения чата (текст зашифрован at rest, см. допущение 9)
-- ============================================================================================
CREATE TABLE IF NOT EXISTS messages (
  id           TEXT PRIMARY KEY,
  chat_id      TEXT NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
  sender_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  text         TEXT NOT NULL,   -- шифротекст AES-256-GCM
  created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  is_read      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages (chat_id, created_at);

-- ============================================================================================
-- favorites — избранные компании клиента
-- ============================================================================================
CREATE TABLE IF NOT EXISTS favorites (
  id           TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  company_id   TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_client_company ON favorites (client_id, company_id);
CREATE INDEX IF NOT EXISTS idx_favorites_client_id ON favorites (client_id);

-- ============================================================================================
-- promotions — акции компании
-- ============================================================================================
CREATE TABLE IF NOT EXISTS promotions (
  id                 TEXT PRIMARY KEY,
  company_id         TEXT NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  discount_percent   INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  valid_until        TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX IF NOT EXISTS idx_promotions_company_id ON promotions (company_id);
CREATE INDEX IF NOT EXISTS idx_promotions_valid_until ON promotions (valid_until);
