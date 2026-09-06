import type { ReactNode } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { IconButton } from "./IconButton";
import { IconClose } from "./Icons";

export interface ModalProps {
  titleId: string;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** На мобильном превращается в bottom sheet (библиотека блоков). */
  sheetOnMobile?: boolean;
}

/**
 * Базовое модальное окно (docs/03-design-system.md, §3.4): скрим,
 * focus trap, закрытие по Esc, возврат фокуса на элемент-инициатор.
 */
export function Modal({ titleId, title, onClose, children, footer, wide, sheetOnMobile }: ModalProps) {
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
        className={`nd-modal${wide ? " nd-modal--wide" : ""}${sheetOnMobile ? " nd-modal--sheet" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="nd-modal__header">
          <h2 id={titleId} className="nd-heading-lg">
            {title}
          </h2>
          <IconButton aria-label="Закрыть" onClick={onClose}>
            <IconClose />
          </IconButton>
        </div>
        <div className="nd-modal__body">{children}</div>
        {footer && <div className="nd-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
