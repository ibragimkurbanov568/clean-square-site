import { cn } from '../../lib/utils';

export interface SkeletonProps {
  className?: string;
}

/** Скелетон-блок — форма повторяет геометрию контента (docs/03-design-system.md §7.14). */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('skeleton', className)} role="status" aria-busy="true">
      <span className="sr-only">Загрузка содержимого</span>
    </div>
  );
}

export function SkeletonCircle({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('skeleton rounded-full', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Загрузка содержимого</span>
    </div>
  );
}

export function SkeletonCompanyCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-busy="true">
      <span className="sr-only">Загрузка содержимого</span>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export default Skeleton;
