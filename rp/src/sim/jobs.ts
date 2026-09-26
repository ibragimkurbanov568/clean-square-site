// Работы: курьер, таксист, грузчик в порту. Каждая — со своей механикой и рангами (5).
// Оплату подтверждает «симуляция»: проверка расстояния и времени (задел под онлайн-античит).
import * as THREE from 'three';
import { City, Poi, CITY, HALF, PITCH, roadLine } from '../world/citygen';
import { Markers } from '../world/markers';
import { Peds, Ped } from '../actors/peds';
import { clamp, pick, rand } from '../core/util';

export const JOBS: Record<string, { name: string; poi: string; desc: string; minLevel: number; ranks: string[] }> = {
  courier: { name: 'Курьер', poi: 'post', desc: 'Доставка посылок по адресам. Быстрее — больше чаевых.', minLevel: 1, ranks: ['Стажёр', 'Курьер', 'Опытный курьер', 'Старший курьер', 'Мастер доставки'] },
  loader: { name: 'Грузчик в порту', poi: 'port', desc: 'Носи ящики со склада в контейнер. Оплата за каждый ящик.', minLevel: 1, ranks: ['Стажёр', 'Грузчик', 'Бригадир', 'Старший бригадир', 'Мастер склада'] },
  taxi: { name: 'Таксист', poi: 'taxi', desc: 'Машина таксопарка, пассажиры по всему городу. Нужны права категории B.', minLevel: 2, ranks: ['Новичок', 'Водитель', 'Опытный водитель', 'Профи', 'Легенда такси'] },
};
export interface JobCtx {
  city: City; playerPos: THREE.Vector3; inCar: boolean; carSpeed: number; carDamage: number; isTaxiCar: boolean;
  earn(amount: number, xp: number, reason: string): void; toast(msg: string): void; objective(msg: string): void; spawnTaxi(): void; endTaxi(): void; carry(on: boolean): void;
}
// случайный адрес: вход в жилой дом в радиусе
function randomAddress(city: City, from: THREE.Vector3, minD: number, maxD: number) {
  const list = city.buildings.filter(b => (b.type === 'panel' || b.type === 'khrush' || b.type === 'tower' || b.type === 'house' || b.type === 'stalin') && !b.name);
  for (let t = 0; t < 60; t++) { const b = pick(list), x = b.x, z = b.z - b.d / 2 - 2.2, d = Math.hypot(x - from.x, z - from.z); if (d > minD && d < maxD) return { x, z, b }; }
  const b = list[0]; return { x: b.x, z: b.z - b.d / 2 - 2.2, b };
}
const streets = ['ул. Ленина', 'ул. Мира', 'пр. Строителей', 'ул. Садовая', 'ул. Заводская', 'ул. Речная', 'ул. Гагарина', 'ул. Лесная', 'ул. Советская', 'ул. Молодёжная', 'ул. Школьная', 'пр. Победы'];
function addrName(x: number, z: number) { const i = Math.floor((x + HALF) / PITCH), j = Math.floor((z + HALF) / PITCH); return `${streets[(i * 3 + j) % streets.length]}, ${(i * 7 + j * 3) % 90 + 1}`; }

export const Jobs = {
  active: null as null | string, stage: 0, t: 0, dist0: 0, count: 0, target: null as null | { x: number; z: number }, fare: null as Ped | null, carrying: false, shift: 0,
  rankOf(done: number) { return clamp(Math.floor(Math.sqrt(done / 4)), 0, 4); },
  start(id: string, ctx: JobCtx, done: number) {
    this.active = id; this.stage = 0; this.count = 0; this.shift = 0;
    if (id === 'courier') this.nextCourier(ctx);
    if (id === 'loader') this.nextLoader(ctx);
    if (id === 'taxi') { ctx.spawnTaxi(); this.stage = 0; this.t = 3; ctx.objective('Садись в такси у таксопарка и жди вызов'); }
    ctx.toast(`Вы устроились: ${JOBS[id].name} (${JOBS[id].ranks[this.rankOf(done)]})`);
  },
  stop(ctx: JobCtx) {
    if (!this.active) return; if (this.active === 'taxi') ctx.endTaxi(); if (this.fare) { this.fare.state = 'walk'; this.fare.fare = false; this.fare = null; }
    this.active = null; this.target = null; Markers.remove('job'); Markers.remove('job2'); ctx.carry(false); this.carrying = false; ctx.objective('');
  },
  // --- курьер ---
  nextCourier(ctx: JobCtx) {
    const a = randomAddress(ctx.city, ctx.playerPos, 120, 520); this.target = a; this.t = 0; this.dist0 = Math.hypot(a.x - ctx.playerPos.x, a.z - ctx.playerPos.z);
    Markers.add('job', a.x, a.z, 0xffc83d, 'Адрес доставки', '📦', 'job'); ctx.objective(`Доставь посылку: ${addrName(a.x, a.z)} (${Math.round(this.dist0)} м)`);
  },
  // --- грузчик ---
  nextLoader(ctx: JobCtx) {
    const poi = ctx.city.pois.find(p => p.kind === 'loader')!;
    if (!this.carrying) { Markers.add('job', poi.x - 20, poi.z + 17, 0xffc83d, 'Взять ящик', '📦', 'job'); ctx.objective(`Возьми ящик на складе (${this.count}/10)`); }
    else { Markers.add('job', poi.x - 22, poi.z + 30, 0x5ad17a, 'Погрузить в контейнер', '⬇', 'job'); ctx.objective(`Отнеси ящик к контейнеру (${this.count}/10)`); }
  },
  update(dt: number, ctx: JobCtx, done: number, actPressed: boolean) {
    if (!this.active) return; this.t += dt; const rank = this.rankOf(done), bonus = 1 + rank * .15, p = ctx.playerPos;
    const at = (m: string) => { const mk = Markers.get(m); return mk && Math.hypot(mk.x - p.x, mk.z - p.z) < mk.r + 1.2; };
    if (this.active === 'courier' && this.target && at('job')) {
      // доставка: пешком или остановившись рядом на машине
      if (ctx.inCar && ctx.carSpeed > 2) return;
      const base = 300 + this.dist0 * .45, tip = Math.max(0, Math.round((this.dist0 / 6 - this.t) * 4)), pay = Math.round((base + tip) * bonus);
      ctx.earn(pay, 35, 'Доставка'); ctx.toast(`Посылка доставлена: +${pay} ₽${tip > 0 ? ` (чаевые ${tip} ₽)` : ''}`); this.count++; this.nextCourier(ctx);
    }
    if (this.active === 'loader' && at('job') && !ctx.inCar) {
      if (!this.carrying) { this.carrying = true; ctx.carry(true); this.nextLoader(ctx); }
      else { this.carrying = false; ctx.carry(false); this.count++; const pay = Math.round(140 * bonus); ctx.earn(pay, 12, 'Ящик'); ctx.toast(`+${pay} ₽ за ящик`);
        if (this.count >= 10) { const b = Math.round(600 * bonus); ctx.earn(b, 60, 'Смена'); ctx.toast(`Смена закрыта! Премия ${b} ₽`); this.count = 0; }
        this.nextLoader(ctx); }
    }
    if (this.active === 'taxi') this.updateTaxi(dt, ctx, bonus, actPressed);
    void actPressed;
  },
  updateTaxi(dt: number, ctx: JobCtx, bonus: number, _act: boolean) {
    const p = ctx.playerPos;
    if (!ctx.inCar || !ctx.isTaxiCar) { if (this.stage > 0) ctx.objective('Вернись в такси'); return; }
    if (this.stage === 0) { this.t -= dt; ctx.objective('Ждём вызов… Катайся по городу'); if (this.t <= 0) {
      // пассажир на тротуаре рядом
      const ped = Peds.list.filter(q => q.state === 'walk' || q.state === 'idle').sort((a, b) => Math.abs(Math.hypot(a.x - p.x, a.z - p.z) - 120) - Math.abs(Math.hypot(b.x - p.x, b.z - p.z) - 120))[0];
      if (!ped) { this.t = 2; return; }
      this.fare = ped; ped.state = 'idle'; ped.timer = 1e9; ped.fare = true; Markers.add('job', ped.x, ped.z, 0xffc83d, 'Пассажир', '🙋', 'job', 3); this.stage = 1; ctx.toast('Новый заказ! Забери пассажира'); } return; }
    const f = this.fare!;
    if (this.stage === 1) {
      const mk = Markers.get('job')!; mk.obj.position.set(f.x, 0, f.z); mk.x = f.x; mk.z = f.z;
      ctx.objective('Забери пассажира (подъедь и остановись)');
      if (Math.hypot(f.x - p.x, f.z - p.z) < 7 && Math.abs(ctx.carSpeed) < 1.5) {
        f.state = 'ride'; const a = randomAddress(ctx.city, p, 250, 900); this.target = a; this.dist0 = Math.hypot(a.x - p.x, a.z - p.z); this.t = 0; this.shift = ctx.carDamage;
        Markers.add('job', a.x, a.z, 0x5ad17a, 'Высадка', '🏁', 'job', 3); this.stage = 2; ctx.toast(`Пассажир: «${pick(['Мне на', 'Отвезите на', 'Давайте на'])} ${addrName(a.x, a.z)}»`);
      }
    } else if (this.stage === 2 && this.target) {
      ctx.objective(`Отвези пассажира: ${addrName(this.target.x, this.target.z)}`);
      if (Math.hypot(this.target.x - p.x, this.target.z - p.z) < 8 && Math.abs(ctx.carSpeed) < 1.5) {
        const dmg = ctx.carDamage - this.shift, rating = clamp(5 - dmg / 6 - Math.max(0, this.t - this.dist0 / 9) / 20, 1, 5);
        const pay = Math.round((250 + this.dist0 * 1.3) * bonus * (.6 + rating * .1)); ctx.earn(pay, 50, 'Поездка');
        ctx.toast(`Поездка: +${pay} ₽, оценка ${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}`);
        f.state = 'walk'; f.fare = false; f.timer = 20; f.x = p.x + 3; f.z = p.z; Peds.snap(f); this.fare = null; this.stage = 0; this.t = rand(3, 8); Markers.remove('job'); this.target = null;
      }
    }
  },
};
export { roadLine, CITY };
export type { Poi };
