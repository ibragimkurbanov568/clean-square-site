/**
 * Общий Vitest setup (подключается через `test.setupFiles` в
 * vite.config.ts). Используется тестами и шага 5 (jsdom даёт
 * `localStorage` для тестов src/lib/storage.ts), и шага 6
 * (jest-dom матчеры для тестов компонентов).
 */
import "@testing-library/jest-dom/vitest";

/**
 * jsdom не реализует `window.matchMedia`. Он нужен для проверки
 * `prefers-reduced-motion: reduce` (F6) в компонентных тестах.
 * Мок по умолчанию отвечает "не совпадает" (matches: false) — тесты,
 * которым нужен reduced-motion, переопределяют его локально.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
