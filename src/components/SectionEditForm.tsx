import type { Section, SectionListItem, SectionTypeDefinition } from "../types";
import { TextField } from "./TextField";
import { TextArea } from "./TextArea";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { IconTrash } from "./Icons";

export type SectionTextPatch = Partial<Pick<Section, "title" | "body" | "items" | "ctaText">>;

export interface SectionEditFormProps {
  section: Section;
  definition: SectionTypeDefinition;
  onChange: (patch: SectionTextPatch) => void;
  onCollapse: () => void;
}

function createEmptyItem(): SectionListItem {
  return { id: crypto.randomUUID(), primary: "", secondary: "" };
}

/**
 * Форма редактирования секции (F2, docs/02-ux.md, «Форма редактирования
 * секции»). Каждое поле пишет в состояние проекта на каждое нажатие
 * клавиши (см. TextField/TextArea) и помечает секцию `isCustomText:
 * true` — так она защищена от автоматической пересборки текста по F3
 * (пометка «изменено вручную» отражает это на уровне секции, т.к.
 * модель данных хранит один флаг на секцию, а не на поле).
 */
export function SectionEditForm({ section, definition, onChange, onCollapse }: SectionEditFormProps) {
  const items = section.items ?? [];

  const updateItem = (id: string, patch: Partial<SectionListItem>) => {
    onChange({
      items: items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const addItem = () => {
    if (items.length >= (definition.maxItems ?? 8)) return;
    onChange({ items: [...items, createEmptyItem()] });
  };

  const removeItem = (id: string) => {
    onChange({ items: items.filter((item) => item.id !== id) });
  };

  return (
    <div className="nd-section-edit-form">
      <TextField
        label="Заголовок"
        value={section.title}
        maxLength={80}
        showCustomMark={section.isCustomText}
        onChange={(title) => onChange({ title })}
      />

      {definition.hasBody && (
        <TextArea
          label="Текст"
          value={section.body ?? ""}
          maxLength={600}
          showCustomMark={section.isCustomText}
          onChange={(body) => onChange({ body })}
        />
      )}

      {definition.hasItems && (
        <div className="nd-section-items">
          <span className="nd-section-items__title">Элементы</span>
          {items.map((item, index) => (
            <div className="nd-section-item-row" key={item.id}>
              <div className="nd-section-item-row__fields">
                <TextField
                  label={definition.itemFields?.primaryLabel ?? "Значение"}
                  value={item.primary}
                  onChange={(value) => updateItem(item.id, { primary: value })}
                />
                {definition.itemFields?.secondaryLabel && (
                  <TextField
                    label={definition.itemFields.secondaryLabel}
                    value={item.secondary ?? ""}
                    onChange={(value) => updateItem(item.id, { secondary: value })}
                  />
                )}
              </div>
              <IconButton
                aria-label={`Удалить элемент ${index + 1}`}
                danger
                onClick={() => removeItem(item.id)}
              >
                <IconTrash />
              </IconButton>
            </div>
          ))}
          <Button
            variant="secondary"
            compact
            onClick={addItem}
            disabled={items.length >= (definition.maxItems ?? 8)}
          >
            Добавить элемент
          </Button>
        </div>
      )}

      {definition.hasCtaText && (
        <TextField
          label="Текст кнопки"
          value={section.ctaText ?? ""}
          maxLength={40}
          placeholder="Связаться с нами"
          showCustomMark={section.isCustomText}
          onChange={(ctaText) => onChange({ ctaText })}
        />
      )}

      <Button variant="secondary" onClick={onCollapse}>
        Свернуть
      </Button>
    </div>
  );
}
