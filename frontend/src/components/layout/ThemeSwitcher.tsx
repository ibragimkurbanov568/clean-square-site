import { THEMES, type Theme } from '../../context/ThemeContext';
import { useTheme } from '../../hooks/useTheme';

const THEME_LABELS: Record<Theme, string> = {
  dark: 'Тёмная',
  gradient: 'Светлая',
  classic: 'Классика',
};

/**
 * Минимальный переключатель темы (F11) — рабочая логика уже подключена через useTheme().
 * TODO(frontend): заменить на полную анатомию из docs/03-design-system.md §7.9
 * (иконка-триггер + выпадающее меню с кружками-свотчами и галочкой у текущей темы).
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      <span className="sr-only">Переключить тему оформления</span>
      <select
        aria-label="Переключить тему оформления"
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
        className="rounded-md border border-border-strong bg-surface px-2 py-1 text-text-primary"
      >
        {THEMES.map((option) => (
          <option key={option} value={option}>
            {THEME_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

export default ThemeSwitcher;
