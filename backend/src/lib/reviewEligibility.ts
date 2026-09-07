/**
 * Правила допустимости отзыва (F7, docs/01-spec.md "Правила и валидация"): только к заказу
 * `status='done'`, принадлежащему текущему клиенту, и только один раз (UNIQUE order_id).
 * Чистая функция, отделённая от D1/транспорта — тестируется в tests/reviewEligibility.test.ts,
 * используется напрямую в routes/reviews.ts, чтобы бизнес-правило проверялось одинаково.
 */
import type { OrderStatus } from '../db/schema';

export type ReviewEligibilityError = 'not_found_or_forbidden' | 'invalid_status' | 'duplicate';

export interface ReviewEligibilityInput {
  order: { clientId: string; status: OrderStatus } | null;
  requestingClientId: string;
  hasExistingReview: boolean;
}

export type ReviewEligibilityResult =
  | { ok: true }
  | { ok: false; error: ReviewEligibilityError };

export function checkReviewEligibility(input: ReviewEligibilityInput): ReviewEligibilityResult {
  if (!input.order || input.order.clientId !== input.requestingClientId) {
    return { ok: false, error: 'not_found_or_forbidden' };
  }
  if (input.order.status !== 'done') {
    return { ok: false, error: 'invalid_status' };
  }
  if (input.hasExistingReview) {
    return { ok: false, error: 'duplicate' };
  }
  return { ok: true };
}
