// Общая настройка окружения тестов (jsdom) — например, полифиллы matchMedia, которых нет в jsdom
// по умолчанию и которые нужны ThemeProvider (см. src/context/ThemeContext.tsx).

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
