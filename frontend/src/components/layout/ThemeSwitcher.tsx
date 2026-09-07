import { AnimatePresence, motion } from 'framer-motion';
import { THEMES, type Theme } from '../../context/ThemeContext';
import { useDismissableMenu } from '../../hooks/useDismissableMenu';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/utils';

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

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Переключатель темы (F11) — иконка-триггер + выпадающее меню с кружками-свотчами,
 * docs/03-design-system.md §7.9. Esc/клик вне закрывает меню.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { isOpen, toggle, close, ref } = useDismissableMenu<HTMLDivElement>();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Переключить тему оформления"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="focus-ring interactive-scale flex h-10 w-10 items-center justify-center rounded-full text-text-primary hover:bg-surface-hover"
      >
        {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      </button>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-30 mt-2 w-52 rounded-lg border border-border bg-surface-elevated p-3 shadow-lg"
          >
            {THEMES.map((option) => {
              const isActive = option === theme;
              return (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    setTheme(option);
                    close();
                  }}
                  className={cn(
                    'focus-ring flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm',
                    isActive ? 'bg-accent-subtle' : 'hover:bg-surface-hover',
                  )}
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-border"
                    style={{ background: THEME_SWATCH[option] }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-text-primary">{THEME_LABELS[option]}</span>
                  {isActive ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="var(--color-accent)"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default ThemeSwitcher;
