import styles from './Brand.module.css';

/**
 * Marca: cinco porotos en arco (la idea de "contar" votos).
 * El del centro es el sol de mayo: el voto que define.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 24"
      className={[styles.mark, className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <circle cx="5" cy="20" r="3.2" />
      <circle cx="10" cy="9.5" r="3.2" />
      <circle cx="20" cy="4.5" r="3.2" className={styles.sol} />
      <circle cx="30" cy="9.5" r="3.2" />
      <circle cx="35" cy="20" r="3.2" />
    </svg>
  );
}

/** "demoIA": democracia + inteligencia artificial. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={[styles.word, className].filter(Boolean).join(' ')}>
      demo<span className={styles.ia}>IA</span>
    </span>
  );
}
