/**
 * Única salida HTTP: cookies HttpOnly y encabezado no simple para CSRF.
 * Refresh, login y logout se serializan entre pestañas con Web Locks.
 * El modo anónimo omite cookies en consultas públicas. No envía Bearer.
 */
import type { Sesion } from '@/types';
import { SessionLockError, withSessionLock } from './sessionLock';
import {
  getSesion,
  getUsuarioGuardado,
  limpiarSesion,
  LOGOUT_EVENT,
  porVencer,
  setSesion,
} from './session';

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
  /**
   * Endpoints de login/registro/refresh: no mandan token ni intentan renovar ante un 401
   * (ahí un 401 significa "credenciales incorrectas", no "sesión vencida").
   */
  anonimo?: boolean;
}

/* ── Renovación de sesión (una sola en vuelo) ─────────────────────────── */

let refreshing: Promise<Sesion | null> | null = null;

/**
 * Pide renovar mediante la cookie HttpOnly, sin acceder a su contenido.
 * Devuelve null si el backend la rechaza (y en ese caso limpia todo).
 * Si falla la red, NO cierra la sesión: tira NETWORK_ERROR.
 */
export function refrescarSesion(): Promise<Sesion | null> {
  const initialRevision = getSesion()?.revision;
  refreshing ??= withSessionLock(async () => {
    const actual = getSesion();
    if (!actual) return null;
    if (actual.revision !== initialRevision) return actual;
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Session-Mode': 'cookie' },
        body: '{}',
      });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.');
    }
    if (!res.ok) {
      // Otra pestaña pudo haber renovado mientras tanto: si hay una sesión distinta, usarla.
      const ahora = getSesion();
      if (ahora && ahora.revision !== actual.revision) return ahora;
      if (![401, 403].includes(res.status))
        throw new ApiError(
          res.status,
          'REFRESH_UNAVAILABLE',
          'No se pudo renovar la sesión. Probá nuevamente.',
        );
      limpiarSesion();
      window.dispatchEvent(new Event(LOGOUT_EVENT));
      return null;
    }
    const payload = (await res.json().catch(() => null)) as { data?: { sesion?: Sesion } } | null;
    // Un refresh anterior no puede restaurar una sesión cerrada ni otra cuenta.
    const vigente = getSesion();
    if (!vigente || vigente.revision !== actual.revision) return vigente;
    const nueva = payload?.data?.sesion ?? null;
    setSesion(nueva ? { ...nueva, sessionId: actual.sessionId } : null);
    if (!nueva) window.dispatchEvent(new Event(LOGOUT_EVENT));
    return getSesion();
  }).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/* ── Request ──────────────────────────────────────────────────────────── */

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (['/auth/login', '/auth/registro', '/auth/logout'].includes(path)) {
    return withSessionLock(() => performRequest<T>(path, options));
  }
  return performRequest<T>(path, options);
}

async function performRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const { method = 'GET', query, body, signal, anonimo = false } = options;
  if (/^\/(poroteos|admin)(\/|$)/.test(path) && !getSesion()) {
    throw new ApiError(401, 'SESSION_EXPIRED', 'Se requiere iniciar sesión.');
  }
  const isForm = body instanceof FormData;
  const identidadInicial = anonimo ? null : getUsuarioGuardado()?.id;
  const sessionIdInicial = anonimo ? null : getSesion()?.sessionId;
  const comprobarIdentidad = () => {
    if (sessionIdInicial && getSesion()?.sessionId !== sessionIdInicial) {
      throw new ApiError(401, 'SESSION_EXPIRED', 'La sesión cambió. Volvé a abrir tus poroteos.');
    }
    if (identidadInicial && (!getSesion() || getUsuarioGuardado()?.id !== identidadInicial)) {
      throw new ApiError(401, 'SESSION_EXPIRED', 'La sesión cambió. Volvé a abrir tus poroteos.');
    }
  };

  let sesion = anonimo ? null : getSesion();
  if (sesion && porVencer(sesion)) {
    sesion = await refrescarSesion().catch(() => sesion); // sin red: probamos con el token actual
  }

  const enviar = () => {
    comprobarIdentidad();
    const headers = new Headers();
    headers.set('X-Session-Mode', 'cookie');
    if (identidadInicial) headers.set('X-Expected-User', identidadInicial);
    // FormData: NO setear Content-Type, el navegador agrega el boundary.
    if (body !== undefined && !isForm) headers.set('Content-Type', 'application/json');
    return fetch(`${BASE_URL}/api${path}${buildQuery(query)}`, {
      method,
      cache: 'no-store',
      credentials: anonimo && !path.startsWith('/auth/') ? 'omit' : 'include',
      signal,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  };

  let response: Response;
  try {
    response = await enviar();
    comprobarIdentidad();
    if (response.status === 401 && sesion && path !== '/auth/logout') {
      // Si otra request ya renovó el token, alcanza con reintentar con el nuevo.
      const actual = getSesion();
      const nueva =
        actual && actual.revision !== sesion.revision ? actual : await refrescarSesion();
      if (nueva) response = await enviar();
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError' || err instanceof ApiError) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor.');
  }

  comprobarIdentidad();
  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  comprobarIdentidad();
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

/* ── Mensajes ─────────────────────────────────────────────────────────── */

/** Mensaje humano para mostrar en pantalla según el tipo de error. */
export function errorMessage(error: unknown): string {
  if (error instanceof SessionLockError) return error.message;
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR')
      return 'No pudimos conectarnos con el servidor. ¿Está levantado el backend?';
    if (error.code === 'SERVICE_UNAVAILABLE') return error.message;
    if (error.code === 'RATE_LIMITED')
      return 'Hiciste muchas consultas seguidas. Esperá un momento.';
    if (error.code === 'UNAUTHORIZED' || error.code === 'SESSION_EXPIRED')
      return 'Tu sesión se cerró. Volvé a iniciar sesión.';
    if (error.status === 404) return 'No encontramos lo que buscabas.';
    return error.message;
  }
  return 'Ocurrió un error inesperado.';
}

/**
 * Errores de validación por campo (BAD_REQUEST). El backend manda
 * `details: [{ campo: 'body.email', mensaje }]` → `{ email: mensaje }`.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'BAD_REQUEST') return {};
  if (!Array.isArray(error.details)) return {};
  const out: Record<string, string> = {};
  for (const d of error.details as { campo?: unknown; mensaje?: unknown }[]) {
    if (typeof d?.campo !== 'string' || typeof d.mensaje !== 'string') continue;
    const campo = d.campo.replace(/^body\./, '');
    out[campo] ??= d.mensaje;
  }
  return out;
}
