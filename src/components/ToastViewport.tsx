import { useToastList } from "../hooks/useToastHooks";

/**
 * Плавающий список тостов (docs/03-design-system.md, §3.5).
 * `aria-live="polite"` — сообщения озвучиваются без похищения фокуса
 * (docs/02-ux.md, «Доступность», «Живые области»).
 */
export function ToastViewport() {
  const { toasts } = useToastList();

  if (toasts.length === 0) return null;

  return (
    <div className="nd-toast-viewport" aria-live="polite" role="status">
      {toasts.map((toast) => (
        <div key={toast.id} className="nd-toast">
          {toast.message}
        </div>
      ))}
    </div>
  );
}
