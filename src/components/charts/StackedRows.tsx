import { ChartTooltip, TooltipBody } from './ChartTooltip';
import { useChartTooltip } from './useChartTooltip';
import styles from './charts.module.css';

export interface StackedSeries {
  key: string;
  label: string;
  color: string;
}

export interface StackedRow {
  key: string;
  label: string;
  values: Record<string, number>;
}

/** Fila sin datos que corta la serie (ej. años en que no estuvo en la Cámara). */
export interface StackedGap {
  key: string;
  gap: string;
}

const nf = new Intl.NumberFormat('es-AR');
const nf1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

/**
 * Una barra fina por fila (ej. por año), con largo proporcional al total de la
 * fila respecto de la fila más grande, partida por serie. El total va al final.
 * Sirve con 1 fila o con 30: escala hacia abajo, no se aplasta como columnas.
 */
export function StackedRows({
  series,
  rows,
  ariaLabel,
  unidad = 'votaciones',
}: {
  series: StackedSeries[];
  rows: Array<StackedRow | StackedGap>;
  ariaLabel: string;
  unidad?: string;
}) {
  const { wrapRef, tip, bind } = useChartTooltip();
  const totals = rows.map((r) =>
    'gap' in r ? 0 : series.reduce((acc, s) => acc + (r.values[s.key] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <ul className={styles.rows} aria-label={ariaLabel}>
        {rows.map((row, i) => {
          if ('gap' in row) {
            return (
              <li key={row.key} className={styles.gapRow}>
                {row.gap}
              </li>
            );
          }
          const total = totals[i];
          const tooltip = (
            <TooltipBody
              titulo={`${row.label}: ${nf.format(total)} ${unidad}`}
              filas={series.map((s) => ({
                key: s.key,
                color: s.color,
                label: s.label,
                valor: `${nf.format(row.values[s.key] ?? 0)} (${nf1.format(
                  total ? ((row.values[s.key] ?? 0) / total) * 100 : 0,
                )}%)`,
              }))}
            />
          );
          return (
            <li key={row.key} className={styles.row}>
              <span className={`${styles.rowLabel} num`}>{row.label}</span>
              <span
                className={styles.rowTrack}
                tabIndex={0}
                aria-label={`${row.label}: ${series
                  .map((s) => `${s.label} ${row.values[s.key] ?? 0}`)
                  .join(', ')}`}
                {...bind(tooltip)}
              >
                <span className={styles.rowBar} style={{ width: `${(total / max) * 100}%` }}>
                  {series.map((s) =>
                    (row.values[s.key] ?? 0) > 0 ? (
                      <span
                        key={s.key}
                        style={{ flexGrow: row.values[s.key], background: s.color }}
                      />
                    ) : null,
                  )}
                </span>
              </span>
              <span className={`${styles.rowTotal} num`}>{nf.format(total)}</span>
            </li>
          );
        })}
      </ul>
      <ChartTooltip tip={tip} />
    </div>
  );
}
