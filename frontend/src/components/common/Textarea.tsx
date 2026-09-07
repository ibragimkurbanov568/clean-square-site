import type { TextareaHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, required, rows = 4, ...rest },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = `${textareaId}-error`;
  const hintId = `${textareaId}-hint`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={textareaId} className="text-sm font-medium text-text-secondary">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'focus-ring w-full resize-y rounded-md border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-disabled',
          'transition-colors disabled:bg-surface-hover disabled:text-text-disabled',
          error ? 'border-error' : 'border-border-strong hover:border-text-secondary',
          className,
        )}
        {...rest}
      />
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

export default Textarea;
