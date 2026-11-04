import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { votacionesApi, type VotacionesParams } from '@/api/resources';
import { queryKeys } from '@/api/queryKeys';

export function useVotaciones(params: VotacionesParams) {
  return useQuery({
    queryKey: queryKeys.votaciones(params),
    queryFn: ({ signal }) => votacionesApi.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useVotacion(id: number) {
  return useQuery({
    queryKey: queryKeys.votacion(id),
    queryFn: ({ signal }) => votacionesApi.get(id, signal).then((r) => r.data),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30 * 60_000, // una votación pasada no cambia
  });
}
