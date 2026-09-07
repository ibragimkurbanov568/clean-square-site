import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import type { CompanyStats } from '../lib/types';

export type StatsPeriod = 7 | 30 | 90;

export interface UseStatsResult {
  stats: CompanyStats | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Статистика компании (F10) — GET /api/company/stats?period=. */
export function useStats(period: StatsPeriod): UseStatsResult {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<CompanyStats>('/company/stats', { query: { period } });
      setStats(result);
    } catch {
      setError('Не удалось загрузить статистику');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { stats, isLoading, error, reload };
}
