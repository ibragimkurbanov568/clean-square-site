import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

/** Базовая карточка — docs/03-design-system.md §7.3. */
export function Card({ children, className, padded = true, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface shadow-sm',
        padded ? 'p-5' : '',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
