import type {
  MiembroPoroteo,
  PoroteoPublico,
  PoroteoPublicoDetalle,
  VersionPoroteo,
  RolPoroteo,
} from '@/types';
import { request } from './client';
import type {
  AuthResponse,
  BloqueResumen,
  Diputado,
  DiputadoPerfil,
  Paginated,
  Poroteo,
  PoroteoDetalle,
  RegistroResponse,
  Resumen,
  TipoMayoria,
  Usuario,
  Votacion,
  VotacionDetalle,
  VotoHistorial,
  VotoPoroteo,
  VotoReal,
} from '@/types';

/* ── Autenticación ─────────────────────────────────────────────────────── */

export interface RegistroInput {
  email: string;
  password: string;
  nombre: string;
}

export const authApi = {
  registrar: (input: RegistroInput) =>
    request<{ data: RegistroResponse }>('/auth/registro', {
      method: 'POST',
      body: input,
      anonimo: true,
    }),
  login: (input: { email: string; password: string }) =>
    request<{ data: AuthResponse }>('/auth/login', { method: 'POST', body: input, anonimo: true }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: (signal?: AbortSignal) => request<{ data: Usuario }>('/auth/me', { signal }),
  /** URL de Google para el redirect (`window.location.href = url`). */
  googleUrl: (redirectTo: string) =>
    request<{ data: { url: string } }>('/auth/google', { query: { redirectTo }, anonimo: true }),
  /** One Tap (opcional): canjea el idToken de Google por la sesión del backend. */
  googleIdToken: (idToken: string, nonce?: string) =>
    request<{ data: AuthResponse }>('/auth/google/id-token', {
      method: 'POST',
      body: { idToken, nonce },
      anonimo: true,
    }),
};

/* ── Diputados ─────────────────────────────────────────────────────────── */

export const diputadosApi = {
  /** Los 257 de una vez: el front filtra en memoria (búsqueda instantánea). */
  listAll: (signal?: AbortSignal) =>
    request<Paginated<Diputado>>('/diputados', { query: { pageSize: 300 }, signal }),

  get: (id: number, signal?: AbortSignal) =>
    request<{ data: DiputadoPerfil }>(`/diputados/${id}`, { signal }),

  votos: (
    id: number,
    params: {
      q?: string;
      voto?: VotoReal;
      anio?: number;
      soloGeneral?: boolean;
      page?: number;
      pageSize?: number;
    },
    signal?: AbortSignal,
  ) => request<Paginated<VotoHistorial>>(`/diputados/${id}/votos`, { query: params, signal }),
};

export const catalogosApi = {
  bloques: (signal?: AbortSignal) => request<{ data: BloqueResumen[] }>('/bloques', { signal }),
  distritos: (signal?: AbortSignal) => request<{ data: BloqueResumen[] }>('/distritos', { signal }),
};

/* ── Votaciones ────────────────────────────────────────────────────────── */

export interface VotacionesParams {
  q?: string;
  desde?: string;
  hasta?: string;
  anio?: number;
  resultado?: 'AFIRMATIVO' | 'NEGATIVO' | 'EMPATE';
  soloGeneral?: boolean;
  page?: number;
  pageSize?: number;
}

export const votacionesApi = {
  list: (params: VotacionesParams, signal?: AbortSignal) =>
    request<Paginated<Votacion>>('/votaciones', { query: { ...params }, signal }),
  get: (id: number, signal?: AbortSignal) =>
    request<{ data: VotacionDetalle }>(`/votaciones/${id}`, { signal }),
};

export const statsApi = {
  resumen: (signal?: AbortSignal) => request<{ data: Resumen }>('/stats/resumen', { signal }),
};

/* ── Poroteos ──────────────────────────────────────────────────────────── */

export interface CrearPoroteoInput {
  titulo: string;
  descripcion?: string;
  textoProyecto?: string;
  tipoMayoria: TipoMayoria;
  archivo?: File | null;
}

export interface VotoInput {
  diputadoId: number;
  voto: VotoPoroteo;
}

export interface ActualizarPoroteoInput {
  version: VersionPoroteo;
  titulo?: string;
  descripcion?: string | null;
  textoProyecto?: string | null;
  tipoMayoria?: TipoMayoria;
  estado?: 'borrador' | 'final';
  visibilidad?: 'privado' | 'publico';
}
export const poroteosPublicosApi = {
  list: (params: { q?: string; page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<PoroteoPublico>>('/poroteos-publicos', {
      query: params,
      signal,
      anonimo: true,
    }),
  get: (id: string, signal?: AbortSignal) =>
    request<{ data: PoroteoPublicoDetalle }>(`/poroteos-publicos/${id}`, { signal, anonimo: true }),
};
export const poroteosApi = {
  list: (params: { q?: string; page?: number; pageSize?: number }, signal?: AbortSignal) =>
    request<Paginated<Poroteo>>('/poroteos', { query: params, signal }),

  get: (id: string, signal?: AbortSignal) =>
    request<{ data: PoroteoDetalle }>(`/poroteos/${id}`, { signal }),

  create: ({ archivo, ...input }: CrearPoroteoInput) => {
    if (archivo) {
      const form = new FormData();
      for (const [key, value] of Object.entries(input)) if (value) form.append(key, String(value));
      form.append('archivo', archivo);
      return request<{ data: PoroteoDetalle }>('/poroteos', { method: 'POST', body: form });
    }
    return request<{ data: PoroteoDetalle }>('/poroteos', { method: 'POST', body: input });
  },

  update: (id: string, changes: ActualizarPoroteoInput) =>
    request<{ data: PoroteoDetalle }>(`/poroteos/${id}`, { method: 'PATCH', body: changes }),
  saveVotos: (
    id: string,
    votos: VotoInput[],
    version: VersionPoroteo,
    modo: 'merge' | 'replace' = 'replace',
  ) =>
    request<{ data: PoroteoDetalle }>(`/poroteos/${id}/votos`, {
      method: 'PUT',
      body: { version, modo, votos },
    }),
  remove: (id: string, version: VersionPoroteo) =>
    request<void>(`/poroteos/${id}`, { method: 'DELETE', body: { version } }),
  miembros: (id: string, signal?: AbortSignal) =>
    request<{ data: { miembros: MiembroPoroteo[]; version: VersionPoroteo } }>(
      `/poroteos/${id}/miembros`,
      { signal },
    ),
  agregarMiembro: (
    id: string,
    input: { email: string; rol: RolPoroteo; version: VersionPoroteo },
  ) =>
    request<{ data: PoroteoDetalle }>(`/poroteos/${id}/miembros`, { method: 'POST', body: input }),
  cambiarRol: (id: string, userId: string, rol: RolPoroteo, version: VersionPoroteo) =>
    request<{ data: PoroteoDetalle }>(`/poroteos/${id}/miembros/${userId}`, {
      method: 'PATCH',
      body: { rol, version },
    }),
  quitarMiembro: (id: string, userId: string, version: VersionPoroteo) =>
    request<{ data: PoroteoDetalle | { id: string; salido: true } }>(
      `/poroteos/${id}/miembros/${userId}`,
      { method: 'DELETE', body: { version } },
    ),
  salir: (id: string, version: VersionPoroteo) =>
    request<{ data: { id: string; salido: true } }>(`/poroteos/${id}/salir`, {
      method: 'POST',
      body: { version },
    }),
};
