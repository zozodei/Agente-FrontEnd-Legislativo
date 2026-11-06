/**
 * Login con Google (redirect). El front nunca habla con Google ni con
 * Supabase directo: el backend da la URL y valida la sesión con /auth/me.
 *
 * Flujo: botón → GET /auth/google?redirectTo=<origen>/auth/callback →
 * Google → vuelve a /auth/callback con los tokens en el hash
 * (#access_token=…&refresh_token=…&expires_in=…) → se guardan y se
 * validan con GET /auth/me.
 */
import type { Sesion } from '@/types';

const DESTINO_KEY = 'auth.google.redirect';

export type ResultadoCallback =
  | { tipo: 'sesion'; sesion: Sesion }
  | { tipo: 'error'; error: string; descripcion: string | null }
  | { tipo: 'vacio' };

/** A dónde vuelve Google: mismo origen, ruta pública del callback. */
export function urlCallbackGoogle(): string {
  return `${window.location.origin}/auth/callback`;
}

/**
 * Parsea lo que trae Google al volver. Los tokens vienen en el hash
 * (formato de Supabase); un error puede venir en el hash o en la query.
 * Función pura (recibe hash/search) para poder testearla sin router.
 */
export function parseCallbackGoogle(
  hash: string,
  search = '',
  ahora = Date.now(),
): ResultadoCallback {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const query = new URLSearchParams(search.replace(/^\?/, ''));

  const error = params.get('error') ?? query.get('error');
  if (error) {
    return {
      tipo: 'error',
      error,
      descripcion: params.get('error_description') ?? query.get('error_description'),
    };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return { tipo: 'vacio' };

  const expiresIn = Number(params.get('expires_in'));
  const segundos = Number.isFinite(expiresIn) && expiresIn > 0 ? Math.floor(expiresIn) : 3600;
  return {
    tipo: 'sesion',
    sesion: {
      accessToken,
      refreshToken,
      expiresIn: segundos,
      expiresAt: Math.floor(ahora / 1000) + segundos, // SEGUNDOS, como el resto de la sesión
      tokenType: 'bearer',
    },
  };
}

/** Mensaje para mostrar cuando Google vuelve con error (o sin tokens). */
export function mensajeErrorGoogle(resultado: ResultadoCallback): string {
  if (resultado.tipo === 'error') {
    if (resultado.error === 'access_denied') return 'Cancelaste el inicio de sesión con Google.';
    return resultado.descripcion || `Google devolvió un error (${resultado.error}).`;
  }
  return 'No se recibieron los datos de la sesión de Google. Probá de nuevo.';
}

/**
 * A dónde ir después del callback (la ruta que pedía el usuario antes de
 * loguearse). Va en sessionStorage, no en la URL: el `redirectTo` que se le
 * manda al backend es siempre /auth/callback.
 */
export function guardarDestinoGoogle(destino: string) {
  try {
    sessionStorage.setItem(DESTINO_KEY, destino);
  } catch {
    /* almacenamiento no disponible: se va a / */
  }
}

/** Lee el destino guardado y lo borra (se usa una sola vez). */
export function leerDestinoGoogle(): string | null {
  try {
    const destino = sessionStorage.getItem(DESTINO_KEY);
    sessionStorage.removeItem(DESTINO_KEY);
    return destino;
  } catch {
    return null;
  }
}
