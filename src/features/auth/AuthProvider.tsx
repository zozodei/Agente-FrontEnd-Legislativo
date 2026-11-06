import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, refrescarSesion } from '@/api/client';
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
import { guardarDestinoGoogle, urlCallbackGoogle } from './google';

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

  /* ── Google ──────────────────────────────────────────────────────────── */

  const iniciarGoogle = useCallback(async (destino?: string) => {
    if (destino) guardarDestinoGoogle(destino);
    const { data } = await authApi.googleUrl(urlCallbackGoogle());
    if (!data.url) {
      throw new ApiError(502, 'BAD_GATEWAY', 'El servidor no devolvió la URL de Google.');
    }
    return data.url;
  }, []);

  const loginGoogleConIdToken = useCallback<AuthValue['loginGoogleConIdToken']>(
    async (idToken, nonce) => {
      const { data } = await authApi.googleIdToken(idToken, nonce);
      olvidarDatosPrivados();
      setSesion(data.sesion);
      entrar(data.usuario);
      return data.usuario;
    },
    [entrar, olvidarDatosPrivados],
  );

  const entrarConTokens = useCallback<AuthValue['entrarConTokens']>(
    async (sesion) => {
      olvidarDatosPrivados();
      setSesion(sesion);
      try {
        const { data } = await authApi.me();
        entrar(data);
        return data;
      } catch (err) {
        // La sesión no valida (token revocado o backend caído con 401): no queda nada guardado.
        limpiarSesion();
        setUsuario(null);
        setEstado('anonimo');
        throw err;
      }
    },
    [entrar, olvidarDatosPrivados],
  );

  const refrescar = useCallback(async () => {
    try {
      return (await refrescarSesion()) !== null;
    } catch {
      // Sin red: la sesión guardada sigue valiendo hasta que el cliente la renueve.
      return getSesion() !== null;
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      usuario,
      estado,
      login,
      registrar,
      logout,
      cerrarSesion: logout,
      iniciarGoogle,
      loginGoogleConIdToken,
      entrarConTokens,
      refrescar,
    }),
    [
      usuario,
      estado,
      login,
      registrar,
      logout,
      iniciarGoogle,
      loginGoogleConIdToken,
      entrarConTokens,
      refrescar,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
