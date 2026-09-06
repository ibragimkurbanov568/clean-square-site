/**
 * Контракт темы оформления сайта (F4). Значения (палитра, шрифты)
 * заполняются в src/content/themes.ts (шаг 5), это только форма.
 *
 * Палитра здесь — HEX-снимок тех же значений, что уже объявлены как
 * CSS custom properties `--site-*` в src/styles/site-themes.css.
 * Дублирование сознательное: карточка проекта на стартовом экране
 * (F8) рисует цветную плашку темы через inline-style ДО того, как в
 * DOM появится узел с `data-site-theme` (см. design-system §3.3) —
 * то есть нужны голые HEX-значения в JS, а не только CSS-переменные.
 * `id` в этом типе обязан дословно совпадать со значением
 * `data-site-theme` в site-themes.css — это единственная связь между
 * двумя источниками, и её обязано проверять юнит-тестом (см.
 * `src/content/themes.test.ts`, шаг 5).
 */
import type { ThemeId } from "./project";

export type ThemeMode = "light" | "dark";

export interface ThemePalette {
  background: string;
  surface: string;
  text: string;
  primary: string;
  accent: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
}

export interface Theme {
  id: ThemeId;
  /** Русское имя темы, как оно показывается в сетке образцов (F4). */
  name: string;
  mode: ThemeMode;
  palette: ThemePalette;
  fonts: ThemeFonts;
}

/** Порядок отображения в сетке образцов темы (вкладка «Настройки»). */
export const THEME_IDS: readonly ThemeId[] = [
  "atlant",
  "remeslo",
  "impulse",
  "vozdukh",
  "karnaval",
  "barhat",
];
