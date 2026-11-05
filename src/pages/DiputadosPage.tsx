import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { SearchInput, Segmented, SelectField } from '@/components/ui/Fields';
import { PageHeader } from '@/components/ui/Typography';
import { DiputadoCard, DiputadoListRow } from '@/features/diputados/components/DiputadoCard';
import { useDiputados } from '@/features/diputados/queries';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import type { Diputado } from '@/types';
import { normalize, titleCase } from '@/utils/text';
import styles from './DiputadosPage.module.css';

type Orden = 'apellido' | 'bloque' | 'distrito' | 'presentismo';

const SORTERS: Record<Orden, (a: Diputado, b: Diputado) => number> = {
  apellido: (a, b) => a.apellido.localeCompare(b.apellido, 'es'),
  bloque: (a, b) =>
    a.bloque.localeCompare(b.bloque, 'es') || a.apellido.localeCompare(b.apellido, 'es'),
  distrito: (a, b) =>
    a.distrito.localeCompare(b.distrito, 'es') || a.apellido.localeCompare(b.apellido, 'es'),
  presentismo: (a, b) => (b.presentismo ?? -1) - (a.presentismo ?? -1),
};

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'));
}

export default function DiputadosPage() {
  useDocumentTitle('Diputados');
  const { data, isPending, isError, error, refetch } = useDiputados();
  const [filtros, setFiltros] = useSearchParamState([
    'q',
    'bloque',
    'distrito',
    'orden',
    'vista',
  ] as const);
  const orden = (filtros.orden || 'apellido') as Orden;
  const vista = (filtros.vista || 'grilla') as 'grilla' | 'lista';

  const bloques = useMemo(() => uniqueSorted((data ?? []).map((d) => d.bloque)), [data]);
  const distritos = useMemo(() => uniqueSorted((data ?? []).map((d) => d.distrito)), [data]);

  const filtrados = useMemo(() => {
    const q = normalize(filtros.q);
    return (data ?? [])
      .filter((d) => !q || normalize(`${d.nombre} ${d.apellido}`).includes(q))
      .filter((d) => !filtros.bloque || d.bloque === filtros.bloque)
      .filter((d) => !filtros.distrito || d.distrito === filtros.distrito)
      .sort(SORTERS[orden] ?? SORTERS.apellido);
  }, [data, filtros.q, filtros.bloque, filtros.distrito, orden]);

  const hayFiltros = Boolean(filtros.q || filtros.bloque || filtros.distrito);

  return (
    <>
      <PageHeader
        titulo="Los 257 diputados"
        bajada="Buscá por nombre o filtrá por bloque y provincia. Cada perfil reúne su historial de votaciones y estadísticas."
      />

      <div className={styles.toolbar}>
        <SearchInput
          label="Buscar diputado por nombre"
          placeholder="Buscar por nombre…"
          value={filtros.q}
          onChange={(e) => setFiltros({ q: e.target.value })}
        />
        <div className={styles.filters}>
          <SelectField
            label="Bloque"
            value={filtros.bloque}
            onChange={(e) => setFiltros({ bloque: e.target.value })}
          >
            <option value="">Todos</option>
            {bloques.map((b) => (
              <option key={b} value={b}>
                {titleCase(b)}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Provincia"
            value={filtros.distrito}
            onChange={(e) => setFiltros({ distrito: e.target.value })}
          >
            <option value="">Todas</option>
            {distritos.map((d) => (
              <option key={d} value={d}>
                {titleCase(d)}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Ordenar"
            value={orden}
            onChange={(e) => setFiltros({ orden: e.target.value })}
          >
            <option value="apellido">Apellido</option>
            <option value="bloque">Bloque</option>
            <option value="distrito">Provincia</option>
            <option value="presentismo">Presentismo</option>
          </SelectField>
        </div>
      </div>

      <div className={styles.meta}>
        <span className="num" aria-live="polite">
          {isPending
            ? 'Cargando…'
            : `${filtrados.length} ${filtrados.length === 1 ? 'diputado' : 'diputados'}`}
        </span>
        <div className={styles.metaActions}>
          {hayFiltros && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFiltros({ q: '', bloque: '', distrito: '' })}
            >
              Limpiar filtros
            </Button>
          )}
          <Segmented
            size="sm"
            label="Vista"
            value={vista}
            onChange={(v) => setFiltros({ vista: v === 'grilla' ? '' : v }, false)}
            options={[
              { value: 'grilla', label: 'Grilla' },
              { value: 'lista', label: 'Lista' },
            ]}
          />
        </div>
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isPending ? (
        <ul className={styles.grid} aria-busy="true">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i} className={styles.skeletonCard}>
              <Skeleton height={0} className={styles.skeletonPhoto} />
              <Skeleton width="70%" height={18} />
              <Skeleton width="50%" height={12} />
            </li>
          ))}
        </ul>
      ) : filtrados.length === 0 ? (
        <EmptyState
          titulo="Ningún diputado coincide con la búsqueda"
          accion={
            <Button onClick={() => setFiltros({ q: '', bloque: '', distrito: '' })}>
              Limpiar filtros
            </Button>
          }
        >
          Probá con otro nombre o sacá alguno de los filtros.
        </EmptyState>
      ) : vista === 'lista' ? (
        <ul className={styles.list}>
          <li className={styles.listHead} aria-hidden>
            <span />
            <span>Nombre</span>
            <span>Bloque</span>
            <span>Provincia</span>
            <span>Presentismo</span>
          </li>
          {filtrados.map((d) => (
            <DiputadoListRow key={d.id} diputado={d} />
          ))}
        </ul>
      ) : (
        <ul className={styles.grid}>
          {filtrados.map((d) => (
            <DiputadoCard key={d.id} diputado={d} />
          ))}
        </ul>
      )}
    </>
  );
}
