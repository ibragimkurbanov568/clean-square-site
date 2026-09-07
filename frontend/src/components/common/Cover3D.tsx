import { useReducedMotion } from 'framer-motion';
import { useCallback, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

const MAX_TILT_DEG = 8;

function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
}

export interface Cover3DProps {
  children: ReactNode;
  className?: string;
}

/**
 * 3D-эффект обложки/ковра — CSS `perspective`/`rotateX`/`rotateY` по движению курсора
 * (допущение 5 ТЗ, docs/02-ux.md §6). Амплитуда ≤ 8°, плавный возврат при уходе курсора,
 * отключается на touch-устройствах и при `prefers-reduced-motion`.
 */
export function Cover3D({ children, className }: Cover3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [style, setStyle] = useState<CSSProperties>({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
    transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  });

  const disabled = prefersReducedMotion || isCoarsePointer();

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (disabled || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * MAX_TILT_DEG * 2;
      const rotateX = (0.5 - py) * MAX_TILT_DEG * 2;
      setStyle({
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`,
        transition: 'transform 80ms linear',
      });
    },
    [disabled],
  );

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
      transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('[transform-style:preserve-3d]', className)}
      style={{ perspective: 1000 }}
    >
      <div style={style} className="h-full w-full will-change-transform">
        {children}
      </div>
    </div>
  );
}

export default Cover3D;
