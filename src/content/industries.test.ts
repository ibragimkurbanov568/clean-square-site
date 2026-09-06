import { describe, expect, it } from "vitest";
import { INDUSTRIES, INDUSTRY_BY_ID } from "./industries";
import { TONES } from "./tones";

describe("INDUSTRIES", () => {
  it("содержит минимум 6 отраслей (ТЗ F1)", () => {
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(6);
  });

  it("содержит все 7 значений IndustryId ровно по одному разу", () => {
    const ids = INDUSTRIES.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(
      ["beauty", "cafe", "consulting", "education", "it", "other", "shop"].sort(),
    );
  });

  it("у каждой отрасли есть непустое русское название", () => {
    for (const option of INDUSTRIES) {
      expect(option.labelRu.trim().length).toBeGreaterThan(0);
    }
  });

  it("INDUSTRY_BY_ID индексирует все варианты", () => {
    for (const option of INDUSTRIES) {
      expect(INDUSTRY_BY_ID[option.id]).toBe(option);
    }
  });
});

describe("TONES", () => {
  it("содержит минимум 4 тона (ТЗ F1)", () => {
    expect(TONES.length).toBeGreaterThanOrEqual(4);
  });

  it("содержит ровно formal/friendly/bold/minimal", () => {
    expect(TONES.map((t) => t.id).sort()).toEqual(
      ["bold", "formal", "friendly", "minimal"].sort(),
    );
  });
});
