/**
 * Библиотека блоков (F2) — 10 типов секций, дословно все значения
 * `SectionType` из `src/types/project.ts` (ТЗ требует «список из ≥8
 * типов секций», здесь есть все 10). Порядок показа карточек в
 * оверлее «Библиотека блоков» задаёт `SECTION_LIBRARY_ORDER` —
 * константа уже объявлена как контракт в `src/types/generator.ts`.
 */
import type { SectionType } from "../types/project";
import type { SectionLibrary, SectionTypeDefinition } from "../types/generator";

export const SECTION_LIBRARY: SectionLibrary = {
  hero: {
    type: "hero",
    labelRu: "Hero",
    descriptionRu: "Первый экран сайта: крупный заголовок, короткий подзаголовок и кнопка призыва к действию.",
    icon: "layout-hero",
    hasBody: true,
    hasItems: false,
    hasCtaText: true,
  },
  about: {
    type: "about",
    labelRu: "О компании",
    descriptionRu: "О компании — история, ценности и подход в одном абзаце.",
    icon: "info",
    hasBody: true,
    hasItems: false,
    hasCtaText: false,
  },
  services: {
    type: "services",
    labelRu: "Услуги",
    descriptionRu: "Услуги — карточки с перечнем того, что вы предлагаете.",
    icon: "grid",
    hasBody: true,
    hasItems: true,
    itemFields: { primaryLabel: "Услуга" },
    maxItems: 8,
    hasCtaText: false,
  },
  features: {
    type: "features",
    labelRu: "Преимущества",
    descriptionRu: "Преимущества — короткие карточки с причинами выбрать именно вас.",
    icon: "star",
    hasBody: true,
    hasItems: true,
    itemFields: { primaryLabel: "Преимущество" },
    maxItems: 8,
    hasCtaText: false,
  },
  pricing: {
    type: "pricing",
    labelRu: "Тарифы",
    descriptionRu: "Тарифы — карточки с ценами и списком возможностей.",
    icon: "tag",
    hasBody: true,
    hasItems: true,
    itemFields: { primaryLabel: "Тариф", secondaryLabel: "Цена" },
    maxItems: 8,
    hasCtaText: false,
  },
  testimonials: {
    type: "testimonials",
    labelRu: "Отзывы",
    descriptionRu: "Отзывы — цитаты клиентов с именем и коротким комментарием.",
    icon: "quote",
    hasBody: false,
    hasItems: true,
    itemFields: { primaryLabel: "Имя", secondaryLabel: "Текст отзыва" },
    maxItems: 8,
    hasCtaText: false,
  },
  gallery: {
    type: "gallery",
    labelRu: "Галерея",
    descriptionRu: "Галерея-плейсхолдер — декоративные плитки с подписями (без загрузки фото).",
    icon: "image",
    hasBody: false,
    hasItems: true,
    itemFields: { primaryLabel: "Подпись" },
    maxItems: 8,
    hasCtaText: false,
  },
  cta: {
    type: "cta",
    labelRu: "Призыв к действию",
    descriptionRu: "CTA — финальный блок с призывом связаться или оставить заявку.",
    icon: "megaphone",
    hasBody: true,
    hasItems: false,
    hasCtaText: true,
  },
  contacts: {
    type: "contacts",
    labelRu: "Контакты",
    descriptionRu: "Контакты — как и когда с вами можно связаться.",
    icon: "map-pin",
    hasBody: true,
    hasItems: false,
    hasCtaText: false,
  },
  footer: {
    type: "footer",
    labelRu: "Подвал",
    descriptionRu: "Подвал страницы — короткая строка с копирайтом.",
    icon: "footer",
    hasBody: true,
    hasItems: false,
    hasCtaText: false,
  },
};

/** Список определений в заданном порядке (обычно `SECTION_LIBRARY_ORDER`), удобно для .map() в UI. */
export function listSectionDefinitions(order: readonly SectionType[]): SectionTypeDefinition[] {
  return order.map((type) => SECTION_LIBRARY[type]);
}
