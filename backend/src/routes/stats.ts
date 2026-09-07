/**
 * Модуль stats — статистика компании (F10). Контракт: docs/04-architecture.md §4.9.
 *
 * `viewsCount`/`series[].views` считаются по журналу `company_views` (migrations/0002 —
 * дополнение бэкенд-инженера сверх исходных 9 таблиц, см. комментарий в самой миграции):
 * `companies.views_count` — только счётчик за всё время без меток времени, из него нельзя
 * построить честный график/период. `averageCheck` считается по заказам в статусе `done`
 * (реально оплаченные/выполненные заказы — не по всем статусам, иначе отменённые заказы искажали
 * бы "средний чек").
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types/env';
import { apiError } from '../lib/http';
import { requireAuth } from '../middleware/auth';
import { queryAll, queryOne } from '../db/client';
import type { OrderStatus } from '../db/schema';
import { getCompanyBasicByUserId } from '../lib/queries';

export const statsRouter = new Hono<{ Bindings: Env }>();

const statsQuerySchema = z.object({
  period: z.enum(['7', '30', '90']).default('30'),
});

const ALL_STATUSES: OrderStatus[] = ['created', 'in_progress', 'done', 'cancelled'];

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Список календарных дат (YYYY-MM-DD) от `days-1` дней назад до сегодня включительно. */
function buildDayList(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    result.push(isoDateOnly(d));
  }
  return result;
}

statsRouter.get('/', requireAuth('company'), async (c) => {
  const input = statsQuerySchema.parse(c.req.query());
  const db = c.env.DB;
  const periodDays = Number(input.period);

  const company = await getCompanyBasicByUserId(db, c.get('userId'));
  if (!company) return apiError(c, 403, 'forbidden', 'У вас нет профиля компании');
  if (company.is_verified !== 1) {
    return apiError(c, 403, 'forbidden', 'Статистика доступна только верифицированным компаниям');
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (periodDays - 1));
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [viewsTotal, ordersByStatusRows, averageCheckRow, viewsByDay, ordersByDay] =
    await Promise.all([
      queryOne<{ count: number }>(
        db,
        'SELECT COUNT(*) AS count FROM company_views WHERE company_id = ? AND viewed_at >= ?',
        [company.id, sinceIso],
      ),
      queryAll<{ status: OrderStatus; count: number }>(
        db,
        `SELECT status, COUNT(*) AS count FROM orders
         WHERE company_id = ? AND created_at >= ? GROUP BY status`,
        [company.id, sinceIso],
      ),
      queryOne<{ avg_total: number | null }>(
        db,
        `SELECT AVG(total_price) AS avg_total FROM orders
         WHERE company_id = ? AND status = 'done' AND created_at >= ?`,
        [company.id, sinceIso],
      ),
      queryAll<{ d: string; count: number }>(
        db,
        `SELECT strftime('%Y-%m-%d', viewed_at) AS d, COUNT(*) AS count
         FROM company_views WHERE company_id = ? AND viewed_at >= ? GROUP BY d`,
        [company.id, sinceIso],
      ),
      queryAll<{ d: string; count: number }>(
        db,
        `SELECT strftime('%Y-%m-%d', created_at) AS d, COUNT(*) AS count
         FROM orders WHERE company_id = ? AND created_at >= ? GROUP BY d`,
        [company.id, sinceIso],
      ),
    ]);

  const ordersByStatus: Record<OrderStatus, number> = {
    created: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
  };
  let ordersTotal = 0;
  for (const row of ordersByStatusRows) {
    ordersByStatus[row.status] = row.count;
    ordersTotal += row.count;
  }
  for (const status of ALL_STATUSES) ordersByStatus[status] ??= 0;

  const viewsMap = new Map(viewsByDay.map((r) => [r.d, r.count]));
  const ordersMap = new Map(ordersByDay.map((r) => [r.d, r.count]));
  const dayList = buildDayList(periodDays);
  const dailySeries = dayList.map((date) => ({
    date,
    views: viewsMap.get(date) ?? 0,
    orders: ordersMap.get(date) ?? 0,
  }));

  // Для периода 90 дней агрегируем по неделям (docs/02-ux.md "Много данных" для панели компании).
  const series =
    periodDays === 90
      ? chunkIntoWeeks(dailySeries)
      : dailySeries;

  const viewsCount = viewsTotal?.count ?? 0;
  const averageCheck = averageCheckRow?.avg_total ? Math.round(averageCheckRow.avg_total) : 0;
  const conversionRate = viewsCount > 0 ? ordersTotal / viewsCount : 0;

  return c.json({
    period: periodDays,
    viewsCount,
    ordersTotal,
    ordersByStatus,
    averageCheck,
    conversionRate,
    series,
  });
});

function chunkIntoWeeks(
  days: Array<{ date: string; views: number; orders: number }>,
): Array<{ date: string; views: number; orders: number }> {
  const weeks: Array<{ date: string; views: number; orders: number }> = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    const first = chunk[0];
    if (!first) continue;
    weeks.push({
      date: first.date,
      views: chunk.reduce((sum, d) => sum + d.views, 0),
      orders: chunk.reduce((sum, d) => sum + d.orders, 0),
    });
  }
  return weeks;
}

export default statsRouter;
