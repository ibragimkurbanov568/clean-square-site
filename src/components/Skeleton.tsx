export function Skeleton({ width, height }: { width?: string; height?: string }) {
  return <span className="nd-skeleton" style={{ display: "block", width, height }} />;
}

/** Карточка-скелетон списка проектов (F8, состояние «Загрузка»). */
export function ProjectCardSkeleton() {
  return (
    <div className="nd-skeleton-card" aria-hidden="true">
      <div className="nd-skeleton-card__plate">
        <Skeleton height="6px" />
      </div>
      <div className="nd-skeleton-card__body">
        <Skeleton width="60%" height="20px" />
        <Skeleton width="40%" height="14px" />
        <div style={{ display: "flex", gap: "var(--nd-space-2)", marginTop: "var(--nd-space-2)" }}>
          <Skeleton width="100%" height="40px" />
          <Skeleton width="40px" height="40px" />
        </div>
      </div>
    </div>
  );
}
