import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Estado de filtros guardado en la URL (?q=...&bloque=...).
 * Así los filtros sobreviven al recargar y se pueden compartir por link.
 */
export function useSearchParamState<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();

  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>;

  const set = useCallback(
    (
      changes: Partial<Record<K, string | number | boolean | null | undefined>>,
      resetPage = true,
    ) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === undefined || value === '' || value === false)
              next.delete(key);
            else next.set(key, String(value));
          }
          if (resetPage && !('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [values, set] as const;
}
