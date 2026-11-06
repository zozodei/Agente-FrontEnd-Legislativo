import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { poroteosApi, type CrearPoroteoInput, type VotoInput } from '@/api/resources';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/features/auth/useAuth';
import { getSesion, getUsuarioGuardado } from '@/api/session';
import type { TipoMayoria } from '@/types';

export function usePoroteos(params: { q?: string; page?: number }) {
  const { usuario, estado } = useAuth();
  const userId = usuario?.id ?? '';
  return useQuery({
    queryKey: queryKeys.poroteos(params, userId),
    queryFn: ({ signal }) => poroteosApi.list({ ...params, pageSize: 20 }, signal),
    enabled: estado === 'autenticado' && Boolean(userId),
  });
}

export function usePoroteo(id: string) {
  const { usuario, estado } = useAuth();
  const userId = usuario?.id ?? '';
  return useQuery({
    queryKey: queryKeys.poroteo(id, userId),
    queryFn: ({ signal }) => poroteosApi.get(id, signal).then((r) => r.data),
    enabled: estado === 'autenticado' && Boolean(userId) && Boolean(id),
    refetchOnWindowFocus: false, // no pisar ediciones locales sin guardar
  });
}

export function useCrearPoroteo() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const userId = usuario?.id ?? '';
  const sigueActivo = () => Boolean(getSesion()) && getUsuarioGuardado()?.id === userId;
  return useMutation({
    mutationFn: (input: CrearPoroteoInput) => poroteosApi.create(input).then((r) => r.data),
    onSuccess: (poroteo) => {
      if (!sigueActivo()) return;
      qc.setQueryData(queryKeys.poroteo(poroteo.id, userId), poroteo);
      qc.invalidateQueries({ queryKey: queryKeys.poroteosAll });
    },
  });
}

export function useGuardarVotos(id: string) {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const userId = usuario?.id ?? '';
  const sigueActivo = () => Boolean(getSesion()) && getUsuarioGuardado()?.id === userId;
  return useMutation({
    mutationFn: (votos: VotoInput[]) =>
      poroteosApi.saveVotos(id, votos, 'replace').then((r) => r.data),
    onSuccess: (poroteo) => {
      if (!sigueActivo()) return;
      qc.setQueryData(queryKeys.poroteo(id, userId), poroteo);
      qc.invalidateQueries({ queryKey: queryKeys.poroteosAll, exact: false, refetchType: 'none' });
    },
  });
}

export function useActualizarPoroteo(id: string) {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const userId = usuario?.id ?? '';
  const sigueActivo = () => Boolean(getSesion()) && getUsuarioGuardado()?.id === userId;
  return useMutation({
    mutationFn: (
      changes: Partial<{ titulo: string; descripcion: string | null; tipoMayoria: TipoMayoria }>,
    ) => poroteosApi.update(id, changes).then((r) => r.data),
    onSuccess: (poroteo) => {
      if (!sigueActivo()) return;
      qc.setQueryData(queryKeys.poroteo(id, userId), poroteo);
      qc.invalidateQueries({ queryKey: queryKeys.poroteosAll, refetchType: 'none' });
    },
  });
}

export function useEliminarPoroteo() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const userId = usuario?.id ?? '';
  const sigueActivo = () => Boolean(getSesion()) && getUsuarioGuardado()?.id === userId;
  return useMutation({
    mutationFn: (id: string) => poroteosApi.remove(id),
    onSuccess: (_data, id) => {
      if (!sigueActivo()) return;
      qc.removeQueries({ queryKey: queryKeys.poroteo(id, userId) });
      qc.invalidateQueries({ queryKey: queryKeys.poroteosAll });
    },
  });
}
