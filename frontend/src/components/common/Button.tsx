import { motion, useReducedMotion } from 'framer-motion';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import Spinner from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type MotionButtonProps = ComponentPropsWithoutRef<typeof motion.button>;

export interface ButtonProps extends Omit<MotionButtonProps, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  children?: ReactNode;
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

/**
 * Кнопка — анатомия из docs/03-design-system.md §7.1. hover scale 1.05 / active scale 0.95 /
 * 150мс через Framer Motion `pressable`-variants; отключается на время загрузки/disabled.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading, loadingText, fullWidth, className, disabled, children, ...rest },
  ref,
) {
  const prefersReducedMotion = useReducedMotion();
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      ref={ref}
      className={cn(
        'focus-ring inline-flex items-center justify-center rounded-md font-semibold transition-colors',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'pointer-events-none opacity-50' : '',
        className,
      )}
      disabled={isDisabled}
      whileHover={!isDisabled && !prefersReducedMotion ? { scale: 1.05 } : undefined}
      whileTap={!isDisabled && !prefersReducedMotion ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      {...rest}
    >
      {isLoading ? (
        <>
          <Spinner size={16} />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
});

export default Button;
