import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hemiciclo, Leyenda } from '@/components/hemiciclo';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Kicker, SectionHeader, Stat } from '@/components/ui/Typography';
import { useResumen } from '@/features/dashboard/queries';
import { diputadoToBanca, useDiputados } from '@/features/diputados/queries';
import { VotacionRow } from '@/features/votaciones/components/VotacionRow';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { bloqueStyle } from '@/styles/palette';
import { formatDate, formatNumber, formatPct } from '@/utils/format';
import { normalize, titleCase } from '@/utils/text';
import styles from './HomePage.module.css';

export default function HomePage() {
  useDocumentTitle(null);
  const diputados = useDiputados();
  const resumen = useResumen();
  const [bloqueActivo, setBloqueActivo] = useState<string | null>(null);

  const bancas = useMemo(() => (diputados.data ?? []).map(diputadoToBanca), [diputados.data]);
  const resaltadas = useMemo(() => {
    if (!bloqueActivo) return null;
    return new Set(
      bancas.filter((b) => normalize(b.bloque ?? '') === normalize(bloqueActivo)).map((b) => b.id),
    );
  }, [bancas, bloqueActivo]);

  const leyenda = useMemo(
    () =>
      [...(resumen.data?.composicion ?? [])]
        .sort((a, b) => b.bancas - a.bancas)
        .map((b) => ({
          key: b.nombre,
          label: titleCase(b.nombre),
          color: bloqueStyle(b.nombre).color,
          value: b.bancas,
        })),
    [resumen.data],
  );

  const r = resumen.data;
  const primera = r?.camara.primeraMinoria;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <Kicker tono="accent">Cámara de Diputados de la Nación</Kicker>
          <h1 className={styles.title}>
            La Cámara, <em>banca por banca.</em>
          </h1>
          <p className={styles.lead}>
            257 diputados, 21 bloques y más de treinta años de votaciones nominales. Explorá cómo se
            compone la Cámara, cómo votó cada uno y armá tu propio poroteo para anticipar el
            resultado de un proyecto de ley.
          </p>
          <div className={styles.actions}>
            <ButtonLink to="/poroteos/nuevo" variant="primary">
              Hacer un poroteo
            </ButtonLink>
            <ButtonLink to="/diputados">Ver diputados</ButtonLink>
          </div>
        </div>

        <figure className={styles.figure}>
          {diputados.isError ? (
            <ErrorState error={diputados.error} onRetry={() => diputados.refetch()} />
          ) : diputados.isPending ? (
            <Skeleton height={0} className={styles.hemiSkeleton} />
          ) : (
            <Hemiciclo
              bancas={bancas}
              modo="bloques"
              resaltadas={resaltadas}
              ariaLabel={`Hemiciclo con ${bancas.length} bancas agrupadas por bloque.`}
              centro={
                <div className={styles.centro}>
                  <span className={`${styles.centroNum} num`}>{bancas.length}</span>
                  <span className={styles.centroLabel}>bancas · quórum 129</span>
                </div>
              }
            />
          )}
          <figcaption className={styles.caption}>
            Composición actual por bloque. Pasá el mouse por una banca para ver quién la ocupa; hacé
            click para ir a su perfil.
          </figcaption>
        </figure>
      </section>

      <section className={styles.section}>
        <SectionHeader kicker="Composición" titulo="Bloques en la Cámara" />
        {resumen.isPending ? (
          <Skeleton height={160} />
        ) : resumen.isError ? (
          <ErrorState error={resumen.error} onRetry={() => resumen.refetch()} />
        ) : (
          <Leyenda items={leyenda} onItemHover={setBloqueActivo} activo={bloqueActivo} />
        )}
      </section>

      <section className={styles.section}>
        <SectionHeader kicker="En números" titulo="La Cámara hoy" />
        <div className={styles.stats}>
          {r ? (
            <>
              <Stat
                size="xl"
                valor={primera?.bancas ?? '—'}
                label="Primera minoría"
                detalle={primera ? titleCase(primera.nombre) : undefined}
                color={primera ? bloqueStyle(primera.nombre).color : undefined}
              />
              <Stat
                size="xl"
                valor={r.camara.bloques}
                label="Bloques"
                detalle="con al menos una banca"
              />
              <Stat
                size="xl"
                valor={formatPct(r.camara.presentismoPromedio)}
                label="Presentismo promedio"
                detalle="histórico de los diputados actuales"
              />
              <Stat
                size="xl"
                valor={formatNumber(r.votaciones.total)}
                label="Votaciones nominales"
                detalle={`${formatNumber(r.votaciones.aprobadas)} aprobadas · ${formatNumber(r.votaciones.rechazadas)} rechazadas`}
              />
              <Stat
                size="xl"
                valor={formatNumber(r.votaciones.anioActual.total)}
                label={`Votaciones en ${r.votaciones.anioActual.anio}`}
              />
              <Stat
                size="xl"
                valor={formatNumber(r.camara.mandatosQueVencen['2027'] ?? 0)}
                label="Mandatos que vencen en 2027"
                detalle="la mitad de la Cámara se renueva"
              />
            </>
          ) : resumen.isError ? null : (
            Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={90} />)
          )}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          kicker="Recientes"
          titulo="Últimas votaciones en general"
          accion={<Link to="/votaciones">Ver todas →</Link>}
        />
        {r ? (
          <ul className={styles.list}>
            {r.votaciones.ultimas.map((v) => (
              <VotacionRow key={v.id} votacion={v} />
            ))}
          </ul>
        ) : resumen.isError ? null : (
          <div className={styles.listSkeleton}>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} height={64} />
            ))}
          </div>
        )}
      </section>

      {r?.fuente && (
        <p className={styles.fuente}>
          Datos de{' '}
          <a href={r.fuente.sitio} target="_blank" rel="noreferrer">
            {r.fuente.nombre}
          </a>{' '}
          ({r.fuente.autor}), actualizados al {formatDate(r.fuente.actualizado)}.
        </p>
      )}
    </div>
  );
}
