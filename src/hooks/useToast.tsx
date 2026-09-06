import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

export interface ToastItem {
  id: string;
  message: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_LIFETIME_MS = 4000;

/**
 * Провайдер тостов (docs/03-design-system.md, §3.5): плавающий блок,
 * `aria-live="polite"`, автоматически исчезает через 4с. Используется на
 * уровне всего приложения (App.tsx), т.к. тосты появляются и из мастера
 * (F1, дубль имени), и из редактора (F7 экспорт, F8 ошибки).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string) => {
      counter.current += 1;
      const id = `toast-${Date.now()}-${counter.current}`;
      setToasts((current) => [...current, { id, message }]);
      window.setTimeout(() => dismissToast(id), TOAST_LIFETIME_MS);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): { showToast: (message: string) => void } {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast должен использоваться внутри <ToastProvider>");
  }
  return { showToast: ctx.showToast };
}

export function useToastList(): { toasts: ToastItem[]; dismissToast: (id: string) => void } {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToastList должен использоваться внутри <ToastProvider>");
  }
  return { toasts: ctx.toasts, dismissToast: ctx.dismissToast };
}
