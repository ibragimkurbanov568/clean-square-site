import { cn } from '../../lib/utils';
import { orderStatusLabel } from '../../lib/utils';
import type { OrderStatus } from '../../lib/types';

const STATUS_STYLES: Record<OrderStatus, string> = {
  created: 'text-info bg-info-bg',
  in_progress: 'text-warning bg-warning-bg',
  done: 'text-success bg-success-bg',
  cancelled: 'text-neutral bg-neutral-bg',
};

/** Бейдж статуса заказа — docs/03-design-system.md §7.4: цвет + текст + точка-индикатор. */
export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {orderStatusLabel(status)}
    </span>
  );
}

export function NewOrderBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg px-3 py-1 text-xs font-semibold text-info">
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      Новый
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success',
        className,
      )}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Верифицировано
    </span>
  );
}

export function UnverifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-neutral-bg px-3 py-1 text-xs font-semibold text-neutral',
        className,
      )}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Профиль не подтверждён
    </span>
  );
}

export function ExpiredBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-bg px-3 py-1 text-xs font-semibold text-neutral">
      Истекла
    </span>
  );
}

export default OrderStatusBadge;
