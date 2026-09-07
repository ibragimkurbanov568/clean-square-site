import type { InputHTMLAttributes } from 'react';
import { forwardRef, useId, useState } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
}

/** Поле ввода — анатомия из docs/03-design-system.md §7.2. label -> поле -> helper/error. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, type = 'text', id, required, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'focus-ring h-11 w-full rounded-md border bg-surface px-4 text-base text-text-primary placeholder:text-text-disabled',
            'transition-colors disabled:bg-surface-hover disabled:text-text-disabled',
            error ? 'border-error' : 'border-border-strong hover:border-text-secondary',
            isPassword ? 'pr-11' : '',
            className,
          )}
          {...rest}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            className="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-secondary"
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.6 9.6 0 0112 5c5 0 9 4 10 7-.4 1.2-1.2 2.6-2.4 3.9M6.3 6.3C3.9 7.9 2.3 10.1 2 12c1 3 5 7 10 7 1.3 0 2.5-.3 3.6-.7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-xs text-error">
          ⚠ {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
