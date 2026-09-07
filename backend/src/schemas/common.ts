import { z } from 'zod';

/** Общая пагинация для списочных эндпоинтов — см. docs/04-architecture.md §4. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
