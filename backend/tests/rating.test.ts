import { describe, expect, it } from 'vitest';
import {
  normalizeHigherBetter,
  normalizeLowerBetter,
  computeRatingScores,
  selectTopCompanies,
} from '../src/lib/rating';

// Формула ТОП-3 (F3, docs/01-spec.md): rating_score = avg_rating*0.6 + normalized_orders*0.3 +
// normalized_response_speed*0.1, нормализация — min-max в пределах города (допущение 17).

describe('lib/rating — normalizeHigherBetter', () => {
  it('нормализует по min-max, максимум -> 1, минимум -> 0', () => {
    expect(normalizeHigherBetter([0, 5, 10])).toEqual([0, 0.5, 1]);
  });

  it('при единственном значении или равных значениях возвращает 1 (допущение 17)', () => {
    expect(normalizeHigherBetter([7])).toEqual([1]);
    expect(normalizeHigherBetter([3, 3, 3])).toEqual([1, 1, 1]);
  });

  it('пустой массив -> пустой результат', () => {
    expect(normalizeHigherBetter([])).toEqual([]);
  });
});

describe('lib/rating — normalizeLowerBetter', () => {
  it('меньшее значение получает более высокую нормализованную оценку', () => {
    const result = normalizeLowerBetter([100, 200, 300]);
    expect(result[0]).toBe(1);
    expect(result[2]).toBe(0);
    expect(result[1]).toBeCloseTo(0.5);
  });

  it('при единственном значении возвращает 1', () => {
    expect(normalizeLowerBetter([42])).toEqual([1]);
  });
});

describe('lib/rating — computeRatingScores', () => {
  it('считает rating_score по формуле 0.6/0.3/0.1', () => {
    const companies = [
      { id: 'a', ratingAvg: 5, ordersCount: 10, responseSpeedSec: 60 },
      { id: 'b', ratingAvg: 3, ordersCount: 0, responseSpeedSec: 600 },
    ];
    const scores = computeRatingScores(companies);
    const byId = new Map(scores.map((s) => [s.id, s.ratingScore]));

    // a: orders norm=1 (max), speed norm=1 (min) -> 5*0.6 + 1*0.3 + 1*0.1 = 3.0+0.3+0.1=3.4
    expect(byId.get('a')).toBeCloseTo(3.4);
    // b: orders norm=0 (min), speed norm=0 (max) -> 3*0.6 + 0 + 0 = 1.8
    expect(byId.get('b')).toBeCloseTo(1.8);
  });

  it('компания без данных о скорости ответа получает наихудшую (но конечную) оценку скорости', () => {
    const companies = [
      { id: 'known', ratingAvg: 4, ordersCount: 5, responseSpeedSec: 100 },
      { id: 'unknown', ratingAvg: 4, ordersCount: 5, responseSpeedSec: null },
    ];
    const scores = computeRatingScores(companies);
    const byId = new Map(scores.map((s) => [s.id, s.ratingScore]));
    expect(byId.get('known')!).toBeGreaterThan(byId.get('unknown')!);
  });

  it('при единственной компании оба нормализованных компонента равны 1 (допущение 17)', () => {
    const companies = [{ id: 'solo', ratingAvg: 2, ordersCount: 3, responseSpeedSec: 120 }];
    const scores = computeRatingScores(companies);
    // 2*0.6 + 1*0.3 + 1*0.1 = 1.2+0.3+0.1 = 1.6
    expect(scores[0]?.ratingScore).toBeCloseTo(1.6);
  });

  it('пустой список -> пустой результат', () => {
    expect(computeRatingScores([])).toEqual([]);
  });
});

describe('lib/rating — selectTopCompanies', () => {
  it('возвращает не более `limit` компаний, отсортированных по убыванию rating_score', () => {
    const companies = [
      { id: 'low', ratingAvg: 1, ordersCount: 0, responseSpeedSec: 900 },
      { id: 'high', ratingAvg: 5, ordersCount: 20, responseSpeedSec: 30 },
      { id: 'mid', ratingAvg: 3, ordersCount: 10, responseSpeedSec: 300 },
      { id: 'extra', ratingAvg: 2, ordersCount: 1, responseSpeedSec: 800 },
    ];
    const top = selectTopCompanies(companies, 3);
    expect(top).toHaveLength(3);
    // high: 5*0.6+1*0.3+1*0.1=3.4; mid: 3*0.6+0.5*0.3+0.69*0.1≈2.02;
    // extra: 2*0.6+0.05*0.3+0.11*0.1≈1.23; low: 1*0.6+0+0=0.6 (наихудший — не входит в ТОП-3).
    expect(top.map((c) => c.id)).toEqual(['high', 'mid', 'extra']);
    expect(top.map((c) => c.id)).not.toContain('low');
  });

  it('при количестве компаний меньше limit возвращает все', () => {
    const companies = [{ id: 'only', ratingAvg: 4, ordersCount: 1, responseSpeedSec: 100 }];
    expect(selectTopCompanies(companies, 3)).toHaveLength(1);
  });
});
