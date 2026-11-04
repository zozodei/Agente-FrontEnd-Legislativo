import { useState } from 'react';
import { Link } from 'react-router-dom';
import { VotoBadge } from '@/components/ui/Badges';
import { Checkbox, SearchInput, SelectField } from '@/components/ui/Fields';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { VOTO_LABEL } from '@/styles/palette';
import type { VotoReal } from '@/types';
import { formatDateShort } from '@/utils/format';
import { isAllCaps, titleCase } from '@/utils/text';
import { useVotosDiputado } from '../queries';
import styles from './HistorialVotos.module.css';

const VOTOS: VotoReal[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE'];

/** Historial paginado de votaciones de un diputado, con filtros. */
export function HistorialVotos({ diputadoId, anios }: { diputadoId: number; anios: string[] }) {
  const [q, setQ] = useState('');
  const [voto, setVoto] = useState<VotoReal | ''>('');
  const [anio, setAnio] = useState('');
  const [soloGeneral, setSoloGeneral] = useState(true);
  const [page, setPage] = useState(1);
  const qDebounced = useDebouncedValue(q, 350);

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useVotosDiputado(
    diputadoId,
    {
      q: qDebounced || undefined,
      voto: voto || undefined,
      anio: anio ? Number(anio) : undefined,
      soloGeneral,
      page,
      pageSize: 20,
    },
  );

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div>
      <div className={styles.filters}>
        <SearchInput
          label="Buscar en el historial"
          placeholder="Buscar ley o tema…"
          value={q}
          onChange={(e) => reset(() => setQ(e.target.value))}
        />
        <SelectField
          label="Voto"
          value={voto}
          onChange={(e) => reset(() => setVoto(e.target.value as VotoReal | ''))}
        >
          <option value="">Todos</option>
          {VOTOS.map((v) => (
            <option key={v} value={v}>
              {VOTO_LABEL[v]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Año"
          value={anio}
          onChange={(e) => reset(() => setAnio(e.target.value))}
        >
          <option value="">Todos</option>
          {[...anios].reverse().map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </SelectField>
        <Checkbox
          label="Solo votaciones en general"
          checked={soloGeneral}
          onChange={(e) => reset(() => setSoloGeneral(e.target.checked))}
        />
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className={styles.skeleton}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={44} />
          ))}
        </div>
      ) : data.data.length === 0 ? (
        <EmptyState titulo="No hay votaciones con esos filtros">
          Probá ampliar la búsqueda.
        </EmptyState>
      ) : (
        <>
          <div className={styles.tableWrap} data-loading={isPlaceholderData || undefined}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Votación</th>
                  <th scope="col">Su voto</th>
                  <th scope="col" className={styles.hideSm}>
                    Bloque entonces
                  </th>
                  <th scope="col" className={styles.hideSm}>
                    Resultado
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((v) => (
                  <tr key={v.votacionId}>
                    <td className={`${styles.date} num`}>{formatDateShort(v.fecha)}</td>
                    <td>
                      <Link
                        to={`/votaciones/${v.votacionId}`}
                        className={styles.title}
                        data-acta={isAllCaps(v.nombreLey || v.titulo) || undefined}
                      >
                        {v.nombreLey || v.titulo}
                      </Link>
                      {v.etiqueta && <span className={styles.etiqueta}>{v.etiqueta}</span>}
                    </td>
                    <td>
                      <VotoBadge voto={v.voto} />
                    </td>
                    <td className={`${styles.hideSm} ${styles.muted}`}>{titleCase(v.bloque)}</td>
                    <td className={`${styles.hideSm} ${styles.muted}`}>
                      {v.resultado === 'AFIRMATIVO'
                        ? 'Aprobada'
                        : v.resultado === 'NEGATIVO'
                          ? 'Rechazada'
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onChange={setPage} />
        </>
      )}
    </div>
  );
}
