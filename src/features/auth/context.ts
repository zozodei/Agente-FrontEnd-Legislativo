import { createContext } from 'react';
import type { RegistroInput } from '@/api/resources';
import type { RegistroResponse, Usuario } from '@/types';

export type EstadoAuth = 'cargando' | 'autenticado' | 'anonimo';

export interface AuthValue {
  usuario: Usuario | null;
  estado: EstadoAuth;
  login: (email: string, password: string) => Promise<Usuario>;
  /** Si el backend pide confirmar el email, no inicia sesión: la respuesta lo indica. */
  registrar: (input: RegistroInput) => Promise<RegistroResponse>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);
