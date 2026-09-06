import { describe, expect, it } from "vitest";
import { exportProjectToHtml } from "./htmlExporter";
import { createProject } from "./projectFactory";

describe("exportProjectToHtml (F7)", () => {
  it("транслитерирует название проекта в имя файла .html", () => {
    const { project } = createProject({
      name: "Кофейня Атмосфера",
      industry: "cafe",
      tone: "friendly",
      existingNames: [],
    });
    const result = exportProjectToHtml(project);
    expect(result.filename).toBe("kofeynya-atmosfera.html");
  });

  it("html совпадает с assembleSiteDocument(project, {mode:'export'})", () => {
    const { project } = createProject({
      name: "Тест",
      industry: "it",
      tone: "bold",
      existingNames: [],
    });
    const result = exportProjectToHtml(project);
    expect(result.html).toContain("<!doctype html>");
    expect(result.html).toContain('data-site-theme="vozdukh"');
  });

  it("не бросает и даёт запасное имя файла для экзотических названий", () => {
    const { project } = createProject({
      name: "★彡★",
      industry: "other",
      tone: "minimal",
      existingNames: [],
    });
    const result = exportProjectToHtml(project);
    expect(result.filename).toBe("site.html");
  });
});
