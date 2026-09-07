import { motion, useReducedMotion } from 'framer-motion';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { ButtonSize, ButtonVariant } from './Button';

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent-600 text-accent-contrast hover:bg-accent-700 active:bg-accent-800',
  secondary: 'bg-surface text-text-primary border border-border-strong hover:bg-surface-hover',
  ghost: 'bg-transparent text-accent hover:bg-accent-subtle',
  danger: 'bg-error text-white hover:opacity-90',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-5 text-lg gap-2',
};

/** Кнопка-ссылка — та же анатомия, что и Button, но рендерится как <Link> (docs/03-design-system.md §7.1). */
export function ButtonLink({ variant = 'secondary', size = 'md', fullWidth, className, ...rest }: ButtonLinkProps) {
  const prefersReducedMotion = useReducedMotion();
  const MotionLink = motion.create(Link);

  return (
    <MotionLink
      className={cn(
        'focus-ring inline-flex items-center justify-center rounded-md font-semibold transition-colors',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      )}
      whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
      whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      {...rest}
    />
  );
}

export default ButtonLink;
