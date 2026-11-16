import { createContext } from 'react';
import type { RegistroInput } from '@/api/resources';
import type { RegistroResponse, Usuario } from '@/types';

export type EstadoAuth = 'cargando' | 'autenticado' | 'anonimo' | 'error';

export interface AuthValue {
  usuario: Usuario | null;
  estado: EstadoAuth;
  error: unknown;
  reintentar: () => void;
  login: (email: string, password: string) => Promise<Usuario>;
  /** Si el backend pide confirmar el email, no inicia sesión: la respuesta lo indica. */
  registrar: (input: RegistroInput) => Promise<RegistroResponse>;
  logout: () => Promise<void>;
  /** Alias de `logout` (nombre del contrato de Google). */
  cerrarSesion: () => Promise<void>;
  /**
   * Pide al backend la URL de Google (`GET /auth/google`) y la devuelve sin
   * navegar: quien llama hace `window.location.href = url`.
   */
  iniciarGoogle: (destino?: string) => Promise<string>;
  /** One Tap (opcional): canjea el idToken de Google por la sesión del backend. */
  loginGoogleConIdToken: (idToken: string, nonce?: string) => Promise<Usuario>;
  /** Canjea el `code` del callback de Google (POST /auth/google/callback) y entra. */
  completarGoogle: (code: string) => Promise<Usuario>;
  /** Renueva el access token ahora (el cliente HTTP también lo hace solo). Devuelve si quedó sesión. */
  refrescar: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthValue | null>(null);
