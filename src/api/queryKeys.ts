import type { VotacionesParams } from './resources';

/** Claves de TanStack Query centralizadas: evita typos y facilita invalidar. */
export const queryKeys = {
  adminAll: ['admin'] as const,
  adminAcceso: (id: string, path: string) => ['admin', id, 'acceso', path] as const,
  adminResumen: ['admin', 'resumen'] as const,
  adminCuentas: (page: number) => ['admin', 'cuentas', page] as const,
  adminPoroteos: (params: object) => ['admin', 'poroteos', params] as const,
  adminPoroteo: (id: string) => ['admin', 'poroteo', id] as const,
  diputados: ['diputados'] as const,
  diputado: (id: number) => ['diputados', id] as const,
  diputadoVotos: (id: number, params: object) => ['diputados', id, 'votos', params] as const,
  bloques: ['bloques'] as const,
  distritos: ['distritos'] as const,
  votaciones: (params: VotacionesParams) => ['votaciones', params] as const,
  votacion: (id: number) => ['votaciones', 'detalle', id] as const,
  resumen: ['stats', 'resumen'] as const,
  poroteos: (params: object, userId: string) => ['poroteos', userId, 'lista', params] as const,
  miembros: (id: string, userId: string) => ['poroteos', userId, 'miembros', id] as const,
  publicosAll: ['poroteos-publicos'] as const,
  publicos: (params: object) => ['poroteos-publicos', 'lista', params] as const,
  publico: (id: string) => ['poroteos-publicos', 'detalle', id] as const,
  poroteosAll: ['poroteos'] as const,
  poroteo: (id: string, userId: string) => ['poroteos', userId, 'detalle', id] as const,
};
