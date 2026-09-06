import { useId } from "react";
import type { KeyboardEvent } from "react";

export interface ChipOption {
  id: string;
  label: string;
}

export interface ChipGroupProps {
  title: string;
  options: ChipOption[];
  value: string | null;
  onChange: (id: string) => void;
  error?: boolean;
  errorText?: string;
  layout?: "grid" | "grid-tone";
}

/**
 * Группа чипов с поведением radio (выбор одного) — используется для
 * отрасли (7 вариантов) и тона (4 варианта), см. docs/02-ux.md, «Мастер
 * создания» и «Вкладка Настройки». `role="radiogroup"` + `role="radio"`
 * на каждом чипе, доступно с клавиатуры (Tab к группе, дальше
 * стрелками между чипами).
 */
export function ChipGroup({
  title,
  options,
  value,
  onChange,
  error,
  errorText,
  layout = "grid",
}: ChipGroupProps) {
  const groupId = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = options.findIndex((option) => option.id === value);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = options[(currentIndex + 1 + options.length) % options.length];
      onChange(next.id);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const prev = options[(currentIndex - 1 + options.length) % options.length];
      onChange(prev.id);
    }
  };

  return (
    <div className={`nd-chip-group${error ? " nd-chip-group--error" : ""}`}>
      <span className="nd-chip-group__title" id={groupId}>
        {title}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className={`nd-chip-group__grid${layout === "grid-tone" ? " nd-chip-group__grid--tone" : ""}`}
        onKeyDown={handleKeyDown}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === value}
            tabIndex={option.id === value || (!value && option === options[0]) ? 0 : -1}
            className="nd-chip"
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && errorText && <p className="nd-chip-group__error-text">{errorText}</p>}
    </div>
  );
}
