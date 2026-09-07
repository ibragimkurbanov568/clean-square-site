import { useCallback, useEffect, useRef, useState } from 'react';

/** Открытое/закрытое состояние выпадающего меню с закрытием по Esc и клику вне (docs/02-ux.md §7). */
export function useDismissableMenu<T extends HTMLElement>() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<T>(null);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  return { isOpen, setIsOpen, toggle, close, ref };
}
