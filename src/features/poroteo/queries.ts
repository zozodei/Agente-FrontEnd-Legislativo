import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { poroteosApi, type CrearPoroteoInput, type VotoInput } from '@/api/resources';
import { queryKeys } from '@/api/queryKeys';
import type { TipoMayoria } from '@/types';

export function usePoroteos(params: { q?: string; page?: number }) {
  return useQuery({
    queryKey: queryKeys.poroteos(params),
    queryFn: ({ signal }) => poroteosApi.list({ ...params, pageSize: 20 }, signal),
    placeholderData: keepPreviousData,
  });
}

export function usePoroteo(id: string) {
  return useQuery({
    queryKey: queryKeys.poroteo(id),
    queryFn: ({ signal }) => poroteosApi.get(id, signal).then((r) => r.data),
    enabled: Boolean(id),
    refetchOnWindowFocus: false, // no pisar ediciones locales sin guardar
  });
}

export function useCrearPoroteo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearPoroteoInput) => poroteosApi.create(input).then((r) => r.data),
    onSuccess: (poroteo) => {
      qc.setQueryData(queryKeys.poroteo(poroteo.id), poroteo);
      qc.invalidateQueries({ queryKey: queryKeys.poroteosAll });
    },
  });
}

export function useGuardarVotos(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (votos: VotoInput[]) =>
      poroteosApi.saveVotos(id, votos, 'replace').then((r) => r.data),
    onSuccess: (poroteo) => {
      qc.setQueryData(queryKeys.poroteo(id), poroteo);
      qc.invalidateQueries({ queryKey: queryKeys.poroteosAll, exact: false, refetchType: 'none' });
    },
  });
}

export function useActualizarPoroteo(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      changes: Partial<{ titulo: string; descripcion: string | null; tipoMayoria: TipoMayoria }>,
    ) => poroteosApi.update(id, changes).then((r) => r.data),
    onSuccess: (poroteo) => {
      qc.setQueryData(queryKeys.poroteo(id), poroteo);
      qc.invalidateQueries({ queryKey: queryKeys.poroteosAll, refetchType: 'none' });
    },
  });
}

export function useEliminarPoroteo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => poroteosApi.remove(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.poroteo(id) });
      qc.invalidateQueries({ queryKey: queryKeys.poroteosAll });
    },
  });
}
