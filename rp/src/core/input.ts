// Ввод: клавиатура + мышь (pointer lock), геймпад, сенсорный экран (джойстик и кнопки)
import { clamp, damp } from './util';

type Btn = 'jump' | 'sprint' | 'use' | 'enter' | 'hb' | 'horn' | 'cam' | 'phone' | 'map' | 'lights' | 'nitro' | 'attack';
export const Inp = {
  keys: new Set<string>(),
  pressed: new Set<string>(),
  // оси: move — ходьба (x вправо, y вперёд), steer/gas/brake — машина
  mx: 0, my: 0, lookX: 0, lookY: 0, steer: 0, gas: 0, brake: 0,
  btn: {} as Record<Btn, boolean>,
  tap: {} as Record<Btn, boolean>,
  touch: false, locked: false, wheel: 0,
  joy: { id: -1, x0: 0, y0: 0, x: 0, y: 0 }, look: { id: -1, x: 0, y: 0 },
  tb: {} as Record<string, boolean>,
};
const KEYMAP: Record<string, Btn> = { Space: 'jump', ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyE: 'use', KeyF: 'enter', KeyH: 'horn', KeyC: 'cam', KeyP: 'phone', KeyM: 'map', KeyL: 'lights', KeyN: 'nitro' };

export function initInput(canvas: HTMLCanvasElement) {
  addEventListener('keydown', e => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (!e.repeat) Inp.pressed.add(e.code);
    Inp.keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', e => Inp.keys.delete(e.code));
  addEventListener('blur', () => Inp.keys.clear());
  canvas.addEventListener('click', () => { if (!Inp.touch && document.pointerLockElement !== canvas) canvas.requestPointerLock?.()?.catch?.(() => { /* ок: без захвата мыши */ }); });
  document.addEventListener('pointerlockchange', () => { Inp.locked = document.pointerLockElement === canvas; });
  addEventListener('mousemove', e => { if (Inp.locked) { Inp.lookX += e.movementX; Inp.lookY += e.movementY; } });
  addEventListener('mousedown', e => { if (Inp.locked && e.button === 0) Inp.pressed.add('Mouse0'); });
  addEventListener('wheel', e => { Inp.wheel += Math.sign(e.deltaY); }, { passive: true });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('touchstart', () => { if (!Inp.touch) { Inp.touch = true; document.body.classList.add('touch'); } }, { passive: true });
  // сенсорное управление: левая половина — джойстик, правая — обзор
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    if (e.clientX < innerWidth * .45 && Inp.joy.id < 0) { Inp.joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; }
    else if (Inp.look.id < 0) Inp.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  addEventListener('pointermove', e => {
    if (e.pointerId === Inp.joy.id) { Inp.joy.x = e.clientX; Inp.joy.y = e.clientY; }
    if (e.pointerId === Inp.look.id) { Inp.lookX += (e.clientX - Inp.look.x) * 1.6; Inp.lookY += (e.clientY - Inp.look.y) * 1.6; Inp.look.x = e.clientX; Inp.look.y = e.clientY; }
  });
  const up = (e: PointerEvent) => { if (e.pointerId === Inp.joy.id) Inp.joy.id = -1; if (e.pointerId === Inp.look.id) Inp.look.id = -1; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
// кнопки сенсорного интерфейса вызывают это
export function touchBtn(name: string, on: boolean) { Inp.tb[name] = on; if (on) Inp.pressed.add('T_' + name); }

let padPrev: boolean[] = [];
export function pollInput(dt: number) {
  const k = Inp.keys, tb = Inp.tb;
  let mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  let my = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  if (Inp.joy.id >= 0) { const dx = Inp.joy.x - Inp.joy.x0, dy = Inp.joy.y - Inp.joy.y0, r = 55; mx = clamp(dx / r, -1, 1); my = clamp(-dy / r, -1, 1); }
  const btn = Inp.btn, tap = Inp.tap;
  for (const b of Object.values(KEYMAP)) { btn[b] = false; tap[b] = false; }
  for (const [code, b] of Object.entries(KEYMAP)) { if (k.has(code)) btn[b] = true; if (Inp.pressed.has(code)) tap[b] = true; }
  for (const b of ['jump', 'sprint', 'use', 'enter', 'hb', 'horn', 'cam', 'phone', 'map', 'lights', 'nitro', 'attack'] as Btn[]) { if (tb[b]) btn[b] = true; if (Inp.pressed.has('T_' + b)) tap[b] = true; }
  if (Inp.pressed.has('Mouse0')) tap.attack = true;
  btn.hb = btn.hb || k.has('Space');
  let gas = my > 0 ? my : 0, brake = my < 0 ? -my : 0, steer = mx;
  if (tb.gas) gas = 1; if (tb.brake) brake = 1; if (tb.left) steer = -1; if (tb.right) steer = 1;
  // геймпад: левый стик, RT/LT, кнопки
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p && p.connected) {
    const ax = (i: number) => (Math.abs(p.axes[i] || 0) > .15 ? p.axes[i] : 0), bv = (i: number) => (p.buttons[i] ? p.buttons[i].value || (p.buttons[i].pressed ? 1 : 0) : 0);
    if (ax(0) || ax(1)) { mx = ax(0); my = -ax(1); steer = ax(0); }
    Inp.lookX += ax(2) * 14; Inp.lookY += ax(3) * 10;
    gas = Math.max(gas, bv(7)); brake = Math.max(brake, bv(6));
    const map: [number, Btn][] = [[0, 'jump'], [1, 'enter'], [2, 'use'], [3, 'cam'], [8, 'map'], [9, 'phone'], [10, 'sprint'], [5, 'nitro'], [4, 'horn']];
    for (const [i, b] of map) { const on = bv(i) > .5; if (on) btn[b] = true; if (on && !padPrev[i]) tap[b] = true; padPrev[i] = on; }
    if (btn.jump) btn.hb = true;
    break;
  }
  Inp.mx = mx; Inp.my = my; Inp.gas = gas; Inp.brake = brake;
  Inp.steer = Math.abs(steer) < 1 && steer !== 0 && Inp.joy.id < 0 ? steer : damp(Inp.steer, steer, steer === 0 ? 9 : 6, dt);
}
export function endFrameInput() { Inp.pressed.clear(); Inp.lookX = 0; Inp.lookY = 0; Inp.wheel = 0; }
