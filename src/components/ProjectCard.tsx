import type { ProjectSummary, Theme } from "../types";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { IconTrash } from "./Icons";

export interface ProjectCardProps {
  summary: ProjectSummary;
  theme: Theme | undefined;
  onOpen: () => void;
  onDelete: () => void;
  removing?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Карточка проекта на стартовом экране (F8, docs/02-ux.md). */
export function ProjectCard({ summary, theme, onOpen, onDelete, removing }: ProjectCardProps) {
  const plateStyle = theme
    ? { background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})` }
    : { background: "var(--nd-color-border-strong)" };

  return (
    <div className={`nd-card nd-project-card${removing ? " nd-project-card--removing" : ""}`}>
      <div className="nd-project-card__plate" style={plateStyle} aria-hidden="true" />
      <div className="nd-project-card__body">
        <span className="nd-project-card__name" title={summary.name}>
          {summary.name}
        </span>
        <span className="nd-project-card__meta">
          Изменено {dateFormatter.format(new Date(summary.updatedAt)).replace(" г.", "")}
        </span>
        <div className="nd-project-card__actions">
          <Button variant="primary" onClick={onOpen}>
            Открыть
          </Button>
          <IconButton aria-label="Удалить проект" danger onClick={onDelete}>
            <IconTrash />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
