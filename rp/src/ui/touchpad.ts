// Сенсорное управление на Touch Events — так, как надёжно работает на iPhone.
// Почему не Pointer Events: на iOS система, увидев движение пальца, считает его жестом (прокрутка, закрытие окна)
// и присылает pointercancel — джойстик «отпускается» через доли секунды, персонаж стоит. Здесь во время игры
// мы сами забираем касания (preventDefault на touchstart/touchmove), и каждый палец ведём по его identifier.
// Левая часть экрана — джойстик на 360° (появляется под пальцем), правая — поворот камеры, кнопки — по месту.
import { Inp, touchBtn } from '../core/input';
import { Screen } from '../core/screen';
import { pickAt } from './tap';

type Role = { k: 'joy' } | { k: 'look'; x: number; y: number } | { k: 'btn'; el: HTMLElement } | { k: 'none' };
export const Touchpad = {
  roles: new Map<number, Role>(), enabled: false, onMini: null as null | (() => void), events: 0,
  init() {
    if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return;
    this.enabled = true; Inp.touchEvents = true;
    const opt: AddEventListenerOptions = { passive: false, capture: true };
    document.addEventListener('touchstart', e => this.start(e), opt);
    document.addEventListener('touchmove', e => this.move(e), opt);
    document.addEventListener('touchend', e => this.end(e), opt);
    document.addEventListener('touchcancel', e => this.end(e), opt);
  },
  // игра на экране и никакое окно не открыто — касания наши; иначе их обрабатывает браузер (кнопки меню, прокрутка)
  gameOwns() { return document.body.classList.contains('playing') && !document.querySelector('#ui .screen, #ui .phone'); },
  start(e: TouchEvent) {
    this.events++;
    if (!Inp.touch) { Inp.touch = true; document.body.classList.add('touch'); }
    if (!this.gameOwns()) return;
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const btn = pickAt(t.clientX, t.clientY, '#touch .tb');
      if (btn && !btn.classList.contains('hide')) { this.roles.set(t.identifier, { k: 'btn', el: btn }); btn.classList.add('on'); touchBtn(btn.dataset.b!, true); continue; }
      if (pickAt(t.clientX, t.clientY, '#mini')) { this.roles.set(t.identifier, { k: 'none' }); this.onMini?.(); continue; }
      const [x, y] = Screen.toStage(t.clientX, t.clientY);
      if (x < Screen.w * .45 && Inp.joy.id < 0) {
        // центр джойстика — под пальцем, но так, чтобы круг целиком помещался на экране
        const x0 = Math.max(70, x), y0 = Math.min(Screen.h - 70, Math.max(70, y));
        Inp.joy = { id: 100000 + t.identifier, x0, y0, x, y }; this.roles.set(t.identifier, { k: 'joy' });
      } else this.roles.set(t.identifier, { k: 'look', x, y });
    }
  },
  move(e: TouchEvent) {
    this.events++;
    if (!this.roles.size) return;
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      const r = this.roles.get(t.identifier); if (!r) continue;
      const [x, y] = Screen.toStage(t.clientX, t.clientY);
      if (r.k === 'joy') { Inp.joy.x = x; Inp.joy.y = y; }
      else if (r.k === 'look') { Inp.lookX += (x - r.x) * 1.6; Inp.lookY += (y - r.y) * 1.6; r.x = x; r.y = y; }
      else if (r.k === 'btn') {
        // палец съехал с кнопки на соседнюю — переключаем (удобно для газ/тормоз)
        const el = pickAt(t.clientX, t.clientY, '#touch .tb');
        if (el && el !== r.el && !el.classList.contains('hide')) { this.release(r.el, t.identifier); r.el = el; el.classList.add('on'); touchBtn(el.dataset.b!, true); }
      }
    }
  },
  end(e: TouchEvent) {
    this.events++;
    for (const t of Array.from(e.changedTouches)) {
      const r = this.roles.get(t.identifier); if (!r) continue; this.roles.delete(t.identifier);
      if (r.k === 'joy') { Inp.joy.id = -1; Inp.run = false; }
      if (r.k === 'btn') this.release(r.el, t.identifier);
    }
    if (this.gameOwns() && e.cancelable) e.preventDefault(); // без «кликов-призраков» после касания
  },
  release(el: HTMLElement, id: number) {
    for (const [k, r] of this.roles) if (k !== id && r.k === 'btn' && r.el === el) return; // ещё держит другой палец
    el.classList.remove('on'); touchBtn(el.dataset.b!, false);
  },
  // открылось окно (телефон, меню) — отпускаем всё, что держали
  reset() { for (const [id, r] of this.roles) if (r.k === 'btn') this.release(r.el, id); this.roles.clear(); Inp.joy.id = -1; Inp.run = false; },
};
