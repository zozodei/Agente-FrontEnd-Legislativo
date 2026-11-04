import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { VotoPoroteo, VotoReal } from '@/types';
import styles from './VoteBar.module.css';

export interface VoteBarSegment {
  voto: VotoReal | VotoPoroteo;
  value: number;
}

interface VoteBarProps {
  segments: VoteBarSegment[];
  /** Total de referencia (por defecto, la suma). Útil para mostrar 257 bancas. */
  total?: number;
  height?: number;
  /** Marca vertical (ej. la línea del quórum o de la mitad). */
  marker?: { at: number; label: string };
  showLabels?: boolean;
}

/** Barra apilada horizontal de votos. */
export function VoteBar({ segments, total, height = 10, marker, showLabels }: VoteBarProps) {
  const sum = total ?? segments.reduce((acc, s) => acc + s.value, 0);
  const label = segments.map((s) => `${VOTO_LABEL[s.voto]}: ${s.value}`).join(', ');

  return (
    <div className={styles.wrap}>
      <div className={styles.bar} style={{ height }} role="img" aria-label={label}>
        {segments.map((s) =>
          s.value > 0 ? (
            <span
              key={s.voto}
              className={styles.segment}
              data-voto={s.voto}
              style={{
                width: `${(s.value / Math.max(sum, 1)) * 100}%`,
                background: VOTO_COLOR[s.voto],
              }}
            />
          ) : null,
        )}
        {marker && (
          <span
            className={styles.marker}
            style={{ left: `${(marker.at / Math.max(sum, 1)) * 100}%` }}
          >
            <span className={styles.markerLabel}>{marker.label}</span>
          </span>
        )}
      </div>
      {showLabels && (
        <div className={styles.labels}>
          {segments.map((s) => (
            <span key={s.voto} className="num">
              <i style={{ background: VOTO_COLOR[s.voto] }} aria-hidden />
              {VOTO_LABEL[s.voto]} <strong>{s.value}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
