/**
 * Контракт слоя хранения (F8). Реализация — src/lib/storage.ts (шаг 5),
 * поверх `window.localStorage`, сериализация JSON. Ноль импортов React.
 */
import type { Project, ThemeId } from "./project";

/** Данные одной карточки на стартовом экране — не весь проект, только то, что нужно для списка. */
export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  themeId: ThemeId;
}

/**
 * Ошибка чтения/записи `localStorage` (переполнение квоты, приватный
 * режим, повреждённый JSON). Вызывающая сторона обязана поймать её и
 * показать баннер «Не удалось сохранить локально» / «Не удалось
 * прочитать сохранённые проекты» (F8), а не дать приложению упасть.
 */
export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}

export interface ProjectStore {
  /** Бросает StorageError при повреждённом/недоступном localStorage. Пустой массив — валидное «нет проектов». */
  listProjects: () => ProjectSummary[];
  /** undefined — проекта с таким id нет (не ошибка). */
  loadProject: (id: string) => Project | undefined;
  /** Бросает StorageError при сбое записи (квота, приватный режим). */
  saveProject: (project: Project) => void;
  /** Идемпотентна: удаление несуществующего id не бросает. */
  deleteProject: (id: string) => void;
}
