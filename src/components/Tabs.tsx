import type { KeyboardEvent } from "react";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  variant?: "underline" | "segmented";
  idPrefix: string;
  "aria-label"?: string;
}

/**
 * Универсальный `role="tablist"` с управлением стрелками (docs/02-ux.md,
 * «Доступность»). Используется и для вкладок «Секции»/«Настройки», и
 * для мобильного сегмент-переключателя «Правка»/«Просмотр» (variant
 * "segmented" — заливка активной половины акцентом, см. UX).
 */
export function Tabs<T extends string>({
  items,
  activeId,
  onChange,
  variant = "underline",
  idPrefix,
  ...rest
}: TabsProps<T>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = items.findIndex((item) => item.id === activeId);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(items[(currentIndex + 1) % items.length].id);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(items[(currentIndex - 1 + items.length) % items.length].id);
    }
  };

  return (
    <div
      role="tablist"
      className={variant === "segmented" ? "nd-segmented" : "nd-tabs"}
      onKeyDown={handleKeyDown}
      aria-label={rest["aria-label"]}
    >
      {items.map((item) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            className={variant === "segmented" ? "nd-segmented__option" : "nd-tabs__tab"}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
