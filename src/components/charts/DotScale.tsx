import type { ReactNode } from 'react';
import { ChartTooltip, TooltipBody } from './ChartTooltip';
import { useChartTooltip } from './useChartTooltip';
import styles from './charts.module.css';

export interface DotScalePoint {
  key: string;
  label: string;
  value: number;
}

export interface DotScaleRow {
  key: string;
  label: string;
  color: string;
  /** Valor principal (punto grande + número a la derecha). null = sin datos. */
  value: number | null;
  /** Valores secundarios (ej. uno por año), en el mismo color, más tenues. */
  points?: DotScalePoint[];
}

const nf1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

/**
 * Escala 0–100 con una fila por categoría: el punto grande es el valor general
 * y los chicos, su variación (por año). Funciona igual con 1 o con 30 puntos,
 * a diferencia de un gráfico de líneas que con pocos años queda vacío.
 */
export function DotScale({
  rows,
  ariaLabel,
  referencia = 50,
  referenciaLabel = 'Mitad',
  sufijo = '%',
  vacio = 'Sin datos',
}: {
  rows: DotScaleRow[];
  ariaLabel: string;
  referencia?: number;
  referenciaLabel?: ReactNode;
  sufijo?: string;
  vacio?: string;
}) {
  const { wrapRef, tip, bind } = useChartTooltip();
  const fmt = (v: number) => `${nf1.format(v)}${sufijo}`;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.dotScale} role="group" aria-label={ariaLabel}>
        <div className={styles.dotAxis} aria-hidden>
          <span />
          <span className={styles.dotAxisTrack}>
            <span style={{ left: '0%' }}>0{sufijo}</span>
            <span style={{ left: `${referencia}%` }}>{referenciaLabel}</span>
            <span style={{ left: '100%' }}>100{sufijo}</span>
          </span>
          <span />
        </div>

        {rows.map((row) => (
          <div key={row.key} className={styles.dotRow}>
            <span className={styles.dotLabel}>
              <i style={{ background: row.color }} aria-hidden />
              {row.label}
            </span>
            <span className={styles.dotTrack}>
              <span className={styles.dotRef} style={{ left: `${referencia}%` }} aria-hidden />
              {row.points?.map((p) => (
                <span
                  key={p.key}
                  className={styles.dotSmall}
                  style={{ left: `${p.value}%`, background: row.color }}
                  tabIndex={0}
                  aria-label={`${row.label}, ${p.label}: ${fmt(p.value)}`}
                  {...bind(
                    <TooltipBody
                      titulo={p.label}
                      filas={[
                        { key: 'v', color: row.color, label: row.label, valor: fmt(p.value) },
                      ]}
                    />,
                  )}
                />
              ))}
              {row.value !== null && (
                <span
                  className={styles.dotMain}
                  style={{ left: `${row.value}%`, background: row.color }}
                  tabIndex={0}
                  aria-label={`${row.label}, general: ${fmt(row.value)}`}
                  {...bind(
                    <TooltipBody
                      titulo="General"
                      filas={[
                        { key: 'v', color: row.color, label: row.label, valor: fmt(row.value) },
                      ]}
                    />,
                  )}
                />
              )}
            </span>
            <span className={`${styles.dotValue} num`}>
              {row.value === null ? <span className={styles.muted}>{vacio}</span> : fmt(row.value)}
            </span>
          </div>
        ))}
      </div>
      <ChartTooltip tip={tip} />
    </div>
  );
}
