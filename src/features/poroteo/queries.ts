import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  poroteosApi,
  type CrearPoroteoInput,
  type VotoInput,
  type ActualizarPoroteoInput,
  poroteosPublicosApi,
} from '@/api/resources';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/features/auth/useAuth';
import { getSesion, getUsuarioGuardado } from '@/api/session';
import type { VersionPoroteo, RolPoroteo, PoroteoDetalle } from '@/types';

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
    refetchOnReconnect: false,
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
      qc.removeQueries({ queryKey: queryKeys.publicosAll });
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
    retry: false,
    mutationFn: ({ votos, version }: { votos: VotoInput[]; version: VersionPoroteo }) =>
      poroteosApi.saveVotos(id, votos, version, 'replace').then((r) => r.data),
    onSuccess: (poroteo) => {
      if (!sigueActivo()) return;
      qc.removeQueries({ queryKey: queryKeys.publicosAll });
      qc.setQueryData(queryKeys.poroteo(id, userId), poroteo);
      void qc.invalidateQueries({ queryKey: queryKeys.miembros(id, userId) });
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
    retry: false,
    mutationFn: (changes: ActualizarPoroteoInput) =>
      poroteosApi.update(id, changes).then((r) => r.data),
    onSuccess: (poroteo) => {
      if (!sigueActivo()) return;
      qc.removeQueries({ queryKey: queryKeys.publicosAll });
      qc.setQueryData(queryKeys.poroteo(id, userId), poroteo);
      void qc.invalidateQueries({ queryKey: queryKeys.miembros(id, userId) });
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
    retry: false,
    mutationFn: ({ id, version }: { id: string; version: VersionPoroteo }) =>
      poroteosApi.remove(id, version),
    onSuccess: (_data, { id }) => {
      if (!sigueActivo()) return;
      qc.removeQueries({ queryKey: queryKeys.publicosAll });
      qc.removeQueries({ queryKey: queryKeys.poroteo(id, userId) });
      qc.invalidateQueries({ queryKey: queryKeys.poroteosAll });
    },
  });
}

export function useMiembros(id: string, enabled: boolean) {
  const { usuario, estado } = useAuth();
  return useQuery({
    queryKey: queryKeys.miembros(id, usuario?.id ?? ''),
    queryFn: ({ signal }) => poroteosApi.miembros(id, signal).then((r) => r.data),
    enabled: enabled && estado === 'autenticado',
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
export type AccionMiembro =
  | { accion: 'agregar'; email: string; rol: RolPoroteo; version: VersionPoroteo }
  | { accion: 'rol'; userId: string; rol: RolPoroteo; version: VersionPoroteo }
  | { accion: 'quitar'; userId: string; version: VersionPoroteo }
  | { accion: 'salir'; version: VersionPoroteo };
export function useMutarMiembro(id: string) {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const userId = usuario?.id ?? '';
  return useMutation({
    retry: false,
    mutationFn: async (a: AccionMiembro) => {
      switch (a.accion) {
        case 'agregar':
          return (
            await poroteosApi.agregarMiembro(id, { email: a.email, rol: a.rol, version: a.version })
          ).data;
        case 'rol':
          return (await poroteosApi.cambiarRol(id, a.userId, a.rol, a.version)).data;
        case 'quitar':
          return (await poroteosApi.quitarMiembro(id, a.userId, a.version)).data;
        case 'salir':
          return (await poroteosApi.salir(id, a.version)).data;
      }
    },
    onSuccess: (data) => {
      if (!getSesion() || getUsuarioGuardado()?.id !== userId) return;
      qc.removeQueries({ queryKey: queryKeys.publicosAll });
      if ('salido' in data) {
        qc.removeQueries({ queryKey: queryKeys.poroteo(id, userId) });
        qc.removeQueries({ queryKey: queryKeys.miembros(id, userId) });
      } else {
        qc.setQueryData<PoroteoDetalle>(queryKeys.poroteo(id, userId), data);
        if (data.permisos.administrarMiembros)
          void qc.invalidateQueries({ queryKey: queryKeys.miembros(id, userId) });
        else qc.removeQueries({ queryKey: queryKeys.miembros(id, userId) });
      }
      void qc.invalidateQueries({ queryKey: queryKeys.poroteosAll, refetchType: 'none' });
    },
  });
}
export function usePoroteosPublicos(params: { q?: string; page: number }) {
  return useQuery({
    queryKey: queryKeys.publicos(params),
    queryFn: ({ signal }) => poroteosPublicosApi.list({ ...params, pageSize: 20 }, signal),
    staleTime: 0,
    gcTime: 0,
  });
}
export function usePoroteoPublico(id: string) {
  return useQuery({
    queryKey: queryKeys.publico(id),
    queryFn: ({ signal }) => poroteosPublicosApi.get(id, signal).then((r) => r.data),
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 15000,
  });
}
