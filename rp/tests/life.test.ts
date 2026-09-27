import { describe, it, expect } from 'vitest';
import { ITEMS, SHOPS, rollFish, lotteryPrize, scratchPrize } from '../src/sim/items';
import { ACHIEVEMENTS, checkAchievements, makeDaily, dailyProgress, placeCollectibles, COLLECT_N } from '../src/sim/life';
import { newState, apply } from '../src/sim/state';
import { generateCity } from '../src/world/citygen';

describe('вещи и магазины', () => {
  it('в каталоге больше 55 вещей, у каждой есть имя, значок и описание', () => {
    const ids = Object.keys(ITEMS); expect(ids.length).toBeGreaterThan(55);
    for (const id of ids) { const I = ITEMS[id]; expect(I.name && I.icon && I.desc).toBeTruthy(); }
  });
  it('все товары магазинов есть в каталоге и продаются за деньги', () => {
    for (const S of Object.values(SHOPS)) for (const id of S.items) { expect(ITEMS[id]).toBeTruthy(); expect(ITEMS[id].price).toBeGreaterThan(0); }
  });
  it('улов всегда из каталога рыбы, лотерея не платит отрицательно', () => {
    for (let r = 0; r < 1; r += .01) { expect(ITEMS[rollFish(r)].cat).toBe('fish'); expect(lotteryPrize(r)).toBeGreaterThanOrEqual(0); expect(scratchPrize(r)).toBeGreaterThanOrEqual(0); }
  });
  it('рыбу можно поймать и продать', () => {
    const s = newState(); const m = s.money; expect(apply(s, { type: 'AddItem', item: 'f_pike' }).ok).toBe(true);
    expect(apply(s, { type: 'SellItem', item: 'f_pike' }).ok).toBe(true); expect(s.money).toBe(m + ITEMS.f_pike.sell!); expect(s.inv.f_pike).toBeUndefined();
  });
  it('удочка не тратится, еда отмечается как попробованная', () => {
    const s = newState(); s.inv.rod = 1; s.inv.pelmeni = 1; apply(s, { type: 'UseItem', item: 'rod' }); expect(s.inv.rod).toBe(1);
    apply(s, { type: 'UseItem', item: 'pelmeni' }); expect(s.tasted.pelmeni).toBe(true);
  });
});
describe('задания дня, достижения, матрёшки', () => {
  it('три разных задания на день, одинаковые для одного дня', () => {
    const a = makeDaily(5), b = makeDaily(5); expect(a).toEqual(b); expect(new Set(a.map(d => d.kind)).size).toBe(3);
  });
  it('выполнение задания платит один раз', () => {
    const s = newState(); s.daily = { day: s.day, list: [{ kind: 'eat', goal: 2, prog: 0, done: false, reward: 400, text: '' }] }; const m = s.money;
    dailyProgress(s, 'eat'); dailyProgress(s, 'eat'); dailyProgress(s, 'eat'); expect(s.money).toBe(m + 400); expect(s.stats.dailyDone).toBe(1);
  });
  it('достижения выдаются один раз с наградой', () => {
    const s = newState(); s.job.done.courier = 1; const m = s.money; const got = checkAchievements(s);
    expect(got.map(a => a.id)).toContain('first_job'); expect(s.money).toBeGreaterThan(m); expect(checkAchievements(s).length).toBe(0);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
  });
  it(`спрятано ровно ${COLLECT_N} матрёшек, не в зданиях`, () => {
    const city = generateCity(), c = placeCollectibles(city); expect(c.length).toBe(COLLECT_N);
    for (const p of c) for (const b of city.buildings) expect(Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.z - b.z) < b.d / 2).toBe(false);
  });
});
