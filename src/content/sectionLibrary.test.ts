import { describe, expect, it } from "vitest";
import { SECTION_LIBRARY_ORDER, WIZARD_INITIAL_SECTION_ORDER } from "../types/generator";
import { SECTION_LIBRARY, listSectionDefinitions } from "./sectionLibrary";

const ALL_TYPES: readonly string[] = [
  "hero",
  "about",
  "services",
  "features",
  "pricing",
  "testimonials",
  "gallery",
  "cta",
  "contacts",
  "footer",
];

describe("SECTION_LIBRARY", () => {
  it("описывает минимум 8 типов секций (ТЗ F2)", () => {
    expect(Object.keys(SECTION_LIBRARY).length).toBeGreaterThanOrEqual(8);
  });

  it("описывает все 10 типов SectionType ровно по одному разу", () => {
    expect(Object.keys(SECTION_LIBRARY).sort()).toEqual([...ALL_TYPES].sort());
  });

  it("type внутри определения совпадает с ключом объекта", () => {
    for (const [key, def] of Object.entries(SECTION_LIBRARY)) {
      expect(def.type).toBe(key);
    }
  });

  it("у каждого определения непустые labelRu и descriptionRu", () => {
    for (const def of Object.values(SECTION_LIBRARY)) {
      expect(def.labelRu.trim().length).toBeGreaterThan(0);
      expect(def.descriptionRu.trim().length).toBeGreaterThan(0);
    }
  });

  it("только hero и cta показывают поле CTA", () => {
    for (const def of Object.values(SECTION_LIBRARY)) {
      const expected = def.type === "hero" || def.type === "cta";
      expect(def.hasCtaText).toBe(expected);
    }
  });

  it("списочные секции объявляют itemFields и maxItems=8", () => {
    for (const type of ["services", "features", "pricing", "testimonials", "gallery"] as const) {
      const def = SECTION_LIBRARY[type];
      expect(def.hasItems).toBe(true);
      expect(def.itemFields).toBeDefined();
      expect(def.maxItems).toBe(8);
    }
  });

  it("SECTION_LIBRARY_ORDER и WIZARD_INITIAL_SECTION_ORDER ссылаются на существующие типы", () => {
    for (const type of SECTION_LIBRARY_ORDER) {
      expect(SECTION_LIBRARY[type]).toBeDefined();
    }
    for (const type of WIZARD_INITIAL_SECTION_ORDER) {
      expect(SECTION_LIBRARY[type]).toBeDefined();
    }
  });

  it("listSectionDefinitions уважает переданный порядок", () => {
    const defs = listSectionDefinitions(SECTION_LIBRARY_ORDER);
    expect(defs.map((d) => d.type)).toEqual([...SECTION_LIBRARY_ORDER]);
  });
});
