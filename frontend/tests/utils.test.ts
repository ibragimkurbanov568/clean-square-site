import { describe, expect, it } from 'vitest';
import { slugifyCity, unslugifyCity } from '../src/lib/utils';

// Регрессия: slugifyCity раньше приводил город к нижнему регистру для URL /city/:citySlug.
// Поскольку unslugifyCity не восстанавливает исходный регистр, а бэкенд сравнивает
// companies.city точным `=` без COLLATE NOCASE (кириллица не приводится SQLite к нижнему
// регистру без ICU), клик по подсказке города или чипсу «Популярные города» вёл на экран города,
// который не находил ни одной компании — реальный сломанный основной сценарий "3 клика до
// заказа" (docs/02-ux.md), найден и починен QA живым Playwright-прогоном.
describe('slugifyCity / unslugifyCity — сохраняют исходный регистр города', () => {
  it('не приводит город к нижнему регистру', () => {
    expect(slugifyCity('Москва')).not.toContain('москва');
  });

  it('round-trip через slugify -> unslugify восстанавливает исходную строку один-в-один', () => {
    const cities = ['Москва', 'Санкт-Петербург', 'Нижний Новгород', 'Ростов-на-Дону'];
    for (const city of cities) {
      expect(unslugifyCity(slugifyCity(city))).toBe(city);
    }
  });

  it('обрезает пробелы по краям, но не трогает регистр внутри строки', () => {
    expect(unslugifyCity(slugifyCity('  Москва  '))).toBe('Москва');
  });
});
