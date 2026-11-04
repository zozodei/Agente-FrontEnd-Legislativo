import { useCallback, useMemo, useRef, useState } from 'react';
import type { PoroteoDetalle, TipoMayoria, VotoPoroteo } from '@/types';
import { calcularResultado } from './resultado';

export type VotosMap = Map<number, VotoPoroteo>;

export function votosToMap(poroteo: PoroteoDetalle): VotosMap {
  return new Map(poroteo.votos.map((v) => [v.diputadoId, v.voto]));
}

function sameMaps(a: VotosMap, b: VotosMap): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

const MAX_HISTORY = 50;

/**
 * Estado local del editor de poroteo: votos por diputado, deshacer, cambios sin guardar
 * y resultado en vivo. El servidor solo se entera al guardar.
 *
 * Se inicializa una vez con el poroteo: el componente que lo usa debe montarse con
 * `key={poroteo.id}` para reiniciarse al cambiar de poroteo.
 */
export function usePoroteoEditor(poroteo: PoroteoDetalle, tipoMayoria: TipoMayoria) {
  const [votos, setVotosState] = useState<VotosMap>(() => votosToMap(poroteo));
  const [guardados, setGuardados] = useState<VotosMap>(() => votosToMap(poroteo));
  // Los refs guardan el valor "real" para las acciones; el estado dispara el render.
  const current = useRef(votos);
  const history = useRef<VotosMap[]>([]);
  const [historyLength, setHistoryLength] = useState(0);

  const setVotos = useCallback((next: VotosMap) => {
    current.current = next;
    setVotosState(next);
  }, []);

  const commit = useCallback(
    (updater: (prev: VotosMap) => VotosMap) => {
      const prev = current.current;
      const next = updater(prev);
      if (sameMaps(prev, next)) return;
      history.current = [...history.current.slice(-MAX_HISTORY + 1), prev];
      setHistoryLength(history.current.length);
      setVotos(next);
    },
    [setVotos],
  );

  const asignar = useCallback(
    (ids: number[], voto: VotoPoroteo | null) =>
      commit((prev) => {
        const next = new Map(prev);
        for (const id of ids) {
          if (voto === null) next.delete(id);
          else next.set(id, voto);
        }
        return next;
      }),
    [commit],
  );

  const deshacer = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    setHistoryLength(history.current.length);
    setVotos(prev);
  }, [setVotos]);

  const limpiar = useCallback(() => commit(() => new Map()), [commit]);

  const marcarGuardado = useCallback((map: VotosMap) => setGuardados(new Map(map)), []);

  const resumen = useMemo(
    () => calcularResultado(votos.values(), tipoMayoria),
    [votos, tipoMayoria],
  );
  const dirty = useMemo(() => !sameMaps(votos, guardados), [votos, guardados]);

  return {
    votos,
    asignar,
    deshacer,
    puedeDeshacer: historyLength > 0,
    limpiar,
    resumen,
    dirty,
    marcarGuardado,
  };
}
