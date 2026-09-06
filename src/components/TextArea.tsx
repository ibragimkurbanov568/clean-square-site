import { useId } from "react";

export interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  showCustomMark?: boolean;
  id?: string;
}

/**
 * Многострочное текстовое поле (textarea) секции. Пишет в состояние
 * проекта на каждое нажатие клавиши — см. TextField.tsx и
 * docs/02-ux.md, «Три сложных момента», п.3.
 */
export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  showCustomMark,
  id,
}: TextAreaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const counterId = `${fieldId}-counter`;
  const overLimit = maxLength !== undefined && value.length > maxLength;

  return (
    <div className="nd-field">
      <div className="nd-field__label-row">
        <label className="nd-field__label" htmlFor={fieldId}>
          {label}
        </label>
        {showCustomMark && <span className="nd-field__custom-mark">изменено вручную</span>}
      </div>
      <textarea
        id={fieldId}
        className={`nd-textarea${overLimit ? " nd-textarea--error" : ""}`}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={maxLength ? counterId : undefined}
        aria-invalid={overLimit || undefined}
      />
      {maxLength !== undefined && (
        <div className="nd-field__footer">
          <span
            id={counterId}
            className={`nd-field__counter${overLimit ? " nd-field__counter--error" : ""}`}
            aria-live="polite"
          >
            {value.length} / {maxLength}
          </span>
        </div>
      )}
    </div>
  );
}
