import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';

// Sin datos de relleno ni placeholderData: nunca mostrar filas de otra página/usuario.
export function useAdminResumen() {
  return useQuery({
    queryKey: queryKeys.adminResumen,
    queryFn: ({ signal }) => adminApi.resumen(signal).then((r) => r.data),
    retry: false,
  });
}
export function useAdminCuentas(page: number) {
  return useQuery({
    queryKey: queryKeys.adminCuentas(page),
    queryFn: ({ signal }) => adminApi.cuentas(page, signal),
    retry: false,
  });
}
export function useAdminPoroteos(params: { q?: string; page: number }) {
  return useQuery({
    queryKey: queryKeys.adminPoroteos(params),
    queryFn: ({ signal }) => adminApi.poroteos(params, signal),
    retry: false,
  });
}
export function useAdminPoroteo(id: string) {
  return useQuery({
    queryKey: queryKeys.adminPoroteo(id),
    queryFn: ({ signal }) => adminApi.poroteo(id, signal).then((r) => r.data),
    enabled: Boolean(id),
    retry: false,
  });
}
