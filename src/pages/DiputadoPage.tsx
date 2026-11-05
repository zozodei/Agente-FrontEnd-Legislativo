import { Link, useParams } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { BloqueChip } from '@/components/ui/Badges';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { SectionHeader } from '@/components/ui/Typography';
import { useResumen } from '@/features/dashboard/queries';
import { HistorialVotos } from '@/features/diputados/components/HistorialVotos';
import {
  ActividadChart,
  AfinidadChart,
  Comparado,
  ComoVotaChart,
  MandatoBar,
} from '@/features/diputados/components/PerfilCharts';
import { useDiputado } from '@/features/diputados/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { bloqueStyle } from '@/styles/palette';
import type { DiputadoPerfil } from '@/types';
import { formatNumber, formatPct } from '@/utils/format';
import { titleCase } from '@/utils/text';
import styles from './DiputadoPage.module.css';

export default function DiputadoPage() {
  const id = Number(useParams().id);
  const { data, isPending, isError, error, refetch } = useDiputado(id);
  useDocumentTitle(data ? `${data.nombre} ${data.apellido}` : 'Diputado');

  if (isError) {
    return (
      <div className={styles.state}>
        <ErrorState error={error} onRetry={() => refetch()} titulo="No pudimos cargar el perfil" />
        <Link to="/diputados">← Volver al listado</Link>
      </div>
    );
  }
  if (isPending) return <PerfilSkeleton />;
  return <Perfil d={data} />;
}

function Perfil({ d }: { d: DiputadoPerfil }) {
  const resumen = useResumen();
  const e = d.estadisticas;
  const color = bloqueStyle(d.bloque).color;
  const anios = Object.keys(e.porAnio).sort();
  const desde = d.mandatos[0]?.desde;

  return (
    <article className={styles.page}>
      <nav className={styles.crumbs} aria-label="Ruta">
        <Link to="/diputados">Diputados</Link> <span aria-hidden>/</span>{' '}
        <span aria-current="page">
          {d.nombre} {d.apellido}
        </span>
      </nav>

      <header className={styles.header} style={{ '--bloque': color } as React.CSSProperties}>
        <div className={styles.photo}>
          <Avatar src={d.fotoUrl} nombre={`${d.nombre} ${d.apellido}`} shape="portrait" />
        </div>

        <div className={styles.headerText}>
          <h1 className={styles.name}>
            <span className={styles.nombre}>{d.nombre}</span> {d.apellido}
          </h1>
          <div className={styles.meta}>
            <BloqueChip bloque={d.bloque} />
            <span className={styles.metaItem}>Diputado/a por {titleCase(d.distrito)}</span>
            {desde && (
              <span className={styles.metaItem}>
                En la Cámara desde {desde}
                {d.mandatos.length > 1 ? `, ${d.mandatos.length} períodos` : ''}
              </span>
            )}
          </div>
          <MandatoBar inicio={d.iniciaMandato} fin={d.finalizaMandato} />
        </div>

        <dl className={styles.kpis}>
          <div className={styles.kpi}>
            <dt>Presentismo</dt>
            <dd className="num">{formatPct(d.presentismo)}</dd>
            <Comparado
              valor={d.presentismo}
              promedio={resumen.data?.camara.presentismoPromedio}
              label="Presentismo comparado con el promedio de la Cámara"
            />
          </div>
          <div className={styles.kpi}>
            <dt>Votaciones registradas</dt>
            <dd className="num">{formatNumber(e.total)}</dd>
            <span className={styles.kpiNote}>
              {anios.length > 0
                ? anios.length === 1
                  ? `todas en ${anios[0]}`
                  : `entre ${anios[0]} y ${anios.at(-1)}`
                : 'sin votaciones todavía'}
            </span>
          </div>
          <div className={styles.kpi}>
            <dt>Votó con su bloque</dt>
            <dd className="num">{formatPct(e.alineacionBloque?.porcentaje)}</dd>
            <span className={styles.kpiNote}>
              {e.alineacionBloque
                ? `${formatNumber(e.alineacionBloque.coincidencias)} de ${formatNumber(e.alineacionBloque.votaciones)} votaciones`
                : 'Sin datos suficientes'}
            </span>
          </div>
        </dl>
      </header>

      <section className={styles.section}>
        <SectionHeader titulo="Cómo vota" />
        <ComoVotaChart e={e} />
      </section>

      <div className={styles.two}>
        <div className={styles.column}>
          <section className={styles.section}>
            <SectionHeader titulo="Afinidad con los grandes espacios" as="h2" />
            <AfinidadChart actual={d.alineamiento} anual={d.alineamientoAnual} />
          </section>

          {d.mandatos.length > 0 && (
            <section className={styles.section}>
              <SectionHeader titulo="Trayectoria en la Cámara" as="h2" />
              <ol className={styles.timeline}>
                {[...d.mandatos].reverse().map((m, i) => (
                  <li key={`${m.desde}-${i}`}>
                    <span className={`${styles.timelineYears} num`}>
                      {m.desde}
                      {m.hasta && m.hasta !== m.desde ? `–${m.hasta}` : ''}
                    </span>
                    <span className={styles.timelineBody}>
                      <BloqueChip bloque={m.bloque} />
                      {m.alianza && (
                        <span className={styles.factNote}>Electo/a por {m.alianza}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <section className={styles.section}>
          <SectionHeader titulo="Actividad por año" as="h2" />
          <ActividadChart porAnio={e.porAnio} />
        </section>
      </div>

      <section className={styles.section}>
        <SectionHeader
          titulo="Cómo votó, ley por ley"
          children="Las votaciones “en general” son las que mejor reflejan la postura sobre una ley; las “en particular” son por artículo."
        />
        <HistorialVotos diputadoId={d.id} anios={anios} />
      </section>
    </article>
  );
}

function PerfilSkeleton() {
  return (
    <div className={styles.page} aria-busy="true">
      <div className={styles.header}>
        <Skeleton height={0} className={styles.skeletonPhoto} />
        <div className={styles.headerText}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="80%" height={64} />
          <Skeleton width="30%" height={16} />
          <Skeleton width="100%" height={90} />
        </div>
      </div>
    </div>
  );
}
