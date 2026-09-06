import { useMemo } from "react";
import type { ProjectStore } from "../types";
import { projectStore } from "../lib/storage";

/**
 * Единственная точка входа фронтенда к слою хранения (F8). Централизовано
 * здесь намеренно: если реальное имя экспорта в `src/lib/storage.ts`
 * (шаг 5) будет отличаться от предполагаемого `projectStore`, на
 * интеграции достаточно поправить один этот файл, а не каждый компонент.
 */
export function useProjectStore(): ProjectStore {
  return useMemo(() => projectStore, []);
}
