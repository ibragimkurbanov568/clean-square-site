import { useMemo } from "react";
import type { Project, ViewportMode } from "../types";
import { assembleSiteDocument } from "../lib/pageAssembler";
import { useContainerWidth } from "../hooks/useContainerWidth";

const VIEWPORT_SIZES: Record<ViewportMode, { width: number; height: number }> = {
  desktop: { width: 1200, height: 800 },
  tablet: { width: 768, height: 900 },
  mobile: { width: 375, height: 720 },
};

const TRANSLIT_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Только для декоративной подписи «предпросмотр · …» в шапке кадра — не имя файла экспорта (то считает src/lib/htmlExporter.ts). */
function slugifyForDisplay(name: string): string {
  return name
    .toLowerCase()
    .split("")
    .map((char) => TRANSLIT_MAP[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sayt";
}

export interface PreviewFrameProps {
  project: Project;
  viewport: ViewportMode;
  isRegenerating?: boolean;
  emptyMessage?: string;
}

/**
 * Кадр предпросмотра — «окно браузера в браузере» (docs/02-ux.md,
 * «Визуальное отделение предпросмотра»). Масштабирование ширин
 * «Десктоп»/«Планшет» — через `transform: scale` во внешней обёртке с
 * `overflow: hidden` (docs/02-ux.md, «Три сложных момента», п.2), а не
 * через изменение реальной ширины блока — иначе на 375px появится
 * горизонтальная прокрутка страницы приложения.
 *
 * Один и тот же документ, что и в экспорте (F7): `assembleSiteDocument`
 * из src/lib/pageAssembler.ts, режим "preview".
 */
export function PreviewFrame({ project, viewport, isRegenerating, emptyMessage }: PreviewFrameProps) {
  const [outerRef, containerWidth] = useContainerWidth<HTMLDivElement>();
  const size = VIEWPORT_SIZES[viewport];
  const scale = containerWidth > 0 ? Math.min(1, containerWidth / size.width) : 1;

  const document_ = useMemo(() => {
    if (emptyMessage) return null;
    return assembleSiteDocument(project, { mode: "preview" });
  }, [project, emptyMessage]);

  const slug = useMemo(() => slugifyForDisplay(project.name), [project.name]);

  return (
    <div className="nd-preview-scale-outer" ref={outerRef} style={{ height: size.height * scale }}>
      <div
        className="nd-preview-scale-inner"
        style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}
      >
        <div className="nd-preview-frame">
          <div className="nd-preview-frame__chrome">
            <span className="nd-preview-frame__dot" />
            <span className="nd-preview-frame__dot" />
            <span className="nd-preview-frame__dot" />
            <span className="nd-preview-frame__address">предпросмотр · {slug}</span>
          </div>
          <div className="nd-preview-frame__body">
            {document_ ? (
              <iframe
                className="nd-preview-frame__iframe"
                srcDoc={document_.html}
                title={document_.title}
              />
            ) : (
              <div className="nd-preview-frame__empty">{emptyMessage}</div>
            )}
            {isRegenerating && (
              <div className="nd-preview-frame__spinner-overlay" role="status" aria-live="polite">
                <span className="nd-preview-frame__spinner" aria-hidden="true" />
                Пересобираем тексты…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
