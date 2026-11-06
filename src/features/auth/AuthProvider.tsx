import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { authApi, type RegistroInput } from '@/api/resources';
import {
  getSesion,
  getUsuarioGuardado,
  limpiarSesion,
  LOGOUT_EVENT,
  SESION_KEY,
  setSesion,
  setUsuarioGuardado,
} from '@/api/session';
import type { Usuario } from '@/types';
import { AuthContext, type AuthValue, type EstadoAuth } from './context';

/**
 * Estado de la sesión para toda la app.
 *  - Al iniciar: si hay sesión guardada, la verifica con GET /auth/me
 *    (el cliente HTTP renueva el token si hace falta). Mientras, estado = 'cargando'.
 *  - Escucha LOGOUT_EVENT (refresh fallido) y el evento `storage` (otras pestañas).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [usuario, setUsuario] = useState<Usuario | null>(() =>
    getSesion() ? getUsuarioGuardado() : null,
  );
  const [estado, setEstado] = useState<EstadoAuth>(() => (getSesion() ? 'cargando' : 'anonimo'));

  /** Borra los datos privados de la caché (los poroteos son de cada usuario). */
  const olvidarDatosPrivados = useCallback(() => {
    qc.removeQueries({ queryKey: queryKeys.poroteosAll });
  }, [qc]);

  const quedarAnonimo = useCallback(() => {
    limpiarSesion();
    setUsuario(null);
    setEstado('anonimo');
    olvidarDatosPrivados();
  }, [olvidarDatosPrivados]);

  const entrar = useCallback((u: Usuario) => {
    setUsuarioGuardado(u);
    setUsuario(u);
    setEstado('autenticado');
  }, []);

  /** Resultado de GET /auth/me: el estado se actualiza solo desde estos callbacks. */
  const alFallarMe = useCallback(
    (err: unknown) => {
      if ((err as Error).name === 'AbortError') return;
      if (err instanceof ApiError && err.status === 401) return quedarAnonimo();
      // Sin red o backend caído: no tiramos la sesión, seguimos con el usuario guardado.
      const guardado = getUsuarioGuardado();
      if (guardado && getSesion()) entrar(guardado);
      else quedarAnonimo();
    },
    [entrar, quedarAnonimo],
  );

  const verificar = useCallback(
    (signal?: AbortSignal) => authApi.me(signal).then(({ data }) => entrar(data), alFallarMe),
    [entrar, alFallarMe],
  );

  // Verificación inicial.
  useEffect(() => {
    if (!getSesion()) return;
    const ctrl = new AbortController();
    void verificar(ctrl.signal);
    return () => ctrl.abort();
  }, [verificar]);

  // El cliente HTTP avisa cuando el refresh falló.
  useEffect(() => {
    window.addEventListener(LOGOUT_EVENT, quedarAnonimo);
    return () => window.removeEventListener(LOGOUT_EVENT, quedarAnonimo);
  }, [quedarAnonimo]);

  // Sincronización entre pestañas.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SESION_KEY) return;
      if (!e.newValue) quedarAnonimo();
      else if (!e.oldValue) void verificar(); // inició sesión en otra pestaña
      // Si solo cambió el token (refresh en otra pestaña) no hay nada que hacer:
      // el cliente siempre lee la sesión vigente del storage.
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [quedarAnonimo, verificar]);

  const login = useCallback<AuthValue['login']>(
    async (email, password) => {
      const { data } = await authApi.login({ email: email.trim(), password });
      olvidarDatosPrivados();
      setSesion(data.sesion);
      entrar(data.usuario);
      return data.usuario;
    },
    [entrar, olvidarDatosPrivados],
  );

  const loginConGoogle = useCallback<AuthValue['loginConGoogle']>(
    async (code, codeVerifier) => {
      const { data } = await authApi.googleCallback({ code, codeVerifier });
      olvidarDatosPrivados();
      setSesion(data.sesion);
      entrar(data.usuario);
      return data.usuario;
    },
    [entrar, olvidarDatosPrivados],
  );

  const registrar = useCallback<AuthValue['registrar']>(
    async (input: RegistroInput) => {
      const { data } = await authApi.registrar(input);
      if (data.sesion && !data.requiereConfirmacion) {
        olvidarDatosPrivados();
        setSesion(data.sesion);
        entrar(data.usuario);
      }
      return data;
    },
    [entrar, olvidarDatosPrivados],
  );

  const logout = useCallback(async () => {
    try {
      if (getSesion()) await authApi.logout();
    } catch {
      /* aunque falle en el servidor, la sesión local se cierra igual */
    }
    quedarAnonimo();
  }, [quedarAnonimo]);

  const value = useMemo<AuthValue>(
    () => ({ usuario, estado, login, loginConGoogle, registrar, logout }),
    [usuario, estado, login, loginConGoogle, registrar, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
