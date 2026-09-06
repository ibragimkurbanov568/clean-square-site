/**
 * Слой хранения проектов (F8) поверх `window.localStorage`. Один ключ
 * `noesdize:projects` со значением — JSON-массив `Project[]` (см.
 * docs/04-architecture.md §4.5).
 *
 * Устойчивость к повреждённым данным: если в хранилище лежит мусор
 * (невалидный JSON) или значение не является массивом — верхнеуровневая
 * структура считается повреждённой, `listProjects`/`loadProject`
 * бросают `StorageError` (контракт `src/types/storage.ts`), а вызывающая
 * сторона (UI) обязана поймать её и показать баннер, не роняя
 * приложение (F8, «Ошибка чтения/записи localStorage… не роняет
 * редактор»). Если же массив в целом валиден, но отдельные элементы
 * не проходят проверку формы (например, объект от чужой/более старой
 * версии схемы) — такие элементы молча пропускаются, а не всё
 * хранилище целиком: список для пользователя просто окажется короче
 * (в пределе — пустым), но приложение не падает и не блокирует работу
 * с остальными, валидными проектами.
 */
import type { IndustryId, Project, Section, SectionListItem, ThemeId, ToneId, ViewportMode } from "../types/project";
import type { ProjectStore, ProjectSummary } from "../types/storage";
import { StorageError } from "../types/storage";

const STORAGE_KEY = "noesdize:projects";

const INDUSTRY_IDS: readonly IndustryId[] = ["cafe", "it", "beauty", "shop", "consulting", "education", "other"];
const TONE_IDS: readonly ToneId[] = ["formal", "friendly", "bold", "minimal"];
const THEME_ID_VALUES: readonly ThemeId[] = ["atlant", "remeslo", "impulse", "vozdukh", "karnaval", "barhat"];
const VIEWPORT_MODES: readonly ViewportMode[] = ["desktop", "tablet", "mobile"];
const SECTION_TYPES = [
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function isValidSectionListItem(value: unknown): value is SectionListItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  if (!isNonEmptyString(item.id)) return false;
  if (typeof item.primary !== "string") return false;
  if (item.secondary !== undefined && typeof item.secondary !== "string") return false;
  return true;
}

function isValidSection(value: unknown): value is Section {
  if (typeof value !== "object" || value === null) return false;
  const section = value as Record<string, unknown>;
  if (!isNonEmptyString(section.id)) return false;
  if (!isOneOf(section.type, SECTION_TYPES)) return false;
  if (typeof section.order !== "number" || !Number.isFinite(section.order)) return false;
  if (typeof section.title !== "string") return false;
  if (section.body !== undefined && typeof section.body !== "string") return false;
  if (section.items !== undefined) {
    if (!Array.isArray(section.items) || !section.items.every(isValidSectionListItem)) return false;
  }
  if (section.ctaText !== undefined && typeof section.ctaText !== "string") return false;
  if (typeof section.isCustomText !== "boolean") return false;
  if (typeof section.visible !== "boolean") return false;
  return true;
}

/** Проверяет, что значение из хранилища — это структурно валидный `Project` (защита от мусора/чужой схемы). */
function isValidProject(value: unknown): value is Project {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  if (!isNonEmptyString(p.id)) return false;
  if (typeof p.name !== "string" || p.name.length === 0 || p.name.length > 60) return false;
  if (!isOneOf(p.industry, INDUSTRY_IDS)) return false;
  if (!isOneOf(p.tone, TONE_IDS)) return false;
  if (!isOneOf(p.themeId, THEME_ID_VALUES)) return false;
  if (typeof p.effectsEnabled !== "boolean") return false;
  if (!isOneOf(p.viewport, VIEWPORT_MODES)) return false;
  if (!Array.isArray(p.sections) || p.sections.length < 1 || !p.sections.every(isValidSection)) return false;
  if (!isNonEmptyString(p.createdAt)) return false;
  if (!isNonEmptyString(p.updatedAt)) return false;
  return true;
}

/**
 * Читает и разбирает верхнеуровневое значение из `localStorage`.
 * Бросает `StorageError`, если сам localStorage недоступен
 * (приватный режим Safari, отключённый в настройках браузера) или
 * значение по ключу — не валидный JSON-массив.
 */
function readRawList(): unknown[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (cause) {
    throw new StorageError("Хранилище браузера недоступно (приватный режим или отключено в настройках).", {
      cause,
    });
  }
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new StorageError("Сохранённые проекты повреждены: не удалось разобрать данные.", { cause });
  }
  if (!Array.isArray(parsed)) {
    throw new StorageError("Формат сохранённых проектов не распознан (ожидался список проектов).");
  }
  return parsed;
}

/** Читает валидные проекты, молча отбрасывая записи с посторонней/битой формой (см. комментарий вверху файла). */
function readValidProjects(): Project[] {
  return readRawList().filter(isValidProject);
}

function writeProjects(projects: readonly Project[]): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(projects);
  } catch (cause) {
    throw new StorageError("Не удалось подготовить проект к сохранению.", { cause });
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (cause) {
    const isQuotaError =
      cause instanceof DOMException &&
      (cause.name === "QuotaExceededError" || cause.name === "NS_ERROR_DOM_QUOTA_REACHED");
    throw new StorageError(
      isQuotaError
        ? "Не удалось сохранить локально: закончилось место в хранилище браузера."
        : "Не удалось сохранить локально: хранилище браузера недоступно.",
      { cause },
    );
  }
}

function toSummary(project: Project): ProjectSummary {
  return { id: project.id, name: project.name, updatedAt: project.updatedAt, themeId: project.themeId };
}

/** Реализация `ProjectStore` (F8) поверх `window.localStorage`. */
export const projectStore: ProjectStore = {
  listProjects(): ProjectSummary[] {
    const projects = readValidProjects();
    return projects
      .map(toSummary)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  },

  loadProject(id: string): Project | undefined {
    return readValidProjects().find((project) => project.id === id);
  },

  saveProject(project: Project): void {
    const existing = readValidProjects();
    const index = existing.findIndex((p) => p.id === project.id);
    const next = index === -1 ? [...existing, project] : existing.map((p, i) => (i === index ? project : p));
    writeProjects(next);
  },

  deleteProject(id: string): void {
    let existing: Project[];
    try {
      existing = readValidProjects();
    } catch {
      // Хранилище уже повреждено — удалять нечего, идемпотентность важнее строгости.
      return;
    }
    const next = existing.filter((project) => project.id !== id);
    if (next.length === existing.length) return; // id не найден — no-op, идемпотентно.
    try {
      writeProjects(next);
    } catch {
      // Не роняем вызывающую сторону: удаление — best effort, см. контракт «идемпотентна».
    }
  },
};
