import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Системная настройка «уменьшить движение» (F6). Не путать с тумблером
 * «Анимации и переходы» проекта — это два независимых источника: система
 * отключает анимации ПОЯВЛЕНИЯ секций при прокрутке независимо от
 * тумблера, hover-эффекты остаются (см. docs/02-ux.md, F6).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}
