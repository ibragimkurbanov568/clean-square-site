import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "success";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  compact?: boolean;
  block?: boolean;
  children: ReactNode;
}

/**
 * Кнопка редактора (docs/03-design-system.md, §3.1). Единственный
 * компонент кнопки во всём приложении — «нерабочих кнопок не бывает»,
 * поэтому `disabled` всегда должен сопровождаться причиной в `title`
 * там, где UX требует подсказку по наведению/долгому нажатию.
 */
export function Button({
  variant = "secondary",
  compact = false,
  block = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "nd-btn",
    `nd-btn--${variant}`,
    compact ? "nd-btn--compact" : "",
    block ? "nd-btn-block" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
