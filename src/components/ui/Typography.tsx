import type { ReactNode } from 'react';
import styles from './Typography.module.css';

/** Etiqueta chica en mayúsculas mono, arriba de un título ("kicker" periodístico). */
export function Kicker({ children, tono }: { children: ReactNode; tono?: 'accent' | 'muted' }) {
  return (
    <span className={styles.kicker} data-tono={tono}>
      {children}
    </span>
  );
}

/** Encabezado de sección con regla superior gruesa, estilo diario. */
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
      <span className={`${styles.statValue} num`} style={color ? { color } : undefined}>
        {valor}
      </span>
      <span className={styles.statLabel}>{label}</span>
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
