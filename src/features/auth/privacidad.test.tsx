import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { queryKeys } from '@/api/queryKeys';
import { request, refrescarSesion } from '@/api/client';
import { getSesion, limpiarSesion, SESION_KEY, setSesion, setUsuarioGuardado } from '@/api/session';
import type { Sesion, Usuario } from '@/types';
import { usePoroteos, useCrearPoroteo } from '@/features/poroteo/queries';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

const a: Usuario = {
  avatarUrl: null,
  id: 'a',
  email: 'a@example.org',
  nombre: 'A',
  rol: 'usuario',
};
const b: Usuario = { ...a, id: 'b', email: 'b@example.org', nombre: 'B' };
const session = (id: string): Sesion => ({
  accessToken: id,
  refreshToken: id,
  revision: id,
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  expiresIn: 3600,
  tokenType: 'bearer',
});
const json = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 });
let qc: QueryClient;
let fetchMock: ReturnType<typeof vi.fn>;
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  localStorage.clear();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  fetchMock = vi.fn(async (url: string) => {
    // El transporte simula cookies del navegador; no se usa Authorization.
    const id = getSesion()?.revision;
    if (url.endsWith('/auth/me')) return json(id === 'b' ? b : a);
    if (url.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ data: [{ id: `poroteo-${id}` }], meta: { total: 1 } }));
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  qc.clear();
  vi.unstubAllGlobals();
});

it('otra pestaña cambia de cuenta: bloquea datos anteriores y limpia lista, detalle y admin', async () => {
  setSesion(session('a'));
  const { result } = renderHook(() => ({ auth: useAuth(), lista: usePoroteos({}) }), { wrapper });
  await waitFor(() => expect(result.current.lista.data?.data[0].id).toBe('poroteo-a'));
  qc.setQueryData(queryKeys.poroteo('propio-a', 'a'), { titulo: 'Privado A' });
  qc.setQueryData(queryKeys.miembros('propio-a', 'a'), {
    miembros: [{ email: 'privado@example.org' }],
  });
  qc.setQueryData(['admin', 'privado'], { titulo: 'Administrativo' });
  let verificarB!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        verificarB = resolve;
      }),
  );
  act(() => {
    setSesion(session('b'));
    window.dispatchEvent(
      new StorageEvent('storage', { key: SESION_KEY, newValue: JSON.stringify(session('b')) }),
    );
  });
  expect(result.current.auth.estado).toBe('cargando');
  expect(result.current.lista.data).toBeUndefined();
  expect(
    qc.getQueriesData({ queryKey: queryKeys.poroteosAll }).every(([, data]) => data === undefined),
  ).toBe(true);
  expect(qc.getQueriesData({ queryKey: queryKeys.adminAll })).toEqual([]);
  await act(async () => verificarB(json(b)));
  await waitFor(() => expect(result.current.lista.data?.data[0].id).toBe('poroteo-b'));
  expect(result.current.auth.usuario?.id).toBe('b');
});

it('logout limpia inmediatamente aunque la respuesta del servidor siga pendiente', async () => {
  setSesion(session('a'));
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.estado).toBe('autenticado'));
  qc.setQueryData(queryKeys.poroteos({}, 'a'), { data: ['privado'] });
  let cerrar!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        cerrar = resolve;
      }),
  );
  let salida!: Promise<void>;
  act(() => {
    salida = result.current.logout();
  });
  expect(result.current.estado).toBe('cargando');
  expect(
    qc.getQueriesData({ queryKey: queryKeys.poroteosAll }).every(([, data]) => data === undefined),
  ).toBe(true);
  await waitFor(() => expect(cerrar).toBeTypeOf('function'));
  await act(async () => {
    cerrar(new Response(null, { status: 204 }));
    await salida;
  });
  expect(result.current.estado).toBe('anonimo');
});

it('una mutación pendiente de A no repuebla caché al entrar B', async () => {
  setSesion(session('a'));
  const { result } = renderHook(() => ({ auth: useAuth(), crear: useCrearPoroteo() }), { wrapper });
  await waitFor(() => expect(result.current.auth.estado).toBe('autenticado'));
  let terminar!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        terminar = resolve;
      }),
  );
  let creacion!: Promise<unknown>;
  act(() => {
    creacion = result.current.crear
      .mutateAsync({ titulo: 'Proyecto A', tipoMayoria: 'simple' })
      .catch((e: unknown) => e);
  });
  await waitFor(() => expect(terminar).toBeTypeOf('function'));
  fetchMock.mockImplementationOnce(async () => json({ usuario: b, sesion: session('b') }));
  await act(() => result.current.auth.login('b@example.org', 'password'));
  await act(async () => {
    terminar(json({ id: 'tardio-a' }));
    await creacion;
  });
  expect(result.current.auth.usuario?.id).toBe('b');
  expect(
    qc.getQueriesData({ queryKey: queryKeys.poroteosAll }).every(([, data]) => data === undefined),
  ).toBe(true);
});

it('refresh pendiente no restaura una sesión cerrada ni reemplaza otra cuenta', async () => {
  for (const siguiente of [null, session('b')]) {
    setSesion(session('a'));
    let terminar!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          terminar = resolve;
        }),
    );
    const refresh = refrescarSesion();
    await waitFor(() => expect(terminar).toBeTypeOf('function'));
    setSesion(siguiente);
    const esperado = getSesion();
    terminar(json({ sesion: session('a-renovada') }));
    await refresh;
    expect(getSesion()).toEqual(esperado);
  }
});

it('un 401 de una petición anterior no se reintenta con la identidad nueva', async () => {
  setSesion(session('a'));
  setUsuarioGuardado(a);
  let terminar!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        terminar = resolve;
      }),
  );
  const pendiente = request('/poroteos', { method: 'POST', body: { titulo: 'De A' } });
  limpiarSesion();
  setSesion(session('b'));
  setUsuarioGuardado(b);
  terminar(new Response('{}', { status: 401 }));
  await expect(pendiente).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
