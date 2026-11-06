import type { ReactNode } from 'react';
import styles from './AuthShell.module.css';

/**
 * Marco de las pantallas de cuenta: panel institucional (azul noche, mismo
 * lenguaje que la portada) + columna del formulario sobre papel.
 */
export function AuthShell({
  kicker,
  titulo,
  bajada,
  children,
  pie,
}: {
  kicker: string;
  titulo: ReactNode;
  bajada?: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.panel} aria-hidden>
        <ArcoPorotos />
        <blockquote className={styles.cita}>
          <p>“Cada banca cuenta. Contarlas antes también.”</p>
          <footer>Tus poroteos quedan en tu cuenta: solo vos los ves y los editás.</footer>
        </blockquote>
      </aside>

      <section className={styles.form}>
        <div className={styles.formInner}>
          <span className={styles.kicker}>{kicker}</span>
          <h1 className={styles.titulo}>{titulo}</h1>
          {bajada && <p className={styles.bajada}>{bajada}</p>}
          <div className={styles.contenido}>{children}</div>
          {pie && <div className={styles.pie}>{pie}</div>}
        </div>
      </section>
    </div>
  );
}

/** Hemiciclo decorativo de 5 filas; algunas bancas "se encienden" en celeste y sol. */
function ArcoPorotos() {
  const dots = [];
  for (let row = 0; row < 5; row += 1) {
    const r = 40 + row * 13;
    const n = 11 + row * 4;
    for (let i = 0; i < n; i += 1) {
      const a = Math.PI * (1 - i / (n - 1));
      const k = (row * 7 + i * 3) % 11;
      const tono = k === 0 ? 'sol' : k < 4 ? 'celeste' : 'apagado';
      dots.push(
        <circle
          key={`${row}-${i}`}
          cx={110 + r * Math.cos(a)}
          cy={108 - r * Math.sin(a)}
          r={3.6}
          data-tono={tono}
          style={{ animationDelay: `${(row * n + i) * 18}ms` }}
        />,
      );
    }
  }
  return (
    <svg className={styles.arco} viewBox="0 0 220 112">
      {dots}
    </svg>
  );
}
