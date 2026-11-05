import type { ReactNode } from 'react';
import { CircleAlert, Inbox, type LucideIcon } from 'lucide-react';
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

/** Estado vacío: dice qué pasa y qué hacer. */
export function EmptyState({
  titulo,
  children,
  accion,
  icon: Icon = Inbox,
}: {
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className={styles.empty} role="status">
      <span className={styles.icon} aria-hidden>
        <Icon size={20} strokeWidth={1.75} />
      </span>
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
}: {
  error: unknown;
  onRetry?: () => void;
  titulo?: string;
}) {
  return (
    <div className={styles.error} role="alert">
      <span className={styles.icon} aria-hidden>
        <CircleAlert size={20} strokeWidth={1.75} />
      </span>
      <h3 className={styles.title}>{titulo}</h3>
      <p className={styles.text}>{errorMessage(error)}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button variant="secondary" onClick={onRetry}>
            Volver a intentar
          </Button>
        </div>
      )}
    </div>
  );
}
