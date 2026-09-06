/**
 * Рендереры секций (F2/F5/F6/F7) — превращают одну `Section` в чистый
 * HTML-фрагмент на классах `.site-*` (стили этих классов инлайнит
 * `assembleSiteDocument`, см. `src/lib/pageAssembler.ts`). Ноль
 * импортов React — только строки.
 *
 * Правило безопасности: любой пользовательский текст (`title`,
 * `body`, `items[].primary/secondary`, `ctaText`) обязан пройти через
 * `escapeHtml` перед вставкой в разметку — это одновременно защита от
 * поломки вёрстки спецсимволами и от внедрения скрипта в
 * экспортируемый файл (XSS через сохранённый текст).
 */
import type { Section, SectionListItem } from "../types/project";
import type { RenderContext, SectionHtmlRenderer, SectionRendererRegistry } from "../types/render";

/** Экранирует спецсимволы HTML — обязательна для любого пользовательского текста. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Рендерит многострочный текст как параграфы: пустая строка разделяет
 * абзацы, одиночный перенос строки внутри абзаца становится `<br>`.
 * Каждый фрагмент текста экранируется по отдельности — переносы строк
 * сами по себе не несут разметки.
 */
function renderParagraphs(body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const source = paragraphs.length > 0 ? paragraphs : [body];
  return source
    .map((paragraph) => {
      const lines = paragraph.split("\n").map((line) => escapeHtml(line));
      return `<p class="site-text">${lines.join("<br>")}</p>`;
    })
    .join("");
}

/** data-атрибут для JS-скролл-анимации (см. pageAssembler) — добавляется только если эффекты включены. */
function revealAttr(ctx: RenderContext): string {
  return ctx.effectsEnabled ? ' data-reveal="up"' : "";
}

function heroClass(ctx: RenderContext): string {
  return ctx.effectsEnabled ? "site-hero site-hero--effects" : "site-hero";
}

function renderItemsGrid(items: readonly SectionListItem[] | undefined, ctx: RenderContext, cardClass: string): string {
  if (!items || items.length === 0) return "";
  const cards = items
    .map(
      (item, index) => `
        <li class="${cardClass}"${index === 0 ? "" : revealAttr(ctx)}>
          <p class="site-card__title">${escapeHtml(item.primary)}</p>
          ${item.secondary ? `<p class="site-card__meta">${escapeHtml(item.secondary)}</p>` : ""}
        </li>`,
    )
    .join("");
  return `<ul class="site-grid">${cards}</ul>`;
}

const renderHero: SectionHtmlRenderer = (section: Section, ctx: RenderContext): string => `
  <section id="section-${escapeHtml(section.id)}" class="site-section ${heroClass(ctx)}">
    <div class="site-container site-hero__inner">
      <div class="site-hero__glass">
        <h1 class="site-heading-xl">${escapeHtml(section.title)}</h1>
        ${section.body ? `<p class="site-hero__subtitle">${escapeHtml(section.body)}</p>` : ""}
        ${section.ctaText ? `<a class="site-btn site-btn--primary" href="#contacts">${escapeHtml(section.ctaText)}</a>` : ""}
      </div>
    </div>
  </section>`;

const renderAbout: SectionHtmlRenderer = (section: Section, ctx: RenderContext): string => `
  <section id="section-${escapeHtml(section.id)}" class="site-section"${revealAttr(ctx)}>
    <div class="site-container site-section--narrow">
      <h2 class="site-heading-lg">${escapeHtml(section.title)}</h2>
      ${section.body ? renderParagraphs(section.body) : ""}
    </div>
  </section>`;

const renderServices: SectionHtmlRenderer = (section: Section, ctx: RenderContext): string => `
  <section id="section-${escapeHtml(section.id)}" class="site-section site-section--alt"${revealAttr(ctx)}>
    <div class="site-container">
      <h2 class="site-heading-lg">${escapeHtml(section.title)}</h2>
      ${section.body ? `<p class="site-text site-text--lead">${escapeHtml(section.body)}</p>` : ""}
      ${renderItemsGrid(section.items, ctx, "site-card site-card--service")}
    </div>
  </section>`;

const renderFeatures: SectionHtmlRenderer = (section: Section, ctx: RenderContext): string => `
  <section id="section-${escapeHtml(section.id)}" class="site-section"${revealAttr(ctx)}>
    <div class="site-container">
      <h2 class="site-heading-lg">${escapeHtml(section.title)}</h2>
      ${section.body ? `<p class="site-text site-text--lead">${escapeHtml(section.body)}</p>` : ""}
      ${renderItemsGrid(section.items, ctx, "site-card site-card--feature")}
    </div>
  </section>`;

const renderPricing: SectionHtmlRenderer = (section: Section, ctx: RenderContext): string => {
  const cards = (section.items ?? [])
    .map(
      (item, index) => `
        <li class="site-card site-card--pricing"${index === 0 ? "" : revealAttr(ctx)}>
          <p class="site-card__title">${escapeHtml(item.primary)}</p>
          ${item.secondary ? `<p class="site-card__price">${escapeHtml(item.secondary)}</p>` : ""}
        </li>`,
    )
    .join("");
  return `
  <section id="section-${escapeHtml(section.id)}" class="site-section site-section--alt"${revealAttr(ctx)}>
    <div class="site-container">
      <h2 class="site-heading-lg">${escapeHtml(section.title)}</h2>
      ${section.body ? `<p class="site-text site-text--lead">${escapeHtml(section.body)}</p>` : ""}
      <ul class="site-grid">${cards}</ul>
    </div>
  </section>`;
};

const renderTestimonials: SectionHtmlRenderer = (section: Section, ctx: RenderContext): string => {
  const cards = (section.items ?? [])
    .map(
      (item, index) => `
        <li class="site-card site-card--testimonial"${index === 0 ? "" : revealAttr(ctx)}>
          ${item.secondary ? `<p class="site-quote">«${escapeHtml(item.secondary)}»</p>` : ""}
          <p class="site-card__meta">${escapeHtml(item.primary)}</p>
        </li>`,
    )
    .join("");
  return `
  <section id="section-${escapeHtml(section.id)}" class="site-section"${revealAttr(ctx)}>
    <div class="site-container">
      <h2 class="site-heading-lg">${escapeHtml(section.title)}</h2>
      <ul class="site-grid">${cards}</ul>
    </div>
  </section>`;
};

const renderGallery: SectionHtmlRenderer = (section: Section, ctx: RenderContext): string => {
  const tiles = (section.items ?? [])
    .map(
      (item, index) => `
        <li class="site-gallery__tile site-gallery__tile--${(index % 4) + 1}"${index === 0 ? "" : revealAttr(ctx)}>
          <span>${escapeHtml(item.primary)}</span>
        </li>`,
    )
    .join("");
  return `
  <section id="section-${escapeHtml(section.id)}" class="site-section"${revealAttr(ctx)}>
    <div class="site-container">
      <h2 class="site-heading-lg">${escapeHtml(section.title)}</h2>
      ${section.body ? `<p class="site-text site-text--lead">${escapeHtml(section.body)}</p>` : ""}
      <ul class="site-grid site-gallery">${tiles}</ul>
    </div>
  </section>`;
};

const renderCta: SectionHtmlRenderer = (section: Section, ctx: RenderContext): string => `
  <section id="section-${escapeHtml(section.id)}" class="site-section site-section--cta"${revealAttr(ctx)}>
    <div class="site-container site-section--narrow">
      <h2 class="site-heading-lg">${escapeHtml(section.title)}</h2>
      ${section.body ? `<p class="site-text site-text--lead">${escapeHtml(section.body)}</p>` : ""}
      ${section.ctaText ? `<a class="site-btn site-btn--primary" href="#contacts">${escapeHtml(section.ctaText)}</a>` : ""}
    </div>
  </section>`;

const renderContacts: SectionHtmlRenderer = (section: Section, ctx: RenderContext): string => `
  <section id="section-${escapeHtml(section.id)}" class="site-section site-section--alt"${revealAttr(ctx)}>
    <div class="site-container site-section--narrow">
      <h2 class="site-heading-lg">${escapeHtml(section.title)}</h2>
      ${section.body ? renderParagraphs(section.body) : ""}
    </div>
  </section>`;

const renderFooter: SectionHtmlRenderer = (section: Section): string => `
  <footer id="section-${escapeHtml(section.id)}" class="site-footer">
    <div class="site-container">
      <p class="site-footer__title">${escapeHtml(section.title)}</p>
      ${section.body ? `<p class="site-footer__meta">${escapeHtml(section.body)}</p>` : ""}
    </div>
  </footer>`;

/** Единая точка входа: реестр рендереров по типу секции (F2 — 10 типов). */
export const sectionRendererRegistry: SectionRendererRegistry = {
  hero: renderHero,
  about: renderAbout,
  services: renderServices,
  features: renderFeatures,
  pricing: renderPricing,
  testimonials: renderTestimonials,
  gallery: renderGallery,
  cta: renderCta,
  contacts: renderContacts,
  footer: renderFooter,
};
