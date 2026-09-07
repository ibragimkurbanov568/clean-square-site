import { Hono } from 'hono';
import type { Env } from '../types/env';

export const healthRouter = new Hono<{ Bindings: Env }>();

/** GET /api/health — единственный полностью рабочий (не заглушка) эндпоинт на этом шаге. */
healthRouter.get('/', (c) =>
  c.json({
    status: 'ok',
    service: 'cleanlink-api',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  }),
);

export default healthRouter;
