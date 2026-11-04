import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Hemiciclo, Leyenda, type Banca } from '@/components/hemiciclo';
import { BloqueChip, ResultadoBadge } from '@/components/ui/Badges';
import { ButtonLink } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Kicker, SectionHeader, Stat } from '@/components/ui/Typography';
import { VoteBar } from '@/components/ui/VoteBar';
import { VotosTabla } from '@/features/votaciones/components/VotosTabla';
import { useVotacion } from '@/features/votaciones/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { VotacionDetalle, VotoReal } from '@/types';
import { formatDate, formatPct, formatTime } from '@/utils/format';
import { nombreLegible, titleCase } from '@/utils/text';
import styles from './VotacionPage.module.css';

export default function VotacionPage() {
  const id = Number(useParams().id);
  const { data, isPending, isError, error, refetch } = useVotacion(id);
  useDocumentTitle(data?.titulo ?? 'Votación');

  if (isError) {
    return (
      <div className={styles.state}>
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          titulo="No pudimos cargar la votación"
        />
        <Link to="/votaciones">← Volver a las votaciones</Link>
      </div>
    );
  }
  if (isPending) {
    return (
      <div className={styles.state} aria-busy="true">
        <Skeleton width="30%" height={14} />
        <Skeleton width="85%" height={72} />
        <Skeleton height={0} className={styles.hemiSkeleton} />
      </div>
    );
  }
  return <Detalle v={data} />;
}

const VOTOS: VotoReal[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE'];

function Detalle({ v }: { v: VotacionDetalle }) {
  const [bloque, setBloque] = useState('');
  const [voto, setVoto] = useState<VotoReal | 'TODOS'>('TODOS');

  const bancas: Banca[] = useMemo(
    () =>
      v.votos.map((x) => ({
        id: x.personaId,
        nombre: nombreLegible(x.nombre),
        orden: x.nombre,
        bloque: x.bloque,
        provincia: x.provincia,
        fotoUrl: x.fotoUrl,
        voto: x.voto,
        href: x.diputadoId ? `/diputados/${x.diputadoId}` : null,
      })),
    [v.votos],
  );

  const resaltadas = useMemo(() => {
    if (!bloque && voto === 'TODOS') return null;
    return new Set(
      v.votos
        .filter(
          (x) =>
            (!bloque || (x.bloque ?? 'Sin bloque') === bloque) &&
            (voto === 'TODOS' || x.voto === voto),
        )
        .map((x) => x.personaId),
    );
  }, [v.votos, bloque, voto]);

  const { conteo, porcentajes } = v;
  const presentes = conteo.afirmativos + conteo.negativos + conteo.abstenciones;

  return (
    <article className={styles.page}>
      <nav className={styles.crumbs} aria-label="Ruta">
        <Link to="/votaciones">Votaciones</Link> <span aria-hidden>/</span> {v.anio}
      </nav>

      <header className={styles.header}>
        <div className={styles.kickers}>
          <Kicker tono="accent">
            {formatDate(v.fecha)}
            {formatTime(v.fecha) && ` · ${formatTime(v.fecha)} h`}
          </Kicker>
          {v.etiqueta && <Kicker tono="muted">{v.etiqueta}</Kicker>}
        </div>
        <h1 className={styles.title}>{v.titulo}</h1>
        {v.tituloActa && v.tituloActa !== v.titulo && <p className={styles.acta}>{v.tituloActa}</p>}
        <div className={styles.result}>
          <ResultadoBadge resultado={v.resultado} size="lg" />
          {v.url && (
            <a href={v.url} target="_blank" rel="noreferrer" className={styles.link}>
              Acta oficial HCDN ↗
            </a>
          )}
          <ButtonLink to="/poroteos/nuevo" size="sm" state={{ titulo: v.ley?.nombre ?? v.titulo }}>
            Porotear un proyecto parecido
          </ButtonLink>
        </div>
      </header>

      <section className={styles.numbers}>
        {VOTOS.map((k) => {
          const key = {
            AFIRMATIVO: 'afirmativos',
            NEGATIVO: 'negativos',
            ABSTENCION: 'abstenciones',
            AUSENTE: 'ausentes',
          }[k as 'AFIRMATIVO'] as keyof typeof conteo;
          return (
            <Stat
              key={k}
              size="xl"
              valor={conteo[key]}
              label={
                <span className={styles.statLabel}>
                  <i style={{ background: VOTO_COLOR[k] }} aria-hidden />
                  {VOTO_LABEL[k]}
                </span>
              }
              detalle={formatPct(porcentajes[key])}
            />
          );
        })}
      </section>

      <VoteBar
        height={14}
        segments={[
          { voto: 'AFIRMATIVO', value: conteo.afirmativos },
          { voto: 'NEGATIVO', value: conteo.negativos },
          { voto: 'ABSTENCION', value: conteo.abstenciones },
          { voto: 'AUSENTE', value: conteo.ausentes },
        ]}
        marker={{ at: 129, label: 'Quórum 129' }}
      />
      <p className={styles.note}>
        {presentes} presentes ({presentes >= 129 ? 'con' : 'sin'} quórum). Los porcentajes se
        calculan sobre el total de bancas registradas en el acta.
      </p>

      <section className={styles.section}>
        <SectionHeader kicker="Hemiciclo" titulo="Cómo votó cada banca">
          Agrupadas por el bloque que tenía cada diputado en ese momento. Filtrá por bloque o tipo
          de voto para resaltar.
        </SectionHeader>
        <Hemiciclo
          bancas={bancas}
          modo="votacion"
          resaltadas={resaltadas}
          ariaLabel={`Hemiciclo de la votación: ${conteo.afirmativos} afirmativos, ${conteo.negativos} negativos, ${conteo.abstenciones} abstenciones, ${conteo.ausentes} ausentes.`}
          centro={
            <div className={styles.centro}>
              <span className="num">
                <b style={{ color: 'var(--voto-afirmativo)' }}>{conteo.afirmativos}</b>
                <span className={styles.centroSep}>–</span>
                <b style={{ color: 'var(--voto-negativo)' }}>{conteo.negativos}</b>
              </span>
            </div>
          }
        />
        <div className={styles.legend}>
          <Leyenda
            compacta
            items={[...VOTOS, 'PRESIDENTE' as const].map((k) => ({
              key: k,
              label: VOTO_LABEL[k],
              color: VOTO_COLOR[k],
            }))}
          />
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader kicker="Por bloque" titulo="Cómo votó cada bloque" />
        <ul className={styles.bloques}>
          {v.porBloque.map((b) => (
            <li key={b.bloque}>
              <button
                type="button"
                className={styles.bloqueRow}
                aria-pressed={bloque === b.bloque}
                onClick={() => setBloque((cur) => (cur === b.bloque ? '' : b.bloque))}
              >
                <span className={styles.bloqueName}>
                  <BloqueChip bloque={b.bloque} />
                  <span className={`${styles.bloqueTotal} num`}>{b.total}</span>
                </span>
                <VoteBar
                  height={8}
                  total={b.total}
                  segments={[
                    { voto: 'AFIRMATIVO', value: b.AFIRMATIVO },
                    { voto: 'NEGATIVO', value: b.NEGATIVO },
                    { voto: 'ABSTENCION', value: b.ABSTENCION },
                    { voto: 'AUSENTE', value: b.AUSENTE },
                    { voto: 'PRESIDENTE', value: b.PRESIDENTE },
                  ]}
                />
                <span className={`${styles.bloqueCounts} num`}>
                  {b.AFIRMATIVO}·{b.NEGATIVO}·{b.ABSTENCION}·{b.AUSENTE}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Orden de los números: afirmativos · negativos · abstenciones · ausentes.
        </p>
      </section>

      <section className={styles.section}>
        <SectionHeader kicker="Nominal" titulo="Quién votó qué" />
        <VotosTabla
          votos={v.votos}
          bloque={bloque}
          onBloqueChange={setBloque}
          voto={voto}
          onVotoChange={setVoto}
        />
      </section>

      {v.votacionesDeLaLey.length > 1 && (
        <section className={styles.section}>
          <SectionHeader
            kicker="Misma ley"
            titulo={`Todas las votaciones de ${titleCase(v.ley?.nombre ?? 'esta ley')}`}
          />
          <ul className={styles.hermanas}>
            {v.votacionesDeLaLey.map((h) => (
              <li key={h.id} data-current={h.id === v.id || undefined}>
                <Link to={`/votaciones/${h.id}`}>{h.etiqueta ?? 'Votación'}</Link>
                <ResultadoBadge resultado={h.resultado} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {v.keywords.length > 0 && (
        <p className={styles.keywords}>
          <span>Palabras clave:</span> {v.keywords.join(' · ')}
        </p>
      )}
    </article>
  );
}
