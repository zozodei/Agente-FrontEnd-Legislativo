import type { PageMeta } from '@/types';
import { formatNumber } from '@/utils/format';
import { Button } from './Button';
import styles from './Pagination.module.css';

export function Pagination({
  meta,
  onChange,
}: {
  meta: PageMeta;
  onChange: (page: number) => void;
}) {
  if (meta.totalPages <= 1) return null;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  return (
    <nav className={styles.nav} aria-label="Paginación">
      <span className={`${styles.info} num`}>
        {formatNumber(from)}–{formatNumber(to)} de {formatNumber(meta.total)}
      </span>
      <div className={styles.buttons}>
        <Button size="sm" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
          ← Anterior
        </Button>
        <span className={`${styles.page} num`}>
          {meta.page} / {meta.totalPages}
        </span>
        <Button
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onChange(meta.page + 1)}
        >
          Siguiente →
        </Button>
      </div>
    </nav>
  );
}
