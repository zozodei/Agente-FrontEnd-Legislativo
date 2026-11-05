import { ChartTooltip, TooltipBody } from './ChartTooltip';
import { useChartTooltip } from './useChartTooltip';
import styles from './charts.module.css';

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Color del texto dentro del bloque: claro u oscuro según el relleno. */
  ink?: 'light' | 'dark';
}

const nf1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const nf = new Intl.NumberFormat('es-AR');

/**
 * Un todo partido en partes (ej. cómo votó alguien). Variante `tall` (28px)
 * con el % adentro de cada bloque cuando entra; `thin` (8px) sin texto.
 * Cada parte tiene hover y foco con nombre, cantidad y porcentaje.
 */
export function SegmentedBar({
  segments,
  variant = 'tall',
  ariaLabel,
  unidad = '',
  minLabelPct = 9,
}: {
  segments: Segment[];
  variant?: 'tall' | 'thin';
  ariaLabel: string;
  /** Sufijo para la cantidad en el tooltip ("votaciones"). */
  unidad?: string;
  /** Porcentaje mínimo de ancho para imprimir el número adentro. */
  minLabelPct?: number;
}) {
  const { wrapRef, tip, bind } = useChartTooltip();
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const visibles = segments.filter((s) => s.value > 0);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <div className={styles.segmented} data-variant={variant} role="group" aria-label={ariaLabel}>
        {visibles.map((s) => {
          const pct = total ? (s.value / total) * 100 : 0;
          const desc = `${s.label}: ${nf.format(s.value)} ${unidad} (${nf1.format(pct)}%)`.replace(
            /\s+\(/,
            ' (',
          );
          return (
            <span
              key={s.key}
              className={styles.part}
              style={{ flexGrow: s.value, background: s.color }}
              data-ink={s.ink ?? 'light'}
              tabIndex={0}
              aria-label={desc}
              {...bind(
                <TooltipBody
                  titulo={s.label}
                  filas={[
                    {
                      key: 'v',
                      color: s.color,
                      label: unidad || 'Cantidad',
                      valor: nf.format(s.value),
                    },
                    { key: 'p', label: 'Del total', valor: `${nf1.format(pct)}%` },
                  ]}
                />,
              )}
            >
              {variant === 'tall' && pct >= minLabelPct && (
                <span className="num" aria-hidden>
                  {nf1.format(pct)}%
                </span>
              )}
            </span>
          );
        })}
      </div>
      <ChartTooltip tip={tip} />
    </div>
  );
}
