import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ResultadoBadge } from '@/components/ui/Badges';
import { ButtonLink } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Fields';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/Typography';
import { VoteBar } from '@/components/ui/VoteBar';
import { usePoroteos } from '@/features/poroteo/queries';
import { TIPO_MAYORIA_LABEL } from '@/features/poroteo/resultado';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatRelative } from '@/utils/format';
import styles from './PoroteosPage.module.css';

export default function PoroteosPage() {
  useDocumentTitle('Poroteos');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const qd = useDebouncedValue(q, 300);
  const { data, isPending, isError, error, refetch } = usePoroteos({ q: qd || undefined, page });

  return (
    <>
      <PageHeader
        titulo="¿Sale o no sale?"
        bajada="Cargá un proyecto de ley y estimá, banca por banca, cómo votaría cada diputado. El contador te dice en vivo si hay quórum y si el proyecto se aprueba."
      >
        <div>
          <ButtonLink to="/poroteos/nuevo" variant="primary">
            Nuevo poroteo
          </ButtonLink>
        </div>
      </PageHeader>

      <div className={styles.toolbar}>
        <SearchInput
          label="Buscar poroteo"
          placeholder="Buscar por título…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isError ? (
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          titulo="No pudimos cargar los poroteos"
        />
      ) : isPending ? (
        <div className={styles.grid}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={170} />
          ))}
        </div>
      ) : data.data.length === 0 ? (
        <EmptyState
          titulo={qd ? 'Ningún poroteo coincide' : 'Todavía no hay poroteos'}
          accion={
            !qd && (
              <ButtonLink to="/poroteos/nuevo" variant="primary">
                Crear el primero
              </ButtonLink>
            )
          }
        >
          {qd
            ? 'Probá con otro título.'
            : 'Un poroteo es una estimación de cómo votaría la Cámara un proyecto de ley.'}
        </EmptyState>
      ) : (
        <>
          <ul className={styles.grid}>
            {data.data.map((p) => {
              const c = p.resumen.conteo;
              return (
                <li key={p.id} className={styles.card}>
                  <Link to={`/poroteos/${p.id}`} className={styles.cardLink}>
                    <span className={styles.cardTop}>
                      <ResultadoBadge resultado={p.resumen.resultado} />
                      {!p.resumen.definido && (
                        <span className={styles.abierto}>Todavía abierto</span>
                      )}
                    </span>
                    <span className={styles.cardTitle}>{p.titulo}</span>
                    {p.descripcion && <span className={styles.cardDesc}>{p.descripcion}</span>}
                    <span className={styles.cardMeta}>
                      {TIPO_MAYORIA_LABEL[p.tipoMayoria]}, editado {formatRelative(p.updatedAt)}
                    </span>
                    <span className={styles.cardFoot}>
                      <VoteBar
                        height={8}
                        total={257}
                        segments={[
                          { voto: 'AFIRMATIVO', value: c.AFIRMATIVO },
                          { voto: 'NEGATIVO', value: c.NEGATIVO },
                          { voto: 'ABSTENCION', value: c.ABSTENCION },
                          { voto: 'AUSENTE', value: c.AUSENTE },
                        ]}
                      />
                      <span className={`${styles.cardCounts} num`}>
                        <span>
                          <i style={{ background: 'var(--voto-afirmativo)' }} aria-hidden />
                          <b>{c.AFIRMATIVO}</b> a favor
                        </span>
                        <span>
                          <i style={{ background: 'var(--voto-negativo)' }} aria-hidden />
                          <b>{c.NEGATIVO}</b> en contra
                        </span>
                        <span>
                          <b>{p.resumen.enDisputa}</b> sin definir
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination meta={data.meta} onChange={setPage} />
        </>
      )}
    </>
  );
}
