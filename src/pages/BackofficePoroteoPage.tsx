import { useParams } from 'react-router-dom';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader, SectionHeader } from '@/components/ui/Typography';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { ResultadoPanel } from '@/features/poroteo/components/ResultadoPanel';
import { useAdminPoroteo } from '@/features/backoffice/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import styles from '@/features/backoffice/Backoffice.module.css';

export default function BackofficePoroteoPage() {
  useDocumentTitle('Detalle · Backoffice');
  const { id = '' } = useParams();
  const { data, isPending, isError, error, refetch } = useAdminPoroteo(id);
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (isPending) return <Skeleton height={300} />;
  return (
    <>
      <ButtonLink to="/backoffice/poroteos">← Volver al listado</ButtonLink>
      <PageHeader
        kicker={`Poroteo · ${data.estado}`}
        titulo={data.titulo}
        bajada={data.descripcion || 'Sin descripción.'}
      />
      <p className={styles.intro}>
        Autor declarado: {data.autor || 'Sin autor'}. Origen: {data.origen}. Vista de consulta.
      </p>
      <div className={styles.detail}>
        <ResultadoPanel resumen={data.resumen} />
        <section>
          <SectionHeader titulo="Texto del proyecto" />
          {data.textoProyecto ? (
            <div className={styles.text}>{data.textoProyecto}</div>
          ) : (
            <EmptyState titulo="Sin texto cargado" />
          )}
          {data.archivoNombre && <p>Archivo de origen: {data.archivoNombre}</p>}
        </section>
      </div>
      <section className={styles.section}>
        <SectionHeader titulo="Votos asignados" />
        {data.votos.length === 0 ? (
          <EmptyState titulo="Todavía no hay votos asignados" />
        ) : (
          <div className={styles.tableWrap} role="region" aria-label="Votos asignados" tabIndex={0}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">ID diputado</th>
                  <th scope="col">Voto</th>
                  <th scope="col">Origen</th>
                  <th scope="col">Justificación</th>
                </tr>
              </thead>
              <tbody>
                {data.votos.map((v) => (
                  <tr key={v.diputadoId}>
                    <td>{v.diputadoId}</td>
                    <td>{v.voto}</td>
                    <td>{v.origen}</td>
                    <td>{v.justificacion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
