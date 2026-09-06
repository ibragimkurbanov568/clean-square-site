import { useId } from "react";

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  showCustomMark?: boolean;
  autoFocus?: boolean;
  id?: string;
}

/**
 * Однострочное текстовое поле (docs/03-design-system.md, §3.2).
 * `onChange` вызывается на каждое нажатие клавиши и пишет прямо в
 * состояние проекта — обязательное требование docs/02-ux.md, «Три
 * сложных момента», п.3 (иначе непереданные символы теряются при
 * переключении вкладок/сегментов посреди набора).
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  error,
  showCustomMark,
  autoFocus,
  id,
}: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const counterId = `${fieldId}-counter`;
  const errorId = `${fieldId}-error`;
  const overLimit = maxLength !== undefined && value.length > maxLength;

  return (
    <div className="nd-field">
      <div className="nd-field__label-row">
        <label className="nd-field__label" htmlFor={fieldId}>
          {label}
        </label>
        {showCustomMark && <span className="nd-field__custom-mark">изменено вручную</span>}
      </div>
      <input
        id={fieldId}
        className={`nd-input${error || overLimit ? " nd-input--error" : ""}`}
        type="text"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={[maxLength ? counterId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
        aria-invalid={Boolean(error) || overLimit || undefined}
      />
      <div className="nd-field__footer">
        {error && (
          <span id={errorId} className="nd-field__error-text" aria-live="polite">
            {error}
          </span>
        )}
        {maxLength !== undefined && (
          <span
            id={counterId}
            className={`nd-field__counter${overLimit ? " nd-field__counter--error" : ""}`}
            aria-live="polite"
          >
            {value.length} / {maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
