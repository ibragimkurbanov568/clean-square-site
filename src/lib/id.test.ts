import { describe, expect, it } from "vitest";
import { createId, slugify } from "./id";

describe("createId", () => {
  it("генерирует непустую строку", () => {
    expect(createId().length).toBeGreaterThan(0);
  });

  it("генерирует разные id при повторных вызовах", () => {
    const a = createId();
    const b = createId();
    expect(a).not.toBe(b);
  });
});

describe("slugify", () => {
  it("транслитерирует русское название в kebab-case", () => {
    expect(slugify("Кофейня Атмосфера")).toBe("kofeynya-atmosfera");
  });

  it("схлопывает пробелы и пунктуацию в одно тире", () => {
    expect(slugify("Мой  Сайт!!! №1")).toBe("moy-sayt-1");
  });

  it("обрезает тире по краям", () => {
    expect(slugify("  Студия  ")).toBe("studiya");
  });

  it("возвращает запасное имя, если транслитерировать нечего", () => {
    expect(slugify("★彡★")).toBe("site");
  });

  it("не содержит заглавных букв и пробелов", () => {
    const slug = slugify("IT Стартап 2026");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});
