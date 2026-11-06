/**
 * Login con Google: estado que tiene que sobrevivir a la ida y vuelta por Google.
 * Se guarda en sessionStorage (solo esta pestaña, se borra al cerrarla) y se
 * consume una sola vez en /auth/callback.
 */
import { authApi } from '@/api/resources';

const KEY = 'poroteo.oauth';
/** Pasado este tiempo, el verifier guardado se descarta (Supabase vence el flujo antes). */
const VIGENCIA_MS = 15 * 60_000;

interface Pendiente {
  codeVerifier: string;
  /** Ruta interna a la que volver después de entrar. */
  destino: string;
  creado: number;
}

/** Pide la URL al backend, guarda el verifier y manda el navegador a Google. */
export async function iniciarLoginGoogle(destino: string): Promise<void> {
  const { data } = await authApi.googleInicio();
  const pendiente: Pendiente = { codeVerifier: data.codeVerifier, destino, creado: Date.now() };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pendiente));
  } catch {
    throw new Error(
      'Tu navegador no permite guardar datos de la sesión (¿modo privado estricto?).',
    );
  }
  window.location.assign(data.url);
}

/** Lee y BORRA el estado pendiente (un verifier sirve para un solo intento). */
export function tomarPendiente(): Pendiente | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pendiente;
    if (!p?.codeVerifier || Date.now() - p.creado > VIGENCIA_MS) return null;
    return p;
  } catch {
    return null;
  }
}

/**
 * Parámetros que trae Supabase al volver: `?code=` si salió bien, o
 * `error` / `error_description` (en la query o en el hash) si no.
 */
export function leerRetorno(location: { search: string; hash: string }) {
  const query = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const get = (k: string) => query.get(k) ?? hash.get(k);
  return {
    code: get('code'),
    error: get('error'),
    errorDescripcion: get('error_description'),
  };
}
