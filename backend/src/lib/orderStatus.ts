/**
 * Допустимые переходы статуса заказа (F5, docs/01-spec.md "Правила и валидация" +
 * docs/04-architecture.md §4.5): created -> in_progress -> done|cancelled, created -> cancelled.
 * Любой другой переход запрещён (400). Чистая функция — тестируется в tests/orderStatus.test.ts.
 */
import type { OrderStatus } from '../db/schema';

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  created: ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
