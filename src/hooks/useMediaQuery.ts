import { useSyncExternalStore } from "react";

function subscribe(query: string, callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

/**
 * Универсальный хук подписки на медиа-запрос (используется для раскладки
 * редактора). Реализован через `useSyncExternalStore` — штатный React-API
 * для подписки на внешние источники истины (браузерный `matchMedia`) без
 * `useEffect` + `setState`.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => getSnapshot(query),
    () => false,
  );
}
