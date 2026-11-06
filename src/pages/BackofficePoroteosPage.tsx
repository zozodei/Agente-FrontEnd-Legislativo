import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/Typography';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { SearchInput } from '@/components/ui/Fields';
import { ResultadoBadge } from '@/components/ui/Badges';
import { Pagination } from '@/components/ui/Pagination';
import { useAdminPoroteos } from '@/features/backoffice/queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatRelative } from '@/utils/format';
import styles from '@/features/backoffice/Backoffice.module.css';

export default function BackofficePoroteosPage() {
  useDocumentTitle('Poroteos · Backoffice');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const qd = useDebouncedValue(q);
  const { data, isPending, isError, error, refetch } = useAdminPoroteos({
    q: qd || undefined,
    page,
  });
  return (
    <>
      <PageHeader
        kicker="Archivo"
        titulo="Todos los poroteos."
        bajada="Consultá el estado y los votos estimados. La vista administrativa no permite editar ni borrar."
      />
      <div className={styles.toolbar}>
        <SearchInput
          label="Buscar poroteos"
          placeholder="Buscar por título…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <Skeleton height={200} />
      ) : data.data.length === 0 ? (
        <EmptyState titulo="No hay poroteos para mostrar">
          Probá otra búsqueda o volvé más adelante.
        </EmptyState>
      ) : (
        <>
          <ul className={styles.list}>
            {data.data.map((p) => (
              <li className={styles.row} key={p.id}>
                <h2>
                  <Link to={`/backoffice/poroteos/${p.id}`}>{p.titulo}</Link>
                </h2>
                <div className={styles.meta}>
                  <span>{p.estado}</span>
                  <span>{p.autor || 'Sin autor declarado'}</span>
                  <span>Actualizado {formatRelative(p.updatedAt)}</span>
                </div>
                {p.descripcion && <p>{p.descripcion}</p>}
                <ResultadoBadge resultado={p.resumen.resultado} />
              </li>
            ))}
          </ul>
        </>
      )}
      {data && !isError && <Pagination meta={data.meta} onChange={setPage} />}
    </>
  );
}
