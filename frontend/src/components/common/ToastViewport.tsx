import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../lib/utils';
import type { ToastKind } from '../../context/ToastContext';

const KIND_STYLES: Record<ToastKind, string> = {
  success: 'border-l-success',
  error: 'border-l-error',
  info: 'border-l-info',
};

const KIND_ICON: Record<ToastKind, string> = {
  success: '✓',
  error: '!',
  info: 'i',
};

/** Контейнер уведомлений — docs/03-design-system.md §7.11: справа сверху (десктоп), сверху по центру (мобильный). */
export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            className={cn(
              'pointer-events-auto flex w-full max-w-[360px] items-start gap-3 rounded-md border-l-[3px] bg-surface-elevated p-3 px-4 shadow-lg',
              KIND_STYLES[toast.kind],
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                toast.kind === 'success' ? 'bg-success' : toast.kind === 'error' ? 'bg-error' : 'bg-info',
              )}
              aria-hidden="true"
            >
              {KIND_ICON[toast.kind]}
            </span>
            <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Закрыть уведомление"
              className="focus-ring -m-2 flex h-11 w-11 shrink-0 items-center justify-center text-text-secondary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ToastViewport;
