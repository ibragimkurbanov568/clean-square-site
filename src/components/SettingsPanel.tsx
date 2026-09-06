import type { IndustryId, Project, ThemeId, ToneId } from "../types";
import { INDUSTRIES } from "../content/industries";
import { TONES } from "../content/tones";
import { THEMES } from "../content/themes";
import { ChipGroup } from "./ChipGroup";
import { ThemePicker } from "./ThemePicker";
import { EffectsToggle } from "./EffectsToggle";
import { Button } from "./Button";

export interface SettingsPanelProps {
  project: Project;
  onIndustryChange: (id: IndustryId) => void;
  onToneChange: (id: ToneId) => void;
  onRegenerateRequest: () => void;
  onThemeChange: (id: ThemeId) => void;
  onEffectsChange: (enabled: boolean) => void;
  reducedMotionActive: boolean;
}

/** Вкладка «Настройки» (docs/02-ux.md, «Вкладка Настройки»): три подблока. */
export function SettingsPanel({
  project,
  onIndustryChange,
  onToneChange,
  onRegenerateRequest,
  onThemeChange,
  onEffectsChange,
  reducedMotionActive,
}: SettingsPanelProps) {
  return (
    <div className="nd-settings">
      <section className="nd-settings-block">
        <h3 className="nd-heading-md nd-settings-block__title">Отрасль и тон</h3>
        <ChipGroup
          title="Отрасль"
          options={INDUSTRIES.map((option) => ({ id: option.id, label: option.labelRu }))}
          value={project.industry}
          onChange={(id) => onIndustryChange(id as IndustryId)}
        />
        <ChipGroup
          title="Тон текста"
          options={TONES.map((option) => ({ id: option.id, label: option.labelRu }))}
          value={project.tone}
          onChange={(id) => onToneChange(id as ToneId)}
          layout="grid-tone"
        />
        <div>
          <Button variant="secondary" onClick={onRegenerateRequest}>
            Перегенерировать все тексты
          </Button>
          <p className="nd-settings-block__hint">Перезапишет и тексты, изменённые вручную.</p>
        </div>
      </section>

      <section className="nd-settings-block">
        <h3 className="nd-heading-md nd-settings-block__title">Тема оформления</h3>
        <ThemePicker themes={THEMES} value={project.themeId} onChange={onThemeChange} />
      </section>

      <section className="nd-settings-block">
        <h3 className="nd-heading-md nd-settings-block__title">Эффекты</h3>
        <EffectsToggle
          enabled={project.effectsEnabled}
          onChange={onEffectsChange}
          reducedMotionActive={reducedMotionActive}
        />
      </section>
    </div>
  );
}
