import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import type { Promotion } from '../lib/types';

export interface PromotionInput {
  title: string;
  discountPercent: number;
  validUntil: string;
}

export interface UsePromotionsResult {
  items: Promotion[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createPromotion: (input: PromotionInput) => Promise<Promotion>;
  deletePromotion: (promotionId: string) => Promise<void>;
}

/** Акции компании (F9) — публично на карточке и полный список в /company/promotions. */
export function usePromotions(companyId: string | undefined): UsePromotionsResult {
  const [items, setItems] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ items: Promotion[] }>(`/companies/${companyId}/promotions`);
      setItems(result.items);
    } catch {
      setError('Не удалось загрузить акции');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createPromotion = useCallback(
    async (input: PromotionInput) => {
      if (!companyId) throw new Error('companyId is required');
      const created = await apiRequest<Promotion>(`/companies/${companyId}/promotions`, {
        method: 'POST',
        body: input,
      });
      setItems((prev) => [created, ...prev]);
      return created;
    },
    [companyId],
  );

  const deletePromotion = useCallback(async (promotionId: string) => {
    await apiRequest(`/promotions/${promotionId}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((promotion) => promotion.id !== promotionId));
  }, []);

  return { items, isLoading, error, reload, createPromotion, deletePromotion };
}
