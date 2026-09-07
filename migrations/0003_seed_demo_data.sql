-- CleanLink — демонстрационные данные, чтобы приложение не выглядело пустым при первом запуске.
-- Применение: wrangler d1 execute cleanlink-db --local --file=./migrations/0003_seed_demo_data.sql
--             wrangler d1 execute cleanlink-db --remote --file=./migrations/0003_seed_demo_data.sql
-- (или через npm-скрипт `db:seed:local` / `db:seed:remote` из backend/package.json)
--
-- Пароль у всех демо-пользователей ниже: password123
-- password_hash — реальный PBKDF2-SHA256 хэш (100000 итераций), совместимый с
-- backend/src/lib/crypto.ts, сгенерирован тем же алгоритмом.
-- Зашифрованные поля (companies.inn_ogrn, messages.text) — реальный AES-256-GCM шифротекст,
-- расшифровывается ключом ENCRYPTION_KEY из backend/.dev.vars.example
-- (Q2xlYW5MaW5rRGV2S2V5IUNsZWFuTGlua0RldktleSE=). Если в проде используется другой
-- ENCRYPTION_KEY, эти зашифрованные демо-поля перед показом нужно будет пересоздать.
--
-- Состав данных: 2 клиента, 5 компаний в 2 городах (4 верифицированные + 1 на модерации —
-- проверить урезанную карточку), услуги, 4 заказа во всех статусах, 2 отзыва (один с ответом
-- компании), 2 акции (одна активна, одна истекла — проверить скрытие), избранное, чат с
-- 3 сообщениями (включая непрочитанное), журнал просмотров для статистики (F10).

PRAGMA foreign_keys = ON;

-- ============================================================================================
-- users
-- ============================================================================================
INSERT INTO users (id, email, password_hash, role, username, city, avatar_url, totp_enabled, created_at) VALUES
('9113654f-73bf-456d-9b01-0ccc490c4cca', 'ivan.client@example.com', 'pbkdf2$100000$r6k66MjCdMvzN+fPX5ujVQ==$2mLKFq20egIc1Fd1HlnOGDMxjF/jKRp7atD14AzV52s=', 'client', 'ivan_client', 'Москва', NULL, 0, datetime('now', '-40 days')),
('5375607a-7b5e-4453-b586-c4fad0b31a2b', 'maria.client@example.com', 'pbkdf2$100000$r6k66MjCdMvzN+fPX5ujVQ==$2mLKFq20egIc1Fd1HlnOGDMxjF/jKRp7atD14AzV52s=', 'client', 'maria_client', 'Санкт-Петербург', NULL, 0, datetime('now', '-35 days')),
('74bd2288-15e3-4571-93e6-9145cddb7175', 'cleanpro@example.com', 'pbkdf2$100000$r6k66MjCdMvzN+fPX5ujVQ==$2mLKFq20egIc1Fd1HlnOGDMxjF/jKRp7atD14AzV52s=', 'company', 'cleanpro', 'Москва', NULL, 0, datetime('now', '-90 days')),
('bee5d274-96ac-4bb0-9247-e6358c2183a9', 'chistodom@example.com', 'pbkdf2$100000$r6k66MjCdMvzN+fPX5ujVQ==$2mLKFq20egIc1Fd1HlnOGDMxjF/jKRp7atD14AzV52s=', 'company', 'chistodom', 'Москва', NULL, 0, datetime('now', '-80 days')),
('f1f8a31b-ea6e-49a9-a42f-dfe2f0cdf1c0', 'blesk@example.com', 'pbkdf2$100000$r6k66MjCdMvzN+fPX5ujVQ==$2mLKFq20egIc1Fd1HlnOGDMxjF/jKRp7atD14AzV52s=', 'company', 'blesk', 'Москва', NULL, 0, datetime('now', '-70 days')),
('40953085-3d88-4bf0-b0c8-cb8523cb6cae', 'newcleaners@example.com', 'pbkdf2$100000$r6k66MjCdMvzN+fPX5ujVQ==$2mLKFq20egIc1Fd1HlnOGDMxjF/jKRp7atD14AzV52s=', 'company', 'newcleaners', 'Москва', NULL, 0, datetime('now', '-5 days')),
('8576ecb8-dd55-439f-b7c6-e69c27c51cf7', 'spbclean@example.com', 'pbkdf2$100000$r6k66MjCdMvzN+fPX5ujVQ==$2mLKFq20egIc1Fd1HlnOGDMxjF/jKRp7atD14AzV52s=', 'company', 'spbclean', 'Санкт-Петербург', NULL, 0, datetime('now', '-60 days'));

-- ============================================================================================
-- companies (inn_ogrn — шифротекст AES-256-GCM, см. допущение 9)
-- ============================================================================================
INSERT INTO companies (id, user_id, name, description, inn_ogrn, phone, website, address, work_hours, video_url, cover_url, city, rating_avg, orders_count, response_speed_sec, views_count, is_verified, created_at) VALUES
('96d084e6-b2e4-47dd-9fd3-a069a98cba3a', '74bd2288-15e3-4571-93e6-9145cddb7175', 'CleanPro', 'Профессиональная уборка квартир и офисов в Москве. Работаем с 2015 года, экологичная химия, страхование ответственности.', 'ZFdUfKH1mme2nEoN:ieGP9HyvKeRNI5qE9VyMnbOtJkGUHoWaQXo=', '+7 (495) 100-10-10', 'https://cleanpro.example.com', 'Москва, ул. Тверская, д. 1', 'Пн-Вс 08:00-22:00', NULL, NULL, 'Москва', 5, 2, 180, 15, 1, datetime('now', '-90 days')),
('b3d95825-691c-4ba3-92e3-d98d803eb48b', 'bee5d274-96ac-4bb0-9247-e6358c2183a9', 'ЧистоДом', 'Поддерживающая и генеральная уборка для дома. Индивидуальный подход, гибкий график.', 'Pk7nt6OsYrYVIj4p:5qqhSpNq9W3SKaETGbVU+ionO+Ld1VAXR8Q=', '+7 (495) 200-20-20', NULL, 'Москва, Ленинский пр-т, д. 10', 'Пн-Сб 09:00-20:00', NULL, NULL, 'Москва', 0, 1, 600, 8, 1, datetime('now', '-80 days')),
('df90cedf-fa6e-43d1-bde6-63bc0e8f7693', 'f1f8a31b-ea6e-49a9-a42f-dfe2f0cdf1c0', 'Блеск', 'Клининг офисов и коммерческих помещений любой площади.', '7PPmRhsW9Xmpd9K0:QMKN9qw8Uyour8yHFkMJZpRUlMQQxZJ5GNQ=', '+7 (495) 300-30-30', 'https://blesk.example.com', 'Москва, Кутузовский пр-т, д. 5', 'Пн-Пт 09:00-18:00', NULL, NULL, 'Москва', 0, 0, NULL, 4, 1, datetime('now', '-70 days')),
('e26e4667-82b0-4125-a847-01bbd10692ae', '40953085-3d88-4bf0-b0c8-cb8523cb6cae', 'NewCleaners', '', '1sM0ArkTl140drNk:KWj70w926BGIu31N+Vl4X1MO+PvlOK6Q+vw=', '+7 (495) 400-40-40', NULL, 'Москва, ул. Новая, д. 2', NULL, NULL, NULL, 'Москва', 0, 0, NULL, 3, 0, datetime('now', '-5 days')),
('a60c8ec7-b150-4677-98ce-e20b26becf5a', '8576ecb8-dd55-439f-b7c6-e69c27c51cf7', 'SPB Clean', 'Клининговые услуги в Санкт-Петербурге для квартир и офисов.', 'szw8B5bINyhEdaiR:ucUG7CPaUqU5nLU5UqX+izZ6mawkOUoIXFE=', '+7 (812) 500-50-50', 'https://spbclean.example.com', 'Санкт-Петербург, Невский пр-т, д. 20', 'Пн-Вс 09:00-21:00', NULL, NULL, 'Санкт-Петербург', 4, 1, 300, 10, 1, datetime('now', '-60 days'));

-- ============================================================================================
-- services (только у верифицированных компаний — у NewCleaners услуг нет)
-- ============================================================================================
INSERT INTO services (id, company_id, name, price, duration_min, description, created_at) VALUES
('733ad42b-2399-4ea2-8f07-234c41a23111', '96d084e6-b2e4-47dd-9fd3-a069a98cba3a', 'Генеральная уборка квартиры', 4500, 180, 'Уборка всех помещений, включая труднодоступные места.', datetime('now', '-89 days')),
('faa8a44c-0d91-4dcf-961f-e5a8f578db2e', '96d084e6-b2e4-47dd-9fd3-a069a98cba3a', 'Уборка после ремонта', 8000, 300, 'Удаление строительной пыли и остатков материалов.', datetime('now', '-89 days')),
('b542ad05-a5ff-45ad-b7a1-3486dafd65cd', '96d084e6-b2e4-47dd-9fd3-a069a98cba3a', 'Мытьё окон', 1500, 60, 'Мытьё окон и подоконников с двух сторон.', datetime('now', '-89 days')),
('25dc6c7b-c88d-4265-a9b5-7afdcafc2d66', 'b3d95825-691c-4ba3-92e3-d98d803eb48b', 'Поддерживающая уборка', 2500, 120, 'Регулярная уборка квартиры раз в неделю.', datetime('now', '-79 days')),
('c8ba8756-c256-4611-a0a8-e07d52825145', 'b3d95825-691c-4ba3-92e3-d98d803eb48b', 'Химчистка мебели', 3500, 90, 'Химчистка дивана или кресла на дому.', datetime('now', '-79 days')),
('3339c048-ca3e-4503-b167-10db3394c0c6', 'df90cedf-fa6e-43d1-bde6-63bc0e8f7693', 'Уборка офиса', 6000, 240, 'Комплексная уборка офисных помещений.', datetime('now', '-69 days')),
('6fac2e5e-46b1-4988-a2a2-b64b4f505c29', 'a60c8ec7-b150-4677-98ce-e20b26becf5a', 'Генеральная уборка', 4200, 180, 'Генеральная уборка квартиры любой площади.', datetime('now', '-59 days'));

-- ============================================================================================
-- orders (все 4 статуса представлены)
-- ============================================================================================
INSERT INTO orders (id, client_id, company_id, service_id, status, total_price, created_at, completed_at) VALUES
('1741a0bc-ee1f-4e67-81af-3b986d80d8a1', '9113654f-73bf-456d-9b01-0ccc490c4cca', '96d084e6-b2e4-47dd-9fd3-a069a98cba3a', '733ad42b-2399-4ea2-8f07-234c41a23111', 'done', 4500, datetime('now', '-20 days'), datetime('now', '-18 days')),
('51d44bb2-e9aa-4469-b6ff-6a8be64860c9', '9113654f-73bf-456d-9b01-0ccc490c4cca', '96d084e6-b2e4-47dd-9fd3-a069a98cba3a', 'b542ad05-a5ff-45ad-b7a1-3486dafd65cd', 'in_progress', 1500, datetime('now', '-2 days'), NULL),
('511843ba-62ee-46a4-a2ed-1f405dd61e3f', '9113654f-73bf-456d-9b01-0ccc490c4cca', 'b3d95825-691c-4ba3-92e3-d98d803eb48b', '25dc6c7b-c88d-4265-a9b5-7afdcafc2d66', 'created', 2500, datetime('now'), NULL),
('ee329c96-5148-4874-ac71-f712649d8946', '5375607a-7b5e-4453-b586-c4fad0b31a2b', 'a60c8ec7-b150-4677-98ce-e20b26becf5a', '6fac2e5e-46b1-4988-a2a2-b64b4f505c29', 'done', 4200, datetime('now', '-10 days'), datetime('now', '-9 days'));

-- ============================================================================================
-- reviews (только к заказам done, один с ответом компании)
-- ============================================================================================
INSERT INTO reviews (id, order_id, client_id, company_id, rating, text, company_reply, created_at) VALUES
('c866f90e-fab0-4fc2-a414-c28bda270b55', '1741a0bc-ee1f-4e67-81af-3b986d80d8a1', '9113654f-73bf-456d-9b01-0ccc490c4cca', '96d084e6-b2e4-47dd-9fd3-a069a98cba3a', 5, 'Отличная работа, всё чисто и аккуратно!', 'Спасибо за отзыв, ждём вас снова!', datetime('now', '-17 days')),
('7e9cdf4a-2cc0-4dff-8c7d-69c6be908fab', 'ee329c96-5148-4874-ac71-f712649d8946', '5375607a-7b5e-4453-b586-c4fad0b31a2b', 'a60c8ec7-b150-4677-98ce-e20b26becf5a', 4, 'Хорошо, но немного задержались по времени.', NULL, datetime('now', '-9 days'));

-- ============================================================================================
-- promotions (одна активная, одна истёкшая — проверить скрытие по valid_until)
-- ============================================================================================
INSERT INTO promotions (id, company_id, title, discount_percent, valid_until, created_at) VALUES
('b5ca1d28-e31a-4be1-bdd2-f97f35249b8a', '96d084e6-b2e4-47dd-9fd3-a069a98cba3a', 'Скидка на генеральную уборку', 15, date('now', '+30 days'), datetime('now', '-10 days')),
('9c8e2577-8fae-4733-b40e-7fbd34464b3b', 'b3d95825-691c-4ba3-92e3-d98d803eb48b', 'Летняя скидка', 20, date('now', '-10 days'), datetime('now', '-40 days'));

-- ============================================================================================
-- favorites
-- ============================================================================================
INSERT INTO favorites (id, client_id, company_id, created_at) VALUES
('a0d83c9b-901f-4804-aa76-1406b97d0565', '9113654f-73bf-456d-9b01-0ccc490c4cca', 'df90cedf-fa6e-43d1-bde6-63bc0e8f7693', datetime('now', '-15 days'));

-- ============================================================================================
-- chats + messages (текст — шифротекст AES-256-GCM, один непрочитанный для company)
-- ============================================================================================
INSERT INTO chats (id, client_id, company_id, last_message_at) VALUES
('b553fd88-3b1a-494f-8b39-ad9c980174a5', '9113654f-73bf-456d-9b01-0ccc490c4cca', '96d084e6-b2e4-47dd-9fd3-a069a98cba3a', datetime('now', '-1 hours'));

INSERT INTO messages (id, chat_id, sender_id, text, created_at, is_read) VALUES
('a2413d5c-68a0-4c2c-b605-87d9e2311944', 'b553fd88-3b1a-494f-8b39-ad9c980174a5', '9113654f-73bf-456d-9b01-0ccc490c4cca', 'MwqufXy9Dq0eUOK9:OG6RqwO8+LniacvYMWj39D9TFIUHJW5W62SXLkshn1FgDApTqSeD9ot8Fb1+k2MOXskWRr0ogD9R8bWRMabKIQ5HkZXl8PNSpPXtVPhKUPYSqdORAy+TXUnAMAQ=', datetime('now', '-3 hours'), 1),
('cfe03022-2302-44e7-91aa-5ea2247b8b95', 'b553fd88-3b1a-494f-8b39-ad9c980174a5', '74bd2288-15e3-4571-93e6-9145cddb7175', '7YvUcZh6n99qAVGx:GgH/rZHZ/sh4LwTfdES0RObp9+Erlmju76WHtE5pLdeE3ZprjchYmoFc7K9mmxsOjM3hP7pJ+K6plZs90lfCsvVDmgopdTSJjRnKkU3usjFJSdI6ECuYmnKvbrvctOdoSLHmfhip49U+1rjKgw==', datetime('now', '-2 hours'), 1),
('a0aa75cb-764d-416b-83fe-c79e93462c54', 'b553fd88-3b1a-494f-8b39-ad9c980174a5', '9113654f-73bf-456d-9b01-0ccc490c4cca', 'p/zPaALfdWgPg12T:alvXRykvLgxAP6H+7TC7pLhRWQFGLE6QpgKHsEOBJC0Zyf1qwDbZBu/fm/acRFp1WBcf1rbrqvD6Ta6F8S8l', datetime('now', '-1 hours'), 0);

-- ============================================================================================
-- company_views — журнал просмотров для реальной агрегации в GET /api/company/stats (F10)
-- ============================================================================================
INSERT INTO company_views (id, company_id, viewed_at)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' ||
       substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
       '96d084e6-b2e4-47dd-9fd3-a069a98cba3a',
       datetime('now', '-' || (abs(random()) % 45) || ' days')
FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 15) SELECT n FROM seq);

INSERT INTO company_views (id, company_id, viewed_at)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' ||
       substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
       'b3d95825-691c-4ba3-92e3-d98d803eb48b',
       datetime('now', '-' || (abs(random()) % 45) || ' days')
FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 8) SELECT n FROM seq);

INSERT INTO company_views (id, company_id, viewed_at)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' ||
       substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
       'df90cedf-fa6e-43d1-bde6-63bc0e8f7693',
       datetime('now', '-' || (abs(random()) % 45) || ' days')
FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 4) SELECT n FROM seq);

INSERT INTO company_views (id, company_id, viewed_at)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' ||
       substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
       'a60c8ec7-b150-4677-98ce-e20b26becf5a',
       datetime('now', '-' || (abs(random()) % 45) || ' days')
FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 10) SELECT n FROM seq);
