import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/resources';
import { queryKeys } from '@/api/queryKeys';
import { limpiarSesion, LOGOUT_EVENT } from '@/api/session';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorState, Spinner } from '@/components/ui/States';
import { useAuth } from './useAuth';

/** La UI vuelve a verificar el perfil; los permisos efectivos los impone /api/admin. */
export function RutaSuperadmin() {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const perfil = useQuery({
    queryKey: queryKeys.adminAcceso(usuario?.id ?? '', pathname),
    queryFn: ({ signal }) => authApi.me(signal).then((r) => r.data),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (perfil.error instanceof ApiError && perfil.error.status === 401) {
      limpiarSesion();
      window.dispatchEvent(new Event(LOGOUT_EVENT));
    }
  }, [perfil.error]);
  if (perfil.isError) {
    if (perfil.error instanceof ApiError && perfil.error.status === 401)
      return <Navigate to="/login" replace />;
    return (
      <ErrorState
        error={perfil.error}
        titulo="No pudimos verificar el acceso"
        onRetry={() => perfil.refetch()}
      />
    );
  }
  if (perfil.isPending || perfil.isFetching)
    return <Spinner label="Verificando acceso al backoffice…" />;
  if (perfil.data.rol !== 'superadmin')
    return (
      <>
        <ErrorState
          error={null}
          titulo="Acceso denegado"
          mensaje="Tu cuenta no tiene acceso al backoffice."
        />
        <ButtonLink to="/poroteos">Volver a la aplicación</ButtonLink>
      </>
    );
  return <Outlet />;
}
