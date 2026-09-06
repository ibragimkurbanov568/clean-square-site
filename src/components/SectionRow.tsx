import type { DragEvent } from "react";
import type { Section, SectionTypeDefinition } from "../types";
import { IconButton } from "./IconButton";
import {
  IconChevronDown,
  IconChevronUp,
  IconDragHandle,
  IconEye,
  IconEyeOff,
  IconPencil,
  IconTrash,
  SectionTypeIcon,
} from "./Icons";
import { SectionEditForm } from "./SectionEditForm";
import type { SectionTextPatch } from "./SectionEditForm";

export interface SectionRowProps {
  section: Section;
  definition: SectionTypeDefinition;
  isFirst: boolean;
  isLast: boolean;
  isOnly: boolean;
  isNew: boolean;
  isEditing: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onToggleVisibility: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEditToggle: () => void;
  onDeleteRequest: () => void;
  onChange: (patch: SectionTextPatch) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

/** Одна строка списка секций (F2, docs/02-ux.md). */
export function SectionRow({
  section,
  definition,
  isFirst,
  isLast,
  isOnly,
  isNew,
  isEditing,
  isDragging,
  isDropTarget,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onEditToggle,
  onDeleteRequest,
  onChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SectionRowProps) {
  const classes = [
    "nd-section-row",
    isNew ? "nd-section-row--new" : "",
    isDragging ? "nd-section-row--dragging" : "",
    !section.visible ? "nd-section-row--hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {isDropTarget && <div className="nd-section-row__placeholder" aria-hidden="true" />}
      <div
        className={classes}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        data-section-id={section.id}
      >
        <div className="nd-section-row__main">
          <span className="nd-section-row__drag" aria-hidden="true">
            <IconDragHandle />
          </span>
          <span className="nd-section-row__type-icon" aria-hidden="true">
            <SectionTypeIcon name={definition.icon} />
          </span>
          <span className="nd-section-row__name" title={definition.labelRu}>
            {definition.labelRu}
          </span>
          <div className="nd-section-row__actions">
            <IconButton
              aria-label={section.visible ? "Скрыть секцию" : "Показать секцию"}
              active={!section.visible}
              onClick={onToggleVisibility}
            >
              {section.visible ? <IconEye /> : <IconEyeOff />}
            </IconButton>
            <div className="nd-section-row__order-btns">
              <IconButton aria-label="Переместить секцию вверх" disabled={isFirst} onClick={onMoveUp}>
                <IconChevronUp width={14} height={14} />
              </IconButton>
              <IconButton aria-label="Переместить секцию вниз" disabled={isLast} onClick={onMoveDown}>
                <IconChevronDown width={14} height={14} />
              </IconButton>
            </div>
            <IconButton aria-label="Изменить текст секции" active={isEditing} onClick={onEditToggle}>
              <IconPencil />
            </IconButton>
            <IconButton
              aria-label="Удалить секцию"
              danger
              disabled={isOnly}
              title={isOnly ? "Нельзя удалить единственную секцию" : undefined}
              onClick={onDeleteRequest}
            >
              <IconTrash />
            </IconButton>
          </div>
        </div>
        {isEditing && (
          <SectionEditForm
            section={section}
            definition={definition}
            onChange={onChange}
            onCollapse={onEditToggle}
          />
        )}
      </div>
    </>
  );
}
