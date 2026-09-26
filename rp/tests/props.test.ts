import { describe, it, expect } from 'vitest';
import { generateCity } from '../src/world/citygen';
import { placeProps, treeModel } from '../src/world/props';

describe('расстановка уличных предметов', () => {
  const city = generateCity(), a = placeProps(city);
  it('детерминирована', () => { const b = placeProps(city); expect(b.length).toBe(a.length); expect(b[123]).toEqual(a[123]); });
  it('есть все основные виды', () => {
    const n: Record<string, number> = {}; for (const p of a) n[p.id] = (n[p.id] || 0) + 1;
    console.log('props', a.length, JSON.stringify(n));
    for (const id of ['bin', 'manhole', 'ubox', 'aircon', 'trashbag', 'lamp', 'planter']) expect(n[id] || 0).toBeGreaterThan(20);
  });
  it('на земле ничего не стоит внутри зданий', () => {
    let bad = 0; for (const p of a) if (p.y < .5) for (const b of city.buildings) if (Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.z - b.z) < b.d / 2) bad++;
    expect(bad).toBe(0);
  });
  it('деревьев рядом с камерой не больше лимита', () => {
    let worst = 0;
    for (let x = -700; x <= 700; x += 100) for (let z = -700; z <= 700; z += 100) {
      const n: Record<string, number> = {};
      for (const t of city.trees) if (Math.hypot(t.x - x, t.z - z) < 200) { const id = treeModel(t).id; n[id] = (n[id] || 0) + 1; }
      worst = Math.max(worst, ...Object.values(n), 0);
    }
    console.log('max trees of one model within 200 m', worst);
    expect(worst).toBeLessThan(260);
  });
});
