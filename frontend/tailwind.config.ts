import type { Config } from 'tailwindcss';
// Готовый объект theme.extend, сгенерированный дизайн-агентом из design-tokens.css —
// см. docs/03-design-system.md §2. Копия лежит в src/styles для явной локальности импорта
// внутри пакета frontend (frontend/ не должен читать файлы за пределами своей директории
// во время сборки Vite).
import tokens from './src/styles/tailwind-tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: tokens,
  },
  plugins: [],
} satisfies Config;
