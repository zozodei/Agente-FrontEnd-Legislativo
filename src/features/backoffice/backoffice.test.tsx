import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSesion, setUsuarioGuardado, getSesion } from '@/api/session';
import type { Sesion, Usuario } from '@/types';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RutaProtegida } from '@/features/auth/RutaProtegida';
import { RutaSuperadmin } from '@/features/auth/RutaSuperadmin';
import { BackofficeLayout } from './BackofficeLayout';
import BackofficeCuentasPage from '@/pages/BackofficeCuentasPage';
import BackofficePage from '@/pages/BackofficePage';
import BackofficePoroteosPage from '@/pages/BackofficePoroteosPage';
import BackofficePoroteoPage from '@/pages/BackofficePoroteoPage';
import LoginPage from '@/pages/LoginPage';
import RegistroPage from '@/pages/RegistroPage';
import { destinoAlEntrar } from '@/features/auth/validacion';
import { calcularResultado } from '@/features/poroteo/resultado';

const sesion: Sesion = {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresIn: 3600,
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  tokenType: 'bearer',
};
const admin: Usuario = {
  id: 'admin-id',
  email: 'zoe@acquistapace.com.ar',
  nombre: 'Zoe',
  rol: 'superadmin',
};
const normal: Usuario = { ...admin, email: 'normal@example.org', rol: 'usuario' };
const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status });
let perfil: Usuario;
let fetchMock: ReturnType<typeof vi.fn>;
let qc: QueryClient;

function montar(path: string) {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60000 } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/poroteos" element={<p>Aplicación habitual</p>} />
            <Route element={<RutaProtegida />}>
              <Route element={<RutaSuperadmin />}>
                <Route path="/backoffice" element={<BackofficeLayout />}>
                  <Route index element={<BackofficePage />} />
                  <Route path="cuentas" element={<BackofficeCuentasPage />} />
                  <Route path="poroteos" element={<BackofficePoroteosPage />} />
                  <Route path="poroteos/:id" element={<BackofficePoroteoPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  perfil = admin;
  fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith('/auth/me')) return json(200, { data: perfil });
    if (url.endsWith('/auth/login')) return json(200, { data: { usuario: perfil, sesion } });
    if (url.endsWith('/auth/registro'))
      return json(201, { data: { usuario: perfil, sesion, requiereConfirmacion: false } });
    if (url.endsWith('/auth/logout')) return new Response(null, { status: 204 });
    if (url.includes('/admin/cuentas'))
      return json(200, {
        data: [{ ...perfil, createdAt: '2026-11-01', lastSignInAt: null }],
        meta: { page: 1, pageSize: 20, total: 21, totalPages: 2 },
      });
    if (url.includes('/admin/poroteos'))
      return json(200, { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
    if (url.endsWith('/admin/resumen'))
      return json(200, {
        data: {
          poroteos: { total: 7, borradores: 4, finalizados: 3 },
          diputados: 257,
          bloques: 21,
          votaciones: 2992,
        },
      });
    throw new Error('Consulta inesperada');
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  qc?.clear();
  vi.unstubAllGlobals();
});

describe('Roles y navegación', () => {
  it.each(['/backoffice', '/backoffice/cuentas', '/backoffice/poroteos/uno'])(
    'sin sesión protege acceso directo %s',
    async (path) => {
      montar(path);
      expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('usuario normal no entra aunque localStorage afirme superadmin', async () => {
    setSesion(sesion);
    setUsuarioGuardado(admin);
    perfil = normal;
    montar('/backoffice/cuentas');
    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/admin/'))).toBe(false);
  });
  it('restauración espera el perfil antes de renderizar rutas protegidas', async () => {
    setSesion(sesion);
    setUsuarioGuardado(admin);
    let resolver!: (res: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolver = resolve;
        }),
    );
    montar('/backoffice');
    expect(screen.getByText('Verificando tu sesión…')).toBeInTheDocument();
    expect(screen.queryByText('Backoffice')).not.toBeInTheDocument();
    perfil = normal;
    await act(async () => resolver(json(200, { data: normal })));
    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument();
  });
  it('perfil caído no permite entrar con rol guardado y permite reintentar', async () => {
    setSesion(sesion);
    setUsuarioGuardado(admin);
    fetchMock.mockRejectedValueOnce(new TypeError('sin red'));
    montar('/backoffice');
    expect(await screen.findByText('No pudimos verificar tu sesión')).toBeInTheDocument();
    expect(screen.queryByText('Backoffice')).not.toBeInTheDocument();
    expect(getSesion()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('La plataforma, en números.')).toBeInTheDocument();
  });
  it.each(['usuario', 'superadmin'] as const)(
    'login inicial redirige según rol %s',
    async (rol) => {
      perfil = { ...admin, rol };
      montar('/login?redirect=/poroteos');
      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'zoe@acquistapace.com.ar' },
      });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
      expect(
        await screen.findByText(
          rol === 'superadmin' ? 'La plataforma, en números.' : 'Aplicación habitual',
        ),
      ).toBeInTheDocument();
    },
  );
  it('al restaurar en login usa el perfil actual y no el rol viejo', async () => {
    setSesion(sesion);
    setUsuarioGuardado(normal);
    montar('/login');
    expect(await screen.findByText('La plataforma, en números.')).toBeInTheDocument();
  });
  it('superadmin puede volver a la aplicación habitual sin ser redirigido de nuevo', async () => {
    setSesion(sesion);
    montar('/backoffice');
    fireEvent.click(await screen.findByRole('link', { name: 'Volver a la aplicación' }));
    expect(await screen.findByText('Aplicación habitual')).toBeInTheDocument();
  });
  it('logout limpia tokens y caché administrativa, y bloquea navegación posterior', async () => {
    setSesion(sesion);
    montar('/backoffice');
    await screen.findByText('La plataforma, en números.');
    qc.setQueryData(['admin', 'privado'], { secreto: 'dato' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(getSesion()).toBeNull();
    expect(qc.getQueryData(['admin', 'privado'])).toBeUndefined();
  });
  it('revalida el rol al entrar a otra ruta hija; un cambio retira la vista', async () => {
    setSesion(sesion);
    montar('/backoffice');
    await screen.findByText('La plataforma, en números.');
    perfil = normal;
    fireEvent.click(screen.getByRole('link', { name: 'Cuentas' }));
    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios de Supabase Auth')).not.toBeInTheDocument();
  });
  it('confirmación con sesión usa el mismo destino según rol', () => {
    expect(destinoAlEntrar(admin, '/poroteos')).toBe('/backoffice');
    expect(destinoAlEntrar(normal, '/poroteos/uno')).toBe('/poroteos/uno');
  });
  it('registro con sesión y rol efectivo redirige al backoffice', async () => {
    montar('/registro');
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Zoe' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'zoe@acquistapace.com.ar' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña', { exact: true }), {
      target: { value: 'clave123' },
    });
    fireEvent.change(screen.getByLabelText('Repetí la contraseña'), {
      target: { value: 'clave123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Crear cuenta/ }));
    expect(await screen.findByText('La plataforma, en números.')).toBeInTheDocument();
  });
});

describe('Consultas del backoffice', () => {
  it('listado enlaza al detalle de consulta sin exponer acciones de edición', async () => {
    setSesion(sesion);
    const original = fetchMock.getMockImplementation()!;
    const poroteo = {
      id: 'uno',
      titulo: 'Ley de prueba',
      descripcion: 'Proyecto en revisión',
      autor: 'Equipo',
      estado: 'borrador',
      origen: 'manual',
      updatedAt: '2026-11-06T12:00:00Z',
      textoProyecto: 'Texto del proyecto para consultar',
      archivoNombre: null,
      resumen: calcularResultado(['AFIRMATIVO'], 'simple'),
      votos: [{ diputadoId: 1, voto: 'AFIRMATIVO', origen: 'manual', justificacion: null }],
    };
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/admin/poroteos/uno'))
        return Promise.resolve(json(200, { data: poroteo }));
      if (url.includes('/api/admin/poroteos'))
        return Promise.resolve(
          json(200, {
            data: [poroteo],
            meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          }),
        );
      return original(url);
    });
    montar('/backoffice/poroteos');
    fireEvent.click(await screen.findByRole('link', { name: 'Ley de prueba' }));
    expect(await screen.findByText('Texto del proyecto para consultar')).toBeInTheDocument();
    expect(await screen.findByText('AFIRMATIVO')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Guardar|Borrar|Eliminar/ }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === 'GET'),
    ).toBe(true);
  });
  it('cuentas muestra solo los campos básicos y solicita páginas en servidor', async () => {
    setSesion(sesion);
    montar('/backoffice/cuentas');
    const table = await screen.findByRole('table');
    expect(within(table).getByText(admin.email)).toBeInTheDocument();
    expect(within(table).getByText('superadmin')).toBeInTheDocument();
    expect(screen.queryByText('refresh')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('page=2'))).toBe(true),
    );
    const calls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/api/admin/cuentas'),
    );
    expect(calls[0][0]).toContain('pageSize=20');
  });
  it.each(['cuentas', 'poroteos'])('lista vacía de %s tiene estado vacío', async (section) => {
    setSesion(sesion);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string) =>
      url.includes(`/api/admin/${section}`)
        ? Promise.resolve(
            json(200, { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } }),
          )
        : original(url),
    );
    montar(`/backoffice/${section}`);
    expect(
      await screen.findByText(
        section === 'cuentas' ? 'No hay cuentas en esta página' : 'No hay poroteos para mostrar',
      ),
    ).toBeInTheDocument();
  });
  it.each(['resumen', 'cuentas', 'poroteos'])(
    'errores de %s muestran reintento sin datos de ejemplo',
    async (section) => {
      setSesion(sesion);
      const original = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation((url: string) =>
        url.includes(`/api/admin/${section}`)
          ? Promise.resolve(json(403, { error: { code: 'FORBIDDEN', message: 'Acceso retirado' } }))
          : original(url),
      );
      montar(section === 'resumen' ? '/backoffice' : `/backoffice/${section}`);
      expect(await screen.findByText('Acceso retirado')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    },
  );
  it('poroteo inexistente presenta el error sin un editor', async () => {
    setSesion(sesion);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string) =>
      url.includes('/api/admin/poroteos/uno')
        ? Promise.resolve(json(404, { error: { code: 'NOT_FOUND', message: 'No existe' } }))
        : original(url),
    );
    montar('/backoffice/poroteos/uno');
    expect(await screen.findByText('No encontramos lo que buscabas.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Guardar/ })).not.toBeInTheDocument();
  });
});
