import type { ReactNode } from 'react';
import styles from './Typography.module.css';

/**
 * Encabezado de sección. El título habla solo: sin etiquetas arriba.
 * `children` es una bajada opcional; `accion` va alineada a la derecha.
 */
export function SectionHeader({
  titulo,
  children,
  accion,
  as: Tag = 'h2',
}: {
  titulo: ReactNode;
  children?: ReactNode;
  accion?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <header className={styles.section}>
      <div className={styles.sectionText}>
        <Tag className={styles.sectionTitle}>{titulo}</Tag>
        {children && <p className={styles.sectionLead}>{children}</p>}
      </div>
      {accion && <div className={styles.sectionAction}>{accion}</div>}
    </header>
  );
}

/** Línea de datos debajo de un título (fecha, estado, archivo…). Ignora los vacíos. */
export function Meta({ items }: { items: Array<ReactNode | null | undefined | false> }) {
  const visibles = items.filter((i) => i !== null && i !== undefined && i !== false && i !== '');
  if (visibles.length === 0) return null;
  return (
    <ul className={styles.meta}>
      {visibles.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Número con su etiqueta: la unidad básica de los paneles. */
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
      <span className={styles.statLabel}>
        {/* El color es identidad (bloque/voto): va en una marca, nunca en el texto. */}
        {color && <i className={styles.statSwatch} style={{ background: color }} aria-hidden />}
        {label}
      </span>
      <span className={`${styles.statValue} num`}>{valor}</span>
      {detalle && <span className={styles.statDetail}>{detalle}</span>}
    </div>
  );
}

export function PageHeader({
  titulo,
  bajada,
  children,
}: {
  titulo: ReactNode;
  bajada?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={styles.page}>
      <h1 className={styles.pageTitle}>{titulo}</h1>
      {bajada && <p className={styles.pageLead}>{bajada}</p>}
      {children}
    </header>
  );
}
