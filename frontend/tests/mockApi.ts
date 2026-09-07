import { vi } from 'vitest';

/**
 * Общий роутер для мока `global.fetch` в компонентных тестах — избегает мокирования каждого
 * хука по отдельности и проверяет реальный код apiClient.ts (URL/query/JSON-парсинг), а не
 * заглушенную версию.
 */
export interface MockRouteResult {
  status?: number;
  body: unknown;
}

export type MockRouteHandler = (
  url: URL,
  init: RequestInit | undefined,
) => MockRouteResult | Promise<MockRouteResult>;

export interface MockRoute {
  method: string;
  /** Проверяется против `url.pathname`. */
  matcher: RegExp;
  handler: MockRouteHandler;
}

export interface InstalledFetchMock {
  fetchMock: ReturnType<typeof vi.fn>;
  calls: Array<{ method: string; url: string }>;
}

export function installFetchMock(routes: MockRoute[], fallback?: MockRouteHandler): InstalledFetchMock {
  const calls: InstalledFetchMock['calls'] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const url = new URL(urlStr, 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ method, url: url.pathname + url.search });

    const route = routes.find((r) => r.method === method && r.matcher.test(url.pathname));
    const resolved = route ? await route.handler(url, init) : fallback ? await fallback(url, init) : null;

    if (!resolved) {
      throw new Error(`Unmocked fetch in test: ${method} ${url.pathname}${url.search}`);
    }

    return new Response(JSON.stringify(resolved.body), {
      status: resolved.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

export function paginated<T>(items: T[], overrides: Partial<{ page: number; limit: number; total: number; hasMore: boolean }> = {}) {
  return {
    items,
    page: overrides.page ?? 1,
    limit: overrides.limit ?? 20,
    total: overrides.total ?? items.length,
    hasMore: overrides.hasMore ?? false,
  };
}
