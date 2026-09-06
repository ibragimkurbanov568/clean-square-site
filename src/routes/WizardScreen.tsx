/**
 * Заглушка экрана "/new" — мастер создания проекта (F1).
 *
 * ЗОНА ШАГА 6 (фронтенд). Форма имени + чипы отрасли/тона +
 * валидация из docs/02-ux.md, раздел «Мастер создания». По кнопке
 * «Создать сайт» вызвать `CreateProject` (сигнатура в
 * src/types/generator.ts, реализация в src/lib/projectFactory.ts,
 * шаг 5), сохранить через `ProjectStore.saveProject`, перейти на
 * `/editor/:id`.
 */
export default function WizardScreen() {
  return (
    <main style={{ padding: "var(--nd-space-8)" }}>
      <h1 className="nd-heading-xl">Новый сайт</h1>
      <p className="nd-text-muted">
        Мастер создания — экран ещё не реализован (шаг 6).
      </p>
    </main>
  );
}
