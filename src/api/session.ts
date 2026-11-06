/**
 * Sesión del usuario guardada en localStorage (sobrevive a recargas).
 * Solo guardamos tokens y datos públicos del usuario: nunca la contraseña.
 * No loguear nada de esto en la consola.
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

export const getSesion = () => leer<Sesion>(SESION_KEY);
export const setSesion = (s: Sesion | null) => escribir(SESION_KEY, s);
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
