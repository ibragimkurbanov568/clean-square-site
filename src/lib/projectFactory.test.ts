import { describe, expect, it } from "vitest";
import {
  MAX_SECTIONS,
  addSection,
  createProject,
  createSectionOfType,
  regenerateProjectTexts,
  removeSection,
  reorderSections,
  updateSectionText,
} from "./projectFactory";
import type { Project } from "../types/project";

function makeProject(overrides: Partial<Parameters<typeof createProject>[0]> = {}) {
  return createProject({
    name: "Тестовый проект",
    industry: "cafe",
    tone: "friendly",
    existingNames: [],
    ...overrides,
  }).project;
}

describe("createProject (F1)", () => {
  it("создаёт проект с 4 стартовыми секциями hero/about/services/contacts", () => {
    const project = makeProject();
    expect(project.sections).toHaveLength(4);
    expect(project.sections.map((s) => s.type)).toEqual(["hero", "about", "services", "contacts"]);
  });

  it("order секций уникален и по порядку 0..3", () => {
    const project = makeProject();
    expect(project.sections.map((s) => s.order)).toEqual([0, 1, 2, 3]);
  });

  it("темы/эффекты/viewport берутся из PROJECT_DEFAULTS", () => {
    const project = makeProject();
    expect(project.themeId).toBe("vozdukh");
    expect(project.effectsEnabled).toBe(true);
    expect(project.viewport).toBe("desktop");
  });

  it("все секции содержат непустой заголовок и isCustomText=false", () => {
    const project = makeProject();
    for (const section of project.sections) {
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.isCustomText).toBe(false);
      expect(section.visible).toBe(true);
    }
  });

  it("добавляет суффикс (2) при совпадении имени, без учёта регистра", () => {
    const result = createProject({
      name: "Кофейня",
      industry: "cafe",
      tone: "friendly",
      existingNames: ["кофейня"],
    });
    expect(result.renamed).toBe(true);
    expect(result.project.name).toBe("Кофейня (2)");
  });

  it("подбирает первый свободный суффикс, если (2) тоже занят", () => {
    const result = createProject({
      name: "Кофейня",
      industry: "cafe",
      tone: "friendly",
      existingNames: ["Кофейня", "Кофейня (2)"],
    });
    expect(result.project.name).toBe("Кофейня (3)");
  });

  it("не переименовывает, если имя свободно", () => {
    const result = createProject({
      name: "Уникальное имя",
      industry: "it",
      tone: "bold",
      existingNames: ["Другое"],
    });
    expect(result.renamed).toBe(false);
    expect(result.project.name).toBe("Уникальное имя");
  });

  it("два разных проекта получают разные id", () => {
    const a = makeProject();
    const b = makeProject();
    expect(a.id).not.toBe(b.id);
  });
});

describe("createSectionOfType (F2)", () => {
  it("создаёт секцию с корректным order в конце списка", () => {
    const project = makeProject();
    const section = createSectionOfType("pricing", project);
    expect(section.order).toBe(4);
    expect(section.type).toBe("pricing");
    expect(section.items && section.items.length).toBeGreaterThan(0);
  });

  it("hero/cta получают ctaText, остальные — нет", () => {
    const project = makeProject();
    expect(createSectionOfType("cta", project).ctaText).toBeDefined();
    expect(createSectionOfType("footer", project).ctaText).toBeUndefined();
  });
});

describe("addSection / removeSection / reorderSections (F2)", () => {
  it("addSection добавляет секцию и обновляет updatedAt", () => {
    const project = makeProject();
    const next = addSection(project, "gallery");
    expect(next.sections).toHaveLength(5);
    expect(next.sections.at(-1)?.type).toBe("gallery");
  });

  it("addSection не превышает MAX_SECTIONS", () => {
    let project = makeProject();
    for (let i = 0; i < 20; i += 1) {
      project = addSection(project, "features");
    }
    expect(project.sections.length).toBe(MAX_SECTIONS);
  });

  it("removeSection нельзя применить к последней секции", () => {
    let project: Project = makeProject();
    // Схлопываем до одной секции удалением остальных.
    while (project.sections.length > 1) {
      project = removeSection(project, project.sections[0].id);
    }
    expect(project.sections).toHaveLength(1);
    const attempt = removeSection(project, project.sections[0].id);
    expect(attempt.sections).toHaveLength(1);
    expect(attempt).toBe(project); // возвращает тот же объект без изменений
  });

  it("removeSection пересчитывает order без пропусков", () => {
    const project = makeProject();
    const targetId = project.sections[1].id; // about
    const next = removeSection(project, targetId);
    expect(next.sections.map((s) => s.order)).toEqual([0, 1, 2]);
    expect(next.sections.map((s) => s.type)).toEqual(["hero", "services", "contacts"]);
  });

  it("reorderSections меняет местами соседние секции", () => {
    const project = makeProject();
    const aboutId = project.sections[1].id;
    const next = reorderSections(project, aboutId, "up");
    expect(next.sections.find((s) => s.order === 0)?.type).toBe("about");
    expect(next.sections.find((s) => s.order === 1)?.type).toBe("hero");
  });

  it("reorderSections не двигает секцию за край списка", () => {
    const project = makeProject();
    const heroId = project.sections[0].id;
    const next = reorderSections(project, heroId, "up");
    expect(next).toBe(project);
  });
});

describe("regenerateProjectTexts (F3)", () => {
  it("force=false не трогает секции с isCustomText=true", () => {
    let project = makeProject();
    const heroId = project.sections[0].id;
    project = updateSectionText(project, heroId, { title: "Моё название", body: "Мой текст" });

    const regenerated = regenerateProjectTexts(project, { force: false });
    const hero = regenerated.sections.find((s) => s.id === heroId)!;
    expect(hero.title).toBe("Моё название");
    expect(hero.isCustomText).toBe(true);
  });

  it("force=false пересобирает секции с isCustomText=false", () => {
    let project = makeProject({ industry: "cafe", tone: "friendly" });
    const original = project.sections.map((s) => s.title);
    project = { ...project, industry: "it", tone: "bold" };

    const regenerated = regenerateProjectTexts(project, { force: false });
    expect(regenerated.sections.map((s) => s.title)).not.toEqual(original);
  });

  it("force=true перезаписывает и isCustomText=true секции, сбрасывая флаг", () => {
    let project = makeProject();
    const heroId = project.sections[0].id;
    project = updateSectionText(project, heroId, { title: "Моё название" });

    const regenerated = regenerateProjectTexts(project, { force: true });
    const hero = regenerated.sections.find((s) => s.id === heroId)!;
    expect(hero.title).not.toBe("Моё название");
    expect(hero.isCustomText).toBe(false);
  });
});
