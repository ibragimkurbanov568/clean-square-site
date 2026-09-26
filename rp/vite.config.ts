import { defineConfig } from 'vite';
// Относительные пути: собранная игра открывается из любой папки и как артефакт
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 4000, assetsInlineLimit: 0 },
  test: { environment: 'node' },
} as any);
