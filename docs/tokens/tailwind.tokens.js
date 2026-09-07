/**
 * CleanLink — маппинг дизайн-токенов на Tailwind theme.extend.
 *
 * Использование архитектором/фронтенд-инженером на следующих шагах конвейера:
 *   const tokens = require('./docs/tokens/tailwind.tokens.js');
 *   module.exports = { theme: { extend: tokens } };
 *
 * Все цвета — CSS custom properties из docs/tokens/design-tokens.css, а не хардкод hex,
 * поэтому классы вида bg-accent / text-secondary / border-border автоматически меняются
 * при смене data-theme на <html> без пересборки Tailwind.
 */
module.exports = {
  colors: {
    bg: 'var(--color-bg)',
    surface: 'var(--color-surface)',
    'surface-elevated': 'var(--color-surface-elevated)',
    'surface-hover': 'var(--color-surface-hover)',
    border: 'var(--color-border)',
    'border-strong': 'var(--color-border-strong)',
    'text-primary': 'var(--color-text-primary)',
    'text-secondary': 'var(--color-text-secondary)',
    'text-disabled': 'var(--color-text-disabled)',
    accent: {
      DEFAULT: 'var(--color-accent)',
      600: 'var(--color-accent-600)',
      700: 'var(--color-accent-700)',
      800: 'var(--color-accent-800)',
      subtle: 'var(--color-accent-subtle)',
      contrast: 'var(--color-accent-contrast)',
    },
    success: {
      DEFAULT: 'var(--color-success)',
      bg: 'var(--color-success-bg)',
    },
    warning: {
      DEFAULT: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
    },
    error: {
      DEFAULT: 'var(--color-error)',
      bg: 'var(--color-error-bg)',
    },
    info: {
      DEFAULT: 'var(--color-info)',
      bg: 'var(--color-info-bg)',
    },
    neutral: {
      DEFAULT: 'var(--color-neutral)',
      bg: 'var(--color-neutral-bg)',
    },
    overlay: 'var(--color-overlay)',
    'focus-ring': 'var(--color-focus-ring)',
    'star-filled': 'var(--color-star-filled)',
    'star-empty': 'var(--color-star-empty)',
  },
  spacing: {
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
    7: 'var(--space-7)',
    8: 'var(--space-8)',
  },
  borderRadius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: 'var(--radius-full)',
  },
  fontFamily: {
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
  },
  fontSize: {
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    base: 'var(--font-size-base)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
    '2xl': 'var(--font-size-2xl)',
  },
  boxShadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  },
  transitionDuration: {
    fast: 'var(--duration-fast)',
    base: 'var(--duration-base)',
    slow: 'var(--duration-slow)',
  },
  transitionTimingFunction: {
    standard: 'var(--easing-standard)',
  },
  scale: {
    95: '0.95',
    105: '1.05',
  },
};
