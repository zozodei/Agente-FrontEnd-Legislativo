import { request } from './client';
import type {
  BloqueResumen,
  Diputado,
  DiputadoPerfil,
  Paginated,
  Poroteo,
  PoroteoDetalle,
  Resumen,
  TipoMayoria,
  Votacion,
  VotacionDetalle,
  VotoHistorial,
  VotoPoroteo,
  VotoReal,
} from '@/types';

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

  update: (
    id: string,
    changes: Partial<{
      titulo: string;
      descripcion: string | null;
      tipoMayoria: TipoMayoria;
      estado: 'borrador' | 'final';
    }>,
  ) => request<{ data: PoroteoDetalle }>(`/poroteos/${id}`, { method: 'PATCH', body: changes }),

  saveVotos: (id: string, votos: VotoInput[], modo: 'merge' | 'replace' = 'replace') =>
    request<{ data: PoroteoDetalle }>(`/poroteos/${id}/votos`, {
      method: 'PUT',
      body: { modo, votos },
    }),

  remove: (id: string) => request<void>(`/poroteos/${id}`, { method: 'DELETE' }),
};
