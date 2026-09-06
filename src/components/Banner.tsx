import type { ReactNode } from "react";

export interface BannerProps {
  message: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}

/**
 * Постоянный баннер ошибки (не исчезает автоматически, в отличие от
 * тоста) — «Не удалось прочитать сохранные проекты», «Не удалось
 * сохранить локально» (F8, docs/02-ux.md).
 */
export function Banner({ message, hint, action }: BannerProps) {
  return (
    <div className="nd-banner" role="alert">
      <div className="nd-banner__text">
        <strong>{message}</strong>
        {hint && <span className="nd-banner__hint">{hint}</span>}
      </div>
      {action}
    </div>
  );
}
