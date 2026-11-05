import type { ReactNode } from 'react';
import styles from './Typography.module.css';

/** Etiqueta chica arriba de un título (sentence case, sin mayúsculas sostenidas). */
export function Kicker({ children, tono }: { children: ReactNode; tono?: 'accent' | 'muted' }) {
  return (
    <span className={styles.kicker} data-tono={tono}>
      {children}
    </span>
  );
}

/** Encabezado de sección: franja celeste corta + título expandido. */
export function SectionHeader({
  kicker,
  titulo,
  children,
  accion,
  as: Tag = 'h2',
}: {
  kicker?: ReactNode;
  titulo: ReactNode;
  children?: ReactNode;
  accion?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <header className={styles.section}>
      <div className={styles.sectionText}>
        {kicker && <Kicker>{kicker}</Kicker>}
        <Tag className={styles.sectionTitle}>{titulo}</Tag>
        {children && <p className={styles.sectionLead}>{children}</p>}
      </div>
      {accion && <div className={styles.sectionAction}>{accion}</div>}
    </header>
  );
}

/** Número grande con su etiqueta: la unidad básica de los paneles. */
export function Stat({
  valor,
  label,
  detalle,
  size = 'lg',
  color,
}: {
  valor: ReactNode;
  label: ReactNode;
  detalle?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  color?: string;
}) {
  return (
    <div className={styles.stat} data-size={size}>
      <span className={`${styles.statValue} num`}>{valor}</span>
      <span className={styles.statLabel}>
        {/* El color es identidad (bloque/voto): va en una marca, nunca en el texto. */}
        {color && <i className={styles.statSwatch} style={{ background: color }} aria-hidden />}
        {label}
      </span>
      {detalle && <span className={styles.statDetail}>{detalle}</span>}
    </div>
  );
}

export function PageHeader({
  kicker,
  titulo,
  bajada,
  children,
}: {
  kicker?: ReactNode;
  titulo: ReactNode;
  bajada?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={styles.page}>
      {kicker && <Kicker tono="accent">{kicker}</Kicker>}
      <h1 className={styles.pageTitle}>{titulo}</h1>
      {bajada && <p className={styles.pageLead}>{bajada}</p>}
      {children}
    </header>
  );
}
