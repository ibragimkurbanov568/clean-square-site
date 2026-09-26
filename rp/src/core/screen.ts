// Экран и ориентация. Игра на телефоне — горизонтальная (как GTA на мобильных). Если телефон держат вертикально
// (а встроенное окно приложения часто не поворачивается), вся страница поворачивается на 90° средствами CSS,
// а координаты касаний пересчитываются в систему «сцены».
export type Orient = 'auto' | 'land' | 'free';
export const Screen = {
  w: 1280, h: 720, rot: false, mode: 'auto' as Orient, touch: false,
  listeners: [] as (() => void)[],
  set(mode: Orient) { this.mode = mode; this.update(); },
  update() {
    const W = innerWidth, H = innerHeight, portrait = H > W;
    this.rot = portrait && this.touch && this.mode !== 'free';
    this.w = this.rot ? H : W; this.h = this.rot ? W : H;
    const s = document.documentElement.style; s.setProperty('--sw', W + 'px'); s.setProperty('--sh', H + 'px'); s.setProperty('--vw', this.w / 100 + 'px'); s.setProperty('--vh', this.h / 100 + 'px');
    document.documentElement.classList.toggle('rot', this.rot);
    for (const f of this.listeners) f();
  },
  // координаты касания (экран) → координаты сцены
  toStage(x: number, y: number): [number, number] { return this.rot ? [y, innerWidth - x] : [x, y]; },
  onChange(f: () => void) { this.listeners.push(f); },
  init() { this.touch = matchMedia('(pointer:coarse)').matches; this.update(); addEventListener('resize', () => this.update()); addEventListener('orientationchange', () => setTimeout(() => this.update(), 250)); },
};
