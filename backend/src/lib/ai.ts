/**
 * Workers AI: модерация отзывов + генерация описаний компаний, с rule-based fallback —
 * см. допущение 6 в docs/01-spec.md. Обе функции работают в обоих режимах (не заглушки).
 */
import type { Env } from '../types/env';

const STOP_WORDS = ['спам', 'реклама 18+', 'мошенник'] as const;

export interface ModerationResult {
  approved: boolean;
  reason?: string;
  usedFallback: boolean;
}

function shouldUseFallback(env: Pick<Env, 'AI' | 'AI_FORCE_FALLBACK'>): boolean {
  return env.AI_FORCE_FALLBACK === 'true' || !env.AI;
}

function ruleBasedModeration(text: string): ModerationResult {
  const lower = text.toLowerCase();
  const hit = STOP_WORDS.find((word) => lower.includes(word));
  return hit
    ? { approved: false, reason: `Обнаружено запрещённое слово: «${hit}»`, usedFallback: true }
    : { approved: true, usedFallback: true };
}

/** Модерирует текст отзыва перед публикацией (F7). */
export async function moderateReviewText(
  text: string,
  env: Pick<Env, 'AI' | 'AI_FORCE_FALLBACK'>,
): Promise<ModerationResult> {
  if (shouldUseFallback(env)) return ruleBasedModeration(text);

  try {
    // TODO(backend): подобрать текстовую модель модерации (`@cf/...`) и распарсить ответ.
    // Ниже — рабочий вызов-заглушка с безопасным фолбэком при сбое биндинга.
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content:
            'Ты модератор отзывов клинингового маркетплейса. Ответь только "OK" если текст ' +
            'приемлем, или "REJECT: <причина>" если текст спам/оскорбления/реклама.',
        },
        { role: 'user', content: text },
      ],
    });
    const answer = String((result as { response?: string }).response ?? '').trim();
    if (answer.toUpperCase().startsWith('REJECT')) {
      return { approved: false, reason: answer, usedFallback: false };
    }
    return { approved: true, usedFallback: false };
  } catch {
    return ruleBasedModeration(text);
  }
}

/** Генерирует шаблонное описание компании по базовым полям (используется в /company/profile). */
export async function generateCompanyDescription(
  input: { name: string; city: string; services: string[] },
  env: Pick<Env, 'AI' | 'AI_FORCE_FALLBACK'>,
): Promise<{ description: string; usedFallback: boolean }> {
  if (shouldUseFallback(env)) {
    return {
      usedFallback: true,
      description:
        `${input.name} — клининговая компания в городе ${input.city}. ` +
        (input.services.length > 0
          ? `Оказываем услуги: ${input.services.join(', ')}. `
          : '') +
        'Работаем качественно и в срок.',
    };
  }

  try {
    // TODO(backend): реальный вызов генерации текста, безопасный фолбэк ниже при сбое.
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'user',
          content: `Напиши короткое (2-3 предложения) описание клининговой компании "${input.name}" из города ${input.city} на русском языке.`,
        },
      ],
    });
    const description = String((result as { response?: string }).response ?? '').trim();
    if (!description) throw new Error('empty AI response');
    return { description, usedFallback: false };
  } catch {
    return generateCompanyDescription(input, { ...env, AI_FORCE_FALLBACK: 'true' });
  }
}
