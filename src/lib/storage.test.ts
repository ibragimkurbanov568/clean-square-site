import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectStore } from "./storage";
import { createProject } from "./projectFactory";
import { StorageError } from "../types/storage";

const KEY = "noesdize:projects";

function makeSavedProject(name = "Проект") {
  const { project } = createProject({ name, industry: "cafe", tone: "friendly", existingNames: [] });
  return project;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("projectStore — обычная работа (F8)", () => {
  it("listProjects возвращает пустой список, если хранилище пустое", () => {
    expect(projectStore.listProjects()).toEqual([]);
  });

  it("saveProject сохраняет проект, listProjects его находит", () => {
    const project = makeSavedProject("Кофейня");
    projectStore.saveProject(project);
    const list = projectStore.listProjects();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({
      id: project.id,
      name: "Кофейня",
      updatedAt: project.updatedAt,
      themeId: project.themeId,
    });
  });

  it("loadProject восстанавливает проект целиком", () => {
    const project = makeSavedProject();
    projectStore.saveProject(project);
    expect(projectStore.loadProject(project.id)).toEqual(project);
  });

  it("loadProject возвращает undefined для несуществующего id (не бросает)", () => {
    expect(projectStore.loadProject("не-существует")).toBeUndefined();
  });

  it("saveProject с тем же id обновляет проект (upsert), а не дублирует", () => {
    const project = makeSavedProject();
    projectStore.saveProject(project);
    const updated = { ...project, name: "Новое имя" };
    projectStore.saveProject(updated);
    expect(projectStore.listProjects()).toHaveLength(1);
    expect(projectStore.loadProject(project.id)?.name).toBe("Новое имя");
  });

  it("deleteProject удаляет проект", () => {
    const project = makeSavedProject();
    projectStore.saveProject(project);
    projectStore.deleteProject(project.id);
    expect(projectStore.listProjects()).toEqual([]);
  });

  it("deleteProject идемпотентна — повторное удаление не бросает", () => {
    const project = makeSavedProject();
    projectStore.saveProject(project);
    projectStore.deleteProject(project.id);
    expect(() => projectStore.deleteProject(project.id)).not.toThrow();
  });

  it("deleteProject несуществующего id не бросает", () => {
    expect(() => projectStore.deleteProject("нет-такого")).not.toThrow();
  });

  it("listProjects сортирует по updatedAt (сначала недавние)", () => {
    const older = { ...makeSavedProject("Старый"), updatedAt: "2024-01-01T00:00:00.000Z" };
    const newer = { ...makeSavedProject("Новый"), updatedAt: "2025-01-01T00:00:00.000Z" };
    projectStore.saveProject(older);
    projectStore.saveProject(newer);
    const list = projectStore.listProjects();
    expect(list.map((p) => p.name)).toEqual(["Новый", "Старый"]);
  });
});

describe("projectStore — устойчивость к испорченным данным", () => {
  it("невалидный JSON в хранилище: listProjects бросает StorageError, приложение может это поймать", () => {
    window.localStorage.setItem(KEY, "{этот json не парсится");
    expect(() => projectStore.listProjects()).toThrow(StorageError);
  });

  it("после StorageError можно безопасно перейти в пустой список на уровне вызывающего кода", () => {
    window.localStorage.setItem(KEY, "мусор-не-json");
    let list: ReturnType<typeof projectStore.listProjects>;
    try {
      list = projectStore.listProjects();
    } catch (error) {
      expect(error).toBeInstanceOf(StorageError);
      list = [];
    }
    expect(list).toEqual([]);
  });

  it("значение — не массив (чужая схема): бросает StorageError", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ not: "an array" }));
    expect(() => projectStore.listProjects()).toThrow(StorageError);
  });

  it("массив с частично невалидными записями: валидные проекты остаются доступны", () => {
    const good = makeSavedProject("Хороший проект");
    const garbage = { totally: "wrong shape", version: 1 };
    window.localStorage.setItem(KEY, JSON.stringify([good, garbage]));
    const list = projectStore.listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Хороший проект");
  });

  it("массив из одних невалидных записей — пустой список, без падения", () => {
    window.localStorage.setItem(KEY, JSON.stringify([{ foo: "bar" }, null, 42, "строка"]));
    expect(projectStore.listProjects()).toEqual([]);
  });

  it("deleteProject не падает даже если хранилище повреждено", () => {
    window.localStorage.setItem(KEY, "{битый json");
    expect(() => projectStore.deleteProject("любой-id")).not.toThrow();
  });

  it("saveProject бросает StorageError при переполнении квоты", () => {
    const project = makeSavedProject();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(() => projectStore.saveProject(project)).toThrow(StorageError);
    setItemSpy.mockRestore();
  });
});
