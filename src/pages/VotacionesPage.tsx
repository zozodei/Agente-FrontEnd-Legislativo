import { Button } from '@/components/ui/Button';
import { Checkbox, SearchInput, SelectField } from '@/components/ui/Fields';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { PageHeader } from '@/components/ui/Typography';
import { VotacionRow } from '@/features/votaciones/components/VotacionRow';
import { useVotaciones } from '@/features/votaciones/queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { formatNumber } from '@/utils/format';
import styles from './VotacionesPage.module.css';

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL - 1993 + 1 }, (_, i) => ANIO_ACTUAL - i);

export default function VotacionesPage() {
  useDocumentTitle('Votaciones');
  const [f, setF] = useSearchParamState([
    'q',
    'anio',
    'resultado',
    'todas',
    'desde',
    'hasta',
    'page',
  ] as const);
  const q = useDebouncedValue(f.q, 350);
  const page = Number(f.page) || 1;

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useVotaciones({
    q: q || undefined,
    anio: f.anio ? Number(f.anio) : undefined,
    resultado: (f.resultado || undefined) as 'AFIRMATIVO' | 'NEGATIVO' | undefined,
    desde: f.desde || undefined,
    hasta: f.hasta || undefined,
    soloGeneral: f.todas !== '1',
    page,
    pageSize: 20,
  });

  const hayFiltros = Boolean(f.q || f.anio || f.resultado || f.desde || f.hasta || f.todas);
  const limpiar = () => setF({ q: '', anio: '', resultado: '', desde: '', hasta: '', todas: '' });

  return (
    <>
      <PageHeader
        titulo="Leyes votadas"
        bajada="Todas las votaciones nominales de la Cámara de Diputados desde 1993. Por defecto se muestran las votaciones en general, que reflejan la postura sobre cada ley."
      />

      <div className={styles.toolbar}>
        <SearchInput
          label="Buscar votación"
          placeholder="Buscar por ley o tema…"
          value={f.q}
          onChange={(e) => setF({ q: e.target.value })}
        />
        <div className={styles.filters}>
          <SelectField label="Año" value={f.anio} onChange={(e) => setF({ anio: e.target.value })}>
            <option value="">Todos</option>
            {ANIOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Resultado"
            value={f.resultado}
            onChange={(e) => setF({ resultado: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="AFIRMATIVO">Aprobadas</option>
            <option value="NEGATIVO">Rechazadas</option>
          </SelectField>
          <label className={styles.date}>
            <span>Desde</span>
            <input
              type="date"
              value={f.desde}
              max={f.hasta || undefined}
              onChange={(e) => setF({ desde: e.target.value })}
            />
          </label>
          <label className={styles.date}>
            <span>Hasta</span>
            <input
              type="date"
              value={f.hasta}
              min={f.desde || undefined}
              onChange={(e) => setF({ hasta: e.target.value })}
            />
          </label>
          <Checkbox
            label="Incluir votaciones en particular"
            checked={f.todas === '1'}
            onChange={(e) => setF({ todas: e.target.checked ? '1' : '' })}
          />
        </div>
      </div>

      <div className={styles.meta}>
        <span className="num" aria-live="polite">
          {data ? `${formatNumber(data.meta.total)} votaciones` : 'Cargando…'}
        </span>
        {hayFiltros && (
          <Button size="sm" variant="ghost" onClick={limpiar}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className={styles.skeleton}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={72} />
          ))}
        </div>
      ) : data.data.length === 0 ? (
        <EmptyState
          titulo="No hay votaciones con esos filtros"
          accion={<Button onClick={limpiar}>Limpiar filtros</Button>}
        >
          Probá con otras palabras o ampliá el rango de fechas.
        </EmptyState>
      ) : (
        <>
          <ul className={styles.list} data-loading={isPlaceholderData || undefined}>
            {data.data.map((v) => (
              <VotacionRow key={v.id} votacion={v} />
            ))}
          </ul>
          <Pagination meta={data.meta} onChange={(p) => setF({ page: p === 1 ? '' : p }, false)} />
        </>
      )}
    </>
  );
}
