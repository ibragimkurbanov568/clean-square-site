import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import type { Service } from '../lib/types';

export interface ServiceInput {
  name: string;
  price: number;
  durationMin?: number;
  description?: string;
}

export interface UseServicesResult {
  items: Service[];
  isLoading: boolean;
  /**
   * `true`, как только хотя бы одна попытка загрузки завершилась (успехом или ошибкой) для
   * текущего `companyId`. Нужен отдельно от `isLoading`, потому что `isLoading` стартует с
   * `false` и синхронно не отражает "ещё не начали загрузку" в том же коммите React, где
   * `companyId` только что перестал быть `undefined` (см. баг, найденный QA: CompanyPage
   * ошибочно считал `!isLoading` признаком "услуг нет" и преждевременно сбрасывал гостевой
   * order-intent, не дождавшись реального ответа сервера — CompanyPage.tsx использует именно
   * `hasLoaded`, а не `!isLoading`, для этого решения).
   */
  hasLoaded: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createService: (input: ServiceInput) => Promise<Service>;
  updateService: (serviceId: string, input: Partial<ServiceInput>) => Promise<Service>;
  deleteService: (serviceId: string) => Promise<void>;
}

/** Прайс-лист компании (F4 публичный список, /company/services CRUD). */
export function useServices(companyId: string | undefined): UseServicesResult {
  const [items, setItems] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ items: Service[] }>(`/companies/${companyId}/services`);
      setItems(result.items);
    } catch {
      setError('Не удалось загрузить услуги');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [companyId]);

  useEffect(() => {
    setHasLoaded(false);
    void reload();
  }, [reload]);

  const createService = useCallback(
    async (input: ServiceInput) => {
      if (!companyId) throw new Error('companyId is required');
      const created = await apiRequest<Service>(`/companies/${companyId}/services`, { method: 'POST', body: input });
      setItems((prev) => [...prev, created]);
      return created;
    },
    [companyId],
  );

  const updateService = useCallback(async (serviceId: string, input: Partial<ServiceInput>) => {
    const updated = await apiRequest<Service>(`/services/${serviceId}`, { method: 'PATCH', body: input });
    setItems((prev) => prev.map((service) => (service.id === serviceId ? updated : service)));
    return updated;
  }, []);

  const deleteService = useCallback(async (serviceId: string) => {
    await apiRequest(`/services/${serviceId}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((service) => service.id !== serviceId));
  }, []);

  return { items, isLoading, hasLoaded, error, reload, createService, updateService, deleteService };
}
