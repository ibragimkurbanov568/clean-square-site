import { useEffect, useState } from "react";

/**
 * Возвращает значение `value`, но с задержкой `delayMs` после последнего
 * изменения. Не используется для самих текстовых полей (те пишут в
 * состояние проекта на каждое нажатие клавиши, см. docs/02-ux.md,
 * «Три сложных момента», п.3) — только для производных эффектов вроде
 * автосохранения (F8, ~500мс debounce).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
