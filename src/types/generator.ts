/**
 * Контракты словарей и локального генератора текста (F1, F2, F3).
 *
 * Все функции здесь описаны как ТИПЫ сигнатур (`export type Foo = (...) => ...`),
 * а не как реализации — сами функции пишет шаг 5 в src/content/**
 * и src/lib/projectFactory.ts, придерживаясь этих сигнатур дословно.
 * Ноль импортов React. Ноль сетевых вызовов (F3, критерий готовности ТЗ).
 */
import type {
  IndustryId,
  Project,
  Section,
  SectionListItem,
  SectionType,
  ToneId,
} from "./project";

/* -------------------------------------------------------------------- */
/* Словари (F1): отрасль и тон                                          */
/* -------------------------------------------------------------------- */

export interface IndustryOption {
  id: IndustryId;
  /** Название чипа в мастере, например «Кафе и рестораны». */
  labelRu: string;
}

export interface ToneOption {
  id: ToneId;
  /** Название чипа тона, например «Дружелюбный». */
  labelRu: string;
}

/* -------------------------------------------------------------------- */
/* Библиотека блоков (F2): 10 типов секций                              */
/* -------------------------------------------------------------------- */

/** Подписи для пары полей одного элемента списка (см. SectionListItem). */
export interface SectionItemFieldLabels {
  primaryLabel: string;
  /** Если undefined — у элемента только одно поле (primary). */
  secondaryLabel?: string;
}

/**
 * Описание одного типа секции для библиотеки блоков и формы
 * редактирования (F2). `icon` — строковый ключ, а не JSX/компонент:
 * контракт не должен знать о React, разрешение ключа в реальную
 * иконку — забота компонента библиотеки блоков (шаг 6).
 */
export interface SectionTypeDefinition {
  type: SectionType;
  /** Название на русском, например «Тарифы». */
  labelRu: string;
  /** Короткое описание в карточке библиотеки, например «Тарифы — карточки с ценами и списком возможностей». */
  descriptionRu: string;
  /** Ключ иконки, разрешается в src/components (шаг 6). */
  icon: string;
  /** Показывать ли поле «Текст» (textarea, до 600 символов). */
  hasBody: boolean;
  /** Показывать ли блок «Элементы» (services/features/pricing/testimonials/gallery). */
  hasItems: boolean;
  /** Подписи полей элемента списка, только если hasItems. */
  itemFields?: SectionItemFieldLabels;
  /** Максимум элементов списка (спецификация: 8 для всех списков). */
  maxItems?: number;
  /** Показывать ли поле «Текст кнопки» (только hero и cta). */
  hasCtaText: boolean;
}

export type SectionLibrary = Readonly<Record<SectionType, SectionTypeDefinition>>;

/** Порядок карточек в оверлее «Библиотека блоков» (F2, 02-ux.md). */
export const SECTION_LIBRARY_ORDER: readonly SectionType[] = [
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

/** Порядок 4 секций, которые мастер собирает сразу при создании проекта (F1). */
export const WIZARD_INITIAL_SECTION_ORDER: readonly SectionType[] = [
  "hero",
  "about",
  "services",
  "contacts",
];

/* -------------------------------------------------------------------- */
/* Генератор текста (F3)                                                */
/* -------------------------------------------------------------------- */

export interface GenerateSectionContentInput {
  type: SectionType;
  industry: IndustryId;
  tone: ToneId;
  /**
   * Идентификатор проекта, используется как посевное значение для
   * детерминированного псевдослучайного выбора варианта фразы —
   * тот же `(industry, tone, type, seed)` обязан всегда давать тот
   * же результат (F3: «детерминированно… либо с посевным
   * псевдослучайным выбором на основе project.id», 01-spec.md).
   */
  seed: string;
}

export interface GeneratedSectionContent {
  title: string;
  body?: string;
  items?: SectionListItem[];
  ctaText?: string;
}

/** Собирает текст одной секции по словарю отрасли+тона. Чистая функция, без побочных эффектов. */
export type GenerateSectionContent = (
  input: GenerateSectionContentInput,
) => GeneratedSectionContent;

/**
 * Создаёт новую секцию заданного типа в конце списка (F2 «Добавить
 * секцию»): вычисляет `order`, генерирует текст по текущим
 * industry/tone проекта, `isCustomText: false`, `visible: true`.
 */
export type CreateSectionOfType = (type: SectionType, project: Project) => Section;

export interface RegenerateOptions {
  /**
   * true — «Перегенерировать все тексты» (диалог-подтверждение):
   * перезаписывает и `isCustomText: true` секции, сбрасывая флаг в false.
   * false — тихая пересборка при смене отрасли/тона: трогает только
   * секции с `isCustomText: false`.
   */
  force: boolean;
}

/** Пересобирает тексты секций проекта по правилам F3. Возвращает новый объект Project (иммутабельно). */
export type RegenerateProjectTexts = (project: Project, options: RegenerateOptions) => Project;

export interface CreateProjectInput {
  /** Уже обрезано до 60 символов на уровне формы, здесь только валидная строка. */
  name: string;
  industry: IndustryId;
  tone: ToneId;
  /**
   * Названия уже сохранённых проектов (без учёта регистра) — нужны
   * для правила уникальности имени с суффиксом «(2)», «(3)» (01-spec.md).
   */
  existingNames: string[];
}

export interface CreateProjectResult {
  project: Project;
  /**
   * Итоговое имя отличалось от запрошенного (сработал суффикс
   * уникальности) — фронтенд использует это, чтобы показать тост
   * «Название уже занято — сайт сохранён как «…»» (02-ux.md, F1 п.8).
   */
  renamed: boolean;
}

/** Собирает проект из мастера (F1): id, 4 секции, тема/эффекты по умолчанию. */
export type CreateProject = (input: CreateProjectInput) => CreateProjectResult;
