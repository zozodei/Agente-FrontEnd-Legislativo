/**
 * Coordinación y perfil de presentación sin secretos en localStorage.
 * Access y refresh tokens permanecen en cookies HttpOnly del backend.
 */
import type { Sesion, Usuario } from '@/types';

export const SESION_KEY = 'poroteo.sesion';
export const USUARIO_KEY = 'poroteo.usuario';

/** Evento que dispara el cliente HTTP cuando la sesión ya no sirve (refresh fallido). */
export const LOGOUT_EVENT = 'auth:logout';

function leer<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function escribir(key: string, value: unknown) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    /* almacenamiento no disponible (modo privado): la sesión dura lo que la pestaña */
  }
}

export const getSesion = (): Sesion | null => {
  const value = leer<Sesion & { mode?: string }>(SESION_KEY);
  if (!value) return null;
  if (value.mode !== 'cookie' || value.accessToken || value.refreshToken) {
    // Migración: descartar credenciales del diseño anterior. Se requiere nuevo login.
    escribir(SESION_KEY, null);
    escribir(USUARIO_KEY, null);
    return null;
  }
  return value;
};
export const setSesion = (s: Sesion | null) =>
  escribir(
    SESION_KEY,
    s
      ? {
          mode: 'cookie',
          expiresAt: s.expiresAt,
          expiresIn: s.expiresIn,
          tokenType: 'bearer',
          revision: s.revision ?? crypto.randomUUID(),
          sessionId: s.sessionId ?? crypto.randomUUID(),
        }
      : null,
  );
export const getUsuarioGuardado = () => leer<Usuario>(USUARIO_KEY);
export const setUsuarioGuardado = (u: Usuario | null) => escribir(USUARIO_KEY, u);

export function limpiarSesion() {
  setSesion(null);
  setUsuarioGuardado(null);
}

/** true si al token le queda menos de `margenMs` (expiresAt viene en SEGUNDOS). */
export function porVencer(s: Sesion, margenMs = 60_000) {
  return s.expiresAt * 1000 - Date.now() < margenMs;
}
