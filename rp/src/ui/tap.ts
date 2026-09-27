// Надёжные касания. Когда страница повёрнута на 90° (горизонтальный режим в вертикальном окне), браузер иногда
// отдаёт касание не тому элементу. Поэтому элемент под пальцем определяем сами: document.elementFromPoint
// учитывает поворот и всегда возвращает то, что видно под пальцем.
export function pickAt(x: number, y: number, sel: string): HTMLElement | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  return (el?.closest(sel) as HTMLElement | null) || null;
}
// нажатие кнопки меню касанием: палец опустился и поднялся на одной и той же кнопке, почти не сдвинувшись
export function reliableTaps(root: HTMLElement, sel: string, activate: (el: HTMLElement) => void) {
  let down: { id: number; el: HTMLElement | null; x: number; y: number } | null = null, last = 0;
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; down = { id: e.pointerId, el: pickAt(e.clientX, e.clientY, sel), x: e.clientX, y: e.clientY }; }, true);
  document.addEventListener('pointerup', e => {
    if (!down || e.pointerId !== down.id) return;
    const el = pickAt(e.clientX, e.clientY, sel), still = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 14;
    if (el && el === down.el && still && root.contains(el) && !(el as HTMLButtonElement).disabled) { last = performance.now(); activate(el); }
    down = null;
  }, true);
  // обычный клик (мышь или касание, которое браузер распознал сам) — если только что не сработало касание
  root.addEventListener('click', e => { if (performance.now() - last < 700) return; const el = (e.target as HTMLElement).closest(sel) as HTMLElement | null; if (el && !(el as HTMLButtonElement).disabled) activate(el); });
}
