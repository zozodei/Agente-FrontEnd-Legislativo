import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sesion } from '@/types';
import { ApiError, fieldErrors, request } from './client';
import { getSesion, LOGOUT_EVENT, SESION_KEY, setSesion } from './session';

const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;

const sesion = (n: number): Sesion => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  expiresIn: 3600,
  expiresAt: enUnaHora(),
  tokenType: 'bearer',
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const authHeader = (init?: RequestInit) => new Headers(init?.headers).get('Authorization');

describe('request() con sesión', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('envía cookies y encabezado CSRF sin Bearer', async () => {
    setSesion(sesion(1));
    fetchMock.mockResolvedValue(json(200, { data: [] }));
    await request('/poroteos');
    expect(authHeader(fetchMock.mock.calls[0][1])).toBeNull();
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('X-Session-Mode')).toBe('cookie');
  });

  it('no manda token en login/registro (anonimo)', async () => {
    setSesion(sesion(1));
    fetchMock.mockResolvedValue(
      json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x' } }),
    );
    await expect(
      request('/auth/login', { method: 'POST', body: {}, anonimo: true }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(authHeader(fetchMock.mock.calls[0][1])).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1); // sin intento de refresh
  });

  it('dos requests con 401 en paralelo disparan UN solo refresh y ambas se reintentan', async () => {
    setSesion(sesion(1));
    let refreshes = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshes += 1;
        await new Promise((r) => setTimeout(r, 10));
        return json(200, { data: { usuario: {}, sesion: sesion(2) } });
      }
      return refreshes > 0
        ? json(200, { data: 'ok' })
        : json(401, { error: { code: 'SESSION_EXPIRED', message: 'vencida' } });
    });

    const [a, b] = await Promise.all([request('/poroteos'), request('/poroteos/abc')]);
    expect(a).toEqual({ data: 'ok' });
    expect(b).toEqual({ data: 'ok' });
    expect(refreshes).toBe(1);
    expect(getSesion()?.accessToken).toBeUndefined();
    expect(localStorage.getItem(SESION_KEY)).not.toMatch(/access-2|refresh-2/);
  });

  it('si el refresh falla, limpia la sesión y avisa con auth:logout', async () => {
    setSesion(sesion(1));
    const onLogout = vi.fn();
    window.addEventListener(LOGOUT_EVENT, onLogout);
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/auth/refresh')
        ? json(401, { error: { code: 'SESSION_EXPIRED', message: 'no' } })
        : json(401, { error: { code: 'SESSION_EXPIRED', message: 'vencida' } }),
    );

    await expect(request('/poroteos')).rejects.toBeInstanceOf(ApiError);
    expect(localStorage.getItem(SESION_KEY)).toBeNull();
    expect(onLogout).toHaveBeenCalledTimes(1);
    window.removeEventListener(LOGOUT_EVENT, onLogout);
  });

  it('renueva antes de mandar si el token está por vencer', async () => {
    setSesion({ ...sesion(1), expiresAt: Math.floor(Date.now() / 1000) + 10 });
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/auth/refresh')
        ? json(200, { data: { usuario: {}, sesion: sesion(2) } })
        : json(200, { data: 'ok' }),
    );
    await request('/poroteos');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/refresh$/);
    expect(authHeader(fetchMock.mock.calls[1][1])).toBeNull();
  });

  it('FormData: no fija Content-Type (lo pone el navegador con el boundary)', async () => {
    setSesion(sesion(1));
    fetchMock.mockResolvedValue(json(201, { data: {} }));
    await request('/poroteos', { method: 'POST', body: new FormData() });
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get('Content-Type')).toBeNull();
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('X-Session-Mode')).toBe('cookie');
  });
});

describe('fieldErrors()', () => {
  it('mapea body.campo → campo', () => {
    const err = new ApiError(400, 'BAD_REQUEST', 'Datos inválidos', [
      { campo: 'body.email', mensaje: 'Email inválido' },
      { campo: 'body.password', mensaje: 'Muy corta' },
    ]);
    expect(fieldErrors(err)).toEqual({ email: 'Email inválido', password: 'Muy corta' });
  });

  it('ignora otros errores', () => {
    expect(fieldErrors(new ApiError(409, 'CONFLICT', 'x'))).toEqual({});
  });
});

it('descarta credenciales persistidas del diseño anterior', () => {
  localStorage.setItem(SESION_KEY, JSON.stringify(sesion(1)));
  expect(getSesion()).toBeNull();
  expect(localStorage.getItem(SESION_KEY)).toBeNull();
});

it('no inicia solicitudes privadas tras limpiar la sesión aunque quede una cookie', async () => {
  localStorage.clear();
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  try {
    await expect(
      request('/poroteos', { method: 'POST', body: { titulo: 'Tardío' } }),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

it('la consulta pública omite cookies aun con sesión activa', async () => {
  setSesion(sesion(1));
  const fetchMock = vi.fn().mockResolvedValue(json(200, { data: [] }));
  vi.stubGlobal('fetch', fetchMock);
  try {
    await request('/poroteos-publicos', { anonimo: true });
    expect(fetchMock.mock.calls[0][1].credentials).toBe('omit');
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
  } finally {
    vi.unstubAllGlobals();
  }
});

it('un 429 temporal de refresh conserva la sesión para reintentar', async () => {
  setSesion({ ...sesion(1), expiresAt: 1 });
  const fetchMock = vi
    .fn()
    .mockImplementation(async (url: string) =>
      url.endsWith('/auth/refresh')
        ? json(429, { error: { code: 'RATE_LIMITED' } })
        : json(200, { data: [] }),
    );
  vi.stubGlobal('fetch', fetchMock);
  try {
    await request('/poroteos');
    expect(getSesion()).not.toBeNull();
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/access-1|refresh-1/);
  } finally {
    vi.unstubAllGlobals();
  }
});
