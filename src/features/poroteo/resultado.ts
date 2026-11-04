import type { ResultadoPoroteo, ResumenPoroteo, TipoMayoria, VotoPoroteo } from '@/types';

/*
 * Cálculo del resultado de un poroteo, para el contador EN VIVO.
 * Es una copia exacta de backend/src/services/resultado.js.
 * Si cambiás una, cambiá la otra (y sus tests).
 *
 *  - Presentes = afirmativos + negativos + abstenciones. Quórum = 129.
 *  - simple → afirmativos > negativos · absoluta → afirmativos ≥ 129
 *  - dos_tercios → afirmativos ≥ ⌈2/3 de presentes⌉
 *  - INDEFINIDO + sin asignar = en disputa → se evalúan mejor y peor caso.
 */

export const DIPUTADOS_TOTAL = 257;
export const QUORUM_DIPUTADOS = 129;

export const TIPO_MAYORIA_LABEL: Record<TipoMayoria, string> = {
  simple: 'Mayoría simple',
  absoluta: 'Mayoría absoluta (129)',
  dos_tercios: 'Dos tercios de presentes',
};

function votosRequeridos(tipo: TipoMayoria, presentes: number, negativos: number): number {
  if (tipo === 'absoluta') return QUORUM_DIPUTADOS;
  if (tipo === 'dos_tercios') return Math.ceil((presentes * 2) / 3);
  return negativos + 1;
}

export function calcularResultado(
  votos: Iterable<VotoPoroteo>,
  tipoMayoria: TipoMayoria = 'simple',
  total = DIPUTADOS_TOTAL,
): ResumenPoroteo {
  const conteo: Record<VotoPoroteo, number> = {
    AFIRMATIVO: 0,
    NEGATIVO: 0,
    ABSTENCION: 0,
    AUSENTE: 0,
    INDEFINIDO: 0,
  };
  for (const voto of votos) if (voto in conteo) conteo[voto] += 1;
  const asignados = Object.values(conteo).reduce((a, b) => a + b, 0);
  const sinAsignar = Math.max(0, total - asignados);
  const enDisputa = conteo.INDEFINIDO + sinAsignar;

  const evaluar = (afi: number, neg: number, abs: number): ResultadoPoroteo => {
    const presentes = afi + neg + abs;
    if (presentes < QUORUM_DIPUTADOS) return 'SIN_QUORUM';
    return afi >= votosRequeridos(tipoMayoria, presentes, neg) ? 'APROBADO' : 'RECHAZADO';
  };

  const { AFIRMATIVO: afi, NEGATIVO: neg, ABSTENCION: abs } = conteo;
  const presentes = afi + neg + abs;
  const mejorCaso = evaluar(afi + enDisputa, neg, abs);
  const peorCaso = evaluar(afi, neg + enDisputa, abs);
  const requeridos = votosRequeridos(tipoMayoria, Math.max(presentes, QUORUM_DIPUTADOS), neg);

  return {
    tipoMayoria,
    conteo: { ...conteo, sinAsignar },
    presentes,
    enDisputa,
    quorum: {
      requerido: QUORUM_DIPUTADOS,
      alcanzado: presentes >= QUORUM_DIPUTADOS,
      faltan: Math.max(0, QUORUM_DIPUTADOS - presentes),
    },
    mayoria: { requeridos, faltan: Math.max(0, requeridos - afi) },
    resultado: evaluar(afi, neg, abs),
    escenarios: { mejorCaso, peorCaso },
    definido: enDisputa === 0 || mejorCaso === peorCaso,
  };
}
