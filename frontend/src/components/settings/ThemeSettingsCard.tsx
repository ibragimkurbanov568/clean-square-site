import { THEMES, type Theme } from '../../context/ThemeContext';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';
import Card from '../common/Card';

const THEME_LABELS: Record<Theme, string> = {
  dark: 'Тёмная',
  gradient: 'Светлая',
  classic: 'Классика',
};

const THEME_SWATCH: Record<Theme, string> = {
  dark: '#0a0a0f',
  gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  classic: '#ffffff',
};

/** Раздел «Оформление» в настройках — дублирует переключатель темы в шапке (docs/02-ux.md). */
export function ThemeSettingsCard() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">Оформление</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {THEMES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={cn(
              'focus-ring interactive-scale flex items-center gap-3 rounded-md border p-3 text-left text-sm',
              theme === option ? 'border-accent bg-accent-subtle' : 'border-border-strong hover:bg-surface-hover',
            )}
          >
            <span className="h-6 w-6 shrink-0 rounded-full border border-border" style={{ background: THEME_SWATCH[option] }} />
            {THEME_LABELS[option]}
          </button>
        ))}
      </div>
    </Card>
  );
}

export default ThemeSettingsCard;
