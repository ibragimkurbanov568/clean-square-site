import { useId } from "react";

export interface EffectsToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  reducedMotionActive: boolean;
}

/**
 * Тумблер «Анимации и переходы» (F6, docs/02-ux.md). Переключение —
 * мгновенное, без плавного перехода (см. app.css: `.nd-toggle` меняет
 * фон/позицию бегунка за `--nd-motion-fast`, что уже достаточно резко
 * по сравнению с постепенными hover-эффектами — контраст «было/стало»
 * нагляден). При `prefers-reduced-motion: reduce` под тумблером
 * показывается системное пояснение независимо от положения тумблера.
 */
export function EffectsToggle({ enabled, onChange, reducedMotionActive }: EffectsToggleProps) {
  const labelId = useId();

  return (
    <div>
      <div className="nd-toggle-row">
        <span id={labelId} className="nd-field__label">
          Анимации и переходы
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={labelId}
          className="nd-toggle"
          onClick={() => onChange(!enabled)}
        >
          <span className="nd-toggle__thumb" />
        </button>
      </div>
      <p className="nd-settings-block__hint">
        Появление секций при прокрутке, hover-эффекты кнопок и карточек,
        стеклянная поверхность в Hero.
      </p>
      {reducedMotionActive && (
        <p className="nd-settings-block__hint">
          Ваша система запросила уменьшённые анимации: появление секций
          отключено, эффекты наведения остаются.
        </p>
      )}
    </div>
  );
}
