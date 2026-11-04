import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/api/resources';
import { queryKeys } from '@/api/queryKeys';

export function useResumen() {
  return useQuery({
    queryKey: queryKeys.resumen,
    queryFn: ({ signal }) => statsApi.resumen(signal).then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}
