import { createContext } from "react";

export interface ToastItem {
  id: string;
  message: string;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string) => void;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
