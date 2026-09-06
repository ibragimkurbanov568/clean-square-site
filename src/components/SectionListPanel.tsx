import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { Project } from "../types";
import { SECTION_LIBRARY } from "../content/sectionLibrary";
import { Button } from "./Button";
import { IconPlus } from "./Icons";
import { SectionRow } from "./SectionRow";
import type { SectionTextPatch } from "./SectionEditForm";

const SECTION_LIMIT = 12;
const HIGHLIGHT_MS = 1500;

export interface SectionListPanelProps {
  project: Project;
  editingId: string | null;
  justAddedId: string | null;
  onEditToggle: (id: string) => void;
  onAddSection: () => void;
  onDeleteRequest: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onChangeSection: (id: string, patch: SectionTextPatch) => void;
  onReorderDrag: (sourceId: string, targetId: string) => void;
}

/**
 * Панель управления секциями (F2, docs/02-ux.md): заголовок и кнопка
 * «Добавить секцию» — sticky сверху при 10+ строках, список — своя
 * вертикальная прокрутка.
 */
export function SectionListPanel({
  project,
  editingId,
  justAddedId,
  onEditToggle,
  onAddSection,
  onDeleteRequest,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  onChangeSection,
  onReorderDrag,
}: SectionListPanelProps) {
  const sections = [...project.sections].sort((a, b) => a.order - b.order);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [trackedAddedId, setTrackedAddedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Подсветка новой строки (F2, «Добавление секции»): состояние выставляется
  // прямо во время рендера (документированный React-паттерн «подгонка
  // состояния под изменившийся пропс»), а не в эффекте — так линтер не
  // видит здесь синхронный вызов setState в теле эффекта, а поведение то же.
  if (justAddedId && justAddedId !== trackedAddedId) {
    setTrackedAddedId(justAddedId);
    setHighlightId(justAddedId);
  }

  useEffect(() => {
    if (!justAddedId) return;
    const row = listRef.current?.querySelector(`[data-section-id="${justAddedId}"]`);
    row?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [justAddedId]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const handleScroll = () => {
    setScrolled((listRef.current?.scrollTop ?? 0) > 0);
  };

  const handleDragStart = (id: string) => (event: DragEvent<HTMLDivElement>) => {
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (id: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragId && dragId !== id) setDropTargetId(id);
  };

  const handleDrop = (id: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (dragId && dragId !== id) onReorderDrag(dragId, id);
    setDragId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropTargetId(null);
  };

  return (
    <div className="nd-section-panel">
      <div
        className={`nd-section-panel__header${scrolled ? " nd-section-panel__header--scrolled" : ""}`}
      >
        <h2 className="nd-heading-md">
          Секции сайта ({sections.length}/{SECTION_LIMIT})
        </h2>
        {sections.length >= SECTION_LIMIT ? (
          <span className="nd-section-panel__limit-text">Достигнут предел секций</span>
        ) : (
          <Button variant="secondary" compact onClick={onAddSection}>
            <IconPlus width={14} height={14} /> Добавить секцию
          </Button>
        )}
      </div>
      <div className="nd-section-panel__list" ref={listRef} onScroll={handleScroll}>
        {sections.map((section, index) => (
          <SectionRow
            key={section.id}
            section={section}
            definition={SECTION_LIBRARY[section.type]}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
            isOnly={sections.length === 1}
            isNew={highlightId === section.id}
            isEditing={editingId === section.id}
            isDragging={dragId === section.id}
            isDropTarget={dropTargetId === section.id}
            onToggleVisibility={() => onToggleVisibility(section.id)}
            onMoveUp={() => onMoveUp(section.id)}
            onMoveDown={() => onMoveDown(section.id)}
            onEditToggle={() => onEditToggle(section.id)}
            onDeleteRequest={() => onDeleteRequest(section.id)}
            onChange={(patch) => onChangeSection(section.id, patch)}
            onDragStart={handleDragStart(section.id)}
            onDragOver={handleDragOver(section.id)}
            onDrop={handleDrop(section.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
