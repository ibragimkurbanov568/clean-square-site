/**
 * Формула ТОП-3 компаний города (F3, docs/01-spec.md):
 *   rating_score = avg_rating*0.6 + normalized_orders_count*0.3 + normalized_response_speed*0.1
 * Нормализация — min-max в пределах компаний одного города (допущение 17): при единственной
 * компании (или когда все значения равны) нормализованное значение принимается равным 1.
 *
 * Чистые функции без побочных эффектов — тестируются напрямую в tests/rating.test.ts, не через
 * маршруты/БД (см. docs/01-spec.md "Осознанно вне объёма": Vitest покрывает критические функции).
 */

/** Min-max нормализация для метрики "больше — лучше" (например, количество заказов). */
export function normalizeHigherBetter(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (values.length === 1 || min === max) return values.map(() => 1);
  return values.map((v) => (v - min) / (max - min));
}

/** Min-max нормализация для метрики "меньше — лучше" (например, скорость ответа в секундах). */
export function normalizeLowerBetter(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (values.length === 1 || min === max) return values.map(() => 1);
  return values.map((v) => (max - v) / (max - min));
}

export interface CompanyRatingInput {
  id: string;
  ratingAvg: number;
  ordersCount: number;
  /** Среднее время ответа в чате (секунды); `null`, если данных ещё нет. */
  responseSpeedSec: number | null;
}

export interface CompanyRatingResult {
  id: string;
  ratingScore: number;
}

/**
 * Считает `rating_score` для всех переданных компаний (одного города). Компании без данных о
 * скорости ответа получают наихудшее (но конечное) значение среди известных, чтобы не ломать
 * нормализацию отсутствием данных, но и не награждать их наравне с быстро отвечающими.
 */
export function computeRatingScores(
  companies: readonly CompanyRatingInput[],
): CompanyRatingResult[] {
  if (companies.length === 0) return [];

  const ordersNorm = normalizeHigherBetter(companies.map((c) => c.ordersCount));

  const knownSpeeds = companies
    .map((c) => c.responseSpeedSec)
    .filter((v): v is number => v !== null);
  const worstKnownSpeed = knownSpeeds.length > 0 ? Math.max(...knownSpeeds) + 1 : 0;
  const speedsFilled = companies.map((c) => c.responseSpeedSec ?? worstKnownSpeed);
  const speedNorm = normalizeLowerBetter(speedsFilled);

  return companies.map((c, i) => ({
    id: c.id,
    ratingScore: c.ratingAvg * 0.6 + (ordersNorm[i] ?? 0) * 0.3 + (speedNorm[i] ?? 0) * 0.1,
  }));
}

/** Возвращает не более `limit` компаний, отсортированных по убыванию `rating_score` (F3). */
export function selectTopCompanies<T extends CompanyRatingInput>(
  companies: readonly T[],
  limit = 3,
): T[] {
  const scores = computeRatingScores(companies);
  const scoreById = new Map(scores.map((s) => [s.id, s.ratingScore]));
  return [...companies]
    .sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0))
    .slice(0, limit);
}
