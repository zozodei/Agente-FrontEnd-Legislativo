import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setSesion, setUsuarioGuardado } from '@/api/session';
import { queryKeys } from '@/api/queryKeys';
import { calcularResultado } from './resultado';
import PoroteoPage from '@/pages/PoroteoPage';
import PoroteoPublicoPage from '@/pages/PoroteoPublicoPage';
import PoroteosPublicosPage from '@/pages/PoroteosPublicosPage';
import type { PoroteoDetalle, RolPoroteo } from '@/types';

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ usuario: { id: 'actor' }, estado: 'autenticado' }),
}));
let qc: QueryClient;
let p: PoroteoDetalle;
let fetchMock: ReturnType<typeof vi.fn>;
let conflict: boolean;
let publicado: boolean;
let memberRole: RolPoroteo;
const json = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status });
const permisos = (rol: RolPoroteo) => ({
  editar: true,
  administrarMiembros: rol === 'dueno',
  publicar: rol === 'dueno',
  eliminar: rol === 'dueno',
  salir: true,
});
function montar(path = '/poroteos/proyecto') {
  const router = createMemoryRouter(
    [
      { path: '/poroteos/:id', element: <PoroteoPage /> },
      { path: '/poroteos', element: <p>Listado de mis poroteos</p> },
      { path: '/poroteos-publicos', element: <PoroteosPublicosPage /> },
      { path: '/poroteos-publicos/:id', element: <PoroteoPublicoPage /> },
    ],
    { initialEntries: [path] },
  );
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  setSesion({
    accessToken: 'token',
    refreshToken: 'refresh',
    expiresAt: Date.now() / 1000 + 3600,
    expiresIn: 3600,
    tokenType: 'bearer',
  });
  setUsuarioGuardado({
    id: 'actor',
    email: 'actor@example.org',
    nombre: 'Actor',
    avatarUrl: null,
    rol: 'usuario',
  });
  qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  conflict = false;
  publicado = true;
  memberRole = 'dueno';
  p = {
    id: 'proyecto',
    titulo: 'Proyecto compartido',
    descripcion: 'Descripción original',
    textoProyecto: 'Texto inicial',
    archivoNombre: null,
    camara: 'diputados',
    tipoMayoria: 'simple',
    estado: 'borrador',
    origen: 'manual',
    autor: null,
    metadata: {},
    createdAt: '2026-11-01',
    updatedAt: '2026-11-06',
    version: 7,
    visibilidad: 'privado',
    rolActual: 'dueno',
    permisos: permisos('dueno'),
    votos: [],
    resumen: calcularResultado([], 'simple'),
  };
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/diputados'))
      return json([
        {
          id: 1,
          nombre: 'Ana',
          apellido: 'Pérez',
          nombreCompleto: 'Ana Pérez',
          bloque: 'PRO',
          distrito: 'CÓRDOBA',
          fotoUrl: null,
        },
      ]);
    if (url.includes('/poroteos-publicos/')) {
      if (!publicado)
        return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Retirado' } }), {
          status: 404,
        });
      return json({
        ...p,
        permisos: {
          editar: false,
          administrarMiembros: false,
          publicar: false,
          eliminar: false,
          salir: false,
        },
        rolActual: null,
        visibilidad: 'publico',
      });
    }
    if (url.includes('/poroteos-publicos'))
      return new Response(
        JSON.stringify({ data: [p], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
      );
    if (url.endsWith('/miembros') && init?.method === 'GET')
      return json({
        version: p.version,
        miembros: [
          { userId: 'actor', email: 'actor@example.org', rol: memberRole, createdAt: '2026-11-01' },
        ],
      });
    if (init?.method === 'GET') return json(p);
    if (conflict)
      return new Response(
        JSON.stringify({
          error: { code: 'VERSION_CONFLICT', message: 'Otra persona modificó el poroteo.' },
        }),
        { status: 409 },
      );
    const body = JSON.parse(String(init?.body ?? '{}'));
    if (init?.method === 'DELETE' && url.endsWith('/proyecto'))
      return new Response(null, { status: 204 });
    if (url.endsWith('/salir')) return json({ id: p.id, salido: true });
    p = { ...p, version: Number(p.version) + 1 };
    if (url.includes('/miembros/')) {
      memberRole = body.rol;
      p = { ...p, rolActual: body.rol, permisos: permisos(body.rol) };
    } else if (init?.method === 'PATCH') p = { ...p, ...body, version: p.version };
    return json(p);
  });
  // React Router usa Request de Node y JSDOM aporta otra clase AbortSignal.
  const NativeRequest = globalThis.Request;
  vi.stubGlobal(
    'Request',
    class extends NativeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        super(input, { ...init, signal: undefined });
      }
    },
  );
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  qc.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('colaborador usa permisos efectivos: edita y sale, sin publicación, miembros o borrado', async () => {
  p = { ...p, rolActual: 'colaborador', permisos: permisos('colaborador') };
  montar();
  await screen.findByRole('heading', { name: 'Proyecto compartido' });
  expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Email de cuenta registrada')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Salir del poroteo' })).toBeEnabled();
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/miembros'))).toBe(false);
});
it('409 conserva el texto local y la versión, sin reintento ni recarga automática', async () => {
  montar();
  const titulo = await screen.findByLabelText('Título');
  fireEvent.change(titulo, { target: { value: 'Borrador local importante' } });
  conflict = true;
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contenido' }));
  await screen.findByRole('alert');
  expect(titulo).toHaveValue('Borrador local importante');
  expect(screen.getByRole('button', { name: 'Guardar contenido' })).toBeDisabled();
  const writes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');
  expect(writes).toHaveLength(1);
  expect(JSON.parse(String(writes[0][1]?.body))).toMatchObject({
    version: 7,
    titulo: 'Borrador local importante',
  });
  vi.mocked(window.confirm).mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: 'Recargar desde el servidor' }));
  expect(titulo).toHaveValue('Borrador local importante');
});
it('dueño publica con versión y puede volver a privado con la nueva revisión', async () => {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: 'Publicar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Volver a privado' }));
  await screen.findByRole('button', { name: 'Publicar' });
  const writes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');
  expect(writes.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
    { version: 7, visibilidad: 'publico' },
    { version: 8, visibilidad: 'privado' },
  ]);
});
it('agrega cuenta por email y rol incluyendo versión, sin enviar actor', async () => {
  montar();
  fireEvent.change(await screen.findByLabelText('Email de cuenta registrada'), {
    target: { value: 'otra@example.org' },
  });
  fireEvent.change(screen.getByLabelText('Rol del nuevo participante'), {
    target: { value: 'dueno' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar participante' }));
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => url.endsWith('/miembros') && init?.method === 'POST',
      ),
    ).toBe(true),
  );
  const [, init] = fetchMock.mock.calls.find(
    ([url, init]) => url.endsWith('/miembros') && init?.method === 'POST',
  )!;
  expect(JSON.parse(String(init?.body))).toEqual({
    email: 'otra@example.org',
    rol: 'dueno',
    version: 7,
  });
});
it('al degradarse pierde los controles de dueño usando los permisos de respuesta', async () => {
  montar();
  fireEvent.change(await screen.findByLabelText('Rol de actor@example.org'), {
    target: { value: 'colaborador' },
  });
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument(),
  );
  expect(screen.queryByLabelText('Email de cuenta registrada')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Salir del poroteo' })).toBeEnabled();
});
it('eliminar exige confirmación y envía la versión leída', async () => {
  montar();
  const button = await screen.findByRole('button', { name: 'Borrar' });
  vi.mocked(window.confirm).mockReturnValue(false);
  fireEvent.click(button);
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  vi.mocked(window.confirm).mockReturnValue(true);
  fireEvent.click(button);
  await waitFor(() => expect(screen.getByText('Listado de mis poroteos')).toBeInTheDocument());
  const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')!;
  expect(JSON.parse(String(init?.body))).toEqual({ version: 7 });
});
it('salir usa la versión y vuelve al listado', async () => {
  montar();
  fireEvent.click(await screen.findByRole('button', { name: 'Salir del poroteo' }));
  await waitFor(() => expect(screen.getByText('Listado de mis poroteos')).toBeInTheDocument());
  const [, init] = fetchMock.mock.calls.find(([url]) => url.endsWith('/salir'))!;
  expect(JSON.parse(String(init?.body))).toEqual({ version: 7 });
});
it('vista pública sin token ni controles; despublicar retira datos previamente cargados', async () => {
  montar('/poroteos-publicos/proyecto');
  await screen.findByRole('heading', { name: 'Proyecto compartido' });
  expect(screen.queryByRole('button', { name: 'Guardar contenido' })).not.toBeInTheDocument();
  const [, init] = fetchMock.mock.calls.find(([url]) => url.includes('/poroteos-publicos/'))!;
  expect(new Headers(init?.headers).has('Authorization')).toBe(false);
  expect(init?.cache).toBe('no-store');
  publicado = false;
  await act(async () => {
    await qc.refetchQueries({ queryKey: queryKeys.publico('proyecto') });
  });
  await waitFor(() =>
    expect(screen.queryByRole('heading', { name: 'Proyecto compartido' })).not.toBeInTheDocument(),
  );
  expect(screen.getByText(/puede haber vuelto a privado/)).toBeInTheDocument();
});
it('galería pública accesible sin identidad y con enlaces de solo lectura', async () => {
  localStorage.clear();
  montar('/poroteos-publicos');
  expect(await screen.findByRole('link', { name: /Proyecto compartido/ })).toHaveAttribute(
    'href',
    '/poroteos-publicos/proyecto',
  );
});

it('título, descripción y texto de proyecto se muestran como texto frente a XSS', async () => {
  p.titulo = '<img src=x onerror=alert(1)>';
  p.descripcion = '<script>alert(2)</script>';
  p.textoProyecto = '<svg onload=alert(3)></svg>';
  const { container } = montar('/poroteos-publicos/proyecto');
  expect(await screen.findByRole('heading', { name: p.titulo })).toBeInTheDocument();
  expect(screen.getByText(p.descripcion)).toBeInTheDocument();
  expect(screen.getByText(p.textoProyecto)).toBeInTheDocument();
  expect(container.querySelector('script, img[onerror], svg[onload]')).toBeNull();
});

it('409 de votos conserva el voto local, no reintenta y envía revisión y modo replace', async () => {
  montar();
  fireEvent.click(await screen.findByRole('radio', { name: 'Lista' }));
  const fila = screen.getByRole('radiogroup', { name: 'Voto de Ana Pérez' });
  fireEvent.click(within(fila).getByRole('radio', { name: 'Afirmativo' }));
  conflict = true;
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await screen.findByRole('alert');
  expect(within(fila).getByRole('radio', { name: 'Afirmativo' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  const writes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
  expect(writes).toHaveLength(1);
  expect(JSON.parse(String(writes[0][1]?.body))).toEqual({
    version: 7,
    modo: 'replace',
    votos: [{ diputadoId: 1, voto: 'AFIRMATIVO' }],
  });
});
