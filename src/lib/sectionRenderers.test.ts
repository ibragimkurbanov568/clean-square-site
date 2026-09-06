import { describe, expect, it } from "vitest";
import { escapeHtml, sectionRendererRegistry } from "./sectionRenderers";
import { THEME_BY_ID } from "../content/themes";
import type { RenderContext } from "../types/render";
import type { Section, SectionType } from "../types/project";

const ctx: RenderContext = {
  theme: THEME_BY_ID.vozdukh,
  effectsEnabled: true,
  industry: "cafe",
};

function baseSection(type: SectionType, overrides: Partial<Section> = {}): Section {
  return {
    id: "sec-1",
    type,
    order: 0,
    title: "Заголовок",
    isCustomText: false,
    visible: true,
    ...overrides,
  };
}

describe("escapeHtml", () => {
  it("экранирует все опасные символы", () => {
    expect(escapeHtml(`<script>alert('x')</script> & "quotes"`)).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quotes&quot;",
    );
  });

  it("не трогает обычный текст", () => {
    expect(escapeHtml("Обычный русский текст 123")).toBe("Обычный русский текст 123");
  });
});

describe("sectionRendererRegistry — покрывает все 10 типов секций", () => {
  const types: SectionType[] = [
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

  it("реестр содержит рендерер для каждого типа", () => {
    for (const type of types) {
      expect(typeof sectionRendererRegistry[type]).toBe("function");
    }
  });

  it("каждый рендерер возвращает непустой HTML с заголовком секции", () => {
    for (const type of types) {
      const html = sectionRendererRegistry[type](baseSection(type), ctx);
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain("Заголовок");
    }
  });
});

describe("sectionRendererRegistry — экранирование пользовательского текста (защита от XSS)", () => {
  it("hero: title/body/ctaText экранированы", () => {
    const section = baseSection("hero", {
      title: `<img src=x onerror=alert(1)>`,
      body: `</p><script>alert('body')</script>`,
      ctaText: `"><script>alert('cta')</script>`,
    });
    const html = sectionRendererRegistry.hero(section, ctx);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("services: items primary экранированы", () => {
    const section = baseSection("services", {
      items: [{ id: "i1", primary: `<svg onload=alert(1)>Услуга</svg>` }],
    });
    const html = sectionRendererRegistry.services(section, ctx);
    expect(html).not.toContain("<svg onload=alert(1)>");
    expect(html).toContain("&lt;svg");
  });

  it("testimonials: primary и secondary экранированы", () => {
    const section = baseSection("testimonials", {
      items: [{ id: "i1", primary: `<b>Имя</b>`, secondary: `"><script>alert(2)</script>` }],
    });
    const html = sectionRendererRegistry.testimonials(section, ctx);
    expect(html).not.toContain("<script>alert(2)</script>");
    expect(html).not.toContain("<b>Имя</b>");
  });

  it("pricing: secondary (цена) экранирован", () => {
    const section = baseSection("pricing", {
      items: [{ id: "i1", primary: "Тариф", secondary: `<script>x</script>` }],
    });
    const html = sectionRendererRegistry.pricing(section, ctx);
    expect(html).not.toContain("<script>x</script>");
  });

  it("footer: title/body экранированы", () => {
    const section = baseSection("footer", {
      title: `<script>alert('f')</script>`,
      body: `<img src=x onerror=alert(1)>`,
    });
    const html = sectionRendererRegistry.footer(section, ctx);
    expect(html).not.toContain("<script>alert('f')</script>");
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
  });
});

describe("sectionRendererRegistry — эффекты (F6)", () => {
  it("effectsEnabled=true добавляет data-reveal", () => {
    const html = sectionRendererRegistry.about(baseSection("about"), { ...ctx, effectsEnabled: true });
    expect(html).toContain("data-reveal");
  });

  it("effectsEnabled=false не добавляет data-reveal", () => {
    const html = sectionRendererRegistry.about(baseSection("about"), { ...ctx, effectsEnabled: false });
    expect(html).not.toContain("data-reveal");
  });
});
