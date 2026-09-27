// Надёжные касания. Когда страница повёрнута на 90° (горизонтальный режим в вертикальном окне), браузер иногда
// отдаёт касание не тому элементу. Поэтому элемент под пальцем определяем сами: document.elementFromPoint
// учитывает поворот и всегда возвращает то, что видно под пальцем.
export function pickAt(x: number, y: number, sel: string): HTMLElement | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  return (el?.closest(sel) as HTMLElement | null) || null;
}
// нажатие кнопки меню касанием: палец опустился и поднялся на одной и той же кнопке, почти не сдвинувшись
export function reliableTaps(root: HTMLElement, sel: string, activate: (el: HTMLElement) => void) {
  // три независимых источника (касания, указатель, клик) — срабатывает первый, повторы в течение 0,7 с отбрасываются
  type Down = { id: number; el: HTMLElement | null; x: number; y: number };
  let down: Down | null = null, tdown: Down | null = null, last = 0;
  const fire = (el: HTMLElement | null, d: { el: HTMLElement | null; x: number; y: number }, x: number, y: number) => {
    if (!d.el || Math.hypot(x - d.x, y - d.y) > 14) return;
    // палец не сдвинулся — жмём то, на что нажали; если окно успели перерисовать — такую же кнопку в новом окне
    let t: HTMLElement | null = d.el.isConnected ? d.el : null;
    if (!t) t = [...root.querySelectorAll<HTMLElement>(sel)].find(b => b.outerHTML === d.el!.outerHTML) || (el && el.outerHTML === d.el.outerHTML ? el : null);
    if (!t || !root.contains(t) || (t as HTMLButtonElement).disabled) return;
    if (performance.now() - last < 700) return; last = performance.now(); activate(t);
  };

  document.addEventListener('touchstart', e => { const t = e.changedTouches[0]; if (t) tdown = { id: t.identifier, el: pickAt(t.clientX, t.clientY, sel), x: t.clientX, y: t.clientY }; }, { capture: true, passive: true });
  document.addEventListener('touchend', e => { if (!tdown) return; for (const t of Array.from(e.changedTouches)) if (tdown && t.identifier === tdown.id) { fire(pickAt(t.clientX, t.clientY, sel), tdown, t.clientX, t.clientY); tdown = null; } }, { capture: true, passive: true });
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; down = { id: e.pointerId, el: pickAt(e.clientX, e.clientY, sel), x: e.clientX, y: e.clientY }; }, true);
  document.addEventListener('pointerup', e => {
    if (!down || e.pointerId !== down.id) return;
    fire(pickAt(e.clientX, e.clientY, sel), down, e.clientX, e.clientY); down = null;
  }, true);
  // обычный клик (мышь или касание, которое браузер распознал сам) — если только что не сработало касание
  root.addEventListener('click', e => { if (performance.now() - last < 700) return; const el = (e.target as HTMLElement).closest(sel) as HTMLElement | null; if (el && !(el as HTMLButtonElement).disabled) activate(el); });
}
