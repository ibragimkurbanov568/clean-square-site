import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Проксирует API-запросы на локальный Workers-бэкенд (`npm run dev` в backend/,
      // wrangler dev по умолчанию слушает :8787) — см. docs/04-architecture.md §7.
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
