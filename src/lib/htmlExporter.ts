/**
 * Экспорт проекта в единый HTML-файл (F7). Оборачивает
 * `assembleSiteDocument(project, { mode: "export" })` и добавляет имя
 * файла — транслитерация `project.name` в kebab-case + `.html`.
 *
 * Не пишет на диск и не открывает `Blob`/`<a download>` — это
 * DOM-специфичная часть остаётся в UI-слое (шаг 6), эта функция
 * тестируема без DOM.
 *
 * Проверку «есть ли видимая Hero-секция» эта функция намеренно НЕ
 * делает (правило UI-уровня — неактивная кнопка/тост, см.
 * `src/types/render.ts`).
 */
import type { ExportProjectToHtml, ExportResult } from "../types/render";
import { assembleSiteDocument } from "./pageAssembler";
import { slugify } from "./id";

export const exportProjectToHtml: ExportProjectToHtml = (project): ExportResult => {
  const { html } = assembleSiteDocument(project, { mode: "export" });
  const filename = `${slugify(project.name)}.html`;
  return { filename, html };
};
