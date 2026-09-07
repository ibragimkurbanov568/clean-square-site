import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import { useDebounce } from './useDebounce';

export interface UseCitySuggestionsResult {
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
}

/** Автодополнение городов (F2) — GET /api/cities/suggest?q=, debounce 300мс. */
export function useCitySuggestions(query: string): UseCitySuggestionsResult {
  const debounced = useDebounce(query.trim(), 300);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debounced.length < 1) {
      setSuggestions([]);
      setError(null);
      return undefined;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    apiRequest<{ items: string[] }>('/cities/suggest', { query: { q: debounced }, signal: controller.signal })
      .then((result) => setSuggestions(result.items))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError('Не удалось загрузить подсказки. Введите город и нажмите Enter');
        setSuggestions([]);
        void err;
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [debounced]);

  return { suggestions, isLoading, error };
}
