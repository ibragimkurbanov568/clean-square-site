import type { Theme, ThemeId } from "../types";

export interface ThemePickerProps {
  themes: Theme[];
  value: ThemeId;
  onChange: (id: ThemeId) => void;
}

/**
 * Сетка образцов темы оформления сайта (F4, docs/02-ux.md, «Тема
 * оформления»). Красит только кружок-превью (снимок палитры темы,
 * см. docs/03-design-system.md §3.3) — сама сетка остаётся chrome
 * интерфейса (`--nd-*`), не переключается на `--site-*`.
 */
export function ThemePicker({ themes, value, onChange }: ThemePickerProps) {
  return (
    <div className="nd-theme-grid" role="radiogroup" aria-label="Тема оформления">
      {themes.map((theme) => {
        const active = theme.id === value;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`nd-theme-card${active ? " nd-theme-card--active" : ""}`}
            onClick={() => onChange(theme.id)}
          >
            <span
              className="nd-theme-card__dot"
              style={{
                background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})`,
              }}
              aria-hidden="true"
            />
            <span className="nd-theme-card__name">{theme.name}</span>
            <span className="nd-theme-card__mode">
              {theme.mode === "light" ? "светлая" : "тёмная"}
            </span>
            {active && <span className="nd-theme-card__current">Текущая</span>}
          </button>
        );
      })}
    </div>
  );
}
