/**
 * Заглушка экрана "/" — стартовый список проектов.
 *
 * ЗОНА ШАГА 6 (фронтенд). Реализовать здесь состояния «Пустое /
 * Загрузка / Ошибка / Обычное / Много данных» из docs/02-ux.md,
 * раздел «Стартовый список проектов». Источник данных —
 * `ProjectStore` (src/lib/storage.ts, шаг 5) через тип
 * `ProjectStore`/`ProjectSummary` из `../types`.
 *
 * Chrome-элементы (шапка, карточки, кнопки, баннер ошибки) стилизуются
 * только через `var(--nd-*)` из src/styles/tokens.css — см.
 * docs/03-design-system.md, §0.
 */
export default function StartScreen() {
  return (
    <main style={{ padding: "var(--nd-space-8)" }}>
      <h1 className="nd-heading-xl">NoesDize</h1>
      <p className="nd-text-muted">
        Стартовый список проектов — экран ещё не реализован (шаг 6).
      </p>
    </main>
  );
}
