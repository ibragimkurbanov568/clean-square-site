/**
 * Заглушка экрана "/editor/:id" — редактор + предпросмотр.
 *
 * ЗОНА ШАГА 6 (фронтенд). Самый крупный экран приложения — вся
 * раскладка, вкладки, диалоги и адаптивность описаны в
 * docs/02-ux.md, раздел «Редактор + предпросмотр».
 *
 * Ключевой момент: кадр предпросмотра — это `<iframe>`, чей `srcDoc`
 * равен `assembleSiteDocument(project, { mode: "preview" }).html`
 * (контракт в src/types/render.ts, реализация в
 * src/lib/pageAssembler.ts, шаг 5). Не реализовывать рендер секций
 * второй раз через JSX — тогда потеряется гарантия «предпросмотр
 * идентичен экспорту» (F7).
 */
export default function EditorScreen() {
  return (
    <main style={{ padding: "var(--nd-space-8)" }}>
      <h1 className="nd-heading-xl">Редактор</h1>
      <p className="nd-text-muted">
        Редактор и предпросмотр — экран ещё не реализован (шаг 6).
      </p>
    </main>
  );
}
