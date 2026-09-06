import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Фокус-ловушка для модальных оверлеев (docs/02-ux.md, «Доступность»):
 * - при открытии фокус уходит внутрь контейнера;
 * - `Tab`/`Shift+Tab` циклируют только между элементами контейнера;
 * - `Esc` вызывает `onClose` (эквивалент кнопки «Отмена»);
 * - при закрытии фокус возвращается на элемент, который открыл оверлей.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onClose: () => void,
): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    const preferred = container?.querySelector<HTMLElement>("[autofocus]");
    const focusables = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = preferred ?? (focusables && focusables.length > 0 ? focusables[0] : container);
    first?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !containerRef.current) return;
      const nodes = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return containerRef;
}
