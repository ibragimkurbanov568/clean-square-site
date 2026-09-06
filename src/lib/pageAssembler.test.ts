import { describe, expect, it } from "vitest";
import { assembleSiteDocument } from "./pageAssembler";
import { createProject } from "./projectFactory";
import type { Project } from "../types/project";

function makeProject(overrides: Partial<Project> = {}): Project {
  const { project } = createProject({
    name: "Демо проект",
    industry: "cafe",
    tone: "friendly",
    existingNames: [],
  });
  return { ...project, ...overrides };
}

describe("assembleSiteDocument — базовая структура (F5/F7)", () => {
  it("возвращает полный самостоятельный документ", () => {
    const { html, title } = assembleSiteDocument(makeProject(), { mode: "preview" });
    expect(html.trim().startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain(`<title>${title}</title>`.replace(/&/g, "&amp;"));
  });

  it("ноль внешних ссылок — ни http://, ни https:// в атрибутах src/href", () => {
    const { html } = assembleSiteDocument(makeProject(), { mode: "export" });
    const srcHrefMatches = html.match(/(?:src|href)\s*=\s*"([^"]*)"/g) ?? [];
    for (const match of srcHrefMatches) {
      expect(match).not.toMatch(/https?:\/\//);
    }
    // Более широкая защита: во всём документе нет ссылок на CDN/сеть.
    expect(html).not.toMatch(/<link[^>]*href\s*=\s*"https?:\/\//);
    expect(html).not.toMatch(/<script[^>]*src\s*=\s*"https?:\/\//);
  });

  it("применяет data-site-theme проекта на <body>", () => {
    const { html } = assembleSiteDocument(makeProject({ themeId: "impulse" }), { mode: "preview" });
    expect(html).toContain('data-site-theme="impulse"');
    expect(html).toContain("--site-accent: #33e6b4");
  });

  it("рендерит только видимые секции, в порядке order", () => {
    const project = makeProject();
    const hidden = { ...project.sections[1], visible: false };
    const reordered = [project.sections[2], hidden, project.sections[0], project.sections[3]];
    const withHidden = { ...project, sections: reordered };

    const { html } = assembleSiteDocument(withHidden, { mode: "preview" });
    // about (hidden) не должно появиться, но его заголовок мог совпасть с чем-то другим —
    // проверяем через id секции.
    expect(html).not.toContain(`section-${hidden.id}`);
    const heroIndex = html.indexOf(`section-${project.sections[0].id}`);
    const servicesIndex = html.indexOf(`section-${project.sections[2].id}`);
    expect(heroIndex).toBeGreaterThan(-1);
    expect(servicesIndex).toBeGreaterThan(-1);
    expect(heroIndex).toBeLessThan(servicesIndex); // порядок по order, а не по позиции в массиве
  });

  it("preview и export дают идентичную вёрстку/CSS/JS (различие только косметическое)", () => {
    const project = makeProject();
    const preview = assembleSiteDocument(project, { mode: "preview" });
    const exported = assembleSiteDocument(project, { mode: "export" });
    const stripGeneratorMeta = (html: string) =>
      html.replace(/\s*<meta name="generator"[^>]*>/, "");
    expect(stripGeneratorMeta(preview.html)).toBe(stripGeneratorMeta(exported.html));
  });

  it("чистая функция: одинаковый проект даёт одинаковый документ", () => {
    const project = makeProject();
    const a = assembleSiteDocument(project, { mode: "export" });
    const b = assembleSiteDocument(project, { mode: "export" });
    expect(a).toEqual(b);
  });
});

describe("assembleSiteDocument — эффекты и reduced motion (F6)", () => {
  it("effectsEnabled=true добавляет IntersectionObserver-скрипт", () => {
    const { html } = assembleSiteDocument(makeProject({ effectsEnabled: true }), { mode: "preview" });
    expect(html).toContain("IntersectionObserver");
    expect(html).toContain("<script>");
  });

  it("effectsEnabled=false не добавляет скрипт и атрибуты data-reveal в разметке", () => {
    const { html } = assembleSiteDocument(makeProject({ effectsEnabled: false }), { mode: "preview" });
    expect(html).not.toContain("<script>");
    // CSS содержит запасной селектор [data-reveal] в блоке reduced-motion
    // (безопасная сеть на случай, если разметка когда-то попадёт в документ
    // не через сборщик), но сама разметка не должна нести атрибут
    // `data-reveal="…"` ни на одном элементе, когда эффекты выключены.
    expect(html).not.toMatch(/data-reveal="/);
  });

  it("документ всегда содержит @media (prefers-reduced-motion: reduce)", () => {
    const enabled = assembleSiteDocument(makeProject({ effectsEnabled: true }), { mode: "preview" });
    const disabled = assembleSiteDocument(makeProject({ effectsEnabled: false }), { mode: "preview" });
    expect(enabled.html).toContain("prefers-reduced-motion: reduce");
    expect(disabled.html).toContain("prefers-reduced-motion: reduce");
  });
});

describe("assembleSiteDocument — экранирование в заголовке документа", () => {
  it("экранирует название проекта в <title>", () => {
    const project = makeProject({ name: `<script>alert(1)</script>` });
    const { html } = assembleSiteDocument(project, { mode: "preview" });
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
