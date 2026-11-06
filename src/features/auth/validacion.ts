/**
 * Validaciones de los formularios de cuenta. Replican las del backend para
 * dar feedback inmediato (el backend igual valida todo).
 */
import { ApiError, errorMessage } from '@/api/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return 'Ingresá tu email.';
  if (v.length > 254) return 'El email es demasiado largo.';
  if (!EMAIL_RE.test(v)) return 'Revisá el formato del email.';
  return null;
}

export function validarPasswordNueva(password: string): string | null {
  if (password.length < 8) return 'Usá al menos 8 caracteres.';
  if (password.length > 72) return 'Máximo 72 caracteres.';
  return null;
}

export function validarNombre(nombre: string): string | null {
  const v = nombre.trim();
  if (v.length < 2) return 'Ingresá tu nombre (mínimo 2 caracteres).';
  if (v.length > 120) return 'Máximo 120 caracteres.';
  return null;
}

/** Mensaje para los errores de login y registro. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Email o contraseña incorrectos.';
      case 'EMAIL_NOT_CONFIRMED':
        return 'Confirmá tu email antes de iniciar sesión. Revisá tu casilla (y el spam).';
      case 'CONFLICT':
        return 'Ya existe una cuenta con ese email.';
      case 'RATE_LIMITED':
        return 'Demasiados intentos. Esperá unos minutos y probá de nuevo.';
      case 'FORBIDDEN':
        return error.message || 'Esta operación no está permitida.';
      case 'BAD_REQUEST':
        return 'Revisá los datos marcados.';
    }
  }
  return errorMessage(error);
}

/** Solo rutas internas (evita redirecciones abiertas a otros sitios). */
export function destinoSeguro(redirect: string | null, fallback = '/poroteos'): string {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return fallback;
  if (redirect.startsWith('/login') || redirect.startsWith('/registro')) return fallback;
  return redirect;
}
