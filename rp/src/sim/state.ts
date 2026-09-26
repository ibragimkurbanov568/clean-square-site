// Состояние игрока и мира: деньги, уровень, розыск, имущество, работы. Меняется только командами —
// так потом можно перенести проверку на сервер (онлайн). Сохранение — снимок этого состояния.
import type { Look } from '../actors/human';

export interface OwnedCar { id: string; model: string; color: number; plate: string; x: number; z: number; h: number; fuel: number; dmg: number }
export interface GameState {
  v: number; name: string; look: Look | null; money: number; bank: number; xp: number; level: number;
  pos: { x: number; z: number; h: number }; hour: number; day: number;
  wanted: number; jail: number; health: number;
  licenses: { B: boolean }; cars: OwnedCar[]; job: { id: string | null; rank: Record<string, number>; done: Record<string, number> };
  stats: { earned: number; distance: number; arrests: number; playTime: number };
  settings: { quality: string; vol: number; lang: string; sens: number; cam: number };
  tutorial: number;
}
export const SAVE_KEY = 'krai.save.v1';
export function newState(): GameState {
  return {
    v: 1, name: '', look: null, money: 5000, bank: 0, xp: 0, level: 1, pos: { x: 0, z: 0, h: 0 }, hour: 9.5, day: 1,
    wanted: 0, jail: 0, health: 100, licenses: { B: false }, cars: [], job: { id: null, rank: {}, done: {} },
    stats: { earned: 0, distance: 0, arrests: 0, playTime: 0 }, settings: { quality: 'auto', vol: .8, lang: 'ru', sens: 1, cam: 0 }, tutorial: 0,
  };
}
export const xpForLevel = (l: number) => 400 + (l - 1) * 350;
export type Cmd =
  | { type: 'Earn'; amount: number; xp: number; reason: string } | { type: 'Pay'; amount: number; reason: string; bank?: boolean }
  | { type: 'Deposit'; amount: number } | { type: 'Withdraw'; amount: number } | { type: 'Wanted'; delta: number } | { type: 'ClearWanted' }
  | { type: 'BuyCar'; model: string; color: number; price: number; plate: string; x: number; z: number; h: number } | { type: 'License'; kind: 'B' };
// результат команды: изменение состояния и сообщения для интерфейса
export function apply(s: GameState, c: Cmd): { ok: boolean; msg?: string; level?: number } {
  switch (c.type) {
    case 'Earn': {
      if (c.amount < 0 || c.amount > 200000) return { ok: false };
      s.money += c.amount; s.stats.earned += c.amount; s.xp += c.xp; let up = 0;
      while (s.xp >= xpForLevel(s.level)) { s.xp -= xpForLevel(s.level); s.level++; up = s.level; }
      return { ok: true, level: up || undefined };
    }
    case 'Pay': {
      if (c.bank) { if (s.bank < c.amount) return { ok: false, msg: 'Недостаточно средств на счёте' }; s.bank -= c.amount; return { ok: true }; }
      if (s.money >= c.amount) { s.money -= c.amount; return { ok: true }; }
      if (s.money + s.bank >= c.amount) { s.bank -= c.amount - s.money; s.money = 0; return { ok: true, msg: 'Недостающее списано с карты' }; }
      return { ok: false, msg: 'Не хватает денег' };
    }
    case 'Deposit': { const a = Math.min(c.amount, s.money); s.money -= a; s.bank += a; return { ok: a > 0 }; }
    case 'Withdraw': { const a = Math.min(c.amount, s.bank); s.bank -= a; s.money += a; return { ok: a > 0 }; }
    case 'Wanted': s.wanted = Math.max(0, Math.min(6, s.wanted + c.delta)); return { ok: true };
    case 'ClearWanted': s.wanted = 0; return { ok: true };
    case 'BuyCar': {
      const r = apply(s, { type: 'Pay', amount: c.price, reason: 'car' }); if (!r.ok) return r;
      s.cars.push({ id: 'c' + Date.now().toString(36), model: c.model, color: c.color, plate: c.plate, x: c.x, z: c.z, h: c.h, fuel: 1, dmg: 0 }); return { ok: true };
    }
    case 'License': { if (s.licenses.B) return { ok: false }; s.licenses.B = true; return { ok: true }; }
  }
}
export function loadState(): GameState | null {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const s = JSON.parse(raw); return Object.assign(newState(), s); } catch { return null; }
}
export function saveState(s: GameState) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* приватный режим: без сохранения */ } }
export function randomPlate() { const L = 'АВЕКМНОРСТУХ', p = () => L[Math.floor(Math.random() * L.length)]; return `${p()}${Math.floor(Math.random() * 900 + 100)}${p()}${p()} 130`; }
