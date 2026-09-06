import { useContext } from "react";
import { ToastContext } from "./toastContext";
import type { ToastItem } from "./toastContext";

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
