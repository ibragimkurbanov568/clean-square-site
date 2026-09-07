import { describe, expect, it } from 'vitest';
import { canTransitionOrderStatus } from '../src/lib/orderStatus';
import type { OrderStatus } from '../src/db/schema';

// Допустимые переходы статуса заказа (F5, docs/01-spec.md "Правила и валидация"):
// created -> in_progress -> done|cancelled, created -> cancelled. Всё остальное — 400.

describe('lib/orderStatus — canTransitionOrderStatus', () => {
  it('разрешает created -> in_progress', () => {
    expect(canTransitionOrderStatus('created', 'in_progress')).toBe(true);
  });

  it('разрешает created -> cancelled', () => {
    expect(canTransitionOrderStatus('created', 'cancelled')).toBe(true);
  });

  it('разрешает in_progress -> done', () => {
    expect(canTransitionOrderStatus('in_progress', 'done')).toBe(true);
  });

  it('разрешает in_progress -> cancelled', () => {
    expect(canTransitionOrderStatus('in_progress', 'cancelled')).toBe(true);
  });

  it('запрещает created -> done (пропуск in_progress)', () => {
    expect(canTransitionOrderStatus('created', 'done')).toBe(false);
  });

  it('запрещает любой переход из терминального статуса done', () => {
    const targets: OrderStatus[] = ['created', 'in_progress', 'cancelled', 'done'];
    for (const target of targets) {
      expect(canTransitionOrderStatus('done', target)).toBe(false);
    }
  });

  it('запрещает любой переход из терминального статуса cancelled', () => {
    const targets: OrderStatus[] = ['created', 'in_progress', 'done', 'cancelled'];
    for (const target of targets) {
      expect(canTransitionOrderStatus('cancelled', target)).toBe(false);
    }
  });

  it('запрещает переход в тот же статус (нет самоперехода)', () => {
    expect(canTransitionOrderStatus('created', 'created')).toBe(false);
    expect(canTransitionOrderStatus('in_progress', 'in_progress')).toBe(false);
  });
});
