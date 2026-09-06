import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** Обязателен дословно из docs/02-ux.md, раздел «Доступность». */
  "aria-label": string;
  active?: boolean;
  danger?: boolean;
  children: ReactNode;
}

/**
 * Кнопка-иконка. `disabled` рисуется как `aria-disabled` + `title`
 * (подсказка при наведении/долгом нажатии), а не нативный `disabled`,
 * когда нужно, чтобы подсказка ("Нельзя удалить единственную секцию",
 * "Добавьте видимую секцию «Обложка», чтобы включить экспорт") была доступна
 * по наведению даже на заблокированном элементе.
 */
export function IconButton({
  active,
  danger,
  disabled,
  children,
  onClick,
  ...rest
}: IconButtonProps) {
  const classes = [
    "nd-icon-btn",
    active ? "nd-icon-btn--active" : "",
    danger ? "nd-icon-btn--danger" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
