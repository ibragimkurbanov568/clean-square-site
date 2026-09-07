/**
 * Общие D1-запросы, переиспользуемые несколькими route-модулями (владение компанией/услугой,
 * полная выборка компании с агрегатами). Только parameterized-запросы (`.bind()`), см.
 * docs/01-spec.md "Правила и валидация".
 */
import { queryOne } from '../db/client';
import type { UserRow } from '../db/schema';
import type { CompanyRowExtra } from './mappers';

/** Полная строка компании + аватар владельца (users.avatar_url) + агрегаты (отзывы/мин. цена). */
const COMPANY_SELECT = `
  SELECT c.*, u.avatar_url AS avatar_url,
    (SELECT COUNT(*) FROM reviews r WHERE r.company_id = c.id) AS reviews_count,
    (SELECT MIN(price) FROM services s WHERE s.company_id = c.id) AS price_from
  FROM companies c
  JOIN users u ON u.id = c.user_id
`;

export async function getCompanyRowById(
  db: D1Database,
  id: string,
): Promise<CompanyRowExtra | null> {
  return queryOne<CompanyRowExtra>(db, `${COMPANY_SELECT} WHERE c.id = ?`, [id]);
}

export interface CompanyBasicRow {
  id: string;
  user_id: string;
  name: string;
  is_verified: 0 | 1;
}

/** Минимальная строка компании по id — для проверок владения/верификации без лишних JOIN. */
export async function getCompanyBasicById(
  db: D1Database,
  id: string,
): Promise<CompanyBasicRow | null> {
  return queryOne<CompanyBasicRow>(
    db,
    'SELECT id, user_id, name, is_verified FROM companies WHERE id = ?',
    [id],
  );
}

/** Компания текущего авторизованного пользователя (role='company'). */
export async function getCompanyBasicByUserId(
  db: D1Database,
  userId: string,
): Promise<CompanyBasicRow | null> {
  return queryOne<CompanyBasicRow>(
    db,
    'SELECT id, user_id, name, is_verified FROM companies WHERE user_id = ?',
    [userId],
  );
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return queryOne<UserRow>(db, 'SELECT * FROM users WHERE id = ?', [id]);
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(db, 'SELECT * FROM users WHERE email = ?', [email]);
}
