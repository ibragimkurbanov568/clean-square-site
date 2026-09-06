import { describe, expect, it } from "vitest";
import { generateSectionContent } from "./textGenerator";
import type { IndustryId, SectionType, ToneId } from "../types/project";

const INDUSTRIES: IndustryId[] = ["cafe", "it", "beauty", "shop", "consulting", "education", "other"];
const TONES: ToneId[] = ["formal", "friendly", "bold", "minimal"];
const TYPES: SectionType[] = [
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

describe("generateSectionContent — детерминизм (F3)", () => {
  it("одинаковый вход всегда даёт одинаковый результат", () => {
    for (const type of TYPES) {
      const a = generateSectionContent({ type, industry: "cafe", tone: "friendly", seed: "project-1" });
      const b = generateSectionContent({ type, industry: "cafe", tone: "friendly", seed: "project-1" });
      expect(a).toEqual(b);
    }
  });

  it("разный seed может дать другой вариант текста (вариативность)", () => {
    const results = new Set<string>();
    for (let i = 0; i < 8; i += 1) {
      const r = generateSectionContent({ type: "hero", industry: "it", tone: "bold", seed: `seed-${i}` });
      results.add(r.title);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it("разная отрасль при том же тоне даёт разный текст", () => {
    const cafe = generateSectionContent({ type: "about", industry: "cafe", tone: "formal", seed: "x" });
    const it = generateSectionContent({ type: "about", industry: "it", tone: "formal", seed: "x" });
    expect(cafe.body).not.toBe(it.body);
  });

  it("разный тон при той же отрасли даёт разный текст", () => {
    const formal = generateSectionContent({ type: "hero", industry: "shop", tone: "formal", seed: "x" });
    const bold = generateSectionContent({ type: "hero", industry: "shop", tone: "bold", seed: "x" });
    expect(formal.title).not.toBe(bold.title);
  });
});

describe("generateSectionContent — качество и лимиты для всех 7×4×10 комбинаций", () => {
  for (const industry of INDUSTRIES) {
    for (const tone of TONES) {
      for (const type of TYPES) {
        it(`${industry}/${tone}/${type}: осмысленный текст в пределах лимитов`, () => {
          const content = generateSectionContent({ type, industry, tone, seed: `${industry}-${tone}-${type}` });

          expect(content.title.trim().length).toBeGreaterThan(0);
          expect(content.title.length).toBeLessThanOrEqual(80);
          expect(content.title.toLowerCase()).not.toContain("lorem");

          if (content.body !== undefined) {
            expect(content.body.length).toBeLessThanOrEqual(600);
            expect(content.body.toLowerCase()).not.toContain("lorem");
          }
          if (content.ctaText !== undefined) {
            expect(content.ctaText.length).toBeLessThanOrEqual(40);
          }
          if (content.items !== undefined) {
            expect(content.items.length).toBeLessThanOrEqual(8);
            for (const item of content.items) {
              expect(item.primary.trim().length).toBeGreaterThan(0);
            }
          }
        });
      }
    }
  }
});

describe("generateSectionContent — соответствие SectionTypeDefinition", () => {
  it("только hero и cta получают ctaText", () => {
    for (const type of TYPES) {
      const content = generateSectionContent({ type, industry: "cafe", tone: "friendly", seed: "s" });
      if (type === "hero" || type === "cta") {
        expect(content.ctaText).toBeDefined();
      } else {
        expect(content.ctaText).toBeUndefined();
      }
    }
  });

  it("только списочные типы получают items", () => {
    const listy: SectionType[] = ["services", "features", "pricing", "testimonials", "gallery"];
    for (const type of TYPES) {
      const content = generateSectionContent({ type, industry: "it", tone: "minimal", seed: "s" });
      if (listy.includes(type)) {
        expect(content.items && content.items.length).toBeGreaterThan(0);
      } else {
        expect(content.items).toBeUndefined();
      }
    }
  });

  it("pricing даёт пары primary/secondary (название и цена)", () => {
    const content = generateSectionContent({ type: "pricing", industry: "consulting", tone: "formal", seed: "s" });
    expect(content.items?.every((item) => item.secondary && item.secondary.length > 0)).toBe(true);
  });

  it("testimonials даёт пары имя/цитата", () => {
    const content = generateSectionContent({ type: "testimonials", industry: "beauty", tone: "bold", seed: "s" });
    expect(content.items?.every((item) => item.secondary && item.secondary.length > 0)).toBe(true);
  });
});
