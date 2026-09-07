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
    }
  }, [companyId]);

  useEffect(() => {
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

  return { items, isLoading, error, reload, createService, updateService, deleteService };
}
