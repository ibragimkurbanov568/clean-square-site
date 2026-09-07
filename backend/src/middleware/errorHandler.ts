import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import type { Env } from '../types/env';
import { apiError } from '../lib/http';

/** Единая обработка ошибок для всего приложения — регистрируется через `app.onError`. */
export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    return apiError(c, 400, 'validation_error', 'Проверьте правильность заполнения полей', fields);
  }

  console.error('[unhandled_error]', err);
  return apiError(c, 500, 'internal_error', 'Внутренняя ошибка сервера');
};
