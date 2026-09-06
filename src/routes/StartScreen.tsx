import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ProjectSummary } from "../types";
import { THEMES } from "../content/themes";
import { useProjectStore } from "../hooks/useProjectStore";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Banner } from "../components/Banner";
import { ProjectCardSkeleton } from "../components/Skeleton";
import { ProjectCard } from "../components/ProjectCard";
import { SearchField } from "../components/SearchField";
import { ConfirmDialog } from "../components/ConfirmDialog";

type LoadStatus = "loading" | "error" | "ready";

const SEARCH_THRESHOLD = 9;

/**
 * `/` — стартовый список проектов (docs/02-ux.md, «Стартовый список
 * проектов»). Четыре состояния: пустое, загрузка, ошибка, наполненное
 * (+ «много данных» при 10+ проектах).
 */
export default function StartScreen() {
  const store = useProjectStore();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    // Чтение localStorage синхронно, но нарочно оставлено в эффекте, а не
    // в ленивом инициализаторе useState: так гарантированно проходит
    // первый кадр с состоянием «Загрузка» (skeleton) перед «Наполненным»,
    // как описано в docs/02-ux.md («на время чтения localStorage —
    // доли секунды — 3 карточки-скелетона»), а не мгновенная подмена ещё
    // до первого рендера.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjects(store.listProjects());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [store]);

  const themeById = useMemo(() => new Map(THEMES.map((theme) => [theme.id, theme])), []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(query));
  }, [projects, search]);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setRemovingId(id);
    window.setTimeout(
      () => {
        store.deleteProject(id);
        setProjects((current) => current.filter((project) => project.id !== id));
        setRemovingId(null);
      },
      reducedMotion ? 0 : 200,
    );
  };

  const header = (
    <div className="nd-start__header">
      <div className="nd-start__brand-row">
        <div>
          <h1 className="nd-heading-xl">NoesDize</h1>
          <p className="nd-start__tagline nd-text-muted">
            Соберите красивый сайт за пару минут — без интернета и регистрации
          </p>
        </div>
        {status === "ready" && projects.length > 0 && (
          <div className="nd-start__toolbar">
            {projects.length > SEARCH_THRESHOLD && <SearchField value={search} onChange={setSearch} />}
            <Button variant="primary" onClick={() => navigate("/new")}>
              Создать новый сайт
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (status === "loading") {
    return (
      <main className="nd-page">
        {header}
        <div className="nd-start__skeleton-grid">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="nd-page">
        {header}
        <div className="nd-start__banner-wrap">
          <Banner message="Не удалось прочитать сохранённые проекты. Список недоступен, но вы можете начать заново." />
        </div>
        <Button variant="primary" onClick={() => navigate("/new")}>
          Создать новый проект
        </Button>
      </main>
    );
  }

  if (projects.length === 0) {
    return (
      <main className="nd-page">
        {header}
        <EmptyState
          title="Соберите свой первый сайт"
          text="NoesDize собирает одностраничный сайт с текстами, темой оформления и эффектами — прямо в браузере, без регистрации и интернета"
          action={
            <Button variant="primary" onClick={() => navigate("/new")}>
              Создать первый сайт
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main className="nd-page">
      {header}
      <div className="nd-start__grid">
        {filtered.map((project) => (
          <ProjectCard
            key={project.id}
            summary={project}
            theme={themeById.get(project.themeId)}
            removing={removingId === project.id}
            onOpen={() => navigate(`/editor/${project.id}`)}
            onDelete={() => setDeleteTarget(project)}
          />
        ))}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={`Удалить проект «${deleteTarget.name}»?`}
          description="Это действие нельзя отменить. Все секции и настройки темы будут удалены из этого браузера."
          confirmLabel="Удалить"
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}
