import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  IndustryId,
  Project,
  Section,
  SectionType,
  ThemeId,
  ToneId,
  ViewportMode,
} from "../types";
import { SECTION_LIBRARY } from "../content/sectionLibrary";
import {
  addSection,
  removeSection,
  reorderSections,
  regenerateProjectTexts,
  setSectionVisibility,
  updateSectionText,
} from "../lib/projectFactory";
import { exportProjectToHtml } from "../lib/htmlExporter";
import { useProjectStore } from "../hooks/useProjectStore";
import { useAutosave } from "../hooks/useAutosave";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useToast } from "../hooks/useToastHooks";
import { IconButton } from "../components/IconButton";
import { Button } from "../components/Button";
import { IconBack, IconDownload, IconPencil } from "../components/Icons";
import { AutosaveIndicator } from "../components/AutosaveIndicator";
import { Banner } from "../components/Banner";
import { Tabs } from "../components/Tabs";
import { SectionListPanel } from "../components/SectionListPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { PreviewFrame } from "../components/PreviewFrame";
import { ViewportSwitch } from "../components/ViewportSwitch";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SectionLibraryDialog } from "../components/SectionLibraryDialog";

type MobileView = "edit" | "preview";
type InnerTab = "sections" | "settings";
type LoadStatus = "loading" | "not-found" | "ready";

const NAME_MAX = 60;

/**
 * `/editor/:id` — редактор + предпросмотр (docs/02-ux.md, «Редактор +
 * предпросмотр»). И «Правка», и «Просмотр» (а внутри «Правки» — и
 * «Секции», и «Настройки») ВСЕГДА смонтированы в DOM одновременно;
 * переключение — только через CSS `display` (см. app.css, §17), чтобы
 * поле ввода текста секции никогда не размонтировалось при
 * переключении сегментов/вкладок (docs/02-ux.md, «Три сложных
 * момента», п.3).
 */
export default function EditorScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useProjectStore();
  const { showToast } = useToast();
  const isMobileLayout = useMediaQuery("(max-width: 767px)");
  const reducedMotion = useReducedMotion();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [project, setProject] = useState<Project | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("edit");
  const [innerTab, setInnerTab] = useState<InnerTab>("sections");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [justAddedSectionId, setJustAddedSectionId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<Section | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [regenerateBusy, setRegenerateBusy] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [exportDone, setExportDone] = useState(false);

  const autosaveStatus = useAutosave(project, store);

  useEffect(() => {
    if (!id) return;
    // Чтение localStorage синхронно, но нарочно оставлено в эффекте (не в
    // ленивом инициализаторе useState) — см. пояснение в StartScreen.tsx.
    try {
      const loaded = store.loadProject(id);
      if (!loaded) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStatus("not-found");
        return;
      }
      setProject(loaded);
      setStatus("ready");
    } catch {
      setStatus("not-found");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (status === "not-found") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  const applyUpdate = (next: Project) => {
    setProject({ ...next, updatedAt: new Date().toISOString() });
  };

  const heroVisible = useMemo(
    () => project?.sections.some((section) => section.type === "hero" && section.visible) ?? false,
    [project],
  );
  const visibleSections = useMemo(
    () => project?.sections.filter((section) => section.visible) ?? [],
    [project],
  );
  const isFallbackEmpty = project ? project.sections.length === 1 && project.sections[0].type === "hero" : false;
  const allHidden = project ? visibleSections.length === 0 : false;

  const hintText = isMobileLayout
    ? "Откройте вкладку «Правка» и нажмите «Добавить секцию», чтобы собрать сайт"
    : "Добавьте секции слева, чтобы собрать сайт";

  if (status !== "ready" || !project) {
    return (
      <main className="nd-page">
        <p className="nd-text-muted">Загрузка проекта…</p>
      </main>
    );
  }

  const handleAddSection = (type: SectionType) => {
    const previousIds = new Set(project.sections.map((section) => section.id));
    const updated = addSection(project, type);
    const added = updated.sections.find((section) => !previousIds.has(section.id));
    applyUpdate(updated);
    setShowLibrary(false);
    if (added) setJustAddedSectionId(added.id);
  };

  const handleDeleteConfirm = () => {
    if (!deleteSectionTarget) return;
    const updated = removeSection(project, deleteSectionTarget.id);
    applyUpdate(updated);
    if (editingSectionId === deleteSectionTarget.id) setEditingSectionId(null);
    setDeleteSectionTarget(null);
  };

  const handleMove = (sectionId: string, direction: "up" | "down") => {
    applyUpdate(reorderSections(project, sectionId, direction));
  };

  const handleReorderDrag = (sourceId: string, targetId: string) => {
    const sorted = [...project.sections].sort((a, b) => a.order - b.order);
    const fromIndex = sorted.findIndex((section) => section.id === sourceId);
    const toIndex = sorted.findIndex((section) => section.id === targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const direction = toIndex > fromIndex ? "down" : "up";
    const steps = Math.abs(toIndex - fromIndex);
    let current = project;
    for (let step = 0; step < steps; step += 1) {
      current = reorderSections(current, sourceId, direction);
    }
    applyUpdate(current);
  };

  const handleToggleVisibility = (sectionId: string) => {
    const target = project.sections.find((section) => section.id === sectionId);
    if (!target) return;
    applyUpdate(setSectionVisibility(project, sectionId, !target.visible));
  };

  const handleChangeSection = (
    sectionId: string,
    patch: Partial<Pick<Section, "title" | "body" | "items" | "ctaText">>,
  ) => {
    applyUpdate(updateSectionText(project, sectionId, patch));
  };

  const handleIndustryChange = (industry: IndustryId) => {
    applyUpdate(regenerateProjectTexts({ ...project, industry }, { force: false }));
  };

  const handleToneChange = (tone: ToneId) => {
    applyUpdate(regenerateProjectTexts({ ...project, tone }, { force: false }));
  };

  const handleThemeChange = (themeId: ThemeId) => {
    applyUpdate({ ...project, themeId });
  };

  const handleEffectsChange = (enabled: boolean) => {
    applyUpdate({ ...project, effectsEnabled: enabled });
  };

  const handleViewportChange = (viewport: ViewportMode) => {
    applyUpdate({ ...project, viewport });
  };

  const handleRegenerateConfirm = () => {
    if (regenerateBusy) return;
    setRegenerateBusy(true);
    setIsRegenerating(true);
    window.setTimeout(() => {
      applyUpdate(regenerateProjectTexts(project, { force: true }));
      setRegenerateBusy(false);
      setShowRegenerateConfirm(false);
      window.setTimeout(() => setIsRegenerating(false), 300);
    }, 500);
  };

  const commitName = () => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    applyUpdate({ ...project, name: trimmed.slice(0, NAME_MAX) });
  };

  const handleExport = () => {
    if (!heroVisible) {
      showToast("Добавьте секцию «Обложка» перед экспортом");
      return;
    }
    const result = exportProjectToHtml(project);
    const blob = new Blob([result.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExportDone(true);
    window.setTimeout(() => setExportDone(false), 1500);
    showToast(`Готово! Файл «${result.filename}» скачан.`);
  };

  const exportTitle = heroVisible ? undefined : "Добавьте видимую секцию «Обложка», чтобы включить экспорт";

  return (
    <div className="nd-editor">
      <header className="nd-editor__header">
        <IconButton aria-label="Назад к списку проектов" onClick={() => navigate("/")}>
          <IconBack />
        </IconButton>

        {editingName ? (
          <input
            className="nd-input nd-editor__title-input"
            value={nameDraft}
            autoFocus
            maxLength={NAME_MAX}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitName();
              if (event.key === "Escape") setEditingName(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="nd-editor__title-btn"
            aria-label="Переименовать проект"
            onClick={() => {
              setNameDraft(project.name);
              setEditingName(true);
            }}
          >
            <span className="nd-editor__title-text nd-editor__header-compact-name">{project.name}</span>
            <IconPencil width={14} height={14} />
          </button>
        )}

        <AutosaveIndicator status={autosaveStatus} compact={isMobileLayout} />
        <div className="nd-editor__header-spacer" />

        <span className="nd-editor__header-download">
          <Button
            variant={exportDone ? "success" : "primary"}
            compact
            disabled={!heroVisible}
            title={exportTitle}
            onClick={handleExport}
          >
            <IconDownload width={14} height={14} /> {exportDone ? "Готово ✓" : "Скачать"}
          </Button>
        </span>
      </header>

      {autosaveStatus === "error" && (
        <Banner
          message="Не удалось сохранить локально"
          hint="Работа продолжается в этой вкладке, но изменения не сохраняются на диск."
        />
      )}

      <div className="nd-editor__segmented-wrap">
        <Tabs
          idPrefix="nd-editor-segment"
          variant="segmented"
          aria-label="Правка или просмотр"
          items={[
            { id: "edit", label: "Правка" },
            { id: "preview", label: "Просмотр" },
          ]}
          activeId={mobileView}
          onChange={setMobileView}
        />
      </div>

      <div className="nd-editor__body">
        <section
          className="nd-editor__panel"
          data-mobile-active={mobileView === "edit"}
          id="nd-editor-segment-panel-edit"
          role={isMobileLayout ? "tabpanel" : undefined}
          aria-labelledby={isMobileLayout ? "nd-editor-segment-tab-edit" : undefined}
        >
          <div className="nd-editor__panel-tabs">
            <Tabs
              idPrefix="nd-editor-innertab"
              items={[
                { id: "sections", label: "Секции" },
                { id: "settings", label: "Настройки" },
              ]}
              activeId={innerTab}
              onChange={setInnerTab}
            />
          </div>
          <div className="nd-editor__panel-content">
            <div
              className="nd-editor__inner-view"
              data-active={innerTab === "sections"}
              id="nd-editor-innertab-panel-sections"
              role="tabpanel"
              aria-labelledby="nd-editor-innertab-tab-sections"
            >
              <SectionListPanel
                project={project}
                editingId={editingSectionId}
                justAddedId={justAddedSectionId}
                onEditToggle={(sectionId) =>
                  setEditingSectionId((current) => (current === sectionId ? null : sectionId))
                }
                onAddSection={() => setShowLibrary(true)}
                onDeleteRequest={(sectionId) => {
                  const target = project.sections.find((section) => section.id === sectionId);
                  if (target) setDeleteSectionTarget(target);
                }}
                onToggleVisibility={handleToggleVisibility}
                onMoveUp={(sectionId) => handleMove(sectionId, "up")}
                onMoveDown={(sectionId) => handleMove(sectionId, "down")}
                onChangeSection={handleChangeSection}
                onReorderDrag={handleReorderDrag}
              />
            </div>
            <div
              className="nd-editor__inner-view"
              data-active={innerTab === "settings"}
              id="nd-editor-innertab-panel-settings"
              role="tabpanel"
              aria-labelledby="nd-editor-innertab-tab-settings"
            >
              <SettingsPanel
                project={project}
                onIndustryChange={handleIndustryChange}
                onToneChange={handleToneChange}
                onRegenerateRequest={() => setShowRegenerateConfirm(true)}
                onThemeChange={handleThemeChange}
                onEffectsChange={handleEffectsChange}
                reducedMotionActive={reducedMotion}
              />
            </div>
          </div>
        </section>

        <section
          className="nd-editor__preview-col"
          data-mobile-active={mobileView === "preview"}
          id="nd-editor-segment-panel-preview"
          role={isMobileLayout ? "tabpanel" : undefined}
          aria-labelledby={isMobileLayout ? "nd-editor-segment-tab-preview" : undefined}
        >
          <div className="nd-preview-toolbar">
            <ViewportSwitch value={project.viewport} onChange={handleViewportChange} />
            <span className="nd-preview-toolbar__download">
              <Button
                variant={exportDone ? "success" : "primary"}
                disabled={!heroVisible}
                title={exportTitle}
                onClick={handleExport}
              >
                <IconDownload width={16} height={16} /> {exportDone ? "Готово ✓" : "Скачать сайт"}
              </Button>
            </span>
          </div>

          {isFallbackEmpty && <div className="nd-preview-hint">{hintText}</div>}

          <div className="nd-preview-panel nd-preview-surround">
            <PreviewFrame
              project={project}
              viewport={project.viewport}
              isRegenerating={isRegenerating}
              emptyMessage={allHidden ? hintText : undefined}
            />
          </div>
        </section>
      </div>

      {showLibrary && (
        <SectionLibraryDialog onSelect={handleAddSection} onClose={() => setShowLibrary(false)} />
      )}

      {deleteSectionTarget && (
        <ConfirmDialog
          title={`Удалить секцию «${SECTION_LIBRARY[deleteSectionTarget.type].labelRu}»?`}
          description="Это действие нельзя отменить. Тексты и настройки секции будут потеряны."
          confirmLabel="Удалить"
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteSectionTarget(null)}
        />
      )}

      {showRegenerateConfirm && (
        <ConfirmDialog
          title="Перегенерировать все тексты?"
          description="Все заголовки, абзацы и списки будут собраны заново по текущей отрасли и тону — включая поля, которые вы редактировали вручную. Отменить это действие нельзя."
          confirmLabel="Перегенерировать"
          busyLabel="Перегенерируем…"
          busy={regenerateBusy}
          danger
          onConfirm={handleRegenerateConfirm}
          onCancel={() => setShowRegenerateConfirm(false)}
        />
      )}
    </div>
  );
}
