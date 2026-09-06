import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  text: string;
  action?: ReactNode;
}

/**
 * Пустое состояние (docs/03-design-system.md, §3.7): декоративная
 * иллюстрация-градиент, заголовок, пояснение, основная кнопка.
 */
export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className="nd-empty-state">
      <div className="nd-empty-state__illustration" aria-hidden="true" />
      <h1 className="nd-heading-lg nd-empty-state__title">{title}</h1>
      <p className="nd-empty-state__text">{text}</p>
      {action && <div className="nd-empty-state__action">{action}</div>}
    </div>
  );
}
