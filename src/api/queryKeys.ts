import type { VotacionesParams } from './resources';

/** Claves de TanStack Query centralizadas: evita typos y facilita invalidar. */
export const queryKeys = {
  diputados: ['diputados'] as const,
  diputado: (id: number) => ['diputados', id] as const,
  diputadoVotos: (id: number, params: object) => ['diputados', id, 'votos', params] as const,
  bloques: ['bloques'] as const,
  distritos: ['distritos'] as const,
  votaciones: (params: VotacionesParams) => ['votaciones', params] as const,
  votacion: (id: number) => ['votaciones', 'detalle', id] as const,
  resumen: ['stats', 'resumen'] as const,
  poroteos: (params: object) => ['poroteos', params] as const,
  poroteosAll: ['poroteos'] as const,
  poroteo: (id: string) => ['poroteos', 'detalle', id] as const,
};
