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

/**
 * jsdom не реализует `ResizeObserver`. Нужен кадру предпросмотра
 * (`src/hooks/useContainerWidth.ts`, F5) для расчёта коэффициента
 * `transform: scale`. Тестовая заглушка не эмулирует реальные события
 * ресайза — этого достаточно для рендер-тестов компонентов, где ширина
 * контейнера не проверяется напрямую.
 */
if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  // @ts-expect-error -- минимальная тестовая заглушка, не полная реализация DOM-интерфейса.
  window.ResizeObserver = ResizeObserverStub;
}

/**
 * jsdom не реализует `URL.createObjectURL`/`revokeObjectURL`. Нужен
 * экспорту (F7, `src/routes/EditorScreen.tsx`) для скачивания собранного
 * `.html`-файла через `Blob` + `<a download>`.
 */
if (typeof URL !== "undefined" && typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock-url";
}
if (typeof URL !== "undefined" && typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = () => {};
}
