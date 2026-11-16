import { useCallback, useMemo, useRef, useState } from 'react';
import type { PoroteoDetalle, TipoMayoria, VotoPoroteo, VotoPrediccion } from '@/types';
import {
  aplicarPrediccion,
  armarVotosInput,
  firmaIa,
  iaDesdePoroteo,
  type IaMap,
  type ModoAplicar,
} from './ia';
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
  // Detalle de la IA por banca. No necesita historial: un voto es "de la IA" solo si
  // coincide con lo que propuso el modelo, así que deshacer lo resuelve solo.
  const [ia, setIa] = useState<IaMap>(() => iaDesdePoroteo(poroteo));
  const [firmaGuardada, setFirmaGuardada] = useState(() =>
    firmaIa(votosToMap(poroteo), iaDesdePoroteo(poroteo)),
  );
  const iaRef = useRef(ia);
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

  const aplicarIa = useCallback(
    (prediccion: VotoPrediccion[], modo: ModoAplicar) => {
      const r = aplicarPrediccion(current.current, iaRef.current, prediccion, modo);
      iaRef.current = r.ia;
      setIa(r.ia);
      commit(() => r.votos);
      return r.aplicados;
    },
    [commit],
  );

  const payload = useCallback(() => armarVotosInput(current.current, iaRef.current), []);

  const marcarGuardado = useCallback((map: VotosMap) => {
    setGuardados(new Map(map));
    setFirmaGuardada(firmaIa(map, iaRef.current));
  }, []);

  const resumen = useMemo(
    () => calcularResultado(votos.values(), tipoMayoria),
    [votos, tipoMayoria],
  );
  const dirty = useMemo(
    () => !sameMaps(votos, guardados) || firmaIa(votos, ia) !== firmaGuardada,
    [votos, guardados, ia, firmaGuardada],
  );

  return {
    votos,
    asignar,
    deshacer,
    puedeDeshacer: historyLength > 0,
    limpiar,
    resumen,
    dirty,
    marcarGuardado,
    ia,
    aplicarIa,
    payload,
  };
}
