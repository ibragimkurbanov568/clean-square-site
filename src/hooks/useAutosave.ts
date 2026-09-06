import { useEffect, useRef, useState } from "react";
import type { Project, ProjectStore } from "../types";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Цикл автосохранения (F8, docs/02-ux.md):
 * «Сохранение…» во время debounce-паузы после последнего изменения →
 * «Сохранено» на 2с → индикатор гаснет. При сбое записи — постоянный
 * статус «error» (баннер), следующее изменение автоматически повторяет
 * попытку (обычный ход эффекта ниже, без специального кода retry).
 */
export function useAutosave(
  project: Project | null,
  store: ProjectStore,
  delayMs = 500,
): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const lastProjectId = useRef<string | null>(null);
  const isFirstForThisProject = useRef(true);

  useEffect(() => {
    if (!project) return;
    if (lastProjectId.current !== project.id) {
      lastProjectId.current = project.id;
      isFirstForThisProject.current = true;
    }
    if (isFirstForThisProject.current) {
      // Не показываем «Сохранение…» сразу после открытия/загрузки проекта —
      // это не пользовательское изменение.
      isFirstForThisProject.current = false;
      return;
    }

    setStatus("saving");
    const saveTimer = window.setTimeout(() => {
      try {
        store.saveProject(project);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delayMs);

    return () => window.clearTimeout(saveTimer);
  }, [project, store, delayMs]);

  useEffect(() => {
    if (status !== "saved") return;
    const clearTimer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(clearTimer);
  }, [status]);

  return status;
}
