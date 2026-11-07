import { useParams, Link } from 'react-router-dom';
import { PageHeader, SectionHeader } from '@/components/ui/Typography';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { Hemiciclo } from '@/components/hemiciclo';
import { ResultadoPanel } from '@/features/poroteo/components/ResultadoPanel';
import { usePoroteoPublico } from '@/features/poroteo/queries';
import { diputadoToBanca, useDiputados } from '@/features/diputados/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { VOTO_LABEL } from '@/styles/palette';
import styles from '@/features/backoffice/Backoffice.module.css';

export default function PoroteoPublicoPage() {
  const { id = '' } = useParams();
  const query = usePoroteoPublico(id);
  const diputados = useDiputados();
  useDocumentTitle(query.data?.titulo ?? 'Poroteo público');
  // Un error posterior (incluida despublicación) retira inmediatamente el dato anterior.
  if (query.isError || diputados.isError)
    return (
      <ErrorState
        error={query.error ?? diputados.error}
        onRetry={() => {
          void query.refetch();
          void diputados.refetch();
        }}
        mensaje="El poroteo puede haber vuelto a privado o ya no estar disponible."
      />
    );
  if (query.isPending || diputados.isPending) return <Skeleton height={350} />;
  const p = query.data;
  const votos = new Map(p.votos.map((v) => [v.diputadoId, v.voto]));
  return (
    <>
      <Link to="/poroteos-publicos">← Poroteos públicos</Link>
      <PageHeader
        kicker="Público · solo lectura"
        titulo={p.titulo}
        bajada={p.descripcion ?? undefined}
      />
      <div className={styles.detail}>
        <Hemiciclo
          modo="votacion"
          bancas={diputados.data.map((d) => ({
            ...diputadoToBanca(d),
            voto: votos.get(d.id) ?? null,
          }))}
          ariaLabel={`Estimación: ${p.resumen.conteo.AFIRMATIVO} a favor y ${p.resumen.conteo.NEGATIVO} en contra`}
        />
        <ResultadoPanel resumen={p.resumen} />
      </div>
      <section className={styles.section}>
        <SectionHeader titulo="Texto del proyecto" />
        {p.textoProyecto ? (
          <div className={styles.text}>{p.textoProyecto}</div>
        ) : (
          <EmptyState titulo="Sin texto cargado" />
        )}
      </section>
      <section className={styles.section}>
        <SectionHeader titulo="Votos estimados" />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Diputado</th>
                <th>Voto estimado</th>
              </tr>
            </thead>
            <tbody>
              {diputados.data.map((d) => (
                <tr key={d.id}>
                  <td>
                    {d.apellido}, {d.nombre}
                  </td>
                  <td>{votos.has(d.id) ? VOTO_LABEL[votos.get(d.id)!] : 'Sin asignar'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
