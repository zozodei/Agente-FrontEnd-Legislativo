import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/Typography';
import { SearchInput } from '@/components/ui/Fields';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { ResultadoBadge } from '@/components/ui/Badges';
import { usePoroteosPublicos } from '@/features/poroteo/queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import styles from './PoroteosPage.module.css';

export default function PoroteosPublicosPage() {
  useDocumentTitle('Poroteos públicos');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(q, 300);
  const query = usePoroteosPublicos({ q: search, page });
  return (
    <>
      <PageHeader
        kicker="Consulta abierta"
        titulo="Poroteos públicos"
        bajada="Estimaciones compartidas por sus equipos. Podés consultarlas sin iniciar sesión."
      />
      <SearchInput
        label="Buscar poroteos públicos"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isPending ? (
        <Skeleton height={250} />
      ) : (
        <>
          {query.data.data.length === 0 ? (
            <EmptyState titulo="No hay poroteos públicos para esta búsqueda" />
          ) : (
            <ul className={styles.grid}>
              {query.data.data.map((p) => (
                <li key={p.id} className={styles.card}>
                  <Link to={`/poroteos-publicos/${p.id}`} className={styles.cardLink}>
                    <span className={styles.cardTitle}>{p.titulo}</span>
                    <span className={styles.cardDesc}>{p.descripcion}</span>
                    <ResultadoBadge resultado={p.resumen.resultado} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination meta={query.data.meta} onChange={setPage} />
        </>
      )}
    </>
  );
}
