import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { SesionPendiente } from './SesionPendiente';
import { useAuth } from './useAuth';

/** Envuelve rutas privadas: sin sesión → /login?redirect=<ruta actual>. */
export function RutaProtegida() {
  const { estado } = useAuth();
  const location = useLocation();

  if (estado === 'cargando' || estado === 'error') return <SesionPendiente />;
  if (estado === 'anonimo') {
    const redirect = location.pathname + location.search;
    // `state.desde`: se reenvía al volver (ej. el título precargado de un poroteo nuevo).
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
        state={{ desde: location.state }}
      />
    );
  }
  return <Outlet />;
}
