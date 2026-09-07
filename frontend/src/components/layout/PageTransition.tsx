import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Переходы между страницами — fade + slide, значения зафиксированы дизайн-системой
 * (docs/03-design-system.md §6). Не оборачивает фиксированную шапку/сайдбар/таб-бар —
 * только контент маршрута.
 *
 * Упрощение этого шага: анимируется только "enter" (смена key при навигации гарантированно
 * работает), полноценный "exit" при уходе со страницы требует "заморозки" предыдущего
 * `location` (паттерн `useOutlet` + `usePrevious`) — TODO(frontend) добавить при вёрстке
 * реальных экранов, если потребуется точное соответствие exit-анимации.
 */
const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] } },
};

const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={location.pathname}
        variants={prefersReducedMotion ? reducedMotionVariants : pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}

export default PageTransition;
