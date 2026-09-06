import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Наблюдает за реальной шириной контейнера (ResizeObserver). Используется
 * кадром предпросмотра, чтобы вычислить коэффициент `transform: scale`
 * под текущее доступное пространство панели — см. docs/02-ux.md,
 * «Три сложных момента», п.2: масштаб через transform, а не через
 * изменение реальной ширины блока (иначе появляется горизонтальная
 * прокрутка страницы).
 */
export function useContainerWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
