import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSesion, SESION_KEY, setSesion } from '@/api/session';
import type { Sesion } from '@/types';
import { AuthProvider } from './AuthProvider';
import { RutaProtegida } from './RutaProtegida';
import { useAuth } from './useAuth';
import { destinoSeguro } from './validacion';

const sesion: Sesion = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 3600,
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  tokenType: 'bearer',
};
const usuario = { id: 'u1', email: 'ana@example.org', nombre: 'Ana' };

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('useAuth', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sin sesión guardada arranca anónimo y no llama al backend', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.estado).toBe('anonimo');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('login guarda la sesión y queda autenticado', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { usuario, sesion } }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login('ana@example.org', 'secreta123'));
    expect(result.current.estado).toBe('autenticado');
    expect(result.current.usuario?.nombre).toBe('Ana');
    expect(getSesion()?.accessToken).toBe('access-1');
  });

  it('con sesión guardada verifica con /auth/me (cargando → autenticado)', async () => {
    setSesion(sesion);
    fetchMock.mockResolvedValue(json(200, { data: usuario }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.estado).toBe('cargando');
    await waitFor(() => expect(result.current.estado).toBe('autenticado'));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/auth\/me$/);
  });

  it('si /auth/me da 401 y el refresh falla, cierra la sesión', async () => {
    setSesion(sesion);
    fetchMock.mockResolvedValue(json(401, { error: { code: 'SESSION_EXPIRED', message: 'x' } }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.estado).toBe('anonimo'));
    expect(localStorage.getItem(SESION_KEY)).toBeNull();
  });

  it('logout limpia el storage aunque el backend falle', async () => {
    setSesion(sesion);
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/auth/me')
        ? json(200, { data: usuario })
        : Promise.reject(new TypeError('red')),
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.estado).toBe('autenticado'));
    await act(() => result.current.logout());
    expect(result.current.estado).toBe('anonimo');
    expect(localStorage.getItem(SESION_KEY)).toBeNull();
  });
});

describe('RutaProtegida', () => {
  beforeEach(() => localStorage.clear());

  it('sin sesión redirige a /login con el redirect', async () => {
    render(
      <MemoryRouter initialEntries={['/poroteos?q=ley']}>
        <Routes>
          <Route element={<RutaProtegida />}>
            <Route path="/poroteos" element={<p>privado</p>} />
          </Route>
          <Route path="/login" element={<LoginEspia />} />
        </Routes>
      </MemoryRouter>,
      { wrapper },
    );
    expect(await screen.findByText('login')).toBeInTheDocument();
    expect(screen.queryByText('privado')).not.toBeInTheDocument();
    expect(screen.getByTestId('redirect')).toHaveTextContent('/poroteos?q=ley');
  });
});

function LoginEspia() {
  const { search } = useLocation();
  return (
    <>
      <p>login</p>
      <span data-testid="redirect">{new URLSearchParams(search).get('redirect')}</span>
    </>
  );
}

describe('destinoSeguro', () => {
  it('solo acepta rutas internas', () => {
    expect(destinoSeguro('/poroteos/1')).toBe('/poroteos/1');
    expect(destinoSeguro('//malicioso.com')).toBe('/poroteos');
    expect(destinoSeguro('https://malicioso.com')).toBe('/poroteos');
    expect(destinoSeguro('/login')).toBe('/poroteos');
    expect(destinoSeguro(null)).toBe('/poroteos');
  });
});
