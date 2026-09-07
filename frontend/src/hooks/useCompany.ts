import { useCallback, useEffect, useState } from 'react';
import { apiRequest, ApiError } from '../lib/apiClient';
import type { Company } from '../lib/types';

export interface UseCompanyResult {
  company: Company | null;
  isLoading: boolean;
  error: string | null;
  notFound: boolean;
  reload: () => Promise<void>;
}

/** Карточка компании (F4) — GET /api/companies/:id + инкремент просмотра (F13). */
export function useCompany(id: string | undefined): UseCompanyResult {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const result = await apiRequest<Company>(`/companies/${id}`);
      setCompany(result);
      // F13: фоновый инкремент просмотра, не блокирует отображение карточки при ошибке.
      apiRequest(`/companies/${id}/view`, { method: 'POST' }).catch(() => undefined);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError('Компания не найдена');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { company, isLoading, error, notFound, reload };
}
