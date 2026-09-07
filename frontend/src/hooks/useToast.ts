import { useContext } from 'react';
import { ToastContext, type ToastContextValue } from '../context/ToastContext';

/** Показ уведомлений (тостов) — docs/03-design-system.md §7.11. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast должен использоваться внутри <ToastProvider>');
  return ctx;
}
