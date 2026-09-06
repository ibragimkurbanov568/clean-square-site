/**
 * Идентификаторы и транслитерация (без React, без сети).
 *
 * `createId` — обёртка над нативным `crypto.randomUUID()` (см.
 * docs/04-architecture.md, §1 «Осознанно не добавлено»: пакет `uuid`
 * не нужен). Используется для id проектов и секций — генерация id
 * НЕ обязана быть детерминированной (в отличие от генератора текста,
 * F3), поэтому здесь допустим настоящий случайный источник.
 *
 * `slugify` — транслитерация русского названия проекта в kebab-case
 * для имени файла экспорта (F7), например «Кофейня Атмосфера» →
 * `kofeynya-atmosfera`.
 */

/** Генерирует новый уникальный идентификатор сущности (проект/секция). */
export function createId(): string {
  return crypto.randomUUID();
}

/** Посимвольная транслитерация кириллицы в латиницу (ГОСТ-подобная, читаемая). */
const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/**
 * Превращает произвольную строку (обычно `project.name`) в kebab-case
 * имя файла без расширения: транслитерация кириллицы, всё остальное,
 * что не `[a-z0-9]`, схлопывается в одно тире. Пустой результат (имя
 * состояло только из символов вне [а-яa-z0-9], например одни эмодзи)
 * заменяется на `"site"`, чтобы `ExportProjectToHtml` (F7) всегда
 * возвращал непустое имя файла.
 */
export function slugify(input: string): string {
  const transliterated = Array.from(input.toLowerCase())
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
  const slug = transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.length > 0 ? slug : "site";
}
