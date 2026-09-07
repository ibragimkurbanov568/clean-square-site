import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface FilterPillsProps<T extends string> {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Горизонтальные фильтр-таблетки (статус заказа и т.п.) — docs/02-ux.md. */
export function FilterPills<T extends string>({ options, value, onChange, className }: FilterPillsProps<T>) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1', className)} role="tablist">
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <motion.button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
            whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
            transition={{ duration: 0.15 }}
            className={cn(
              'focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-accent-600 text-accent-contrast' : 'bg-surface text-text-secondary border border-border-strong hover:bg-surface-hover',
            )}
          >
            {option.label}
          </motion.button>
        );
      })}
    </div>
  );
}

export default FilterPills;
