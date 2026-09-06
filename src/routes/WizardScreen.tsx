import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IndustryId, ToneId } from "../types";
import { PROJECT_DEFAULTS } from "../types";
import { INDUSTRIES } from "../content/industries";
import { TONES } from "../content/tones";
import { createProject } from "../lib/projectFactory";
import { useProjectStore } from "../hooks/useProjectStore";
import { useToast } from "../hooks/useToast";
import { IconButton } from "../components/IconButton";
import { IconBack } from "../components/Icons";
import { TextField } from "../components/TextField";
import { ChipGroup } from "../components/ChipGroup";
import { Button } from "../components/Button";

const NAME_MAX = 60;

/**
 * `/new` — мастер создания проекта (F1, docs/02-ux.md). Отрасль и тон
 * предзаполнены значениями по умолчанию («Прочее», «Дружелюбный»), чтобы
 * правило «три клика до цели» выполнялось даже без единой правки чипов.
 */
export default function WizardScreen() {
  const navigate = useNavigate();
  const store = useProjectStore();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<IndustryId>(PROJECT_DEFAULTS.industry);
  const [tone, setTone] = useState<ToneId>(PROJECT_DEFAULTS.tone);
  const [nameError, setNameError] = useState(false);
  const [industryError, setIndustryError] = useState(false);
  const [toneError, setToneError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const trimmedName = name.trim();
  const isNameEmpty = trimmedName.length === 0;

  const handleSubmit = () => {
    if (isNameEmpty) {
      setNameError(true);
      return;
    }
    if (!industry) {
      setIndustryError(true);
      return;
    }
    if (!tone) {
      setToneError(true);
      return;
    }

    setSubmitting(true);
    let existingNames: string[] = [];
    try {
      existingNames = store.listProjects().map((project) => project.name);
    } catch {
      existingNames = [];
    }

    const { project, renamed } = createProject({
      name: trimmedName.slice(0, NAME_MAX),
      industry,
      tone,
      existingNames,
    });

    try {
      store.saveProject(project);
    } catch {
      // Сбой сохранения обработает баннер F8 в редакторе при следующем изменении.
    }

    if (renamed) {
      showToast(`Название уже занято — сайт сохранён как «${project.name}»`);
    }
    navigate(`/editor/${project.id}`);
  };

  return (
    <div>
      <header className="nd-wizard-header">
        <IconButton aria-label="Назад к списку проектов" onClick={() => navigate("/")}>
          <IconBack />
        </IconButton>
        <h1 className="nd-heading-lg">Новый сайт</h1>
      </header>

      <div className="nd-container-narrow nd-wizard-body">
        <TextField
          label="Название бизнеса"
          value={name}
          placeholder="Например, «Кофейня Атмосфера»"
          maxLength={NAME_MAX}
          error={nameError && isNameEmpty ? "Введите название" : undefined}
          onChange={(value) => {
            setName(value.slice(0, NAME_MAX));
            if (value.trim()) setNameError(false);
          }}
        />

        <ChipGroup
          title="Отрасль"
          options={INDUSTRIES.map((option) => ({ id: option.id, label: option.labelRu }))}
          value={industry}
          error={industryError}
          errorText="Выберите значение"
          onChange={(id) => {
            setIndustry(id as IndustryId);
            setIndustryError(false);
          }}
        />

        <ChipGroup
          title="Тон текста"
          options={TONES.map((option) => ({ id: option.id, label: option.labelRu }))}
          value={tone}
          error={toneError}
          errorText="Выберите значение"
          layout="grid-tone"
          onChange={(id) => {
            setTone(id as ToneId);
            setToneError(false);
          }}
        />
      </div>

      <div className="nd-wizard-footer nd-container-narrow">
        <Button
          variant="primary"
          block
          disabled={submitting}
          aria-disabled={isNameEmpty}
          onClick={handleSubmit}
        >
          {isNameEmpty ? "Введите название" : "Создать сайт"}
        </Button>
      </div>
    </div>
  );
}
