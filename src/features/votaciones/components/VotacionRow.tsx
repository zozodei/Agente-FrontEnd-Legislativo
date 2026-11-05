import { Link } from 'react-router-dom';
import { ResultadoBadge } from '@/components/ui/Badges';
import { VoteBar } from '@/components/ui/VoteBar';
import type { Votacion } from '@/types';
import { formatDateShort } from '@/utils/format';
import { isAllCaps } from '@/utils/text';
import styles from './VotacionRow.module.css';

/** Fila de una votación: fecha, título, resultado y barra de votos. */
export function VotacionRow({ votacion, compacta }: { votacion: Votacion; compacta?: boolean }) {
  const { conteo } = votacion;
  return (
    <li className={styles.row} data-compacta={compacta || undefined}>
      <Link to={`/votaciones/${votacion.id}`} className={styles.link}>
        <span className={`${styles.date} num`}>{formatDateShort(votacion.fecha)}</span>
        <span className={styles.main}>
          <span className={styles.title} data-acta={isAllCaps(votacion.titulo) || undefined}>
            {votacion.titulo}
          </span>
          {votacion.etiqueta && <span className={styles.etiqueta}>{votacion.etiqueta}</span>}
        </span>
        <span className={styles.result}>
          <ResultadoBadge resultado={votacion.resultado} />
          <span className={`${styles.counts} num`}>
            <b aria-hidden>{conteo.afirmativos}</b>
            <span aria-hidden>a</span>
            <b aria-hidden>{conteo.negativos}</b>
            <span className="visually-hidden">
              {conteo.afirmativos} afirmativos, {conteo.negativos} negativos
            </span>
          </span>
        </span>
        {!compacta && (
          <span className={styles.bar}>
            <VoteBar
              height={6}
              segments={[
                { voto: 'AFIRMATIVO', value: conteo.afirmativos },
                { voto: 'NEGATIVO', value: conteo.negativos },
                { voto: 'ABSTENCION', value: conteo.abstenciones },
                { voto: 'AUSENTE', value: conteo.ausentes },
              ]}
            />
          </span>
        )}
      </Link>
    </li>
  );
}
