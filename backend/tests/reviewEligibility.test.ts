import { describe, expect, it } from 'vitest';
import { checkReviewEligibility } from '../src/lib/reviewEligibility';

// Уникальность и правила отзыва (F7, docs/01-spec.md "Правила и валидация"): отзыв можно
// оставить только к заказу status='done', принадлежащему текущему клиенту, ровно один раз.

describe('lib/reviewEligibility — checkReviewEligibility', () => {
  it('разрешает отзыв к своему выполненному заказу без существующего отзыва', () => {
    const result = checkReviewEligibility({
      order: { clientId: 'client-1', status: 'done' },
      requestingClientId: 'client-1',
      hasExistingReview: false,
    });
    expect(result).toEqual({ ok: true });
  });

  it('отклоняет, если заказ не найден', () => {
    const result = checkReviewEligibility({
      order: null,
      requestingClientId: 'client-1',
      hasExistingReview: false,
    });
    expect(result).toEqual({ ok: false, error: 'not_found_or_forbidden' });
  });

  it('отклоняет, если заказ принадлежит другому клиенту', () => {
    const result = checkReviewEligibility({
      order: { clientId: 'someone-else', status: 'done' },
      requestingClientId: 'client-1',
      hasExistingReview: false,
    });
    expect(result).toEqual({ ok: false, error: 'not_found_or_forbidden' });
  });

  it('отклоняет отзыв к заказу не в статусе done', () => {
    for (const status of ['created', 'in_progress', 'cancelled'] as const) {
      const result = checkReviewEligibility({
        order: { clientId: 'client-1', status },
        requestingClientId: 'client-1',
        hasExistingReview: false,
      });
      expect(result).toEqual({ ok: false, error: 'invalid_status' });
    }
  });

  it('отклоняет повторный отзыв к тому же заказу (уникальность)', () => {
    const result = checkReviewEligibility({
      order: { clientId: 'client-1', status: 'done' },
      requestingClientId: 'client-1',
      hasExistingReview: true,
    });
    expect(result).toEqual({ ok: false, error: 'duplicate' });
  });
});
