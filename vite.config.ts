import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// NoesDize работает целиком в браузере: нет бэкенда, нет прокси, нет
// переменных окружения, влияющих на сборку. Конфиг намеренно короткий.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
