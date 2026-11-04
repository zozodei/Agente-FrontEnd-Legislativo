import { useMemo } from 'react';
import { BloqueChip } from '@/components/ui/Badges';
import { VoteBar } from '@/components/ui/VoteBar';
import { bloqueStyle, VOTO_COLOR, VOTO_LABEL } from '@/styles/palette';
import type { Diputado, VotoPoroteo } from '@/types';
import type { VotosMap } from '../usePoroteoEditor';
import styles from './BloqueAcciones.module.css';

const VOTOS: VotoPoroteo[] = ['AFIRMATIVO', 'NEGATIVO', 'ABSTENCION', 'AUSENTE', 'INDEFINIDO'];

/** Asignar un voto a todo un bloque de una vez. */
export function BloqueAcciones({
  diputados,
  votos,
  onAsignar,
}: {
  diputados: Diputado[];
  votos: VotosMap;
  onAsignar: (ids: number[], voto: VotoPoroteo | null) => void;
}) {
  const bloques = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const d of diputados) {
      if (!map.has(d.bloque)) map.set(d.bloque, []);
      map.get(d.bloque)!.push(d.id);
    }
    return [...map.entries()]
      .map(([nombre, ids]) => ({ nombre, ids }))
      .sort(
        (a, b) =>
          b.ids.length - a.ids.length || bloqueStyle(a.nombre).orden - bloqueStyle(b.nombre).orden,
      );
  }, [diputados]);

  return (
    <ul className={styles.list}>
      {bloques.map((b) => {
        const counts: Record<VotoPoroteo, number> = {
          AFIRMATIVO: 0,
          NEGATIVO: 0,
          ABSTENCION: 0,
          AUSENTE: 0,
          INDEFINIDO: 0,
        };
        for (const id of b.ids) counts[votos.get(id) ?? 'INDEFINIDO'] += 1;
        return (
          <li key={b.nombre} className={styles.row}>
            <div className={styles.head}>
              <BloqueChip bloque={b.nombre} />
              <span className={`${styles.n} num`}>{b.ids.length}</span>
            </div>
            <VoteBar
              height={5}
              total={b.ids.length}
              segments={VOTOS.map((v) => ({ voto: v, value: counts[v] }))}
            />
            <div
              className={styles.buttons}
              role="group"
              aria-label={`Asignar voto a todo el bloque ${b.nombre}`}
            >
              {VOTOS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={styles.btn}
                  style={{ '--c': VOTO_COLOR[v] } as React.CSSProperties}
                  data-active={counts[v] === b.ids.length || undefined}
                  onClick={() => onAsignar(b.ids, v === 'INDEFINIDO' ? null : v)}
                  title={`Todo el bloque: ${VOTO_LABEL[v]}`}
                >
                  <i aria-hidden />
                  <span>{v === 'INDEFINIDO' ? 'Limpiar' : VOTO_LABEL[v]}</span>
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
