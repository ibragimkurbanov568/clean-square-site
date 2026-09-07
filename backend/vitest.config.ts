import { defineConfig } from 'vitest/config';

/**
 * Простой Node-окружение для unit-тестов чистой логики (формула рейтинга, переходы статусов,
 * rate-limit счётчик — см. критерии готовности в docs/01-spec.md). Полные Workers-runtime
 * интеграционные тесты (с реальным D1/KV через Miniflare) можно добавить позже через
 * `@cloudflare/vitest-pool-workers`, если понадобится — на этом шаге не подключается, чтобы
 * не увеличивать риск сборки.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
