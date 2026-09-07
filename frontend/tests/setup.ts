// Общая настройка окружения тестов (jsdom) — например, полифиллы matchMedia/IntersectionObserver,
// которых нет в jsdom по умолчанию и которые нужны ThemeProvider/ScrollReveal (Framer Motion
// `whileInView`, см. src/components/common/ScrollReveal.tsx).
// Импортируем матчеры напрямую (а не `@testing-library/jest-dom/vitest`) — в npm workspaces
// jest-dom хоистится в корневой node_modules без соседнего vitest, из-за чего его встроенный
// vitest-автосетап не резолвится; матчеры без внутренней зависимости на vitest работают всегда.
import { expect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';

expect.extend(jestDomMatchers);

// Явно помечаем окружение как поддерживающее React `act()` — без testing-library, которая
// делает это автоматически, React иначе печатает предупреждения при async-обновлениях состояния
// внутри act() (см. AuthProvider.loadCurrentUser).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}
