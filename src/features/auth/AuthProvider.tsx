import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { authApi, type RegistroInput } from '@/api/resources';
import {
  getSesion,
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
  // El perfil guardado nunca autoriza navegación: primero consultar /auth/me.
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estado, setEstado] = useState<EstadoAuth>(() => (getSesion() ? 'cargando' : 'anonimo'));
  const [error, setError] = useState<unknown>(null);
  const revision = useRef(0);
  const identidad = useRef<string | null>(null);

  /** Borra los datos privados de la caché (los poroteos son de cada usuario). */
  const olvidarDatosPrivados = useCallback(() => {
    void qc.cancelQueries({ queryKey: queryKeys.poroteosAll });
    void qc.cancelQueries({ queryKey: queryKeys.adminAll });
    qc.getMutationCache().clear();
    qc.removeQueries({ queryKey: queryKeys.poroteosAll });
    qc.removeQueries({ queryKey: queryKeys.adminAll });
  }, [qc]);

  const quedarAnonimo = useCallback(() => {
    revision.current += 1;
    setError(null);
    identidad.current = null;
    limpiarSesion();
    setUsuario(null);
    setEstado('anonimo');
    olvidarDatosPrivados();
  }, [olvidarDatosPrivados]);

  const entrar = useCallback(
    (u: Usuario) => {
      if (identidad.current !== u.id) olvidarDatosPrivados();
      identidad.current = u.id;
      setError(null);
      setUsuarioGuardado(u);
      setUsuario(u);
      setEstado('autenticado');
    },
    [olvidarDatosPrivados],
  );

  const verificar = useCallback(
    (signal?: AbortSignal) => {
      const actual = ++revision.current;
      return authApi.me(signal).then(
        ({ data }) => {
          if (actual === revision.current && getSesion()) entrar(data);
        },
        (err: unknown) => {
          if (actual !== revision.current || (err as Error).name === 'AbortError') return;
          if (err instanceof ApiError && err.status === 401) return quedarAnonimo();
          // Retener el token permite reintentar, pero no autoriza usando localStorage.
          setError(err);
          setEstado('error');
        },
      );
    },
    [entrar, quedarAnonimo],
  );
  const reintentar = useCallback(() => {
    setEstado('cargando');
    setUsuario(null);
    setError(null);
    void verificar();
  }, [verificar]);

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
  }, [quedarAnonimo, olvidarDatosPrivados]);

  // Sincronización entre pestañas.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SESION_KEY) return;
      if (!e.newValue) quedarAnonimo();
      else {
        olvidarDatosPrivados();
        setEstado('cargando');
        setUsuario(null);
        setError(null);
        void verificar();
      }
      // También revalidar identidad/rol si otra pestaña cambia la sesión.
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [quedarAnonimo, verificar, olvidarDatosPrivados]);

  const login = useCallback<AuthValue['login']>(
    async (email, password) => {
      revision.current += 1;
      const { data } = await authApi.login({ email: email.trim(), password });
      olvidarDatosPrivados();
      setSesion(data.sesion);
      entrar(data.usuario);
      return data.usuario;
    },
    [entrar, olvidarDatosPrivados],
  );

  const registrar = useCallback<AuthValue['registrar']>(
    async (input: RegistroInput) => {
      revision.current += 1;
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
    revision.current += 1;
    setEstado('cargando');
    setUsuario(null);
    olvidarDatosPrivados();
    try {
      if (getSesion()) await authApi.logout();
    } catch {
      /* aunque falle en el servidor, la sesión local se cierra igual */
    }
    quedarAnonimo();
  }, [quedarAnonimo, olvidarDatosPrivados]);

  const value = useMemo<AuthValue>(
    () => ({ usuario, estado, error, reintentar, login, registrar, logout }),
    [usuario, estado, error, reintentar, login, registrar, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
