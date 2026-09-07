import { useEffect, useState } from 'react';

/** Дебаунс значения — используется для автодополнения города (300 мс, docs/02-ux.md). */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
