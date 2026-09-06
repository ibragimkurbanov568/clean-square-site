import type { ViewportMode } from "../types";

const OPTIONS: { id: ViewportMode; label: string }[] = [
  { id: "desktop", label: "Десктоп" },
  { id: "tablet", label: "Планшет" },
  { id: "mobile", label: "Моб." },
];

export interface ViewportSwitchProps {
  value: ViewportMode;
  onChange: (value: ViewportMode) => void;
}

/** Переключатель ширины кадра предпросмотра (F5, docs/02-ux.md). */
export function ViewportSwitch({ value, onChange }: ViewportSwitchProps) {
  return (
    <div className="nd-viewport-switch" role="group" aria-label="Ширина предпросмотра">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className="nd-viewport-switch__btn"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
