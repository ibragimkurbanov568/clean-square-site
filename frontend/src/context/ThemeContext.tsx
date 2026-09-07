import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

/** Три темы оформления (F11) — имена совпадают с `data-theme` в docs/tokens/design-tokens.css. */
export type Theme = 'dark' | 'gradient' | 'classic';

export const THEME_STORAGE_KEY = 'cleanlink-theme';
export const THEMES: readonly Theme[] = ['dark', 'gradient', 'classic'];

export interface ThemeContextValue {
  theme: Theme;
  /** Явный ли выбор пользователя (true) или пока используется системный дефолт (false). */
  isExplicit: boolean;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(stored as Theme) ? (stored as Theme) : null;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

/**
 * ThemeProvider — переключает `data-theme` на `<html>`, сохраняет выбор в localStorage,
 * применяется до первой отрисовки (см. инлайн-скрипт в index.html, который уже выставил
 * атрибут синхронно; здесь состояние React синхронизируется с уже применённым атрибутом,
 * чтобы не было двойного/мигающего рендера — F11, docs/02-ux.md §6).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = readStoredTheme();
    if (stored) return stored;
    return systemPrefersDark() ? 'dark' : 'classic';
  });
  const [isExplicit, setIsExplicit] = useState<boolean>(() => readStoredTheme() !== null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setIsExplicit(true);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage недоступен — тема всё равно применится на текущей сессии.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isExplicit, setTheme }),
    [theme, isExplicit, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
