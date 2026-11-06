import { ErrorState, Spinner } from '@/components/ui/States';
import { useAuth } from './useAuth';

export function SesionPendiente() {
  const { estado, error, reintentar } = useAuth();
  return estado === 'error' ? (
    <ErrorState error={error} titulo="No pudimos verificar tu sesión" onRetry={reintentar} />
  ) : (
    <Spinner label="Verificando tu sesión…" />
  );
}
