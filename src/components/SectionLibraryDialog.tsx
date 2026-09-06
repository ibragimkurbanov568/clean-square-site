import { useId } from "react";
import type { SectionType } from "../types";
import { SECTION_LIBRARY_ORDER } from "../types";
import { SECTION_LIBRARY } from "../content/sectionLibrary";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { IconButton } from "./IconButton";
import { IconClose } from "./Icons";
import { SectionTypeIcon } from "./Icons";

export interface SectionLibraryDialogProps {
  onSelect: (type: SectionType) => void;
  onClose: () => void;
}

/**
 * Оверлей «Библиотека блоков» (F2, docs/02-ux.md): модалка на
 * десктопе/планшете, bottom sheet на мобильном (класс `nd-modal--sheet`
 * применяется через медиа-запрос в app.css, а не через JS-детект
 * ширины экрана).
 */
export function SectionLibraryDialog({ onSelect, onClose }: SectionLibraryDialogProps) {
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>(true, onClose);

  return (
    <div
      className="nd-modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="nd-modal nd-modal--wide nd-modal--sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="nd-modal__header">
          <h2 id={titleId} className="nd-heading-lg">
            Добавить секцию
          </h2>
          <IconButton aria-label="Закрыть" onClick={onClose} autoFocus>
            <IconClose />
          </IconButton>
        </div>
        <div className="nd-modal__list">
          {SECTION_LIBRARY_ORDER.map((type) => {
            const definition = SECTION_LIBRARY[type];
            return (
              <button
                key={type}
                type="button"
                className="nd-block-card"
                onClick={() => onSelect(type)}
              >
                <span className="nd-block-card__icon">
                  <SectionTypeIcon name={definition.icon} />
                </span>
                <span>
                  <span className="nd-block-card__title">{definition.labelRu}</span>
                  <span className="nd-block-card__desc">{definition.descriptionRu}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
