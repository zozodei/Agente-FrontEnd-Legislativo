import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Hemiciclo, Leyenda } from '@/components/hemiciclo';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { SectionHeader, Stat } from '@/components/ui/Typography';
import { useResumen } from '@/features/dashboard/queries';
import { diputadoToBanca, useDiputados } from '@/features/diputados/queries';
import { VotacionRow } from '@/features/votaciones/components/VotacionRow';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { bloqueStyle } from '@/styles/palette';
import { formatDate, formatNumber, formatPct } from '@/utils/format';
import { normalize, titleCase } from '@/utils/text';
import styles from './HomePage.module.css';

/** Bloques que se listan junto al hemiciclo antes de "ver todos". */
const BLOQUES_VISIBLES = 8;

export default function HomePage() {
  useDocumentTitle(null);
  const diputados = useDiputados();
  const resumen = useResumen();
  const [bloqueActivo, setBloqueActivo] = useState<string | null>(null);
  const [todosLosBloques, setTodosLosBloques] = useState(false);

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
  const restantes = leyenda.slice(BLOQUES_VISIBLES);
  const bancasRestantes = restantes.reduce((acc, b) => acc + Number(b.value ?? 0), 0);

  const r = resumen.data;
  const primera = r?.camara.primeraMinoria;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <img
          className={styles.heroImg}
          src="/congreso.jpg"
          alt="Cúpula de bronce del Palacio del Congreso de la Nación Argentina contra el cielo"
          fetchPriority="high"
        />
        <div className={styles.heroText}>
          <h1 id="hero-title" className={styles.title}>
            Cómo vota la Cámara, banca por banca.
          </h1>
          <p className={styles.lead}>
            Los 257 diputados y más de treinta años de votaciones nominales en un solo lugar. Mirá
            cómo se compone el recinto, cómo votó cada uno y estimá si un proyecto de ley tiene los
            votos para salir.
          </p>
          <div className={styles.actions}>
            <ButtonLink to="/poroteos/nuevo" variant="primary">
              Hacer un poroteo
            </ButtonLink>
            <ButtonLink to="/diputados" className={styles.heroSecondary}>
              Ver los diputados
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className={styles.recinto} aria-labelledby="recinto-title">
        <figure className={styles.figure}>
          <div className={styles.recintoHead}>
            <h2 id="recinto-title" className={styles.recintoTitle}>
              El recinto hoy
            </h2>
            <p className={styles.caption}>
              Pasá el mouse por una banca para ver quién la ocupa. Click para abrir su perfil.
            </p>
          </div>
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
                  <span className={styles.centroLabel}>bancas, quórum con 129</span>
                </div>
              }
            />
          )}
        </figure>

        <div className={styles.bloques}>
          <h3 className={styles.bloquesTitle}>Bloques por cantidad de bancas</h3>
          {resumen.isPending ? (
            <Skeleton height={260} />
          ) : resumen.isError ? (
            <ErrorState error={resumen.error} onRetry={() => resumen.refetch()} />
          ) : (
            <>
              <Leyenda
                items={todosLosBloques ? leyenda : leyenda.slice(0, BLOQUES_VISIBLES)}
                onItemHover={setBloqueActivo}
                activo={bloqueActivo}
              />
              {restantes.length > 0 && (
                <button
                  type="button"
                  className={styles.verMas}
                  aria-expanded={todosLosBloques}
                  onClick={() => setTodosLosBloques((v) => !v)}
                >
                  {todosLosBloques
                    ? 'Mostrar solo los más grandes'
                    : `Ver ${restantes.length} bloques más (${bancasRestantes} bancas)`}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="hoy-title">
        <SectionHeader titulo={<span id="hoy-title">La Cámara en datos</span>} />
        {r ? (
          <dl className={styles.specs}>
            <Spec
              label="Primera minoría"
              valor={`${primera?.bancas ?? '—'} bancas`}
              detalle={
                primera
                  ? `${titleCase(primera.nombre)}, el ${formatPct((primera.bancas / r.camara.bancas) * 100)} del recinto`
                  : undefined
              }
              color={primera ? bloqueStyle(primera.nombre).color : undefined}
            />
            <Spec
              label="Bloques con representación"
              valor={r.camara.bloques}
              detalle="Con al menos una banca"
            />
            <Spec
              label="Quórum"
              valor={`${r.camara.quorum} de ${r.camara.bancas}`}
              detalle="Diputados presentes para sesionar"
            />
            <Spec
              label="Presentismo promedio"
              valor={formatPct(r.camara.presentismoPromedio)}
              detalle="Histórico de los diputados actuales"
            />
            <Spec
              label="Votaciones nominales"
              valor={formatNumber(r.votaciones.total)}
              detalle={`${formatNumber(r.votaciones.aprobadas)} aprobadas y ${formatNumber(r.votaciones.rechazadas)} rechazadas desde 1993; ${formatNumber(r.votaciones.anioActual.total)} en ${r.votaciones.anioActual.anio}`}
            />
            <Spec
              label="Se renuevan en 2027"
              valor={`${formatNumber(r.camara.mandatosQueVencen['2027'] ?? 0)} bancas`}
              detalle="La mitad de la Cámara, cada dos años"
            />
          </dl>
        ) : resumen.isError ? null : (
          <Skeleton height={220} radius={16} />
        )}
      </section>

      <section className={styles.section} aria-labelledby="ultimas-title">
        <SectionHeader
          titulo={<span id="ultimas-title">Últimas votaciones en general</span>}
          accion={
            <Link to="/votaciones">
              Ver todas
              <ChevronRight size={15} aria-hidden />
            </Link>
          }
        />
        {r ? (
          <ul className={styles.list}>
            {r.votaciones.ultimas.map((v) => (
              <VotacionRow key={v.id} votacion={v} />
            ))}
          </ul>
        ) : resumen.isError ? null : (
          <Skeleton height={320} radius={16} />
        )}
      </section>

      <section className={styles.cta} aria-labelledby="cta-title">
        <div>
          <h2 id="cta-title" className={styles.ctaTitle}>
            ¿Sale o no sale?
          </h2>
          <p className={styles.ctaText}>
            Cargá un proyecto, asigná el voto de cada banca y mirá en vivo si alcanza el quórum y la
            mayoría que necesita.
          </p>
        </div>
        <ButtonLink to="/poroteos/nuevo" variant="primary">
          Empezar un poroteo
        </ButtonLink>
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

function Spec(props: { label: string; valor: React.ReactNode; detalle?: string; color?: string }) {
  return (
    <div className={styles.spec}>
      <Stat size="lg" {...props} />
    </div>
  );
}
