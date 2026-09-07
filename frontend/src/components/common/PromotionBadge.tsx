import { formatDate } from '../../lib/utils';
import type { Promotion } from '../../lib/types';
import { cn } from '../../lib/utils';
import { ExpiredBadge } from './Badge';

export function PromotionBadge({ promotion, expanded }: { promotion: Promotion; expanded?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-accent/30 bg-accent-subtle px-3 py-2',
        promotion.isExpired ? 'opacity-60' : '',
        expanded ? 'flex-wrap justify-between' : '',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-accent">−{promotion.discountPercent}%</span>
        <span className="text-sm text-text-primary">{promotion.title}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">до {formatDate(promotion.validUntil)}</span>
        {promotion.isExpired ? <ExpiredBadge /> : null}
      </div>
    </div>
  );
}

export default PromotionBadge;
