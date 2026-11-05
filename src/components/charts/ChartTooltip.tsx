import type { ReactNode } from 'react';
import type { TooltipState } from './useChartTooltip';
import styles from './charts.module.css';

export function ChartTooltip({ tip }: { tip: TooltipState | null }) {
  if (!tip) return null;
  return (
    <div className={styles.tooltip} style={{ left: tip.x, top: tip.y }} role="status">
      {tip.content}
    </div>
  );
}

/** Contenido estándar: título + filas "marca · nombre · valor". */
export function TooltipBody({
  titulo,
  filas,
}: {
  titulo: ReactNode;
  filas: Array<{ key: string; color?: string; label: ReactNode; valor: ReactNode }>;
}) {
  return (
    <>
      <span className={styles.tooltipTitle}>{titulo}</span>
      {filas.map((f) => (
        <span key={f.key} className={styles.tooltipRow}>
          <i style={f.color ? { background: f.color } : undefined} aria-hidden />
          <span>{f.label}</span>
          <strong className="num">{f.valor}</strong>
        </span>
      ))}
    </>
  );
}
