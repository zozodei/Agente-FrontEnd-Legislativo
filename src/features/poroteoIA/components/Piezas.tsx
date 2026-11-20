import { VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { NivelConfianza, Probabilidades, VotoPredicho } from '@/types';
import { NIVEL_AYUDA, NIVEL_LABEL, pct } from '../estado';
import styles from './PoroteoIA.module.css';

const ORDEN: VotoPredicho[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE'];

/** Aviso obligatorio de neutralidad: es una estimación, no un resultado. */
export function AvisoEstimacion() {
  return (
    <p className={styles.aviso} role="note">
      <strong>Estimación, no resultado.</strong> Las predicciones se calculan con datos históricos
      de votaciones nominales (¿Cómo Votó?, HCDN). No expresan opiniones sobre legisladores, bloques
      ni proyectos, y los votos pueden cambiar hasta el momento de votar.
    </p>
  );
}

/** Indicador de confianza: texto + forma (no depende solo del color). */
export function ConfianzaBadge({ nivel }: { nivel: NivelConfianza }) {
  return (
    <span className={styles.confianza} data-nivel={nivel} title={NIVEL_AYUDA[nivel]}>
      <i aria-hidden />
      {NIVEL_LABEL[nivel]}
    </span>
  );
}

export function EditadoMarca() {
  return (
    <span className={styles.editado} title="Voto corregido a mano">
      <svg viewBox="0 0 16 16" aria-hidden width="12" height="12">
        <path d="M11.5 2.5l2 2L6 12H4v-2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      Editado
    </span>
  );
}

/** Barras horizontales con la probabilidad de cada opción. */
export function BarrasProbabilidad({ probabilidades }: { probabilidades: Probabilidades }) {
  return (
    <dl className={styles.probs}>
      {ORDEN.map((v) => (
        <div key={v} className={styles.prob}>
          <dt>{VOTO_LABEL[v]}</dt>
          <dd>
            <span className={styles.probTrack} aria-hidden>
              <span
                className={styles.probFill}
                style={{ width: pct(probabilidades[v]), background: VOTO_COLOR[v] }}
              />
            </span>
            <span className="num">{pct(probabilidades[v])}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
