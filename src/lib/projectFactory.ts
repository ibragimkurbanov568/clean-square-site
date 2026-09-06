/**
 * Логика жизненного цикла проекта: создание (F1), библиотека блоков и
 * управление секциями (F2), регенерация текста (F3). Чистые функции,
 * иммутабельные — каждая возвращает новый объект `Project`, не мутирует
 * вход. Ноль импортов React, ноль обращений к `localStorage` (это
 * зона `src/lib/storage.ts`).
 */
import type { Project, Section, SectionType } from "../types/project";
import { PROJECT_DEFAULTS } from "../types/project";
import type {
  CreateProject,
  CreateProjectInput,
  CreateProjectResult,
  CreateSectionOfType,
  RegenerateOptions,
  RegenerateProjectTexts,
} from "../types/generator";
import { WIZARD_INITIAL_SECTION_ORDER } from "../types/generator";
import { SECTION_LIBRARY } from "../content/sectionLibrary";
import { generateSectionContent } from "../content/textGenerator";
import { createId } from "./id";

/** Правила и валидация ТЗ: максимум 12 секций в проекте. */
export const MAX_SECTIONS = 12;

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Создаёт новую секцию заданного типа в конце списка проекта (F2
 * «Добавить секцию»): вычисляет `order`, генерирует текст по текущим
 * `industry`/`tone` проекта, `isCustomText: false`, `visible: true`.
 */
export const createSectionOfType: CreateSectionOfType = (type: SectionType, project: Project): Section => {
  const definition = SECTION_LIBRARY[type];
  const generated = generateSectionContent({
    type,
    industry: project.industry,
    tone: project.tone,
    seed: project.id,
  });
  const nextOrder = project.sections.reduce((max, section) => Math.max(max, section.order), -1) + 1;

  const section: Section = {
    id: createId(),
    type,
    order: nextOrder,
    title: generated.title,
    isCustomText: false,
    visible: true,
  };
  if (definition.hasBody && generated.body !== undefined) section.body = generated.body;
  if (definition.hasItems && generated.items !== undefined) section.items = generated.items;
  if (definition.hasCtaText && generated.ctaText !== undefined) section.ctaText = generated.ctaText;
  return section;
};

/**
 * Добавляет секцию заданного типа в проект (F2). Если уже достигнут
 * предел `MAX_SECTIONS`, возвращает проект без изменений — интерфейс
 * обязан скрывать кнопку «Добавить секцию» раньше (правило ТЗ), эта
 * функция — второй рубеж защиты, а не единственный.
 */
export function addSection(project: Project, type: SectionType): Project {
  if (project.sections.length >= MAX_SECTIONS) {
    return project;
  }
  const section = createSectionOfType(type, project);
  return {
    ...project,
    sections: [...project.sections, section],
    updatedAt: nowIso(),
  };
}

/**
 * Удаляет секцию по id (F2). Нельзя удалить последнюю оставшуюся
 * секцию (правило ТЗ) — в этом случае проект возвращается без
 * изменений. После удаления `order` пересчитывается без пропусков,
 * чтобы список секций оставался плотной последовательностью.
 */
export function removeSection(project: Project, sectionId: string): Project {
  if (project.sections.length <= 1) {
    return project;
  }
  const remaining = project.sections.filter((section) => section.id !== sectionId);
  if (remaining.length === project.sections.length) {
    // id не найден — ничего не меняем.
    return project;
  }
  const renumbered = [...remaining]
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index }));
  return {
    ...project,
    sections: renumbered,
    updatedAt: nowIso(),
  };
}

/**
 * Переставляет секцию на одну позицию вверх/вниз в списке (F2 —
 * «поднять/опустить»). Если секция уже на краю списка, возвращает
 * проект без изменений.
 */
export function reorderSections(
  project: Project,
  sectionId: string,
  direction: "up" | "down",
): Project {
  const sorted = [...project.sections].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((section) => section.id === sectionId);
  if (index === -1) return project;

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return project;

  const a = sorted[index];
  const b = sorted[swapWith];
  const swappedOrder = a.order;
  sorted[index] = { ...a, order: b.order };
  sorted[swapWith] = { ...b, order: swappedOrder };

  return {
    ...project,
    sections: sorted,
    updatedAt: nowIso(),
  };
}

/**
 * Переключает видимость секции (используется формой редактирования,
 * например галочка «Показывать в предпросмотре»). Скрытая секция
 * (`visible: false`) не попадает ни в предпросмотр, ни в экспорт
 * (см. `src/types/render.ts`, требование 1 к `assembleSiteDocument`).
 */
export function setSectionVisibility(project: Project, sectionId: string, visible: boolean): Project {
  const sections = project.sections.map((section) =>
    section.id === sectionId ? { ...section, visible } : section,
  );
  return { ...project, sections, updatedAt: nowIso() };
}

/**
 * Точечно обновляет текстовые поля секции (ручное редактирование в
 * форме, F3). Выставляет `isCustomText: true`, чтобы регенерация без
 * `force` не перезаписала правку пользователя.
 */
export function updateSectionText(
  project: Project,
  sectionId: string,
  patch: Partial<Pick<Section, "title" | "body" | "items" | "ctaText">>,
): Project {
  const sections = project.sections.map((section) =>
    section.id === sectionId ? { ...section, ...patch, isCustomText: true } : section,
  );
  return { ...project, sections, updatedAt: nowIso() };
}

/**
 * Пересобирает тексты секций проекта (F3). С `force: false` трогает
 * только секции с `isCustomText === false` (тихая пересборка при
 * смене отрасли/тона). С `force: true` перезаписывает все секции,
 * включая ранее отредактированные вручную, и сбрасывает
 * `isCustomText` в `false` у всех.
 */
export const regenerateProjectTexts: RegenerateProjectTexts = (
  project: Project,
  options: RegenerateOptions,
): Project => {
  const sections = project.sections.map((section) => {
    if (!options.force && section.isCustomText) {
      return section;
    }
    const definition = SECTION_LIBRARY[section.type];
    const generated = generateSectionContent({
      type: section.type,
      industry: project.industry,
      tone: project.tone,
      seed: project.id,
    });
    const next: Section = {
      ...section,
      title: generated.title,
      isCustomText: false,
    };
    if (definition.hasBody) {
      next.body = generated.body;
    } else {
      delete next.body;
    }
    if (definition.hasItems) {
      next.items = generated.items;
    } else {
      delete next.items;
    }
    if (definition.hasCtaText) {
      next.ctaText = generated.ctaText;
    } else {
      delete next.ctaText;
    }
    return next;
  });

  return { ...project, sections, updatedAt: nowIso() };
};

/**
 * Гарантирует уникальность имени проекта среди уже сохранённых
 * (регистронезависимо): при совпадении добавляет суффикс « (2)»,
 * « (3)» и т.д. до первого свободного варианта (правило ТЗ).
 */
function resolveUniqueName(name: string, existingNames: readonly string[]): { name: string; renamed: boolean } {
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  if (!taken.has(name.trim().toLowerCase())) {
    return { name, renamed: false };
  }
  let attempt = 2;
  let candidate = `${name} (${attempt})`;
  while (taken.has(candidate.trim().toLowerCase())) {
    attempt += 1;
    candidate = `${name} (${attempt})`;
  }
  return { name: candidate, renamed: true };
}

/**
 * Собирает проект из мастера создания (F1): id, тема/эффекты/viewport
 * по умолчанию (`PROJECT_DEFAULTS`) и 4 стартовые секции в порядке
 * `WIZARD_INITIAL_SECTION_ORDER` (hero, about, services, contacts) с
 * текстом, сгенерированным под выбранные `industry`/`tone`.
 */
export const createProject: CreateProject = (input: CreateProjectInput): CreateProjectResult => {
  const trimmedName = input.name.trim().slice(0, 60);
  const { name, renamed } = resolveUniqueName(trimmedName, input.existingNames);

  const id = createId();
  const timestamp = nowIso();

  const draft: Project = {
    id,
    name,
    industry: input.industry,
    tone: input.tone,
    themeId: PROJECT_DEFAULTS.themeId,
    effectsEnabled: PROJECT_DEFAULTS.effectsEnabled,
    viewport: PROJECT_DEFAULTS.viewport,
    sections: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const sections = WIZARD_INITIAL_SECTION_ORDER.reduce<Section[]>((acc, type) => {
    const projectSoFar: Project = { ...draft, sections: acc };
    const section = createSectionOfType(type, projectSoFar);
    return [...acc, section];
  }, []);

  const project: Project = { ...draft, sections };

  return { project, renamed };
};
