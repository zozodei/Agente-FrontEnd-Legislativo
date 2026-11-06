import type { ReactNode } from 'react';
import { errorMessage } from '@/api/client';
import { Button } from './Button';
import styles from './States.module.css';

/** Bloque gris animado para estados de carga. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}) {
  return (
    <span
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius }}
      aria-hidden
    />
  );
}

/** Estado vacío: algo editorial, no un ícono genérico. */
export function EmptyState({
  titulo,
  children,
  accion,
}: {
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className={styles.empty} role="status">
      <EmptyArc />
      <h3 className={styles.title}>{titulo}</h3>
      {children && <p className={styles.text}>{children}</p>}
      {accion && <div className={styles.action}>{accion}</div>}
    </div>
  );
}

/** Estado de error con reintento. */
export function ErrorState({
  error,
  onRetry,
  titulo = 'Algo salió mal',
  mensaje,
}: {
  error: unknown;
  onRetry?: () => void;
  titulo?: string;
  /** Reemplaza el mensaje automático (ej. "No existe o no tenés acceso"). */
  mensaje?: string;
}) {
  return (
    <div className={styles.error} role="alert">
      <span className={styles.kicker}>Error</span>
      <h3 className={styles.title}>{titulo}</h3>
      <p className={styles.text}>{mensaje ?? errorMessage(error)}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button onClick={onRetry}>Reintentar</Button>
        </div>
      )}
    </div>
  );
}

/** Carga de pantalla completa (ej. verificando la sesión). */
export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className={styles.spinnerWrap} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${i * 110}ms` }} />
        ))}
      </span>
      <span className={styles.spinnerLabel}>{label}</span>
    </div>
  );
}

/** Mini hemiciclo vacío, punteado. */
function EmptyArc() {
  const dots = [];
  for (let row = 0; row < 3; row += 1) {
    const r = 18 + row * 9;
    const n = 7 + row * 3;
    for (let i = 0; i < n; i += 1) {
      const a = Math.PI * (1 - i / (n - 1));
      dots.push(
        <circle key={`${row}-${i}`} cx={50 + r * Math.cos(a)} cy={48 - r * Math.sin(a)} r={2.4} />,
      );
    }
  }
  return (
    <svg className={styles.arc} viewBox="0 0 100 52" aria-hidden>
      {dots}
    </svg>
  );
}
