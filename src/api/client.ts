/**
 * Cliente HTTP del frontend. ÚNICO punto de salida hacia la red.
 * El front solo habla con nuestro backend: nunca con Supabase directo.
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options;
  const isForm = body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api${path}${buildQuery(query)}`, {
      method,
      signal,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.');
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'HTTP_ERROR',
      error?.message ?? `Error ${response.status}`,
      error?.details,
    );
  }
  return payload as T;
}

/** Mensaje humano para mostrar en pantalla según el tipo de error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR')
      return 'No pudimos conectarnos con el servidor. ¿Está levantado el backend?';
    if (error.code === 'SERVICE_UNAVAILABLE')
      return 'Esta función todavía no está habilitada en la base de datos. Falta aplicar las migraciones de Supabase (ver el CLAUDE.md del backend).';
    if (error.code === 'RATE_LIMITED')
      return 'Hiciste muchas consultas seguidas. Esperá un momento.';
    if (error.status === 404) return 'No encontramos lo que buscabas.';
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
}
