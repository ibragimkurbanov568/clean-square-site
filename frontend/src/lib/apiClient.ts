/**
 * Тонкий типизированный fetch-клиент для backend API. Контракт эндпоинтов — docs/04-architecture.md §4.
 * `credentials: 'include'` обязателен — access/refresh JWT живут в HttpOnly cookies (F1).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface ApiErrorPayload {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.fields = payload.fields;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

/**
 * Загрузка файла (аватар/обложка/обои) — multipart/form-data, поле `file`
 * (docs/04-architecture.md §4.11). Отдельная функция от apiRequest, т.к. Content-Type для
 * multipart выставляется браузером автоматически (boundary), JSON.stringify не применяется.
 */
export async function apiUpload<T>(path: string, file: File | Blob, fieldName = 'file'): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file, file instanceof File ? file.name : 'upload.png');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorPayload: ApiErrorPayload = payload?.error ?? {
      code: 'unknown_error',
      message: 'Не удалось подключиться к серверу. Проверьте интернет и попробуйте снова',
    };
    throw new ApiError(response.status, errorPayload);
  }

  return payload as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    credentials: 'include',
    signal: options.signal,
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorPayload: ApiErrorPayload = payload?.error ?? {
      code: 'unknown_error',
      message: 'Не удалось подключиться к серверу. Проверьте интернет и попробуйте снова',
    };
    throw new ApiError(response.status, errorPayload);
  }

  return payload as T;
}
