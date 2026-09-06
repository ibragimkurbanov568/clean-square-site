import { describe, expect, it } from "vitest";
import { THEME_IDS } from "../types/theme";
import { THEMES, THEME_LIST } from "./themes";

const HEX_RE = /^#[0-9a-f]{6}$/i;

describe("THEMES", () => {
  it("содержит ровно 6 тем — все THEME_IDS", () => {
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_IDS].sort());
  });

  it("id темы совпадает с ключом объекта (обязано совпадать с data-site-theme)", () => {
    for (const id of THEME_IDS) {
      expect(THEMES[id].id).toBe(id);
    }
  });

  it("палитра — валидные HEX-значения", () => {
    for (const id of THEME_IDS) {
      const { palette } = THEMES[id];
      for (const value of Object.values(palette)) {
        expect(value).toMatch(HEX_RE);
      }
    }
  });

  it("минимум одна тёмная тема (критерий готовности ТЗ)", () => {
    expect(Object.values(THEMES).some((theme) => theme.mode === "dark")).toBe(true);
  });

  it("ровно 2 тёмные и 4 светлые темы (impulse, barhat)", () => {
    const dark = Object.values(THEMES).filter((t) => t.mode === "dark").map((t) => t.id);
    expect(dark.sort()).toEqual(["barhat", "impulse"]);
  });

  it("THEME_LIST соответствует порядку THEME_IDS", () => {
    expect(THEME_LIST.map((t) => t.id)).toEqual([...THEME_IDS]);
  });
});
