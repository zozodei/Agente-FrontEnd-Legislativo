import { useState } from 'react';
import { PageHeader } from '@/components/ui/Typography';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Pagination } from '@/components/ui/Pagination';
import { useAdminCuentas } from '@/features/backoffice/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import styles from '@/features/backoffice/Backoffice.module.css';

function fecha(value: string | null) {
  return value ? new Date(value).toLocaleString('es-AR') : '—';
}

export default function BackofficeCuentasPage() {
  useDocumentTitle('Cuentas · Backoffice');
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useAdminCuentas(page);
  return (
    <>
      <PageHeader
        kicker="Directorio"
        titulo="Cuentas de la plataforma."
        bajada="El rol refleja la configuración actual y la confirmación del email. Este listado es solo de consulta."
      />
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton height={200} />
      ) : data.data.length === 0 ? (
        <EmptyState titulo="No hay cuentas en esta página" />
      ) : (
        <>
          <div className={styles.tableWrap} role="region" aria-label="Cuentas" tabIndex={0}>
            <table className={styles.table}>
              <caption>Usuarios de Supabase Auth</caption>
              <thead>
                <tr>
                  <th scope="col">Cuenta / ID</th>
                  <th scope="col">Registro</th>
                  <th scope="col">Último acceso</th>
                  <th scope="col">Rol efectivo</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.email ?? 'Sin email'}
                      <span className={styles.id}>{u.id}</span>
                    </td>
                    <td>{fecha(u.createdAt)}</td>
                    <td>{fecha(u.lastSignInAt)}</td>
                    <td>{u.rol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {data && !isError && <Pagination meta={data.meta} onChange={setPage} />}
    </>
  );
}
