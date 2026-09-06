/**
 * Словарь тонов текста (F1, F3). Ровно 4 варианта — дословно все
 * значения `ToneId` из `src/types/project.ts`, как того требует ТЗ
 * («≥4 варианта: официальный, дружелюбный, дерзкий, минималистичный»).
 */
import type { ToneId } from "../types/project";
import type { ToneOption } from "../types/generator";

export const TONES: readonly ToneOption[] = [
  { id: "formal", labelRu: "Официальный" },
  { id: "friendly", labelRu: "Дружелюбный" },
  { id: "bold", labelRu: "Дерзкий" },
  { id: "minimal", labelRu: "Минималистичный" },
];

export const TONE_BY_ID: Readonly<Record<ToneId, ToneOption>> = Object.fromEntries(
  TONES.map((option) => [option.id, option]),
) as Record<ToneId, ToneOption>;
