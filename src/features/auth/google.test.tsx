import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSesion } from '@/api/session';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import { AuthProvider } from './AuthProvider';
import { iniciarLoginGoogle, leerRetorno, tomarPendiente } from './google';

const VERIFIER = 'v'.repeat(64);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

const respuestaLogin = {
  data: {
    usuario: { id: 'u1', email: 'ana@gmail.com', nombre: 'Ana Gómez' },
    sesion: {
      accessToken: 'access-g',
      refreshToken: 'refresh-g',
      expiresIn: 3600,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      tokenType: 'bearer',
    },
  },
};

function guardarPendiente(extra: Partial<{ creado: number; destino: string }> = {}) {
  sessionStorage.setItem(
    'poroteo.oauth',
    JSON.stringify({
      codeVerifier: VERIFIER,
      destino: '/poroteos/nuevo',
      creado: Date.now(),
      ...extra,
    }),
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function renderCallback(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/poroteos/nuevo" element={<p>destino</p>} />
      </Routes>
    </MemoryRouter>,
    { wrapper },
  );
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('estado pendiente del login con Google', () => {
  it('iniciarLoginGoogle guarda el verifier y redirige a la URL del backend', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    fetchMock.mockResolvedValue(
      json(200, {
        data: { url: 'https://x.supabase.co/auth/v1/authorize?p=1', codeVerifier: VERIFIER },
      }),
    );
    await iniciarLoginGoogle('/poroteos');
    expect(assign).toHaveBeenCalledWith('https://x.supabase.co/auth/v1/authorize?p=1');
    expect(JSON.parse(sessionStorage.getItem('poroteo.oauth')!).codeVerifier).toBe(VERIFIER);
  });

  it('tomarPendiente se puede leer una sola vez', () => {
    guardarPendiente();
    expect(tomarPendiente()?.codeVerifier).toBe(VERIFIER);
    expect(tomarPendiente()).toBeNull();
  });

  it('descarta un verifier vencido', () => {
    guardarPendiente({ creado: Date.now() - 60 * 60_000 });
    expect(tomarPendiente()).toBeNull();
  });

  it('leerRetorno entiende la query y el hash', () => {
    expect(leerRetorno({ search: '?code=abc', hash: '' }).code).toBe('abc');
    expect(leerRetorno({ search: '', hash: '#error=access_denied' }).error).toBe('access_denied');
  });
});

describe('/auth/callback', () => {
  it('canjea el código UNA vez, guarda la sesión y va al destino', async () => {
    guardarPendiente();
    fetchMock.mockResolvedValue(json(200, respuestaLogin));
    renderCallback('/auth/callback?code=codigo-1');

    expect(await screen.findByText('destino')).toBeInTheDocument();
    const llamadas = fetchMock.mock.calls.filter(([u]) =>
      String(u).endsWith('/auth/google/callback'),
    );
    expect(llamadas).toHaveLength(1);
    expect(JSON.parse(llamadas[0][1].body)).toEqual({ code: 'codigo-1', codeVerifier: VERIFIER });
    expect(getSesion()?.accessToken).toBe('access-g');
  });

  it('si el usuario cancela en Google, lo explica sin llamar al backend', async () => {
    guardarPendiente();
    renderCallback('/auth/callback?error=access_denied&error_description=denied');
    expect(await screen.findByText('Cancelaste el inicio con Google.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sin verifier guardado (otra pestaña o vencido) no intenta el canje', async () => {
    renderCallback('/auth/callback?code=codigo-2');
    expect(await screen.findByText(/venció o se abrió en otra pestaña/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si el backend rechaza el código muestra el error', async () => {
    guardarPendiente();
    fetchMock.mockResolvedValue(json(400, { error: { code: 'OAUTH_FAILED', message: 'x' } }));
    renderCallback('/auth/callback?code=codigo-3');
    expect(
      await screen.findByText('No se pudo completar el inicio con Google. Probá de nuevo.'),
    ).toBeInTheDocument();
    expect(getSesion()).toBeNull();
  });
});
