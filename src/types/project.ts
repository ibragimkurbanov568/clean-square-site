/**
 * NoesDize — общая модель данных проекта.
 *
 * Это чистый типовой контракт (zero runtime, zero React-импортов).
 * И бэкенд-слой (src/content/**, src/lib/**), и интерфейс
 * (src/routes/**, src/components/**) обязаны опираться только на эти
 * типы. Менять этот файл после начала параллельной работы шага 5 и
 * шага 6 нельзя без согласования — оба агента читают его как контракт.
 *
 * Источник истины по смыслу полей: docs/01-spec.md, раздел «Модель
 * данных». Источник истины по идентификаторам тем/отраслей:
 * docs/03-design-system.md (§2 «Шесть тем оформления сайтов») и
 * docs/02-ux.md (список чипов отрасли/тона в мастере).
 */

/** Тон текста — 4 варианта, см. 02-ux.md, блок «Тон текста». */
export type ToneId = "formal" | "friendly" | "bold" | "minimal";

/**
 * Отрасль — 7 вариантов из мастера создания (F1). Значение "other"
 * («Другое») — умолчание модели данных согласно 01-spec.md.
 */
export type IndustryId =
  | "cafe"
  | "it"
  | "beauty"
  | "shop"
  | "consulting"
  | "education"
  | "other";

/**
 * Идентификатор темы сайта — должен дословно совпадать со значением
 * атрибута `data-site-theme` в src/styles/site-themes.css. Ни один
 * агент не имеет права ввести седьмую тему без правки дизайн-системы.
 */
export type ThemeId =
  | "atlant"
  | "remeslo"
  | "impulse"
  | "vozdukh"
  | "karnaval"
  | "barhat";

/** Ширина кадра предпросмотра — влияет только на UI редактора, не на экспорт. */
export type ViewportMode = "desktop" | "tablet" | "mobile";

/**
 * Тип секции — 10 вариантов библиотеки блоков (F2). Порядок в этом
 * union — рекомендованный порядок показа в библиотеке блоков.
 */
export type SectionType =
  | "hero"
  | "about"
  | "services"
  | "features"
  | "pricing"
  | "testimonials"
  | "gallery"
  | "cta"
  | "contacts"
  | "footer";

/**
 * Элемент списка внутри секции (услуги/преимущества/тарифы/отзывы/
 * галерея). Намеренно один плоский тип на все случаи вместо union по
 * типу секции — так генератору текста, форме редактирования и
 * рендереру не нужно ветвиться по форме объекта, только по тому,
 * какие подписи полей показывать (см. `SectionTypeDefinition` в
 * generator.ts: `itemFields`).
 *
 * - services / features / gallery — используется только `primary`
 *   (`secondary` не заполняется).
 * - pricing — `primary` = название тарифа, `secondary` = цена.
 * - testimonials — `primary` = имя, `secondary` = текст отзыва.
 */
export interface SectionListItem {
  id: string;
  primary: string;
  secondary?: string;
}

/**
 * Секция страницы. Максимум 8 элементов в `items` и 12 секций в
 * проекте — эти пределы проверяются в src/lib/projectFactory.ts
 * (F2), а не здесь: это только форма данных, не валидатор.
 */
export interface Section {
  id: string;
  type: SectionType;
  /** Уникален в рамках проекта, определяет порядок отображения. */
  order: number;
  /** До 80 символов. */
  title: string;
  /** До 600 символов. Не показывается в форме для типов без текста абзаца. */
  body?: string;
  /** До 8 элементов. Есть только у services/features/pricing/testimonials/gallery. */
  items?: SectionListItem[];
  /** До 40 символов. Есть только у hero и cta. */
  ctaText?: string;
  /**
   * true, если хотя бы одно текстовое поле секции правил пользователь
   * вручную. Пока true — автоматическая пересборка по F3 не трогает
   * эту секцию; сбрасывается в false только при полной
   * «Перегенерировать всё».
   */
  isCustomText: boolean;
  /** Скрытая секция не попадает ни в предпросмотр, ни в экспорт. */
  visible: boolean;
}

/** Проект — корневая сущность, сериализуется в localStorage как JSON. */
export interface Project {
  id: string;
  /** 1–60 символов, уникально среди сохранённых проектов (см. правила ТЗ). */
  name: string;
  industry: IndustryId;
  tone: ToneId;
  themeId: ThemeId;
  effectsEnabled: boolean;
  /** Состояние UI редактора, не влияет на экспорт. */
  viewport: ViewportMode;
  /** Минимум 1 секция. */
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Значения по умолчанию модели данных — см. 01-spec.md, таблица Project.
 *
 * Решение архитектора: 01-spec.md и 02-ux.md называют тему по умолчанию
 * «Aurora (светлая)», но такой темы нет в финальном наборе из шести тем
 * дизайн-системы (docs/03-design-system.md: atlant/remeslo/impulse/
 * vozdukh/karnaval/barhat — «Aurora» не является ни одной из них).
 * Ближайший смысловой аналог — «Воздух» (`vozdukh`): светлая,
 * минималистичная, нейтральная тема без выраженной отраслевой
 * привязки, подходящая как безопасный дефолт для любой отрасли.
 * Дальнейшие агенты используют `vozdukh` как тему по умолчанию и не
 * ищут отдельную тему «Aurora» — её не существует.
 */
export const PROJECT_DEFAULTS = {
  industry: "other" as IndustryId,
  tone: "friendly" as ToneId,
  themeId: "vozdukh" as ThemeId,
  effectsEnabled: true,
  viewport: "desktop" as ViewportMode,
} as const;
