import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: i * 0.04, ease: [0.4, 0, 0.2, 1] },
  }),
};

const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

export interface ScrollRevealProps {
  children: ReactNode;
  index?: number;
  className?: string;
  as?: 'div' | 'li';
}

/**
 * Scroll-reveal через Framer Motion `whileInView` (эквивалент IntersectionObserver-класса
 * `.scroll-reveal` из design-tokens.css) — docs/03-design-system.md §6. Срабатывает один раз.
 */
export function ScrollReveal({ children, index = 0, className, as = 'div' }: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const Component = as === 'li' ? motion.li : motion.div;

  return (
    <Component
      className={className}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={prefersReducedMotion ? reducedVariants : revealVariants}
    >
      {children}
    </Component>
  );
}

export default ScrollReveal;
