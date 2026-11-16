/**
 * Login con Google (redirect). El front nunca habla con Google ni con
 * Supabase directo: el backend da la URL y valida la sesión con /auth/me.
 *
 * Flujo (PKCE en el servidor): botón → GET /auth/google?redirectTo=<origen>/auth/callback
 * (el backend guarda el verifier en una cookie HttpOnly) → Google → vuelve a
 * /auth/callback?code=… → POST /auth/google/callback { code } → el backend canjea
 * el código con su verifier y deja las cookies de sesión, igual que el login.
 * El código solo no sirve: sin la cookie de este navegador no abre sesión.
 */
const DESTINO_KEY = 'auth.google.redirect';

export type ResultadoCallback =
  | { tipo: 'codigo'; code: string }
  | { tipo: 'error'; error: string; descripcion: string | null }
  | { tipo: 'vacio' };

/** A dónde vuelve Google: mismo origen, ruta pública del callback. */
export function urlCallbackGoogle(): string {
  return `${window.location.origin}/auth/callback`;
}

/**
 * Parsea lo que trae Supabase al volver: `?code=` (PKCE) o un error en la
 * query o el hash. Tokens en el hash se ignoran a propósito: nunca se importan.
 * Función pura (recibe hash/search) para poder testearla sin router.
 */
export function parseCallbackGoogle(hash: string, search = ''): ResultadoCallback {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const query = new URLSearchParams(search.replace(/^\?/, ''));

  const error = query.get('error') ?? params.get('error');
  if (error) {
    return {
      tipo: 'error',
      error,
      descripcion: query.get('error_description') ?? params.get('error_description'),
    };
  }

  const code = query.get('code')?.trim();
  return code ? { tipo: 'codigo', code } : { tipo: 'vacio' };
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
