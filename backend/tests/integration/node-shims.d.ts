/**
 * Минимальные типовые шимы для Node builtin-модулей, используемых только в тестовой
 * инфраструктуре (backend/tests/integration/helpers.ts — миграции применяются к реальной
 * Miniflare/D1 через `wrangler`'s `getPlatformProxy()`, что требует `node:fs`/`node:path`/
 * `node:url` вне рантайма Workers).
 *
 * Полный пакет `@types/node` сюда намеренно НЕ подключается — он конфликтует с
 * `@cloudflare/workers-types` (оба по-разному объявляют глобальные `fetch`/`Response`/`crypto`/
 * `WebSocket`), а `tsconfig.json` (`"types"`) специально ограничен только Workers-типами для
 * всего остального бэкенд-кода. Здесь объявлено ровно то, что реально используется в тестах.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf-8'): string;
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string): string;
}

interface ImportMeta {
  url: string;
}
