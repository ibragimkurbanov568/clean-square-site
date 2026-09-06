import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Системная настройка «уменьшить движение» (F6). Не путать с тумблером
 * «Анимации и переходы» проекта — это два независимых источника: система
 * отключает анимации ПОЯВЛЕНИЯ секций при прокрутке независимо от
 * тумблера, hover-эффекты остаются (см. docs/02-ux.md, F6).
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
