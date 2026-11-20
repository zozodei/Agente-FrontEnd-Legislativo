import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { prediccionApi, type AjusteInput } from '@/api/resources';
import { queryKeys } from '@/api/queryKeys';
import { getSesion, getUsuarioGuardado } from '@/api/session';
import { useAuth } from '@/features/auth/useAuth';
import type { SupuestosEscenario, VersionPoroteo } from '@/types';

export function usePrediccion(id: string) {
  const { usuario, estado } = useAuth();
  const userId = usuario?.id ?? '';
  return useQuery({
    queryKey: queryKeys.prediccion(id, userId),
    queryFn: ({ signal }) => prediccionApi.get(id, signal).then((r) => r.data),
    enabled: estado === 'autenticado' && Boolean(userId) && Boolean(id),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useModelo() {
  return useQuery({
    queryKey: queryKeys.modelo,
    queryFn: ({ signal }) => prediccionApi.modelo(signal).then((r) => r.data),
    staleTime: 60 * 60_000,
  });
}

export function useAnalizarProyecto() {
  return useMutation({
    retry: false,
    mutationFn: (input: { titulo: string; resumen?: string | null; texto?: string | null }) =>
      prediccionApi.analizar(input).then((r) => r.data),
  });
}

/** Después de una mutación propia, actualiza poroteo + predicción en la caché de la cuenta activa. */
function useGuardarRespuesta(id: string) {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const userId = usuario?.id ?? '';
  return (data: Awaited<ReturnType<typeof prediccionApi.generar>>['data']) => {
    if (!getSesion() || getUsuarioGuardado()?.id !== userId) return;
    qc.removeQueries({ queryKey: queryKeys.publicosAll });
    qc.setQueryData(queryKeys.poroteo(id, userId), data.poroteo);
    qc.setQueryData(queryKeys.prediccion(id, userId), data.prediccion);
    void qc.invalidateQueries({
      queryKey: queryKeys.poroteosAll,
      exact: false,
      refetchType: 'none',
    });
  };
}

export function useGenerarPrediccion(id: string) {
  const guardar = useGuardarRespuesta(id);
  return useMutation({
    retry: false,
    mutationFn: ({
      version,
      supuestos,
    }: {
      version: VersionPoroteo;
      supuestos: SupuestosEscenario;
    }) => prediccionApi.generar(id, version, supuestos).then((r) => r.data),
    onSuccess: guardar,
  });
}

export function useAjustarVotos(id: string) {
  const guardar = useGuardarRespuesta(id);
  return useMutation({
    retry: false,
    mutationFn: ({ version, ajustes }: { version: VersionPoroteo; ajustes: AjusteInput[] }) =>
      prediccionApi.ajustar(id, version, ajustes).then((r) => r.data),
    onSuccess: guardar,
  });
}
