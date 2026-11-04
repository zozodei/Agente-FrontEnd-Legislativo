import { Link, useParams } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { BloqueChip } from '@/components/ui/Badges';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Kicker, SectionHeader, Stat } from '@/components/ui/Typography';
import { VoteBar } from '@/components/ui/VoteBar';
import { HistorialVotos } from '@/features/diputados/components/HistorialVotos';
import { AlineamientoChart, VotosPorAnioChart } from '@/features/diputados/components/PerfilCharts';
import { useDiputado } from '@/features/diputados/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { bloqueStyle, COALICION_COLOR, COALICION_LABEL } from '@/styles/palette';
import type { DiputadoPerfil } from '@/types';
import { formatDate, formatNumber, formatPct } from '@/utils/format';
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

function aniosRestantes(fin: string): string {
  const days = (new Date(fin).getTime() - Date.now()) / 86_400_000;
  if (days <= 0) return 'mandato cumplido';
  if (days < 365) return `termina en ${Math.ceil(days / 30)} meses`;
  const years = Math.round(days / 365);
  return `termina en ${years} ${years === 1 ? 'año' : 'años'}`;
}

function Perfil({ d }: { d: DiputadoPerfil }) {
  const e = d.estadisticas;
  const color = bloqueStyle(d.bloque).color;
  const anios = Object.keys(e.porAnio).sort();
  const alin = (['pj', 'pro', 'lla', 'ucr'] as const).filter((k) => d.alineamiento[k] !== null);

  return (
    <article className={styles.page}>
      <nav className={styles.crumbs} aria-label="Ruta">
        <Link to="/diputados">Diputados</Link> <span aria-hidden>/</span> {d.apellido}
      </nav>

      <header className={styles.header} style={{ '--bloque': color } as React.CSSProperties}>
        <div className={styles.photo}>
          <Avatar src={d.fotoUrl} nombre={`${d.nombre} ${d.apellido}`} shape="portrait" />
        </div>
        <div className={styles.headerText}>
          <Kicker tono="accent">Diputado/a por {titleCase(d.distrito)}</Kicker>
          <h1 className={styles.name}>
            {d.nombre} <strong>{d.apellido}</strong>
          </h1>
          <div className={styles.bloque}>
            <BloqueChip bloque={d.bloque} />
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Mandato</dt>
              <dd>
                {formatDate(d.iniciaMandato)} — {formatDate(d.finalizaMandato)}
                <span className={styles.factNote}>{aniosRestantes(d.finalizaMandato)}</span>
              </dd>
            </div>
            {d.mandatos.length > 0 && (
              <div>
                <dt>En la Cámara desde</dt>
                <dd>
                  {d.mandatos[0].desde ?? '—'}
                  <span className={styles.factNote}>
                    {d.mandatos.length} {d.mandatos.length === 1 ? 'período' : 'períodos'}{' '}
                    registrados
                  </span>
                </dd>
              </div>
            )}
          </dl>

          <div className={styles.stats}>
            <Stat
              valor={formatPct(d.presentismo)}
              label="Presentismo"
              detalle="en votaciones nominales"
            />
            <Stat
              valor={formatNumber(e.total)}
              label="Votaciones"
              detalle="registradas desde que asumió"
            />
            <Stat
              valor={formatPct(e.alineacionBloque?.porcentaje)}
              label="Votó con su bloque"
              detalle={
                e.alineacionBloque
                  ? `${formatNumber(e.alineacionBloque.coincidencias)} de ${formatNumber(e.alineacionBloque.votaciones)} votaciones`
                  : 'sin datos suficientes'
              }
            />
          </div>
        </div>
      </header>

      <section className={styles.section}>
        <SectionHeader kicker="Comportamiento" titulo="Cómo vota" />
        <VoteBar
          height={14}
          showLabels
          segments={[
            { voto: 'AFIRMATIVO', value: e.conteo.afirmativo },
            { voto: 'NEGATIVO', value: e.conteo.negativo },
            { voto: 'ABSTENCION', value: e.conteo.abstencion },
            { voto: 'AUSENTE', value: e.conteo.ausente },
          ]}
        />
        <p className={styles.note}>
          {formatPct(e.porcentaje.afirmativo)} afirmativo · {formatPct(e.porcentaje.negativo)}{' '}
          negativo · {formatPct(e.porcentaje.abstencion)} abstención ·{' '}
          {formatPct(e.porcentaje.ausente)} ausente.
        </p>
      </section>

      <div className={styles.two}>
        <section className={styles.section}>
          <SectionHeader kicker="Afinidad" titulo="Alineamiento con las coaliciones" as="h2" />
          {alin.length > 0 && (
            <ul className={styles.alin}>
              {alin.map((k) => (
                <li key={k}>
                  <span className={styles.alinLabel}>{COALICION_LABEL[k]}</span>
                  <span className={styles.alinTrack}>
                    <span
                      className={styles.alinBar}
                      style={{
                        width: `${d.alineamiento[k]}%`,
                        background: COALICION_COLOR[k.toUpperCase()],
                      }}
                    />
                  </span>
                  <span className={`${styles.alinValue} num`}>{formatPct(d.alineamiento[k])}</span>
                </li>
              ))}
            </ul>
          )}
          <AlineamientoChart data={d.alineamientoAnual} />
        </section>

        <section className={styles.section}>
          <SectionHeader kicker="Actividad" titulo="Votaciones por año" as="h2" />
          <VotosPorAnioChart data={e.porAnio} />
        </section>
      </div>

      {d.mandatos.length > 0 && (
        <section className={styles.section}>
          <SectionHeader kicker="Trayectoria" titulo="Mandatos" />
          <ol className={styles.timeline}>
            {[...d.mandatos].reverse().map((m, i) => (
              <li key={`${m.desde}-${i}`}>
                <span className={`${styles.timelineYears} num`}>
                  {m.desde}
                  {m.hasta && m.hasta !== m.desde ? `–${m.hasta}` : ''}
                </span>
                <span className={styles.timelineBody}>
                  <BloqueChip bloque={m.bloque} />
                  {m.alianza && <span className={styles.factNote}>Electo/a por {m.alianza}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={styles.section}>
        <SectionHeader
          kicker="Historial"
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
