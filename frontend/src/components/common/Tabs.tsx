import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Вкладки карточки компании — подчёркивание, docs/03-design-system.md §7.3. */
export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn('flex gap-6 border-b border-border', className)}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              'focus-ring relative -mb-px flex h-11 items-center px-1 text-base transition-colors',
              isActive ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary hover:text-text-primary',
            )}
          >
            {item.label}
            {isActive ? (
              <motion.span
                layoutId={`tabs-underline-${className ?? 'default'}`}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent"
                transition={{ duration: 0.2 }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
