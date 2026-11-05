import { useMemo, useState } from 'react';
import {
  DotScale,
  SegmentedBar,
  StackedRows,
  type DotScaleRow,
  type StackedGap,
  type StackedRow,
} from '@/components/charts';
import { COALICION_COLOR, VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { Alineamiento, AlineamientoAnual, EstadisticasDiputado, StatsAnio } from '@/types';
import { formatDateShort, formatNumber, formatPct } from '@/utils/format';
import styles from './PerfilCharts.module.css';

/* Votos que se grafican, en orden fijo (el color sigue al voto, nunca al ranking). */
const VOTOS = [
  { key: 'AFIRMATIVO', conteo: 'afirmativo', ink: 'light' },
  { key: 'NEGATIVO', conteo: 'negativo', ink: 'light' },
  { key: 'ABSTENCION', conteo: 'abstencion', ink: 'dark' },
  { key: 'AUSENTE', conteo: 'ausente', ink: 'light' },
] as const;

/* ── Cómo vota: un todo partido en cuatro ─────────────────────────────── */

export function ComoVotaChart({ e }: { e: EstadisticasDiputado }) {
  if (e.total === 0)
    return <p className={styles.empty}>Todavía no tiene votaciones registradas.</p>;

  const presentes = e.conteo.afirmativo + e.conteo.negativo + e.conteo.abstencion;
  const aFavor = presentes ? (e.conteo.afirmativo / presentes) * 100 : null;

  return (
    <figure className={styles.figure}>
      <SegmentedBar
        ariaLabel={`Cómo votó en ${formatNumber(e.total)} votaciones`}
        unidad="votaciones"
        segments={VOTOS.map((v) => ({
          key: v.key,
          label: VOTO_LABEL[v.key],
          value: e.conteo[v.conteo],
          color: VOTO_COLOR[v.key],
          ink: v.ink,
        }))}
      />
      <ul className={styles.votoLegend}>
        {VOTOS.map((v) => (
          <li key={v.key}>
            <i style={{ background: VOTO_COLOR[v.key] }} aria-hidden />
            <span className={styles.votoLabel}>{VOTO_LABEL[v.key]}</span>
            <strong className="num">{formatNumber(e.conteo[v.conteo])}</strong>
            <span className={`${styles.votoPct} num`}>{formatPct(e.porcentaje[v.conteo])}</span>
          </li>
        ))}
      </ul>
      {aFavor !== null && (
        <figcaption className={styles.caption}>
          Cuando estuvo presente, votó a favor en el {formatPct(aFavor)} de los casos. Sobre{' '}
          {formatNumber(e.total)} votaciones nominales registradas.
        </figcaption>
      )}
    </figure>
  );
}

/* ── Afinidad con los grandes espacios ────────────────────────────────── */

const COALICIONES = [
  { key: 'PJ', actual: 'pj', label: 'Peronismo' },
  { key: 'LLA', actual: 'lla', label: 'La Libertad Avanza' },
  { key: 'PRO', actual: 'pro', label: 'PRO' },
  { key: 'UCR', actual: 'ucr', label: 'UCR' },
  { key: 'JxC', actual: null, label: 'Juntos por el Cambio' },
] as const;

export function AfinidadChart({
  actual,
  anual,
}: {
  actual: Alineamiento;
  anual: AlineamientoAnual;
}) {
  const [tabla, setTabla] = useState(false);
  const anios = useMemo(() => Object.keys(anual).sort(), [anual]);

  const rows: DotScaleRow[] = useMemo(
    () =>
      COALICIONES.map((c) => {
        const points = anios
          .map((anio) => ({ key: anio, label: anio, value: anual[anio]?.[c.key] ?? null }))
          .filter((p): p is { key: string; label: string; value: number } => p.value !== null);
        return {
          key: c.key,
          label: c.label,
          color: COALICION_COLOR[c.key],
          value: c.actual ? actual[c.actual] : null,
          // Con un solo año el punto chico repetiría al general.
          points: points.length > 1 ? points : [],
          _hayDatos: points.length > 0 || (c.actual !== null && actual[c.actual] !== null),
        };
      })
        .filter((r) => r._hayDatos)
        .map(({ _hayDatos, ...r }) => r),
    [actual, anual, anios],
  );

  if (rows.length === 0) return <p className={styles.empty}>Sin datos de alineamiento.</p>;

  return (
    <figure className={styles.figure}>
      {tabla ? (
        <TablaAfinidad anual={anual} anios={anios} rows={rows} />
      ) : (
        <DotScale
          rows={rows}
          ariaLabel="Porcentaje de coincidencia con cada espacio político"
          referenciaLabel="50%"
          vacio="Solo por año"
        />
      )}
      <figcaption className={styles.caption}>
        Porcentaje de votaciones en las que votó igual que la mayoría de cada espacio. El punto
        grande es el total; los chicos, cada año
        {anios.length > 1 ? ` (${anios[0]}–${anios.at(-1)})` : ''}. Agrupación y cálculo de ¿Cómo
        Votó?.{' '}
        <button type="button" className={styles.toggle} onClick={() => setTabla((t) => !t)}>
          {tabla ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </figcaption>
    </figure>
  );
}

function TablaAfinidad({
  anual,
  anios,
  rows,
}: {
  anual: AlineamientoAnual;
  anios: string[];
  rows: DotScaleRow[];
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Año</th>
            {rows.map((r) => (
              <th key={r.key} scope="col">
                {r.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className={styles.tableTotal}>
            <th scope="row">Total</th>
            {rows.map((r) => (
              <td key={r.key}>{formatPct(r.value)}</td>
            ))}
          </tr>
          {[...anios].reverse().map((anio) => (
            <tr key={anio}>
              <th scope="row">{anio}</th>
              {rows.map((r) => (
                <td key={r.key}>{formatPct(anual[anio]?.[r.key] ?? null)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Actividad por año ────────────────────────────────────────────────── */

export function ActividadChart({ porAnio }: { porAnio: Record<string, StatsAnio> }) {
  const rows = useMemo(
    () =>
      Object.entries(porAnio)
        .sort(([a], [b]) => Number(b) - Number(a)) // más reciente arriba
        .map(([anio, v]) => ({
          key: anio,
          label: anio,
          values: {
            AFIRMATIVO: v.AFIRMATIVO,
            NEGATIVO: v.NEGATIVO,
            ABSTENCION: v.ABSTENCION,
            AUSENTE: v.AUSENTE,
          },
        })),
    [porAnio],
  );
  if (rows.length === 0) return <p className={styles.empty}>Sin votaciones registradas.</p>;

  // Intercala un corte donde faltan años (no estuvo en la Cámara o no hubo votaciones).
  const conCortes: Array<StackedRow | StackedGap> = [];
  rows.forEach((r, i) => {
    conCortes.push(r);
    const siguiente = rows[i + 1];
    if (!siguiente) return;
    const desde = Number(siguiente.label) + 1;
    const hasta = Number(r.label) - 1;
    if (hasta >= desde) {
      conCortes.push({
        key: `gap-${desde}`,
        gap: `${desde === hasta ? desde : `${desde}–${hasta}`}: sin votaciones en Diputados`,
      });
    }
  });

  const masActivo = rows.reduce(
    (best, r) => {
      const t = Object.values(r.values).reduce((a, b) => a + b, 0);
      return t > best.t ? { anio: r.label, t } : best;
    },
    { anio: '', t: 0 },
  );

  return (
    <figure className={styles.figure}>
      <ul className={styles.inlineLegend}>
        {VOTOS.map((v) => (
          <li key={v.key}>
            <i style={{ background: VOTO_COLOR[v.key] }} aria-hidden />
            {VOTO_LABEL[v.key]}
          </li>
        ))}
      </ul>
      <StackedRows
        ariaLabel="Votaciones por año, separadas por tipo de voto"
        series={VOTOS.map((v) => ({
          key: v.key,
          label: VOTO_LABEL[v.key],
          color: VOTO_COLOR[v.key],
        }))}
        rows={conCortes}
      />
      <figcaption className={styles.caption}>
        Cantidad de votaciones nominales por año
        {rows.length > 1 ? `; el año con más actividad fue ${masActivo.anio}` : ''}. Pasá el mouse
        por una fila para ver el detalle.
      </figcaption>
    </figure>
  );
}

/* ── Mandato: cuánto transcurrió ──────────────────────────────────────── */

function parseDay(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function MandatoBar({ inicio, fin }: { inicio: string; fin: string }) {
  const start = parseDay(inicio);
  const end = parseDay(fin);
  // La fecha de "hoy" se fija al montar: el render tiene que ser puro.
  const [now] = useState(() => Date.now());
  const pct = Math.max(0, Math.min(100, ((now - start) / Math.max(1, end - start)) * 100));
  const dias = Math.ceil((end - now) / 86_400_000);
  const restante =
    dias <= 0
      ? 'Mandato cumplido'
      : dias < 365
        ? `Le quedan ${Math.ceil(dias / 30)} meses`
        : `Le quedan ${(dias / 365).toLocaleString('es-AR', { maximumFractionDigits: 1 })} años`;

  return (
    <div className={styles.mandato}>
      <div className={styles.mandatoHead}>
        <span>Mandato</span>
        <strong>{restante}</strong>
      </div>
      <div
        className={styles.mandatoTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label={`Transcurrió el ${Math.round(pct)}% del mandato`}
      >
        <span className={styles.mandatoFill} style={{ width: `${pct}%` }} />
        {pct > 0 && pct < 100 && (
          <span className={styles.mandatoHoy} style={{ left: `${pct}%` }} aria-hidden />
        )}
      </div>
      <div className={`${styles.mandatoEnds} num`}>
        <span>{formatDateShort(inicio)}</span>
        <span>{formatDateShort(fin)}</span>
      </div>
    </div>
  );
}

/* ── Comparación contra el promedio de la Cámara ──────────────────────── */

export function Comparado({
  valor,
  promedio,
  label,
}: {
  valor: number | null;
  promedio: number | null | undefined;
  label: string;
}) {
  if (valor === null) return null;
  const diff = promedio !== null && promedio !== undefined ? valor - promedio : null;
  return (
    <div className={styles.comparado}>
      <span className={styles.compTrack} aria-hidden>
        <span className={styles.compFill} style={{ width: `${valor}%` }} />
        {promedio !== null && promedio !== undefined && (
          <span className={styles.compRef} style={{ left: `${promedio}%` }} />
        )}
      </span>
      {diff !== null && (
        <span className={styles.compText}>
          {Math.abs(diff) < 0.5
            ? `En el promedio de la Cámara (${formatPct(promedio)})`
            : `${formatPct(Math.abs(diff)).replace('%', '')} puntos ${diff > 0 ? 'arriba' : 'abajo'} del promedio de la Cámara (${formatPct(promedio)})`}
          <span className="visually-hidden">{label}</span>
        </span>
      )}
    </div>
  );
}
