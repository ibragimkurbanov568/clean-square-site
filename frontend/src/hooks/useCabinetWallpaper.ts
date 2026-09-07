import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'cleanlink-wallpaper:';

/**
 * Выбранный фон кабинета компании (допущение 12 ТЗ). Контракт `docs/04-architecture.md` §4.1
 * не отдаёт `wallpaperUrl` в `CurrentUser` (только БД-колонка на бэкенде, §5.1 п.3) — выбор
 * сохраняется на клиенте (localStorage) до появления соответствующего API-поля.
 */
export function useCabinetWallpaper(userId: string | undefined) {
  const key = userId ? `${STORAGE_PREFIX}${userId}` : null;
  const [wallpaperUrl, setWallpaperUrlState] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    setWallpaperUrlState(window.localStorage.getItem(key));
  }, [key]);

  const setWallpaperUrl = useCallback(
    (url: string) => {
      if (!key) return;
      window.localStorage.setItem(key, url);
      setWallpaperUrlState(url);
    },
    [key],
  );

  return { wallpaperUrl, setWallpaperUrl };
}
