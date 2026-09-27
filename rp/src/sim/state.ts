// Состояние игрока и мира: деньги, уровень, розыск, имущество, работы. Меняется только командами —
// так потом можно перенести проверку на сервер (онлайн). Сохранение — снимок этого состояния.
import type { Look } from '../actors/human';
import { ITEMS } from './items';
import type { Daily } from './life';

export interface OwnedCar { id: string; model: string; color: number; plate: string; x: number; z: number; h: number; fuel: number; dmg: number }
export interface GameState {
  v: number; name: string; look: Look | null; money: number; bank: number; xp: number; level: number;
  pos: { x: number; z: number; h: number }; hour: number; day: number;
  wanted: number; jail: number; health: number;
  licenses: { B: boolean }; cars: OwnedCar[]; job: { id: string | null; rank: Record<string, number>; done: Record<string, number> };
  stats: { earned: number; distance: number; arrests: number; playTime: number; walked: number; fish: number; pike: number; bigWin: number; bought: number; dailyDone: number; eaten: number };
  settings: { quality: string; vol: number; lang: string; sens: number; cam: number; orient?: string; fps?: boolean; invert?: boolean; fov?: number; dayLen?: number; hud?: number; music?: boolean };
  tutorial: number;
  // «реальная жизнь»: потребности 0…100, вещи, навыки (опыт 0…100), документы
  needs: { food: number; water: number; energy: number; mood: number };
  inv: Record<string, number>; skills: { drive: number; stamina: number }; docs: { passport: boolean; med: boolean };
  // достижения, найденные матрёшки, попробованные блюда, ежедневные задания
  ach: Record<string, boolean>; collect: number[]; tasted: Record<string, boolean>; daily: { day: number; list: Daily[] } | null; lastPay: number;
}
export { ITEMS } from './items';
export const SAVE_KEY = 'krai.save.v1';
export function newState(): GameState {
  return {
    v: 1, name: '', look: null, money: 5000, bank: 0, xp: 0, level: 1, pos: { x: 0, z: 0, h: 0 }, hour: 9.5, day: 1,
    wanted: 0, jail: 0, health: 100, licenses: { B: false }, cars: [], job: { id: null, rank: {}, done: {} },
    stats: { earned: 0, distance: 0, arrests: 0, playTime: 0, walked: 0, fish: 0, pike: 0, bigWin: 0, bought: 0, dailyDone: 0, eaten: 0 }, settings: { quality: 'auto', vol: .8, lang: 'ru', sens: 1, cam: 0 }, tutorial: 0,
    needs: { food: 80, water: 80, energy: 90, mood: 70 }, inv: { water: 1, pie: 1, newspaper: 1 }, skills: { drive: 0, stamina: 0 }, docs: { passport: true, med: false },
    ach: {}, collect: [], tasted: {}, daily: null, lastPay: 1,
  };
}
export const xpForLevel = (l: number) => 400 + (l - 1) * 350;
export type Cmd =
  | { type: 'Earn'; amount: number; xp: number; reason: string } | { type: 'Pay'; amount: number; reason: string; bank?: boolean }
  | { type: 'Deposit'; amount: number } | { type: 'Withdraw'; amount: number } | { type: 'Wanted'; delta: number } | { type: 'ClearWanted' }
  | { type: 'BuyCar'; model: string; color: number; price: number; plate: string; x: number; z: number; h: number } | { type: 'License'; kind: 'B' }
  | { type: 'BuyItem'; item: string; n?: number } | { type: 'UseItem'; item: string } | { type: 'MedCard' }
  | { type: 'AddItem'; item: string } | { type: 'SellItem'; item: string };
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
    case 'BuyItem': {
      const it = ITEMS[c.item], n = c.n || 1; if (!it) return { ok: false }; if (Object.values(s.inv).reduce((a, b) => a + b, 0) + n > 20) return { ok: false, msg: 'Рюкзак полон (20 вещей)' };
      const r = apply(s, { type: 'Pay', amount: it.price * n, reason: 'item' }); if (!r.ok) return r; s.inv[c.item] = (s.inv[c.item] || 0) + n; s.stats.bought += n; return { ok: true, msg: `${it.name} — в рюкзаке` };
    }
    case 'UseItem': {
      const it = ITEMS[c.item]; if (!it || !s.inv[c.item]) return { ok: false };
      if (!it.keep) { s.inv[c.item]--; if (!s.inv[c.item]) delete s.inv[c.item]; }
      const N = s.needs, cl = (v: number) => Math.max(0, Math.min(100, v)); N.food = cl(N.food + (it.food || 0)); N.water = cl(N.water + (it.water || 0)); N.energy = cl(N.energy + (it.energy || 0)); N.mood = cl(N.mood + (it.mood || 0)); s.health = cl(s.health + (it.hp || 0));
      if (it.food && (it.cat === 'food' || it.cat === 'fish' || it.cat === 'gift')) { s.tasted[c.item] = true; s.stats.eaten++; }
      return { ok: true, msg: `${it.icon} ${it.name}` };
    }
    case 'AddItem': { if (Object.values(s.inv).reduce((a, b) => a + b, 0) >= 20) return { ok: false, msg: 'Рюкзак полон (20 вещей)' }; s.inv[c.item] = (s.inv[c.item] || 0) + 1; return { ok: true }; }
    case 'SellItem': {
      const it = ITEMS[c.item]; if (!it?.sell || !s.inv[c.item]) return { ok: false }; s.inv[c.item]--; if (!s.inv[c.item]) delete s.inv[c.item];
      s.money += it.sell; s.stats.earned += it.sell; return { ok: true, msg: `Продано: ${it.name} +${it.sell} ₽` };
    }
    case 'MedCard': { if (s.docs.med) return { ok: false }; const r = apply(s, { type: 'Pay', amount: 1500, reason: 'med' }); if (!r.ok) return r; s.docs.med = true; return { ok: true }; }
  }
}
export function loadState(): GameState | null {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const s = JSON.parse(raw), d = newState(); for (const k of ['needs', 'skills', 'docs', 'stats'] as const) s[k] = Object.assign(d[k], s[k]); return Object.assign(d, s); } catch { return null; }
}
export function saveState(s: GameState) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* приватный режим: без сохранения */ } }
export function randomPlate() { const L = 'АВЕКМНОРСТУХ', p = () => L[Math.floor(Math.random() * L.length)]; return `${p()}${Math.floor(Math.random() * 900 + 100)}${p()}${p()} 130`; }
