import { bloqueStyle, VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { ResultadoPoroteo, ResultadoVotacion, VotoPoroteo, VotoReal } from '@/types';
import { titleCase } from '@/utils/text';
import styles from './Badges.module.css';

export function VotoBadge({ voto }: { voto: VotoReal | VotoPoroteo }) {
  return (
    <span className={styles.voto} data-voto={voto}>
      <i style={{ background: VOTO_COLOR[voto] }} aria-hidden />
      {VOTO_LABEL[voto]}
    </span>
  );
}

const RESULTADO_LABEL: Record<string, string> = {
  AFIRMATIVO: 'Aprobada',
  NEGATIVO: 'Rechazada',
  EMPATE: 'Empate',
  APROBADO: 'Se aprueba',
  RECHAZADO: 'Se rechaza',
  SIN_QUORUM: 'Sin quórum',
};

export function ResultadoBadge({
  resultado,
  size = 'md',
}: {
  resultado: ResultadoVotacion | ResultadoPoroteo | null;
  size?: 'md' | 'lg';
}) {
  const tono =
    resultado === 'AFIRMATIVO' || resultado === 'APROBADO'
      ? 'ok'
      : resultado === 'NEGATIVO' || resultado === 'RECHAZADO'
        ? 'no'
        : 'neutro';
  return (
    <span className={styles.resultado} data-tono={tono} data-size={size}>
      {resultado ? RESULTADO_LABEL[resultado] : 'Sin dato'}
    </span>
  );
}

export function BloqueChip({ bloque, corto }: { bloque: string | null; corto?: boolean }) {
  const style = bloqueStyle(bloque);
  const label = corto && style.corto ? style.corto : titleCase(bloque);
  return (
    <span className={styles.bloque} title={titleCase(bloque)}>
      <i style={{ background: style.color }} aria-hidden />
      <span>{label || 'Sin bloque'}</span>
    </span>
  );
}
