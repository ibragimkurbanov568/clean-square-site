// «Жизнь»: достижения, ежедневные задания, спрятанные матрёшки. Только данные и правила — без Three.js,
// поэтому всё проверяется тестами.
import { City, CITY, blockRect, HALF } from '../world/citygen';
import { mulberry32 } from '../core/util';
import type { GameState } from './state';

// ---------- достижения ----------
export interface Ach { id: string; name: string; desc: string; icon: string; test: (s: GameState) => boolean; reward: number }
const A = (id: string, icon: string, name: string, desc: string, reward: number, test: (s: GameState) => boolean): Ach => ({ id, icon, name, desc, reward, test });
const jobs = (s: GameState, id?: string) => id ? s.job.done[id] || 0 : Object.values(s.job.done).reduce((a, b) => a + b, 0);
export const ACHIEVEMENTS: Ach[] = [
  A('first_job', '💼', 'Первая смена', 'Выполнить любое задание на работе', 300, s => jobs(s) >= 1),
  A('worker', '🛠', 'Трудяга', 'Выполнить 25 заданий', 2000, s => jobs(s) >= 25),
  A('courier', '📦', 'Почтальон Печкин', '10 доставок курьером', 1000, s => jobs(s, 'courier') >= 10),
  A('loader', '⚓', 'Докер', '10 смен грузчиком', 1000, s => jobs(s, 'loader') >= 10),
  A('taxi', '🚕', 'Шеф, свободен?', '10 поездок в такси', 1500, s => jobs(s, 'taxi') >= 10),
  A('km10', '🛣', 'Водитель', 'Проехать 10 км', 500, s => s.stats.distance >= 10000),
  A('km100', '🏁', 'Дальнобойщик', 'Проехать 100 км', 5000, s => s.stats.distance >= 100000),
  A('car', '🚗', 'Своя машина', 'Купить машину', 1000, s => s.cars.length >= 1),
  A('garage', '🏎', 'Коллекционер', 'Владеть тремя машинами', 5000, s => s.cars.length >= 3),
  A('license', '🪪', 'Права в кармане', 'Получить права категории B', 500, s => s.licenses.B),
  A('rich', '💰', 'Сотка', 'Иметь 100 000 ₽ (наличные + карта)', 3000, s => s.money + s.bank >= 100000),
  A('million', '💎', 'Миллионер', 'Заработать за всё время 1 000 000 ₽', 25000, s => s.stats.earned >= 1000000),
  A('lvl5', '⭐', 'Свой человек', 'Достичь 5 уровня', 1500, s => s.level >= 5),
  A('lvl10', '🌟', 'Уважаемый житель', 'Достичь 10 уровня', 5000, s => s.level >= 10),
  A('fish1', '🎣', 'Первый улов', 'Поймать рыбу', 200, s => s.stats.fish >= 1),
  A('fish20', '🐟', 'Рыбак', 'Поймать 20 рыб', 2000, s => s.stats.fish >= 20),
  A('pike', '🐊', 'Щучье веление', 'Поймать щуку', 1000, s => s.stats.pike >= 1),
  A('collect10', '🪆', 'Искатель', 'Найти 10 матрёшек', 2000, s => s.collect.length >= 10),
  A('collectAll', '🏆', 'Все матрёшки города', 'Найти все 30 матрёшек', 20000, s => s.collect.length >= COLLECT_N),
  A('gourmet', '🍽', 'Гурман', 'Попробовать 10 разных блюд', 1000, s => Object.keys(s.tasted).length >= 10),
  A('lucky', '🍀', 'Везунчик', 'Выиграть в лотерею 1 000 ₽ и больше', 500, s => s.stats.bigWin >= 1000),
  A('daily', '📅', 'Каждый день', 'Выполнить 10 ежедневных заданий', 3000, s => s.stats.dailyDone >= 10),
];
// новые достижения (и награда) — вызывается раз в секунду
export function checkAchievements(s: GameState): Ach[] {
  const got: Ach[] = [];
  for (const a of ACHIEVEMENTS) if (!s.ach[a.id] && a.test(s)) { s.ach[a.id] = true; s.money += a.reward; got.push(a); }
  return got;
}

// ---------- ежедневные задания ----------
export type DailyKind = 'eat' | 'drive' | 'jobs' | 'fish' | 'walk' | 'buy' | 'collect';
export interface Daily { kind: DailyKind; goal: number; prog: number; done: boolean; reward: number; text: string }
const TEMPL: [DailyKind, number[], string, number][] = [
  ['eat', [2, 3], 'Поесть {n} раза', 400], ['drive', [2000, 4000], 'Проехать {k} км', 800], ['jobs', [2, 4], 'Выполнить {n} заданий на работе', 1500],
  ['fish', [1, 3], 'Поймать рыбу: {n}', 700], ['walk', [800, 1500], 'Пройти пешком {k} км', 500], ['buy', [3, 5], 'Сделать {n} покупок', 400], ['collect', [1, 1], 'Найти матрёшку', 1500],
];
export function makeDaily(day: number): Daily[] {
  const r = mulberry32(day * 7919 + 13), pool = [...TEMPL], out: Daily[] = [];
  for (let k = 0; k < 3; k++) {
    const [kind, [a, b], text, reward] = pool.splice(Math.floor(r() * pool.length), 1)[0], goal = Math.round(a + (b - a) * r());
    out.push({ kind, goal, prog: 0, done: false, reward: Math.round(reward * (goal / a) / 50) * 50, text: text.replace('{n}', String(goal)).replace('{k}', (goal / 1000).toFixed(1)) });
  }
  return out;
}
// продвинуть ежедневные задания; вернуть только что выполненные
export function dailyProgress(s: GameState, kind: DailyKind, amount = 1): Daily[] {
  if (!s.daily || s.daily.day !== s.day) s.daily = { day: s.day, list: makeDaily(s.day) };
  const done: Daily[] = [];
  for (const d of s.daily.list) if (d.kind === kind && !d.done) { d.prog = Math.min(d.goal, d.prog + amount); if (d.prog >= d.goal) { d.done = true; s.money += d.reward; s.stats.dailyDone++; done.push(d); } }
  return done;
}

// ---------- матрёшки ----------
export const COLLECT_N = 30;
export function placeCollectibles(city: City): { x: number; z: number }[] {
  const r = mulberry32(CITY.SEED ^ 0xa11ce), out: { x: number; z: number }[] = [];
  const inside = (x: number, z: number) => city.buildings.some(b => Math.abs(x - b.x) < b.w / 2 + 1.5 && Math.abs(z - b.z) < b.d / 2 + 1.5);
  let guard = 0;
  while (out.length < COLLECT_N && guard++ < 5000) {
    const i = Math.floor(r() * CITY.N), j = Math.floor(r() * CITY.N), rc = blockRect(i, j);
    const x = rc.x0 + 6 + r() * (CITY.BLOCK - 12), z = rc.z0 + 6 + r() * (CITY.BLOCK - 12);
    if (inside(x, z) || Math.abs(x) > HALF || Math.abs(z) > HALF) continue;
    if (out.some(o => Math.hypot(o.x - x, o.z - z) < 120)) continue; // по всему городу, не кучкой
    out.push({ x, z });
  }
  return out;
}
