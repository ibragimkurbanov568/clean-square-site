/**
 * Контракт сборки HTML-документа сайта (F5, F6, F7).
 *
 * ГЛАВНОЕ АРХИТЕКТУРНОЕ РЕШЕНИЕ (см. docs/04-architecture.md, §2):
 * предпросмотр и экспорт — это ОДИН И ТОТ ЖЕ HTML-документ, собранный
 * одной и той же функцией `assembleSiteDocument`. Предпросмотр
 * рендерится как `<iframe srcDoc={assembleSiteDocument(project, {mode:
 * "preview"}).html} />`, а «Скачать сайт» берёт
 * `assembleSiteDocument(project, {mode: "export"}).html` и отдаёт его
 * как Blob на скачивание. Разница между режимами — только в
 * косметике (например, в preview-режиме можно не добавлять
 * `<meta name="generator">`), никогда — в вёрстке, CSS или JS-эффектах.
 * Это структурно гарантирует критерий ТЗ F7 «открытый в браузере
 * файл выглядит идентично предпросмотру», а не держится на
 * договорённости между двумя независимыми реализациями рендера.
 *
 * Ноль импортов React — сборка возвращает строку HTML, не JSX.
 */
import type { Project, Section } from "./project";
import type { Theme } from "./theme";

export type AssembleMode = "preview" | "export";

export interface AssembleOptions {
  mode: AssembleMode;
}

export interface AssembledDocument {
  /** Полный самостоятельный документ: `<!doctype html>…</html>`, инлайновые `<style>`/`<script>`, без внешних ссылок. */
  html: string;
  /** Название проекта — для `<title>` и для `title`/`aria-label` кадра `<iframe>` в редакторе. */
  title: string;
}

/**
 * Собирает документ сайта из проекта: секции (в порядке `order`,
 * пропуская `visible: false`), CSS темы (`--site-*` для `project.themeId`
 * из site-themes.css) и, если `project.effectsEnabled`, — CSS/JS
 * скролл-анимаций и hover-переходов. Обработка
 * `prefers-reduced-motion: reduce` встроена в сам CSS документа через
 * медиа-запрос (как в tokens.css) — эта функция не должна опрашивать
 * `window.matchMedia` сама, иначе результат перестанет быть чистой
 * функцией от `project` и не будет детерминированным в тестах.
 */
export type AssembleSiteDocument = (project: Project, options: AssembleOptions) => AssembledDocument;

export interface RenderContext {
  theme: Theme;
  effectsEnabled: boolean;
  /** Только для доступа к industry-специфичным декоративным деталям (например подписи плейсхолдеров галереи), не для генерации текста — текст уже готов в `section`. */
  industry: Project["industry"];
}

/** Рендерит одну секцию в HTML-фрагмент (используется внутри assembleSiteDocument). */
export type SectionHtmlRenderer = (section: Section, ctx: RenderContext) => string;

export type SectionRendererRegistry = Readonly<Record<Section["type"], SectionHtmlRenderer>>;

/* -------------------------------------------------------------------- */
/* Экспорт в файл (F7)                                                  */
/* -------------------------------------------------------------------- */

export interface ExportResult {
  /** `<транслитерация-названия>.html`, например `kofeynya-atmosfera.html`. */
  filename: string;
  html: string;
}

/**
 * Оборачивает `assembleSiteDocument(project, {mode: "export"})` и
 * считает имя файла транслитерацией `project.name`. Не должна
 * ничего писать на диск/скачивать сама — DOM-специфичный вызов
 * (`Blob` + `<a download>`) остаётся в UI-слое (шаг 6), эта функция
 * только готовит данные и остаётся тестируемой без DOM.
 *
 * Контракт F7: вызывающая сторона обязана проверить, что в проекте
 * есть хотя бы одна видимая секция типа "hero", ДО вызова этой
 * функции — сама функция не бросает и не проверяет это правило
 * (правило UI-уровня: неактивная кнопка/тост, а не исключение).
 */
export type ExportProjectToHtml = (project: Project) => ExportResult;
