/**
 * Данные шести тем оформления сайтов (F4). HEX-снимок для карточки
 * проекта (см. `src/types/theme.ts` — используется ДО применения
 * `data-site-theme` к DOM). Значения дословно транскрибированы из
 * `docs/03-design-system.md` §2.1 и `src/styles/site-themes.css` —
 * `themes.test.ts` проверяет соответствие `id` набору `THEME_IDS`.
 *
 * Полный набор CSS custom properties (радиусы, тени, градиенты,
 * типографическая шкала) для сборки итогового документа живёт
 * отдельно в `src/lib/pageAssembler.ts` (`SITE_THEME_CSS_VARS`) — это
 * не часть контракта `Theme` (в нём только палитра+шрифты для
 * превью-плашки), пересобирать её здесь незачем.
 */
import type { ThemeId } from "../types/project";
import type { Theme } from "../types/theme";
import { THEME_IDS } from "../types/theme";

export const THEMES: Readonly<Record<ThemeId, Theme>> = {
  atlant: {
    id: "atlant",
    name: "Атлант",
    mode: "light",
    palette: {
      background: "#f4f6f9",
      surface: "#ffffff",
      text: "#131b2e",
      primary: "#1e4b8c",
      accent: "#4a7fc2",
    },
    fonts: {
      heading: 'Georgia, "Times New Roman", Cambria, serif',
      body: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
    },
  },
  remeslo: {
    id: "remeslo",
    name: "Ремесло",
    mode: "light",
    palette: {
      background: "#fbf3e7",
      surface: "#fffaf1",
      text: "#3b2a1e",
      primary: "#b5502e",
      accent: "#d9a441",
    },
    fonts: {
      heading: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
      body: '"Trebuchet MS", Verdana, sans-serif',
    },
  },
  impulse: {
    id: "impulse",
    name: "Импульс",
    mode: "dark",
    palette: {
      background: "#0b0e12",
      surface: "#121821",
      text: "#e9f3ef",
      primary: "#33e6b4",
      accent: "#8c7bff",
    },
    fonts: {
      heading: "ui-monospace, SFMono-Regular, Consolas, \"Liberation Mono\", Menlo, monospace",
      body: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  },
  vozdukh: {
    id: "vozdukh",
    name: "Воздух",
    mode: "light",
    palette: {
      background: "#ffffff",
      surface: "#fafafa",
      text: "#1a1a1a",
      primary: "#d42e42",
      accent: "#1a1a1a",
    },
    fonts: {
      heading: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      body: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    },
  },
  karnaval: {
    id: "karnaval",
    name: "Карнавал",
    mode: "light",
    palette: {
      background: "#fffdf6",
      surface: "#ffffff",
      text: "#221926",
      primary: "#d01b6b",
      accent: "#e7a400",
    },
    fonts: {
      heading: '"Segoe UI Rounded", Verdana, sans-serif',
      body: "Verdana, Geneva, sans-serif",
    },
  },
  barhat: {
    id: "barhat",
    name: "Бархат",
    mode: "dark",
    palette: {
      background: "#14110e",
      surface: "#1e1a15",
      text: "#f3ecdd",
      primary: "#c9a227",
      accent: "#8a6e2f",
    },
    fonts: {
      heading: 'Georgia, Cambria, "Times New Roman", serif',
      body: 'Candara, Optima, "Segoe UI", sans-serif',
    },
  },
};

/** Массив тем в порядке сетки образцов (F4), удобный для .map() в UI. */
export const THEME_LIST: readonly Theme[] = THEME_IDS.map((id) => THEMES[id]);
