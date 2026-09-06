/**
 * Словарь отраслей (F1). 7 вариантов — дословно все значения `IndustryId`
 * из `src/types/project.ts`. ТЗ требует минимум 6 — здесь есть все 7,
 * включая «Другое» (умолчание модели данных).
 *
 * Порядок массива `INDUSTRIES` — порядок чипов в мастере создания (F1,
 * см. `02-ux.md`): содержательные отрасли сначала, «Другое» — последним.
 */
import type { IndustryId } from "../types/project";
import type { IndustryOption } from "../types/generator";

export const INDUSTRIES: readonly IndustryOption[] = [
  { id: "cafe", labelRu: "Кафе и рестораны" },
  { id: "it", labelRu: "IT и стартапы" },
  { id: "beauty", labelRu: "Салон красоты" },
  { id: "shop", labelRu: "Магазин и e-commerce" },
  { id: "consulting", labelRu: "Услуги и консалтинг" },
  { id: "education", labelRu: "Образование" },
  { id: "other", labelRu: "Другое" },
];

/** Быстрый доступ к варианту отрасли по id (для форм и генератора). */
export const INDUSTRY_BY_ID: Readonly<Record<IndustryId, IndustryOption>> = Object.fromEntries(
  INDUSTRIES.map((option) => [option.id, option]),
) as Record<IndustryId, IndustryOption>;
