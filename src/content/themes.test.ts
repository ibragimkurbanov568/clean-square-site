import { describe, expect, it } from "vitest";
import { THEME_IDS } from "../types/theme";
import { THEME_BY_ID, THEMES } from "./themes";

const HEX_RE = /^#[0-9a-f]{6}$/i;

describe("THEME_BY_ID", () => {
  it("содержит ровно 6 тем — все THEME_IDS", () => {
    expect(Object.keys(THEME_BY_ID).sort()).toEqual([...THEME_IDS].sort());
  });

  it("id темы совпадает с ключом объекта (обязано совпадать с data-site-theme)", () => {
    for (const id of THEME_IDS) {
      expect(THEME_BY_ID[id].id).toBe(id);
    }
  });

  it("палитра — валидные HEX-значения", () => {
    for (const id of THEME_IDS) {
      const { palette } = THEME_BY_ID[id];
      for (const value of Object.values(palette)) {
        expect(value).toMatch(HEX_RE);
      }
    }
  });

  it("минимум одна тёмная тема (критерий готовности ТЗ)", () => {
    expect(Object.values(THEME_BY_ID).some((theme) => theme.mode === "dark")).toBe(true);
  });

  it("ровно 2 тёмные и 4 светлые темы (impulse, barhat)", () => {
    const dark = Object.values(THEME_BY_ID).filter((t) => t.mode === "dark").map((t) => t.id);
    expect(dark.sort()).toEqual(["barhat", "impulse"]);
  });
});

describe("THEMES (массив для UI — ThemePicker/StartScreen)", () => {
  it("соответствует порядку THEME_IDS", () => {
    expect(THEMES.map((t) => t.id)).toEqual([...THEME_IDS]);
  });

  it("каждый элемент — та же тема, что и в THEME_BY_ID", () => {
    for (const theme of THEMES) {
      expect(theme).toEqual(THEME_BY_ID[theme.id]);
    }
  });
});
