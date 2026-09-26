import { describe, it, expect } from 'vitest';
import { newState, apply } from '../src/sim/state';

describe('реальная жизнь: вещи и потребности', () => {
  it('покупка в ларьке списывает деньги и кладёт вещь в рюкзак', () => {
    const s = newState(); const m = s.money;
    expect(apply(s, { type: 'BuyItem', item: 'shawarma' }).ok).toBe(true);
    expect(s.money).toBe(m - 250); expect(s.inv.shawarma).toBe(1);
  });
  it('еда восстанавливает сытость и не выходит за 100', () => {
    const s = newState(); s.needs.food = 70; s.inv.shawarma = 2;
    apply(s, { type: 'UseItem', item: 'shawarma' }); expect(s.needs.food).toBe(100); expect(s.inv.shawarma).toBe(1);
  });
  it('рюкзак ограничен 20 вещами, без денег не купить', () => {
    const s = newState(); s.inv = { water: 20 }; expect(apply(s, { type: 'BuyItem', item: 'water' }).ok).toBe(false);
    const t = newState(); t.money = 10; expect(apply(t, { type: 'BuyItem', item: 'coffee' }).ok).toBe(false); expect(t.inv.coffee).toBeUndefined();
  });
});
