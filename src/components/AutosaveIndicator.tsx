import type { AutosaveStatus } from "../hooks/useAutosave";

export interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  compact?: boolean;
}

/**
 * Индикатор автосохранения в шапке редактора (F8, docs/02-ux.md,
 * «Микровзаимодействия»): «Сохранение…» → «Сохранено» (2с) → гаснет.
 * Ошибка обрабатывается отдельно постоянным баннером (см. EditorScreen).
 */
export function AutosaveIndicator({ status, compact }: AutosaveIndicatorProps) {
  if (status === "idle" || status === "error") return null;

  return (
    <span
      className={`nd-autosave${status === "saved" ? " nd-autosave--saved" : ""}`}
      aria-live="polite"
    >
      {status === "saving" ? (
        <>
          <span className="nd-autosave__spinner" aria-hidden="true" />
          {!compact && "Сохранение…"}
        </>
      ) : (
        <>
          <span aria-hidden="true">✓</span>
          {!compact && "Сохранено"}
        </>
      )}
    </span>
  );
}
