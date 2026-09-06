/**
 * Сборщик HTML-документа сайта (F5, F6, F7) — `assembleSiteDocument`.
 *
 * ГЛАВНОЕ АРХИТЕКТУРНОЕ РЕШЕНИЕ (docs/04-architecture.md §0, §4.4):
 * предпросмотр и экспорт — ОДИН И ТОТ ЖЕ вызов этой функции, разница
 * только в `options.mode` и только в косметике (см. ниже). Функция
 * чистая: не читает `window`/`matchMedia`/`localStorage`, вся
 * информация приходит через `project`.
 *
 * Документ полностью самостоятельный: инлайновые `<style>`/`<script>`,
 * ноль внешних `<link>`/`<script src="http…">`, только системные
 * шрифты — открывается и выглядит одинаково что в `<iframe srcDoc>`,
 * что при открытии сохранённого файла с диска (`file://`).
 */
import type { Project, Section, ThemeId } from "../types/project";
import type { AssembleOptions, AssembleSiteDocument, AssembledDocument, RenderContext } from "../types/render";
import { THEME_BY_ID } from "../content/themes";
import { escapeHtml, sectionRendererRegistry } from "./sectionRenderers";

/* ===================================================================== */
/* 1. Транскрипция --site-* переменных для каждой темы                    */
/* Источник: src/styles/site-themes.css (НЕ ТРОГАТЬ — оригинал шага 3).   */
/* Копия дословная: значения не редактируются, только переносятся сюда,  */
/* потому что экспортированный документ не может ссылаться на внешний    */
/* CSS-файл (F7: ноль внешних ссылок) и должен нести тему инлайново.     */
/* ===================================================================== */

const SITE_THEME_CSS_VARS: Readonly<Record<ThemeId, string>> = {
  atlant: `
    color-scheme: light;
    --site-bg: #f4f6f9; --site-surface: #ffffff; --site-surface-alt: #eaeff5;
    --site-text: #131b2e; --site-text-muted: #4b5668;
    --site-border: #d3d9e3; --site-border-strong: #7c8ba1;
    --site-accent: #1e4b8c; --site-accent-hover: #163a6e; --site-accent-ink: #ffffff; --site-accent-2: #4a7fc2;
    --site-success: #1e7a4c; --site-danger: #b3261e;
    --site-font-heading: Georgia, "Times New Roman", Cambria, serif;
    --site-font-body: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
    --site-heading-tracking: 0; --site-heading-transform: none;
    --site-text-xs: 0.75rem; --site-text-sm: 0.875rem; --site-text-base: 1rem;
    --site-text-lg: 1.25rem; --site-text-xl: 1.75rem; --site-text-2xl: 2.5rem;
    --site-radius-sm: 2px; --site-radius-md: 4px; --site-radius-lg: 6px; --site-space-unit: 6px;
    --site-shadow-sm: 0 1px 2px rgba(19, 27, 46, 0.08); --site-shadow-md: 0 6px 16px rgba(19, 27, 46, 0.1);
    --site-gradient-angle: 160deg; --site-gradient-start: #1e4b8c; --site-gradient-end: #10233f;
    --site-glass-bg: rgba(255, 255, 255, 0.6); --site-glass-border: rgba(19, 27, 46, 0.12); --site-glass-blur: 10px;
  `,
  remeslo: `
    color-scheme: light;
    --site-bg: #fbf3e7; --site-surface: #fffaf1; --site-surface-alt: #f3e4cf;
    --site-text: #3b2a1e; --site-text-muted: #7a6650;
    --site-border: #e7d6be; --site-border-strong: #a9865f;
    --site-accent: #b5502e; --site-accent-hover: #973f22; --site-accent-ink: #ffffff; --site-accent-2: #d9a441;
    --site-success: #2f7a3b; --site-danger: #b3261e;
    --site-font-heading: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    --site-font-body: "Trebuchet MS", Verdana, sans-serif;
    --site-heading-tracking: 0; --site-heading-transform: none;
    --site-text-xs: 0.8125rem; --site-text-sm: 0.9375rem; --site-text-base: 1.0625rem;
    --site-text-lg: 1.375rem; --site-text-xl: 1.875rem; --site-text-2xl: 2.75rem;
    --site-radius-sm: 8px; --site-radius-md: 14px; --site-radius-lg: 22px; --site-space-unit: 8px;
    --site-shadow-sm: 0 2px 6px rgba(59, 42, 30, 0.1); --site-shadow-md: 0 10px 24px rgba(59, 42, 30, 0.14);
    --site-gradient-angle: 135deg; --site-gradient-start: #b5502e; --site-gradient-end: #d9a441;
    --site-glass-bg: rgba(255, 250, 241, 0.65); --site-glass-border: rgba(59, 42, 30, 0.14); --site-glass-blur: 8px;
  `,
  impulse: `
    color-scheme: dark;
    --site-bg: #0b0e12; --site-surface: #121821; --site-surface-alt: #182230;
    --site-text: #e9f3ef; --site-text-muted: #93a7b2;
    --site-border: #223040; --site-border-strong: #4e6a82;
    --site-accent: #33e6b4; --site-accent-hover: #52f2c9; --site-accent-ink: #06110d; --site-accent-2: #8c7bff;
    --site-success: #3ddc97; --site-danger: #ff6b6b;
    --site-font-heading: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    --site-font-body: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --site-heading-tracking: 0.04em; --site-heading-transform: uppercase;
    --site-text-xs: 0.6875rem; --site-text-sm: 0.8125rem; --site-text-base: 0.9375rem;
    --site-text-lg: 1.1875rem; --site-text-xl: 1.625rem; --site-text-2xl: 2.25rem;
    --site-radius-sm: 0px; --site-radius-md: 2px; --site-radius-lg: 4px; --site-space-unit: 6px;
    --site-shadow-sm: 0 0 0 1px rgba(51, 230, 180, 0.08);
    --site-shadow-md: 0 12px 32px rgba(0, 0, 0, 0.55), 0 0 24px rgba(51, 230, 180, 0.12);
    --site-gradient-angle: 120deg; --site-gradient-start: #0b0e12; --site-gradient-end: #16324a;
    --site-glass-bg: rgba(18, 24, 33, 0.55); --site-glass-border: rgba(51, 230, 180, 0.25); --site-glass-blur: 14px;
  `,
  vozdukh: `
    color-scheme: light;
    --site-bg: #ffffff; --site-surface: #fafafa; --site-surface-alt: #f0f0f0;
    --site-text: #1a1a1a; --site-text-muted: #5e5e5e;
    --site-border: #e5e5e5; --site-border-strong: #8a8a8a;
    --site-accent: #d42e42; --site-accent-hover: #b71f32; --site-accent-ink: #ffffff; --site-accent-2: #1a1a1a;
    --site-success: #1e7a4c; --site-danger: #c22b3f;
    --site-font-heading: "Helvetica Neue", Helvetica, Arial, sans-serif;
    --site-font-body: "Helvetica Neue", Helvetica, Arial, sans-serif;
    --site-heading-tracking: -0.01em; --site-heading-transform: none;
    --site-text-xs: 0.8125rem; --site-text-sm: 1rem; --site-text-base: 1.125rem;
    --site-text-lg: 1.5rem; --site-text-xl: 2.25rem; --site-text-2xl: 3.25rem;
    --site-radius-sm: 4px; --site-radius-md: 8px; --site-radius-lg: 14px; --site-space-unit: 10px;
    --site-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06); --site-shadow-md: 0 8px 24px rgba(0, 0, 0, 0.08);
    --site-gradient-angle: 180deg; --site-gradient-start: #ffffff; --site-gradient-end: #f0f0f0;
    --site-glass-bg: rgba(255, 255, 255, 0.7); --site-glass-border: rgba(26, 26, 26, 0.1); --site-glass-blur: 12px;
  `,
  karnaval: `
    color-scheme: light;
    --site-bg: #fffdf6; --site-surface: #ffffff; --site-surface-alt: #fdf0f6;
    --site-text: #221926; --site-text-muted: #6b5b72;
    --site-border: #f0d9e6; --site-border-strong: #b87597;
    --site-accent: #d01b6b; --site-accent-hover: #b01059; --site-accent-ink: #ffffff; --site-accent-2: #e7a400;
    --site-success: #0b7a67; --site-danger: #d6304a;
    --site-font-heading: "Segoe UI Rounded", Verdana, sans-serif;
    --site-font-body: Verdana, Geneva, sans-serif;
    --site-heading-tracking: 0; --site-heading-transform: none;
    --site-text-xs: 0.875rem; --site-text-sm: 1rem; --site-text-base: 1.125rem;
    --site-text-lg: 1.5rem; --site-text-xl: 2.125rem; --site-text-2xl: 3rem;
    --site-radius-sm: 14px; --site-radius-md: 22px; --site-radius-lg: 32px; --site-space-unit: 10px;
    --site-shadow-sm: 0 3px 10px rgba(208, 27, 107, 0.14); --site-shadow-md: 0 14px 30px rgba(208, 27, 107, 0.18);
    --site-gradient-angle: 135deg; --site-gradient-start: #d01b6b; --site-gradient-end: #e7a400;
    --site-glass-bg: rgba(255, 255, 255, 0.55); --site-glass-border: rgba(208, 27, 107, 0.2); --site-glass-blur: 10px;
  `,
  barhat: `
    color-scheme: dark;
    --site-bg: #14110e; --site-surface: #1e1a15; --site-surface-alt: #26201a;
    --site-text: #f3ecdd; --site-text-muted: #c2b399;
    --site-border: #3a2f22; --site-border-strong: #7d6944;
    --site-accent: #c9a227; --site-accent-hover: #e0b94a; --site-accent-ink: #14110e; --site-accent-2: #8a6e2f;
    --site-success: #8fb06e; --site-danger: #e0847a;
    --site-font-heading: Georgia, Cambria, "Times New Roman", serif;
    --site-font-body: Candara, Optima, "Segoe UI", sans-serif;
    --site-heading-tracking: 0.06em; --site-heading-transform: none;
    --site-text-xs: 0.8125rem; --site-text-sm: 0.9375rem; --site-text-base: 1.0625rem;
    --site-text-lg: 1.375rem; --site-text-xl: 2rem; --site-text-2xl: 2.875rem;
    --site-radius-sm: 3px; --site-radius-md: 6px; --site-radius-lg: 10px; --site-space-unit: 8px;
    --site-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.45);
    --site-shadow-md: 0 18px 40px rgba(0, 0, 0, 0.55), 0 0 20px rgba(201, 162, 39, 0.1);
    --site-gradient-angle: 150deg; --site-gradient-start: #14110e; --site-gradient-end: #2c2210;
    --site-glass-bg: rgba(30, 26, 21, 0.55); --site-glass-border: rgba(201, 162, 39, 0.28); --site-glass-blur: 14px;
  `,
};

/* ===================================================================== */
/* 2. Базовые стили секций сайта (общие для всех тем, на токенах --site-*) */
/* ===================================================================== */

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: var(--site-bg);
    color: var(--site-text);
    font-family: var(--site-font-body);
    font-size: var(--site-text-base);
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  img, svg { max-width: 100%; display: block; }
  a { color: inherit; }
  ul { list-style: none; margin: 0; padding: 0; }
  h1, h2, h3 {
    font-family: var(--site-font-heading);
    letter-spacing: var(--site-heading-tracking);
    text-transform: var(--site-heading-transform);
    line-height: 1.15;
    margin: 0 0 calc(var(--site-space-unit) * 2);
    color: var(--site-text);
  }
  .site-heading-xl { font-size: var(--site-text-2xl); }
  .site-heading-lg { font-size: var(--site-text-xl); }
  .site-text { font-size: var(--site-text-base); color: var(--site-text); margin: 0 0 calc(var(--site-space-unit) * 2); }
  .site-text--lead { font-size: var(--site-text-lg); color: var(--site-text-muted); max-width: 60ch; }
  .site-container {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 calc(var(--site-space-unit) * 3);
    width: 100%;
  }
  .site-section--narrow { max-width: 760px; }
  .site-section { padding: calc(var(--site-space-unit) * 8) 0; overflow: hidden; }
  .site-section--alt { background: var(--site-surface-alt); }
  .site-section--cta { background: var(--site-surface-alt); text-align: center; }
  .site-section--cta .site-text--lead { margin-left: auto; margin-right: auto; }

  .site-hero { padding: calc(var(--site-space-unit) * 12) 0; background: var(--site-surface); }
  .site-hero__inner { display: flex; justify-content: center; }
  .site-hero__glass {
    max-width: 760px;
    text-align: center;
    padding: calc(var(--site-space-unit) * 4);
    border-radius: var(--site-radius-lg);
  }
  .site-hero__subtitle { font-size: var(--site-text-lg); color: var(--site-text-muted); margin: 0 0 calc(var(--site-space-unit) * 4); }
  .site-hero--effects {
    background: linear-gradient(var(--site-gradient-angle), var(--site-gradient-start), var(--site-gradient-end));
  }
  .site-hero--effects .site-heading-xl,
  .site-hero--effects .site-hero__subtitle { color: var(--site-accent-ink); }
  .site-hero--effects .site-hero__glass {
    background: var(--site-glass-bg);
    border: 1px solid var(--site-glass-border);
    backdrop-filter: blur(var(--site-glass-blur));
    -webkit-backdrop-filter: blur(var(--site-glass-blur));
    box-shadow: var(--site-shadow-md);
  }

  .site-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--site-space-unit) * 2) calc(var(--site-space-unit) * 4);
    border-radius: var(--site-radius-md);
    background: var(--site-accent);
    color: var(--site-accent-ink);
    font-weight: 600;
    text-decoration: none;
    border: none;
    cursor: pointer;
    font-size: var(--site-text-sm);
  }
  .site-btn:hover { background: var(--site-accent-hover); }

  .site-grid {
    display: grid;
    gap: calc(var(--site-space-unit) * 4);
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  }
  .site-card {
    background: var(--site-surface);
    border: 1px solid var(--site-border);
    border-radius: var(--site-radius-md);
    padding: calc(var(--site-space-unit) * 4);
    box-shadow: var(--site-shadow-sm);
  }
  .site-card__title { font-weight: 600; font-size: var(--site-text-lg); margin: 0 0 calc(var(--site-space-unit)); color: var(--site-text); }
  .site-card__meta { color: var(--site-text-muted); font-size: var(--site-text-sm); margin: 0; }
  .site-card__price { color: var(--site-accent); font-weight: 700; font-size: var(--site-text-lg); margin: 0; }
  .site-card--testimonial { display: flex; flex-direction: column; gap: calc(var(--site-space-unit) * 2); }
  .site-quote { font-size: var(--site-text-lg); font-style: italic; margin: 0; color: var(--site-text); }

  .site-gallery__tile {
    aspect-ratio: 4 / 3;
    border-radius: var(--site-radius-md);
    display: flex;
    align-items: flex-end;
    padding: calc(var(--site-space-unit) * 3);
    color: var(--site-accent-ink);
    font-weight: 600;
    font-size: var(--site-text-sm);
  }
  .site-gallery__tile--1 { background: linear-gradient(135deg, var(--site-accent), var(--site-accent-2)); }
  .site-gallery__tile--2 { background: linear-gradient(135deg, var(--site-accent-2), var(--site-accent)); }
  .site-gallery__tile--3 { background: linear-gradient(150deg, var(--site-border-strong), var(--site-accent)); }
  .site-gallery__tile--4 { background: linear-gradient(200deg, var(--site-accent), var(--site-border-strong)); }

  .site-footer { background: var(--site-surface-alt); border-top: 1px solid var(--site-border); padding: calc(var(--site-space-unit) * 5) 0; }
  .site-footer__title { font-family: var(--site-font-heading); font-size: var(--site-text-lg); margin: 0 0 calc(var(--site-space-unit)); }
  .site-footer__meta { color: var(--site-text-muted); font-size: var(--site-text-sm); margin: 0; }

  @media (max-width: 640px) {
    .site-container { padding: 0 calc(var(--site-space-unit) * 2); }
    .site-section { padding: calc(var(--site-space-unit) * 6) 0; }
    .site-hero { padding: calc(var(--site-space-unit) * 8) 0; }
  }
`;

/** CSS для скролл-анимаций появления и hover-переходов (F6) — добавляется только при `effectsEnabled`. */
const EFFECTS_CSS = `
  .site-card, .site-btn { transition: box-shadow 0.25s ease, transform 0.25s ease, background-color 0.2s ease; }
  .site-card:hover { box-shadow: var(--site-shadow-md); transform: translateY(-4px); }
  .site-btn:hover { transform: translateY(-2px); }
  [data-reveal] { opacity: 1; }
  [data-reveal].site-reveal-pending { opacity: 0; transform: translateY(28px); }
  [data-reveal].site-reveal-visible {
    opacity: 1;
    transform: none;
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
`;

/** Отключение анимаций появления и переходов при системной настройке (F6) — добавляется всегда, вне зависимости от effectsEnabled. */
const REDUCED_MOTION_CSS = `
  @media (prefers-reduced-motion: reduce) {
    [data-reveal].site-reveal-pending,
    [data-reveal].site-reveal-visible { opacity: 1 !important; transform: none !important; }
    * {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

/** Инлайновый скрипт скролл-анимаций (F6). Уважает reduced-motion и отсутствие IntersectionObserver. */
const EFFECTS_SCRIPT = `
(function () {
  "use strict";
  var prefersReduced = false;
  try {
    prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    prefersReduced = false;
  }
  var els = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (prefersReduced || !("IntersectionObserver" in window)) {
    els.forEach(function (el) { el.classList.add("site-reveal-visible"); });
    return;
  }
  els.forEach(function (el) { el.classList.add("site-reveal-pending"); });
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove("site-reveal-pending");
          entry.target.classList.add("site-reveal-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
  );
  els.forEach(function (el) { io.observe(el); });
})();
`;

function buildStyle(project: Project): string {
  const themeVars = SITE_THEME_CSS_VARS[project.themeId];
  const effects = project.effectsEnabled ? EFFECTS_CSS : "";
  return `
    [data-site-theme="${project.themeId}"] {${themeVars}}
    ${BASE_CSS}
    ${effects}
    ${REDUCED_MOTION_CSS}
  `;
}

function buildBody(project: Project): string {
  const theme = THEME_BY_ID[project.themeId];
  const ctx: RenderContext = {
    theme,
    effectsEnabled: project.effectsEnabled,
    industry: project.industry,
  };
  const visibleSections = [...project.sections]
    .filter((section) => section.visible)
    .sort((a, b) => a.order - b.order);

  return visibleSections
    .map((section: Section) => sectionRendererRegistry[section.type](section, ctx))
    .join("\n");
}

/**
 * Собирает документ сайта из проекта (F5, F6, F7). Реализует пункты
 * контракта `AssembleSiteDocument` (src/types/render.ts):
 * 1. Рендерит только видимые секции, в порядке `order`.
 * 2. Инлайнит CSS темы (`project.themeId`) + базовые стили + reduced-motion.
 * 3. Добавляет CSS/JS скролл-анимаций и hover-переходов, только если
 *    `project.effectsEnabled` — при выключенном тумблере эффекты
 *    отсутствуют в документе целиком, а не просто визуально приглушены.
 * 4. Ноль внешних `<link>`/`<script src="http…">` — только системные
 *    шрифты и инлайновый код.
 * 5. Чистая функция — не читает `window`/`matchMedia`/`localStorage`.
 */
export const assembleSiteDocument: AssembleSiteDocument = (
  project: Project,
  options: AssembleOptions,
): AssembledDocument => {
  const title = project.name.trim().length > 0 ? project.name : "Сайт без названия";
  const style = buildStyle(project);
  const body = buildBody(project);
  const script = project.effectsEnabled ? `<script>${EFFECTS_SCRIPT}</script>` : "";
  const generatorMeta = options.mode === "export" ? '\n    <meta name="generator" content="NoesDize">' : "";

  const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>${generatorMeta}
    <style>${style}</style>
  </head>
  <body data-site-theme="${project.themeId}">
    ${body}
    ${script}
  </body>
</html>`;

  return { html, title };
};
