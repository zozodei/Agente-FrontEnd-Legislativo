import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { diputadosApi } from '@/api/resources';
import { queryKeys } from '@/api/queryKeys';
import type { Diputado, VotoReal } from '@/types';
import type { Banca } from '@/components/hemiciclo';

/** Los 257 diputados actuales. Se cachean 10 min: cambian muy poco. */
export function useDiputados() {
  return useQuery({
    queryKey: queryKeys.diputados,
    queryFn: ({ signal }) => diputadosApi.listAll(signal).then((r) => r.data),
    staleTime: 10 * 60_000,
  });
}

export function useDiputado(id: number) {
  return useQuery({
    queryKey: queryKeys.diputado(id),
    queryFn: ({ signal }) => diputadosApi.get(id, signal).then((r) => r.data),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export interface VotosDiputadoParams {
  q?: string;
  voto?: VotoReal;
  anio?: number;
  soloGeneral?: boolean;
  page?: number;
  pageSize?: number;
}

export function useVotosDiputado(id: number, params: VotosDiputadoParams) {
  return useQuery({
    queryKey: queryKeys.diputadoVotos(id, params),
    queryFn: ({ signal }) => diputadosApi.votos(id, params, signal),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(id) && id > 0,
  });
}

/** Diputado → banca del hemiciclo. */
export function diputadoToBanca(d: Diputado): Banca {
  return {
    id: d.id,
    nombre: `${d.nombre} ${d.apellido}`,
    orden: `${d.apellido} ${d.nombre}`,
    bloque: d.bloque,
    provincia: d.distrito,
    fotoUrl: d.fotoUrl,
    href: `/diputados/${d.id}`,
  };
}
