// Генератор города и экономика — чистая логика без графики
import { describe, it, expect } from 'vitest';
import { generateCity, routeGrid, CITY, HALF } from '../src/world/citygen';
import { newState, apply, xpForLevel } from '../src/sim/state';
import { lightState } from '../src/sim/traffic';

describe('город', () => {
  const c = generateCity();
  it('одинаковый при одном зерне', () => { const c2 = generateCity(); expect(c2.buildings.length).toBe(c.buildings.length); expect(c2.buildings[10].x).toBe(c.buildings[10].x); });
  it('большой и заполненный', () => {
    expect(2 * HALF).toBeGreaterThan(1500); expect(c.buildings.length).toBeGreaterThan(300); expect(c.trees.length).toBeGreaterThan(500);
    expect(c.pois.map(p => p.kind)).toEqual(expect.arrayContaining(['bank', 'dealer', 'taxi', 'courier', 'loader', 'police', 'hospital', 'station', 'gas', 'cityhall']));
  });
  it('здания не стоят на дорогах', () => {
    for (const b of c.buildings) { const lx = ((b.x + HALF) % (CITY.BLOCK + CITY.ROAD) + (CITY.BLOCK + CITY.ROAD)) % (CITY.BLOCK + CITY.ROAD); expect(Math.min(lx, CITY.BLOCK + CITY.ROAD - lx)).toBeGreaterThan(CITY.ROAD / 2); }
  });
  it('маршрут по сетке', () => { const r = routeGrid([0, 0], [5, 3]); expect(r[0]).toEqual([0, 0]); expect(r[r.length - 1]).toEqual([5, 3]); expect(r.length).toBe(9); });
  it('светофор: зелёный только для одной оси', () => { for (let t = 0; t < 30; t += .5) expect(lightState(3, 4, 0, t) === 0 && lightState(3, 4, 1, t) === 0).toBe(false); });
});
describe('экономика', () => {
  it('заработок и уровни', () => { const s = newState(); const r = apply(s, { type: 'Earn', amount: 1000, xp: xpForLevel(1) + 10, reason: 't' }); expect(s.money).toBe(6000); expect(r.level).toBe(2); });
  it('античит: подозрительная сумма отклоняется', () => { const s = newState(); expect(apply(s, { type: 'Earn', amount: 10_000_000, xp: 0, reason: 'x' }).ok).toBe(false); expect(s.money).toBe(5000); });
  it('оплата с карты, если не хватает наличных', () => { const s = newState(); s.bank = 10000; const r = apply(s, { type: 'Pay', amount: 8000, reason: 'car' }); expect(r.ok).toBe(true); expect(s.money).toBe(0); expect(s.bank).toBe(7000); });
  it('покупка машины', () => { const s = newState(); s.bank = 200000; expect(apply(s, { type: 'BuyCar', model: 'classic', color: 1, price: 90000, plate: 'А001АА 130', x: 0, z: 0, h: 0 }).ok).toBe(true); expect(s.cars.length).toBe(1); });
  it('розыск в пределах 0..6', () => { const s = newState(); apply(s, { type: 'Wanted', delta: 10 }); expect(s.wanted).toBe(6); apply(s, { type: 'Wanted', delta: -10 }); expect(s.wanted).toBe(0); });
});
