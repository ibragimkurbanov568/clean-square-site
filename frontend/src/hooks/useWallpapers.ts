import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';

/** Галерея предустановленных обоев (допущение 12 ТЗ) — GET /api/uploads/wallpapers. */
export function useWallpapers() {
  const [presets, setPresets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    apiRequest<{ presets: string[] }>('/uploads/wallpapers')
      .then((result) => setPresets(result.presets))
      .catch(() => setPresets([]))
      .finally(() => setIsLoading(false));
  }, []);

  return { presets, isLoading };
}
