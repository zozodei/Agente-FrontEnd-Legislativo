import type { VotoInput } from '@/api/resources';
import type { PoroteoDetalle, VotoPoroteo, VotoPrediccion } from '@/types';

/**
 * Votos propuestos por la IA. Un voto cuenta como "de la IA" solo mientras la banca
 * conserve el voto que propuso el modelo: si alguien lo cambia a mano, pasa a manual.
 * Así no hace falta rastrear cada edición y la diferencia queda guardada en `origen`.
 */
export interface DetalleIa {
  voto: VotoPoroteo;
  confianza: number | null;
  justificacion: string | null;
  fuentes: Record<string, unknown>[] | null;
}
export type IaMap = Map<number, DetalleIa>;
export type ModoAplicar = 'sinAsignar' | 'todo';

export function iaDesdePoroteo(poroteo: PoroteoDetalle): IaMap {
  return new Map(
    poroteo.votos
      .filter((v) => v.origen === 'ia')
      .map((v) => [
        v.diputadoId,
        {
          voto: v.voto,
          confianza: v.confianza,
          justificacion: v.justificacion,
          fuentes: (v.fuentes as Record<string, unknown>[] | null) ?? null,
        },
      ]),
  );
}

export function esIa(id: number, votos: Map<number, VotoPoroteo>, ia: IaMap): boolean {
  const detalle = ia.get(id);
  return detalle !== undefined && votos.get(id) === detalle.voto;
}

/** IDs cuyo voto actual es el propuesto por la IA (para comparar con lo guardado). */
export function firmaIa(votos: Map<number, VotoPoroteo>, ia: IaMap): string {
  return [...votos.keys()]
    .filter((id) => esIa(id, votos, ia))
    .sort((a, b) => a - b)
    .join(',');
}

/** Cuerpo de PUT /votos: origen 'ia' con su detalle solo para los votos que no se tocaron. */
export function armarVotosInput(votos: Map<number, VotoPoroteo>, ia: IaMap): VotoInput[] {
  return [...votos.entries()].map(([diputadoId, voto]) => {
    const detalle = ia.get(diputadoId);
    if (!detalle || detalle.voto !== voto) return { diputadoId, voto };
    return {
      diputadoId,
      voto,
      origen: 'ia',
      confianza: detalle.confianza,
      justificacion: detalle.justificacion,
      fuentes: detalle.fuentes,
    };
  });
}

/**
 * Aplica una predicción. "sinAsignar" respeta todo lo ya cargado (manual o IA);
 * "todo" reemplaza cada banca predicha. Devuelve los IDs que cambian.
 */
export function aplicarPrediccion(
  votos: Map<number, VotoPoroteo>,
  ia: IaMap,
  prediccion: VotoPrediccion[],
  modo: ModoAplicar,
): { votos: Map<number, VotoPoroteo>; ia: IaMap; aplicados: number } {
  const nuevosVotos = new Map(votos);
  const nuevaIa = new Map(ia);
  let aplicados = 0;
  for (const p of prediccion) {
    if (modo === 'sinAsignar' && votos.has(p.diputadoId)) continue;
    nuevosVotos.set(p.diputadoId, p.voto);
    nuevaIa.set(p.diputadoId, {
      voto: p.voto,
      confianza: p.confianza,
      justificacion: p.justificacion,
      fuentes: p.fuentes,
    });
    aplicados += 1;
  }
  return { votos: nuevosVotos, ia: nuevaIa, aplicados };
}
